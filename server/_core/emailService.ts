import nodemailer from "nodemailer";

let smtpReady = false;
let lastSmtpCheckAt = 0;
const SMTP_RECHECK_MS = 5 * 60 * 1000;

export type EmailServiceStatus = {
  configured: boolean;
  enabled: boolean;
  ready: boolean;
  state: "disabled" | "configuration_required" | "authentication_failed" | "ready";
  lastCheckedAt: number | null;
};

function isExplicitlyEnabled() {
  return process.env.EMAIL_SENDING_ENABLED === "true";
}

function hasRequiredConfiguration() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.EMAIL_FROM);
}

export function getEmailServiceStatus(): EmailServiceStatus {
  const configured = hasRequiredConfiguration();
  const enabled = isExplicitlyEnabled();
  const state = !enabled
    ? "disabled"
    : !configured
      ? "configuration_required"
      : smtpReady
        ? "ready"
        : "authentication_failed";
  return { configured, enabled, ready: enabled && smtpReady, state, lastCheckedAt: lastSmtpCheckAt || null };
}

async function verifySmtp() {
  lastSmtpCheckAt = Date.now();
  if (!isExplicitlyEnabled()) {
    smtpReady = false;
    return false;
  }
  try {
    const transporter = getTransporter();
    if (!transporter) {
      smtpReady = false;
      return false;
    }
    await transporter.verify();
    smtpReady = true;
    console.log("[Email] SMTP connection verified successfully");
    return true;
  } catch (error) {
    smtpReady = false;
    console.error("[Email] SMTP verification failed:", error);
    return false;
  }
}

function getTransporter() {
  // Always create fresh transporter so server-side secret changes are picked up.
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = parseInt(process.env.EMAIL_PORT || "587");

  if (!emailUser || !emailPassword || !emailHost || !process.env.EMAIL_FROM) {
    console.warn("[Email] Required SMTP configuration is incomplete. Emails remain disabled.");
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: process.env.EMAIL_SECURE === "true" || emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

export async function initializeEmailService() {
  if (!isExplicitlyEnabled()) {
    console.log("[Email] Sending is explicitly disabled. SMTP verification skipped.");
    return false;
  }
  return verifySmtp();
}

/**
 * Returns true only after a recent SMTP verification succeeds. Outbound workflows
 * must fail closed rather than pretending an email was delivered.
 */
export async function isEmailServiceReady() {
  if (!isExplicitlyEnabled()) return false;
  if (Date.now() - lastSmtpCheckAt > SMTP_RECHECK_MS) {
    await verifySmtp();
  }
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
    if (!isExplicitlyEnabled()) {
      return { success: false, message: "Email sending is disabled by configuration" };
    }
    if (!await isEmailServiceReady()) {
      console.warn("[Email] Skipping outbound email because SMTP is not verified");
      return { success: false, message: "Email service is not verified" };
    }
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[Email] Skipping outbound email because SMTP configuration is incomplete");
      return { success: false, message: "Email service not configured" };
    }

    const fromName = process.env.EMAIL_FROM_NAME?.trim();
    const fromAddress = process.env.EMAIL_FROM!;
    const result = await transporter.sendMail({
      from: fromName ? `"${fromName.replace(/["\r\n]/g, "").slice(0, 120)}" <${fromAddress}>` : fromAddress,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, ""),
    });

    console.log("[Email] Outbound email accepted by SMTP transport");
    return { success: true, messageId: result.messageId };
  } catch (error) {
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
