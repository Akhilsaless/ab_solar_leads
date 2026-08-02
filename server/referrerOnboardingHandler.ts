/**
 * Referrer Onboarding Email Sequence Handler
 * Runs daily via Heartbeat cron. Sends onboarding emails to new referrers:
 * - Day 1: "How to share your link — 3 tips"
 * - Day 3: "Find your first lead with this tool"
 * - Day 7: "Your first week summary"
 * (Day 0 welcome email is sent immediately on signup in referrer.ts)
 */
import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { sendEmail } from "./_core/emailService";
import { getReferrersForOnboarding, markOnboardingEmailSent } from "./db";

const APP_URL = "https://salessquadleads-xxxqwsn9.manus.space";

function buildDay1Html(ref: { name: string; uniqueCode: string }): string {
  const referralLink = `${APP_URL}/chat/demo?ref=${ref.uniqueCode}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>3 Tips to Get Your First Lead</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
    <div style="background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">☀️ Sales Squad</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your Day 1 Tip Sheet</p>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 8px;">Hi ${ref.name}! 3 tips to get your first lead 🚀</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">You joined yesterday — here's how to start earning fast.</p>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid #f97316;">
        <p style="margin:0;color:#f97316;font-weight:700;font-size:14px;">Tip 1 — Share with business owners you know</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">Think of shops, offices, factories, or hotels near you. Send them your link on WhatsApp. Say: "Check this free solar calculator — it shows exactly how much you can save."</p>
      </div>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid #22c55e;">
        <p style="margin:0;color:#22c55e;font-weight:700;font-size:14px;">Tip 2 — Post in local WhatsApp groups</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">Apartment groups, business groups, colony groups — share your link with a short message about saving up to 80% on electricity bills.</p>
      </div>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #3b82f6;">
        <p style="margin:0;color:#3b82f6;font-weight:700;font-size:14px;">Tip 3 — Use the Find Leads tool in your dashboard</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">Log in to your dashboard and use "Find Leads" to search for businesses in your city. Filter by type and size — then send them your referral link directly.</p>
      </div>

      <div style="background:#0f172a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#f1f5f9;font-size:13px;">Your referral link:</p>
        <p style="margin:6px 0 0;color:#f97316;font-size:13px;word-break:break-all;">${referralLink}</p>
      </div>

      <div style="text-align:center;">
        <a href="${APP_URL}/referrer/dashboard" style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px;">Open My Dashboard →</a>
      </div>
    </div>
    <div style="background:#0f172a;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">Sales Squad Referral Program · Day 1 Onboarding</p>
    </div>
  </div>
</body></html>`;
}

function buildDay3Html(ref: { name: string; uniqueCode: string }): string {
  const referralLink = `${APP_URL}/chat/demo?ref=${ref.uniqueCode}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Find Your First Lead Today</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
    <div style="background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">☀️ Sales Squad</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Day 3 — Find Leads Like a Pro</p>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 8px;">Hi ${ref.name}! Here's how to find high-quality leads 🎯</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">You've been with us 3 days. Let's get you your first verified lead.</p>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#f1f5f9;font-weight:600;font-size:14px;">5-Step Guide to Finding Leads:</p>
        <ol style="margin:0;padding-left:20px;color:#94a3b8;font-size:13px;line-height:2;">
          <li>Log in → Go to <strong style="color:#f97316;">Find Leads</strong> tab</li>
          <li>Select a <strong style="color:#f97316;">Business Type</strong> (try Hotels, Factories, or Offices)</li>
          <li>Enter your <strong style="color:#f97316;">City</strong> (e.g. Hyderabad)</li>
          <li>Look for businesses with <strong style="color:#f97316;">Solar Score 70+</strong> (green badge)</li>
          <li>Click <strong style="color:#f97316;">WhatsApp</strong> to send your referral link directly</li>
        </ol>
      </div>

      <div style="background:#0f172a;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #f97316;">
        <p style="margin:0;color:#f97316;font-weight:600;font-size:13px;">💰 Remember: You earn ₹20 per verified lead + ₹2,000 when solar is installed!</p>
      </div>

      <div style="text-align:center;">
        <a href="${APP_URL}/referrer/dashboard" style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px;">Find Leads Now →</a>
      </div>
    </div>
    <div style="background:#0f172a;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">Sales Squad Referral Program · Day 3 Onboarding · Your link: ${referralLink}</p>
    </div>
  </div>
</body></html>`;
}

