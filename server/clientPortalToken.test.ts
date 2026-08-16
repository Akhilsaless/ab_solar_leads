import { describe, expect, it } from "vitest";
import { createAccessToken, hashAccessToken } from "./campaignIntelligence";

describe("client delivery review tokens", () => {
  it("creates a high-entropy token and stores only a deterministic SHA-256 hash", () => {
    const token = createAccessToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashAccessToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAccessToken(token)).toBe(hashAccessToken(token));
  });

  it("produces a different hash for a different access token", () => {
    expect(hashAccessToken(createAccessToken())).not.toBe(hashAccessToken(createAccessToken()));
  });
});
