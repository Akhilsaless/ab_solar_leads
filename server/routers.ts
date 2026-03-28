import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import * as db from "./db";

const aiSalesAgentPrompt = `You are an expert solar energy sales agent for AB SOLAR. Your goal is to qualify leads and help homeowners understand their potential solar savings.

You should:
1. Greet the visitor warmly and ask about their interest in solar energy
2. Ask qualifying questions about:
   - Their current monthly energy bill
   - Roof condition (excellent, good, fair, poor)
   - Sun exposure (full sun, partial, shaded)
   - Timeline for installation (immediate, 3-6 months, 6-12 months, exploring)
   - Home ownership type (own, mortgage, rent)
3. Calculate estimated annual savings (approximately 30% of annual energy costs)
4. Provide personalized recommendations
5. Collect contact information naturally through conversation
6. Be conversational, friendly, and helpful
7. If the visitor seems uninterested or outside service area, politely offer to connect them with a human agent

Remember: You're not pushy, you're helpful. Focus on understanding their needs first.`;

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

  // AI Chat Agent routes
  chat: router({
    // Start or get conversation
    getOrCreate: publicProcedure
      .input(z.object({ visitorId: z.string() }))
      .mutation(async ({ input }) => {
        const conversation = await db.getOrCreateConversation(input.visitorId);
        const messages = await db.getConversationMessages(conversation.id);
        return { conversation, messages };
      }),

    // Send message and get AI response
    sendMessage: publicProcedure
      .input(z.object({
        conversationId: z.number(),
        visitorId: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Save user message
        await db.addChatMessage(input.conversationId, "user", input.message);

        // Get conversation history
        const messages = await db.getConversationMessages(input.conversationId);
        const conversation = await db.getConversation(input.conversationId);

        // Build message history for LLM
        const llmMessages = [
          { role: "system" as const, content: aiSalesAgentPrompt },
          ...messages.map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ];

        // Get AI response
        const response = await invokeLLM({
          messages: llmMessages as any,
        });

        let aiResponse = "I apologize, I'm having trouble responding. Please try again.";
        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          aiResponse = content;
        }

        // Save AI response
        await db.addChatMessage(input.conversationId, "assistant", aiResponse);

        // Extract lead information from conversation
        const extractedData = await extractLeadData(messages, aiResponse, conversation);

        // Update conversation with extracted data
        if (extractedData) {
          await db.updateConversation(input.conversationId, extractedData);
        }

        return {
          message: aiResponse,
          conversationId: input.conversationId,
        };
      }),

    // Get conversation history
    getHistory: publicProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const messages = await db.getConversationMessages(input.conversationId);
        const conversation = await db.getConversation(input.conversationId);
        return { messages, conversation };
      }),

    // Convert conversation to lead
    convertToLead: publicProcedure
      .input(z.object({
        conversationId: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phone: z.string(),
      }))
      .mutation(async ({ input }) => {
        const conversation = await db.getConversation(input.conversationId);

        // Create lead
        const leadData = {
          conversationId: input.conversationId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          monthlyEnergyBill: conversation.monthlyEnergyBill,
          estimatedSavings: conversation.estimatedSavings,
          roofCondition: conversation.roofCondition,
          sunExposure: conversation.sunExposure,
          installationTimeline: conversation.installationTimeline,
          leadScore: calculateLeadScore(conversation),
          priority: getPriority(calculateLeadScore(conversation)),
          status: "new",
          source: "chat",
        };

        const result = await db.createLead(leadData);
        const leadId = (result as any)[0]?.insertId || 0;

        // Update conversation status
        await db.updateConversation(input.conversationId, { status: "completed" });

        // Add timeline event
        await db.addTimelineEvent(leadId, "created", "Lead created from chat conversation");

        // Notify owner
        await notifyOwner({
          title: "New Lead from AI Sales Agent",
          content: `${input.firstName} ${input.lastName} (${input.email}) - Score: ${leadData.leadScore}/100 - Estimated Savings: $${leadData.estimatedSavings}`,
        });

        return { leadId, lead: leadData };
      }),
  }),

  // Lead management routes
  leads: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getLeads({ status: input.status });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLead(input.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateLead(input.id, {
          status: input.status,
          priority: input.priority,
        });
        await db.addTimelineEvent(input.id, "status_changed", `Status updated to ${input.status}`);
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      const leads = await db.getLeads();
      const total = leads.length;
      const converted = leads.filter((l: any) => l.status === "converted").length;
      const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

      return {
        total,
        converted,
        conversionRate,
      };
    }),
  }),

  // Notes routes
  notes: router({
    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeadNotes(input.leadId);
      }),

    add: protectedProcedure
      .input(z.object({ leadId: z.number(), content: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.addLeadNote(input.leadId, input.content, ctx.user?.id);
        await db.addTimelineEvent(input.leadId, "note_added", input.content);
        return { success: true };
      }),
  }),

  // Timeline routes
  timeline: router({
    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeadTimeline(input.leadId);
      }),
  }),

  // Follow-up emails routes
  followUps: router({
    list: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFollowUpEmails(input.leadId);
      }),
  }),
});

