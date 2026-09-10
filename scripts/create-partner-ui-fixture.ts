import { createHash, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

const marker = "INTERNAL_PARTNER_UI_QA";
const suffix = randomBytes(5).toString("hex");
const token = `ui-qa-${suffix}`;
const email = `partner-ui-${suffix}@example.invalid`;
const password = "SyntheticUiPass!2026";

async function main() {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");
  await dbConn.execute(sql`
    INSERT INTO solarPartners (companyName, email, phone, serviceAreas, status, signupTokenHash, signupExpiresAt)
    VALUES (${`${marker}_${suffix}`}, ${email}, '0000000000', ${JSON.stringify(["QA State"])}, 'not_contacted', ${createHash("sha256").update(token).digest("hex")}, ${Date.now() + 60 * 60 * 1000})
  `);
  console.log(JSON.stringify({ marker, token, email, password, signupPath: `/partner-signup?token=${encodeURIComponent(token)}` }));
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
