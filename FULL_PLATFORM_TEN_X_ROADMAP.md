# Sales Squad — Full Platform 10× Roadmap

## Executive Position

Sales Squad already contains more than a lead scraper: it has public lead capture, campaigns, client acceptance, partners, referrers, AI assistance, outcome analytics, guarded outreach, and integration settings. The 10× opportunity is to turn these separate capabilities into **one evidence-driven operating system for commercial solar revenue**.

> The platform becomes differentiated when every page shares the same answer: **Which facility should we pursue next, what evidence supports it, who owns the next action, and what happened commercially afterward?**

No product can honestly promise guaranteed sales. Results require a valid sender domain, compliant outreach, high-quality contact data, feasible sites, responsive partners, disciplined follow-up, and a commercially acceptable offer. The roadmap below increases control and learning at every step; it does not fabricate those external conditions.

## Current Foundation

| Existing platform strength | Why it is valuable |
|---|---|
| Protected admin, partner, and referrer access | Enables role-specific work without exposing all data. |
| Campaign, appointment, delivery, acceptance, and revenue workflow | Provides the commercial outcome loop most lead tools miss. |
| Public chatbot, bill upload, location capture, and lead records | Supports first-party lead qualification rather than relying only on scraped data. |
| Google Maps/Places and website-email extraction | Gives Sales Squad a practical starting source for real local businesses. |
| North Star dashboard and campaign intelligence | Creates an owner view of delivered quality, client acceptance, and revenue. |
| Klaus provider settings and tool-based AI | Allows AI to assist in research and operations once evidence is structured. |
| Safe outreach controls, schedules, and event-intake foundation | Prevents uncontrolled sending and makes provider events possible later. |

## Page-by-Page 10× Plan — No New External API Required

### 1. Dashboard

The dashboard should become an **Owner Action Centre**, not a collection of totals. Show a daily “must do” stack: high-intent replies awaiting a call, survey requests not scheduled, partner-assigned leads with no response, client deliveries awaiting acceptance, and campaigns behind target. All of this is possible from the data already stored.

| Improvement | What changes for the user | API required? |
|---|---|---|
| Daily revenue path | “Today’s next 5 actions” linked to the exact lead/campaign | No |
| Pipeline risk alerts | Highlight expired client-review links, stalled appointments, unassigned high-quality leads | No |
| Evidence completeness bar | Shows missing bill, owner, contact, site, or decision-maker evidence per lead | No |
| Partner SLA scorecard | Measures response and acceptance time using internal records | No |

### 2. Conversations and Conversation Detail

Turn conversations into a **qualification transcript**. Surface extracted facts, unanswered questions, decision-maker status, requested delivery method, and recommended next action. Add a “convert to survey-ready” checklist, ensuring a bot conversation does not become a lead merely because someone typed a message.

| Improvement | Result | API required? |
|---|---|---|
| Structured extraction from existing chat fields | One concise commercial lead card per conversation | No |
| Conversation quality score | Separates curiosity from bill/site/survey-ready interest | No |
| Human takeover queue | Lets a sales rep take over only high-intent conversations | No |
| Consent / do-not-contact status | Makes follow-up safer and auditable | No |

### 3. Leads

The Leads page should be the **single source of truth** for every lead source. It already connects to campaigns; the next step is to give each record a source, evidence timeline, owner, deadline, next action, and outcome. A lead card should show why it is valuable, not just the contact details.

| Improvement | Result | API required? |
|---|---|---|
| Unified activity timeline | Calls, emails, chatbot events, survey, partner actions, and client decisions in one view | No |
| “Missing evidence” task list | Reps know exactly what must be verified before a survey/proposal | No |
| Assignment rules | Route leads by partner service area, product coverage, SLA, and campaign | No |
| Loss/rejection taxonomy | Converts losses into usable search and partner-learning data | No |

### 4. Find Leads, Business Scraper, and Scraped Contacts

This is the highest-leverage upgrade. Convert generic Maps search into a **territory intelligence and research queue**. Search specific facility families inside industrial clusters, then score based on source-stamped commercial evidence—not review count.

| Improvement | Result | API required? |
|---|---|---|
| Territory blueprint | Search by cluster, facility family, target company profile, and evidence threshold | No |
| Central Commercial Readiness Score | One server-side 100-point score with reasons, confidence, and missing evidence | No |
| Decision-maker ladder | Records owner/director/facilities/finance role status instead of treating any phone/email as a buyer | No |
| Research Queue | Holds 65–79 prospects for manual verification instead of automating outreach | No |
| Contact confidence ranking | Ranks domain-matched business contact over generic/uncertain addresses | No |
| Negative evidence | `tenant_no_permission`, `already_has_solar`, `duplicate`, `do_not_contact`, `not_in_service_area` stops bad outreach | No |

### 5. Automated Outreach

The most advanced version of outreach is **controlled, evidence-backed, and measured**, not high volume. Default to an approval queue until the score, message claim, contact confidence, and campaign fit are all complete. Use caps per sector/cluster, holdback groups for experiments, and automatic suppression from verified bounces/do-not-contact signals.

