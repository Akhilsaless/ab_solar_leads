import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./platformCommunicationService", () => ({
  getPlatformSafetyControl: async () => ({ emergencyStopActive: false }),
}));
import {
  callPhoneVerification,
  phoneVerificationConfigured,
} from "./phoneVerification";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("real phone verification adapter", () => {
  it("does not contact a provider before explicit configuration", async () => {
    vi.stubEnv("SOLAR_PHONE_VERIFICATION_ENABLED", "false");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(phoneVerificationConfigured()).toBe(false);
    await expect(
      callPhoneVerification("Verifications", new URLSearchParams())
    ).rejects.toThrow("not configured");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the provider's approved status, never a locally guessed OTP", async () => {
    vi.stubEnv("SOLAR_PHONE_VERIFICATION_ENABLED", "true");
    vi.stubEnv("TWILIO_ACCOUNT_SID", `AC${"a".repeat(32)}`);
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", `VA${"b".repeat(32)}`);
    vi.stubEnv("TWILIO_AUTH_TOKEN", "synthetic-not-a-real-credential");
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: "approved", to: "+919876543210" }),
      });
    vi.stubGlobal("fetch", fetch);
    await expect(
      callPhoneVerification(
        "VerificationCheck",
        new URLSearchParams({ To: "+919876543210", Code: "123456" })
      )
    ).resolves.toEqual({ status: "approved", to: "+919876543210" });
    expect(fetch.mock.calls[0][0]).toContain(
      "https://verify.twilio.com/v2/Services/VA"
    );
    expect(fetch.mock.calls[0][1].redirect).toBe("error");
  });
});
