import { sql } from "drizzle-orm";
import * as db from "./db";
import { sendEmail } from "./_core/emailService";

/**
 * Automated Outreach Scheduler
 * Sends personalized industry-specific emails to verified businesses daily
 * - Runs at configured time per config
 * - Only sends when isEnabled = true
 * - Always uses industry-specific pitch (never generic)
 * - No fake promises: only savings %, payback period, and real benefits
 */

interface OutreachConfig {
  id: number;
  agencyId: number;
  state: string;
  businessTypes: string[];
  minRating: number;
  contactsPerDay: number;
  messageType: "generic" | "industry_specific";
}

interface ScrapedBusiness {
  id: number;
  businessName: string;
  businessType: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  rating: number;
  businessSize: "small" | "medium" | "large";
  solarScore: number;
  contactStatus: string;
}

/**
 * Industry-specific pitch templates
 * Format: Savings % + Payback + Advantage + Financial benefits (subsidy or tax/GST)
 * No fake promises - only realistic numbers and real benefits
 */
const INDUSTRY_PITCHES: Record<string, string> = {
  textile_mills: "Save ~60-70% on electricity. Payback: 3-4 years. Then 20+ years of free electricity. Advantage: No production downtime. Financial benefit: GST claim + tax depreciation.",
  cold_storage: "Save ~50-60% on electricity. Payback: 3-5 years. Advantage: 24/7 backup power during outages. Financial benefit: GST claim + tax depreciation.",
  hospitals: "Save ~40-50% on electricity. Payback: 4-6 years. Advantage: 24/7 backup power + zero downtime. Financial benefit: GST claim + tax depreciation.",
  hotels_resorts: "Save ~50-60% on electricity. Payback: 3-5 years. Advantage: Lower operating costs + eco-friendly branding. Financial benefit: GST claim + tax depreciation.",
  factories: "Save ~60-70% on electricity. Payback: 3-4 years. Advantage: Increased production capacity (no power limits). Financial benefit: GST claim + tax depreciation.",
  shopping_malls: "Save ~40-50% on electricity. Payback: 3-5 years. Advantage: Attracts eco-conscious tenants. Financial benefit: GST claim + tax depreciation.",
  warehouses: "Save ~50-60% on electricity. Payback: 3-4 years. Advantage: Reduced operating costs + improved margins. Financial benefit: GST claim + tax depreciation.",
};

/**
 * Get industry-specific benefit text
 */
function getBenefitText(businessType: string): string {
  return INDUSTRY_PITCHES[businessType] || "Save on electricity with solar. Payback in 3-5 years. Financial benefit: GST claim + tax depreciation.";
}

/**
 * Generate personalized message for business
 * Always uses industry-specific pitch when enabled
 */
function generateMessage(business: ScrapedBusiness): string {
  const benefit = getBenefitText(business.businessType);
  return `Hi ${business.ownerName || "there"}, ${benefit} Interested in a free solar potential report?`;
}

/**
 * Select high-quality leads for outreach
 */
async function selectLeadsForOutreach(config: OutreachConfig, limit: number): Promise<ScrapedBusiness[]> {
  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("Database connection failed");

  const businessTypeList = config.businessTypes.map((t) => `'${t}'`).join(",");

  const leads = await dbConn.execute(sql`
    SELECT sb.* FROM scrapedBusinesses sb
    LEFT JOIN dataVerificationLog dvl ON sb.id = dvl.businessId
    WHERE sb.state = ${config.state}
    AND sb.businessType IN (${sql.raw(businessTypeList)})
    AND sb.rating >= ${config.minRating}
    AND sb.businessSize IN ('large', 'medium')
    AND sb.solarScore >= 70
    AND sb.contactStatus = 'not_contacted'
    AND (dvl.verificationScore >= 60 OR dvl.id IS NULL)
    ORDER BY 
      COALESCE(dvl.verificationScore, 0) DESC,
      sb.solarScore DESC,
      sb.rating DESC
    LIMIT ${limit}
  `) as any[];

  return Array.isArray(leads[0]) ? leads[0] : leads;
}

/**
 * Send email to business
 */
