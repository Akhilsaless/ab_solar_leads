import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

function rows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray((result as any)?.rows)) return (result as any).rows;
  return Array.isArray(result) ? result : [];
}

export async function createUnassignedChatLead(data: {
  sourceAgencyId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  monthlyEnergyBill?: string;
  leadScore?: number;
  priority?: "low" | "medium" | "high" | "urgent";
  conversationId?: number;
  referrerCode?: string;
  homeownershipType?: string;
  installationTimeline?: string;
  propertyAddress?: string;
  systemSizeKw?: string;
  systemCost?: string;
  subsidyAmount?: string;
  netCost?: string;
  monthlySavings?: string;
  notes?: string;
}) {
  const database = await db.getDb();
  if (!database) return null;
  const result = await database.execute(sql`
    INSERT INTO leads2 (
      agencyId, sourceAgencyId, assignedAgencyId, assignmentStatus,
      firstName, lastName, email, phone, city, state, monthlyEnergyBill,
      status, priority, leadScore, source, conversationId, referrerCode,
      homeownershipType, installationTimeline, propertyAddress,
      systemSizeKw, systemCost, subsidyAmount, netCost, monthlySavings, notes
    ) VALUES (
      ${data.sourceAgencyId}, ${data.sourceAgencyId}, NULL, 'UNASSIGNED',
      ${data.firstName}, ${data.lastName}, ${data.email ?? null}, ${data.phone ?? null},
      ${data.city ?? null}, ${data.state ?? null}, ${data.monthlyEnergyBill ?? null},
      'new', ${data.priority ?? "medium"}, ${data.leadScore ?? 0}, 'ai_chat',
      ${data.conversationId ?? null}, ${data.referrerCode ?? null},
      ${data.homeownershipType ?? null}, ${data.installationTimeline ?? null}, ${data.propertyAddress ?? null},
      ${data.systemSizeKw ?? null}, ${data.systemCost ?? null}, ${data.subsidyAmount ?? null},
      ${data.netCost ?? null}, ${data.monthlySavings ?? null}, ${data.notes ?? null}
    )
  `);
  const meta = result as any;
  return meta?.[0]?.insertId ?? meta?.insertId ?? null;
}

export async function listSuperAdminLeadInbox(status?: "UNASSIGNED" | "ASSIGNED" | "REASSIGNED") {
  const database = await db.getDb();
  if (!database) return [];
  const result = status
    ? await database.execute(sql`
        SELECT l.*, source.agencyName AS sourceAgencyName, assigned.agencyName AS assignedAgencyName
        FROM leads2 l
        LEFT JOIN agencyConfig3 source ON source.id = l.sourceAgencyId
        LEFT JOIN agencyConfig3 assigned ON assigned.id = l.assignedAgencyId
        WHERE l.assignmentStatus = ${status}
        ORDER BY l.createdAt DESC
        LIMIT 300
      `)
    : await database.execute(sql`
        SELECT l.*, source.agencyName AS sourceAgencyName, assigned.agencyName AS assignedAgencyName
        FROM leads2 l
        LEFT JOIN agencyConfig3 source ON source.id = l.sourceAgencyId
        LEFT JOIN agencyConfig3 assigned ON assigned.id = l.assignedAgencyId
        ORDER BY l.createdAt DESC
        LIMIT 300
      `);
  return rows(result);
}

export async function listAssignableAgencies() {
  const database = await db.getDb();
  if (!database) return [];
  const result = await database.execute(sql`
    SELECT id, agencyName, agencySlug, city, state, isActive
    FROM agencyConfig3
    WHERE isActive = 1
    ORDER BY agencyName ASC
  `);
  return rows(result);
}

export async function assignLead(input: { leadId: number; agencyId: number; actorUserId: number }) {
  const database = await db.getDb();
  if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const existingResult = await database.execute(sql`
    SELECT id, assignedAgencyId, assignmentStatus FROM leads2 WHERE id = ${input.leadId} LIMIT 1
  `);
  const existing = rows(existingResult)[0];
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

  const agencyResult = await database.execute(sql`
    SELECT id FROM agencyConfig3 WHERE id = ${input.agencyId} AND isActive = 1 LIMIT 1
  `);
  if (!rows(agencyResult)[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "Target agency is not active" });

  const wasAssigned = existing.assignedAgencyId != null;
  const nextStatus = wasAssigned && Number(existing.assignedAgencyId) !== input.agencyId ? "REASSIGNED" : "ASSIGNED";

  await database.execute(sql`
    UPDATE leads2
    SET assignedAgencyId = ${input.agencyId},
        assignmentStatus = ${nextStatus},
        assignedBy = ${input.actorUserId},
        assignedAt = NOW()
    WHERE id = ${input.leadId}
  `);

  await database.execute(sql`
    INSERT INTO leadActivity2 (leadId, userId, activityType, description, metadata)
    VALUES (
      ${input.leadId}, ${input.actorUserId}, 'assigned',
      ${wasAssigned ? "Lead reassigned by super-admin" : "Lead assigned by super-admin"},
      ${JSON.stringify({ previousAgencyId: existing.assignedAgencyId ?? null, assignedAgencyId: input.agencyId, assignmentStatus: nextStatus })}
    )
  `);

  return { success: true as const, assignmentStatus: nextStatus };
}

export async function getAssignedLeadsForAgency(agencyId: number) {
  const database = await db.getDb();
  if (!database) return [];
  const result = await database.execute(sql`
    SELECT l.*, source.agencyName AS sourceAgencyName
    FROM leads2 l
    LEFT JOIN agencyConfig3 source ON source.id = l.sourceAgencyId
    WHERE l.assignedAgencyId = ${agencyId}
    ORDER BY l.createdAt DESC
    LIMIT 200
  `);
  return rows(result);
}

export async function getAssignedLeadForAgency(leadId: number, agencyId: number) {
  const database = await db.getDb();
  if (!database) return null;
  const result = await database.execute(sql`
    SELECT l.* FROM leads2 l
    WHERE l.id = ${leadId} AND l.assignedAgencyId = ${agencyId}
    LIMIT 1
  `);
  return rows(result)[0] || null;
}
