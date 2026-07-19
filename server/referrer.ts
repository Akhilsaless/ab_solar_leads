import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendEmail } from "./_core/emailService";
import { notifyOwner } from "./_core/notification";
import bcrypt from "bcryptjs";

// DB-backed OTP store (survives server restarts)

// Helper: extract rows from mysql2 execute result
function rows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  return [];
}

// Helper: get first row
function firstRow(result: any): any | null {
  const r = rows(result);
  return r.length > 0 ? r[0] : null;
}

// Helper: get insertId — drizzle mysql2 returns [ResultSetHeader, null]
function insertId(result: any): number {
  if (Array.isArray(result)) return (result[0] as any)?.insertId || 0;
  return (result as any)?.insertId || 0;
}

// Milestone bonus amounts — starts at ₹100, increases ₹100 each task
function getMilestoneBonus(taskNumber: number): number {
  return taskNumber * 100;
}

// Recalculate and update quality score for a referrer
async function updateQualityScore(db: any, referrerId: number) {
  const totalResult = await db.execute(
    sql`SELECT COUNT(*) as total FROM referrals WHERE referrerId = ${referrerId}`
  );
  const verifiedResult = await db.execute(
    sql`SELECT COUNT(*) as verified FROM referrals WHERE referrerId = ${referrerId} AND customerVerified = 1`
  );
  const total = Number(firstRow(totalResult)?.total || 0);
  const verified = Number(firstRow(verifiedResult)?.verified || 0);
  const score = total === 0 ? 100 : Math.round((verified / total) * 100);
  await db.execute(
    sql`UPDATE referrers SET qualityScore = ${score} WHERE id = ${referrerId}`
  );
  return score;
}

// Update daily streak for a referrer
async function updateDailyStreak(db: any, referrerId: number) {
  const ref = firstRow(await db.execute(sql`SELECT lastActiveDate, dailyStreak FROM referrers WHERE id = ${referrerId}`));
  if (!ref) return;
  const today = new Date().toISOString().slice(0, 10);
  const last = ref.lastActiveDate ? new Date(ref.lastActiveDate).toISOString().slice(0, 10) : null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak = 1;
  if (last === yesterday) newStreak = (ref.dailyStreak || 0) + 1;
  else if (last === today) newStreak = ref.dailyStreak || 1;
  await db.execute(
    sql`UPDATE referrers SET dailyStreak = ${newStreak}, lastActiveDate = ${today} WHERE id = ${referrerId}`
  );
}

