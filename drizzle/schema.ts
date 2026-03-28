import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leads - core CRM entity
 */
export const leads = mysqlTable("leads2", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  company: varchar("company", { length: 255 }),
  propertyAddress: text("propertyAddress"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 10 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  monthlyEnergyBill: decimal("monthlyEnergyBill", { precision: 10, scale: 2 }),
  estimatedSavings: decimal("estimatedSavings", { precision: 10, scale: 2 }),
  roofCondition: varchar("roofCondition", { length: 50 }),
  sunExposure: varchar("sunExposure", { length: 50 }),
  homeownershipType: varchar("homeownershipType", { length: 50 }),
  installationTimeline: varchar("installationTimeline", { length: 50 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "lost"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  leadScore: int("leadScore").default(0),
  source: varchar("source", { length: 50 }).default("manual"),
  tags: json("tags"),
  assignedTo: int("assignedTo"),
  isDnc: boolean("isDnc").default(false),
  notes: text("notes"),
  lastContactedAt: timestamp("lastContactedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Lead activity timeline
 */
export const leadActivity = mysqlTable("leadActivity2", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  userId: int("userId"),
  activityType: mysqlEnum("activityType", [
    "created", "status_changed", "note_added", "email_sent", "sms_sent",
    "whatsapp_sent", "call_made", "tag_added", "tag_removed", "score_updated",
    "assigned", "imported", "scraped"
  ]).notNull(),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadActivityEvent = typeof leadActivity.$inferSelect;

/**
 * Campaigns - outreach campaign management
 */
export const campaigns = mysqlTable("campaigns2", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp", "phone", "multi"]).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "cancelled"]).default("draft").notNull(),
  targetLeadCount: int("targetLeadCount").default(0),
  sentCount: int("sentCount").default(0),
  deliveredCount: int("deliveredCount").default(0),
  openedCount: int("openedCount").default(0),
  respondedCount: int("respondedCount").default(0),
  convertedCount: int("convertedCount").default(0),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  filters: json("filters"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;

/**
 * Message templates
 */
export const messageTemplates = mysqlTable("messageTemplates2", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  variables: json("variables"),
  isDefault: boolean("isDefault").default(false),
  usageCount: int("usageCount").default(0),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MessageTemplate = typeof messageTemplates.$inferSelect;

/**
 * Outreach messages - individual messages sent to leads
 */
export const outreachMessages = mysqlTable("outreachMessages2", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  campaignId: int("campaignId"),
  templateId: int("templateId"),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp", "phone"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "opened", "responded", "failed", "bounced"]).default("queued").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  openedAt: timestamp("openedAt"),
  respondedAt: timestamp("respondedAt"),
  errorMessage: text("errorMessage"),
  abVariant: varchar("abVariant", { length: 10 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutreachMessage = typeof outreachMessages.$inferSelect;

/**
 * Campaign sequences - multi-step follow-up sequences
 */
export const campaignSteps = mysqlTable("campaignSteps2", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  stepOrder: int("stepOrder").notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp", "phone"]).notNull(),
  templateId: int("templateId"),
  delayDays: int("delayDays").default(0),
  delayHours: int("delayHours").default(0),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  abVariantB: text("abVariantB"),
  abSubjectB: varchar("abSubjectB", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignStep = typeof campaignSteps.$inferSelect;

/**
 * Scrape jobs - track web scraping tasks
 */
export const scrapeJobs = mysqlTable("scrapeJobs2", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 100 }).notNull(),
  query: text("query"),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  totalFound: int("totalFound").default(0),
  totalImported: int("totalImported").default(0),
  errorMessage: text("errorMessage"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ScrapeJob = typeof scrapeJobs.$inferSelect;

/**
 * Tags for lead categorization
 */
export const tags = mysqlTable("tags2", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3B82F6"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;

/**
 * DNC (Do Not Contact) list
 */
export const dncList = mysqlTable("dncList2", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  reason: text("reason"),
  addedBy: int("addedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DncEntry = typeof dncList.$inferSelect;
