# COORDINA — Product Pitch & Investor Memorandum

**Nigeria’s Trusted Social Itinerary, Verified Venue & Geo-Fenced Ticketing Infrastructure**  
**Live Web Platform:** https://coordina-beta.vercel.app | **Platforms:** Web (PWA) & Native Android (Capacitor APK) | **HQ:** Abuja & Lagos, Nigeria

---

## 1. Executive Summary

**COORDINA** is a full-stack live experience discovery, multi-event itinerary planning, and anti-fraud ticketing platform engineered specifically for high-growth African cities—starting with **Lagos** and **Abuja**.

While legacy ticketing websites treat live events as isolated single-cart forms plagued by fake listings, paper/QR screenshots, social-media scalping, and card-payment failures, COORDINA unifies the entire social lifecycle:
1. **Trusted Discovery:** Curated events and physically/remotely verified social spaces (rooftops, lounges, clubs, galleries, festival grounds).
2. **Conflict-Free Itinerary Planning:** A real-time clash engine that calculates Haversine travel distances and Lagos/Abuja rush-hour traffic gaps, time overlaps, and personal budget caps across an entire weekend lineup.
3. **Collaborative Squad Planning:** Shared shortlists, real-time group voting, squad chat, and automated per-person Naira cost splits.
4. **3-Way Anti-Fraud Verification & Geo-Fenced Ticketing:** Corporate CAC + NIN + facial liveness KYC, cryptographic venue confirmation tokens, offline-capable QR wallets, and **COORDINA Plus Regional IP Geo-Fencing**—allowing organizers to lock ticket sales to specific Nigerian states or regions via buyer IP.

> **Investment Thesis:** Nigeria’s live entertainment and events ecosystem ($10.67B+ baseline growing at 11.13% CAGR) is powered by 240M+ citizens with a median age of 18.3 years and 11.2B+ real-time digital bank transactions annually—yet over 65% of mid-market events still suffer from unstructured discovery, venue fraud, gate revenue leakage, and ticket scalping. COORDINA captures both consumer discovery intent and transactional ticketing infrastructure in one network-effect loop.

---

## 2. The Problem

Event-goers, organizers, and venue owners in Nigeria face four structural failures today:

| Stakeholder | Core Pain Point | Economic & Social Impact |
| :--- | :--- | :--- |
| **Attendees & Diaspora ("IJGBs")** | **Fake Events & "Ghost Venues":** Unvetted flyers circulate on Instagram/X advertising venues that were never booked.<br>**Planning Chaos:** Booking 3 events across Victoria Island, Lekki, and Ikeja leads to missed shows due to uncalculated Lagos traffic and time clashes.<br>**Price Gouging:** Bots and resellers buy early-bird tiers and resell at 2x–5x markups on WhatsApp/X; diaspora buyers outbid local residents on resident-priced tiers. | Billions of Naira lost annually to fraudulent promoters, wasted tickets, and secondary black-market markups. |
| **Event Organizers** | **Gate Collusion & Counterfeits:** Paper passes and static PDF QR codes are duplicated or bypassed via cash bribes at the gate.<br>**Checkout Abandonment:** Global platforms rely on international card rails that decline domestic Verve cards or lack instant NIBSS bank transfers and USSD.<br>**Zero Geo-Control:** Inability to separate local state resident inventory (e.g., Abuja FCT or Lagos student tiers) from international buyers. | 15%–30% estimated gate revenue leakage on unstructured events and up to 40% checkout drop-off on card-only gateways. |
| **Social Spaces & Venues** | **Unauthorized Brand Misuse:** Promoters list popular lounges/clubs on event flyers without confirmed bookings, damaging venue reputation when crowds arrive. | Reputational damage, security incidents, and lost table/reservation revenue. |

---

## 3. Valid Statistical Research Backing COORDINA

COORDINA’s product architecture and business model are anchored in verified macroeconomic, demographic, telecom, and entertainment industry data:

