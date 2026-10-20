import { createHash, randomBytes } from "node:crypto";
import {
  encryptGatewayCredential,
  decryptGatewayCredential,
} from "./aiGateway";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { getPartnerOnboardingSnapshot } from "./partnerOnboardingService";
import { isPlatformSuperAdmin } from "./platformCommunicationState";
import { ENV } from "./_core/env";
import * as customerDb from "./db";
import { captureConsentedChatLead, chatCaptureKey } from "./chatCapture";
import { phoneVerificationConfigured } from "./phoneVerification";
import { normalizeIndianPhone } from "../shared/solarWorkflow";
import { calculatePartnerQuote, buildPartnerProposalPdf } from "./partnerQuote";
import {
  assertSolarTransition,
  validSlot,
  commissionFor,
  solarStages,
  type SolarStage,
} from "../shared/solarWorkflow";

function rows(result: any): any[] {
  return Array.isArray(result?.[0]) ? result[0] : [];
}
async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Database unavailable.",
    });
  return db;
}
export async function authenticatedSolarPartner(db: any, token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  const partner = rows(
    await db.execute(
      sql`SELECT id, companyName, email, phone, serviceAreas, whatsappNumber FROM solarPartners WHERE loginTokenHash = ${hash} AND loginExpiresAt > ${Date.now()} LIMIT 1`
    )
  )[0];
  if (!partner)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Partner session expired. Please sign in again.",
    });
  return partner;
}
const owner = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isPlatformSuperAdmin(ctx.user, ENV.ownerOpenId))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform owner access required.",
    });
  return next({ ctx });
});
const tokenInput = z.object({ token: z.string().min(20).max(200) });
const sessionInput = z.object({ sessionId: z.string().min(16).max(128) });
async function customerLead(db: any, sessionId: string) {
  const identity = rows(
    await db.execute(
      sql`SELECT i.*, c.customerEmail FROM solarChatIdentity i INNER JOIN conversations3 c ON c.sessionId = i.sessionId AND c.agencyId = i.agencyId WHERE i.sessionId = ${sessionId}`
    )
  )[0];
  if (!identity?.consentAt || identity.revokedAt) return null;
  const contact = identity.phone || identity.customerEmail;
  if (!contact) return null;
  const key = chatCaptureKey(identity.agencyId, contact);
  const lead = rows(
    await db.execute(
      sql`SELECT l.id, l.assignedPartnerId, w.stage, w.version, w.surveySlotId FROM leadCaptureKeys k INNER JOIN leads2 l ON l.id = k.leadId LEFT JOIN solarLeadWorkflow w ON w.leadId = l.id WHERE k.captureKey = ${key}`
    )
  )[0];
  return lead ? { identity, lead } : null;
}
const partnerProcedure = publicProcedure
  .input(tokenInput)
  .use(async ({ input, next }) => {
    const db = await database();
    const partner = await authenticatedSolarPartner(db, input.token);
    return next({ ctx: { solarDb: db, solarPartner: partner } });
  });
