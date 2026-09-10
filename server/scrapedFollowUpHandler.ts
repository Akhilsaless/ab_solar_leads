/**
 * Scraped Business Follow-Up Email Handler
 * Runs daily via Heartbeat cron.
 * Sends follow-up emails to scraped businesses that were contacted but haven't responded.
 *
 * Day 3: "Still thinking about solar?" follow-up
 * Day 7: "Last chance — free estimate expires" final follow-up
 */
import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { sendEmail } from "./_core/emailService";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { ENV } from "./_core/env";

const APP_URL = ENV.publicAppUrl;
const AGENCY_SLUG = ENV.defaultAgencySlug;
const BOT_LINK = APP_URL + "/chat/" + AGENCY_SLUG;

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function buildDay3Email(businessName: string, businessType: string): string {
  const name = businessName || "Business Owner";
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Following up on your solar estimate</title></head>"
    + "<body style=\"margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;\">"
    + "<div style=\"max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
    + "<div style=\"background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;\">"
    + "<h1 style=\"margin:0;color:#fff;font-size:22px;font-weight:700;\">Sales Squad</h1>"
    + "<p style=\"margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;\">AI-Powered Solar Lead Generation</p>"
    + "</div>"
    + "<div style=\"padding:40px;\">"
    + "<p style=\"color:#374151;font-size:15px;line-height:1.7;\">Hi " + name + ",</p>"
    + "<p style=\"color:#374151;font-size:15px;line-height:1.7;\">We reached out a few days ago about a preliminary solar assessment for your " + (businessType || "business") + ". Any savings or system recommendation depends on bill review, site assessment, and final system design.</p>"
    + "<p style=\"color:#374151;font-size:15px;line-height:1.7;\">Our estimate assistant can collect the starting details for a preliminary assessment. It does not promise a price, savings outcome, or subsidy eligibility.</p>"
    + "<div style=\"background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0;text-align:center;\">"
    + "<p style=\"margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;\">Check how much you can save</p>"
    + "<a href=\"" + BOT_LINK + "\" style=\"background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;\">Get My Free Solar Estimate</a>"
    + "</div>"
    + "<p style=\"color:#6b7280;font-size:13px;line-height:1.6;\">Takes 2 minutes. No commitment required.</p>"
    + "</div>"
    + "<div style=\"background:#f3f4f6;padding:20px 40px;text-align:center;\">"
    + "<p style=\"margin:0;color:#9ca3af;font-size:12px;\">Sales Squad | akhil@salessquadtech.com</p>"
    + "</div></div></body></html>";
}

function buildDay7Email(businessName: string, businessType: string): string {
  const name = businessName || "Business Owner";
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Last email from Sales Squad</title></head>"
    + "<body style=\"margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;\">"
    + "<div style=\"max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
    + "<div style=\"background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;\">"
    + "<h1 style=\"margin:0;color:#fff;font-size:22px;font-weight:700;\">Sales Squad</h1>"
    + "<p style=\"margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;\">AI-Powered Solar Lead Generation</p>"
    + "</div>"
    + "<div style=\"padding:40px;\">"
    + "<p style=\"color:#374151;font-size:15px;line-height:1.7;\">Hi " + name + ",</p>"
    + "<p style=\"color:#374151;font-size:15px;line-height:1.7;\">This is our last email to you about solar for your " + (businessType || "business") + ". We don't want to keep sending emails you don't want.</p>"
    + "<p style=\"color:#374151;font-size:15px;line-height:1.7;\">If you ever want a preliminary assessment for your " + (businessType || "business") + ", the estimate assistant remains available. Any pricing, savings, tax treatment, or eligibility requires bill review, site assessment, and installer confirmation.</p>"
    + "<div style=\"background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0;text-align:center;\">"
    + "<p style=\"margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;\">One last chance — free solar estimate</p>"
    + "<a href=\"" + BOT_LINK + "\" style=\"background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;\">Get My Free Estimate</a>"
    + "</div>"
    + "<p style=\"color:#6b7280;font-size:13px;line-height:1.6;\">We won't email you again after this. Thank you for your time.</p>"
    + "</div>"
    + "<div style=\"background:#f3f4f6;padding:20px 40px;text-align:center;\">"
    + "<p style=\"margin:0;color:#9ca3af;font-size:12px;\">Sales Squad | akhil@salessquadtech.com</p>"
    + "</div></div></body></html>";
}

