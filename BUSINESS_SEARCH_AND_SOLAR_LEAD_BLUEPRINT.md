# Sales Squad — Business Search and Proper-Lead Blueprint

## Executive Verdict

The current search system is a **useful business-discovery tool**, but it is **not yet a proper solar-sales qualification engine**. It finds businesses, checks basic contactability, and sorts them by a “Solar Score.” However, that score is based mainly on Google Maps visibility proxies—business category, review count, rating, phone, and website—not the information that decides whether a commercial solar project can close.

> **A Google Maps result is a prospect. A qualified solar lead is a prospect with verified energy need, facility control, decision-maker access, and enough project feasibility to justify follow-up.**

Commercial and industrial customers are a valid focus: industry research identifies electricity demand and C&I tariffs as important rooftop-solar drivers, and identifies Telangana and Andhra Pradesh as relatively favourable rooftop-solar ecosystems. The same research also stresses that regulations, net-metering processes, and financing shape viability—so the application must never treat an industry label as a guaranteed deal. [1] [2]

## What the Existing Search Does Well

| Current capability | Why it helps | Limitation |
|---|---|---|
| Google Maps text search by business type and city | Finds local, real businesses quickly | The query is broad and not organized around industrial clusters or owner-controlled facilities. |
| Place Details enrichment | Captures address, website, phone, rating and review count | It does not validate decision-maker identity, property control, electricity intensity, or project timing. |
| Website email extraction | Improves contactability beyond Maps data | It returns the first plausible email, not the best business contact; it does not rank owner/director/facilities/finance contacts. |
| Indian mobile validation | Prevents landline numbers being treated as WhatsApp numbers | A rejected landline can still be a useful switchboard/call path and should be retained as “call only,” not discarded. |
| Duplicate and contacted checks | Reduces repeated outreach | Deduplication is mainly place-ID based; duplicate companies with multiple listings/domains can still enter. |
| Pause, SMTP and run safety controls | Prevents unsafe autonomous sending | They do not improve the quality of who is selected. |

## Current Score: Why It Is Not Sales-Ready

The present score is effectively:

| Signal | Current contribution | Problem |
|---|---:|---|
| Estimated size from Maps types/review count | 10–40 | Reviews are a weak proxy for electricity use, facility size, roof rights, or budget. |
| Broad high-energy category keyword | 15–30 | Useful as an initial filter, but the category can be inaccurate or too broad. |
| Google rating | 8–15 | Rating measures customer reputation, not solar fit. |
| Phone available | 10 | Contactability matters, but a generic number is not a decision-maker signal. |
| Website available | 5 | A website is a weak proxy unless its content confirms plant, facility, ownership, expansion, or decision-maker evidence. |

The automatic worker accepts scores as low as **30/100**. In practice, that makes the score a *contactability/discoverability score*, not a *solar-buying-readiness score*. The same formula is also duplicated in the automated worker, manual search page, contacts page, and referrer search page, which risks inconsistent changes over time.

There are also two commercial-message problems to remove before outreach resumes. The manual WhatsApp fallback still claims up to 80% bill reduction and a government subsidy, while the automated email wrapper says the chatbot will calculate “exact savings” and references roof size and state subsidies. These claims conflict with the more conservative pitch safeguards recently added and are not appropriate for commercial qualification without site, bill, and policy review.

## How a Real Solar Sales Rep Would Search

Start with **energy use and facility control**, not a generic “business” keyword. The first search should be built around a city’s industrial belt or commercial cluster, then narrowed to facility types with a credible day-load profile and roof/parking potential.

| Priority | First search families | Why they belong at the top | Common caution |
|---|---|---|---|
| A | Textile processing, rice/dal/flour mills, food processing, plastics, printing/packaging, engineering works, foundries, fabrication, pharma manufacturing | Sustained daytime load and production economics can justify a serious assessment | Verify factory premises are owned or the lease allows rooftop work. |
| A | Cold storage, ice plants, dairy chilling, warehouses with refrigeration, logistics facilities | Refrigeration and daytime operating load are attractive starting hypotheses | Confirm the location is not merely an office or small storage outlet. |
| A/B | Private hospitals, diagnostic centres, nursing homes, multi-speciality clinics | Continuous electricity use and resilience needs can create a strong business case | Confirm decision authority and existing backup/solar arrangements. |
| B | Hotels, resorts, large hostels, banquet venues, large restaurants/food courts | Cooling, hot-water, lighting and daytime use can be relevant | Small leased outlets should be deprioritized. |
| B | Private schools, colleges, universities, coaching campuses | Campus load and roof area can be meaningful | Government/public institutions and leased buildings have slower procurement. |
| B/C | IT parks, commercial buildings, retail complexes | Potentially large loads, but building ownership and tenant split are decisive | Target property/facility owner—not a tenant or front desk. |

### Better Query Pattern

Use a three-part query structure:

```text
[specific facility type] + [industrial cluster / neighbourhood] + [city]
```

Examples include `textile processing unit in Jeedimetla Hyderabad`, `cold storage in Medchal Hyderabad`, `pharmaceutical manufacturing in Patancheru Hyderabad`, and `warehouse in Gachibowli Hyderabad`. This is substantially better than searching a whole city for “factories,” because it finds density, comparable facilities, and repeatable sales territory.

## The Proper 100-Point Lead Quality Model

