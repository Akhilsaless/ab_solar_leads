import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./_core/emailService";

/**
 * Process approved withdrawal - simulate payment to UPI/Bank
 * In production, integrate with actual payment gateway
 */
export async function processWithdrawal(withdrawalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get withdrawal details
    const withdrawal = await db.execute(
      sql`SELECT w.*, ref.name, ref.email, ref.upiId, ref.bankAccount, ref.bankIfsc FROM withdrawals w 
          JOIN referrers ref ON w.referrerId = ref.id 
          WHERE w.id = ${withdrawalId} AND w.status = 'approved'`
    );

    if (!withdrawal || (withdrawal as any[]).length === 0) {
      throw new Error("Withdrawal not found or not approved");
    }

    const w = (withdrawal as any[])[0];

    // Simulate payment processing
    const paymentMethod = w.upiId ? "UPI" : "Bank Transfer";
    const paymentDetails = w.upiId || `${w.bankAccount} (IFSC: ${w.bankIfsc})`;

    console.log(`[Payment] Processing ${paymentMethod} of ₹${w.amount} to ${paymentDetails}`);

    // Update withdrawal status to processed
    await db.execute(
      sql`UPDATE withdrawals SET status = 'processed', processedAt = NOW() WHERE id = ${withdrawalId}`
    );

    // Send payment confirmation email
    try {
      await sendEmail({
        to: w.email,
        subject: "Payment Processed Successfully!",
        html: `
          <h2>Payment Processed</h2>
          <p>Your withdrawal of <strong>₹${w.amount}</strong> has been processed successfully!</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Details:</strong> ${paymentDetails}</p>
          <p>The amount should appear in your account within 1-2 business days.</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send payment confirmation email:", error);
    }

    return { success: true, message: "Payment processed successfully" };
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    throw error;
  }
}

/**
 * Process referral bonuses - called when referral status changes
 */
export async function processReferralBonus(referralId: number, bonusType: "signup" | "installation") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const referral = await db.execute(
      sql`SELECT r.*, ref.name, ref.email FROM referrals r 
          JOIN referrers ref ON r.referrerId = ref.id 
          WHERE r.id = ${referralId}`
    );

    if (!referral || (referral as any[]).length === 0) {
      throw new Error("Referral not found");
    }

    const ref = (referral as any[])[0];
    const bonusAmount = bonusType === "signup" ? ref.signupBonus : ref.installationBonus;
    const bonusField = bonusType === "signup" ? "signupBonusPaid" : "installationBonusPaid";

    // Update bonus payment status
    await db.execute(
      sql`UPDATE referrals SET ${bonusField} = true WHERE id = ${referralId}`
    );

    // Send bonus notification email
    try {
      const bonusTitle = bonusType === "signup" ? "Signup Bonus" : "Installation Bonus";
      await sendEmail({
        to: ref.email,
        subject: `${bonusTitle} Credited! ₹${bonusAmount}`,
        html: `
          <h2>Bonus Credited!</h2>
          <p>Congratulations! Your ${bonusTitle.toLowerCase()} of <strong>₹${bonusAmount}</strong> has been credited to your account.</p>
          <p>You can now request a withdrawal from your dashboard.</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send bonus email:", error);
    }

    return { success: true, bonusAmount };
  } catch (error) {
    console.error("Error processing referral bonus:", error);
    throw error;
  }
}

/**
 * Get payment status for a withdrawal
 */
export async function getPaymentStatus(withdrawalId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(
      sql`SELECT id, amount, status, processedAt FROM withdrawals WHERE id = ${withdrawalId}`
    );

    if (!result || (result as any[]).length === 0) {
      return null;
    }

    return (result as any[])[0];
  } catch (error) {
    console.error("Error getting payment status:", error);
    return null;
  }
}
