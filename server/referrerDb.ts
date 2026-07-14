import { getDb } from "./db";
import { sql } from "drizzle-orm";

export async function getAllReferrers(agencyId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT id, uniqueCode, name, email, totalEarnings, totalReferrals, status FROM referrers ORDER BY totalEarnings DESC`
    );
    return result as any[];
  } catch (error) {
    console.error("Error getting referrers:", error);
    return [];
  }
}

export async function getAllReferrals(agencyId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT r.id, r.referrerId, r.customerName, r.customerPhone, r.customerEmail, r.monthlyBill, r.state, r.status, r.signupBonusPaid, r.installationBonusPaid, ref.name as referrerName 
          FROM referrals r 
          JOIN referrers ref ON r.referrerId = ref.id 
          ORDER BY r.createdAt DESC`
    );
    return result as any[];
  } catch (error) {
    console.error("Error getting referrals:", error);
    return [];
  }
}

export async function getPendingWithdrawals(agencyId?: number) {
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
    return result as any[];
  } catch (error) {
    console.error("Error getting pending withdrawals:", error);
    return [];
  }
}

export async function approveWithdrawal(withdrawalId: number, agencyId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const withdrawal = await db.execute(
      sql`SELECT w.* FROM withdrawals w WHERE w.id = ${withdrawalId}`
    );
    
    if (!withdrawal || (withdrawal as any[]).length === 0) {
      throw new Error("Withdrawal not found");
    }
    
    await db.execute(
      sql`UPDATE withdrawals SET status = 'approved', processedAt = NOW() WHERE id = ${withdrawalId}`
    );
    
    return { success: true, message: "Withdrawal approved" };
  } catch (error) {
    console.error("Error approving withdrawal:", error);
    throw error;
  }
}

export async function rejectWithdrawal(withdrawalId: number, agencyId?: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const withdrawal = await db.execute(
      sql`SELECT w.* FROM withdrawals w WHERE w.id = ${withdrawalId}`
    );
    
    if (!withdrawal || (withdrawal as any[]).length === 0) {
      throw new Error("Withdrawal not found");
    }
    
    await db.execute(
      sql`UPDATE withdrawals SET status = 'rejected', rejectionReason = ${reason || null} WHERE id = ${withdrawalId}`
    );
    
    return { success: true, message: "Withdrawal rejected" };
  } catch (error) {
    console.error("Error rejecting withdrawal:", error);
    throw error;
  }
}

export async function recordReferralSignup(referrerId: number, conversationId: number, customerData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.execute(
      sql`INSERT INTO referrals (referrerId, conversationId, customerName, customerPhone, customerEmail, monthlyBill, state, status) 
          VALUES (${referrerId}, ${conversationId}, ${customerData.name}, ${customerData.phone}, ${customerData.email}, ${customerData.bill}, ${customerData.state}, 'pending')`
    );
    
    // Update referrer's total referrals and add signup bonus
    await db.execute(
      sql`UPDATE referrers SET totalReferrals = totalReferrals + 1, totalEarnings = totalEarnings + 500 WHERE id = ${referrerId}`
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error recording referral signup:", error);
    throw error;
  }
}

export async function confirmReferralInstallation(referralId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const referral = await db.execute(
      sql`SELECT * FROM referrals WHERE id = ${referralId}`
    );
    
    if (!referral || (referral as any[]).length === 0) {
      throw new Error("Referral not found");
    }
    
    const ref = (referral as any[])[0];
    
    await db.execute(
      sql`UPDATE referrals SET status = 'completed', installationBonusPaid = true WHERE id = ${referralId}`
    );
    
    await db.execute(
      sql`UPDATE referrers SET totalEarnings = totalEarnings + ${ref.installationBonus || 1500} WHERE id = ${ref.referrerId}`
    );
    
    await checkAndCompleteTask(ref.referrerId);
    
    return { success: true, message: "Installation confirmed" };
  } catch (error) {
    console.error("Error confirming installation:", error);
    throw error;
  }
}

async function checkAndCompleteTask(referrerId: number) {
  const db = await getDb();
  if (!db) return;
  
  try {
    const referrer = await db.execute(
      sql`SELECT * FROM referrers WHERE id = ${referrerId}`
    );
    
    if (!referrer || (referrer as any[]).length === 0) return;
    
    const ref = (referrer as any[])[0];
    const taskNumber = ref.currentTaskNumber || 1;
    
    const task = await db.execute(
      sql`SELECT * FROM referralTasks WHERE referrerId = ${referrerId} AND taskNumber = ${taskNumber} AND status = 'active'`
    );
    
    if (!task || (task as any[]).length === 0) {
      const bonusPerReferral = Math.min(20 + (taskNumber - 1) * 20, 100);
      await db.execute(
        sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
            VALUES (${referrerId}, ${taskNumber}, 5, ${bonusPerReferral})`
      );
    } else {
      const currentTask = (task as any[])[0];
      const completedCount = currentTask.completedReferrals + 1;
      
      if (completedCount >= currentTask.targetReferrals) {
        await db.execute(
          sql`UPDATE referralTasks SET status = 'completed', completedAt = NOW() WHERE id = ${currentTask.id}`
        );
        
        const nextTaskNumber = taskNumber + 1;
        const nextBonusPerReferral = Math.min(20 + (nextTaskNumber - 1) * 20, 100);
        
        await db.execute(
          sql`UPDATE referrers SET currentTaskNumber = ${nextTaskNumber} WHERE id = ${referrerId}`
        );
        
        await db.execute(
          sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
              VALUES (${referrerId}, ${nextTaskNumber}, 5, ${nextBonusPerReferral})`
        );
      } else {
        await db.execute(
          sql`UPDATE referralTasks SET completedReferrals = ${completedCount} WHERE id = ${currentTask.id}`
        );
      }
    }
  } catch (error) {
    console.error("Error checking task completion:", error);
  }
}
