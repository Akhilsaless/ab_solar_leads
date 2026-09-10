import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { decryptGatewayCredential, encryptGatewayCredential, maskCredential } from "./aiGateway";
import { getDb } from "./db";
import { canDispatchAutomated, type AutomationState, type ChannelStatus, type PlatformChannel, sanitizedConfigurationFields } from "./platformCommunicationState";

function rows(result: any): any[] {
  return Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : [];
}

function asBoolean(value: unknown) {
  return value === true || value === 1 || value === "1";
}

export type EmailProviderConfig = {
  host?: string;
  port?: string;
  secure?: string | boolean;
  user?: string;
  password?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  senderIdentityConfirmed?: string | boolean;
  eventWebhookSecret?: string;
};

export type WhatsAppProviderConfig = {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  webhookSignatureSecret?: string;
  defaultTemplate?: string;
};

export async function getPlatformSafetyControl() {
  const db = await getDb();
  if (!db) return { emergencyStopActive: true };
  const result = await db.execute(sql`SELECT * FROM platformSafetyControls ORDER BY id ASC LIMIT 1`);
  const row = rows(result)[0];
  return { emergencyStopActive: row ? asBoolean(row.emergencyStopActive) : true, updatedAt: row?.updatedAt || null };
}

export async function getPlatformChannel(channel: PlatformChannel) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.execute(sql`SELECT * FROM platformCommunicationSettings WHERE channel = ${channel} LIMIT 1`);
  return rows(result)[0] || null;
}

export async function getDecryptedPlatformConfig<T extends Record<string, unknown>>(channel: PlatformChannel): Promise<T | null> {
  const setting = await getPlatformChannel(channel);
  if (!setting?.encryptedConfig) return null;
  try {
    return JSON.parse(decryptGatewayCredential(setting.encryptedConfig)) as T;
  } catch {
    return null;
  }
}

