# Sales Squad reporting repair

GitHub is the source of truth. This release fixes reporting and unfinished pages; it does not activate communication channels or payment processing.

## Changes

- Dashboard and Copilot recommendations use the same evidence scoring as Leads.
- Copilot lead reporting and deletion are scoped to the current agency. Daily summary includes actual unassigned leads and uses India day boundaries for leads, email sends, and outreach runs.
- Email engagement is labelled as an all-time business count rather than today's total opens. Engagement does not claim confirmed buying interest.
- North Star counts each lead and campaign cost once even when a lead has multiple deliveries; revenue and commission still sum all deliveries.
- Legacy partner statuses display in signup filters and counters, and missing signup dates display as unavailable.
- Outreach planning no longer displays invented performance statistics. The solar resource page explains that no video is available rather than showing nonworking buttons and unverified savings claims.
- The old WhatsApp credentials page points to the existing platform controls. Referral and partner pages no longer promise unavailable OTP, immediate payouts, or phone verification.
- Pages load on demand instead of shipping every route in the initial bundle. Dashboard loading and errors no longer appear as zero metrics or an empty agency setup.

## Validation and deployment

1. Run `pnpm check`, `pnpm test`, and `pnpm build`; GitHub CI must pass.
2. Sync the merged GitHub commit into the existing Sales Squad Manus task. Do not create a second project, deployment, or database.
3. This release contains no SQL migration. Confirm the existing migrations through `0016` are already applied; do not reset the database.
4. Run the production verifier and `/api/health`. Review Dashboard, Copilot, Leads, North Star, partner signups, outreach planning, solar resources, and Settings.
5. Publish the validated Manus checkpoint to the existing URL, then verify the live pages again. A GitHub merge alone does not publish the website.
6. Keep email, WhatsApp, SMS/OTP, schedules, outreach, and payment processing disabled.

## Remaining launch inputs and work

- A valid AI provider credential must be entered securely and validated. The audited Groq configuration returned an authentication error.
- Real panels, inverters, current installer pricing, state/DISCOM inputs, and owner-approved estimate policy are required before monetary estimates can be enabled.
- Confirm agency city/state and missing contact details on the production account.
- Review existing duplicate businesses and leads, preserving history. Do not delete production records automatically.
- WhatsApp and payouts have incomplete provider adapters; credentials alone do not make them operational. These require implementation and provider testing before activation.
- Verify referrer signup, partner signup, lead assignment, payment/withdrawal flows, and outbound delivery using approved test accounts and recipients before calling the entire product ready.
