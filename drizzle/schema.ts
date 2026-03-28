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
 * Chat conversations between visitors and AI sales agent
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 64 }).notNull().unique(),
  visitorName: varchar("visitorName", { length: 255 }),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  visitorPhone: varchar("visitorPhone", { length: 20 }),
  status: mysqlEnum("status", ["active", "completed", "handed_off"]).default("active").notNull(),
  leadScore: int("leadScore").default(0),
  estimatedSavings: decimal("estimatedSavings", { precision: 10, scale: 2 }),
  propertyAddress: text("propertyAddress"),
  monthlyEnergyBill: decimal("monthlyEnergyBill", { precision: 8, scale: 2 }),
  roofCondition: varchar("roofCondition", { length: 50 }),
  sunExposure: varchar("sunExposure", { length: 50 }),
  installationTimeline: varchar("installationTimeline", { length: 50 }),
  conversationData: json("conversationData"),
  handedOffToAgent: varchar("handedOffToAgent", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Chat messages in conversations
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  sentiment: varchar("sentiment", { length: 20 }),
  intent: varchar("intent", { length: 50 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Leads created from conversations
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId"),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  propertyAddress: text("propertyAddress"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 10 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  monthlyEnergyBill: decimal("monthlyEnergyBill", { precision: 8, scale: 2 }),
  estimatedSavings: decimal("estimatedSavings", { precision: 10, scale: 2 }),
  roofCondition: varchar("roofCondition", { length: 50 }),
  roofAge: int("roofAge"),
  sunExposure: varchar("sunExposure", { length: 50 }),
  homeownershipType: varchar("homeownershipType", { length: 50 }),
  installationTimeline: varchar("installationTimeline", { length: 50 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "rejected"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  leadScore: int("leadScore").default(0),
  source: varchar("source", { length: 50 }).default("chat"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Lead notes and internal comments
 */
export const leadNotes = mysqlTable("leadNotes", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  userId: int("userId"),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;

/**
 * Lead activity timeline
 */
export const leadTimeline = mysqlTable("leadTimeline", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  eventType: mysqlEnum("eventType", ["created", "status_changed", "note_added", "email_sent", "call_made", "meeting_scheduled"]).notNull(),
  description: text("description"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadTimelineEvent = typeof leadTimeline.$inferSelect;
export type InsertLeadTimelineEvent = typeof leadTimeline.$inferInsert;

/**
 * Follow-up emails
 */
export const followUpEmails = mysqlTable("followUpEmails", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  emailType: mysqlEnum("emailType", ["initial", "24h_followup", "3day_followup", "1week_followup", "custom"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["scheduled", "sent", "failed", "opened", "clicked"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpEmail = typeof followUpEmails.$inferSelect;
export type InsertFollowUpEmail = typeof followUpEmails.$inferInsert;

/**
 * Service coverage areas
 */
export const serviceCoverageAreas = mysqlTable("serviceCoverageAreas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  state: varchar("state", { length: 50 }),
  cities: text("cities"),
  zipCodes: text("zipCodes"),
  centerLat: varchar("centerLat", { length: 20 }),
  centerLng: varchar("centerLng", { length: 20 }),
  active: boolean("active").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceCoverageArea = typeof serviceCoverageAreas.$inferSelect;
export type InsertServiceCoverageArea = typeof serviceCoverageAreas.$inferInsert;