async function event(
  tx: any,
  leadId: number,
  partnerId: number | null,
  actor: string,
  from: string | null,
  to: string,
  note?: string
) {
  await tx.execute(
    sql`INSERT INTO solarWorkflowEvents (leadId, partnerId, actor, fromStage, toStage, note) VALUES (${leadId}, ${partnerId}, ${actor}, ${from}, ${to}, ${note || null})`
  );
  // Queue in the same transaction as the milestone. Disabled/unconfigured
  // accounts simply do not queue; no network request occurs inside the transaction.
  if (partnerId) {
    const terms = rows(
      await tx.execute(
        sql`SELECT * FROM partnerSalesOperations WHERE partnerId = ${partnerId} AND commercialModel <> 'not_agreed' AND termsEffectiveFrom <= UTC_DATE()`
      )
    )[0];
    const earns =
      terms &&
      ((terms.commercialModel === "accepted_lead" && to === "accepted") ||
        (terms.commercialModel === "completed_survey" &&
          to === "survey_completed") ||
        (terms.commercialModel === "installation_percent" &&
          to === "closed_won"));
    if (earns) {
      const outcome = rows(
        await tx.execute(
          sql`SELECT revenuePaise FROM solarLeadWorkflow WHERE leadId = ${leadId}`
        )
      )[0];
      const amount = commissionFor(
        Number(outcome?.revenuePaise || 0),
        terms.commercialModel,
        Number(terms.commercialRate)
      );
      if (amount != null)
        await tx.execute(
          sql`INSERT IGNORE INTO solarCommercialAccruals (leadId, partnerId, milestone, model, rate, amountPaise, termsEffectiveFrom, termsReference) VALUES (${leadId}, ${partnerId}, ${to}, ${terms.commercialModel}, ${terms.commercialRate}, ${amount}, ${terms.termsEffectiveFrom}, ${terms.termsNote})`
        );
    }
    const mapping = rows(
      await tx.execute(
        sql`SELECT agencyId FROM partnerAgencyOnboarding WHERE partnerId = ${partnerId}`
      )
    )[0];
    if (mapping) {
      const { enqueueLeadWhatsApp } = await import("./agencyWhatsApp");
      await enqueueLeadWhatsApp(tx, mapping.agencyId, leadId);
    }
  }
}
async function ownedWorkflow(tx: any, leadId: number, partnerId: number) {
  // Both records must still agree: reassignment revokes the old installer's access immediately.
  const record = rows(
    await tx.execute(
      sql`SELECT w.* FROM solarLeadWorkflow w INNER JOIN leads2 l ON l.id = w.leadId WHERE w.leadId = ${leadId} AND w.partnerId = ${partnerId} AND l.assignedPartnerId = ${partnerId} FOR UPDATE`
    )
  )[0];
  if (!record)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Assigned workflow not found.",
    });
  return record;
}

