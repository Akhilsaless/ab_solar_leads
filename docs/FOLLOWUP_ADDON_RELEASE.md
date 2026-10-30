# AI Follow-up add-on release

This extends the existing Sales Squad application and database. Core lead capture continues while the add-on is paused. No new hosting service or n8n instance is required.

## Implemented

- Agency-scoped encrypted provider setup; empty secret edits preserve saved values. Saving setup pauses automation.
- Optional Sarvam text brain remains in AI Providers. The add-on has a separate Sarvam voice workspace key; Document AI can reuse the text API key or use its own override.
- Signed Meta Lead Ads webhook inbox and an authenticated consented CRM intake endpoint. Native Meta ingestion validates the Page, lead ID, consent answer and consent age. Failed records are reviewable and retryable.
- Automatic or manual qualification calls, bounded attempts, 09:00-20:00 IST dispatch, persistent work queue, unique per-attempt callback capabilities, transcripts and authenticated recording retrieval.
- Explicit qualification gates: monthly bill threshold, boolean roof ownership, boolean survey intent and configured pincode coverage. Model strings are not accepted as boolean consent.
- Optional routing to explicitly selected installers through the existing coverage/readiness checks. Assignment is separate from installer acceptance.
- Voice booking tool returns actual installer slots and books transactionally after affirmative customer confirmation. It requires installer acceptance; no accepted installer or available slot means handoff, never an invented booking.
- Missed-call WhatsApp bill follow-up through the existing agency account, approved template, consent and phone verification checks. Lack of verified WhatsApp contact blocks sending rather than weakening Core privacy controls.
- Signed inbound WhatsApp PNG/JPEG images enter Sarvam Document AI. Each image is size/type/signature checked. Images are limited to a single bill page; PDF is deliberately excluded from this prepaid add-on because page counts affect cost. Extracted data requires an agency operator to confirm it before updating the lead.
- Prepaid paise ledger, maximum-cost reservations, monthly usage limits and exactly-once settlement. Concurrent workers cannot spend the same balance. A timeout with an unknown provider outcome holds its reservation until reconciliation. Usage above the reserved duration pauses the account and records the overrun.
- Owner-only recording of received payments with unique references; no simulated payment or payout. These are customer usage charges, not provider invoices. Supplier rates and taxes must be reconciled independently.
- Legacy public bill OCR now requires a receipt from the same chat session, reads each upload at most once, caches results and limits daily uploads. URLs cannot be supplied directly to trigger arbitrary paid OCR.

## Deployment

1. Merge the prerequisite Sarvam text-brain PR, then this release, after CI passes. CI runs wallet concurrency tests against its disposable MySQL database.
2. Back up the existing database and apply additive migration `0020_followup_addon.sql` to staging first. Existing migrations through 0019 must be installed. Never reset production.
3. Publish through the supported existing Manus release path. A GitHub push does not prove the site was published. Do not start a paid Manus agent merely to sync.
4. Set the existing server secret `SOLAR_OPERATIONS_CRON_SECRET`. Run authenticated POST requests to both `/api/scheduled/solar-followup` and `/api/scheduled/solar-whatsapp` every minute. Use `Authorization: Bearer <server scheduler secret>`; do not expose it to customers.
5. Inspect Settings > AI Follow-up, wallet balances and failed jobs using synthetic accounts before opening a pilot. The add-on is OFF and has zero credit initially.

## Provider setup after coding

- AI Providers: optional Sarvam model API subscription key for text. The same key may be used for Document AI if entitled.
- Follow-up setup: Sarvam workspace API key for voice, org ID, workspace ID, published agent ID/version, telephony connection ID and verified Indian calling number.
- Set the maximum duration in the published Sarvam agent to the same value as the app. The instant outbound API does not expose a per-request hard-duration setting. Confirm this upstream setting before enabling; application reservations cannot physically stop a carrier call. Verify commercial rates, provider credit limits and margins before launch.
- Configure the existing agency Meta WhatsApp account and approved template as documented in `docs/PARTNER_LED_RELEASE.md`. The add-on does not create or purchase a WhatsApp account or phone number.
- For Meta Lead Ads, enter app secret, Page token, Page ID, webhook verification token and Graph version supported by your app. Subscribe the Page's leadgen events to `/api/followup/meta/<agencyId>`. Request the necessary Meta permissions and form access. Lead fields must include `full_name`, `phone_number`, `city`, `zip_code` (or `pincode`), `monthly_bill`, and an affirmative configured callback-consent question. `whatsapp_consent` is separate. Store the exact disclosure in setup. Missing consent stays in human review.
- Configure service pincodes, optional routing partner IDs, maximum attempts, customer prices, monthly limit and opt-in controls. Only the platform owner may route across agencies.
- Record a real reconciled prepaid payment in the owner panel. A ledger credit is not a gateway payment. Online automatic payment capture is not enabled by this release.

## Consented CRM intake

POST `/api/followup/intake/<agencyId>` with `Authorization: Bearer <agency intake token>` and JSON:

```json
{"externalId":"your-stable-lead-id","name":"Synthetic Customer","phone":"+919999999999","city":"Hyderabad","pincode":"500001","monthlyBill":2500,"consent":true,"consentText":"Exact disclosure the customer accepted about the requested solar callback.","consentAt":"2026-10-30T00:00:00Z","whatsappConsent":false}
```

Use the actual consent time, within 30 days. Only send leads for the agency that received permission. Stable IDs and normalized phone keys deduplicate retries. Submitting a number is not evidence of consent.

## Voice agent contract

Configure native Telugu, Hindi or English speech; disclose that the call is an AI assistant for the named agency and that recording is used for the solar enquiry. Respect refusal and opt-out immediately. Ask one question at a time. Never guarantee subsidy, savings, financing eligibility or structural suitability. Do not repeat known facts.

Collect final agent variables as typed fields:

- `monthly_bill`: number in INR
- `roof_owner`: boolean, true only after explicit confirmation of exclusive roof rights
- `pincode`: six-digit string
- `survey_requested`: boolean, true only after explicit customer request
- `opt_out`: boolean, true when the customer asks to stop contact; this revokes consent and stops subsequent jobs

A statement of interest is not an appointment. Configure an API tool named `solar_survey` as POST `/api/followup/voice-tools/<agencyId>`, with `Authorization: Bearer <separate voice booking tool token>` from setup. Pass the real user identifier from Sarvam runtime as `phone`, not a model-invented number. To list slots use `{"phone":"<runtime user identifier>","action":"slots"}`. To book use `{"phone":"<runtime user identifier>","action":"book","slotId":123,"confirmed":true}` only after the customer chooses that returned slot. Say an appointment is confirmed only when the tool returns `booked:true`. Otherwise record the request and offer human follow-up.

The outbound API receives a separate random callback URL for each attempt. Treat this URL as a secret capability: restrict access logs and provider dashboard access. Do not publish callback URLs. Callback replay cannot settle twice.

## End-to-end acceptance before activation

Test synthetic opt-in and opt-out, duplicate Meta events, missing consent, wrong Page signatures, non-service pincodes, no answer, busy, rejected credentials, provider timeouts, callback-before-response, repeated callbacks, no installer, expired slots, two callers racing for one slot, low wallet, month rollover, billing overrun, paused account, global emergency stop, unsupported/blurry bills and cross-agency requests. Compare provider attempt/message IDs with the operations ledger and actual supplier invoice.

Without provider credentials, local/CI tests verify contracts and state transitions using synthetic responses. Real call quality, account permissions, templates, delivery, pricing and the deployed browser journey cannot be certified until those accounts are connected.
