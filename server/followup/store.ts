import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { decryptGatewayCredential } from "../aiGateway";
import { configSchema, hash, type FollowupConfig } from "./policy";
export const rows = (r: any): any[] => (Array.isArray(r?.[0]) ? r[0] : []);
export async function database() {
  const db = await getDb();
  if (!db) throw new Error("database_unavailable");
  return db;
}
export async function account(
  db: any,
  agencyId: number,
  lock = false,
  create = true
) {
  if (create)
    await db.execute(
      sql`INSERT IGNORE INTO followupAccounts (agencyId) VALUES (${agencyId})`
    );
  const a = rows(
    await db.execute(
      lock
        ? sql`SELECT * FROM followupAccounts WHERE agencyId = ${agencyId} FOR UPDATE`
        : sql`SELECT * FROM followupAccounts WHERE agencyId = ${agencyId}`
    )
  )[0];
  if (!a) return { enabled: false, config: null };
  return {
    ...a,
    config: a.encryptedConfig
      ? configSchema.parse(
          JSON.parse(decryptGatewayCredential(a.encryptedConfig))
        )
      : null,
  };
}
export async function leadEligible(db: any, agencyId: number, leadId: number) {
  const lead = rows(
    await db.execute(
      sql`SELECT l.*, c.sessionId FROM leads2 l LEFT JOIN conversations3 c ON c.id = l.conversationId WHERE l.id = ${leadId} AND l.isDnc = 0 AND (l.assignedAgencyId = ${agencyId} OR (l.assignedAgencyId IS NULL AND l.sourceAgencyId = ${agencyId})) LIMIT 1`
    )
  )[0];
  if (!lead || !lead.phone) throw new Error("lead_unavailable");
  const identity = rows(
    await db.execute(
      sql`SELECT * FROM solarChatIdentity WHERE agencyId = ${lead.sourceAgencyId} AND phone = ${lead.phone} AND consentAt IS NOT NULL AND revokedAt IS NULL LIMIT 1`
    )
  )[0];
  if (!identity) throw new Error("consent_required");
  return { ...lead, whatsappConsentAt: identity.whatsappConsentAt };
}
export async function enqueue(
  agencyId: number,
  leadId: number,
  kind: "call" | "bill" | "whatsapp",
  eventId: string,
  payload: any = {},
  dueAt = new Date()
) {
  const db = await database();
  const lead = await leadEligible(db, agencyId, leadId);
  if (kind !== "call" && !lead.whatsappConsentAt)
    throw new Error("whatsapp_consent_required");
  const a = await account(db, agencyId);
  if (!a.enabled || !a.config) return false;
  const r: any = await db.execute(
    sql`INSERT IGNORE INTO followupJobs (agencyId, leadId, kind, dedupeKey, payload, dueAt) VALUES (${agencyId}, ${leadId}, ${kind}, ${hash(`${agencyId}:${kind}:${eventId}`)}, ${JSON.stringify(payload)}, ${dueAt})`
  );
  return Boolean(r[0]?.affectedRows);
}
export async function enqueueCapturedLead(agencyId: number, leadId: number) {
  const db = await database();
  const a = await account(db, agencyId);
  if (a.enabled && a.config?.automaticCalls)
    return enqueue(agencyId, leadId, "call", `lead:${leadId}:attempt:1`, {
      attempt: 1,
    });
  return false;
}
export async function reserve(db: any, jobId: number) {
  return db.transaction(async (tx: any) => {
    const j = rows(
      await tx.execute(
        sql`SELECT * FROM followupJobs WHERE id = ${jobId} AND status = 'queued' AND dueAt <= NOW() FOR UPDATE`
      )
    )[0];
    if (!j) return null;
    const a = await account(tx, j.agencyId, true);
    if (!a.enabled || !a.config) return null;
    const c: FollowupConfig = a.config;
    const amount =
      j.kind === "call"
        ? Math.ceil(c.maxCallSeconds / 60) * c.callRatePaise
        : j.kind === "bill"
          ? c.billPricePaise
          : c.messagePricePaise;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const month = `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
    const spent = a.monthKey === month ? Number(a.monthReservedPaise) : 0;
    if (
      Number(a.balancePaise) < amount ||
      spent + amount > Number(a.monthlyLimitPaise)
    ) {
      await tx.execute(
        sql`UPDATE followupJobs SET status = 'budget_blocked', errorCode = 'wallet_or_monthly_limit' WHERE id = ${j.id}`
      );
      return null;
    }
    await tx.execute(
      sql`UPDATE followupAccounts SET balancePaise = balancePaise - ${amount}, monthKey = ${month}, monthReservedPaise = ${spent + amount} WHERE agencyId = ${j.agencyId}`
    );
    await tx.execute(
      sql`INSERT INTO followupLedger (agencyId, jobId, eventKey, amountPaise, description) VALUES (${j.agencyId}, ${j.id}, ${`reserve:${j.id}`}, ${-amount}, 'Usage reservation')`
    );
    await tx.execute(
      sql`UPDATE followupJobs SET status = 'sending', reservedPaise = ${amount}, billingMonth = ${month} WHERE id = ${j.id}`
    );
    return {
      ...j,
      reservedPaise: amount,
      config: c,
      payload: JSON.parse(j.payload),
    };
  });
}
export async function settle(
  db: any,
  jobId: number,
  charge: number,
  status: string,
  result: any
) {
  if (!Number.isSafeInteger(charge) || charge < 0)
    throw new Error("invalid_charge");
  await db.transaction(async (tx: any) => {
    const j = rows(
      await tx.execute(
        sql`SELECT * FROM followupJobs WHERE id = ${jobId} FOR UPDATE`
      )
    )[0];
    if (!j || j.chargedPaise != null) return;
    const a = await account(tx, j.agencyId, true);
    const refund = Number(j.reservedPaise) - charge;
    await tx.execute(
      sql`UPDATE followupAccounts SET balancePaise = balancePaise + ${refund}, monthReservedPaise = monthReservedPaise - ${a.monthKey === j.billingMonth ? refund : 0}, enabled = CASE WHEN ${charge > Number(j.reservedPaise)} THEN FALSE ELSE enabled END WHERE agencyId = ${j.agencyId}`
    );
    await tx.execute(
      sql`INSERT INTO followupLedger (agencyId, jobId, eventKey, amountPaise, description) VALUES (${j.agencyId}, ${j.id}, ${`settle:${j.id}`}, ${refund}, 'Final usage reconciliation')`
    );
    await tx.execute(
      sql`UPDATE followupJobs SET status = ${status}, chargedPaise = ${charge}, result = ${JSON.stringify(result)}, errorCode = ${charge > Number(j.reservedPaise) ? "duration_exceeded_account_paused" : null} WHERE id = ${j.id}`
    );
  });
}
