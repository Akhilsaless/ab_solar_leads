export const SARVAM_BASE_URL = "https://api.sarvam.ai/v2";
export const SARVAM_MODEL = "sarvam-105b";

/** Text AI only. Voice, telephony and document OCR are separate integrations. */
export async function callSarvam(apiKey: string, request: {
  messages: any[]; tools?: any[]; tool_choice?: any; model?: string;
}) {
  if (request.model && request.model !== SARVAM_MODEL)
    throw new Error("Choose sarvam-105b for the Sarvam AI brain.");
  const response = await fetch(`${SARVAM_BASE_URL}/chat/completions`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(12000),
    headers: { "api-subscription-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SARVAM_MODEL, messages: request.messages, max_tokens: 1024, temperature: 0.2,
      ...(request.tools?.length ? { tools: request.tools, tool_choice: request.tool_choice || "auto" } : {}),
    }),
  });
  if (!response.ok) {
    // Provider bodies may echo secrets or customer data; never persist them.
    throw Object.assign(new Error(`Sarvam request failed (${response.status})`), { status: response.status });
  }
  const result = await response.json();
  const message = result?.choices?.[0]?.message;
  if (!message || (!(typeof message.content === "string" && message.content.trim()) && !message.tool_calls?.length))
    throw new Error("Sarvam returned no answer or tool call.");
  return result;
}