export const solarOperationsRouter = router({
  customerProposal: publicProcedure
    .input(sessionInput)
    .mutation(async ({ input }) => {
      const db = await database();
      const record = await customerLead(db, input.sessionId);
      if (!record?.identity.phoneVerifiedAt)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Save your enquiry and verify your mobile number first.",
        });
      if (
        !record.lead.assignedPartnerId ||
        ![
          "accepted",
          "survey_booked",
          "survey_completed",
          "proposal_sent",
          "installed",
          "closed_won",
        ].includes(record.lead.stage)
      )
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Your enquiry is waiting for an installer to accept it before preparing a priced proposal.",
        });
      const partner = rows(
        await db.execute(
          sql`SELECT * FROM solarPartners WHERE id = ${record.lead.assignedPartnerId}`
        )
      )[0];
      if (!partner) throw new TRPCError({ code: "NOT_FOUND" });
      const setup = await getPartnerOnboardingSnapshot(db, partner);
      if (setup.mapping.onboardingStatus !== "ready")
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "The installer needs to update its catalogue or pricing before a proposal can be prepared.",
        });
      const lead = rows(
        await db.execute(
          sql`SELECT * FROM leads2 WHERE id = ${record.lead.id} AND assignedPartnerId = ${partner.id}`
        )
      )[0];
      const state = setup.stateInputs.find(
        (s: any) =>
          String(s.stateName).toLowerCase() === String(lead.state).toLowerCase()
      );
      let quote: ReturnType<typeof calculatePartnerQuote>;
      try {
        quote = calculatePartnerQuote({
          bill: Number(lead.monthlyEnergyBill),
          panels: setup.panels,
          inverters: setup.inverters,
          pricing: setup.pricing,
          state,
        });
      } catch (e) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: (e as Error).message,
        });
      }
      const customer = {
        name: `${lead.firstName} ${lead.lastName}`.trim(),
        city: [lead.city, lead.state].filter(Boolean).join(", "),
      };
      const snapshot = {
        quote,
        customer,
        installer: partner.companyName,
        leadId: lead.id,
        partnerId: partner.id,
      };
      const contentHash = createHash("sha256")
        .update(JSON.stringify(snapshot))
        .digest("hex");
      const reference = `SS-${lead.id}-${contentHash.slice(0, 16)}`;
      const pdfBase64 = buildPartnerProposalPdf(
        quote,
        customer,
        partner.companyName,
        reference
      );
      let downloadToken = randomBytes(32).toString("base64url");
      await db.transaction(async tx => {
        // Reassignment and proposal generation lock the same lead record.
        const current = rows(
          await tx.execute(
            sql`SELECT assignedPartnerId FROM leads2 WHERE id = ${lead.id} FOR UPDATE`
          )
        )[0];
        if (current?.assignedPartnerId !== partner.id)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Your installer changed. Please refresh.",
          });
        await tx.execute(
          sql`INSERT IGNORE INTO solarProposals (leadId, partnerId, reference, contentHash, snapshot, pdfBase64, validUntil) VALUES (${lead.id}, ${partner.id}, ${reference}, ${contentHash}, ${JSON.stringify(snapshot)}, ${pdfBase64}, ${quote.validUntil})`
        );
        const stored = rows(
          await tx.execute(
            sql`SELECT encryptedDownloadToken, downloadExpiresAt FROM solarProposals WHERE contentHash = ${contentHash} FOR UPDATE`
          )
        )[0];
        if (
          stored?.encryptedDownloadToken &&
          stored.downloadExpiresAt &&
          new Date(stored.downloadExpiresAt).getTime() > Date.now()
        )
          downloadToken = decryptGatewayCredential(
            stored.encryptedDownloadToken
          );
        else
          await tx.execute(
            sql`UPDATE solarProposals SET downloadTokenHash = ${createHash("sha256").update(downloadToken).digest("hex")}, encryptedDownloadToken = ${encryptGatewayCredential(downloadToken)}, downloadExpiresAt = ${new Date(Date.now() + 7 * 86400000)} WHERE contentHash = ${contentHash}`
          );
      });
      const { enqueueProposalWhatsApp } = await import("./agencyWhatsApp");
      const whatsappQueued = await enqueueProposalWhatsApp(
        db,
        setup.mapping.agencyId,
        lead.id,
        reference,
        `${ENV.publicAppUrl}/api/solar-proposals/${downloadToken}`
      );
      return {
        reference,
        fileName: `${reference}.pdf`,
        pdfBase64,
        validUntil: quote.validUntil,
        whatsappQueued,
      };
    }),
  saveCustomerContact: publicProcedure
    .input(
      sessionInput.extend({
        name: z.string().trim().min(2).max(100),
        phone: z.string().trim().min(10).max(30),
        consent: z.literal(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await database();
      const conversation = await customerDb.getConversation(input.sessionId);
      if (!conversation)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Start a conversation first.",
        });
      const phone = normalizeIndianPhone(input.phone);
      if (!phone)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid Indian mobile number.",
        });
      await customerDb.updateConversation(input.sessionId, {
        customerName: input.name,
        customerPhone: phone,
      });
      // Structured, affirmative consent is recorded separately from model inference.
      await customerDb.addChatMessage({
        conversationId: conversation.id,
        role: "customer",
        content:
          "I agree to be contacted about this solar request by phone, SMS and WhatsApp.",
      });
      const leadId = await captureConsentedChatLead(
        db,
        { ...conversation, customerName: input.name, customerPhone: phone },
        {
          name: input.name,
          phone,
          city: conversation.customerCity || undefined,
          state: conversation.customerState || undefined,
          monthlyBill: Number(conversation.monthlyBill) || undefined,
        },
        [
          {
            role: "customer",
            content:
              "I agree to be contacted about this solar request by phone, SMS and WhatsApp.",
          },
        ]
      );
      if (conversation.status === "active")
        await customerDb.updateConversation(input.sessionId, {
          status: "lead_captured",
        });
      return { success: true, leadId };
    }),
  customerProgress: publicProcedure
    .input(sessionInput)
    .query(async ({ input }) => {
      const db = await database();
      const record = await customerLead(db, input.sessionId);
      if (!record)
        return {
          captured: false,
          phoneVerified: false,
          verificationAvailable: phoneVerificationConfigured(),
          stage: "awaiting_partner",
          partnerName: null,
          slots: [] as any[],
          booking: null as any,
        };
      const { identity, lead } = record;
      if (!identity.phoneVerifiedAt)
        return {
          captured: true,
          phoneVerified: false,
          verificationAvailable: phoneVerificationConfigured(),
          stage: "contact_verification",
          partnerName: null,
          slots: [] as any[],
          booking: null as any,
        };
      const partner = lead.assignedPartnerId
        ? rows(
            await db.execute(
              sql`SELECT companyName FROM solarPartners WHERE id = ${lead.assignedPartnerId}`
            )
          )[0]
        : null;
      const slots =
        identity.phoneVerifiedAt && lead.stage === "accepted"
          ? rows(
              await db.execute(
                sql`SELECT id, startsAt, endsAt, city FROM solarSurveySlots WHERE partnerId = ${lead.assignedPartnerId} AND status = 'available' AND startsAt > UTC_TIMESTAMP() ORDER BY startsAt LIMIT 30`
              )
            )
          : [];
      const booking = lead.surveySlotId
        ? rows(
            await db.execute(
              sql`SELECT startsAt, endsAt, city FROM solarSurveySlots WHERE id = ${lead.surveySlotId} AND leadId = ${lead.id}`
            )
          )[0] || null
        : null;
      return {
        captured: true,
        phoneVerified: Boolean(identity.phoneVerifiedAt),
        verificationAvailable: phoneVerificationConfigured(),
        stage: lead.stage || "awaiting_partner",
        partnerName: partner?.companyName || null,
        slots,
        booking,
      };
    }),
  customerBookSurvey: publicProcedure
    .input(
      sessionInput.extend({
        slotId: z.number().int().positive(),
        confirmed: z.literal(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await database();
      await db.transaction(async tx => {
        const record = await customerLead(tx, input.sessionId);
        if (!record?.identity.phoneVerifiedAt)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Verify your mobile number before booking.",
          });
        const current = await ownedWorkflow(
          tx,
          record.lead.id,
          record.lead.assignedPartnerId
        );
        if (current.stage !== "accepted")
          throw new TRPCError({
            code: "CONFLICT",
            message: "Your installer must accept the enquiry before booking.",
          });
        const slot = rows(
          await tx.execute(
            sql`SELECT * FROM solarSurveySlots WHERE id = ${input.slotId} AND partnerId = ${current.partnerId} AND status = 'available' AND startsAt > UTC_TIMESTAMP() FOR UPDATE`
          )
        )[0];
        if (!slot)
          throw new TRPCError({
            code: "CONFLICT",
            message: "This slot is no longer available. Choose another.",
          });
        await tx.execute(
          sql`UPDATE solarSurveySlots SET status = 'booked', leadId = ${current.leadId} WHERE id = ${slot.id}`
        );
        await tx.execute(
          sql`UPDATE solarLeadWorkflow SET stage = 'survey_booked', surveySlotId = ${slot.id}, version = version + 1 WHERE leadId = ${current.leadId}`
        );
        await event(
          tx,
          current.leadId,
          current.partnerId,
          "customer",
          current.stage,
          "survey_booked",
          "Verified customer confirmed the available survey slot."
        );
      });
      return { success: true };
    }),
  partnerOverview: partnerProcedure.query(async ({ ctx }) => {
    const db = ctx.solarDb,
      id = ctx.solarPartner.id;
    const [settings, slots, workflows] = await Promise.all([
      db.execute(
        sql`SELECT * FROM partnerSalesOperations WHERE partnerId = ${id}`
      ),
      db.execute(
        sql`SELECT id, startsAt, endsAt, city, status, leadId FROM solarSurveySlots WHERE partnerId = ${id} AND startsAt >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY) ORDER BY startsAt LIMIT 100`
      ),
      db.execute(
        sql`SELECT w.*, l.firstName, l.lastName, l.city, l.state FROM solarLeadWorkflow w INNER JOIN leads2 l ON l.id = w.leadId WHERE w.partnerId = ${id} AND l.assignedPartnerId = ${id} ORDER BY w.updatedAt DESC LIMIT 200`
      ),
    ]);
    return {
      settings: rows(settings)[0] || null,
      slots: rows(slots),
      workflows: rows(workflows),
    };
  }),
  saveAvailability: partnerProcedure
    .input(
      z.object({
        acceptingLeads: z.boolean(),
        cities: z.array(z.string().trim().min(2).max(100)).max(50),
        pincodes: z.array(z.string().regex(/^[1-9]\d{5}$/)).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (
        input.acceptingLeads &&
        !input.cities.length &&
        !input.pincodes.length
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add at least one service city or PIN code.",
        });
      if (input.acceptingLeads) {
        const setup = await getPartnerOnboardingSnapshot(
          ctx.solarDb,
          ctx.solarPartner
        );
        if (setup.mapping.onboardingStatus !== "ready")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Complete catalogue and pricing setup before accepting leads.",
          });
      }
      await ctx.solarDb.execute(
        sql`INSERT INTO partnerSalesOperations (partnerId, acceptingLeads, serviceCities, servicePincodes) VALUES (${ctx.solarPartner.id}, ${input.acceptingLeads}, ${JSON.stringify(input.cities)}, ${JSON.stringify(input.pincodes)}) ON DUPLICATE KEY UPDATE acceptingLeads = VALUES(acceptingLeads), serviceCities = VALUES(serviceCities), servicePincodes = VALUES(servicePincodes)`
      );
      return { success: true };
    }),
  addSlot: partnerProcedure
    .input(
      z.object({
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime(),
        city: z.string().trim().min(2).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!validSlot(input.startsAt, input.endsAt))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a future survey slot lasting at most eight hours.",
        });
      await ctx.solarDb.transaction(async tx => {
        // Serialize slot edits for a partner, including overlapping slots with different start times.
        await tx.execute(
          sql`SELECT id FROM solarPartners WHERE id = ${ctx.solarPartner.id} FOR UPDATE`
        );
        const conflict = rows(
          await tx.execute(
            sql`SELECT id FROM solarSurveySlots WHERE partnerId = ${ctx.solarPartner.id} AND status <> 'cancelled' AND startsAt < ${new Date(input.endsAt)} AND endsAt > ${new Date(input.startsAt)} LIMIT 1`
          )
        )[0];
        if (conflict)
          throw new TRPCError({
            code: "CONFLICT",
            message: "This overlaps an existing survey slot.",
          });
        await tx.execute(
          sql`INSERT INTO solarSurveySlots (partnerId, startsAt, endsAt, city) VALUES (${ctx.solarPartner.id}, ${new Date(input.startsAt)}, ${new Date(input.endsAt)}, ${input.city})`
        );
      });
      return { success: true };
    }),
  cancelSlot: partnerProcedure
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result: any = await ctx.solarDb.execute(
        sql`UPDATE solarSurveySlots SET status = 'cancelled' WHERE id = ${input.slotId} AND partnerId = ${ctx.solarPartner.id} AND status = 'available'`
      );
      if (!result[0]?.affectedRows)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Only an available slot can be removed. Cancel a booked survey through its lead.",
        });
      return { success: true };
    }),
  advance: partnerProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        version: z.number().int().min(0),
        stage: z.enum(solarStages),
        note: z.string().trim().min(3).max(2000),
        revenuePaise: z.number().int().min(0).max(1_000_000_000_000).optional(),
        paymentReference: z.string().trim().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.solarDb.transaction(async tx => {
        const current = await ownedWorkflow(
          tx,
          input.leadId,
          ctx.solarPartner.id
        );
        if (current.version !== input.version)
          throw new TRPCError({
            code: "CONFLICT",
            message: "This lead changed. Refresh before continuing.",
          });
        try {
          assertSolarTransition(current.stage as SolarStage, input.stage);
        } catch (e) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: (e as Error).message,
          });
        }
        if (
          ["assigned", "awaiting_partner", "survey_booked"].includes(
            input.stage
          )
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Use assignment or survey booking for this step.",
          });
        if (
          input.stage === "closed_won" &&
          (!(input.revenuePaise && input.revenuePaise > 0) ||
            !input.paymentReference)
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Record received revenue and a payment reference before closing.",
          });
        if (
          ["accepted", "cancelled", "rejected"].includes(input.stage) &&
          current.surveySlotId
        )
          await tx.execute(
            sql`UPDATE solarSurveySlots SET status = 'available', leadId = NULL WHERE id = ${current.surveySlotId} AND leadId = ${input.leadId} AND status = 'booked'`
          );
        await tx.execute(
          sql`UPDATE solarLeadWorkflow SET stage = ${input.stage}, version = version + 1, surveySlotId = CASE WHEN ${["accepted", "cancelled", "rejected"].includes(input.stage)} THEN NULL ELSE surveySlotId END, revenuePaise = ${input.stage === "closed_won" ? input.revenuePaise! : current.revenuePaise}, paymentReference = ${input.stage === "closed_won" ? input.paymentReference! : current.paymentReference} WHERE leadId = ${input.leadId}`
        );
        if (
          input.stage === "closed_won" ||
          input.stage === "rejected" ||
          input.stage === "cancelled"
        )
          await tx.execute(
            sql`UPDATE leads2 SET status = ${input.stage === "closed_won" ? "converted" : "lost"} WHERE id = ${input.leadId} AND assignedPartnerId = ${ctx.solarPartner.id}`
          );
        await event(
          tx,
          input.leadId,
          ctx.solarPartner.id,
          `partner:${ctx.solarPartner.id}`,
          current.stage,
          input.stage,
          input.note
        );
      });
      return { success: true };
    }),
  bookSurvey: partnerProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        slotId: z.number().int().positive(),
        version: z.number().int().min(0),
        customerConfirmed: z.literal(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.solarDb.transaction(async tx => {
        const current = await ownedWorkflow(
          tx,
          input.leadId,
          ctx.solarPartner.id
        );
        if (current.version !== input.version)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Lead changed. Refresh first.",
          });
        if (current.stage !== "accepted")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Accept the lead before booking a survey.",
          });
        const slot = rows(
          await tx.execute(
            sql`SELECT * FROM solarSurveySlots WHERE id = ${input.slotId} AND partnerId = ${ctx.solarPartner.id} AND status = 'available' AND startsAt > UTC_TIMESTAMP() FOR UPDATE`
          )
        )[0];
        if (!slot)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Survey slot is no longer available.",
          });
        await tx.execute(
          sql`UPDATE solarSurveySlots SET status = 'booked', leadId = ${input.leadId} WHERE id = ${slot.id}`
        );
        await tx.execute(
          sql`UPDATE solarLeadWorkflow SET stage = 'survey_booked', surveySlotId = ${slot.id}, version = version + 1 WHERE leadId = ${input.leadId}`
        );
        await event(
          tx,
          input.leadId,
          ctx.solarPartner.id,
          `partner:${ctx.solarPartner.id}`,
          current.stage,
          "survey_booked",
          "Partner confirmed customer agreement to this survey slot."
        );
      });
      return { success: true };
    }),
  ownerOverview: owner.query(async () => {
    const db = await database();
    const [partners, leads, accruals] = await Promise.all([
      db.execute(
        sql`SELECT p.id, p.companyName, o.acceptingLeads, o.serviceCities, o.servicePincodes, o.commercialModel, o.commercialRate, o.termsEffectiveFrom, o.termsNote, m.onboardingStatus FROM solarPartners p LEFT JOIN partnerSalesOperations o ON o.partnerId = p.id LEFT JOIN partnerAgencyOnboarding m ON m.partnerId = p.id ORDER BY p.companyName`
      ),
      db.execute(
        sql`SELECT l.id, l.firstName, l.lastName, l.city, l.state, l.assignedPartnerId, w.stage, w.version, w.revenuePaise FROM leads2 l LEFT JOIN solarLeadWorkflow w ON w.leadId = l.id WHERE l.source = 'ai_chat' ORDER BY l.createdAt DESC LIMIT 200`
      ),
      db.execute(
        sql`SELECT a.id, a.leadId, a.milestone, a.amountPaise, a.model, a.createdAt, p.companyName FROM solarCommercialAccruals a INNER JOIN solarPartners p ON p.id = a.partnerId ORDER BY a.id DESC LIMIT 200`
      ),
    ]);
    return {
      partners: rows(partners),
      leads: rows(leads),
      accruals: rows(accruals),
    };
  }),
  assign: owner
    .input(
      z.object({
        leadId: z.number().int().positive(),
        partnerId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await database();
      const partner = rows(
        await db.execute(
          sql`SELECT * FROM solarPartners WHERE id = ${input.partnerId}`
        )
      )[0];
      if (!partner)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner not found.",
        });
      const setup = await getPartnerOnboardingSnapshot(db, partner);
      if (setup.mapping.onboardingStatus !== "ready")
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Partner must complete business setup first.",
        });
      await db.transaction(async tx => {
        const lead = rows(
          await tx.execute(
            sql`SELECT id, city, zipCode FROM leads2 WHERE id = ${input.leadId} FOR UPDATE`
          )
        )[0];
        if (!lead)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lead not found.",
          });
        const config = rows(
          await tx.execute(
            sql`SELECT * FROM partnerSalesOperations WHERE partnerId = ${input.partnerId} AND acceptingLeads = 1 FOR UPDATE`
          )
        )[0];
        if (!config)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Partner is not accepting leads.",
          });
        const array = (value: unknown): string[] => {
          if (Array.isArray(value)) return value;
          try {
            return JSON.parse(String(value || "[]"));
          } catch {
            return [];
          }
        };
        const cities = array(config.serviceCities),
          pins = array(config.servicePincodes);
        if (
          !cities.some(
            c => c.toLowerCase() === String(lead.city || "").toLowerCase()
          ) &&
          !pins.includes(lead.zipCode)
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Lead is outside this partner's recorded service area.",
          });
        const existing = rows(
          await tx.execute(
            sql`SELECT * FROM solarLeadWorkflow WHERE leadId = ${input.leadId} FOR UPDATE`
          )
        )[0];
        if (
          existing &&
          !["awaiting_partner", "rejected", "cancelled"].includes(
            existing.stage
          )
        )
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Cancel or reject the current assignment before reassigning.",
          });
        await tx.execute(
          sql`UPDATE leads2 SET assignedPartnerId = ${input.partnerId}, assignedAgencyId = ${setup.mapping.agencyId}, assignmentStatus = ${existing ? "REASSIGNED" : "ASSIGNED"}, assignedBy = ${ctx.user!.id}, assignedAt = NOW() WHERE id = ${input.leadId}`
        );
        await tx.execute(
          sql`INSERT INTO solarLeadWorkflow (leadId, partnerId, stage) VALUES (${input.leadId}, ${input.partnerId}, 'assigned') ON DUPLICATE KEY UPDATE partnerId = VALUES(partnerId), stage = 'assigned', version = version + 1, surveySlotId = NULL`
        );
        await event(
          tx,
          input.leadId,
          input.partnerId,
          `owner:${ctx.user!.id}`,
          existing?.stage || "awaiting_partner",
          "assigned"
        );
      });
      return { success: true };
    }),
  saveTerms: owner
    .input(
      z.object({
        partnerId: z.number().int().positive(),
        model: z.enum([
          "not_agreed",
          "accepted_lead",
          "completed_survey",
          "installation_percent",
        ]),
        rate: z.number().min(0).max(10000000).nullable(),
        effectiveFrom: z.string().date().nullable(),
        note: z.string().trim().max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (
        input.model !== "not_agreed" &&
        (input.rate == null || !input.effectiveFrom || input.note.length < 10)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Agreed terms require rate, effective date and agreement reference.",
        });
      try {
        commissionFor(0, input.model, input.rate);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (e as Error).message,
        });
      }
      const db = await database();
      if (
        !rows(
          await db.execute(
            sql`SELECT id FROM solarPartners WHERE id = ${input.partnerId}`
          )
        )[0]
      )
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner not found.",
        });
      await db.execute(
        sql`INSERT INTO partnerSalesOperations (partnerId, commercialModel, commercialRate, termsEffectiveFrom, termsNote, termsUpdatedBy) VALUES (${input.partnerId}, ${input.model}, ${input.model === "not_agreed" ? null : input.rate}, ${input.effectiveFrom}, ${input.note}, ${ctx.user!.id}) ON DUPLICATE KEY UPDATE commercialModel = VALUES(commercialModel), commercialRate = VALUES(commercialRate), termsEffectiveFrom = VALUES(termsEffectiveFrom), termsNote = VALUES(termsNote), termsUpdatedBy = VALUES(termsUpdatedBy)`
      );
      return { success: true };
    }),
});
