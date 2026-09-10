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
import { isEmailServiceReady, sendEmail } from "./_core/emailService";
import { makeRequest, PlacesSearchResult, PlaceDetailsResult } from "./_core/map";
import { sql } from "drizzle-orm";
import { getDb, isAgencyFeatureEnabled } from "./db";
import { ENV } from "./_core/env";

const APP_URL = ENV.publicAppUrl;
const AGENCY_SLUG = ENV.defaultAgencySlug;
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

  const promptLines = [
    "You are an expert solar sales agent for Sales Squad.",
    "Write a short, personalized outreach message to a business owner inviting them to a preliminary solar assessment.",
    "Business Name: " + name,
    "Business Type: " + businessTypeLabel,
    "City: " + city,
    "Solar Score: " + solarScore + "/100",
    "Bot Link: " + botLink,
    "Use careful, truthful language. Do not quote a system price, do not promise savings or ROI, and do not claim a business subsidy.",
    "State that any savings estimate is preliminary and depends on the electricity bill, site survey, system design, and applicable regulations.",
    "If mentioning financial benefits, say GST/input-credit and depreciation treatment must be confirmed by the installer's or customer's tax adviser.",
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
    subject: "Preliminary solar assessment for " + name,
    body: "<p>Hi " + name + ",</p><p>I'm Agent Klaus from Sales Squad. We can prepare a preliminary solar assessment for your " + businessTypeLabel + " in " + city + ". Any savings estimate depends on your bill, site survey and final system design.</p><p>GST/input-credit and depreciation treatment, where applicable, should be confirmed with your installer or tax adviser.</p>",
    whatsapp: "Hi " + name + ", Sales Squad can prepare a preliminary solar assessment after bill review and a site survey. Check your estimate: " + botLink,
  };
}

function buildEmailHtml(subject: string, body: string, placeId?: string, agencyId?: number): string {
  const pixelUrl = placeId
    ? `${APP_URL}/api/track/open?pid=${encodeURIComponent(placeId)}&aid=${agencyId || 1}`
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
    + "<p style=\"color:#6b7280;font-size:13px;line-height:1.6;\">Our AI agent can prepare a preliminary savings projection from the information you provide. Final savings and subsidy eligibility require bill review, site assessment, and installer confirmation.</p>"
    + "</div>"
    + "<div style=\"background:#f3f4f6;padding:20px 40px;text-align:center;\">"
    + "<p style=\"margin:0;color:#9ca3af;font-size:12px;\">— Agent Klaus, Sales Squad | akhil@salessquadtech.com</p>"
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
    const result = await db.execute(sql`SELECT * FROM outreachConfig WHERE agencyId = ${agencyId} ORDER BY id ASC LIMIT 1`);
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    return (rows as any[])[0] || null;
  } catch { return null; }
}

function isConfigEnabled(config: any) {
  return config?.isEnabled === true || config?.isEnabled === 1 || config?.isEnabled === "1";
}

async function isOutreachEnabled(agencyId: number) {
  const [config, emailEnabled, scheduleEnabled] = await Promise.all([
    getOutreachConfig(agencyId),
    isAgencyFeatureEnabled(agencyId, "emailAutomationEnabled"),
    isAgencyFeatureEnabled(agencyId, "scheduledFollowUpsEnabled"),
  ]);
  return isConfigEnabled(config) && emailEnabled && scheduleEnabled;
}

/**
 * Get the current rotation city/state based on rotationIndex.
 * If cityRotation is set, returns the city at rotationIndex % length.
 * Otherwise falls back to targetCity/targetState.
 */
function getRotationCity(config: any): { city: string; state: string } {
  if (config?.cityRotation) {
    try {
      const rotation: Array<{ city: string; state: string }> =
        typeof config.cityRotation === "string"
          ? JSON.parse(config.cityRotation)
          : config.cityRotation;
      if (Array.isArray(rotation) && rotation.length > 0) {
        const idx = (config.rotationIndex || 0) % rotation.length;
        return rotation[idx];
      }
    } catch { /* fall through */ }
  }
  return {
    city: config?.targetCity || "Hyderabad",
    state: config?.targetState || "Telangana",
  };
}

/**
 * Advance the rotation index by 1 (called after slot 5 completes a full day).
 */
async function advanceRotationIndex(agencyId: number, currentIndex: number, rotationLength: number) {
  const db = await getDb();
  if (!db) return;
  try {
    const nextIndex = (currentIndex + 1) % rotationLength;
    await db.execute(sql`UPDATE outreachConfig SET rotationIndex = ${nextIndex} WHERE agencyId = ${agencyId}`);
  } catch { /* ignore */ }
}

function getIstDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

type OutreachRunCreateResult = { id: number; duplicate: boolean };

