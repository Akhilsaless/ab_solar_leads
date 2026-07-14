/**
 * Follow-up Email Scheduler — Level 3 Feature
 * Sends automated follow-up emails to unconverted leads:
 * - 24h follow-up: "Still thinking about solar?"
 * - 72h follow-up: "Last chance — limited subsidy slots"
 */
import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { sendEmail } from "./_core/emailService";
import * as db from "./db";

function build24hEmailHtml(conv: any): string {
  const name = conv.customerName || "there";
  const agencyName = conv.agencyName || "AB Solar";
  const brandColor = conv.brandColor || "#F97316";
  const agencyEmail = conv.agencyEmail || "";
  const agencyPhone = conv.agencyPhone || "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Still thinking about solar?</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:${brandColor};padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;">${agencyName}</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#111;">Hi ${name}, still thinking about solar? ☀️</h2>
      <p style="color:#555;line-height:1.6;">You chatted with our solar advisor yesterday. We wanted to follow up — do you have any questions we can answer?</p>
      <ul style="color:#555;line-height:1.8;">
        <li>PM Surya Ghar Muft Bijli Yojana subsidies still available</li>
        <li>Electricity rates rising 5–8% every year</li>
        <li>Solar panels pay for themselves in 4–6 years</li>
      </ul>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://wa.me/${agencyPhone.replace(/[^0-9]/g, '')}"
           style="background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
          Chat With Us on WhatsApp
        </a>
      </div>
      <p style="color:#888;font-size:13px;">Questions? Reply to this email or call us at ${agencyPhone || "our office"}.</p>
    </div>
    <div style="background:#f3f4f6;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${agencyName} | ${agencyEmail}</p>
    </div>
  </div>
</body></html>`;
}

function build72hEmailHtml(conv: any): string {
  const name = conv.customerName || "there";
  const agencyName = conv.agencyName || "AB Solar";
  const brandColor = conv.brandColor || "#F97316";
  const agencyEmail = conv.agencyEmail || "";
  const agencyPhone = conv.agencyPhone || "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Limited subsidy slots remaining</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:${brandColor};padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:24px;">${agencyName}</h1>
    </div>
    <div style="padding:40px;">
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-weight:600;">⚠️ Subsidy slots are filling up fast this quarter</p>
      </div>
      <h2 style="color:#111;">Hi ${name}, one last note from us 🌟</h2>
      <p style="color:#555;line-height:1.6;">Three days ago you showed interest in going solar. Don't miss the current government subsidy window.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:0 0 24px;">
        <p style="margin:0 0 8px;color:#166534;font-weight:700;">Current PM Surya Ghar Subsidies:</p>
        <ul style="margin:0;padding-left:20px;color:#166534;line-height:1.8;">
          <li>1 kW system: ₹30,000 subsidy</li>
          <li>2 kW system: ₹60,000 subsidy</li>
          <li>3 kW+ system: ₹78,000 subsidy</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://wa.me/${agencyPhone.replace(/[^0-9]/g, '')}"
           style="background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
          Book a Free Consultation
        </a>
      </div>
      <p style="color:#888;font-size:13px;">This is our final follow-up. No more emails after this — we respect your inbox!</p>
    </div>
    <div style="background:#f3f4f6;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${agencyName} | ${agencyEmail}</p>
    </div>
  </div>
</body></html>`;
}

export async function followUpEmailsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
    let sent24 = 0, sent72 = 0, errors = 0;

    // 24-hour follow-ups
    try {
      const leads24 = await db.getUnconvertedLeadsForFollowUp(24, "followUp24Sent");
      for (const conv of leads24) {
        try {
          if (!conv.customerEmail) { errors++; continue; }
          const html = build24hEmailHtml(conv);
          const result = await sendEmail({
            to: conv.customerEmail as string,
            subject: `${conv.customerName ? conv.customerName + ", still" : "Still"} thinking about solar? ☀️`,
            html,
          });
          if (result.success) {
            await db.markFollowUpSent(conv.sessionId, "followUp24Sent");
            sent24++;
          } else { errors++; }
        } catch (e) { errors++; console.error("[FollowUp] 24h error:", e); }
      }
    } catch (e) { console.error("[FollowUp] 24h fetch error:", e); }

    // 72-hour follow-ups
    try {
      const leads72 = await db.getUnconvertedLeadsForFollowUp(72, "followUp72Sent");
      for (const conv of leads72) {
        try {
          if (!conv.customerEmail) { errors++; continue; }
          const html = build72hEmailHtml(conv);
          const result = await sendEmail({
            to: conv.customerEmail as string,
            subject: `Limited subsidy slots remaining — act before they're gone`,
            html,
          });
          if (result.success) {
            await db.markFollowUpSent(conv.sessionId, "followUp72Sent");
            sent72++;
          } else { errors++; }
        } catch (e) { errors++; console.error("[FollowUp] 72h error:", e); }
      }
    } catch (e) { console.error("[FollowUp] 72h fetch error:", e); }

    return res.json({ ok: true, sent24, sent72, errors, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[FollowUp] Handler error:", err);
    return res.status(500).json({
      error: err?.message || "Unknown error",
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