export async function savePlatformConfiguration(input: {
  channel: PlatformChannel;
  provider: string;
  config: Record<string, string | undefined>;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  const previous = await getDecryptedPlatformConfig<Record<string, string>>(input.channel) || {};
  const merged = { ...previous, ...Object.fromEntries(Object.entries(input.config).filter(([, value]) => typeof value === "string" && value.trim().length > 0)) };
  const fields = sanitizedConfigurationFields(merged);
  const encryptedConfig = fields.length ? encryptGatewayCredential(JSON.stringify(merged)) : null;
  await db.execute(sql`
    UPDATE platformCommunicationSettings
    SET provider = ${input.provider}, encryptedConfig = ${encryptedConfig}, configuredFields = ${JSON.stringify(fields)},
        status = CASE WHEN ${fields.length > 0} THEN 'off' ELSE 'not_configured' END,
        automationState = 'off', lastVerifiedAt = NULL, lastErrorCode = NULL, lastErrorMessage = NULL,
        updatedByUserId = ${input.actorUserId}
    WHERE channel = ${input.channel}
  `);
  return { configured: fields.length > 0, configuredFields: fields };
}

export async function updatePlatformChannel(input: {
  channel: PlatformChannel;
  status?: ChannelStatus;
  automationState?: AutomationState;
  lastVerifiedAt?: boolean;
  lastSuccessfulSendAt?: boolean;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  actorUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  await db.execute(sql`
    UPDATE platformCommunicationSettings
    SET status = COALESCE(${input.status || null}, status),
        automationState = COALESCE(${input.automationState || null}, automationState),
        lastVerifiedAt = CASE WHEN ${Boolean(input.lastVerifiedAt)} THEN NOW() ELSE lastVerifiedAt END,
        lastSuccessfulSendAt = CASE WHEN ${Boolean(input.lastSuccessfulSendAt)} THEN NOW() ELSE lastSuccessfulSendAt END,
        lastErrorCode = ${input.lastErrorCode === undefined ? null : input.lastErrorCode},
        lastErrorMessage = ${input.lastErrorMessage === undefined ? null : input.lastErrorMessage},
        updatedByUserId = COALESCE(${input.actorUserId ?? null}, updatedByUserId)
    WHERE channel = ${input.channel}
  `);
}

export async function setPlatformEmergencyStop(active: boolean, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  await db.execute(sql`UPDATE platformSafetyControls SET emergencyStopActive = ${active}, updatedByUserId = ${actorUserId} ORDER BY id ASC LIMIT 1`);
  if (active) {
    await db.execute(sql`UPDATE platformCommunicationSettings SET automationState = 'paused', status = CASE WHEN status = 'running' THEN 'paused' ELSE status END WHERE automationState = 'running'`);
  }
}

export async function addPlatformCommunicationAudit(input: {
  channel: PlatformChannel | "global";
  actorUserId?: number | null;
  action: string;
  result: string;
  fromState?: string | null;
  toState?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    INSERT INTO platformCommunicationAudit (channel, actorUserId, action, result, fromState, toState, metadata)
    VALUES (${input.channel}, ${input.actorUserId ?? null}, ${input.action}, ${input.result}, ${input.fromState || null}, ${input.toState || null}, ${JSON.stringify(input.metadata || {})})
  `);
}

export async function listPlatformCommunicationAudit(limit = 24) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT id, channel, action, result, fromState, toState, metadata, createdAt
    FROM platformCommunicationAudit
    ORDER BY id DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `);
  return rows(result);
}

export async function getPlatformDispatchDecision(channel: PlatformChannel) {
  const [setting, safety] = await Promise.all([getPlatformChannel(channel), getPlatformSafetyControl()]);
  if (!setting) return { allowed: false as const, reason: "Platform communication settings are unavailable." };
  return canDispatchAutomated(channel, {
    state: setting.automationState as AutomationState,
    status: setting.status as ChannelStatus,
    emergencyStopActive: safety.emergencyStopActive,
  });
}

/** A one-recipient diagnostic path that never changes the channel automation state. */
export async function sendPlatformControlledEmailTest(recipient: string) {
  const [setting, safety, config] = await Promise.all([
    getPlatformChannel("email"),
    getPlatformSafetyControl(),
    getDecryptedPlatformConfig<EmailProviderConfig>("email"),
  ]);
  if (safety.emergencyStopActive) throw new Error("Emergency stop is active.");
  if (!setting?.lastVerifiedAt || setting.status !== "ready") throw new Error("Verified email configuration is required before a controlled test.");
  if (!config?.host || !config.user || !config.password || !config.from) throw new Error("Email configuration is incomplete.");
  const port = Number(config.port || 587);
  const transporter = nodemailer.createTransport({ host: config.host, port, secure: String(config.secure) === "true" || port === 465, auth: { user: config.user, pass: config.password } });
  const fromName = config.fromName?.replace(/["\r\n]/g, "").slice(0, 120);
  const result = await transporter.sendMail({
    from: fromName ? `"${fromName}" <${config.from}>` : config.from,
    replyTo: config.replyTo || undefined,
    to: recipient,
    subject: "Sales Squad platform email test",
    text: "This is a controlled platform email test. No customer campaign or automation was started.",
  });
  await updatePlatformChannel({ channel: "email", lastSuccessfulSendAt: true });
  return { messageId: result.messageId };
}

export function publicPlatformChannel(setting: any) {
  const configuredFields = Array.isArray(setting?.configuredFields)
    ? setting.configuredFields
    : typeof setting?.configuredFields === "string"
      ? JSON.parse(setting.configuredFields || "[]")
      : [];
  return {
    channel: setting?.channel,
    provider: setting?.provider || "not_configured",
    connectionMode: setting?.connectionMode,
    configured: Boolean(setting?.encryptedConfig),
    configuredFields,
    credentialHint: setting?.encryptedConfig ? "Configured securely" : null,
    status: setting?.status || "not_configured",
    automationState: setting?.automationState || "off",
    lastVerifiedAt: setting?.lastVerifiedAt || null,
    lastSuccessfulSendAt: setting?.lastSuccessfulSendAt || null,
    lastErrorCode: setting?.lastErrorCode || null,
    lastErrorMessage: setting?.lastErrorMessage || null,
  };
}
