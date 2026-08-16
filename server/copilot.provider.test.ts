import { describe, expect, it } from "vitest";
import { normalizeExternalBaseUrl } from "./copilot";

describe("Klaus external provider endpoint validation", () => {
  it("accepts a public HTTPS OpenAI-compatible endpoint", () => {
    expect(normalizeExternalBaseUrl("https://api.groq.com/openai/v1/")).toBe("https://api.groq.com/openai/v1");
  });

  it("rejects insecure and local endpoints", () => {
    expect(() => normalizeExternalBaseUrl("http://localhost:11434/v1")).toThrow();
    expect(() => normalizeExternalBaseUrl("https://127.0.0.1/v1")).toThrow();
  });
});