### 3.1 Explosive Entertainment & Live Events Growth
* **Fastest-Growing Major African E&M Market (PwC):** According to **PwC’s Africa Entertainment and Media Outlook (2024–2028 / 2025–2029)**, Nigeria is the fastest-growing major Entertainment & Media market in Africa at a **6.9%–7.2% CAGR**, outpacing South Africa and Kenya, with core tracked E&M revenues expanding from **$3.8B toward $5.3B+** by 2030.
* **Broader Nigerian Events Economy (11.13% CAGR):** Industry market valuations place Nigeria’s end-to-end events, MICE (Meetings, Incentives, Conferences, Exhibitions), concerts, and hospitality ecosystem at **$10.67 billion**, projected to reach **$27.5 billion** at an **11.13% CAGR**—nearly double the global online ticketing growth rate (~5.8% CAGR).
* **The "Detty December" Phenomenon:** Official Lagos State tourism briefings and independent economic intelligence (*MO Africa*, *BusinessDay*, *Nairametrics*) report that Lagos attracts **1.2 million+ seasonal visitors** each December (55%–90% international diaspora / "IJGB" arrivals from the UK, US, Canada, and Europe). Consumer festive spending surged to **₦396.54 billion**, generating **$71.6 million+** in directly tracked hospitality and entertainment receipts—with live music concerts and curated nightlife accounting for **over 70%** of ticketed event proceeds.

### 3.2 Demographic & Mobile-First Tailwinds
* **World’s Youngest Major Consumer Base (UN / NBS):** Nigeria’s population exceeds **240 million** with a median age of **18.3 years**, and **over 65% of citizens under age 30**—the highest-propensity demographic globally for live music, nightlife, fitness clubs, tech mixers, and group social experiences.
* **Ubiquitous Mobile Connectivity (NCC):** Per the **Nigerian Communications Commission (NCC)**, Nigeria maintains **157.4 million active internet subscriptions** (>99% via mobile GSM networks) and **56%+ broadband penetration**, consuming over **1.5 million terabytes** of mobile data monthly. However, cellular congestion around high-density venues demands **low-data, offline-capable ticket wallets**—a core architectural pillar of COORDINA.

### 3.3 Real-Time Digital Payment Readiness
* **Global Leader in Instant Bank Transfers (NIBSS):** Data from the **Nigeria Inter-Bank Settlement System (NIBSS)** shows annual electronic payment value surpassing **₦1.07 quadrillion** across **11.2 billion+ real-time NIBSS Instant Payment (NIP) transactions**. Supporting **Card + Instant Bank Transfer + USSD** in a single Naira checkout directly eliminates the 30%+ cart abandonment suffered by foreign card-only ticketing tools.

---

## 4. The Product: What COORDINA Does & Key Features

COORDINA operates a unified **four-sided ecosystem** connecting **Attendees**, **Organizers**, **Venue Managers**, and **Compliance Admins** on a real-time serverless backend.

### 4.1 Consumer & Attendee Features
* **City-Aware Event & Space Discovery:** Switch seamlessly between **Lagos** and **Abuja** (expanding nationwide), filtering across concerts, nightlife, food & drink, tech mixers, art walks, wellness runs, and verified social spaces—complete with interactive clustered map pins, crowd levels, dress codes, and safety notes.
* **Intelligent Itinerary & Traffic Clash Engine:** Unlike standard carts, COORDINA’s **Plan Cart** builds a chronological multi-event itinerary and automatically detects:
  * **Hard Time Overlaps:** Alerts when two selected events overlap in schedule.
  * **City-Calibrated Traffic Clashes:** Computes Haversine distance between neighborhoods (`Victoria Island` → `Ikeja`, `Maitama` → `Gwarinpa`) applying city travel baselines (`4 min/km` in Lagos, `2.5 min/km` in Abuja) and a **1.6x rush-hour multiplier** (`7–10 AM`, `4–8 PM`).
  * **Budget & Fatigue Guards:** Flags when the itinerary exceeds the user’s personal Naira budget or chains late-night events before early-morning commitments.
* **Multi-Organizer Single Checkout:** Purchase tickets across multiple independent organizers in a single Paystack-powered Naira transaction via **Card, Instant Bank Transfer, or USSD**, with real-time promo code validation.
* **Squad Planning, Voting & Cost Splitting:** Create a private **Squad** via invite code, shortlist weekend events, cast real-time upvotes/downvotes, coordinate inside built-in Squad Chat, track live member arrival status, and view exact per-person Naira splits.
* **Offline Cryptographic Ticket Wallet:** Every pass carries a signed JSON QR payload cached locally for zero-signal venue gates, alongside peer-to-peer **Email Ticket Transfers**, one-tap `.ics` / Google Calendar sync, and in-app refund requests.

