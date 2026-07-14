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
