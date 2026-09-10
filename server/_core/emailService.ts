import nodemailer from "nodemailer";
import { addPlatformCommunicationAudit, getDecryptedPlatformConfig, getPlatformChannel, getPlatformDispatchDecision, updatePlatformChannel, type EmailProviderConfig } from "../platformCommunicationService";

let smtpReady = false;
let lastSmtpCheckAt = 0;
const SMTP_RECHECK_MS = 5 * 60 * 1000;

export type EmailServiceStatus = {
  configured: boolean;
  enabled: boolean;
  ready: boolean;
  state: "disabled" | "configuration_required" | "authentication_failed" | "ready" | "platform_control_required";
  lastCheckedAt: number | null;
};

export function getEmailServiceStatus(): EmailServiceStatus {
  // Credentials and enablement are platform-owned. This synchronous legacy status
  // intentionally never claims readiness based on environment variables alone.
  return { configured: false, enabled: false, ready: false, state: "platform_control_required", lastCheckedAt: lastSmtpCheckAt || null };
}

function buildTransporter(config: EmailProviderConfig | null) {
  if (!config?.host || !config.user || !config.password || !config.from) return null;
  const port = Number(config.port || 587);
  return nodemailer.createTransport({ host: config.host, port, secure: String(config.secure) === "true" || port === 465, auth: { user: config.user, pass: config.password } });
}

export async function initializeEmailService() {
  console.log("[Email] Platform communication control is required; SMTP verification and sends are skipped at startup.");
  return false;
}

/**
 * Returns true only after a recent SMTP verification succeeds. Outbound workflows
 * must fail closed rather than pretending an email was delivered.
 */
export async function isEmailServiceReady() {
  const [decision, setting] = await Promise.all([getPlatformDispatchDecision("email"), getPlatformChannel("email")]);
  lastSmtpCheckAt = Date.now();
  smtpReady = Boolean(decision.allowed && setting?.lastVerifiedAt);
  return smtpReady;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    if (!await isEmailServiceReady()) {
      await addPlatformCommunicationAudit({ channel: "email", action: "automated_send", result: "blocked", metadata: { reason: "platform_control" } });
      return { success: false, message: "Email sending is disabled by the platform communication control." };
    }
    const config = await getDecryptedPlatformConfig<EmailProviderConfig>("email");
    const transporter = buildTransporter(config);
    if (!transporter) {
      await addPlatformCommunicationAudit({ channel: "email", action: "automated_send", result: "blocked", metadata: { reason: "configuration_incomplete" } });
      return { success: false, message: "Email configuration is incomplete." };
    }

    const fromName = config?.fromName?.trim();
    const fromAddress = config!.from!;
    const result = await transporter.sendMail({
      from: fromName ? `"${fromName.replace(/["\r\n]/g, "").slice(0, 120)}" <${fromAddress}>` : fromAddress,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, ""),
    });

    await updatePlatformChannel({ channel: "email", lastSuccessfulSendAt: true });
    await addPlatformCommunicationAudit({ channel: "email", action: "automated_send", result: "success" });
    console.log("[Email] Outbound email accepted by SMTP transport");
    return { success: true, messageId: result.messageId };
  } catch (error) {
    await addPlatformCommunicationAudit({ channel: "email", action: "automated_send", result: "failed", metadata: { reason: "smtp_send_failed" } });
    console.error("[Email] Outbound email delivery attempt failed:", error);
    return { success: false, error };
  }
}

export async function sendBulkEmail(emails: string[], subject: string, html: string) {
  const results = await Promise.all(
    emails.map((email) => sendEmail({ to: email, subject, html }))
  );
  return results;
}
