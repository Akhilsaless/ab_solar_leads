# Platform API Research Notes

## WhatsApp Business Platform

Meta’s official WhatsApp documentation states that the `messages` webhook carries both messages sent by a WhatsApp user to a business and the status of messages sent by a business to a user. This means a genuine WhatsApp integration can replace the current draft-only experience with verified `sent`, `delivered`, `read`, `failed`, and inbound-reply lifecycle events—but only after the business account, number, templates, credentials, and webhook verification are configured. [1]

## Email Delivery Events

Resend’s official webhook documentation describes webhook delivery as real-time HTTPS event notifications, including delivery notifications. It documents use cases such as bounce removal, event-based alerts, storing event history, and inbound email. This aligns with Sales Squad’s existing inactive signed email-event endpoint, but activation requires a configured sending domain, provider credential, webhook secret, and provider-specific payload adapter. [2]

## Implication

Both integrations provide **truthful event data**, not merely send attempts. They are high-value after the core product has a validated sales process, but they are not prerequisites for improving current research queues, lead evidence, campaign routing, client delivery, or outcome dashboards.

## References

[1] [Meta for Developers, *WhatsApp Business Platform Webhooks*](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)

[2] [Resend, *Managing Webhooks*](https://resend.com/docs/webhooks/introduction)
