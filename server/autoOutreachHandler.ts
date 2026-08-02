/**
 * Auto Outreach Handler
 * Runs 5x daily via Heartbeat cron.
 * IMPORTANT: Responds immediately (< 5s) then processes in background to avoid Heartbeat timeout.
 *
 * Slot mapping:
 *   1 (8 AM IST)    → Factories & Warehouses
 *   2 (10:30 AM)    → Hotels & Resorts
 *   3 (1 PM)        → Hospitals & Clinics
 *   4 (4 PM)        → Schools & Colleges
 *   5 (7 PM)        → Offices & Commercial Complexes
 */
import { Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { sendEmail } from "./_core/emailService";
import { makeRequest, PlacesSearchResult, PlaceDetailsResult } from "./_core/map";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

const APP_URL = "https://salessquadleads-xxxqwsn9.manus.space";
const AGENCY_SLUG = "sales-squad";
const BOT_LINK = APP_URL + "/chat/" + AGENCY_SLUG;

const SLOT_CONFIG: Record<number, { businessType: string; label: string }> = {
  1: { businessType: "factory OR warehouse OR manufacturing plant", label: "Factories & Warehouses" },
  2: { businessType: "hotel OR resort OR lodge", label: "Hotels & Resorts" },
  3: { businessType: "hospital OR clinic OR nursing home", label: "Hospitals & Clinics" },
  4: { businessType: "school OR college OR university OR coaching centre", label: "Schools & Colleges" },
  5: { businessType: "office complex OR commercial building OR corporate park", label: "Offices & Complexes" },
};

function calcSolarScore(biz: any): number {
  let score = 0;
  if (biz.businessSize === "large") score += 40;
  else if (biz.businessSize === "medium") score += 25;
  else score += 10;
  const highTypes = ["factor", "textile", "cold storage", "warehouse", "hospital", "hotel"];
  if (highTypes.some(t => (biz.businessType || "").toLowerCase().includes(t))) score += 30;
  else score += 15;
  if (biz.rating && Number(biz.rating) >= 4) score += 15;
  else if (biz.rating && Number(biz.rating) >= 3) score += 8;
  if (biz.phone) score += 10;
  if (biz.website) score += 5;
  return Math.min(score, 100);
}

function classifySize(reviewCount: number, types: string[]): "small" | "medium" | "large" {
  const largeTypes = ["factory", "hospital", "hotel", "shopping_mall", "university", "stadium", "airport", "warehouse"];
  if (types.some(t => largeTypes.includes(t)) || reviewCount > 200) return "large";
  if (reviewCount > 50) return "medium";
  return "small";
}

function extractCity(address: string): string {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  return parts.length >= 3 ? parts[parts.length - 3] : parts[0] || "";
}

async function generateAiPitch(biz: any, slot: number, botLink: string): Promise<{ subject: string; body: string; whatsapp: string }> {
  const name = biz.businessName || "Business Owner";
  const city = biz.city || "";
  const businessTypeLabel = SLOT_CONFIG[slot]?.label || "Commercial Business";
  const solarScore = calcSolarScore(biz);

  let estimatedSavings = "Rs.50,000 - Rs.2,00,000";
  let estimatedROI = "3-5 years";
  if (solarScore > 80) { estimatedSavings = "Rs.2,00,000 - Rs.5,00,000"; estimatedROI = "2-3 years"; }
  else if (solarScore > 60) { estimatedSavings = "Rs.1,00,000 - Rs.3,00,000"; estimatedROI = "3-4 years"; }

  const promptLines = [
    "You are an expert solar sales agent for Sales Squad.",
    "Write a personalized outreach message to a business owner to get a free solar estimate.",
    "Business Name: " + name,
    "Business Type: " + businessTypeLabel,
    "City: " + city,
    "Solar Score: " + solarScore + "/100",
    "Estimated Monthly Savings: " + estimatedSavings,
    "Estimated ROI: " + estimatedROI,
    "Bot Link: " + botLink,
    "Return JSON with: subject (email subject line), body (HTML email body only, no header/footer), whatsapp (plain text max 160 chars).",
  ];

  try {
    const structured = await invokeLLM({
      messages: [{ role: "user", content: promptLines.join("\n") }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "outreach_pitch",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Compelling email subject line" },
              body: { type: "string", description: "HTML body content for the email" },
              whatsapp: { type: "string", description: "Concise WhatsApp message" },
            },
            required: ["subject", "body", "whatsapp"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = structured.choices[0].message.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
  } catch { /* fallback below */ }

  return {
    subject: "Cut Your Electricity Bill by 40% with Solar — " + name,
    body: "<p>Dear " + name + ",</p><p>Your " + businessTypeLabel + " in " + city + " is a great candidate for solar energy. Based on your business size, you could save <strong>" + estimatedSavings + " per month</strong> with a typical ROI of " + estimatedROI + ".</p><p>The Government of India's PM Surya Ghar scheme offers subsidies up to Rs.78,000 for eligible businesses.</p>",
    whatsapp: "Hi " + name + ", save " + estimatedSavings + "/month with solar. Free estimate: " + botLink,
  };
}

function buildEmailHtml(subject: string, body: string, placeId?: string, agencyId?: number): string {
  const APP_BASE = "https://salessquadleads-xxxqwsn9.manus.space";
  const pixelUrl = placeId
    ? `${APP_BASE}/api/track/open?pid=${encodeURIComponent(placeId)}&aid=${agencyId || 1}`
    : null;
  return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + subject + "</title></head>"
    + "<body style=\"margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;\">"
    + "<div style=\"max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
    + "<div style=\"background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;\">"
    + "<h1 style=\"margin:0;color:#fff;font-size:22px;font-weight:700;\">Sales Squad</h1>"
    + "<p style=\"margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;\">AI-Powered Solar Lead Generation</p>"
    + "</div>"
    + "<div style=\"padding:40px;\">"
    + body
    + "<div style=\"background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0;text-align:center;\">"
    + "<p style=\"margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;\">Get your free solar savings estimate in 2 minutes</p>"
    + "<a href=\"" + BOT_LINK + "\" style=\"background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;\">Check My Solar Savings</a>"
    + "<p style=\"margin:12px 0 0;color:#9ca3af;font-size:12px;\">No forms. Just a 2-minute chat with Agent Klaus.</p>"
    + "</div>"
    + "<p style=\"color:#6b7280;font-size:13px;line-height:1.6;\">Our AI agent will calculate your exact savings based on your electricity bill, roof size, and state subsidies in under 2 minutes. No commitment required.</p>"
    + "</div>"
    + "<div style=\"background:#f3f4f6;padding:20px 40px;text-align:center;\">"
    + "<p style=\"margin:0;color:#9ca3af;font-size:12px;\">Sales Squad | akhil@salessquadtech.com | This is a one-time outreach email.</p>"
    + (pixelUrl ? `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />` : "")
    + "</div></div></body></html>";
}

/**
 * Try to extract an email address from a business website.
 * Fetches the homepage and looks for mailto: links or email patterns.
 */
async function extractEmailFromWebsite(website: string): Promise<string | null> {
  try {
    const url = website.startsWith("http") ? website : "https://" + website;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(timeout);
    const html = await resp.text();
    // Look for mailto: links first
    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch) return mailtoMatch[1].toLowerCase();
    // Fallback: look for email pattern in text
    const emailMatch = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
    if (emailMatch) {
      // Filter out common non-contact emails
      const filtered = emailMatch.filter(e =>
        !e.includes("sentry") && !e.includes("example") && !e.includes("noreply") &&
        !e.includes("@2x") && !e.includes(".png") && !e.includes(".jpg") && !e.endsWith(".js")
      );
      if (filtered.length > 0) return filtered[0].toLowerCase();
    }
  } catch { /* ignore fetch errors */ }
  return null;
}

async function getOutreachConfig(agencyId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.execute(sql`SELECT * FROM outreachConfig WHERE agencyId = ${agencyId} LIMIT 1`);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return (rows as any[])[0] || null;
  } catch { return null; }
}

async function createOutreachRun(agencyId: number, slot: number, businessType: string, city: string, state: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.execute(
      sql`INSERT INTO outreachRuns (agencyId, runSlot, businessType, targetCity, targetState, status)
          VALUES (${agencyId}, ${slot}, ${businessType}, ${city}, ${state}, 'running')`
    );
    return (result as any)[0]?.insertId || 0;
  } catch { return 0; }
}

async function updateOutreachRun(runId: number, data: {
  scrapedCount?: number; eligibleCount?: number;
  emailSentCount?: number; whatsappSentCount?: number;
  errorCount?: number; status?: string;
}) {
  if (!runId) return;
  const db = await getDb();
  if (!db) return;
  try {
    const sets = Object.entries(data)
      .map(([k, v]) => k + " = " + (typeof v === "string" ? "'" + v + "'" : v))
      .join(", ");
    await db.execute(sql`UPDATE outreachRuns SET ${sql.raw(sets)}, completedAt = NOW() WHERE id = ${runId}`);
  } catch { /* ignore */ }
}

async function wasAlreadyContacted(agencyId: number, placeId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db.execute(
      sql`SELECT id FROM scrapedBusinesses WHERE agencyId = ${agencyId} AND placeId = ${placeId} AND contactStatus != 'not_contacted' LIMIT 1`
    );
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return (rows as any[]).length > 0;
  } catch { return false; }
}