function buildDay7Html(ref: { name: string; uniqueCode: string }): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Your First Week Summary</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
    <div style="background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">☀️ Sales Squad</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your First Week — Keep Going! 🎉</p>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 8px;">Hi ${ref.name}! You've completed your first week 🌟</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">Here's a quick reminder of what you can earn and what to focus on next.</p>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:16px;">
        <p style="margin:0 0 12px;color:#f1f5f9;font-weight:600;font-size:14px;">Your Earning Potential:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Per verified lead shared</td>
            <td style="padding:8px 0;color:#22c55e;font-weight:700;font-size:14px;text-align:right;">₹20</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">When solar is installed</td>
            <td style="padding:8px 0;color:#22c55e;font-weight:700;font-size:14px;text-align:right;">₹2,000</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">5 leads in a week (milestone bonus)</td>
            <td style="padding:8px 0;color:#f97316;font-weight:700;font-size:14px;text-align:right;">₹100 extra</td>
          </tr>
        </table>
      </div>

      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #22c55e;">
        <p style="margin:0;color:#22c55e;font-weight:700;font-size:14px;">Top associates earn ₹5,000–₹15,000/month</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">They share 5–10 links per day using the Find Leads tool. Consistency is the key — even 2 hours a day can build a strong pipeline.</p>
      </div>

      <div style="text-align:center;">
        <a href="${APP_URL}/referrer/dashboard" style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px;">Check My Dashboard →</a>
      </div>
    </div>
    <div style="background:#0f172a;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">Sales Squad Referral Program · Week 1 Complete</p>
    </div>
  </div>
</body></html>`;
}

export async function referrerOnboardingHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    let sentDay1 = 0, sentDay3 = 0, sentDay7 = 0, errors = 0;

    // Day 1 emails (referrers who signed up ~1 day ago)
    try {
      const day1Refs = await getReferrersForOnboarding(1, "onboardDay1Sent");
      for (const ref of day1Refs) {
        try {
          if (!ref.email) { errors++; continue; }
          const html = buildDay1Html(ref);
          const result = await sendEmail({
            to: ref.email,
            subject: `${ref.name}, 3 tips to get your first lead today ☀️`,
            html,
          });
          if (result.success) {
            await markOnboardingEmailSent(ref.id, "onboardDay1Sent");
            sentDay1++;
          } else { errors++; }
        } catch (e) { errors++; console.error("[Onboarding] Day1 error:", e); }
      }
    } catch (e) { console.error("[Onboarding] Day1 fetch error:", e); }

    // Day 3 emails
    try {
      const day3Refs = await getReferrersForOnboarding(3, "onboardDay3Sent");
      for (const ref of day3Refs) {
        try {
          if (!ref.email) { errors++; continue; }
          const html = buildDay3Html(ref);
          const result = await sendEmail({
            to: ref.email,
            subject: `Find your first lead today — step-by-step guide 🎯`,
            html,
          });
          if (result.success) {
            await markOnboardingEmailSent(ref.id, "onboardDay3Sent");
            sentDay3++;
          } else { errors++; }
        } catch (e) { errors++; console.error("[Onboarding] Day3 error:", e); }
      }
    } catch (e) { console.error("[Onboarding] Day3 fetch error:", e); }

    // Day 7 emails
    try {
      const day7Refs = await getReferrersForOnboarding(7, "onboardDay7Sent");
      for (const ref of day7Refs) {
        try {
          if (!ref.email) { errors++; continue; }
          const html = buildDay7Html(ref);
          const result = await sendEmail({
            to: ref.email,
            subject: `${ref.name}, your first week summary + earning potential 🌟`,
            html,
          });
          if (result.success) {
            await markOnboardingEmailSent(ref.id, "onboardDay7Sent");
            sentDay7++;
          } else { errors++; }
        } catch (e) { errors++; console.error("[Onboarding] Day7 error:", e); }
      }
    } catch (e) { console.error("[Onboarding] Day7 fetch error:", e); }

    return res.json({
      ok: true,
      sentDay1, sentDay3, sentDay7, errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Onboarding] Handler error:", err);
    return res.status(500).json({
      error: err?.message || "Unknown error",
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
