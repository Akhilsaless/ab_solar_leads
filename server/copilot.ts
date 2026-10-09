import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getDb, getAgencyByUserId } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./_core/emailService";
import { notifyOwner } from "./_core/notification";
import { invokeAiGateway } from "./aiGateway";
import { ENV } from "./_core/env";
import { calculateEvidenceScore } from "./evidenceScore";
import { istDayBounds } from "../shared/reportingTime";

// ─── Helpers ────────────────────────────────────────────────────────────────

function rows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  if (result.rows) return result.rows;
  return [];
}
function firstRow(result: any): any { return rows(result)[0] || null; }
function safeCount(result: any): number {
  const row = firstRow(result);
  if (!row) return 0;
  const val = row.cnt ?? row["COUNT(*)"] ?? 0;
  return Number(val) || 0;
}

type KlausProviderConfig = {
  provider: "builtin" | "openai_compatible";
  externalBaseUrl?: string | null;
  externalModel?: string | null;
};

export function normalizeExternalBaseUrl(value: string) {
  const url = new URL(value);
  const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
  if (url.protocol !== "https:" || localHosts.has(url.hostname)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "External AI endpoint must use public HTTPS." });
  }
  return url.toString().replace(/\/$/, "");
}

async function invokeKlaus(
  params: { messages: any[]; tools?: any; tool_choice?: any },
  config: KlausProviderConfig,
  agencyId: number,
) {
  try {
    const gateway = await invokeAiGateway({ agencyId, feature: "klaus", messages: params.messages, tools: params.tools, tool_choice: params.tool_choice });
    return gateway.result;
  } catch (gatewayError) {
    // Preserve the previously configured single-provider connector during migration.
    if (config.provider !== "openai_compatible") throw gatewayError;
    const apiKey = process.env.KLAUS_EXTERNAL_API_KEY;
    if (!apiKey) throw gatewayError;
    const baseUrl = normalizeExternalBaseUrl(config.externalBaseUrl || "https://api.openai.com/v1");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.externalModel || "gpt-4o-mini", messages: params.messages, ...(params.tools ? { tools: params.tools, tool_choice: params.tool_choice || "auto" } : {}), temperature: 0.2 }),
    });
    if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "The configured AI provider is currently unavailable. Please try again shortly." });
    return await response.json();
  }
}

