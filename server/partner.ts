import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./_core/emailService";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { createHash, randomBytes } from "crypto";
import { storagePut } from "./storage";

const PARTNER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PARTNER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PARTNER_APP_URL = "https://salessquadleads-xxxqwsn9.manus.space";

const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access required" });
  }
  return next({ ctx });
});

function hashPartnerSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createPartnerToken() {
  return randomBytes(32).toString("base64url");
}

async function requirePartnerSession(dbConn: any, token: string) {
  const result = await dbConn.execute(sql`
    SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, status, pricingSheetUrl, productListUrl, products, pricing, discounts
    FROM solarPartners
    WHERE loginTokenHash = ${hashPartnerSecret(token)} AND loginExpiresAt > ${Date.now()}
    LIMIT 1
  `);
  const partner = firstRow(result);
  if (!partner) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your partner session has expired. Please sign in again." });
  return partner;
}

// drizzle-mysql2: execute() returns [rows, fields] tuple — always extract rows[0]
function rows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  return [];
}
function firstRow(result: any): any | null {
  const r = rows(result);
  return r.length > 0 ? r[0] : null;
}
function insertId(result: any): number {
  if (Array.isArray(result)) return (result[0] as any)?.insertId || 0;
  return (result as any)?.insertId || 0;
}

