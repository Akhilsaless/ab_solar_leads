import { describe, expect, it } from "vitest";
import {
  buildCallbackConsentPrompt,
  buildCommercialEstimateResponse,
  buildLimitedResidentialEstimateResponse,
  buildSafeProviderFallback,
  deriveDeterministicChatFacts,
  estimateCommercialCapacityKw,
  hasEstimateInputs,
  hasExplicitContactConsent,
  isCallbackRequest,
  estimateResidentialCapacityKw,
  withProviderTimeout,
  latestContactConsent,
} from "./chatFlow";

describe("deterministic chatbot facts", () => {
  it("retains Hyderabad/Telangana, residential use, and the stated bill without another location question", () => {
    const facts = deriveDeterministicChatFacts("Hyderabad, residential, ₹6500 monthly electricity bill");

    expect(facts).toMatchObject({
      city: "Hyderabad",
      state: "Telangana",
      propertyType: "residential",
      monthlyBill: 6500,
    });
    expect(hasEstimateInputs(facts)).toBe(true);

    const limitedEstimate = buildLimitedResidentialEstimateResponse(
      facts,
      estimateResidentialCapacityKw(facts.monthlyBill!, 8, 5),
    );
    expect(limitedEstimate).toMatch(/around \d+(?:\.\d+)? kW/);
    expect(limitedEstimate).not.toMatch(/₹78,000|guaranteed/i);
  });

  it("keeps warehouse customers commercial and never treats residential subsidy as assumed", () => {
    const facts = deriveDeterministicChatFacts("I have a warehouse in Hyderabad and my monthly electricity bill is ₹85000");
    const size = estimateCommercialCapacityKw(facts.monthlyBill!, 8, 5);
    const response = buildCommercialEstimateResponse(facts, size);

    expect(facts.propertyType).toBe("commercial");
    expect(response).toContain("Residential subsidy is not assumed for commercial property");
    expect(response).not.toContain("₹78,000");
  });
});

describe("callback consent and provider resilience", () => {
  it("does not accept negation or keep consent after withdrawal", () => {
    expect(hasExplicitContactConsent("I do not agree to be contacted")).toBe(false);
    expect(latestContactConsent([{ role: "bot", content: "I agree to contact" }])).toBe(false);
    const accepted = { role: "customer", content: "I agree to be contacted about this solar request" };
    expect(latestContactConsent([accepted])).toBe(true);
    expect(latestContactConsent([accepted, { role: "customer", content: "Do not contact me" }])).toBe(false);
  });
  it("does not mistake a QA question or intent statement for a name", () => {
    expect(deriveDeterministicChatFacts("This is a QA test. What information is needed?").name).toBeUndefined();
    expect(deriveDeterministicChatFacts("I am interested in solar").name).toBeUndefined();
    expect(deriveDeterministicChatFacts("My name is Akhil. My bill is ₹5000").name).toBe("Akhil");
  });
  it("requires explicit consent before callback contact collection", () => {
    expect(isCallbackRequest("Call me tomorrow")).toBe(true);
    expect(hasExplicitContactConsent("Call me tomorrow")).toBe(false);
    expect(buildCallbackConsentPrompt()).toMatch(/agree to be contacted/i);
    expect(hasExplicitContactConsent("I agree to be contacted about this callback")).toBe(true);
  });

  it("returns a useful fact-preserving fallback when the provider exceeds its wait boundary", async () => {
    const facts = deriveDeterministicChatFacts("Hyderabad, residential, ₹6500 monthly electricity bill");
    await expect(withProviderTimeout(new Promise(() => undefined), 5)).rejects.toThrow("provider_timeout");

    const fallback = buildSafeProviderFallback(facts);
    expect(fallback).toContain("Hyderabad, Telangana");
    expect(fallback).toContain("₹6,500 monthly bill");
    expect(fallback).not.toMatch(/₹78,000|guaranteed|eligible for subsidy/i);
  });
});
