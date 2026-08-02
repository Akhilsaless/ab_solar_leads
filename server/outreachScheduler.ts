import { sql } from "drizzle-orm";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { sendEmail } from "./_core/emailService";

/**
 * Automated Outreach Scheduler
 * Runs daily at configured time to send WhatsApp/Email to verified Telangana businesses
 * Includes: lead selection, message generation, verification, tracking
 */

interface OutreachConfig {
  id: number;
  agencyId: number;
  state: string;
  businessTypes: string[];
  minRating: number;
  contactsPerDay: number;
  scheduleTime: string;
  messageType: "generic" | "industry_specific";
  adminPhoneNumber?: string;
  targetingMode: "blind" | "owner_only"; // NEW: Toggle between targeting modes
  requireOwnerName: boolean; // NEW: Only send to businesses with identified owner
  requireOwnerContact: boolean; // NEW: Only send if we have owner's direct contact
}

interface ScrapedBusiness {
  id: number;
  businessName: string;
  businessType: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  website?: string;
  city: string;
  state: string;
  rating: number;
  businessSize: "small" | "medium" | "large";
  solarScore: number;
  contactStatus: string;
}

/**
 * Select high-quality leads for outreach
 * Prioritizes by: verification score, solar potential, rating, business size
 */
async function selectLeadsForOutreach(config: OutreachConfig, limit: number): Promise<ScrapedBusiness[]> {
  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("Database connection failed");

  // Build business type filter
  const businessTypeList = config.businessTypes.map((t) => `'${t}'`).join(",");

  // Select verified, high-quality leads
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
 * Generate personalized message for business
 */
function generateMessage(business: ScrapedBusiness, messageType: "generic" | "industry_specific"): string {
  const businessTypeMap: Record<string, string> = {
    textile_mills: "Textile mills typically spend ₹5-15 lakhs/month on electricity. Solar could save you 60-70%, that's ₹3-9 lakhs/month.",
    cold_storage: "Cold storage facilities are high-energy consumers. Solar could save 50-60%, that's ₹3-6 lakhs/month.",
    hospitals: "Hospitals can reduce energy costs by 40-50% with solar + backup power.",
    hotels_resorts: "Hotels can cut AC & lighting costs by 50-60% with solar, that's ₹2-6 lakhs/month saved.",
    factories: "Factories spend ₹3-12 lakhs/month on electricity. Solar could cut this by 60-70%.",
    shopping_malls: "Shopping malls can reduce energy costs by 40-50% with solar, that's ₹2-8 lakhs/month.",
    warehouses: "Warehouses can save 50-60% on electricity with solar, that's ₹1-5 lakhs/month.",
  };

  const benefit = (businessTypeMap as any)[business.businessType] || "Solar energy can significantly reduce your electricity costs.";

  if (messageType === "industry_specific") {
    return `Hi ${business.ownerName || "there"}, we help businesses like ${business.businessName} cut electricity bills with solar. ${benefit} Plus: Government subsidy up to ₹15 lakhs available. Interested in a free solar potential report?`;
  } else {
    return `Hi ${business.ownerName || "there"}, ${business.businessName} can significantly reduce electricity costs with solar energy. Government subsidy available. Interested in a free solar potential report?`;
  }
}

/**
 * Calculate lead score based on business attributes
 */
function calculateLeadScore(business: ScrapedBusiness, verificationScore: number): number {
  let score = 0;

  // Business type scoring
  const typeScores: Record<string, number> = {
    textile_mills: 40,
    cold_storage: 35,
    factories: 40,
    hospitals: 30,
    hotels_resorts: 25,
    shopping_malls: 20,
    warehouses: 30,
  };
  score += (typeScores as any)[business.businessType] || 15;

  // Size scoring
  const sizeScores: Record<string, number> = { large: 30, medium: 15, small: 5 };
  score += sizeScores[business.businessSize] || 0;

  // Rating scoring
  if (business.rating >= 4.5) score += 20;
  else if (business.rating >= 4.0) score += 15;
  else if (business.rating >= 3.5) score += 10;

  // Verification scoring
  score += Math.min(verificationScore / 2, 10); // Max 10 points from verification

  return Math.min(score, 100);
}

/**
 * Create outreach record and track message
 */
async function createOutreachRecord(
  configId: number,
  business: ScrapedBusiness,
  message: string,
  chatbotLink: string,
  leadScore: number,
  contactMethod: "whatsapp" | "email" | "both"
): Promise<number> {
  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("Database connection failed");

  const result = await dbConn.execute(sql`
    INSERT INTO outreachCampaignRecords 
    (configId, businessId, businessName, businessType, ownerName, phone, email, contactMethod, messageBody, chatbotLink, status, leadScore)
    VALUES (
      ${configId},
      ${business.id},
      ${business.businessName},
      ${business.businessType},
      ${business.ownerName || null},
      ${business.phone || null},
      ${business.email || null},
      ${contactMethod},
      ${message},
      ${chatbotLink},
      'queued',
      ${leadScore}
    )
  `);

  return (result as any).insertId;
}

/**
 * Update business contact status
 */
async function updateBusinessStatus(businessId: number, status: string): Promise<void> {
  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("Database connection failed");

  await dbConn.execute(sql`
    UPDATE scrapedBusinesses 
    SET contactStatus = ${status}
    WHERE id = ${businessId}
  `);
}

/**
 * Record daily analytics
 */
async function recordDailyAnalytics(configId: number, totalSent: number): Promise<void> {
  const dbConn = await db.getDb();
  if (!dbConn) throw new Error("Database connection failed");

  const today = new Date().toISOString().split("T")[0];

  await dbConn.execute(sql`
    INSERT INTO outreachAnalytics 
    (configId, date, totalSent, totalDelivered, totalOpened, totalReplied, totalInterested, responseRate, conversionRate, avgLeadScore)
    VALUES (${configId}, ${today}, ${totalSent}, 0, 0, 0, 0, 0, 0, 0)
    ON DUPLICATE KEY UPDATE totalSent = ${totalSent}
  `);
}

/**
 * Main scheduler function - called daily at configured time
 */
export async function runAutomatedOutreach(): Promise<void> {
  console.log("[Outreach Scheduler] Starting automated outreach...");

  try {
    const dbConn = await db.getDb();
    if (!dbConn) throw new Error("Database connection failed");

    // Get all active outreach configs
    const configs = await dbConn.execute(sql`
      SELECT * FROM automatedOutreachConfig WHERE isEnabled = true
    `) as any[];

    const configList = Array.isArray(configs[0]) ? configs[0] : configs;

    for (const config of configList) {
      console.log(`[Outreach Scheduler] Processing config: ${config.id} for state: ${config.state}`);

      try {
        // Select leads for outreach
        const leads = await selectLeadsForOutreach(config, config.contactsPerDay);
        console.log(`[Outreach Scheduler] Selected ${leads.length} leads for outreach`);

        let successCount = 0;

        for (const business of leads) {
          try {
            // Get verification score
            const verificationResult = await dbConn.execute(sql`
              SELECT verificationScore FROM dataVerificationLog WHERE businessId = ${business.id}
            `) as any[];

            const verificationScore = Array.isArray(verificationResult[0]) && verificationResult[0].length > 0
              ? (verificationResult[0][0] as any).verificationScore
              : 50;

            // Calculate lead score
            const leadScore = calculateLeadScore(business, verificationScore);

            // Generate message
            const message = generateMessage(business, config.messageType);

            // Generate chatbot link — must be absolute URL so email clients can open it
            const chatbotLink = `https://salessquadleads-xxxqwsn9.manus.space/chat/demo?ref=OUTREACH_${business.id}_${Date.now()}`;

            // Determine contact method
            let contactMethod: "whatsapp" | "email" | "both" = "email";
            if (business.phone && business.email) contactMethod = "both";
            else if (business.phone) contactMethod = "whatsapp";

            // Create outreach record
            const recordId = await createOutreachRecord(
              config.id,
              business,
              message,
              chatbotLink,
              leadScore,
              contactMethod
            );

            // Send email if applicable
            if (contactMethod === "email" || contactMethod === "both") {
              if (business.email) {
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

                  // Update record status
                  await dbConn.execute(sql`
                    UPDATE outreachCampaignRecords 
                    SET status = 'sent', sentAt = NOW()
                    WHERE id = ${recordId}
                  `);

                  successCount++;
                  console.log(`[Outreach Scheduler] Email sent to ${business.email}`);
                } catch (emailError) {
                  console.error(`[Outreach Scheduler] Error sending email to ${business.email}:`, emailError);
                  await dbConn.execute(sql`
                    UPDATE outreachCampaignRecords 
                    SET status = 'failed', errorMessage = 'Email send failed'
                    WHERE id = ${recordId}
                  `);
                }
              }
            }

            // Update business contact status
            await updateBusinessStatus(business.id, "contacted");
          } catch (businessError) {
            console.error(`[Outreach Scheduler] Error processing business ${business.id}:`, businessError);
          }
        }

        // Record daily analytics
        await recordDailyAnalytics(config.id, successCount);
        console.log(`[Outreach Scheduler] Completed: ${successCount}/${leads.length} messages sent`);
      } catch (configError) {
        console.error(`[Outreach Scheduler] Error processing config ${config.id}:`, configError);
      }
    }

    console.log("[Outreach Scheduler] Automated outreach completed successfully");
  } catch (error) {
    console.error("[Outreach Scheduler] Fatal error:", error);
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
    console.error("Scheduler error:", error);
    return { success: false, message: `Scheduler error: ${error}` };
  }
}
