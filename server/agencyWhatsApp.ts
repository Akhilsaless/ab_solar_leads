import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express, { type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./_core/trpc";
import { getDb, getAgencyByUserId } from "./db";
import { authenticatedSolarPartner } from "./solarOperations";
import { getPartnerOnboardingSnapshot } from "./partnerOnboardingService";
import {
  encryptGatewayCredential,
  decryptGatewayCredential,
} from "./aiGateway";
import { isPlatformSuperAdmin } from "./platformCommunicationState";
import { getPlatformSafetyControl } from "./platformCommunicationService";
import { ENV } from "./_core/env";
import { normalizeIndianPhone } from "../shared/solarWorkflow";

const rows = (result: any): any[] =>
  Array.isArray(result?.[0]) ? result[0] : [];
const configSchema = z.object({
  accessToken: z.string().min(20).max(2000),
  phoneNumberId: z.string().regex(/^\d{5,50}$/),
  businessAccountId: z.string().regex(/^\d{5,50}$/),
  graphVersion: z.string().regex(/^v\d{1,3}\.\d$/),
  appSecret: z.string().min(16).max(200),
  verifyToken: z.string().min(24).max(200),
  templateName: z.string().regex(/^[a-z0-9_]{1,100}$/),
  language: z.string().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/),
});
type Config = z.infer<typeof configSchema>;
const access = publicProcedure
  .input(z.object({ token: z.string().min(20).max(200).optional() }))
  .use(async ({ ctx, input, next }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    let agencyId: number;
    if (input.token) {
      const partner = await authenticatedSolarPartner(db, input.token);
      agencyId = (await getPartnerOnboardingSnapshot(db, partner)).mapping
        .agencyId;
    } else {
      if (!isPlatformSuperAdmin(ctx.user, ENV.ownerOpenId))
        throw new TRPCError({ code: "FORBIDDEN" });
      const agency = await getAgencyByUserId(ctx.user!.id);
      if (!agency) throw new TRPCError({ code: "NOT_FOUND" });
      agencyId = agency.id;
    }
    return next({ ctx: { messagingDb: db, messagingAgencyId: agencyId } });
  });