// ─── Agent Tool Definitions ──────────────────────────────────────────────────

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "Get live statistics: emails sent today, email opens, chatbot clicks, leads count, outreach runs, scraped businesses, partner signups. Use for any question about numbers, counts, or performance.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["emails_today", "email_opens", "chatbot_clicks", "leads_count", "outreach_runs_today", "scraped_today", "partner_signups", "all"],
            description: "Which metric to fetch. Use 'all' for a full overview."
          }
        },
        required: ["metric"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_leads_contacted",
      description: "List businesses that were emailed today or recently. Shows business name, email, city, email open count, chatbot clicks.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["today", "opened", "clicked_chatbot", "all_recent"],
            description: "Filter: 'today' = emailed today, 'opened' = opened email, 'clicked_chatbot' = clicked chatbot link, 'all_recent' = last 7 days"
          },
          limit: { type: "number", description: "Max results to return (default 20)" }
        },
        required: ["filter"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email_to_business",
      description: "Send a personalised solar pitch email to a specific business. Provide business name, email, and optionally city/state for context.",
      parameters: {
        type: "object",
        properties: {
          businessName: { type: "string", description: "Name of the business" },
          email: { type: "string", description: "Email address to send to" },
          city: { type: "string", description: "City of the business (optional, for personalisation)" },
          state: { type: "string", description: "State of the business (optional)" },
          businessType: { type: "string", description: "Type of business e.g. factory, warehouse, hospital (optional)" }
        },
        required: ["businessName", "email"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_lead",
      description: "Delete a lead from the leads table by name or ID. Always confirm before deleting.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "number", description: "Lead ID to delete (preferred if known)" },
          leadName: { type: "string", description: "Lead name to search and delete (used if ID not known)" },
          confirmed: { type: "boolean", description: "Must be true to actually delete. If false, just preview what would be deleted." }
        },
        required: ["confirmed"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_outreach_config",
      description: "Update outreach settings: change target city/state, enable/disable outreach, add city to rotation.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["set_city", "enable", "disable", "add_to_rotation"],
            description: "What to update"
          },
          city: { type: "string", description: "City name (for set_city or add_to_rotation)" },
          state: { type: "string", description: "State name (for set_city or add_to_rotation)" }
        },
        required: ["action"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_hot_leads",
      description: "List the hottest leads — businesses that opened the email or clicked the chatbot link. Ranked by engagement.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 10)" }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_run_history",
      description: "Get the history of automated outreach runs — when they ran, how many scraped, how many emailed.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max runs to return (default 10)" }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_businesses",
      description: "Search scraped businesses by name, city, or business type.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (business name, city, or type)" },
          limit: { type: "number", description: "Max results (default 10)" }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  }
];

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(toolName: string, args: any, agencyId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "Database unavailable";

  try {
    switch (toolName) {
      case "get_stats": {
        const metric = args.metric || "all";
        const { start: dayStart, end: dayEnd } = istDayBounds();
        const results: Record<string, number> = {};

        if (metric === "emails_today" || metric === "all") {
          const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM scrapedBusinesses WHERE agencyId = ${agencyId} AND emailSentAt >= ${dayStart} AND emailSentAt < ${dayEnd}`);
          results.emailsSentToday = safeCount(r);
        }
        if (metric === "email_opens" || metric === "all") {
          const r = await db.execute(sql`SELECT SUM(emailOpenCount) as cnt FROM scrapedBusinesses WHERE agencyId = ${agencyId}`);
          results.totalEmailOpens = safeCount(r);
          const r2 = await db.execute(sql`SELECT COUNT(*) as cnt FROM scrapedBusinesses WHERE agencyId = ${agencyId} AND emailOpenCount > 0`);
          results.businessesThatOpened = safeCount(r2);
        }
        if (metric === "chatbot_clicks" || metric === "all") {
          const r = await db.execute(sql`SELECT SUM(chatbotClickCount) as cnt FROM scrapedBusinesses WHERE agencyId = ${agencyId}`);
          results.totalChatbotClicks = safeCount(r);
        }
        if (metric === "leads_count" || metric === "all") {
          const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM leads2 l LEFT JOIN conversations3 c ON c.id = l.conversationId WHERE COALESCE(l.agencyId, c.agencyId) = ${agencyId}`);
          results.totalLeads = safeCount(r);
        }
        if (metric === "outreach_runs_today" || metric === "all") {
          // Use IST offset (+5:30) for date comparison
          const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM outreachRuns WHERE agencyId = ${agencyId} AND startedAt >= ${dayStart} AND startedAt < ${dayEnd}`);
          results.runsToday = safeCount(r);
          const r2 = await db.execute(sql`SELECT COALESCE(SUM(emailSentCount),0) as cnt FROM outreachRuns WHERE agencyId = ${agencyId} AND startedAt >= ${dayStart} AND startedAt < ${dayEnd}`);
          results.emailsSentInRunsToday = safeCount(r2);
        }
        if (metric === "scraped_today" || metric === "all") {
          const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM scrapedBusinesses WHERE agencyId = ${agencyId} AND DATE(createdAt) = CURDATE()`);
          results.scrapedToday = safeCount(r);
        }
        if (metric === "partner_signups" || metric === "all") {
          const r = await db.execute(sql`SELECT COUNT(*) as cnt FROM solarPartners WHERE status = 'active'`);
          results.activePartners = safeCount(r);
          const r2 = await db.execute(sql`SELECT COUNT(*) as cnt FROM solarPartners WHERE DATE(createdAt) = CURDATE()`);
          results.newPartnersToday = safeCount(r2);
        }

        return JSON.stringify(results);
      }

      case "list_leads_contacted": {
        const filter = args.filter || "today";
        const limit = args.limit || 20;
        let whereClause = sql`agencyId = ${agencyId}`;

        if (filter === "today") {
          const r = await db.execute(sql`
            SELECT businessName, email, city, state, contactStatus, emailSentAt, emailOpenCount, chatbotClickCount
            FROM scrapedBusinesses
            WHERE agencyId = ${agencyId} AND emailSentAt IS NOT NULL AND DATE(FROM_UNIXTIME(emailSentAt/1000)) = CURDATE()
            ORDER BY emailSentAt DESC LIMIT ${limit}
          `);
          return JSON.stringify(rows(r));
        } else if (filter === "opened") {
          const r = await db.execute(sql`
            SELECT businessName, email, city, state, emailOpenCount, chatbotClickCount, lastOpenedAt
            FROM scrapedBusinesses
            WHERE agencyId = ${agencyId} AND emailOpenCount > 0
            ORDER BY emailOpenCount DESC LIMIT ${limit}
          `);
          return JSON.stringify(rows(r));
        } else if (filter === "clicked_chatbot") {
          const r = await db.execute(sql`
            SELECT businessName, email, city, state, emailOpenCount, chatbotClickCount
            FROM scrapedBusinesses
            WHERE agencyId = ${agencyId} AND chatbotClickCount > 0
            ORDER BY chatbotClickCount DESC LIMIT ${limit}
          `);
          return JSON.stringify(rows(r));
        } else {
          const r = await db.execute(sql`
            SELECT businessName, email, city, state, contactStatus, emailSentAt, emailOpenCount, chatbotClickCount
            FROM scrapedBusinesses
            WHERE agencyId = ${agencyId} AND emailSentAt IS NOT NULL
            ORDER BY emailSentAt DESC LIMIT ${limit}
          `);
          return JSON.stringify(rows(r));
        }
      }

      case "send_email_to_business": {
        const { businessName, email, city, state, businessType } = args;
        // Build a personalised pitch email
        const location = [city, state].filter(Boolean).join(", ") || "your area";
        const bType = businessType || "business";
        const subject = `Preliminary solar assessment for ${businessName}`;
        const body = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#000;color:#fff;padding:20px;">
            <div style="background:#F97316;padding:20px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;font-size:24px;">Sales Squad</h1>
              <p style="margin:4px 0 0;opacity:0.9;">AI-Powered Solar Lead Generation</p>
            </div>
            <div style="padding:24px;background:#111;border-radius:0 0 8px 8px;">
              <p>Dear ${businessName} Team,</p>
              <p>I'm Agent Klaus from Sales Squad. We can prepare a preliminary solar assessment for your ${bType} in ${location} after reviewing the electricity bill and site details.</p>
              <p>Savings, payback, tax treatment, and subsidy eligibility depend on the customer category, location, system design, current rules, and installer verification. We do not promise a fixed result before that review.</p>
              <p><strong>Get your free solar estimate in 2 minutes:</strong></p>
              <a href="${ENV.publicAppUrl}/chat/${ENV.defaultAgencySlug}" style="display:inline-block;background:#F97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Start Preliminary Assessment →</a>
              <p style="margin-top:24px;color:#aaa;font-size:13px;">Warm regards,<br><strong>Agent Klaus</strong><br>Sales Squad — Solar Lead Generation</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: email,
          subject,
          html: body,
        });

        // Log to DB
        await db.execute(sql`
          INSERT INTO scrapedBusinesses (agencyId, businessName, email, city, state, businessType, contactStatus, emailSentAt, source)
          VALUES (${agencyId}, ${businessName}, ${email}, ${city || null}, ${state || null}, ${businessType || null}, 'contacted', ${Date.now()}, 'copilot')
          ON DUPLICATE KEY UPDATE contactStatus = 'contacted', emailSentAt = ${Date.now()}
        `);

        return `Email sent successfully to ${email} for ${businessName}.`;
      }

      case "delete_lead": {
        const { leadId, leadName, confirmed } = args;

        if (!confirmed) {
          // Preview mode
          if (leadId) {
            const r = await db.execute(sql`SELECT id, firstName, lastName, email, status FROM leads2 WHERE agencyId = ${agencyId} AND id = ${leadId}`);
            const lead = firstRow(r);
            if (!lead) return `No lead found with ID ${leadId}.`;
            return `Would delete: ${lead.firstName} ${lead.lastName} (${lead.email}) — Status: ${lead.status}. Confirm to proceed.`;
          } else if (leadName) {
            const r = await db.execute(sql`SELECT id, firstName, lastName, email, status FROM leads2 WHERE agencyId = ${agencyId} AND CONCAT(firstName, ' ', lastName) LIKE ${'%' + leadName + '%'} LIMIT 5`);
            const found = rows(r);
            if (!found.length) return `No leads found matching "${leadName}".`;
            return `Found ${found.length} lead(s) matching "${leadName}": ${found.map((l: any) => `${l.firstName} ${l.lastName} (ID: ${l.id})`).join(", ")}. Confirm to delete.`;
          }
          return "Please provide a lead ID or name.";
        }

        // Actual delete
        if (leadId) {
          await db.execute(sql`DELETE FROM leads2 WHERE agencyId = ${agencyId} AND id = ${leadId}`);
          return `Lead #${leadId} deleted successfully.`;
        } else if (leadName) {
          const r = await db.execute(sql`SELECT id FROM leads2 WHERE agencyId = ${agencyId} AND CONCAT(firstName, ' ', lastName) LIKE ${'%' + leadName + '%'} LIMIT 1`);
          const lead = firstRow(r);
          if (!lead) return `No lead found matching "${leadName}".`;
          await db.execute(sql`DELETE FROM leads2 WHERE agencyId = ${agencyId} AND id = ${lead.id}`);
          return `Lead "${leadName}" (ID: ${lead.id}) deleted successfully.`;
        }
        return "Please provide a lead ID or name.";
      }

      case "update_outreach_config": {
        const { action, city, state } = args;

        if (action === "set_city") {
          await db.execute(sql`
            INSERT INTO outreachConfig (agencyId, targetCity, targetState, isEnabled, contactMethod)
            VALUES (${agencyId}, ${city}, ${state || 'Telangana'}, 1, 'email')
            ON DUPLICATE KEY UPDATE targetCity = ${city}, targetState = ${state || 'Telangana'}
          `);
          return `Outreach target updated to ${city}, ${state || 'Telangana'}.`;
        } else if (action === "enable") {
          await db.execute(sql`UPDATE outreachConfig SET isEnabled = 1 WHERE agencyId = ${agencyId}`);
          return "Outreach enabled.";
        } else if (action === "disable") {
          await db.execute(sql`UPDATE outreachConfig SET isEnabled = 0 WHERE agencyId = ${agencyId}`);
          return "Outreach paused.";
        } else if (action === "add_to_rotation") {
          const r = await db.execute(sql`SELECT cityRotation FROM outreachConfig WHERE agencyId = ${agencyId} LIMIT 1`);
          const row = firstRow(r);
          let rotation = [];
          if (row?.cityRotation) {
            try { rotation = typeof row.cityRotation === "string" ? JSON.parse(row.cityRotation) : row.cityRotation; } catch {}
          }
          rotation.push({ city, state: state || 'Telangana' });
          await db.execute(sql`UPDATE outreachConfig SET cityRotation = ${JSON.stringify(rotation)} WHERE agencyId = ${agencyId}`);
          return `Added ${city}, ${state || 'Telangana'} to city rotation. Rotation now has ${rotation.length} cities.`;
        }
        return "Unknown action.";
      }

      case "list_hot_leads": {
        const limit = args.limit || 10;
        const r = await db.execute(sql`
          SELECT businessName, email, phone, city, state, businessType, emailOpenCount, chatbotClickCount, lastOpenedAt
          FROM scrapedBusinesses
          WHERE agencyId = ${agencyId} AND (emailOpenCount > 0 OR chatbotClickCount > 0)
          ORDER BY (emailOpenCount * 2 + chatbotClickCount * 5) DESC
          LIMIT ${limit}
        `);
        const hotLeads = rows(r);
        if (!hotLeads.length) return "No hot leads yet — no one has opened an email or clicked the chatbot link.";
        return JSON.stringify(hotLeads);
      }

      case "get_run_history": {
        const limit = args.limit || 10;
        const r = await db.execute(sql`
          SELECT id, runSlot, businessType, targetCity, targetState, status, scrapedCount, emailSentCount, startedAt, completedAt
          FROM outreachRuns
          WHERE agencyId = ${agencyId}
          ORDER BY startedAt DESC LIMIT ${limit}
        `);
        const runRows = rows(r);
        if (!runRows.length) return "No outreach runs found yet.";
        return JSON.stringify(runRows);
      }

      case "search_businesses": {
        const { query, limit = 10 } = args;
        const like = `%${query}%`;
        const r = await db.execute(sql`
          SELECT businessName, email, phone, city, state, businessType, contactStatus, emailOpenCount, chatbotClickCount
          FROM scrapedBusinesses
          WHERE agencyId = ${agencyId}
            AND (businessName LIKE ${like} OR city LIKE ${like} OR businessType LIKE ${like})
          ORDER BY createdAt DESC LIMIT ${limit}
        `);
        const found = rows(r);
        if (!found.length) return `No businesses found matching "${query}".`;
        return JSON.stringify(found);
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err: any) {
    console.error(`[Copilot Tool] ${toolName} error:`, err);
    return `Error executing ${toolName}: ${err?.message || "Unknown error"}`;
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const copilotRouter = router({
  // ── Today Summary (unchanged) ──────────────────────────────────────────────
  getDailySummary: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const agency = await getAgencyByUserId(ctx.user!.id);
    if (!agency) return null;
    const { start: dayStart, end: dayEnd } = istDayBounds();

    try {
      const [agencyLeadsRes, emailsSentTodayRes, emailOpensRes, runsToday] = await Promise.all([
        db.execute(sql`SELECT l.* FROM leads2 l LEFT JOIN conversations3 c ON c.id = l.conversationId WHERE COALESCE(l.agencyId, c.agencyId) = ${agency.id}`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM scrapedBusinesses WHERE agencyId = ${agency.id} AND emailSentAt >= ${dayStart} AND emailSentAt < ${dayEnd}`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM scrapedBusinesses WHERE agencyId = ${agency.id} AND emailOpenCount > 0`),
        db.execute(sql`SELECT COUNT(*) as cnt FROM outreachRuns WHERE agencyId = ${agency.id} AND startedAt >= ${dayStart} AND startedAt < ${dayEnd}`),
      ]);
      return {
        newLeadsToday: rows(agencyLeadsRes).filter(lead => new Date(lead.createdAt).getTime() >= dayStart && new Date(lead.createdAt).getTime() < dayEnd).length,
        urgentLeads: rows(agencyLeadsRes).filter(lead => !["converted", "lost"].includes(lead.status) && calculateEvidenceScore(lead).tier === "sales_ready").length,
        unassignedLeads: rows(agencyLeadsRes).filter(lead => lead.assignedAgencyId == null && lead.assignedTo == null && lead.assignedPartnerId == null && !["converted", "lost"].includes(lead.status)).length,
        emailsSentToday: safeCount(emailsSentTodayRes),
        businessesThatOpened: safeCount(emailOpensRes),
        runsToday: safeCount(runsToday),
      };
    } catch (err) {
      console.error("[Copilot] getDailySummary error:", err);
      return null;
    }
  }),

  // ── Priority Recommendations (unchanged) ──────────────────────────────────
  getPriorityRecommendations: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agency = await getAgencyByUserId(ctx.user!.id);
    if (!agency) return [];

    const recommendations: Array<{
      priority: "critical" | "high" | "medium" | "low";
      reason: string; record: string; nextStep: string; type: string;
    }> = [];

    try {
      const hotLeads = rows(await db.execute(sql`
        SELECT businessName, email, city, emailOpenCount, chatbotClickCount
        FROM scrapedBusinesses
        WHERE agencyId = ${agency.id} AND (emailOpenCount > 0 OR chatbotClickCount > 0)
        ORDER BY (emailOpenCount * 2 + chatbotClickCount * 5) DESC LIMIT 3
      `));
      for (const b of hotLeads) {
        recommendations.push({
          priority: b.chatbotClickCount > 0 ? "critical" : "high",
          reason: `Opened email ${b.emailOpenCount}x${b.chatbotClickCount > 0 ? `, clicked chatbot ${b.chatbotClickCount}x` : ""}`,
          record: `${b.businessName} (${b.city || "unknown city"})`,
          nextStep: "Review the engagement and confirm interest before planning follow-up",
          type: "hot_lead",
        });
      }

      const topUnassigned = rows(await db.execute(
        sql`SELECT l.* FROM leads2 l LEFT JOIN conversations3 c ON c.id = l.conversationId WHERE COALESCE(l.agencyId, c.agencyId) = ${agency.id} AND l.assignedAgencyId IS NULL AND l.assignedTo IS NULL AND l.assignedPartnerId IS NULL AND l.status NOT IN ('converted','lost') AND COALESCE(l.isDnc, 0) = 0`
      ));
      for (const lead of topUnassigned.map(lead => ({ ...lead, evidence: calculateEvidenceScore(lead) })).sort((a, b) => b.evidence.score - a.evidence.score).slice(0, 2)) {
        const score = lead.evidence.score;
        recommendations.push({
          priority: score >= 80 ? "critical" : score >= 65 ? "high" : "medium",
          reason: `Evidence score ${score} — unassigned lead from ${lead.state || "unknown"}`,
          record: `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || `Lead #${lead.id}`,
          nextStep: lead.evidence.nextAction,
          type: "lead",
        });
      }
    } catch (err) {
      console.error("[Copilot] getPriorityRecommendations error:", err);
    }
    return recommendations.slice(0, 8);
  }),

  // ── Get Conversation History ───────────────────────────────────────────────
  getHistory: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agency = await getAgencyByUserId(ctx.user!.id);
    if (!agency) return [];
    const r = await db.execute(sql`
      SELECT id, role, content, toolCalls, createdAt
      FROM copilotMemory
      WHERE agencyId = ${agency.id}
      ORDER BY createdAt DESC LIMIT 50
    `);
    return rows(r).reverse();
  }),

  // ── Clear History ──────────────────────────────────────────────────────────
  clearHistory: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const agency = await getAgencyByUserId(ctx.user!.id);
    if (!agency) return { success: false };
    await db.execute(sql`DELETE FROM copilotMemory WHERE agencyId = ${agency.id}`);
    return { success: true };
  }),

  getProviderConfig: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const agency = await getAgencyByUserId(ctx.user!.id);
    if (!agency) throw new TRPCError({ code: "UNAUTHORIZED" });
    const stored = firstRow(await db.execute(sql`
      SELECT provider, externalBaseUrl, externalModel, updatedAt
      FROM klausAiConfig WHERE agencyId = ${agency.id} LIMIT 1
    `));
    return stored || { provider: "builtin", externalBaseUrl: null, externalModel: null, updatedAt: null };
  }),

  updateProviderConfig: adminProcedure
    .input(z.object({
      provider: z.enum(["builtin", "openai_compatible"]),
      externalBaseUrl: z.string().url().max(500).optional(),
      externalModel: z.string().trim().min(1).max(120).optional(),
    }).superRefine((value, ctx) => {
      if (value.provider === "openai_compatible" && (!value.externalBaseUrl || !value.externalModel)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "External endpoint and model are required." });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await getAgencyByUserId(ctx.user!.id);
      if (!agency) throw new TRPCError({ code: "UNAUTHORIZED" });
      const baseUrl = input.provider === "openai_compatible" ? normalizeExternalBaseUrl(input.externalBaseUrl!) : null;
      await db.execute(sql`
        INSERT INTO klausAiConfig (agencyId, provider, externalBaseUrl, externalModel)
        VALUES (${agency.id}, ${input.provider}, ${baseUrl}, ${input.provider === "openai_compatible" ? input.externalModel! : null})
        ON DUPLICATE KEY UPDATE provider = VALUES(provider), externalBaseUrl = VALUES(externalBaseUrl), externalModel = VALUES(externalModel)
      `);
      return { success: true };
    }),

  // ── Level 4 Agentic Ask ────────────────────────────────────────────────────
  askCopilot: protectedProcedure
    .input(z.object({ question: z.string().min(1).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await getAgencyByUserId(ctx.user!.id);
      if (!agency) throw new TRPCError({ code: "UNAUTHORIZED" });
      const providerRow = firstRow(await db.execute(sql`
        SELECT provider, externalBaseUrl, externalModel FROM klausAiConfig WHERE agencyId = ${agency.id} LIMIT 1
      `));
      const providerConfig: KlausProviderConfig = {
        provider: providerRow?.provider === "openai_compatible" ? "openai_compatible" : "builtin",
        externalBaseUrl: providerRow?.externalBaseUrl || null,
        externalModel: providerRow?.externalModel || null,
      };

      // Load last 20 messages from memory for context
      const historyRows = rows(await db.execute(sql`
        SELECT role, content FROM copilotMemory
        WHERE agencyId = ${agency.id}
        ORDER BY createdAt DESC LIMIT 20
      `)).reverse();

      const historyMessages = historyRows.map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      }));

      // Get current IST date+time correctly (server runs UTC, IST = UTC+5:30)
      const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const istDateStr = istNow.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const istTimeStr = istNow.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      const systemPrompt = `You are Klaus — AI copilot for Sales Squad.
CURRENT TIME: ${istTimeStr} IST | DATE: ${istDateStr}
IMPORTANT: The server runs in UTC. Always use the IST time/date above — NEVER use your own internal date knowledge.
Outreach schedule today (IST): Slot 1 = 8:00 AM (Factories/Warehouses), Slot 2 = 10:30 AM (Hotels/Resorts), Slot 3 = 1:00 PM (Hospitals/Clinics), Slot 4 = 4:00 PM (Schools/Colleges), Slot 5 = 7:00 PM (Offices/Complexes).
STRICT RULES:
1. ALWAYS call a tool first — never guess or make up numbers
2. Reply in 1-3 lines max. No intros, no "I'll help you", no filler
3. For stats/data: show numbers directly, use bullet points for lists
4. For sending emails: DO IT immediately, then say "Done — sent to X"
5. For deletes: ask ONE short confirmation only ("Delete [name]? yes/no"), then execute
6. NEVER ask clarifying questions unless info is truly missing
7. If automation is asked: check get_stats for run counts, then state which slots have run based on current IST time vs schedule above
8. Be like a sharp exec assistant — fast, direct, zero fluff`;

      // Save user message to memory
      await db.execute(sql`
        INSERT INTO copilotMemory (agencyId, role, content) VALUES (${agency.id}, 'user', ${input.question})
      `);

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: input.question },
      ];

      const toolCallLog: Array<{ tool: string; args: any; result: string }> = [];
      let finalAnswer = "";

      // Agentic loop — up to 5 tool calls (gpt-5-nano for speed)
      for (let i = 0; i < 5; i++) {
        const response = await invokeKlaus({
          messages,
          tools: AGENT_TOOLS as any,
          tool_choice: "auto",
        }, providerConfig, agency.id);

        const msg = response?.choices?.[0]?.message;
        if (!msg) break;

        // If no tool calls, we have the final answer
        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          finalAnswer = (typeof msg.content === "string" ? msg.content : "") || "Done.";
          break;
        }

        // Execute tool calls
        messages.push({ role: "assistant", content: (typeof msg.content === "string" ? msg.content : "") || "", tool_calls: msg.tool_calls });

        for (const toolCall of msg.tool_calls) {
          const toolName = toolCall.function?.name;
          let toolArgs: any = {};
          try { toolArgs = JSON.parse(toolCall.function?.arguments || "{}"); } catch {}

          const result = await executeTool(toolName, toolArgs, agency.id);
          toolCallLog.push({ tool: toolName, args: toolArgs, result });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }

      // If loop ended without final answer — do one more LLM call to summarise tool results
      if (!finalAnswer) {
        const summaryResp = await invokeKlaus({
          messages: [
            ...messages,
            { role: "user", content: "Answer in 1-3 lines max using the tool data above. Show real numbers. No filler." }
          ],
        }, providerConfig, agency.id);
        const rawContent = summaryResp?.choices?.[0]?.message?.content;
        finalAnswer = (typeof rawContent === "string" ? rawContent : rawContent ? JSON.stringify(rawContent) : "") || "I completed the task. Let me know if you need anything else.";
      }

      // Save assistant response to memory
      await db.execute(sql`
        INSERT INTO copilotMemory (agencyId, role, content, toolCalls)
        VALUES (${agency.id}, 'assistant', ${finalAnswer}, ${toolCallLog.length ? JSON.stringify(toolCallLog) : null})
      `);

      return {
        answer: finalAnswer,
        toolsUsed: toolCallLog.map(t => t.tool),
        actions: toolCallLog,
      };
    }),
});
