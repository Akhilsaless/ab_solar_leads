# Manus release checklist

GitHub is the source repository, but a GitHub commit does not by itself update the live Manus deployment. Complete every step below for each release.

## Before publishing

1. Merge only after the GitHub `CI` workflow passes (`check`, `test`, and `build`).
2. In the Manus project, sync/import the merged `main` branch and create a clean checkpoint.
3. Back up the production database.
4. Apply every unapplied SQL file in `drizzle/migrations/` in numeric order. This release requires `0007` through `0012` on the current live database.
5. Configure production secrets without committing them:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `OWNER_OPEN_ID`
   - `PUBLIC_APP_URL=https://absolarleads-xxxqwsn9.manus.space` (choose one canonical domain)
   - `DEFAULT_AGENCY_SLUG=sales-squad`
   - `AI_CREDENTIAL_ENCRYPTION_KEY`
   - SMTP/email-event credentials
   - one validated AI-provider credential
   - WhatsApp credentials only when WhatsApp outreach is enabled
6. Correct live agency data: City `Hyderabad`, State `Telangana`, and complete website/address/contact fields.
7. Keep automated outreach paused until the checks below pass.

## Smoke tests

1. `GET /api/health` returns HTTP 200 with `{"status":"ok","database":"ready"}`.
2. Owner login works on the canonical domain.
3. `/chat/sales-squad` starts a conversation and captures one test lead.
4. North Star loads without a database error.
5. Find Leads renders in batches, does not show placeholder email addresses, and a repeated search does not add duplicate Google Place records.
6. Partner and referrer login reject invalid credentials without revealing whether an account exists.
7. Referral withdrawal rejects amounts below ₹500 and amounts exceeding the balance after pending requests.
8. Scheduled endpoints reject ordinary user sessions and accept only Manus cron sessions.
9. Send one test email and verify delivered/open/click metrics before enabling outreach.
10. Confirm both public domains; redirect the non-canonical domain if Manus supports it so authentication uses one origin.

## Publish

Open the Manus project Management UI, select the clean checkpoint, and use **Publish**. Re-run the smoke tests against the live URL before enabling any automated outreach.