async function connection(
  db: any,
  agencyId: number
): Promise<{ row: any; config: Config } | null> {
  const row = rows(
    await db.execute(
      sql`SELECT * FROM agencyWhatsAppConnections WHERE agencyId = ${agencyId}`
    )
  )[0];
  if (!row) return null;
  try {
    return {
      row,
      config: configSchema.parse(
        JSON.parse(decryptGatewayCredential(row.encryptedConfig))
      ),
    };
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Messaging configuration needs to be replaced securely.",
    });
  }
}
async function graph(config: Config, path: string, payload?: unknown) {
  return fetch(`https://graph.facebook.com/${config.graphVersion}/${path}`, {
    method: payload ? "POST" : "GET",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}
export function validWhatsAppSignature(
  body: Buffer,
  signature: string,
  secret: string
) {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const actual = Buffer.from(signature.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(body).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function secretEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest(),
    y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export function messageStatusRank(status: string) {
  return (
    (
      {
        pending: 0,
        sending: 1,
        accepted: 2,
        sent: 3,
        delivered: 4,
        read: 5,
      } as Record<string, number>
    )[status] ?? -1
  );
}

export const agencyWhatsAppRouter = router({
  status: access.query(async ({ ctx }) => {
    const c = await connection(ctx.messagingDb, ctx.messagingAgencyId);
    const messages = rows(
      await ctx.messagingDb.execute(
        sql`SELECT id, leadId, direction, body, status, lastError, createdAt FROM solarWhatsAppMessages WHERE agencyId = ${ctx.messagingAgencyId} ORDER BY id DESC LIMIT 50`
      )
    );
    return {
      configured: Boolean(c),
      enabled: Boolean(c?.row.enabled),
      verifiedAt: c?.row.verifiedAt || null,
      webhookVerifiedAt: c?.row.webhookVerifiedAt || null,
      templateVerifiedAt: c?.row.templateVerifiedAt || null,
      webhookUrl: `${ENV.publicAppUrl}/api/webhooks/solar-whatsapp/${ctx.messagingAgencyId}`,
      messages,
    };
  }),
  configure: access.input(configSchema).mutation(async ({ ctx, input }) => {
    const config = configSchema.parse(input);
    const encrypted = encryptGatewayCredential(JSON.stringify(config));
    await ctx.messagingDb.transaction(async tx => {
      const existing = rows(
        await tx.execute(
          sql`SELECT agencyId FROM agencyWhatsAppConnections WHERE agencyId = ${ctx.messagingAgencyId} FOR UPDATE`
        )
      )[0];
      if (existing)
        await tx.execute(
          sql`UPDATE agencyWhatsAppConnections SET encryptedConfig = ${encrypted}, phoneNumberId = ${config.phoneNumberId}, enabled = FALSE, verifiedAt = NULL, webhookVerifiedAt = NULL, templateVerifiedAt = NULL WHERE agencyId = ${ctx.messagingAgencyId}`
        );
      else
        await tx.execute(
          sql`INSERT INTO agencyWhatsAppConnections (agencyId, encryptedConfig, phoneNumberId) VALUES (${ctx.messagingAgencyId}, ${encrypted}, ${config.phoneNumberId})`
        );
    });
    return { success: true };
  }),
  verify: access.mutation(async ({ ctx }) => {
    const c = await connection(ctx.messagingDb, ctx.messagingAgencyId);
    if (!c)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Configure this agency's WhatsApp account first.",
      });
    // Verify sender and approved template without sending a customer message.
    const [phone, templates] = await Promise.all([
      graph(
        c.config,
        `${c.config.phoneNumberId}?fields=id,display_phone_number`
      ),
      graph(
        c.config,
        `${c.config.businessAccountId}/message_templates?name=${c.config.templateName}&fields=name,status,language,components`
      ),
    ]);
    if (!phone.ok || !templates.ok)
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message:
          "Meta rejected the sender or template check. Review account credentials and permissions.",
      });
    const p = await phone.json(),
      t = await templates.json();
    const template = t.data?.find(
      (item: any) =>
        item.name === c.config.templateName &&
        item.language === c.config.language &&
        item.status === "APPROVED"
    );
    const body =
      template?.components?.find((item: any) => item.type === "BODY")?.text ||
      "";
    if (
      p.id !== c.config.phoneNumberId ||
      !template ||
      !body.includes("{{1}}") ||
      !body.includes("{{2}}") ||
      /\{\{(?:[3-9]|\d{2,})\}\}/.test(body) ||
      template.components.some(
        (item: any) =>
          (item.type !== "BODY" && JSON.stringify(item).includes("{{")) ||
          (item.type === "HEADER" && item.format !== "TEXT")
      )
    )
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Use an approved template with exactly two body variables: customer name and lead stage, and no other dynamic components.",
      });
    await ctx.messagingDb.execute(
      sql`UPDATE agencyWhatsAppConnections SET verifiedAt = NOW(), templateVerifiedAt = NOW() WHERE agencyId = ${ctx.messagingAgencyId} AND encryptedConfig = ${c.row.encryptedConfig}`
    );
    return { success: true };
  }),
  enable: access
    .input(z.object({ enabled: z.boolean(), policyConfirmed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const c = await connection(ctx.messagingDb, ctx.messagingAgencyId);
      if (!c)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configure WhatsApp first.",
        });
      if (
        input.enabled &&
        (!input.policyConfirmed ||
          !c.row.webhookVerifiedAt ||
          !c.row.verifiedAt ||
          !c.row.templateVerifiedAt ||
          Date.now() - new Date(c.row.verifiedAt).getTime() > 86400000)
      )
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Verify sender, approved template and webhook, then confirm consent and opt-out handling before enabling.",
        });
      await ctx.messagingDb.execute(
        sql`UPDATE agencyWhatsAppConnections SET enabled = ${input.enabled} WHERE agencyId = ${ctx.messagingAgencyId}`
      );
      return { success: true };
    }),
  queueLeadUpdate: access
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await enqueueLeadWhatsApp(
        ctx.messagingDb,
        ctx.messagingAgencyId,
        input.leadId
      );
      return { success: true, queued: result };
    }),
});

