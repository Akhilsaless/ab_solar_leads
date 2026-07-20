import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./_core/emailService";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";

export const partnerRouter = router({
  // Search scraped businesses to add as partners
  searchBusinesses: protectedProcedure
    .input(z.object({ city: z.string(), businessType: z.string().optional() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const query = sql`
        SELECT id, businessName, phone, email, businessType, city, state
        FROM scrapedBusinesses
        WHERE city = ${input.city}
        ${input.businessType ? sql`AND businessType = ${input.businessType}` : sql``}
        AND email IS NOT NULL
        LIMIT 50
      `;
      const results = await dbConn.execute(query);
      return results;
    }),

  // Get all partners with their status
  getPartners: protectedProcedure.query(async () => {
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    const query = sql`
      SELECT id, companyName, email, phone, status, emailSentAt, signedUpAt
      FROM solarPartners
      ORDER BY signedUpAt DESC, emailSentAt DESC, createdAt DESC
    `;
    const results = await dbConn.execute(query);
    return results;
  }),

  // Send outreach email to a business
  sendOutreachEmail: protectedProcedure
    .input(z.object({ 
      companyName: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      whatsappNumber: z.string().optional(),
      serviceAreas: z.array(z.string()).optional(),
      customMessage: z.string().optional(),
      skipEmail: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        // Check if already exists
        const existing = await dbConn.execute(
          sql`SELECT id, status FROM solarPartners WHERE email = ${input.email}`
        ) as any[];

        let partnerId: number;
        if (existing.length > 0) {
          partnerId = existing[0].id;
          // Update status if not already signed up
          if (existing[0].status !== "signed_up") {
            await dbConn.execute(
              sql`UPDATE solarPartners SET status = 'email_sent', emailSentAt = NOW() WHERE id = ${partnerId}`
            );
          }
        } else {
          // Create new partner entry
          const result = await dbConn.execute(
            sql`INSERT INTO solarPartners (companyName, email, phone, whatsappNumber, serviceAreas, status, emailSentAt)
                VALUES (${input.companyName}, ${input.email}, ${input.phone || null}, ${input.whatsappNumber || null}, ${JSON.stringify(input.serviceAreas || [])}, 'email_sent', NOW())`
          ) as any;
          partnerId = result.insertId;
        }

        // Generate unique signup link
        const signupToken = nanoid(24);
        const signupLink = `${process.env.VITE_APP_ID ? `https://${process.env.VITE_APP_ID}.manus.space` : 'http://localhost:3000'}/partner-signup?token=${signupToken}`;

        // Send email
        const emailHtml = input.customMessage || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 8px;">
            <h2 style="color: #f97316;">🌞 Earn Commission with Sales Squad</h2>
            <p>Hi ${input.companyName},</p>
            <p>We generate qualified solar leads 24/7 through our AI chatbot. Instead of you hunting for leads, we send them directly to you.</p>
            
            <h3 style="color: #333;">What You Get:</h3>
            <ul>
              <li>✅ Qualified leads (name, phone, email, bill amount, location)</li>
              <li>✅ 24/7 lead generation</li>
              <li>✅ You close the deal, we handle the marketing</li>
              <li>✅ Earn commission on every installation</li>
            </ul>

            <p style="margin: 24px 0;">
              <a href="${signupLink}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Sign Up as Partner</a>
            </p>

            <p style="color: #666; font-size: 13px;">Once you sign up, we'll start sending leads to your service area.</p>
            <p style="color: #999; font-size: 12px;">Best,<br/>Klaus<br/>Sales Squad</p>
          </div>
        `;

        if (!input.skipEmail) {
          await sendEmail({
            to: input.email,
            subject: "Earn Commission with Sales Squad — Qualified Solar Leads",
            html: emailHtml,
          });
        }

        return { success: true, partnerId, signupLink };
      } catch (error) {
        console.error("Email send error:", error);
        throw new Error("Failed to send email");
      }
    }),

  // Register a partner (via signup link)
  registerPartner: publicProcedure
    .input(z.object({
      token: z.string(),
      companyName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      whatsappNumber: z.string().optional(),
      serviceAreas: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        // Check if partner already exists with this email
        const existing = await dbConn.execute(
          sql`SELECT id FROM solarPartners WHERE email = ${input.email}`
        ) as any[];

        if (existing.length > 0) {
          // Update existing
          await dbConn.execute(
            sql`UPDATE solarPartners 
                SET companyName = ${input.companyName}, phone = ${input.phone}, 
                    whatsappNumber = ${input.whatsappNumber || null}, 
                    serviceAreas = ${JSON.stringify(input.serviceAreas)},
                    status = 'signed_up', signedUpAt = NOW()
                WHERE id = ${existing[0].id}`
          );
          return { success: true, partnerId: existing[0].id, isNew: false };
        } else {
          // Create new
          const result = await dbConn.execute(
            sql`INSERT INTO solarPartners (companyName, email, phone, whatsappNumber, serviceAreas, status, signedUpAt)
                VALUES (${input.companyName}, ${input.email}, ${input.phone}, ${input.whatsappNumber || null}, ${JSON.stringify(input.serviceAreas)}, 'signed_up', NOW())`
          ) as any;
          return { success: true, partnerId: result.insertId, isNew: true };
        }
      } catch (error) {
        console.error("Partner registration error:", error);
        throw new Error("Failed to register partner");
      }
    }),

  // Get partner by ID
  getPartnerById: protectedProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      const query = sql`
        SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, status
        FROM solarPartners
        WHERE id = ${input.partnerId}
      `;
      const results = await dbConn.execute(query) as any[];
      return results.length > 0 ? results[0] : null;
    }),

  // Get leads assigned to a partner
  getPartnerLeads: protectedProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const query = sql`
        SELECT id, firstName, lastName, email, phone, city, state, monthlyEnergyBill, status, createdAt
        FROM leads
        WHERE assignedPartnerId = ${input.partnerId}
        ORDER BY createdAt DESC
      `;
      const results = await dbConn.execute(query);
      return results;
    }),

  // Get partner stats
  getPartnerStats: protectedProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { totalLeads: 0, convertedLeads: 0, conversionRate: 0 };

      const leadCount = await dbConn.execute(
        sql`SELECT COUNT(*) as count FROM leads WHERE assignedPartnerId = ${input.partnerId}`
      ) as any[];
      const convertedCount = await dbConn.execute(
        sql`SELECT COUNT(*) as count FROM leads WHERE assignedPartnerId = ${input.partnerId} AND status IN ('subsidy_applied', 'installed')`
      ) as any[];

      const total = leadCount[0]?.count || 0;
      const converted = convertedCount[0]?.count || 0;
      return {
        totalLeads: total,
        convertedLeads: converted,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : "0",
      };
    }),

  // Partner login with email + password
  partnerLogin: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const bcrypt = await import('bcryptjs');
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      const rows = await dbConn.execute(
        sql`SELECT id, companyName, email, passwordHash, status FROM solarPartners WHERE email = ${input.email}`
      ) as any[];
      if (!rows.length) throw new Error("No partner account found with this email");
      const partner = rows[0];
      if (!partner.passwordHash) throw new Error("Password not set. Please contact Sales Squad.");
      const valid = await bcrypt.compare(input.password, partner.passwordHash);
      if (!valid) throw new Error("Incorrect password");
      const { nanoid: nid } = await import('nanoid');
      const token = nid(32);
      await dbConn.execute(sql`UPDATE solarPartners SET loginToken = ${token} WHERE id = ${partner.id}`);
      return { success: true, token, partnerId: partner.id, companyName: partner.companyName };
    }),

  // Set partner password (called during signup)
  setPartnerPassword: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const bcrypt = await import('bcryptjs');
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      const hash = await bcrypt.hash(input.password, 10);
      await dbConn.execute(sql`UPDATE solarPartners SET passwordHash = ${hash} WHERE email = ${input.email}`);
      return { success: true };
    }),

  // Get partner's assigned leads (by login token)
  getMyLeads: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { partner: null, leads: [] };
      const partners = await dbConn.execute(
        sql`SELECT id, companyName, email, phone, serviceAreas, status FROM solarPartners WHERE loginToken = ${input.token}`
      ) as any[];
      if (!partners.length) return { partner: null, leads: [] };
      const partner = partners[0];
      const leads = await dbConn.execute(
        sql`SELECT id, firstName, lastName, email, phone, city, state, monthlyEnergyBill, status, createdAt
            FROM leads WHERE assignedPartnerId = ${partner.id} ORDER BY createdAt DESC`
      ) as any[];
      return { partner, leads };
    }),

  // Referrer sends outreach email to a scraped business
  referrerSendOutreachEmail: publicProcedure
    .input(z.object({
      businessEmail: z.string().email(),
      businessName: z.string(),
      referrerName: z.string(),
      referralLink: z.string(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const emailHtml = input.customMessage
        ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${input.customMessage.replace(/\n/g, '<br/>')}</div>`
        : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:24px;border-radius:8px;">
          <h2 style="color:#f97316;">🌞 Free Solar Savings Estimate for ${input.businessName}</h2>
          <p>Hi ${input.businessName} Team,</p>
          <p>My name is ${input.referrerName}. I wanted to share a free tool that calculates exactly how much your business can save on electricity with solar.</p>
          <p>It takes 2 minutes and there's no commitment:</p>
          <p style="margin:24px 0;"><a href="${input.referralLink}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Get Free Solar Estimate →</a></p>
          <p style="color:#666;font-size:13px;">The estimate includes: potential savings, govt subsidy eligibility, and payback period.</p>
          <p style="color:#999;font-size:12px;">Best,<br/>${input.referrerName}</p>
        </div>`;
      await sendEmail({
        to: input.businessEmail,
        subject: `Free Solar Savings Estimate for ${input.businessName}`,
        html: emailHtml,
      });
      return { success: true };
    }),

  // Generate AI outreach pitch
  generateOutreachPitch: protectedProcedure
    .input(z.object({
      companyName: z.string(),
      city: z.string(),
      mode: z.enum(["email", "whatsapp"]),
      partnerUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = input.mode === "whatsapp"
        ? `You are a sales expert writing a WhatsApp message to a solar company. Write a short, friendly, persuasive WhatsApp message (max 200 words) pitching Sales Squad — a B2B lead generation platform for solar companies. Explain: (1) Sales Squad uses an AI chatbot to capture homeowners and businesses interested in solar, (2) these leads are pre-qualified with name, phone, email, monthly electricity bill, and location, (3) we send these leads directly to solar installers so they can close deals without spending on marketing, (4) the solar company just needs to sign up as a partner to start receiving leads. End with the signup link. Do NOT mention referrers, commissions to individuals, or any referral program. Use emojis sparingly. Be conversational, not corporate.`
        : `You are a sales expert writing a cold outreach email to a solar company. Write a professional, persuasive email (max 300 words) pitching Sales Squad — a B2B lead generation platform for solar companies. Explain: (1) Sales Squad uses an AI chatbot to capture homeowners and businesses interested in solar, (2) these leads are pre-qualified with name, phone, email, monthly electricity bill, and location, (3) we send these leads directly to solar installers so they can close deals without spending on marketing, (4) how the chatbot works — customer enters their bill, gets an estimate, and expresses interest, (5) the solar company just needs to sign up as a partner to start receiving leads. End with the signup link. Do NOT mention referrers, commissions to individuals, or any referral program. Be professional but warm.`;

      const userPrompt = `Company: ${input.companyName}\nCity: ${input.city}\nSignup link: ${input.partnerUrl}\n\nWrite the ${input.mode === "whatsapp" ? "WhatsApp message" : "email"} now.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const pitch = response.choices?.[0]?.message?.content || "";
      return { pitch };
    }),

  // Assign lead to partner
  assignLeadToPartner: protectedProcedure
    .input(z.object({ leadId: z.number(), partnerId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        await dbConn.execute(
          sql`UPDATE leads SET assignedPartnerId = ${input.partnerId} WHERE id = ${input.leadId}`
        );

        // If partner assigned, send them the lead email
        if (input.partnerId) {
          const partner = await dbConn.execute(
            sql`SELECT email, companyName FROM solarPartners WHERE id = ${input.partnerId}`
          ) as any[];
          const lead = await dbConn.execute(
            sql`SELECT firstName, lastName, email, phone, city, state, monthlyEnergyBill FROM leads WHERE id = ${input.leadId}`
          ) as any[];

          if (partner.length > 0 && lead.length > 0) {
            const p = partner[0];
            const l = lead[0];
            const leadDetailsHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 8px;">
                <h2 style="color: #10b981;">🔥 New Lead from Sales Squad</h2>
                <p>Hi ${p.companyName},</p>
                <p>A qualified lead is ready for you!</p>
                <hr style="border: 1px solid #e5e7eb; margin: 16px 0;" />
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold; width: 40%;">Name</td><td style="padding: 8px 0; color: #111827;">${l.firstName} ${l.lastName}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Phone</td><td style="padding: 8px 0; color: #111827;">${l.phone}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Email</td><td style="padding: 8px 0; color: #111827;">${l.email}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Location</td><td style="padding: 8px 0; color: #111827;">${l.city}, ${l.state}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Monthly Bill</td><td style="padding: 8px 0; color: #111827;">₹${l.monthlyEnergyBill}</td></tr>
                </table>
                <hr style="border: 1px solid #e5e7eb; margin: 16px 0;" />
                <p style="color: #666; font-size: 13px;">Contact this lead to discuss their solar installation. Good luck!</p>
              </div>
            `;

            await sendEmail({
              to: p.email,
              subject: `New Lead: ${l.firstName} ${l.lastName} - ₹${l.monthlyEnergyBill}/month`,
              html: leadDetailsHtml,
            });
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Lead assignment error:", error);
        throw new Error("Failed to assign lead");
      }
    }),
});
