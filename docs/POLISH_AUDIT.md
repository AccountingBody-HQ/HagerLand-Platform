# Polish round 1: audit, front-end rewrite and fixes

**Branch:** `polish/round-1` (from `main` at `8752162`) · **Date:** 15 October 2026 · **Status:** ready for AB's review on the preview. Nothing has been released to the live site.

## Summary for AB

**Overall impression.** The platform is technically sound. On the live site today there are no broken pages, no console errors from our own code, no sideways scrolling on phones, one main heading per page, and correct titles, descriptions and canonical addresses. What held it back was the *language and presentation*: the homepage and the service pages explained HagerLand the way our strategy documents do ("Property ecosystem", "Core platform nucleus", "Pillar 1", "Cross-cutting customer layer", "Ecosystem enablers", "Provided by HagerLand / Trusted partners" chips on every card). That reads like a strategy presentation, not a property business. A buyer in Addis Ababa or a family in London had to decode it.

**What I changed.** The site now speaks plain, confident customer language everywhere. The homepage leads with your new line and a clean "Everything your property needs" section: the same ten services, grouped the way customers think, each with one benefit line and one clear action. Visitors see "Coming soon" only where a service really is coming soon (Finance and Insurance), and nothing else about how we operate internally. The strategy view is kept for your team, as a map on admin → Pillars and modes.

**The five most important improvements**

1. **New homepage services section.** "Everything your property needs" replaces the ecosystem diagram. It has four groups (Buy, sell and rent · Build and improve · Own and manage · Supplies and jobs), ten clear service cards and two warm invitations: one for Ethiopians living abroad, one for professionals and suppliers.
2. **Your new support line.** "Buy, rent, build and manage property in Ethiopia, with verified partners, wherever you live." It now sits under the main heading as a calm subheading (regular weight, larger, more space), and it replaces the old list line in the footer of every page.
3. **No internal words on any public page.** "Pillar 1 · …", the mode chips and the diagram labels are gone from the menus, the "All services" panel, the mobile menu, all ten service pages, About, How it works and Jobs. A new automatic test checks every public page on every run and fails if any of these words come back.
4. **No dead ends in Knowledge & Advice.** Guides, Checklists and Glossary are still waiting for your review, so the Advice page linked to three empty pages, and each one sent you to "Read the guides", which was also empty. The Advice page now shows only what has content (Help & FAQs, market insight, "Ask our team"). The empty pages point to help and to the team, and each link reappears as soon as you publish something.
5. **Homepage empty states that look intentional.** Instead of a lone "be among the first" box, the property section offers two clear paths ("Looking to buy or rent?" / "Selling or letting?") with search, alerts, self-listing and our estate agents. Our Developments is now a compact, honest "coming soon" band instead of a large form. The homepage no longer loads the anti-bot widget either.

Also fixed: the green box around the logo after a mouse click, footer "Soon" badges that squeezed names onto awkward lines, doubled headings such as "From abroad? Buying from abroad?", a missing heading on the business profile page, and a missing icon.

**What I need from you**
- Review the preview and type **RELEASE POLISH 1** when you are happy.
- When you have time: publish the starter guides (admin → Guides), and adjust the Knowledge & Advice description (admin → Pillars and modes → Knowledge & Advice → Edit text). See "Recommendations".

---

## Every issue found

Priorities: **P0** broken or embarrassing · **P1** clearly unprofessional · **P2** noticeable polish · **P3** nice to have. Effort: **S** under an hour · **M** a few hours · **L** a day or more. Screenshots are in `docs/polish-audit/` (`before/` and `after/`, `-mobile` = 390 px, `-desktop` = 1440 px).

No P0 issues were found: nothing was broken.

