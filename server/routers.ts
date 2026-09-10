import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { makeRequest, PlacesSearchResult, PlaceDetailsResult } from "./_core/map";
import { getStripe } from "./stripe-handler";
import { PLANS, TRIAL_DAYS } from "./stripe-products";
import * as db from "./db";
import { referrerRouter } from "./referrer";
import { copilotRouter } from "./copilot";
import { referralCoachRouter } from "./referralCoach";
import { partnerRouter } from "./partner";
import { sendEmail } from "./_core/emailService";
import { extractEmailFromWebsite, isUsableContactEmail } from "./emailExtractor";
import { automatedOutreachRouter } from "./automatedOutreach";
import { partnerManagementRouter } from "./partnerManagement";
import { campaignIntelligenceRouter } from "./campaignIntelligence";
import { aiGatewayRouter } from "./aiGateway";
import { operationsRouter } from "./operations";
import { platformCommunicationsRouter } from "./platformCommunications";
import { isPlatformSuperAdmin } from "./platformCommunicationState";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { calculateBusinessEvidenceScore, calculateEvidenceScore } from "./evidenceScore";
import {
  buildCallbackConsentPrompt,
  buildCommercialEstimateResponse,
  buildLimitedResidentialEstimateResponse,
  buildSafeProviderFallback,
  deriveDeterministicChatFacts,
  estimateCommercialCapacityKw,
  hasEstimateInputs,
  hasExplicitContactConsent,
  isCallbackRequest,
  estimateResidentialCapacityKw,
  withProviderTimeout,
} from "./chatFlow";
import { parseQuickReplyMarkup } from "@shared/chatControls";
import { buildBillOcrContent } from "./billOcrContent";
import { catalogItemActivationError } from "./productionControls";
import { isCurrentVerifiedCatalogItem, isVerifiedPricingReady } from "./catalogPricing";

async function requireUserAgency(userId: number) {
  const agency = await db.getAgencyByUserId(userId);
  if (!agency) throw new TRPCError({ code: "UNAUTHORIZED", message: "Agency not found" });
  return agency;
}

async function requireOwnedConversation(userId: number, conversationId: number) {
  const agency = await requireUserAgency(userId);
  const conversation = await db.getConversationById(conversationId);
  if (!conversation || conversation.agencyId !== agency.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
  }
  return conversation;
}

async function requireOwnedLead(userId: number, leadId: number) {
  const agency = await requireUserAgency(userId);
  const lead = await db.getLeadByIdForAgency(leadId, agency.id);
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  return { agency, lead };
}

async function requireOwnedScrapedBusiness(userId: number, businessId: number) {
  const agency = await requireUserAgency(userId);
  const business = await db.getScrapedBusinessByIdForAgency(businessId, agency.id);
  if (!business) throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  return {
    agency,
    business: {
      ...business,
      email: business.email && isUsableContactEmail(business.email) ? business.email : null,
    },
  };
}

