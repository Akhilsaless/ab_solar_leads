# Sales Squad Leads — Production-Readiness Audit

**Audit date:** 16 August 2026  
**Scope:** Current deployed codebase and live configuration state. This is a **repair/hardening assessment**, not a redesign proposal.

> **Bottom line:** Sales Squad is a working internal prototype and controlled-demo platform, but it is **not ready for unattended production outreach or public partner/referrer operations**. Do not rely on it to send business emails, report WhatsApp delivery, pay referrers, or protect partner/referrer data until the blocking issues below are resolved.

## Honest readiness score

| Operating context | Readiness | Assessment |
|---|---:|---|
| Owner-controlled dashboard, manual exploration and internal demos | **55%** | The dashboard, database, lead views, chatbot flow, and basic scheduling structure exist. TypeScript reports no errors and the existing test suite passes. |
| Controlled pilot with no real money, no real outreach, and manually supervised data | **40%** | Possible after email credentials are repaired and dangerous automation is kept off, but authentication and public endpoints remain incomplete. |
| Live automated email outreach to real businesses | **20%** | SMTP authentication currently fails, pause controls are not correctly enforced by the active scheduler, and the live handler can report WhatsApp sends without sending WhatsApp. |
| Public referrer/partner service handling personal data and payouts | **15%** | Signup/login/session and upload protections require substantial hardening before public use. |

## What is working today

| Area | Current evidence | Status |
|---|---|---|
| Build quality | TypeScript reports **0 errors**. | Good baseline |
| Automated test suite | **153 tests across 6 test files pass.** | Useful baseline, but does not cover critical production paths below. |
| Database content | Live tables contain **5 partners, 12 referrers, and 33 leads**. | Data persistence exists. |
| Scheduled jobs | **9 jobs** are registered, including the five outreach slots, follow-ups, onboarding, and daily digest. | Scheduler infrastructure exists, but all are enabled. |
| UI and internal workflows | Dashboard, leads, chatbot, partner/referrer sections, and analytics have active implementations. | Suitable for owner testing. |

## Production blockers — fix before enabling real outreach

| Priority | Problem found | Why it matters | Required fix |
|---|---|---|---|
| **P0** | **SMTP login fails.** Startup reports `535-5.7.8 Username and Password not accepted`. | Emails may not send at all. Every email workflow—including outreach, OTP, partner notices, and follow-ups—is unreliable. | Replace/verify SMTP credentials and sender domain; perform a controlled delivery test to Gmail and Outlook before enabling schedules. |
| **P0** | **The active scheduled handler does not enforce pause state.** `/api/scheduled/autoOutreach` calls `autoOutreachHandler`, which reads a config and starts a run without checking `isEnabled`. | A paused dashboard can still result in new outreach runs and real email attempts. This is exactly the issue you reported. | Implement pause checking in `autoOutreachHandler` **before creating a run** and **immediately before every send**. Return `skipped_paused` and create no messages when off. |
| **P0** | **WhatsApp counts are false.** The live handler increments `whatsappSentCount` while the code explicitly labels WhatsApp as a placeholder. | The dashboard can claim WhatsApp activity even though no WhatsApp message was delivered. | Keep WhatsApp disabled and report `0 sent` until a real protected WhatsApp Business API integration is complete. |
| **P0** | **Multiple active automation configurations exist.** The live database has nine `outreachConfig` rows for the same agency; several are enabled. The live runner uses `LIMIT 1` without ordering. | The selected city/contact method can be arbitrary, so toggle/state behavior is not deterministic. | Migrate to one agency-scoped master config with a unique `agencyId` constraint; archive duplicate rows after choosing the intended values. |
| **P0** | **All nine scheduled jobs are enabled.** | Scheduled handlers will continue to execute automatically, even while email credentials or pause logic are not ready. | Disable all outreach-related schedules until P0 fixes are verified. Re-enable only after a controlled pilot. |
| **P0** | **Financial and subsidy claims are not aligned with your instructions.** The active handler still generates “government subsidies” and hard-coded monthly savings/ROI ranges. | This can create misleading outreach content and commercial/reputation risk. | Replace generated prompt/fallbacks with approved conservative wording: approximate savings only, site-survey dependent, no business subsidy claim, and GST/depreciation language only where applicable. |