| ID | Pri | Page / URL | Device | What was wrong | Why it matters | Fix | Effort | Screenshot |
|---|---|---|---|---|---|---|---|---|
| P-001 | P1 | `/` | Both | The "Property ecosystem" section showed internal strategy language: "Core platform nucleus", a PROPERTY circle, numbered cards 1–10, "Cross-cutting customer layer", "Cross-cutting supply layer", "Ecosystem enablers", "One journey". | The first thing a visitor reads below the search looked like a strategy slide, not a service. | Done: replaced by "Everything your property needs" (4 groups, 10 service cards, Living abroad and Professionals bands). The diagram now lives on admin → Pillars and modes. | M | home-desktop, home-mobile |
| P-002 | P1 | `/` | Both | The support line under the main heading was a bold list ("Find it. Buy it. Finance it. …"). | It read like a slogan list rather than a premium subheading. | Done: AB's line, in regular weight, slightly larger, more space from the heading and the search. | S | home-* |
| P-003 | P1 | All pages (footer) | Both | The footer repeated the old list line, followed by a second line saying the same thing as the new one. | Every page carried the old wording. | Done: footer shows the main line and AB's new line only. | S | home-* |
| P-004 | P1 | `/buy` `/rent` `/build` `/maintain` `/manage` `/advice` | Both | The label above each page title said "PILLAR 1 · BUY & SELL PROPERTY" and so on. | "Pillar" is internal vocabulary. | Done: the label is the service name. | S | buy-* |
| P-005 | P1 | 13 pages (homepage, all service pages, `/about`, `/jobs`) | Both | Chips saying "Provided by HagerLand", "Trusted partners" and "Register your interest" on cards and page tops. | Customers only need "available" or "coming soon". The chips added noise and jargon. | Done: only "Coming soon" remains, where only interest capture is on (Finance, Insurance, Our Developments). Who does the work is explained in the page text ("By HagerLand", "What we do for you"). | S | buy-*, about-* |
| P-006 | P1 | Header → All services | Desktop | The panel showed numbers, "Around the property lifecycle", "Ecosystem enablers", "Across every service" and mode chips. | The main navigation panel used the strategy language. | Done: the same four customer groups as the homepage, plus "Living abroad" and "Find a professional". | S | (menu, see preview) |
| P-007 | P1 | Mobile menu | Mobile | Each service opened with "Overview: …" and a line of mode names. | Robotic wording on the phone menu. | Done: "Explore …", with no mode names. | S | (menu, see preview) |
| P-008 | P1 | `/advice` → `/guides`, `/advice/checklists`, `/advice/glossary` | Both | Three of the Advice links led to empty pages. Each empty page offered "Read the guides", which was also empty: a loop of dead ends. The main button on the Advice page was "Read the guides". | A visitor following the main button found nothing, twice. | Done: links to guides, checklists and the glossary appear only once something is published. The empty pages now offer "Help & FAQs" and "Ask our team". | S | advice-*, guides-* |
| P-009 | P1 | `/guides` | Both | "Our first guides are being written. Check back soon." with nothing to do next. | It felt unfinished. | Done: honest, warmer text with two actions (Help & FAQs, Ask our team). | S | guides-* |
| P-010 | P2 | 10 service pages | Both | Doubled headings: "From abroad? Buying from abroad?", "From abroad? Learning from abroad?" | It looked like a typo. | Done: one question each ("Buying from abroad?", "Planning from abroad?"). | S | buy-* |
| P-011 | P2 | Header logo, all pages | Desktop | A green outline could stay around the logo after clicking it with a mouse (AB's report; Chromium does not show it, but other browsers can). | It looked like a glitch. | Done: focus rings now show only after keyboard use, in every browser. Keyboard users still get a clear green ring everywhere. Form fields keep their own focus style. | S | — |
| P-012 | P2 | `/` (no listings yet) | Both | The property section was a single box, "List your property — be among the first". | With no listings, the homepage felt empty here. | Done: "Property in Ethiopia" with two paths: buy or rent (search, alerts) and sell or let (list yourself or use our estate agents). | S | home-* |
| P-013 | P2 | `/` | Both | Our Developments (coming soon) took a large dark band with a full registration form. It also loaded the anti-bot widget on the homepage. | It gave the most space to something that does not exist yet, and it slowed the page. | Done: a compact band with a clear "coming soon" message and a link to register on the Our Developments page. | S | home-* |
| P-014 | P2 | All pages (footer) | Both | "Soon" badges pushed names such as "Property Insurance" onto awkward lines. | Untidy. | Done: the badge follows the name naturally. Each link is now 44 px tall to tap. | S | home-* |
| P-015 | P2 | `/about` | Both | "Ten services around the property lifecycle…", the mode chips, and the internal descriptions. | Strategy wording on the page that should sell us. | Done: the same customer groups and benefit lines as the homepage, in plain words. | S | about-* |
| P-016 | P2 | `/how-it-works` | Both | "How each service is provided" listed the mode names and linked to "all ten services around the property lifecycle". | Same. | Done: "Who does the work" (By HagerLand · Verified partners · Coming soon), linking to "See all our services". | S | how-it-works-* |
| P-017 | P2 | `/jobs` | Both | Mode chips in the header, and "Provided by HagerLand" / "Register your interest" as section labels. | Same. | Done: chips removed. Labels are "By HagerLand" and "Hear first". | S | — |
| P-018 | P2 | Menus, homepage, "Your next steps" cards | Both | Short service lines came from the diagram: "Listings, agency, transactions", "Guides, awareness, market insight", "Talent, labour, hiring". | Note-like, not customer benefits. | Done: benefit lines written for customers (`lib/content/services.ts`). The database lines stay for the admin map. | S | home-* |
| P-019 | P2 | `/build` | Both | The register-interest section said "Tell us what you need next" with no context. | It was unclear what you were registering for. | Done: "Hear first about HagerLand's own developments", with an honest line about it. | S | build-* |
| P-020 | P2 | `/diaspora` | Both | Section label "DIASPORA → ETHIOPIA". | Internal shorthand. | Done: "Property at home". | S | — |
| P-021 | P2 | `/` | Both | Trust points such as "Current, not stale". | Robotic phrasing. | Done: "Every listing checked", "Verified means verified", "Always up to date", "Built by construction people". | S | home-* |
| P-022 | P2 | `/` | Both | "Hire trusted professionals" had a button "All services" that went to the professionals directory. | Wrong label. | Done: "All professionals", plus a one-line description. | S | home-* |
| P-023 | P2 | `/account/company` (no business yet) | Both | The page had no main heading. | Accessibility (screen readers navigate by headings). | Done: "Business profile" heading. | S | — |
| P-024 | P2 | `/advice` | Both | The new "Ask our team" card showed a fallback icon (found while fixing P-008). | Untidy. | Done. | S | advice-* |
| P-025 | P2 | `/advice` | Both | The description under the heading (stored in the database) promises area guides, checklists and a glossary that are not published yet. | Over-promises today. | Recommended: AB edits it in admin (no code change: it is AB's text), or publishes the guides. | S | advice-* |
| P-026 | P2 | Amharic (off by default) | — | The ten service names had no Amharic text. The new wording needed entries too. | Amharic would have fallen back to English for these. | Done: entries added for every new or changed shared string, marked for native review like the rest. Obsolete entries removed. | S | — |
| P-031 | P2 | `/property/for-sale`, `/property/to-rent` (and their area pages) | Mobile | Heading order jumped from the page title to the listing cards: on phones the filter headings sit in a closed drawer (Lighthouse accessibility 98). | Screen-reader users navigate by headings. | Done: the result count ("12 properties for sale in Bole") is now the section heading above the cards. | S | — |
| P-027 | P3 | Pages with the anti-bot widget (`/finance`, `/supplies`, forms) | Both | The browser console shows messages from inside Cloudflare's own widget frame (its own security rules and its anti-debugging lines). | Harmless and invisible to visitors, but it shows in audits. | No action possible: it is Cloudflare's code and policy. The homepage no longer loads the widget (P-013). | — | — |
| P-028 | P3 | `/` | Mobile | Ten full-size cards made the services section long on phones. | Long scroll. | Done: compact cards on phones (icon beside the text), spacious from tablet width up. | S | home-mobile |
| P-029 | P3 | `/` → professional chips | Both | Chips such as "Architects" lead to directories that are empty until the first professionals join. Those pages already offer "Get quotes" and "List your business". | Fine for now; could feel thin. | Recommended: revisit once the first verified professionals are live (R-6). | S | — |
| P-030 | P3 | Hero eyebrow | Both | "For Ethiopians in Ethiopia and around the world." now sits just above a line ending "wherever you live". | Slight repetition. | Proposed, not changed (AB's brief): "Ethiopia's property and construction platform". | S | — |

**Checked and fine (no change):** titles and descriptions are unique on every page; canonicals all point to www.hagerland.com; coming-soon pages are noindex as designed; every image has alt text; there is no sideways scroll at 390 px or 1440 px on any of the 73 public pages, 39 admin screens and 14 account pages; all 39 admin screens and 14 account pages load without errors (local copy); emails read naturally; the 404 page, search (with and without results), sign-in and sign-up are clear; licence lines stay hidden while the licence fields are empty.

### Totals by priority

| Priority | Found | Fixed | Recommended / no action |
|---|---|---|---|
| P0 | 0 | 0 | 0 |
| P1 | 9 | 9 | 0 |
| P2 | 18 | 17 | 1 (P-025, AB's text) |
| P3 | 4 | 1 | 3 |
| **Total** | **31** | **27** | **4** |

---

## Homepage wording: old → new

| Where | Old | New |
|---|---|---|
| Eyebrow | For Ethiopians in Ethiopia and around the world. | Unchanged (a proposal is in P-030) |
| Main heading | One platform for property, construction and everything around it. | Unchanged |
| Support line | Find it. Buy it. Finance it. Build it. Supply it. Insure it. Maintain it. Sell it. Rent it. | Buy, rent, build and manage property in Ethiopia, with verified partners, wherever you live. |
| Search description (meta) | Property, building supplies, professionals, contractors, repairs and diaspora services in one place, for Ethiopians in Ethiopia and around the world. | Buy, rent, build and manage property in Ethiopia with verified partners, wherever you live: homes, building materials, contractors, repairs and property care. |
| Section heading | Property ecosystem | Everything your property needs |
| Section text | Ten services around the property lifecycle, with HagerLand at the centre. Each one shows how it is provided today. | Buy, rent, build, manage and maintain property in Ethiopia, supported by our own team and verified professionals. |
| Diagram labels | PROPERTY · Core platform nucleus · numbers 1–10 · Cross-cutting customer layer · Cross-cutting supply layer · Ecosystem enablers · One journey (Find → Buy or rent → Finance → Build → Supply → Insure → Maintain → Manage → Sell or let) | Removed. Four groups instead: **Buy, sell and rent** ("Find your next home or investment, or let our agents sell and let yours.") · **Build and improve** ("From the first drawing to repairs years later.") · **Own and manage** ("Look after what you own, protect it and decide with confidence.") · **Supplies and jobs** ("Materials for every build, and the people to do the work.") |
| Availability chips | Provided by HagerLand · Trusted partners · Register your interest · Coming soon | Coming soon (Finance and Insurance only) |
| Buy & Sell Property | Listings, agency, transactions | Homes, land and commercial property, and our own estate agents to sell yours. → **Buy or sell** |
| Rent & Let Property | Landlords, tenants, lettings | Places to rent across Ethiopia, and letting handled for landlords. → **Rent or let** |
| Property Finance | Mortgages, construction and development finance | Mortgages and construction finance through licensed partners. → **Register interest** |
| Build & Develop Property | Construction, renovation, development | Architects, engineers and contractors, with quotes for your project. → **Find a contractor** |
| Repair & Maintain Property | Trades, repairs, upkeep | Trusted tradespeople for repairs, servicing and emergencies. → **Request a repair** |
| Manage Property | Management, tenants, diaspora care | HagerLand Property Care looks after your property and tenants. → **Explore Property Care** |
| Property Insurance | Home, landlord, commercial cover | Home, landlord and construction cover through licensed partners. → **Register interest** |
| Knowledge & Advice | Guides, awareness, market insight | Practical help on buying, renting and building in Ethiopia. → **Get advice** |
| Building & Construction Supplies | Materials, tools, equipment | Building materials quoted fast, with delivery to your site. → **Get a quote** |
| Jobs, Recruitment & Staffing | Talent, labour, hiring | Construction and property jobs, and staff for your business. → **Browse jobs** |
| Diaspora card | Diaspora Services · Cross-cutting customer layer · International buyers and investors · Overseas tenants and landlords · Remote management and support · Explore | **Living abroad? We act as your hands on the ground in Ethiopia.** Buy, build or look after property at home without travelling for every step. One accountable team, with photo reports and clear statements, instead of relying on friends and relatives. → **See how we help** · **HagerLand Property Care** |
| Professionals card | Professionals & Service Providers · Cross-cutting supply layer · Built-environment professionals · Agents and advisers · Trades and contractors · Specialist service providers · Explore | **Are you a professional or supplier? Reach customers across Ethiopia and abroad.** Architects, engineers, contractors, estate agents, tradespeople and suppliers: show your work, get verified and receive enquiries from people ready to buy, build and renovate. → **List your business** · **Browse professionals** |
| Property (no listings) | List your property — be among the first · We review every listing and send enquiries straight to you. Homes, plots and commercial space across Ethiopia. · List your property | **Property in Ethiopia**: Homes, apartments, land and commercial space from owners, agents and developers, every listing checked before it goes live. **Looking to buy or rent?** Search what is listed today, or save a search and we will email you as soon as a home that matches goes live. → Property for sale · Property to rent · Get alerts for new listings. **Selling or letting?** List your property yourself and receive enquiries directly, or let our estate agents value it, market it and handle viewings and offers for you. → List your property · Use our estate agents |
| Our Developments | Homes we intend to build (two paragraphs) + "Hear first when we announce a project / Register your interest. No obligation." + full form + About Our Developments | Homes we intend to build (first paragraph) → **Hear first about our projects** · About Our Developments |
| Professionals section | Hire trusted professionals · button "All services" | Hire trusted professionals · "Tell us what you need and get quotes from up to three professionals, or browse by trade." · button **All professionals** |
| Trust points | Every listing reviewed / Our team checks every listing before it goes live. · Verified businesses / The Verified badge appears only after we check documents. · Current, not stale / Property listings expire unless their owner renews them. · We know construction / HagerLand Supply sources building materials, so we understand costs and quality. | **Every listing checked** / Our team reviews every listing and profile before it goes live. · **Verified means verified** / A business shows the Verified badge only after we have checked its documents. · **Always up to date** / Listings expire unless their owner renews them, so what you see is available. · **Built by construction people** / HagerLand Supply sources building materials, so we know real costs and quality. |
| Listing invitation | List with us · Listing is free while we launch. | **Grow with HagerLand** · Reach buyers, tenants and clients in Ethiopia and abroad. (+ "Listing is free while we launch." when that setting is on) |
| Footer | One platform… · Find it. Buy it. … · For Ethiopians in Ethiopia and around the world. | One platform… · Buy, rent, build and manage property in Ethiopia, with verified partners, wherever you live. |

---

## Decisions I made

| Decision | Why |
|---|---|
| Brought the go-live record and the cutover script fixes (`e40bff3`, docs and scripts only) onto this branch | `main` did not yet have the "Go-live record" this brief refers to. This way it reaches `main` with this release. No application code is involved. |
| Visitors see only "Coming soon" | AB's direction. Who does the work is said in plain words in the text ("By HagerLand", "What we do for you"). |
| Grouping: Buy, sell and rent (Buy, Rent, Finance) · Build and improve (Build, Maintain) · Own and manage (Manage, Insurance, Knowledge & Advice) · Supplies and jobs (Supplies, Jobs) | Follows AB's example. Finance sits with buying, Insurance and Advice with owning, so every service has a natural home. The ten services, their names and their modes are unchanged. |
| Service benefit lines live in code (`lib/content/services.ts`), not the database | The rules for this round allow no database changes. The admin "One line" field still drives the admin map. |
| The ecosystem diagram moved to admin → Pillars and modes ("Map of the pillars") | AB's brief allows internal use, and the code rules forbid leaving unused code behind. |
| Focus rings follow the last input (keyboard or mouse/touch) | Browsers disagree about showing focus after a click, and AB saw the box in his browser. This makes it consistent in all browsers without weakening keyboard access. |
| Knowledge & Advice links depend on published content | No page should lead to an empty page. Links come back automatically when AB publishes guides. |
| The homepage no longer embeds the Our Developments form | It is a "coming soon" service. One link to its page (which has the form) is enough, and the homepage loads less. |
| URLs unchanged | The internal anchor `#ecosystem-title` was only used internally; the "How it works" link now points to `#services-title`. No public address changed. |

## Deferred: needs a migration

None. Every fix in this round was possible without changing the database. Optional for a later round: update the default `tagline` and `description` texts that migration 0027 seeds for the ten services, so fresh environments start with customer wording. On the live site, AB can change these texts in admin → Pillars and modes → Edit text.

## Recommendations (not done in this round)

| ID | What | Why | Who / effort |
|---|---|---|---|
| R-1 | Review and publish the six starter guides (admin → Guides) | Guides, checklists and the glossary then appear across Knowledge & Advice automatically. It is the biggest single trust and SEO gain available. | AB, M |
| R-2 | Edit the Knowledge & Advice description (admin → Pillars and modes → Knowledge & Advice → Edit text), for example "Practical advice on buying, renting and building in Ethiopia, and answers from our team." | P-025 | AB, S |
| R-3 | Consider the eyebrow "Ethiopia's property and construction platform" | P-030 | AB decides, S |
| R-4 | Have a native speaker review the Amharic catalogue before switching Amharic on | All entries are machine-drafted | AB, M |
| R-5 | Set a map provider (`NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`) to turn on the property map | The map stays hidden until then | AB, S |
| R-6 | Once the first verified professionals are live, revisit the homepage professional chips (keep them, or show a few verified companies) | P-029 | Later, S |
| R-7 | Check the speed on PageSpeed Insights after release; if the homepage is below 90 on mobile, reduce its JavaScript first | Codespace scores are unreliable | After release, M |
| R-8 | Check the logo focus fix on your own browser after release | P-011 could not be reproduced here | AB, S |

## Verification

| Check | Result |
|---|---|
| Lint, typecheck | No warnings or errors |
| Clean production build (`rm -rf .next && npm run build`) | Succeeds with no warnings. Shared JavaScript 103 kB (unchanged); homepage first load 143 kB (was 145 kB) |
| Unit tests | 230 passed (36 files) |
| Browser tests, full run (local copy) | 476 passed, 133 skipped by design, 3 failed and 3 not run, all because the test browser crashed or an admin page load was cut short (this 8 GB Codespace was short of memory). The three affected spec files then passed on their own: 25 passed, 0 failed. The suite includes the new plain-language test (every public page, no banned words) |
| Re-check after the last fix (heading order): smoke, accessibility, SEO, property, plain language, phone widths, link crawl, international | 245 passed, 1 failed. The failure was the plain-language test finding a test company named "E2E Pillar Provider", left behind by another test. That test's company was renamed, and the plain-language test then passed on every public page (72 of 72) |
| `npm audit` | 0 critical; same build-time tooling findings as before (`docs/qa/npm-audit-2026-10-15.md`) |
| Admin (39 screens) and account (14 pages), local copy, 390 px and 1440 px | All load; no errors; no sideways scroll |
| Lighthouse, phone, real slow-4G throttling, local build | `/` 85 · `/buy` 93 · `/rent` 95 · `/build` 91 · `/supplies` 90 · `/finance` 94 · `/about` 87 · `/property/for-sale` 90 · `/contact` 89 · `/list-with-us` 94. Accessibility 100 on all (98 on `/property/for-sale` before P-031). Largest paint 1.7–1.9 s, layout shift at most 0.074. This machine was under load (load average 2.6–4.8 on 2 cores), so scores vary by up to 10 points between runs; check PageSpeed Insights after release (R-7) |
| Preview | PREVIEW |