function publicBusinessRecord(business: any) {
  return {
    ...business,
    email: business.email && isUsableContactEmail(String(business.email)) ? business.email : null,
  };
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" };
  return value.replace(/[&<>"']/g, character => entities[character]);
}

function preliminaryEstimateMessage(params: {
  propertyType: "residential" | "commercial";
  monthlyBill: number;
  estimate: ReturnType<typeof calculateSolarEstimate>;
  subsidyConfigured: boolean;
}) {
  const { propertyType, monthlyBill, estimate, subsidyConfigured } = params;
  const bill = `₹${Math.round(monthlyBill).toLocaleString("en-IN")}`;
  const cost = `₹${Math.round(estimate.totalCost).toLocaleString("en-IN")}`;
  const savings = `₹${Math.round(estimate.monthlySavings).toLocaleString("en-IN")}`;
  const subsidyLabel = propertyType === "commercial"
    ? "Not assumed for commercial property"
    : subsidyConfigured
      ? `Approx ₹${Math.round(estimate.totalSubsidy).toLocaleString("en-IN")} — eligibility to confirm`
      : "Eligibility to confirm";

  return `📊 **Preliminary solar estimate**\n\n| | |\n|---|---|\n| Monthly bill | ${bill} |\n| Suggested system size | ~${estimate.systemSizeKw} kW |\n| Configured-catalog estimate | Approx ${cost} |\n| Possible subsidy | ${subsidyLabel} |\n| Projected monthly savings | Approx ${savings}, subject to tariff and generation |\n\nThis is a preliminary estimate based on the details you shared. Final pricing, savings, subsidy eligibility, and system design require a site assessment.`;
}

// In-memory OTP store (session → { otp, expiresAt, phone })
const otpStore = new Map<string, { otp: string; expiresAt: Date; phone: string }>();

export const appRouter = router({
  system: systemRouter,
  referrer: referrerRouter,
  partner: partnerRouter,
  partnerManagement: partnerManagementRouter,
  campaignIntelligence: campaignIntelligenceRouter,
  aiGateway: aiGatewayRouter,
  operations: operationsRouter,
  platformCommunications: platformCommunicationsRouter,
  automatedOutreach: automatedOutreachRouter,
  copilot: copilotRouter,
  referralCoach: referralCoachRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? ({ ...opts.ctx.user, isPlatformOwner: isPlatformSuperAdmin(opts.ctx.user, ENV.ownerOpenId) }) : null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== AGENCY CONFIG =====
  agency: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      return await db.getAgencyByUserId(ctx.user.id);
    }),

    getFirst: publicProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return "demo";
      const agencies = await dbConn.execute(sql`SELECT agencySlug FROM agencyConfig3 WHERE isActive = 1 LIMIT 1`) as any[];
      const row = Array.isArray(agencies[0]) ? agencies[0][0] : agencies[0];
      return (row as any)?.agencySlug || "demo";
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const agency = await db.getAgencyBySlug(input.slug);
        if (!agency) return null;
        // Return public-safe fields only
        return {
          id: agency.id,
          agencyName: agency.agencyName,
          agencySlug: agency.agencySlug,
          logoUrl: agency.logoUrl,
          brandColor: agency.brandColor,
          phone: agency.phone,
          email: agency.email,
          city: agency.city,
          state: agency.state,
          botGreeting: agency.botGreeting,
          botTone: agency.botTone,
          isActive: agency.isActive,
        };
      }),

    create: protectedProcedure
      .input(z.object({
        agencyName: z.string(),
        agencySlug: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        brandColor: z.string().optional(),
        botGreeting: z.string().optional(),
        botTone: z.string().optional(),
        installationChargePerKw: z.string().optional(),
        marginPercent: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const existing = await db.getAgencyByUserId(ctx.user.id);
        if (existing) throw new Error("Agency already exists");
        const id = await db.createAgency({ ...input, userId: ctx.user.id });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        agencyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        brandColor: z.string().optional(),
        botGreeting: z.string().optional(),
        botTone: z.string().optional(),
        installationChargePerKw: z.string().optional(),
        marginPercent: z.string().optional(),
        logoUrl: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        whatsappNumber: z.string().optional(),
        linkedinUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          // Auto-create agency if it doesn't exist yet
          const slug = (input.agencyName || ctx.user.name || "agency")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const id = await db.createAgency({
            userId: ctx.user.id,
            agencyName: input.agencyName || ctx.user.name || "My Agency",
            agencySlug: slug + "-" + Date.now().toString(36),
            phone: input.phone,
            email: input.email || ctx.user.email || "",
            city: input.city,
            state: input.state,
            brandColor: input.brandColor,
            botGreeting: input.botGreeting,
            botTone: input.botTone,
            installationChargePerKw: input.installationChargePerKw,
            marginPercent: input.marginPercent,
          });
          return { success: true, created: true, id };
        }
        await db.updateAgency(agency.id, input);
        return { success: true };
      }),
  }),

  // ===== PANEL PRODUCTS =====
  panels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return [];
      return await db.getPanelsByAgency(agency.id);
    }),

    create: protectedProcedure
      .input(z.object({
        brand: z.string(),
        model: z.string(),
        wattage: z.number(),
        pricePerPanel: z.string(),
        efficiency: z.string().optional(),
        panelType: z.string().optional(),
        warranty: z.number().optional(),
        pricingVersion: z.string().trim().max(80).optional(),
        effectiveFrom: z.string().date().optional(),
        effectiveTo: z.string().date().optional(),
        sourceNote: z.string().trim().max(2000).optional(),
        lastVerifiedAt: z.string().datetime().optional(),
        isPriceActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await requireUserAgency(ctx.user!.id);
        const error = catalogItemActivationError(input);
        if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
        const id = await db.createPanel({
          ...input,
          agencyId: agency.id,
          effectiveFrom: input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : undefined,
          effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : undefined,
          lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : undefined,
        });
        await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "panel_created", entityType: "panelProducts3", entityId: id ?? undefined, metadata: { pricingVersion: input.pricingVersion || "draft", isPriceActive: Boolean(input.isPriceActive) } });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        brand: z.string().optional(),
        model: z.string().optional(),
        wattage: z.number().optional(),
        pricePerPanel: z.string().optional(),
        efficiency: z.string().optional(),
        panelType: z.string().optional(),
        warranty: z.number().optional(),
        pricingVersion: z.string().trim().max(80).optional(),
        effectiveFrom: z.string().date().nullable().optional(),
        effectiveTo: z.string().date().nullable().optional(),
        sourceNote: z.string().trim().max(2000).nullable().optional(),
        lastVerifiedAt: z.string().datetime().nullable().optional(),
        isPriceActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const agency = await requireUserAgency(ctx.user!.id);
        const current = await db.getPanelByIdForAgency(id, agency.id);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Panel not found" });
        const merged = { ...current, ...data };
        const error = catalogItemActivationError(merged);
        if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
        await db.updatePanelForAgency(id, agency.id, {
          ...data,
          effectiveFrom: data.effectiveFrom ? new Date(`${data.effectiveFrom}T00:00:00.000Z`) : data.effectiveFrom === null ? null : undefined,
          effectiveTo: data.effectiveTo ? new Date(`${data.effectiveTo}T00:00:00.000Z`) : data.effectiveTo === null ? null : undefined,
          lastVerifiedAt: data.lastVerifiedAt ? new Date(data.lastVerifiedAt) : data.lastVerifiedAt === null ? null : undefined,
        });
        await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "panel_updated", entityType: "panelProducts3", entityId: id, metadata: { pricingVersion: merged.pricingVersion, isPriceActive: Boolean(merged.isPriceActive) } });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const agency = await requireUserAgency(ctx.user!.id);
        if (!await db.getPanelByIdForAgency(input.id, agency.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Panel not found" });
        await db.deletePanelForAgency(input.id, agency.id);
        await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "panel_archived", entityType: "panelProducts3", entityId: input.id });
        return { success: true };
      }),
  }),

  // ===== INVERTER PRODUCTS =====
  inverters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return [];
      return await db.getInvertersByAgency(agency.id);
    }),

    create: protectedProcedure
      .input(z.object({
        brand: z.string(),
        model: z.string(),
        capacityKw: z.string(),
        price: z.string(),
        inverterType: z.string().optional(),
        warranty: z.number().optional(),
        pricingVersion: z.string().trim().max(80).optional(),
        effectiveFrom: z.string().date().optional(),
        effectiveTo: z.string().date().optional(),
        sourceNote: z.string().trim().max(2000).optional(),
        lastVerifiedAt: z.string().datetime().optional(),
        isPriceActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const agency = await requireUserAgency(ctx.user!.id);
        const error = catalogItemActivationError(input);
        if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
        const id = await db.createInverter({
          ...input,
          agencyId: agency.id,
          effectiveFrom: input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : undefined,
          effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : undefined,
          lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : undefined,
        });
        await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "inverter_created", entityType: "inverterProducts3", entityId: id ?? undefined, metadata: { pricingVersion: input.pricingVersion || "draft", isPriceActive: Boolean(input.isPriceActive) } });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        brand: z.string().optional(),
        model: z.string().optional(),
        capacityKw: z.string().optional(),
        price: z.string().optional(),
        inverterType: z.string().optional(),
        warranty: z.number().optional(),
        pricingVersion: z.string().trim().max(80).optional(),
        effectiveFrom: z.string().date().nullable().optional(),
        effectiveTo: z.string().date().nullable().optional(),
        sourceNote: z.string().trim().max(2000).nullable().optional(),
        lastVerifiedAt: z.string().datetime().nullable().optional(),
        isPriceActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const agency = await requireUserAgency(ctx.user!.id);
        const current = await db.getInverterByIdForAgency(id, agency.id);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Inverter not found" });
        const merged = { ...current, ...data };
        const error = catalogItemActivationError(merged);
        if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
        await db.updateInverterForAgency(id, agency.id, {
          ...data,
          effectiveFrom: data.effectiveFrom ? new Date(`${data.effectiveFrom}T00:00:00.000Z`) : data.effectiveFrom === null ? null : undefined,
          effectiveTo: data.effectiveTo ? new Date(`${data.effectiveTo}T00:00:00.000Z`) : data.effectiveTo === null ? null : undefined,
          lastVerifiedAt: data.lastVerifiedAt ? new Date(data.lastVerifiedAt) : data.lastVerifiedAt === null ? null : undefined,
        });
        await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "inverter_updated", entityType: "inverterProducts3", entityId: id, metadata: { pricingVersion: merged.pricingVersion, isPriceActive: Boolean(merged.isPriceActive) } });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const agency = await requireUserAgency(ctx.user!.id);
        if (!await db.getInverterByIdForAgency(input.id, agency.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Inverter not found" });
        await db.deleteInverterForAgency(input.id, agency.id);
        await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "inverter_archived", entityType: "inverterProducts3", entityId: input.id });
        return { success: true };
      }),
  }),

  // ===== STATE SUBSIDIES =====
  subsidies: router({
    list: publicProcedure.query(async () => {
      return await db.getAllSubsidies();
    }),

    getByState: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        return await db.getSubsidyByState(input.state);
      }),
  }),

  // ===== AI CHAT BOT (PUBLIC - for customers clicking ads) =====
  chat: router({
    uploadBill: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().min(16).max(128),
        fileName: z.string().trim().min(1).max(120),
        contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        contentBase64: z.string().min(8).max(6_000_000),
      }))
      .mutation(async ({ input }) => {
        const conversation = await db.getConversation(input.sessionId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
        const bytes = Buffer.from(input.contentBase64, "base64");
        if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Bill files must be between 1 byte and 4 MB." });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { url } = await storagePut(`bill-uploads/${conversation.id}/${Date.now()}-${safeName}`, bytes, input.contentType);
        return { url };
      }),

    // Start a new conversation when customer lands on chat page
    startConversation: publicProcedure
      .input(z.object({
        agencySlug: z.string().trim().min(2).max(100),
        sessionId: z.string().trim().min(16).max(128),
        utmSource: z.string().trim().max(100).optional(),
        utmMedium: z.string().trim().max(100).optional(),
        utmCampaign: z.string().trim().max(200).optional(),
        referrerCode: z.string().trim().max(64).optional(),
      }))
      .mutation(async ({ input }) => {
        const agency = await db.getAgencyBySlug(input.agencySlug);
        if (!agency) throw new Error("Agency not found");

        // Check if session already exists
        const existing = await db.getConversation(input.sessionId);
        if (existing) {
          const messages = await db.getChatMessages(existing.id);
          return { conversationId: existing.id, messages, agency: { name: agency.agencyName, color: agency.brandColor, greeting: agency.botGreeting, tone: agency.botTone } };
        }

        const convId = await db.createConversation({
          agencyId: agency.id,
          sessionId: input.sessionId,
          source: input.referrerCode ? "referral" : "ad_click",
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          referrerCode: input.referrerCode,
        });

        // Generate greeting message
        const greeting = agency.botGreeting ||
          `Namaste! 🙏 I'm Agent Klaus from Sales Squad. May I know your name?`;

        if (convId) {
          await db.addChatMessage({
            conversationId: convId,
            role: "bot",
            content: greeting,
          });
        }

        return {
          conversationId: convId,
          messages: [{ role: "bot", content: greeting, createdAt: new Date() }],
          agency: { name: agency.agencyName, color: agency.brandColor, greeting: agency.botGreeting, tone: agency.botTone },
        };
      }),

    // Send a message and get AI response
    sendMessage: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().min(16).max(128),
        message: z.string().trim().min(1).max(1500),
      }))
      .mutation(async ({ input }) => {
        const conversation = await db.getConversation(input.sessionId);
        if (!conversation) throw new Error("Conversation not found");

        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database not available");
        const recentResult = await dbConn.execute(sql`
          SELECT COUNT(*) AS count
          FROM chatMsgs3
          WHERE conversationId = ${conversation.id}
            AND role = 'customer'
            AND createdAt >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        `);
        const recentRows = Array.isArray(recentResult) && Array.isArray(recentResult[0]) ? recentResult[0] : recentResult;
        if (Number((recentRows as any[])[0]?.count || 0) >= 20) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a few minutes before sending more messages." });
        }

        const agency = await db.getAgencyById(conversation.agencyId);
        if (!agency) throw new Error("Agency not found");

        // Save customer message
        await db.addChatMessage({
          conversationId: conversation.id,
          role: "customer",
          content: input.message,
        });

        // Get conversation history
        const history = await db.getChatMessages(conversation.id);

        const deterministicText = history
          .filter(message => message.role === "customer")
          .map(message => message.content)
          .join("\n");
        const deterministicFacts = deriveDeterministicChatFacts(deterministicText, conversation);
        const deterministicUpdate: Record<string, any> = {};
        if (deterministicFacts.name && !conversation.customerName) deterministicUpdate.customerName = deterministicFacts.name;
        if (deterministicFacts.phone && !conversation.customerPhone) deterministicUpdate.customerPhone = deterministicFacts.phone;
        if (deterministicFacts.email && !conversation.customerEmail) deterministicUpdate.customerEmail = deterministicFacts.email;
        if (deterministicFacts.city && !conversation.customerCity) deterministicUpdate.customerCity = deterministicFacts.city;
        if (deterministicFacts.state && !conversation.customerState) deterministicUpdate.customerState = deterministicFacts.state;
        if (deterministicFacts.monthlyBill && !conversation.monthlyBill) deterministicUpdate.monthlyBill = deterministicFacts.monthlyBill.toString();
        if (Object.keys(deterministicUpdate).length > 0) {
          await db.updateConversation(input.sessionId, deterministicUpdate);
        }
        const conversationWithFacts = { ...conversation, ...deterministicUpdate };

        if (isCallbackRequest(input.message) && !hasExplicitContactConsent(input.message)) {
          const consentPrompt = buildCallbackConsentPrompt();
          await db.addChatMessage({ conversationId: conversation.id, role: "bot", content: consentPrompt });
          return {
            response: consentPrompt,
            quickReplies: ["I agree to be contacted", "Not now"],
            stage: "request_contact_consent",
            requiresContactConsent: true,
            estimate: null,
          };
        }

        // Get agency products
        const panels = await db.getPanelsByAgency(agency.id);
        const inverters = await db.getInvertersByAgency(agency.id);

        // Get subsidy data if state is known
        let subsidyData = null;
        if (deterministicFacts.state || conversation.customerState) {
          subsidyData = await db.getSubsidyByState(deterministicFacts.state || conversation.customerState!);
        }

        const estimateState = deterministicFacts.state || conversation.customerState || null;
        const [estimateSettings, verifiedStateInput] = await Promise.all([
          db.getAgencyEstimateSettings(agency.id),
          estimateState ? db.getActiveAgencyStateEstimateInput(agency.id, estimateState) : Promise.resolve(null),
        ]);
        const verifiedPanels = panels.filter(item => isCurrentVerifiedCatalogItem(item));
        const verifiedInverters = inverters.filter(item => isCurrentVerifiedCatalogItem(item));
        const canShowMonetaryEstimate = isVerifiedPricingReady({ pricingActive: Boolean(estimateSettings?.isPricingActive), stateInput: verifiedStateInput, panels: verifiedPanels, inverters: verifiedInverters });

        if (hasEstimateInputs(deterministicFacts) && conversation.status !== "estimate_given") {
          if (deterministicFacts.propertyType === "commercial") {
            const commercialKw = estimateCommercialCapacityKw(
              deterministicFacts.monthlyBill,
              Number(subsidyData?.avgElectricityRate),
              Number(subsidyData?.avgSunHours),
            );
            const commercialResponse = buildCommercialEstimateResponse(deterministicFacts, commercialKw);
            await db.updateConversation(input.sessionId, {
              ...(commercialKw ? { recommendedKw: commercialKw.toString(), status: "estimate_given" as const } : {}),
            });
            await db.addChatMessage({ conversationId: conversation.id, role: "bot", content: commercialResponse });
            return {
              response: commercialResponse,
              quickReplies: ["Show financing options", "Book Free Site Visit", "Not now"],
              stage: "commercial_estimate",
              estimate: null,
            };
          }

          if (canShowMonetaryEstimate && subsidyData) {
            const configuredState = {
              ...subsidyData,
              avgElectricityRate: verifiedStateInput!.tariffPerUnit,
              avgSunHours: verifiedStateInput!.avgSunHours,
              centralSubsidy1kw: "0",
              centralSubsidy2kw: "0",
              centralSubsidy3kw: "0",
              stateAdditionalPerKw: "0",
              stateMaxAdditional: "0",
            };
            const configuredEstimate = calculateSolarEstimate(
              deterministicFacts.monthlyBill,
              deterministicFacts.state,
              verifiedPanels,
              verifiedInverters,
              { ...agency, installationChargePerKw: estimateSettings!.installationCostPerKw, marginPercent: estimateSettings!.taxRatePercent || "0" },
              configuredState,
            );
            const estimateResponse = preliminaryEstimateMessage({
              propertyType: deterministicFacts.propertyType,
              monthlyBill: deterministicFacts.monthlyBill,
              estimate: configuredEstimate,
              subsidyConfigured: false,
            });
            await db.updateConversation(input.sessionId, {
              recommendedKw: configuredEstimate.systemSizeKw.toString(),
              recommendedPanels: configuredEstimate.panelCount,
              estimatedCost: configuredEstimate.totalCost.toString(),
              subsidyAmount: configuredEstimate.totalSubsidy.toString(),
              netCost: configuredEstimate.netCost.toString(),
              estimatedSavingsMonthly: configuredEstimate.monthlySavings.toString(),
              paybackYears: configuredEstimate.paybackYears.toString(),
              status: "estimate_given",
            });
            await db.addChatMessage({ conversationId: conversation.id, role: "bot", content: estimateResponse });
            return {
              response: estimateResponse,
              quickReplies: ["Book Free Site Visit", "Talk to a person", "Ask another question"],
              stage: "show_estimate",
              estimate: {
                customerName: conversationWithFacts.customerName,
                customerEmail: conversationWithFacts.customerEmail,
                customerPhone: conversationWithFacts.customerPhone,
                customerCity: conversationWithFacts.customerCity,
                customerState: conversationWithFacts.customerState,
                monthlyBill: deterministicFacts.monthlyBill,
                systemSizeKw: configuredEstimate.systemSizeKw,
                panelCount: configuredEstimate.panelCount,
                estimatedCost: configuredEstimate.totalCost,
                subsidyAmount: configuredEstimate.totalSubsidy,
                netCost: configuredEstimate.netCost,
                estimatedSavingsMonthly: configuredEstimate.monthlySavings,
                paybackYears: configuredEstimate.paybackYears,
                estimatedSavings25Year: configuredEstimate.lifetimeSavings,
              },
            };
          }

          const residentialKw = estimateResidentialCapacityKw(
            deterministicFacts.monthlyBill,
            Number(subsidyData?.avgElectricityRate),
            Number(subsidyData?.avgSunHours),
          );
          const limitedEstimateResponse = buildLimitedResidentialEstimateResponse(deterministicFacts, residentialKw);
          await db.updateConversation(input.sessionId, {
            ...(residentialKw ? { recommendedKw: residentialKw.toString(), status: "estimate_given" as const } : {}),
          });
          await db.addChatMessage({ conversationId: conversation.id, role: "bot", content: limitedEstimateResponse });
          return {
            response: limitedEstimateResponse,
            quickReplies: ["Book Free Site Visit", "Talk to a person", "Ask another question"],
            stage: "show_estimate",
            estimate: {
              customerName: conversationWithFacts.customerName,
              customerEmail: conversationWithFacts.customerEmail,
              customerPhone: conversationWithFacts.customerPhone,
              customerCity: conversationWithFacts.customerCity,
              customerState: conversationWithFacts.customerState,
              monthlyBill: deterministicFacts.monthlyBill,
              systemSizeKw: residentialKw,
              panelCount: null,
              estimatedCost: null,
              subsidyAmount: null,
              netCost: null,
              estimatedSavingsMonthly: null,
              paybackYears: null,
              estimatedSavings25Year: null,
            },
          };
        }

        // Check for returning customer by phone or email (Level 2: returning customer memory)
        let returningContext: string | undefined;
        const knownPhone = conversation.customerPhone;
        const knownEmail = conversation.customerEmail;
        const alreadyMarkedReturning = (conversation as any).isReturning === true || (conversation as any).isReturning === 1;
        if (!alreadyMarkedReturning && (knownPhone || knownEmail)) {
          let prevConv = null;
          if (knownPhone) prevConv = await db.getConversationByPhone(agency.id, knownPhone);
          if (!prevConv && knownEmail) prevConv = await db.getConversationByEmail(agency.id, knownEmail);
          if (prevConv && prevConv.sessionId !== input.sessionId) {
            const prevName = prevConv.customerName || 'there';
            const prevBill = prevConv.monthlyBill ? `₹${prevConv.monthlyBill}/month` : null;
            const prevState = prevConv.customerState || prevConv.customerCity || null;
            returningContext = `Customer's name: ${prevName}. They chatted with you before.${prevBill ? ` Their monthly bill was ${prevBill}.` : ''}${prevState ? ` They are from ${prevState}.` : ''} Previous status: ${prevConv.status || 'active'}. Greet them warmly by name and reference their previous interest in solar.`;
            // Mark as returning in DB (use raw SQL to avoid schema type mismatch)
            await db.markConversationReturning(input.sessionId);
          }
        }

        // Fetch active partner discounts to include in chatbot pitch
        let partnerDiscounts: string | undefined;
        try {
          const dbConn2 = await db.getDb();
          if (dbConn2) {
            const partnerRows = (await dbConn2.execute(
              sql`SELECT discounts FROM solarPartners WHERE status = 'active' AND discounts IS NOT NULL LIMIT 1`
            )) as any[];
            const pRow = Array.isArray(partnerRows[0]) ? partnerRows[0][0] : partnerRows[0];
            if (pRow?.discounts) partnerDiscounts = pRow.discounts;
          }
        } catch { /* ignore */ }

        // Build the system prompt
        const systemPrompt = buildSalesAgentPrompt(agency, panels, inverters, subsidyData, conversationWithFacts, returningContext, partnerDiscounts);

        // Build message history for LLM
        const llmMessages: Array<{ role: string; content: string }> = [
          { role: "system", content: systemPrompt },
        ];

        for (const msg of history) {
          llmMessages.push({
            role: msg.role === "bot" ? "assistant" : "user",
            content: msg.content,
          });
        }

        // Get AI response with a bounded wait. The structured facts above have
        // already been persisted, so a slow provider cannot discard customer context.
        let aiContent: string;
        try {
          const response = await withProviderTimeout(invokeLLM({ messages: llmMessages as any }), 15_000);
          aiContent = typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : buildSafeProviderFallback(deterministicFacts);
        } catch (error) {
          console.warn("[Chat] Provider response unavailable; returning safe fallback", error);
          aiContent = buildSafeProviderFallback(deterministicFacts);
        }

        // Save bot response
        await db.addChatMessage({
          conversationId: conversation.id,
          role: "bot",
          content: aiContent,
        });

        // Deterministic extraction runs before the provider request. Avoiding a
        // second provider call removes sequential latency and preserves known facts.
        const extractedData = {
          name: deterministicFacts.name || null,
          phone: deterministicFacts.phone || null,
          email: deterministicFacts.email || null,
          city: deterministicFacts.city || null,
          state: deterministicFacts.state || null,
          monthlyBill: deterministicFacts.monthlyBill || null,
          monthlyUnits: null,
          propertyType: deterministicFacts.propertyType || null,
          installationTimeline: null,
          propertyAddress: null,
        };

        // Update conversation with extracted data
        if (extractedData) {
          const updateData: Record<string, any> = {};
          if (extractedData.name && !conversation.customerName) updateData.customerName = extractedData.name;
          if (extractedData.phone && !conversation.customerPhone) updateData.customerPhone = extractedData.phone;
          if (extractedData.email && !conversation.customerEmail) updateData.customerEmail = extractedData.email;
          if (extractedData.city && !conversation.customerCity) updateData.customerCity = extractedData.city;
          if (extractedData.state && !conversation.customerState) {
            updateData.customerState = extractedData.state;
            // Fetch subsidy for newly identified state
            if (!subsidyData) {
              subsidyData = await db.getSubsidyByState(extractedData.state);
            }
          }
          if (extractedData.monthlyBill && !conversation.monthlyBill) updateData.monthlyBill = extractedData.monthlyBill.toString();
          if (extractedData.monthlyUnits && !conversation.monthlyUnits) updateData.monthlyUnits = extractedData.monthlyUnits;

          // Calculate solar estimate if we have enough data
          const bill = extractedData.monthlyBill || (conversation.monthlyBill ? parseFloat(conversation.monthlyBill) : null);
          const state = extractedData.state || conversation.customerState;

          if (bill && state && panels.length > 0 && inverters.length > 0) {
            const estimate = calculateSolarEstimate(bill, state, panels, inverters, agency, subsidyData);
            if (estimate) {
              updateData.recommendedKw = estimate.systemSizeKw.toString();
              updateData.recommendedPanels = estimate.panelCount;
              updateData.estimatedCost = estimate.totalCost.toString();
              updateData.subsidyAmount = estimate.totalSubsidy.toString();
              updateData.netCost = estimate.netCost.toString();
              updateData.estimatedSavingsMonthly = estimate.monthlySavings.toString();
              updateData.paybackYears = estimate.paybackYears.toString();
              updateData.status = "estimate_given";
            }
          }

          // Update lead score
          const score = calculateConversationScore(conversation, extractedData);
          updateData.leadScore = score;

          // If we have name + phone/email, mark as lead captured
          const hasName = extractedData.name || conversation.customerName;
          const hasContact = extractedData.phone || conversation.customerPhone || extractedData.email || conversation.customerEmail;
          if (hasName && hasContact && conversation.status === "active") {
            updateData.status = updateData.status || "lead_captured";

            // Server-side duplicate prevention: skip if phone already exists
            const phoneForCheck = extractedData.phone || conversation.customerPhone;
            const emailForCheck = extractedData.email || conversation.customerEmail;
            const existingLead = phoneForCheck ? await db.getLeadByPhoneForAgency(phoneForCheck, agency.id) : null;
            if (!existingLead) {
            // Create a lead record
            const nameParts = (extractedData.name || conversation.customerName || "").split(" ");
            await db.createLeadFromConversation({
              agencyId: agency.id,
              firstName: nameParts[0] || "Unknown",
              lastName: nameParts.slice(1).join(" ") || "",
              email: extractedData.email || conversation.customerEmail || undefined,
              phone: extractedData.phone || conversation.customerPhone || undefined,
              city: extractedData.city || conversation.customerCity || undefined,
              state: extractedData.state || conversation.customerState || undefined,
              monthlyEnergyBill: bill ? bill.toString() : undefined,
              source: "ai_chat",
              leadScore: score,
              priority: getPriority(score),
              conversationId: conversation.id,
              referrerCode: (conversation as any).referrerCode || undefined,
              homeownershipType: extractedData?.propertyType || undefined,
              installationTimeline: extractedData?.installationTimeline || undefined,
              propertyAddress: extractedData?.propertyAddress || undefined,
              systemSizeKw: conversation.recommendedKw ? conversation.recommendedKw.toString() : undefined,
              systemCost: conversation.estimatedCost ? conversation.estimatedCost.toString() : undefined,
              subsidyAmount: conversation.subsidyAmount ? conversation.subsidyAmount.toString() : undefined,
              netCost: conversation.netCost ? conversation.netCost.toString() : undefined,
              monthlySavings: conversation.estimatedSavingsMonthly ? conversation.estimatedSavingsMonthly.toString() : undefined,
              notes: `Lead captured via AI chat bot. Session: ${input.sessionId}`,
            });

            // Notify agency owner
            await notifyOwner({
              title: "🔥 New Lead from AI Chat Bot!",
              content: `${extractedData.name || conversation.customerName} (${extractedData.phone || conversation.customerPhone || extractedData.email || conversation.customerEmail}) from ${extractedData.state || conversation.customerState || "Unknown"} - Monthly Bill: ₹${bill || "N/A"} - Score: ${score}/100`,
            });

            // Send lead details to akhil@salessquadtech.com
            const leadEmail = extractedData.email || conversation.customerEmail;
            const leadPhone = extractedData.phone || conversation.customerPhone;
            const leadName = extractedData.name || conversation.customerName;
            const leadState = extractedData.state || conversation.customerState;
            const leadCity = extractedData.city || conversation.customerCity;
            
            const estimatedSavings = conversation.estimatedSavingsMonthly ? `₹${Math.round(Number(conversation.estimatedSavingsMonthly))}/month` : 'TBD after site visit';
            const referrerInfo = (conversation as any).referrerCode ? `Referred by: ${(conversation as any).referrerCode}` : 'Direct / No referrer';
            const leadDetailsHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 8px;">
                <h2 style="color: #10b981; margin-bottom: 4px;">🔥 New Lead — Sales Squad</h2>
                <p style="color: #666; margin-top: 0;">Captured at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                <hr style="border: 1px solid #e5e7eb; margin: 16px 0;" />
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold; width: 40%;">Name</td><td style="padding: 8px 0; color: #111827;">${leadName || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Phone</td><td style="padding: 8px 0; color: #111827;">${leadPhone || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Email</td><td style="padding: 8px 0; color: #111827;">${leadEmail || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Location</td><td style="padding: 8px 0; color: #111827;">${leadCity ? `${leadCity}, ` : ''}${leadState || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Monthly Bill</td><td style="padding: 8px 0; color: #111827;">₹${bill || 'N/A'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Est. Monthly Savings</td><td style="padding: 8px 0; color: #10b981; font-weight: bold;">${estimatedSavings}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Lead Score</td><td style="padding: 8px 0; color: #111827;">${score}/100</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Source</td><td style="padding: 8px 0; color: #111827;">${referrerInfo}</td></tr>
                </table>
                <hr style="border: 1px solid #e5e7eb; margin: 16px 0;" />
                ${leadPhone ? `<a href="https://wa.me/${leadPhone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(leadName || 'there')}%2C%20I%20saw%20you%20were%20interested%20in%20solar%20panels.%20Can%20we%20schedule%20a%20quick%20call%3F" style="display:inline-block;background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:12px;">💬 WhatsApp ${leadName || 'Lead'}</a>` : ''}
                <p style="color: #6b7280; font-size: 13px;">Login to your Sales Squad admin panel to view full conversation and take action.</p>
              </div>
            `;

            
            await sendEmail({
              to: 'akhil@salessquadtech.com',
              subject: `New Lead: ${leadName} - ₹${bill || 'N/A'} Monthly Bill`,
              html: leadDetailsHtml,
            });
            } // end if (!existingLead)
          }

          if (Object.keys(updateData).length > 0) {
            await db.updateConversation(input.sessionId, updateData);
          }

          // Send estimate email to customer if they provided email and haven't received it yet
          const customerEmail = extractedData.email || conversation.customerEmail;
          if (customerEmail && (extractedData.name || conversation.customerName) && !conversation.emailSent) {
            const systemSizeKw = conversation.recommendedKw ? String(conversation.recommendedKw) : '5';
            const estimatedCost = conversation.estimatedCost ? `₹${Math.round(Number(conversation.estimatedCost))}` : 'Upon Request';
            const monthlyBill = bill || 'N/A';
            const monthlySavings = conversation.estimatedSavingsMonthly ? `₹${Math.round(Number(conversation.estimatedSavingsMonthly))}` : 'Calculated in detailed quote';
            const paybackPeriod = conversation.paybackYears ? `${conversation.paybackYears} years` : 'Calculated in detailed quote';
            const savings25Year = conversation.estimatedSavings25Year ? `₹${Math.round(Number(conversation.estimatedSavings25Year))}` : 'Calculated in detailed quote';
            const customerName = extractedData.name || conversation.customerName || 'Valued Customer';
            
            const estimateHtml = `
              <h2>Your Solar Estimate - Sales Squad</h2>
              <p>Dear ${customerName},</p>
              <p>Thank you for using our solar estimate tool. Here's your personalized solar system recommendation:</p>
              <hr />
              <h3>System Details</h3>
              <p><strong>Recommended System Size:</strong> Approx ${systemSizeKw} kW</p>
              <p><strong>Your Monthly Bill:</strong> ₹${monthlyBill}</p>
              <p><strong>Estimated System Cost:</strong> ${estimatedCost}</p>
              <hr />
              <h3>Financial Benefits</h3>
              <p><strong>Monthly Savings:</strong> Approx ${monthlySavings}</p>
              <p><strong>Payback Period:</strong> Approx ${paybackPeriod}</p>
              <p><strong>25-Year Savings:</strong> Approx ${savings25Year}</p>
              <hr />
              <p>Additional benefits:</p>
              <ul>
                <li>Government subsidies and incentives</li>
                <li>25-year energy security</li>
                <li>Increased property value</li>
              </ul>
              <hr />
              <p>Our team will contact you within 24 hours to discuss your solar options and provide a detailed quote.</p>
              <p><strong>Contact:</strong> Sales Squad | Phone: +91-XXXXXXXXXX</p>
              <p>Best regards,<br />Sales Squad Team</p>
            `;
            
            const emailResult = await sendEmail({
              to: customerEmail,
              subject: 'Your Solar Estimate - Sales Squad',
              html: estimateHtml,
            });
            
            // Mark email as sent to prevent duplicates
            if (emailResult.success) {
              await db.updateConversation(input.sessionId, { emailSent: true });
            }
          }
        }

        // The shared parser removes valid and malformed internal control markup
        // before any response becomes customer-visible.
        const { content: cleanContent, quickReplies } = parseQuickReplyMarkup(aiContent);

        // Get updated conversation with all estimate data
        const updatedConv = await db.getConversation(input.sessionId);
        
        // Detect conversation stage using bot message count (robust, not phrase-dependent)
        const botMsgCount = history.filter(m => m.role === 'bot').length;
        let stage = 'general';
        if (botMsgCount === 0) stage = 'ask_name';
        else if (botMsgCount === 1) stage = 'pitch_a';
        else if (botMsgCount === 2) stage = 'pitch_b';
        else if (botMsgCount === 3) stage = 'pitch_c';
        else if (botMsgCount === 4) stage = 'ask_bill';
        else {
          // For later stages, use lightweight keyword hints
          const lc = cleanContent.toLowerCase();
          if (lc.includes('site visit') || lc.includes('book') || lc.includes('free visit')) stage = 'ask_site_visit';
          else if (conversation.estimatedCost || lc.includes('kw') || lc.includes('subsidy') || lc.includes('savings')) stage = 'show_estimate';
        }

        return { 
          response: cleanContent, 
          quickReplies,
          stage,
          estimate: updatedConv ? {
            customerName: updatedConv.customerName,
            customerEmail: updatedConv.customerEmail,
            customerPhone: updatedConv.customerPhone,
            customerCity: updatedConv.customerCity,
            customerState: updatedConv.customerState,
            monthlyBill: updatedConv.monthlyBill,
            systemSizeKw: updatedConv.recommendedKw,
            panelCount: updatedConv.recommendedPanels,
            estimatedCost: updatedConv.estimatedCost,
            subsidyAmount: updatedConv.subsidyAmount,
            netCost: updatedConv.netCost,
            estimatedSavingsMonthly: updatedConv.estimatedSavingsMonthly,
            paybackYears: updatedConv.paybackYears,
            estimatedSavings25Year: updatedConv.estimatedSavings25Year,
          } : null,
        };
      }),

    // Get conversation history
    getMessages: publicProcedure
      .input(z.object({ sessionId: z.string().trim().min(16).max(128) }))
      .query(async ({ input }) => {
        const conversation = await db.getConversation(input.sessionId);
        if (!conversation) return [];
        return await db.getChatMessages(conversation.id);
      }),

    // OTP: Send a 6-digit OTP to the customer's phone via WhatsApp/SMS
    sendOtp: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().min(16).max(128),
        phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/, "Enter a valid international phone number"),
      }))
      .mutation(async () => {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Phone verification is unavailable until a verified WhatsApp Business or SMS provider is connected.",
        });
      }),

    // OTP: Verify the OTP entered by the customer
    verifyOtp: publicProcedure
      .input(z.object({
        sessionId: z.string().trim().min(16).max(128),
        otp: z.string().regex(/^\d{6}$/),
      }))
      .mutation(async () => ({
        success: false,
        message: "Phone verification is not configured yet.",
      })),
  }),

  // ===== CONVERSATIONS (Admin view) =====
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return [];
      return await db.getConversationsByAgency(agency.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const conv = await requireOwnedConversation(ctx.user!.id, input.id);
        const messages = await db.getChatMessages(conv.id);
        return { conversation: conv, messages };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return null;
      return await db.getConversationStats(agency.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "lead_captured", "estimate_given", "completed", "abandoned"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const conv = await requireOwnedConversation(ctx.user!.id, input.id);
        await db.updateConversation(conv.sessionId, { status: input.status } as any);
        return { success: true };
      }),
  }),

  // ===== LEADS (Admin) =====
  leads: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) return [];
        const all = await db.getLeadsByAgency(agency.id);
        return (all as any[])
          .filter((l: any) => l.source !== 'scraper')
          .filter((l: any) => !input?.status || input.status === "all" || l.status === input.status)
          .filter((l: any) => !input?.search || [l.firstName, l.lastName, l.email, l.phone, l.company].some(value => String(value || "").toLowerCase().includes(input.search!.toLowerCase())))
          .map((lead: any) => ({ ...lead, evidenceScore: calculateEvidenceScore(lead) }));
      }),
    scrapedContacts: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) return [];
        const all = await db.getLeadsByAgency(agency.id);
        return (all as any[])
          .filter((l: any) => l.source === 'scraper')
          .filter((l: any) => !input?.status || input.status === "all" || l.status === input.status)
          .filter((l: any) => !input?.search || [l.firstName, l.lastName, l.email, l.phone, l.company].some(value => String(value || "").toLowerCase().includes(input.search!.toLowerCase())));
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return null;
        const { lead, agency } = await requireOwnedLead(ctx.user.id, input.id);
        const evidenceScore = calculateEvidenceScore(lead as any);
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await database.execute(sql`
          INSERT INTO leadEvidenceScores (agencyId, leadId, score, tier, confidence, dimensions, missingEvidence, riskFlags, nextAction, scoringVersion)
          VALUES (${agency.id}, ${lead.id}, ${evidenceScore.score}, ${evidenceScore.tier}, ${evidenceScore.confidence}, ${JSON.stringify(evidenceScore.dimensions)}, ${JSON.stringify(evidenceScore.missingEvidence)}, ${JSON.stringify(evidenceScore.riskFlags)}, ${evidenceScore.nextAction}, ${evidenceScore.scoringVersion})
          ON DUPLICATE KEY UPDATE score = VALUES(score), tier = VALUES(tier), confidence = VALUES(confidence), dimensions = VALUES(dimensions), missingEvidence = VALUES(missingEvidence), riskFlags = VALUES(riskFlags), nextAction = VALUES(nextAction), scoringVersion = VALUES(scoringVersion)
        `);
        return { ...(lead as any), evidenceScore };
      }),

    refreshEvidence: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const { lead, agency } = await requireOwnedLead(ctx.user.id, input.id);
        const evidenceScore = calculateEvidenceScore(lead as any);
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await database.execute(sql`
          INSERT INTO leadEvidenceScores (agencyId, leadId, score, tier, confidence, dimensions, missingEvidence, riskFlags, nextAction, scoringVersion)
          VALUES (${agency.id}, ${lead.id}, ${evidenceScore.score}, ${evidenceScore.tier}, ${evidenceScore.confidence}, ${JSON.stringify(evidenceScore.dimensions)}, ${JSON.stringify(evidenceScore.missingEvidence)}, ${JSON.stringify(evidenceScore.riskFlags)}, ${evidenceScore.nextAction}, ${evidenceScore.scoringVersion})
          ON DUPLICATE KEY UPDATE score = VALUES(score), tier = VALUES(tier), confidence = VALUES(confidence), dimensions = VALUES(dimensions), missingEvidence = VALUES(missingEvidence), riskFlags = VALUES(riskFlags), nextAction = VALUES(nextAction), scoringVersion = VALUES(scoringVersion)
        `);
        return evidenceScore;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await requireOwnedLead(ctx.user!.id, id);
        await db.updateLead(id, data as any);
        if (input.status) {
          await db.addLeadActivity({
            leadId: id,
            activityType: "status_changed",
            description: `Status changed to ${input.status}`,
            userId: ctx.user?.id,
          });
        }
        return { success: true };
      }),

    activity: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        await requireOwnedLead(ctx.user!.id, input.leadId);
        return await db.getLeadActivity(input.leadId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await requireOwnedLead(ctx.user!.id, input.id);
        await db.deleteLead(input.id);
        return { success: true };
      }),

    deleteBulk: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const ownedIds: number[] = [];
        for (const id of input.ids) {
          await requireOwnedLead(ctx.user!.id, id);
          ownedIds.push(id);
        }
        await db.deleteLeadsBulk(ownedIds);
        return { success: true, deleted: ownedIds.length };
      }),

    checkDuplicate: publicProcedure
      .input(z.object({ phone: z.string() }))
      .query(async ({ input }) => {
        const existing = await db.getLeadByPhone(input.phone);
        return { isDuplicate: !!existing };
      }),
  }),

  // ===== SOLAR CALCULATOR (Public) =====
  calculator: router({
    estimate: publicProcedure
      .input(z.object({
        monthlyBill: z.number(),
        state: z.string(),
        agencySlug: z.string().optional(),
      }))
      .query(async ({ input }) => {
        let panels: any[] = [];
        let inverters: any[] = [];
        let agency: any = null;

        if (input.agencySlug) {
          agency = await db.getAgencyBySlug(input.agencySlug);
          if (agency) {
            panels = await db.getPanelsByAgency(agency.id);
            inverters = await db.getInvertersByAgency(agency.id);
          }
        }

        const subsidyData = await db.getSubsidyByState(input.state);
        const [pricing, stateInput] = agency ? await Promise.all([
          db.getAgencyEstimateSettings(agency.id),
          db.getActiveAgencyStateEstimateInput(agency.id, input.state),
        ]) : [null, null];
        const verifiedPanels = panels.filter(item => isCurrentVerifiedCatalogItem(item));
        const verifiedInverters = inverters.filter(item => isCurrentVerifiedCatalogItem(item));
        const catalogReady = isVerifiedPricingReady({ pricingActive: Boolean(pricing?.isPricingActive), stateInput, panels: verifiedPanels, inverters: verifiedInverters });
        if (!catalogReady) {
          const tariff = Number(stateInput?.tariffPerUnit || subsidyData?.avgElectricityRate || 0);
          const sunHours = Number(stateInput?.avgSunHours || subsidyData?.avgSunHours || 0);
          const systemSizeKw = tariff > 0 && sunHours > 0
            ? Math.max(1, Math.round((((input.monthlyBill / tariff) / 30 / sunHours) * 1.2) * 10) / 10)
            : null;
          return {
            systemSizeKw,
            monetaryEstimateAvailable: false,
            pricingStatus: "configuration_required",
            message: "A verified agency catalog, active pricing policy, and active state estimate input are required before costs, savings, subsidy, or payback can be shown.",
          };
        }
        const configuredState = {
          ...subsidyData,
          avgElectricityRate: stateInput!.tariffPerUnit,
          avgSunHours: stateInput!.avgSunHours,
          centralSubsidy1kw: "0",
          centralSubsidy2kw: "0",
          centralSubsidy3kw: "0",
          stateAdditionalPerKw: "0",
          stateMaxAdditional: "0",
        };
        const estimate = calculateSolarEstimate(
          input.monthlyBill,
          input.state,
          verifiedPanels,
          verifiedInverters,
          { ...agency, installationChargePerKw: pricing!.installationCostPerKw, marginPercent: pricing!.taxRatePercent || "0" },
          configuredState,
        );
        return { ...estimate, monetaryEstimateAvailable: true, pricingStatus: "verified_agency_catalog" };
      }),
  }),

  // ===== SUBSCRIPTION & BILLING =====
  subscription: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const sub = await db.getSubscriptionByUserId(ctx.user.id);
      if (!sub) return null;
      const planDetails = PLANS[sub.plan as keyof typeof PLANS];
      return { ...sub, planDetails };
    }),

    plans: publicProcedure.query(() => {
      return Object.entries(PLANS).map(([key, plan]) => ({
        key,
        ...plan,
      }));
    }),

    startTrial: protectedProcedure
      .input(z.object({ plan: z.enum(["starter", "professional", "enterprise"]) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const existing = await db.getSubscriptionByUserId(ctx.user.id);
        if (existing) throw new Error("Already have a subscription");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        const id = await db.createSubscription({
          userId: ctx.user.id,
          agencyId: agency?.id,
          plan: input.plan,
          status: "trialing",
          trialEndsAt: trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
        });
        return { success: true, id, trialEndsAt: trialEnd };
      }),

    createCheckout: protectedProcedure
      .input(z.object({
        plan: z.enum(["starter", "professional", "enterprise"]),
        billingCycle: z.enum(["monthly", "yearly"]),
        origin: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const stripeClient = getStripe();
        if (!stripeClient) throw new Error("Stripe not configured");
        const planData = PLANS[input.plan];
        const amount = input.billingCycle === "monthly" ? planData.priceMonthly : planData.priceYearly;
        const session = await stripeClient.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            plan: input.plan,
            billing_cycle: input.billingCycle,
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
          },
          line_items: [{
            price_data: {
              currency: "inr",
              product_data: {
                name: `Sales Squad ${planData.name} Plan`,
                description: planData.description,
              },
              unit_amount: amount * 100,
              recurring: {
                interval: input.billingCycle === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          }],
          allow_promotion_codes: true,
          success_url: `${input.origin}/settings?payment=success`,
          cancel_url: `${input.origin}/pricing?payment=canceled`,
        });
        return { url: session.url };
      }),
  }),

  // ===== BUSINESS SCRAPER =====
  scraper: router({
    search: protectedProcedure
      .input(z.object({
        businessType: z.string(),
        location: z.string(),
        state: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");

        // Create a scrape job
        const jobId = await db.createScrapeJob({
          source: "google_maps",
          query: `${input.businessType} in ${input.location}${input.state ? `, ${input.state}` : ""}`,
          createdBy: ctx.user.id,
        });

        try {
          // Search Google Maps for businesses
          const query = `${input.businessType} in ${input.location}${input.state ? `, ${input.state}` : ""}${input.state ? ", India" : ", India"}`;
          const searchResult = await makeRequest<PlacesSearchResult>(
            "/maps/api/place/textsearch/json",
            { query, region: "in" }
          );

          if (!searchResult.results || searchResult.results.length === 0) {
            if (jobId) await db.updateScrapeJob(jobId, { status: "completed" as any, totalFound: 0, completedAt: new Date() });
            return { businesses: [], total: 0, jobId };
          }

          const businesses: any[] = [];

          // Get details for each result (up to 20)
          for (const place of searchResult.results.slice(0, 20)) {
            try {
              const details = await makeRequest<PlaceDetailsResult>(
                "/maps/api/place/details/json",
                { place_id: place.place_id, fields: "name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,geometry,types" }
              );

              const d = details.result as any;
              const businessSize = classifyBusinessSize(d.user_ratings_total || 0, d.types || []);

              // Extract email from website if available
              let extractedEmail: string | null = null;
              if (d.website) {
                try {
                  extractedEmail = await extractEmailFromWebsite(d.website, 4000);
                } catch {
                  // Email extraction failure is non-fatal
                }
              }

              const biz = {
                agencyId: agency.id,
                scrapeJobId: jobId,
                businessName: d.name || place.name,
                businessType: input.businessType,
                businessSize,
                phone: d.formatted_phone_number || d.international_phone_number || null,
                email: extractedEmail || null,
                website: d.website || null,
                address: d.formatted_address || place.formatted_address,
                city: extractCity(d.formatted_address || place.formatted_address),
                state: input.state || extractState(d.formatted_address || place.formatted_address),
                latitude: d.geometry?.location?.lat?.toString() || place.geometry?.location?.lat?.toString(),
                longitude: d.geometry?.location?.lng?.toString() || place.geometry?.location?.lng?.toString(),
                rating: d.rating?.toString() || null,
                reviewCount: d.user_ratings_total || 0,
                placeId: place.place_id,
                source: "google_maps",
              };

              businesses.push(biz);
            } catch (e) {
              // Skip failed detail lookups
              businesses.push({
                agencyId: agency.id,
                scrapeJobId: jobId,
                businessName: place.name,
                businessType: input.businessType,
                businessSize: "medium",
                address: place.formatted_address,
                city: extractCity(place.formatted_address),
                state: input.state || extractState(place.formatted_address),
                latitude: place.geometry?.location?.lat?.toString(),
                longitude: place.geometry?.location?.lng?.toString(),
                rating: place.rating?.toString() || null,
                reviewCount: place.user_ratings_total || 0,
                placeId: place.place_id,
                source: "google_maps",
              });
            }
          }

          // Do not create duplicate rows when a search returns a Place we already store.
          const uniqueByPlace = Array.from(new Map(businesses.map(business => [business.placeId, business])).values());
          const newBusinesses: any[] = [];
          for (const business of uniqueByPlace) {
            const existing = business.placeId
              ? await db.getScrapedBusinessByPlaceId(agency.id, business.placeId)
              : null;
            if (!existing) newBusinesses.push(business);
          }
          if (newBusinesses.length > 0) {
            await db.createScrapedBusinessesBulk(newBusinesses as any);
          }

          if (jobId) {
            await db.updateScrapeJob(jobId, {
              status: "completed" as any,
              totalFound: uniqueByPlace.length,
              totalImported: newBusinesses.length,
              completedAt: new Date(),
            });
          }

          return { businesses: newBusinesses.map(business => ({ ...business, evidenceScore: calculateBusinessEvidenceScore(business) })), total: newBusinesses.length, jobId };
        } catch (err: any) {
          if (jobId) {
            await db.updateScrapeJob(jobId, {
              status: "failed" as any,
              errorMessage: err.message,
              completedAt: new Date(),
            });
          }
          throw new Error(`Scraping failed: ${err.message}`);
        }
      }),

    results: protectedProcedure
      .input(z.object({
        businessType: z.string().optional(),
        businessSize: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) return [];
        const businesses = await db.getScrapedBusinessesByAgency(agency.id, input || {});
        return (businesses as any[]).map(business => {
          const safeBusiness = publicBusinessRecord(business);
          return { ...safeBusiness, evidenceScore: calculateBusinessEvidenceScore(safeBusiness) };
        });
      }),

    allBusinesses: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        contactStatus: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) return [];
        const businesses = await db.searchScrapedBusinesses(agency.id, input || {});
        return (businesses as any[]).map(business => {
          const safeBusiness = publicBusinessRecord(business);
          return { ...safeBusiness, evidenceScore: calculateBusinessEvidenceScore(safeBusiness) };
        });
      }),

    importAsLead: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const { agency, business: biz } = await requireOwnedScrapedBusiness(ctx.user.id, input.businessId);

        // Create a lead from the scraped business using the same central Evidence Score
        // shown in Find Leads; no browser-only formula controls the import priority.
        const evidenceScore = calculateBusinessEvidenceScore(biz as any);
        const leadId = await db.createLeadFromConversation({
          agencyId: agency.id,
          firstName: biz.ownerName?.split(" ")[0] || biz.businessName,
          lastName: biz.ownerName?.split(" ").slice(1).join(" ") || "",
          company: biz.businessName,
          phone: biz.phone || undefined,
          email: biz.email || undefined,
          city: biz.city || undefined,
          state: biz.state || undefined,
          propertyAddress: biz.address || undefined,
          source: "scraper",
          leadScore: evidenceScore.score,
          priority: evidenceScore.tier === "sales_ready" ? "high" : evidenceScore.tier === "research_first" ? "medium" : "low",
          notes: `Scraped from Google Maps. Business: ${biz.businessName} (${biz.businessType}). Size: ${biz.businessSize}. Rating: ${biz.rating}/5 (${biz.reviewCount} reviews).`,
        });

        await db.markBusinessImported(input.businessId);
        return { success: true, leadId, evidenceScore };
      }),

    jobs: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return await db.getScrapeJobsByAgency(ctx.user.id);
    }),

    bulkImport: protectedProcedure
      .input(z.object({ businessIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await requireUserAgency(ctx.user.id);
        const results = [];
        for (const businessId of input.businessIds) {
          const biz = await db.getScrapedBusinessByIdForAgency(businessId, agency.id);
          if (!biz || biz.isImported) continue;
          const evidenceScore = calculateBusinessEvidenceScore(biz as any);
          const leadId = await db.createLeadFromConversation({
            agencyId: agency.id,
            firstName: biz.ownerName?.split(" ")[0] || biz.businessName,
            lastName: biz.ownerName?.split(" ").slice(1).join(" ") || "",
            company: biz.businessName,
            phone: biz.phone || undefined,
            email: biz.email || undefined,
            city: biz.city || undefined,
            state: biz.state || undefined,
            propertyAddress: biz.address || undefined,
            source: "scraper",
            leadScore: evidenceScore.score,
            priority: evidenceScore.tier === "sales_ready" ? "high" : evidenceScore.tier === "research_first" ? "medium" : "low",
            notes: `Scraped from Google Maps. Business: ${biz.businessName} (${biz.businessType}). Size: ${biz.businessSize}. Rating: ${biz.rating}/5 (${biz.reviewCount} reviews).`,
          });
          await db.markBusinessImported(businessId);
          results.push({ businessId, leadId });
        }
        return { success: true, imported: results.length };
      }),

    updateContactStatus: protectedProcedure
      .input(z.object({
        businessId: z.number(),
        contactStatus: z.enum(["not_contacted", "contacted", "interested", "converted"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await requireOwnedScrapedBusiness(ctx.user!.id, input.businessId);
        await db.updateScrapedBusiness(input.businessId, { contactStatus: input.contactStatus });
        return { success: true };
      }),

    generateAIPitch: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { business: biz } = await requireOwnedScrapedBusiness(ctx.user!.id, input.businessId);
        // Detect if this is a solar/renewable energy company — pitch Sales Squad to them
        const solarKeywords = ["solar", "renewable", "photovoltaic", "pv", "wind energy", "green energy", "electrical contractor"];
        const isSolarBusiness = solarKeywords.some(kw =>
          (biz.businessType || "").toLowerCase().includes(kw) ||
          (biz.businessName || "").toLowerCase().includes(kw)
        );
        let systemPrompt: string;
        let userPrompt: string;
        if (isSolarBusiness) {
          // Pitch Sales Squad's lead generation platform to solar companies
          systemPrompt = `You are a B2B sales expert writing a WhatsApp outreach message to a solar company. Write a short, persuasive message (max 4 sentences) pitching Sales Squad — an AI-powered lead generation platform for solar companies. Key points to include: (1) Sales Squad's AI chatbot captures homeowners and businesses interested in solar 24/7, (2) every lead comes pre-qualified with name, phone, email, monthly electricity bill, and location, (3) the solar company just receives ready-to-close leads — no marketing spend needed, (4) sign up free as a partner. Do NOT mention solar panels, subsidies, or electricity savings. Be conversational and direct.`;
          const partnerSignupUrl = `${ENV.publicAppUrl}/for-partners`;
          userPrompt = `Solar company: ${biz.businessName}, Location: ${biz.city}, ${biz.state}. Partner signup link: ${partnerSignupUrl}`;
        } else {
          // Pitch solar energy savings to non-solar businesses
          systemPrompt = `You are a solar sales expert writing a WhatsApp message to a business owner. Write a short, professional message (max 3 sentences) offering a preliminary solar assessment. Be specific to their business type. Do not promise savings, ROI, subsidies, eligibility, or bill amounts; say that benefits depend on a recent electricity bill and site assessment. No emojis.`;
          userPrompt = `Business: ${biz.businessName}, Type: ${biz.businessType}, Size proxy: ${biz.businessSize}, Location: ${biz.city}, ${biz.state}.`;
        }
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ] as any,
        });
        const pitch = response.choices[0]?.message?.content as string || "";
        await db.updateScrapedBusiness(input.businessId, { aiPitch: pitch });
        return { success: true, pitch };
      }),

    sendOutreachEmail: protectedProcedure
      .input(z.object({
        businessId: z.number(),
        toEmail: z.string().email(),
        subject: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { business: biz } = await requireOwnedScrapedBusiness(ctx.user!.id, input.businessId);
        if (!biz.email || biz.email.toLowerCase() !== input.toEmail.toLowerCase()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Send only to the verified email stored for this business." });
        }
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #f97316;">Sales Squad — Solar Energy for ${escapeHtml(biz.businessName)}</h2>
            <div style="white-space: pre-line; color: #333; font-size: 15px; line-height: 1.6;">${escapeHtml(input.body)}</div>
            <hr style="margin: 24px 0; border-color: #ddd;" />
            <p style="color: #888; font-size: 12px;">Sales Squad | AI-Powered Solar Lead Generation</p>
          </div>`;
        const result = await sendEmail({
          to: input.toEmail,
          subject: input.subject,
          html: emailHtml,
        });
                if (result.success) {
          await db.updateScrapedBusiness(input.businessId, { contactStatus: "contacted" });
        }
        return { success: result.success };
      }),
    // Re-extract email from website for a single business
    reExtractEmail: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { business: biz } = await requireOwnedScrapedBusiness(ctx.user!.id, input.businessId);
        if (!biz.website) return { success: false, email: null, message: "No website available" };
        try {
          const email = await extractEmailFromWebsite(biz.website, 6000);
          if (email) {
            await db.updateScrapedBusiness(input.businessId, { email });
            return { success: true, email, message: "Email extracted" };
          }
          return { success: false, email: null, message: "No email found on website" };
        } catch {
          return { success: false, email: null, message: "Failed to fetch website" };
        }
      }),
    // Bulk generate AI pitches for all businesses in the agency
    bulkGenerateAIPitches: protectedProcedure
      .input(z.object({}))
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await requireUserAgency(ctx.user.id);
        const businesses = await db.searchScrapedBusinesses(agency.id);
        if (!businesses.length) return { success: true, processed: 0 };
        const solarKeywords = ["solar", "renewable", "photovoltaic", "pv", "wind energy", "green energy", "electrical contractor"];
        let processed = 0;
        // Process in batches of 5 to avoid overwhelming the LLM
        for (const biz of businesses) {
          try {
            const isSolarBusiness = solarKeywords.some(kw =>
              (biz.businessType || "").toLowerCase().includes(kw) ||
              (biz.businessName || "").toLowerCase().includes(kw)
            );
            let systemPrompt: string;
            let userPrompt: string;
            if (isSolarBusiness) {
              systemPrompt = `You are a B2B sales expert writing a WhatsApp outreach message to a solar company. Write a short, persuasive message (max 4 sentences) pitching Sales Squad — an AI-powered lead generation platform for solar companies. Key points: (1) Sales Squad's AI chatbot captures homeowners interested in solar 24/7, (2) every lead comes pre-qualified with name, phone, email, monthly electricity bill, and location, (3) the solar company just receives ready-to-close leads — no marketing spend needed, (4) sign up free as a partner. Do NOT mention solar panels or subsidies. Be conversational and direct.`;
              const partnerUrl = `${ENV.publicAppUrl}/for-partners`;
              userPrompt = `Solar company: ${biz.businessName}, Location: ${biz.city}, ${biz.state}. Partner signup link: ${partnerUrl}`;
            } else {
              systemPrompt = `You are a solar sales expert writing a WhatsApp message to a business owner. Write a short, professional message (max 3 sentences) offering a preliminary solar assessment. Be specific to their business type. Do not promise savings, ROI, subsidies, eligibility, or bill amounts; say that benefits depend on a recent electricity bill and site assessment. No emojis.`;
              userPrompt = `Business: ${biz.businessName}, Type: ${biz.businessType}, Size proxy: ${biz.businessSize}, Location: ${biz.city}, ${biz.state}.`;
            }
            const response = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ] as any,
            });
            const pitch = response.choices[0]?.message?.content as string || "";
            if (pitch) {
              await db.updateScrapedBusiness(biz.id, { aiPitch: pitch });
              processed++;
            }
          } catch {
            // Skip failed pitches silently
          }
        }
        return { success: true, processed };
      }),
  }),
  // ===== BILL PHOTO READING =====
  billReader: router({
    readBillImage: publicProcedure
      .input(z.object({
        imageUrl: z.string(),
        contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]).default("image/png"),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "user",
                content: buildBillOcrContent(input.imageUrl, input.contentType),
              },
            ] as any,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "bill_data",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: ["number", "null"] },
                    units: { type: ["number", "null"] },
                    discom: { type: ["string", "null"] },
                    state: { type: ["string", "null"] },
                  },
                  required: ["amount", "units", "discom", "state"],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = response.choices[0]?.message?.content;
          if (typeof content === "string") {
            return { success: true, data: JSON.parse(content) };
          }
          return { success: false, data: null };
        } catch (e) {
          return { success: false, data: null };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ===== SOLAR CALCULATOR ENGINE =====
export function calculateSolarEstimate(
  monthlyBill: number,
  state: string,
  panels: any[],
  inverters: any[],
  agency: any,
  subsidyData: any
) {
  // Average electricity rate (use state data if available)
  const electricityRate = subsidyData ? parseFloat(subsidyData.avgElectricityRate) : 7.5;
  const avgSunHours = subsidyData ? parseFloat(subsidyData.avgSunHours) : 4.5;

  // Calculate monthly units consumed
  const monthlyUnits = monthlyBill / electricityRate;

  // Calculate required system size
  // Daily units = monthly / 30, then divide by sun hours and add 20% buffer
  const dailyUnits = monthlyUnits / 30;
  const systemSizeKw = Math.ceil((dailyUnits / avgSunHours) * 1.2 * 10) / 10;
  const cappedSystemSize = Math.min(Math.max(systemSizeKw, 1), 10);

  // Select best panel
  let selectedPanel = panels.length > 0 ? panels[0] : null;
  if (panels.length > 1) {
    // Pick the most cost-effective panel
    selectedPanel = panels.reduce((best, p) => {
      const costPerWatt = parseFloat(p.pricePerPanel) / p.wattage;
      const bestCostPerWatt = parseFloat(best.pricePerPanel) / best.wattage;
      return costPerWatt < bestCostPerWatt ? p : best;
    });
  }

  // Calculate panel count
  const panelWattage = selectedPanel ? selectedPanel.wattage : 545;
  const panelCount = Math.ceil((cappedSystemSize * 1000) / panelWattage);
  const panelPrice = selectedPanel ? parseFloat(selectedPanel.pricePerPanel) : 18000;
  const totalPanelCost = panelCount * panelPrice;

  // Select best inverter
  let selectedInverter = inverters.length > 0 ? inverters[0] : null;
  if (inverters.length > 1) {
    selectedInverter = inverters.reduce((best, inv) => {
      const cap = parseFloat(inv.capacityKw);
      const bestCap = parseFloat(best.capacityKw);
      // Pick smallest inverter that fits the system
      if (cap >= cappedSystemSize && (bestCap < cappedSystemSize || cap < bestCap)) return inv;
      return best;
    });
  }

  const inverterPrice = selectedInverter ? parseFloat(selectedInverter.price) : cappedSystemSize * 15000;

  // Installation charges
  const installationPerKw = agency ? parseFloat(agency.installationChargePerKw || "8000") : 8000;
  const installationCost = cappedSystemSize * installationPerKw;

  // Margin
  const marginPercent = agency ? parseFloat(agency.marginPercent || "15") : 15;

  // Total cost before subsidy
  const baseCost = totalPanelCost + inverterPrice + installationCost;
  const totalCost = Math.round(baseCost * (1 + marginPercent / 100));

  // Calculate subsidy
  let centralSubsidy = 0;
  if (subsidyData) {
    if (cappedSystemSize <= 1) centralSubsidy = parseFloat(subsidyData.centralSubsidy1kw);
    else if (cappedSystemSize <= 2) centralSubsidy = parseFloat(subsidyData.centralSubsidy2kw);
    else centralSubsidy = parseFloat(subsidyData.centralSubsidy3kw);
  } else {
    // Default PM Surya Ghar rates
    if (cappedSystemSize <= 1) centralSubsidy = 30000;
    else if (cappedSystemSize <= 2) centralSubsidy = 60000;
    else centralSubsidy = 78000;
  }

  let stateSubsidy = 0;
  if (subsidyData && parseFloat(subsidyData.stateAdditionalPerKw) > 0) {
    const additionalPerKw = parseFloat(subsidyData.stateAdditionalPerKw);
    const maxAdditional = parseFloat(subsidyData.stateMaxAdditional);
    stateSubsidy = Math.min(cappedSystemSize * additionalPerKw, maxAdditional);
  }

  const totalSubsidy = centralSubsidy + stateSubsidy;
  const netCost = Math.max(totalCost - totalSubsidy, 0);

  // Savings calculation
  const annualGeneration = cappedSystemSize * avgSunHours * 365 * 0.85; // 85% efficiency
  const annualSavings = annualGeneration * electricityRate;
  const monthlySavings = Math.round(annualSavings / 12);

  // Payback period
  const paybackYears = netCost > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;

  // 25-year savings
  const lifetimeSavings = Math.round(annualSavings * 25 - netCost);

  return {
    systemSizeKw: cappedSystemSize,
    panelCount,
    panelBrand: selectedPanel?.brand || "Standard",
    panelModel: selectedPanel?.model || "545W Mono PERC",
    panelWattage: selectedPanel?.wattage || 545,
    inverterBrand: selectedInverter?.brand || "Standard",
    inverterModel: selectedInverter?.model || `${cappedSystemSize}kW String`,
    inverterCapacity: selectedInverter ? parseFloat(selectedInverter.capacityKw) : cappedSystemSize,
    totalPanelCost,
    inverterPrice,
    installationCost,
    totalCost,
    centralSubsidy,
    stateSubsidy,
    totalSubsidy,
    netCost,
    monthlyUnits: Math.round(monthlyUnits),
    monthlySavings,
    annualSavings: Math.round(annualSavings),
    paybackYears,
    lifetimeSavings,
    electricityRate,
    avgSunHours,
    discomName: subsidyData?.discomName || "Local DISCOM",
    netMeteringAvailable: subsidyData?.netMeteringAvailable ?? true,
    specialNotes: subsidyData?.specialNotes || "",
  };
}

// ===== AI SALES AGENT PROMPT BUILDER =====
function buildSalesAgentPrompt(agency: any, panels: any[], inverters: any[], subsidyData: any, conversation: any, returningContext?: string, partnerDiscounts?: string): string {
  const panelList = panels.map(p => `- ${p.brand} ${p.model} (${p.wattage}W, ₹${p.pricePerPanel}/panel, ${p.panelType}, ${p.warranty}yr warranty)`).join("\n");
  const inverterList = inverters.map(i => `- ${i.brand} ${i.model} (${i.capacityKw}kW, ₹${i.price}, ${i.inverterType}, ${i.warranty}yr warranty)`).join("\n");

  const subsidyInfo = subsidyData ? `
STATE SUBSIDY INFO for ${subsidyData.stateName}:
- Central Subsidy: ₹30,000/kW (up to 2kW), ₹78,000 for 3kW+
- State Additional: ₹${subsidyData.stateAdditionalPerKw}/kW (max ₹${subsidyData.stateMaxAdditional})
- Avg Electricity Rate: ₹${subsidyData.avgElectricityRate}/unit
- DISCOM: ${subsidyData.discomName}
- Net Metering: ${subsidyData.netMeteringAvailable ? "Available" : "Limited"}
- Sun Hours: ${subsidyData.avgSunHours} hrs/day
${subsidyData.specialNotes ? `- Special: ${subsidyData.specialNotes}` : ""}
` : "State subsidy data not yet available - ask which state the customer is from.";

  const conversationContext = `
CUSTOMER DATA COLLECTED SO FAR:
- Name: ${conversation.customerName || "Not yet collected"}
- Phone: ${conversation.customerPhone || "Not yet collected"}
- Email: ${conversation.customerEmail || "Not yet collected"}
- State: ${conversation.customerState || "Not yet collected"}
- City: ${conversation.customerCity || "Not yet collected"}
- Monthly Bill: ${conversation.monthlyBill ? `₹${conversation.monthlyBill}` : "Not yet collected"}
- Monthly Units: ${conversation.monthlyUnits || "Not yet collected"}
`;

  const customerName = conversation.customerName;

  const returningSection = returningContext ? `
RETURNING CUSTOMER CONTEXT:
${returningContext}
This customer has chatted with you before. Greet them warmly by name, reference their previous conversation, and pick up where you left off. Skip the basic pitch if they already know it.
` : '';

  return `You are Agent Klaus, Sales Squad's virtual solar assistant. If asked, clearly say that you are an AI assistant. Your tone is confident, direct, and conversational.

YOUR MISSION: Get the customer's electricity bill, show them their personal savings numbers, and guide them toward a free site visit. Keep it real, keep it short.

${returningSection}
CORE RULES:
1. Sound human — use natural language, react to what they say, vary your sentence structure
2. ALWAYS use customer's first name once you know it (first name only, never "ji")
3. Keep responses SHORT — 2-3 sentences max per message. Never send walls of text.
4. Use ₹ (INR) for all prices
5. Never impersonate a human or hide that you are an AI when asked
6. NEVER use "ji" — not even once
7. React to their answers — if they say ₹5,000 bill, say "₹5,000 — that's actually quite a lot. Let me show you something."
8. If they say "no" to site visit: "No problem. You can reach out anytime."
9. Include quick reply buttons at end of EVERY message

CONVERSATION FLOW:

STEP 1 — GET NAME:
"Hey, I'm Klaus from Sales Squad. Who am I speaking with?"

STEP 2 — BRIEF INTRO + BILL (after getting name):
Give ONE short sentence about what Sales Squad does, then ask the bill:
"[Name], we help homeowners explore whether rooftop solar could reduce their grid electricity costs. I can prepare a preliminary projection in about 2 minutes. What's your electricity bill this month, roughly?"

STEP 3 — REACT AND HOOK (after they give the bill):
React to their specific number and explain that solar may offset part of their grid usage. Do not promise a savings percentage, bill reduction, subsidy, payback period, or permanent free electricity before property type, state, bill details, system design, and eligibility are confirmed. Ask whether the property is residential or commercial, then ask the state so the correct rules can be checked.

STEP 4 — SHOW ESTIMATE (after they give their state):
Present the full estimate using the format below. Use the state-specific subsidy data.

STEP 5 — SITE VISIT OFFER:
"[Name], the estimate looks solid. Want us to send someone to your place for a free site visit? They'll confirm the exact numbers and handle all the paperwork."

STEP 6 — COLLECT CONTACT (if yes to site visit):
Ask for ALL details in ONE single message — do NOT ask one at a time:
"Perfect! To book your free visit I need 3 things: your full address, mobile number, and email. You can also tap the 📍 Location button below to share your address automatically."

ANSWER ANY QUESTION HONESTLY (then steer back to their bill/estimate):
- "How much does solar cost?" → Give rough range, mention subsidy, ask their bill
- "Does it work in my area?" → Explain that suitability depends on roof access, shade, local weather, and DISCOM rules; offer a site assessment
- "What about maintenance?" → Usually periodic cleaning and inspection; needs vary by site and equipment
- "Is it reliable?" → Explain that warranties vary by manufacturer and installer; quote only the configured product catalog
- "What if it rains?" → Still works, less efficient. India gets enough sun overall.
- "Can I do it on rent?" → Needs landlord approval, we can help with that conversation
- "How long to install?" → Usually 2–3 weeks from booking
- "What about at night?" → Use grid at night, earn credits through net metering

ESTIMATE FORMAT (use EXACTLY this when you have the bill amount):

📊 **Your Numbers**
| | |
|---|---|
| Monthly Bill | ₹[bill] |
| System Size | ~[X] kW |
| System Cost | ₹[X] |
| Govt Subsidy | −₹[X] |
| **Your Net Cost** | **₹[X]** |

💰 **Your Savings**
| | |
|---|---|
| Monthly Savings | ~₹[X] |
| Annual Savings | ~₹[X×12] |
| Payback Period | ~[X] years |
| After Payback | Ongoing projected savings, subject to generation, tariffs, and maintenance |

📋 **Next Step:** Book a FREE site visit — our expert visits your home, confirms the numbers, and handles all government paperwork.

(Do NOT add any "Why Solar" bullet points after the estimate — the numbers speak for themselves.)

AGENCY PRODUCT CATALOG:
${panelList || "Standard panels available"}

INVERTERS:
${inverterList || "Standard inverters available"}

Installation Charge: ₹${agency.installationChargePerKw || "8,000"}/kW

${partnerDiscounts ? `PARTNER SPECIAL DISCOUNTS (mention these alongside the government subsidy when pitching):
${partnerDiscounts}
Mention a configured partner discount only when its terms are available. Do not combine it with a residential subsidy until customer and property eligibility are confirmed.
` : ""}
${subsidyInfo}

${conversationContext}

OBJECTION HANDLING (respond naturally, SHORT, empathetic — no "ji"):

⚠️ IMPORTANT: This service is for BOTH residential houses AND commercial properties (offices, factories, shops, warehouses). The customer must OWN the property or have written LANDLORD PERMISSION for installation. Early in the conversation, ask: "Is this for your home or your business/commercial property?" — this helps tailor the estimate. If customer mentions apartment/shared building without landlord approval: "Solar works best when you own the roof or have landlord permission. Do you have that? Many landlords agree because it increases property value!"

- "Too expensive" → Explain that cost, subsidy eligibility, and payback depend on the final design and tariff; offer a preliminary itemized projection and site assessment
- "Rented house" → "Many landlords agree because it increases property value. We can help you have that conversation. Worth exploring?"
- If customer CONFIRMS they are renting AND explicitly says landlord will NOT give permission: "Understood — solar does need roof access approval. If your situation changes or you move to an owned property, we'd love to help. Take care!" (end conversation gracefully, do NOT capture as lead)
- "Not sure it works in my area" → Explain that local irradiation, shade, roof access, and DISCOM rules must be checked
- "Government schemes are fake" → "PM Surya Ghar Yojana is a real central government scheme with ₹75,000 crore budget. We handle all the paperwork — you don't have to deal with any office."
- "Need to ask family" → "Makes sense. Want me to prepare a detailed estimate you can share with them? Has all the numbers they'll need."
- "Not now, later" → "No problem, [Name]. I can save your preliminary estimate so you can come back to it anytime."
- "Maintenance is a problem" → Explain periodic cleaning, inspection, and manufacturer-specific maintenance requirements
- "Neighbour had bad experience" → Acknowledge the concern and offer installer credentials, references, written scope, and warranty terms for review; do not invent qualifications
- "My bill is low" → "Even at ₹1,500/month, [Name], that's ₹18,000 a year. Over 25 years you'd spend ₹4.5 lakh. Solar saves most of that."
- "Already have inverter/generator" → Explain the difference between backup equipment and solar generation, then ask whether they want compatibility assessed

COMMERCIAL PROPERTY MESSAGING:
If the customer says this is for a business/commercial property:
- PM Surya Ghar subsidy is for residential. For commercial, mention: Accelerated Depreciation (40% in Year 1 under Income Tax), MSME solar schemes, and net metering credits.
- Discuss accelerated depreciation or other tax treatment only as a possibility that the customer's accountant must confirm; do not promise a tax rate or ROI.
- Skip the ₹78,000 residential subsidy pitch for commercial leads.

CLARIFYING QUESTIONS (ask ONE AT A TIME, only when relevant):
- Property type: "Is this for your home or your business/commercial property?" (determines subsidy type)
- Roof ownership: "Is the property owned or rented?" (affects eligibility)
- Installation timeline: "How soon are you looking to install solar?" (helps prioritize follow-up)
- Full address: "Could you share your full property address? Our agent will visit for a free site assessment." (needed for booking)
- Decision maker: "Are you the decision-maker, or should we loop in someone from your family/management?"
- Appliances: "Do you run heavy appliances — AC, water heater, pump?" (helps size the system)
NOTE: Do NOT ask about roof type, roof size, roof condition, shade level, or sun exposure — these will be assessed by the field agent during the free site visit.

QUICK REPLY BUTTONS:
At the END of EVERY response, include a JSON block with 2-4 short quick reply options:

[QUICK_REPLIES]
["Option 1", "Option 2", "Option 3"]
[/QUICK_REPLIES]

Examples by stage:
- Asking name: ["I'm Ravi", "I'm Priya", "I'm Amit"]
- After bill question: ["₹1,000–2,000", "₹2,000–4,000", "₹4,000–7,000", "Share my bill photo"]
- When asking state: ["Telangana", "Andhra Pradesh", "Maharashtra", "Karnataka"]
- After hook/react: ["Yes, show me numbers", "How does subsidy work?", "Tell me more"]
- After estimate: ["Book Free Site Visit", "Download PDF", "Share with family", "📍 Share my location"]
- After site visit offer: ["Yes, book it", "Not now", "Call me instead"]
- Collecting contact: ["Share my location 📍", "I'll type my address"]

IMPORTANT: Always use "Approx" for all numbers. Keep messages SHORT — 2-3 sentences max. Use the customer's first name naturally.`;
}

// ===== DATA EXTRACTION FROM CONVERSATION =====
async function extractCustomerData(history: any[], latestMessage: string) {
  try {
    const recentMessages = history.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Extract customer information from this conversation. Return JSON with these fields (null if not found): name, phone, email, city, state (Indian state name), monthlyBill (number in INR), monthlyUnits (number), propertyType ("residential" or "commercial" only if clearly stated, else null), installationTimeline (e.g. "immediately", "1-3 months", "3-6 months", "6+ months" — only if clearly stated, else null), propertyAddress (full address if shared, else null). Only extract clearly stated information, don't guess. For state, use full state name (e.g., "Maharashtra", "Tamil Nadu").`,
        },
        {
          role: "user",
          content: `Latest message: "${latestMessage}"\n\nRecent conversation:\n${recentMessages}`,
        },
      ] as any,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "customer_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: ["string", "null"] },
              phone: { type: ["string", "null"] },
              email: { type: ["string", "null"] },
              city: { type: ["string", "null"] },
              state: { type: ["string", "null"] },
              monthlyBill: { type: ["number", "null"] },
              monthlyUnits: { type: ["number", "null"] },
              propertyType: { type: ["string", "null"] },
              installationTimeline: { type: ["string", "null"] },
              propertyAddress: { type: ["string", "null"] },
            },
            required: ["name", "phone", "email", "city", "state", "monthlyBill", "monthlyUnits", "propertyType", "installationTimeline", "propertyAddress"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Failed to extract customer data:", e);
  }
  return null;
}

