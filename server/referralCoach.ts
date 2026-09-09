import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";
import { ENV } from "./_core/env";

// Helper: extract rows from mysql2 execute result (returns [rows, fields] tuple)
function rows(result: any): any[] {
  if (!result) return [];
  // mysql2 returns [RowDataPacket[], FieldPacket[]] — first element is the rows array
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  if (result.rows) return result.rows;
  return [];
}
function firstRow(result: any): any {
  return rows(result)[0] || null;
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireCoachSession(db: any, token: string) {
  const ref = firstRow(await db.execute(sql`
    SELECT id, uniqueCode, name, email, totalEarnings, totalReferrals, status, qualityScore, dailyStreak, lastActiveDate, createdAt
    FROM referrers
    WHERE sessionTokenHash = ${hashSessionToken(token)} AND sessionExpiresAt > ${Date.now()}
    LIMIT 1
  `));
  if (!ref) throw new TRPCError({ code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." });
  return ref;
}

export const referralCoachRouter = router({
  // ── Today's Mission ────────────────────────────────────────────────────────
  getTodaysMission: publicProcedure
    .input(z.object({ token: z.string().min(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const ref = await requireCoachSession(db, input.token);

        const totalReferrals = Number(ref.totalReferrals || ref.total_referrals || 0);
        const streak = Number(ref.dailyStreak || ref.daily_streak || 0);

        // Pending referrals (chatbot started but not completed)
        const pendingRes = firstRow(await db.execute(
          sql`SELECT COUNT(*) as cnt FROM referrals WHERE referrerId = ${ref.id} AND status = 'chatbot_started'`
        ).catch(() => [[{ cnt: 0 }]]));
        const pendingCount = Number(pendingRes?.cnt || 0);

        // Choose mission based on state
        let mission = "";
        let tip = "";

        if (totalReferrals === 0) {
          mission = "Share your referral link with 3 people today — family, neighbours, or local business owners with high electricity bills.";
          tip = "You don't need to explain solar. Just share your link and Agent Klaus will do the rest.";
        } else if (pendingCount > 0) {
          mission = `Follow up with ${pendingCount} contact${pendingCount > 1 ? "s" : ""} who started the chatbot but didn't finish. A polite reminder can convert them.`;
          tip = "Send a short WhatsApp: 'Hey, did you get a chance to check your solar savings estimate? Here's the link again 👉 [your link]'";
        } else if (streak >= 3) {
          mission = "Great streak! Find 2 new prospects using the Find Leads tab — look for factories, hotels, or schools in your area.";
          tip = "Businesses with high electricity bills are the best prospects. Filter by 'Large' size for maximum impact.";
        } else {
          mission = "Share your QR code at one local shop, office, or community notice board today.";
          tip = "Physical QR codes work well in areas with high footfall. Use the QR Code Generator in your dashboard.";
        }

        return { mission, tip, streak, totalReferrals, pendingCount };
      } catch (err) {
        console.error("[ReferralCoach] getTodaysMission error:", err);
        return null;
      }
    }),

  // ── Screen-Aware Coaching Card ─────────────────────────────────────────────
  getCoachCard: publicProcedure
    .input(z.object({
      token: z.string().min(20),
      screen: z.enum(["dashboard", "findleads", "referrallink", "status", "submit"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const ref = await requireCoachSession(db, input.token);

        const totalReferrals = Number(ref.totalReferrals || ref.total_referrals || 0);

        const cards: Record<string, { title: string; body: string; reminder?: string }> = {
          dashboard: {
            title: "Your role is simple",
            body: "Identify people with high electricity bills. Share your link. Agent Klaus handles the rest — product explanation, bill assessment, savings estimate, and lead capture.",
            reminder: "You do not need to explain solar. Share your link and Agent Klaus will guide the customer.",
          },
          findleads: {
            title: "Finding the right prospects",
            body: totalReferrals === 0
              ? "Start by searching for factories, hotels, hospitals, or schools in your city. These businesses have high electricity bills and are great solar candidates. Filter by 'Large' size for the best results."
              : "Look for businesses you haven't contacted yet. Use the contact status filter to find 'Not Contacted' prospects. Save promising ones and share your referral link.",
            reminder: "Skip businesses that are too small or already have solar panels visible on their roof.",
          },
          referrallink: {
            title: "Sharing your link",
            body: "Copy your referral link and share it on WhatsApp, SMS, or social media. When someone opens it, Agent Klaus will guide them through a free solar savings estimate. Your commission is tracked automatically.",
            reminder: "Every link click is tracked. Eligible commissions are credited at the subsidy and confirmed-installation milestones.",
          },
          status: {
            title: "Understanding referral statuses",
            body: "• Link Opened — customer clicked your link\n• Chatbot Started — they began talking to Agent Klaus\n• Bill Uploaded — they shared their electricity bill\n• Verified — their interest is confirmed\n• Callback Requested — they want a site visit\n• Converted — installation confirmed, commission earned",
            reminder: "If a customer is stuck at 'Chatbot Started', a gentle reminder often helps them complete it.",
          },
          submit: {
            title: "Submitting a lead manually",
            body: "Sharing your referral link is always preferred — it tracks attribution automatically. If a customer can't use the link, you can submit their basic details (name, phone, consent) manually. You do not need to calculate system size, savings, or subsidy.",
            reminder: "Always get the customer's consent before submitting their details.",
          },
        };

        return cards[input.screen] || cards.dashboard;
      } catch (err) {
        console.error("[ReferralCoach] getCoachCard error:", err);
        return null;
      }
    }),

  // ── Ask Referral Coach ─────────────────────────────────────────────────────
  askCoach: publicProcedure
    .input(z.object({
      token: z.string().min(20),
      question: z.string().min(1).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Load ONLY this associate's own data
      let ref: any = null;
      let myReferrals: any[] = [];
      let chatLink = "[your referral link]";

      try {
        ref = await requireCoachSession(db, input.token);

        myReferrals = rows(await db.execute(
          sql`SELECT id, customerName, status, createdAt, monthlyBill, state FROM referrals WHERE referrerId = ${ref.id} ORDER BY createdAt DESC LIMIT 20`
        ).catch(() => [[]]));

        const agencySlug = firstRow(await db.execute(
          sql`SELECT agencySlug FROM agencyConfig3 WHERE isActive = 1 LIMIT 1`
        ).catch(() => [[]]));

        if (agencySlug?.agencySlug) {
          chatLink = `${ENV.publicAppUrl}/chat/${agencySlug.agencySlug}?ref=${ref.uniqueCode}`;
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[ReferralCoach] askCoach data fetch error:", err);
      }

      if (!ref) throw new TRPCError({ code: "NOT_FOUND", message: "Associate not found" });

      const context = `
You are the AI Referral Coach for Sales Squad Leads. You are speaking to an associate named ${ref.name || "Associate"}.
Today is ${new Date().toLocaleDateString("en-IN")}.

ASSOCIATE PROFILE (only this associate's data — never reveal other associates' data):
- Name: ${ref.name || "Associate"}
- Joined: ${ref.createdAt ? new Date(ref.createdAt).toLocaleDateString("en-IN") : "unknown"}
- Total referrals: ${ref.totalReferrals || ref.total_referrals || 0}
- Total earnings: ₹${ref.totalEarnings || ref.total_earnings || 0}
- Quality score: ${ref.qualityScore || ref.quality_score || 0}%
- Daily streak: ${ref.dailyStreak || ref.daily_streak || 0} days
- Last active: ${ref.lastActiveDate || ref.last_active_date || "never"}
- Referral link: ${chatLink}

THEIR REFERRALS (last 20):
${JSON.stringify(myReferrals.map(r => ({
  id: r.id,
  customer: r.customerName || r.customer_name,
  status: r.status,
  bill: r.monthlyBill || r.monthly_bill,
  state: r.state,
})))}

BUSINESS SEARCH TOOL (Find Leads tab):
The app has a business search tool with these exact filters:
1. Business Type dropdown: Factory, Hotel, Hospital, School, Warehouse, Office, Mall, Cold Storage, Restaurant, Gym — pick based on which businesses have high electricity bills
2. City / Area text input: Enter any city or area (e.g. "Hyderabad" or "Uppal, Hyderabad") — pulls real businesses from Google Maps
3. State dropdown: Filter by state (default All States)
4. Size filter buttons: All / Large / Medium / Small — Large businesses have 3-phase connections and bills above ₹50,000/month
5. Solar Score (1-100): High (green) = best candidates, Medium (orange) = worth trying, Low (red) = skip
After results load: use WhatsApp button to share referral link, or AI Pitch button to generate a custom message for that business type.
Best strategy: start with Factory or Hotel in your city, filter Large, focus on High solar score businesses.

STRICT RULES:
- Only use the data above. Never invent data or reveal other associates' information.
- The associate's role is ONLY to share their referral link. They do NOT explain solar, calculate savings, quote prices, or promise subsidies.
- Agent Klaus (the chatbot) handles all product explanation and lead capture.
- Commission: ₹500 when an eligible subsidy application is verified, and ₹1,500 when installation is confirmed. Verification alone does not create a cash commission.
- If asked to generate a WhatsApp message, SMS, or social post — generate it and include their referral link.
- If asked about the business search tool — explain the specific filters (Business Type, City, Size, Solar Score) step by step.
- Keep responses concise and practical.
- Never suggest cold calling, spamming, or making technical promises.
`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: context },
          { role: "user", content: input.question },
        ],
      });

      const answer = response?.choices?.[0]?.message?.content || "I could not generate a response. Please try again.";
      return { answer };
    }),
});
