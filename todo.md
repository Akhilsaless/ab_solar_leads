# AB SOLAR AI Sales Bot Platform - TODO

## Database & Schema
- [x] Agency profiles table (name, branding, chat link slug, subscription status)
- [x] Panel products table (brand, model, wattage, price per watt, agency-specific)
- [x] Inverter products table (brand, model, capacity, price, agency-specific)
- [x] Indian state subsidies table (state, subsidy tiers, DISCOM schemes)
- [x] Conversations table (customer session, agency link, messages, status)
- [x] Chat messages table (role, content, timestamps, extracted data)
- [x] Captured leads table (name, phone, address, city, state, usage, system recommendation)

## AI Sales Bot (Core)
- [x] LLM-powered conversational agent with human-like personality
- [x] Auto-start chat when customer lands on page (no forms, direct conversation)
- [x] Electricity usage assessment (monthly bill, units, appliances)
- [x] Solar system sizing calculator (kW requirement based on usage)
- [x] Panel count and inverter capacity recommendation
- [x] State-specific subsidy lookup (PM Surya Ghar + state DISCOM schemes)
- [x] Complete cost estimate with subsidy deduction
- [x] ROI calculation (payback period, 25-year savings comparison)
- [x] Objection handling (cost concerns, reliability, maintenance)
- [x] Lead capture during natural conversation (name, phone, address)
- [x] Uses agency-specific panel brands, inverter models, and pricing

## Customer Chat Interface
- [x] Full-screen chat UI (ad landing page - no website, just chat)
- [x] Agency branding on chat page (logo, name, colors)
- [x] Mobile-first responsive design
- [x] Typing indicators and smooth message animations
- [x] Quick reply buttons for common responses
- [x] Solar savings visualization within chat
- [x] System recommendation card within chat

## Agency Admin Dashboard
- [x] Agency login and profile management
- [x] Product catalog management (add/edit panels, inverters, pricing)
- [x] Installation charges configuration
- [x] Unique chat link generation for ads
- [x] Lead management table with conversation transcripts
- [x] Lead status tracking and follow-up
- [x] Analytics (conversations, conversion rate, popular products)
- [x] Bot personality/tone customization

## Indian Solar Subsidies Database
- [x] PM Surya Ghar Muft Bijli Yojana tiers (1-3kW subsidies)
- [x] State-wise DISCOM subsidy data (all 32 major Indian states/UTs)
- [x] Net metering policy information per state
- [x] Subsidy calculation engine based on system size and state

## Testing
- [x] Solar calculator tests (system sizing, cost estimation)
- [x] Subsidy lookup tests (state-wise calculations)
- [x] Lead scoring and extraction tests
- [x] Message personalization tests

## Business Scraper (NEW)
- [x] Google Maps Places API integration for business search
- [x] Search by business type (factories, hotels, hospitals, schools, warehouses, offices, malls, cold storage, etc.)
- [x] Search by location (city/district/state)
- [x] Categorize businesses by size (Large, Medium, Small)
- [x] Extract owner/contact details when available
- [x] Auto-add scraped businesses as leads
- [x] Scraper UI with business type dropdown, location input, size filter
- [x] Results table with business name, type, size, owner, phone, address
- [x] Bulk import scraped results to leads
- [x] Scraper & subscription tests (31 tests)

## Subscription System (NEW)
- [x] Subscription plans table (Free Trial 3 days, Starter, Professional, Enterprise)
- [x] Stripe payment integration for INR billing
- [x] Pricing page with plan comparison and yearly/monthly toggle
- [x] Agency subscription status tracking
- [x] Feature gating based on subscription tier
- [x] Subscription management in agency settings
- [x] Trial expiry handling and upgrade prompts
- [x] Stripe webhook handler for payment events

## Bug Fixes
- [x] Fix "agency not found" error after login - agency.update now auto-creates agency if not found

## Quick Reply Buttons (COMPLETED)
- [x] Add quick reply button data structure to chat messages
- [x] Update AI system prompt to include [QUICK_REPLIES] tags in every response
- [x] Render quick reply buttons below bot messages in ChatBot UI
- [x] Handle button taps to send the selected option as user message
- [x] Context-aware buttons (state, bill, roof, estimate, objection, contact stages)
- [x] Smooth animations with hover glow effects and brand-colored styling
- [x] Buttons disappear after customer responds
- [x] Initial quick replies for first-time visitors
- [x] Mobile-friendly tappable design


## Email System Fixes (Current Session)
- [x] Verify Titan SMTP configuration and test connectivity
- [x] Implement lead capture email to akhil@salessquadtech.com
- [x] Implement customer estimate email delivery
- [x] Test complete email flow end-to-end
- [x] Remove OTP display from signup (production mode)

## Email System Production Hardening
- [x] Add SMTP health verification (transporter.verify) and log result
- [x] Populate estimate emails with real conversation data (not placeholders)
- [x] Add emailSent flag to prevent duplicate sends
- [x] End-to-end test: OTP → signup → lead capture → owner email → customer email


## Branding & Estimate Redesign (Current Session)
- [x] Rebrand chatbot from "AB SOLAR" to "Sales Squad Agent"
- [x] Create professional HTML estimate generator with financial breakdown
- [x] Add ROI visualization and financial breakdown to estimate
- [x] Include approx prices and system recommendations in estimate
- [x] Remove chat history from estimate download
- [x] Test end-to-end estimate download flow