// ===== SCORING =====
function calculateConversationScore(conversation: any, extractedData: any): number {
  let score = 10;
  // Contact info
  if (extractedData?.name || conversation.customerName) score += 12;
  if (extractedData?.phone || conversation.customerPhone) score += 18;
  if (extractedData?.email || conversation.customerEmail) score += 8;
  if (extractedData?.state || conversation.customerState) score += 5;
  if (extractedData?.city || conversation.customerCity) score += 5;
  // Bill amount — higher bill = higher quality
  if (extractedData?.monthlyBill || conversation.monthlyBill) {
    const bill = extractedData?.monthlyBill || parseFloat(conversation.monthlyBill);
    if (bill >= 10000) score += 20;
    else if (bill >= 5000) score += 16;
    else if (bill >= 3000) score += 12;
    else if (bill >= 1500) score += 8;
    else score += 4;
  }
  // Property ownership — owner is much higher quality
  const propType = extractedData?.propertyType || "";
  if (propType === "commercial") score += 10; // commercial = bigger system
  // Installation timeline — sooner = higher quality
  const timeline = extractedData?.installationTimeline || "";
  if (timeline === "immediately") score += 8;
  else if (timeline === "1-3 months") score += 6;
  else if (timeline === "3-6 months") score += 3;
  // Address shared = committed
  if (extractedData?.propertyAddress || conversation.customerAddress) score += 5;
  // Engagement — more messages = more interested
  const msgs = conversation.messageCount || 0;
  if (msgs >= 10) score += 8;
  else if (msgs >= 5) score += 5;
  else if (msgs >= 3) score += 2;
  return Math.min(score, 100);
}

