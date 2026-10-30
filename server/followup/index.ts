import { createHmac } from "node:crypto";
import express from "express";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getAgencyByUserId, getUserByOpenId } from "../db";
import { ENV } from "../_core/env";
import {
  encryptGatewayCredential,
  decryptGatewayCredential,
} from "../aiGateway";
import { getPlatformSafetyControl } from "../platformCommunicationService";
import { normalizeIndianPhone } from "../../shared/solarWorkflow";
import {
  configSchema,
  hash,
  secretEqual,
  qualification,
  callCharge,
  insideCallingHours,
  billSchema,
} from "./policy";
import {
  database,
  account,
  rows,
  enqueue,
  reserve,
  settle,
  leadEligible,
} from "./store";
import { startVoice, submitBill, billResult, boundedImage } from "./providers";
const owned = protectedProcedure.use(async ({ ctx, next }) => {
  const agency = await getAgencyByUserId(ctx.user.id);
  if (!agency) throw new TRPCError({ code: "NOT_FOUND" });
  return next({ ctx: { ...ctx, followupAgencyId: agency.id } });
});
const publicOrigin = () => {
  const url = new URL(ENV.publicAppUrl);
  if (url.protocol !== "https:") throw new Error("public_https_required");
  return url.origin;
};
async function docKey(db: any, agencyId: number, config: any) {
  if (config.documentKey) return config.documentKey;
  const c = rows(
    await db.execute(
      sql`SELECT encryptedCredential FROM aiProviderConnections WHERE agencyId = ${agencyId} AND provider = 'sarvam' LIMIT 1`
    )
  )[0];
  if (!c?.encryptedCredential) throw new Error("sarvam_document_key_required");
  return decryptGatewayCredential(c.encryptedCredential);
}
export const followupRouter = router({
  recording: owned
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await database(),
        a = await account(db, ctx.followupAgencyId);
      const job = rows(
        await db.execute(
          sql`SELECT result FROM followupJobs WHERE id = ${input.id} AND agencyId = ${ctx.followupAgencyId} AND kind = 'call' AND status = 'completed'`
        )
      )[0];
      const id = job?.result ? JSON.parse(job.result).interactionId : null;
      if (!id || !a.config?.voiceKey || !/^\d{8}\/.{1,200}$/.test(id))
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No recording is available for this call.",
        });
      const c = a.config;
      const url = `https://apps.sarvam.ai/api/analytics/v1/${encodeURIComponent(c.orgId)}/${encodeURIComponent(c.workspaceId)}/${encodeURIComponent(c.appId)}/recordings/${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        headers: { "X-API-Key": c.voiceKey },
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      if (
        !response.ok ||
        !response.body ||
        !response.headers.get("content-type")?.includes("audio/")
      )
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider recording is unavailable.",
        });
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          if (size > 8 * 1024 * 1024) throw new Error("recording_too_large");
          chunks.push(part.value);
        }
      } finally {
        await reader.cancel();
      }
      return {
        id: input.id,
        audio: `data:audio/wav;base64,${Buffer.concat(chunks).toString("base64")}`,
      };
    }),
  dashboard: owned.query(async ({ ctx }) => {
    const db = await database(),
      a = await account(db, ctx.followupAgencyId);
    const c = a.config;
    const {
      voiceKey,
      documentKey,
      intakeToken,
      voiceToolToken,
      metaAppSecret,
      metaPageToken,
      metaVerifyToken,
      ...safe
    } = c || {};
    return {
      enabled: Boolean(a.enabled),
      balancePaise: Number(a.balancePaise),
      monthlyLimitPaise: a.monthlyLimitPaise,
      monthReservedPaise: Number(a.monthReservedPaise),
      config: safe,
      voiceKeyConfigured: Boolean(voiceKey),
      documentKeyConfigured: Boolean(documentKey),
      intakeConfigured: Boolean(intakeToken),
      intakeUrl: `${ENV.publicAppUrl}/api/followup/intake/${ctx.followupAgencyId}`,
      metaInbox: rows(
        await db.execute(
          sql`SELECT leadgenId, status, errorCode, createdAt FROM followupMetaInbox WHERE agencyId = ${ctx.followupAgencyId} ORDER BY createdAt DESC LIMIT 50`
        )
      ),
      jobs: rows(
        await db.execute(
          sql`SELECT id, leadId, kind, status, providerId, reservedPaise, chargedPaise, errorCode, result, createdAt FROM followupJobs WHERE agencyId = ${ctx.followupAgencyId} ORDER BY id DESC LIMIT 100`
        )
      ),
      ledger: rows(
        await db.execute(
          sql`SELECT id, jobId, amountPaise, description, createdAt FROM followupLedger WHERE agencyId = ${ctx.followupAgencyId} ORDER BY id DESC LIMIT 100`
        )
      ),
    };
  }),
  save: owned
    .input(
      configSchema.extend({
        monthlyLimitPaise: z.number().int().min(0).max(10000000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        const a = await account(tx, ctx.followupAgencyId, true);
        const { monthlyLimitPaise, ...config } = input;
        for (const partnerId of input.routingPartnerIds) {
          const allowed = rows(
            await tx.execute(
              sql`SELECT partnerId FROM partnerAgencyOnboarding WHERE partnerId = ${partnerId} AND agencyId = ${ctx.followupAgencyId}`
            )
          )[0];
          if (
            !allowed &&
            !(ctx.user.role === "admin" && ctx.user.openId === ENV.ownerOpenId)
          )
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Only the platform owner can configure cross-agency routing.",
            });
        }
        const merged = {
          ...config,
          voiceKey: input.voiceKey || a.config?.voiceKey,
          documentKey: input.documentKey || a.config?.documentKey,
          intakeToken: input.intakeToken || a.config?.intakeToken,
          voiceToolToken: input.voiceToolToken || a.config?.voiceToolToken,
          metaAppSecret: input.metaAppSecret || a.config?.metaAppSecret,
          metaPageToken: input.metaPageToken || a.config?.metaPageToken,
          metaVerifyToken: input.metaVerifyToken || a.config?.metaVerifyToken,
        };
        await tx.execute(
          sql`UPDATE followupAccounts SET encryptedConfig = ${encryptGatewayCredential(JSON.stringify(merged))}, monthlyLimitPaise = ${monthlyLimitPaise}, enabled = FALSE WHERE agencyId = ${ctx.followupAgencyId}`
        );
      });
      return { saved: true, enabled: false };
    }),
  setEnabled: owned
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await database(),
        a = await account(db, ctx.followupAgencyId);
      if (input.enabled) {
        const c = a.config;
        if (
          !c?.voiceKey ||
          !c.orgId ||
          !c.workspaceId ||
          !c.appId ||
          !c.connectionId ||
          c.agentPhone === "+910000000000" ||
          !c.providerDurationConfirmed ||
          !c.consentPolicyConfirmed ||
          !c.servicePincodes.length ||
          !a.monthlyLimitPaise ||
          a.balancePaise <= 0
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Configure voice workspace, prepaid credit, monthly limit, service pincodes and confirm provider duration/consent settings first.",
          });
        publicOrigin();
        if ((await getPlatformSafetyControl()).emergencyStopActive)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Emergency stop is active.",
          });
      }
      await db.execute(
        sql`UPDATE followupAccounts SET enabled = ${input.enabled} WHERE agencyId = ${ctx.followupAgencyId}`
      );
      if (input.enabled)
        await db.execute(
          sql`UPDATE followupJobs SET status = 'queued', errorCode = NULL WHERE agencyId = ${ctx.followupAgencyId} AND status = 'budget_blocked'`
        );
      return { enabled: input.enabled };
    }),
  queueCall: owned
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const count = rows(
        await db.execute(
          sql`SELECT COUNT(*) AS count FROM followupJobs WHERE agencyId = ${ctx.followupAgencyId} AND leadId = ${input.leadId} AND kind = 'call'`
        )
      )[0];
      const a = await account(db, ctx.followupAgencyId);
      const attempt = Number(count.count) + 1;
      if (attempt > (a.config?.maxAttempts || 1))
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Attempt limit reached.",
        });
      return {
        queued: await enqueue(
          ctx.followupAgencyId,
          input.leadId,
          "call",
          `lead:${input.leadId}:attempt:${attempt}`,
          { attempt }
        ),
      };
    }),
  retryMeta: owned
    .input(z.object({ leadgenId: z.string().regex(/^\d{5,100}$/) }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.execute(
        sql`UPDATE followupMetaInbox SET status = 'queued', errorCode = NULL WHERE agencyId = ${ctx.followupAgencyId} AND leadgenId = ${input.leadgenId} AND status = 'needs_human'`
      );
      return { queued: true };
    }),
  cancel: owned
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.execute(
        sql`UPDATE followupJobs SET status = 'cancelled' WHERE id = ${input.id} AND agencyId = ${ctx.followupAgencyId} AND status IN ('queued','budget_blocked')`
      );
      return { success: true };
    }),
  confirmBill: owned
    .input(z.object({ id: z.number().int().positive(), data: billSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.transaction(async tx => {
        const job = rows(
          await tx.execute(
            sql`SELECT * FROM followupJobs WHERE id = ${input.id} AND agencyId = ${ctx.followupAgencyId} AND kind = 'bill' AND status = 'needs_confirmation' FOR UPDATE`
          )
        )[0];
        if (!job) throw new TRPCError({ code: "NOT_FOUND" });
        const lead = await leadEligible(tx, ctx.followupAgencyId, job.leadId);
        await tx.execute(
          sql`UPDATE leads2 SET monthlyEnergyBill = COALESCE(${input.data.amount}, monthlyEnergyBill) WHERE id = ${lead.id} AND (assignedAgencyId = ${ctx.followupAgencyId} OR (assignedAgencyId IS NULL AND sourceAgencyId = ${ctx.followupAgencyId}))`
        );
        await tx.execute(
          sql`UPDATE conversations3 SET monthlyBill = COALESCE(${input.data.amount}, monthlyBill), monthlyUnits = ${input.data.units == null ? null : Math.round(input.data.units)} WHERE id = ${lead.conversationId} AND agencyId = ${lead.sourceAgencyId}`
        );
        await tx.execute(
          sql`UPDATE followupJobs SET status = 'completed', result = ${JSON.stringify({ ...input.data, confirmedBy: ctx.user.id })} WHERE id = ${job.id}`
        );
      });
      return { confirmed: true };
    }),
  credit: adminProcedure
    .input(
      z.object({
        agencyId: z.number().int().positive(),
        amountPaise: z.number().int().positive().max(10000000),
        paymentReference: z.string().min(5).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId)
        throw new TRPCError({ code: "FORBIDDEN" });
      const db = await database();
      await db.transaction(async tx => {
        await account(tx, input.agencyId, true);
        const r: any = await tx.execute(
          sql`INSERT IGNORE INTO followupLedger (agencyId, eventKey, amountPaise, description) VALUES (${input.agencyId}, ${`payment:${input.paymentReference}`}, ${input.amountPaise}, 'Owner-reconciled prepaid payment')`
        );
        if (r[0]?.affectedRows)
          await tx.execute(
            sql`UPDATE followupAccounts SET balancePaise = balancePaise + ${input.amountPaise} WHERE agencyId = ${input.agencyId}`
          );
      });
      return { recorded: true };
    }),
  reconcile: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        chargedPaise: z.number().int().min(0),
        evidence: z.string().min(20).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId)
        throw new TRPCError({ code: "FORBIDDEN" });
      const db = await database();
      const j = rows(
        await db.execute(
          sql`SELECT status FROM followupJobs WHERE id = ${input.id}`
        )
      )[0];
      if (j?.status !== "unknown")
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only uncertain jobs need manual reconciliation.",
        });
      await settle(db, input.id, input.chargedPaise, "reviewed", {
        evidence: input.evidence,
        actor: ctx.user.id,
      });
      return { reconciled: true };
    }),
});

async function processVoiceOutcome(db: any, job: any, body: any) {
  const a = await account(db, job.agencyId);
  const config = a.config;
  if (body.status === "connected" && body.duration == null)
    throw new Error("duration_missing");
  const seconds = body.duration == null ? 0 : Number(body.duration);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400)
    throw new Error("invalid_duration");
  const charge = callCharge(
    seconds,
    Number(JSON.parse(job.payload).ratePaise || config.callRatePaise)
  );
  const variables = body.final_agent_variables || {};
  const optedOut = variables.opt_out === true;
  if (optedOut) {
    const lead = rows(
      await db.execute(
        sql`SELECT phone, sourceAgencyId FROM leads2 WHERE id = ${job.leadId}`
      )
    )[0];
    if (lead) {
      await db.execute(
        sql`UPDATE solarChatIdentity SET revokedAt = NOW() WHERE agencyId = ${lead.sourceAgencyId} AND phone = ${lead.phone}`
      );
      await db.execute(
        sql`UPDATE leads2 SET isDnc = 1 WHERE id = ${job.leadId}`
      );
    }
  }
  const qualified = !optedOut && qualification(variables, config);
  const workflow = rows(
    await db.execute(
      sql`SELECT stage, surveySlotId FROM solarLeadWorkflow WHERE leadId = ${job.leadId}`
    )
  )[0];
  await settle(db, job.id, charge, "completed", {
    outcome: body.status,
    seconds,
    interactionId: body.interaction_id || null,
    variables,
    transcript: body.interaction_transcript || [],
    qualified,
    bookingStatus:
      workflow?.stage === "survey_booked"
        ? "booked"
        : variables.survey_requested
          ? "request_recorded_not_booked"
          : "not_requested",
  });
  if (!optedOut && (body.status === "busy" || body.status === "no_answer")) {
    const attempt = Number(JSON.parse(job.payload).attempt || 1);
    if (attempt < config.maxAttempts)
      await enqueue(
        job.agencyId,
        job.leadId,
        "call",
        `lead:${job.leadId}:attempt:${attempt + 1}`,
        { attempt: attempt + 1 },
        new Date(Date.now() + 4 * 3600000)
      );
    await enqueue(
      job.agencyId,
      job.leadId,
      "whatsapp",
      `missed-call:${job.id}`,
      { reason: "bill_followup" }
    ).catch(() => false);
  }
  if (qualified && config.automaticRouting)
    await autoRoute(
      db,
      job.agencyId,
      job.leadId,
      config.routingPartnerIds,
      variables
    ).catch(() => undefined);
  if (qualified)
    await db.execute(
      sql`INSERT INTO solarWorkflowEvents (leadId, actor, toStage, note) VALUES (${job.leadId}, 'sarvam', 'awaiting_partner', 'Voice qualification complete. Owner must verify assignment and survey availability; no appointment is implied.')`
    );
}

export function registerFollowupRoutes(app: express.Express) {
  app.get("/api/followup/meta/:agencyId", async (req, res) => {
    try {
      const db = await database(),
        a = await account(db, Number(req.params.agencyId), false, false);
      if (
        !a.config?.metaVerifyToken ||
        req.query["hub.mode"] !== "subscribe" ||
        !secretEqual(
          String(req.query["hub.verify_token"] || ""),
          a.config.metaVerifyToken
        )
      )
        return res.sendStatus(403);
      return res.send(String(req.query["hub.challenge"] || ""));
    } catch {
      return res.sendStatus(400);
    }
  });
  app.post(
    "/api/followup/meta/:agencyId",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      try {
        const db = await database(),
          agencyId = Number(req.params.agencyId),
          a = await account(db, agencyId, false, false);
        if (!a.config?.metaAppSecret || !Buffer.isBuffer(req.body))
          return res.sendStatus(401);
        const expected = `sha256=${createHmac("sha256", a.config.metaAppSecret).update(req.body).digest("hex")}`;
        if (
          !secretEqual(
            String(req.headers["x-hub-signature-256"] || ""),
            expected
          )
        )
          return res.sendStatus(401);
        const body = JSON.parse(req.body.toString("utf8"));
        for (const entry of body.entry || []) {
          if (String(entry.id) !== a.config.metaPageId) continue;
          for (const change of entry.changes || [])
            if (
              change.field === "leadgen" &&
              /^\d{5,100}$/.test(String(change.value?.leadgen_id || ""))
            ) {
              await db.execute(
                sql`INSERT IGNORE INTO followupMetaInbox (agencyId, leadgenId) VALUES (${agencyId}, ${String(change.value.leadgen_id)})`
              );
            }
        }
        return res.sendStatus(200);
      } catch {
        return res.sendStatus(400);
      }
    }
  );
  app.post(
    "/api/followup/voice-tools/:agencyId",
    express.json({ limit: "8kb" }),
    async (req, res) => {
      try {
        const agencyId = Number(req.params.agencyId);
        if (!Number.isSafeInteger(agencyId)) return res.sendStatus(404);
        const db = await database(),
          a = await account(db, agencyId, false, false);
        if (
          !a.enabled ||
          !a.config?.voiceToolToken ||
          !secretEqual(
            String(req.headers.authorization || ""),
            `Bearer ${a.config.voiceToolToken}`
          )
        )
          return res.sendStatus(401);
        if ((await getPlatformSafetyControl()).emergencyStopActive)
          return res.sendStatus(403);
        const input = z
          .object({
            phone: z.string().max(30),
            action: z.enum(["slots", "book"]),
            slotId: z.number().int().positive().optional(),
            confirmed: z.boolean().optional(),
          })
          .parse(req.body);
        const phone = normalizeIndianPhone(input.phone);
        if (!phone) return res.sendStatus(400);
        const job = rows(
          await db.execute(
            sql`SELECT j.id, j.leadId FROM followupJobs j INNER JOIN leads2 l ON l.id = j.leadId WHERE j.agencyId = ${agencyId} AND j.kind = 'call' AND j.status IN ('sending','submitted') AND l.phone = ${phone} AND j.updatedAt > DATE_SUB(NOW(), INTERVAL 10 MINUTE) ORDER BY j.id DESC LIMIT 1`
          )
        )[0];
        if (!job) return res.sendStatus(404);
        await leadEligible(db, agencyId, job.leadId);
        const result = await db.transaction(async tx => {
          const workflow = rows(
            await tx.execute(
              sql`SELECT w.* FROM solarLeadWorkflow w INNER JOIN leads2 l ON l.id = w.leadId INNER JOIN partnerAgencyOnboarding p ON p.partnerId = w.partnerId WHERE w.leadId = ${job.leadId} AND (l.assignedAgencyId = ${agencyId} OR (l.assignedAgencyId IS NULL AND l.sourceAgencyId = ${agencyId})) AND p.onboardingStatus = 'ready' FOR UPDATE`
            )
          )[0];
          if (
            !workflow ||
            !["accepted", "survey_booked"].includes(workflow.stage)
          )
            return {
              booked: false,
              slots: [],
              reason:
                "An installer must accept this lead before an appointment can be confirmed.",
            };
          if (workflow.stage === "survey_booked")
            return {
              booked: true,
              slotId: workflow.surveySlotId,
              existing: true,
            };
          if (input.action === "slots")
            return {
              booked: false,
              slots: rows(
                await tx.execute(
                  sql`SELECT id, startsAt, endsAt, city FROM solarSurveySlots WHERE partnerId = ${workflow.partnerId} AND status = 'available' AND startsAt > UTC_TIMESTAMP() ORDER BY startsAt LIMIT 10`
                )
              ),
            };
          if (!input.confirmed || !input.slotId)
            return {
              booked: false,
              reason: "Ask the customer to confirm an available slot first.",
            };
          const slot = rows(
            await tx.execute(
              sql`SELECT * FROM solarSurveySlots WHERE id = ${input.slotId} AND partnerId = ${workflow.partnerId} AND status = 'available' AND startsAt > UTC_TIMESTAMP() FOR UPDATE`
            )
          )[0];
          if (!slot)
            return {
              booked: false,
              reason:
                "Slot is no longer available. Offer another available slot.",
            };
          await tx.execute(
            sql`UPDATE solarSurveySlots SET status = 'booked', leadId = ${job.leadId} WHERE id = ${slot.id}`
          );
          await tx.execute(
            sql`UPDATE solarLeadWorkflow SET stage = 'survey_booked', surveySlotId = ${slot.id}, version = version + 1 WHERE leadId = ${job.leadId}`
          );
          await tx.execute(
            sql`INSERT INTO solarWorkflowEvents (leadId, actor, toStage, note) VALUES (${job.leadId}, 'sarvam', 'survey_booked', 'Voice agent recorded affirmative customer confirmation of an available installer slot.')`
          );
          return {
            booked: true,
            slotId: slot.id,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
          };
        });
        return res.json(result);
      } catch {
        return res.sendStatus(400);
      }
    }
  );
  app.post(
    "/api/followup/callback/:id/:token",
    express.json({ limit: "256kb" }),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id)) return res.sendStatus(404);
        const db = await database();
        const job = rows(
          await db.execute(
            sql`SELECT * FROM followupJobs WHERE id = ${id} AND kind = 'call'`
          )
        )[0];
        if (
          !job?.callbackTokenHash ||
          !secretEqual(hash(req.params.token), job.callbackTokenHash)
        )
          return res.sendStatus(401);
        const body = z
          .object({
            attempt_id: z.string().max(255),
            status: z.enum(["connected", "no_answer", "busy", "failed"]),
            duration: z.number().min(0).max(86400).nullable().optional(),
            interaction_id: z.string().max(255).nullable().optional(),
            final_agent_variables: z
              .record(z.string(), z.unknown())
              .nullable()
              .optional(),
            interaction_transcript: z
              .array(
                z.object({
                  role: z.string().max(20),
                  en_text: z.string().max(10000),
                })
              )
              .max(500)
              .nullable()
              .optional(),
          })
          .parse(req.body);
        if (job.providerId && job.providerId !== body.attempt_id)
          return res.sendStatus(409);
        if (job.chargedPaise != null) return res.sendStatus(200);
        // Store first; settlement/retry runs in the worker, never twice per delivery.
        await db.execute(
          sql`UPDATE followupJobs SET providerId = ${body.attempt_id}, result = ${JSON.stringify(body)}, status = 'callback_received' WHERE id = ${id} AND chargedPaise IS NULL AND status IN ('sending','submitted','unknown')`
        );
        return res.sendStatus(200);
      } catch {
        return res.sendStatus(400);
      }
    }
  );
  app.post(
    "/api/followup/intake/:agencyId",
    express.json({ limit: "16kb" }),
    async (req, res) => {
      try {
        const agencyId = Number(req.params.agencyId);
        if (!Number.isSafeInteger(agencyId)) return res.sendStatus(404);
        const db = await database(),
          a = await account(db, agencyId, false, false);
        if (
          !a.config?.intakeToken ||
          !secretEqual(
            String(req.headers.authorization || ""),
            `Bearer ${a.config.intakeToken}`
          )
        )
          return res.sendStatus(401);
        const input = z
          .object({
            externalId: z.string().min(1).max(160),
            name: z.string().min(1).max(200),
            phone: z.string().max(30),
            city: z.string().max(100),
            pincode: z.string().regex(/^\d{6}$/),
            monthlyBill: z.number().min(0).max(10000000),
            consent: z.literal(true),
            consentText: z.string().min(20).max(2000),
            consentAt: z.string().datetime(),
            whatsappConsent: z.boolean().default(false),
          })
          .parse(req.body);
        const phone = normalizeIndianPhone(input.phone);
        if (
          !phone ||
          Date.parse(input.consentAt) > Date.now() ||
          Date.now() - Date.parse(input.consentAt) > 30 * 86400000
        )
          return res.sendStatus(400);
        const leadId = await ingestLead(db, agencyId, input);
        if (a.enabled && a.config.automaticCalls)
          await enqueue(agencyId, leadId, "call", `lead:${leadId}:attempt:1`, {
            attempt: 1,
          });
        return res.status(202).json({ leadId });
      } catch {
        return res.sendStatus(400);
      }
    }
  );
  app.post("/api/scheduled/solar-followup", async (req, res) => {
    const key = process.env.SOLAR_OPERATIONS_CRON_SECRET;
    if (
      !key ||
      !secretEqual(String(req.headers.authorization || ""), `Bearer ${key}`)
    )
      return res.sendStatus(401);
    try {
      return res.json(await dispatchFollowup());
    } catch {
      return res.sendStatus(503);
    }
  });
}

export async function dispatchFollowup() {
  const db = await database();
  if ((await getPlatformSafetyControl()).emergencyStopActive)
    return { paused: true };
  await db.execute(
    sql`UPDATE followupJobs SET status = 'unknown', errorCode = 'reconcile_required' WHERE status IN ('sending','processing','waiting_message') AND updatedAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
  );
  await db.execute(
    sql`UPDATE followupMetaInbox SET status = 'needs_human', errorCode = 'processing_interrupted' WHERE status = 'processing' AND updatedAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
  );
  await db.execute(
    sql`UPDATE followupJobs SET status = 'unknown', errorCode = 'provider_callback_missing' WHERE kind = 'call' AND status = 'submitted' AND updatedAt < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
  );
  await db.execute(
    sql`UPDATE followupJobs SET status = 'unknown', errorCode = 'document_timeout_review' WHERE kind = 'bill' AND status = 'submitted' AND updatedAt < DATE_SUB(NOW(), INTERVAL 1 HOUR)`
  );
  await processMetaInbox(db);
  const callbacks = rows(
    await db.execute(
      sql`SELECT * FROM followupJobs WHERE status = 'callback_received' LIMIT 10`
    )
  );
  for (const j of callbacks) {
    const claimed = await db.execute(
      sql`UPDATE followupJobs SET status = 'processing' WHERE id = ${j.id} AND status = 'callback_received'`
    );
    if (!(claimed as any)[0]?.affectedRows) continue;
    try {
      await processVoiceOutcome(db, j, JSON.parse(j.result));
    } catch {
      await db.execute(
        sql`UPDATE followupJobs SET status = 'unknown', errorCode = 'outcome_review_required' WHERE id = ${j.id} AND chargedPaise IS NULL`
      );
    }
  }
  const bills = rows(
    await db.execute(
      sql`SELECT * FROM followupJobs WHERE kind = 'bill' AND status = 'submitted' LIMIT 5`
    )
  );
  for (const j of bills) {
    try {
      const a = await account(db, j.agencyId);
      if (!a.enabled || !a.config) continue;
      const r = await billResult(
        await docKey(db, j.agencyId, a.config),
        j.providerId
      );
      if (r.status === "completed")
        await settle(db, j.id, j.reservedPaise, "needs_confirmation", r.data);
      else if (["partially_completed", "failed", "rejected"].includes(r.status))
        await settle(db, j.id, j.reservedPaise, "needs_human", {
          reason: r.status,
        });
    } catch {
      /* Polling does not resubmit a paid job. */
    }
  }
  const queue = rows(
    await db.execute(
      sql`SELECT id FROM followupJobs WHERE status = 'queued' AND dueAt <= NOW() ORDER BY id LIMIT 10`
    )
  );
  for (const item of queue) {
    if ((await getPlatformSafetyControl()).emergencyStopActive) break;
    const peek = rows(
      await db.execute(sql`SELECT kind FROM followupJobs WHERE id = ${item.id}`)
    )[0];
    if (peek.kind === "call" && !insideCallingHours()) continue;
    const j = await reserve(db, item.id);
    if (!j) continue;
    let started = false;
    try {
      const lead = await leadEligible(db, j.agencyId, j.leadId);
      const current = await account(db, j.agencyId);
      if (
        !current.enabled ||
        (await getPlatformSafetyControl()).emergencyStopActive
      )
        throw new Error("paused");
      if (j.kind === "call") {
        if (
          Number(j.payload.attempt || 1) > j.config.maxAttempts ||
          !j.config.voiceKey ||
          !j.config.providerDurationConfirmed
        )
          throw new Error("voice_configuration_required");
        const token = randomBytes(32).toString("hex");
        await db.execute(
          sql`UPDATE followupJobs SET callbackTokenHash = ${hash(token)}, payload = ${JSON.stringify({ ...j.payload, ratePaise: j.config.callRatePaise })} WHERE id = ${j.id}`
        );
        started = true;
        const id = await startVoice(
          j.config,
          lead.phone,
          `${publicOrigin()}/api/followup/callback/${j.id}/${token}`
        );
        await db.execute(
          sql`UPDATE followupJobs SET providerId = COALESCE(providerId, ${id}), status = CASE WHEN status = 'sending' THEN 'submitted' ELSE status END WHERE id = ${j.id}`
        );
      } else if (j.kind === "bill") {
        const key = await docKey(db, j.agencyId, j.config);
        const media = await fetchBillMedia(db, j.agencyId, j.payload.mediaId);
        started = true;
        const id = await submitBill(key, media.bytes, media.mime);
        await db.execute(
          sql`UPDATE followupJobs SET providerId = ${id}, status = 'submitted' WHERE id = ${j.id}`
        );
      } else {
        const { queueBillFollowup } = await import("../agencyWhatsApp");
        started = true;
        const queued = await queueBillFollowup(db, j.agencyId, j.leadId, j.id);
        if (queued)
          await db.execute(
            sql`UPDATE followupJobs SET status = 'waiting_message' WHERE id = ${j.id}`
          );
        else
          await settle(db, j.id, 0, "blocked", {
            reason: "verified_opt_in_whatsapp_required",
          });
      }
    } catch (error: any) {
      if (!started || [400, 401, 403, 404, 422].includes(Number(error?.status)))
        await settle(db, j.id, 0, "blocked", {
          reason: "configuration_or_consent_required",
        });
      else
        await db.execute(
          sql`UPDATE followupJobs SET status = 'unknown', errorCode = 'reconcile_before_retry' WHERE id = ${j.id} AND chargedPaise IS NULL`
        );
    }
  }
  return { processed: queue.length };
}
async function fetchBillMedia(db: any, agencyId: number, mediaId: string) {
  if (!/^\d{5,100}$/.test(mediaId)) throw new Error("invalid_media_id");
  const connection = rows(
    await db.execute(
      sql`SELECT encryptedConfig FROM agencyWhatsAppConnections WHERE agencyId = ${agencyId} AND enabled = TRUE`
    )
  )[0];
  if (!connection) throw new Error("whatsapp_required");
  const c = JSON.parse(decryptGatewayCredential(connection.encryptedConfig));
  if (!/^v\d{1,3}\.\d$/.test(c.graphVersion))
    throw new Error("graph_version_required");
  const meta = await fetch(
    `https://graph.facebook.com/${c.graphVersion}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${c.accessToken}` },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!meta.ok) throw new Error("media_unavailable");
  const data = await meta.json(),
    url = new URL(data.url);
  if (
    url.protocol !== "https:" ||
    url.port ||
    !["lookaside.fbsbx.com", "lookaside.facebook.com"].includes(url.hostname)
  )
    throw new Error("untrusted_media_url");
  return boundedImage(
    await fetch(url, {
      headers: { Authorization: `Bearer ${c.accessToken}` },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    })
  );
}