export async function enqueueLeadWhatsApp(
  db: any,
  agencyId: number,
  leadId: number
) {
  const c = await connection(db, agencyId);
  if (!c?.row.enabled) return false;
  const lead = rows(
    await db.execute(
      sql`SELECT l.*, w.stage, w.version FROM leads2 l INNER JOIN solarLeadWorkflow w ON w.leadId = l.id LEFT JOIN partnerAgencyOnboarding p ON p.partnerId = l.assignedPartnerId WHERE l.id = ${leadId} AND ((p.agencyId = ${agencyId}) OR (l.assignedPartnerId IS NULL AND l.sourceAgencyId = ${agencyId}))`
    )
  )[0];
  if (!lead)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lead not assigned to this messaging account.",
    });
  const phone = normalizeIndianPhone(lead.phone || "");
  if (!phone || lead.isDnc) return false;
  const identity = rows(
    await db.execute(
      sql`SELECT sessionId FROM solarChatIdentity WHERE phone = ${phone} AND agencyId = ${lead.sourceAgencyId} AND consentAt IS NOT NULL AND whatsappConsentAt IS NOT NULL AND revokedAt IS NULL AND phoneVerifiedAt IS NOT NULL LIMIT 1`
    )
  )[0];
  if (!identity) return false;
  const key = hash(`${agencyId}:${leadId}:${lead.stage}:${lead.version}`);
  const payload = JSON.stringify({
    to: phone,
    name: lead.firstName,
    stage: lead.stage,
  });
  const inserted: any = await db.execute(
    sql`INSERT IGNORE INTO solarWhatsAppMessages (agencyId, leadId, direction, dedupeKey, body) VALUES (${agencyId}, ${leadId}, 'outbound', ${key}, ${payload})`
  );
  return Boolean(inserted[0]?.affectedRows);
}

export async function enqueueProposalWhatsApp(
  db: any,
  agencyId: number,
  leadId: number,
  reference: string,
  downloadUrl: string
) {
  const c = await connection(db, agencyId);
  if (!c?.row.enabled) return false;
  const lead = rows(
    await db.execute(
      sql`SELECT l.* FROM leads2 l INNER JOIN partnerAgencyOnboarding p ON p.partnerId = l.assignedPartnerId WHERE l.id = ${leadId} AND p.agencyId = ${agencyId} AND l.isDnc = 0`
    )
  )[0];
  const phone = normalizeIndianPhone(lead?.phone || "");
  if (!phone) return false;
  const identity = rows(
    await db.execute(
      sql`SELECT sessionId FROM solarChatIdentity WHERE agencyId = ${lead.sourceAgencyId} AND phone = ${phone} AND consentAt IS NOT NULL AND whatsappConsentAt IS NOT NULL AND revokedAt IS NULL AND phoneVerifiedAt IS NOT NULL LIMIT 1`
    )
  )[0];
  if (!identity) return false;
  const inserted: any = await db.execute(
    sql`INSERT IGNORE INTO solarWhatsAppMessages (agencyId, leadId, direction, dedupeKey, body) VALUES (${agencyId}, ${leadId}, 'outbound', ${hash(`proposal:${agencyId}:${reference}`)}, ${JSON.stringify({ to: phone, name: lead.firstName, stage: `Your preliminary solar proposal: ${downloadUrl}`, proposalReference: reference, downloadUrl })})`
  );
  return Boolean(inserted[0]?.affectedRows);
}

