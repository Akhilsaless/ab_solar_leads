import { sql } from "drizzle-orm";
import { istDayBounds } from "../shared/reportingTime";

function first(result: any) {
  return (Array.isArray(result?.[0]) ? result[0] : result?.rows ?? result)?.[0] ?? {};
}

export async function getOutreachOverview(database: { execute: (query: any) => Promise<any> }, agencyId: number, now = Date.now()) {
  const { start, end } = istDayBounds(now);
  const [runs, engagement] = await Promise.all([
    database.execute(sql`
      SELECT COUNT(*) AS totalRuns,
        COALESCE(SUM(scrapedCount), 0) AS totalScraped,
        COALESCE(SUM(eligibleCount), 0) AS totalEligible,
        COALESCE(SUM(emailSentCount), 0) AS totalEmailSent,
        COALESCE(SUM(whatsappSentCount), 0) AS totalWhatsappSent,
        COALESCE(SUM(errorCount), 0) AS totalErrors
      FROM outreachRuns WHERE agencyId = ${agencyId} AND startedAt >= ${start} AND startedAt < ${end}
    `),
    database.execute(sql`
      SELECT COUNT(*) AS businessesEmailed,
        COALESCE(SUM(emailOpenCount > 0), 0) AS businessesOpened,
        COALESCE(SUM(chatbotClickCount > 0), 0) AS businessesClicked,
        COALESCE(SUM(emailSentAt >= ${start} AND emailSentAt < ${end}), 0) AS businessesEmailedToday
      FROM scrapedBusinesses WHERE agencyId = ${agencyId} AND emailSentAt IS NOT NULL
    `),
  ]);
  return { ...first(runs), engagement: first(engagement) };
}