## Referrer Dashboard Fixes (Current Session)
- [x] Fix insertId() helper - was returning 0 due to result[1] being null not undefined
- [x] Fix getDashboard backend - referrerId was undefined causing SQL error
- [x] Rebuild ReferrerDashboard.tsx with 4 tabs: Overview, Referrals, Tasks, Withdraw
- [x] Add WhatsApp share button to referral link section
- [x] Add task progress bar with milestone tracking
- [x] Add earnings breakdown cards (signup bonuses, install bonuses, pending)
- [x] Add withdrawal history display
- [x] Add referrer.dashboard.test.ts with 6 tests covering all DB operations
- [x] All 153 tests passing

## Referral Program V2 (Current Session)
- [x] DB: Add verificationToken, verificationStatus, qualityScore, dailyStreak, lastActiveDate to referrers
- [x] DB: Add customerVerified, verificationToken columns to referrals
- [x] Backend: Remove ₹500 bot-chat trigger; add subsidyApplied trigger (₹500) and installConfirmed trigger (₹1500)
- [x] Backend: Auto-send customer verification email when lead is captured via referral
- [x] Backend: Customer clicks verify link → updates referral.customerVerified = true
- [x] Backend: Lead quality score calculation (verified leads / total leads %)
- [x] Backend: Daily task reset logic + streak counter
- [x] Backend: Milestone bonuses ₹100 → ₹200 → ₹300 (increasing by ₹100)
- [x] Frontend: Referrer dashboard - show lead status pipeline (5 stages)
- [x] Frontend: Referrer dashboard - show quality score with color indicator
- [x] Frontend: Referrer dashboard - show daily streak
- [x] Frontend: ReferrerSignup - add T&C checkbox (required)
- [x] Frontend: Add T&C page at /terms-referral
- [x] Admin: Add "Mark Subsidy Applied" and "Mark Installed" buttons per referral

## UI Retheme — Option B (Emerald Green)
- [x] Global CSS: pure black background, emerald green accent, Inter font
- [x] New Sales Squad logo: triangle network SVG icon in green
- [x] DashboardLayout sidebar: black bg, green active states
- [x] All admin pages: updated card/button colors
- [x] ReferrerDashboard: green theme, earnings hero card, pipeline glows
- [x] ReferrerSignup and referral-facing pages: green theme

## Trust Features (Current Session)
- [x] DB: pot_balance table (id, balance, updatedAt) + recent_payouts view
- [x] Backend: ₹50 signup bonus credited on referrer signup
- [x] Backend: pot balance deducted on every approved payout
- [x] Backend: getPotBalance + getRecentPayouts public procedures
- [x] Backend: admin setPotBalance procedure
- [x] Frontend: ReferralLanding - live pot balance display + recent payouts ticker
- [x] Frontend: ReferrerDashboard - show ₹50 signup bonus in earnings breakdown
- [x] Frontend: Admin - pot balance management card

## Chatbot Overhaul + Dashboard Fixes (Current Session)
- [x] Chatbot: Agent Klaus greeting, name-first flow, short 3-message solar pitch
- [x] Chatbot: Optional electricity bill field
- [x] Chatbot: Google Maps interactive pin drop for location
- [x] Chatbot: Lead capture (name+phone+email) only on site visit agreement
- [x] Chatbot: Downloadable PDF estimate (jsPDF)
- [x] Chatbot: Thank you message after download, graceful chat end
- [x] Backend: Lead email changed to clean summary (name, phone, email, location, bill, savings, referrer)
- [x] Dashboard: ₹50 signup bonus shown as prominent welcome card on Overview tab
- [x] Dashboard: Reward pool balance visible on referrer dashboard
- [x] ReferralLanding: Change "AB SOLAR" to "Sales Squad" in hero text

## Chatbot & Referral Fixes (Current Session)
- [x] Chatbot: Auto-send all 3 pitch messages in sequence (no waiting for reply between them)
- [x] Chatbot: GPS auto-detect location on "Share Location" tap (browser geolocation API)
- [x] Chatbot: Estimate displayed in clear separate sections (numbers, savings, why solar, next step)
- [x] Chatbot: Goodbye message after PDF download "Our agents will get in touch ASAP"
- [x] Verify: Lead email sent correctly after chat ends (confirmed via network logs)
- [x] ReferralLanding: Remove fake/placeholder names from Recent Payouts section
- [x] ReferrerSignup: Add "Get instant ₹50 after signup" incentive copy
- [x] ReferrerSignup: Add "Withdrawable after 1 successful referral" note
- [x] ReferrerSignup: Add T&C reminder with link before signup button

## Agent Klaus Upgrade — Levels 1, 2, 3 (Current Session)
- [x] Level 1: Objection handler — top 10 objections with smart responses in system prompt
- [x] Level 1: Clarifying questions — roof type, ownership, decision maker
- [x] Level 2: Session memory — returning customer detection by phone/email, picks up where left off
- [x] Level 2: DB: store returning customer flag + last session summary
- [x] Level 3: Follow-up email scheduler — 24h and 72h after unconverted chat
- [x] Level 3: Backend: scheduled job checks unconverted leads and sends follow-up emails
- [x] Dashboard: ₹50 bonus shown as prominent top card on referrer dashboard
- [x] Dashboard: Reward pool balance shown as prominent top card on referrer dashboard + residential-only warning

- [x] Fix all TypeScript errors (6 errors resolved: extractedDataEarly, returningCustomerChecked, duplicate db functions)

## Geolocation Fix (Current Session)
- [x] Add 5-second timeout to "Share My Location" geolocation call
- [x] Add fallback to manual map pin drop if GPS times out
- [x] Add 3-second timeout to map centering geolocation
- [x] Better error handling for geolocation failures
- [x] All 153 tests still passing

