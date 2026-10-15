SECTION 26 — PROPERTY ECOSYSTEM OPERATING MODEL (authorised by AB, 15 Oct 2026)

Append this as "Section 26" to docs/HAGERLAND_RELAUNCH_SPEC.md and add its work packages (S1–S12) to docs/RELAUNCH_PROGRESS.md and every requirement to docs/REQUIREMENTS_MATRIX.md. Work fully autonomously, with no questions to AB. ALL hard rules from previous briefs still apply unchanged (never push/merge to main except during the 25.6 cutover; never write to the LIVE database except during the 25.6 cutover; never touch legacy tables/data; never change Vercel/Supabase/Resend/Cloudflare/GitHub/DNS settings; never commit secrets; never send real emails to real people; new schema = new additive migrations, tested on LOCAL Supabase, documented with check queries, RLS tests extended). The Section 25 cutover procedure and the "GO LIVE" gate are unchanged and must still be passed after this work.

26.0 SOURCES AND PRECEDENCE
Read in full: docs/PROPERTY_ECOSYSTEM_MODEL.png (AB's ecosystem diagram), docs/TRANSFORMATION_BLUEPRINT.md, docs/PLATFORM_VISION.md, docs/HAGERLAND_RELAUNCH_SPEC.md, docs/LAUNCH_REPORT.md. Precedence where they conflict: this Section 26 > the diagram > the blueprint > PLATFORM_VISION > earlier spec sections.
The blueprint was written against the PRE-RELAUNCH repository. Do NOT reintroduce anything the relaunch removed (housing table usage, /api/housing or /api/property legacy routes, manage-token flows, BirrBank, Sanity). For every row in the blueprint's "Implementation backlog" and "Immediate technical findings" (Appendix A) and "Engineering handoff sequence", verify against the CURRENT code and record in the matrix as: Resolved (with evidence), Built in Section 26, or Out of scope (with reason).

26.1 CORRECTION: ESTATE AGENCY IS AN APPROVED, ACTIVE LAUNCH CAPABILITY
AB confirms HagerLand has approval to operate as an estate agency. Reverse any "coming soon" gating applied to estate agency services. Estate agency is a live Direct operation inside Pillars 1 (Buy & Sell) and 2 (Rent & Let). Add admin Settings fields: estate agency licence number, issuing authority, licence holder (legal entity), and date. When set, display them on agency pages, the footer legal line and the Terms. Update LAUNCH_REPORT: the estate agency regulatory row becomes "Approved — confirmed by AB (15 Oct 2026)". Keep a dedicated on/off control for agency services in admin, default ON.

26.2 TEN PILLARS + TWO CROSS-CUTTING LAYERS (from the diagram)
Evolve the vertical registry into a pillar registry (additive migration; map existing vertical keys so nothing breaks; keep every existing URL working). Pillars, in lifecycle order:
1 Buy & Sell (/buy): sale listings, new developments for sale, HagerLand estate agency sales (sell with HagerLand, buyer representation, property sourcing, developer sales, valuations), offers, compare, saved searches.
2 Rent & Let (/rent): rental listings, HagerLand lettings (let with HagerLand, tenant applications, tenancies), landlord and tenant services.
3 Build & Develop (/build): architects, engineers, contractors, building-quote requests, "Start a building project", build-cost estimator, third-party developments, Our Developments.
4 Repair & Maintain (/maintain): repairs and maintenance requests, emergency route, trades.
5 Manage Property (/manage): HagerLand Property Care, third-party property managers, owner portal.
6 Property Finance (/finance).
7 Property Insurance (/insurance).
8 Knowledge & Advice (/advice): guides, area guides, market insight, process checklists, glossary, help.
9 Building & Construction Supplies (/supplies): HagerLand Supply catalogue and quotes, supplier marketplace, special buys, trade accounts.
10 Jobs, Recruitment & Staffing (/jobs).
Cross-cutting layers (not numbered pillars, but present inside every pillar): DIASPORA SERVICES (customer layer: international buyers and investors; overseas tenants and landlords; remote management and support; keep /diaspora hub) and PROFESSIONALS & SERVICE PROVIDERS (supply layer: built-environment professionals, agents and advisers, trades and contractors, specialist providers; keep /professionals and company profiles).
Existing deeper routes (/property/*, /agency/*, /contractors, /repairs-maintenance, /diaspora/property-care, /guides/*, etc.) remain. Each belongs to a pillar, links back to its pillar hub, and has a documented canonical so there is no duplicate-content conflict.

26.3 OPERATING MODES PER PILLAR (the diagram's D / A / I) AND ACTIVATION LOGIC
Each pillar (and, where relevant, each sub-service) has three independent modes: DIRECT (HagerLand delivers the service itself; requests route to HagerLand's own team/organisation), AGGREGATE (vetted third-party providers, partners or listings), INTEREST CAPTURE (waitlist / register interest / become a partner). A pillar is visible if any mode is on; if only Interest is on it is labelled "Coming soon"; if all are off it is hidden (404, removed from nav and sitemap). Customer-facing labels (never the letters D/A/I): "Provided by HagerLand", "Trusted partners", "Register your interest".
Stage gates: before admin can switch DIRECT or AGGREGATE on for a pillar or sub-service, admin must complete a checklist: capability and named owner confirmed; for Aggregate, at least N verified providers/partners active (N configurable); regulatory clearance confirmed (with note and date); terms and pricing set where applicable. Record who, when and the answers in the audit log. Switching any mode off needs no gate.
Default modes at launch (set by migration, editable in admin):
1 Buy & Sell: Direct ON (HagerLand agency), Aggregate ON (marketplace), Interest OFF.
2 Rent & Let: Direct ON, Aggregate ON.
3 Build & Develop: Aggregate ON (professionals, contractors, third-party developments, estimator); Interest ON for Our Developments; Direct OFF (HagerLand development not yet active).
4 Repair & Maintain: Direct ON (HagerLand coordinates and can assign to its own team), Aggregate ON (providers).
5 Manage Property: Direct ON (HagerLand Property Care), Aggregate ON (third-party managers). In LAUNCH_REPORT, flag: "AB to confirm the approval covers property management and holding/collecting rent for owners."
6 Property Finance: Interest ON; Aggregate OFF until partners are onboarded and cleared.
7 Property Insurance: Interest ON; Aggregate OFF until partners are onboarded and cleared.
8 Knowledge & Advice: Direct ON.
9 Supplies: Direct ON (HagerLand Supply), Aggregate ON (supplier marketplace).
10 Jobs: Aggregate ON (job board), Interest ON (candidate and employer registers); Direct OFF (HagerLand recruitment/placement) until AB confirms recruitment approval. Flag this in LAUNCH_REPORT.

26.4 INFORMATION ARCHITECTURE, NAVIGATION, HOMEPAGE
Desktop header: at most 7 top-level items in lifecycle order: Buy · Rent · Build · Maintain · Manage · Supplies · More ▾ (Finance, Insurance, Advice & guides, Jobs), plus a visible "Living abroad?" entry to the Diaspora layer, Find a professional (in the menu and search), Sign in, List with us ▾. An "All services" mega panel shows all 10 pillars and the 2 layers, grouped like the diagram, with mode labels. The mobile drawer shows everything. Pillar hubs at the short URLs above, each with: what the pillar does, its live modes, primary actions, links to its deeper pages, a "From abroad?" panel, and cross-pillar next steps.
Homepage: keep hero + unified search, then add a "Property ecosystem" section that recreates the diagram as accessible HTML/SVG: the PROPERTY nucleus at the centre, the 10 pillars around it with their customer-facing mode labels, Diaspora and Professionals as layers, and the lifecycle journey strip (find → buy/rent → finance → build → supply → insure → maintain → manage → sell/let). It must be keyboard- and screen-reader-friendly and collapse to a clean list on phones. Then the existing sections.

26.5 HAGERLAND ESTATE AGENCY OPERATIONS (Direct mode for Pillars 1 & 2) — admin area "Agency"
- Contacts register: vendors, landlords, buyers, tenants, with consent records for marketing; applicant requirements (purpose, budget, areas, types, beds) with automatic matching to live listings and agent-triggered match emails.
- Instructions pipeline: lead → valuation booked → valued → instructed (agreement document in private-docs, fee type % or fixed, fee amount, sole/multi agency, term dates) → live (linked to a listing with lister_type 'hagerland', "Marketed by HagerLand") → under offer / let agreed → completed / withdrawn / expired.
- Valuations: appointment date/time, assigned agent, valuation range, notes, report PDF upload, outcome.
- Viewings: public "Book a viewing" on HagerLand-marketed listings (in person or video call, preferred times, contact details, Turnstile); admin scheduling with assigned agent, confirmation and reminder emails, video-call link field, viewing feedback. On non-HagerLand listings the existing enquiry flow stays.
- Offers: public "Make an offer" on HagerLand-marketed sale listings (amount, conditions, funding note; clearly worded as a non-binding expression of interest); admin offer log with status (submitted / countered / accepted / rejected / withdrawn) and recorded vendor decisions; accepted → sale progression checklist (default items admin-editable; no legal assertions in default wording).
- Lettings: "Apply to rent" on HagerLand-marketed lets (applicant details, move-in date, occupants, employment/income note, optional documents in private-docs); referencing notes; approve → create tenancy.
- Tenancies: parties, property, start/end, rent and currency, advance months, deposit, renewal and notice dates, reminders via the daily cron, link to a managed property when let & managed.
- Customer account: users see their valuations, viewings, offers, applications and tenancies.
- Fees and revenue: completion creates a deal in the existing deals ledger (commission or letting fee); agency reports (instructions, valuations, viewings, offers, completions, average days on market, fee income).
- Tasks/reminders, an activity timeline per record, private documents, all audit-logged. Agency pages show licence details when set (26.1). Fees are shown only if AB publishes a fee schedule in Settings; otherwise "fees agreed in writing".

26.6 RENT & LET LIFECYCLE (Pillar 2)
Landlord services page (let only / let & manage / management only → Pillar 5), tenant guidance (draft for AB review), rent-ready checklist (editable), viewing and application flows above, tenancy records and renewal reminders, and maintenance requests from managed tenancies routing to Pillar 4.

26.7 MANAGE PROPERTY (Pillar 5)
HagerLand Property Care stays live (Direct) with consultation requests and its admin pipeline. Build the owner portal now: owners linked to a managed property (by admin) can sign in and see inspections with photos (via 10-minute signed links), rent statements, the maintenance log and documents, and can raise maintenance requests (to Pillar 4) and messages to HagerLand. It is visible only to linked owners, with its own on/off control (default ON). Third-party property managers appear under Aggregate.

26.8 REPAIR & MAINTAIN (Pillar 4)
Keep the service request engine. Direct mode lets admin assign a request to HagerLand's own team (a HagerLand Services organisation) as well as or instead of third-party providers. The customer sees one consistent flow.

26.9 BUILD & DEVELOP (Pillar 3)
"Start a building project": a multi-step brief (plot location and size, floors, budget band, timeline, services needed: design, engineering, contractor, materials, finance) creating ONE project reference (HLP-YYYY-NNNNNN) that spawns linked service requests and an optional materials quote request. A customer project page shows everything in one place. Admin sees projects with their linked requests. Plus the hub combining estimator, professionals, contractors, supplies, finance interest and Our Developments interest.

26.10 KNOWLEDGE & ADVICE (Pillar 8, Direct)
/advice hub combining: guides (existing; drafts still need AB review before publishing); area guides (location pages gain an area-guide section once enough data exists: asking-price ranges and medians by type, listing counts, admin-written local notes and FAQs); a market insight page (asking-price medians and ranges by area and type from live listings, minimum sample size from Settings, labelled "Based on asking prices on HagerLand — not valuations", refreshed daily); process checklists for buying, renting, building and selling, plus a glossary (carta, lease, G+X, condominium, finishing levels), all as drafts marked "Needs AB review"; newsletter signup with separate consent. No legal or regulatory statement may be presented as fact.

26.11 DIASPORA LAYER (cross-cutting)
Every pillar hub gets a "From abroad?" panel tailored to that pillar (e.g. Buy: video viewings, buyer representation, sourcing; Manage: Property Care; Build: project management from abroad). The diaspora hub is organised by the diagram's three segments (international buyers and investors; overseas tenants and landlords; remote management and support) plus services abroad. Contact forms show the visitor's time zone and allow preferred call times.

26.12 PROFESSIONALS & PROVIDERS LAYER + REVIEWS
One provider onboarding where providers choose the pillars and services they serve. The provider dashboard shows leads from every pillar. Add verified reviews: only from a customer whose service request reached "won" or whose deal completed (one review per job; rating plus text; moderated before publishing; provider can reply once; shown on company profiles with an average; admin moderation queue; AggregateRating structured data only when at least 3 published reviews exist). Never import or fabricate reviews.

26.13 DEMAND INTELLIGENCE AND ACTIVATION (the diagram's activation logic)
Admin "Demand" dashboard: interest registrations, unmatched or declined service requests, zero-result searches, enquiries and leads, by pillar, category, location and country, with trends. "Activation recommendations" rank pillar × category × location by demand versus active supply. Each recommendation links to the stage-gate checklist (26.3). Monthly CSV export. Include a summary in the daily digest.

26.14 PILLAR KPIs (blueprint performance framework)
Admin "Performance" dashboard per pillar: leads, median first-response time, conversion to won, revenue from the deals ledger, active listings, providers and partners, plus agency KPIs (26.5). CSV export.

26.15 STAFF ACCOUNTS AND ROLES (needed to run Direct services)
Staff users (Supabase Auth, separate from customer accounts) with roles: owner (AB), agent, operations, content. Each must enrol TOTP two-factor before access. Role-based admin access (agent: Agency, viewings, offers, tenancies, listings; operations: service requests, Property Care, quotes, supplies; content: guides, advice, locations; owner: everything including settings, staff and modes). Per-user audit log entries. Staff management screen for the owner (invite, change role, disable). The existing /roodber8 master login remains as the owner's break-glass access. Server-side role checks on every admin action and page; tests prove each role can only reach its own areas. Default: no staff besides AB.

26.16 CONTENT, LEGAL, SEO FOR THE PILLAR MODEL
Update homepage, hubs, about, how-it-works, list-with-us, help and footer. Terms: add estate agency terms of business (instructions, fees agreed in writing, viewings, offers as non-binding expressions of interest, tenant applications) as drafts for AB's lawyer. Privacy: tenant applications, applicant registers, viewings, reviews, staff access. Sitemaps follow pillar visibility; coming-soon-only pillars stay noindex; structured data for agency (RealEstateAgent with licence when set) and reviews (per rule above).

26.17 STILL OUT OF SCOPE
Online payments/payouts, SMS/OTP, WhatsApp Business API, live bank/insurer/mortgage APIs, native apps (Section 25.3), BirrBank integration (frozen by AB), and a valuation/property price-history dataset (blueprint P3). Keep clean integration points where sensible; mark "Deferred-by-rule" in the matrix.

26.18 ALSO DO
(a) Correct docs/LAUNCH_REPORT.md section 4: list only genuinely unbuilt items; re-check the whole report for outdated statements. (b) Verify the preview redirect URL pattern in the Supabase Auth step against this project's real Vercel preview domain (read-only, e.g. GitHub deployment statuses via gh) and correct the report if needed. (c) Reconcile the blueprint per 26.0.

26.19 WORK PACKAGES (in order)
S1 pillar registry, modes, stage gates, migration from verticals; S2 navigation, pillar hubs, homepage ecosystem visual; S3 estate agency operations (admin CRM + public valuation/viewing/offer/apply + licence display); S4 rent & let lifecycle + tenancies; S5 manage pillar + owner portal; S6 build & develop project flow; S7 knowledge & advice hub, area guides, market insight; S8 provider multi-pillar onboarding + verified reviews; S9 demand intelligence + pillar KPIs; S10 staff accounts and roles; S11 content, legal and SEO updates + 26.18; S12 full regression (lint, typecheck, clean build, all unit and browser tests, RLS tests, accessibility on every new page and admin screen, phone widths, link crawl, Lighthouse), update REQUIREMENTS_MATRIX (zero "Not done"), LAUNCH_REPORT (what changed, evidence, updated page-by-page checklist including every new public, account and admin page, updated pre-go-live checklist with any new env vars or settings, updated pillar mode defaults and regulatory flags), then re-run 25.5 go-live readiness.
Same quality bar for every work package: verify after every write; lint, typecheck, build green; unit and Playwright tests added and green; commit and push relaunch/construction only; update progress.

When S12 and 25.5 are complete, tell AB: "Ready. Complete your checklist and type GO LIVE." and wait for that exact phrase.