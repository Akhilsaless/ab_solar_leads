import { createRequire } from "node:module";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("./db", () => ({ getDb: async () => ({ execute: mocks.execute }), getAgencyByUserId: async () => ({ id: 7 }) }));
import { campaignIntelligenceRouter } from "./campaignIntelligence";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

describe("North Star reporting with multiple deliveries", () => {
  it("counts each lead and campaign cost once while summing all deliveries in the current agency", async () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE campaignProfiles (id INTEGER, campaignId INTEGER, agencyId INTEGER, campaignCost REAL, appointmentTarget INTEGER, startDate TEXT, endDate TEXT);
      CREATE TABLE campaigns2 (id INTEGER, name TEXT, status TEXT, targetLeadCount INTEGER, createdAt TEXT);
      CREATE TABLE campaignLeadRecords (id INTEGER, campaignId INTEGER, status TEXT, source TEXT, assignedTo INTEGER);
      CREATE TABLE campaignDeliveries (id INTEGER, campaignLeadId INTEGER, clientId INTEGER, status TEXT, revenue REAL, commission REAL, rejectionReason TEXT);
      CREATE TABLE campaignClients (id INTEGER, agencyId INTEGER, name TEXT);
      CREATE TABLE users (id INTEGER, name TEXT);
      INSERT INTO campaignProfiles VALUES (1, 1, 7, 100, 1, NULL, NULL), (2, 2, 8, 999, 1, NULL, NULL);
      INSERT INTO campaigns2 VALUES (1, 'QA', 'active', 1, NULL), (2, 'Other agency', 'active', 1, NULL);
      INSERT INTO campaignLeadRecords VALUES (1, 1, 'accepted', 'chat', 1), (2, 2, 'accepted', 'chat', 2);
      INSERT INTO campaignDeliveries VALUES (1, 1, 1, 'accepted', 10, 1, NULL), (2, 1, 1, 'accepted', 20, 2, NULL), (3, 2, 2, 'accepted', 999, 999, NULL);
      INSERT INTO campaignClients VALUES (1, 7, 'QA client'), (2, 8, 'Other client');
      INSERT INTO users VALUES (1, 'QA user'), (2, 'Other user');
    `);
    const dialect = new MySqlDialect();
    mocks.execute.mockImplementation(async (query) => {
      const compiled = dialect.sqlToQuery(query);
      return [database.prepare(compiled.sql).all(...compiled.params as any[])];
    });
    try {
      const caller = campaignIntelligenceRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as any);
      const result = await caller.getNorthStarDashboard();
      expect(result.totals).toMatchObject({ generated: 1, accepted: 1, revenue: 30, commission: 3, campaignCost: 100 });
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]).toMatchObject({ generated: 1, accepted: 1, revenue: 30 });
      expect(result.sources[0]).toMatchObject({ generated: 1, accepted: 1, revenue: 30 });
      expect(result.team[0]).toMatchObject({ leads: 1, accepted: 1, revenue: 30 });
    } finally {
      database.close();
    }
  });
});
