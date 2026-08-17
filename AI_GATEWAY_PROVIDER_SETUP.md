# Sales Squad AI Gateway — Provider Setup

## What Is Implemented

The AI Gateway is now the centralized server-side route for Klaus. Provider credentials are encrypted at rest using the project server secret, masked after saving, scoped to the current agency, and excluded from responses, logs, URLs, and client-side storage. The gateway records only operational metadata—provider, model, latency, success/failure, and fallback status—not prompt content or secret values.

The Settings → **Integrations · AI Providers** screen supports configuration, model discovery where supported, a small connection test, provider health, usage summaries, routing policy, free-first controls, and an administrator test console. A legacy Klaus connection remains available as a migration fallback so the existing assistant behavior is not removed before you configure a new provider.

## Connection Method by Provider

| Provider | Current connection method | Secure inputs required | Discovery and validation |
|---|---|---|---|
| Google Gemini | Server-side API key | Gemini API Key | Lists Gemini models, then executes a short chat validation. |
| Groq | Server-side API key | Groq API Key | Lists OpenAI-compatible models, then executes a short chat validation. |
| OpenRouter | Server-side API key | OpenRouter API Key | Lists catalogue models, then executes a short chat validation. |
| Cloudflare Workers AI | Server-side API token | Cloudflare Account ID and API Token | Uses the configured account endpoint and short chat validation. |
| Mistral | Server-side API key | Mistral API Key | Lists models, then executes a short chat validation. |
| Hugging Face | Server-side user token | Hugging Face Token | Lists router models, then executes a short chat validation. |
| OpenAI | Server-side API key | OpenAI API Key | Lists models, then executes a short chat validation. |
| Custom OpenAI-compatible | Server-side API key | API Key, public HTTPS endpoint, model ID | Uses the provider’s OpenAI-compatible models endpoint and a short chat validation. |

## OAuth Status

Most provider APIs use server-side API credentials for third-party application access. The integration page deliberately uses credential configuration rather than showing a fake OAuth button. OpenRouter and Gemini can support OAuth-related patterns, but a real one-click connection requires an application registration and client ID/secret controlled by the product owner. Those app-registration credentials have not been supplied, so no OAuth flow is displayed or simulated.

| Provider | OAuth action today | What is required before a real Connect button can be enabled |
|---|---|---|
| Gemini | API key configuration | A registered Google OAuth client, verified redirect URI, and approved scopes. |
| OpenRouter | API key configuration | A registered OpenRouter OAuth client and callback configuration. |
| Groq, Cloudflare Workers AI, Mistral, Hugging Face, OpenAI | API credential configuration | Their normal API access path is token/key based for this application use case. |

## Safe Routing Defaults

The default preserves existing Klaus availability. After you connect a free-tier provider, enable **Free models only** to ensure the gateway never selects a provider that is not marked free-tier capable. Paid providers are excluded until **Allow paid fallback** is explicitly enabled. Routing uses connected status, health, priority, free-tier marking, and selected mode (`Auto`, `Fastest`, `Free First`, `Best Quality`, or `Manual`). Runtime failures, rate limits, and authentication failures are recorded and the gateway tries the next compatible configured provider.

> The platform can record application-side request counts, latency, success rate, fallback count, and token fields returned by a provider. It cannot honestly display a provider’s live remaining free quota or exact invoice amount unless that provider exposes such data through its API. The interface therefore treats quota/cost as operational estimates, not guaranteed billing data.

## Recommended First Configuration

1. Configure **Groq** or **Gemini** first with an eligible account key and one fast model.
2. Save the configuration with routing initially disabled, then use **Test connection**. The provider is shown as Connected only after model discovery and a small test request succeed.
3. Set the provider as enabled, enable **Free models only**, and keep **Allow paid fallback** disabled.
4. Ask Klaus a data question and check the AI Gateway usage card for provider, model, latency, and fallback status.
5. Add OpenRouter or another provider only as a secondary fallback after the first provider is working.

## Credential Security Rules

Do not paste credentials into source code, URL query strings, browser local storage, GitHub, or support messages. Use the masked credential field in Settings → Integrations and replace a credential rather than attempting to view it. Disconnecting a provider removes its encrypted credential and disables it from all routing.

## References

[1] [Google AI — Gemini API authentication and OAuth](https://ai.google.dev/gemini-api/docs/oauth)

[2] [Groq — OpenAI compatibility and model API](https://console.groq.com/docs/openai)

[3] [OpenRouter — OAuth and API authentication](https://openrouter.ai/docs/guides/overview/auth/oauth)

[4] [Cloudflare — Workers AI OpenAI compatibility](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/)

[5] [Mistral — Chat and models API](https://docs.mistral.ai/api/)

[6] [Hugging Face — Inference Providers](https://huggingface.co/docs/inference-providers/en/index)

[7] [OpenAI — API reference](https://developers.openai.com/api/reference/overview)
