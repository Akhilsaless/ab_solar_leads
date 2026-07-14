import { getDb } from "./db";
import { sql } from "drizzle-orm";

export async function getAllReferrers(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT id, uniqueCode, name, phone, email, totalEarnings, totalReferrals, status FROM referrers WHERE agencyId = ${agencyId} ORDER BY totalEarnings DESC`
    );
    return result as any[];
  } catch (error) {
    console.error("Error getting referrers:", error);
    return [];
  }
}

export async function getAllReferrals(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT r.id, r.referrerId, r.customerName, r.customerPhone, r.customerEmail, r.monthlyBill, r.state, r.status, r.signupBonusPaid, r.installationBonusPaid, ref.name as referrerName 
          FROM referrals r 
          JOIN referrers ref ON r.referrerId = ref.id 
          WHERE ref.agencyId = ${agencyId} 
          ORDER BY r.createdAt DESC`
    );
    return result as any[];
  } catch (error) {
    console.error("Error getting referrals:", error);
    return [];
  }
}

export async function getPendingWithdrawals(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.execute(
      sql`SELECT w.id, w.referrerId, w.amount, w.upiId, w.bankAccount, w.bankIfsc, w.status, w.createdAt, ref.name as referrerName, ref.phone as referrerPhone, ref.email as referrerEmail
          FROM withdrawals w
          JOIN referrers ref ON w.referrerId = ref.id
          WHERE ref.agencyId = ${agencyId} AND w.status = 'pending'
          ORDER BY w.createdAt ASC`
    );
    return result as any[];
  } catch (error) {
    console.error("Error getting pending withdrawals:", error);
    return [];
  }
}

export async function approveWithdrawal(withdrawalId: number, agencyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get withdrawal details
    const withdrawal = await db.execute(
      sql`SELECT w.*, ref.agencyId FROM withdrawals w JOIN referrers ref ON w.referrerId = ref.id WHERE w.id = ${withdrawalId} AND ref.agencyId = ${agencyId}`
    );
    
    if (!withdrawal || (withdrawal as any[]).length === 0) {
      throw new Error("Withdrawal not found");
    }
    
    // Update withdrawal status
    await db.execute(
      sql`UPDATE withdrawals SET status = 'approved', processedAt = NOW() WHERE id = ${withdrawalId}`
    );
    
    return { success: true, message: "Withdrawal approved" };
  } catch (error) {
    console.error("Error approving withdrawal:", error);
    throw error;
  }
}

export async function rejectWithdrawal(withdrawalId: number, agencyId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Verify withdrawal belongs to agency
    const withdrawal = await db.execute(
      sql`SELECT w.*, ref.agencyId FROM withdrawals w JOIN referrers ref ON w.referrerId = ref.id WHERE w.id = ${withdrawalId} AND ref.agencyId = ${agencyId}`
    );
    
    if (!withdrawal || (withdrawal as any[]).length === 0) {
      throw new Error("Withdrawal not found");
    }
    
    // Update withdrawal status
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
    
    // Update referral status
    await db.execute(
      sql`UPDATE referrals SET status = 'completed', installationBonusPaid = true WHERE id = ${referralId}`
    );
    
    // Add installation bonus to referrer
    await db.execute(
      sql`UPDATE referrers SET totalEarnings = totalEarnings + ${ref.installationBonus} WHERE id = ${ref.referrerId}`
    );
    
    // Check if task is completed
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
    
    // Get current task
    const task = await db.execute(
      sql`SELECT * FROM referralTasks WHERE referrerId = ${referrerId} AND taskNumber = ${ref.currentTaskNumber} AND status = 'active'`
    );
    
    if (!task || (task as any[]).length === 0) {
      // Create new task
      const taskNumber = ref.currentTaskNumber;
      const bonusPerReferral = Math.min(20 + (taskNumber - 1) * 20, 100);
      
      await db.execute(
        sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
            VALUES (${referrerId}, ${taskNumber}, 5, ${bonusPerReferral})`
      );
    } else {
      const currentTask = (task as any[])[0];
      const completedCount = currentTask.completedReferrals + 1;
      
      if (completedCount >= currentTask.targetReferrals) {
        // Task completed, move to next
        await db.execute(
          sql`UPDATE referralTasks SET status = 'completed', completedAt = NOW() WHERE id = ${currentTask.id}`
        );
        
        // Create next task
        const nextTaskNumber = ref.currentTaskNumber + 1;
        const nextBonusPerReferral = Math.min(20 + (nextTaskNumber - 1) * 20, 100);
        
        await db.execute(
          sql`UPDATE referrers SET currentTaskNumber = ${nextTaskNumber} WHERE id = ${referrerId}`
        );
        
        await db.execute(
          sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
              VALUES (${referrerId}, ${nextTaskNumber}, 5, ${nextBonusPerReferral})`
        );
      } else {
        // Update current task progress
        await db.execute(
          sql`UPDATE referralTasks SET completedReferrals = ${completedCount} WHERE id = ${currentTask.id}`
        );
      }
    }
  } catch (error) {
    console.error("Error checking task completion:", error);
  }
}