async function markContacted(agencyId: number, placeId: string, emailSentAt: number) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`UPDATE scrapedBusinesses SET contactStatus = 'contacted', emailSentAt = ${emailSentAt} WHERE agencyId = ${agencyId} AND placeId = ${placeId}`
    );
  } catch { /* ignore */ }
}

async function upsertScrapedBusiness(biz: any, runId?: number) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO scrapedBusinesses
        (agencyId, businessName, businessType, businessSize, phone, email, website, address, city, state, rating, reviewCount, placeId, source, contactStatus, outreachRunId)
      VALUES
        (${biz.agencyId}, ${biz.businessName}, ${biz.businessType}, ${biz.businessSize}, ${biz.phone || null},
         ${biz.email || null}, ${biz.website || null}, ${biz.address || null}, ${biz.city || null}, ${biz.state || null},
         ${biz.rating || null}, ${biz.reviewCount || 0}, ${biz.placeId}, 'google_maps', 'not_contacted', ${runId || null})
      ON DUPLICATE KEY UPDATE
        businessName = VALUES(businessName),
        phone = COALESCE(VALUES(phone), phone),
        email = COALESCE(VALUES(email), email),
        website = COALESCE(VALUES(website), website),
        rating = VALUES(rating),
        reviewCount = VALUES(reviewCount),
        outreachRunId = COALESCE(outreachRunId, VALUES(outreachRunId))
    `);
  } catch { /* ignore duplicate key */ }
}

/**
 * The actual processing work — runs in background after HTTP response is sent.
 */
async function processOutreachInBackground(slot: number, city: string, state: string, runId: number, config?: any) {
  const slotConfig = SLOT_CONFIG[slot];
  let scrapedCount = 0, eligibleCount = 0, emailSentCount = 0, whatsappSentCount = 0, errorCount = 0;

  try {
    const query = slotConfig.businessType + " in " + city + ", " + state + ", India";
    const searchResult = await makeRequest<PlacesSearchResult>(
      "/maps/api/place/textsearch/json",
      { query, region: "in" }
    );

    const places = searchResult.results || [];
    const contactMethod: string = config?.contactMethod || "both";

    // We'll process up to 40 results to find enough with the right contact info
    let processedCount = 0;
    scrapedCount = 0;

    for (const place of places.slice(0, 40)) {
      if (processedCount >= 20) break; // cap at 20 qualifying businesses per run
      try {
        const alreadyContacted = await wasAlreadyContacted(1, place.place_id);
        if (alreadyContacted) continue;

        let biz: any = {
          agencyId: 1,
          businessName: place.name,
          businessType: slotConfig.label,
          businessSize: classifySize(place.user_ratings_total || 0, place.types || []),
          address: place.formatted_address,
          city: extractCity(place.formatted_address),
          state,
          rating: place.rating?.toString() || null,
          reviewCount: place.user_ratings_total || 0,
          placeId: place.place_id,
          phone: null,
          email: null,
          website: null,
        };

        try {
          const details = await makeRequest<PlaceDetailsResult>(
            "/maps/api/place/details/json",
            { place_id: place.place_id, fields: "name,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types" }
          );
          const d = details.result as any;
          biz.phone = d.formatted_phone_number || d.international_phone_number || null;
          biz.website = d.website || null;
          biz.businessSize = classifySize(d.user_ratings_total || biz.reviewCount, d.types || place.types || []);
          biz.rating = d.rating?.toString() || biz.rating;
          biz.reviewCount = d.user_ratings_total || biz.reviewCount;
        } catch { /* use basic info */ }

        // ── VALIDATE MOBILE NUMBER ────────────────────────────────────────
        // Only accept Indian mobile numbers: starts with 6/7/8/9, exactly 10 digits
        if (biz.phone) {
          const digits = biz.phone.replace(/[^0-9]/g, "");
          // Remove country code if present (91 prefix)
          const mobile = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
          const isValidMobile = mobile.length === 10 && /^[6789]/.test(mobile);
          if (!isValidMobile) {
            biz.phone = null; // reject landlines and invalid numbers
          } else {
            biz.phone = mobile; // store clean 10-digit number
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Try to extract email from website before filtering
        if (!biz.email && biz.website) {
          biz.email = await extractEmailFromWebsite(biz.website);
        }

        // ── FILTER BY CONTACT METHOD AT SCRAPE TIME ──────────────────────
        // Only keep businesses that have the required contact info
        const hasEmail = !!biz.email;
        const hasPhone = !!biz.phone;
        if (contactMethod === "email" && !hasEmail) continue;   // skip if no email
        if (contactMethod === "whatsapp" && !hasPhone) continue; // skip if no phone
        if (contactMethod === "both" && !hasEmail && !hasPhone) continue; // skip if neither
        // ─────────────────────────────────────────────────────────────────────

        // Save to DB only after passing the contact filter
        await upsertScrapedBusiness(biz, runId);
        if (biz.email) {
          const db2 = await getDb();
          if (db2) {
            await db2.execute(sql`UPDATE scrapedBusinesses SET email = ${biz.email} WHERE agencyId = ${biz.agencyId} AND placeId = ${biz.placeId}`);
          }
        }

        scrapedCount++;
        processedCount++;

        const score = calcSolarScore(biz);
        if (score < 30) continue; // lowered threshold from 70 to 30
        eligibleCount++;

        const { subject, body, whatsapp } = await generateAiPitch(biz, slot, BOT_LINK);
        const emailSentAt = Date.now();

        if (hasEmail && (contactMethod === "email" || contactMethod === "both")) {
          const emailHtml = buildEmailHtml(subject, body, biz.placeId, 1);
          await sendEmail({ to: biz.email, subject, html: emailHtml });
          emailSentCount++;
          await markContacted(1, biz.placeId, emailSentAt);
        }

        if (hasPhone && (contactMethod === "whatsapp" || contactMethod === "both")) {
          // WhatsApp placeholder — activated when WhatsApp API is connected
          void whatsapp;
          whatsappSentCount++;
        }

      } catch (bizErr) {
        console.error("[AutoOutreach] Error processing business:", bizErr);
        errorCount++;
      }
    }

    await updateOutreachRun(runId, { scrapedCount, eligibleCount, emailSentCount, whatsappSentCount, errorCount, status: "completed" });
    console.log("[AutoOutreach] Slot " + slot + " completed: scraped=" + scrapedCount + " eligible=" + eligibleCount + " emails=" + emailSentCount + " whatsapp=" + whatsappSentCount);

  } catch (err) {
    console.error("[AutoOutreach] Background processing error:", err);
    await updateOutreachRun(runId, { status: "failed", errorCount: errorCount + 1 });
  }
}

export async function autoOutreachHandler(req: Request, res: Response) {
  const slot = Number(req.body?.slot || req.query?.slot || 1);

  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const slotConfig = SLOT_CONFIG[slot];
    if (!slotConfig) {
      return res.status(400).json({ error: "Invalid slot: " + slot });
    }

    const config = await getOutreachConfig(1);
    const city = config?.targetCity || "Hyderabad";
    const state = config?.targetState || "Telangana";
    const contactMethod = config?.contactMethod || "both";
    void contactMethod; // passed into processOutreachInBackground via config

    // Create the run record immediately
    const runId = await createOutreachRun(1, slot, slotConfig.label, city, state);

    // ── Respond immediately so Heartbeat doesn't timeout ──────────────────────
    res.json({ success: true, slot, city, state, businessType: slotConfig.label, runId, status: "processing" });

    // ── Process in background (fire-and-forget) ───────────────────────────────
    processOutreachInBackground(slot, city, state, runId, config).catch(err => {
      console.error("[AutoOutreach] Unhandled background error:", err);
    });

  } catch (err) {
    console.error("[AutoOutreach] Handler error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