async function createOutreachRun(agencyId: number, slot: number, businessType: string, city: string, state: string): Promise<OutreachRunCreateResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable for outreach run");
  const scheduledDate = getIstDateKey();
  const runKey = `outreach:${agencyId}:${scheduledDate}:slot:${slot}`;
  try {
    const result = await db.execute(
      sql`INSERT INTO outreachRuns (agencyId, runSlot, runKey, scheduledDate, businessType, targetCity, targetState, status)
          VALUES (${agencyId}, ${slot}, ${runKey}, ${scheduledDate}, ${businessType}, ${city}, ${state}, 'queued')`
    );
    return { id: (result as any)[0]?.insertId || 0, duplicate: false };
  } catch (error: any) {
    if (!String(error?.message || error).toLowerCase().includes("duplicate")) throw error;
    const existing = await db.execute(sql`SELECT id FROM outreachRuns WHERE runKey = ${runKey} LIMIT 1`);
    const rows = Array.isArray(existing) && Array.isArray(existing[0]) ? existing[0] : existing;
    return { id: Number((rows as any[])[0]?.id || 0), duplicate: true };
  }
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
  const agencyId = Number(config?.agencyId || 1);
  let scrapedCount = 0, eligibleCount = 0, emailSentCount = 0, whatsappSentCount = 0, errorCount = 0;

  try {
    if (!await isOutreachEnabled(agencyId)) {
      await updateOutreachRun(runId, { status: "skipped_paused" });
      return;
    }
    if (!await isEmailServiceReady()) {
      await updateOutreachRun(runId, { status: "failed", errorCount: 1 });
      console.error("[AutoOutreach] Aborted because SMTP is not verified");
      return;
    }

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
      if (!await isOutreachEnabled(agencyId)) {
        await updateOutreachRun(runId, { scrapedCount, eligibleCount, emailSentCount, whatsappSentCount, errorCount, status: "skipped_paused" });
        return;
      }
      try {
        const alreadyContacted = await wasAlreadyContacted(agencyId, place.place_id);
        if (alreadyContacted) continue;

        let biz: any = {
          agencyId,
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
          if (!await isOutreachEnabled(agencyId)) {
            await updateOutreachRun(runId, { scrapedCount, eligibleCount, emailSentCount, whatsappSentCount, errorCount, status: "skipped_paused" });
            return;
          }
          const emailHtml = buildEmailHtml(subject, body, biz.placeId, 1);
          const delivery = await sendEmail({ to: biz.email, subject, html: emailHtml });
          if (delivery.success) {
            emailSentCount++;
            await markContacted(agencyId, biz.placeId, emailSentAt);
          } else {
            errorCount++;
          }
        }

        if (hasPhone && (contactMethod === "whatsapp" || contactMethod === "both")) {
          // WhatsApp delivery is disabled until a verified provider is configured.
          void whatsapp;
        }

      } catch (bizErr) {
        console.error("[AutoOutreach] Error processing business:", bizErr);
        errorCount++;
      }
    }

    await updateOutreachRun(runId, {
      scrapedCount,
      eligibleCount,
      emailSentCount,
      whatsappSentCount,
      errorCount,
      status: errorCount > 0 ? "partially_completed" : "completed",
    });
    console.log("[AutoOutreach] Slot " + slot + " completed: scraped=" + scrapedCount + " eligible=" + eligibleCount + " emails=" + emailSentCount + " whatsapp=" + whatsappSentCount);

    // ── Advance rotation after slot 5 (end of day) ────────────────────────────
    if (slot === 5 && config?.cityRotation) {
      try {
        const rotation: Array<{ city: string; state: string }> =
          typeof config.cityRotation === "string"
            ? JSON.parse(config.cityRotation)
            : config.cityRotation;
        if (Array.isArray(rotation) && rotation.length > 1) {
          await advanceRotationIndex(agencyId, config.rotationIndex || 0, rotation.length);
          console.log("[AutoOutreach] Rotation advanced to next city");
        }
      } catch { /* ignore */ }
    }

  } catch (err) {
    console.error("[AutoOutreach] Background processing error:", err);
    await updateOutreachRun(runId, { status: "failed", errorCount: errorCount + 1 });
  }
}

export type OutreachLaunchResult = {
  success: boolean;
  slot: number;
  city?: string;
  state?: string;
  businessType?: string;
  runId?: number;
  status: "processing" | "skipped_paused" | "skipped_duplicate";
};

export async function launchOutreachRun(agencyId: number, slot: number): Promise<OutreachLaunchResult> {
  const slotConfig = SLOT_CONFIG[slot];
  if (!slotConfig) throw new Error("Invalid outreach slot");

  const config = await getOutreachConfig(agencyId);
  if (!isConfigEnabled(config)) {
    return { success: true, slot, status: "skipped_paused" };
  }

  const { city, state } = getRotationCity(config);
  const run = await createOutreachRun(agencyId, slot, slotConfig.label, city, state);
  if (run.duplicate) {
    return { success: true, slot, city, state, businessType: slotConfig.label, runId: run.id, status: "skipped_duplicate" };
  }

  processOutreachInBackground(slot, city, state, run.id, config).catch((err) => {
    console.error("[AutoOutreach] Unhandled background error:", err);
  });
  return { success: true, slot, city, state, businessType: slotConfig.label, runId: run.id, status: "processing" };
}

export async function autoOutreachHandler(req: Request, res: Response) {
  const slot = Number(req.body?.slot || req.query?.slot || 1);

  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    return res.json(await launchOutreachRun(1, slot));

  } catch (err) {
    console.error("[AutoOutreach] Handler error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

/**
 * Trigger Now handler — called by admin directly (not cron).
 * Skips cron auth check, uses same logic as autoOutreachHandler.
 */
export async function triggerNowHandler(req: Request, res: Response) {
  const slot = Number(req.body?.slot || req.query?.slot || 1);

  try {
    const result = await launchOutreachRun(1, slot);
    if (result.status === "skipped_paused") {
      return res.status(409).json({ error: "Automation is paused. Enable it before running a slot manually." });
    }
    if (result.status === "skipped_duplicate") {
      return res.status(409).json({ error: "This outreach slot has already run today.", runId: result.runId, status: result.status });
    }
    return res.json(result);

  } catch (err) {
    console.error("[AutoOutreach TriggerNow] Handler error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
