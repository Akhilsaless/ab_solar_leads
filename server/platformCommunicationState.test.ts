import { describe, expect, it } from "vitest";
import { canDispatchAutomated, isPlatformOwner, isPlatformSuperAdmin, sanitizedConfigurationFields, startBlocker, transitionError } from "./platformCommunicationState";

describe("platform communication state machine", () => {
  const ready = { configured: true, verified: true, providerSupported: true, senderIdentityConfirmed: true, pricingReady: true, legalReady: true, featureEnabled: true, outreachMasterEnabled: true, emergencyStopActive: false };
  it("requires the platform owner and blocks every incomplete start prerequisite", () => {
    expect(isPlatformOwner("owner", "owner")).toBe(true);
    expect(isPlatformOwner("partner", "owner")).toBe(false);
    expect(isPlatformSuperAdmin({ openId: "owner", role: "admin" }, "owner")).toBe(true);
    expect(isPlatformSuperAdmin({ openId: "owner", role: "user" }, "owner")).toBe(false);
    expect(startBlocker("email", { ...ready, emergencyStopActive: true })).toContain("Emergency stop");
    expect(startBlocker("email", { ...ready, pricingReady: false })).toContain("pricing");
    expect(startBlocker("email", { ...ready, legalReady: false })).toContain("consent");
  });
  it("allows only explicit supported pause, resume, and off transitions", () => {
    expect(transitionError("running", "paused")).toBeNull();
    expect(transitionError("paused", "running")).toBeNull();
    expect(transitionError("off", "running")).toBeNull();
    expect(transitionError("off", "paused")).toContain("Cannot change");
  });
  it("fails closed for dispatch unless the channel is running, ready, and not emergency-stopped", () => {
    expect(canDispatchAutomated("email", { state: "off", status: "ready", emergencyStopActive: false }).allowed).toBe(false);
    expect(canDispatchAutomated("email", { state: "running", status: "running", emergencyStopActive: true }).allowed).toBe(false);
    expect(canDispatchAutomated("email", { state: "running", status: "running", emergencyStopActive: false }).allowed).toBe(true);
  });
  it("records configuration field names only and never preserves empty values", () => {
    expect(sanitizedConfigurationFields({ host: "smtp.example.test", password: "secret", replyTo: "" })).toEqual(["host", "password"]);
  });
});