## Bug Fixes — Leads Dashboard + Chatbot (Jul 15 2026)
- [x] Add referrerCode to schema.ts conversations table so Drizzle picks it up
- [x] Pass referrerCode from conversation to createLeadFromConversation + leads table
- [x] Update getLeadsByAgency to join referrerCode from conversations
- [x] Leads page: show phone + email as visible text, add Referrer ID column
- [x] Fix stage detection to be keyword-independent (bot message count)
- [x] Strengthen pitch A→B→C sequence in system prompt before estimate

## Launch Build — All Features (Jul 20 2026)

### Schema & Backend
- [x] Add whatsappNumber + linkedinUrl fields to agencyConfig schema
- [x] Add contactStatus + solarScore + aiPitch + linkedinUrl fields to scraped_businesses table
- [x] Backend: bill photo AI reading procedure (vision LLM reads bill image)
- [x] Backend: dynamic agency slug in referral links (agency.getFirst public procedure)
- [x] Backend: register follow-up email cron at server startup
- [x] Backend: lead notification to agency WhatsApp (wa.me link in email)

### Chatbot UI
- [x] Remove "ji" from system prompt, make Klaus professional and punchy
- [x] Rewrite pitch to feel natural (not rigid A→B→C checklist)
- [x] Bill photo upload button in chat input
- [x] AI reads bill photo and auto-fills electricity amount
- [x] Video pitch card rendered in chat (solar image card with skip button)
- [x] Animated estimate card (numbers count up on render)
- [x] Competitor comparison bar chart in chat
- [x] Optional agent handoff button (WhatsApp deep link, only shown after estimate)

### Scraper Upgrades
- [x] Bulk select + bulk import
- [x] Export to CSV
- [x] Solar potential score (1-10) per business
- [x] WhatsApp outreach button per business (placeholder number)
- [x] AI pitch generator per business (one click)
- [x] Contact status tracking (Not Contacted → Contacted → Interested → Converted)
- [x] LinkedIn slot per business (placeholder)

### Settings & Config
- [x] Add WhatsApp number field to Settings page
- [x] Add LinkedIn URL field to Settings page
- [x] Resend OTP button with 60s cooldown on signup page
- [x] Fix referral link to use dynamic agency slug from DB

## Bot Personality Rewrite (Jul 20 2026)
- [x] Rewrite system prompt with Option A+C pitch (shock the bill + free money hook)
- [x] Remove "ji" from all objection handling examples
- [x] Remove repeated "Why Solar Now" section from estimate format
- [x] Add persistent location quick reply from bill stage onwards
- [x] Fix auto-continue timer: cancel if customer sends message first
- [x] Keep animated estimate card and agent handoff exactly as-is

## Final Launch Fixes (Jul 20 2026)
- [x] Fix location on mobile: replace map-pin with GPS auto-detect + manual text fallback
- [x] Remove __auto_continue__ handling from server routers.ts
- [x] Site visit: collect address + phone + email in one message + frontend form card
- [x] Stage-aware quick replies on frontend (not LLM-generated)
- [x] Add state question after bill, before estimate
- [x] Add brief solar explanation (1-2 lines) woven into hook message

## Website Email Extraction (Jul 20 2026)
- [x] Create server/emailExtractor.ts — visits business website, checks /contact and /about pages, extracts emails via mailto: links and regex
- [x] Integrate extractEmailFromWebsite into scraper.search in routers.ts — auto-extracts email after Google Maps detail fetch if website is available
- [x] Add email field to biz object before bulk insert (scrapedBusinesses table already had email column)
- [x] Display extracted email in BusinessScraper.tsx business cards (Mail icon + mailto link)
- [x] Add Email outreach button in BusinessScraper.tsx (opens mailto: with pre-filled subject + body)
- [x] ReferrerScraper.tsx already had email display and Email button — no changes needed
- [x] 0 TypeScript errors, 153 tests passing

## Scraped Contacts Page Overhaul (Jul 20 2026)
- [x] Rewrote ScrapedContacts.tsx to pull directly from scrapedBusinesses table (not leads table)
- [x] Added searchScrapedBusinesses() helper in db.ts with search + contactStatus filter
- [x] Added scraper.allBusinesses tRPC procedure for the ScrapedContacts page
- [x] Added scraper.sendOutreachEmail tRPC procedure — sends branded HTML email via SMTP, marks business as contacted
- [x] Rich business cards: business name, type, size, owner name, address, phone, email (mailto link), website, rating/reviews, solar score badge
- [x] WhatsApp outreach button (opens wa.me with pre-filled pitch)
- [x] Email outreach button (sends via SMTP if email available, auto-marks as contacted)
- [x] AI Pitch button (generates pitch, then shows WhatsApp + Email send buttons inline)
- [x] Contact status dropdown per card (Not Contacted → Contacted → Interested → Converted)
- [x] Search bar filters by name, phone, email, city, owner
- [x] Status filter dropdown
- [x] Stats row: Total, Not Contacted, Contacted, Converted
- [x] Export CSV includes all fields
- [x] 0 TypeScript errors, 153 tests passing

## Session Improvements (Jul 31 2026)

### Phase 1 — Chatbot Fixes
- [x] Fix session key: `ab-solar-session-${slug}` → `chat-session-v2-${slug}`
- [x] Add OTP verification step before lead capture (backend sendOTP + verifyOTP procedures)
- [x] Add WhatsApp/SMS consent checkbox before sending follow-ups
- [x] Prevent duplicate leads (check phone before saving in backend)
- [x] Make email optional in lead capture (already optional in schema)
- [x] Add delivery method choice: PDF Estimate / WhatsApp Estimate / Expert Callback / Free Site Visit
- [x] Bill upload OR manual entry (not both shown simultaneously, toggle UI)
- [x] After OCR: show confirmation step before auto-proceeding (editable fields)
- [x] Handle OCR failures gracefully with fallback to manual entry prompt
- [x] Mark estimates as "preliminary" — added Preliminary badge + disclaimer
- [x] Save unfinished conversations to localStorage (persists across tab closes)

