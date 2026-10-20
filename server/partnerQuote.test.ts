import { describe, expect, it } from "vitest";
import { calculatePartnerQuote, buildPartnerProposalPdf } from "./partnerQuote";
const verified = {
  isActive: true,
  isPriceActive: true,
  pricingVersion: "synthetic-v1",
  sourceNote: "Synthetic fixture",
  lastVerifiedAt: "2026-10-01",
  effectiveFrom: "2026-10-01",
  effectiveTo: "2026-12-31",
};
const input = {
  bill: 3000,
  now: new Date("2026-10-20"),
  panels: [
    {
      ...verified,
      brand: "Test",
      model: "P500",
      wattage: 500,
      pricePerPanel: 10000,
    },
  ],
  inverters: [
    { ...verified, brand: "Test", model: "I5", capacityKw: 5, price: 40000 },
  ],
  pricing: {
    ...verified,
    isPricingActive: true,
    pricingMode: "catalog",
    installationCostPerKw: 4000,
    balanceOfSystemCostPerKw: 3000,
    taxRatePercent: 5,
  },
  state: {
    ...verified,
    tariffPerUnit: 8,
    avgSunHours: 5,
    systemLossPercent: 15,
  },
};
describe("installer-backed proposals", () => {
  it("includes actual DC panel capacity, BOS, installation and tax, with no assumed subsidy", () => {
    const quote = calculatePartnerQuote(input);
    expect(quote.sizeKw).toBe(3);
    expect(quote.items.map(i => i.amount)).toEqual([60000, 40000, 12000, 9000]);
    expect(quote.total).toBe(127050);
    expect(quote.subsidyAmount).toBeNull();
    expect(quote.maxSavingsMonthly).toBeLessThanOrEqual(input.bill);
  });
  it("rejects expired pricing and undersized inverters instead of fabricating a quote", () => {
    expect(() =>
      calculatePartnerQuote({
        ...input,
        pricing: { ...input.pricing, effectiveTo: "2026-10-01" },
      })
    ).toThrow();
    expect(() =>
      calculatePartnerQuote({
        ...input,
        inverters: [{ ...input.inverters[0], capacityKw: 1 }],
      })
    ).toThrow();
    expect(() => calculatePartnerQuote({ ...input, bill: 100000 })).toThrow();
  });
  it("generates a real PDF document", () => {
    const pdf = Buffer.from(
      buildPartnerProposalPdf(
        calculatePartnerQuote(input),
        { name: "Synthetic Customer", city: "Hyderabad" },
        "Synthetic Installer",
        "TEST-1"
      ),
      "base64"
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