function getPriority(score: number): "low" | "medium" | "high" | "urgent" {
  if (score >= 80) return "urgent";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ===== BUSINESS SCRAPER HELPERS =====
function extractCity(address: string): string {
  if (!address) return "";
  // Indian addresses typically have city before state
  const parts = address.split(",").map(p => p.trim());
  // Try to find city (usually 2nd or 3rd from end)
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || "";
}

function extractState(address: string): string {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  // State is typically 2nd from end (before country/pincode)
  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
    "Chandigarh", "Puducherry", "Jammu and Kashmir", "Ladakh",
  ];
  for (const part of parts) {
    for (const state of INDIAN_STATES) {
      if (part.toLowerCase().includes(state.toLowerCase())) return state;
    }
  }
  if (parts.length >= 2) return parts[parts.length - 2];
  return "";
}

function classifyBusinessSize(reviewCount: number, types: string[]): "small" | "medium" | "large" {
  // Large businesses: hospitals, malls, factories, universities
  const largeTypes = ["hospital", "university", "shopping_mall", "department_store", "stadium", "airport"];
  const mediumTypes = ["hotel", "school", "gym", "restaurant", "supermarket", "warehouse"];
  
  if (types.some(t => largeTypes.some(lt => t.includes(lt)))) return "large";
  if (types.some(t => mediumTypes.some(mt => t.includes(mt)))) return "medium";
  
  if (reviewCount > 500) return "large";
  if (reviewCount > 100) return "medium";
  return "small";
}
// build-bust: 1784103493
