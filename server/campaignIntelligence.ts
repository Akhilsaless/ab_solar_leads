import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getAgencyByUserId, getDb } from "./db";

const lifecycleStatus = z.enum([
  "generated", "validated", "qualified", "contacted", "interested", "appointment",
  "appointment_validated", "delivered", "accepted", "rejected", "lost",
]);

const evidenceSchema = z.object({
  contactValidity: z.number().min(0).max(1),
  locationMatch: z.number().min(0).max(1),
  campaignFit: z.number().min(0).max(1),
  requirementFit: z.number().min(0).max(1),
  intent: z.number().min(0).max(1),
  engagement: z.number().min(0).max(1),
  sourceQuality: z.number().min(0).max(1),
  previousInteraction: z.number().min(0).max(1),
  qualificationAnswers: z.number().min(0).max(1),
  isDuplicate: z.boolean(),
});

export const DEFAULT_QUALITY_WEIGHTS = {
  contactValidity: 20,
  locationMatch: 15,
  campaignFit: 20,
  requirementFit: 15,
  intent: 10,
  engagement: 8,
  sourceQuality: 5,
  previousInteraction: 3,
  qualificationAnswers: 4,
};

type Evidence = z.infer<typeof evidenceSchema>;
type Weights = typeof DEFAULT_QUALITY_WEIGHTS;

function rows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return result.rows || [];
}

function first(result: any) { return rows(result)[0] || null; }

function insertedId(result: any): number {
  const row = first(result) || result?.[0] || result;
  const value = row?.insertId ?? row?.[0]?.insertId;
  if (!value) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create record" });
  return Number(value);
}

export function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function calculateCampaignLeadScore(evidence: Evidence, weights: Weights = DEFAULT_QUALITY_WEIGHTS) {
  const totalWeight = Object.values(weights).reduce((total, weight) => total + weight, 0);
  const breakdown = Object.entries(weights).map(([factor, weight]) => ({
    factor,
    weight,
    evidence: evidence[factor as keyof Evidence],
    contribution: Math.round(weight * Number(evidence[factor as keyof Evidence] || 0)),
  }));
  const rawScore = breakdown.reduce((total, item) => total + item.contribution, 0);
  const score = evidence.isDuplicate ? 0 : Math.min(100, Math.round((rawScore / totalWeight) * 100));
  return {
    score,
    explanation: {
      score,
      isDuplicate: evidence.isDuplicate,
      formula: "Weighted evidence score. Duplicate records are scored 0 and require review.",
      weights,
      evidence,
      breakdown,
    },
  };
}

async function requireAgency(userId: number) {
  const agency = await getAgencyByUserId(userId);
  if (!agency) throw new TRPCError({ code: "UNAUTHORIZED", message: "Agency not found" });
  return agency;
}

async function requireCampaign(db: any, agencyId: number, campaignId: number) {
  const profile = first(await db.execute(sql`
    SELECT campaignId, clientId FROM campaignProfiles WHERE campaignId = ${campaignId} AND agencyId = ${agencyId} LIMIT 1
  `));
  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
  return profile;
}

async function requireCampaignLead(db: any, agencyId: number, campaignLeadId: number) {
  const record = first(await db.execute(sql`
    SELECT clr.*, cp.agencyId, cp.clientId
    FROM campaignLeadRecords clr
    JOIN campaignProfiles cp ON cp.campaignId = clr.campaignId
    WHERE clr.id = ${campaignLeadId} AND cp.agencyId = ${agencyId}
    LIMIT 1
  `));
  if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign lead not found" });
  return record;
}

async function addEvent(db: any, campaignId: number, campaignLeadId: number, eventType: string, actorUserId: number, details: Record<string, unknown> = {}) {
  await db.execute(sql`
    INSERT INTO campaignLeadEvents (campaignId, campaignLeadId, eventType, actorUserId, details)
    VALUES (${campaignId}, ${campaignLeadId}, ${eventType}, ${actorUserId}, ${JSON.stringify(details)})
  `);
}