export async function scrapedFollowUpHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const now = Date.now();
    let day3Sent = 0, day7Sent = 0, errors = 0;

    // ── Day 3 follow-ups ──────────────────────────────────────────────────────
    const day3Cutoff = now - THREE_DAYS_MS;
    const day3Result = await db.execute(sql`
      SELECT sb.id, sb.agencyId, sb.businessName, sb.businessType, sb.email, sb.emailSentAt
      FROM scrapedBusinesses sb
      INNER JOIN agencyFeatureControls afc ON afc.agencyId = sb.agencyId
      WHERE sb.contactStatus = 'contacted'
        AND sb.email IS NOT NULL
        AND sb.emailSentAt IS NOT NULL
        AND sb.emailSentAt <= ${day3Cutoff}
        AND (sb.followUp3dSent IS NULL OR sb.followUp3dSent = 0)
        AND afc.emailAutomationEnabled = 1
        AND afc.scheduledFollowUpsEnabled = 1
      LIMIT 50
    `);
    const day3Rows = Array.isArray(day3Result) && Array.isArray(day3Result[0]) ? day3Result[0] : day3Result;

    for (const biz of day3Rows as any[]) {
      try {
        const delivery = await sendEmail({
          to: biz.email,
          subject: "Still thinking about solar? — " + (biz.businessName || "Your Business"),
          html: buildDay3Email(biz.businessName, biz.businessType),
        });
        if (delivery.success) {
          await db.execute(sql`UPDATE scrapedBusinesses SET followUp3dSent = ${now} WHERE id = ${biz.id} AND agencyId = ${biz.agencyId}`);
          day3Sent++;
        } else errors++;
      } catch (e) {
        console.error("Day3 followup error for biz", biz.id, e);
        errors++;
      }
    }

    // ── Day 7 follow-ups ──────────────────────────────────────────────────────
    const day7Cutoff = now - SEVEN_DAYS_MS;
    const day7Result = await db.execute(sql`
      SELECT sb.id, sb.agencyId, sb.businessName, sb.businessType, sb.email, sb.emailSentAt
      FROM scrapedBusinesses sb
      INNER JOIN agencyFeatureControls afc ON afc.agencyId = sb.agencyId
      WHERE sb.contactStatus = 'contacted'
        AND sb.email IS NOT NULL
        AND sb.emailSentAt IS NOT NULL
        AND sb.emailSentAt <= ${day7Cutoff}
        AND sb.followUp3dSent IS NOT NULL
        AND sb.followUp3dSent > 0
        AND (sb.followUp7dSent IS NULL OR sb.followUp7dSent = 0)
        AND afc.emailAutomationEnabled = 1
        AND afc.scheduledFollowUpsEnabled = 1
      LIMIT 50
    `);
    const day7Rows = Array.isArray(day7Result) && Array.isArray(day7Result[0]) ? day7Result[0] : day7Result;

    for (const biz of day7Rows as any[]) {
      try {
        const delivery = await sendEmail({
          to: biz.email,
          subject: "Last email from Sales Squad — " + (biz.businessName || "Your Business"),
          html: buildDay7Email(biz.businessName, biz.businessType),
        });
        if (delivery.success) {
          await db.execute(sql`UPDATE scrapedBusinesses SET followUp7dSent = ${now} WHERE id = ${biz.id} AND agencyId = ${biz.agencyId}`);
          day7Sent++;
        } else errors++;
      } catch (e) {
        console.error("Day7 followup error for biz", biz.id, e);
        errors++;
      }
    }

    return res.json({ success: true, day3Sent, day7Sent, errors });

  } catch (err) {
    console.error("scrapedFollowUpHandler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
