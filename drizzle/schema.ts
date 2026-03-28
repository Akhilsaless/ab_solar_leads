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
 * Leads table - stores all solar lead information
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  // Contact Information
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  // Property Details
  propertyAddress: text("propertyAddress").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zipCode", { length: 10 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  // Energy Information
  monthlyEnergyBill: decimal("monthlyEnergyBill", { precision: 10, scale: 2 }),
  roofCondition: mysqlEnum("roofCondition", ["excellent", "good", "fair", "poor"]),
  roofAge: int("roofAge"),
  sunExposure: mysqlEnum("sunExposure", ["full", "partial", "shaded"]),
  // Installation Preferences
  installationTimeline: mysqlEnum("installationTimeline", ["immediate", "3-6months", "6-12months", "exploring"]).default("exploring"),
  homeownershipType: mysqlEnum("homeownershipType", ["owned", "financed", "rented"]),
  // Lead Management
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "rejected"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  source: varchar("source", { length: 100 }).default("website"),
  leadScore: int("leadScore").default(0),
  estimatedSavings: decimal("estimatedSavings", { precision: 10, scale: 2 }),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastContactedAt: timestamp("lastContactedAt"),
  convertedAt: timestamp("convertedAt"),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Lead Notes - stores comments and internal notes on leads
 */
export const leadNotes = mysqlTable("leadNotes", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;

/**
 * Lead Timeline - tracks all interactions and status changes
 */
export const leadTimeline = mysqlTable("leadTimeline", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  eventType: mysqlEnum("eventType", ["status_change", "contact", "email_sent", "note_added", "score_updated"]).notNull(),
  previousValue: varchar("previousValue", { length: 255 }),
  newValue: varchar("newValue", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadTimelineEvent = typeof leadTimeline.$inferSelect;
export type InsertLeadTimelineEvent = typeof leadTimeline.$inferInsert;

/**
 * Follow-up Emails - stores scheduled and sent follow-up emails
 */
export const followUpEmails = mysqlTable("followUpEmails", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  emailType: mysqlEnum("emailType", ["initial", "24h_followup", "3day_followup", "1week_followup", "custom"]).notNull(),
  status: mysqlEnum("emailStatus", ["scheduled", "sent", "failed", "bounced"]).default("scheduled").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  sentAt: timestamp("sentAt"),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  estimatedSavings: decimal("estimatedSavings", { precision: 10, scale: 2 }),
  personalizationData: json("personalizationData"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FollowUpEmail = typeof followUpEmails.$inferSelect;
export type InsertFollowUpEmail = typeof followUpEmails.$inferInsert;

/**
 * Service Coverage Areas - stores AB SOLAR service territories
 */
export const serviceCoverageAreas = mysqlTable("serviceCoverageAreas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCodes: text("zipCodes"), // JSON array of zip codes
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radius: int("radius"), // in miles
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceCoverageArea = typeof serviceCoverageAreas.$inferSelect;
export type InsertServiceCoverageArea = typeof serviceCoverageAreas.$inferInsert;