export const campaignIntelligenceRouter = router({
  listClients: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agency = await requireAgency(ctx.user!.id);
    return rows(await db.execute(sql`
      SELECT id, name, industry, contactName, contactEmail, contactPhone, status, notes, createdAt
      FROM campaignClients WHERE agencyId = ${agency.id} ORDER BY createdAt DESC
    `));
  }),

  createClient: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      industry: z.string().trim().max(120).optional(),
      contactName: z.string().trim().max(160).optional(),
      contactEmail: z.string().email().max(320).optional(),
      contactPhone: z.string().trim().max(40).optional(),
      notes: z.string().trim().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const result = await db.execute(sql`
        INSERT INTO campaignClients (agencyId, name, industry, contactName, contactEmail, contactPhone, notes)
        VALUES (${agency.id}, ${input.name}, ${input.industry || null}, ${input.contactName || null}, ${input.contactEmail || null}, ${input.contactPhone || null}, ${input.notes || null})
      `);
      return { id: insertedId(result) };
    }),

  listCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agency = await requireAgency(ctx.user!.id);
    return rows(await db.execute(sql`
      SELECT c.id, c.name, c.description, c.channel, c.status, c.targetLeadCount, c.createdAt,
             cp.clientId, cp.industry, cp.geography, cp.leadRequirement, cp.leadSource, cp.appointmentTarget, cp.campaignCost, cp.startDate, cp.endDate,
             cc.name AS clientName,
             COUNT(clr.id) AS generatedCount,
             SUM(clr.status = 'validated') AS validatedCount,
             SUM(clr.status = 'qualified') AS qualifiedCount,
             SUM(clr.status IN ('contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')) AS contactedCount,
             SUM(clr.status = 'interested') AS interestedCount,
             SUM(clr.status IN ('appointment','appointment_validated','delivered','accepted','rejected')) AS appointmentCount,
             SUM(clr.status = 'appointment_validated') AS validatedAppointmentCount,
             SUM(clr.status = 'delivered') AS deliveredCount,
             SUM(clr.status = 'accepted') AS acceptedCount,
             SUM(clr.status = 'rejected') AS rejectedCount
      FROM campaigns2 c
      JOIN campaignProfiles cp ON cp.campaignId = c.id AND cp.agencyId = ${agency.id}
      LEFT JOIN campaignClients cc ON cc.id = cp.clientId
      LEFT JOIN campaignLeadRecords clr ON clr.campaignId = c.id
      GROUP BY c.id, cp.id, cc.id
      ORDER BY c.createdAt DESC
    `));
  }),

  createCampaign: protectedProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      description: z.string().trim().max(5000).optional(),
      clientId: z.number().int().positive().optional(),
      industry: z.string().trim().max(120).optional(),
      geography: z.string().trim().max(2000).optional(),
      leadRequirement: z.string().trim().max(5000).optional(),
      leadSource: z.string().trim().max(120).optional(),
      targetLeadCount: z.number().int().min(0).max(100000),
      appointmentTarget: z.number().int().min(0).max(100000),
      campaignCost: z.number().min(0).max(100000000).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      if (input.clientId) {
        const client = first(await db.execute(sql`SELECT id FROM campaignClients WHERE id = ${input.clientId} AND agencyId = ${agency.id} LIMIT 1`));
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }
      const result = await db.execute(sql`
        INSERT INTO campaigns2 (name, description, channel, status, targetLeadCount, createdBy)
        VALUES (${input.name}, ${input.description || null}, 'multi', 'draft', ${input.targetLeadCount}, ${ctx.user!.id})
      `);
      const campaignId = insertedId(result);
      await db.execute(sql`
        INSERT INTO campaignProfiles (campaignId, agencyId, clientId, industry, geography, leadRequirement, leadSource, appointmentTarget, campaignCost, startDate, endDate)
        VALUES (${campaignId}, ${agency.id}, ${input.clientId || null}, ${input.industry || null}, ${input.geography || null}, ${input.leadRequirement || null}, ${input.leadSource || null}, ${input.appointmentTarget}, ${input.campaignCost ?? null}, ${input.startDate ? new Date(input.startDate) : null}, ${input.endDate ? new Date(input.endDate) : null})
      `);
      await db.execute(sql`INSERT INTO campaignQualityConfigs (campaignId, weights) VALUES (${campaignId}, ${JSON.stringify(DEFAULT_QUALITY_WEIGHTS)})`);
      return { id: campaignId };
    }),

  getCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const agency = await requireAgency(ctx.user!.id);
      await requireCampaign(db, agency.id, input.campaignId);
      const campaign = first(await db.execute(sql`
        SELECT c.*, cp.*, cc.name AS clientName
        FROM campaigns2 c JOIN campaignProfiles cp ON cp.campaignId = c.id
        LEFT JOIN campaignClients cc ON cc.id = cp.clientId
        WHERE c.id = ${input.campaignId} AND cp.agencyId = ${agency.id} LIMIT 1
      `));
      const records = rows(await db.execute(sql`
        SELECT clr.*, l.firstName, l.lastName, l.company, l.email, l.phone,
               cd.id AS deliveryId, cd.clientId AS deliveryClientId, cd.status AS deliveryStatus
        FROM campaignLeadRecords clr LEFT JOIN leads2 l ON l.id = clr.leadId
        LEFT JOIN campaignDeliveries cd ON cd.campaignLeadId = clr.id
        WHERE clr.campaignId = ${input.campaignId}
        ORDER BY clr.updatedAt DESC
      `));
      const events = rows(await db.execute(sql`
        SELECT * FROM campaignLeadEvents WHERE campaignId = ${input.campaignId} ORDER BY eventAt DESC LIMIT 100
      `));
      const config = first(await db.execute(sql`SELECT weights FROM campaignQualityConfigs WHERE campaignId = ${input.campaignId} LIMIT 1`));
      return { campaign, records, events, weights: config?.weights ? JSON.parse(config.weights) : DEFAULT_QUALITY_WEIGHTS };
    }),

  addLead: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive(), leadId: z.number().int().positive().optional(), source: z.string().trim().min(1).max(120), assignedTo: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      await requireCampaign(db, agency.id, input.campaignId);
      let isDuplicate = false;
      if (input.leadId) {
        const existing = first(await db.execute(sql`SELECT id FROM campaignLeadRecords WHERE campaignId = ${input.campaignId} AND leadId = ${input.leadId} LIMIT 1`));
        isDuplicate = Boolean(existing);
      }
      const result = await db.execute(sql`
        INSERT INTO campaignLeadRecords (campaignId, leadId, source, isDuplicate, assignedTo)
        VALUES (${input.campaignId}, ${input.leadId || null}, ${input.source}, ${isDuplicate}, ${input.assignedTo || null})
      `);
      const campaignLeadId = insertedId(result);
      await addEvent(db, input.campaignId, campaignLeadId, "generated", ctx.user!.id, { source: input.source, isDuplicate });
      return { id: campaignLeadId, isDuplicate };
    }),

  scoreLead: protectedProcedure
    .input(z.object({ campaignLeadId: z.number().int().positive(), evidence: evidenceSchema, status: z.enum(["validated", "qualified"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const record = await requireCampaignLead(db, agency.id, input.campaignLeadId);
      const config = first(await db.execute(sql`SELECT weights FROM campaignQualityConfigs WHERE campaignId = ${record.campaignId} LIMIT 1`));
      const rawWeights = config?.weights ? JSON.parse(config.weights) : DEFAULT_QUALITY_WEIGHTS;
      const weights: Weights = { ...DEFAULT_QUALITY_WEIGHTS, ...rawWeights };
      const result = calculateCampaignLeadScore(input.evidence, weights);
      const nextStatus = input.status || (input.evidence.isDuplicate ? "generated" : record.status);
      await db.execute(sql`
        UPDATE campaignLeadRecords SET qualityScore = ${result.score}, scoreExplanation = ${JSON.stringify(result.explanation)}, isDuplicate = ${input.evidence.isDuplicate}, status = ${nextStatus}
        WHERE id = ${input.campaignLeadId}
      `);
      await addEvent(db, record.campaignId, input.campaignLeadId, nextStatus === "qualified" ? "qualified" : "validated", ctx.user!.id, result.explanation);
      return result;
    }),

  updateLeadStatus: protectedProcedure
    .input(z.object({ campaignLeadId: z.number().int().positive(), status: lifecycleStatus, note: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const record = await requireCampaignLead(db, agency.id, input.campaignLeadId);
      await db.execute(sql`UPDATE campaignLeadRecords SET status = ${input.status} WHERE id = ${input.campaignLeadId}`);
      const eventMap: Record<string, string> = { contacted: "contact_attempt", interested: "interested", validated: "validated", qualified: "qualified" };
      await addEvent(db, record.campaignId, input.campaignLeadId, eventMap[input.status] || "note", ctx.user!.id, { status: input.status, note: input.note || null });
      return { success: true };
    }),

  setAppointment: protectedProcedure
    .input(z.object({
      campaignLeadId: z.number().int().positive(),
      scheduledAt: z.string().datetime().optional(),
      assignedTo: z.number().int().positive().optional(),
      notes: z.string().trim().max(5000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const record = await requireCampaignLead(db, agency.id, input.campaignLeadId);
      const result = await db.execute(sql`
        INSERT INTO campaignAppointments (campaignLeadId, scheduledAt, assignedTo, notes)
        VALUES (${input.campaignLeadId}, ${input.scheduledAt ? new Date(input.scheduledAt) : null}, ${input.assignedTo || null}, ${input.notes || null})
      `);
      await db.execute(sql`UPDATE campaignLeadRecords SET status = 'appointment' WHERE id = ${input.campaignLeadId}`);
      await addEvent(db, record.campaignId, input.campaignLeadId, "appointment_set", ctx.user!.id, { appointmentId: insertedId(result), scheduledAt: input.scheduledAt || null, note: input.notes || null });
      return { success: true };
    }),

  validateAppointment: protectedProcedure
    .input(z.object({ campaignLeadId: z.number().int().positive(), status: z.enum(["validated", "invalid", "no_show", "completed", "cancelled"]), notes: z.string().trim().max(5000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const record = await requireCampaignLead(db, agency.id, input.campaignLeadId);
      const appointment = first(await db.execute(sql`SELECT id FROM campaignAppointments WHERE campaignLeadId = ${input.campaignLeadId} ORDER BY createdAt DESC LIMIT 1`));
      if (!appointment) throw new TRPCError({ code: "NOT_FOUND", message: "Create an appointment first" });
      await db.execute(sql`
        UPDATE campaignAppointments SET status = ${input.status}, notes = COALESCE(${input.notes || null}, notes), validatedAt = ${input.status === "validated" ? new Date() : null}
        WHERE id = ${appointment.id}
      `);
      if (input.status === "validated") {
        await db.execute(sql`UPDATE campaignLeadRecords SET status = 'appointment_validated' WHERE id = ${input.campaignLeadId}`);
      }
      await addEvent(db, record.campaignId, input.campaignLeadId, input.status === "validated" ? "appointment_validated" : "note", ctx.user!.id, { appointmentStatus: input.status, note: input.notes || null });
      return { success: true };
    }),

  deliverLead: protectedProcedure
    .input(z.object({ campaignLeadId: z.number().int().positive(), clientId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const record = await requireCampaignLead(db, agency.id, input.campaignLeadId);
      const clientId = input.clientId || Number(record.clientId || 0);
      if (!clientId) throw new TRPCError({ code: "BAD_REQUEST", message: "Select a client before delivering this lead" });
      const client = first(await db.execute(sql`SELECT id FROM campaignClients WHERE id = ${clientId} AND agencyId = ${agency.id} LIMIT 1`));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      const existing = first(await db.execute(sql`SELECT id FROM campaignDeliveries WHERE campaignLeadId = ${input.campaignLeadId} AND clientId = ${clientId} LIMIT 1`));
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This lead is already delivered to that client" });
      await db.execute(sql`INSERT INTO campaignDeliveries (campaignLeadId, clientId) VALUES (${input.campaignLeadId}, ${clientId})`);
      await db.execute(sql`UPDATE campaignLeadRecords SET status = 'delivered' WHERE id = ${input.campaignLeadId}`);
      await addEvent(db, record.campaignId, input.campaignLeadId, "delivered", ctx.user!.id, { clientId });
      return { success: true };
    }),

  decideDelivery: protectedProcedure
    .input(z.object({
      campaignLeadId: z.number().int().positive(),
      outcome: z.enum(["accepted", "rejected"]),
      rejectionReason: z.enum(["wrong_geography", "wrong_requirement", "invalid_contact", "duplicate", "not_interested", "already_purchased", "incorrect_qualification", "appointment_invalid", "no_show", "client_specific"]).optional(),
      rejectionNotes: z.string().trim().max(5000).optional(),
      revenue: z.number().min(0).max(100000000).optional(),
      commission: z.number().min(0).max(100000000).optional(),
    }).superRefine((value, ctx) => {
      if (value.outcome === "rejected" && !value.rejectionReason) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A structured rejection reason is required." });
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const record = await requireCampaignLead(db, agency.id, input.campaignLeadId);
      const delivery = first(await db.execute(sql`SELECT id FROM campaignDeliveries WHERE campaignLeadId = ${input.campaignLeadId} ORDER BY deliveredAt DESC LIMIT 1`));
      if (!delivery) throw new TRPCError({ code: "NOT_FOUND", message: "Deliver this lead to a client first" });
      await db.execute(sql`
        UPDATE campaignDeliveries
        SET status = ${input.outcome}, rejectionReason = ${input.outcome === "rejected" ? input.rejectionReason! : null}, rejectionNotes = ${input.rejectionNotes || null}, decidedAt = ${new Date()}, revenue = ${input.revenue ?? null}, commission = ${input.commission ?? null}
        WHERE id = ${delivery.id}
      `);
      await db.execute(sql`UPDATE campaignLeadRecords SET status = ${input.outcome} WHERE id = ${input.campaignLeadId}`);
      await addEvent(db, record.campaignId, input.campaignLeadId, input.outcome, ctx.user!.id, { rejectionReason: input.rejectionReason || null, note: input.rejectionNotes || null });
      if (input.revenue !== undefined || input.commission !== undefined) await addEvent(db, record.campaignId, input.campaignLeadId, "revenue_recorded", ctx.user!.id, { revenue: input.revenue ?? null, commission: input.commission ?? null });
      return { success: true };
    }),

  createClientReviewLink: protectedProcedure
    .input(z.object({ deliveryId: z.number().int().positive(), expiresInDays: z.number().int().min(1).max(30).default(14) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      const delivery = first(await db.execute(sql`
        SELECT cd.id, clr.campaignId
        FROM campaignDeliveries cd
        JOIN campaignLeadRecords clr ON clr.id = cd.campaignLeadId
        JOIN campaignProfiles cp ON cp.campaignId = clr.campaignId
        WHERE cd.id = ${input.deliveryId} AND cp.agencyId = ${agency.id}
        LIMIT 1
      `));
      if (!delivery) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery not found" });
      const token = createAccessToken();
      const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);
      await db.execute(sql`
        INSERT INTO campaignDeliveryAccess (deliveryId, tokenHash, expiresAt, revokedAt, lastViewedAt)
        VALUES (${input.deliveryId}, ${hashAccessToken(token)}, ${expiresAt}, NULL, NULL)
        ON DUPLICATE KEY UPDATE tokenHash = VALUES(tokenHash), expiresAt = VALUES(expiresAt), revokedAt = NULL, lastViewedAt = NULL
      `);
      return { token, expiresAt };
    }),

  getClientDeliveryReview: publicProcedure
    .input(z.object({ token: z.string().trim().min(40).max(200) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const access = first(await db.execute(sql`
        SELECT cda.id AS accessId, cda.deliveryId, cda.expiresAt, cda.revokedAt,
               cd.status AS deliveryStatus, cd.rejectionReason, cd.rejectionNotes, cd.deliveredAt, cd.decidedAt,
               cc.name AS clientName, c.name AS campaignName, c.description AS campaignDescription,
               l.firstName, l.lastName, l.company, l.email, l.phone, l.city, l.state, l.propertyAddress, l.monthlyEnergyBill, l.systemSizeKw
        FROM campaignDeliveryAccess cda
        JOIN campaignDeliveries cd ON cd.id = cda.deliveryId
        JOIN campaignClients cc ON cc.id = cd.clientId
        JOIN campaignLeadRecords clr ON clr.id = cd.campaignLeadId
        JOIN campaigns2 c ON c.id = clr.campaignId
        LEFT JOIN leads2 l ON l.id = clr.leadId
        WHERE cda.tokenHash = ${hashAccessToken(input.token)} AND cda.revokedAt IS NULL AND cda.expiresAt > ${new Date()}
        LIMIT 1
      `));
      if (!access) throw new TRPCError({ code: "NOT_FOUND", message: "This review link is invalid, expired, or revoked." });
      await db.execute(sql`UPDATE campaignDeliveryAccess SET lastViewedAt = ${new Date()} WHERE id = ${access.accessId}`);
      return access;
    }),

  submitClientDeliveryDecision: publicProcedure
    .input(z.object({
      token: z.string().trim().min(40).max(200),
      outcome: z.enum(["accepted", "rejected"]),
      rejectionReason: z.enum(["wrong_geography", "wrong_requirement", "invalid_contact", "duplicate", "not_interested", "already_purchased", "incorrect_qualification", "appointment_invalid", "no_show", "client_specific"]).optional(),
      note: z.string().trim().max(5000).optional(),
    }).superRefine((value, ctx) => {
      if (value.outcome === "rejected" && !value.rejectionReason) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A rejection reason is required." });
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const access = first(await db.execute(sql`
        SELECT cda.id AS accessId, cda.deliveryId, clr.id AS campaignLeadId, clr.campaignId, cd.status AS deliveryStatus
        FROM campaignDeliveryAccess cda
        JOIN campaignDeliveries cd ON cd.id = cda.deliveryId
        JOIN campaignLeadRecords clr ON clr.id = cd.campaignLeadId
        WHERE cda.tokenHash = ${hashAccessToken(input.token)} AND cda.revokedAt IS NULL AND cda.expiresAt > ${new Date()}
        LIMIT 1
      `));
      if (!access) throw new TRPCError({ code: "NOT_FOUND", message: "This review link is invalid, expired, or revoked." });
      if (access.deliveryStatus !== "pending") throw new TRPCError({ code: "CONFLICT", message: "A decision has already been recorded for this lead." });
      await db.execute(sql`
        UPDATE campaignDeliveries
        SET status = ${input.outcome}, rejectionReason = ${input.outcome === "rejected" ? input.rejectionReason! : null}, rejectionNotes = ${input.note || null}, decidedAt = ${new Date()}
        WHERE id = ${access.deliveryId}
      `);
      await db.execute(sql`UPDATE campaignLeadRecords SET status = ${input.outcome} WHERE id = ${access.campaignLeadId}`);
      await db.execute(sql`
        INSERT INTO campaignLeadEvents (campaignId, campaignLeadId, eventType, actorUserId, details)
        VALUES (${access.campaignId}, ${access.campaignLeadId}, ${input.outcome}, NULL, ${JSON.stringify({ source: "client_portal", rejectionReason: input.rejectionReason || null, note: input.note || null })})
      `);
      return { success: true };
    }),

  updateQualityWeights: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive(), weights: z.record(z.string(), z.number().min(0).max(100)) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const agency = await requireAgency(ctx.user!.id);
      await requireCampaign(db, agency.id, input.campaignId);
      const weights = { ...DEFAULT_QUALITY_WEIGHTS, ...input.weights };
      await db.execute(sql`
        INSERT INTO campaignQualityConfigs (campaignId, weights) VALUES (${input.campaignId}, ${JSON.stringify(weights)})
        ON DUPLICATE KEY UPDATE weights = VALUES(weights)
      `);
      return { weights };
    }),

  getNorthStarDashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const agency = await requireAgency(ctx.user!.id);
    const totals = first(await db.execute(sql`
      SELECT
        COUNT(clr.id) AS generated,
        COALESCE(SUM(clr.status IN ('validated','qualified','contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS validated,
        COALESCE(SUM(clr.status IN ('qualified','contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS qualified,
        COALESCE(SUM(clr.status IN ('contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS contacted,
        COALESCE(SUM(clr.status IN ('interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS interested,
        COALESCE(SUM(clr.status IN ('appointment','appointment_validated','delivered','accepted','rejected')), 0) AS appointments,
        COALESCE(SUM(clr.status IN ('appointment_validated','delivered','accepted','rejected')), 0) AS validatedAppointments,
        COALESCE(SUM(clr.status IN ('delivered','accepted','rejected')), 0) AS delivered,
        COALESCE(SUM(clr.status = 'accepted'), 0) AS accepted,
        COALESCE(SUM(clr.status = 'rejected'), 0) AS rejected,
        COALESCE(SUM(cd.revenue), 0) AS revenue,
        COALESCE(SUM(cd.commission), 0) AS commission,
        (SELECT COALESCE(SUM(cost.campaignCost), 0) FROM campaignProfiles cost WHERE cost.agencyId = ${agency.id}) AS campaignCost
      FROM campaignProfiles cp
      JOIN campaigns2 c ON c.id = cp.campaignId
      LEFT JOIN campaignLeadRecords clr ON clr.campaignId = cp.campaignId
      LEFT JOIN (SELECT campaignLeadId, SUM(revenue) AS revenue, SUM(commission) AS commission FROM campaignDeliveries GROUP BY campaignLeadId) cd ON cd.campaignLeadId = clr.id
      WHERE cp.agencyId = ${agency.id}
    `)) || {};

    const campaigns = rows(await db.execute(sql`
      SELECT c.id, c.name, c.status, c.targetLeadCount, cp.appointmentTarget, cp.startDate, cp.endDate, cp.campaignCost,
             COUNT(clr.id) AS generated,
             COALESCE(SUM(clr.status = 'accepted'), 0) AS accepted,
             COALESCE(SUM(clr.status IN ('delivered','accepted','rejected')), 0) AS delivered,
             COALESCE(SUM(clr.status IN ('appointment','appointment_validated','delivered','accepted','rejected')), 0) AS appointments,
             COALESCE(SUM(clr.status IN ('appointment_validated','delivered','accepted','rejected')), 0) AS validatedAppointments,
             COALESCE(SUM(cd.revenue), 0) AS revenue,
             COALESCE(SUM(cd.commission), 0) AS commission
      FROM campaignProfiles cp JOIN campaigns2 c ON c.id = cp.campaignId
      LEFT JOIN campaignLeadRecords clr ON clr.campaignId = c.id
      LEFT JOIN (SELECT campaignLeadId, SUM(revenue) AS revenue, SUM(commission) AS commission FROM campaignDeliveries GROUP BY campaignLeadId) cd ON cd.campaignLeadId = clr.id
      WHERE cp.agencyId = ${agency.id}
      GROUP BY c.id, cp.id ORDER BY cp.endDate IS NULL, cp.endDate ASC, c.createdAt DESC
    `)).map((campaign: any) => {
      const target = Number(campaign.targetLeadCount || 0);
      const accepted = Number(campaign.accepted || 0);
      const start = campaign.startDate ? new Date(campaign.startDate).getTime() : null;
      const end = campaign.endDate ? new Date(campaign.endDate).getTime() : null;
      const now = Date.now();
      const elapsedDays = start ? Math.max(1, Math.ceil((now - start) / 86_400_000)) : null;
      const remainingDays = end ? Math.max(0, Math.ceil((end - now) / 86_400_000)) : null;
      const requiredDaily = target && remainingDays !== null && remainingDays > 0 ? Math.max(0, (target - accepted) / remainingDays) : null;
      const currentDaily = elapsedDays ? accepted / elapsedDays : null;
      const health = !target || !start || !end || currentDaily === null || requiredDaily === null ? "unrated" : currentDaily >= requiredDaily ? "on_track" : currentDaily >= requiredDaily * 0.7 ? "at_risk" : "off_track";
      return { ...campaign, requiredDaily, currentDaily, health };
    });

    const sources = rows(await db.execute(sql`
      SELECT clr.source,
             COUNT(*) AS generated,
             COALESCE(SUM(clr.status IN ('qualified','contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS qualified,
             COALESCE(SUM(clr.status IN ('appointment','appointment_validated','delivered','accepted','rejected')), 0) AS appointments,
             COALESCE(SUM(clr.status = 'accepted'), 0) AS accepted,
             COALESCE(SUM(cd.revenue), 0) AS revenue
      FROM campaignLeadRecords clr
      JOIN campaignProfiles cp ON cp.campaignId = clr.campaignId
      LEFT JOIN (SELECT campaignLeadId, SUM(revenue) AS revenue, SUM(commission) AS commission FROM campaignDeliveries GROUP BY campaignLeadId) cd ON cd.campaignLeadId = clr.id
      WHERE cp.agencyId = ${agency.id}
      GROUP BY clr.source ORDER BY accepted DESC, appointments DESC, generated DESC
    `));

    const clients = rows(await db.execute(sql`
      SELECT cc.id, cc.name,
             COUNT(cd.id) AS delivered,
             COALESCE(SUM(cd.status = 'accepted'), 0) AS accepted,
             COALESCE(SUM(cd.status = 'rejected'), 0) AS rejected,
             COALESCE(SUM(cd.revenue), 0) AS revenue
      FROM campaignClients cc
      LEFT JOIN campaignDeliveries cd ON cd.clientId = cc.id
      WHERE cc.agencyId = ${agency.id}
      GROUP BY cc.id ORDER BY accepted DESC, delivered DESC
    `));

    const team = rows(await db.execute(sql`
      SELECT clr.assignedTo AS userId, COALESCE(u.name, CONCAT('User #', clr.assignedTo)) AS name,
             COUNT(clr.id) AS leads,
             COALESCE(SUM(clr.status IN ('contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS contacts,
             COALESCE(SUM(clr.status IN ('qualified','contacted','interested','appointment','appointment_validated','delivered','accepted','rejected')), 0) AS qualified,
             COALESCE(SUM(clr.status IN ('appointment','appointment_validated','delivered','accepted','rejected')), 0) AS appointments,
             COALESCE(SUM(clr.status = 'accepted'), 0) AS accepted,
             COALESCE(SUM(cd.revenue), 0) AS revenue
      FROM campaignLeadRecords clr
      JOIN campaignProfiles cp ON cp.campaignId = clr.campaignId
      LEFT JOIN users u ON u.id = clr.assignedTo
      LEFT JOIN (SELECT campaignLeadId, SUM(revenue) AS revenue, SUM(commission) AS commission FROM campaignDeliveries GROUP BY campaignLeadId) cd ON cd.campaignLeadId = clr.id
      WHERE cp.agencyId = ${agency.id} AND clr.assignedTo IS NOT NULL
      GROUP BY clr.assignedTo, u.name ORDER BY accepted DESC, appointments DESC
    `));

    const rejections = rows(await db.execute(sql`
      SELECT rejectionReason, COUNT(*) AS count
      FROM campaignDeliveries cd JOIN campaignClients cc ON cc.id = cd.clientId
      WHERE cc.agencyId = ${agency.id} AND cd.status = 'rejected' AND cd.rejectionReason IS NOT NULL
      GROUP BY rejectionReason ORDER BY count DESC
    `));

    return { totals, campaigns, sources, clients, team, rejections };
  }),

  getCampaignGuidance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agency = await requireAgency(ctx.user!.id);
    const dashboard = await (async () => {
      const result = first(await db.execute(sql`
        SELECT COUNT(*) AS campaignCount, COALESCE(SUM(clr.status = 'qualified'), 0) AS qualified, COALESCE(SUM(clr.status = 'accepted'), 0) AS accepted
        FROM campaignProfiles cp LEFT JOIN campaignLeadRecords clr ON clr.campaignId = cp.campaignId
        WHERE cp.agencyId = ${agency.id}
      `));
      return result || {};
    })();
    if (!Number(dashboard.campaignCount || 0)) return [];
    const campaignRows = rows(await db.execute(sql`
      SELECT c.id, c.name, c.targetLeadCount, cp.startDate, cp.endDate, COUNT(clr.id) AS generated, COALESCE(SUM(clr.status = 'accepted'), 0) AS accepted
      FROM campaignProfiles cp JOIN campaigns2 c ON c.id = cp.campaignId LEFT JOIN campaignLeadRecords clr ON clr.campaignId = c.id
      WHERE cp.agencyId = ${agency.id} GROUP BY c.id, cp.id
    `));
    const suggestions: Array<{ level: "info" | "warning" | "success"; title: string; detail: string }> = [];
    for (const campaign of campaignRows) {
      const target = Number(campaign.targetLeadCount || 0);
      const accepted = Number(campaign.accepted || 0);
      const end = campaign.endDate ? new Date(campaign.endDate).getTime() : null;
      const start = campaign.startDate ? new Date(campaign.startDate).getTime() : null;
      if (target && start && end && end > Date.now()) {
        const elapsed = Math.max(1, Math.ceil((Date.now() - start) / 86_400_000));
        const remaining = Math.max(1, Math.ceil((end - Date.now()) / 86_400_000));
        const currentRate = accepted / elapsed;
        const requiredRate = Math.max(0, (target - accepted) / remaining);
        if (currentRate < requiredRate) suggestions.push({ level: "warning", title: `${campaign.name} is behind target`, detail: `Actual accepted-lead rate is ${currentRate.toFixed(1)}/day; ${requiredRate.toFixed(1)}/day is required for the recorded target.` });
        else suggestions.push({ level: "success", title: `${campaign.name} is on track`, detail: `Actual accepted-lead rate is ${currentRate.toFixed(1)}/day against a required ${requiredRate.toFixed(1)}/day.` });
      }
    }
    const topRejection = first(await db.execute(sql`
      SELECT cd.rejectionReason, COUNT(*) AS count FROM campaignDeliveries cd JOIN campaignClients cc ON cc.id = cd.clientId
      WHERE cc.agencyId = ${agency.id} AND cd.status = 'rejected' AND cd.rejectionReason IS NOT NULL
      GROUP BY cd.rejectionReason ORDER BY count DESC LIMIT 1
    `));
    if (topRejection) suggestions.push({ level: "info", title: "Most recorded rejection reason", detail: `${String(topRejection.rejectionReason).replaceAll("_", " ")} accounts for ${topRejection.count} recorded client rejections.` });
    return suggestions.slice(0, 8);
  }),
});