export function registerAgencyWhatsAppRoutes(app: express.Express) {
  app.get("/api/solar-proposals/:token", async (req, res) => {
    try {
      if (!/^[A-Za-z0-9_-]{43}$/.test(req.params.token))
        return res.sendStatus(404);
      const db = await getDb();
      if (!db) return res.sendStatus(503);
      const proposal = rows(
        await db.execute(
          sql`SELECT reference, pdfBase64 FROM solarProposals WHERE downloadTokenHash = ${hash(req.params.token)} AND downloadExpiresAt > NOW() LIMIT 1`
        )
      )[0];
      if (!proposal) return res.sendStatus(404);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${proposal.reference}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      return res.send(Buffer.from(proposal.pdfBase64, "base64"));
    } catch {
      return res.sendStatus(503);
    }
  });
  app.get("/api/webhooks/solar-whatsapp/:agencyId", async (req, res) => {
    try {
      const db = await getDb();
      if (!db || !/^\d+$/.test(req.params.agencyId)) return res.sendStatus(404);
      const c = await connection(db, Number(req.params.agencyId));
      if (
        !c ||
        req.query["hub.mode"] !== "subscribe" ||
        !secretEqual(
          String(req.query["hub.verify_token"] || ""),
          c.config.verifyToken
        )
      )
        return res.sendStatus(403);
      await db.execute(
        sql`UPDATE agencyWhatsAppConnections SET webhookVerifiedAt = NOW() WHERE agencyId = ${Number(req.params.agencyId)} AND encryptedConfig = ${c.row.encryptedConfig}`
      );
      return res.status(200).send(String(req.query["hub.challenge"] || ""));
    } catch {
      return res.sendStatus(503);
    }
  });
  // Must be registered before the application's JSON body parser.
  app.post(
    "/api/webhooks/solar-whatsapp/:agencyId",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      try {
        const db = await getDb();
        if (!db || !/^\d+$/.test(req.params.agencyId))
          return res.sendStatus(404);
        const agencyId = Number(req.params.agencyId),
          c = await connection(db, agencyId);
        if (
          !c ||
          !Buffer.isBuffer(req.body) ||
          !validWhatsAppSignature(
            req.body,
            String(req.headers["x-hub-signature-256"] || ""),
            c.config.appSecret
          )
        )
          return res.sendStatus(401);
        const payload = JSON.parse(req.body.toString("utf8"));
        for (const entry of payload.entry || [])
          for (const change of entry.changes || []) {
            const value = change.value;
            if (
              String(value?.metadata?.phone_number_id) !==
              c.config.phoneNumberId
            )
              continue;
            for (const status of value.statuses || []) {
              if (
                !["sent", "delivered", "read", "failed"].includes(
                  status.status
                ) ||
                typeof status.id !== "string"
              )
                continue;
              await db.execute(
                sql`INSERT IGNORE INTO solarWhatsAppReceipts (agencyId, providerMessageId, status, errorCode) VALUES (${agencyId}, ${status.id}, ${status.status}, ${status.status === "failed" ? String(status.errors?.[0]?.code || "delivery_failed") : null})`
              );
              await db.transaction(async tx => {
                const message = rows(
                  await tx.execute(
                    sql`SELECT id, status FROM solarWhatsAppMessages WHERE agencyId = ${agencyId} AND providerMessageId = ${String(status.id)} FOR UPDATE`
                  )
                )[0];
                if (
                  message &&
                  (messageStatusRank(String(status.status)) >
                    messageStatusRank(message.status) ||
                    (status.status === "failed" &&
                      messageStatusRank(message.status) < 4))
                )
                  await tx.execute(
                    sql`UPDATE solarWhatsAppMessages SET status = ${String(status.status)}, lastError = ${status.status === "failed" ? String(status.errors?.[0]?.code || "delivery_failed") : null} WHERE id = ${message.id}`
                  );
              });
            }
            for (const msg of value.messages || []) {
              const phone = normalizeIndianPhone(String(msg.from || ""));
              if (!phone || !["text", "image"].includes(msg.type) || typeof msg.id !== "string")
                continue;
              const text = String(msg.text?.body || "").slice(0, 1500);
              const lead = rows(
                await db.execute(
                  sql`SELECT l.id, l.sourceAgencyId FROM leads2 l LEFT JOIN partnerAgencyOnboarding p ON p.partnerId = l.assignedPartnerId WHERE (l.phone = ${phone} OR l.phone = ${phone.slice(3)}) AND (p.agencyId = ${agencyId} OR (l.assignedPartnerId IS NULL AND l.sourceAgencyId = ${agencyId})) ORDER BY l.id DESC LIMIT 1`
                )
              )[0];
              if (!lead) continue;
              const timestamp = Number(msg.timestamp) * 1000;
              const timely =
                Number.isSafeInteger(timestamp) &&
                timestamp > Date.now() - 86400000 &&
                timestamp <= Date.now() + 300000;
              await db.execute(
                sql`INSERT IGNORE INTO solarWhatsAppMessages (agencyId, leadId, direction, providerMessageId, dedupeKey, body, providerTimestamp, status) VALUES (${agencyId}, ${lead.id}, 'inbound', ${msg.id}, ${hash(`${agencyId}:${msg.id}`)}, ${text}, ${Number.isSafeInteger(timestamp) ? timestamp : null}, ${timely ? "received" : "needs_human"})`
              );
              if (msg.type === "image" && timely && ["image/jpeg", "image/png"].includes(msg.image?.mime_type)) {
                await db.execute(sql`UPDATE solarChatIdentity SET phoneVerifiedAt = NOW() WHERE agencyId = ${lead.sourceAgencyId} AND phone = ${phone} AND revokedAt IS NULL`);
                const { enqueue } = await import("./followup/store");
                await enqueue(agencyId, lead.id, "bill", `bill:${lead.id}:${msg.image.sha256 || msg.image.id}`, { mediaId: msg.image.id }).catch(() => false);
                await db.execute(sql`UPDATE solarWhatsAppMessages SET status = 'media_received' WHERE providerMessageId = ${msg.id} AND agencyId = ${agencyId}`);
              }
              if (
                /^(stop|unsubscribe|do not contact|don't contact)\b/i.test(
                  text.trim()
                )
              )
                await db.execute(
                  sql`UPDATE solarChatIdentity SET revokedAt = NOW() WHERE phone = ${phone} AND agencyId = ${lead.sourceAgencyId}`
                );
            }
          }
        return res.sendStatus(200);
      } catch {
        return res.sendStatus(503);
      }
    }
  );
}