export const partnerRouter = router({
  // Search scraped businesses to add as partners
  searchBusinesses: ownerProcedure
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
      return rows(await dbConn.execute(query));
    }),

  // Get all partners with their status
  getPartners: ownerProcedure.query(async () => {
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    const query = sql`
      SELECT id, companyName, email, phone, status, emailSentAt, signedUpAt
      FROM solarPartners
      ORDER BY signedUpAt DESC, emailSentAt DESC, createdAt DESC
    `;
    return rows(await dbConn.execute(query));
  }),

  // Send outreach email to a business
  sendOutreachEmail: ownerProcedure
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
        const existing = rows(await dbConn.execute(
          sql`SELECT id, status FROM solarPartners WHERE email = ${input.email}`
        ));

        let partnerId: number;
        if (existing.length > 0) {
          partnerId = existing[0].id;
          if (existing[0].status === "signed_up") throw new Error("This company is already an active partner");
        } else {
          const result = await dbConn.execute(
            sql`INSERT INTO solarPartners (companyName, email, phone, whatsappNumber, serviceAreas, status, emailSentAt)
                VALUES (${input.companyName}, ${input.email}, ${input.phone || null}, ${input.whatsappNumber || null}, ${JSON.stringify(input.serviceAreas || [])}, 'not_contacted', NULL)`
          );
          partnerId = insertId(result);
        }

        const signupToken = createPartnerToken();
        const signupLink = `${PARTNER_APP_URL}/partner-signup?token=${signupToken}`;

        const emailHtml = input.customMessage || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 8px;">
            <h2 style="color: #f97316;">🌞 Earn Commission with Sales Squad</h2>
            <p>Hi ${input.companyName},</p>
            <p>We generate qualified solar leads 24/7 through our AI chatbot. Instead of you hunting for leads, we send them directly to you.</p>
            <h3 style="color: #333;">What You Get:</h3>
            <ul>
              <li>✅ Qualified leads (name, phone, email, bill amount, location)</li>
              <li>✅ 24/7 lead generation — no marketing spend needed</li>
              <li>✅ You close the deal, we handle the marketing</li>
            </ul>
            <p style="margin: 24px 0;">
              <a href="${signupLink}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Sign Up as Partner →</a>
            </p>
            <p style="color: #666; font-size: 13px;">Once you sign up, we'll start sending leads to your service area.</p>
            <p style="color: #999; font-size: 12px;">Best,<br/>Klaus<br/>Sales Squad</p>
          </div>
        `;

        if (!input.skipEmail) {
          const delivery = await sendEmail({
            to: input.email,
            subject: "Earn Commission with Sales Squad — Qualified Solar Leads",
            html: emailHtml,
          });
          if (!delivery.success) throw new Error("Partner invitation email was not delivered");
        }

        await dbConn.execute(sql`
          UPDATE solarPartners
          SET signupTokenHash = ${hashPartnerSecret(signupToken)},
              signupExpiresAt = ${Date.now() + PARTNER_INVITE_TTL_MS},
              status = CASE WHEN status = 'signed_up' THEN status ELSE 'email_sent' END,
              emailSentAt = CASE WHEN ${input.skipEmail ? 1 : 0} = 1 THEN emailSentAt ELSE NOW() END
          WHERE id = ${partnerId}
        `);

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
      products: z.string(),
      pricing: z.string(),
      discounts: z.string().optional(),
      password: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");

        const invited = firstRow(await dbConn.execute(sql`
          SELECT id, email FROM solarPartners
          WHERE signupTokenHash = ${hashPartnerSecret(input.token)}
            AND signupExpiresAt > ${Date.now()}
          LIMIT 1
        `));
        if (!invited) throw new TRPCError({ code: "UNAUTHORIZED", message: "This invitation is invalid or has expired." });
        if (String(invited.email).toLowerCase() !== input.email.toLowerCase()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This invitation is only valid for the invited company email." });
        }

        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(input.password, 12);

        await dbConn.execute(
          sql`UPDATE solarPartners
              SET companyName = ${input.companyName}, phone = ${input.phone},
                  whatsappNumber = ${input.whatsappNumber || null},
                  serviceAreas = ${JSON.stringify(input.serviceAreas)},
                  products = ${input.products},
                  pricing = ${input.pricing},
                  discounts = ${input.discounts || null},
                  passwordHash = ${passwordHash},
                  status = 'signed_up', signedUpAt = NOW(),
                  signupTokenHash = NULL, signupExpiresAt = NULL
              WHERE id = ${invited.id}`
        );
          // Notify Agent Klaus of new partner signup
          try {
            await sendEmail({
              to: "akhil@salessquadtech.com",
              subject: `🌟 New Partner Signup: ${input.companyName}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:24px;border-radius:12px;">
                  <div style="background:#f97316;padding:16px 24px;border-radius:8px;margin-bottom:24px;">
                    <h2 style="margin:0;color:#fff;">New Partner Signed Up</h2>
                    <p style="margin:4px 0 0;color:#fff;opacity:0.9;font-size:14px;">Sales Squad Partner Program</p>
                  </div>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Company</td><td style="padding:8px 0;font-weight:600;">${input.companyName}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Email</td><td style="padding:8px 0;">${input.email}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Phone</td><td style="padding:8px 0;">${input.phone}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">WhatsApp</td><td style="padding:8px 0;">${input.whatsappNumber || "—"}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Service Areas</td><td style="padding:8px 0;">${input.serviceAreas.join(", ")}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Products</td><td style="padding:8px 0;">${input.products}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Pricing</td><td style="padding:8px 0;">${input.pricing}</td></tr>
                    <tr><td style="padding:8px 0;color:#aaa;font-size:13px;">Discounts</td><td style="padding:8px 0;">${input.discounts || "None specified"}</td></tr>
                  </table>
                  <p style="margin-top:24px;color:#aaa;font-size:13px;">Log in to your dashboard to review and activate this partner.</p>
                  <p style="margin-top:16px;color:#f97316;font-size:14px;font-weight:600;">— Agent Klaus</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error("Failed to send partner signup notification:", emailErr);
          }
          return { success: true, partnerId: invited.id, isNew: false };
      } catch (error) {
        console.error("Partner registration error:", error);
        throw new Error("Failed to register partner");
      }
    }),

  // Get partner by ID
  getPartnerById: ownerProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      const result = rows(await dbConn.execute(sql`
        SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, status
        FROM solarPartners WHERE id = ${input.partnerId}
      `));
      return result.length > 0 ? result[0] : null;
    }),

  // Get leads assigned to a partner
  getPartnerLeads: ownerProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      return rows(await dbConn.execute(sql`
        SELECT id, firstName, lastName, email, phone, city, state, monthlyEnergyBill, status, createdAt
        FROM leads2 WHERE assignedPartnerId = ${input.partnerId}
        ORDER BY createdAt DESC
      `));
    }),

  // Get partner stats
  getPartnerStats: ownerProcedure
    .input(z.object({ partnerId: z.number() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { totalLeads: 0, convertedLeads: 0, conversionRate: 0 };

      const totalRow = firstRow(await dbConn.execute(
        sql`SELECT COUNT(*) as count FROM leads2 WHERE assignedPartnerId = ${input.partnerId}`
      ));
      const convertedRow = firstRow(await dbConn.execute(
        sql`SELECT COUNT(*) as count FROM leads2 WHERE assignedPartnerId = ${input.partnerId} AND status IN ('converted')`
      ));

      const total = Number(totalRow?.count || 0);
      const converted = Number(convertedRow?.count || 0);
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
      const partnerRows = rows(await dbConn.execute(
        sql`SELECT id, companyName, email, passwordHash, status FROM solarPartners WHERE email = ${input.email}`
      ));
      if (!partnerRows.length) throw new Error("No partner account found with this email");
      const partner = partnerRows[0];
      if (!partner.passwordHash) throw new Error("Password not set. Please contact Sales Squad.");
      const valid = await bcrypt.compare(input.password, partner.passwordHash);
      if (!valid) throw new Error("Incorrect password");
      const token = createPartnerToken();
      const expiresAt = Date.now() + PARTNER_SESSION_TTL_MS;
      await dbConn.execute(sql`
        UPDATE solarPartners
        SET loginTokenHash = ${hashPartnerSecret(token)}, loginExpiresAt = ${expiresAt}, loginToken = NULL
        WHERE id = ${partner.id}
      `);
      return { success: true, token, expiresAt, partnerId: partner.id, companyName: partner.companyName };
    }),

  // Set partner password (called during signup)
  setPartnerPassword: ownerProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(10) }))
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
    .input(z.object({ token: z.string().min(20) }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { partner: null, leads: [] };
      const partner = await requirePartnerSession(dbConn, input.token);
      const leadRows = rows(await dbConn.execute(
        sql`SELECT id, firstName, lastName, email, phone, city, state, monthlyEnergyBill, status, createdAt
            FROM leads2 WHERE assignedPartnerId = ${partner.id} ORDER BY createdAt DESC`
      ));
      return { partner, leads: leadRows };
    }),

  // Referrer-originated outreach is owner-controlled to prevent public email abuse.
  referrerSendOutreachEmail: ownerProcedure
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
  generateOutreachPitch: ownerProcedure
    .input(z.object({
      companyName: z.string(),
      city: z.string(),
      mode: z.enum(["email", "whatsapp"]),
      partnerUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = input.mode === "whatsapp"
        ? `You are a sales expert writing a WhatsApp message to a solar company. Write a short, friendly, persuasive WhatsApp message (max 200 words) pitching Sales Squad — a B2B lead generation platform for solar companies. Explain: (1) Sales Squad uses an AI chatbot to capture homeowners and businesses interested in solar, (2) these leads are pre-qualified with name, phone, email, monthly electricity bill, and location, (3) we send these leads directly to solar installers so they can close deals without spending on marketing, (4) the solar company just needs to sign up as a partner to start receiving leads. End with the signup link. Do NOT mention referrers, commissions to individuals, or any referral program. Use emojis sparingly. Be conversational, not corporate.`
        : `You are a sales expert writing a cold outreach email to a solar company. Write a professional, persuasive email (max 300 words) pitching Sales Squad — a B2B lead generation platform for solar companies. Explain: (1) Sales Squad uses an AI chatbot to capture homeowners and businesses interested in solar, (2) these leads are pre-qualified with name, phone, email, monthly electricity bill, and location, (3) we send these leads directly to solar installers so they can close deals without spending on marketing, (4) how the chatbot works — customer enters their bill, gets an estimate, and expresses interest, (5) the solar company just needs to sign up as a partner to start receiving leads. End with the signup link. Do NOT mention referrers, commissions to individuals, or any referral program. Be professional and concise.`;

      const userPrompt = `Company: ${input.companyName}, City: ${input.city}. Partner signup link: ${input.partnerUrl}/for-partners`;

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
  assignLeadToPartner: ownerProcedure
    .input(z.object({ leadId: z.number(), partnerId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("Database connection failed");
        await dbConn.execute(
          sql`UPDATE leads2 SET assignedPartnerId = ${input.partnerId} WHERE id = ${input.leadId}`
        );
        // If partner assigned, send them the lead details by email
        if (input.partnerId) {
          const partnerRow = firstRow(await dbConn.execute(
            sql`SELECT email, companyName FROM solarPartners WHERE id = ${input.partnerId}`
          ));
          const leadRow = firstRow(await dbConn.execute(
            sql`SELECT firstName, lastName, email, phone, city, state, monthlyEnergyBill FROM leads2 WHERE id = ${input.leadId}`
          ));
          if (partnerRow && leadRow) {
            const leadDetailsHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 8px;">
                <h2 style="color: #10b981;">🔥 New Lead from Sales Squad</h2>
                <p>Hi ${partnerRow.companyName},</p>
                <p>A qualified lead is ready for you!</p>
                <hr style="border: 1px solid #e5e7eb; margin: 16px 0;" />
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold; width: 40%;">Name</td><td style="padding: 8px 0; color: #111827;">${leadRow.firstName} ${leadRow.lastName}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Phone</td><td style="padding: 8px 0; color: #111827;">${leadRow.phone}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Email</td><td style="padding: 8px 0; color: #111827;">${leadRow.email}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Location</td><td style="padding: 8px 0; color: #111827;">${leadRow.city}, ${leadRow.state}</td></tr>
                  <tr><td style="padding: 8px 0; color: #374151; font-weight: bold;">Monthly Bill</td><td style="padding: 8px 0; color: #111827;">₹${leadRow.monthlyEnergyBill}</td></tr>
                </table>
                <hr style="border: 1px solid #e5e7eb; margin: 16px 0;" />
                <p style="color: #666; font-size: 13px;">Contact this lead to discuss their solar installation. Good luck!</p>
              </div>
            `;
            await sendEmail({
              to: partnerRow.email,
              subject: `New Lead: ${leadRow.firstName} ${leadRow.lastName} - ₹${leadRow.monthlyEnergyBill}/month`,
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

  // Upload pricing sheet or product list for a partner
  uploadPartnerFile: publicProcedure
    .input(z.object({
      token: z.string(),
      fileName: z.string().trim().min(1).max(120),
      contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
      contentBase64: z.string().min(8).max(6_000_000),
      fileType: z.enum(["pricingSheet", "productList"]),
    }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      const partner = await requirePartnerSession(dbConn, input.token);
      const column = input.fileType === "pricingSheet" ? "pricingSheetUrl" : "productListUrl";
      const bytes = Buffer.from(input.contentBase64, "base64");
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File must be between 1 byte and 4 MB." });
      }
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { url } = await storagePut(
        `partner-files/${partner.id}/${Date.now()}-${input.fileType}-${safeName}`,
        bytes,
        input.contentType,
      );
      await dbConn.execute(
        sql`UPDATE solarPartners SET ${sql.raw(column)} = ${url} WHERE id = ${partner.id}`
      );
      return { success: true };
    }),

  // Get partner profile including uploaded files
  getPartnerProfile: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      return await requirePartnerSession(dbConn, input.token);
    }),

  // Update partner profile (products, pricing, discounts, phone, whatsapp)
  updateProfile: publicProcedure
    .input(z.object({
      token: z.string().min(20),
      products: z.string().optional(),
      pricing: z.string().optional(),
      discounts: z.string().optional(),
      phone: z.string().optional(),
      whatsappNumber: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      const partner = await requirePartnerSession(dbConn, input.token);
      await dbConn.execute(
        sql`UPDATE solarPartners
            SET products = COALESCE(${input.products ?? null}, products),
                pricing = COALESCE(${input.pricing ?? null}, pricing),
                discounts = ${input.discounts ?? null},
                phone = COALESCE(${input.phone ?? null}, phone),
                whatsappNumber = COALESCE(${input.whatsappNumber ?? null}, whatsappNumber)
            WHERE id = ${partner.id}`
      );
      return { success: true };
    }),

  // Update lead status by partner
  updateLeadStatus: publicProcedure
    .input(z.object({
      token: z.string().min(20),
      leadId: z.number(),
      status: z.enum(["new", "contacted", "converted", "lost"]),
    }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      const partner = await requirePartnerSession(dbConn, input.token);
      // Verify lead belongs to this partner
      const lead = firstRow(await dbConn.execute(
        sql`SELECT id FROM leads2 WHERE id = ${input.leadId} AND assignedPartnerId = ${partner.id}`
      ));
      if (!lead) throw new Error("Lead not found or not assigned to you");
      await dbConn.execute(
        sql`UPDATE leads2 SET status = ${input.status} WHERE id = ${input.leadId}`
      );
      return { success: true };
    }),

  // Get partner lead stats (by token, for partner dashboard)
  getMyStats: publicProcedure
    .input(z.object({ token: z.string().min(20) }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { total: 0, new: 0, contacted: 0, converted: 0, lost: 0 };
      const partner = await requirePartnerSession(dbConn, input.token);
      const stats = rows(await dbConn.execute(
        sql`SELECT status, COUNT(*) as count FROM leads2 WHERE assignedPartnerId = ${partner.id} GROUP BY status`
      ));
      const result = { total: 0, new: 0, contacted: 0, converted: 0, lost: 0 } as Record<string, number>;
      for (const row of stats) {
        const s = (row.status || "new") as string;
        const c = Number(row.count);
        result.total += c;
        if (s in result) result[s] += c;
        else result.new += c;
      }
      return result;
    }),

  // Get partner leads with solar estimate data
  getMyLeadsDetailed: publicProcedure
    .input(z.object({ token: z.string().min(20) }))
    .query(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const partner = await requirePartnerSession(dbConn, input.token);
      return rows(await dbConn.execute(
        sql`SELECT l.id, l.firstName, l.lastName, l.email, l.phone, l.city, l.state,
                   l.monthlyEnergyBill, l.status, l.createdAt,
                   c.recommendedKw, c.estimatedCost, c.subsidyAmount, c.netCost, c.estimatedSavingsMonthly
            FROM leads2 l
            LEFT JOIN conversations3 c ON l.conversationId = c.id
            WHERE l.assignedPartnerId = ${partner.id}
            ORDER BY l.createdAt DESC`
      ));
    }),

  // Register interest in marketing automation
  notifyMeMarketing: publicProcedure
    .input(z.object({ token: z.string().min(20) }))
    .mutation(async ({ input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      const partner = await requirePartnerSession(dbConn, input.token);
      await dbConn.execute(
        sql`UPDATE solarPartners SET marketingNotifyMe = TRUE WHERE id = ${partner.id}`
      );
      return { success: true };
    }),
});
