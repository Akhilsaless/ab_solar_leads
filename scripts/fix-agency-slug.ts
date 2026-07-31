import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { agencyConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // Check current agency
  const current = await db.select().from(agencyConfig).limit(5);
  console.log("Current agencies:", JSON.stringify(current.map(a => ({ id: a.id, name: a.agencyName, slug: a.agencySlug })), null, 2));

  // Update ab-solar slug to sales-squad
  const result = await db
    .update(agencyConfig)
    .set({ agencySlug: "sales-squad" })
    .where(eq(agencyConfig.agencySlug, "ab-solar"));
  console.log("Updated ab-solar → sales-squad");

  // Also fix any agencies named "AB Solar" → "Sales Squad"
  await db
    .update(agencyConfig)
    .set({ agencyName: "Sales Squad" })
    .where(eq(agencyConfig.agencyName, "AB Solar"));
  console.log("Updated AB Solar name → Sales Squad");

  // Show final state
  const final = await db.select().from(agencyConfig).limit(5);
  console.log("Final agencies:", JSON.stringify(final.map(a => ({ id: a.id, name: a.agencyName, slug: a.agencySlug })), null, 2));

  await connection.end();
}

main().catch(console.error);