/** Lease each outbound record once. Ambiguous network failures need reconciliation, not blind retries. */
export async function dispatchSolarWhatsApp(req: Request, res: Response) {
  const key = process.env.SOLAR_OPERATIONS_CRON_SECRET;
  if (
    !key ||
    !secretEqual(String(req.headers.authorization || ""), `Bearer ${key}`)
  )
    return res.sendStatus(401);
  const db = await getDb();
  if (!db) return res.sendStatus(503);
  if ((await getPlatformSafetyControl()).emergencyStopActive)
    return res.status(200).json({ paused: true });
  // Recover abandoned leases conservatively; a process crash must not cause an
  // automatic duplicate customer message or repeated AI action.
  await db.execute(
    sql`UPDATE solarWhatsAppMessages SET status = 'unknown', lastError = 'lease_expired_reconcile' WHERE status = 'sending' AND updatedAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
  );
  await db.execute(
    sql`UPDATE solarWhatsAppMessages SET status = 'needs_human', lastError = 'processing_interrupted' WHERE status = 'processing' AND updatedAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
  );
  const incoming = rows(
    await db.execute(
      sql`SELECT id FROM solarWhatsAppMessages WHERE direction = 'inbound' AND status = 'received' ORDER BY id LIMIT 5`
    )
  );
  for (const item of incoming) {
    const claimed = await db.transaction(async tx => {
      const message = rows(
        await tx.execute(
          sql`SELECT * FROM solarWhatsAppMessages WHERE id = ${item.id} AND status = 'received' FOR UPDATE`
        )
      )[0];
      if (!message) return null;
      await tx.execute(
        sql`UPDATE solarWhatsAppMessages SET status = 'processing' WHERE id = ${message.id}`
      );
      return message;
    });
    if (!claimed) continue;
    try {
      const c = await connection(db, claimed.agencyId);
      const lead = rows(
        await db.execute(
          sql`SELECT l.*, c.sessionId FROM leads2 l INNER JOIN conversations3 c ON c.id = l.conversationId LEFT JOIN partnerAgencyOnboarding p ON p.partnerId = l.assignedPartnerId WHERE l.id = ${claimed.leadId} AND l.isDnc = 0 AND (p.agencyId = ${claimed.agencyId} OR (l.assignedPartnerId IS NULL AND l.sourceAgencyId = ${claimed.agencyId})) LIMIT 1`
        )
      )[0];
      const phone = normalizeIndianPhone(lead?.phone || "");
      if (
        !c?.row.enabled ||
        !lead ||
        !phone ||
        Date.now() - Number(claimed.providerTimestamp || 0) >= 86400000 ||
        /^(stop|unsubscribe|do not contact|don't contact)\b/i.test(
          claimed.body.trim()
        )
      )
        throw new Error("handoff_required");
      const identity = rows(
        await db.execute(
          sql`SELECT sessionId FROM solarChatIdentity WHERE agencyId = ${lead.sourceAgencyId} AND phone = ${phone} AND consentAt IS NOT NULL AND revokedAt IS NULL LIMIT 1`
        )
      )[0];
      if (!identity) throw new Error("consent_required");
      // A signed WhatsApp message from the matching number proves possession.
      await db.execute(
        sql`UPDATE solarChatIdentity SET phoneVerifiedAt = NOW() WHERE sessionId = ${identity.sessionId} AND phone = ${phone} AND revokedAt IS NULL`
      );
      const { appRouter } = await import("./routers");
      const caller: any = appRouter.createCaller({ req, res, user: null });
      const result = await caller.chat.sendMessage({
        sessionId: lead.sessionId,
        message: claimed.body,
      });
      const text = String(result.response || "").slice(0, 4000);
      if (!text) throw new Error("empty_response");
      await db.transaction(async tx => {
        await tx.execute(
          sql`INSERT IGNORE INTO solarWhatsAppMessages (agencyId, leadId, direction, dedupeKey, body) VALUES (${claimed.agencyId}, ${lead.id}, 'outbound', ${hash(`reply:${claimed.id}`)}, ${JSON.stringify({ type: "text", to: phone, text })})`
        );
        await tx.execute(
          sql`UPDATE solarWhatsAppMessages SET status = 'response_queued' WHERE id = ${claimed.id}`
        );
      });
    } catch {
      await db.execute(
        sql`UPDATE solarWhatsAppMessages SET status = 'needs_human', lastError = 'review_required' WHERE id = ${claimed.id}`
      );
    }
  }
  const pending = rows(
    await db.execute(
      sql`SELECT id FROM solarWhatsAppMessages WHERE direction = 'outbound' AND status = 'pending' ORDER BY id LIMIT 20`
    )
  );
  let sent = 0;
  for (const candidate of pending) {
    const claimed = await db.transaction(async tx => {
      const row = rows(
        await tx.execute(
          sql`SELECT * FROM solarWhatsAppMessages WHERE id = ${candidate.id} AND status = 'pending' FOR UPDATE`
        )
      )[0];
      if (!row) return null;
      await tx.execute(
        sql`UPDATE solarWhatsAppMessages SET status = 'sending' WHERE id = ${row.id}`
      );
      return row;
    });
    if (!claimed) continue;
    try {
      const c = await connection(db, claimed.agencyId),
        data = JSON.parse(claimed.body);
      // Re-evaluate assignment and consent immediately before transmission.
      const allowed = rows(
        await db.execute(
          sql`SELECT l.id FROM leads2 l LEFT JOIN partnerAgencyOnboarding p ON p.partnerId = l.assignedPartnerId INNER JOIN solarChatIdentity i ON i.agencyId = l.sourceAgencyId AND i.phone = ${data.to} WHERE l.id = ${claimed.leadId} AND l.isDnc = 0 AND (l.phone = ${data.to} OR l.phone = ${data.to.slice(3)}) AND i.consentAt IS NOT NULL AND i.revokedAt IS NULL AND i.phoneVerifiedAt IS NOT NULL AND (p.agencyId = ${claimed.agencyId} OR (l.assignedPartnerId IS NULL AND l.sourceAgencyId = ${claimed.agencyId})) LIMIT 1`
        )
      )[0];
      if (
        !c?.row.enabled ||
        !c.row.webhookVerifiedAt ||
        !c.row.templateVerifiedAt ||
        !allowed ||
        (await getPlatformSafetyControl()).emergencyStopActive
      ) {
        await db.execute(
          sql`UPDATE solarWhatsAppMessages SET status = 'blocked', lastError = 'readiness_or_consent' WHERE id = ${claimed.id}`
        );
        if (data.followupJobId) { const { settle } = await import("./followup/store"); await settle(db, data.followupJobId, 0, "blocked", { reason: "readiness_or_consent" }); }
        continue;
      }
      let payload: Record<string, unknown>;
      if (data.type === "text") {
        const recent = rows(
          await db.execute(
            sql`SELECT id FROM solarWhatsAppMessages WHERE agencyId = ${claimed.agencyId} AND leadId = ${claimed.leadId} AND direction = 'inbound' AND providerTimestamp > ${Date.now() - 86400000} LIMIT 1`
          )
        )[0];
        if (!recent) {
          await db.execute(
            sql`UPDATE solarWhatsAppMessages SET status = 'blocked', lastError = 'service_window_expired' WHERE id = ${claimed.id}`
          );
          continue;
        }
        payload = {
          messaging_product: "whatsapp",
          to: data.to.replace("+", ""),
          type: "text",
          text: { body: data.text },
        };
      } else {
        const opted = rows(
          await db.execute(
            sql`SELECT sessionId FROM solarChatIdentity i INNER JOIN leads2 l ON l.sourceAgencyId = i.agencyId WHERE l.id = ${claimed.leadId} AND i.phone = ${data.to} AND i.whatsappConsentAt IS NOT NULL AND i.revokedAt IS NULL LIMIT 1`
          )
        )[0];
        if (!opted) {
          await db.execute(
            sql`UPDATE solarWhatsAppMessages SET status = 'blocked', lastError = 'whatsapp_opt_in_required' WHERE id = ${claimed.id}`
          );
          continue;
        }
        if (data.proposalReference) {
          const token =
            String(data.downloadUrl || "")
              .split("/")
              .at(-1) || "";
          const proposal = rows(
            await db.execute(
              sql`SELECT id FROM solarProposals WHERE leadId = ${claimed.leadId} AND reference = ${data.proposalReference} AND downloadTokenHash = ${hash(token)} AND downloadExpiresAt > NOW() LIMIT 1`
            )
          )[0];
          if (!proposal) {
            await db.execute(
              sql`UPDATE solarWhatsAppMessages SET status = 'blocked', lastError = 'proposal_link_expired' WHERE id = ${claimed.id}`
            );
            continue;
          }
        }
        payload = {
          messaging_product: "whatsapp",
          to: data.to.replace("+", ""),
          type: "template",
          template: {
            name: c.config.templateName,
            language: { code: c.config.language },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: data.name },
                  { type: "text", text: data.stage.replaceAll("_", " ") },
                ],
              },
            ],
          },
        };
      }
      const result = await graph(
        c.config,
        `${c.config.phoneNumberId}/messages`,
        payload
      );
      if (!result.ok) {
        if (data.followupJobId) { const { settle } = await import("./followup/store"); await settle(db, data.followupJobId, 0, "failed", { reason: `http_${result.status}` }); }
        await db.execute(
          sql`UPDATE solarWhatsAppMessages SET status = 'failed', lastError = ${`http_${result.status}`} WHERE id = ${claimed.id}`
        );
        continue;
      }
      const body = await result.json(),
        id = body.messages?.[0]?.id;
      if (!id) throw new Error("missing_provider_id");
      await db.execute(
        sql`UPDATE solarWhatsAppMessages SET status = 'accepted', providerMessageId = ${String(id)} WHERE id = ${claimed.id}`
      );
      if (data.followupJobId) {
        const { settle, rows: followupRows } = await import("./followup/store");
        const job = followupRows(await db.execute(sql`SELECT reservedPaise FROM followupJobs WHERE id = ${data.followupJobId} AND agencyId = ${claimed.agencyId}`))[0];
        if (job) await settle(db, data.followupJobId, Number(job.reservedPaise), "message_accepted", { providerMessageId: id, delivery: "accepted_not_delivered" });
      }
      sent++;
      // Receipts can arrive before the API response is persisted. Reconcile the
      // durable receipt inbox so that early delivery callbacks are never lost.
      const receipts = rows(
        await db.execute(
          sql`SELECT status, errorCode FROM solarWhatsAppReceipts WHERE agencyId = ${claimed.agencyId} AND providerMessageId = ${String(id)} ORDER BY id`
        )
      );
      for (const receipt of receipts)
        await db.transaction(async tx => {
          const current = rows(
            await tx.execute(
              sql`SELECT status FROM solarWhatsAppMessages WHERE id = ${claimed.id} FOR UPDATE`
            )
          )[0];
          if (
            current &&
            (messageStatusRank(receipt.status) >
              messageStatusRank(current.status) ||
              (receipt.status === "failed" &&
                messageStatusRank(current.status) < 4))
          )
            await tx.execute(
              sql`UPDATE solarWhatsAppMessages SET status = ${receipt.status}, lastError = ${receipt.errorCode} WHERE id = ${claimed.id}`
            );
        });
    } catch {
      await db.execute(
        sql`UPDATE solarWhatsAppMessages SET status = 'unknown', lastError = 'reconciliation_required' WHERE id = ${claimed.id}`
      );
    }
  }
  return res.json({ processed: pending.length, accepted: sent });
}

export async function queueBillFollowup(db: any, agencyId: number, leadId: number, jobId: number) {
  const { leadEligible } = await import("./followup/store");
  const lead = await leadEligible(db, agencyId, leadId);
  const c = await connection(db, agencyId);
  if (!c?.row.enabled || !lead.whatsappConsentAt) return false;
  const identity = rows(await db.execute(sql`SELECT sessionId FROM solarChatIdentity WHERE agencyId = ${lead.sourceAgencyId} AND phone = ${lead.phone} AND phoneVerifiedAt IS NOT NULL AND revokedAt IS NULL LIMIT 1`))[0];
  if (!identity) return false;
  const result: any = await db.execute(sql`INSERT IGNORE INTO solarWhatsAppMessages (agencyId, leadId, direction, dedupeKey, body) VALUES (${agencyId}, ${leadId}, 'outbound', ${hash(`bill-followup:${jobId}`)}, ${JSON.stringify({ to: lead.phone, name: lead.firstName, stage: "Please reply with a clear photo of one page of your latest electricity bill for solar assessment. Reply STOP to opt out.", followupJobId: jobId })})`);
  return Boolean(result[0]?.affectedRows);
}
