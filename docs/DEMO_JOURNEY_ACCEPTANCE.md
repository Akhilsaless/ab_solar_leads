# Isolated customer-to-installer acceptance

The demo harness runs the real application routers against a disposable local MySQL database. It creates clearly marked synthetic installers, catalogue, prices and customer records. It does not configure a real AI, SMS, WhatsApp or email provider.

## Local setup (PowerShell)

Use the repository's pinned pnpm 10.4.1 and Node 22. Start a disposable MySQL 8.4 container named `sales-squad-demo-20261105`, bound only to `127.0.0.1:33316`, with a `solar_demo` database. Do not point the harness at production; it enforces this host, port and database name.

```powershell
$env:DATABASE_URL='mysql://root:synthetic-local-only@127.0.0.1:33316/solar_demo'
$env:OWNER_OPEN_ID='demo-owner'
$env:JWT_SECRET='isolated-demo-only-never-use-in-production-20261105'
$env:EMAIL_SENDING_ENABLED='false'
$env:SOLAR_PHONE_VERIFICATION_ENABLED='false'
$env:PUBLIC_APP_URL='http://localhost:3317'
npx --yes pnpm@10.4.1 install --frozen-lockfile
.\node_modules\.bin\drizzle-kit.cmd push --force
.\node_modules\.bin\tsx.cmd scripts/demo-journey.ts
```

Schema push is for this empty disposable database only. The harness supplies the legacy partner table that the current Drizzle schema does not define. The schema push does not validate production migration history.

The harness checks residential/commercial enquiries without reference data, registration/login, complete onboarding, consent, duplicate capture, owner assignment, acceptance, stale updates, unverified-contact privacy, survey booking, PDF generation, configured tax arithmetic, expired catalogue rejection, consent withdrawal and disabled messaging/commercial charging.

Phone possession is simulated explicitly in the isolated database. A passing demo cannot certify a real phone-verification provider, AI availability, live tenant provisioning or production backup recovery.

The harness writes a demo PDF and JSON result to the enclosing workspace's `outputs` directory and a local `demo-session.json` for browser verification. These contain synthetic data only and are not production fixtures. Repeated runs retain demo records for inspection.

## Pricing regression

The full journey exposed a missing `taxRatePercent` column in the installer pricing snapshot query. An 18% configured markup reached the proposal calculator as 0%. Loading the column preserves the configured rate for both onboarding controls and downstream proposals. The harness asserts the rate, tax amount and final total together.

Deployment is separate: a GitHub commit does not publish the Manus application. Keep the live deployment's state explicit until a supported checkpoint has been published and verified.

## Other release fixes

When no reference tariff/sunlight data can support a size estimate, both residential and commercial chat paths now skip the empty database update and return the existing limited response. The harness covers both cases.

The dependency override pins `follow-redirects` to 1.16.2 for GHSA-mrwp-f3q8-3g9p. This removes the audited dependency alert without claiming the application's Axios use reproduced the advisory's cross-realm credential-header scenario.
