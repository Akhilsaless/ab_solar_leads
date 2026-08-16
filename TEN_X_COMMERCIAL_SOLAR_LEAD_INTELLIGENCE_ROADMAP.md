# Sales Squad — 10× Commercial Solar Lead Intelligence Roadmap

## The Honest Goal

Sales Squad can become materially more effective than a generic lead finder, but no software can **guarantee** closed solar projects. A business may decline because of cash flow, tenancy, roof condition, DISCOM constraints, an existing supplier, no decision-maker access, or a slow partner response. The goal is to build a system that makes those risks visible **before** your team wastes outreach volume.

> **The differentiator is not “more AI messages.” It is a decision-grade evidence record for every commercial facility, linked to a repeatable sales process and trained by real outcomes.**

The product already has a protected campaign lifecycle, lead delivery, client acceptance, and outcome analytics. The next leap is to make the **top of funnel as intelligent as the bottom of funnel**.

## Current Product: Strengths and Gap

| Existing capability | Why it matters | What prevents a 10× result today |
|---|---|---|
| Google Maps search and website email extraction | Finds real local businesses quickly | It does not establish property control, consumption, roof/site feasibility, or buying authority. |
| Solar score, imported lead records, campaign workflow | Provides a useful first queue | The score is duplicated and built mainly from Maps review/rating proxies rather than commercial-buying evidence. |
| Automated email controls and tracked outcomes | Supports safe controlled outreach | It should not choose recipients until a stronger quality gate exists. |
| Campaign/client acceptance and revenue workflow | Closes the measurement loop | It is not yet feeding verified outcomes back into source/segment scoring. |
| Klaus and structured campaign guidance | Can reduce research and follow-up effort | It needs an evidence model; it should never invent site, bill, owner, or savings facts. |

## The Differentiated Architecture: The Commercial Solar Evidence Graph

Every prospect should become a **facility account**, not just a business name. The record combines real, source-stamped evidence into five connected views.

| Evidence layer | Data captured | Sales value | Automation rule |
|---|---|---|---|
| **Facility and site** | Address, geocode, facility class, building/roof/parking clues, existing solar signal, multi-site link | Shows whether a site deserves site-feasibility work | Never mark roof area, shade, or system size as confirmed without a supported source or survey. |
| **Energy-fit** | Sector, likely day-load profile, refrigeration/production/cooling clues, operating hours, bill band when disclosed | Separates energy-intensive facilities from generic local listings | Treat all estimates as hypotheses until a bill or site assessment confirms them. |
| **Ownership and buying committee** | Owner/lease status, building owner, facilities/operations/finance contact, verified title, preferred channel | Routes the rep to a person who can approve a project | A receptionist, generic email, or tenant is not a decision-maker. |
| **Intent and timing** | New plant, expansion, new equipment, job opening, ESG/energy target, generator pain, referral, inbound engagement | Explains *why now* | Intent must include a source link, call note, or customer-provided evidence. |
| **Outcome history** | Contact attempts, qualification answers, bill received, survey, proposal, delivery, client acceptance/rejection, revenue | Lets the product learn which sources and sectors actually work | Only verified human/client actions affect the learning model. |

This structure follows the core pattern used by property-intelligence sales tools: combine property data, decision-maker information, intent signals, and a CRM lifecycle—not a single scraped listing. [1]

## The “10×” Modules

### 1. Territory Intelligence — Search Industrial Clusters, Not Whole Cities

Build a **Territory Map** that starts with industrial estates, logistics corridors, cold-chain hubs, educational campuses, healthcare clusters, and commercial parks. The user selects a city, cluster, facility family, and target profile; the system produces a finite research queue rather than a broad citywide list.