| Improvement | Result | API required? |
|---|---|---|
| Approval-before-send mode | Stops unverified campaigns from sending | No |
| Claim guardrail | Blocks exact savings, system cost, or subsidy claims without evidence | No |
| Cohort experiments | Compare subject/pitch/sector/cluster using actual outcomes | No |
| Sender reputation panel | Shows volume, bounce risk, and suppressed records once events arrive | No for UI; email events needed for factual delivery data |

### 6. Campaigns, Campaign Detail, and Client Review

This is already a strong differentiator. Take it further by making campaigns run on **client acceptance criteria**, not only source volume. Let the client define what “acceptable” means—service area, facility type, ownership, target bill band, decision-maker, and appointment rules—before search begins. The system can then show precisely why a delivered lead meets or misses the brief.

| Improvement | Result | API required? |
|---|---|---|
| Campaign quality contract | Client requirements become structured lead gates | No |
| Delivery pack | Client sees lead evidence, contact history, score reasons, and appointment state | No |
| Rejection learning | Each rejection changes future scoring rules for that campaign | No |
| Client renewal score | Shows delivered/accepted/survey/proposal/won performance | No |

### 7. North Star and Analytics

North Star should tell the owner where money is being lost. Analytics should become a **cohort and decision dashboard**: sector × cluster × source × partner × campaign. Compare “cost per verified prospect,” “decision-maker reached,” “bill received,” “survey attended,” “lead accepted,” and “revenue realized.” Do not optimise email opens in isolation.

| Improvement | Result | API required? |
|---|---|---|
| Funnel by evidence tier | Shows whether the readiness score is predictive | No |
| Partner accountability | Identifies partners who delay, reject, or convert poorly | No |
| Territory white-space map | Shows clusters searched, exhausted, or untested | No with existing Maps; advanced property layers are optional |
| Forecast confidence | Separates pipeline value from verified, likely, and booked revenue | No |

### 8. Partners: Signup, Dashboard, Outreach, and Admin

Partners should experience Sales Squad as a **lead quality and delivery workspace**, not just a signup page. Make their service area, product fit, pricing logic, discount eligibility, calendar capacity, response SLA, and acceptance standards explicit. The platform should assign leads only when a partner can actually serve them and should measure what happens next.

| Improvement | Result | API required? |
|---|---|---|
| Partner readiness profile | Prevents assigning a lead outside capability/service area | No |
| Capacity and SLA board | Prevents sending more than the partner can call or survey | No |
| Lead disposition discipline | Requires clear reasons for accepted/rejected/unreachable/duplicate | No |
| Quality feedback loop | Partner feedback retrains the campaign’s acceptance rules | No |

### 9. Referrers, Referral Landing, and Referral Management

The referrer product should optimise for **verified, accepted quality**, not raw volume. Referrers need a simple share flow, a transparent status timeline, and rewards only after the defined validation checkpoint. The owner needs fraud checks, duplicate checks, locality quality, and a clear “why not eligible” explanation.

| Improvement | Result | API required? |
|---|---|---|
| Referral quality ladder | Inquiry → verified contact → qualified → survey → accepted | No |
| Transparent reward rules | Prevents payout disputes and fake lead incentives | No |
| Referral source analytics | Shows which hostels, neighbourhoods, or referrers create real surveys | No |
| Reusable micro-campaign kits | QR, text, poster, and follow-up wording tied to one trackable code | No |

### 10. Public Chatbot and Public Pages

The chatbot should be a **pre-survey concierge**. It should ask only for information the prospect can realistically provide, confirm bill/address/contact details, obtain follow-up consent, and route a credible next action. Landing pages should use segment-specific journeys: business owner, tenant, apartment committee, referrer, and partner should never see the same form and pitch.

| Improvement | Result | API required? |
|---|---|---|
| Adaptive commercial qualifier | Short, role-aware questions instead of a generic flow | No |
| Preliminary feasibility card | Explains what is known/unknown and requests bill/site review | No |
| Segment landing pages | Different CTA, qualification, and proof for owner/tenant/referrer/partner | No |
| Estimate follow-up workflow | Builds a task for a human rather than pretending an exact quote is final | No |

### 11. Klaus AI Copilot

Klaus should act like an **operations analyst and sales manager**, not an open-ended chatbot. Give it evidence-backed commands: “show leads missing facility owner,” “build tomorrow’s call list,” “explain why this campaign has low survey conversion,” and “draft a conservative call brief.” It must cite the data it used and distinguish facts from recommendations.

| Improvement | Result | API required? |
|---|---|---|
| Evidence-required answers | Stops invented dates, metrics, savings, or status claims | No |
| Action plans from live funnel gaps | Turns dashboard data into a daily sales plan | No |
| Guarded commands | Draft/preview first; confirm only destructive/external actions | No |
| Provider independence | Existing Settings integration lets you choose the AI provider later | Optional external provider |

### 12. Settings, Products, Pricing, Subsidies, QR, Product Guide, and Video

