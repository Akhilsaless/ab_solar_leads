import { describe, expect, it } from "vitest";
import {
  assertSolarTransition,
  normalizeIndianPhone,
  validSlot,
  commissionFor,
} from "../shared/solarWorkflow";
describe("solar sales operational gates", () => {
  it("requires accepted survey and proposal milestones before claiming revenue", () => {
    expect(() => assertSolarTransition("assigned", "closed_won")).toThrow();
    expect(() => assertSolarTransition("accepted", "installed")).toThrow();
    for (const [from, to] of [
      ["assigned", "accepted"],
      ["accepted", "survey_booked"],
      ["survey_booked", "survey_completed"],
      ["survey_completed", "proposal_sent"],
      ["proposal_sent", "installed"],
      ["installed", "closed_won"],
    ] as const) {
      expect(() => assertSolarTransition(from, to)).not.toThrow();
    }
    expect(() => assertSolarTransition("closed_won", "assigned")).toThrow();
  });
  it("normalizes equivalent Indian contacts and rejects invalid numbers", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91 98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("123")).toBeNull();
    expect(normalizeIndianPhone("9876543210123")).toBeNull();
  });
  it("does not invent commissions before partner terms are agreed", () => {
    expect(commissionFor(20000000, "not_agreed", null)).toBeNull();
    expect(commissionFor(20000000, "installation_percent", 5)).toBe(1000000);
    expect(commissionFor(0, "accepted_lead", 500)).toBe(50000);
    expect(() => commissionFor(1, "installation_percent", 101)).toThrow();
  });
  it("rejects past, reversed and excessive survey slots", () => {
    const now = Date.parse("2026-10-20T00:00:00Z");
    expect(validSlot("2026-10-21T03:30:00Z", "2026-10-21T04:30:00Z", now)).toBe(
      true
    );
    expect(validSlot("2026-10-19T03:30:00Z", "2026-10-19T04:30:00Z", now)).toBe(
      false
    );
    expect(validSlot("2026-10-21T04:30:00Z", "2026-10-21T03:30:00Z", now)).toBe(
      false
    );
    expect(validSlot("2026-10-21T03:30:00Z", "2026-10-22T04:30:00Z", now)).toBe(
      false
    );
  });
});
