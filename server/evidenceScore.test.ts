import { describe, expect, it } from "vitest";
import { calculateEvidenceScore } from "./evidenceScore";

describe("Central Evidence Score", () => {
  it("marks a well-evidenced commercial owner lead as sales ready", () => {
    const score = calculateEvidenceScore({
      id: 1, firstName: "Akhil", email: "owner@example.com", phone: "919999999999",
      company: "Medchal Cold Storage", city: "Hyderabad", state: "Telangana",
      propertyAddress: "Industrial Estate", monthlyEnergyBill: "25000", homeownershipType: "commercial_owner",
      installationTimeline: "within_3_months", status: "qualified",
    });
    expect(score.score).toBeGreaterThanOrEqual(80);
    expect(score.tier).toBe("sales_ready");
    expect(score.missingEvidence).toHaveLength(0);
  });

  it("blocks do-not-contact leads regardless of other evidence", () => {
    const score = calculateEvidenceScore({ id: 2, firstName: "Sam", phone: "919999999999", city: "Hyderabad", state: "Telangana", isDnc: true });
    expect(score.score).toBe(0);
    expect(score.tier).toBe("blocked");
    expect(score.riskFlags).toContain("Do-not-contact flag is active");
  });

  it("flags tenant leads for property permission research", () => {
    const score = calculateEvidenceScore({ id: 3, firstName: "Ria", email: "ria@example.com", city: "Hyderabad", state: "Telangana", homeownershipType: "tenant" });
    expect(score.riskFlags.some(flag => flag.includes("Tenant"))).toBe(true);
    expect(score.missingEvidence.some(item => item.includes("permission"))).toBe(true);
  });
});