## Security and privacy blockers

| Priority | Problem found | Impact | Required fix |
|---|---|---|---|
| **P0** | `VITE_FRONTEND_FORGE_API_KEY` is referenced by the browser-side map/chat/upload flows. | Values prefixed with `VITE_` are exposed to the client bundle; this is not acceptable for bearer credentials. | Remove client-side bearer-key usage. Move uploads and sensitive API calls to authenticated server procedures or short-lived signed URLs. |
| **P0** | Referrer OTP uses `Math.random()`, stores raw OTPs, has no demonstrated request/IP limits or verification-attempt limit. | OTPs can be brute-forced or abused for email spam. | Use cryptographic random OTPs, hash stored values, enforce ten-minute expiry, resend cooldown, per-email/IP limits, and attempt counters. |
| **P0** | Referrer `setPassword` accepts only email + password and returns a durable token. | Anyone who knows a referrer email could reset the account password. | Require one-time, expiring password-setup/reset token issued after OTP verification. |
| **P0** | Referrer dashboard uses public `uniqueCode` lookup; session tokens are not verified server-side for dashboard access. | A referral code can expose another person’s dashboard data. | Implement server-validated expiring session tokens; do not authenticate dashboards with referral codes. |
| **P0** | Partner login/session/profile/lead routes remain public procedures using raw browser token inputs. `setPartnerPassword` accepts only email + password. | Partner account takeover and cross-partner data access remain possible. | Implement invitation/reset tokens, hashed/expiring sessions, server-side authorization for every lead/profile mutation, and generic login errors with rate limits. |
| **P0** | `partner.referrerSendOutreachEmail` is public and accepts custom message HTML plus recipient details. | It can be abused as an anonymous email relay. | Require valid referrer session, verify ownership, sanitize HTML, add suppression lists and per-user/recipient/IP limits. |
| **P1** | Partner upload procedure accepts any external URL and uses public login token input. | A user can store unsafe or unrelated URLs as product/pricing files. | Use protected server-side uploads, MIME/size checks, server-controlled storage keys, and disable UI until secure upload exists. |
| **P1** | Unauthenticated users are routed to `Home` rather than a clear owner-login page when accessing protected areas. | Auth boundary is ambiguous and protected API calls can be attempted from the wrong page state. | Redirect unauthenticated owner routes to login after the loading screen resolves; keep only documented public routes public. |

## Automation design findings

The automation code has two overlapping implementations. The scheduled jobs call `autoOutreachHandler.ts`; `outreachScheduler.ts` has a separate `runAutomatedOutreach()` implementation with no caller found in the project. The recent master-toggle change was made in the **unused** scheduler, not the active scheduled handler. Therefore it does not currently guarantee that a pause stops real scheduled outreach.

The active handler also hard-codes `agencyId = 1` in configuration lookup, database records, duplicate checks, and contact updates. That is acceptable only for a strictly single-agency internal prototype. It must be removed before onboarding multiple agencies or selling the platform.

The current runner creates an outreach run before any pause check, lacks an agency/date/slot unique idempotency key, and does not lock overlapping runs. Two triggered jobs can therefore scrape and attempt the same contact list at the same time.

## Unnecessary, duplicate, or misleading code to remove safely

Do **not** remove code just to reduce line count. Remove only code that is duplicate, unreachable, fake, or unsafe.

| Candidate | Why it should be removed or replaced | Safe action |
|---|---|---|
| `server/outreachScheduler.ts` | No callers for `runAutomatedOutreach()` were found; it duplicates the active `autoOutreachHandler.ts` system. | First move any approved shared logic into the active handler, add tests, then delete/archive the unused module. |
| `automatedOutreachConfig` versus `outreachConfig` | Two config models produce contradictory state and pause behavior. | Keep one agency-scoped canonical config; migrate schedule-specific preferences into that model. |
| Placeholder WhatsApp “sent” behavior | It records sends without a provider delivery. | Disable and remove count increment until a real integration exists. |
| `PartnerOutreach.tsx` placeholder recipient `noemail@placeholder.com` | Can create invalid or misleading outreach attempts. | Disable send action when no verified email exists. |
| Public token-based partner/referrer mutations | Makes protected operations easy to misuse. | Replace with authenticated server sessions, not URL/client-provided tokens. |
| Hard-coded domain and notification address values | Can send links or notifications to the wrong place after domain changes. | Move to environment configuration with startup validation. |

