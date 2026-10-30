import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configSchema,
  qualification,
  callCharge,
  insideCallingHours,
  secretEqual,
} from "./followup/policy";
import { startVoice, submitBill, boundedImage } from "./followup/providers";
afterEach(() => vi.unstubAllGlobals());
describe("follow-up qualification and provider contracts", () => {
  const config = configSchema.parse({ servicePincodes: ["500001"] });
  it("requires every qualification gate and does not treat model strings as consent", () => {
    const yes = {
      monthly_bill: 2500,
      roof_owner: true,
      survey_requested: true,
      pincode: "500001",
    };
    expect(qualification(yes, config)).toBe(true);
    for (const change of [
      { monthly_bill: 1000 },
      { roof_owner: "true" },
      { survey_requested: false },
      { pincode: "500002" },
    ])
      expect(qualification({ ...yes, ...change }, config)).toBe(false);
  });
  it("uses integer paise and started-minute charges", () => {
    expect(callCharge(0, 800)).toBe(0);
    expect(callCharge(61, 800)).toBe(1600);
    expect(() => callCharge(-1, 800)).toThrow();
    expect(() => callCharge(NaN, 800)).toThrow();
  });
  it("respects IST calling hours", () => {
    expect(insideCallingHours(new Date("2026-10-30T03:29:00Z"))).toBe(false);
    expect(insideCallingHours(new Date("2026-10-30T03:30:00Z"))).toBe(true);
    expect(insideCallingHours(new Date("2026-10-30T14:30:00Z"))).toBe(false);
  });
  it("allows configuring without credentials and rejects invalid limits", () => {
    expect(config.voiceKey).toBeUndefined();
    expect(config.automaticCalls).toBe(false);
    expect(() => configSchema.parse({ maxAttempts: 100 })).toThrow();
    expect(() => configSchema.parse({ maxCallSeconds: 0 })).toThrow();
    expect(secretEqual("a", "b")).toBe(false);
  });
  it("uses workspace auth and correlatable Sarvam attempt IDs", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ attempt_id: "attempt-1" }),
      });
    vi.stubGlobal("fetch", fetcher);
    const id = await startVoice(
      {
        ...config,
        voiceKey: "synthetic-test",
        orgId: "org",
        workspaceId: "ws",
        appId: "app",
        connectionId: "line",
      },
      "+919999999999",
      "https://test.invalid/callback"
    );
    expect(id).toBe("attempt-1");
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe(
      "https://apps.sarvam.ai/api/outbounds/v1/orgs/org/workspaces/ws/outbounds"
    );
    expect(request.headers["X-API-Key"]).toBe("synthetic-test");
    expect(JSON.parse(request.body).webhook_config.url).toBe(
      "https://test.invalid/callback"
    );
    expect(request.redirect).toBe("error");
  });
  it("rejects unsupported/mislabeled/oversize bills before OCR", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      submitBill("synthetic", new Uint8Array(), "application/pdf")
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      boundedImage(
        new Response("not-an-image", {
          headers: { "content-type": "image/jpeg" },
        })
      )
    ).rejects.toThrow("invalid_image_signature");
    await expect(
      boundedImage(
        new Response("", {
          headers: {
            "content-type": "image/png",
            "content-length": String(6 * 1024 * 1024),
          },
        })
      )
    ).rejects.toThrow("invalid_bill_image");
  });
});
