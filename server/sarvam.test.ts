import { afterEach, describe, expect, it, vi } from "vitest";
import { callSarvam } from "./sarvam";
import { selectCandidates, PROVIDER_PRESETS } from "./aiGateway";

afterEach(() => vi.unstubAllGlobals());
const sarvam = { provider: "sarvam", isEnabled: true, status: "connected", healthStatus: "healthy", encryptedCredential: "encrypted", isFreeTier: false };
const groq = { ...sarvam, provider: "groq", isFreeTier: true };

describe("optional Sarvam brain", () => {
  it("uses the official endpoint, subscription auth and bounded output", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "Ready" } }] }) });
    vi.stubGlobal("fetch", fetcher);
    await callSarvam("synthetic-test-key", { messages: [{ role: "user", content: "Hello" }] });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.sarvam.ai/v2/chat/completions");
    expect(options.headers["api-subscription-key"]).toBe("synthetic-test-key");
    expect(options.redirect).toBe("error");
    expect(JSON.parse(options.body)).toMatchObject({ model: "sarvam-105b", max_tokens: 1024 });
  });
  it("accepts tool-only replies for Klaus", async () => {
    const message = { content: null, tool_calls: [{ id: "call-1", type: "function", function: { name: "get_leads", arguments: "{}" } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message }] }) }));
    await expect(callSarvam("test-key", { messages: [], tools: [{ type: "function" }] })).resolves.toBeTruthy();
  });
  it("rejects empty replies and never includes a provider error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: null } }] }) }));
    await expect(callSarvam("test-key", { messages: [] })).rejects.toThrow("no answer");
    const body = vi.fn().mockResolvedValue("secret echoed by provider");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: body }));
    await expect(callSarvam("test-key", { messages: [] })).rejects.toMatchObject({ status: 401, message: "Sarvam request failed (401)" });
    expect(body).not.toHaveBeenCalled();
  });
  it("does not silently route selected Sarvam requests to another vendor", () => {
    const settings = { routingMode: "auto", freeModelsOnly: false, allowPaidFallback: false, featurePolicies: { textBrainProvider: "sarvam" } };
    expect(selectCandidates([groq, sarvam], settings, {})).toEqual([sarvam]);
    expect(selectCandidates([groq, { ...sarvam, isEnabled: false }], settings, {})).toEqual([]);
    expect(selectCandidates([groq, { ...sarvam, status: "configuration_required" }], settings, {})).toEqual([]);
  });
  it("does not treat Sarvam as free or bypass a free-only policy", () => {
    expect(PROVIDER_PRESETS.sarvam.staticModels[0].isFree).toBe(false);
    expect(selectCandidates([{ ...sarvam, isFreeTier: true }], { freeModelsOnly: true, featurePolicies: { textBrainProvider: "sarvam" } }, {})).toEqual([]);
    expect(selectCandidates([sarvam, groq], { freeModelsOnly: true }, {})).toEqual([groq]);
  });
  it("rejects unintended model changes before sending a request", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(callSarvam("test-key", { messages: [], model: "another-model" })).rejects.toThrow("sarvam-105b");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
