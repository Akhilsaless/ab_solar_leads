# Partner-led solar sales release candidate

This release extends the existing chatbot. It does not create a second website, database or Manus project. It is a release candidate until its database tests, staged customer journey and actual provider connections have been verified.

## Ownership and activation

- Installers complete their own catalogue, pricing, service areas and survey availability. They configure their own WhatsApp Business account through **Partner dashboard → Surveys & Sales**.
- The platform owner uses **Partners → Installer Operations** to route enquiries, configure the platform's separate WhatsApp connection and record agreed commercial terms.
- Commercial terms default to **not agreed**. Accepted-lead, completed-survey and installation-percentage accruals are recorded only against terms active when the relevant milestone occurs. An accrual is not a paid invoice or a completed payout.
- Enquiries can be captured with consent while no installer is onboarded. They remain awaiting partner assignment. No available partner, price, appointment, verified phone or message delivery is invented.

## Implemented workflow

1. Chatbot intake retains stated facts; the structured enquiry panel records name, mobile and explicit contact/channel consent.
2. Transactional contact capture normalizes Indian mobile numbers and serializes duplicate captures. Leads start unassigned. Claimed contact details alone do not reveal an existing customer's installer or booking details.
3. Optional Twilio Verify SMS validates possession. The provider must return `approved` for the same phone and current verification generation. Requests and attempts are bounded. Signed inbound WhatsApp messages also establish possession for the matching lead.
4. The owner assigns a ready installer with matching service coverage. Catalogue and local input expiry are checked again, rather than relying only on a saved readiness label.
5. The installer accepts the enquiry and publishes future survey slots. Customer or installer booking locks the slot and workflow in one transaction. Stale workflow versions, cross-partner actions and double bookings are rejected.
6. Itemized, versioned preliminary PDF proposals use the assigned installer's verified equipment, BOS, installation costs and tax/markup. Unsupported system sizes or undersized inverters require installer design. Subsidy is not automatically deducted; savings are labelled as an upper scenario rather than guaranteed ROI. PDFs have opaque, expiring download links.
7. Agency-scoped Meta WhatsApp connections encrypt credentials, validate sender/template readiness and verify signed webhooks. Approved templates handle proactive updates and proposal links. Free-form responses require a recent signed customer message within the 24-hour service window. Inbound questions use the existing chatbot and configured agency AI gateway.
8. Workflow events queue updates atomically when a configured channel and verified, opted-in contact exist. The delivery worker rechecks assignment, consent, channel readiness and the global emergency stop immediately before sending. Provider acceptance, delivery and reading are distinct states. Ambiguous sends are held for reconciliation rather than blindly retried.
9. Installers record survey completion, proposal sending, installation and received revenue with evidence/reference fields. Closing requires installation and an amount/payment reference. These records do not independently prove a bank settlement; reconcile them operationally.

## Required staging setup

Apply reviewed additive migrations **0017, 0018 and 0019** after verifying migrations through 0016. Use a database backup and staging copy first. Do not run a database reset or blindly rerun prior migrations. The migrations do not rewrite or delete existing production records. Rolling back application code can leave the new tables intact.

Server settings:

- Existing `DATABASE_URL`, OAuth configuration, `OWNER_OPEN_ID` and a strong persistent `JWT_SECRET`. The existing encryption service uses the server secret; rotating it requires a credential/token migration plan.
- Correct public HTTPS `PUBLIC_APP_URL`, used for webhook callbacks and proposal download links.
- A healthy, explicitly configured AI provider in the existing AI Gateway. The chatbot now routes through that agency's gateway. No new AI account or credential is created by this release.
- Optional SMS: `SOLAR_PHONE_VERIFICATION_ENABLED=true`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`. Keep disabled until controlled provider tests pass and Indian sender/delivery prerequisites are satisfied.
- WhatsApp credentials are configured separately for each agency. Select the Graph API version supported by that Meta app. Configure an approved template with exactly two body variables (customer name and update text) and no dynamic header/button components. Subscribe Meta's messages webhooks to the callback URL shown by the application.
- Configure an authenticated scheduler to POST `/api/scheduled/solar-whatsapp` with `Authorization: Bearer <SOLAR_OPERATIONS_CRON_SECRET>` every minute. Use a long random server-only cron secret. Do not expose it in a public URL.
- Global emergency stop remains authoritative. Configure/verify first; enable a channel and clear the stop only through the existing owner controls after a controlled send/receive test.

New and old messaging paths remain separate: legacy placeholder WhatsApp/payout methods stay disabled. Use the new agency-scoped connection for this chatbot workflow. This release does not activate subscription charging or bank/UPI payouts.

## Release verification

- `pnpm check`, `pnpm test`, `pnpm build` must pass.
- CI now starts a disposable MySQL database named `solar_test` for transaction tests. These cover concurrent capture, consent, cross-partner access, double booking and invalid revenue transitions. This does not replace TiDB-specific staging verification.
- `/api/health` checks the new tables and returns build commit provenance. It distinguishes missing tables from other query failures. A healthy database is not proof of provider readiness.
- Run the complete published journey with synthetic customer and installer accounts. Include expired catalogue data, consent withdrawal, phone changes, OTP rejection, webhook tampering/replays, early/out-of-order delivery receipts, service-window expiry, provider timeout, reassignment and two customers racing for a survey slot.
- Reconcile provider logs with message records. Review `unknown`, `needs_human`, `blocked` and `failed` outcomes; do not label queued or accepted requests as delivered.
- Verify PDF download and expiry, tenant isolation, quote assumptions and real browser layout before opening the pilot to customers.
- Existing six database-dependent referral tests are outside the new operations fixture and still require their separate test configuration.

## Deployment boundary

The latest previously observed live Manus deployment lacks the already-merged North Star follow-up. The existing release notes record a zero-Manus-agent-credit requirement and no verified non-agent sync/checkpoint path. This release does not authorize resuming Manus, creating another project/database, changing hosting or assuming that a GitHub push publishes the application. Establish a supported deployment route and confirm the exact live commit before release approval.

## Scope still requiring operational decisions or later implementation

- Actual installer onboarding data, provider accounts, delivery permissions and commercial terms belong to their owners; synthetic fixtures must never become production pricing.
- Roof feasibility remains a preliminary qualification and physical installer survey. No image-based structural approval or autonomous engineering certification is claimed.
- Payments and payouts remain inactive; external settlement reconciliation is required before enabling money movement.
- Monitoring/alert destinations, backup restore exercises, retention/deletion policy and provider-failure escalation ownership must be established for the production environment.
- Real provider delivery and the full deployed browser journey have not been established merely by local unit tests or a successful build.

References: [Meta webhook validation](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/), [WhatsApp messaging policy](https://business.whatsapp.com/policy), [Twilio Verification Check](https://www.twilio.com/docs/verify/api/verification-check).
