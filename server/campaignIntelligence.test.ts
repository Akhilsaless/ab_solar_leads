import { describe, expect, it } from "vitest";
import { calculateCampaignLeadScore, DEFAULT_QUALITY_WEIGHTS } from "./campaignIntelligence";

const completeEvidence = {
  contactValidity: 1,
  locationMatch: 1,
  campaignFit: 1,
  requirementFit: 1,
  intent: 1,
  engagement: 1,
  sourceQuality: 1,
  previousInteraction: 1,
  qualificationAnswers: 1,
  isDuplicate: false,
};

describe("campaign quality scoring", () => {
  it("produces a transparent 100 score when all real evidence is present", () => {
    const result = calculateCampaignLeadScore(completeEvidence, DEFAULT_QUALITY_WEIGHTS);
    expect(result.score).toBe(100);
    expect(result.explanation.breakdown).toHaveLength(9);
    expect(result.explanation.isDuplicate).toBe(false);
  });

  it("forces duplicate campaign leads to score zero regardless of supporting evidence", () => {
    const result = calculateCampaignLeadScore({ ...completeEvidence, isDuplicate: true }, DEFAULT_QUALITY_WEIGHTS);
    expect(result.score).toBe(0);
    expect(result.explanation.isDuplicate).toBe(true);
  });

  it("returns a reduced score when evidence is incomplete", () => {
    const result = calculateCampaignLeadScore({ ...completeEvidence, intent: 0, engagement: 0, qualificationAnswers: 0 }, DEFAULT_QUALITY_WEIGHTS);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThan(0);
  });
});
