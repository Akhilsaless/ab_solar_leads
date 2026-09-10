import { describe, expect, it } from "vitest";
import { activationError, estimateSettingsActivationError, stateInputActivationError } from "./productionControls";

const unavailable = { emailReady: false, whatsappAdapterAvailable: false, smsOtpAdapterAvailable: false, optionalAiReady: false };

describe("production activation controls", () => {
  it("fails closed for outbound automation when dependencies are unavailable", () => {
    expect(activationError({ emailAutomationEnabled: true }, unavailable)).toMatch(/SMTP/);
    expect(activationError({ whatsappAutomationEnabled: true }, unavailable)).toMatch(/WhatsApp/);
    expect(activationError({ smsOtpEnabled: true }, unavailable)).toMatch(/OTP/);
  });

  it("allows disabled control states without any provider", () => {
    expect(activationError({ emailAutomationEnabled: false, scheduledFollowUpsEnabled: false }, unavailable)).toBeNull();
  });

  it("requires traceable verified inputs before pricing activation", () => {
    expect(estimateSettingsActivationError({ isPricingActive: true, pricingVersion: "draft" })).toMatch(/non-draft/);
    expect(estimateSettingsActivationError({ isPricingActive: true, pricingVersion: "2026-q4", sourceNote: "Owner-approved vendor sheet", effectiveFrom: "2026-09-10", lastVerifiedAt: "2026-09-10", installationCostPerKw: "4000", balanceOfSystemCostPerKw: "12000" })).toBeNull();
  });

  it("requires source and verified tariff/generation inputs before state activation", () => {
    expect(stateInputActivationError({ isActive: true, tariffPerUnit: "7.5", avgSunHours: "4.5" })).toMatch(/source/);
    expect(stateInputActivationError({ isActive: true, tariffPerUnit: "7.5", avgSunHours: "4.5", sourceNote: "DISCOM tariff circular", effectiveFrom: "2026-09-10", lastVerifiedAt: "2026-09-10" })).toBeNull();
  });
});
