import { eq, desc, sql, and, or, like, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, agencyConfig, panelProducts, inverterProducts,
  conversations, chatMsgs, stateSubsidies, leads, leadActivity,
  campaigns, messageTemplates, outreachMessages, campaignSteps,
  scrapeJobs, tags, dncList, subscriptions, scrapedBusinesses
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

export async function createConversation(data: { agencyId: number; sessionId: string; source?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; referrerCode?: string; }) {
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

export async function getConversationByPhone(agencyId: number, phone: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversations)
    .where(and(eq(conversations.agencyId, agencyId), eq(conversations.customerPhone, phone)))
    .orderBy(desc(conversations.createdAt)).limit(1);
  return result[0] || null;
}

export async function getConversationByEmail(agencyId: number, email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversations)
    .where(and(eq(conversations.agencyId, agencyId), eq(conversations.customerEmail, email)))
    .orderBy(desc(conversations.createdAt)).limit(1);
  return result[0] || null;
}

export async function getUnfollowedUpLeads() {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const h24 = new Date(now - 24 * 60 * 60 * 1000);
  const h72 = new Date(now - 72 * 60 * 60 * 1000);
  // Get leads that: have email, not converted, not dropped, chat ended >24h ago
  return db.select().from(conversations)
    .where(
      and(
        sql`${conversations.customerEmail} IS NOT NULL`,
        sql`${conversations.customerName} IS NOT NULL`,
        sql`${conversations.status} NOT IN ('converted', 'dropped')`,
        sql`${conversations.updatedAt} < ${h24}`,
        sql`(followUp24Sent = FALSE OR (followUp72Sent = FALSE AND updatedAt < ${h72}))`
      )
    ).limit(50);
}

export async function markConversationReturning(sessionId: string) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE conversations3 SET isReturning = TRUE WHERE sessionId = ${sessionId}`);
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
  conversationId?: number; notes?: string; referrerCode?: string;
  homeownershipType?: string;
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
    SELECT l.*, COALESCE(l.referrerCode, c.referrerCode) as referrerCode FROM leads2 l
    INNER JOIN conversations3 c ON l.conversationId = c.id
    WHERE c.agencyId = ${agencyId}
    ORDER BY l.createdAt DESC
    LIMIT 200
  `);
  return (result as any)[0] || [];
}

export async function getLeads(filters?: { status?: string; search?: string; source?: string; }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(leads.status, filters.status as any));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source));
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

// ==================== SUBSCRIPTIONS ====================

export async function getSubscriptionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0] || null;
}

export async function getSubscriptionByAgencyId(agencyId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.agencyId, agencyId)).limit(1);
  return result[0] || null;
}

export async function createSubscription(data: {
  userId: number; agencyId?: number; plan: "starter" | "professional" | "enterprise";
  billingCycle?: "monthly" | "yearly"; status?: string;
  stripeCustomerId?: string; stripeSubscriptionId?: string;
  trialEndsAt?: Date; currentPeriodStart?: Date; currentPeriodEnd?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(subscriptions).values(data as any);
  return result[0].insertId;
}

export async function updateSubscription(id: number, data: Partial<typeof subscriptions.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

export async function updateSubscriptionByStripeId(stripeSubId: string, data: Partial<typeof subscriptions.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.stripeSubscriptionId, stripeSubId));
}

export async function incrementUsage(userId: number, field: "conversationsUsed" | "scrapesUsed") {
  const db = await getDb();
  if (!db) return;
  if (field === "conversationsUsed") {
    await db.execute(sql`UPDATE subscriptions SET conversationsUsed = conversationsUsed + 1 WHERE userId = ${userId}`);
  } else {
    await db.execute(sql`UPDATE subscriptions SET scrapesUsed = scrapesUsed + 1 WHERE userId = ${userId}`);
  }
}

// ==================== SCRAPED BUSINESSES ====================

export async function createScrapedBusiness(data: typeof scrapedBusinesses.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(scrapedBusinesses).values(data);
  return result[0].insertId;
}

