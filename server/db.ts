import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, chatMessages, leads, leadNotes, leadTimeline, followUpEmails } from "../drizzle/schema";
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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Conversation helpers
export async function getOrCreateConversation(visitorId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(conversations).where(eq(conversations.visitorId, visitorId)).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(conversations).values({
    visitorId,
    status: "active",
  });
  
  const newConversation = await db.select().from(conversations).where(eq(conversations.visitorId, visitorId)).limit(1);
  return newConversation[0];
}

export async function getConversation(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return result[0];
}

export async function updateConversation(conversationId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(conversations).set(data).where(eq(conversations.id, conversationId));
}

// Chat message helpers
export async function addChatMessage(conversationId: number, role: "user" | "assistant", content: string, metadata?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(chatMessages).values({
    conversationId,
    role,
    content,
    metadata,
  });
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId));
}

// Lead helpers
export async function createLead(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(leads).values(data);
  return result;
}

export async function getLead(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  return result[0];
}

export async function getLeads(filters?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (filters?.status) {
    return await db.select().from(leads).where(eq(leads.status, filters.status)).orderBy(desc(leads.createdAt));
  }
  
  return await db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function updateLead(leadId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(leads).set(data).where(eq(leads.id, leadId));
}

// Lead notes
export async function addLeadNote(leadId: number, content: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(leadNotes).values({
    leadId,
    content,
    userId,
  });
}

export async function getLeadNotes(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId));
}

// Lead timeline
export async function addTimelineEvent(leadId: number, eventType: any, description?: string, metadata?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(leadTimeline).values({
    leadId,
    eventType,
    description,
    metadata,
  });
}

export async function getLeadTimeline(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(leadTimeline).where(eq(leadTimeline.leadId, leadId)).orderBy(desc(leadTimeline.createdAt));
}

// Follow-up emails
export async function createFollowUpEmail(leadId: number, emailType: any, subject: string, content: string, scheduledAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(followUpEmails).values({
    leadId,
    emailType,
    subject,
    content,
    scheduledAt,
    status: "scheduled",
  });
}

export async function getFollowUpEmails(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(followUpEmails).where(eq(followUpEmails.leadId, leadId));
}
