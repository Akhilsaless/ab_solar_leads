import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { getAllReferrers, getAllReferrals, getPendingWithdrawals, approveWithdrawal, rejectWithdrawal } from "./referrerDb";
import { sendEmail } from "./_core/emailService";
import { sql } from "drizzle-orm";

const otpStore = new Map<string, { otp: string; expiresAt: number; data: any }>();

export const referrerRouter = router({
  sendOtp: publicProcedure
    .input(z.object({ name: z.string(), phone: z.string(), email: z.string().email() }))
    .mutation(async ({ input }: any) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      otpStore.set(input.phone, { otp, expiresAt, data: input });

      console.log(`[OTP] Generated for ${input.phone}: ${otp}`);

      // Send OTP via email
      const emailResult = await sendEmail({
        to: input.email,
        subject: "Your AB SOLAR Referral Program OTP",
        html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`,
      });

      // If email not configured, return OTP for development
      if (!emailResult.success) {
        console.warn(`[OTP] Email not configured. OTP for testing: ${otp}`);
        return { success: true, message: "OTP generated (check console or use: " + otp + ")", testOtp: otp };
      }

      return { success: true, message: "OTP sent to your email" };
    }),

  verifyOtpAndSignup: publicProcedure
    .input(z.object({ phone: z.string(), otp: z.string() }))
    .mutation(async ({ input, ctx }: any) => {
      const stored = otpStore.get(input.phone);

      if (!stored) {
        throw new Error("OTP expired or not found");
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(input.phone);
        throw new Error("OTP expired");
      }

      if (stored.otp !== input.otp) {
        throw new Error("Invalid OTP");
      }

      const { name, phone, email } = stored.data;
      const uniqueCode = `REF_${nanoid(8).toUpperCase()}`;

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Save referrer to database
        await db.execute(
          sql`INSERT INTO referrers (agencyId, uniqueCode, name, phone, email) 
              VALUES (${ctx.agencyId}, ${uniqueCode}, ${name}, ${phone}, ${email})`
        );

        // Create initial task
        const referrer = await db.execute(
          sql`SELECT id FROM referrers WHERE uniqueCode = ${uniqueCode}`
        );

        if (referrer && (referrer as any[]).length > 0) {
          const referrerId = (referrer as any[])[0].id;
          await db.execute(
            sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
                VALUES (${referrerId}, 1, 5, 20)`
          );
        }

        otpStore.delete(input.phone);

        // Send welcome email
        try {
          await sendEmail({
            to: email,
            subject: "Welcome to AB SOLAR Referral Program!",
            html: `<h2>Welcome, ${name}!</h2><p>Your referral code is: <strong>${uniqueCode}</strong></p><p>Share this code with friends to start earning!</p>`,
          });
        } catch (error) {
          console.error("Failed to send welcome email:", error);
        }

        return { success: true, uniqueCode };
      } catch (error) {
        console.error("Error during signup:", error);
        throw error;
      }
    }),

  getDashboard: publicProcedure
    .input(z.object({ uniqueCode: z.string() }))
    .query(async ({ input, ctx }: any) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const referrer = await db.execute(
          sql`SELECT * FROM referrers WHERE uniqueCode = ${input.uniqueCode} AND agencyId = ${ctx.agencyId}`
        );

        if (!referrer || (referrer as any[]).length === 0) {
          throw new Error("Referrer not found");
        }

        const ref = (referrer as any[])[0];

        const referrals = await db.execute(
          sql`SELECT * FROM referrals WHERE referrerId = ${ref.id}`
        );

        const tasks = await db.execute(
          sql`SELECT * FROM referralTasks WHERE referrerId = ${ref.id}`
        );

        const withdrawals = await db.execute(
          sql`SELECT * FROM withdrawals WHERE referrerId = ${ref.id}`
        );

        return {
          referrer: ref,
          referrals: referrals || [],
          tasks: tasks || [],
          withdrawals: withdrawals || [],
        };
      } catch (error) {
        console.error("Error getting dashboard:", error);
        return null;
      }
    }),

  requestWithdrawal: publicProcedure
    .input(
      z.object({
        uniqueCode: z.string(),
        amount: z.number().positive(),
        upiId: z.string().optional(),
        bankAccount: z.string().optional(),
        bankIfsc: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const referrer = await db.execute(
          sql`SELECT * FROM referrers WHERE uniqueCode = ${input.uniqueCode} AND agencyId = ${ctx.agencyId}`
        );

        if (!referrer || (referrer as any[]).length === 0) {
          throw new Error("Referrer not found");
        }

        const ref = (referrer as any[])[0];

        if (ref.totalEarnings < input.amount) {
          throw new Error("Insufficient balance");
        }

        // Create withdrawal request
        await db.execute(
          sql`INSERT INTO withdrawals (referrerId, amount, upiId, bankAccount, bankIfsc) 
              VALUES (${ref.id}, ${input.amount}, ${input.upiId || null}, ${input.bankAccount || null}, ${input.bankIfsc || null})`
        );

        // Send confirmation email
        try {
          await sendEmail({
            to: ref.email,
            subject: "Withdrawal Request Submitted",
            html: `<p>Your withdrawal request of ₹${input.amount} has been submitted and is pending approval.</p>`,
          });
        } catch (error) {
          console.error("Failed to send withdrawal email:", error);
        }

        return { success: true, message: "Withdrawal request submitted" };
      } catch (error) {
        console.error("Error requesting withdrawal:", error);
        throw error;
      }
    }),

  getLeaderboard: publicProcedure.query(async ({ ctx }: any) => {
    const db = await getDb();
    if (!db) return [];

    try {
      const result = await db.execute(
        sql`SELECT id, name, totalEarnings, totalReferrals FROM referrers WHERE agencyId = ${ctx.agencyId} ORDER BY totalEarnings DESC LIMIT 10`
      );
      return result || [];
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }),

  // Admin procedures
  getAllReferrers: publicProcedure.query(async ({ ctx }: any) => {
    return await getAllReferrers(ctx.agencyId);
  }),

  getAllReferrals: publicProcedure.query(async ({ ctx }: any) => {
    return await getAllReferrals(ctx.agencyId);
  }),

  getPendingWithdrawals: publicProcedure.query(async ({ ctx }: any) => {
    return await getPendingWithdrawals(ctx.agencyId);
  }),

  approveWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.number() }))
    .mutation(async ({ input, ctx }: any) => {
      const result = await approveWithdrawal(input.withdrawalId, ctx.agencyId);

      // Send approval email
      const db = await getDb();
      if (db) {
        try {
          const withdrawal = await db.execute(
            sql`SELECT w.*, ref.email FROM withdrawals w JOIN referrers ref ON w.referrerId = ref.id WHERE w.id = ${input.withdrawalId}`
          );

          if (withdrawal && (withdrawal as any[]).length > 0) {
            const w = (withdrawal as any[])[0];
            await sendEmail({
              to: w.email,
              subject: "Withdrawal Approved!",
              html: `<p>Your withdrawal of ₹${w.amount} has been approved and will be processed within 24 hours.</p>`,
            });
          }
        } catch (error) {
          console.error("Failed to send approval email:", error);
        }
      }

      return result;
    }),

  rejectWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }: any) => {
      const result = await rejectWithdrawal(input.withdrawalId, ctx.agencyId, input.reason);

      // Send rejection email
      const db = await getDb();
      if (db) {
        try {
          const withdrawal = await db.execute(
            sql`SELECT w.*, ref.email FROM withdrawals w JOIN referrers ref ON w.referrerId = ref.id WHERE w.id = ${input.withdrawalId}`
          );

          if (withdrawal && (withdrawal as any[]).length > 0) {
            const w = (withdrawal as any[])[0];
            await sendEmail({
              to: w.email,
              subject: "Withdrawal Request Rejected",
              html: `<p>Your withdrawal request of ₹${w.amount} has been rejected.</p><p>Reason: ${input.reason || "No reason provided"}</p>`,
            });
          }
        } catch (error) {
          console.error("Failed to send rejection email:", error);
        }
      }

      return result;
    }),
});
