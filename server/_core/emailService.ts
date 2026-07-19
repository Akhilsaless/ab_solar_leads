import nodemailer from "nodemailer";

async function verifySmtp() {
  try {
    const transporter = getTransporter();
    if (!transporter) return false;
    await transporter.verify();
    console.log("[Email] SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error);
    return false;
  }
}

function getTransporter() {
  // Always create fresh transporter so env var changes are picked up
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
  const emailPort = parseInt(process.env.EMAIL_PORT || "587");

  if (!emailUser || !emailPassword) {
    console.warn("[Email] Email credentials not configured. Emails will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

export async function initializeEmailService() {
  return await verifySmtp();
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
    const transporter = getTransporter();
    if (!transporter) {
      console.warn(`[Email] Skipping email to ${to} - credentials not configured`);
      return { success: false, message: "Email service not configured" };
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: html || text,
      text: text || html?.replace(/<[^>]*>/g, ""),
    });

    console.log(`[Email] ✓ Sent to ${to}: ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[Email] ✗ Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
}

export async function sendBulkEmail(emails: string[], subject: string, html: string) {
  const results = await Promise.all(
    emails.map((email) => sendEmail({ to: email, subject, html }))
  );
  return results;
}
