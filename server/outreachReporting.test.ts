import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { getOutreachOverview } from "./outreachReporting";
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

describe("outreach reporting", () => {
  it("keeps daily runs in IST and counts unique businesses independently of repeated opens and other agencies", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      CREATE TABLE outreachRuns (agencyId INTEGER, startedAt INTEGER, scrapedCount INTEGER, eligibleCount INTEGER, emailSentCount INTEGER, whatsappSentCount INTEGER, errorCount INTEGER);
      CREATE TABLE scrapedBusinesses (agencyId INTEGER, emailSentAt INTEGER, emailOpenCount INTEGER, chatbotClickCount INTEGER);
    `);
    const now = Date.parse("2026-10-09T00:30:00Z");
    const today = Date.parse("2026-10-08T20:00:00Z");
    const previousDay = Date.parse("2026-10-08T17:00:00Z");
    db.prepare("INSERT INTO outreachRuns VALUES (?, ?, ?, ?, ?, ?, ?)").run(7, today, 10, 4, 3, 0, 0);
    db.prepare("INSERT INTO outreachRuns VALUES (?, ?, ?, ?, ?, ?, ?)").run(7, previousDay, 99, 99, 99, 0, 0);
    db.prepare("INSERT INTO outreachRuns VALUES (?, ?, ?, ?, ?, ?, ?)").run(8, today, 99, 99, 99, 0, 0);
    const insert = db.prepare("INSERT INTO scrapedBusinesses VALUES (?, ?, ?, ?)");
    insert.run(7, today, 6, 4);
    insert.run(7, previousDay, 0, 0);
    insert.run(7, null, 5, 5);
    insert.run(8, today, 99, 99);
    const dialect = new MySqlDialect();
    try {
      const result = await getOutreachOverview({ execute: async query => {
        const compiled = dialect.sqlToQuery(query);
        return [db.prepare(compiled.sql).all(...compiled.params as any[])];
      } }, 7, now);
      expect(result).toMatchObject({ totalRuns: 1, totalEmailSent: 3, totalScraped: 10, engagement: { businessesEmailed: 2, businessesOpened: 1, businessesClicked: 1, businessesEmailedToday: 1 } });
    } finally { db.close(); }
  });
});
