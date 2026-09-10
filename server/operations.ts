import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getEmailServiceStatus } from "./_core/emailService";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { activationError, estimateSettingsActivationError, stateInputActivationError } from "./productionControls";

function rows(result: any): any[] {
  return Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : [];
}

async function requireAgency(userId: number) {
  const agency = await db.getAgencyByUserId(userId);
  if (!agency) throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found." });
  return agency;
}

async function providerReadiness(agencyId: number) {
  const connection = await db.getDb();
  if (!connection) return [];
  const result = await connection.execute(sql`
    SELECT provider, status, healthStatus, isEnabled, credentialHint, lastValidatedAt, lastErrorMessage
    FROM aiProviderConnections
    WHERE agencyId = ${agencyId}
    ORDER BY priority ASC, id ASC
  `);
  return rows(result).map((item: any) => ({
    provider: item.provider,
    status: item.status,
    healthStatus: item.healthStatus,
    isEnabled: Boolean(item.isEnabled),
    credentialConfigured: Boolean(item.credentialHint),
    lastValidatedAt: item.lastValidatedAt || null,
    lastErrorMessage: item.lastErrorMessage || null,
  }));
}

export const operationsRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const agency = await requireAgency(ctx.user!.id);
    const [catalog, estimateSettings, stateInputs, controls, audit, providers] = await Promise.all([
      db.getAgencyCatalogReadiness(agency.id),
      db.getAgencyEstimateSettings(agency.id),
      db.listAgencyStateEstimateInputs(agency.id),
      db.getAgencyFeatureControls(agency.id),
      db.getAgencyConfigurationAudit(agency.id, 12),
      providerReadiness(agency.id),
    ]);
    const email = getEmailServiceStatus();
    const hasHealthyAi = providers.some((item: any) => item.isEnabled && item.status === "connected" && item.healthStatus === "healthy");
    const hasWhatsAppCredential = Boolean(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID);
    return {
      agency: { id: agency.id, name: agency.agencyName, slug: agency.agencySlug },
      catalog: { ...catalog, estimateSettings, stateInputs },
      controls,
      integrations: {
        smtp: email,
        ai: { providers, healthyProviderAvailable: hasHealthyAi },
        whatsapp: { configured: hasWhatsAppCredential, enabled: false, state: "disabled", detail: "A production WhatsApp adapter is not installed, so outbound WhatsApp cannot be activated." },
        smsOtp: { configured: false, enabled: false, state: "disabled", detail: "Phone OTP remains disabled until a verified SMS or WhatsApp Business provider adapter is installed." },
        maps: { configured: true, enabled: true, state: "platform_managed" },
        ocr: { configured: true, enabled: true, state: "available" },
        storage: { configured: true, enabled: true, state: "platform_managed" },
        emailWebhook: { configured: Boolean(process.env.EMAIL_EVENT_WEBHOOK_SECRET), enabled: Boolean(process.env.EMAIL_EVENT_WEBHOOK_SECRET), state: process.env.EMAIL_EVENT_WEBHOOK_SECRET ? "configured" : "configuration_required" },
        canonicalUrl: { configured: Boolean(process.env.PUBLIC_APP_URL || process.env.APP_URL), enabled: true, state: process.env.PUBLIC_APP_URL || process.env.APP_URL ? "configured" : "fallback" },
        defaultAgency: { configured: Boolean(process.env.DEFAULT_AGENCY_SLUG), enabled: true, state: process.env.DEFAULT_AGENCY_SLUG ? "configured" : "fallback" },
      },
      audit,
    };
  }),

  updateControls: protectedProcedure
    .input(z.object({
      emailAutomationEnabled: z.boolean().optional(),
      whatsappAutomationEnabled: z.boolean().optional(),
      smsOtpEnabled: z.boolean().optional(),
      scheduledFollowUpsEnabled: z.boolean().optional(),
      optionalAiFeaturesEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await requireAgency(ctx.user!.id);
      const email = getEmailServiceStatus();
      const providers = await providerReadiness(agency.id);
      const error = activationError(input, {
        emailReady: email.ready,
        whatsappAdapterAvailable: false,
        smsOtpAdapterAvailable: false,
        optionalAiReady: providers.some((item: any) => item.isEnabled && item.status === "connected" && item.healthStatus === "healthy"),
      });
      if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
      await db.updateAgencyFeatureControls(agency.id, ctx.user!.id, input);
      await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "feature_controls_updated", entityType: "agencyFeatureControls", metadata: input });
      return { success: true };
    }),

  saveEstimateSettings: protectedProcedure
    .input(z.object({
      pricingVersion: z.string().trim().min(1).max(80),
      pricingMode: z.enum(["catalog", "quote_only"]),
      installationCostPerKw: z.string().nullable().optional(),
      balanceOfSystemCostPerKw: z.string().nullable().optional(),
      taxRatePercent: z.string().nullable().optional(),
      warrantyTerms: z.string().trim().max(5000).nullable().optional(),
      pricingDisclosure: z.string().trim().max(5000).nullable().optional(),
      sourceNote: z.string().trim().max(2000).nullable().optional(),
      effectiveFrom: z.string().date().nullable().optional(),
      effectiveTo: z.string().date().nullable().optional(),
      lastVerifiedAt: z.string().datetime().nullable().optional(),
      isPricingActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await requireAgency(ctx.user!.id);
      const error = estimateSettingsActivationError(input);
      if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
      await db.updateAgencyEstimateSettings(agency.id, {
        ...input,
        effectiveFrom: input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : null,
        effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : null,
        lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null,
      });
      await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "estimate_settings_saved", entityType: "agencyEstimateSettings", metadata: { pricingVersion: input.pricingVersion, pricingMode: input.pricingMode, isPricingActive: input.isPricingActive } });
      return { success: true };
    }),

  saveStateInput: protectedProcedure
    .input(z.object({
      stateName: z.string().trim().min(2).max(100),
      stateCode: z.string().trim().min(2).max(10),
      discomName: z.string().trim().max(200).nullable().optional(),
      tariffPerUnit: z.string().nullable().optional(),
      avgSunHours: z.string().nullable().optional(),
      systemLossPercent: z.string().nullable().optional(),
      netMeteringStatus: z.enum(["unknown", "available", "limited", "unavailable"]),
      subsidyDisclosure: z.string().trim().max(5000).nullable().optional(),
      subsidySourceUrl: z.string().url().max(1000).nullable().optional(),
      sourceNote: z.string().trim().max(2000).nullable().optional(),
      effectiveFrom: z.string().date().nullable().optional(),
      effectiveTo: z.string().date().nullable().optional(),
      lastVerifiedAt: z.string().datetime().nullable().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await requireAgency(ctx.user!.id);
      const error = stateInputActivationError(input);
      if (error) throw new TRPCError({ code: "PRECONDITION_FAILED", message: error });
      await db.upsertAgencyStateEstimateInput(agency.id, {
        ...input,
        stateCode: input.stateCode.toUpperCase(),
        effectiveFrom: input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : null,
        effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T00:00:00.000Z`) : null,
        lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null,
      });
      await db.addAgencyConfigurationAudit({ agencyId: agency.id, actorUserId: ctx.user!.id, action: "state_estimate_input_saved", entityType: "agencyStateEstimateInputs", metadata: { stateCode: input.stateCode.toUpperCase(), isActive: input.isActive } });
      return { success: true };
    }),
});