async function ingestLead(db: any, agencyId: number, input: any) {
  const phone = normalizeIndianPhone(input.phone);
  if (!phone) throw new Error("invalid_phone");
  return db.transaction(async (tx: any) => {
    await tx.execute(
      sql`INSERT IGNORE INTO followupIntake (agencyId, externalId, consentEvidence) VALUES (${agencyId}, ${input.externalId}, ${JSON.stringify({ text: input.consentText, at: input.consentAt, whatsapp: input.whatsappConsent })})`
    );
    const existing = rows(
      await tx.execute(
        sql`SELECT leadId FROM followupIntake WHERE agencyId = ${agencyId} AND externalId = ${input.externalId} FOR UPDATE`
      )
    )[0];
    if (existing.leadId) return existing.leadId;
    // Serialize identical phones across independently retried ad/CRM deliveries.
    const key = hash(`${agencyId}:${phone}`);
    await tx.execute(
      sql`INSERT IGNORE INTO leadCaptureKeys (captureKey) VALUES (${key})`
    );
    const capture = rows(
      await tx.execute(
        sql`SELECT leadId FROM leadCaptureKeys WHERE captureKey = ${key} FOR UPDATE`
      )
    )[0];
    let id = Number(capture.leadId || 0);
    if (!id) {
      const sessionId = randomBytes(24).toString("hex");
      const conv: any = await tx.execute(
        sql`INSERT INTO conversations3 (agencyId, sessionId, customerName, customerPhone, customerCity, monthlyBill, source) VALUES (${agencyId}, ${sessionId}, ${input.name}, ${phone}, ${input.city}, ${input.monthlyBill}, 'consented_intake')`
      );
      await tx.execute(
        sql`INSERT INTO solarChatIdentity (sessionId, agencyId, phone, consentAt, whatsappConsentAt) VALUES (${sessionId}, ${agencyId}, ${phone}, ${new Date(input.consentAt)}, ${input.whatsappConsent ? new Date(input.consentAt) : null})`
      );
      const lead: any = await tx.execute(
        sql`INSERT INTO leads2 (agencyId, sourceAgencyId, firstName, lastName, phone, city, monthlyEnergyBill, zipCode, source, conversationId, assignmentStatus) VALUES (${agencyId}, ${agencyId}, ${input.name}, '', ${phone}, ${input.city}, ${input.monthlyBill}, ${input.pincode}, 'ai_chat', ${conv[0].insertId}, 'UNASSIGNED')`
      );
      id = Number(lead[0].insertId);
      await tx.execute(
        sql`INSERT INTO solarLeadWorkflow (leadId, stage) VALUES (${id}, 'awaiting_partner')`
      );
      await tx.execute(
        sql`UPDATE leadCaptureKeys SET leadId = ${id} WHERE captureKey = ${key}`
      );
    }
    await tx.execute(
      sql`UPDATE followupIntake SET leadId = ${id} WHERE agencyId = ${agencyId} AND externalId = ${input.externalId}`
    );
    return id;
  });
}