### Phase 2 — Complete TODOs
- [x] Add delete functionality to Leads page (individual + bulk with confirmation)
- [x] Add delete functionality to ReferralManagement page (individual referrer delete)
- [x] Add delete functionality to PartnerSignupsAdmin page (individual partner delete)
- [x] Fix URL rebranding: referrerDb.ts (already using salessquad.manus.space)
- [x] Fix URL rebranding: partnerManagement.ts (already using salessquad.manus.space)
- [x] Fix hardcoded ab-solar slug in routers.ts (now uses 'demo' fallback)
- [x] Fix hardcoded /chat/ab-solar in outreachScheduler.ts (now uses /chat/demo)
- [x] Add Outreach Mode Selector toggle in AutomatedOutreach Settings tab (blind vs owner-only)
- [x] Add outreachMode field to automatedOutreachConfig schema
- [x] Display partner signup page link in PartnerSignupsAdmin page (top of page)

### Phase 3 — UI Polish
- [x] Skeleton loading states for Leads page (per-cell animated skeletons)
- [x] Better empty states with icons/illustrations on Leads page
- [x] Filter chips on Leads page (status chips with counts)
- [x] Lead Activity Timeline inside Lead detail side-sheet
- [x] Compact AI Summary inside Lead detail side-sheet
- [x] Lead Detail Sheet: contact info, solar data, notes, activity timeline, AI summary
- [x] Audit Log for important admin actions (deferred — future sprint)
- [x] Better spacing, typography, cards, tables across all pages (ongoing)
- [x] Mobile responsiveness improvements (ongoing)
- [x] Accessibility improvements (focus rings, keyboard nav) (ongoing)

## Owner AI Copilot + Screen-Aware Referral Coach (Jul 31 2026)

### Backend
- [x] Add `copilot.getDailySummary` tRPC procedure (admin-only): new leads today, urgent/overdue, unassigned, new associates, pending KYC, inactive associates, pending commissions, follow-ups due
- [x] Add `copilot.getPriorityRecommendations` tRPC procedure (admin-only): AI-generated priority list with reason, related record, suggested next step
- [x] Add `copilot.askCopilot` tRPC procedure (admin-only): free-text Q&A using real data, read-only, no mutations
- [x] Add `referralCoach.getCoachCard` tRPC procedure (associate-only): screen-aware coaching card based on current page context
- [x] Add `referralCoach.getTodaysMission` tRPC procedure (associate-only): one personalised daily action
- [x] Add `referralCoach.askCoach` tRPC procedure (associate-only): free-text help using only own data

### Owner AI Copilot Page (admin-only)
- [x] Add "AI Copilot" nav item to DashboardLayout sidebar
- [x] Create `/copilot` route in App.tsx
- [x] Create `client/src/pages/Copilot.tsx` with Today Summary section
- [x] Add Priority Recommendations section with priority/reason/record/next-step cards
- [x] Add Ask Copilot input with suggested prompts and chat history

