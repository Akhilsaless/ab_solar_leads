import { describe, expect, it } from "vitest";
import { isCurrentVerifiedCatalogItem, isVerifiedPricingReady } from "./catalogPricing";

const today = new Date("2026-09-10T12:00:00.000Z");
const verified = { isActive: true, isPriceActive: true, pricingVersion: "2026-q4", sourceNote: "Owner-approved vendor sheet", lastVerifiedAt: new Date("2026-09-09"), effectiveFrom: new Date("2026-09-01") };

describe("verified agency catalog pricing", () => {
  it("requires active, sourced, dated, non-draft items", () => {
    expect(isCurrentVerifiedCatalogItem(verified, today)).toBe(true);
    expect(isCurrentVerifiedCatalogItem({ ...verified, isPriceActive: false }, today)).toBe(false);
    expect(isCurrentVerifiedCatalogItem({ ...verified, sourceNote: "" }, today)).toBe(false);
    expect(isCurrentVerifiedCatalogItem({ ...verified, effectiveTo: new Date("2026-09-09") }, today)).toBe(false);
  });

  it("withholds monetary readiness when any required configuration is missing", () => {
    expect(isVerifiedPricingReady({ pricingActive: true, stateInput: { tariff: 7 }, panels: [verified], inverters: [verified], now: today })).toBe(true);
    expect(isVerifiedPricingReady({ pricingActive: false, stateInput: { tariff: 7 }, panels: [verified], inverters: [verified], now: today })).toBe(false);
    expect(isVerifiedPricingReady({ pricingActive: true, stateInput: null, panels: [verified], inverters: [verified], now: today })).toBe(false);
    expect(isVerifiedPricingReady({ pricingActive: true, stateInput: { tariff: 7 }, panels: [verified], inverters: [{ ...verified, pricingVersion: "draft" }], now: today })).toBe(false);
  });
});
