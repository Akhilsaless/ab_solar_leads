import { getOutreachOverview } from "./outreachReporting";
import { istDayBounds } from "../shared/reportingTime";
import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { sql } from "drizzle-orm";
import { launchOutreachRun } from "./autoOutreachHandler";

/**
 * Automated Outreach Router
 * Handles daily automated WhatsApp/Email outreach to Telangana businesses
 * Includes: scheduling, message generation, response tracking, lead scoring, analytics
 */

// Industry-specific message templates
const INDUSTRY_PITCHES: Record<string, string> = {
  textile_mills: "Hi {{ownerName}}, Sales Squad can prepare a preliminary solar assessment for {{businessName}} after reviewing your electricity bill and site conditions. Interested in a no-obligation review?",
  cold_storage: "Hi {{ownerName}}, high-energy businesses such as {{businessName}} may benefit from a preliminary solar assessment. Final suitability depends on bill review and site survey. Interested?",
  hospitals: "Hi {{ownerName}}, Sales Squad can assess solar suitability for {{businessName}} based on energy use and site conditions. Any estimate is preliminary until a survey. May we share a review link?",
  hotels_resorts: "Hi {{ownerName}}, we can prepare a preliminary solar assessment for {{businessName}} based on your energy use and site conditions. Interested in a no-obligation review?",
  factories: "Hi {{ownerName}}, Sales Squad can assess whether solar is suitable for {{businessName}} after bill review and a site survey. Any savings estimate is preliminary. Interested?",
  shopping_malls: "Hi {{ownerName}}, we can prepare a preliminary solar assessment for {{businessName}} after bill review and a site survey. Interested in a no-obligation review?",
  warehouses: "Hi {{ownerName}}, Sales Squad can assess solar suitability for {{businessName}} based on energy use and site conditions. Any estimate is preliminary until a survey. Interested?",
  default: "Hi {{ownerName}}, Sales Squad can prepare a preliminary solar assessment for {{businessName}} after bill review and a site survey. Interested in a no-obligation review?",
};

// Lead scoring weights
const LEAD_SCORING_WEIGHTS = {
  businessType: {
    textile_mills: 40,
    cold_storage: 35,
    hospitals: 30,
    factories: 40,
    cold_storage_dairy: 35,
    textile_mills_garment: 40,
    shopping_malls: 20,
    hotels_resorts: 25,
    warehouses: 30,
    default: 15,
  },
  size: {
    large: 30,
    medium: 15,
    small: 5,
  },
  rating: {
    4.5: 20,
    4.0: 15,
    3.5: 10,
    default: 5,
  },
  contactQuality: {
    has_email: 10,
    has_phone: 10,
    has_website: 5,
  },
  engagement: {
    opened_email: 5,
    clicked_link: 10,
    replied: 20,
  },
};

