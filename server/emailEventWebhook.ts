import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";

const eventSchema = z.object({
  id: z.string().trim().min(1).max(200),
  type: z.enum(["delivered", "bounced", "complained", "opened", "clicked", "replied", "unknown"]),
  recipient: z.string().trim().email().max(320).optional(),
  outreachRecordId: z.number().int().positive().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const payloadSchema = z.object({
  provider: z.string().trim().min(2).max(80),
  events: z.array(eventSchema).min(1).max(100),
});

export function signEmailEventPayload(payload: unknown, secret: string) {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

export function verifyEmailEventSignature(payload: unknown, signature: string | undefined, secret: string | undefined) {
  if (!secret || !signature) return false;
  const expected = signEmailEventPayload(payload, secret);
  const actual = signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

/**
 * Deliberately provider-neutral and disabled until EMAIL_EVENT_WEBHOOK_SECRET is configured.
 * An email provider or integration proxy must normalize events to the documented payload shape
 * and HMAC-sign JSON.stringify(payload) with that secret.
 */
export async function emailEventWebhookHandler(req: Request, res: Response) {
  const secret = process.env.EMAIL_EVENT_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: "Email event webhooks are not configured" });
  const signature = req.header("x-sales-squad-signature");
  if (!verifyEmailEventSignature(req.body, signature, secret)) return res.status(401).json({ error: "Invalid event signature" });
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid event payload" });
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database unavailable" });
  let accepted = 0;
  for (const event of parsed.data.events) {
    const result: any = await db.execute(sql`
      INSERT IGNORE INTO emailEventLogs (provider, externalEventId, eventType, recipient, outreachRecordId, payload)
      VALUES (${parsed.data.provider}, ${event.id}, ${event.type}, ${event.recipient || null}, ${event.outreachRecordId || null}, ${JSON.stringify({ timestamp: event.timestamp || null, metadata: event.metadata || {} })})
    `);
    const packet = Array.isArray(result) ? result[0] : result;
    accepted += Number(packet?.affectedRows || 0);
  }
  return res.status(202).json({ accepted, received: parsed.data.events.length });
}
