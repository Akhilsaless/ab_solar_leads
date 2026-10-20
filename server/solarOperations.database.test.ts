import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

const state = vi.hoisted(() => ({ db: null as any }));
vi.mock("./db", () => ({ getDb: async () => state.db }));
vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: "synthetic-owner", publicAppUrl: "https://test.invalid" },
}));
import { captureConsentedChatLead } from "./chatCapture";
import { solarOperationsRouter } from "./solarOperations";

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("solar operations against isolated MySQL", () => {
  let pool: ReturnType<typeof createPool>;
  const token = "synthetic-partner-token-at-least-20",
    otherToken = "synthetic-other-partner-token-20";
  const ctx = { user: null, req: {} as any, res: {} as any };
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      target.pathname !== "/solar_test" ||
      !["localhost", "127.0.0.1"].includes(target.hostname)
    )
      throw new Error(
        "Integration tests require a local, disposable solar_test database."
      );
    pool = createPool({
      uri: url!,
      multipleStatements: true,
      connectionLimit: 8,
      timezone: "Z",
    });
    state.db = drizzle(pool);
    await pool.query(`
      CREATE TABLE solarPartners (id int PRIMARY KEY, companyName varchar(255), email varchar(255), phone varchar(30), whatsappNumber varchar(30), serviceAreas json, loginTokenHash char(64), loginExpiresAt bigint);
      CREATE TABLE conversations3 (id int PRIMARY KEY, agencyId int NOT NULL, sessionId varchar(128) UNIQUE, customerEmail varchar(255));
      CREATE TABLE partnerAgencyOnboarding (partnerId int PRIMARY KEY, agencyId int);
      CREATE TABLE leads2 (id int AUTO_INCREMENT PRIMARY KEY, agencyId int, sourceAgencyId int, assignedAgencyId int, assignmentStatus varchar(30), assignedBy int, assignedAt timestamp NULL, firstName varchar(100), lastName varchar(100), phone varchar(30), email varchar(255), city varchar(100), state varchar(100), zipCode varchar(10), monthlyEnergyBill decimal(10,2), source varchar(50), conversationId int, status varchar(30), priority varchar(30), leadScore int, referrerCode varchar(100), assignedPartnerId int, createdAt timestamp DEFAULT CURRENT_TIMESTAMP);
    `);
    for (const file of [
      "0017_partner_sales_operations.sql",
      "0018_agency_whatsapp.sql",
      "0019_solar_proposals.sql",
    ])
      await pool.query(
        readFileSync(
          new URL(`../drizzle/migrations/${file}`, import.meta.url),
          "utf8"
        )
      );
    const sha = (v: string) => createHash("sha256").update(v).digest("hex");
    await pool.execute(
      "INSERT INTO solarPartners (id, companyName, loginTokenHash, loginExpiresAt) VALUES (1, 'Synthetic Installer', ?, ?), (2, 'Other Installer', ?, ?)",
      [sha(token), Date.now() + 3600000, sha(otherToken), Date.now() + 3600000]
    );
  }, 30000);
  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("serializes concurrent capture retries into a single unassigned lead", async () => {
    const conversation = {
      id: 1,
      sessionId: "synthetic-customer-session-0001",
      agencyId: 9,
    };
    await pool.execute(
      "INSERT INTO conversations3 (id, agencyId, sessionId) VALUES (1, 9, ?)",
      [conversation.sessionId]
    );
    const facts = {
      name: "Synthetic Customer",
      phone: "9876543210",
      city: "Hyderabad",
      state: "Telangana",
      monthlyBill: 3000,
    };
    const history = [
      {
        role: "customer",
        content: "I agree to be contacted about this solar request",
      },
    ];
    const ids = await Promise.all(
      Array.from({ length: 4 }, () =>
        captureConsentedChatLead(state.db, conversation, facts, history)
      )
    );
    expect(new Set(ids).size).toBe(1);
    const [result]: any = await pool.query(
      "SELECT assignedPartnerId, assignedAgencyId, assignmentStatus FROM leads2"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      assignedPartnerId: null,
      assignedAgencyId: null,
      assignmentStatus: "UNASSIGNED",
    });
  });
  it("does not capture without affirmative consent", async () => {
    const id = await captureConsentedChatLead(
      state.db,
      { id: 2, sessionId: "synthetic-customer-session-0002", agencyId: 9 },
      { name: "No Consent", phone: "9876543211" },
      [{ role: "customer", content: "Do not contact me" }]
    );
    expect(id).toBeNull();
    const [result]: any = await pool.query(
      "SELECT id FROM leads2 WHERE phone = '+919876543211'"
    );
    expect(result).toHaveLength(0);
  });
  it("blocks cross-partner milestone changes", async () => {
    await pool.query(
      "UPDATE leads2 SET assignedPartnerId = 1 WHERE id = 1; UPDATE solarLeadWorkflow SET partnerId = 1, stage = 'assigned' WHERE leadId = 1"
    );
    const caller = solarOperationsRouter.createCaller(ctx);
    await expect(
      caller.advance({
        token: otherToken,
        leadId: 1,
        version: 0,
        stage: "accepted",
        note: "Unauthorized attempt",
      })
    ).rejects.toThrow("Assigned workflow not found");
    await expect(
      caller.advance({
        token,
        leadId: 1,
        version: 0,
        stage: "accepted",
        note: "Installer accepted",
      })
    ).resolves.toEqual({ success: true });
  });
  it("does not reveal installer or appointment details before phone verification", async () => {
    const caller = solarOperationsRouter.createCaller(ctx);
    const progress = await caller.customerProgress({
      sessionId: "synthetic-customer-session-0001",
    });
    expect(progress.captured).toBe(true);
    expect(progress.phoneVerified).toBe(false);
    expect(progress.partnerName).toBeNull();
    expect(progress.booking).toBeNull();
    expect(progress.slots).toEqual([]);
  });
  it("does not let an unverified new session overwrite a matching customer's lead", async () => {
    const conversation = {
      id: 3,
      sessionId: "synthetic-customer-session-0003",
      agencyId: 9,
    };
    await pool.execute(
      "INSERT INTO conversations3 (id, agencyId, sessionId) VALUES (3, 9, ?)",
      [conversation.sessionId]
    );
    await captureConsentedChatLead(
      state.db,
      conversation,
      { name: "Different Visitor", phone: "9876543210", city: "Mumbai" },
      [
        {
          role: "customer",
          content: "I agree to be contacted about this solar request",
        },
      ]
    );
    const [leads]: any = await pool.query(
      "SELECT firstName, city FROM leads2 WHERE id = 1"
    );
    expect(leads[0]).toMatchObject({
      firstName: "Synthetic",
      city: "Hyderabad",
    });
    const progress = await solarOperationsRouter
      .createCaller(ctx)
      .customerProgress({ sessionId: conversation.sessionId });
    expect(progress.partnerName).toBeNull();
  });
  it("prevents two leads from booking the same slot and rolls back the losing workflow", async () => {
    await pool.query(
      "INSERT INTO leads2 (id, assignedPartnerId) VALUES (100, 1); INSERT INTO solarLeadWorkflow (leadId, partnerId, stage) VALUES (100, 1, 'accepted')"
    );
    const caller = solarOperationsRouter.createCaller(ctx);
    const start = new Date(Date.now() + 86400000).toISOString(),
      end = new Date(Date.now() + 90000000).toISOString();
    await caller.addSlot({
      token,
      startsAt: start,
      endsAt: end,
      city: "Hyderabad",
    });
    const [slots]: any = await pool.query(
      "SELECT id FROM solarSurveySlots LIMIT 1"
    );
    const outcomes = await Promise.allSettled([
      caller.bookSurvey({
        token,
        leadId: 1,
        version: 1,
        slotId: slots[0].id,
        customerConfirmed: true,
      }),
      caller.bookSurvey({
        token,
        leadId: 100,
        version: 0,
        slotId: slots[0].id,
        customerConfirmed: true,
      }),
    ]);
    expect(outcomes.filter(o => o.status === "fulfilled")).toHaveLength(1);
    const [workflows]: any = await pool.query(
      "SELECT stage FROM solarLeadWorkflow WHERE leadId IN (1, 100)"
    );
    expect(
      workflows.filter((w: any) => w.stage === "survey_booked")
    ).toHaveLength(1);
    expect(workflows.filter((w: any) => w.stage === "accepted")).toHaveLength(
      1
    );
  });
  it("records no commission until terms are agreed and rejects premature revenue", async () => {
    const caller = solarOperationsRouter.createCaller(ctx);
    const [records]: any = await pool.query(
      "SELECT leadId, version FROM solarLeadWorkflow WHERE stage = 'accepted' LIMIT 1"
    );
    await expect(
      caller.advance({
        token,
        leadId: records[0].leadId,
        version: records[0].version,
        stage: "closed_won",
        note: "Skipping milestones",
        revenuePaise: 10000,
        paymentReference: "synthetic",
      })
    ).rejects.toThrow("Cannot move");
    const [terms]: any = await pool.query(
      "SELECT * FROM partnerSalesOperations"
    );
    expect(terms).toHaveLength(0);
    const [outcome]: any = await pool.query(
      "SELECT revenuePaise FROM solarLeadWorkflow WHERE leadId = ?",
      [records[0].leadId]
    );
    expect(outcome[0].revenuePaise).toBeNull();
  });
});