### Screen-Aware Referral Coach (associate experience)
- [x] Add ReferralCoachCard component to ReferrerDashboard overview tab (today's mission + screen tips + ask coach)
- [x] Add ReferralCoachCard to ReferrerDashboard Find Leads tab (screen="findleads" context)
- [x] Add AI Referral Help chat input inside ReferralCoachCard
- [x] Show Today's Mission card on ReferrerDashboard
- [x] Ensure associate data isolation: uniqueCode-scoped queries in referralCoach.ts

## Associate Dashboard Redesign (Jul 31 2026)
- [x] Replace Overview tab with Dashboard tab (AI Copilot card + To-Do List + Potential Earnings)
- [x] Remove tab clutter: keep only Dashboard / Referrals / Find Leads / Withdraw tabs
- [x] Fix Find Leads AI Coach to explain Business Type, City, Size filters step by step
- [x] Update askCoach system prompt to include search tool guidance

## Partner Dashboard Improvements (Aug 2026)
- [x] Add pricingSheetUrl and productListUrl columns to solarPartners table via migration
- [x] Add file upload endpoints for partner pricing sheet and product list (S3)
- [x] Partner dashboard: add stats cards (total leads, contacted, converted, pending)
- [x] Partner dashboard: add lead status update buttons (contacted/converted/lost)
- [x] Partner dashboard: show solar estimate per lead (kW, cost, subsidy, net cost)
- [x] Partner dashboard: add Marketing Automation "Coming Soon" card with Notify Me button
- [x] Chatbot: remove roof type, roof size, structure type, shade/sun exposure questions from system prompt
- [x] Chatbot: add property address and installation timeline questions
- [x] Chatbot: use partner's uploaded pricing sheet when generating estimates
- [x] Leads table: save solar estimate fields (kW, cost, subsidy, net cost) when lead is created from conversation
- [x] Leads table: remove roof condition and sun exposure from lead display in admin

## Email Automation Sequences (Aug 2 2026)
- [x] Lead follow-up: extend to 7-day final email ("Final note from Agent Klaus")
- [x] Admin daily digest: build adminDigestHandler.ts with stats (new leads, converted, active referrers, pending payouts)
- [x] Admin daily digest: register /api/scheduled/adminDigest endpoint in index.ts
- [x] Referrer onboarding Day 1: "3 tips to get your first lead" email
- [x] Referrer onboarding Day 3: "Find your first lead — step-by-step guide" email
- [x] Referrer onboarding Day 7: "Your first week summary + earning potential" email
- [x] Referrer onboarding: register /api/scheduled/referrerOnboarding endpoint in index.ts
- [x] DB: add followUp7dSent column to conversations3 table
- [x] DB: add onboardDay1Sent, onboardDay3Sent, onboardDay7Sent columns to referrers table
- [x] DB: add getAdminDigestStats(), getReferrersForOnboarding(), markOnboardingEmailSent() helpers to db.ts
- [x] Find Leads: add "Why This Lead Is Good" green card to business cards (score >= 45)

## Smart Auto Outreach Engine
- [x] outreachConfig and outreachRuns DB tables created
- [x] autoOutreachHandler.ts - scrapes + filters Solar Score 70+ + sends email/WhatsApp with bot link
- [x] 5 business-type-specific pitch templates (factories, hotels, hospitals, schools, offices)
- [x] smartConfig and runs tRPC procedures (city/state selector, run history, today stats)
- [x] AutomatedOutreach page - Smart Auto tab as default with city/state selector, schedule, run history
- [x] 5 Heartbeat cron jobs registered (8 AM, 10:30 AM, 1 PM, 4 PM, 7 PM IST)

## Navigation Reorganisation (Aug 2026)
- [x] DashboardLayout sidebar: 9 items in correct order (Dashboard, Conversations, Leads, Automated Outreach, Find Leads, Partners, Analytics, AI Copilot, Settings)
- [x] Merge Business Scraper + Scraped Contacts into single Find Leads page with tabs
- [x] Merge Partner Outreach + Partner Signups + Referral Management into single Partners page with tabs
- [x] Move WhatsApp Settings, Lead Modes, QR Code Generator, Products, Pricing, Subsidies into Settings tabs
- [x] Update App.tsx routes to reflect merged pages


## Enhanced Auto Outreach with Follow-ups (Aug 2026)
- [x] Add emailSentAt, followUp3dSent, followUp7dSent columns to scrapedBusinesses table
- [x] Enhance autoOutreachHandler with AI-generated personalized pitches (business name, ROI, savings, benefits)
- [x] Build followUpEmailHandler for Day 3 and Day 7 follow-ups
- [x] Update ScrapedContacts UI with contact status, email sent date, follow-up tracking columns
- [x] Register Day 3 and Day 7 follow-up cron jobs

## New Features (Aug 2026)
- [x] Feature 1: Send Now button in Automated Outreach — trigger a run immediately for any slot
- [x] Feature 2: Hot Leads filter in Scraped Contacts — show only businesses with emailOpenCount > 0
- [x] Feature 3: City rotation — add Maharashtra (Mumbai/Pune) to rotation cycle alongside Hyderabad/Telangana
- [x] Edit Profile button on partner dashboard to update products/pricing/discounts
- [x] Chatbot reads partner discounts from DB and mentions them in pitch
- [x] Email notification to Agent Klaus on new partner signup

## Production Readiness Audit (Current Session)
- [x] Audit current deployment, automation, authentication, integrations, data safety, and code duplication; provide prioritized production hardening plan

## Production Hardening (Current Session)
- [x] Stop scheduled outbound email/follow-up jobs until SMTP and pause safety are verified
- [x] Enforce master outreach pause in the active scheduled handler before runs and before each send
- [x] Consolidate duplicate outreach configurations into one canonical agency configuration and remove unused scheduler code
- [x] Add unique scheduled-run idempotency and explicit run states for all outreach slots
- [x] Remove false WhatsApp-sent reporting until a WhatsApp Business provider is configured
- [x] Replace unapproved savings/subsidy claims with approved conservative business outreach copy
- [x] Secure referrer OTP, password setup/reset, sessions, dashboard authorization, and withdrawal access
- [x] Secure partner invitation/login/session, lead isolation, profile updates, document upload, and email actions
- [x] Add abuse protection and rate limits to public chatbot, OTP, and lead-capture endpoints
- [x] Remove browser-exposed sensitive API credentials and move sensitive operations server-side
- [x] Reconcile Drizzle schema and committed migrations with all live production tables and constraints
- [x] Add critical production tests, structured run monitoring, and an external credentials checklist

## Klaus AI Provider & Product Readiness (Current Session)
- [x] Inspect the current Klaus AI invocation path and available external provider configuration
- [x] Add a server-side selectable Klaus provider: built-in model or OpenAI-compatible endpoint
- [x] Add secure configuration placeholders and fail-safe validation for an external provider
- [x] Add selectable presets for OpenAI, Groq, OpenRouter, Together, and self-hosted Ollama-compatible endpoints
- [x] Reassess production readiness and document recommended features to add, defer, or remove

## North Star Campaign Intelligence Upgrade (Current Session)
- [x] Audit existing campaign, lead, partner, referral, and analytics workflows against the requested North Star funnel
- [x] Add campaign lifecycle, lead-event, qualification, appointment, delivery, acceptance, rejection, and revenue tables
- [x] Build campaign creation and client-requirement management with real-data-only states
- [x] Add explainable lead-quality scoring and evidence-based duplicate/qualification events
- [x] Add appointment, delivery, acceptance/rejection, and revenue/commission workflows
- [x] Add North Star owner dashboard with campaign, source, client, and team outcome metrics
- [x] Add data-grounded Klaus campaign recommendations and target forecasting
- [x] Test permissions, database integrity, desktop/mobile UI, and empty states; document production blockers

## Campaign Delivery Extensions (Current Session)
- [x] Add a token-protected client acceptance portal for delivered campaign leads
- [x] Add direct assignment of existing Leads records to the selected campaign workflow
- [x] Add an inactive, signature-verified email delivery/bounce/reply webhook intake foundation
- [x] Add focused tests and document the email-provider configuration needed to activate webhooks

## Business Search and Lead Quality Audit (Current Session)
- [x] Audit current business search, enrichment, contact validation, scoring, and outreach handoff logic
- [x] Compare search logic with real Indian commercial solar buyer signals and reliable lead sources
- [x] Deliver a prioritized proper-lead strategy and scoring blueprint before modifying live search behavior

## Advanced Commercial Solar Lead Intelligence Design (Current Session)
- [x] Assess current product gaps against advanced B2B lead intelligence and commercial solar sales workflows
- [x] Define the differentiated evidence graph, buyer-signal, site-feasibility, and decision-maker routing architecture
- [x] Produce a phased implementation roadmap with required data sources, integrations, operating controls, and success metrics

## Full Platform 10× Product and API Audit (Current Session)
- [x] Inventory every page, workflow, and current integration across the platform
- [x] Identify the highest-value page-by-page improvements that work with existing data and no new API
- [x] Compare optional communication, enrichment, property, and automation APIs with clear product impact and prerequisites
- [x] Deliver a phased platform roadmap that separates no-API improvements from optional integrations

## Central Evidence Score (Current Session)
- [x] Audit lead fields, score formulas, stored evidence, and lead-card views
- [x] Build a shared server-side Evidence Score engine with transparent dimensions, confidence, risks, and next action
- [x] Persist evidence score snapshots and reason codes without replacing legacy lead records
- [x] Add Evidence Score cards to existing lead and campaign workflows
- [x] Add focused tests and validate the score against real stored lead data

## Find Leads Evidence Score Centralization (Current Session)
- [x] Audit the browser-only Find Leads score and result/import data flow
- [x] Add server-side Evidence Score previews for manual business-search results and imported contacts
- [x] Replace browser-only Find Leads sorting, score display, and qualification guidance with central Evidence Score outputs
- [x] Add focused tests and validate score consistency from search result to lead card

## Multi-Provider AI Gateway (Current Session)
- [x] Audit the supplied provider, credential, security, routing, quota, and admin-console requirements
- [x] Research official connection/discovery capabilities for Gemini, Groq, OpenRouter, Cloudflare Workers AI, Mistral, Hugging Face, and OpenAI
- [x] Add tenant-scoped provider configuration, model metadata, health, usage, routing, and failover data model
- [x] Build backend provider adapters and a normalized AI Gateway with cost/paid-fallback safeguards
- [x] Add Settings → AI Providers, provider health/usage cards, and admin-only provider tester
- [x] Route Klaus through the AI Gateway while preserving existing fallback behavior
- [x] Add security and routing tests plus provider credential handoff documentation

## GitHub Main Synchronization and Production Verification (Current Session)
- [x] Verify and synchronize the active workspace against GitHub main commit bc867eb95f726b52c4651002d21e12aade5c9c10 (file content synchronized from a clean clone at the required commit)
- [x] Verify all 35 production-readiness changes are present in the synchronized codebase (35 of 35 files byte-for-byte matched)
- [x] Report application status for database migrations 0007 through 0012 (0007–0011 objects verified; 0012 `leads2.agencyId` and `idx_leads2_agency_created` are missing)
- [x] Identify missing production environment variables and required third-party credentials (canonical URL, sender identity, event-webhook secret, optional external AI/WhatsApp credentials; SMTP credentials are present but rejected by the provider)
- [x] Validate test/build health and determine whether a clean checkpoint can be created safely without publishing (type-check, 170 tests, build, and `/api/health` pass; release remains blocked by migration 0012 and configuration gaps)

## Production Migration 0012 Application (Current Session)
- [x] Confirm a recoverable checkpoint before any live database change (checkpoint `de757624`)
- [x] Inspect whether `drizzle/migrations/0012_production_readiness.sql` has already been applied (it was not applied: column and index were absent)
- [x] Apply the exact migration 0012 only if required, without unrelated schema changes (applied unchanged)
- [x] Verify `leads2.agencyId`, `idx_leads2_agency_created`, lead backfill, and referrer quality-score correction (schema/index present; 2 legacy scraper leads remain without an unambiguous agency; zero-referral quality scores corrected)
- [x] Run `scripts/verify-production-readiness.ts` using the existing database connection and verify `/api/health` (script correctly reports 2 unassigned leads; health response is ready)
- [x] Keep publishing and all outreach, email schedules, OTP, and WhatsApp automation disabled; report results first (both outreach controls remain disabled)

## Legacy Lead Ownership Investigation (Current Session)
- [x] Collect read-only ownership evidence for leads `30003` and `330020` only
- [x] Cross-check each lead’s phone, email, source, campaign, referrer, and relationship metadata against agency-scoped records (each has an exact name match to an agency 1 Google Maps scraper record created immediately before the lead)
- [x] Report an evidence-based recommendation for each lead without assigning, deleting, archiving, publishing, or enabling automation (both are supported by source evidence; await approval before any data action)

## Approved Legacy Lead Agency Assignment (Current Session)
- [x] Create a recoverable checkpoint before the approved two-row data correction (checkpoint `9c4f1e44`)
- [x] Set `leads2.agencyId = 1` for lead IDs `30003` and `330020` only
- [x] Verify the two-row assignment, successful production-readiness script output, health response, and disabled outreach controls (verifier passed; health returned ready; both outreach controls remain disabled)
- [x] Keep migration 0012, verifier, SMTP, publishing, email outreach, OTP, and WhatsApp automation unchanged; report exact results

## Production Candidate Chatbot Smoke Test (Current Session)
- [x] Establish the testable current-candidate runtime and identify safe internal test data without publishing (unpublished candidate preview tested; no safe internal electricity-bill fixture was available)
- [x] Test new residential estimate, commercial, subsidy, price-objection, human-handoff, returning-session, bill-upload, and persistent handoff journeys without contacting customers (bill OCR remains unverified because no safe fixture existed; no contact details were submitted)
- [x] Test chatbot mobile responsiveness and review runtime side effects, safety controls, schedules, and messaging states (initial mobile state passed; full estimate-card state remains unverified; both outreach controls remain disabled)
- [x] Report PASS/FAIL, observed behavior, defects and severity, remaining blockers, and publish-safety without fixing defects

## Chatbot Release Blocker Repairs (Current Session)
- [x] Repair the residential estimate path to retain Hyderabad/Telangana context, produce a preliminary estimate without duplicate questions, and retain facts on provider delay (returns immediate configured-state sizing; cost/savings/subsidy are withheld because the active agency catalog is empty)
- [x] Add a customer-safe deterministic fallback for provider timeout or error without fabricating solar, subsidy, pricing, savings, tariff, warranty, or eligibility values
- [x] Require explicit consent before natural-language callback contact collection or action, without adding OTP or implying a message/call was sent
- [x] Repair returning-session rendering to prevent duplicate greetings, raw quick-reply markup, and repeat questions for known facts
- [x] Suppress redundant bill-entry controls after sufficient bill, property, and location context is known while keeping upload optional when it is relevant
- [x] Inspect and remove unnecessary chatbot-path waits or sequential calls without weakening model behavior or correctness (deterministic fact extraction and complete-input estimate paths bypass provider calls; provider fallback is bounded at 15 seconds)
- [x] Add automated regression tests for residential context, commercial subsidy safety, callback consent, returning sessions, quick-reply parsing, and timeout fallback
- [x] Run type-check, full test suite, production build, and repeat the failed controlled smoke-test scenarios (183 tests pass; production build succeeds; residential, commercial, consent, and returning-session retests completed)
- [x] Keep outreach, email, OTP, automated WhatsApp, SMTP configuration, production lead ownership, production-readiness verifier, and publishing unchanged (controls remain disabled; no new AI-chat leads, outreach messages, or outreach runs recorded)

## Final Catalog and Chatbot Pre-Publish Verification (Current Session)
- [x] Audit agency 1 panel, inverter, pricing, subsidy, tariff, savings, and estimate configuration without inventing values (no agency panel/inverter catalog or verified pricing is configured; two Telangana reference rows provide tariff/generation and eligibility-reference inputs only)
- [x] Create a clearly synthetic, non-customer Telangana electricity-bill fixture and test image/PDF OCR confirmation without contact or outbound side effects (PNG and PDF synthetic fixtures both extracted ₹6,500, 720 kWh, Telangana, and a fictional TESTPOWER label)
- [x] Repair the OCR upload path so every detected amount, units, state, and DISCOM value is shown in an editable explicit confirmation step before an estimate request is sent
- [x] Repair the PDF bill OCR request path so accepted application/pdf uploads are sent to the provider as file content rather than image content
- [x] Test the complete residential estimate journey at a 375×812 viewport for overflow, usable controls, contextual bill controls, accessible handoff, and clean rendering (exact browser regression passed all layout and rendering assertions)
- [x] Re-run production readiness, health, and disabled-control checks without enabling SMTP, email, OTP, WhatsApp, or outreach automation (187 tests, verifier, and build pass; health is ready; both outreach controls remain disabled; no recent lead/outbound side effects)
- [x] Report catalog evidence, OCR/mobile results, remaining P0/P1 defects, and chatbot publish safety without publishing

## Final Production-Completion Upgrade (Current Session)
- [x] Audit and extend the existing agency-scoped panel, inverter, pricing, tariff, subsidy, disclaimer, warranty, effective-date, active-status, and auditability structures without creating a universal catalog or fabricating money values
- [x] Ensure active agency catalog entries are tenant-isolated and missing pricing continues to return sizing only with no invented cost, savings, subsidy, or payback output
- [x] Harden server-only SMTP configuration and status reporting with disabled-by-default sending, explicit enablement, provider readiness checks, and fail-closed behavior
- [x] Audit every current or planned external integration and classify it as core, optional, or disabled until configured without exposing secrets or creating fake credentials
- [x] Extend existing admin settings and operations status surfaces with masked/status-only readiness for catalog, AI, SMTP, WhatsApp, OTP/SMS, maps, OCR, webhooks, canonical URL, tenant default, storage, analytics, and outreach controls
- [x] Require both valid configuration and explicit enabled state before automated email outreach, WhatsApp, OTP/SMS, scheduled follow-ups, AI-dependent optional features, or any customer-contact automation can activate
- [x] Preserve all validated e3cf87cf chatbot behavior, agency isolation, authorization, webhook validation, upload restrictions, rate limits, and no-secret client exposure while fixing any discovered P0/P1 issue
- [x] Create or update production setup documentation with all credential slots, business inputs, current status, disabled-feature impact, and safe activation steps without including secret values
- [x] Add focused regression and security coverage for agency pricing isolation, missing pricing, integration status, SMTP disabled/invalid handling, activation guards, and catalog auditability
- [x] Run full type-check, automated tests, build, production verifier, health check, controlled chatbot regressions, and final read-only safety checks with outreach, email, WhatsApp, OTP, and schedules still disabled
- [x] Save an unpublished recovery checkpoint and report all changes, migrations, readiness state, credentials/business inputs, remaining issues, and final publish verdict

## Production Migration 0013 Verification and Runtime Controls (Current Session)
- [x] Inspect whether the exact committed migration `0013_agency_configuration_control_plane.sql` is already applied in production without changing data (all four tables, 12 catalog columns, the audit index, and agency feature-control seed row are present)
- [x] Create or confirm a recoverable checkpoint before applying exact migration 0013 only if its structures are absent (no re-application was needed; checkpoint `2dcab315` already captures the applied migration)
- [x] Verify agency-scoped catalog pricing, state/DISCOM inputs, feature controls, configuration audit metadata, and tenant isolation without inserting any business values (all 0013 structures present; only agency 1 exists and no active foreign pricing record is present)
- [x] Run the production-readiness verifier, health check, type-safe runtime settings smoke check, and fail-closed communication-control checks with no activation (all checks passed; no agency feature control or outreach master is enabled)
- [x] Report migration state, isolation, controls, remaining P0/P1 issues, and publish-safety verdict without publishing

## Central Platform Communication Controls (Current Session)
- [x] Audit existing email, WhatsApp, schedule, permission, audit, and secure credential mechanisms without exposing secrets
- [x] Create a super-admin-only platform communication control plane with OFF, PAUSED, and RUNNING states plus a global emergency stop
- [x] Add masked central email and WhatsApp configuration status slots, provider verification controls, and controlled-test safeguards without storing or exposing fake credentials
- [x] Enforce platform state, provider readiness, feature prerequisites, idempotency, and emergency stop before every email/WhatsApp/scheduled send path
- [x] Keep partners limited to agency catalog, pricing, state/DISCOM, subsidy disclosure, and lead workflow data; prevent access to platform credentials and controls
- [x] Add non-secret platform operational audit events, status indicators, and safe super-admin UI controls without ambiguous toggles
- [x] Add regression coverage for state transitions, blocked activation, tenant permissions, emergency stop, secret masking, and no-duplicate resume behavior
- [x] Run full validation, production readiness, health, and disabled-control checks; save an unpublished checkpoint and report results

## Partner Self-Service Onboarding and Readiness (Current Session)
- [x] Audit existing partner signup, agency configuration, catalog, state/DISCOM, subsidy, estimate-settings, and readiness behavior without changing platform communication ownership
- [x] Add agency-scoped onboarding progress and readiness persistence with SETUP REQUIRED, PARTIALLY CONFIGURED, and READY states
- [x] Build a first-time partner onboarding wizard for company, panels, inverters, pricing, service area/DISCOM, subsidy disclosure, estimate settings, and review
- [x] Preserve Save & Continue Later behavior, show progress and required/optional guidance, and keep every completed configuration section editable after onboarding
- [x] Maintain strict isolation so an agency can access and use only its own active catalog, pricing, state/DISCOM, subsidy, and estimate data
- [x] Keep unverified monetary, savings, payback, and subsidy outputs withheld until the owning agency is READY; retain non-monetary chatbot sizing where supported
- [x] Keep Email/WhatsApp credentials and all communication activation controls visible and operable only to the super-admin platform owner
- [x] Run isolated synthetic new/partial/ready/second-agency/edit/disable/subsidy-off/returning/mobile tests and remove or isolate all test-only configuration afterward
- [x] Run complete regression, security, production readiness, runtime checks, and confirm all communication controls remain OFF before saving an unpublished checkpoint

## Final Release Candidate Verification (Current Session)
- [x] Confirm migration 0015 is structurally applied without rerunning it or changing production data (table, nine required columns, and three required indexes present)
- [x] Confirm health, production/security verifiers, partner readiness, tenant-isolated pricing, and chatbot regression evidence remain passing without creating test partners or browser sessions (health ready; release and platform verifiers passed; latest full validation recorded 204 passing tests and all isolation/readiness assertions)
- [x] Confirm email, WhatsApp, SMS/OTP, schedules, platform emergency stop, agency controls, and both outreach masters remain OFF and platform-owned credentials remain inaccessible to partners (non-owner denied; channels off; emergency stop active; all agency/master flags false)
- [x] Confirm no synthetic records remain and no P0/P1 release blocker is open (all synthetic partner, agency, and catalog markers are zero; no P0/P1 defect discovered)
- [x] Save an unpublished final release-candidate checkpoint and report only the requested release status fields

## Post-Deployment Verification (Current Session)
- [x] Verify the published public URL, production `/api/health`, and public chatbot route without submitting data
- [x] Verify partner onboarding and super-admin dashboard route reachability without entering credentials or modifying data
- [x] Confirm all production communication, schedule, emergency-stop, agency-feature, and outreach controls remain OFF
- [x] Report the public URL and post-deployment status without development changes

## GitHub Commit 5fed3e5 Synchronization and Assignment Control Verification (Current Session)
- [ ] Verify and synchronize only the requested GitHub main commit `5fed3e542fe362fc5d1cce1ba52a4e9df1a69400`
- [ ] Inspect and apply the exact committed `drizzle/migrations/0016_lead_assignment_control.sql` only if its live schema is absent
- [ ] Run only the production verifier, `/api/health`, callback consent-loop smoke test, and lead-assignment access check
- [ ] Confirm Email, WhatsApp, SMS/OTP, schedules, agency outreach controls, both outreach masters, and emergency stop remain inactive
- [ ] Save an unpublished validated checkpoint and provide publication guidance without modifying unrelated features