export const referrerRouter = router({
  sendOtp: publicProcedure
    .input(z.object({ name: z.string().min(1), email: z.string().email(), acceptedTnC: z.boolean() }))
    .mutation(async ({ input }) => {
      if (!input.acceptedTnC) throw new Error("You must accept the Terms & Conditions to join.");
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Upsert OTP into persistent store
      await db.execute(
        sql`INSERT INTO otp_store (email, otp, name, acceptedTnC, expiresAt)
            VALUES (${input.email}, ${otp}, ${input.name}, 1, ${expiresAt})
            ON DUPLICATE KEY UPDATE otp = ${otp}, name = ${input.name}, expiresAt = ${expiresAt}`
      );

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
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const storedResult = await db.execute(
        sql`SELECT otp, name, expiresAt FROM otp_store WHERE email = ${input.email}`
      );
      const stored = firstRow(storedResult);
      if (!stored) throw new Error("OTP expired or not found. Please request a new one.");
      if (Date.now() > Number(stored.expiresAt)) {
        await db.execute(sql`DELETE FROM otp_store WHERE email = ${input.email}`);
        throw new Error("OTP expired. Please request a new one.");
      }
      if (stored.otp !== input.otp) throw new Error("Invalid OTP. Please check and try again.");

      const { name, email } = { name: stored.name as string, email: input.email };

      // Return existing account if already registered
      const existingResult = await db.execute(sql`SELECT id, uniqueCode FROM referrers WHERE email = ${email}`);
      const existing = firstRow(existingResult);
      if (existing) {
        await db.execute(sql`DELETE FROM otp_store WHERE email = ${input.email}`);
        return { success: true, uniqueCode: existing.uniqueCode, alreadyExists: true };
      }

      const uniqueCode = `REF_${nanoid(8).toUpperCase()}`;

      const insertResult = await db.execute(
        sql`INSERT INTO referrers (uniqueCode, name, email, totalEarnings, totalReferrals, status, qualityScore, dailyStreak, acceptedTnC, signupBonusPaid) 
            VALUES (${uniqueCode}, ${name}, ${email}, 50, 0, 'active', 100, 0, 1, 1)`
      );
      const newId = insertId(insertResult);

      // Create initial task with ₹100 bonus (task 1)
      if (newId > 0) {
        await db.execute(
          sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
              VALUES (${newId}, 1, 5, ${getMilestoneBonus(1)})`
        );
        // Deduct ₹50 signup bonus from pot
        await db.execute(
          sql`UPDATE pot_balance SET balance = GREATEST(0, balance - 50) WHERE id = 1`
        );
      }

      await db.execute(sql`DELETE FROM otp_store WHERE email = ${input.email}`);

      sendEmail({
        to: email,
        subject: "Welcome to Sales Squad Referral Program!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
            <h2 style="color: #f97316;">Welcome, ${name}! 🎉</h2>
            <p style="color: #ccc;">Your referral account is ready. Start sharing your unique link to earn commissions!</p>
            <div style="background: #f97316; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
              <p style="color: #fff; margin: 0; font-size: 13px;">Your Referral Code</p>
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #fff;">${uniqueCode}</span>
            </div>
            <p style="color: #ccc;">💰 Earn ₹500 when your referral applies for govt subsidy<br/>💰 Earn ₹1,500 when solar is installed</p>
            <p style="color: #999; font-size: 12px;">By joining, you agreed to our Terms & Conditions. Fake or invalid leads will result in account suspension.</p>
          </div>
        `,
      }).catch(console.error);

      return { success: true, uniqueCode, needsPassword: true };
    }),

  setPassword: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.execute(sql`SELECT id, uniqueCode FROM referrers WHERE email = ${input.email}`);
      const ref = firstRow(result);
      if (!ref) throw new Error("Account not found.");
      const hash = await bcrypt.hash(input.password, 10);
      const token = nanoid(32);
      await db.execute(sql`UPDATE referrers SET passwordHash = ${hash}, sessionToken = ${token} WHERE id = ${ref.id}`);
      return { success: true, uniqueCode: ref.uniqueCode, token };
    }),

  loginWithPassword: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.execute(sql`SELECT id, uniqueCode, passwordHash FROM referrers WHERE email = ${input.email}`);
      const ref = firstRow(result);
      if (!ref) throw new Error("No account found with this email. Please sign up first.");
      if (!ref.passwordHash) throw new Error("Password not set. Please sign up again to set your password.");
      const valid = await bcrypt.compare(input.password, ref.passwordHash);
      if (!valid) throw new Error("Incorrect password. Please try again.");
      const token = nanoid(32);
      await db.execute(sql`UPDATE referrers SET sessionToken = ${token} WHERE id = ${ref.id}`);
      return { success: true, uniqueCode: ref.uniqueCode, token };
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

  // Customer clicks verification link from email
  verifyCustomer: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const referralResult = await db.execute(
        sql`SELECT r.*, ref.name as referrerName FROM referrals r 
            JOIN referrers ref ON r.referrerId = ref.id
            WHERE r.verificationToken = ${input.token}`
      );
      const referral = firstRow(referralResult);
      if (!referral) throw new Error("Invalid or expired verification link.");
      if (referral.customerVerified) return { success: true, alreadyVerified: true };

      await db.execute(
        sql`UPDATE referrals SET customerVerified = 1 WHERE id = ${referral.id}`
      );

      // Update quality score
      await updateQualityScore(db, referral.referrerId);

      // Notify admin
      notifyOwner({
        title: "✅ Lead Verified",
        content: `Customer ${referral.customerName} confirmed referral from ${referral.referrerName}. Lead is now verified.`,
      }).catch(console.error);

      return { success: true, referrerName: referral.referrerName };
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

      const referrerResult = await db.execute(sql`SELECT * FROM referrers WHERE uniqueCode = ${input.uniqueCode}`);
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
      return [];
    }
  }),

  // Admin procedures
  getAllReferrers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT id, uniqueCode, name, email, totalEarnings, totalReferrals, status, qualityScore, dailyStreak FROM referrers ORDER BY totalEarnings DESC`
      );
      return rows(result);
    } catch (error) {
      return [];
    }
  }),

  getAllReferrals: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT r.id, r.referrerId, r.customerName, r.customerPhone, r.customerEmail, r.monthlyBill, r.state, r.status, 
                   r.customerVerified, r.subsidyApplied, r.signupBonusPaid, r.installationBonusPaid,
                   r.createdAt, ref.name as referrerName 
            FROM referrals r 
            JOIN referrers ref ON r.referrerId = ref.id 
            ORDER BY r.createdAt DESC`
      );
      return rows(result);
    } catch (error) {
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

      // Deduct from pot balance
      await db.execute(
        sql`UPDATE pot_balance SET balance = GREATEST(0, balance - ${withdrawal.amount}) WHERE id = 1`
      );

      sendEmail({
        to: withdrawal.email,
        subject: "Withdrawal Approved - Sales Squad",
        html: `<p>Hi ${withdrawal.name}, your withdrawal of ₹${withdrawal.amount} has been approved and will be credited shortly!</p>`,
      }).catch(console.error);

      return { success: true };
    }),

  // Public: get pot balance and recent payouts for landing page
  getPotInfo: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { balance: 10000, recentPayouts: [] };
    try {
      const potResult = await db.execute(sql`SELECT balance FROM pot_balance WHERE id = 1`);
      const pot = firstRow(potResult);
      const payoutsResult = await db.execute(
        sql`SELECT ref.name, w.amount, w.processedAt 
            FROM withdrawals w 
            JOIN referrers ref ON w.referrerId = ref.id 
            WHERE w.status = 'approved' 
            ORDER BY w.processedAt DESC LIMIT 8`
      );
      return {
        balance: Number(pot?.balance || 10000),
        recentPayouts: rows(payoutsResult),
      };
    } catch {
      return { balance: 10000, recentPayouts: [] };
    }
  }),

  // Admin: set pot balance
  setPotBalance: publicProcedure
    .input(z.object({ amount: z.number().min(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.execute(sql`UPDATE pot_balance SET balance = ${input.amount} WHERE id = 1`);
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

  // Admin: mark subsidy applied → ₹500 to referrer
  markSubsidyApplied: publicProcedure
    .input(z.object({ referralId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const referralResult = await db.execute(sql`SELECT * FROM referrals WHERE id = ${input.referralId}`);
      const referral = firstRow(referralResult);
      if (!referral) throw new Error("Referral not found");
      if (referral.subsidyApplied) throw new Error("Subsidy already marked for this referral");

      await db.execute(
        sql`UPDATE referrals SET subsidyApplied = 1, subsidyAppliedAt = NOW(), signupBonusPaid = 1, status = 'subsidy_applied' WHERE id = ${input.referralId}`
      );
      await db.execute(
        sql`UPDATE referrers SET totalEarnings = totalEarnings + 500 WHERE id = ${referral.referrerId}`
      );

      // Update streak
      await updateDailyStreak(db, referral.referrerId);

      // Get referrer for email
      const refResult = await db.execute(sql`SELECT * FROM referrers WHERE id = ${referral.referrerId}`);
      const ref = firstRow(refResult);
      if (ref) {
        sendEmail({
          to: ref.email,
          subject: "🎉 ₹500 Earned! Subsidy Applied - Sales Squad",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
              <h2 style="color: #22c55e;">₹500 Credited! 🎉</h2>
              <p style="color: #ccc;">Great news, ${ref.name}! Your referral <strong>${referral.customerName}</strong> has applied for the government solar subsidy.</p>
              <div style="background: #22c55e22; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #22c55e; font-size: 24px; font-weight: bold; margin: 0;">+₹500 added to your balance</p>
              </div>
              <p style="color: #ccc;">You'll earn another ₹1,500 once the solar installation is confirmed. Keep referring!</p>
            </div>
          `,
        }).catch(console.error);
      }

      return { success: true, message: "₹500 subsidy bonus credited to referrer" };
    }),

  // Admin: confirm installation → ₹1500 to referrer
  confirmInstallation: publicProcedure
    .input(z.object({ referralId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const referralResult = await db.execute(sql`SELECT * FROM referrals WHERE id = ${input.referralId}`);
      const referral = firstRow(referralResult);
      if (!referral) throw new Error("Referral not found");

      await db.execute(
        sql`UPDATE referrals SET status = 'completed', installationBonusPaid = 1, installedAt = NOW() WHERE id = ${input.referralId}`
      );
      await db.execute(
        sql`UPDATE referrers SET totalEarnings = totalEarnings + 1500, totalReferrals = totalReferrals + 1 WHERE id = ${referral.referrerId}`
      );

      // Check and advance task
      await checkAndAdvanceTask(db, referral.referrerId);
      await updateDailyStreak(db, referral.referrerId);

      const refResult = await db.execute(sql`SELECT * FROM referrers WHERE id = ${referral.referrerId}`);
      const ref = firstRow(refResult);
      if (ref) {
        sendEmail({
          to: ref.email,
          subject: "🏆 ₹1,500 Earned! Installation Confirmed - Sales Squad",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
              <h2 style="color: #f97316;">₹1,500 Credited! 🏆</h2>
              <p style="color: #ccc;">Congratulations, ${ref.name}! Solar has been installed for your referral <strong>${referral.customerName}</strong>.</p>
              <div style="background: #f9731622; border: 1px solid #f97316; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #f97316; font-size: 24px; font-weight: bold; margin: 0;">+₹1,500 added to your balance</p>
              </div>
              <p style="color: #ccc;">Total earned so far: ₹${Number(ref.totalEarnings)}</p>
            </div>
          `,
        }).catch(console.error);
      }

      return { success: true };
    }),
});

// Check if current task is complete and advance to next
async function checkAndAdvanceTask(db: any, referrerId: number) {
  try {
    const ref = firstRow(await db.execute(sql`SELECT totalReferrals FROM referrers WHERE id = ${referrerId}`));
    if (!ref) return;

    const activeTask = firstRow(await db.execute(
      sql`SELECT * FROM referralTasks WHERE referrerId = ${referrerId} AND status = 'active' ORDER BY taskNumber ASC LIMIT 1`
    ));
    if (!activeTask) return;

    const completed = activeTask.completedReferrals + 1;
    if (completed >= activeTask.targetReferrals) {
      await db.execute(sql`UPDATE referralTasks SET status = 'completed', completedReferrals = ${completed}, completedAt = NOW() WHERE id = ${activeTask.id}`);
      const nextTask = activeTask.taskNumber + 1;
      await db.execute(
        sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
            VALUES (${referrerId}, ${nextTask}, 5, ${getMilestoneBonus(nextTask)})`
      );
    } else {
      await db.execute(sql`UPDATE referralTasks SET completedReferrals = ${completed} WHERE id = ${activeTask.id}`);
    }
  } catch (e) {
    console.error("Error advancing task:", e);
  }
}
