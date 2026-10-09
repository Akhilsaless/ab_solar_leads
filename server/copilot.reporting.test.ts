import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), getAgency: vi.fn() }));
vi.mock("./db", () => ({ getDb: async () => ({ execute: mocks.execute }), getAgencyByUserId: mocks.getAgency }));
import { copilotRouter } from "./copilot";

const caller = () => copilotRouter.createCaller({ user: { id: 1, role: "admin" }, req: {}, res: {} } as any);
const dialect = new MySqlDialect();

describe("Copilot agency reporting", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.execute.mockReset();
    mocks.getAgency.mockResolvedValue({ id: 7 });
  });

  it("uses agency-scoped leads and IST day boundaries, returning the actual unassigned count", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T00:30:00Z"));
    mocks.execute.mockResolvedValueOnce([[{ id: 1, firstName: "QA", createdAt: new Date("2026-10-08T20:00:00Z"), status: "new", leadScore: 100, assignedAgencyId: null, assignedTo: null, assignedPartnerId: null }]])
      .mockResolvedValueOnce([[{ cnt: 2 }]]).mockResolvedValueOnce([[{ cnt: 3 }]]).mockResolvedValueOnce([[{ cnt: 4 }]]);
    const summary = await caller().getDailySummary();
    expect(summary).toMatchObject({ newLeadsToday: 1, urgentLeads: 0, unassignedLeads: 1, emailsSentToday: 2, businessesThatOpened: 3, runsToday: 4 });
    const queries = mocks.execute.mock.calls.map(([query]) => dialect.sqlToQuery(query));
    expect(queries[0].sql).toContain("COALESCE(l.agencyId, c.agencyId) = ?");
    expect(queries[0].params).toEqual([7]);
    expect(queries[1].params).toEqual([7, Date.parse("2026-10-08T18:30:00Z"), Date.parse("2026-10-09T18:30:00Z")]);
    expect(queries[3].sql).toContain("startedAt >= ? AND startedAt < ?");
    vi.useRealTimers();
  });

  it("ranks evidence above legacy scores and scopes recommendations to the agency and contactable leads", async () => {
    mocks.execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[
      { id: 1, firstName: "Incomplete", leadScore: 100 },
      { id: 2, firstName: "Evidence", leadScore: 0, phone: "9999999999", email: "qa@example.com", city: "Hyderabad", state: "Telangana", propertyAddress: "QA site", monthlyEnergyBill: 20000, installationTimeline: "Now", homeownershipType: "owner", company: "QA" },
    ]]);
    const recommendations = await caller().getPriorityRecommendations();
    expect(recommendations[0].record).toBe("Evidence");
    const query = dialect.sqlToQuery(mocks.execute.mock.calls[1][0]);
    expect(query.params).toEqual([7]);
    expect(query.sql).toContain("COALESCE(l.isDnc, 0) = 0");
    expect(query.sql).toContain("COALESCE(l.agencyId, c.agencyId) = ?");
  });
});
