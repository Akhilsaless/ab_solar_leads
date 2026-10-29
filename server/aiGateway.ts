import { callSarvam, SARVAM_BASE_URL, SARVAM_MODEL } from "./sarvam";
import { TRPCError } from "@trpc/server";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { protectedProcedure, router } from "./_core/trpc";
import { getAgencyByUserId, getDb } from "./db";

export const AI_PROVIDERS = ["builtin", "sarvam", "gemini", "groq", "openrouter", "cloudflare", "mistral", "huggingface", "openai", "custom"] as const;
export type AiProvider = typeof AI_PROVIDERS[number];
export type RoutingMode = "auto" | "fastest" | "free_first" | "best_quality" | "manual";

type ProviderPreset = {
  label: string;
  connectionType: "api_key" | "builtin" | "custom";
  defaultBaseUrl?: string;
  defaultModel: string;
  purpose: string;
  supportsModelDiscovery: boolean;
  credentialFields: Array<{ key: "apiKey" | "accountId"; label: string; secret: boolean }>;
  staticModels: Array<{ id: string; categories: string[]; capabilities: string[]; isFree: boolean }>;
};

/** Provider metadata is intentionally capability based—not hard-wired into feature code. */
export const PROVIDER_PRESETS: Record<AiProvider, ProviderPreset> = {
  builtin: {
    label: "Built-in AI", connectionType: "builtin", defaultModel: "gpt-5-nano", purpose: "Existing safe fallback while no external provider is configured.", supportsModelDiscovery: false, credentialFields: [],
    staticModels: [{ id: "gpt-5-nano", categories: ["fast", "agent_tool_calling"], capabilities: ["streaming", "tool_calling", "structured_output"], isFree: false }],
  },
  sarvam: {
    label: "Sarvam AI", connectionType: "api_key", defaultBaseUrl: SARVAM_BASE_URL,
    defaultModel: SARVAM_MODEL, purpose: "Optional Telugu, Hindi and English text brain for customer chat and Klaus. Calling and WhatsApp automation are separate paid features.",
    supportsModelDiscovery: false,
    credentialFields: [{ key: "apiKey", label: "Sarvam API subscription key (optional)", secret: true }],
    staticModels: [{ id: SARVAM_MODEL, categories: ["general", "agent_tool_calling"], capabilities: ["tool_calling", "structured_output"], isFree: false }],
  },
  gemini: {
    label: "Google Gemini", connectionType: "api_key", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", defaultModel: "gemini-2.5-flash", purpose: "Fast multimodal and tool-capable Google models.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "Gemini API Key", secret: true }],
    staticModels: [{ id: "gemini-2.5-flash", categories: ["fast", "multimodal", "agent_tool_calling"], capabilities: ["streaming", "tool_calling", "vision", "structured_output"], isFree: true }],
  },
  groq: {
    label: "Groq", connectionType: "api_key", defaultBaseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", purpose: "Low-latency OpenAI-compatible inference.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "Groq API Key", secret: true }],
    staticModels: [{ id: "llama-3.3-70b-versatile", categories: ["fast", "general", "agent_tool_calling"], capabilities: ["streaming", "tool_calling", "structured_output"], isFree: true }],
  },
  openrouter: {
    label: "OpenRouter", connectionType: "api_key", defaultBaseUrl: "https://openrouter.ai/api/v1", defaultModel: "google/gemini-2.0-flash-001", purpose: "Multi-model fallback and model catalogue.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "OpenRouter API Key", secret: true }],
    staticModels: [{ id: "google/gemini-2.0-flash-001", categories: ["fast", "multimodal"], capabilities: ["streaming", "tool_calling", "structured_output"], isFree: false }],
  },
  cloudflare: {
    label: "Cloudflare Workers AI", connectionType: "api_key", defaultModel: "@cf/meta/llama-3.1-8b-instruct", purpose: "Account-scoped models and low-latency edge inference.", supportsModelDiscovery: false,
    credentialFields: [{ key: "accountId", label: "Cloudflare Account ID", secret: false }, { key: "apiKey", label: "Cloudflare API Token", secret: true }],
    staticModels: [{ id: "@cf/meta/llama-3.1-8b-instruct", categories: ["fast", "general"], capabilities: ["streaming", "structured_output"], isFree: true }],
  },
  mistral: {
    label: "Mistral AI", connectionType: "api_key", defaultBaseUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-small-latest", purpose: "General and reasoning-capable European models.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "Mistral API Key", secret: true }],
    staticModels: [{ id: "mistral-small-latest", categories: ["general", "fast", "agent_tool_calling"], capabilities: ["streaming", "tool_calling", "structured_output"], isFree: true }],
  },
  huggingface: {
    label: "Hugging Face", connectionType: "api_key", defaultBaseUrl: "https://router.huggingface.co/v1", defaultModel: "meta-llama/Llama-3.3-70B-Instruct", purpose: "Open-model and specialist inference providers.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "Hugging Face Token", secret: true }],
    staticModels: [{ id: "meta-llama/Llama-3.3-70B-Instruct", categories: ["general", "agent_tool_calling"], capabilities: ["streaming", "tool_calling", "structured_output"], isFree: true }],
  },
  openai: {
    label: "OpenAI", connectionType: "api_key", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", purpose: "Optional premium models and fallback.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "OpenAI API Key", secret: true }],
    staticModels: [{ id: "gpt-4o-mini", categories: ["general", "multimodal", "agent_tool_calling"], capabilities: ["streaming", "tool_calling", "vision", "structured_output"], isFree: false }],
  },
  custom: {
    label: "Custom OpenAI-Compatible", connectionType: "custom", defaultModel: "", purpose: "Self-hosted or another public HTTPS OpenAI-compatible endpoint.", supportsModelDiscovery: true,
    credentialFields: [{ key: "apiKey", label: "API Key", secret: true }], staticModels: [],
  },
};

function normalizeRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  return Array.isArray(result) ? result : result.rows || [];
}

function requireSecret(): Buffer {
  const secret = ENV.cookieSecret || process.env.JWT_SECRET;
  if (!secret) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A server encryption secret must be configured before provider credentials can be stored." });
  return createHash("sha256").update(secret).digest();
}

export function encryptGatewayCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", requireSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptGatewayCredential(payload: string) {
  const [ivPart, tagPart, encryptedPart] = payload.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stored provider credential is invalid." });
  const decipher = createDecipheriv("aes-256-gcm", requireSecret(), Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64")), decipher.final()]).toString("utf8");
}

export function maskCredential(value: string | null | undefined) {
  if (!value) return null;
  const suffix = value.slice(-4);
  return `••••••••${suffix}`;
}

export function normalizeGatewayBaseUrl(value: string) {
  const url = new URL(value);
  const forbidden = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
  if (url.protocol !== "https:" || forbidden.has(url.hostname)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Provider endpoint must use public HTTPS." });
  }
  return url.toString().replace(/\/$/, "");
}

function providerBaseUrl(connection: any) {
  const provider = connection.provider as AiProvider;
  if (provider === "cloudflare") {
    if (!connection.accountId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cloudflare Account ID is required." });
    return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(connection.accountId)}/ai/v1`;
  }
  return normalizeGatewayBaseUrl(connection.baseUrl || PROVIDER_PRESETS[provider]?.defaultBaseUrl || "");
}

function providerModelPath(connection: any) {
  return `${providerBaseUrl(connection)}/models`;
}

function normalizeModelList(provider: AiProvider, payload: any) {
  const raw = payload?.data || payload?.models || payload?.result || [];
  const entries = Array.isArray(raw) ? raw : [];
  return entries.map((model: any) => ({
    modelId: String(model.id || model.name || model.model_id || ""),
    displayName: String(model.name || model.display_name || model.id || ""),
    categories: JSON.stringify(["general"]),
    capabilities: JSON.stringify(["streaming"]),
    isFree: provider === "groq" || provider === "gemini" || provider === "cloudflare" || provider === "mistral" || provider === "huggingface",
  })).filter((model: any) => model.modelId);
}

async function fetchModelList(connection: any, apiKey: string) {
  const provider = connection.provider as AiProvider;
  if (provider === "sarvam") return PROVIDER_PRESETS.sarvam.staticModels.map(model => ({ modelId: model.id, displayName: model.id, categories: JSON.stringify(model.categories), capabilities: JSON.stringify(model.capabilities), isFree: false }));
  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) throw new Error(`Model discovery failed (${response.status})`);
    const data = await response.json();
    return normalizeModelList(provider, { models: (data.models || []).map((model: any) => ({ id: String(model.name || "").replace(/^models\//, ""), name: model.displayName })) });
  }
  if (provider === "cloudflare") return PROVIDER_PRESETS.cloudflare.staticModels.map(model => ({ modelId: model.id, displayName: model.id, categories: JSON.stringify(model.categories), capabilities: JSON.stringify(model.capabilities), isFree: model.isFree }));
  const response = await fetch(providerModelPath(connection), { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`Model discovery failed (${response.status})`);
  return normalizeModelList(provider, await response.json());
}

function jsonParse(value: unknown, fallback: any) {
  if (typeof value !== "string") return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function cleanConnection(connection: any) {
  return {
    id: connection.id,
    provider: connection.provider,
    connectionType: connection.connectionType,
    status: connection.status,
    healthStatus: connection.healthStatus,
    credentialConfigured: Boolean(connection.encryptedCredential),
    credentialHint: connection.credentialHint || null,
    accountId: connection.accountId || null,
    baseUrl: connection.baseUrl || null,
    defaultModel: connection.defaultModel || null,
    isEnabled: Boolean(connection.isEnabled),
    isFreeTier: Boolean(connection.isFreeTier),
    priority: Number(connection.priority || 100),
    lastValidatedAt: connection.lastValidatedAt || null,
    lastSuccessfulAt: connection.lastSuccessfulAt || null,
    averageLatencyMs: connection.averageLatencyMs || null,
    lastErrorCode: connection.lastErrorCode || null,
    lastErrorMessage: connection.lastErrorMessage || null,
  };
}

async function agencyForUser(userId: number) {
  const agency = await getAgencyByUserId(userId);
  if (!agency) throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found." });
  return agency;
}

async function getSettings(agencyId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  await db.execute(sql`INSERT INTO aiGatewaySettings (agencyId) VALUES (${agencyId}) ON DUPLICATE KEY UPDATE agencyId = VALUES(agencyId)`);
  const result = await db.execute(sql`SELECT * FROM aiGatewaySettings WHERE agencyId = ${agencyId} LIMIT 1`);
  return normalizeRows(result)[0];
}

async function listConnections(agencyId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  const result = await db.execute(sql`SELECT * FROM aiProviderConnections WHERE agencyId = ${agencyId} ORDER BY priority ASC, id ASC`);
  return normalizeRows(result);
}

async function logUsage(input: { agencyId: number; providerConnectionId?: number | null; provider: string; modelId?: string | null; feature: string; routingMode: string; latencyMs?: number; success: boolean; usedFallback?: boolean; errorCode?: string | null; inputTokens?: number | null; outputTokens?: number | null; }) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    INSERT INTO aiGatewayUsage (agencyId, providerConnectionId, provider, modelId, feature, routingMode, latencyMs, inputTokens, outputTokens, success, usedFallback, errorCode)
    VALUES (${input.agencyId}, ${input.providerConnectionId || null}, ${input.provider}, ${input.modelId || null}, ${input.feature}, ${input.routingMode}, ${input.latencyMs || null}, ${input.inputTokens || null}, ${input.outputTokens || null}, ${input.success}, ${Boolean(input.usedFallback)}, ${input.errorCode || null})
  `);
}

