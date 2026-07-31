import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

// Helper: extract rows from mysql2 execute result (returns [rows, fields] tuple)
function rows(result: any): any[] {
  if (!result) return [];
  // mysql2 returns [RowDataPacket[], FieldPacket[]] — first element is the rows array
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  if (result.rows) return result.rows;
  return [];
}
function firstRow(result: any): any {
  return rows(result)[0] || null;
}

// Safe count: extracts numeric count from a COUNT(*) result row
function safeCount(result: any): number {
  const row = firstRow(result);
  if (!row) return 0;
  // MySQL COUNT(*) returns as 'cnt' alias or as a BigInt
  const val = row.cnt ?? row["COUNT(*)"] ?? 0;
  return Number(val) || 0;
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

    try {
      const [
        newLeadsTodayRes,
        urgentLeadsRes,
        unassignedLeadsRes,
        overdueLeadsRes,
        newAssociatesTodayRes,
        inactiveAssociatesRes,
        pendingWithdrawalsRes,
        followUpsDueRes,
        pendingKycRes,
      ] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as cnt FROM leads2 WHERE DATE(createdAt) = ${todayStr}`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM leads2 WHERE priority IN ('urgent','high') AND status NOT IN ('converted','lost')`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM leads2 WHERE assignedTo IS NULL AND status NOT IN ('converted','lost')`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM leads2 WHERE status = 'contacted' AND lastContactedAt < DATE_SUB(NOW(), INTERVAL 7 DAY)`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM referrers WHERE DATE(createdAt) = ${todayStr}`).catch(() => [[{ cnt: 0 }]]),
        db.execute(sql`SELECT COUNT(*) as cnt FROM referrers WHERE (lastActiveDate IS NULL OR lastActiveDate < DATE_SUB(NOW(), INTERVAL 14 DAY)) AND status = 'active'`).catch(() => [[{ cnt: 0 }]]),
        db.execute(sql`SELECT COUNT(*) as cnt FROM withdrawals WHERE status = 'pending'`).catch(() => [[{ cnt: 0 }]]),
        db.execute(sql`SELECT COUNT(*) as cnt FROM leads2 WHERE status = 'contacted' AND lastContactedAt < DATE_SUB(NOW(), INTERVAL 3 DAY)`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM referrers WHERE signupBonusPaid = 0 AND status = 'active'`).catch(() => [[{ cnt: 0 }]]),
      ]);

      return {
        newLeadsToday: safeCount(newLeadsTodayRes),
        urgentLeads: safeCount(urgentLeadsRes),
        unassignedLeads: safeCount(unassignedLeadsRes),
        overdueLeads: safeCount(overdueLeadsRes),
        newAssociatesToday: safeCount(newAssociatesTodayRes),
        inactiveAssociates: safeCount(inactiveAssociatesRes),
        pendingWithdrawals: safeCount(pendingWithdrawalsRes),
        followUpsDue: safeCount(followUpsDueRes),
        pendingKyc: safeCount(pendingKycRes),
      };
    } catch (err) {
      console.error("[Copilot] getDailySummary error:", err);
      return null;
    }
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

    try {
      // High-score unassigned leads
      const topUnassigned = rows(await db.execute(
        sql`SELECT id, firstName, lastName, leadScore, state FROM leads2 WHERE assignedTo IS NULL AND status NOT IN ('converted','lost') ORDER BY leadScore DESC LIMIT 3`
      ));
      for (const lead of topUnassigned) {
        const firstName = lead.firstName || lead.first_name || "";
        const lastName = lead.lastName || lead.last_name || "";
        const score = Number(lead.leadScore || lead.lead_score || 0);
        const state = lead.state || "unknown state";
        const id = lead.id;
        recommendations.push({
          priority: score >= 80 ? "critical" : "high",
          reason: `Score ${score} — unassigned lead from ${state}`,
          record: `${firstName} ${lastName} (Lead #${id})`.trim() || `Lead #${id}`,
          nextStep: "Open Leads page → assign to a partner or contact directly",
          type: "lead",
        });
      }

      // Overdue contacts
      const overdueContacts = rows(await db.execute(
        sql`SELECT id, firstName, lastName, lastContactedAt FROM leads2 WHERE status = 'contacted' AND lastContactedAt < DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY lastContactedAt ASC LIMIT 2`
      ));
      for (const lead of overdueContacts) {
        const firstName = lead.firstName || lead.first_name || "";
        const lastName = lead.lastName || lead.last_name || "";
        const lastContacted = lead.lastContactedAt || lead.last_contacted_at;
        const daysSince = lastContacted
          ? Math.floor((Date.now() - new Date(lastContacted).getTime()) / 86400000)
          : "many";
        recommendations.push({
          priority: "high",
          reason: `No contact for ${daysSince} days`,
          record: `${firstName} ${lastName} (Lead #${lead.id})`.trim() || `Lead #${lead.id}`,
          nextStep: "Open Leads page → update status or send follow-up",
          type: "lead",
        });
      }

      // Pending withdrawals
      const pendingW = rows(await db.execute(
        sql`SELECT w.id, w.amount, r.name as referrerName FROM withdrawals w JOIN referrers r ON w.referrerId = r.id WHERE w.status = 'pending' ORDER BY w.createdAt ASC LIMIT 2`
      ).catch(() => [[]]));
      for (const w of pendingW) {
        const name = w.referrerName || w.referrer_name || "Associate";
        recommendations.push({
          priority: "medium",
          reason: `Withdrawal of ₹${w.amount || 0} pending approval`,
          record: `${name} (Withdrawal #${w.id})`,
          nextStep: "Open Referral Management → Withdrawals tab → approve or reject",
          type: "commission",
        });
      }

      // Inactive associates
      const inactiveAssoc = rows(await db.execute(
        sql`SELECT id, name, email, lastActiveDate FROM referrers WHERE (lastActiveDate IS NULL OR lastActiveDate < DATE_SUB(NOW(), INTERVAL 14 DAY)) AND status = 'active' ORDER BY totalReferrals DESC LIMIT 2`
      ).catch(() => [[]]));
      for (const assoc of inactiveAssoc) {
        const lastActive = assoc.lastActiveDate || assoc.last_active_date;
        const daysSince = lastActive
          ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
          : null;
        recommendations.push({
          priority: "low",
          reason: daysSince ? `Inactive for ${daysSince} days` : "Never been active",
          record: `${assoc.name || "Associate"} (Associate #${assoc.id})`,
          nextStep: "Open Referral Management → send re-engagement message",
          type: "associate",
        });
      }
    } catch (err) {
      console.error("[Copilot] getPriorityRecommendations error:", err);
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
      let leadsSnapshot: any[] = [];
      let associatesSnapshot: any[] = [];
      let withdrawalsSnapshot: any[] = [];

      try {
        const [leadsData, associatesData, withdrawalsData] = await Promise.all([
          db.execute(sql`SELECT id, firstName, lastName, status, priority, leadScore, state, createdAt, lastContactedAt, assignedTo FROM leads2 ORDER BY createdAt DESC LIMIT 50`),
          db.execute(sql`SELECT id, name, email, totalEarnings, totalReferrals, status, qualityScore, dailyStreak, lastActiveDate FROM referrers ORDER BY totalReferrals DESC LIMIT 30`),
          db.execute(sql`SELECT w.id, w.amount, w.status, w.createdAt, r.name as referrerName FROM withdrawals w JOIN referrers r ON w.referrerId = r.id ORDER BY w.createdAt DESC LIMIT 20`).catch(() => [[]]),
        ]);
        leadsSnapshot = rows(leadsData).map(l => ({
          id: l.id,
          name: `${l.firstName || l.first_name || ""} ${l.lastName || l.last_name || ""}`.trim() || `Lead #${l.id}`,
          status: l.status, priority: l.priority,
          score: l.leadScore || l.lead_score, state: l.state,
          created: l.createdAt, lastContacted: l.lastContactedAt,
        }));
        associatesSnapshot = rows(associatesData).map(a => ({
          id: a.id, name: a.name || "Associate",
          referrals: a.totalReferrals, earnings: a.totalEarnings,
          status: a.status, lastActive: a.lastActiveDate,
        }));
        withdrawalsSnapshot = rows(withdrawalsData).map(w => ({
          id: w.id, amount: w.amount, status: w.status,
          referrer: w.referrerName || w.referrer_name,
        }));
      } catch (err) {
        console.error("[Copilot] askCopilot data fetch error:", err);
      }

      const context = `
You are the Owner AI Copilot for Sales Squad Leads — a solar lead generation platform.
You are speaking to the owner/admin. Today is ${new Date().toLocaleDateString("en-IN")}.

CURRENT DATA SNAPSHOT:
Leads (last 50): ${JSON.stringify(leadsSnapshot)}

Associates (top 30): ${JSON.stringify(associatesSnapshot)}

Withdrawals (last 20): ${JSON.stringify(withdrawalsSnapshot)}

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