Replace the current generic Solar Score with an explainable **Commercial Solar Readiness Score**. Each point must be linked to evidence, not invented by the AI.

| Dimension | Weight | Evidence to capture | What it means |
|---|---:|---|---|
| Energy-fit hypothesis | 25 | Sector, cooling/refrigeration/production process, operating hours, multi-shift indicator | Is there a credible reason to investigate electricity savings? |
| Facility control and site fit | 20 | Owner/long lease confirmation, standalone facility, roof/parking indicator, number of locations | Can the business actually authorize and host a project? |
| Business scale | 15 | Factory/campus/hospital/warehouse evidence, company profile, staff/location count, recurring operations | Is the potential likely large enough for a sales visit? |
| Decision-maker access | 15 | Named owner/director/facilities/operations/finance contact, title, verified direct channel | Can Sales Squad reach someone who can evaluate the project? |
| Contact confidence | 10 | Domain-matched work email, direct mobile, contact-page match, call-only landline | Is the contact usable and trustworthy? |
| Intent and trigger | 10 | Expansion, new facility, high tariff concern, ESG/RPO target, generator cost, new equipment | Is there a reason to act now? |
| State / DISCOM feasibility | 5 | Verified state and applicable local feasibility checklist | Is there a known reason to pause before site review? |

### Score Bands and Actions

| Score | Action | Sales behavior |
|---:|---|---|
| 80–100 | **Sales-ready** | Human-reviewed personalised outreach within one business day; call first where a direct decision-maker number exists. |
| 65–79 | **Research then outreach** | One enrichment pass: identify owner/facilities contact, check site/facility control, then contact. |
| 45–64 | **Nurture / low-priority** | Keep for later, but do not spend automation volume first. |
| Below 45 | **Do not automate** | Exclude unless new evidence changes the result. |

### Hard Exclusions or Manual Review Flags

The system should stop automated outreach or require manual review when it detects: an existing solar installation without an expansion signal; a tenant with no owner/lease permission; a very small outlet rather than a facility; a duplicate company; a public/government procurement-only entity; a do-not-contact request; or a contact record with no evidence it belongs to the company.

## Enrichment Pipeline: The Difference Between Volume and Proper Leads

The next version of Find Leads should process results in stages rather than treating Google Maps as the final source.

| Stage | What the app should collect | Outcome |
|---|---|---|
| 1. Discover | Specific facility category, industrial cluster, Maps place, address, website | Real business candidate |
| 2. Verify company | Website/domain match, legal/company name, multi-location clues, active facility language | Remove misleading listings and duplicates |
| 3. Find the right person | Owner, director, plant/facilities manager, operations head, finance/CFO—plus evidence source | Reach the buyer rather than reception |
| 4. Pre-qualify | Ownership/lease, bill band, operating hours, existing solar, decision process, desired outcome | Determine whether a site survey is worth scheduling |
| 5. Route | Score band, reason codes, next action, assigned sales owner | Prevent blind bulk sending |

The website extractor should rank addresses by role and confidence rather than choosing the first email. A useful ranking is: owner/director/operations/facilities/finance > sales/general `info@` > support/no-reply. It should also require a domain-to-company match where possible.

## Practical Qualification Call Script

The first human call should not quote savings or subsidy. It should ask four short business questions:

1. “Do you operate from this facility, and is the building owned or under a lease that allows rooftop work?”
2. “Is your daytime electricity use significant enough that you review the bill monthly?”
3. “Do you already have solar or a large generator setup at this location?”
4. “Who handles facility, operations, or electricity-cost decisions there?”

Only after the decision-maker confirms interest should the sales rep request the latest bill and book a preliminary site assessment. That turns the product from an email sender into a controlled lead-quality system.

## What I Would Build Next — In Order

1. **Centralize the scoring engine on the server.** Remove the duplicated UI-only formulas and store score, evidence, confidence, reason codes, and last-enriched time in the database.
2. **Add a “Search Blueprint” UI.** Let the user choose industrial cluster, specific facility family, ownership priority, minimum score, and contact preference before any Maps query runs.
3. **Create a manual Research Queue.** All 65–79 leads should receive one owner/facility enrichment pass before email. Do not automate them blindly.
4. **Add decision-maker and site-control fields.** Mark data as unknown until it is actually verified through website/call/approved data source.
5. **Build exact blockers and reason codes.** Examples: `tenant_no_permission`, `already_has_solar`, `wrong_contact`, `low_day_load`, `not_in_service_area`, `duplicate`, and `do_not_contact`.
6. **Add outcome learning.** Once 30–50 delivered leads have outcomes, calculate which sectors, clusters, score factors, and first-contact methods actually create appointments—not just opens.
7. **Correct all legacy fallback messages before re-enabling outreach.** Remove all blanket savings, subsidy, and “exact estimate” claims; keep claims preliminary and bill/site-survey dependent.

## References

[1] [JMK Research & Analytics / IEEFA, *Powering up Sunshine – Untapped Opportunities in India’s Rooftop Solar Market*](https://jmkresearch.com/renewable-sector-published-reports/powering-up-sunshine-untapped-opportunities-in-indias-rooftop-solar-market/)

[2] [IEEFA and JMK Research, *The rooftop solar commercial & industrial market in India*](https://ieefa.org/resources/rooftop-solar-commercial-industrial-market-india)
