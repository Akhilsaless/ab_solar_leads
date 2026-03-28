import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, leadActivity, campaigns, messageTemplates, outreachMessages, campaignSteps, scrapeJobs, tags, dncList } from "../drizzle/schema";
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

// ===== LEAD HELPERS =====
export async function createLead(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(data);
  return result;
}

export async function createLeads(dataArr: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (dataArr.length === 0) return;
  await db.insert(leads).values(dataArr);
}

export async function getLead(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  return result[0];
}

export async function getLeads(filters?: { status?: string; priority?: string; search?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(leads.status, filters.status as any));
  if (filters?.priority) conditions.push(eq(leads.priority, filters.priority as any));
  if (filters?.search) {
    conditions.push(
      or(
        like(leads.firstName, `%${filters.search}%`),
        like(leads.lastName, `%${filters.search}%`),
        like(leads.email, `%${filters.search}%`),
        like(leads.phone, `%${filters.search}%`)
      )
    );
  }
  if (conditions.length > 0) {
    return await db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
  }
  return await db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function updateLead(leadId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(eq(leads.id, leadId));
}

export async function deleteLead(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leads).where(eq(leads.id, leadId));
}

export async function getLeadStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const allLeads = await db.select().from(leads);
  const total = allLeads.length;
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  allLeads.forEach((l: any) => {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    byPriority[l.priority] = (byPriority[l.priority] || 0) + 1;
    const src = l.source || "unknown";
    bySource[src] = (bySource[src] || 0) + 1;
  });
  return { total, byStatus, byPriority, bySource };
}

// ===== ACTIVITY HELPERS =====
export async function addActivity(leadId: number, activityType: any, description?: string, userId?: number, metadata?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadActivity).values({ leadId, activityType, description, userId, metadata });
}

export async function getLeadActivities(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(leadActivity).where(eq(leadActivity.leadId, leadId)).orderBy(desc(leadActivity.createdAt));
}

// ===== CAMPAIGN HELPERS =====
export async function createCampaign(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(campaigns).values(data);
}

export async function getCampaigns() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  return result[0];
}

export async function updateCampaign(campaignId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaigns).set(data).where(eq(campaigns.id, campaignId));
}

// ===== TEMPLATE HELPERS =====
export async function createTemplate(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(messageTemplates).values(data);
}

export async function getTemplates(channel?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (channel) {
    return await db.select().from(messageTemplates).where(eq(messageTemplates.channel, channel as any)).orderBy(desc(messageTemplates.createdAt));
  }
  return await db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
}

export async function getTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(messageTemplates).where(eq(messageTemplates.id, templateId)).limit(1);
  return result[0];
}

export async function updateTemplate(templateId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messageTemplates).set(data).where(eq(messageTemplates.id, templateId));
}

export async function deleteTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(messageTemplates).where(eq(messageTemplates.id, templateId));
}

// ===== OUTREACH MESSAGE HELPERS =====
export async function createOutreachMessage(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(outreachMessages).values(data);
}

export async function getOutreachMessages(filters?: { leadId?: number; campaignId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (filters?.leadId) {
    return await db.select().from(outreachMessages).where(eq(outreachMessages.leadId, filters.leadId)).orderBy(desc(outreachMessages.createdAt));
  }
  if (filters?.campaignId) {
    return await db.select().from(outreachMessages).where(eq(outreachMessages.campaignId, filters.campaignId)).orderBy(desc(outreachMessages.createdAt));
  }
  return await db.select().from(outreachMessages).orderBy(desc(outreachMessages.createdAt));
}

export async function updateOutreachMessage(messageId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(outreachMessages).set(data).where(eq(outreachMessages.id, messageId));
}

// ===== CAMPAIGN STEPS =====
export async function createCampaignStep(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(campaignSteps).values(data);
}

export async function getCampaignSteps(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(campaignSteps).where(eq(campaignSteps.campaignId, campaignId));
}

// ===== SCRAPE JOBS =====
export async function createScrapeJob(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(scrapeJobs).values(data);
}

export async function getScrapeJobs() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(scrapeJobs).orderBy(desc(scrapeJobs.createdAt));
}

export async function updateScrapeJob(jobId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scrapeJobs).set(data).where(eq(scrapeJobs.id, jobId));
}

// ===== TAGS =====
export async function createTag(name: string, color?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(tags).values({ name, color: color || "#3B82F6" });
}

export async function getTags() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(tags);
}

export async function deleteTag(tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tags).where(eq(tags.id, tagId));
}

// ===== DNC LIST =====
export async function addToDnc(email?: string, phone?: string, reason?: string, addedBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(dncList).values({ email, phone, reason, addedBy });
}

export async function getDncList() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(dncList).orderBy(desc(dncList.createdAt));
}

export async function checkDnc(email?: string, phone?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: any[] = [];
  if (email) conditions.push(eq(dncList.email, email));
  if (phone) conditions.push(eq(dncList.phone, phone));
  if (conditions.length === 0) return false;
  const result = await db.select().from(dncList).where(or(...conditions)).limit(1);
  return result.length > 0;
}

export async function removeDnc(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dncList).where(eq(dncList.id, id));
}