export type AppRouter = typeof appRouter;

// Helper functions
function calculateLeadScore(conversation: any): number {
  let score = 50;

  if (conversation.monthlyEnergyBill) {
    const bill = parseFloat(conversation.monthlyEnergyBill);
    if (bill > 150) score += 20;
    else if (bill > 100) score += 15;
    else if (bill > 50) score += 10;
  }

  if (conversation.roofCondition === "excellent") score += 15;
  else if (conversation.roofCondition === "good") score += 10;
  else if (conversation.roofCondition === "fair") score += 5;

  if (conversation.sunExposure === "full") score += 15;
  else if (conversation.sunExposure === "partial") score += 8;

  if (conversation.installationTimeline === "immediate") score += 20;
  else if (conversation.installationTimeline === "3-6months") score += 15;
  else if (conversation.installationTimeline === "6-12months") score += 10;

  return Math.min(score, 100);
}

function getPriority(score: number): string {
  if (score > 70) return "high";
  if (score > 40) return "medium";
  return "low";
}

async function extractLeadData(messages: any[], aiResponse: string, conversation: any) {
  // Simple extraction - in production, use more sophisticated NLP
  const combinedText = messages.map((m: any) => m.content).join(" ") + " " + aiResponse;

  const data: any = {};

  // Extract email
  const emailMatch = combinedText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  if (emailMatch) data.visitorEmail = emailMatch[0];

  // Extract phone
  const phoneMatch = combinedText.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
  if (phoneMatch) data.visitorPhone = phoneMatch[0];

  // Extract name
  const nameMatch = combinedText.match(/(?:my name is|I'm|I am)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)?/i);
  if (nameMatch) data.visitorName = nameMatch[1] + (nameMatch[2] ? " " + nameMatch[2] : "");

  // Extract energy bill
  const billMatch = combinedText.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per month|monthly|\/month)/i);
  if (billMatch) data.monthlyEnergyBill = parseFloat(billMatch[1].replace(/,/g, ""));

  // Extract roof condition
  if (/excellent|great|perfect/i.test(combinedText)) data.roofCondition = "excellent";
  else if (/good|fine|okay/i.test(combinedText)) data.roofCondition = "good";
  else if (/fair|okay|average/i.test(combinedText)) data.roofCondition = "fair";
  else if (/poor|bad|old/i.test(combinedText)) data.roofCondition = "poor";

  // Extract sun exposure
  if (/full sun|lots of sun|sunny/i.test(combinedText)) data.sunExposure = "full";
  else if (/partial|some sun|partly/i.test(combinedText)) data.sunExposure = "partial";
  else if (/shaded|shade|trees/i.test(combinedText)) data.sunExposure = "shaded";

  // Extract timeline
  if (/immediate|asap|now|right away/i.test(combinedText)) data.installationTimeline = "immediate";
  else if (/3.*6|three.*six|months/i.test(combinedText)) data.installationTimeline = "3-6months";
  else if (/6.*12|six.*twelve/i.test(combinedText)) data.installationTimeline = "6-12months";
  else if (/exploring|considering|thinking/i.test(combinedText)) data.installationTimeline = "exploring";

  // Calculate estimated savings
  if (data.monthlyEnergyBill) {
    data.estimatedSavings = Math.round(data.monthlyEnergyBill * 12 * 0.3);
  }

  return Object.keys(data).length > 0 ? data : null;
}