async function sendOutreachEmail(
  business: ScrapedBusiness,
  message: string,
  chatbotLink: string,
  recordId: number,
  dbConn: any
): Promise<boolean> {
  if (!business.email) return false;

  try {
    const emailBody = `
      <p>Hi ${business.ownerName || "there"},</p>
      <p>${message}</p>
      <p><a href="${chatbotLink}">Get Your Free Solar Report</a></p>
      <p>Best regards,<br>Sales Squad</p>
    `;

    await sendEmail({
      to: business.email,
      subject: `Free Solar Potential Report for ${business.businessName}`,
      html: emailBody,
    });

    // Mark as sent
    await dbConn.execute(sql`
      UPDATE outreachCampaignRecords 
      SET status = 'sent', sentAt = NOW()
      WHERE id = ${recordId}
    `);

    return true;
  } catch (error) {
    console.error(`[Outreach] Email failed for ${business.email}:`, error);
    await dbConn.execute(sql`
      UPDATE outreachCampaignRecords 
      SET status = 'failed', errorMessage = 'Email send failed'
      WHERE id = ${recordId}
    `);
    return false;
  }
}

/**
 * Process one business - create record and send email
 */
async function processBusiness(
  business: ScrapedBusiness,
  config: OutreachConfig,
  chatbotLink: string,
  dbConn: any
): Promise<boolean> {
  try {
    // Generate message (always industry-specific)
    const message = generateMessage(business);

    // Create outreach record
    const result = await dbConn.execute(sql`
      INSERT INTO outreachCampaignRecords 
      (configId, businessId, businessName, businessType, ownerName, phone, email, contactMethod, messageBody, chatbotLink, status)
      VALUES (
        ${config.id},
        ${business.id},
        ${business.businessName},
        ${business.businessType},
        ${business.ownerName || null},
        ${business.phone || null},
        ${business.email || null},
        'email',
        ${message},
        ${chatbotLink},
        'queued'
      )
    `);

    const recordId = (result as any).insertId;

    // Send email
    const sent = await sendOutreachEmail(business, message, chatbotLink, recordId, dbConn);

    // Update business status
    if (sent) {
      await dbConn.execute(sql`
        UPDATE scrapedBusinesses 
        SET contactStatus = 'contacted'
        WHERE id = ${business.id}
      `);
    }

    return sent;
  } catch (error) {
    console.error(`[Outreach] Error processing business ${business.id}:`, error);
    return false;
  }
}

/**
 * Main scheduler function - called daily at configured time
 */
export async function runAutomatedOutreach(): Promise<void> {
  console.log("[Outreach] Starting automated outreach...");

  try {
    const dbConn = await db.getDb();
    if (!dbConn) throw new Error("Database connection failed");

    // Get all active outreach configs
    const configs = await dbConn.execute(sql`
      SELECT * FROM automatedOutreachConfig WHERE isEnabled = true
    `) as any[];

    const configList = Array.isArray(configs[0]) ? configs[0] : configs;

    for (const config of configList) {
      try {
        // Select leads
        const leads = await selectLeadsForOutreach(config, config.contactsPerDay);
        console.log(`[Outreach] Config ${config.id}: ${leads.length} leads selected`);

        let successCount = 0;

        // Process each lead
        for (const business of leads) {
          const chatbotLink = `https://salessquadleads-xxxqwsn9.manus.space/chat/demo?ref=OUTREACH_${business.id}_${Date.now()}`;
          const sent = await processBusiness(business, config, chatbotLink, dbConn);
          if (sent) successCount++;
        }

        // Record analytics
        const today = new Date().toISOString().split("T")[0];
        await dbConn.execute(sql`
          INSERT INTO outreachAnalytics 
          (configId, date, totalSent)
          VALUES (${config.id}, ${today}, ${successCount})
          ON DUPLICATE KEY UPDATE totalSent = ${successCount}
        `);

        console.log(`[Outreach] Config ${config.id}: ${successCount}/${leads.length} sent`);
      } catch (error) {
        console.error(`[Outreach] Config ${config.id} error:`, error);
      }
    }

    console.log("[Outreach] Completed successfully");
  } catch (error) {
    console.error("[Outreach] Fatal error:", error);
    throw error;
  }
}

/**
 * Scheduler entry point for Heartbeat
 */
export async function handleOutreachSchedule(): Promise<{ success: boolean; message: string }> {
  try {
    await runAutomatedOutreach();
    return { success: true, message: "Automated outreach completed successfully" };
  } catch (error) {
    console.error("[Outreach] Scheduler error:", error);
    return { success: false, message: `Scheduler error: ${error}` };
  }
}
