# Sales Squad Leads — Production Go-Live Checklist

## Current Application Safeguards

The production-hardening pass has placed all email and outreach schedules in a safe paused state. The application now fails closed when the email service is unavailable, honors the master outreach pause in the active run path, prevents repeated scheduled-slot runs, and does not report unsupported WhatsApp drafts as delivered messages.

Partner and referrer account flows now use expiring, hashed session credentials rather than storing active tokens directly. Partner registration requires an expiring invitation, account passwords are required during registration, and document uploads are routed through the server rather than exposing storage credentials in the browser. Public chatbot messages are length-limited and throttled per conversation; phone OTP has been intentionally disabled until a real verified provider is connected.

## Required Inputs Before Re-enabling Outreach

| Item | What you need to provide or complete | Why it is required |
|---|---|---|
| SMTP sender | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, and the approved from-address | Current SMTP authentication is rejected, so all email jobs remain disabled. |
| Sender-domain DNS | SPF, DKIM, and DMARC records for the outreach domain | Required to protect deliverability and reduce spam classification. |
| WhatsApp Business | Meta WhatsApp Business account, approved phone number, Phone Number ID, WABA ID, permanent system-user token, and approved template | Required before the app can send or verify WhatsApp/SMS messages. Until then it deliberately does not claim WhatsApp delivery. |
| Legal copy | Privacy policy, terms, consent wording, and the business's approved outreach/opt-out wording | Required before public lead capture and commercial outreach are enabled. |
| Operations owner | A person responsible for checking delivery errors, bounces, replies, and hot leads each business day | Automation finds and messages prospects; it does not replace responsible follow-up. |

## Safe Re-enable Sequence

1. Add and validate SMTP credentials. Do not enable any schedule until a test email from the production sender arrives in both an inbox and spam folder.
2. Publish the application and test one manual, owner-authorized outreach email to a consented internal test address. Verify tracking, the chatbot link, lead storage, and opt-out behavior.
3. Turn on the master outreach toggle for one city and one email-only slot. Re-enable only that matching Heartbeat job.
4. Review the run record, delivered/open metrics, complaints, and reply handling for at least one business day before enabling additional slots.
5. Connect and test WhatsApp Business separately. Enable WhatsApp only after template approval and a real end-to-end test.

## Intentionally Disabled Until Configured

| Capability | Current behavior |
|---|---|
| Automated email outreach and follow-ups | All nine schedules are paused. |
| Phone OTP | Disabled with an explicit configuration message; no OTP is logged or falsely marked as sent. |
| WhatsApp automated delivery | Not sent and never counted as sent without a provider. Manual WhatsApp opens are clearly marked as untracked drafts. |
| Referrer-driven arbitrary email | Owner-controlled to prevent public email abuse. |

## Verification Record

The hardening build compiles with `npx tsc --noEmit`. The existing Vitest suite passes with 153 tests. Production email delivery has **not** been marked as passed because the supplied SMTP account rejects authentication; this requires your replacement credentials before go-live.
