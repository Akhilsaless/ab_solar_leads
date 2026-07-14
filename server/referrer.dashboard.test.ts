import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

// Helper to extract rows from mysql2 execute result
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
  // drizzle mysql2: INSERT returns [ResultSetHeader, null], result[0].insertId is the new ID
  if (Array.isArray(result)) return (result[0] as any)?.insertId || 0;
  return (result as any)?.insertId || 0;
}

const TEST_CODE = "TEST_DASH_VITEST";
const TEST_EMAIL = "vitest_dashboard@test.com";

describe("Referrer Dashboard Backend", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let referrerId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("No DB");
    // Clean up any leftover test data
    await db.execute(sql`DELETE FROM referrers WHERE uniqueCode = ${TEST_CODE}`);
  });

  afterAll(async () => {
    if (!db) return;
    await db.execute(sql`DELETE FROM referralTasks WHERE referrerId = ${referrerId}`);
    await db.execute(sql`DELETE FROM referrers WHERE uniqueCode = ${TEST_CODE}`);
  });

  it("should insert a referrer and retrieve correct id", async () => {
    const ins = await db!.execute(
      sql`INSERT INTO referrers (uniqueCode, name, email, totalEarnings, totalReferrals, status) 
          VALUES (${TEST_CODE}, 'Test Referrer', ${TEST_EMAIL}, 500, 2, 'active')`
    );
    referrerId = insertId(ins);
    expect(referrerId).toBeGreaterThan(0);
  });

  it("should look up referrer by uniqueCode and get correct id", async () => {
    const result = await db!.execute(
      sql`SELECT * FROM referrers WHERE uniqueCode = ${TEST_CODE}`
    );
    const ref = firstRow(result);
    expect(ref).not.toBeNull();
    expect(ref.id).toBe(referrerId);
    expect(ref.name).toBe("Test Referrer");
    expect(ref.uniqueCode).toBe(TEST_CODE);
  });

  it("should query referrals by referrerId without SQL error", async () => {
    const result = await db!.execute(
      sql`SELECT * FROM referrals WHERE referrerId = ${referrerId} ORDER BY createdAt DESC`
    );
    const referralRows = rows(result);
    expect(Array.isArray(referralRows)).toBe(true);
    // No referrals for this test referrer, should be empty array
    expect(referralRows.length).toBe(0);
  });

  it("should query referralTasks by referrerId without SQL error", async () => {
    // Insert a task first
    await db!.execute(
      sql`INSERT INTO referralTasks (referrerId, taskNumber, targetReferrals, bonusPerReferral) 
          VALUES (${referrerId}, 1, 5, 20)`
    );
    const result = await db!.execute(
      sql`SELECT * FROM referralTasks WHERE referrerId = ${referrerId} ORDER BY taskNumber ASC`
    );
    const taskRows = rows(result);
    expect(Array.isArray(taskRows)).toBe(true);
    expect(taskRows.length).toBe(1);
    expect(taskRows[0].taskNumber).toBe(1);
    expect(taskRows[0].targetReferrals).toBe(5);
  });

  it("should query withdrawals by referrerId without SQL error", async () => {
    const result = await db!.execute(
      sql`SELECT * FROM withdrawals WHERE referrerId = ${referrerId} ORDER BY createdAt DESC`
    );
    const withdrawalRows = rows(result);
    expect(Array.isArray(withdrawalRows)).toBe(true);
    expect(withdrawalRows.length).toBe(0);
  });

  it("should return null for non-existent uniqueCode", async () => {
    const result = await db!.execute(
      sql`SELECT * FROM referrers WHERE uniqueCode = ${"NONEXISTENT_CODE_XYZ"}`
    );
    const ref = firstRow(result);
    expect(ref).toBeNull();
  });
});
