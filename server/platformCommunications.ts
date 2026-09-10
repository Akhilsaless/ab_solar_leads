import nodemailer from "nodemailer";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "./_core/env";
import { protectedProcedure, router } from "./_core/trpc";
import {
  addPlatformCommunicationAudit,
  getDecryptedPlatformConfig,
  getPlatformChannel,
  getPlatformSafetyControl,
  listPlatformCommunicationAudit,
  publicPlatformChannel,
  savePlatformConfiguration,
  sendPlatformControlledEmailTest,
  setPlatformEmergencyStop,
  updatePlatformChannel,
  type EmailProviderConfig,
  type WhatsAppProviderConfig,
} from "./platformCommunicationService";
import { isPlatformSuperAdmin, startBlocker, transitionError, type AutomationState, type PlatformChannel } from "./platformCommunicationState";
import * as db from "./db";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

function requirePlatformOwner(ctx: any) {
  if (!isPlatformSuperAdmin(ctx.user, ENV.ownerOpenId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform communication settings are restricted to the super-admin." });
  }
}

async function channelReadiness(channel: PlatformChannel) {
  const database = await getDb();
  const masterResult = database ? await database.execute(sql`SELECT isEnabled FROM outreachConfig WHERE agencyId = 1 LIMIT 1`) : [];
  const masterRows = Array.isArray((masterResult as any)?.[0]) ? (masterResult as any)[0] : masterResult as any[];
  const master = masterRows?.[0] || null;
  const [setting, safety, controls, catalog, configuration] = await Promise.all([
    getPlatformChannel(channel),
    getPlatformSafetyControl(),
    db.getAgencyFeatureControls(1),
    db.getAgencyCatalogReadiness(1),
    getDecryptedPlatformConfig<EmailProviderConfig | WhatsAppProviderConfig>(channel),
  ]);
  const configured = Boolean(setting?.encryptedConfig);
  const verified = Boolean(setting?.lastVerifiedAt) && ["ready", "off", "paused", "running"].includes(setting?.status);
  const featureEnabled = channel === "email" ? Boolean(controls?.emailAutomationEnabled) : Boolean(controls?.whatsappAutomationEnabled);
  return {
    configured,
    verified,
    providerSupported: channel === "email",
    senderIdentityConfirmed: String((configuration as EmailProviderConfig | null)?.senderIdentityConfirmed) === "true",
    pricingReady: Boolean(catalog.pricingActive && catalog.verifiedPanels > 0 && catalog.verifiedInverters > 0 && catalog.stateInputs > 0),
    legalReady: false,
    featureEnabled,
    outreachMasterEnabled: Boolean(master?.isEnabled),
    emergencyStopActive: safety.emergencyStopActive,
  };
}

function validateEmailConfig(input: EmailProviderConfig) {
  const required = ["host", "port", "user", "password", "from"] as const;
  const missing = required.filter((key) => !input[key]?.trim());
  if (missing.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Email configuration is incomplete: ${missing.join(", ")}.` });
}

export const platformCommunicationsRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    requirePlatformOwner(ctx);
    const database = await getDb();
    const masterResult = database ? await database.execute(sql`SELECT isEnabled FROM outreachConfig WHERE agencyId = 1 LIMIT 1`) : [];
    const masterRows = Array.isArray((masterResult as any)?.[0]) ? (masterResult as any)[0] : masterResult as any[];
    const [email, whatsapp, safety, audit, agencyControls] = await Promise.all([
      getPlatformChannel("email"), getPlatformChannel("whatsapp"), getPlatformSafetyControl(), listPlatformCommunicationAudit(),
      db.getAgencyFeatureControls(1),
    ]);
    return {
      email: publicPlatformChannel(email), whatsapp: publicPlatformChannel(whatsapp), emergencyStopActive: safety.emergencyStopActive, audit,
      agencyEligibility: {
        agencyId: 1,
        email: Boolean(agencyControls?.emailAutomationEnabled),
        whatsapp: Boolean(agencyControls?.whatsappAutomationEnabled),
        scheduledFollowUps: Boolean(agencyControls?.scheduledFollowUpsEnabled),
        outreachMaster: Boolean(masterRows?.[0]?.isEnabled),
      },
    };
  }),

  setAgencyEligibility: protectedProcedure.input(z.object({ channel: z.enum(["email", "whatsapp"]), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    requirePlatformOwner(ctx);
    if (input.enabled) {
      const setting = await getPlatformChannel(input.channel);
      const verified = Boolean(setting?.lastVerifiedAt) && ["ready", "off", "paused", "running"].includes(setting?.status);
      if (!verified) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `A verified ${input.channel} configuration is required before agency eligibility can be armed.` });
      if (input.channel === "whatsapp") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "WhatsApp eligibility cannot be armed until a signed provider adapter and approved template validation are installed." });
    }
    const patch = input.channel === "email"
      ? { emailAutomationEnabled: input.enabled, scheduledFollowUpsEnabled: input.enabled }
      : { whatsappAutomationEnabled: input.enabled };
    await db.updateAgencyFeatureControls(1, ctx.user!.id, patch);
    await addPlatformCommunicationAudit({ channel: input.channel, actorUserId: ctx.user!.id, action: input.enabled ? "agency_eligibility_armed" : "agency_eligibility_disarmed", result: "success", metadata: { agencyId: 1 } });
    return { success: true, enabled: input.enabled };
  }),

  saveEmailConfiguration: protectedProcedure.input(z.object({
    provider: z.string().trim().min(1).max(80).default("SMTP"),
    host: z.string().trim().min(1).max(255), port: z.string().trim().regex(/^\d{2,5}$/), secure: z.boolean(),
    user: z.string().trim().min(1).max(320), password: z.string().min(1).max(2000), from: z.string().trim().email(),
    fromName: z.string().trim().max(120).optional(), replyTo: z.string().trim().email().optional(), senderIdentityConfirmed: z.literal(true), eventWebhookSecret: z.string().min(8).max(2000).optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePlatformOwner(ctx); validateEmailConfig(input);
    const result = await savePlatformConfiguration({ channel: "email", provider: input.provider, config: {
      host: input.host, port: input.port, secure: String(input.secure), user: input.user, password: input.password, from: input.from, fromName: input.fromName, replyTo: input.replyTo, senderIdentityConfirmed: "true", eventWebhookSecret: input.eventWebhookSecret,
    }, actorUserId: ctx.user!.id });
    await addPlatformCommunicationAudit({ channel: "email", actorUserId: ctx.user!.id, action: "configuration_changed", result: "saved", metadata: { configuredFields: result.configuredFields } });
    return { success: true, configuredFields: result.configuredFields };
  }),

  saveWhatsAppConfiguration: protectedProcedure.input(z.object({
    provider: z.string().trim().min(1).max(80), accessToken: z.string().min(1).max(2000), phoneNumberId: z.string().trim().min(1).max(255),
    businessAccountId: z.string().trim().max(255).optional(), webhookVerifyToken: z.string().min(8).max(2000).optional(), webhookSignatureSecret: z.string().min(8).max(2000).optional(), defaultTemplate: z.string().trim().max(255).optional(),
  })).mutation(async ({ ctx, input }) => {
    requirePlatformOwner(ctx);
    const result = await savePlatformConfiguration({ channel: "whatsapp", provider: input.provider, config: input, actorUserId: ctx.user!.id });
    await updatePlatformChannel({ channel: "whatsapp", status: "template_setup_required", actorUserId: ctx.user!.id, lastErrorCode: "adapter_not_installed", lastErrorMessage: "A signed provider adapter and approved template validation are required before WhatsApp can be verified or activated." });
    await addPlatformCommunicationAudit({ channel: "whatsapp", actorUserId: ctx.user!.id, action: "configuration_changed", result: "saved", metadata: { configuredFields: result.configuredFields } });
    return { success: true, configuredFields: result.configuredFields };
  }),

  verifyEmail: protectedProcedure.mutation(async ({ ctx }) => {
    requirePlatformOwner(ctx);
    const config = await getDecryptedPlatformConfig<EmailProviderConfig>("email");
    if (!config) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email is not configured." });
    try {
      const port = Number(config.port || 587);
      const transporter = nodemailer.createTransport({ host: config.host, port, secure: String(config.secure) === "true" || port === 465, auth: { user: config.user, pass: config.password } });
      await transporter.verify();
      await updatePlatformChannel({ channel: "email", status: "ready", automationState: "off", lastVerifiedAt: true, lastErrorCode: null, lastErrorMessage: null, actorUserId: ctx.user!.id });
      await addPlatformCommunicationAudit({ channel: "email", actorUserId: ctx.user!.id, action: "provider_verification", result: "success" });
      return { success: true, state: "ready" as const };
    } catch {
      await updatePlatformChannel({ channel: "email", status: "authentication_error", automationState: "off", lastVerifiedAt: true, lastErrorCode: "smtp_verification_failed", lastErrorMessage: "SMTP authentication or connection verification failed.", actorUserId: ctx.user!.id });
      await addPlatformCommunicationAudit({ channel: "email", actorUserId: ctx.user!.id, action: "provider_verification", result: "failed" });
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SMTP authentication or connection verification failed. No email was sent." });
    }
  }),

  sendControlledEmailTest: protectedProcedure
    .input(z.object({ recipient: z.string().trim().email(), confirm: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      requirePlatformOwner(ctx);
      try {
        await sendPlatformControlledEmailTest(input.recipient);
        await addPlatformCommunicationAudit({ channel: "email", actorUserId: ctx.user!.id, action: "controlled_test", result: "success", metadata: { recipientProvided: true } });
        return { success: true };
      } catch (error: any) {
        await addPlatformCommunicationAudit({ channel: "email", actorUserId: ctx.user!.id, action: "controlled_test", result: "blocked", metadata: { reason: String(error?.message || "blocked").slice(0, 180) } });
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: String(error?.message || "Controlled test is unavailable.") });
      }
    }),

  verifyWhatsApp: protectedProcedure.mutation(async ({ ctx }) => {
    requirePlatformOwner(ctx);
    const config = await getDecryptedPlatformConfig<WhatsAppProviderConfig>("whatsapp");
    if (!config) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "WhatsApp is not configured." });
    await updatePlatformChannel({ channel: "whatsapp", status: "template_setup_required", automationState: "off", lastErrorCode: "adapter_not_installed", lastErrorMessage: "A signed provider adapter and approved template validation are required before WhatsApp can be verified." , actorUserId: ctx.user!.id });
    await addPlatformCommunicationAudit({ channel: "whatsapp", actorUserId: ctx.user!.id, action: "provider_verification", result: "blocked", metadata: { reason: "adapter_not_installed" } });
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "WhatsApp remains disabled: a signed provider adapter and approved template validation are not installed." });
  }),

  setAutomationState: protectedProcedure.input(z.object({ channel: z.enum(["email", "whatsapp"]), state: z.enum(["off", "paused", "running"]), legalReady: z.literal(true).optional() })).mutation(async ({ ctx, input }) => {
    requirePlatformOwner(ctx);
    const current = await getPlatformChannel(input.channel);
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Platform channel not found." });
    const previous = current.automationState as AutomationState;
    const basicTransitionError = transitionError(previous, input.state);
    if (basicTransitionError) {
      await addPlatformCommunicationAudit({ channel: input.channel, actorUserId: ctx.user!.id, action: `automation_${input.state}`, result: "blocked", fromState: previous, toState: input.state, metadata: { reason: "invalid_transition" } });
      throw new TRPCError({ code: "BAD_REQUEST", message: basicTransitionError });
    }
    if (input.state === "running") {
      const blocker = startBlocker(input.channel, { ...await channelReadiness(input.channel), legalReady: input.legalReady === true });
      if (blocker) {
        await addPlatformCommunicationAudit({ channel: input.channel, actorUserId: ctx.user!.id, action: "automation_running", result: "blocked", fromState: previous, toState: "running", metadata: { reason: blocker } });
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: blocker });
      }
    }
    const status = input.state === "running" ? "running" : input.state === "paused" ? "paused" : current.encryptedConfig ? "off" : "not_configured";
    await updatePlatformChannel({ channel: input.channel, automationState: input.state, status: status as any, actorUserId: ctx.user!.id });
    await addPlatformCommunicationAudit({ channel: input.channel, actorUserId: ctx.user!.id, action: `automation_${input.state}`, result: "success", fromState: previous, toState: input.state, metadata: input.state === "running" ? { legalPrerequisitesConfirmed: true } : {} });
    return { success: true, state: input.state };
  }),

  setEmergencyStop: protectedProcedure.input(z.object({ active: z.boolean() })).mutation(async ({ ctx, input }) => {
    requirePlatformOwner(ctx);
    await setPlatformEmergencyStop(input.active, ctx.user!.id);
    await addPlatformCommunicationAudit({ channel: "global", actorUserId: ctx.user!.id, action: input.active ? "emergency_stop_activated" : "emergency_stop_cleared", result: "success", toState: input.active ? "stopped" : "armed" });
    return { success: true, emergencyStopActive: input.active };
  }),
});
