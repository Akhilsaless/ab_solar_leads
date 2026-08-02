/**
 * Email Open Tracking Pixel Handler
 * GET /api/track/open?pid=<placeId>&aid=<agencyId>
 * Returns a 1x1 transparent GIF and records the open event in the DB.
 */
import { Request, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

// 1x1 transparent GIF (43 bytes)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function trackEmailOpenHandler(req: Request, res: Response) {
  // Always return the pixel immediately — never block on DB
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": PIXEL.length.toString(),
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(PIXEL);

  // Record open in background
  const placeId = String(req.query.pid || "");
  const agencyId = Number(req.query.aid || 1);
  if (!placeId) return;

  try {
    const db = await getDb();
    if (!db) return;
    const now = Date.now();

    // Insert into emailOpens log
    await db.execute(
      sql`INSERT INTO emailOpens (placeId, agencyId, openedAt, userAgent, ip)
          VALUES (${placeId}, ${agencyId}, ${now}, ${req.headers["user-agent"] || null}, ${req.ip || null})`
    );

    // Increment open count and update lastOpenedAt on the business record
    await db.execute(
      sql`UPDATE scrapedBusinesses
          SET emailOpenCount = emailOpenCount + 1,
              lastOpenedAt   = ${now}
          WHERE placeId = ${placeId} AND agencyId = ${agencyId}`
    );
  } catch (err) {
    // Silently ignore — tracking should never break email delivery
    console.error("[TrackOpen] DB error:", err);
  }
}