| Control | Example |
|---|---|
| Cluster | Jeedimetla, Medchal, Patancheru, Katedan, Gachibowli, industrial parks, cold-chain corridors |
| Facility family | Textile processing, refrigeration, food processing, warehouse, hospital, hotel, campus |
| Minimum evidence | Business website + facility address + one contact path |
| Exclusions | Pure retail outlet, tenant with no approval path, duplicate, existing solar without expansion signal, public procurement-only entity, do-not-contact |

### 2. Site Feasibility Passport — Remote Screen Before Human Effort

Add a **Site Feasibility Passport** with three states: `Unknown`, `Remote-screened`, and `Site-verified`. The remote screen can use map imagery and, where coverage exists, a rooftop-data service. Google’s Solar API exposes building dimensions, solar potential, imagery/flux/shade layers, and is specifically intended to reduce site-assessment time and prioritise locations; coverage and imagery quality must be checked per location rather than assumed. [2] [3]

The system should show **“preliminary remote signal—site survey required”**, never an exact project promise.

| Remote signal | Confidence | Use |
|---|---|---|
| Standalone factory/campus shape | Medium | Prioritise research, not a quote. |
| Large apparent roof or parking area | Medium | Trigger a facilities/owner call. |
| High-quality supported solar-data response | High for remote screen | Create a preliminary feasibility card. |
| Roof ownership and structural condition | Unknown until confirmed | Mandatory human/site step. |

### 3. Buying-Committee Routing — Find the Right Person, Not Just a Number

Create a **Decision-Maker Ladder** for each account: owner/director → facilities/operations → finance/CFO → sustainability/ESG → admin/reception. The system ranks contacts by role, domain match, and source confidence. It never labels a generic `info@` email as owner-verified.

The research queue should request only the missing evidence: “Find facilities contact”, “confirm plant is owned”, or “ask if daytime bill is above the campaign threshold.” This keeps human research focused and prevents unnecessary data collection.

### 4. Buying-Trigger Engine — Find Reasons to Contact *Now*

An **Intent Ledger** should show why the account became a priority: new facility, expansion, a new refrigeration line, generator/backup pain, an ESG target, a referral, an inbound estimate request, an opening of a facilities/energy role, or engagement with a tailored asset. Every trigger needs a source link or call note.

No trigger means no “hot lead” label. It is simply a fit prospect.

### 5. Explainable Commercial Readiness Score — Evidence, Not Marketing

Replace the current broad solar score with a server-side score that reports its own reasons.

| Dimension | Weight | Evidence required |
|---|---:|---|
| Energy-fit hypothesis | 25 | Sector/process/daytime-load indicators |
| Site and ownership fit | 20 | Owner/lease indication and facility evidence |
| Business scale | 15 | Facility/campus/site footprint or multi-location proof |
| Buying committee access | 15 | Named decision-maker or role-verified contact |
| Contact confidence | 10 | Company-domain email/direct mobile/call route |
| Trigger/intent | 10 | Source-stamped reason to act now |
| State/DISCOM feasibility check | 5 | Current local rule checklist |

The score should return `missing evidence`, `reason codes`, and `confidence` alongside points. It should not create a fake high score merely because a listing has good reviews.

### 6. Sales Concierge — Fast Qualification Without a Long Form

For a qualified response, Klaus or a human rep should guide a short conversation:

1. Is this facility owned or is rooftop work permitted under the lease?
2. Is the daytime electricity bill material enough to review monthly?
3. Is solar/rooftop generation already installed at this site?
4. Who owns the electricity or facility-cost decision?
5. Can the prospect share a recent bill and suitable survey time?

This is more valuable than asking technical roof questions the prospect cannot answer. The outcome is a **survey-ready lead**, not an artificial “conversion.”

### 7. Outcome Learning — Improve From Your Actual Wins

Sales Squad’s campaigns, client acceptance, rejection reasons, and revenue records should feed a **Segment Performance Lab**. It should answer:

* Which cluster and facility type produces the most surveys per 100 verified contacts?
* Which evidence combination predicts bill receipt and appointment attendance?
* Which partner accepts the best-fit leads most consistently?
* Which rejection reasons are avoidable at search time?

