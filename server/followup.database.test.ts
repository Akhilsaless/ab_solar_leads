import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
const state = vi.hoisted(() => ({ db: null as any }));
vi.mock("./db", () => ({
  getDb: async () => state.db,
  getAgencyByUserId: vi.fn(),
}));
vi.mock("./_core/env", () => ({
  ENV: { cookieSecret: "synthetic-followup-test-encryption" },
}));
import { encryptGatewayCredential } from "./aiGateway";
import { reserve, settle, rows } from "./followup/store";
import { configSchema } from "./followup/policy";
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("follow-up wallet on isolated MySQL", () => {
  let pool: ReturnType<typeof createPool>;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (
      url.pathname !== "/solar_test" ||
      !["127.0.0.1", "localhost"].includes(url.hostname)
    )
      throw new Error("Disposable local solar_test database required");
    pool = createPool({
      uri: url.toString(),
      multipleStatements: true,
      connectionLimit: 10,
    });
    state.db = drizzle(pool);
    await pool.query(
      readFileSync(
        new URL(
          "../drizzle/migrations/0020_followup_addon.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    const config = encryptGatewayCredential(
      JSON.stringify(
        configSchema.parse({ maxCallSeconds: 60, callRatePaise: 100 })
      )
    );
    await pool.execute(
      "INSERT INTO followupAccounts (agencyId, enabled, encryptedConfig, balancePaise, monthlyLimitPaise) VALUES (901, TRUE, ?, 1000, 100), (902, TRUE, ?, 1000, 1000)",
      [config, config]
    );
    for (const [id, agency] of [
      [1, 901],
      [2, 901],
      [3, 902],
      [4, 902],
    ])
      await pool.execute(
        "INSERT INTO followupJobs (id, agencyId, leadId, kind, dedupeKey, payload) VALUES (?, ?, 1, 'call', ?, '{}')",
        [id, agency, String(id).padStart(64, "0")]
      );
  });
  afterAll(async () => {
    if (pool) {
      await pool.query(
        "DROP TABLE followupLedger, followupJobs, followupAccounts, followupIntake, followupMetaInbox, solarBillUploadReceipts"
      );
      await pool.end();
    }
  });
  it("claims one paid attempt once under simultaneous worker requests", async () => {
    const attempts = await Promise.all([
      reserve(state.db, 1),
      reserve(state.db, 1),
    ]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    const [ledger]: any = await pool.query(
      "SELECT * FROM followupLedger WHERE eventKey = 'reserve:1'"
    );
    expect(ledger).toHaveLength(1);
  });
  it("blocks spending beyond the monthly reserved total", async () => {
    expect(await reserve(state.db, 2)).toBeNull();
    const [jobs]: any = await pool.query(
      "SELECT status FROM followupJobs WHERE id = 2"
    );
    expect(jobs[0].status).toBe("budget_blocked");
  });
  it("refunds once when duplicate settlement callbacks race", async () => {
    await reserve(state.db, 3);
    await Promise.all([
      settle(state.db, 3, 0, "completed", {}),
      settle(state.db, 3, 0, "completed", {}),
    ]);
    const [accounts]: any = await pool.query(
      "SELECT balancePaise FROM followupAccounts WHERE agencyId = 902"
    );
    expect(Number(accounts[0].balancePaise)).toBe(1000);
    const [ledger]: any = await pool.query(
      "SELECT * FROM followupLedger WHERE eventKey = 'settle:3'"
    );
    expect(ledger).toHaveLength(1);
  });
  it("pauses the account if provider usage exceeds the configured reservation", async () => {
    await reserve(state.db, 4);
    await settle(state.db, 4, 200, "completed", {});
    const a = rows(
      await state.db.execute(
        sql`SELECT * FROM followupAccounts WHERE agencyId = 902`
      )
    )[0];
    expect(Boolean(a.enabled)).toBe(false);
    expect(Number(a.balancePaise)).toBe(800);
  });
});
