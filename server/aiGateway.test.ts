import { describe, expect, it } from "vitest";
import { maskCredential, normalizeGatewayBaseUrl, PROVIDER_PRESETS } from "./aiGateway";

describe("AI Gateway provider safety", () => {
  it("accepts public HTTPS provider endpoints", () => {
    expect(normalizeGatewayBaseUrl("https://api.groq.com/openai/v1/")).toBe("https://api.groq.com/openai/v1");
  });

  it("rejects insecure and local provider endpoints", () => {
    expect(() => normalizeGatewayBaseUrl("http://localhost:11434/v1")).toThrow();
    expect(() => normalizeGatewayBaseUrl("https://127.0.0.1/v1")).toThrow();
  });

  it("masks credentials without returning the raw value", () => {
    expect(maskCredential("gsk_live_secret_93ad")).toBe("••••••••93ad");
  });

  it("ships required provider presets with credential metadata", () => {
    expect(Object.keys(PROVIDER_PRESETS)).toEqual(expect.arrayContaining(["gemini", "groq", "openrouter", "cloudflare", "mistral", "huggingface", "openai"]));
    expect(PROVIDER_PRESETS.cloudflare.credentialFields.map(field => field.key)).toEqual(expect.arrayContaining(["accountId", "apiKey"]));
  });
});
