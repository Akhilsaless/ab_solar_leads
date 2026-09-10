# Sales Squad Platform Communication Setup

## Scope and ownership

The **Platform communication control** card in Settings is visible only when the authenticated user matches the server-side `OWNER_OPEN_ID`. Agency/partner users can manage their catalog, pricing, state/DISCOM inputs, disclosures, leads, and workflows, but cannot view or change provider credentials, platform channel state, emergency-stop state, or communication eligibility.

| Channel | Current state | Provider model | Customer sending |
| --- | --- | --- | --- |
| Email | `OFF` | SMTP configuration is supported | Disabled until every platform prerequisite is explicitly satisfied |
| WhatsApp | `OFF` | Secure provider slot is supported | Disabled because no signed provider adapter or template verification exists |
| SMS / phone OTP | Disabled | No provider adapter | Disabled |
| Scheduled outreach / follow-ups | Disabled | Existing schedules remain gated | Disabled until the email platform state and all existing controls pass |

## Credential handling

Email and WhatsApp configuration is entered only into the super-admin form. The server encrypts the stored configuration with AES-256-GCM using a key derived from the existing server-side `JWT_SECRET`. Clients receive only configuration status and field names—never stored passwords, API tokens, webhook secrets, or sender values.

> Do not rotate `JWT_SECRET` without a credential migration plan. Existing encrypted provider configuration cannot be decrypted after an uncoordinated key rotation and should be entered again through the super-admin form.

The following platform variables must remain server-side and configured by the hosting environment: `DATABASE_URL`, `JWT_SECRET`, and `OWNER_OPEN_ID`. The current communication control plane does **not** accept or expose secrets through frontend environment variables.

## Email setup sequence

1. Confirm domain ownership and sender identity with the SMTP provider, including SPF/DKIM/DMARC where the provider requires them.
2. In **Settings → Platform communication control → Email**, enter the SMTP provider, host, port, TLS choice, username, password, From address, display name, and optional Reply-to address.
3. Select **Save encrypted configuration**. The channel remains `OFF` and no message is sent.
4. Select **Verify configuration**. This verifies the SMTP connection only and sends no message. A failed check records only a generic failure status.
5. Keep the global emergency stop active until a non-customer controlled-test mailbox is available. Clear it only after confirming the provider, sender identity, consent records, opt-out handling, and internal owner review.
6. Use **Send controlled test** only with an owner-controlled, non-customer mailbox. It never enables automation.
7. Separately arm agency eligibility and its existing outreach master only after consent and legal review. Finally use the explicit platform **Turn on** action. A missed prerequisite blocks the action and leaves the channel inactive.

## WhatsApp setup sequence

1. Register a genuine WhatsApp Business provider account and ensure the sending number, business account, and approved template names are complete.
2. Add the provider fields only through **Settings → Platform communication control → WhatsApp**. They are encrypted server-side.
3. Install a signed provider adapter and webhook signature validation before attempting provider verification.
4. Confirm template approval, recipient consent/opt-out handling, and approved message categories.
5. Verify the adapter and template through a controlled non-customer test. Only then can the channel be made eligible, paused, resumed, or run.

Until steps 3–5 are implemented, the WhatsApp status remains `TEMPLATE_SETUP_REQUIRED`; the Verify and Turn on paths fail closed and no message can be sent.

## State model and safeguards

| State | Meaning | Effect on sends |
| --- | --- | --- |
| `OFF` | Default safe state | All automatic sends are blocked |
| `PAUSED` | Operator pause or emergency-stop effect | Current/future automated sends are blocked immediately |
| `RUNNING` | Explicitly started after all checks | Dispatch remains subject to every provider, feature, master-switch, consent, and idempotency check |

The global **Emergency stop** defaults to active. Activating it pauses running channels and prevents all automatic email/WhatsApp dispatches. Clearing it does not restart anything; the platform owner must explicitly resume a channel.

Every email send uses the central platform dispatch decision. Scheduled outreach also checks the email platform state before any scraping or send attempt, while its existing idempotency key prevents duplicate daily slot runs. WhatsApp has no live adapter and returns a disabled result from every send path.

## Operational review checklist

Before any future activation, verify all of the following:

- Provider verification is current and displays `READY`.
- A non-customer controlled test has been reviewed.
- The global emergency stop is deliberately cleared.
- Agency eligibility is deliberately armed for the channel.
- The applicable existing outreach master switch is deliberately enabled.
- Consent, opt-out, rate limits, sending hours, template approval, and the intended recipient segment have been reviewed.
- The first live run is monitored in the platform audit log and existing outreach run history.

No configuration save, verification, pause, emergency-stop action, or blocked activation exposes secret values or recipient addresses in the platform audit log.
