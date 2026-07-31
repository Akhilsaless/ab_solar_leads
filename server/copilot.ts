import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

// Helper: raw SQL rows
function rows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.rows) return result.rows;
  return [];
}
function firstRow(result: any): any {
  return rows(result)[0] || null;
}

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  // Allow any authenticated user (owner) — this app has single-owner model
  return next({ ctx });
});

export const copilotRouter = router({
  // ── Today Summary ─────────────────────────────────────────────────────────
  getDailySummary: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    // New leads today
    const newLeadsToday = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM leads2 WHERE DATE(createdAt) = ${todayStr}`
    ));

    // Urgent / high priority leads
    const urgentLeads = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM leads2 WHERE priority IN ('urgent','high') AND status NOT IN ('converted','lost')`
    ));

    // Unassigned leads
    const unassignedLeads = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM leads2 WHERE assignedTo IS NULL AND status NOT IN ('converted','lost')`
    ));

    // Overdue leads (contacted > 7 days ago, not converted)
    const overdueLeads = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM leads2 WHERE status = 'contacted' AND lastContactedAt < DATE_SUB(NOW(), INTERVAL 7 DAY)`
    ));

    // New associates today
    const newAssociatesToday = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM referrers WHERE DATE(createdAt) = ${todayStr}`
    )).catch(() => ({ cnt: 0 }));

    // Associates with no activity in 14 days
    const inactiveAssociates = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM referrers WHERE (lastActiveDate IS NULL OR lastActiveDate < DATE_SUB(NOW(), INTERVAL 14 DAY)) AND status = 'active'`
    ));

    // Pending commission withdrawals
    const pendingWithdrawals = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'pending'`
    ));

    // Follow-ups due (leads with followUpDue or contacted > 3 days ago)
    const followUpsDue = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM leads2 WHERE status = 'contacted' AND lastContactedAt < DATE_SUB(NOW(), INTERVAL 3 DAY)`
    ));

    // Associates pending KYC (acceptedTnC = 0 or signupBonusPaid = 0)
    const pendingKyc = firstRow(await db.execute(
      sql`SELECT COUNT(*) as cnt FROM referrers WHERE signupBonusPaid = 0 AND status = 'active'`
    ));

    return {
      newLeadsToday: Number(newLeadsToday?.cnt || 0),
      urgentLeads: Number(urgentLeads?.cnt || 0),
      unassignedLeads: Number(unassignedLeads?.cnt || 0),
      overdueLeads: Number(overdueLeads?.cnt || 0),
      newAssociatesToday: Number((await newAssociatesToday)?.cnt || 0),
      inactiveAssociates: Number(inactiveAssociates?.cnt || 0),
      pendingWithdrawals: Number(pendingWithdrawals?.cnt || 0),
      followUpsDue: Number(followUpsDue?.cnt || 0),
      pendingKyc: Number(pendingKyc?.cnt || 0),
    };
  }),

  // ── Priority Recommendations ───────────────────────────────────────────────
  getPriorityRecommendations: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const recommendations: Array<{
      priority: "critical" | "high" | "medium" | "low";
      reason: string;
      record: string;
      nextStep: string;
      type: string;
    }> = [];

    // High-score unassigned leads
    const topUnassigned = rows(await db.execute(
      sql`SELECT id, firstName, lastName, leadScore, state, monthlyEnergyBill FROM leads2 WHERE assignedTo IS NULL AND status NOT IN ('converted','lost') ORDER BY leadScore DESC LIMIT 3`
    ));
    for (const lead of topUnassigned) {
      recommendations.push({
        priority: Number(lead.leadScore) >= 80 ? "critical" : "high",
        reason: `Score ${lead.leadScore} — unassigned lead from ${lead.state || "unknown state"}`,
        record: `${lead.firstName} ${lead.lastName} (Lead #${lead.id})`,
        nextStep: "Open Leads page → assign to a partner or contact directly",
        type: "lead",
      });
    }

    // Overdue contacts
    const overdueContacts = rows(await db.execute(
      sql`SELECT id, firstName, lastName, lastContactedAt FROM leads2 WHERE status = 'contacted' AND lastContactedAt < DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY lastContactedAt ASC LIMIT 2`
    ));
    for (const lead of overdueContacts) {
      recommendations.push({
        priority: "high",
        reason: `No contact for ${Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000)} days`,
        record: `${lead.firstName} ${lead.lastName} (Lead #${lead.id})`,
        nextStep: "Open Leads page → update status or send follow-up",
        type: "lead",
      });
    }

    // Pending withdrawals
    const pendingW = rows(await db.execute(
      sql`SELECT w.id, w.amount, r.name as referrerName FROM withdrawals w JOIN referrers r ON w.referrerId = r.id WHERE w.status = 'pending' ORDER BY w.createdAt ASC LIMIT 2`
    ));
    for (const w of pendingW) {
      recommendations.push({
        priority: "medium",
        reason: `Withdrawal of ₹${w.amount} pending approval`,
        record: `${w.referrerName} (Withdrawal #${w.id})`,
        nextStep: "Open Referral Management → Withdrawals tab → approve or reject",
        type: "commission",
      });
    }

    // Inactive associates
    const inactiveAssoc = rows(await db.execute(
      sql`SELECT id, name, email, lastActiveDate FROM referrers WHERE (lastActiveDate IS NULL OR lastActiveDate < DATE_SUB(NOW(), INTERVAL 14 DAY)) AND status = 'active' ORDER BY totalReferrals DESC LIMIT 2`
    ));
    for (const assoc of inactiveAssoc) {
      const daysSince = assoc.lastActiveDate
        ? Math.floor((Date.now() - new Date(assoc.lastActiveDate).getTime()) / 86400000)
        : null;
      recommendations.push({
        priority: "low",
        reason: daysSince ? `Inactive for ${daysSince} days` : "Never been active",
        record: `${assoc.name} (Associate #${assoc.id})`,
        nextStep: "Open Referral Management → send re-engagement message",
        type: "associate",
      });
    }

    return recommendations.slice(0, 8);
  }),

  // ── Ask Copilot ────────────────────────────────────────────────────────────
  askCopilot: adminProcedure
    .input(z.object({ question: z.string().min(1).max(500) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Gather context data
      const [leadsData, associatesData, withdrawalsData] = await Promise.all([
        db.execute(sql`SELECT id, firstName, lastName, status, priority, leadScore, state, createdAt, lastContactedAt, assignedTo FROM leads2 ORDER BY createdAt DESC LIMIT 50`),
        db.execute(sql`SELECT id, name, email, totalEarnings, totalReferrals, status, qualityScore, dailyStreak, lastActiveDate FROM referrers ORDER BY totalReferrals DESC LIMIT 30`),
        db.execute(sql`SELECT w.id, w.amount, w.status, w.createdAt, r.name as referrerName FROM withdrawals w JOIN referrers r ON w.referrerId = r.id ORDER BY w.createdAt DESC LIMIT 20`),
      ]);

      const context = `
You are the Owner AI Copilot for Sales Squad Leads — a solar lead generation platform.
You are speaking to the owner/admin. Today is ${new Date().toLocaleDateString("en-IN")}.

CURRENT DATA SNAPSHOT:
Leads (last 50): ${JSON.stringify(rows(leadsData).map(l => ({
  id: l.id, name: `${l.firstName} ${l.lastName}`, status: l.status,
  priority: l.priority, score: l.leadScore, state: l.state,
  created: l.createdAt, lastContacted: l.lastContactedAt
})))}

Associates (top 30): ${JSON.stringify(rows(associatesData).map(a => ({
  id: a.id, name: a.name, referrals: a.totalReferrals,
  earnings: a.totalEarnings, status: a.status, lastActive: a.lastActiveDate
})))}

Withdrawals (last 20): ${JSON.stringify(rows(withdrawalsData).map(w => ({
  id: w.id, amount: w.amount, status: w.status, referrer: w.referrerName
})))}

STRICT RULES:
- You are READ-ONLY. Never suggest deleting records, sending messages, approving payments, changing commissions, changing pricing, changing roles, or performing bulk actions.
- Only use the data provided above. Never invent data.
- Be concise, practical, and actionable.
- Format responses clearly with sections if needed.
- If asked to draft a message, draft it but remind the owner to send it manually.
`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: context },
          { role: "user", content: input.question },
        ],
      });

      const answer = response?.choices?.[0]?.message?.content || "I could not generate a response. Please try again.";
      return { answer };
    }),
});
