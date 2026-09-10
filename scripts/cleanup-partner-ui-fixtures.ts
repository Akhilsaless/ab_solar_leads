import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const marker = "INTERNAL_PARTNER_UI_QA";
const rows = (result: any): any[] => Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : [];

async function main() {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");
  const partners = rows(await dbConn.execute(sql`SELECT id FROM solarPartners WHERE companyName LIKE ${`${marker}%`}`));
  const partnerIds = partners.map((item: any) => Number(item.id));
  if (!partnerIds.length) { console.log(JSON.stringify({ removed: 0 })); return; }
  const mappings = rows(await dbConn.execute(sql`SELECT agencyId FROM partnerAgencyOnboarding WHERE partnerId IN (${sql.join(partnerIds.map((id) => sql`${id}`), sql`, `)})`));
  const agencyIds = mappings.map((item: any) => Number(item.agencyId)).filter(Boolean);
  if (agencyIds.length) {
    const ids = sql.join(agencyIds.map((id) => sql`${id}`), sql`, `);
    await dbConn.execute(sql`DELETE FROM chatMsgs3 WHERE conversationId IN (SELECT id FROM conversations3 WHERE agencyId IN (${ids}))`);
    await dbConn.execute(sql`DELETE FROM conversations3 WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyConfigurationAudit WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyFeatureControls WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyStateEstimateInputs WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyEstimateSettings WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM panelProducts3 WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM inverterProducts3 WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM partnerAgencyOnboarding WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyConfig3 WHERE id IN (${ids})`);
  }
  await dbConn.execute(sql`DELETE FROM solarPartners WHERE id IN (${sql.join(partnerIds.map((id) => sql`${id}`), sql`, `)})`);
  console.log(JSON.stringify({ removed: partnerIds.length }));
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
