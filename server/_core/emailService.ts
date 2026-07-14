import nodemailer from "nodemailer";

let transporter: any = null;

let smtpVerified: boolean | null = null;

async function verifySmtp() {
  if (smtpVerified !== null) return smtpVerified;
  
  try {
    const transporter = getTransporter();
    if (!transporter) {
      smtpVerified = false;
      return false;
    }
    
    await transporter.verify();
    console.log("[Email] SMTP connection verified successfully");
    smtpVerified = true;
    return true;
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error);
    smtpVerified = false;
    return false;
  }
}

function getTransporter() {
  if (!transporter) {
    // Use environment variables for email configuration
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
    const emailPort = parseInt(process.env.EMAIL_PORT || "587");

    if (!emailUser || !emailPassword) {
      console.warn("[Email] Email credentials not configured. Emails will not be sent.");
      return null;
    }

    transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  return transporter;
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
