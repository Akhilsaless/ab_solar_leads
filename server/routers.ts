import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== LEADS =====
  leads: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getLeads(input || {});
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLead(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        company: z.string().optional(),
        propertyAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        monthlyEnergyBill: z.string().optional(),
        roofCondition: z.string().optional(),
        sunExposure: z.string().optional(),
        homeownershipType: z.string().optional(),
        installationTimeline: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const score = calculateLeadScore(input);
        const priority = getPriority(score);
        const savings = input.monthlyEnergyBill ? Math.round(parseFloat(input.monthlyEnergyBill) * 12 * 0.3).toString() : undefined;

        await db.createLead({
          ...input,
          leadScore: score,
          priority,
          estimatedSavings: savings,
          status: "new",
        });

        await notifyOwner({
          title: "New Lead Added",
          content: `${input.firstName} ${input.lastName} (${input.email || input.phone}) - Score: ${score}/100`,
        });

        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        company: z.string().optional(),
        propertyAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        monthlyEnergyBill: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        notes: z.string().optional(),
        tags: z.any().optional(),
        isDnc: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateLead(id, data);
        if (input.status) {
          await db.addActivity(id, "status_changed", `Status changed to ${input.status}`, ctx.user?.id);
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLead(input.id);
        return { success: true };
      }),

    bulkImport: protectedProcedure
      .input(z.object({
        leads: z.array(z.object({
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          whatsapp: z.string().optional(),
          company: z.string().optional(),
          propertyAddress: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          monthlyEnergyBill: z.string().optional(),
          source: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const enrichedLeads = input.leads.map(lead => {
          const score = calculateLeadScore(lead);
          return {
            ...lead,
            leadScore: score,
            priority: getPriority(score),
            status: "new" as const,
            source: lead.source || "csv_import",
          };
        });

        await db.createLeads(enrichedLeads);

        await notifyOwner({
          title: "Bulk Lead Import",
          content: `${input.leads.length} leads imported successfully`,
        });

        return { success: true, count: input.leads.length };
      }),

    stats: protectedProcedure.query(async () => {
      return await db.getLeadStats();
    }),
  }),

  // ===== ACTIVITY =====
  activity: router({
    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeadActivities(input.leadId);
      }),

    add: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        activityType: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.addActivity(input.leadId, input.activityType as any, input.description, ctx.user?.id);
        return { success: true };
      }),
  }),

  // ===== CAMPAIGNS =====
  campaigns: router({
    list: protectedProcedure.query(async () => {
      return await db.getCampaigns();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const campaign = await db.getCampaign(input.id);
        const steps = await db.getCampaignSteps(input.id);
        return { campaign, steps };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        channel: z.string(),
        filters: z.any().optional(),
        steps: z.array(z.object({
          channel: z.string(),
          templateId: z.number().optional(),
          delayDays: z.number().optional(),
          delayHours: z.number().optional(),
          subject: z.string().optional(),
          body: z.string().optional(),
          abVariantB: z.string().optional(),
          abSubjectB: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { steps, ...campaignData } = input;
        const result = await db.createCampaign({
          ...campaignData,
          createdBy: ctx.user?.id,
          status: "draft",
        });

        const campaignId = (result as any)[0]?.insertId;

        if (steps && campaignId) {
          for (let i = 0; i < steps.length; i++) {
            await db.createCampaignStep({
              ...steps[i],
              campaignId,
              stepOrder: i + 1,
            });
          }
        }

        return { success: true, campaignId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCampaign(id, data);
        return { success: true };
      }),

    launch: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        leadIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        const campaign = await db.getCampaign(input.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const steps = await db.getCampaignSteps(input.campaignId);
        if (steps.length === 0) throw new Error("Campaign has no steps");

        // Queue messages for each lead for the first step
        const firstStep = steps.find((s: any) => s.stepOrder === 1);
        if (!firstStep) throw new Error("No first step found");

        for (const leadId of input.leadIds) {
          const lead = await db.getLead(leadId);
          if (!lead) continue;

          // Check DNC
          const isDnc = await db.checkDnc(lead.email || undefined, lead.phone || undefined);
          if (isDnc) continue;

          const body = personalizeMessage(firstStep.body || "", lead);
          const subject = personalizeMessage(firstStep.subject || "", lead);

          await db.createOutreachMessage({
            leadId,
            campaignId: input.campaignId,
            channel: firstStep.channel,
            subject,
            body,
            status: "queued",
            abVariant: "A",
          });

          // If A/B test variant exists
          if (firstStep.abVariantB) {
            await db.createOutreachMessage({
              leadId,
              campaignId: input.campaignId,
              channel: firstStep.channel,
              subject: firstStep.abSubjectB || subject,
              body: personalizeMessage(firstStep.abVariantB, lead),
              status: "queued",
              abVariant: "B",
            });
          }

          await db.addActivity(leadId, "email_sent", `Campaign "${campaign.name}" - Step 1 queued`);
        }

        await db.updateCampaign(input.campaignId, {
          status: "active",
          targetLeadCount: input.leadIds.length,
          startedAt: new Date(),
        });

        return { success: true, queuedCount: input.leadIds.length };
      }),
  }),

  // ===== TEMPLATES =====
  templates: router({
    list: protectedProcedure
      .input(z.object({ channel: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getTemplates(input?.channel);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplate(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        channel: z.string(),
        subject: z.string().optional(),
        body: z.string(),
        variables: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createTemplate({
          ...input,
          createdBy: ctx.user?.id,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTemplate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTemplate(input.id);
        return { success: true };
      }),
  }),

  // ===== OUTREACH =====
  outreach: router({
    list: protectedProcedure
      .input(z.object({
        leadId: z.number().optional(),
        campaignId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getOutreachMessages(input || {});
      }),

    send: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        channel: z.string(),
        subject: z.string().optional(),
        body: z.string(),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const lead = await db.getLead(input.leadId);
        if (!lead) throw new Error("Lead not found");

        // Check DNC
        const isDnc = await db.checkDnc(lead.email || undefined, lead.phone || undefined);
        if (isDnc) throw new Error("Lead is on the Do Not Contact list");

        const body = personalizeMessage(input.body, lead);
        const subject = input.subject ? personalizeMessage(input.subject, lead) : undefined;

        await db.createOutreachMessage({
          leadId: input.leadId,
          channel: input.channel,
          subject,
          body,
          templateId: input.templateId,
          status: "sent",
          sentAt: new Date(),
        });

        const activityType = input.channel === "email" ? "email_sent" :
          input.channel === "sms" ? "sms_sent" :
          input.channel === "whatsapp" ? "whatsapp_sent" : "call_made";

        await db.addActivity(input.leadId, activityType as any, `${input.channel} message sent`, ctx.user?.id);
        await db.updateLead(input.leadId, { lastContactedAt: new Date() });

        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      const messages = await db.getOutreachMessages();
      const total = messages.length;
      const sent = messages.filter((m: any) => m.status === "sent").length;
      const delivered = messages.filter((m: any) => m.status === "delivered").length;
      const opened = messages.filter((m: any) => m.status === "opened").length;
      const responded = messages.filter((m: any) => m.status === "responded").length;
      const failed = messages.filter((m: any) => m.status === "failed").length;

      const byChannel: Record<string, number> = {};
      messages.forEach((m: any) => {
        byChannel[m.channel] = (byChannel[m.channel] || 0) + 1;
      });

      return { total, sent, delivered, opened, responded, failed, byChannel };
    }),
  }),

  // ===== SCRAPING =====
  scraping: router({
    jobs: protectedProcedure.query(async () => {
      return await db.getScrapeJobs();
    }),

    start: protectedProcedure
      .input(z.object({
        source: z.string(),
        query: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createScrapeJob({
          source: input.source,
          query: input.query,
          createdBy: ctx.user?.id,
          status: "pending",
        });

        // Use LLM to generate sample leads based on the query
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a data generation assistant for a solar energy company. Generate realistic sample lead data based on the search query. Return a JSON array of leads with fields: firstName, lastName, email, phone, propertyAddress, city, state, zipCode, monthlyEnergyBill. Generate 5-10 leads. Return ONLY valid JSON array, no other text.`,
            },
            {
              role: "user",
              content: `Generate sample solar leads for: ${input.query}`,
            },
          ] as any,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "leads_data",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" },
                        propertyAddress: { type: "string" },
                        city: { type: "string" },
                        state: { type: "string" },
                        zipCode: { type: "string" },
                        monthlyEnergyBill: { type: "string" },
                      },
                      required: ["firstName", "lastName", "email", "phone", "propertyAddress", "city", "state", "zipCode", "monthlyEnergyBill"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["leads"],
                additionalProperties: false,
              },
            },
          },
        });

        const jobId = (result as any)[0]?.insertId;

        try {
          const content = response.choices[0]?.message?.content;
          if (typeof content === "string") {
            const parsed = JSON.parse(content);
            const leadsData = parsed.leads || parsed;

            if (Array.isArray(leadsData) && leadsData.length > 0) {
              const enrichedLeads = leadsData.map((lead: any) => ({
                ...lead,
                source: "scrape",
                leadScore: calculateLeadScore(lead),
                priority: getPriority(calculateLeadScore(lead)),
                status: "new" as const,
              }));

              await db.createLeads(enrichedLeads);

              if (jobId) {
                await db.updateScrapeJob(jobId, {
                  status: "completed",
                  totalFound: leadsData.length,
                  totalImported: leadsData.length,
                  completedAt: new Date(),
                });
              }

              return { success: true, count: leadsData.length };
            }
          }
        } catch (e) {
          if (jobId) {
            await db.updateScrapeJob(jobId, {
              status: "failed",
              errorMessage: "Failed to parse lead data",
              completedAt: new Date(),
            });
          }
        }

        return { success: true, count: 0 };
      }),
  }),

  // ===== TAGS =====
  tags: router({
    list: protectedProcedure.query(async () => {
      return await db.getTags();
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string(), color: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.createTag(input.name, input.color);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTag(input.id);
        return { success: true };
      }),
  }),

  // ===== DNC =====
  dnc: router({
    list: protectedProcedure.query(async () => {
      return await db.getDncList();
    }),

    add: protectedProcedure
      .input(z.object({
        email: z.string().optional(),
        phone: z.string().optional(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.addToDnc(input.email, input.phone, input.reason, ctx.user?.id);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeDnc(input.id);
        return { success: true };
      }),

    check: protectedProcedure
      .input(z.object({ email: z.string().optional(), phone: z.string().optional() }))
      .query(async ({ input }) => {
        return { isDnc: await db.checkDnc(input.email, input.phone) };
      }),
  }),

  // ===== AI HELPERS =====
  ai: router({
    generateTemplate: protectedProcedure
      .input(z.object({
        channel: z.string(),
        purpose: z.string(),
        tone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a solar energy marketing expert. Generate a ${input.channel} message template for AB SOLAR. Use these dynamic variables: {{firstName}}, {{lastName}}, {{monthlyBill}}, {{estimatedSavings}}, {{city}}, {{state}}. Keep it professional and compelling. For SMS keep under 160 chars. For email include a subject line on the first line prefixed with "Subject: ".`,
            },
            {
              role: "user",
              content: `Generate a ${input.channel} template for: ${input.purpose}. Tone: ${input.tone || "professional"}`,
            },
          ] as any,
        });

        const content = response.choices[0]?.message?.content;
        return { template: typeof content === "string" ? content : "" };
      }),

    scoreLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        const lead = await db.getLead(input.leadId);
        if (!lead) throw new Error("Lead not found");

        const score = calculateLeadScore(lead);
        const priority = getPriority(score);
        await db.updateLead(input.leadId, { leadScore: score, priority });
        await db.addActivity(input.leadId, "score_updated", `Score updated to ${score}, priority: ${priority}`);

        return { score, priority };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ===== HELPER FUNCTIONS =====
function calculateLeadScore(lead: any): number {
  let score = 30;

  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.whatsapp) score += 5;

  if (lead.monthlyEnergyBill) {
    const bill = parseFloat(lead.monthlyEnergyBill);
    if (bill > 200) score += 20;
    else if (bill > 150) score += 15;
    else if (bill > 100) score += 10;
    else if (bill > 50) score += 5;
  }

  if (lead.roofCondition === "excellent") score += 10;
  else if (lead.roofCondition === "good") score += 7;
  else if (lead.roofCondition === "fair") score += 3;

  if (lead.sunExposure === "full") score += 10;
  else if (lead.sunExposure === "partial") score += 5;

  if (lead.installationTimeline === "immediate") score += 15;
  else if (lead.installationTimeline === "3-6months") score += 10;
  else if (lead.installationTimeline === "6-12months") score += 5;

  if (lead.homeownershipType === "own") score += 10;
  else if (lead.homeownershipType === "mortgage") score += 5;

  return Math.min(score, 100);
}

function getPriority(score: number): "low" | "medium" | "high" | "urgent" {
  if (score >= 80) return "urgent";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function personalizeMessage(template: string, lead: any): string {
  return template
    .replace(/\{\{firstName\}\}/g, lead.firstName || "")
    .replace(/\{\{lastName\}\}/g, lead.lastName || "")
    .replace(/\{\{email\}\}/g, lead.email || "")
    .replace(/\{\{phone\}\}/g, lead.phone || "")
    .replace(/\{\{monthlyBill\}\}/g, lead.monthlyEnergyBill || "")
    .replace(/\{\{estimatedSavings\}\}/g, lead.estimatedSavings || "")
    .replace(/\{\{city\}\}/g, lead.city || "")
    .replace(/\{\{state\}\}/g, lead.state || "")
    .replace(/\{\{propertyAddress\}\}/g, lead.propertyAddress || "")
    .replace(/\{\{company\}\}/g, lead.company || "");
}
