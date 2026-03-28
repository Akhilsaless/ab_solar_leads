import { eq, desc, sql, and, or, like, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, agencyConfig, panelProducts, inverterProducts,
  conversations, chatMsgs, stateSubsidies, leads, leadActivity,
  campaigns, messageTemplates, outreachMessages, campaignSteps,
  scrapeJobs, tags, dncList
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== AGENCY CONFIG ====================

export async function getAgencyByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agencyConfig).where(eq(agencyConfig.userId, userId)).limit(1);
  return result[0] || null;
}

export async function getAgencyBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agencyConfig).where(eq(agencyConfig.agencySlug, slug)).limit(1);
  return result[0] || null;
}

export async function getAgencyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(agencyConfig).where(eq(agencyConfig.id, id)).limit(1);
  return result[0] || null;
}

export async function createAgency(data: {
  userId: number; agencyName: string; agencySlug: string;
  phone?: string; email?: string; city?: string; state?: string;
  brandColor?: string; botGreeting?: string; botTone?: string;
  installationChargePerKw?: string; marginPercent?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(agencyConfig).values(data);
  return result[0].insertId;
}

export async function updateAgency(id: number, data: Partial<typeof agencyConfig.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agencyConfig).set(data).where(eq(agencyConfig.id, id));
}

// ==================== PANEL PRODUCTS ====================

export async function getPanelsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(panelProducts).where(and(eq(panelProducts.agencyId, agencyId), eq(panelProducts.isActive, true)));
}

export async function createPanel(data: typeof panelProducts.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(panelProducts).values(data);
  return result[0].insertId;
}

export async function updatePanel(id: number, data: Partial<typeof panelProducts.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(panelProducts).set(data).where(eq(panelProducts.id, id));
}

export async function deletePanel(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(panelProducts).set({ isActive: false }).where(eq(panelProducts.id, id));
}

// ==================== INVERTER PRODUCTS ====================

export async function getInvertersByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inverterProducts).where(and(eq(inverterProducts.agencyId, agencyId), eq(inverterProducts.isActive, true)));
}

export async function createInverter(data: typeof inverterProducts.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(inverterProducts).values(data);
  return result[0].insertId;
}

export async function updateInverter(id: number, data: Partial<typeof inverterProducts.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(inverterProducts).set(data).where(eq(inverterProducts.id, id));
}

export async function deleteInverter(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(inverterProducts).set({ isActive: false }).where(eq(inverterProducts.id, id));
}

// ==================== CONVERSATIONS ====================

export async function createConversation(data: { agencyId: number; sessionId: string; source?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(conversations).values(data);
  return result[0].insertId;
}

export async function getConversation(sessionId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversations).where(eq(conversations.sessionId, sessionId)).limit(1);
  return result[0] || null;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0] || null;
}

export async function updateConversation(sessionId: string, data: Partial<typeof conversations.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set(data).where(eq(conversations.sessionId, sessionId));
}

export async function getConversationsByAgency(agencyId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.agencyId, agencyId)).orderBy(desc(conversations.createdAt)).limit(limit);
}

export async function getConversationStats(agencyId: number) {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, leadsCaptured: 0, estimatesGiven: 0, converted: 0, dropped: 0 };
  const result = await db.select({
    status: conversations.status,
    count: count(),
  }).from(conversations).where(eq(conversations.agencyId, agencyId)).groupBy(conversations.status);

  const stats = { total: 0, active: 0, leadsCaptured: 0, estimatesGiven: 0, converted: 0, dropped: 0 };
  for (const row of result) {
    const c = Number(row.count);
    stats.total += c;
    if (row.status === 'active') stats.active = c;
    if (row.status === 'lead_captured') stats.leadsCaptured = c;
    if (row.status === 'estimate_given') stats.estimatesGiven = c;
    if (row.status === 'converted') stats.converted = c;
    if (row.status === 'dropped') stats.dropped = c;
  }
  return stats;
}

// ==================== CHAT MESSAGES ====================

export async function addChatMessage(data: { conversationId: number; role: "bot" | "customer"; content: string; messageType?: string; metadata?: unknown; }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(chatMsgs).values(data);
  // Increment message count
  await db.execute(sql`UPDATE conversations3 SET messageCount = messageCount + 1 WHERE id = ${data.conversationId}`);
  return result[0].insertId;
}

export async function getChatMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMsgs).where(eq(chatMsgs.conversationId, conversationId)).orderBy(asc(chatMsgs.createdAt));
}

// ==================== STATE SUBSIDIES ====================

export async function getAllSubsidies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stateSubsidies).orderBy(asc(stateSubsidies.stateName));
}

export async function getSubsidyByState(stateName: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(stateSubsidies)
    .where(or(
      like(stateSubsidies.stateName, `%${stateName}%`),
      eq(stateSubsidies.stateCode, stateName.toUpperCase())
    )).limit(1);
  return result[0] || null;
}

// ==================== LEADS (from conversations) ====================

export async function createLeadFromConversation(data: {
  firstName: string; lastName: string; email?: string; phone?: string;
  propertyAddress?: string; city?: string; state?: string;
  monthlyEnergyBill?: string; estimatedSavings?: string;
  source?: string; leadScore?: number; priority?: "low" | "medium" | "high" | "urgent";
  conversationId?: number; notes?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(leads).values({
    ...data,
    status: "new",
  });
  return result[0].insertId;
}

export async function getLeadsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get leads that have a conversationId linked to this agency
  const result = await db.execute(sql`
    SELECT l.* FROM leads2 l
    INNER JOIN conversations3 c ON l.conversationId = c.id
    WHERE c.agencyId = ${agencyId}
    ORDER BY l.createdAt DESC
    LIMIT 200
  `);
  return (result as any)[0] || [];
}

export async function getLeads(filters?: { status?: string; search?: string; }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(leads.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(or(
      like(leads.firstName, `%${filters.search}%`),
      like(leads.lastName, `%${filters.search}%`),
      like(leads.email, `%${filters.search}%`),
      like(leads.phone, `%${filters.search}%`)
    ));
  }
  if (conditions.length > 0) {
    return db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt)).limit(200);
  }
  return db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0] || null;
}

export async function updateLead(id: number, data: Partial<typeof leads.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function getLeadActivity(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadActivity).where(eq(leadActivity.leadId, leadId)).orderBy(desc(leadActivity.createdAt));
}

export async function addLeadActivity(data: typeof leadActivity.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leadActivity).values(data);
}