Settings should become an **operations control tower** showing integrations, data freshness, sender readiness, consent policies, service areas, and feature state. Keep Products/Pricing/discounts inside partner-controlled profiles; do not show hard-coded site-wide commercial promises. QR, product guide, and video should become campaign assets with tracking codes and measurable funnel performance.

| Improvement | Result | API required? |
|---|---|---|
| Integration readiness page | Clearly shows connected/tested/disabled state for email, WhatsApp, AI, webhooks, and maps | No |
| Campaign asset library | Links QR/video/guide to a campaign, source, and conversion outcome | No |
| Rules library | Stores approved claims, consent copy, sector pitches, and partner disclaimer text | No |
| Pricing visibility controls | Shows only relevant partner-specific information after qualification | No |

## API Matrix — What Changes If You Connect Different APIs?

| API or integration | What it adds | What does not change | Priority |
|---|---|---|---|
| **Existing Maps/Places/Geocoding** | Business discovery, address validation, place data, route/map features | Does not identify ownership, bill size, decision-maker, or true purchase intent | Already available |
| **Email provider + SMTP** | Actual delivery from a verified sender domain | Does not guarantee inbox placement, replies, or lead quality | Essential before email outreach |
| **Email-event webhook** (Resend/Postmark/SendGrid style) | Delivered/bounced/opened/clicked/inbound event truth; suppression and sender reputation data | Does not fix bad targeting or a weak offer | Essential once email is live |
| **WhatsApp Business Cloud API** | Approved template sends, verified delivery/read/failure events, inbound replies, opt-in-aware conversation lifecycle | Does not give permission to message any scraped number or guarantee response | Essential only for real WhatsApp automation |
| **Roof/solar intelligence API** | Remote roof/potential/shade/imagery signals for supported locations; faster preliminary site screen | Does not replace a structural/site survey, ownership check, or utility feasibility review | High-value later |
| **Company/contact enrichment API** | Possible legal company data, titles, firmographics, direct work-contact enrichment, update timestamps | Does not prove the person wants solar; data quality must be scored and privacy respected | Optional after workflow proves value |
| **External AI provider** | User-selected model cost/capability profile for Klaus | Does not create real evidence or fix data quality | Optional; settings already prepared |
| **Voice/call transcription** | Logged qualification calls, follow-up summaries, coaching, and searchable objections | Does not replace consent or a real salesperson | Optional after calls become consistent |
| **Payment provider** | Paid subscriptions or partner/referrer payout workflows | Does not validate lead quality or client acceptance | Optional; keep inactive until commercial terms are final |

The most useful first integrations are not the flashiest ones. A verified email sender plus delivery events gives the platform factual communications data. WhatsApp is next only if your operating model genuinely needs it. Property/roof data and contact enrichment should wait until Sales Squad has demonstrated a reliable manual qualification process, because they are most useful when they save measurable research or site-visit time.

## Recommended Build Order

| Phase | Build now with existing platform data | Integrate only when ready | Result |
|---|---|---|---|
| 1 | Central score, evidence cards, Research Queue, quality contracts, daily action centre, partner/referrer SLA | None | Higher quality before more volume |
| 2 | Outcome cohorts, rejection learning, call/survey workflows, asset tracking | Verified email sender + event webhook | Honest outbound measurement |
| 3 | Territory intelligence, feasibility passports, decision-maker research | Roof/property data and approved contact source | Faster pre-site qualification |
| 4 | Full communications hub and consent-aware sequences | WhatsApp Business Cloud API and/or voice provider | Multi-channel follow-up with real status |
| 5 | Predictive recommendations based on labelled outcomes | Optional AI/enrichment services | Evidence-based optimization rather than generic AI |

## The Differentiated Product Thesis

Generic tools can send messages or store contacts. Sales Squad can become differentiated by owning the link between **facility evidence → buyer access → commercial qualification → client acceptance → partner execution → realised revenue**. Property-intelligence products already demonstrate the value of combining property attributes, decision-maker information, buying signals, remote measurements, and CRM workflow. [1] Solar-data APIs can accelerate remote feasibility screening where coverage exists, but coverage and imagery quality must be verified for every target location. [2] [3]

The winning version of Sales Squad is therefore **not an outreach bot**. It is an evidence-backed commercial solar operating system that uses automation only after human-relevant proof exists.

## References

[1] [Convex / ServiceTitan, *Mapping Buildings and Grounds: How to Find Roofing and Solar Deals*](https://www.convex.com/blog/mapping-buildings-and-grounds-how-to-find-roofing-and-solar-deals)

[2] [Google Maps Platform, *Solar API overview*](https://developers.google.com/maps/documentation/solar/overview)

[3] [Google Maps Platform, *Solar API coverage*](https://developers.google.com/maps/documentation/solar/coverage)

[4] [Meta for Developers, *WhatsApp Business Platform Webhooks*](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)

[5] [Resend, *Managing Webhooks*](https://resend.com/docs/webhooks/introduction)