Do not use predictive machine learning until there are at least 50–100 outcome-labelled records. Before that, use transparent rules and cohort reporting. This avoids the common failure of using an AI model that simply learns noise from too little data.

## Sales Operating System: The Part Software Cannot Replace

| SLA | Owner | Required action |
|---|---|---|
| Within 15 minutes of a high-intent reply | Sales rep | Review evidence, call or reply personally, log outcome. |
| Within one business day of a 80+ score account | Research/sales | Verify decision-maker and property-control evidence before any sequence. |
| Before a proposal | Partner/technical team | Confirm bill, site survey, regulatory suitability, and final scope. |
| Weekly | Owner | Review source/cluster/sector outcomes and pause poor-performing cohorts. |

The strongest software cannot overcome ignored hot leads, an unresponsive partner, or wrong commercial promises. It can make these bottlenecks visible immediately.

## Implementation Roadmap

### Phase A — High Impact, No New Paid Data Provider

Centralise score calculation on the server; add evidence, confidence, reason-code, decision-maker, ownership, and feasibility fields; build the Research Queue; remove all legacy blanket savings/subsidy language; and enforce an 80+ automation threshold only after evidence requirements are met.

### Phase B — Remote Site Intelligence

Add a settings-controlled external rooftop-data integration. First test coverage for your exact Telangana/Andhra Pradesh target clusters. If the provider supports the location, produce a preliminary site passport. If not, keep the state as `Unknown`; do not fabricate a remote estimate.

### Phase C — Decision-Maker and Intent Intelligence

Add an approved company/contact data provider or a manual research workflow. Store source, timestamp, confidence, and opt-out/consent data. Create evidence-backed intent cards and rep tasks rather than automatic bulk messages.

### Phase D — Learning and Partner Accountability

Connect delivered-lead acceptance, appointment results, proposal values, won/lost reasons, and partner response SLA to the source score. Only then introduce a probability-of-appointment model.

## External Requirements

| Requirement | Needed for | Why it cannot be faked inside the app |
|---|---|---|
| Verified SMTP plus SPF/DKIM/DMARC | Trusted email outreach | Deliverability and reply reputation are controlled by the sending domain/provider. |
| WhatsApp Business provider | Real WhatsApp delivery and status | The app cannot honestly claim sent/read status without provider callbacks. |
| Rooftop/property data provider | Remote site screen | Roof geometry, shade, and imagery coverage come from an external data source. |
| Company/contact data provider or approved research process | Decision-maker routing | Ownership and titles change; they must be sourced and timestamped. |
| Operating discipline | Results | A human must respond, qualify, survey, and close quickly. |

## What “Results” Should Mean

Do not measure success by businesses scraped, emails sent, or generic opens. Measure this funnel:

```text
Facility accounts found
→ evidence-verified prospects
→ decision-maker reached
→ bill/shared qualification
→ survey booked
→ survey attended
→ proposal issued
→ client/partner accepted lead
→ project won / commission received
```

Establish a baseline from the first 50–100 verified prospects, then optimize the worst funnel step. That is how Sales Squad becomes a differentiated lead-intelligence system instead of an attractive dashboard with unreliable outreach volume.

## References

[1] [Convex / ServiceTitan, *Mapping Buildings and Grounds: How to Find Roofing and Solar Deals*](https://www.convex.com/blog/mapping-buildings-and-grounds-how-to-find-roofing-and-solar-deals)

[2] [Google Maps Platform, *Solar API overview*](https://developers.google.com/maps/documentation/solar/overview)

[3] [Google Maps Platform, *Solar API coverage*](https://developers.google.com/maps/documentation/solar/coverage)

[4] [IEEFA and JMK Research, *The rooftop solar commercial & industrial market in India*](https://ieefa.org/resources/rooftop-solar-commercial-industrial-market-india)
