import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, date, bigint, uniqueIndex, index } from "drizzle-orm/mysql-core";

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
  whatsappNumber: varchar("whatsappNumber", { length: 30 }),
  linkedinUrl: text("linkedinUrl"),
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
  pricingVersion: varchar("pricingVersion", { length: 80 }).default("draft").notNull(),
  effectiveFrom: date("effectiveFrom"),
  effectiveTo: date("effectiveTo"),
  sourceNote: text("sourceNote"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  isPriceActive: boolean("isPriceActive").default(false).notNull(),
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
  pricingVersion: varchar("pricingVersion", { length: 80 }).default("draft").notNull(),
  effectiveFrom: date("effectiveFrom"),
  effectiveTo: date("effectiveTo"),
  sourceNote: text("sourceNote"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  isPriceActive: boolean("isPriceActive").default(false).notNull(),
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
  structure: varchar("structure", { length: 50 }), // "roof", "ground", "balcony", "wall"
  monthlyUnits: int("monthlyUnits"),
  recommendedKw: decimal("recommendedKw", { precision: 6, scale: 2 }),
  recommendedPanels: int("recommendedPanels"),
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }),
  subsidyAmount: decimal("subsidyAmount", { precision: 10, scale: 2 }),
  netCost: decimal("netCost", { precision: 12, scale: 2 }),
  estimatedSavingsMonthly: decimal("estimatedSavingsMonthly", { precision: 10, scale: 2 }),
  paybackYears: decimal("paybackYears", { precision: 4, scale: 1 }),
  panelType: varchar("panelType", { length: 50 }), // "monocrystalline" or "polycrystalline"
  roofType: varchar("roofType", { length: 100 }),
  roofSize: varchar("roofSize", { length: 50 }), // in sqft or sqm
  estimatedSavings25Year: decimal("estimatedSavings25Year", { precision: 12, scale: 2 }),
  futureElectricityRate: decimal("futureElectricityRate", { precision: 6, scale: 2 }), // predicted rate
  rateIncreasePercentage: decimal("rateIncreasePercentage", { precision: 5, scale: 2 }), // yearly increase %
  status: mysqlEnum("status", ["active", "lead_captured", "estimate_given", "converted", "dropped"]).default("active").notNull(),
  leadScore: int("leadScore").default(0),
  messageCount: int("messageCount").default(0),
  source: varchar("source", { length: 100 }).default("ad_click"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 200 }),
  emailSent: boolean("emailSent").default(false),
  companyEmailSent: boolean("companyEmailSent").default(false),
  referrerCode: varchar("referrerCode", { length: 100 }),
  isReturning: boolean("isReturning").default(false),
  followUp24Sent: boolean("followUp24Sent").default(false),
  followUp72Sent: boolean("followUp72Sent").default(false),
  followUp7dSent: boolean("followUp7dSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;

/**
 * Electricity rate history - for predicting future rates by state
 */
export const electricityRateHistory = mysqlTable("electricityRateHistory3", {
  id: int("id").autoincrement().primaryKey(),
  stateName: varchar("stateName", { length: 100 }).notNull(),
  stateCode: varchar("stateCode", { length: 10 }).notNull(),
  year: int("year").notNull(),
  avgRate: decimal("avgRate", { precision: 6, scale: 2 }).notNull(),
  rateIncrease: decimal("rateIncrease", { precision: 5, scale: 2 }), // % increase from previous year
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ElectricityRateHistory = typeof electricityRateHistory.$inferSelect;

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
  agencyId: int("agencyId"),
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
  systemSizeKw: decimal("systemSizeKw", { precision: 6, scale: 2 }),
  systemCost: decimal("systemCost", { precision: 12, scale: 2 }),
  subsidyAmount: decimal("subsidyAmount", { precision: 10, scale: 2 }),
  netCost: decimal("netCost", { precision: 12, scale: 2 }),
  monthlySavings: decimal("monthlySavings", { precision: 10, scale: 2 }),
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
  referrerCode: varchar("referrerCode", { length: 100 }),
  assignedPartnerId: int("assignedPartnerId"),
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

// Outcome-driven campaign intelligence. These tables extend the legacy campaign
// records and preserve existing lead, outreach, partner, and referral workflows.
export const campaignClients = mysqlTable("campaignClients", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 120 }),
  contactName: varchar("contactName", { length: 160 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 40 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignProfiles = mysqlTable("campaignProfiles", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().unique(),
  agencyId: int("agencyId").notNull(),
  clientId: int("clientId"),
  industry: varchar("industry", { length: 120 }),
  geography: text("geography"),
  leadRequirement: text("leadRequirement"),
  leadSource: varchar("leadSource", { length: 120 }),
  appointmentTarget: int("appointmentTarget").default(0).notNull(),
  campaignCost: decimal("campaignCost", { precision: 14, scale: 2 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  assignedTeam: json("assignedTeam"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignLeadRecords = mysqlTable("campaignLeadRecords", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  leadId: int("leadId"),
  source: varchar("source", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["generated", "validated", "qualified", "contacted", "interested", "appointment", "appointment_validated", "delivered", "accepted", "rejected", "lost"]).default("generated").notNull(),
  qualityScore: int("qualityScore").default(0).notNull(),
  scoreExplanation: json("scoreExplanation"),
  isDuplicate: boolean("isDuplicate").default(false).notNull(),
  assignedTo: int("assignedTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Central explainable qualification snapshot for legacy lead cards. It deliberately
// extends rather than replaces leads2 so current lead workflows remain compatible.
export const leadEvidenceScores = mysqlTable("leadEvidenceScores", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  leadId: int("leadId").notNull().unique(),
  score: int("score").notNull(),
  tier: varchar("tier", { length: 40 }).notNull(),
  confidence: int("confidence").notNull(),
  dimensions: json("dimensions").notNull(),
  missingEvidence: json("missingEvidence").notNull(),
  riskFlags: json("riskFlags").notNull(),
  nextAction: text("nextAction").notNull(),
  scoringVersion: varchar("scoringVersion", { length: 40 }).notNull(),
  computedAt: timestamp("computedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignLeadEvents = mysqlTable("campaignLeadEvents", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  campaignLeadId: int("campaignLeadId").notNull(),
  eventType: mysqlEnum("eventType", ["generated", "validated", "qualified", "contact_attempt", "conversation", "interested", "appointment_set", "appointment_validated", "delivered", "accepted", "rejected", "revenue_recorded", "note"]).notNull(),
  eventAt: timestamp("eventAt").defaultNow().notNull(),
  actorUserId: int("actorUserId"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const campaignAppointments = mysqlTable("campaignAppointments", {
  id: int("id").autoincrement().primaryKey(),
  campaignLeadId: int("campaignLeadId").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  status: mysqlEnum("status", ["scheduled", "validated", "invalid", "no_show", "completed", "cancelled"]).default("scheduled").notNull(),
  assignedTo: int("assignedTo"),
  notes: text("notes"),
  validatedAt: timestamp("validatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignDeliveries = mysqlTable("campaignDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  campaignLeadId: int("campaignLeadId").notNull(),
  clientId: int("clientId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  rejectionReason: varchar("rejectionReason", { length: 160 }),
  rejectionNotes: text("rejectionNotes"),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
  revenue: decimal("revenue", { precision: 14, scale: 2 }),
  commission: decimal("commission", { precision: 14, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignQualityConfigs = mysqlTable("campaignQualityConfigs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().unique(),
  weights: json("weights").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignDeliveryAccess = mysqlTable("campaignDeliveryAccess", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull().unique(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  lastViewedAt: timestamp("lastViewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailEventLogs = mysqlTable("emailEventLogs", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 80 }).notNull(),
  externalEventId: varchar("externalEventId", { length: 200 }).notNull().unique(),
  eventType: mysqlEnum("eventType", ["delivered", "bounced", "complained", "opened", "clicked", "replied", "unknown"]).notNull(),
  recipient: varchar("recipient", { length: 320 }),
  outreachRecordId: int("outreachRecordId"),
  payload: json("payload").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});

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

/**
 * Subscriptions - agency subscription tracking (Stripe-backed)
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agencyId: int("agencyId"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  plan: mysqlEnum("plan", ["starter", "professional", "enterprise"]).notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly").notNull(),
  status: mysqlEnum("status", ["trialing", "active", "past_due", "canceled", "expired"]).default("trialing").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false),
  conversationsUsed: int("conversationsUsed").default(0),
  scrapesUsed: int("scrapesUsed").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;

/**
 * Scraped businesses - results from Google Maps / directory scraping
 */
export const scrapedBusinesses = mysqlTable("scrapedBusinesses", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  scrapeJobId: int("scrapeJobId"),
  businessName: varchar("businessName", { length: 300 }).notNull(),
  businessType: varchar("businessType", { length: 100 }),
  businessSize: mysqlEnum("businessSize", ["small", "medium", "large"]).default("medium"),
  ownerName: varchar("ownerName", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  website: text("website"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  reviewCount: int("reviewCount"),
  placeId: varchar("placeId", { length: 200 }),
  source: varchar("source", { length: 50 }).default("google_maps"),
  isImported: boolean("isImported").default(false),
  solarScore: int("solarScore").default(5),
  contactStatus: mysqlEnum("contactStatus", ["not_contacted", "contacted", "interested", "converted"]).default("not_contacted"),
  linkedinUrl: text("linkedinUrl"),
  aiPitch: text("aiPitch"),
  emailSentAt: bigint("emailSentAt", { mode: "number" }),
  followUp3dSent: bigint("followUp3dSent", { mode: "number" }),
  followUp7dSent: bigint("followUp7dSent", { mode: "number" }),
  emailOpenCount: int("emailOpenCount").notNull().default(0),
  chatbotClickCount: int("chatbotClickCount").notNull().default(0),
  lastOpenedAt: bigint("lastOpenedAt", { mode: "number" }),
  outreachRunId: int("outreachRunId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScrapedBusiness = typeof scrapedBusinesses.$inferSelect;

/**
 * Copilot Memory — persistent conversation history per agency
 */
export const copilotMemory = mysqlTable("copilotMemory", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  toolCalls: text("toolCalls"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CopilotMemory = typeof copilotMemory.$inferSelect;


/**
 * Automated Outreach Campaign Configuration
 * Stores settings for daily automated outreach to Telangana businesses
 */
export const automatedOutreachConfig = mysqlTable("automatedOutreachConfig", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  state: varchar("state", { length: 100 }).notNull(), // e.g., "Telangana"
  businessTypes: json("businessTypes"), // Array of business types: ["textile_mills", "cold_storage", "hospitals", etc]
  minRating: decimal("minRating", { precision: 3, scale: 1 }).default("3.5"),
  contactsPerDay: int("contactsPerDay").default(30),
  scheduleTime: varchar("scheduleTime", { length: 10 }).default("10:00"), // HH:MM format
  messageType: mysqlEnum("messageType", ["generic", "industry_specific"]).default("industry_specific"),
  isEnabled: boolean("isEnabled").default(true),
  includeFollowUp: boolean("includeFollowUp").default(true),
  followUpDays: int("followUpDays").default(3),
    adminPhoneNumber: varchar("adminPhoneNumber", { length: 30 }), // For WhatsApp alerts
  outreachMode: mysqlEnum("outreachMode", ["blind", "owner_only"]).default("blind"), // blind = send directly; owner_only = notify owner first
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AutomatedOutreachConfig = typeof automatedOutreachConfig.$inferSelect;
export type InsertAutomatedOutreachConfig = typeof automatedOutreachConfig.$inferInsert;

/**
 * Outreach Campaign Records
 * Tracks each message sent to a business
 */
export const outreachCampaignRecords = mysqlTable("outreachCampaignRecords", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId").notNull(), // Reference to automatedOutreachConfig
  businessId: int("businessId").notNull(), // Reference to scrapedBusinesses
  businessName: varchar("businessName", { length: 300 }).notNull(),
  businessType: varchar("businessType", { length: 100 }),
  ownerName: varchar("ownerName", { length: 200 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  contactMethod: mysqlEnum("contactMethod", ["whatsapp", "email", "both"]).notNull(),
  messageBody: text("messageBody").notNull(),
  chatbotLink: text("chatbotLink"), // Personalized link with tracking
  status: mysqlEnum("status", ["queued", "sent", "delivered", "opened", "replied", "failed"]).default("queued").notNull(),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  openedAt: timestamp("openedAt"),
  repliedAt: timestamp("repliedAt"),
  replyText: text("replyText"),
  replySource: mysqlEnum("replySource", ["whatsapp", "email", "manual"]),
  leadScore: int("leadScore").default(0),
  isFollowUp: boolean("isFollowUp").default(false),
  followUpScheduledFor: timestamp("followUpScheduledFor"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OutreachCampaignRecord = typeof outreachCampaignRecords.$inferSelect;
export type InsertOutreachCampaignRecord = typeof outreachCampaignRecords.$inferInsert;

/**
 * Lead Scoring Configuration
 * Defines how leads are scored based on various factors
 */
export const leadScoringConfig = mysqlTable("leadScoringConfig", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  businessTypeScores: json("businessTypeScores"), // {textile_mills: 40, cold_storage: 35, hospitals: 30, ...}
  sizeScores: json("sizeScores"), // {large: 30, medium: 15, small: 5}
  ratingScores: json("ratingScores"), // {4.5: 20, 4.0: 15, 3.5: 10}
  contactQualityScores: json("contactQualityScores"), // {has_email: 10, has_phone: 10, has_website: 5}
  engagementScores: json("engagementScores"), // {opened_email: 5, clicked_link: 10, replied: 20}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadScoringConfig = typeof leadScoringConfig.$inferSelect;
export type InsertLeadScoringConfig = typeof leadScoringConfig.$inferInsert;

/**
 * Data Verification Log
 * Tracks email, phone, and website verification for each business
 */
export const dataVerificationLog = mysqlTable("dataVerificationLog", {
  id: int("id").autoincrement().primaryKey(),
  businessId: int("businessId").notNull(), // Reference to scrapedBusinesses
  emailValid: boolean("emailValid").default(false),
  phoneValid: boolean("phoneValid").default(false),
  phoneHasWhatsapp: boolean("phoneHasWhatsapp").default(false),
  websiteActive: boolean("websiteActive").default(false),
  businessActive: boolean("businessActive").default(false),
  verificationScore: int("verificationScore").default(0), // 0-100
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataVerificationLog = typeof dataVerificationLog.$inferSelect;
export type InsertDataVerificationLog = typeof dataVerificationLog.$inferInsert;

/**
 * Outreach Analytics
 * Daily summary of outreach performance
 */
export const outreachAnalytics = mysqlTable("outreachAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId").notNull(), // Reference to automatedOutreachConfig
  date: date("date").notNull(),
  totalSent: int("totalSent").default(0),
  totalDelivered: int("totalDelivered").default(0),
  totalOpened: int("totalOpened").default(0),
  totalReplied: int("totalReplied").default(0),
  totalInterested: int("totalInterested").default(0),
  responseRate: decimal("responseRate", { precision: 5, scale: 2 }).default("0"),
  conversionRate: decimal("conversionRate", { precision: 5, scale: 2 }).default("0"),
  avgLeadScore: decimal("avgLeadScore", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutreachAnalytic = typeof outreachAnalytics.$inferSelect;
export type InsertOutreachAnalytic = typeof outreachAnalytics.$inferInsert;


/**
 * Partner Signups
 * Solar companies that sign up to receive leads
 */
export const partnerSignups = mysqlTable("partnerSignups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  panNumber: varchar("panNumber", { length: 50 }),
  gstNumber: varchar("gstNumber", { length: 50 }),
  partnerSlug: varchar("partnerSlug", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["new", "contacted", "interested", "converted"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PartnerSignup = typeof partnerSignups.$inferSelect;
export type InsertPartnerSignup = typeof partnerSignups.$inferInsert;

/**
 * Canonical master control for an agency's automated outreach.
 * One row per agency prevents pause/location/contact-method conflicts.
 */
export const outreachConfig = mysqlTable("outreachConfig", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  targetCity: varchar("targetCity", { length: 100 }),
  targetState: varchar("targetState", { length: 100 }),
  contactMethod: mysqlEnum("contactMethod", ["email", "whatsapp", "both"]).default("email").notNull(),
  cityRotation: json("cityRotation"),
  rotationIndex: int("rotationIndex").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agencyUnique: uniqueIndex("outreachConfig_agencyId_unique").on(table.agencyId),
}));

export type OutreachConfig = typeof outreachConfig.$inferSelect;

/**
 * Execution history for automated outreach. runKey is unique for a scheduled
 * agency/date/slot, preventing retries or overlapping cron calls from sending twice.
 */
export const outreachRuns = mysqlTable("outreachRuns", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  runSlot: int("runSlot").notNull(),
  runKey: varchar("runKey", { length: 120 }),
  scheduledDate: date("scheduledDate"),
  businessType: varchar("businessType", { length: 100 }).notNull(),
  targetCity: varchar("targetCity", { length: 100 }),
  targetState: varchar("targetState", { length: 100 }),
  scrapedCount: int("scrapedCount").default(0).notNull(),
  eligibleCount: int("eligibleCount").default(0).notNull(),
  emailSentCount: int("emailSentCount").default(0).notNull(),
  whatsappSentCount: int("whatsappSentCount").default(0).notNull(),
  errorCount: int("errorCount").default(0).notNull(),
  status: mysqlEnum("status", ["queued", "running", "skipped_paused", "skipped_duplicate", "completed", "partially_completed", "failed"]).default("queued").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  runKeyUnique: uniqueIndex("outreachRuns_runKey_unique").on(table.runKey),
}));

export type OutreachRun = typeof outreachRuns.$inferSelect;

/**
 * Agency-scoped AI routing rules. Provider credentials live only in
 * aiProviderConnections and are encrypted by the server before persistence.
 */
export const aiGatewaySettings = mysqlTable("aiGatewaySettings", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  routingMode: mysqlEnum("routingMode", ["auto", "fastest", "free_first", "best_quality", "manual"]).default("auto").notNull(),
  freeModelsOnly: boolean("freeModelsOnly").default(false).notNull(),
  allowPaidFallback: boolean("allowPaidFallback").default(false).notNull(),
  monthlyBudgetInr: decimal("monthlyBudgetInr", { precision: 10, scale: 2 }).default("0").notNull(),
  warningThresholdPercent: int("warningThresholdPercent").default(70).notNull(),
  criticalThresholdPercent: int("criticalThresholdPercent").default(90).notNull(),
  providerPriority: json("providerPriority"),
  featurePolicies: json("featurePolicies"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agencyUnique: uniqueIndex("aiGatewaySettings_agency_unique").on(table.agencyId),
}));

/** Provider credentials are encrypted server-side and never returned to browsers. */
export const aiProviderConnections = mysqlTable("aiProviderConnections", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  connectionType: mysqlEnum("connectionType", ["api_key", "oauth", "builtin", "custom"]).default("api_key").notNull(),
  status: mysqlEnum("status", ["not_connected", "configuration_required", "connected", "error", "rate_limited", "unavailable"]).default("not_connected").notNull(),
  healthStatus: mysqlEnum("healthStatus", ["unknown", "healthy", "slow", "rate_limited", "unavailable", "authentication_error"]).default("unknown").notNull(),
  encryptedCredential: text("encryptedCredential"),
  encryptedExtraCredentials: text("encryptedExtraCredentials"),
  credentialHint: varchar("credentialHint", { length: 80 }),
  accountId: varchar("accountId", { length: 255 }),
  baseUrl: varchar("baseUrl", { length: 500 }),
  defaultModel: varchar("defaultModel", { length: 255 }),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  isFreeTier: boolean("isFreeTier").default(false).notNull(),
  priority: int("priority").default(100).notNull(),
  lastValidatedAt: timestamp("lastValidatedAt"),
  lastSuccessfulAt: timestamp("lastSuccessfulAt"),
  averageLatencyMs: int("averageLatencyMs"),
  lastErrorCode: varchar("lastErrorCode", { length: 100 }),
  lastErrorMessage: varchar("lastErrorMessage", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerUnique: uniqueIndex("aiProviderConnections_agency_provider_unique").on(table.agencyId, table.provider),
}));

export const aiProviderModels = mysqlTable("aiProviderModels", {
  id: int("id").autoincrement().primaryKey(),
  providerConnectionId: int("providerConnectionId").notNull(),
  modelId: varchar("modelId", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  categories: json("categories"),
  capabilities: json("capabilities"),
  isFree: boolean("isFree").default(false).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  modelUnique: uniqueIndex("aiProviderModels_connection_model_unique").on(table.providerConnectionId, table.modelId),
}));

/** Compact observability records; never store prompt text or secret values. */
export const aiGatewayUsage = mysqlTable("aiGatewayUsage", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  providerConnectionId: int("providerConnectionId"),
  provider: varchar("provider", { length: 50 }).notNull(),
  modelId: varchar("modelId", { length: 255 }),
  feature: varchar("feature", { length: 100 }).notNull(),
  routingMode: varchar("routingMode", { length: 50 }).notNull(),
  latencyMs: int("latencyMs"),
  inputTokens: int("inputTokens"),
  outputTokens: int("outputTokens"),
  estimatedCostInr: decimal("estimatedCostInr", { precision: 10, scale: 4 }).default("0").notNull(),
  success: boolean("success").notNull(),
  usedFallback: boolean("usedFallback").default(false).notNull(),
  errorCode: varchar("errorCode", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiGatewaySettings = typeof aiGatewaySettings.$inferSelect;
export type AiProviderConnection = typeof aiProviderConnections.$inferSelect;
export type AiProviderModel = typeof aiProviderModels.$inferSelect;

/**
 * Agency-owned pricing policy. Monetary figures may only be surfaced when this
 * policy is explicitly active, current, and supported by active catalog entries.
 */
export const agencyEstimateSettings = mysqlTable("agencyEstimateSettings", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  pricingVersion: varchar("pricingVersion", { length: 80 }).default("draft").notNull(),
  pricingMode: mysqlEnum("pricingMode", ["catalog", "quote_only"]).default("catalog").notNull(),
  installationCostPerKw: decimal("installationCostPerKw", { precision: 10, scale: 2 }),
  balanceOfSystemCostPerKw: decimal("balanceOfSystemCostPerKw", { precision: 10, scale: 2 }),
  taxRatePercent: decimal("taxRatePercent", { precision: 5, scale: 2 }),
  warrantyTerms: text("warrantyTerms"),
  pricingDisclosure: text("pricingDisclosure"),
  sourceNote: text("sourceNote"),
  effectiveFrom: date("effectiveFrom"),
  effectiveTo: date("effectiveTo"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  isPricingActive: boolean("isPricingActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agencyUnique: uniqueIndex("agencyEstimateSettings_agency_unique").on(table.agencyId),
}));

/**
 * State and DISCOM inputs are agency-scoped so a generic reference dataset
 * cannot accidentally become a sales quote. Monetary subsidy figures remain
 * informational until an agency verifies and activates a specific state input.
 */
export const agencyStateEstimateInputs = mysqlTable("agencyStateEstimateInputs", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  stateName: varchar("stateName", { length: 100 }).notNull(),
  stateCode: varchar("stateCode", { length: 10 }).notNull(),
  discomName: varchar("discomName", { length: 200 }),
  tariffPerUnit: decimal("tariffPerUnit", { precision: 8, scale: 4 }),
  avgSunHours: decimal("avgSunHours", { precision: 5, scale: 2 }),
  systemLossPercent: decimal("systemLossPercent", { precision: 5, scale: 2 }),
  netMeteringStatus: mysqlEnum("netMeteringStatus", ["unknown", "available", "limited", "unavailable"]).default("unknown").notNull(),
  subsidyDisclosure: text("subsidyDisclosure"),
  subsidySourceUrl: text("subsidySourceUrl"),
  sourceNote: text("sourceNote"),
  effectiveFrom: date("effectiveFrom"),
  effectiveTo: date("effectiveTo"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  isActive: boolean("isActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  stateUnique: uniqueIndex("agencyStateEstimateInputs_agency_state_unique").on(table.agencyId, table.stateCode),
}));

/**
 * Explicit, disabled-by-default feature gates. A caller must pass both this
 * agency control and the service-specific readiness guard before outbound work.
 */
export const agencyFeatureControls = mysqlTable("agencyFeatureControls", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  emailAutomationEnabled: boolean("emailAutomationEnabled").default(false).notNull(),
  whatsappAutomationEnabled: boolean("whatsappAutomationEnabled").default(false).notNull(),
  smsOtpEnabled: boolean("smsOtpEnabled").default(false).notNull(),
  scheduledFollowUpsEnabled: boolean("scheduledFollowUpsEnabled").default(false).notNull(),
  optionalAiFeaturesEnabled: boolean("optionalAiFeaturesEnabled").default(false).notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agencyUnique: uniqueIndex("agencyFeatureControls_agency_unique").on(table.agencyId),
}));

/** Compact, metadata-only configuration history. Never store secrets or contact data. */
export const agencyConfigurationAudit = mysqlTable("agencyConfigurationAudit", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  agencyCreatedIndex: index("agencyConfigurationAudit_agency_created_idx").on(table.agencyId, table.id),
}));

export type AgencyEstimateSettings = typeof agencyEstimateSettings.$inferSelect;
export type AgencyStateEstimateInput = typeof agencyStateEstimateInputs.$inferSelect;
export type AgencyFeatureControls = typeof agencyFeatureControls.$inferSelect;

/**
 * Platform-owned communication settings. The encrypted payload contains only
 * server-side provider credentials; clients receive a masked, status-only view.
 * Exactly one row exists per supported channel.
 */
export const platformCommunicationSettings = mysqlTable("platformCommunicationSettings", {
  id: int("id").autoincrement().primaryKey(),
  channel: mysqlEnum("channel", ["email", "whatsapp"]).notNull().unique(),
  provider: varchar("provider", { length: 80 }).default("not_configured").notNull(),
  connectionMode: mysqlEnum("connectionMode", ["smtp", "api"]).notNull(),
  encryptedConfig: text("encryptedConfig"),
  configuredFields: json("configuredFields"),
  status: mysqlEnum("status", ["not_configured", "authentication_error", "template_setup_required", "ready", "running", "paused", "off", "error"]).default("not_configured").notNull(),
  automationState: mysqlEnum("automationState", ["off", "paused", "running"]).default("off").notNull(),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  lastSuccessfulSendAt: timestamp("lastSuccessfulSendAt"),
  lastErrorCode: varchar("lastErrorCode", { length: 100 }),
  lastErrorMessage: varchar("lastErrorMessage", { length: 500 }),
  updatedByUserId: int("updatedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Emergency stop remains active until the platform owner explicitly clears it. */
export const platformSafetyControls = mysqlTable("platformSafetyControls", {
  id: int("id").autoincrement().primaryKey(),
  emergencyStopActive: boolean("emergencyStopActive").default(true).notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Metadata-only platform audit history; secrets and customer addresses are never stored here. */
export const platformCommunicationAudit = mysqlTable("platformCommunicationAudit", {
  id: int("id").autoincrement().primaryKey(),
  channel: mysqlEnum("channel", ["email", "whatsapp", "global"]).notNull(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 120 }).notNull(),
  result: varchar("result", { length: 80 }).notNull(),
  fromState: varchar("fromState", { length: 40 }),
  toState: varchar("toState", { length: 40 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  channelCreatedIndex: index("platformCommunicationAudit_channel_created_idx").on(table.channel, table.id),
}));

export type PlatformCommunicationSettings = typeof platformCommunicationSettings.$inferSelect;
export type PlatformSafetyControls = typeof platformSafetyControls.$inferSelect;
