import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Lead management procedures
  leads: router({
    create: publicProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(10),
        propertyAddress: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zipCode: z.string().min(5),
        monthlyEnergyBill: z.number().optional(),
        roofCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
        roofAge: z.number().optional(),
        sunExposure: z.enum(["full", "partial", "shaded"]).optional(),
        installationTimeline: z.enum(["immediate", "3-6months", "6-12months", "exploring"]).optional(),
        homeownershipType: z.enum(["owned", "financed", "rented"]).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Calculate estimated savings based on energy bill
          const estimatedSavings = input.monthlyEnergyBill 
            ? Math.round(input.monthlyEnergyBill * 12 * 0.3) // Assume 30% savings
            : 0;

          // Calculate initial lead score
          const leadScore = calculateLeadScore(input);

          const result = await db.createLead({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            propertyAddress: input.propertyAddress,
            city: input.city,
            state: input.state,
            zipCode: input.zipCode,
            monthlyEnergyBill: input.monthlyEnergyBill as any,
            roofCondition: input.roofCondition,
            roofAge: input.roofAge,
            sunExposure: input.sunExposure,
            installationTimeline: input.installationTimeline,
            homeownershipType: input.homeownershipType,
            estimatedSavings: estimatedSavings as any,
            leadScore,
            status: "new",
            priority: leadScore > 70 ? "high" : leadScore > 40 ? "medium" : "low",
            source: "website",
          });

          // Notify owner about new lead
          await notifyOwner({
            title: "New Solar Lead Received",
            content: `${input.firstName} ${input.lastName} from ${input.city}, ${input.state} has submitted a lead. Estimated monthly savings: $${estimatedSavings}`,
          });

          // Add timeline event
          const leadId = Math.floor(Math.random() * 1000000); // Placeholder - will be fixed with proper insert response
          await db.addTimelineEvent({
            leadId,
            eventType: "status_change",
            newValue: "new",
            description: "Lead created from website form",
          });

          return { success: true, leadId };
        } catch (error) {
          console.error("Error creating lead:", error);
          throw new Error("Failed to create lead");
        }
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return db.getLeads(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await db.getLeadById(input.id);
        if (!lead) throw new Error("Lead not found");
        return lead;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "rejected"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        leadScore: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const lead = await db.getLeadById(input.id);
        if (!lead) throw new Error("Lead not found");

        const updates: any = {};
        if (input.status) {
          updates.status = input.status;
          if (input.status === "contacted") {
            updates.lastContactedAt = new Date();
          }
          if (input.status === "converted") {
            updates.convertedAt = new Date();
          }
        }
        if (input.priority) updates.priority = input.priority;
        if (input.leadScore !== undefined) updates.leadScore = input.leadScore;

        await db.updateLead(input.id, updates);

        // Add timeline event for status change
        if (input.status && input.status !== lead.status) {
          await db.addTimelineEvent({
            leadId: input.id,
            eventType: "status_change",
            previousValue: lead.status,
            newValue: input.status,
            description: `Status changed from ${lead.status} to ${input.status}`,
          });
        }

        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      return db.getLeadStats();
    }),
  }),

  // Lead Notes procedures
  notes: router({
    add: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        
        await db.addLeadNote(input.leadId, ctx.user.id, input.content);

        // Add timeline event
        await db.addTimelineEvent({
          leadId: input.leadId,
          eventType: "note_added",
          description: `Note added by ${ctx.user.name}`,
        });

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return db.getLeadNotes(input.leadId);
      }),
  }),

  // Lead Timeline procedures
  timeline: router({
    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return db.getLeadTimeline(input.leadId);
      }),
  }),

  // Follow-up Email procedures
  followUps: router({
    create: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        emailType: z.enum(["initial", "24h_followup", "3day_followup", "1week_followup", "custom"]),
        subject: z.string(),
        content: z.string(),
        scheduledAt: z.date(),
      }))
      .mutation(async ({ input }) => {
        const lead = await db.getLeadById(input.leadId);
        if (!lead) throw new Error("Lead not found");

        await db.createFollowUpEmail({
          ...input,
          status: "scheduled",
          estimatedSavings: lead.estimatedSavings || undefined,
        });

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return db.getLeadFollowUps(input.leadId);
      }),

    scheduled: protectedProcedure.query(async () => {
      return db.getScheduledEmails();
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["scheduled", "sent", "failed", "bounced"]),
        failureReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updates: any = { status: input.status };
        if (input.status === "sent") {
          updates.sentAt = new Date();
        }
        if (input.failureReason) {
          updates.failureReason = input.failureReason;
        }

        await db.updateFollowUpEmail(input.id, updates);
        return { success: true };
      }),
  }),

  // AI-powered Lead Scoring and Analysis
  ai: router({
    scoreLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        const lead = await db.getLeadById(input.leadId);
        if (!lead) throw new Error("Lead not found");

        const score = calculateLeadScore({
          monthlyEnergyBill: lead.monthlyEnergyBill ? Number(lead.monthlyEnergyBill) : null,
          roofCondition: lead.roofCondition,
          roofAge: lead.roofAge,
          sunExposure: lead.sunExposure,
          installationTimeline: lead.installationTimeline,
        });

        const priority = score > 70 ? "high" : score > 40 ? "medium" : "low";

        await db.updateLead(input.leadId, {
          leadScore: score,
          priority,
        });

        return { score, priority };
      }),

    generateResponseTemplate: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const lead = await db.getLeadById(input.leadId);
        if (!lead) throw new Error("Lead not found");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional solar sales representative for AB SOLAR. Generate a personalized follow-up email response that is warm, professional, and highlights specific benefits based on the lead's profile.",
            },
            {
              role: "user",
              content: `Generate a follow-up email for this lead:
- Name: ${lead.firstName} ${lead.lastName}
- Location: ${lead.city}, ${lead.state}
- Monthly Energy Bill: $${lead.monthlyEnergyBill}
- Roof Condition: ${lead.roofCondition}
- Installation Timeline: ${lead.installationTimeline}
- Estimated Annual Savings: $${lead.estimatedSavings}

Make it personalized, engaging, and action-oriented.`,
            },
          ],
        });

        const content = response.choices[0]?.message.content || "";
        return { template: content };
      }),
  }),

  // Analytics procedures
  analytics: router({
    dashboard: protectedProcedure.query(async () => {
      const stats = await db.getLeadStats();
      
      return {
        totalLeads: stats.total,
        conversionRate: stats.total > 0 ? Math.round((stats.byStatus.converted / stats.total) * 100) : 0,
        byStatus: stats.byStatus,
        byPriority: stats.byPriority,
        totalSavings: stats.totalSavings,
        avgLeadScore: stats.avgScore,
      };
    }),
  }),
});

