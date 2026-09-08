/**
 * Admin Daily Digest Email Handler
 * Runs at 9 AM IST (3:30 AM UTC) daily via Heartbeat cron.
 * Sends a summary of yesterday's activity to the admin email.
 */
import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { sendEmail } from "./_core/emailService";
import { getAdminDigestStats } from "./db";
import { ENV } from "./_core/env";

function buildDigestHtml(stats: {
  newLeads: number;
  totalLeads: number;
  converted: number;
  activeReferrers: number;
  pendingPayouts: number;
  agency: any;
}): string {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const conversionRate = stats.totalLeads > 0 ? ((stats.converted / stats.totalLeads) * 100).toFixed(1) : "0";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Sales Squad Daily Digest</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f97316,#fb923c);padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">☀️ Sales Squad Daily Digest</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${today}</p>
    </div>

    <!-- Stats Grid -->
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 20px;color:#f1f5f9;font-size:16px;font-weight:600;">Yesterday's Activity</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:0 8px 16px 0;">
            <div style="background:#0f172a;border-radius:12px;padding:20px;border-left:4px solid #f97316;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">New Leads</p>
              <p style="margin:8px 0 0;color:#f97316;font-size:32px;font-weight:700;">${stats.newLeads}</p>
            </div>
          </td>
          <td width="50%" style="padding:0 0 16px 8px;">
            <div style="background:#0f172a;border-radius:12px;padding:20px;border-left:4px solid #22c55e;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Converted</p>
              <p style="margin:8px 0 0;color:#22c55e;font-size:32px;font-weight:700;">${stats.converted}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:0 8px 0 0;">
            <div style="background:#0f172a;border-radius:12px;padding:20px;border-left:4px solid #3b82f6;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Active Associates</p>
              <p style="margin:8px 0 0;color:#3b82f6;font-size:32px;font-weight:700;">${stats.activeReferrers}</p>
            </div>
          </td>
          <td width="50%" style="padding:0 0 0 8px;">
            <div style="background:#0f172a;border-radius:12px;padding:20px;border-left:4px solid #a855f7;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Conversion Rate</p>
              <p style="margin:8px 0 0;color:#a855f7;font-size:32px;font-weight:700;">${conversionRate}%</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- Summary Line -->
      <div style="margin:24px 0;background:#0f172a;border-radius:12px;padding:20px;">
        <p style="margin:0;color:#f1f5f9;font-size:14px;line-height:1.6;">
          📊 <strong>Total pipeline:</strong> ${stats.totalLeads} leads total &nbsp;|&nbsp; 
          ⏳ <strong>Pending payouts:</strong> ₹${stats.pendingPayouts.toLocaleString("en-IN")}
        </p>
      </div>

      ${stats.newLeads === 0 ? `
      <!-- Nudge if no new leads -->
      <div style="background:#1a1a2e;border:1px solid #f97316;border-radius:12px;padding:20px;margin-top:8px;">
        <p style="margin:0;color:#f97316;font-size:14px;font-weight:600;">💡 No new leads yesterday</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Consider sharing the referral link with your associates or running a new outreach campaign today.</p>
      </div>` : ""}

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0 8px;">
        <a href="${ENV.publicAppUrl}"
           style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px;">
          Open Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#0f172a;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">Sales Squad Leads · Daily digest sent at 9 AM IST · You are the admin</p>
    </div>
  </div>
</body></html>`;
}

export async function adminDigestHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const stats = await getAdminDigestStats();
    if (!stats) {
      return res.json({ ok: true, skipped: "no-stats" });
    }

    // Send to admin email (from agency config or EMAIL_USER fallback)
    const adminEmail = (stats.agency as any)?.email || process.env.EMAIL_USER;
    if (!adminEmail) {
      return res.json({ ok: true, skipped: "no-admin-email" });
    }

    const html = buildDigestHtml(stats);
    const today = new Date().toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
    const result = await sendEmail({
      to: adminEmail,
      subject: `☀️ Sales Squad Daily Digest — ${stats.newLeads} new leads · ${today}`,
      html,
    });

    return res.json({
      ok: true,
      sent: result.success,
      to: adminEmail,
      newLeads: stats.newLeads,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[AdminDigest] Handler error:", err);
    return res.status(500).json({
      error: err?.message || "Unknown error",
      stack: err?.stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
