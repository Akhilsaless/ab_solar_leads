import { eq, desc, and, gte, lte, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, leadNotes, leadTimeline, followUpEmails, serviceCoverageAreas } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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

// Lead queries
export async function createLead(data: typeof leads.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(leads).values(data);
  return result;
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function getLeads(filters?: {
  status?: string;
  priority?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [];
  
  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as any));
  }
  if (filters?.priority) {
    conditions.push(eq(leads.priority, filters.priority as any));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source));
  }
  if (filters?.search) {
    conditions.push(
      like(leads.firstName, `%${filters.search}%`)
    );
  }
  
  let query: any = db.select().from(leads);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  query = query.orderBy(desc(leads.createdAt));
  
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.offset(filters.offset);
  }
  
  return query.execute();
}

export async function updateLead(id: number, data: Partial<typeof leads.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(leads).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(leads.id, id));
}

export async function getLeadStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(leads);
  
  const stats = {
    total: result.length,
    byStatus: {
      new: result.filter(l => l.status === 'new').length,
      contacted: result.filter(l => l.status === 'contacted').length,
      qualified: result.filter(l => l.status === 'qualified').length,
      converted: result.filter(l => l.status === 'converted').length,
      rejected: result.filter(l => l.status === 'rejected').length,
    },
    byPriority: {
      low: result.filter(l => l.priority === 'low').length,
      medium: result.filter(l => l.priority === 'medium').length,
      high: result.filter(l => l.priority === 'high').length,
    },
    totalSavings: result.reduce((sum, l) => sum + (Number(l.estimatedSavings) || 0), 0),
    avgScore: Math.round(result.reduce((sum, l) => sum + (l.leadScore || 0), 0) / result.length),
  };
  
  return stats;
}

// Lead Notes queries
export async function addLeadNote(leadId: number, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(leadNotes).values({ leadId, userId, content });
}

export async function getLeadNotes(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(leadNotes)
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(desc(leadNotes.createdAt));
}

// Lead Timeline queries
export async function addTimelineEvent(data: typeof leadTimeline.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(leadTimeline).values(data);
}

export async function getLeadTimeline(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(leadTimeline)
    .where(eq(leadTimeline.leadId, leadId))
    .orderBy(desc(leadTimeline.createdAt));
}

// Follow-up Email queries
export async function createFollowUpEmail(data: typeof followUpEmails.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(followUpEmails).values(data);
}

export async function getScheduledEmails() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(followUpEmails)
    .where(eq(followUpEmails.status, 'scheduled' as any))
    .orderBy(followUpEmails.scheduledAt);
}

export async function updateFollowUpEmail(id: number, data: Partial<typeof followUpEmails.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(followUpEmails).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(followUpEmails.id, id));
}

export async function getLeadFollowUps(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(followUpEmails)
    .where(eq(followUpEmails.leadId, leadId))
    .orderBy(desc(followUpEmails.createdAt));
}

// Service Coverage Area queries
export async function getServiceCoverageAreas() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(serviceCoverageAreas)
    .where(eq(serviceCoverageAreas.isActive, true));
}

export async function addServiceCoverageArea(data: typeof serviceCoverageAreas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(serviceCoverageAreas).values(data);
}