// Helper function to calculate lead score
function calculateLeadScore(data: {
  monthlyEnergyBill?: number | null;
  roofCondition?: string | null;
  roofAge?: number | null;
  sunExposure?: string | null;
  installationTimeline?: string | null;
}): number {
  let score = 50; // Base score

  // Energy bill scoring
  if (data.monthlyEnergyBill) {
    if (data.monthlyEnergyBill > 150) score += 20;
    else if (data.monthlyEnergyBill > 100) score += 15;
    else if (data.monthlyEnergyBill > 50) score += 10;
  }

  // Roof condition scoring
  if (data.roofCondition === "excellent") score += 15;
  else if (data.roofCondition === "good") score += 10;
  else if (data.roofCondition === "fair") score += 5;

  // Roof age scoring
  if (data.roofAge !== undefined && data.roofAge !== null) {
    if (data.roofAge < 5) score += 15;
    else if (data.roofAge < 10) score += 10;
    else if (data.roofAge < 15) score += 5;
  }

  // Sun exposure scoring
  if (data.sunExposure === "full") score += 15;
  else if (data.sunExposure === "partial") score += 8;

  // Installation timeline scoring
  if (data.installationTimeline === "immediate") score += 20;
  else if (data.installationTimeline === "3-6months") score += 15;
  else if (data.installationTimeline === "6-12months") score += 10;

  return Math.min(score, 100);
}

export type AppRouter = typeof appRouter;