export async function createScrapedBusinessesBulk(dataArr: Array<typeof scrapedBusinesses.$inferInsert>) {
  const db = await getDb();
  if (!db) return 0;
  if (dataArr.length === 0) return 0;
  await db.insert(scrapedBusinesses).values(dataArr);
  return dataArr.length;
}

export async function getScrapedBusinessesByAgency(agencyId: number, filters?: { businessType?: string; businessSize?: string; city?: string; state?: string; }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(scrapedBusinesses.agencyId, agencyId)];
  if (filters?.businessType) conditions.push(eq(scrapedBusinesses.businessType, filters.businessType));
  if (filters?.businessSize) conditions.push(eq(scrapedBusinesses.businessSize, filters.businessSize as any));
  if (filters?.city) conditions.push(like(scrapedBusinesses.city, `%${filters.city}%`));
  if (filters?.state) conditions.push(like(scrapedBusinesses.state, `%${filters.state}%`));
  return db.select().from(scrapedBusinesses).where(and(...conditions)).orderBy(desc(scrapedBusinesses.createdAt)).limit(500);
}

export async function searchScrapedBusinesses(agencyId: number, filters?: { search?: string; contactStatus?: string; }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(scrapedBusinesses.agencyId, agencyId)];
  if (filters?.contactStatus && filters.contactStatus !== 'all') {
    conditions.push(eq(scrapedBusinesses.contactStatus, filters.contactStatus as any));
  }
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(or(
      like(scrapedBusinesses.businessName, s),
      like(scrapedBusinesses.phone, s),
      like(scrapedBusinesses.email, s),
      like(scrapedBusinesses.city, s),
      like(scrapedBusinesses.ownerName, s),
    ) as any);
  }
  return db.select().from(scrapedBusinesses).where(and(...conditions)).orderBy(desc(scrapedBusinesses.createdAt)).limit(500);
}

export async function getScrapedBusinessById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scrapedBusinesses).where(eq(scrapedBusinesses.id, id)).limit(1);
  return result[0] || null;
}

export async function markBusinessImported(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(scrapedBusinesses).set({ isImported: true }).where(eq(scrapedBusinesses.id, id));
}

export async function updateScrapedBusiness(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(scrapedBusinesses).set(data).where(eq(scrapedBusinesses.id, id));
}

export async function createScrapeJob(data: { source: string; query?: string; createdBy?: number; }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(scrapeJobs).values(data as any);
  return result[0].insertId;
}

export async function updateScrapeJob(id: number, data: Partial<typeof scrapeJobs.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(scrapeJobs).set(data).where(eq(scrapeJobs.id, id));
}

export async function getScrapeJobsByAgency(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapeJobs).where(eq(scrapeJobs.createdBy, userId)).orderBy(desc(scrapeJobs.createdAt)).limit(50);
}
export async function getUnconvertedLeadsForFollowUp(hoursAgo: number, followUpField: "followUp24Sent" | "followUp72Sent") {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const colExpr = followUpField === "followUp24Sent"
    ? sql`followUp24Sent`
    : sql`followUp72Sent`;
  return db.select().from(conversations)
    .where(
      and(
        sql`${conversations.customerEmail} IS NOT NULL`,
        sql`${conversations.status} NOT IN ('converted', 'dropped')`,
        sql`${conversations.updatedAt} <= ${cutoff}`,
        sql`${colExpr} = FALSE`
      )
    ).limit(50);
}

export async function markFollowUpSent(sessionId: string, field: "followUp24Sent" | "followUp72Sent") {
  const db = await getDb();
  if (!db) return;
  if (field === "followUp24Sent") {
    await db.update(conversations).set({ followUp24Sent: true } as any).where(eq(conversations.sessionId, sessionId));
  } else {
    await db.update(conversations).set({ followUp72Sent: true } as any).where(eq(conversations.sessionId, sessionId));
  }
}
