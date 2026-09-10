import { describe, expect, it } from "vitest";
import { calculatePartnerOnboardingStatus, isPartnerMonetaryEstimateReady, nextIncompletePartnerStep, normalizeCompletedSteps } from "./partnerOnboarding";

const currentItem = { isActive: true, isPriceActive: true, pricingVersion: "2026-q3", sourceNote: "Synthetic test quote", lastVerifiedAt: new Date(), effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2099-01-01") };

describe("partner onboarding readiness", () => {
  it("starts as setup required and never unlocks monetary output", () => {
    const snapshot = { companyComplete: false, panelCount: 0, inverterCount: 0, pricingActive: false, stateInputReady: false, subsidyStepComplete: false, estimateSettingsComplete: false, panels: [], inverters: [] };
    expect(calculatePartnerOnboardingStatus(snapshot)).toBe("setup_required");
    expect(isPartnerMonetaryEstimateReady(snapshot)).toBe(false);
  });

  it("keeps partial partner configuration out of monetary estimates", () => {
    const snapshot = { companyComplete: true, panelCount: 1, inverterCount: 0, pricingActive: false, stateInputReady: false, subsidyStepComplete: false, estimateSettingsComplete: false, panels: [currentItem], inverters: [] };
    expect(calculatePartnerOnboardingStatus(snapshot)).toBe("partially_configured");
    expect(isPartnerMonetaryEstimateReady(snapshot)).toBe(false);
    expect(nextIncompletePartnerStep(snapshot, [1, 2])).toBe(3);
  });

  it("requires current verified products plus all owner-confirmed setup inputs before ready", () => {
    const snapshot = { companyComplete: true, panelCount: 1, inverterCount: 1, pricingActive: true, stateInputReady: true, subsidyStepComplete: true, estimateSettingsComplete: true, panels: [currentItem], inverters: [currentItem] };
    expect(calculatePartnerOnboardingStatus(snapshot)).toBe("ready");
    expect(isPartnerMonetaryEstimateReady(snapshot)).toBe(true);
    expect(normalizeCompletedSteps("[1, 2, 2, 9, \"3\"]")).toEqual([1, 2, 3]);
  });

  it("does not unlock a partner workspace when a verified catalog item has expired", () => {
    const expired = { ...currentItem, effectiveTo: new Date("2025-01-01") };
    const snapshot = { companyComplete: true, panelCount: 1, inverterCount: 1, pricingActive: true, stateInputReady: true, subsidyStepComplete: true, estimateSettingsComplete: true, panels: [expired], inverters: [currentItem] };
    expect(calculatePartnerOnboardingStatus(snapshot)).toBe("partially_configured");
    expect(isPartnerMonetaryEstimateReady(snapshot)).toBe(false);
  });
});
