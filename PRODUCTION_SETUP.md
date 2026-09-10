# Sales Squad Leads — Production Setup and Activation Guide

This guide describes the **unpublished** production configuration required after migration `0013_agency_configuration_control_plane.sql`. It intentionally contains no credential values. The Settings → Production operations panel reports non-secret readiness only.

## 1. Required Owner-Supplied Business Inputs

| Configuration area | Required before activation | Where it is entered | Current behavior when missing |
|---|---|---|---|
| Panel catalog | Brand, model, wattage, price, pricing version, effective date, verification date, and owner/vendor source note | Product Catalog → Solar Panels | Product may be stored as a draft, but public monetary estimates remain withheld. |
| Inverter catalog | Brand, model, capacity, price, pricing version, effective date, verification date, and owner/vendor source note | Product Catalog → Inverters | Product may be stored as a draft, but public monetary estimates remain withheld. |
| Agency pricing policy | Installation cost/kW, balance-of-system cost/kW, tax/markup treatment, pricing version, effective date, verification date, and source note | Settings → Production operations | Monetary estimates cannot be activated. |
| State/DISCOM input | State code, DISCOM label, tariff/unit, average sun hours, effective date, verification date, and source note | Settings → Production operations | The chatbot can provide sizing only when limited reference data is available; it withholds cost, savings, subsidy, and payback. |
| Subsidy information | Official source URL, disclosure text, scope, effective date, and verification date | Settings → Production operations / state input | No monetary subsidy is calculated or promised. |

> **Pricing rule:** A public monetary estimate requires an active agency pricing policy, an active state input, and at least one current verified panel and inverter. A draft, expired, unsourced, or unverified price is never enough.

## 2. Server-Only Credential Slots

| Service | Server-side configuration | Current status | Safe activation prerequisite |
|---|---|---|---|
| SMTP email | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, optional `EMAIL_FROM_NAME` and `EMAIL_REPLY_TO`, plus `EMAIL_SENDING_ENABLED=true` | Disabled by default; prior SMTP verification was unsuccessful | Correct credentials, sender-domain authentication, successful verification, then explicit agency controls. |
| Email event webhook | `EMAIL_EVENT_WEBHOOK_SECRET` | Not configured unless status panel shows configured | Provider signature verification and a controlled test event. |
| AI Gateway | Stored through the encrypted Settings → Integrations → AI Providers form | Optional; provider-dependent | Save encrypted credential, run a connection test, and enable a healthy provider before optional AI controls. |
| WhatsApp Business | Provider token, phone number ID, approved template metadata, webhook verify token, and signing secret | Disabled: no production adapter is installed | Install and test a real provider adapter; configure credentials; verify webhook; then explicit agency enablement. |
| SMS/phone OTP | Provider account credentials, sender identity, callback/webhook signing secret | Disabled: no production adapter is installed | Install and test a real provider adapter, then explicit agency enablement. |
| Maps, OCR, storage | Platform-managed service configuration | Available | No user API key should be entered into the browser. |
| Payments / payouts | Provider secret keys and verified webhook handling | Disabled: payout adapter is not installed | Implement and test a real payment/payout adapter before activation. |

## 3. Safe Activation Order

1. Enter and verify agency catalog and pricing inputs. Keep every price in draft until the source, effective date, and verification date are complete.
2. Enter and verify the state/DISCOM tariff and generation input. Keep it inactive until it is traceable to an owner-approved source.
3. Confirm that the public calculator and Agent Klaus return only sizing until the verified catalog is deliberately activated.
4. Configure SMTP server secrets outside the application UI. Set `EMAIL_SENDING_ENABLED=true` only after SMTP verification and a controlled internal test succeed.
5. Enable **Email automation** and **Scheduled follow-ups** separately in Settings → Production operations only after the SMTP readiness card is healthy. Both remain disabled by default.
6. Configure, test, and verify any optional AI provider. Enable optional AI features only after the provider status is healthy.
7. Do not enable WhatsApp, SMS/phone OTP, or payment functions until a real provider adapter and signed webhook path have been implemented and tested.
8. Run the production-readiness verifier, health check, controlled chatbot flow, and read-only automation audit again before publication.

## 4. Operational Safety Rules

The application keeps outbound email, scheduled follow-ups, automated outreach, WhatsApp automation, and phone OTP disabled unless both service readiness and explicit agency controls permit them. The schedule handlers additionally recheck the agency controls before sending. A failed SMTP delivery never advances a follow-up record.

The configuration audit records only configuration metadata such as action, entity, pricing version, and activation state. It does **not** record credentials, message contents, customer contacts, or secret values.

## 5. Current Required Follow-up

The owner must provide the verified catalog, agency installation and balance-of-system inputs, and verified Telangana/DISCOM tariff and generation input before any cost, savings, payback, or subsidy values can be surfaced. SMTP must be configured and verified separately before email can be activated. WhatsApp and SMS/OTP remain intentionally unavailable until a real provider adapter is added.
