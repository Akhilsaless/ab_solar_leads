import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail } from "./_core/emailService";

// In-memory OTP store: email -> { otp, expiresAt, data }
const otpStore = new Map<string, { otp: string; expiresAt: number; data: { name: string; email: string } }>();

// Helper: extract rows from mysql2 execute result
function rows(result: any): any[] {
  // mysql2 returns [rows, fields] - result[0] is the array of rows
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as any[];
  }
  if (Array.isArray(result)) {
    return result as any[];
  }
  return [];
}

// Helper: get first row
function firstRow(result: any): any | null {
  const r = rows(result);
  return r.length > 0 ? r[0] : null;
}

// Helper: get insertId
// mysql2 via drizzle returns [ResultSetHeader, null] for INSERT/UPDATE/DELETE
function insertId(result: any): number {
  if (Array.isArray(result)) {
    // drizzle mysql2: result[0] is ResultSetHeader with insertId
    return (result[0] as any)?.insertId || 0;
  }
  return (result as any)?.insertId || 0;
}

export const referrerRouter = router({
  sendOtp: publicProcedure
    .input(z.object({ name: z.string().min(1), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(input.email, {
        otp,
        expiresAt,
        data: { name: input.name, email: input.email },
      });

      await sendEmail({
        to: input.email,
        subject: "Your Sales Squad OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
            <h2 style="color: #f97316; margin-bottom: 8px;">Sales Squad Referral Program</h2>
            <p style="color: #ccc;">Hi ${input.name}, here is your one-time password:</p>
            <div style="background: #f97316; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
          </div>
        `,
      });

      return { success: true, message: "OTP sent to your email" };
    }),

  verifyOtpAndSignup: publicProcedure
    .input(z.object({ email: z.string().email(), otp: z.string() }))
    .mutation(async ({ input }) => {
      const stored = otpStore.get(input.email);

      if (!stored) throw new Error("OTP expired or not found. Please request a new one.");
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(input.email);
        throw new Error("OTP expired. Please request a new one.");
      }
      if (stored.otp !== input.otp) throw new Error("Invalid OTP. Please check and try again.");

      const { name, email } = stored.data;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if already registered - return existing account
      const existingResult = await db.execute(
        sql`SELECT id, uniqueCode FROM referrers WHERE email = ${email}`
      );
      const existing = firstRow(existingResult);
      if (existing) {
        otpStore.delete(input.email);
        return { success: true, uniqueCode: existing.uniqueCode, alreadyExists: true };
      }

      const uniqueCode = `REF_${nanoid(8).toUpperCase()}`;

      // Insert new referrer
      const insertResult = await db.execute(
        sql`INSERT INTO referrers (uniqueCode, name, email, totalEarnings, totalReferrals, status) 
            VALUES (${uniqueCode}, ${name}, ${email}, 0, 0, 'active')`
      );
      const newId = insertId(insertResult);

      // Create initial task if we have a valid ID
      if (newId > 0) {
        await db.execute(
          sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
              VALUES (${newId}, 1, 5, 20)`
        );
      }

      otpStore.delete(input.email);

      // Send welcome email (non-blocking)
      sendEmail({
        to: email,
        subject: "Welcome to Sales Squad Referral Program!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
            <h2 style="color: #f97316;">Welcome, ${name}! 🎉</h2>
            <p style="color: #ccc;">Your referral account is ready. Start sharing your unique code to earn commissions!</p>
            <div style="background: #f97316; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
              <p style="color: #fff; margin: 0; font-size: 13px;">Your Referral Code</p>
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #fff;">${uniqueCode}</span>
            </div>
            <p style="color: #ccc;">Earn ₹500 for every customer signup + ₹1500 when they install solar!</p>
          </div>
        `,
      }).catch(console.error);

      return { success: true, uniqueCode };
    }),

  getDashboard: publicProcedure
    .input(z.object({ uniqueCode: z.string() }))
    .query(async ({ input }) => {
      if (!input.uniqueCode) return null;
      const db = await getDb();
      if (!db) return null;

      try {
        const referrerResult = await db.execute(
          sql`SELECT * FROM referrers WHERE uniqueCode = ${input.uniqueCode}`
        );
        const ref = firstRow(referrerResult);
        if (!ref) return null;

        const referralsResult = await db.execute(
          sql`SELECT * FROM referrals WHERE referrerId = ${ref.id} ORDER BY createdAt DESC`
        );

        const tasksResult = await db.execute(
          sql`SELECT * FROM referralTasks WHERE referrerId = ${ref.id} ORDER BY taskNumber ASC`
        );

        const withdrawalsResult = await db.execute(
          sql`SELECT * FROM withdrawals WHERE referrerId = ${ref.id} ORDER BY createdAt DESC`
        );

        return {
          referrer: ref,
          referrals: rows(referralsResult),
          tasks: rows(tasksResult),
          withdrawals: rows(withdrawalsResult),
        };
      } catch (error) {
        console.error("Error getting dashboard:", error);
        return null;
      }
    }),

  requestWithdrawal: publicProcedure
    .input(z.object({
      uniqueCode: z.string(),
      amount: z.number().positive(),
      upiId: z.string().optional(),
      bankAccount: z.string().optional(),
      bankIfsc: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const referrerResult = await db.execute(
        sql`SELECT * FROM referrers WHERE uniqueCode = ${input.uniqueCode}`
      );
      const ref = firstRow(referrerResult);
      if (!ref) throw new Error("Referrer not found");
      if (Number(ref.totalEarnings) < input.amount) throw new Error("Insufficient balance");

      await db.execute(
        sql`INSERT INTO withdrawals (referrerId, amount, upiId, bankAccount, bankIfsc) 
            VALUES (${ref.id}, ${input.amount}, ${input.upiId || null}, ${input.bankAccount || null}, ${input.bankIfsc || null})`
      );

      sendEmail({
        to: ref.email,
        subject: "Withdrawal Request Submitted - Sales Squad",
        html: `<p>Hi ${ref.name}, your withdrawal request of ₹${input.amount} has been submitted and is pending approval. We'll process it within 2-3 business days.</p>`,
      }).catch(console.error);

      return { success: true, message: "Withdrawal request submitted successfully" };
    }),

  getLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT id, name, totalEarnings, totalReferrals FROM referrers ORDER BY totalEarnings DESC LIMIT 10`
      );
      return rows(result);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }),

  // Admin procedures
  getAllReferrers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT id, uniqueCode, name, email, totalEarnings, totalReferrals, status FROM referrers ORDER BY totalEarnings DESC`
      );
      return rows(result);
    } catch (error) {
      console.error("Error getting all referrers:", error);
      return [];
    }
  }),

  getAllReferrals: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT r.id, r.referrerId, r.customerName, r.customerPhone, r.customerEmail, r.monthlyBill, r.state, r.status, r.signupBonusPaid, r.installationBonusPaid, ref.name as referrerName 
            FROM referrals r 
            JOIN referrers ref ON r.referrerId = ref.id 
            ORDER BY r.createdAt DESC`
      );
      return rows(result);
    } catch (error) {
      console.error("Error getting all referrals:", error);
      return [];
    }
  }),

  getPendingWithdrawals: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT w.id, w.referrerId, w.amount, w.upiId, w.bankAccount, w.bankIfsc, w.status, w.createdAt, ref.name as referrerName, ref.email as referrerEmail
            FROM withdrawals w
            JOIN referrers ref ON w.referrerId = ref.id
            WHERE w.status = 'pending'
            ORDER BY w.createdAt ASC`
      );
      return rows(result);
    } catch (error) {
      console.error("Error getting pending withdrawals:", error);
      return [];
    }
  }),

  approveWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const withdrawalResult = await db.execute(
        sql`SELECT w.*, ref.email, ref.name FROM withdrawals w JOIN referrers ref ON w.referrerId = ref.id WHERE w.id = ${input.withdrawalId}`
      );
      const withdrawal = firstRow(withdrawalResult);
      if (!withdrawal) throw new Error("Withdrawal not found");

      await db.execute(
        sql`UPDATE withdrawals SET status = 'approved', processedAt = NOW() WHERE id = ${input.withdrawalId}`
      );

      sendEmail({
        to: withdrawal.email,
        subject: "Withdrawal Approved - Sales Squad",
        html: `<p>Hi ${withdrawal.name}, your withdrawal of ₹${withdrawal.amount} has been approved and will be credited to your account shortly!</p>`,
      }).catch(console.error);

      return { success: true };
    }),

  rejectWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.execute(
        sql`UPDATE withdrawals SET status = 'rejected', rejectionReason = ${input.reason || null} WHERE id = ${input.withdrawalId}`
      );

      return { success: true };
    }),

  confirmInstallation: publicProcedure
    .input(z.object({ referralId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const referralResult = await db.execute(
        sql`SELECT * FROM referrals WHERE id = ${input.referralId}`
      );
      const referral = firstRow(referralResult);
      if (!referral) throw new Error("Referral not found");

      await db.execute(
        sql`UPDATE referrals SET status = 'completed', installationBonusPaid = true WHERE id = ${input.referralId}`
      );

      await db.execute(
        sql`UPDATE referrers SET totalEarnings = totalEarnings + 1500 WHERE id = ${referral.referrerId}`
      );

      return { success: true };
    }),
});
