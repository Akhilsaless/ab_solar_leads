import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { nanoid } from "nanoid";
import { getDb } from "./db";

const otpStore = new Map<string, { otp: string; expiresAt: number; data: any }>();

export const referrerRouter = router({
  sendOtp: publicProcedure
    .input(z.object({ name: z.string(), phone: z.string(), email: z.string().email() }))
    .mutation(async ({ input }: any) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      otpStore.set(input.phone, { otp, expiresAt, data: input });

      console.log(`OTP for ${input.phone}: ${otp}`);

      return { success: true, message: "OTP sent to your phone" };
    }),

  verifyOtpAndSignup: publicProcedure
    .input(z.object({ phone: z.string(), otp: z.string() }))
    .mutation(async ({ input }: any) => {
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

      // For now, just return the unique code
      // In production, this would save to database
      otpStore.delete(input.phone);

      return { success: true, uniqueCode };
    }),

  getDashboard: publicProcedure
    .input(z.object({ uniqueCode: z.string() }))
    .query(async ({ input }: any) => {
      // Placeholder - returns mock data for now
      return {
        referrer: {
          id: 1,
          name: "Sample Referrer",
          totalEarnings: 5000,
          totalReferrals: 3,
          uniqueCode: input.uniqueCode,
        },
        referrals: [],
        tasks: [
          {
            id: 1,
            taskNumber: 1,
            targetReferrals: 5,
            completedReferrals: 3,
            bonusPerReferral: 20,
            totalBonus: 60,
            status: "active",
          },
        ],
        withdrawals: [],
      };
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
    .mutation(async ({ input }: any) => {
      return { success: true, message: "Withdrawal request submitted" };
    }),

  getLeaderboard: publicProcedure.query(async () => {
    return [
      { id: 1, name: "Top Referrer", totalEarnings: 50000, totalReferrals: 25 },
      { id: 2, name: "Great Referrer", totalEarnings: 35000, totalReferrals: 18 },
      { id: 3, name: "Good Referrer", totalEarnings: 20000, totalReferrals: 10 },
    ];
  }),

  // Admin procedures
  getAllReferrers: publicProcedure.query(async () => {
    // Returns all referrers with their earnings
    return [
      { id: 1, name: "Sample Referrer", phone: "9876543210", email: "ref@example.com", totalEarnings: 5000, totalReferrals: 3 },
    ];
  }),

  getAllReferrals: publicProcedure.query(async () => {
    // Returns all referrals with status
    return [
      { id: 1, customerName: "John Doe", referrerName: "Sample Referrer", monthlyBill: 5000, status: "pending" },
    ];
  }),

  getPendingWithdrawals: publicProcedure.query(async () => {
    // Returns pending withdrawal requests
    return [
      { id: 1, referrerName: "Sample Referrer", referrerPhone: "9876543210", amount: 5000, upiId: "ref@upi", status: "pending" },
    ];
  }),

  approveWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.number() }))
    .mutation(async ({ input }: any) => {
      return { success: true, message: "Withdrawal approved" };
    }),

  rejectWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }: any) => {
      return { success: true, message: "Withdrawal rejected" };
    }),
});