### 4.2 Organizer & Venue Features
* **3-Way Trust & Remote Verification Engine:**
  1. **Identity & Corporate KYC:** CAC registration verification, Director NIN validation, Email & Phone OTP, plus camera-based **Facial Biometric Liveness** snapshots.
  2. **Cryptographic Venue Confirmation Portal:** When an organizer lists a venue, COORDINA dispatches a unique token link to the physical venue manager (`/venue-portal/:token`) to confirm or dispute the booking—stopping fake-venue scams before a single ticket sells.
  3. **Dynamic Trust Badges:** Events earn progressive trust tiers (`Venue Confirmed`, `Organizer Verified`, `Coordina Trusted`) displayed prominently to buyers.
* **COORDINA Plus — Regional IP Geo-Fencing (Industry First in West Africa):**
  * Organizers subscribed to **COORDINA Plus** can lock ticket purchases by **buyer IP geolocation** at three simultaneous layers (UI, Plan Cart mutation, and Order Settlement).
  * Supports **State/City Locks** (e.g., `Abuja (FCT) Only`, `Lagos State Only`, `Rivers / Port Harcourt Only`, or any of Nigeria’s 36 states + FCT) and **Country/Corridor Locks** (`Nigeria Nationwide`, `West Africa`, `UK`, `US & Canada`).
  * Prevents international bots/scalpers from sweeping subsidized local tiers and lets promoters run region-specific pricing (e.g., local Naira resident passes vs. diaspora VIP releases).
* **Organizer Studio & Mobile Gate Scanner:** Live gross/net revenue telemetry, tier inventory controls, custom discount promo codes, camera QR **Gate Scanner** preventing double-entry or screenshot replay, and **Escrow-Protected Bank Payouts**.

---

## 5. Technical Architecture & Defensibility

