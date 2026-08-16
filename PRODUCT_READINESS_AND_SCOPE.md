# Sales Squad Leads — Production Readiness & Scope Guide

## Current Readiness

The application is now **code-ready for a controlled production launch**. It compiles cleanly and has 155 passing automated tests. The core lead, partner, referrer, dashboard, chatbot, and secure provider-configuration paths are usable.

It is **not yet operationally ready for unattended outreach** because the configured SMTP account rejects authentication. All nine outbound schedules have therefore been intentionally paused. Automated email, follow-up email, and onboarding email must remain paused until valid sender credentials and sender-domain DNS are verified. WhatsApp delivery is also intentionally unconfigured; the application opens a manual WhatsApp draft but does not claim it was sent.

| Area | Status | What remains before live use |
|---|---|---|
| Admin dashboard, lead storage, partner/referrer flows | Ready for controlled use | Complete final user acceptance testing with real accounts. |
| Klaus built-in provider | Ready | Use the existing provider setting, or configure an external provider. |
| External Klaus provider options | Ready to configure | Add `KLAUS_EXTERNAL_API_KEY` securely, choose a provider and model in **Settings → Integrations**. |
| Automated email outreach | Safely paused | Provide valid SMTP credentials, configure SPF/DKIM/DMARC, run internal delivery tests, then enable one slot. |
| WhatsApp automation and phone OTP | Intentionally disabled | Connect a verified WhatsApp Business or SMS provider and test templates/webhooks. |
| Payments and referral payouts | Protect the admin controls | Keep public payout claims conservative until funding, payment workflow, and reconciliation are operating. |

## Klaus Provider Options

Klaus supports one active provider per agency. The configuration is in **Settings → Integrations → Klaus AI Engine**. The API key is never entered into the dashboard or sent to the browser; it remains a server-side secret.

| Option | Base URL preset | Notes |
|---|---|---|
| Built-in model | Internal | Current safe default. |
| OpenAI | `https://api.openai.com/v1` | Requires your own OpenAI-compatible key and enabled model. |
| Groq | `https://api.groq.com/openai/v1` | Uses Groq's OpenAI-compatibility endpoint. [1] |
| OpenRouter | `https://openrouter.ai/api/v1` | Provides a unified OpenAI-compatible chat-completions endpoint. [2] |
| Together AI | `https://api.together.ai/v1` | Supports OpenAI-shaped chat completions and function calling. [3] |
| Custom / Ollama-compatible | Your public HTTPS endpoint | The production app deliberately rejects local HTTP endpoints; a hosted endpoint must be reachable over HTTPS. |

> A provider may offer a free tier or open models at a given time, but availability, limits, model access, and commercial terms are controlled by that provider. The app does not treat any external model as unlimited or guaranteed-free.

## Add Before Scaling

| Priority | Add | Reason |
|---|---|---|
| P0 | SMTP credentials plus SPF, DKIM, DMARC, and an unsubscribe/opt-out policy | Required for safe, deliverable commercial email. |
| P0 | Real WhatsApp Business integration with approved templates and webhook status updates | Required before automated WhatsApp or phone verification can be truthful. |
| P1 | Delivery/bounce/reply monitoring and owner alerts | Ensures failed jobs are noticed the same day. |
| P1 | A manual review queue for leads before partner assignment | Keeps lead quality and accountability under your control. |
| P2 | Per-partner access/usage limits and audit dashboards | Useful only after multiple active partner companies are onboarded. |

## Defer or Keep Disabled

| Item | Decision | Why |
|---|---|---|
| Automated WhatsApp send status | Keep disabled | Do not report delivery without a provider callback. |
| Phone OTP | Keep disabled | Do not promise verification before a real channel is configured. |
| Exact business system pricing/subsidy promises | Keep conservative | Final commercial feasibility requires site review and applicable tax/legal confirmation. |
| Broad five-slot outreach | Do not enable initially | Start with one email-only slot and review deliverability, complaints, replies, and lead quality before scaling. |
| Extra marketing-automation modules | Defer | The core lead-to-partner workflow should be proven before adding new channels. |

## References

[1] [Groq OpenAI Compatibility](https://console.groq.com/docs/openai)

[2] [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart)

[3] [Together AI OpenAI Compatibility](https://docs.together.ai/docs/inference/openai-compatibility)
