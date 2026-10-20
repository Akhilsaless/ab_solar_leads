import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { latestContactConsent, type DeterministicChatFacts } from "./chatFlow";
import { normalizeIndianPhone } from "../shared/solarWorkflow";

function rows(result: any): any[] {
  return Array.isArray(result?.[0]) ? result[0] : [];
}
export function chatCaptureKey(agencyId: number, contact: string) {
  return createHash("sha256")
    .update(
      `${agencyId}:${normalizeIndianPhone(contact) || contact.trim().toLowerCase()}`
    )
    .digest("hex");
}

/** Consent evidence remains in the session transcript. Never infer consent from a supplied number. */
export async function captureConsentedChatLead(
  db: any,
  conversation: any,
  facts: DeterministicChatFacts,
  messages: Array<{ role: string; content: string }>
) {
  const consent = latestContactConsent(messages);
  const whatsappConsent =
    consent &&
    messages.some(
      m =>
        m.role === "customer" &&
        /\b(?:agree|consent)\b[^.!?]{0,150}\bwhatsapp\b/i.test(m.content) &&
        !/\b(?:not|don't|do not)\b/i.test(m.content)
    );
  const phone = facts.phone ? normalizeIndianPhone(facts.phone) : null;
  const email = facts.email?.trim().toLowerCase();
  const name = facts.name || conversation.customerName;
  return db.transaction(async (tx: any) => {
    await tx.execute(
      sql`INSERT INTO solarChatIdentity (sessionId, agencyId, phone, consentAt, revokedAt) VALUES (${conversation.sessionId}, ${conversation.agencyId}, ${phone}, ${consent ? new Date() : null}, ${consent ? null : new Date()}) ON DUPLICATE KEY UPDATE phoneVerifiedAt = CASE WHEN phone <=> VALUES(phone) THEN phoneVerifiedAt ELSE NULL END, otpGeneration = CASE WHEN phone <=> VALUES(phone) THEN otpGeneration ELSE otpGeneration + 1 END, phone = VALUES(phone), consentAt = CASE WHEN VALUES(consentAt) IS NOT NULL THEN COALESCE(consentAt, VALUES(consentAt)) ELSE consentAt END, revokedAt = VALUES(revokedAt)`
    );
    await tx.execute(
      sql`UPDATE solarChatIdentity SET whatsappConsentAt = CASE WHEN ${whatsappConsent} THEN COALESCE(whatsappConsentAt, NOW()) ELSE NULL END WHERE sessionId = ${conversation.sessionId}`
    );
    if (!consent || !name || (!phone && !email)) return null;
    // Unique key insertion plus row lock serializes captures, including concurrent retries.
    const key = chatCaptureKey(conversation.agencyId, phone || email!);
    await tx.execute(
      sql`INSERT IGNORE INTO leadCaptureKeys (captureKey) VALUES (${key})`
    );
    const claim = rows(
      await tx.execute(
        sql`SELECT leadId FROM leadCaptureKeys WHERE captureKey = ${key} FOR UPDATE`
      )
    )[0];
    if (claim?.leadId) {
      // Only the original session can revise this record before verification.
      // A new visitor who merely types the same number cannot change its data.
      const parts = String(name).trim().split(/\s+/);
      await tx.execute(
        sql`UPDATE leads2 SET firstName = ${parts[0]}, lastName = ${parts.slice(1).join(" ")}, city = COALESCE(${facts.city || null}, city), state = COALESCE(${facts.state || null}, state), monthlyEnergyBill = COALESCE(${facts.monthlyBill || null}, monthlyEnergyBill) WHERE id = ${Number(claim.leadId)} AND conversationId = ${conversation.id} AND agencyId = ${conversation.agencyId}`
      );
      return Number(claim.leadId);
    }
    const old = rows(
      await tx.execute(
        sql`SELECT id FROM leads2 WHERE agencyId = ${conversation.agencyId} AND (conversationId = ${conversation.id} OR (${phone} IS NOT NULL AND (phone = ${phone} OR phone = ${phone?.slice(3) || null})) OR (${email || null} IS NOT NULL AND LOWER(email) = ${email || null})) ORDER BY id LIMIT 1`
      )
    )[0];
    let leadId = Number(old?.id || 0);
    if (!leadId) {
      const parts = String(name).trim().split(/\s+/);
      const inserted = await tx.execute(
        sql`INSERT INTO leads2 (agencyId, sourceAgencyId, assignedAgencyId, assignmentStatus, firstName, lastName, phone, email, city, state, monthlyEnergyBill, source, conversationId, status, priority, leadScore, referrerCode) VALUES (${conversation.agencyId}, ${conversation.agencyId}, NULL, 'UNASSIGNED', ${parts[0]}, ${parts.slice(1).join(" ")}, ${phone}, ${email || null}, ${facts.city || null}, ${facts.state || null}, ${facts.monthlyBill || null}, 'ai_chat', ${conversation.id}, 'new', 'low', 0, ${conversation.referrerCode || null})`
      );
      leadId = Number(inserted[0]?.insertId);
      if (!leadId)
        throw new Error("Lead capture did not return an identifier.");
      await tx.execute(
        sql`INSERT INTO solarLeadWorkflow (leadId, stage) VALUES (${leadId}, 'awaiting_partner')`
      );
      await tx.execute(
        sql`INSERT INTO solarWorkflowEvents (leadId, actor, toStage, note) VALUES (${leadId}, 'chatbot', 'awaiting_partner', 'Customer explicitly consented to contact; installer not yet assigned.')`
      );
    }
    await tx.execute(
      sql`UPDATE leadCaptureKeys SET leadId = ${leadId} WHERE captureKey = ${key}`
    );
    return leadId;
  });
}