async function processMetaInbox(db: any) {
  const pending = rows(
    await db.execute(
      sql`SELECT * FROM followupMetaInbox WHERE status = 'queued' ORDER BY createdAt LIMIT 10`
    )
  );
  for (const item of pending) {
    const a = await account(db, item.agencyId),
      c = a.config;
    if (!c?.metaPageToken || !c.metaConsentText || !c.consentPolicyConfirmed)
      continue;
    const claimed: any = await db.execute(
      sql`UPDATE followupMetaInbox SET status = 'processing' WHERE agencyId = ${item.agencyId} AND leadgenId = ${item.leadgenId} AND status = 'queued'`
    );
    if (!claimed[0]?.affectedRows) continue;
    try {
      const response = await fetch(
        `https://graph.facebook.com/${c.graphVersion}/${item.leadgenId}?fields=id,created_time,field_data`,
        {
          headers: { Authorization: `Bearer ${c.metaPageToken}` },
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!response.ok) throw new Error("meta_fetch_failed");
      const lead = await response.json();
      if (String(lead.id) !== item.leadgenId) throw new Error("lead_mismatch");
      const fields = Object.fromEntries(
        (lead.field_data || []).map((f: any) => [f.name, f.values?.[0]])
      );
      if (
        !["yes", "true", "i agree"].includes(
          String(fields[c.metaConsentField] || "")
            .trim()
            .toLowerCase()
        )
      )
        throw new Error("callback_consent_missing");
      const at = Date.parse(lead.created_time);
      if (
        !Number.isFinite(at) ||
        at > Date.now() ||
        Date.now() - at > 30 * 86400000
      )
        throw new Error("consent_expired");
      if (!/^\d{6}$/.test(String(fields.zip_code || fields.pincode || "")))
        throw new Error("pincode_missing");
      const amount = Number(fields.monthly_bill || 0);
      if (!Number.isFinite(amount) || amount < 0 || amount > 10000000)
        throw new Error("invalid_bill");
      const input = {
        externalId: `meta:${item.leadgenId}`,
        name: String(fields.full_name || "").slice(0, 200),
        phone: String(fields.phone_number || ""),
        city: String(fields.city || "").slice(0, 100),
        pincode: String(fields.zip_code || fields.pincode),
        monthlyBill: amount,
        consentAt: new Date(at).toISOString(),
        consentText: c.metaConsentText,
        whatsappConsent: ["yes", "true", "i agree"].includes(
          String(fields.whatsapp_consent || "").toLowerCase()
        ),
      };
      if (!input.name) throw new Error("name_missing");
      const id = await ingestLead(db, item.agencyId, input);
      if (a.enabled && c.automaticCalls)
        await enqueue(item.agencyId, id, "call", `lead:${id}:attempt:1`, {
          attempt: 1,
        });
      await db.execute(
        sql`UPDATE followupMetaInbox SET status = 'captured' WHERE agencyId = ${item.agencyId} AND leadgenId = ${item.leadgenId}`
      );
    } catch {
      await db.execute(
        sql`UPDATE followupMetaInbox SET status = 'needs_human', errorCode = 'check_access_fields_and_consent' WHERE agencyId = ${item.agencyId} AND leadgenId = ${item.leadgenId}`
      );
    }
  }
}

async function autoRoute(
  db: any,
  agencyId: number,
  leadId: number,
  partnerIds: number[],
  variables: any
) {
  const lead = await leadEligible(db, agencyId, leadId);
  if (lead.assignedPartnerId) return;
  const owner = await getUserByOpenId(ENV.ownerOpenId);
  if (!owner || owner.role !== "admin") return;
  const pin = /^\d{6}$/.test(String(variables.pincode || ""))
    ? String(variables.pincode)
    : lead.zipCode;
  if (pin)
    await db.execute(
      sql`UPDATE leads2 SET zipCode = ${pin} WHERE id = ${leadId} AND sourceAgencyId = ${agencyId}`
    );
  const { solarOperationsRouter } = await import("../solarOperations");
  const caller = solarOperationsRouter.createCaller({
    user: owner,
    req: {} as any,
    res: {} as any,
  });
  for (const partnerId of partnerIds) {
    try {
      await caller.assign({ leadId, partnerId });
      return;
    } catch {
      /* Try only explicitly configured targets; core checks coverage and readiness. */
    }
  }
}