## Database and recovery gaps

The code uses active runtime tables such as `outreachConfig`, `outreachRuns`, `otp_store`, `referrers`, `solarPartners`, and `emailOpens`, but these were not found in the main Drizzle schema definition during this audit. There are also only a small number of committed migration files relative to the number of live tables in use.

This means a fresh deployment or rollback may not rebuild the current database safely. Before any commercial launch, create idempotent migrations matching the live schema, including unique constraints for partner/referrer email, referral code, invite/setup tokens, and `agencyId + scheduledDate + slot` automation idempotency. Do not delete or recreate live data during this work.

## Test coverage: good baseline, insufficient for production

The current **153 tests pass**, which is positive. However, the tests do not prove that the most important production promises are true. Missing or insufficient tests include:

| Missing test | Why it is required |
|---|---|
| Pause state blocks scheduled handler before run creation | Prevents unapproved outbound emails. |
| Pause mid-batch stops remaining sends | Ensures the toggle works immediately. |
| Same slot cannot run twice / overlapping run lock | Prevents duplicate messages and costs. |
| SMTP integration smoke test with a safe recipient | Confirms the email system can actually deliver. |
| WhatsApp disabled state never increments sent count | Prevents false reporting. |
| Partner/referrer session isolation | Prevents one user viewing another user’s leads or account. |
| Password setup/reset token validation | Prevents account takeover. |
| OTP rate-limiting and attempt lockout | Prevents abuse. |
| Secure upload MIME/size validation | Prevents unsafe files/URLs. |
| Payout transaction and double-approval race | Protects balances and reward integrity. |

## Practical remediation order

### Phase A — Stop unsafe behavior before the next real campaign

1. Disable all active outreach/follow-up schedules and keep them off.
2. Repair SMTP credentials and send two controlled test emails.
3. Fix the **active** `autoOutreachHandler` pause checks, including rechecks before each send.
4. Stop WhatsApp counters and UI claims until a real provider is connected.
5. Remove business-subsidy claims and replace the active pitch fallback with your approved wording.

### Phase B — Make email outreach dependable

1. Consolidate to one canonical config per agency and clean duplicate `outreachConfig` rows.
2. Add a unique automation-run key and a transaction/lock for agency + IST date + slot.
3. Use actual run states: `queued`, `running`, `skipped_paused`, `completed`, `partially_completed`, and `failed`.
4. Add alerting when a run fails, sends zero messages unexpectedly, or SMTP is unhealthy.
5. Run a 5–10 business manual pilot and inspect delivery, spam placement, bot-link clicks, and opt-outs before scaling.

### Phase C — Make partner/referrer operations safe to expose

1. Complete Priority 2 and Priority 4 from your hardening document before sharing dashboard links widely.
2. Complete secure server-side upload handling before accepting partner documents.
3. Secure referrer email outreach or remove it from the public interface.
4. Add migration coverage and a backup/export routine before accepting money or storing more customer data.

## What you may use now

You can use the dashboard for **manual lead review, internal demos, partner-data entry, and supervised testing**. You should **not** present WhatsApp delivery as active, rely on email automation, or invite untrusted partners/referrers to use password-based dashboards until the P0 items are finished.

## Final verdict

**This is not “production ready” today.** It is a useful product foundation with a working UI, live data, schedules, and passing baseline tests. But it needs the P0 fixes—especially SMTP, the active automation pause check, honest WhatsApp handling, one reliable config model, and secure partner/referrer authentication—before it can run outreach safely and consistently without you watching it.

---

### Audit evidence

- Runtime health check on 16 August 2026: dev server running, TypeScript/LSP clean, but SMTP verification failed with a 535 invalid-login error.
- `manus-heartbeat list`: nine enabled jobs, including five outreach slots.
- Database inspection: multiple `outreachConfig` rows for agency 1, with several active; one `automatedOutreachConfig` row disabled.
- Code review: `server/autoOutreachHandler.ts`, `server/outreachScheduler.ts`, `server/referrer.ts`, `server/partner.ts`, `client/src/App.tsx`, and frontend Forge-key references.
- Test run: 6 test files, 153 passing tests.