export const automatedOutreachRouter = router({
  // ===== CONFIGURATION =====
  config: router({
    create: protectedProcedure
      .input(z.object({
        state: z.string(),
        businessTypes: z.array(z.string()),
        minRating: z.number().default(3.5),
        contactsPerDay: z.number().default(30),
        scheduleTime: z.string().default("10:00"),
        messageType: z.enum(["generic", "industry_specific"]).default("industry_specific"),
        adminPhoneNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");

        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        const result = await dbConn.execute(sql`
          INSERT INTO automatedOutreachConfig 
          (agencyId, state, businessTypes, minRating, contactsPerDay, scheduleTime, messageType, adminPhoneNumber)
          VALUES (${agency.id}, ${input.state}, ${JSON.stringify(input.businessTypes)}, ${input.minRating}, ${input.contactsPerDay}, ${input.scheduleTime}, ${input.messageType}, ${input.adminPhoneNumber || null})
        `);

        return { success: true, id: (result as any).insertId };
      }),

    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      const configs = await dbConn.execute(sql`
        SELECT * FROM automatedOutreachConfig WHERE agencyId = ${agency.id}
      `) as any[];

      return Array.isArray(configs[0]) ? configs[0] : configs;
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        isEnabled: z.boolean().optional(),
        contactsPerDay: z.number().optional(),
        scheduleTime: z.string().optional(),
        adminPhoneNumber: z.string().optional(),
        outreachMode: z.enum(["blind", "owner_only"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");

        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        const updates: string[] = [];
        const values: any[] = [];

        if (input.isEnabled !== undefined) {
          updates.push("isEnabled = ?");
          values.push(input.isEnabled);
        }
        if (input.contactsPerDay !== undefined) {
          updates.push("contactsPerDay = ?");
          values.push(input.contactsPerDay);
        }
        if (input.scheduleTime !== undefined) {
          updates.push("scheduleTime = ?");
          values.push(input.scheduleTime);
        }
        if (input.adminPhoneNumber !== undefined) {
          updates.push("adminPhoneNumber = ?");
          values.push(input.adminPhoneNumber);
        }
        if (input.outreachMode !== undefined) {
          updates.push("outreachMode = ?");
          values.push(input.outreachMode);
        }

        if (updates.length === 0) return { success: true };

        values.push(input.id);
        values.push(agency.id);

        await dbConn.execute(sql`
          UPDATE automatedOutreachConfig 
          SET ${sql.raw(updates.join(", "))}
          WHERE id = ? AND agencyId = ?
        `);

        return { success: true };
      }),
  }),

  // ===== LEAD SCORING =====
  scoring: router({
    initializeScoring: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      // Check if scoring config exists
      const existing = await dbConn.execute(sql`
        SELECT id FROM leadScoringConfig WHERE agencyId = ${agency.id}
      `) as any[];

      if (existing && Array.isArray(existing[0]) && existing[0].length > 0) {
        return { success: true, message: "Scoring config already exists" };
      }

      // Create default scoring config
      await dbConn.execute(sql`
        INSERT INTO leadScoringConfig 
        (agencyId, businessTypeScores, sizeScores, ratingScores, contactQualityScores, engagementScores)
        VALUES (
          ${agency.id},
          ${JSON.stringify(LEAD_SCORING_WEIGHTS.businessType)},
          ${JSON.stringify(LEAD_SCORING_WEIGHTS.size)},
          ${JSON.stringify(LEAD_SCORING_WEIGHTS.rating)},
          ${JSON.stringify(LEAD_SCORING_WEIGHTS.contactQuality)},
          ${JSON.stringify(LEAD_SCORING_WEIGHTS.engagement)}
        )
      `);

      return { success: true, message: "Scoring config initialized" };
    }),

    calculateScore: protectedProcedure
      .input(z.object({
        businessType: z.string(),
        businessSize: z.enum(["small", "medium", "large"]),
        rating: z.number(),
        hasEmail: z.boolean(),
        hasPhone: z.boolean(),
        hasWebsite: z.boolean(),
      }))
      .query(async ({ input }) => {
        let score = 0;

        // Business type score
        score += (LEAD_SCORING_WEIGHTS.businessType as any)[input.businessType] || LEAD_SCORING_WEIGHTS.businessType.default;

        // Size score
        score += LEAD_SCORING_WEIGHTS.size[input.businessSize];

        // Rating score
        const ratingKey = input.rating >= 4.5 ? 4.5 : input.rating >= 4.0 ? 4.0 : input.rating >= 3.5 ? 3.5 : "default";
        score += (LEAD_SCORING_WEIGHTS.rating as any)[ratingKey];

        // Contact quality
        if (input.hasEmail) score += LEAD_SCORING_WEIGHTS.contactQuality.has_email;
        if (input.hasPhone) score += LEAD_SCORING_WEIGHTS.contactQuality.has_phone;
        if (input.hasWebsite) score += LEAD_SCORING_WEIGHTS.contactQuality.has_website;

        return { score, maxScore: 100 };
      }),
  }),

  // ===== MESSAGE GENERATION =====
  messages: router({
    generatePitch: protectedProcedure
      .input(z.object({
        businessName: z.string(),
        businessType: z.string(),
        ownerName: z.string(),
        city: z.string(),
      }))
      .query(async ({ input }) => {
        // Get template for business type
        let template = (INDUSTRY_PITCHES as any)[input.businessType] || INDUSTRY_PITCHES.default;

        // Replace placeholders
        template = template
          .replace(/{{businessName}}/g, input.businessName)
          .replace(/{{ownerName}}/g, input.ownerName)
          .replace(/{{city}}/g, input.city);

        return { pitch: template };
      }),

    generateChatbotLink: protectedProcedure
      .input(z.object({
        businessId: z.number(),
        businessName: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");

        // Generate unique tracking code
        const trackingCode = `OUTREACH_${input.businessId}_${Date.now()}`;

        // Create personalized chatbot link
        const chatbotLink = `/chat/${agency.agencySlug}?ref=${trackingCode}&business=${input.businessId}`;

        return { chatbotLink, trackingCode };
      }),
  }),

  // ===== OUTREACH RECORDS =====
  records: router({
    getToday: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      const today = new Date().toISOString().split("T")[0];

      const records = await dbConn.execute(sql`
        SELECT * FROM outreachCampaignRecords 
        WHERE configId IN (SELECT id FROM automatedOutreachConfig WHERE agencyId = ${agency.id})
        AND DATE(createdAt) = ${today}
        ORDER BY createdAt DESC
      `) as any[];

      return Array.isArray(records[0]) ? records[0] : records;
    }),

    getReplies: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      const replies = await dbConn.execute(sql`
        SELECT * FROM outreachCampaignRecords 
        WHERE configId IN (SELECT id FROM automatedOutreachConfig WHERE agencyId = ${agency.id})
        AND status IN ('replied', 'opened')
        ORDER BY repliedAt DESC LIMIT 50
      `) as any[];

      return Array.isArray(replies[0]) ? replies[0] : replies;
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        recordId: z.number(),
        status: z.enum(["queued", "sent", "delivered", "opened", "replied", "failed"]),
        replyText: z.string().optional(),
        leadScore: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");

        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        const timestamp = input.status === "replied" ? new Date() : null;

        await dbConn.execute(sql`
          UPDATE outreachCampaignRecords 
          SET status = ${input.status}, 
              replyText = ${input.replyText || null},
              repliedAt = ${timestamp},
              leadScore = ${input.leadScore || 0}
          WHERE id = ${input.recordId}
          AND configId IN (SELECT id FROM automatedOutreachConfig WHERE agencyId = ${agency.id})
        `);

        return { success: true };
      }),
  }),

  // ===== ANALYTICS =====
  analytics: router({
    getDaily: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      const today = new Date().toISOString().split("T")[0];

      const analytics = await dbConn.execute(sql`
        SELECT * FROM outreachAnalytics 
        WHERE configId IN (SELECT id FROM automatedOutreachConfig WHERE agencyId = ${agency.id})
        AND date = ${today}
      `) as any[];

      const records = Array.isArray(analytics[0]) ? analytics[0] : analytics;
      return records.length > 0 ? records[0] : null;
    }),

    getWeekly: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const analytics = await dbConn.execute(sql`
        SELECT * FROM outreachAnalytics 
        WHERE configId IN (SELECT id FROM automatedOutreachConfig WHERE agencyId = ${agency.id})
        AND date >= ${sevenDaysAgo}
        ORDER BY date DESC
      `) as any[];

      return Array.isArray(analytics[0]) ? analytics[0] : analytics;
    }),
  }),

  // ===== DATA VERIFICATION =====
  verification: router({
    verifyContact: protectedProcedure
      .input(z.object({
        businessId: z.number(),
        email: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        let verificationScore = 0;
        let emailValid = false;
        let phoneValid = false;
        let phoneHasWhatsapp = false;
        let websiteActive = false;

        // Email validation (basic)
        if (input.email && input.email.includes("@")) {
          emailValid = true;
          verificationScore += 25;
        }

        // Phone validation (basic)
        if (input.phone && input.phone.length >= 10) {
          phoneValid = true;
          verificationScore += 25;
          // Assume WhatsApp enabled if phone exists
          phoneHasWhatsapp = true;
          verificationScore += 15;
        }

        // Website validation (basic)
        if (input.website && input.website.startsWith("http")) {
          websiteActive = true;
          verificationScore += 20;
        }

        // Assume business is active if any contact info exists
        const businessActive = emailValid || phoneValid || websiteActive;
        if (businessActive) verificationScore += 15;

        // Save verification log
        await dbConn.execute(sql`
          INSERT INTO dataVerificationLog 
          (businessId, emailValid, phoneValid, phoneHasWhatsapp, websiteActive, businessActive, verificationScore, lastVerifiedAt)
          VALUES (${input.businessId}, ${emailValid}, ${phoneValid}, ${phoneHasWhatsapp}, ${websiteActive}, ${businessActive}, ${verificationScore}, NOW())
          ON DUPLICATE KEY UPDATE 
          emailValid = ${emailValid}, phoneValid = ${phoneValid}, phoneHasWhatsapp = ${phoneHasWhatsapp}, 
          websiteActive = ${websiteActive}, businessActive = ${businessActive}, verificationScore = ${verificationScore}, 
          lastVerifiedAt = NOW()
        `);

        return { verificationScore, emailValid, phoneValid, phoneHasWhatsapp, websiteActive, businessActive };
      }),
  }),

  // ===== SMART CRON OUTREACH CONFIG (city/state selector + city rotation) =====
  smartConfig: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB error");
      const rows = await dbConn.execute(sql`SELECT * FROM outreachConfig WHERE agencyId = ${agency.id} ORDER BY id ASC LIMIT 1`) as any[];
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      const row = (data as any[])[0];
      if (!row) return { isEnabled: 0, targetCity: "Hyderabad", targetState: "Telangana", contactMethod: "email", cityRotation: null, rotationIndex: 0 };
      // Parse cityRotation JSON if stored as string
      if (row.cityRotation && typeof row.cityRotation === "string") {
        try { row.cityRotation = JSON.parse(row.cityRotation); } catch { row.cityRotation = null; }
      }
      return row;
    }),
    update: protectedProcedure
      .input(z.object({
        targetCity: z.string(),
        targetState: z.string(),
        isEnabled: z.boolean().optional(),
        contactMethod: z.enum(["email", "whatsapp", "both"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB error");
        const existingRows = await dbConn.execute(sql`SELECT isEnabled, contactMethod FROM outreachConfig WHERE agencyId = ${agency.id} ORDER BY id ASC LIMIT 1`) as any[];
        const existingData = Array.isArray(existingRows[0]) ? existingRows[0] : existingRows;
        const existing = (existingData as any[])[0];
        const enabled = input.isEnabled !== undefined ? (input.isEnabled ? 1 : 0) : (existing ? Number(existing.isEnabled) : 0);
        const method = input.contactMethod || existing?.contactMethod || "email";
        await dbConn.execute(sql`
          INSERT INTO outreachConfig (agencyId, targetCity, targetState, isEnabled, contactMethod)
          VALUES (${agency.id}, ${input.targetCity}, ${input.targetState}, ${enabled}, ${method})
          ON DUPLICATE KEY UPDATE targetCity = ${input.targetCity}, targetState = ${input.targetState}, isEnabled = ${enabled}, contactMethod = ${method}
        `);
        return { success: true };
      }),
    updateRotation: protectedProcedure
      .input(z.object({
        cityRotation: z.array(z.object({ city: z.string(), state: z.string() })),
        rotationIndex: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB error");
        const rotationJson = JSON.stringify(input.cityRotation);
        const idx = input.rotationIndex ?? 0;
        await dbConn.execute(sql`
          INSERT INTO outreachConfig (agencyId, targetCity, targetState, isEnabled, contactMethod, cityRotation, rotationIndex)
          VALUES (${agency.id}, 'Hyderabad', 'Telangana', 0, 'email', ${rotationJson}, ${idx})
          ON DUPLICATE KEY UPDATE cityRotation = ${rotationJson}, rotationIndex = ${idx}
        `);
        return { success: true };
      }),
    triggerNow: protectedProcedure
      .input(z.object({ slot: z.number().min(1).max(5) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        return await launchOutreachRun(agency.id, input.slot);
      }),
  }),

  // ===== SMART CRON RUN HISTORY =====
  runs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB error");
      const rows = await dbConn.execute(sql`
        SELECT * FROM outreachRuns WHERE agencyId = ${agency.id}
        ORDER BY startedAt DESC LIMIT 50
      `) as any[];
      return Array.isArray(rows[0]) ? rows[0] : rows;
    }),
    todayStats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB error");
      return getOutreachOverview(dbConn, agency.id);
    }),
    getBusinesses: protectedProcedure
      .input(z.object({ runId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB error");
        const rows = await dbConn.execute(sql`
          SELECT id, businessName, businessType, businessSize, phone, email, website, address, city, state,
                 rating, reviewCount, contactStatus, emailSentAt, placeId
          FROM scrapedBusinesses
          WHERE agencyId = ${agency.id} AND outreachRunId = ${input.runId}
          ORDER BY id DESC LIMIT 50
        `) as any[];
        return Array.isArray(rows[0]) ? rows[0] : rows;
      }),

    // Get all businesses emailed today (for Leads Contacted tab)
    getLeadsContacted: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB error");
      const { start, end } = istDayBounds();
      const rows = await dbConn.execute(sql`
        SELECT id, businessName, businessType, businessSize, phone, email, website, address, city, state,
               rating, reviewCount, contactStatus, emailSentAt, emailOpenCount, chatbotClickCount, lastOpenedAt
        FROM scrapedBusinesses
        WHERE agencyId = ${agency.id}
          AND contactStatus IN ('contacted', 'emailed', 'whatsapp_sent')
          AND emailSentAt IS NOT NULL
          AND emailSentAt >= ${start} AND emailSentAt < ${end}
        ORDER BY emailSentAt DESC LIMIT 100
      `) as any[];
      return Array.isArray(rows[0]) ? rows[0] : rows;
    }),

    // Get email open + chatbot click status (for Status tab)
    getEmailStatus: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB error");
      const rows = await dbConn.execute(sql`
        SELECT id, businessName, businessType, phone, email, city, state,
               emailOpenCount, chatbotClickCount, lastOpenedAt, emailSentAt, contactStatus
        FROM scrapedBusinesses
        WHERE agencyId = ${agency.id}
          AND (emailOpenCount > 0 OR chatbotClickCount > 0)
        ORDER BY COALESCE(lastOpenedAt, emailSentAt) DESC LIMIT 100
      `) as any[];
      return Array.isArray(rows[0]) ? rows[0] : rows;
    }),
  }),
});
