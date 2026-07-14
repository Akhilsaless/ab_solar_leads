import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { makeRequest, PlacesSearchResult, PlaceDetailsResult } from "./_core/map";
import { getStripe } from "./stripe-handler";
import { PLANS, TRIAL_DAYS } from "./stripe-products";
import * as db from "./db";
import { referrerRouter } from "./referrer";
import { sendEmail } from "./_core/emailService";

export const appRouter = router({
  system: systemRouter,
  referrer: referrerRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== AGENCY CONFIG =====
  agency: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      return await db.getAgencyByUserId(ctx.user.id);
    }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const agency = await db.getAgencyBySlug(input.slug);
        if (!agency) return null;
        // Return public-safe fields only
        return {
          id: agency.id,
          agencyName: agency.agencyName,
          agencySlug: agency.agencySlug,
          logoUrl: agency.logoUrl,
          brandColor: agency.brandColor,
          phone: agency.phone,
          email: agency.email,
          city: agency.city,
          state: agency.state,
          botGreeting: agency.botGreeting,
          botTone: agency.botTone,
          isActive: agency.isActive,
        };
      }),

    create: protectedProcedure
      .input(z.object({
        agencyName: z.string(),
        agencySlug: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        brandColor: z.string().optional(),
        botGreeting: z.string().optional(),
        botTone: z.string().optional(),
        installationChargePerKw: z.string().optional(),
        marginPercent: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const existing = await db.getAgencyByUserId(ctx.user.id);
        if (existing) throw new Error("Agency already exists");
        const id = await db.createAgency({ ...input, userId: ctx.user.id });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        agencyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        brandColor: z.string().optional(),
        botGreeting: z.string().optional(),
        botTone: z.string().optional(),
        installationChargePerKw: z.string().optional(),
        marginPercent: z.string().optional(),
        logoUrl: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          // Auto-create agency if it doesn't exist yet
          const slug = (input.agencyName || ctx.user.name || "agency")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const id = await db.createAgency({
            userId: ctx.user.id,
            agencyName: input.agencyName || ctx.user.name || "My Agency",
            agencySlug: slug + "-" + Date.now().toString(36),
            phone: input.phone,
            email: input.email || ctx.user.email || "",
            city: input.city,
            state: input.state,
            brandColor: input.brandColor,
            botGreeting: input.botGreeting,
            botTone: input.botTone,
            installationChargePerKw: input.installationChargePerKw,
            marginPercent: input.marginPercent,
          });
          return { success: true, created: true, id };
        }
        await db.updateAgency(agency.id, input);
        return { success: true };
      }),
  }),

  // ===== PANEL PRODUCTS =====
  panels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return [];
      return await db.getPanelsByAgency(agency.id);
    }),

    create: protectedProcedure
      .input(z.object({
        brand: z.string(),
        model: z.string(),
        wattage: z.number(),
        pricePerPanel: z.string(),
        efficiency: z.string().optional(),
        panelType: z.string().optional(),
        warranty: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        const id = await db.createPanel({ ...input, agencyId: agency.id });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        brand: z.string().optional(),
        model: z.string().optional(),
        wattage: z.number().optional(),
        pricePerPanel: z.string().optional(),
        efficiency: z.string().optional(),
        panelType: z.string().optional(),
        warranty: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePanel(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePanel(input.id);
        return { success: true };
      }),
  }),

  // ===== INVERTER PRODUCTS =====
  inverters: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return [];
      return await db.getInvertersByAgency(agency.id);
    }),

    create: protectedProcedure
      .input(z.object({
        brand: z.string(),
        model: z.string(),
        capacityKw: z.string(),
        price: z.string(),
        inverterType: z.string().optional(),
        warranty: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");
        const id = await db.createInverter({ ...input, agencyId: agency.id });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        brand: z.string().optional(),
        model: z.string().optional(),
        capacityKw: z.string().optional(),
        price: z.string().optional(),
        inverterType: z.string().optional(),
        warranty: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInverter(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteInverter(input.id);
        return { success: true };
      }),
  }),

  // ===== STATE SUBSIDIES =====
  subsidies: router({
    list: publicProcedure.query(async () => {
      return await db.getAllSubsidies();
    }),

    getByState: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        return await db.getSubsidyByState(input.state);
      }),
  }),

  // ===== AI CHAT BOT (PUBLIC - for customers clicking ads) =====
  chat: router({
    // Start a new conversation when customer lands on chat page
    startConversation: publicProcedure
      .input(z.object({
        agencySlug: z.string(),
        sessionId: z.string(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
        referrerCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const agency = await db.getAgencyBySlug(input.agencySlug);
        if (!agency) throw new Error("Agency not found");

        // Check if session already exists
        const existing = await db.getConversation(input.sessionId);
        if (existing) {
          const messages = await db.getChatMessages(existing.id);
          return { conversationId: existing.id, messages, agency: { name: agency.agencyName, color: agency.brandColor, greeting: agency.botGreeting, tone: agency.botTone } };
        }

        const convId = await db.createConversation({
          agencyId: agency.id,
          sessionId: input.sessionId,
          source: input.referrerCode ? "referral" : "ad_click",
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          referrerCode: input.referrerCode,
        });

        // Generate greeting message
        const greeting = agency.botGreeting ||
          `Namaste! 🙏 Welcome! I'm your solar energy advisor from ${agency.agencyName}. I'm here to help you discover how much you can save with solar power.\n\nLet me ask you a few quick questions to give you a personalized solar estimate. First, which state are you from?`;

        if (convId) {
          await db.addChatMessage({
            conversationId: convId,
            role: "bot",
            content: greeting,
          });
        }

        return {
          conversationId: convId,
          messages: [{ role: "bot", content: greeting, createdAt: new Date() }],
          agency: { name: agency.agencyName, color: agency.brandColor, greeting: agency.botGreeting, tone: agency.botTone },
        };
      }),

    // Send a message and get AI response
    sendMessage: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const conversation = await db.getConversation(input.sessionId);
        if (!conversation) throw new Error("Conversation not found");

        const agency = await db.getAgencyById(conversation.agencyId);
        if (!agency) throw new Error("Agency not found");

        // Save customer message
        await db.addChatMessage({
          conversationId: conversation.id,
          role: "customer",
          content: input.message,
        });

        // Get conversation history
        const history = await db.getChatMessages(conversation.id);

        // Get agency products
        const panels = await db.getPanelsByAgency(agency.id);
        const inverters = await db.getInvertersByAgency(agency.id);

        // Get subsidy data if state is known
        let subsidyData = null;
        if (conversation.customerState) {
          subsidyData = await db.getSubsidyByState(conversation.customerState);
        }

        // Build the system prompt
        const systemPrompt = buildSalesAgentPrompt(agency, panels, inverters, subsidyData, conversation);

        // Build message history for LLM
        const llmMessages: Array<{ role: string; content: string }> = [
          { role: "system", content: systemPrompt },
        ];

        for (const msg of history) {
          llmMessages.push({
            role: msg.role === "bot" ? "assistant" : "user",
            content: msg.content,
          });
        }

        // Get AI response
        const response = await invokeLLM({
          messages: llmMessages as any,
        });

        const aiContent = typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "I apologize, I'm having trouble responding right now. Please try again.";

        // Save bot response
        await db.addChatMessage({
          conversationId: conversation.id,
          role: "bot",
          content: aiContent,
        });

        // Extract data from conversation using LLM
        const extractedData = await extractCustomerData(history, input.message);

        // Update conversation with extracted data
        if (extractedData) {
          const updateData: Record<string, any> = {};
          if (extractedData.name && !conversation.customerName) updateData.customerName = extractedData.name;
          if (extractedData.phone && !conversation.customerPhone) updateData.customerPhone = extractedData.phone;
          if (extractedData.email && !conversation.customerEmail) updateData.customerEmail = extractedData.email;
          if (extractedData.city && !conversation.customerCity) updateData.customerCity = extractedData.city;
          if (extractedData.state && !conversation.customerState) {
            updateData.customerState = extractedData.state;
            // Fetch subsidy for newly identified state
            if (!subsidyData) {
              subsidyData = await db.getSubsidyByState(extractedData.state);
            }
          }
          if (extractedData.monthlyBill && !conversation.monthlyBill) updateData.monthlyBill = extractedData.monthlyBill.toString();
          if (extractedData.monthlyUnits && !conversation.monthlyUnits) updateData.monthlyUnits = extractedData.monthlyUnits;

          // Calculate solar estimate if we have enough data
          const bill = extractedData.monthlyBill || (conversation.monthlyBill ? parseFloat(conversation.monthlyBill) : null);
          const state = extractedData.state || conversation.customerState;

          if (bill && state && panels.length > 0 && inverters.length > 0) {
            const estimate = calculateSolarEstimate(bill, state, panels, inverters, agency, subsidyData);
            if (estimate) {
              updateData.recommendedKw = estimate.systemSizeKw.toString();
              updateData.recommendedPanels = estimate.panelCount;
              updateData.estimatedCost = estimate.totalCost.toString();
              updateData.subsidyAmount = estimate.totalSubsidy.toString();
              updateData.netCost = estimate.netCost.toString();
              updateData.estimatedSavingsMonthly = estimate.monthlySavings.toString();
              updateData.paybackYears = estimate.paybackYears.toString();
              updateData.status = "estimate_given";
            }
          }

          // Update lead score
          const score = calculateConversationScore(conversation, extractedData);
          updateData.leadScore = score;

          // If we have name + phone/email, mark as lead captured
          const hasName = extractedData.name || conversation.customerName;
          const hasContact = extractedData.phone || conversation.customerPhone || extractedData.email || conversation.customerEmail;
          if (hasName && hasContact && conversation.status === "active") {
            updateData.status = updateData.status || "lead_captured";

            // Create a lead record
            const nameParts = (extractedData.name || conversation.customerName || "").split(" ");
            await db.createLeadFromConversation({
              firstName: nameParts[0] || "Unknown",
              lastName: nameParts.slice(1).join(" ") || "",
              email: extractedData.email || conversation.customerEmail || undefined,
              phone: extractedData.phone || conversation.customerPhone || undefined,
              city: extractedData.city || conversation.customerCity || undefined,
              state: extractedData.state || conversation.customerState || undefined,
              monthlyEnergyBill: bill ? bill.toString() : undefined,
              source: "ai_chat",
              leadScore: score,
              priority: getPriority(score),
              conversationId: conversation.id,
              notes: `Lead captured via AI chat bot. Session: ${input.sessionId}`,
            });

            // Notify agency owner
            await notifyOwner({
              title: "🔥 New Lead from AI Chat Bot!",
              content: `${extractedData.name || conversation.customerName} (${extractedData.phone || conversation.customerPhone || extractedData.email || conversation.customerEmail}) from ${extractedData.state || conversation.customerState || "Unknown"} - Monthly Bill: ₹${bill || "N/A"} - Score: ${score}/100`,
            });

            // Send lead details to akhil@salessquadtech.com
            const leadEmail = extractedData.email || conversation.customerEmail;
            const leadPhone = extractedData.phone || conversation.customerPhone;
            const leadName = extractedData.name || conversation.customerName;
            const leadState = extractedData.state || conversation.customerState;
            const leadCity = extractedData.city || conversation.customerCity;
            
            const leadDetailsHtml = `
              <h2>New Lead Captured - AB SOLAR</h2>
              <p><strong>Name:</strong> ${leadName}</p>
              <p><strong>Phone:</strong> ${leadPhone}</p>
              <p><strong>Email:</strong> ${leadEmail || 'N/A'}</p>
              <p><strong>City:</strong> ${leadCity || 'N/A'}</p>
              <p><strong>State:</strong> ${leadState || 'N/A'}</p>
              <p><strong>Monthly Bill:</strong> ₹${bill || 'N/A'}</p>
              <p><strong>Lead Score:</strong> ${score}/100</p>
              <p><strong>Captured At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <hr />
              <p><strong>Conversation Summary:</strong></p>
              <p>${history.map((m: any) => `<strong>${m.role}:</strong> ${m.content}`).join('<br />')}</p>
            `;
            
            await sendEmail({
              to: 'akhil@salessquadtech.com',
              subject: `New Lead: ${leadName} - ₹${bill || 'N/A'} Monthly Bill`,
              html: leadDetailsHtml,
            });
          }

          if (Object.keys(updateData).length > 0) {
            await db.updateConversation(input.sessionId, updateData);
          }

          // Send estimate email to customer if they provided email and haven't received it yet
          const customerEmail = extractedData.email || conversation.customerEmail;
          if (customerEmail && (extractedData.name || conversation.customerName) && !conversation.emailSent) {
            const systemSizeKw = conversation.recommendedKw ? String(conversation.recommendedKw) : '5';
            const estimatedCost = conversation.estimatedCost ? `₹${Math.round(Number(conversation.estimatedCost))}` : 'Upon Request';
            const monthlyBill = bill || 'N/A';
            const monthlySavings = conversation.estimatedSavingsMonthly ? `₹${Math.round(Number(conversation.estimatedSavingsMonthly))}` : 'Calculated in detailed quote';
            const paybackPeriod = conversation.paybackYears ? `${conversation.paybackYears} years` : 'Calculated in detailed quote';
            const savings25Year = conversation.estimatedSavings25Year ? `₹${Math.round(Number(conversation.estimatedSavings25Year))}` : 'Calculated in detailed quote';
            const customerName = extractedData.name || conversation.customerName || 'Valued Customer';
            
            const estimateHtml = `
              <h2>Your Solar Estimate - AB SOLAR</h2>
              <p>Dear ${customerName},</p>
              <p>Thank you for using our solar estimate tool. Here's your personalized solar system recommendation:</p>
              <hr />
              <h3>System Details</h3>
              <p><strong>Recommended System Size:</strong> Approx ${systemSizeKw} kW</p>
              <p><strong>Your Monthly Bill:</strong> ₹${monthlyBill}</p>
              <p><strong>Estimated System Cost:</strong> ${estimatedCost}</p>
              <hr />
              <h3>Financial Benefits</h3>
              <p><strong>Monthly Savings:</strong> Approx ${monthlySavings}</p>
              <p><strong>Payback Period:</strong> Approx ${paybackPeriod}</p>
              <p><strong>25-Year Savings:</strong> Approx ${savings25Year}</p>
              <hr />
              <p>Additional benefits:</p>
              <ul>
                <li>Government subsidies and incentives</li>
                <li>25-year energy security</li>
                <li>Increased property value</li>
              </ul>
              <hr />
              <p>Our team will contact you within 24 hours to discuss your solar options and provide a detailed quote.</p>
              <p><strong>Contact:</strong> AB SOLAR | Phone: +91-XXXXXXXXXX</p>
              <p>Best regards,<br />AB SOLAR Team</p>
            `;
            
            const emailResult = await sendEmail({
              to: customerEmail,
              subject: 'Your Solar Estimate - AB SOLAR',
              html: estimateHtml,
            });
            
            // Mark email as sent to prevent duplicates
            if (emailResult.success) {
              await db.updateConversation(input.sessionId, { emailSent: true });
            }
          }
        }

        // Parse quick replies from AI response
        const qrRegex = new RegExp('\\[QUICK_REPLIES\\][\\s\\S]*?\\[/QUICK_REPLIES\\]');
        const qrContentRegex = new RegExp('\\[QUICK_REPLIES\\]\\s*\\n?([\\s\\S]+?)\\n?\\s*\\[/QUICK_REPLIES\\]');
        const quickReplyMatch = aiContent.match(qrContentRegex);
        let quickReplies: string[] = [];
        let cleanContent = aiContent;
        
        if (quickReplyMatch) {
          try {
            quickReplies = JSON.parse(quickReplyMatch[1].trim());
          } catch {
            quickReplies = [];
          }
          // Remove the quick replies block from the displayed message
          cleanContent = aiContent.replace(qrRegex, '').trim();
        }

        return { response: cleanContent, quickReplies };
      }),

    // Get conversation history
    getMessages: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const conversation = await db.getConversation(input.sessionId);
        if (!conversation) return [];
        return await db.getChatMessages(conversation.id);
      }),
  }),

  // ===== CONVERSATIONS (Admin view) =====
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return [];
      return await db.getConversationsByAgency(agency.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const conv = await db.getConversationById(input.id);
        if (!conv) return null;
        const messages = await db.getChatMessages(conv.id);
        return { conversation: conv, messages };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) return null;
      return await db.getConversationStats(agency.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
      }))
      .mutation(async ({ input }) => {
        const conv = await db.getConversationById(input.id);
        if (!conv) throw new Error("Conversation not found");
        await db.updateConversation(conv.sessionId, { status: input.status } as any);
        return { success: true };
      }),
  }),

  // ===== LEADS (Admin) =====
  leads: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (agency) {
          return await db.getLeadsByAgency(agency.id);
        }
        return await db.getLeads(input || {});
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeadById(input.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateLead(id, data as any);
        if (input.status) {
          await db.addLeadActivity({
            leadId: id,
            activityType: "status_changed",
            description: `Status changed to ${input.status}`,
            userId: ctx.user?.id,
          });
        }
        return { success: true };
      }),

    activity: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeadActivity(input.leadId);
      }),
  }),

  // ===== SOLAR CALCULATOR (Public) =====
  calculator: router({
    estimate: publicProcedure
      .input(z.object({
        monthlyBill: z.number(),
        state: z.string(),
        agencySlug: z.string().optional(),
      }))
      .query(async ({ input }) => {
        let panels: any[] = [];
        let inverters: any[] = [];
        let agency: any = null;

        if (input.agencySlug) {
          agency = await db.getAgencyBySlug(input.agencySlug);
          if (agency) {
            panels = await db.getPanelsByAgency(agency.id);
            inverters = await db.getInvertersByAgency(agency.id);
          }
        }

        const subsidyData = await db.getSubsidyByState(input.state);
        const estimate = calculateSolarEstimate(input.monthlyBill, input.state, panels, inverters, agency, subsidyData);
        return estimate;
      }),
  }),

  // ===== SUBSCRIPTION & BILLING =====
  subscription: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const sub = await db.getSubscriptionByUserId(ctx.user.id);
      if (!sub) return null;
      const planDetails = PLANS[sub.plan as keyof typeof PLANS];
      return { ...sub, planDetails };
    }),

    plans: publicProcedure.query(() => {
      return Object.entries(PLANS).map(([key, plan]) => ({
        key,
        ...plan,
      }));
    }),

    startTrial: protectedProcedure
      .input(z.object({ plan: z.enum(["starter", "professional", "enterprise"]) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const existing = await db.getSubscriptionByUserId(ctx.user.id);
        if (existing) throw new Error("Already have a subscription");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        const id = await db.createSubscription({
          userId: ctx.user.id,
          agencyId: agency?.id,
          plan: input.plan,
          status: "trialing",
          trialEndsAt: trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
        });
        return { success: true, id, trialEndsAt: trialEnd };
      }),

    createCheckout: protectedProcedure
      .input(z.object({
        plan: z.enum(["starter", "professional", "enterprise"]),
        billingCycle: z.enum(["monthly", "yearly"]),
        origin: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const stripeClient = getStripe();
        if (!stripeClient) throw new Error("Stripe not configured");
        const planData = PLANS[input.plan];
        const amount = input.billingCycle === "monthly" ? planData.priceMonthly : planData.priceYearly;
        const session = await stripeClient.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            plan: input.plan,
            billing_cycle: input.billingCycle,
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
          },
          line_items: [{
            price_data: {
              currency: "inr",
              product_data: {
                name: `AB SOLAR ${planData.name} Plan`,
                description: planData.description,
              },
              unit_amount: amount * 100,
              recurring: {
                interval: input.billingCycle === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          }],
          allow_promotion_codes: true,
          success_url: `${input.origin}/settings?payment=success`,
          cancel_url: `${input.origin}/pricing?payment=canceled`,
        });
        return { url: session.url };
      }),
  }),

  // ===== BUSINESS SCRAPER =====
  scraper: router({
    search: protectedProcedure
      .input(z.object({
        businessType: z.string(),
        location: z.string(),
        state: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) throw new Error("Agency not found");

        // Create a scrape job
        const jobId = await db.createScrapeJob({
          source: "google_maps",
          query: `${input.businessType} in ${input.location}${input.state ? `, ${input.state}` : ""}`,
          createdBy: ctx.user.id,
        });

        try {
          // Search Google Maps for businesses
          const query = `${input.businessType} in ${input.location}${input.state ? `, ${input.state}` : ""}${input.state ? ", India" : ", India"}`;
          const searchResult = await makeRequest<PlacesSearchResult>(
            "/maps/api/place/textsearch/json",
            { query, region: "in" }
          );

          if (!searchResult.results || searchResult.results.length === 0) {
            if (jobId) await db.updateScrapeJob(jobId, { status: "completed" as any, totalFound: 0, completedAt: new Date() });
            return { businesses: [], total: 0, jobId };
          }

          const businesses: any[] = [];

          // Get details for each result (up to 20)
          for (const place of searchResult.results.slice(0, 20)) {
            try {
              const details = await makeRequest<PlaceDetailsResult>(
                "/maps/api/place/details/json",
                { place_id: place.place_id, fields: "name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,geometry,types" }
              );

              const d = details.result as any;
              const businessSize = classifyBusinessSize(d.user_ratings_total || 0, d.types || []);

              const biz = {
                agencyId: agency.id,
                scrapeJobId: jobId,
                businessName: d.name || place.name,
                businessType: input.businessType,
                businessSize,
                phone: d.formatted_phone_number || d.international_phone_number || null,
                website: d.website || null,
                address: d.formatted_address || place.formatted_address,
                city: extractCity(d.formatted_address || place.formatted_address),
                state: input.state || extractState(d.formatted_address || place.formatted_address),
                latitude: d.geometry?.location?.lat?.toString() || place.geometry?.location?.lat?.toString(),
                longitude: d.geometry?.location?.lng?.toString() || place.geometry?.location?.lng?.toString(),
                rating: d.rating?.toString() || null,
                reviewCount: d.user_ratings_total || 0,
                placeId: place.place_id,
                source: "google_maps",
              };

              businesses.push(biz);
            } catch (e) {
              // Skip failed detail lookups
              businesses.push({
                agencyId: agency.id,
                scrapeJobId: jobId,
                businessName: place.name,
                businessType: input.businessType,
                businessSize: "medium",
                address: place.formatted_address,
                city: extractCity(place.formatted_address),
                state: input.state || extractState(place.formatted_address),
                latitude: place.geometry?.location?.lat?.toString(),
                longitude: place.geometry?.location?.lng?.toString(),
                rating: place.rating?.toString() || null,
                reviewCount: place.user_ratings_total || 0,
                placeId: place.place_id,
                source: "google_maps",
              });
            }
          }

          // Bulk insert
          if (businesses.length > 0) {
            await db.createScrapedBusinessesBulk(businesses as any);
          }

          if (jobId) {
            await db.updateScrapeJob(jobId, {
              status: "completed" as any,
              totalFound: businesses.length,
              totalImported: businesses.length,
              completedAt: new Date(),
            });
          }

          return { businesses, total: businesses.length, jobId };
        } catch (err: any) {
          if (jobId) {
            await db.updateScrapeJob(jobId, {
              status: "failed" as any,
              errorMessage: err.message,
              completedAt: new Date(),
            });
          }
          throw new Error(`Scraping failed: ${err.message}`);
        }
      }),

    results: protectedProcedure
      .input(z.object({
        businessType: z.string().optional(),
        businessSize: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) return [];
        return await db.getScrapedBusinessesByAgency(agency.id, input || {});
      }),

    importAsLead: protectedProcedure
      .input(z.object({ businessId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const biz = await db.getScrapedBusinessById(input.businessId);
        if (!biz) throw new Error("Business not found");

        // Create a lead from the scraped business
        const leadId = await db.createLeadFromConversation({
          firstName: biz.ownerName?.split(" ")[0] || biz.businessName,
          lastName: biz.ownerName?.split(" ").slice(1).join(" ") || "",
          phone: biz.phone || undefined,
          email: biz.email || undefined,
          city: biz.city || undefined,
          state: biz.state || undefined,
          propertyAddress: biz.address || undefined,
          source: "scraper",
          notes: `Scraped from Google Maps. Business: ${biz.businessName} (${biz.businessType}). Size: ${biz.businessSize}. Rating: ${biz.rating}/5 (${biz.reviewCount} reviews).`,
        });

        await db.markBusinessImported(input.businessId);
        return { success: true, leadId };
      }),

    jobs: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return await db.getScrapeJobsByAgency(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;

// ===== SOLAR CALCULATOR ENGINE =====
export function calculateSolarEstimate(
  monthlyBill: number,
  state: string,
  panels: any[],
  inverters: any[],
  agency: any,
  subsidyData: any
) {
  // Average electricity rate (use state data if available)
  const electricityRate = subsidyData ? parseFloat(subsidyData.avgElectricityRate) : 7.5;
  const avgSunHours = subsidyData ? parseFloat(subsidyData.avgSunHours) : 4.5;

  // Calculate monthly units consumed
  const monthlyUnits = monthlyBill / electricityRate;

  // Calculate required system size
  // Daily units = monthly / 30, then divide by sun hours and add 20% buffer
  const dailyUnits = monthlyUnits / 30;
  const systemSizeKw = Math.ceil((dailyUnits / avgSunHours) * 1.2 * 10) / 10;
  const cappedSystemSize = Math.min(Math.max(systemSizeKw, 1), 10);

  // Select best panel
  let selectedPanel = panels.length > 0 ? panels[0] : null;
  if (panels.length > 1) {
    // Pick the most cost-effective panel
    selectedPanel = panels.reduce((best, p) => {
      const costPerWatt = parseFloat(p.pricePerPanel) / p.wattage;
      const bestCostPerWatt = parseFloat(best.pricePerPanel) / best.wattage;
      return costPerWatt < bestCostPerWatt ? p : best;
    });
  }

  // Calculate panel count
  const panelWattage = selectedPanel ? selectedPanel.wattage : 545;
  const panelCount = Math.ceil((cappedSystemSize * 1000) / panelWattage);
  const panelPrice = selectedPanel ? parseFloat(selectedPanel.pricePerPanel) : 18000;
  const totalPanelCost = panelCount * panelPrice;

  // Select best inverter
  let selectedInverter = inverters.length > 0 ? inverters[0] : null;
  if (inverters.length > 1) {
    selectedInverter = inverters.reduce((best, inv) => {
      const cap = parseFloat(inv.capacityKw);
      const bestCap = parseFloat(best.capacityKw);
      // Pick smallest inverter that fits the system
      if (cap >= cappedSystemSize && (bestCap < cappedSystemSize || cap < bestCap)) return inv;
      return best;
    });
  }

  const inverterPrice = selectedInverter ? parseFloat(selectedInverter.price) : cappedSystemSize * 15000;

  // Installation charges
  const installationPerKw = agency ? parseFloat(agency.installationChargePerKw || "8000") : 8000;
  const installationCost = cappedSystemSize * installationPerKw;

  // Margin
  const marginPercent = agency ? parseFloat(agency.marginPercent || "15") : 15;

  // Total cost before subsidy
  const baseCost = totalPanelCost + inverterPrice + installationCost;
  const totalCost = Math.round(baseCost * (1 + marginPercent / 100));

  // Calculate subsidy
  let centralSubsidy = 0;
  if (subsidyData) {
    if (cappedSystemSize <= 1) centralSubsidy = parseFloat(subsidyData.centralSubsidy1kw);
    else if (cappedSystemSize <= 2) centralSubsidy = parseFloat(subsidyData.centralSubsidy2kw);
    else centralSubsidy = parseFloat(subsidyData.centralSubsidy3kw);
  } else {
    // Default PM Surya Ghar rates
    if (cappedSystemSize <= 1) centralSubsidy = 30000;
    else if (cappedSystemSize <= 2) centralSubsidy = 60000;
    else centralSubsidy = 78000;
  }

  let stateSubsidy = 0;
  if (subsidyData && parseFloat(subsidyData.stateAdditionalPerKw) > 0) {
    const additionalPerKw = parseFloat(subsidyData.stateAdditionalPerKw);
    const maxAdditional = parseFloat(subsidyData.stateMaxAdditional);
    stateSubsidy = Math.min(cappedSystemSize * additionalPerKw, maxAdditional);
  }

  const totalSubsidy = centralSubsidy + stateSubsidy;
  const netCost = Math.max(totalCost - totalSubsidy, 0);

  // Savings calculation
  const annualGeneration = cappedSystemSize * avgSunHours * 365 * 0.85; // 85% efficiency
  const annualSavings = annualGeneration * electricityRate;
  const monthlySavings = Math.round(annualSavings / 12);

  // Payback period
  const paybackYears = netCost > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : 0;

  // 25-year savings
  const lifetimeSavings = Math.round(annualSavings * 25 - netCost);

  return {
    systemSizeKw: cappedSystemSize,
    panelCount,
    panelBrand: selectedPanel?.brand || "Standard",
    panelModel: selectedPanel?.model || "545W Mono PERC",
    panelWattage: selectedPanel?.wattage || 545,
    inverterBrand: selectedInverter?.brand || "Standard",
    inverterModel: selectedInverter?.model || `${cappedSystemSize}kW String`,
    inverterCapacity: selectedInverter ? parseFloat(selectedInverter.capacityKw) : cappedSystemSize,
    totalPanelCost,
    inverterPrice,
    installationCost,
    totalCost,
    centralSubsidy,
    stateSubsidy,
    totalSubsidy,
    netCost,
    monthlyUnits: Math.round(monthlyUnits),
    monthlySavings,
    annualSavings: Math.round(annualSavings),
    paybackYears,
    lifetimeSavings,
    electricityRate,
    avgSunHours,
    discomName: subsidyData?.discomName || "Local DISCOM",
    netMeteringAvailable: subsidyData?.netMeteringAvailable ?? true,
    specialNotes: subsidyData?.specialNotes || "",
  };
}

// ===== AI SALES AGENT PROMPT BUILDER =====
function buildSalesAgentPrompt(agency: any, panels: any[], inverters: any[], subsidyData: any, conversation: any): string {
  const panelList = panels.map(p => `- ${p.brand} ${p.model} (${p.wattage}W, ₹${p.pricePerPanel}/panel, ${p.panelType}, ${p.warranty}yr warranty)`).join("\n");
  const inverterList = inverters.map(i => `- ${i.brand} ${i.model} (${i.capacityKw}kW, ₹${i.price}, ${i.inverterType}, ${i.warranty}yr warranty)`).join("\n");

  const subsidyInfo = subsidyData ? `
STATE SUBSIDY INFO for ${subsidyData.stateName}:
- Central Subsidy: ₹30,000/kW (up to 2kW), ₹78,000 for 3kW+
- State Additional: ₹${subsidyData.stateAdditionalPerKw}/kW (max ₹${subsidyData.stateMaxAdditional})
- Avg Electricity Rate: ₹${subsidyData.avgElectricityRate}/unit
- DISCOM: ${subsidyData.discomName}
- Net Metering: ${subsidyData.netMeteringAvailable ? "Available" : "Limited"}
- Sun Hours: ${subsidyData.avgSunHours} hrs/day
${subsidyData.specialNotes ? `- Special: ${subsidyData.specialNotes}` : ""}
` : "State subsidy data not yet available - ask which state the customer is from.";

  const conversationContext = `
CUSTOMER DATA COLLECTED SO FAR:
- Name: ${conversation.customerName || "Not yet collected"}
- Phone: ${conversation.customerPhone || "Not yet collected"}
- Email: ${conversation.customerEmail || "Not yet collected"}
- State: ${conversation.customerState || "Not yet collected"}
- City: ${conversation.customerCity || "Not yet collected"}
- Monthly Bill: ${conversation.monthlyBill ? `₹${conversation.monthlyBill}` : "Not yet collected"}
- Monthly Units: ${conversation.monthlyUnits || "Not yet collected"}
`;

  return `You are a friendly, knowledgeable, and persuasive solar energy sales advisor for "${agency.agencyName}". Your tone is ${agency.botTone || "friendly"} and conversational - like talking to a neighbor, not a robot.

YOUR MISSION: Help the customer understand solar energy benefits, calculate their savings, and convince them to go solar with ${agency.agencyName}. Capture their contact details naturally during the conversation.

CONVERSATION RULES:
1. Be warm and friendly, use simple language
2. Ask ONE question per message
3. Use ₹ (INR) for all prices
4. Keep responses SHORT (1-2 sentences max)
5. Be specific with numbers when explaining
6. NEVER say you're AI - you're a solar advisor
7. Always relate to their specific situation
8. Naturally collect name, phone, city during chat

CONVERSATION FLOW:
1. Greet & explain why solar NOW: "Electricity rates are rising 10-15% yearly, and solar locks in savings for 25 years. Plus, government subsidies make it affordable."
2. Ask which state they're from
3. Ask about monthly electricity bill (₹ amount)
4. Ask about roof type (owned/rented, space available)
5. **PANEL EDUCATION & SELECTION:**
   - Monocrystalline: Premium, 18-22% efficient, better for small spaces
   - Polycrystalline: Budget-friendly, 15-17% efficient, great for larger roofs
   - Ask: "Which type works for you?"
6. Calculate and present personalized estimate (system size, panels, cost, subsidy, net cost)
7. Show ROI calculator: Monthly savings, payback period, 25-year total savings
8. Explain subsidy: "PM Surya Ghar Yojana covers 40% cost. You pay only 60%."
9. Collect name, phone, email for site visit
10. Close: "We'll contact you within 24 hours with installation details."

AGENCY PRODUCT CATALOG:
${panelList || "Standard panels available - ask agency for specific models"}

INVERTERS:
${inverterList || "Standard inverters available - ask agency for specific models"}

Installation Charge: ₹${agency.installationChargePerKw || "8,000"}/kW

${subsidyInfo}

${conversationContext}

OBJECTION HANDLING:
- "Too expensive" → Show net cost after subsidy, compare with 25-year electricity bills
- "Not reliable" → 25-year panel warranty, proven technology, millions installed in India
- "Maintenance?" → Minimal - just clean panels occasionally, no moving parts
- "What about cloudy days?" → Net metering credits excess power, still generates on cloudy days
- "Rented house" → Suggest talking to landlord about shared benefits, or portable options
- "Will wait" → Subsidy may reduce, electricity rates only go up, install now for max savings

IMPORTANT: When you have enough info (state + monthly bill), calculate and present a detailed estimate including:
- Recommended system size: "Approx X kW"
- Number of panels needed: "Approx X panels"
- Total cost before subsidy: "Approx ₹X"
- Government subsidy amount: "Approx ₹X"
- Net cost after subsidy: "Approx ₹X"
- Monthly savings: "Approx ₹X"
- Payback period: "Approx X years"
- 25-year total savings: "Approx ₹X"

ALWAYS use "Approx" prefix for all numbers to indicate estimates.

QUICK REPLY BUTTONS:
At the END of EVERY response, you MUST include a JSON block with 2-4 quick reply button options that the customer can tap instead of typing. These should be contextually relevant to what you just asked or said. Format them as:

[QUICK_REPLIES]
["Option 1", "Option 2", "Option 3"]
[/QUICK_REPLIES]

Examples by stage:
- After greeting/asking state: ["Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "Delhi"]
- After asking bill amount: ["₹1000-2000", "₹2000-4000", "₹4000-7000", "₹7000+"]
- After asking about roof: ["Yes, I own the house", "Rented house", "Commercial building"]
- **After panel education:** ["Monocrystalline (Premium)", "Polycrystalline (Budget)", "Tell me more", "Not sure"]
- After giving estimate: ["Sounds great!", "That's expensive", "Tell me about subsidy", "How soon can you visit?"]
- After showing ROI: ["Impressive savings!", "How about financing?", "When can you visit?", "Need to think"]
- After handling objection: ["I'm interested", "Need to think", "Share my details", "More questions"]
- When collecting contact: ["Sure, here's my number", "I'll share my email", "Call me later"]
- After estimate given: ["Book site visit", "Share with family", "Compare with grid", "What's next?"]

ALWAYS include quick replies - they make the conversation faster and easier for the customer. Make buttons short (2-5 words max) and directly relevant to the current conversation stage.`;
}

// ===== DATA EXTRACTION FROM CONVERSATION =====
async function extractCustomerData(history: any[], latestMessage: string) {
  try {
    const recentMessages = history.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Extract customer information from this conversation. Return JSON with these fields (null if not found): name, phone, email, city, state (Indian state name), monthlyBill (number in INR), monthlyUnits (number). Only extract clearly stated information, don't guess. For state, use full state name (e.g., "Maharashtra", "Tamil Nadu").`,
        },
        {
          role: "user",
          content: `Latest message: "${latestMessage}"\n\nRecent conversation:\n${recentMessages}`,
        },
      ] as any,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "customer_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: ["string", "null"] },
              phone: { type: ["string", "null"] },
              email: { type: ["string", "null"] },
              city: { type: ["string", "null"] },
              state: { type: ["string", "null"] },
              monthlyBill: { type: ["number", "null"] },
              monthlyUnits: { type: ["number", "null"] },
            },
            required: ["name", "phone", "email", "city", "state", "monthlyBill", "monthlyUnits"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Failed to extract customer data:", e);
  }
  return null;
}

// ===== SCORING =====
function calculateConversationScore(conversation: any, extractedData: any): number {
  let score = 10;
  if (extractedData?.name || conversation.customerName) score += 15;
  if (extractedData?.phone || conversation.customerPhone) score += 20;
  if (extractedData?.email || conversation.customerEmail) score += 10;
  if (extractedData?.state || conversation.customerState) score += 10;
  if (extractedData?.city || conversation.customerCity) score += 5;
  if (extractedData?.monthlyBill || conversation.monthlyBill) {
    const bill = extractedData?.monthlyBill || parseFloat(conversation.monthlyBill);
    if (bill >= 3000) score += 20;
    else if (bill >= 2000) score += 15;
    else if (bill >= 1000) score += 10;
    else score += 5;
  }
  if ((conversation.messageCount || 0) >= 5) score += 10;
  return Math.min(score, 100);
}

function getPriority(score: number): "low" | "medium" | "high" | "urgent" {
  if (score >= 80) return "urgent";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ===== BUSINESS SCRAPER HELPERS =====
function extractCity(address: string): string {
  if (!address) return "";
  // Indian addresses typically have city before state
  const parts = address.split(",").map(p => p.trim());
  // Try to find city (usually 2nd or 3rd from end)
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || "";
}

function extractState(address: string): string {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  // State is typically 2nd from end (before country/pincode)
  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
    "Chandigarh", "Puducherry", "Jammu and Kashmir", "Ladakh",
  ];
  for (const part of parts) {
    for (const state of INDIAN_STATES) {
      if (part.toLowerCase().includes(state.toLowerCase())) return state;
    }
  }
  if (parts.length >= 2) return parts[parts.length - 2];
  return "";
}

function classifyBusinessSize(reviewCount: number, types: string[]): "small" | "medium" | "large" {
  // Large businesses: hospitals, malls, factories, universities
  const largeTypes = ["hospital", "university", "shopping_mall", "department_store", "stadium", "airport"];
  const mediumTypes = ["hotel", "school", "gym", "restaurant", "supermarket", "warehouse"];
  
  if (types.some(t => largeTypes.some(lt => t.includes(lt)))) return "large";
  if (types.some(t => mediumTypes.some(mt => t.includes(mt)))) return "medium";
  
  if (reviewCount > 500) return "large";
  if (reviewCount > 100) return "medium";
  return "small";
}
