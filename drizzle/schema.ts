import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow (agency owners/admins).
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
 * Agency configuration - each agency subscriber gets their own config
 */
export const agencyConfig = mysqlTable("agencyConfig3", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agencyName: varchar("agencyName", { length: 255 }).notNull(),
  agencySlug: varchar("agencySlug", { length: 100 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  brandColor: varchar("brandColor", { length: 20 }).default("#F97316"),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  website: text("website"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  installationChargePerKw: decimal("installationChargePerKw", { precision: 10, scale: 2 }).default("8000"),
  marginPercent: decimal("marginPercent", { precision: 5, scale: 2 }).default("15"),
  botGreeting: text("botGreeting"),
  botTone: varchar("botTone", { length: 50 }).default("friendly"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgencyConfig = typeof agencyConfig.$inferSelect;

/**
 * Panel products - agency-specific solar panel catalog
 */
export const panelProducts = mysqlTable("panelProducts3", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 200 }).notNull(),
  wattage: int("wattage").notNull(),
  pricePerPanel: decimal("pricePerPanel", { precision: 10, scale: 2 }).notNull(),
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }),
  panelType: varchar("panelType", { length: 50 }).default("monocrystalline"),
  warranty: int("warranty").default(25),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PanelProduct = typeof panelProducts.$inferSelect;

/**
 * Inverter products - agency-specific inverter catalog
 */
export const inverterProducts = mysqlTable("inverterProducts3", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 200 }).notNull(),
  capacityKw: decimal("capacityKw", { precision: 6, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  inverterType: varchar("inverterType", { length: 50 }).default("string"),
  warranty: int("warranty").default(10),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InverterProduct = typeof inverterProducts.$inferSelect;

/**
 * Chat conversations - each customer session
 */
export const conversations = mysqlTable("conversations3", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  sessionId: varchar("sessionId", { length: 100 }).notNull().unique(),
  customerName: varchar("customerName", { length: 200 }),
  customerPhone: varchar("customerPhone", { length: 30 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerCity: varchar("customerCity", { length: 100 }),
  customerState: varchar("customerState", { length: 100 }),
  customerAddress: text("customerAddress"),
  monthlyBill: decimal("monthlyBill", { precision: 10, scale: 2 }),
  monthlyUnits: int("monthlyUnits"),
  recommendedKw: decimal("recommendedKw", { precision: 6, scale: 2 }),
  recommendedPanels: int("recommendedPanels"),
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }),
  subsidyAmount: decimal("subsidyAmount", { precision: 10, scale: 2 }),
  netCost: decimal("netCost", { precision: 12, scale: 2 }),
  estimatedSavingsMonthly: decimal("estimatedSavingsMonthly", { precision: 10, scale: 2 }),
  paybackYears: decimal("paybackYears", { precision: 4, scale: 1 }),
  status: mysqlEnum("status", ["active", "lead_captured", "estimate_given", "converted", "dropped"]).default("active").notNull(),
  leadScore: int("leadScore").default(0),
  messageCount: int("messageCount").default(0),
  source: varchar("source", { length: 100 }).default("ad_click"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;

/**
 * Chat messages - individual messages in a conversation
 */
export const chatMsgs = mysqlTable("chatMsgs3", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["bot", "customer"]).notNull(),
  content: text("content").notNull(),
  messageType: varchar("messageType", { length: 50 }).default("text"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMsg = typeof chatMsgs.$inferSelect;

/**
 * Indian state subsidies - pre-populated reference data
 */
export const stateSubsidies = mysqlTable("stateSubsidies3", {
  id: int("id").autoincrement().primaryKey(),
  stateName: varchar("stateName", { length: 100 }).notNull(),
  stateCode: varchar("stateCode", { length: 10 }).notNull(),
  centralSubsidy1kw: decimal("centralSubsidy1kw", { precision: 10, scale: 2 }).default("30000"),
  centralSubsidy2kw: decimal("centralSubsidy2kw", { precision: 10, scale: 2 }).default("60000"),
  centralSubsidy3kw: decimal("centralSubsidy3kw", { precision: 10, scale: 2 }).default("78000"),
  centralSubsidyAbove3kw: decimal("centralSubsidyAbove3kw", { precision: 10, scale: 2 }).default("78000"),
  stateAdditionalPerKw: decimal("stateAdditionalPerKw", { precision: 10, scale: 2 }).default("0"),
  stateMaxAdditional: decimal("stateMaxAdditional", { precision: 10, scale: 2 }).default("0"),
  avgElectricityRate: decimal("avgElectricityRate", { precision: 6, scale: 2 }).default("7.50"),
  discomName: varchar("discomName", { length: 200 }),
  netMeteringAvailable: boolean("netMeteringAvailable").default(true),
  specialNotes: text("specialNotes"),
  avgSunHours: decimal("avgSunHours", { precision: 4, scale: 1 }).default("4.5"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StateSubsidy = typeof stateSubsidies.$inferSelect;

// Keep existing tables for backward compatibility
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
  conversationId: int("conversationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

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

export const tags = mysqlTable("tags2", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3B82F6"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;

export const dncList = mysqlTable("dncList2", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  reason: text("reason"),
  addedBy: int("addedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DncEntry = typeof dncList.$inferSelect;