* **Real-Time Reactive Backend (Convex):** Sub-second reactive state across 23 relational tables (`users`, `organizers`, `events`, `spaces`, `orders`, `tickets`, `squads`, `venue_confirmations`, `audit_logs`, `payouts`, etc.) with ACID transactional inventory locking—eliminating oversold ticket tiers during flash drops.
* **Edge IP Geolocation Resolver:** Serverless edge inspection (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`) normalized across ISO-3166-2 Nigerian state subdivisions (`FC` ↔ `Abuja FCT`, `LA` ↔ `Lagos`) with zero-key HTTPS fallbacks for native mobile clients and immutable `REGION_LOCK_BLOCKED` audit logging.
* **Low-Data Cross-Platform Delivery:** Built with React 19, TypeScript, Tailwind CSS, and **Capacitor 8** (~18.4 MB Android APK + PWA), engineered for sub-second interaction on congested 3G/4G networks.

---

## 6. Business & Financial Model

COORDINA monetizes through **five complementary, high-margin revenue streams** already built into the production codebase:

### 6.1 Revenue Streams

| # | Revenue Stream | Pricing Mechanism | Payer | Strategic Rationale |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Paid Ticket Service & Processing Fee** | **5% service fee** (capped at **₦2,000** per ticket line) + **₦100 flat order processing** (+7.5% statutory VAT on fees) | Attendee (at checkout; ₦0 upfront to organizer) | Transparent, buyer-friendly cap prevents luxury/VIP ticket sticker shock while maintaining strong take-rates on mass-market tickets (₦5k–₦40k). |
| **2** | **Free-Event Capacity Hosting Fee** | **₦2,500 per 100 attendee capacity block** | Organizer (at publication) | Eliminates spam listings and profitably monetizes corporate mixers, brand activations, and free raves that competitors subsidize at a loss. |
| **3** | **COORDINA Plus SaaS Subscription** | **₦15,000 / month** or **₦144,000 / year** (₦12,000/mo effective) | Organizer | Recurring high-margin (~92% GM) SaaS unlocking **IP Regional Geo-Fencing**, priority KYC review, and featured discovery boosts. |
| **4** | **Verified Space Bookings & Promoted Slots** | **8%–10% reservation commission** & featured city-banner placements (₦50k–₦250k/wk) | Social Spaces & Brand Sponsors | Captures year-round recurring weekend nightlife, rooftop dining, and lounge spend outside concert seasons. |
| **5** | **Escrow Settlement Treasury Float** | Short-duration money-market yield on held ticket escrow prior to T+1 post-event disbursement | Institutional Treasury Yield | Protects buyers from cancelled/fraudulent shows while generating risk-free float income during peak pre-sale windows (e.g., Oct–Dec). |

### 6.2 Transaction Unit Economics (Illustrative Single Order)

Consider a typical weekend Squad/Pair order of **2 Paid Passes at ₦15,000 each** (₦30,000 Gross Merchandise Value / GMV):
* **Ticket Subtotal (Organizer Gross):** ₦30,000
* **COORDINA Service Fee (5%, capped at ₦2,000):** ₦1,500
* **Order Processing Fee:** ₦100
* **Statutory VAT (7.5% on fees, remitted):** ₦120
* **Total Paid by Buyer:** ₦31,720
* **Payment Gateway Cost (blended NIP Transfer / Card via Paystack, capped):** ~₦320
* **COORDINA Net Contribution per Order:** **₦1,280 (~80% Gross Margin on net platform revenue)**

### 6.3 Customer Acquisition & Cohort Economics (Target Seed Metrics)

| Metric | Attendee Cohort | Organizer Cohort (Blended Standard + Plus) |
| :--- | :--- | :--- |
| **Blended CAC** | ₦1,800 (~$1.15) — driven by viral Squad invites (3.8 avg members/squad) & organizer ticket links | ₦18,500 (~$11.80) — direct B2B onboarding & venue referrals |
| **Annual Purchase / Event Frequency** | 4.6 orders / year (1.8 tickets/order) | 5.2 events / year + 30% COORDINA Plus conversion |
| **Annual Net Revenue per Active User** | ₦5,400 | ₦195,000 (ticketing fees generated + Plus SaaS + capacity fees) |
| **24-Month LTV (Gross Profit Basis)** | ₦8,640 | ₦312,000 |
| **LTV : CAC Ratio** | **4.8x** | **16.8x** |
| **CAC Payback Period** | **< 4 months** (often first Detty December weekend) | **< 2 events** |

### 6.4 3-Year Financial Projections

*Note: Figures below model organic expansion from **Lagos & Abuja (Year 1)** into **Port Harcourt, Ibadan & Enugu (Year 2)**, and **Pan-West Africa / Accra & Diaspora Corridors (Year 3)**, using an illustrative exchange benchmark of ₦1,550 = $1 USD.*

| Financial Metric | Year 1 (Lagos & Abuja Core) | Year 2 (5 Nigerian Cities) | Year 3 (Regional Scale + Accra) |
| :--- | :--- | :--- | :--- |
| **Verified Active Organizers & Spaces** | 450 | 1,800 | 5,200 |
| **COORDINA Plus Subscribers** | 120 (27% attach) | 630 (35% attach) | 2,100 (40% attach) |
| **Paid Tickets Issued** | 180,000 | 850,000 | 2,600,000 |
| **Gross Ticket & Space GMV (₦)** | ₦2.52B (~$1.63M) | ₦12.75B (~$8.23M) | ₦41.60B (~$26.84M) |
| **Net Ticketing & Capacity Revenue (₦)** | ₦138.6M | ₦688.5M | ₦2,204.8M |
| **COORDINA Plus SaaS Revenue (₦)** | ₦18.7M | ₦96.4M | ₦318.2M |
| **Space Commissions, Ads & Escrow Yield (₦)** | ₦29.2M | ₦142.0M | ₦485.0M |
| **Total Net Platform Revenue** | **₦186.5M (~$120K)** | **₦926.9M (~$598K)** | **₦3.01B (~$1.94M)** |
| **Gross Margin (%)** | 78.4% | 81.6% | 84.2% |
| **Operating Expenses (Eng, Ops, Trust, GTM)** | ₦265.0M | ₦690.0M | ₦1,780.0M |
| **EBITDA** | (₦78.5M) *(Investment Phase)* | **+₦65.4M (+7.1% Margin)** | **+₦754.4M (+25.1% Margin)** |

---

## 7. Competitive Landscape

| Capability | **COORDINA** | Tix.Africa / Nairabox | Eventbrite | IG Flyers / WhatsApp |
| :--- | :---: | :---: | :---: | :---: |
| **3-Way KYC + Biometric + Venue Token Verification** | **Yes** | Partial (Basic KYC) | No | No |
| **COORDINA Plus Regional IP Geo-Fencing** | **Yes (State & Country)** | No | No | No |
| **Multi-Event Itinerary + Lagos/Abuja Traffic Clash Engine** | **Yes** | No | No | No |
| **Multi-Organizer Single Checkout** | **Yes** | No (Single event) | No (Single event) | No |
| **Squad Shortlisting, Voting & Per-Person Split** | **Yes** | No | No | Manual chat chaos |
| **Native Naira Rails (Card + NIP Transfer + USSD)** | **Yes** | Yes | Poor local FX/cards | Manual bank transfer scams |
| **Verified Social Spaces (Year-Round Lounges/Clubs)** | **Yes** | Events only | Events only | Unverified |

---

## 8. Go-To-Market (GTM) Strategy

1. **Supply-Side Anchor ("Verified Space First"):** Onboard the top 100 premier lounges, beach clubs, rooftops, and cultural spaces in **Victoria Island, Lekki, Ikeja (Lagos)** and **Maitama, Wuse II, Gwarinpa (Abuja)**. Because venues use COORDINA’s free **Venue Confirmation Portal** to stop impersonation scams, venues actively require external promoters to list on COORDINA.
2. **Viral Squad Loop (`K-Factor` Multiplier):** Every weekend **Squad** created by 1 organizer/host invites 3–6 friends via WhatsApp link to vote on shortlisted events and split checkout—acquiring high-intent users at near-zero marginal CAC.
3. **COORDINA Plus Anti-Scalping Wedge:** Target university student associations, comedy tours, tech conferences, and Detty December festival promoters who urgently need **State/Country IP Geo-Fencing** to protect local Naira ticket tiers from bots and cross-border arbitrage.
4. **Seasonal Super-Cycle Capture:** Concentrate brand activations around Easter, Summer Homecoming, Nigerian Independence Week (Oct 1), and **Detty December** (Nov 15 – Jan 5), locking in annual organizer contracts ahead of Q4.

---

## 9. Leadership Team

COORDINA is led by a multidisciplinary Lagos- and Abuja-based executive team combining software architecture, on-ground venue operations, financial compliance, and cultural marketing:

* **Mohammed Hashiru — Chief Executive Officer (CEO):** Corporate vision, strategic partnerships, and institutional ecosystem expansion connecting event-goers, verified organizers, and premier social spaces.
* **Samuel Onuegbu — Chief Technology Officer (CTO):** Full-stack systems architect behind COORDINA’s real-time Convex backend, traffic-aware clash engine, regional IP geo-fencing, offline cryptographic QR wallets, and low-data mobile delivery.
* **Okafor Ifeanyi — Chief Operating Officer (COO):** Cross-city field operations, physical venue onboarding, inspection standards, and high-throughput gate management across clubs, lounges, and festival grounds.
* **Sumayya Suleiman — Chief Financial Officer (CFO):** Financial governance, multi-rail Naira settlement (Card, NIP Transfer, USSD), organizer escrow controls, and anti-scalping transaction security.
* **Deinbo Krukrubo — Chief Marketing Officer (CMO):** Brand strategy, creator/promoter partnerships, university ambassador networks, and cultural growth across music, nightlife, culinary, and arts communities.

---

## 10. The Ask & Use of Funds

### Fundraising Target: **$500,000 Pre-Seed / Seed Round** *(or Naira Equivalent)*
* **Instrument:** Post-Money SAFE / Convertible Equity
* **Runway:** **18–21 Months** to cash-flow positivity and **₦12.75B+ ($8.2M+) annualized GMV**

### Allocation of Proceeds

| Category | Allocation (%) | Amount (USD) | Key Deployment Milestones |
| :--- | :---: | :---: | :--- |
| **Venue & Organizer Acquisition (GTM)** | **35%** | $175,000 | Onboard 1,000+ verified spaces & organizers across Lagos, Abuja & Port Harcourt; dominate Detty December gate operations. |
| **Product, Engineering & Security** | **30%** | $150,000 | Launch native iOS App Store build alongside Android APK, NFC wristband tap-to-enter hardware integration, and automated BVN/CAC API verification. |
| **On-Ground Gate Ops & Trust Desk** | **20%** | $100,000 | Deploy rapid-scan hardware kits for 5,000+ capacity festivals, 24/7 compliance review desk, and physical space verification teams. |
| **Working Capital, Legal & Licensing** | **15%** | $75,000 | Payment escrow reserves, regulatory compliance, insurance coverage, and contingency buffer. |

### 18-Month Milestone Targets Unlocked by This Round
1. **1,500+ Verified Organizers & Social Spaces** active across Lagos, Abuja, and Port Harcourt.
2. **750,000+ Cryptographic Tickets Issued** with < 0.05% fraud/dispute incidence.
3. **500+ Paying COORDINA Plus Organizers** utilizing Regional IP Geo-Fencing and pro analytics.
4. **Cash-Flow Breakeven** achieved in Q4 Year 2 ahead of Series A West African expansion (Accra, Nairobi, Kigali).

---

*Prepared for prospective investors, strategic partners, and ecosystem stakeholders of **COORDINA**.*

