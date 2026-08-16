# Email Event Webhook Setup

The application now exposes an intentionally inactive endpoint at:

```text
POST https://salessquadleads-xxxqwsn9.manus.space/api/webhooks/email-events
```

It remains unavailable until the server-side `EMAIL_EVENT_WEBHOOK_SECRET` is configured. This is deliberate: delivery, bounce, complaint, reply, open, and click events must never be accepted from an unsigned public request.

## Configuration Required

| Item | Required value |
|---|---|
| Email provider | Choose the provider that will actually send your production email. |
| Webhook secret | A long random value saved as `EMAIL_EVENT_WEBHOOK_SECRET` in secure project settings. |
| Adapter or proxy | Normalize your chosen provider's events into the payload below, then sign the whole payload with HMAC-SHA256. |
| Signature header | Send the resulting hex signature in `x-sales-squad-signature`. |

## Accepted Payload

```json
{
  "provider": "your-provider-name",
  "events": [
    {
      "id": "provider-event-id",
      "type": "delivered",
      "recipient": "lead@example.com",
      "outreachRecordId": 123,
      "timestamp": "2026-08-16T12:00:00.000Z",
      "metadata": { "providerMessageId": "..." }
    }
  ]
}
```

Allowed event types are `delivered`, `bounced`, `complained`, `opened`, `clicked`, `replied`, and `unknown`. Repeated `id` values are ignored, so event redelivery is safe.

## Activation Rule

Do not enable this endpoint until the selected email provider, its signing method, and its event schema are confirmed. The provider-specific adapter should be built and tested against that provider’s official webhook documentation before any live event data is trusted.