async function updateConnectionHealth(connectionId: number, patch: { status?: string; healthStatus?: string; latency?: number | null; errorCode?: string | null; errorMessage?: string | null; success?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE aiProviderConnections
    SET status = COALESCE(${patch.status || null}, status),
        healthStatus = COALESCE(${patch.healthStatus || null}, healthStatus),
        averageLatencyMs = COALESCE(${patch.latency ?? null}, averageLatencyMs),
        lastErrorCode = ${patch.errorCode || null},
        lastErrorMessage = ${patch.errorMessage || null},
        lastValidatedAt = NOW(),
        lastSuccessfulAt = CASE WHEN ${Boolean(patch.success)} THEN NOW() ELSE lastSuccessfulAt END
    WHERE id = ${connectionId}
  `);
}

export function selectCandidates(connections: any[], settings: any, requirement: { requiresTools?: boolean; manualProvider?: AiProvider; manualModel?: string }) {
  const mode = settings.routingMode as RoutingMode;
  const pinned = jsonParse(settings.featurePolicies, {}).textBrainProvider;
  let candidates = connections.filter(connection => connection.isEnabled && connection.status === "connected" && connection.healthStatus !== "authentication_error" && connection.healthStatus !== "unavailable" && connection.encryptedCredential);
  if (pinned && pinned !== "automatic") {
    // An explicit brain selection never falls through to a different vendor.
    return candidates.filter(connection => connection.provider === pinned && (!settings.freeModelsOnly || (connection.provider !== "sarvam" && connection.isFreeTier)));
  }
  if (settings.freeModelsOnly || !settings.allowPaidFallback) candidates = candidates.filter(connection => connection.provider !== "sarvam" && connection.isFreeTier);
  if (mode === "manual" && requirement.manualProvider) candidates = candidates.filter(connection => connection.provider === requirement.manualProvider);
  if (mode === "fastest") candidates.sort((a, b) => Number(a.averageLatencyMs || 999999) - Number(b.averageLatencyMs || 999999));
  else if (mode === "best_quality") candidates.sort((a, b) => Number(a.priority || 100) - Number(b.priority || 100));
  else if (mode === "free_first") candidates.sort((a, b) => Number(Boolean(b.isFreeTier)) - Number(Boolean(a.isFreeTier)) || Number(a.priority || 100) - Number(b.priority || 100));
  else candidates.sort((a, b) => Number(a.priority || 100) - Number(b.priority || 100));
  return candidates;
}

async function callOpenAiCompatible(connection: any, apiKey: string, request: { messages: any[]; tools?: any; tool_choice?: any; model?: string }) {
  if (connection.provider === "sarvam") return callSarvam(apiKey, request);
  const baseUrl = providerBaseUrl(connection);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: request.model || connection.defaultModel, messages: request.messages, ...(request.tools ? { tools: request.tools, tool_choice: request.tool_choice || "auto" } : {}), temperature: 0.2 }),
  });
  if (!response.ok) {
    const text = await response.text();
    const error: any = new Error(`Provider request failed (${response.status})`);
    error.status = response.status;
    error.detail = text.slice(0, 300);
    throw error;
  }
  return response.json();
}

export class SelectedAiBrainError extends TRPCError {
  constructor(message: string) { super({ code: "PRECONDITION_FAILED", message }); }
}

/** Central normalized gateway used by application features. */
export async function invokeAiGateway(input: { agencyId: number; feature: string; messages: any[]; tools?: any; tool_choice?: any; manualProvider?: AiProvider; manualModel?: string }) {
  const settings = await getSettings(input.agencyId);
  const connections = await listConnections(input.agencyId);
  const candidates = selectCandidates(connections, settings, { manualProvider: input.manualProvider, manualModel: input.manualModel, requiresTools: Boolean(input.tools) });
  const mode = settings.routingMode as RoutingMode;
  const pinned = jsonParse(settings.featurePolicies, {}).textBrainProvider;
  const explicitlySelected = pinned && pinned !== "automatic";

  if (candidates.length === 0) {
    if (explicitlySelected) throw new SelectedAiBrainError("Selected AI brain is not enabled and verified. Review AI Providers settings.");
    if (mode === "manual" || settings.freeModelsOnly) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No eligible external AI provider is connected for the selected routing policy." });
    }
    const started = Date.now();
    try {
      const result = await invokeLLM({ messages: input.messages, tools: input.tools, tool_choice: input.tool_choice, model: "gpt-5-nano" });
      await logUsage({ agencyId: input.agencyId, provider: "builtin", modelId: "gpt-5-nano", feature: input.feature, routingMode: mode, latencyMs: Date.now() - started, success: true });
      return { result, provider: "builtin", model: "gpt-5-nano", usedFallback: false };
    } catch (error: any) {
      await logUsage({ agencyId: input.agencyId, provider: "builtin", modelId: "gpt-5-nano", feature: input.feature, routingMode: mode, latencyMs: Date.now() - started, success: false, errorCode: "builtin_failed" });
      throw error;
    }
  }

  let lastError: Error | null = null;
  for (let index = 0; index < candidates.length; index++) {
    const connection = candidates[index];
    const started = Date.now();
    try {
      const apiKey = decryptGatewayCredential(connection.encryptedCredential);
      const result = await callOpenAiCompatible(connection, apiKey, { messages: input.messages, tools: input.tools, tool_choice: input.tool_choice, model: index === 0 ? input.manualModel : undefined });
      const usage = result?.usage || {};
      await updateConnectionHealth(connection.id, { status: "connected", healthStatus: Date.now() - started > 4000 ? "slow" : "healthy", latency: Date.now() - started, success: true });
      await logUsage({ agencyId: input.agencyId, providerConnectionId: connection.id, provider: connection.provider, modelId: result?.model || connection.defaultModel, feature: input.feature, routingMode: mode, latencyMs: Date.now() - started, success: true, usedFallback: index > 0, inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens });
      return { result, provider: connection.provider, model: result?.model || connection.defaultModel, usedFallback: index > 0 };
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.status || 0);
      const healthStatus = status === 401 || status === 403 ? "authentication_error" : status === 429 ? "rate_limited" : "unavailable";
      await updateConnectionHealth(connection.id, { status: status === 429 ? "rate_limited" : "error", healthStatus, latency: Date.now() - started, errorCode: String(status || "provider_error"), errorMessage: String(error?.message || "Provider request failed").slice(0, 500), success: false });
      await logUsage({ agencyId: input.agencyId, providerConnectionId: connection.id, provider: connection.provider, modelId: connection.defaultModel, feature: input.feature, routingMode: mode, latencyMs: Date.now() - started, success: false, usedFallback: index > 0, errorCode: String(status || "provider_error") });
    }
  }
  if (explicitlySelected) throw new SelectedAiBrainError("Selected AI brain is unavailable. Please try again or change the brain in Settings.");
  throw new TRPCError({ code: "BAD_GATEWAY", message: "No configured AI provider could complete this request. Please try again shortly." });
}

const providerInput = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().min(8).max(2000).optional(),
  accountId: z.string().max(255).optional(),
  baseUrl: z.string().url().max(500).optional(),
  defaultModel: z.string().max(255).optional(),
  isEnabled: z.boolean().default(false),
  isFreeTier: z.boolean().default(false),
  priority: z.number().int().min(1).max(999).default(100),
});

export const aiGatewayRouter = router({
  catalog: protectedProcedure.query(() => Object.entries(PROVIDER_PRESETS).map(([id, preset]) => ({ id, ...preset }))),

  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const [settings, connections, usageResult] = await Promise.all([
      getSettings(agency.id), listConnections(agency.id), db.execute(sql`
        SELECT provider, COUNT(*) AS requestsToday, SUM(success = TRUE) AS successes, AVG(latencyMs) AS averageLatencyMs,
          SUM(usedFallback = TRUE) AS fallbackCount, SUM(estimatedCostInr) AS estimatedCostInr
        FROM aiGatewayUsage WHERE agencyId = ${agency.id} AND DATE(createdAt) = CURDATE() GROUP BY provider
      `),
    ]);
    const usage = normalizeRows(usageResult);
    return { settings: { ...settings, providerPriority: jsonParse(settings.providerPriority, []), featurePolicies: jsonParse(settings.featurePolicies, {}) }, connections: connections.map(cleanConnection), usage };
  }),

  selectTextBrain: protectedProcedure.input(z.object({ provider: z.enum(["automatic", "sarvam"]) })).mutation(async ({ ctx, input }) => {
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    await getSettings(agency.id);
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT agencyId FROM aiGatewaySettings WHERE agencyId = ${agency.id} FOR UPDATE`);
      if (input.provider === "sarvam") {
        const connection = normalizeRows(await tx.execute(sql`SELECT * FROM aiProviderConnections WHERE agencyId = ${agency.id} AND provider = 'sarvam' FOR UPDATE`))[0];
        if (!connection?.encryptedCredential || !connection.isEnabled || connection.status !== "connected" || !["healthy", "slow"].includes(connection.healthStatus))
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Save, test and enable Sarvam before using it as the AI brain." });
      }
      await tx.execute(sql`UPDATE aiGatewaySettings SET featurePolicies = JSON_SET(COALESCE(featurePolicies, JSON_OBJECT()), '$.textBrainProvider', ${input.provider}), freeModelsOnly = CASE WHEN ${input.provider} = 'sarvam' THEN FALSE ELSE freeModelsOnly END WHERE agencyId = ${agency.id}`);
    });
    // Does not modify any communication, calling, schedule or payment control.
    return { provider: input.provider };
  }),

  saveProvider: protectedProcedure.input(providerInput).mutation(async ({ ctx, input }) => {
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const preset = PROVIDER_PRESETS[input.provider];
    const existing = normalizeRows(await db.execute(sql`SELECT encryptedCredential FROM aiProviderConnections WHERE agencyId = ${agency.id} AND provider = ${input.provider} LIMIT 1`))[0];
    if (input.provider !== "builtin" && !input.apiKey && !existing?.encryptedCredential) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `${preset.credentialFields.find(field => field.key === "apiKey")?.label || "API key"} is required to save this provider.` });
    }
    if (input.provider === "cloudflare" && !input.accountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cloudflare Account ID is required." });
    const baseUrl = input.provider === "sarvam" ? SARVAM_BASE_URL : input.provider === "cloudflare" || input.provider === "builtin" ? null : normalizeGatewayBaseUrl(input.baseUrl || preset.defaultBaseUrl || "");
    if (input.provider === "sarvam" && input.defaultModel && input.defaultModel !== SARVAM_MODEL) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose sarvam-105b for the Sarvam AI brain." });
    const encryptedCredential = input.apiKey ? encryptGatewayCredential(input.apiKey) : null;
    const hint = input.apiKey ? maskCredential(input.apiKey) : null;
    await db.execute(sql`
      INSERT INTO aiProviderConnections (agencyId, provider, connectionType, status, healthStatus, encryptedCredential, credentialHint, accountId, baseUrl, defaultModel, isEnabled, isFreeTier, priority)
      VALUES (${agency.id}, ${input.provider}, ${preset.connectionType}, ${input.provider === "builtin" ? "connected" : "configuration_required"}, ${input.provider === "builtin" ? "healthy" : "unknown"}, ${encryptedCredential}, ${hint}, ${input.accountId || null}, ${baseUrl}, ${input.defaultModel || preset.defaultModel || null}, ${input.isEnabled}, ${input.provider === "sarvam" ? false : input.isFreeTier}, ${input.priority})
      ON DUPLICATE KEY UPDATE connectionType = VALUES(connectionType), encryptedCredential = COALESCE(VALUES(encryptedCredential), encryptedCredential), credentialHint = COALESCE(VALUES(credentialHint), credentialHint), accountId = VALUES(accountId), baseUrl = VALUES(baseUrl), defaultModel = VALUES(defaultModel), isEnabled = VALUES(isEnabled), isFreeTier = VALUES(isFreeTier), priority = VALUES(priority), status = CASE WHEN VALUES(encryptedCredential) IS NOT NULL THEN 'configuration_required' ELSE status END, healthStatus = CASE WHEN VALUES(encryptedCredential) IS NOT NULL THEN 'unknown' ELSE healthStatus END
    `);
    const connection = normalizeRows(await db.execute(sql`SELECT * FROM aiProviderConnections WHERE agencyId = ${agency.id} AND provider = ${input.provider} LIMIT 1`))[0];
    return cleanConnection(connection);
  }),

  disconnectProvider: protectedProcedure.input(z.object({ provider: z.enum(AI_PROVIDERS) })).mutation(async ({ ctx, input }) => {
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    await db.execute(sql`UPDATE aiProviderConnections SET encryptedCredential = NULL, encryptedExtraCredentials = NULL, credentialHint = NULL, isEnabled = FALSE, status = 'not_connected', healthStatus = 'unknown', lastErrorCode = NULL, lastErrorMessage = NULL WHERE agencyId = ${agency.id} AND provider = ${input.provider}`);
    return { success: true };
  }),

  updateSettings: protectedProcedure.input(z.object({
    routingMode: z.enum(["auto", "fastest", "free_first", "best_quality", "manual"]),
    freeModelsOnly: z.boolean(), allowPaidFallback: z.boolean(), monthlyBudgetInr: z.number().min(0).max(10000000),
    warningThresholdPercent: z.number().int().min(1).max(99), criticalThresholdPercent: z.number().int().min(2).max(100), providerPriority: z.array(z.enum(AI_PROVIDERS)).max(20), featurePolicies: z.record(z.string(), z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (input.criticalThresholdPercent <= input.warningThresholdPercent) throw new TRPCError({ code: "BAD_REQUEST", message: "Critical threshold must be higher than warning threshold." });
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    await db.execute(sql`
      INSERT INTO aiGatewaySettings (agencyId, routingMode, freeModelsOnly, allowPaidFallback, monthlyBudgetInr, warningThresholdPercent, criticalThresholdPercent, providerPriority, featurePolicies)
      VALUES (${agency.id}, ${input.routingMode}, ${input.freeModelsOnly}, ${input.allowPaidFallback}, ${input.monthlyBudgetInr}, ${input.warningThresholdPercent}, ${input.criticalThresholdPercent}, ${JSON.stringify(input.providerPriority)}, ${JSON.stringify(input.featurePolicies || {})})
      ON DUPLICATE KEY UPDATE routingMode = VALUES(routingMode), freeModelsOnly = VALUES(freeModelsOnly), allowPaidFallback = VALUES(allowPaidFallback), monthlyBudgetInr = VALUES(monthlyBudgetInr), warningThresholdPercent = VALUES(warningThresholdPercent), criticalThresholdPercent = VALUES(criticalThresholdPercent), providerPriority = VALUES(providerPriority), featurePolicies = VALUES(featurePolicies)
    `);
    return getSettings(agency.id);
  }),

  testProvider: protectedProcedure.input(z.object({ provider: z.enum(AI_PROVIDERS) })).mutation(async ({ ctx, input }) => {
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const connection = normalizeRows(await db.execute(sql`SELECT * FROM aiProviderConnections WHERE agencyId = ${agency.id} AND provider = ${input.provider} LIMIT 1`))[0];
    if (!connection) throw new TRPCError({ code: "NOT_FOUND", message: "Provider has not been configured." });
    if (input.provider === "builtin") return { success: true, models: PROVIDER_PRESETS.builtin.staticModels, latencyMs: 0 };
    if (!connection.encryptedCredential) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Add a provider credential before testing the connection." });
    const started = Date.now();
    try {
      const models = await fetchModelList(connection, decryptGatewayCredential(connection.encryptedCredential));
      // A model-list response alone does not prove chat inference is usable. Run one
      // tiny admin-triggered request; this result is never exposed to normal users.
      await callOpenAiCompatible(connection, decryptGatewayCredential(connection.encryptedCredential), {
        model: connection.defaultModel,
        messages: [{ role: "user", content: "Reply with OK." }],
      });
      await db.execute(sql`DELETE FROM aiProviderModels WHERE providerConnectionId = ${connection.id}`);
      for (const model of models.slice(0, 100)) {
        await db.execute(sql`INSERT INTO aiProviderModels (providerConnectionId, modelId, displayName, categories, capabilities, isFree, isAvailable) VALUES (${connection.id}, ${model.modelId}, ${model.displayName}, ${model.categories}, ${model.capabilities}, ${model.isFree}, TRUE)`);
      }
      await updateConnectionHealth(connection.id, { status: "connected", healthStatus: Date.now() - started > 4000 ? "slow" : "healthy", latency: Date.now() - started, success: true });
      return { success: true, models, latencyMs: Date.now() - started };
    } catch (error: any) {
      const status = Number(error?.status || 0);
      await updateConnectionHealth(connection.id, { status: "error", healthStatus: status === 401 || status === 403 ? "authentication_error" : "unavailable", latency: Date.now() - started, errorCode: String(status || "validation_failed"), errorMessage: String(error?.message || "Provider validation failed").slice(0, 500), success: false });
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Provider validation failed. Check the credential and provider configuration." });
    }
  }),

  providerModels: protectedProcedure.input(z.object({ provider: z.enum(AI_PROVIDERS) })).query(async ({ ctx, input }) => {
    const agency = await agencyForUser(ctx.user.id);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
    const connection = normalizeRows(await db.execute(sql`SELECT id FROM aiProviderConnections WHERE agencyId = ${agency.id} AND provider = ${input.provider} LIMIT 1`))[0];
    if (!connection) return PROVIDER_PRESETS[input.provider].staticModels;
    const models = normalizeRows(await db.execute(sql`SELECT modelId, displayName, categories, capabilities, isFree, isAvailable FROM aiProviderModels WHERE providerConnectionId = ${connection.id} ORDER BY modelId ASC`));
    return models.length ? models.map(model => ({ ...model, categories: jsonParse(model.categories, []), capabilities: jsonParse(model.capabilities, []) })) : PROVIDER_PRESETS[input.provider].staticModels;
  }),

  playground: protectedProcedure.input(z.object({ provider: z.enum(AI_PROVIDERS).optional(), model: z.string().max(255).optional(), prompt: z.string().min(1).max(4000), routingMode: z.enum(["auto", "fastest", "free_first", "best_quality", "manual"]).optional() })).mutation(async ({ ctx, input }) => {
    const agency = await agencyForUser(ctx.user.id);
    const settings = await getSettings(agency.id);
    if (input.routingMode) {
      settings.routingMode = input.routingMode;
    }
    const started = Date.now();
    const response = await invokeAiGateway({ agencyId: agency.id, feature: "gateway_playground", messages: [{ role: "user", content: input.prompt }], manualProvider: input.provider, manualModel: input.model });
    const content = response.result?.choices?.[0]?.message?.content || "No text response.";
    return { content: typeof content === "string" ? content : JSON.stringify(content), provider: response.provider, model: response.model, usedFallback: response.usedFallback, latencyMs: Date.now() - started };
  }),
});
