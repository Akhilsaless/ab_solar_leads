import { describe, expect, it } from "vitest";
import { signEmailEventPayload, verifyEmailEventSignature } from "./emailEventWebhook";

const payload = { provider: "test", events: [{ id: "event_1", type: "delivered" }] };

describe("email event webhook signature verification", () => {
  it("accepts the expected HMAC signature", () => {
    const signature = signEmailEventPayload(payload, "integration-secret");
    expect(verifyEmailEventSignature(payload, signature, "integration-secret")).toBe(true);
  });

  it("rejects missing, incorrect, and malformed signatures", () => {
    expect(verifyEmailEventSignature(payload, undefined, "integration-secret")).toBe(false);
    expect(verifyEmailEventSignature(payload, "not-a-signature", "integration-secret")).toBe(false);
    expect(verifyEmailEventSignature(payload, signEmailEventPayload(payload, "other-secret"), "integration-secret")).toBe(false);
  });
});
