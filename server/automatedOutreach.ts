import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { sql } from "drizzle-orm";

/**
 * Automated Outreach Router
 * Handles daily automated WhatsApp/Email outreach to Telangana businesses
 * Includes: scheduling, message generation, response tracking, lead scoring, analytics
 */

// Industry-specific message templates
const INDUSTRY_PITCHES: Record<string, string> = {
  textile_mills: "Hi {{ownerName}}, we help textile mills like {{businessName}} cut electricity bills by 60-70%. Your industry typically spends ₹5-15 lakhs/month on power. Solar could save you ₹3-9 lakhs/month. Plus: Government subsidy up to ₹15 lakhs available. Can I send a free solar potential report?",
  cold_storage: "Hi {{ownerName}}, cold storage facilities are high-energy consumers. {{businessName}} could save 50-60% on electricity with solar. That's ₹3-6 lakhs/month in savings. Government subsidy available. Interested in a free analysis?",
  hospitals: "Hi {{ownerName}}, {{businessName}} can reduce energy costs by 40-50% with solar + backup power. Hospitals benefit from reliable power + savings. Government subsidy up to ₹15 lakhs. Can we discuss your solar potential?",
  hotels_resorts: "Hi {{ownerName}}, {{businessName}} can cut AC & lighting costs by 50-60% with solar. That's ₹2-6 lakhs/month saved. Plus: Government subsidy available. Interested in a free solar report?",
  factories: "Hi {{ownerName}}, factories like {{businessName}} spend ₹3-12 lakhs/month on electricity. Solar could cut this by 60-70%. Government subsidy up to ₹15 lakhs. Can I send you a free analysis?",
  shopping_malls: "Hi {{ownerName}}, {{businessName}} can reduce energy costs by 40-50% with solar. That's ₹2-8 lakhs/month in savings. Government subsidy available. Interested in exploring solar?",
  warehouses: "Hi {{ownerName}}, {{businessName}} can save 50-60% on electricity with solar. That's ₹1-5 lakhs/month. Plus: Government subsidy up to ₹15 lakhs. Can we discuss your solar potential?",
  default: "Hi {{ownerName}}, {{businessName}} can significantly reduce electricity costs with solar energy. Government subsidy available. Interested in a free solar potential report?",
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

  // ===== SMART CRON OUTREACH CONFIG (city/state selector) =====
  smartConfig: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) throw new Error("Agency not found");
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("DB error");
      const rows = await dbConn.execute(sql`SELECT * FROM outreachConfig WHERE agencyId = ${agency.id} LIMIT 1`) as any[];
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      return (data as any[])[0] || { isEnabled: 1, targetCity: "Hyderabad", targetState: "Telangana" };
    }),
    update: protectedProcedure
      .input(z.object({
        targetCity: z.string(),
        targetState: z.string(),
        isEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB error");
        const enabled = input.isEnabled !== undefined ? (input.isEnabled ? 1 : 0) : 1;
        await dbConn.execute(sql`
          INSERT INTO outreachConfig (agencyId, targetCity, targetState, isEnabled)
          VALUES (${agency.id}, ${input.targetCity}, ${input.targetState}, ${enabled})
          ON DUPLICATE KEY UPDATE targetCity = ${input.targetCity}, targetState = ${input.targetState}, isEnabled = ${enabled}
        `);
        return { success: true };
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
      const rows = await dbConn.execute(sql`
        SELECT
          COUNT(*) as totalRuns,
          COALESCE(SUM(scrapedCount),0) as totalScraped,
          COALESCE(SUM(eligibleCount),0) as totalEligible,
          COALESCE(SUM(emailSentCount),0) as totalEmailSent,
          COALESCE(SUM(whatsappSentCount),0) as totalWhatsappSent,
          COALESCE(SUM(errorCount),0) as totalErrors
        FROM outreachRuns
        WHERE agencyId = ${agency.id} AND DATE(startedAt) = CURDATE()
      `) as any[];
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      return (data as any[])[0] || { totalRuns: 0, totalScraped: 0, totalEligible: 0, totalEmailSent: 0, totalWhatsappSent: 0, totalErrors: 0 };
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
  }),
});
