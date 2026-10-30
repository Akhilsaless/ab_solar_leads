# Optional Sarvam AI brain

Sales Squad Core retains lead capture, agency workspaces, surveys and proposals. Sarvam is an optional text provider for customer chat and Klaus.

## Setup

In Settings > Integrations > AI Providers, choose Sarvam AI, enter your subscription key, mark it eligible for routing, and save. Test connection sends one small paid request. Then choose Use Sarvam as AI brain. A saved key alone does not change routing. Leave the key field empty when updating other settings to retain the existing encrypted key.

Only an enabled, verified connection belonging to the current agency can be selected. Selected Sarvam requests never fall back to another vendor; customer chat retains its local response fallback. No credentials are included in this release.

## Separate paid workflow

Entering a text API key does not activate voice calls, WhatsApp follow-up, bill OCR, schedules or payments. The proposed AI Follow-up add-on still needs its own provider integration, limits and agency usage billing. The budget displayed in AI settings is a planning target, not an enforced cap. Set a provider-side budget before production.

## Implementation

The adapter uses https://api.sarvam.ai/v2/chat/completions with api-subscription-key authentication and sarvam-105b. Requests time out after 12 seconds and output is capped at 1,024 tokens. Provider error bodies are not stored. Existing OCR is separate.

No schema migration is required: the provider field is VARCHAR and explicit selection uses the existing featurePolicies JSON column. A GitHub merge does not publish the Manus site. Use the existing reviewed deployment path without starting a paid Manus development task.

Official API reference: https://docs.sarvam.ai/api-reference/chat/chat-completions-v2
