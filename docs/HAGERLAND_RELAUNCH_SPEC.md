# HAGERLAND RELAUNCH — MASTER IMPLEMENTATION SPECIFICATION
Version 1.0 · 13 October 2026 · Owner: AB · Executor: Claude Code
Repository: AccountingBody-HQ / HagerLand-Platform (Next.js 14 App Router, TypeScript, Supabase, Tailwind, Resend, Vercel)

You are Claude Code. This document is your complete brief for transforming HagerLand from a diaspora business directory into Ethiopia's construction and property platform. Read ALL of it before you change anything. It is decisive on purpose: where it makes a decision, implement that decision. Where something is genuinely unknown, it is listed in Section 23 ("Needs AB") and you must ask rather than invent.

======================================================================
SECTION 0 — RULES OF ENGAGEMENT (READ FIRST, FOLLOW ALWAYS)
======================================================================

0.1 First action, before anything else
- If docs/HAGERLAND_RELAUNCH_SPEC.md already exists (AB may have uploaded it), confirm it matches this brief. Otherwise save this entire document verbatim there (create docs/). This file is the single source of truth across sessions. If context is ever compacted or a new session starts, re-read it before continuing.
- Create docs/RELAUNCH_PROGRESS.md: a checklist of every Work Package (Section 21) with status (todo / in progress / done / blocked), the date, the commit hash, and a short note of anything deviating from spec. Update it at the end of every work package.

0.2 Who you are working for
- AB is a solo founder with limited technical depth. He wants to learn while building. At every stop point, explain in plain everyday English: what you did, why, how it works, and what any technical term means. Keep it short.
- One work package at a time. Never start the next work package until AB says "continue".
- Make deliberate changes to real issues. Do not wander into unrelated refactors or repeated re-checking.

0.3 Mandatory working rhythm for every work package
1. Plan: state the files you will create/change/delete and any SQL. Wait for AB's "go" ONLY at the gates marked [STOP-GATE]; otherwise proceed.
2. Build the change.
3. Verify after every file write (re-read the file or run a typecheck on it).
4. Run, in this order: npm run lint, npx tsc --noEmit, rm -rf .next && npm run build. All three must pass with zero errors. Fix warnings you introduced.
5. SQL: NEVER run SQL against the database yourself. Write every database change as a numbered migration file in supabase/migrations/ (e.g. 0001_core_schema.sql). Hand it to AB to paste into the Supabase SQL Editor, with (a) a one-paragraph plain explanation and (b) a verification query he runs afterwards and what result he should see. Wait for him to confirm before writing code that depends on it.
6. Show AB a summary of the diff. Commit only after the build is green and AB has approved at stop-gates. Small, focused commits with clear messages.
7. Update docs/RELAUNCH_PROGRESS.md.

0.4 Branching and deployment
- All relaunch work happens on a branch: relaunch/construction. Push it so Vercel creates Preview Deployments. The live site on main stays untouched until the cutover work package (WP-20).
- Before any change: create a git tag pre-construction-relaunch on main and push it, so the old platform can always be restored.
- Do not upgrade Next.js, React or other major versions during the relaunch. Stay on Next 14.2.x.

0.5 Database safety
- The Supabase project is in production use. All new schema is ADDITIVE until cutover. Never DROP or TRUNCATE legacy tables (companies, jobs, housing, money, cars, tutors, community, events, delivery, made_in_ethiopia, business_claims, listing_enquiries, import_log, admin_audit, rate_limits, countries, and any others). They are preserved (some data was earmarked for future brands). At cutover they are made private (Section 20), not deleted.
- Before WP-2's first migration, AB must take a manual backup (instructions in WP-0).

0.6 Code quality standards
- TypeScript strict. No `any` unless unavoidable and commented. Use `Array.from(new Set())` rather than spread on Sets. Avoid variable names `_` and `_score`.
- Add explicit type annotations where a variable is reassigned from untyped API data inside loops (avoids circular inference errors).
- Validate every input with zod on the server. Never trust the client.
- Never interpolate user input into Supabase/PostgREST filter strings (e.g. `.or(\`name.ilike.%${q}%\`)`). Use parameterised `.ilike('col', pattern)` after escaping `%`, `_`, `,`, `(`, `)`, or call a Postgres function via `.rpc()`.
- Escape all user-supplied text inserted into email HTML.
- Server-only modules (service-role Supabase client, secrets) must `import 'server-only'`.
- Prefer Server Components. Client Components only for interactivity.
- No inline style objects for theming; Tailwind classes using the design tokens.
- No dead code, no commented-out blocks, no TODOs left in shipped code (track them in RELAUNCH_PROGRESS.md instead).
- No placeholder, lorem ipsum, fake listings, fake statistics, fake testimonials, fake partner logos or invented counts ANYWHERE in production UI. The site must look like a real operating business because it is one; empty states must be designed and honest.

0.7 Things you must never change without AB's explicit agreement
- The brand name "HagerLand" (capital H, capital L, one word; lowercase only in domains/emails).
- The core colours (green #1C7C4C, gold #B8862E) and the logo mark, the house logo (E1: a white house outline in a green circle) — see Section 3.5. (Replaced the three-node mark in F-8, 29 Oct 2026, by AB's decision.)
- The admin path /roodber8 and its username + password + TOTP login model (you will harden it, not replace it).
- The primary domain www.hagerland.com (canonical host).
- Anything in Section 23.

======================================================================
SECTION 1 — WHAT HAGERLAND NOW IS
======================================================================

1.1 One-sentence definition
HagerLand is Ethiopia's construction and property platform: one place to find property, source construction materials, hire trusted professionals, and buy homes built by HagerLand itself.

1.2 The five pillars (in priority of homepage presence)
1. Property — a nationwide property marketplace (Ethiopia's answer to Zoopla): homes and land for sale and to rent, commercial property, and a growing database of named developments and buildings across Ethiopia.
2. Construction Supplies — HagerLand Supply: construction materials and trade products, sold via quotes at launch (Request a Quote / send your materials list), growing into a full materials marketplace with third-party suppliers.
3. Professionals & Services — a marketplace/directory of contractors, architects, engineers, builders, tradespeople, agents, suppliers, merchants and other service providers, with profiles, portfolios and enquiries.
4. HagerLand Developments — properties HagerLand develops and sells itself; clearly separated and labelled from third-party listings.
5. The one-stop platform — unified search, accounts and enquiries tying all of the above together.

1.3 The strategic logic (shape the product around this)
- Supply and development reinforce each other: HagerLand Supply sources materials at scale; HagerLand Developments is its anchor customer and builds below market cost; development experience improves what Supply stocks. The platform (property + professionals) brings demand and data to both.
- Trust is the product. Ethiopia's property and construction market is young and fragmented: stale listings, unverified agents, uncertain prices, developer delivery delays. HagerLand wins by being the verified, current, transparent option.
- Integrity rule (non-negotiable): HagerLand is both a marketplace and a participant. HagerLand Developments and HagerLand Supply products are always clearly labelled, and are NEVER silently boosted above third-party results in organic search/sort. Any boost must be labelled "Sponsored" or shown in a separately labelled "From HagerLand" module. Third parties must be able to trust the marketplace.

1.4 Audiences
Buyers (local and diaspora), renters, private property owners/landlords, estate agents/brokers, real-estate developers, contractors, tradespeople, architects/engineers/consultants, suppliers/merchants/manufacturers, homeowners renovating, and HagerLand's own sales customers.

1.5 Market facts to design for (Ethiopia-specific)
- Mobile-first: most users are on Android phones, often on slow or metered data. Pages must be light and fast.
- Contact culture: phone calls, WhatsApp and Telegram dominate. Every listing/profile offers Call, WhatsApp, Telegram and an enquiry form. Ethiopian numbers: +251 followed by 9 digits (mobile starts 9 or 7). Accept international numbers for diaspora.
- Currency: Ethiopian Birr (ETB, shown as "ETB 4,500,000" or "Br"). Use "ETB" consistently. Diaspora interest in USD is real — approximate USD display is Phase 2.
- Property norms to model: land is leasehold (urban land lease); "carta" (title deed) availability matters; building height expressed as G+1, G+2 etc. (ground plus floors); finishing level (shell / semi-finished / fully finished) is a key filter for new builds; condominiums are a major segment; landlords often require several months' rent in advance; prices are often "negotiable"; off-plan sales with payment plans are common.
- Supplies norms: units include piece, box, metre, roll, sheet, bag (e.g. 50 kg cement), quintal (100 kg — used for cement and rebar), tonne, m², m³ (sand/aggregate), litre, kg, set, pair. Rebar is sold by diameter (Ø8–Ø32 mm). Steel and cement prices move frequently — show "price updated" dates and allow "call for today's price". Corrugated iron roofing sheets, water tanks, pumps, solar and generators are high-demand categories.
- Contractor licensing: Ethiopian contractors are registered in categories and grades (e.g. general/building/road/specialised contractor, grades 1–10). Capture licence category, grade and number; verify manually.
- Business documents for verification: trade licence and TIN (Taxpayer Identification Number).

======================================================================
SECTION 2 — AUDIT OF THE CURRENT CODEBASE (KEEP / REFACTOR / REMOVE)
======================================================================

Findings from inspecting the repository (318 files, ~44k lines excluding lockfile):

2.1 Architecture problems to fix
- One table + one set of ~10 near-identical files per section (list, detail, post, actions, claim, claim/verify, manage, edit-link, three API routes, admin list, admin detail) × 11 sections. Massive duplication; incompatible with the new model. Replace with a unified, entity-based architecture (Section 6).
- No user accounts. Listings are managed via emailed "manage tokens". A marketplace with agents, suppliers and professionals needs real accounts (Section 7).
- No database migrations in the repo; the schema lives only in Supabase. Introduce supabase/migrations/.
- Admin auth is enforced page-by-page. Two client pages (app/roodber8/import/page.tsx, app/roodber8/import/auto/page.tsx) do not check auth themselves (their APIs do). middleware.ts is empty (matcher: []). Add central protection.
- app/roodber8/layout.tsx relies on header x-invoke-path (not reliable). Replace with usePathname in a client sidebar.
- next.config.mjs sets `Cache-Control: no-store` on EVERY route. This disables CDN caching and ISR sitewide — a serious performance problem. Remove it; set caching per route.
- Pages use `export const dynamic = 'force-dynamic'` + `noStore()` broadly. Replace with ISR (`revalidate`) + on-demand `revalidateTag/revalidatePath`.
- Google Translate widget injected in the root layout (slow, unreliable Amharic, sets cookies, untranslated content is what Google indexes). Remove (proper Amharic in Phase 2).
- Search API interpolates the raw query into `.or()` filter strings (PostgREST filter injection / breakage with commas or brackets). Detail pages do the same with category/city. Fix by design in the rebuild.
- Emails insert user input into HTML unescaped (HTML injection). Email sender is "info@accountingbody.com". Base URL falls back to hagerland-platform.vercel.app in ~49 places. Centralise.
- vercel.json schedules /api/cron/property-discovery, which does not exist (404 weekly). Remove.
- JSON-LD on detail pages hard-codes addressCountry 'GB'.
- Unused dependencies: @sanity/client, @sanity/image-url, next-sanity (no usage), recharts (no usage), react-markdown (only BirrBank). CookieConsent component exists but is not mounted and references GTM while the privacy page says no analytics. @tailwindcss/typography is installed but not registered in tailwind.config.ts plugins. @vercel/analytics and @vercel/speed-insights installed but never mounted.
- Imported records (Google Places) store Google content long-term. Google Maps Platform terms restrict storing Places content other than place IDs. New rule: Google Places may be used only to DISCOVER businesses; store place_id; all displayed content must be verified/rewritten by HagerLand (AI-drafted then human-reviewed) or supplied by the business. Do not store or display Google reviews/ratings/photos.

2.2 KEEP (sound — adapt, do not rebuild)
- Stack: Next.js 14.2 App Router, TypeScript strict, Tailwind, Supabase, Resend, Vercel.
- lib/admin-auth.ts — HMAC session + timing-safe compare + TOTP (otplib). Keep; add an Edge-compatible verifier for middleware (Web Crypto).
- Admin login flow + login rate limiting (lib/rate-limit.ts, rate_limits table). Keep; generalise the limiter (namespaced keys, sliding window) and reuse for public forms.
- lib/turnstile.ts (Cloudflare Turnstile + honeypot) — keep for all public forms.
- Admin audit log concept (admin_audit) — keep, extend to new entities (new table audit_log).
- Moderation concepts proven in the current admin: pending → approve/reject, pending_changes JSON applied on approval, freeze/soft-delete, restore, purge, bulk approve, featured toggle, daily admin digest cron. Re-implement generically.
- Import pipeline (Google Places search via Places API (New) with pageToken in POST body; place details; dedup via import_log on (google_place_id, section); bulk import; history; AI description drafting; bulk review). Keep the logic; retarget it to create Organisations (professionals, suppliers, developers, agents). IMPORTANT known-good details to preserve: places-search uses POST places.googleapis.com/v1/places:searchText with pageToken in the body; admin GET routes authenticate with cookies() — do not change that auth pattern; do not reintroduce legacy Places API pagination.
- Brand assets: lib/brand-mark.json (the one definition of the mark), components/brand/Logo.tsx, app/icon.svg, app/favicon.ico, app/apple-icon.png, app/manifest.ts, public/icons/ (192, 512, maskable 512), public/logo.png; all icon files are written by scripts/brand-icons.mjs. Manrope wordmark with ®.
- Turnstile widget component, Breadcrumb, ShareButton (refactor to new design tokens).
- Fonts via next/font (Inter, Manrope). Drop IBM Plex Mono and the unused Geist local fonts.
- DESIGN_PRINCIPLES.md rules that remain valid: paired buttons equal width; mobile-first.

2.3 REMOVE COMPLETELY (code — git history and the tag keep it)
- Routes: /business, /jobs, /housing, /money, /cars, /tutors, /community, /events, /delivery, /made-in-ethiopia, /diaspora, /property (old housing-based version — rebuilt from scratch), /birrbank (entire tree), /edit-link and every */edit-link, */manage, */post, */[id]/claim (old versions).
- API: app/api/{business,cars,community,delivery,events,housing,jobs,made-in-ethiopia,money,tutors}/*, all app/api/birrbank-*, populate-institution, verify-institution, cron/birrbank-nbe-fx, cron/promo-expiry (replaced by new expiry cron), old api/search, old api/enquiry.
- Admin: app/roodber8/{businesses,cars,community,delivery,events,housing,jobs,made-in-ethiopia,money,tutors,claims,birrbank}, old review page/actions (re-implemented generically).
- Components: all *CategorySelect.tsx, DirectorySearch, SearchBar (old), SearchBox (old), HeroSearch (old), HeroBtns, HeroGraphic, EmiCalculator, EmailCapture, RateTypeToggle, SavingsRatesTable, institutions/*, HLLanguageContext, LanguageSwitcher, HashScroller (unless reused), SubmissionBanner (old), SectionHeader (old), FilterDropdown (old), CookieConsent + CookieSettingsButton (replaced), ReviewQueueList (re-implemented), AdminSidebar (re-implemented).
- lib: supabase-birrbank.ts, categories.ts (old diaspora categories), email.ts (replaced).
- Google Translate scripts and CSS hacks in app/layout.tsx and globals.css; BirrBank CSS in globals.css.
- Dependencies: @sanity/client, @sanity/image-url, next-sanity, recharts, react-markdown (unless you use it for guides in Phase 2 — then keep), otplib stays.
- Env vars no longer needed: NEXT_PUBLIC_BIRRBANK_SUPABASE_URL, BIRRBANK_SUPABASE_SERVICE_KEY (remove from .env.example; AB removes from Vercel at cutover).
- README.md references to diaspora directory and old build guides — rewrite.

======================================================================
SECTION 3 — BRAND AND POSITIONING
======================================================================

3.1 Positioning statement
For people building, buying, renting or investing in property in Ethiopia — at home or abroad — HagerLand is the one platform that brings property, construction materials and trusted professionals together, verified and up to date, backed by a company that builds and supplies itself.

3.2 Name meaning (use in About and brand story)
"Hager" (ሀገር) is Amharic for country/homeland; "Land" is English. Both halves mean the same thing: the land we live on and build on. HagerLand is about building the land.

3.3 Messaging hierarchy
- Master tagline: "Build. Buy. Live."  (configurable in lib/brand.ts; AB to confirm — Section 23)
- Descriptor (always near the name in metadata, footer, OG): "Ethiopia's construction and property platform"
- Hero headline: "From the first brick to the front door."
- Hero support line: "Find homes and land, source construction materials, and hire trusted professionals across Ethiopia — all in one place."
- Proof points (use in trust strip; only claims that are true at launch):
  1. "Every listing reviewed" — all listings are moderated before publishing.
  2. "Verified businesses" — verification badge only after documents are checked.
  3. "Current, not stale" — property listings expire unless renewed.
  4. "Built and supplied by us" — HagerLand develops and supplies, so we know construction.
- Voice: confident, practical, trustworthy, warm. Plain English. No hype, no exclamation marks in UI, no "revolutionary". Short sentences. Talk like an experienced builder who is also a straight-dealing agent.
- Retire completely: "Where Ethiopia Does Business", "Made in Ethiopia. Carried by its people.", "Built for Ethiopia. Open to the world.", "Diaspora Network", "community directory", "six pillars", "financial markets", BirrBank references, "Free, always" claims, "ሃገር · Homeland · Ethiopian Network" eyebrow.

3.4 Brand architecture (how divisions appear)
- HagerLand — the platform and master brand.
- HagerLand Supply — HagerLand's own materials business (appears as a supplier/seller badge "Sold by HagerLand Supply").
- HagerLand Developments — HagerLand's own property projects (gold badge "HagerLand Development").
- Third parties appear under their own names with status badges.
Divisions are labels within one site now; they can become separate businesses later. Keep division names in lib/brand.ts so they can change in one place.

3.5 Visual identity decision
- Keep: name, wordmark (Manrope ExtraBold + ®), logo mark (the house logo (E1: a white house outline in a green circle)), primary green #1C7C4C, gold #B8862E.
- The mark's meaning in brand copy: Our mark is a simple house: the home at the centre of everything we do.
- Evolve (Section 5): retire the gradient + dot-grid green heroes that defined the directory era; move to a calmer, premium, photography-led and architectural look with a deep ink colour and warm stone neutrals. Green becomes the action/brand colour rather than a background wash. Gold is reserved for verification and HagerLand Developments.

======================================================================
SECTION 4 — INFORMATION ARCHITECTURE AND ROUTES
======================================================================

4.1 Primary navigation (desktop, left → right)
Logo | Property ▾ | Supplies ▾ | Professionals ▾ | Developments ▾ | [search icon] | Sign in | [List with us] (primary button)

Mega-menus (content):
- Property: For sale · To rent · New developments · Land & plots · Commercial · Find an agent · Sell or let your property (CTA)
- Supplies: Shop all categories (top 8 category links with icons) · Request a quote · Send your materials list · Find suppliers · Become a supplier (CTA)
- Professionals: Contractors · Architects · Engineers · Tradespeople · Interior designers · All services · Join as a professional (CTA)
- Developments: HagerLand Developments (gold accent, first) · All developments · Find developers · Register interest (CTA)

Mobile: sticky top bar (logo, search icon, menu). Full-screen drawer with accordion sections mirroring the above, then Sign in / Create account, List with us. Also a fixed bottom action bar on detail pages only (Call · WhatsApp · Enquire).

4.2 Footer (4 columns + bottom bar)
- Brand column: logo + descriptor + tagline + social icons (link only to real accounts; hide icons whose URL is not configured in lib/brand.ts).
- Property: For sale · To rent · New developments · Land · Commercial · Find an agent
- Supplies & Services: Supplies · Request a quote · Suppliers · Professionals · Contractors · Architects
- HagerLand: About · HagerLand Developments · How it works · List with us · Contact · Help & FAQs
- Bottom bar: © year HagerLand · Terms · Privacy · Cookies · (legal entity line from lib/brand.ts)

4.3 Complete route map (Phase 1 unless marked P2/P3)
Public
- /                                   Homepage
- /search                             Unified search (?q=&vertical=all|property|supplies|companies|developments)
- /property                           Property hub (search form, popular locations, latest)
- /property/for-sale                  Sale results (filters via query params)
- /property/to-rent                   Rent results
- /property/for-sale/[...location]    SEO location landing, e.g. /property/for-sale/addis-ababa/bole
- /property/to-rent/[...location]     SEO location landing
- /property/[slug]                    Property detail (slug = readable-text-SHORTID, e.g. 3-bed-apartment-bole-addis-ababa-k7f2q9)
- /developments                       All developments (third-party + HagerLand, filterable)
- /developments/[slug]                Development detail (third-party template)
- /our-developments                   HagerLand Developments hub (own projects + register interest)
- /our-developments/[slug]            HagerLand project detail (premium template)
- /supplies                           Supplies hub (categories, quote CTA)
- /supplies/[category]                Category listing (+ subcategory chips)
- /supplies/[category]/[subcategory]  Subcategory listing
- /supplies/product/[slug]            Product detail ("product" is a reserved category slug)
- /supplies/quote                     Quote list ("quote basket") + submit
- /supplies/materials-list            Upload a materials list / BoQ for a quote
- /supplies/special-buys              P2
- /suppliers                          Supplier directory
- /professionals                      Professionals hub (service categories)
- /professionals/[service]            Service listing, e.g. /professionals/architects
- /professionals/[service]/[...location]  SEO landing, e.g. /professionals/plumbers/addis-ababa/bole
- /agents                             Estate agent directory
- /developers                         Developer directory
- /company/[slug]                     Unified organisation profile (agent, developer, supplier, professional)
- /company/[slug]/claim               Claim this business
- /list-with-us                       Hub: list a property / join as professional / become a supplier / developers
- /about, /how-it-works, /contact, /help (FAQs), /terms, /privacy, /cookies
- /guides, /guides/[slug]             P2 content hub
- /pricing, /advertise                P3

Auth & account
- /login, /signup, /auth/callback (Supabase), /auth/reset-password, /auth/update-password
- /account                            Dashboard home (adapts to account type)
- /account/listings, /account/listings/new, /account/listings/[id]/edit         property listings
- /account/products, /account/products/new, /account/products/[id]/edit         P2 (supplier self-serve products)
- /account/company                    Organisation profile editor (+ portfolio, services, areas served)
- /account/company/verification       Upload verification documents
- /account/enquiries, /account/enquiries/[id]   Lead inbox
- /account/quotes                     Quote requests the user has submitted
- /account/saved                      P2 saved properties/products/companies
- /account/alerts                     P2 saved searches & alerts
- /account/settings                   Name, phone, email, password, notification preferences, delete account
- /onboarding                         Post-signup: choose account type, create organisation

Admin (keep secret path)
- /roodber8-login, /roodber8 (+ sub-routes, Section 18)

API (route handlers; prefer Server Actions for forms)
- /api/enquiries (POST)   /api/contact-reveal (POST)   /api/quotes (POST)   /api/uploads/sign (POST)
- /api/search/suggest (GET, typeahead)
- /api/cron/daily (expiry, reminders, digest)  — Bearer CRON_SECRET
- /api/admin/places-search, /api/admin/place-details, /api/admin/import, /api/admin/auto-import (kept, retargeted)
- /auth/callback (route handler)

4.4 Relationships between areas (cross-linking rules)
- Property detail → developer/agent company profile; the development page if part of one; "Professionals for this area" (agents, movers, interior designers) module; for land/plots: "Build on this plot" module linking to contractors, architects and HagerLand Supply quote.
- Development detail → developer profile; listings (units) within it; nearby developments.
- Product detail → seller (HagerLand Supply or supplier profile); related products; "Need it installed?" → relevant professionals (e.g. tiles → tilers).
- Professional profile → portfolio projects (optionally linked to developments); services; areas served; enquiry.
- HagerLand Developments → "Built with HagerLand Supply" message (the strategic story), register interest.
- Every listing page → breadcrumb (Home › Property › For sale › Addis Ababa › Bole › Listing).

======================================================================
SECTION 5 — DESIGN SYSTEM AND UX
======================================================================

5.1 Design direction
Modern, credible, premium, architectural. Think a top international property portal crossed with a professional trade supplier: lots of white space, strong typography, real photography, crisp cards, clear prices, decisive calls to action. Calm, not busy. Mobile-first.

5.2 Design tokens (tailwind.config.ts — replace current theme.extend)
Colours
- brand / green: DEFAULT #1C7C4C, dark #155F3A, darker #0F4A2C, soft #E9F5EE, tint #F3FAF6
- gold: DEFAULT #B8862E, dark #946B22, soft #FBF1DE
- ink: DEFAULT #152238 (primary text, dark sections), 2 #24324A
- stone (warm neutrals): 50 #FAF9F7, 100 #F4F2EE, 200 #E8E5DF, 300 #D6D2CA, 500 #8A857C
- muted text: #5B6472; subtle text: #8A93A3
- border: #E4E6E3; border-strong: #CBD0CC
- state: success #1C7C4C, warning #B7791F, danger #C2410C (error #B42318), info #2563EB
- Define all as CSS variables in globals.css (:root) and map Tailwind colours to them so a future dark mode is possible. Light mode only at launch.
Typography
- Display/headings: Manrope (600/700/800) via next/font, variable --font-display.
- Body/UI: Inter (400/500/600/700), --font-sans.
- Ethiopic script: Noto Sans Ethiopic (400/600) via next/font, --font-ethiopic, applied with a `font-ethiopic` utility and included in the font stack fallback so any Amharic text renders properly.
- Scale (mobile → desktop): display 40/56/64px, h1 32/44, h2 26/34, h3 20/24, body 16, small 14, caption 12. Line-height 1.1 for display, 1.5–1.6 for body. Tabular numerals (`tabular-nums`) for prices, areas and counts.
Spacing & layout
- 4px base grid. Container max-w-7xl (1280px), gutters px-4 sm:px-6 lg:px-8. Section padding py-14 sm:py-20.
- Radius: sm 6px (inputs), md 10px (buttons), lg 14px (cards), xl 20px (panels). Buttons are rounded-md (not pills) to feel more premium/trade; chips/badges are rounded-full.
- Shadows: xs for inputs, sm for cards at rest, md on hover/raised. No glow effects.
Iconography
- lucide-react (already installed) everywhere; remove inline SVG strings and dangerouslySetInnerHTML icons. 1.75px stroke, 20px default.
Imagery
- Real photography of Ethiopian properties, construction and products only. Never hotlink. Images uploaded to Supabase Storage or committed to /public/images (licensed). AB supplies brand photography (Section 23); until then, design must look complete without photos: ink-coloured hero with a subtle architectural line pattern (SVG blueprint grid at 6% opacity), and category tiles with icons.
- next/image for all images with explicit sizes, `sizes` attribute, lazy loading below the fold, blur placeholder from a tiny base64 or dominant colour.
- Aspect ratios: property card 4:3, property gallery 3:2, product 1:1 on white, company logo 1:1, development hero 16:9.

5.3 Core components (components/ui and components/<domain>) — build these in WP-3
Primitives (components/ui): Button (variants: primary green, secondary outline-ink, ghost, gold, danger; sizes sm/md/lg; loading state; asChild for links), IconButton, Input, Textarea, Select, Combobox (searchable, for locations/categories), Checkbox, Radio, Switch, RangeInputs (min/max), PriceInput (ETB), PhoneInput (+251 default, international allowed), FileDrop (images/docs with progress), Badge, Chip/FilterChip, Tabs, Accordion, Dialog/Sheet (mobile bottom sheet for filters), Dropdown menu, Tooltip, Toast, Skeleton, EmptyState, Pagination, Breadcrumbs, Stat, Card, Divider-free section wrappers (Section, SectionHeader with eyebrow/title/action), Container.
Layout: SiteHeader (with MegaMenu and MobileDrawer), SiteFooter, AccountShell (sidebar on desktop, top tabs on mobile), AdminShell.
Domain:
- PropertyCard (image with photo-count, price + period, "Negotiable" tag, beds/baths/m², title, location line, badges: For sale/To rent, New, Verified agent, Featured, HagerLand Development), PropertyCardHorizontal (results list on desktop), PropertyGallery (swipeable, fullscreen lightbox, keyboard accessible), KeyFacts grid, PriceBlock, LocationBlock (text + optional Google Maps Embed iframe when lat/lng present, loaded on interaction), ContactPanel (sticky on desktop; owner/agent identity, Call / WhatsApp / Telegram / Enquire; phone revealed on click), MortgageNote (P2).
- DevelopmentCard, DevelopmentHero, UnitTypesTable, PaymentPlanBlock, ConstructionProgress (status timeline), RegisterInterestForm.
- ProductCard (image, name, brand, key spec, price or "Price on request", unit, stock status, "Add to quote"), ProductSpecsTable, QuoteBasket (drawer + page), QuantityStepper with unit label, MaterialsListUploader.
- CompanyCard (logo/initials, name, kind, verification badge, services, areas, rating P3), CompanyHeader, PortfolioGrid, ServicesList, AreasServed, VerificationBadge (levels: Listed / Claimed / Verified, with tooltip explaining what was checked).
- SearchBar (unified, with vertical tabs on homepage: Buy · Rent · Supplies · Professionals), LocationPicker, FiltersPanel (desktop sidebar; mobile bottom sheet with sticky "Show N results"), SortSelect, ResultsHeader (count + active filter chips + clear all), NoResults (suggestions).
- EnquiryForm (name, phone, email optional, message prefilled, preferred contact method, Turnstile, consent line), TrustStrip, HowItWorksSteps, CTASection, LogoWall only when real partners exist (not at launch).

5.4 UX rules
- Mobile-first; test every page at 360px, 390px, 768px, 1024px, 1440px. No horizontal scroll ever.
- Tap targets ≥ 44px. Body text ≥ 16px on mobile (prevents iOS zoom on inputs).
- Paired buttons equal width (flex-1) — keep this rule.
- Resting state is what matters: no design may depend on hover to look right (hover is enhancement only).
- Filters update URL query params (shareable, back-button safe). Debounce typeahead 250ms.
- Every list has: loading skeleton, empty state, error state.
- Forms: inline validation on blur, clear error messages, preserve input on error, disable double-submit, success screen with next steps.
- Prices: "ETB 4,500,000" (no decimals for property), rent "ETB 35,000 /month", "Price on request", "Negotiable" tag. Area: "120 m²". Use Intl.NumberFormat('en-ET').
- Dates: "12 Oct 2026". Relative for listing freshness ("Added 3 days ago", "Updated today").
- Images always have meaningful alt text (property: "{type} in {area} — photo N").
- Accessibility: WCAG 2.2 AA — contrast ≥ 4.5:1 for text, visible focus rings (2px green offset), semantic landmarks, labelled inputs, aria-live for async results, keyboard-operable menus/gallery/dialogs, prefers-reduced-motion respected.

5.5 Design sign-off gate
Memory of past work: designs iterated many times after being built live. Therefore: in WP-3 build a style-guide page at /dev/styleguide (only rendered when NODE_ENV !== 'production' or behind admin session) showing tokens and all components, and in WP-12 build the homepage on the preview deployment. Both are [STOP-GATE] — AB reviews on his phone and desktop and signs off before you proceed.

======================================================================
SECTION 6 — DATA MODEL AND BACKEND
======================================================================

6.1 Principles
- Unified, entity-based schema in the public schema; new tables named plainly (below) and must not collide with legacy table names (checked in WP-0). Legacy tables untouched until cutover.
- UUID primary keys (gen_random_uuid()). Every table: created_at timestamptz default now(), updated_at timestamptz (trigger set_updated_at).
- Public-facing records have: status (enum), slug (unique), short_id (8-char base36, unique, used in URLs), published_at, moderation fields.
- RLS enabled on EVERY new table. Default deny. Policies listed in 6.5.
- Money stored as bigint in ETB (whole birr for property; for products store price_etb_cents bigint to allow cents). Areas as numeric(10,2) m².
- Full-text search: generated tsvector columns + GIN indexes; pg_trgm for fuzzy names. Enable extensions: pgcrypto, pg_trgm, unaccent (unaccent used in search function).
- All writes from the app go through Server Actions / route handlers. User-facing writes use the user-scoped Supabase client (RLS enforced). Admin/system writes use the service-role client in server-only modules with explicit admin session checks.
- Moderation-protected columns (status → published, is_featured, featured_until, verification_level, is_hagerland, plan, sponsored flags) can only be changed by the service role: enforce with a BEFORE UPDATE trigger `protect_privileged_columns()` that raises if auth.role() <> 'service_role' and any protected column changed. Owners may set status only among draft ↔ pending_review ↔ paused ↔ archived.

6.2 Enums
- account_type: personal, business
- org_kind: agency, developer, supplier, manufacturer, contractor, professional_firm, sole_trader, hagerland
- org_role (membership): owner, admin, member
- verification_level: listed (imported/unclaimed), claimed, verified
- listing_status: draft, pending_review, published, paused, expired, rejected, archived, removed
- listing_purpose: sale, rent
- property_type: apartment, condominium, house, villa, townhouse, g_plus_building, room, studio, land, commercial_building, office, shop, warehouse, hotel, mixed_use, other
- finishing_status: shell, semi_finished, fully_finished, not_applicable
- furnishing: unfurnished, semi_furnished, furnished
- tenure: leasehold, freehold_private, condominium_title, cooperative, unknown
- completion_status: off_plan, under_construction, ready
- development_kind: development, condominium_site, building, compound, mixed_use_project
- price_type (products): fixed, from, on_request
- stock_status: in_stock, low_stock, out_of_stock, made_to_order, available_on_request
- enquiry_status: new, contacted, qualified, won, lost, spam
- quote_status: submitted, in_review, quoted, accepted, declined, expired, cancelled
- location_level: region, city, sub_city, area

6.3 Tables (columns abbreviated; include indexes and constraints as noted)

profiles (1:1 with auth.users)
- id uuid PK references auth.users on delete cascade, full_name text, phone text, phone_verified bool default false, account_type account_type default 'personal', avatar_path text, preferred_contact text (phone|whatsapp|telegram|email), marketing_opt_in bool default false, is_suspended bool default false, last_seen_at timestamptz.
- Trigger: on auth.users insert → create profiles row.

organisations
- id, kind org_kind, name text not null, slug unique, short_id unique, tagline text, description text (≤ 5000), logo_path, cover_path, phone, whatsapp, telegram, email, website, address_line text, location_id uuid → locations, lat numeric(9,6), lng numeric(9,6), areas_served uuid[] (location ids), year_established int, team_size text, trade_licence_number text, tin text, licence_category text, licence_grade text, verification_level verification_level default 'listed', verified_at, is_hagerland bool default false, status listing_status default 'pending_review', is_featured bool default false, featured_until timestamptz, plan text default 'free', google_place_id text unique null, source text (self_signup|import|admin), claimed_at, search_tsv tsvector generated, social jsonb (facebook, instagram, linkedin, tiktok, youtube), opening_hours jsonb, pending_changes jsonb.
- Indexes: kind, status, location_id, GIN(search_tsv), trigram on name.

organisation_members
- org_id, user_id, role org_role, PK(org_id,user_id).

organisation_services (what a professional/contractor offers)
- org_id, service_id → service_categories, PK(org_id, service_id).

org_product_categories (what a supplier/manufacturer supplies)
- org_id, product_category_id → product_categories, PK(org_id, product_category_id).

reports (user reports of listings/profiles)
- id, entity_type, entity_id, reason (fraud, wrong_info, duplicate, offensive, already_sold, other), details, reporter_contact null, status ('open','actioned','dismissed'), created_at. Service role only.

search_misses (zero-result searches, aggregated)
- q_normalised, vertical, count, last_seen_at, PK(q_normalised, vertical). Service role only.

service_categories (tree)
- id, parent_id null, name, slug unique, description, icon (lucide name), sort int, is_active bool, seo_title, seo_intro.

portfolio_projects
- id, org_id, title, description, location_id, year int, project_value_band text, development_id null, cover_path, status listing_status, sort int.

locations (hierarchy)
- id, parent_id null, level location_level, name text, name_am text null, slug text, path text unique (e.g. 'addis-ababa/bole'), lat, lng, is_active bool, sort int. Unique(parent_id, slug).
- Function locations_descendants(id) returns setof uuid (recursive CTE) — used in search.

developments
- id, kind development_kind, name, slug unique, short_id, developer_org_id → organisations null, is_hagerland bool default false, summary text, description text, location_id, address_line, lat, lng, completion_status, expected_completion date null, completed_year int null, total_units int null, floors_label text (e.g. 'G+12'), unit_types jsonb (array: {type, beds, area_min, area_max, price_from_etb}), price_from_etb bigint, price_to_etb bigint, payment_plan text, amenities text[], finishing_status, tenure, brochure_path text, video_url text (YouTube only), status listing_status, is_featured, featured_until, register_interest_enabled bool default true, search_tsv generated, pending_changes jsonb.

properties (listings)
- id, short_id, slug, purpose listing_purpose, property_type, title (≤ 120), description (≤ 6000), price_etb bigint null, price_period text null ('month' for rent, null for sale), price_negotiable bool, price_on_request bool, advance_months int null (rent), service_charge_etb bigint null, bedrooms smallint, bathrooms smallint, area_m2 numeric, plot_area_m2 numeric, floors_label text, floor_number smallint, year_built smallint, finishing_status, furnishing, tenure, has_title_deed bool null, completion_status, parking_spaces smallint, features text[] (from controlled list: lift, generator, water_tank, borehole, security, cctv, garden, balcony, servants_quarters, gym, pool, solar, internet_ready, wheelchair_access, pets_allowed...), location_id (required, deepest known), address_line, lat, lng, show_exact_location bool default false (approximate pin otherwise), development_id null, lister_type text (owner|agent|developer|hagerland), lister_user_id → profiles, lister_org_id → organisations null, contact_phone, contact_whatsapp, contact_telegram, contact_email, video_url (YouTube), virtual_tour_url, status listing_status default 'draft', rejection_reason text, published_at, expires_at (published_at + 60 days default; configurable), renewed_at, is_featured, featured_until, is_hagerland bool default false, views_count int default 0, enquiries_count int default 0, search_tsv generated, pending_changes jsonb.
- Indexes: (status, purpose, property_type), location_id, price_etb, bedrooms, published_at desc, GIN(search_tsv), GIN(features).
- Constraint: purpose='rent' → price_period='month' when price present.

media (images & documents for any entity)
- id, entity_type text check in ('property','development','organisation','portfolio','product'), entity_id uuid, kind text ('image','floorplan','document','logo','cover'), storage_path text, width int, height int, bytes int, alt text, sort int, is_cover bool, status text ('pending','approved','rejected') default 'approved' for verified orgs else 'pending', uploaded_by uuid.
- Limits: property 25 images + 3 floorplans; development 40; product 8; portfolio project 20; organisation logo 1, cover 1.

product_categories (tree)
- id, parent_id, name, slug unique, description, icon, image_path, sort, is_active, seo_title, seo_intro.

brands
- id, name, slug unique, logo_path, country_of_origin text, is_active.

products
- id, short_id, slug, name, category_id, brand_id null, seller_org_id → organisations (HagerLand Supply org at launch), sku text, model_number text, summary, description, specs jsonb (array of {label, value, unit}), unit text (controlled list from Section 1.5), pack_size text, min_order_qty numeric default 1, price_type, price_etb_cents bigint null, price_updated_at timestamptz, trade_price_etb_cents bigint null (P2 trade accounts), stock_status, lead_time_days int null, country_of_origin text, warranty text, is_special_buy bool default false (P2), special_was_price_etb_cents bigint null, special_qty_available int null, special_ends_at timestamptz null, delivery_available bool default true, status listing_status, is_featured, featured_until, search_tsv generated, pending_changes jsonb.
- Indexes: category_id, seller_org_id, status, GIN(search_tsv), trigram(name).

quote_requests (RFQ — basket or materials list)
- id, reference text unique (e.g. 'HLQ-2026-000123'), requester_user_id null (guests allowed), name, phone, email, company_name, delivery_location_id, delivery_address, needed_by date, notes, materials_file_path text null, status quote_status default 'submitted', assigned_to text, quoted_total_etb_cents bigint null, quote_document_path text null, quoted_at, source text ('basket','materials_list','product_page'), utm jsonb.
quote_request_items
- id, quote_request_id, product_id null, free_text_item text null (for items not in catalogue), quantity numeric, unit text, notes.

enquiries (unified leads to listers/orgs/HagerLand)
- id, reference text unique ('HLE-…'), target_type text ('property','development','organisation','product','hagerland_development','general'), target_id uuid null, recipient_org_id null, recipient_user_id null, sender_user_id null, name, phone, email, message (≤ 2000), preferred_contact, intent text (viewing, more_info, price, register_interest, quote, other), status enquiry_status default 'new', recipient_notes text, source_url text, utm jsonb, ip_hash text, user_agent text, created_at.
- Email notification sent to recipient (org members / lister / HagerLand team for own developments and HagerLand Supply).

contact_reveals (analytics + anti-scraping)
- id, target_type, target_id, channel ('phone','whatsapp','telegram','email'), viewer_user_id null, ip_hash, created_at. Rate limit reveals per IP (e.g. 30/hour).

claims (business claim requests)
- id, org_id, user_id, claimant_name, claimant_phone, claimant_email, relationship, evidence_paths text[], status ('pending','approved','rejected'), admin_notes, decided_at.

verification_requests
- id, org_id, submitted_by, documents (paths: trade licence, TIN certificate, contractor licence, agent licence), status, admin_notes (admin-only), decided_at.

admin_notes (admin-only notes on any entity; no public/user RLS read)
- id, entity_type, entity_id, note, created_at.

saved_items (P2) — user_id, entity_type, entity_id, created_at, PK(user_id, entity_type, entity_id).
saved_searches (P2) — id, user_id, vertical, params jsonb, alert_frequency ('instant','daily','weekly','off'), last_sent_at.
reviews (P3) — id, org_id, user_id, rating 1–5, body, status (moderated), response.
promotions (commercial-ready) — id, entity_type, entity_id, kind ('featured','spotlight','top_of_search','homepage'), starts_at, ends_at, price_etb_cents, paid bool, notes. (Phase 1: admin creates free promotions; is_featured/featured_until on entities are kept in sync by trigger.)
ad_slots (P3) — id, placement, creative_path, link, starts_at, ends_at, active.
site_settings — key text PK, value jsonb (e.g. listing_expiry_days, usd_etb_rate (P2), min_results_for_index, homepage_featured_ids, contact_details, social_links, announcement_bar).
audit_log — id, actor ('admin' | user id), action, entity_type, entity_id, entity_label, diff jsonb, ip_hash, created_at.
import_log — KEEP existing table; add column entity_type text default 'organisation' and new rows use section = 'org_<kind>' to stay compatible with the existing (google_place_id, section) primary key.
rate_limits — KEEP existing table.

6.4 Seed data (migration 000X_seed.sql — AB reviews before running)
- Regions/chartered cities (verify current list with AB before inserting; Ethiopia restructured regions recently): Addis Ababa (chartered city), Dire Dawa (chartered city), Afar, Amhara, Benishangul-Gumuz, Central Ethiopia, Gambela, Harari, Oromia, Sidama, Somali, South Ethiopia, South West Ethiopia Peoples', Tigray.
- Addis Ababa sub-cities (11): Addis Ketema, Akaki Kality, Arada, Bole, Gulele, Kirkos, Kolfe Keranio, Lemi Kura, Lideta, Nifas Silk-Lafto, Yeka.
- Key cities as level 'city' under their regions: Adama, Bishoftu, Sheger City (Oromia, around Addis), Hawassa (Sidama), Bahir Dar, Gondar, Dessie (Amhara), Mekelle (Tigray), Dire Dawa (city node), Harar (Harari), Jimma, Shashemene (Oromia), Arba Minch, Wolaita Sodo (South Ethiopia — verify region assignments with AB).
- Area-level neighbourhoods are added by AB in admin (do NOT guess sub-city parents). Provide AB this candidate list to map in admin: Bole Atlas, Bole Bulbula, Bole Medhanialem, CMC, Summit, Ayat, Gerji, Megenagna, Kazanchis, Piassa, Merkato, Sarbet, Old Airport, Mexico, Lebu, Jemo, Lafto, Kotebe, Hayat, Signal, 22 Mazoria, Gotera, Saris, Tor Hailoch, Kality, Goro, Lideta, Shola.
- Service categories (two levels):
  Design & consultancy: Architects; Structural engineers; Civil engineers; MEP engineers (mechanical, electrical, plumbing); Quantity surveyors; Land surveyors; Interior designers; Landscape architects; Project managers; Property valuers.
  Building & contracting: General contractors; Building contractors; Road & civil works contractors; Specialised contractors; Design & build firms; Renovation & remodelling; Demolition & site clearance; Excavation & earthworks.
  Trades: Masons & bricklayers; Concrete & formwork; Steel fixers; Carpenters & joiners; Electricians; Plumbers; Painters & decorators; Tilers; Plasterers; Roofers; Welders & metal fabrication (gates, grills); Aluminium & glass; Gypsum & ceilings; Flooring installers; Waterproofing.
  Systems & installation: Solar installers; Generator supply & service; Water tanks & pumps; Borehole drilling; HVAC & ventilation; CCTV & security systems; Lifts & elevators; Fire safety.
  Property services: Estate agents & brokers; Property management; Cleaning; Movers & removals; Pest control; Landscaping & gardening; Security guarding; Property lawyers; Mortgage & finance advice (P2 visible).
  Equipment & logistics: Plant & equipment hire; Scaffolding; Materials transport; Skip & waste removal.
- Product categories (two levels):
  Building materials: Cement & concrete; Steel & rebar; Blocks & bricks; Sand & aggregates; Timber & boards; Gypsum & plaster; Waterproofing.
  Roofing: Corrugated sheets; Roof tiles; Gutters & downpipes; Insulation.
  Plumbing: Pipes & fittings (PPR, PVC, GI); Valves & taps; Water tanks; Pumps; Drainage; Water heaters.
  Electrical: Cable & wire; Switches & sockets; Breakers & distribution boards; Conduit & trunking; Lighting; Earthing.
  Bathroom & sanitaryware: Toilets; Basins; Showers; Mixers & taps; Bathroom accessories.
  Kitchen: Sinks; Kitchen taps; Worktops; Cabinet hardware.
  Tiles & flooring: Ceramic & porcelain tiles; Floor tiles; Wall tiles; Laminate & vinyl; Tile adhesive & grout.
  Doors, windows & ironmongery: Doors; Windows & frames; Locks; Handles; Hinges; Door closers.
  Paint & decorating: Interior paint; Exterior paint; Primers; Brushes & rollers; Wallpaper.
  Fixings & fasteners: Screws; Nails; Bolts & nuts; Anchors & plugs; Brackets.
  Tools: Power tools; Hand tools; Measuring & levelling; Blades & bits; Tool storage.
  Adhesives & sealants: Silicone; Construction adhesive; Foam; Tapes.
  Safety & workwear: Helmets; Gloves; Boots; Hi-vis; Eye & ear protection; Fall protection.
  Solar & power: Solar panels; Inverters; Batteries; Generators; Stabilisers & UPS.
- Organisations: one row "HagerLand Supply" (kind hagerland, is_hagerland true, verification verified, status published) and one row "HagerLand Developments" (kind hagerland). Their contact details come from site_settings (AB to supply).
- site_settings defaults: listing_expiry_days=60, min_results_for_index=3, private_owner_max_active_listings=3.

6.5 Row Level Security policies (write these exactly; test each in WP-2)
- Public reads go ONLY through public views and SECURITY DEFINER search functions — never the base tables. Create views properties_public, developments_public, products_public, organisations_public, portfolio_public, media_public. Each view: owned by postgres (so it deliberately bypasses RLS), contains its own WHERE filter (status='published'; properties also expires_at > now(); media status='approved' AND parent entity published), and selects only safe columns (NO contact_phone/whatsapp/telegram/email, NO pending_changes, NO tin/licence numbers, NO internal fields). GRANT SELECT on the views to anon, authenticated. Add a comment on each view explaining why it bypasses RLS.
- Base tables: NO policies for anon (anon gets nothing). REVOKE ALL on base tables FROM anon. Reference tables (locations, service_categories, product_categories, brands) get an anon SELECT policy where is_active = true.
- Contact details are returned only by the server-side /api/contact-reveal endpoint (service role, rate-limited, logged).
- Owners: authenticated users can SELECT/INSERT/UPDATE their own properties (lister_user_id = auth.uid() OR is member of lister_org_id); same for org-owned developments/products/portfolio via organisation_members. DELETE not allowed (use status 'archived').
- organisations: members can SELECT their org (all columns) and UPDATE non-privileged columns; INSERT allowed for authenticated (creates as status 'pending_review', verification 'listed' forced by trigger; creator added as owner by trigger or server action).
- enquiries: INSERT only via server (service role) after Turnstile + rate limit; recipients (org members / recipient_user_id) SELECT and UPDATE status/recipient_notes; sender SELECTs own.
- quote_requests/items: INSERT via server; requester SELECTs own; HagerLand admin via service role.
- claims/verification_requests: authenticated INSERT own; SELECT own; admin via service role.
- saved_items/saved_searches: owner-only all operations.
- audit_log, admin_notes, site_settings (write), promotions (write), import_log, rate_limits, contact_reveals: no anon/authenticated access (service role only). site_settings: public SELECT only for a whitelist of keys via view site_settings_public.
- Storage buckets: 'public-media' (public read; uploads only via signed upload URLs issued by server after authorisation; path pattern {entity_type}/{entity_id}/{uuid}.{ext}) and 'private-docs' (no public read; verification documents, materials lists, quote PDFs; server-generated signed download URLs, 10-minute expiry, admin or owner only).

6.6 Backend modules (lib/)
- lib/env.ts — zod-validated env at startup (fail fast with clear message). Server vs public separation.
- lib/site.ts — SITE_URL ('https://www.hagerland.com' in production; VERCEL_URL-based for previews; localhost in dev), helpers absoluteUrl().
- lib/brand.ts — names, tagline, descriptor, division names, contact details fallback, social links, legal entity line.
- lib/supabase/server.ts (createServerClient from @supabase/ssr with cookies), lib/supabase/browser.ts, lib/supabase/admin.ts (service role; import 'server-only'), lib/supabase/middleware.ts (session refresh).
- lib/auth.ts — getUser(), requireUser(), getCurrentOrgs(), requireOrgRole(orgId, roles).
- lib/admin-auth.ts (kept) + lib/admin-session-edge.ts (Web Crypto HMAC verify for middleware).
- lib/validation/*.ts — zod schemas per entity (shared by forms and server actions).
- lib/slug.ts — slugify (ASCII transliteration; strip Ethiopic for slug but keep in title), shortId().
- lib/format.ts — formatETB, formatArea, formatDate, relativeTime, phone formatting (E.164 + display).
- lib/rate-limit.ts — generalised: rateLimit(key, limit, windowSeconds).
- lib/security.ts — escapeHtml, hashIp (SHA-256 with secret salt), sanitizeText.
- lib/email/ — Resend client, base layout (HagerLand branded, table-based, mobile-safe, plain-text alternative), templates: welcome/verify, listing submitted, listing approved, listing rejected (with reason), listing expiring (7 days), listing expired, new enquiry (to recipient), enquiry confirmation (to sender), quote received (to requester + internal), claim submitted/approved/rejected, verification approved/rejected, admin daily digest, register-interest confirmation. All escape user input.
- lib/storage.ts — signed upload URL issuing with checks (entity ownership, file type, size, count limits), server-side image processing pipeline: after upload, a server action fetches the object, validates magic bytes, re-encodes with sharp to WebP (max 2400px long edge, quality 80) + a 640px thumbnail, strips EXIF (privacy: GPS), writes media row with width/height.
- lib/search.ts — calls Postgres search functions (6.7).
- lib/seo.ts — buildMetadata(), JSON-LD builders (Organization, WebSite+SearchAction, RealEstateListing/Offer, Residence/Apartment/House, Product+Offer, LocalBusiness/HomeAndConstructionBusiness/GeneralContractor, BreadcrumbList, FAQPage).
- lib/analytics.ts — track(event, props) wrapper around @vercel/analytics track().
- lib/revalidate.ts — tag helpers: tag('property', id), tag('listings:property'), etc.

6.7 Postgres functions (in migrations). Search functions are SECURITY DEFINER with SET search_path = public, read only published rows and return only the same safe columns as the public views; GRANT EXECUTE to anon, authenticated. All other functions SECURITY INVOKER unless stated.
- search_properties(q text, purpose, types property_type[], location_id uuid (includes descendants), price_min, price_max, beds_min, baths_min, area_min, area_max, finishing finishing_status[], furnishing furnishing[], features text[], completion completion_status[], has_title_deed bool, lister_type text, sort text ('relevance','newest','price_asc','price_desc','area_desc'), page int, page_size int) returns table + total_count. Uses websearch_to_tsquery('simple', unaccent(q)) and trigram fallback. Only published & not expired.
- search_products(q, category_id (with descendants), brand_ids, price_min, price_max, stock_statuses, seller_org_id, sort, page, page_size).
- search_organisations(q, kinds org_kind[], service_id (with descendants), location_id (with descendants, matches location_id OR areas_served overlap), verified_only bool, sort, page, page_size).
- search_developments(q, location_id, completion, price_min, price_max, is_hagerland, page, page_size).
- search_all(q, limit_per_vertical) → unified grouped results for /search and typeahead.
- increment_view(entity_type, id) — SECURITY DEFINER, increments views_count (called from server with simple per-session dedupe).
- next_reference(prefix) — sequence-based human references (HLE-2026-000001, HLQ-2026-000001).
- Triggers: set_updated_at, protect_privileged_columns, set_expires_at_on_publish, sync_featured_from_promotions, create_profile_on_signup, add_owner_on_org_insert, tsvector generated columns (no trigger needed).

6.8 Workflows (state machines)
Property listing
- draft → (owner submits) pending_review → (admin approves) published [published_at=now, expires_at=now+60d] | (admin rejects with reason) rejected → (owner edits & resubmits) pending_review.
- published → owner edits: changes stored in pending_changes; listing stays live; admin approves to apply (auto-apply if lister org is verified AND change set excludes price drop >50% / location change — those always re-review).
- published → paused (owner) → published (owner, no re-review if no changes).
- published → expired (cron at expires_at) → owner renews (one click: published, expires_at = now+60d) — renewal allowed within 30 days after expiry, else must resubmit.
- any → archived (owner) ; any → removed (admin, with reason; hidden everywhere).
- Emails at each transition (Section 6.6).
Organisation
- Self-signup: created pending_review + verification listed → admin approves → published (badge "Listed") → owner submits verification documents → admin verifies → verified (badge "Verified", gold tick).
- Imported (admin): created published with verification listed + source import; "Is this your business? Claim it" CTA → claim (account required; evidence upload optional; email/phone check) → admin approves → user becomes org owner, verification claimed.
Product (HagerLand Supply at launch, admin-created) — draft → published; supplier self-serve products P2 follow the property moderation flow.
Enquiry — created new → recipient marks contacted/qualified/won/lost/spam. If a recipient hasn't viewed an enquiry within 48h, include it in the admin digest (service quality monitoring).
Quote request — submitted → in_review (admin) → quoted (admin uploads quote PDF or enters total; email sent) → accepted/declined (customer replies or admin marks) → expired after 14 days.
Register interest (HagerLand Developments) — an enquiry with intent register_interest, target hagerland_development; confirmation email; appears in admin "HagerLand sales" view.

======================================================================
SECTION 7 — ACCOUNTS, AUTHENTICATION AND DASHBOARDS
======================================================================

7.1 Auth
- Supabase Auth via @supabase/ssr (cookie-based sessions; middleware refreshes session).
- Methods at launch: email + password, email magic link, Google OAuth (AB configures Google provider — Section 23). Phone OTP is P2 (needs SMS provider cost decision).
- Email confirmation required before listing/publishing anything. Password rules: min 10 chars. Rate limit sign-in attempts (Supabase built-in + our limiter on server actions).
- Auth emails sent via Supabase custom SMTP using Resend with hagerland.com sender (configure in Supabase dashboard — AB task) and HagerLand-branded templates (provide HTML for AB to paste into Supabase Auth email templates: confirm signup, magic link, reset password, change email).
- Guests can browse, search, enquire, and request quotes without an account (lower friction); account required to list, claim, save, or manage.

7.2 Account types and registration journeys
- /signup step 1: "What brings you to HagerLand?" cards: (a) Looking for property or materials (personal), (b) Selling or letting my own property (personal), (c) I'm an estate agent / broker, (d) I'm a developer, (e) I'm a contractor, tradesperson or professional, (f) I'm a supplier, merchant or manufacturer.
- Step 2: name, email, phone, password (or Google). Step 3: confirm email.
- /onboarding (after confirmation): personal → done (go to /account). Business types → create organisation: name, kind (pre-selected), services (for professionals/contractors), primary location, areas served, phone/WhatsApp/Telegram, short description, logo (optional) → submitted for review. If a similar organisation already exists (trigram name match + same city), offer "Is this you? Claim it" instead of creating a duplicate.
- A user can belong to multiple organisations (switcher in AccountShell).

7.3 Dashboards (/account) — content adapts to capabilities
Common: Overview (status cards, tasks: "verify your email", "add a logo", "submit documents to get Verified", "3 listings expire this week"), Enquiries inbox, Settings.
Personal lister: My listings (table/cards with status pill, views, enquiries, expires in N days, actions: edit, pause, renew, archive), Create listing wizard, Quotes I requested, Saved (P2), Alerts (P2).
Agency: as personal lister but listings belong to the org; team members (P2 invite by email); company profile editor; verification.
Developer: Developments (create/edit development; add units as property listings linked to development), listings, company profile, verification.
Professional/contractor: Company profile editor (services, areas served, licence info), Portfolio projects (create/edit with images), enquiries, verification.
Supplier: Company profile, enquiries; Products (P2 self-serve; at launch suppliers appear in the Suppliers directory with profile + enquiry only).
All dashboards: mobile-friendly, clear empty states with the next action.

7.4 Listing creation wizard (property) — /account/listings/new
Steps with progress bar, autosave to draft on each step:
1. Basics: purpose (sale/rent), property type, title (helper text + examples), description (min 80 chars; tips).
2. Location: region → city → sub-city → area (Combobox; lister can request a new area, which goes to admin), address line (not shown publicly unless show_exact_location), optional map pin using a Leaflet picker loaded only on this step, with a tile provider that permits commercial use (AB confirms provider — Section 23 item 9). If no provider is confirmed by WP-6, ship without the pin (lat/lng stay null).
3. Details: price (or price on request), negotiable, rent: advance months, service charge; bedrooms, bathrooms, area m², plot area, floors (G+X), floor number, finishing, furnishing, tenure, title deed, completion status, parking, features (checkbox grid).
4. Photos: drag-drop up to 25, reorder, choose cover, floorplans; min 3 photos to submit (enforced); video URL (YouTube) optional.
5. Contact: use profile/org contacts or override; preferred method.
6. Review & submit: preview card + full preview; declarations: "I am the owner or authorised to list this property", "Information is accurate"; submit → pending_review.
Private owners limited to N active listings (site_settings).

======================================================================
SECTION 8 — PROPERTY MARKETPLACE
======================================================================

8.1 Property hub /property
- Hero: compact search (Buy / Rent toggle, location Combobox, property type, price max, Search).
- Popular locations grid (top areas with live counts; show only areas with ≥1 listing).
- Latest for sale (8 cards), latest to rent (8 cards), new developments (4), property types quick links, "Find an agent" strip, "List your property" CTA, short guide teasers (P2).

8.2 Results pages (/property/for-sale, /property/to-rent, and location landings)
- Layout: desktop — filters sidebar (left, 280px) + results (list of PropertyCardHorizontal or grid toggle) + sort; mobile — sticky top bar with "Filters (n)" button opening bottom sheet, sort select, results as PropertyCards.
- Filters: location (with descendants), property type (multi), price min/max (ETB, preset steps), bedrooms min (Studio/1+/2+/3+/4+/5+), bathrooms min, area min/max, finishing, furnishing (rent), completion status, title deed available, features, lister type (owner/agent/developer), added within (24h/3d/7d/14d/30d), include negotiable.
- Sort: Most relevant (default when q present), Newest, Price low→high, Price high→low, Largest.
- Featured listings: at most 2 labelled "Featured" cards at the top of page 1 when they match filters (never more; always labelled).
- Results header: "{count} properties for sale in {location}" + active chips + clear all. "Save this search" arrives in P2 — do not show any "coming soon" placeholder before then.
- Pagination: 24 per page, numbered with prev/next, rel=next/prev not needed; canonical rules in Section 16.
- Empty state: "No properties match these filters yet" + buttons to widen search (remove last filter, nearby areas) + "Tell us what you're looking for" (enquiry to HagerLand — captures demand).

8.3 Property detail /property/[slug]
Top to bottom:
1. Breadcrumbs.
2. Gallery (cover + grid of 4 on desktop; swipe carousel on mobile with count; fullscreen lightbox; floorplan tab; video tab if present).
3. Title block: price (+ /month, Negotiable tag), title, location line (area, sub-city, city), badges (For sale / To rent, New, Featured, HagerLand Development, Verified agent), quick facts row (beds, baths, m², type).
4. Sticky ContactPanel (desktop right column; mobile bottom bar): lister name/logo + badge, Call / WhatsApp / Telegram (revealed on click via /api/contact-reveal), "Send enquiry" (opens EnquiryForm with intent options: Book a viewing / Ask a question / Make an offer), "Report this listing".
5. Key facts grid (all detail fields; hide empty ones).
6. Description (expand/collapse after 8 lines).
7. Features (icon list).
8. Location (text; Google Maps Embed iframe if lat/lng — approximate circle if not exact; loaded on click "Show map" to save data).
9. Part of a development (if linked): card + link.
10. Listing info: reference (short_id), added date, updated date, views (only if ≥ 50), "Listing expires" not shown publicly.
11. Safety tips box (always): "Never pay a deposit before viewing and verifying ownership documents. Ask to see the title deed (carta) and lease documents." Link to /help#safety.
12. Similar properties (same purpose, type, location area; 4–8 cards).
13. Professionals for this property (land: architects, contractors; sale: agents, movers, interior designers; rent: movers, cleaning) — 3 company cards + link.
14. JSON-LD: RealEstateListing with offers (price, priceCurrency ETB), address (addressCountry 'ET'), and BreadcrumbList.
- Unavailable listings: expired → HTTP 200 with noindex, a clear "This property is no longer available" panel and similar listings (so a renewal can restore it); removed, rejected or never published → 404.

8.4 Agents directory /agents and developers directory /developers
- Search by name + location filter; cards; sort by verified first then listings count. Profile at /company/[slug] with tabs: Overview · Properties for sale · To rent · Developments · Contact.

8.5 Nationwide coverage strategy (built into the product)
- Location hierarchy + SEO landings (Section 16) let coverage grow city by city.
- "Developments & buildings database": admin and imports can create development/building pages (kind building/compound/condominium_site) even with no active listings — these are the "page for as many properties as possible" vision. Pages show: name, location, kind, developer (if known), year, floors, description, photos, map, and "Listings in this building" (if any) + "Own or rent here? List your property" CTA + "Register for alerts" (P2).
- Admin bulk creation tool (Section 18) to create building/development records quickly (CSV upload with validation preview).

======================================================================
SECTION 9 — DEVELOPMENTS AND HAGERLAND DEVELOPMENTS
======================================================================

9.1 /developments
- Grid of DevelopmentCards with filters: location, completion status (off-plan / under construction / ready), price from, developer, kind. HagerLand projects included but labelled; a separate "From HagerLand" row at top if any exist (labelled, not mixed into organic order).

9.2 Development detail /developments/[slug] (third-party)
Hero image/gallery, name, developer (link + badge), location, completion status + expected completion, price range, floors, units, unit types table, payment plan, amenities, finishing, description, brochure download (if uploaded), video, map, listings within the development, enquiry/register interest panel (routes to developer org), developer track record (other developments by this developer), safety note for off-plan purchases ("Check the developer's licence and the project's permits; never pay without a contract").

9.3 HagerLand Developments /our-developments
Purpose: sell HagerLand's own homes and tell the integrated supply-and-build story. Must look complete even with zero or one project.
Page structure:
1. Hero: "HagerLand Developments" (gold accent) / headline "Homes we build ourselves." / sub "We source our own materials through HagerLand Supply and manage every build directly — so we can build well, and price fairly." / CTAs: [View our projects] [Register your interest].
2. Projects: current and upcoming projects (cards with status). If none published: a designed panel "Our first project is in preparation. Register your interest to hear first about location, plans and prices." with RegisterInterestForm inline (fields: name, phone, email, budget band, preferred area, timeframe, message). NO fake renders or invented projects.
3. How we build (4 steps): Land → Design → Materials (HagerLand Supply) → Build & handover. Plain, factual copy (Section 15).
4. Why buy from HagerLand: Transparent pricing; Quality materials we source ourselves; Clear documentation (title & lease handled properly); Direct relationship — no middlemen. (Only claims AB confirms — Section 23.)
5. FAQs (accordion; FAQPage JSON-LD): payment, documents, diaspora buyers, visits, timelines.
6. Register interest CTA band.
Project detail /our-developments/[slug]: premium template — large hero, project facts, unit types & prices or "Price on request", plans/floorplans, specification ("Built with": materials list sourced via HagerLand Supply), construction progress timeline with dated updates (P2: progress posts), location, payment plan, documentation, register interest/book a visit form → HagerLand sales inbox.

======================================================================
SECTION 10 — CONSTRUCTION SUPPLIES MARKETPLACE
======================================================================

10.1 Launch model (decided)
- Quote-based commerce. No online checkout or payments at launch. Customers browse the catalogue, add items to a Quote List, or upload a materials list/BoQ; HagerLand Supply replies with a priced quote (target within 1 business day — confirm SLA with AB), then payment and delivery are arranged offline (bank transfer/Telebirr/cash on delivery as AB operates).
- Catalogue at launch = products HagerLand Supply can genuinely source (admin-created). Third-party suppliers appear in the Suppliers directory (profiles + enquiries). Supplier self-serve product listings = P2 (marketplace). Online payment = P3.

10.2 Supplies hub /supplies
1. Hero: "Construction materials, quoted fast." / sub "Tell us what you need — from a box of screws to a full bill of quantities. We'll come back with a clear price and delivery." / CTAs: [Send your materials list] [Browse categories]. Trust line: "Delivery across Addis Ababa" (only if true — Section 23).
2. Category grid (14 top categories with icons/images and subcategory links).
3. How it works (3 steps): Send your list → Get a clear quote → Delivered to site.
4. Featured products / popular items (only if products exist).
5. For contractors: "Trade accounts coming soon" is NOT allowed; instead "Buying for a project? Talk to our trade team" → enquiry.
6. Find suppliers strip → /suppliers.
7. Become a supplier CTA.

10.3 Category & subcategory pages
- Header with category name, short intro (from seo_intro), subcategory chips.
- Filters: subcategory, brand, price range (when priced), stock status, unit; sort: Popular (featured then name), Price, Newest.
- Product grid (2 cols mobile, 3–4 desktop). "Can't find it? Add it to your quote as a custom item" inline CTA after 12 products and in empty state.

10.4 Product detail /supplies/product/[slug]
Image gallery (white background, zoom), name, brand, SKU/model, key specs bullets, price block (price + unit, or "Price on request", "Price updated {date}"; for volatile categories show "Prices change often — confirm on quote"), stock status, lead time, min order qty, QuantityStepper with unit, [Add to quote] (primary) + [Ask a question] (secondary), "Sold by HagerLand Supply" badge, delivery note, full description, specs table, documents (datasheets), related products, "Need it installed?" professionals module, JSON-LD Product + Offer (price only when fixed; availability mapping).

10.5 Quote List /supplies/quote
- Stored client-side (localStorage key hl_quote_v1, wrapped in try/catch) for guests and synced to the account when signed in (P2 sync; launch: localStorage only).
- Line items: product, unit, qty (editable), notes; add custom item (free text + qty + unit).
- Submit form: name, phone (required), email, company (optional), delivery location (Combobox) + address, needed by date, notes, optional file attachment, Turnstile → creates quote_request + items → confirmation page with reference HLQ-… and what happens next; emails to customer and internal team.

10.6 Materials list upload /supplies/materials-list
- Upload PDF/image/Excel/Word (max 15 MB, up to 5 files) to private-docs, or paste/type the list; same contact fields; creates quote_request source materials_list.

10.7 Suppliers directory /suppliers
- Organisations with kind supplier/manufacturer (and HagerLand Supply first-party, labelled). Filters: product categories supplied (via org_product_categories), location/areas served, verified. Profile at /company/[slug] with tabs Overview · Products (P2) · Contact.

10.8 Built for growth (data model already supports)
Third-party product listings (seller_org_id), trade prices, special buys (surplus/clearance with "when it's gone, it's gone" quantities and end dates), brands, stock, lead times, delivery zones (P2 delivery_zones table: location_id, fee, min order, lead time), orders & payments (P3: orders, order_items, payments with Chapa/Telebirr integration).

======================================================================
SECTION 11 — COMPANIES AND PROFESSIONAL SERVICES
======================================================================

11.1 /professionals hub
- Hero: "Hire trusted construction professionals." / sub "Architects, engineers, contractors and tradespeople across Ethiopia — with real portfolios and verified credentials." / search: service Combobox + location + [Find].
- Service category groups (Section 6.4) as tiles; popular services; "How hiring works" (Search → Compare portfolios → Enquire directly); featured verified professionals (only if exist); "Join as a professional" CTA.

11.2 /professionals/[service] (+ location landings)
- Filters: location (matches base location or areas served), verified only, has portfolio, licence grade (contractors), sort: Verified first, Most projects, Newest.
- CompanyCards in list.

11.3 Company profile /company/[slug] (unified for every org kind)
Header: cover (optional), logo/initials, name, kind label, VerificationBadge, location, areas served summary, years established, contact buttons (reveal), [Send enquiry].
Tabs/sections (shown only when they have content): Overview (description, services, licence category/grade, team size, opening hours), Portfolio (project grid → lightbox/detail), Properties (agents/developers), Developments (developers), Products (suppliers, P2), Areas served, Contact. "Is this your business? Claim it" banner when verification_level='listed' and no members. "Report this profile" link. JSON-LD LocalBusiness subtype (GeneralContractor, HomeAndConstructionBusiness, RealEstateAgent, Store) with address ET.

11.4 Claim flow /company/[slug]/claim
Requires sign-in (redirect back after login). Form: relationship (owner/manager/employee), phone, email, optional evidence upload (trade licence photo), message → claims row (pending) → admin approves → user added as owner, verification 'claimed', email sent. Prevent duplicate pending claims per user/org.

11.5 Verification (/account/company/verification)
Upload: trade licence, TIN certificate, and for contractors the licence certificate (category/grade), for agents their broker/agent licence if applicable. Admin reviews → verified (gold tick) with verified_at; documents stay in private-docs. Badge tooltip: "Verified: HagerLand checked this business's trade licence on {date}."

======================================================================
SECTION 12 — ENQUIRIES, QUOTES AND LEADS
======================================================================

- Single EnquiryForm component used everywhere, configured by target. Fields: name (req), phone (req, PhoneInput), email (optional unless no phone), message (prefilled per context), intent, preferred contact; Turnstile; honeypot; consent text: "By sending, you agree to share your details with the {recipient} and accept our Terms and Privacy Policy."
- Server action: validate (zod) → rate-limit (per IP hash: 10/hour; per phone: 20/day) → Turnstile → insert enquiry (service role) → increment counters → email recipient(s) (all org members with role owner/admin, or lister user; HagerLand inbox for own entities) with reply-to = sender email (if present) and a "View in dashboard" link → confirmation email to sender (if email) → track('enquiry_submitted').
- Contact reveal: /api/contact-reveal POST {target_type, target_id, channel} → rate-limit → return the specific contact value + log contact_reveals → client renders tel:/wa.me/t.me links. WhatsApp link format https://wa.me/{digits}?text={encoded prefilled message incl. listing URL}. Telegram: https://t.me/{username} if username stored, else hide.
- Recipient inbox (/account/enquiries): list with status pills, filters, detail view with sender details, original listing link, status changer, private notes.
- Admin: all enquiries, quotes, register-interest leads, with filters and CSV export (Section 18).
- Lead attribution: store source_url and UTM params (read from URL on landing, persisted in sessionStorage hl_utm, sent with forms).

======================================================================
SECTION 13 — SEARCH AND DISCOVERY
======================================================================

- Unified SearchBar on homepage with tabs: Buy · Rent · Supplies · Professionals (and "Everything" via /search). Each tab adjusts fields: Buy/Rent → location + type + max price; Supplies → product keyword; Professionals → service + location.
- Header search icon opens a command-palette style overlay (mobile full-screen) with typeahead from /api/search/suggest (search_all with limit 4 per vertical): grouped results (Properties, Developments, Products, Companies, Locations, Categories/Services) + "See all results for 'q'". Recent searches stored in localStorage (try/catch).
- /search page: query + vertical tabs with counts; each tab shows the vertical's results using its search function; filters link out to the vertical results page with q carried over.
- Relevance: tsvector weights — title/name A, category/type/location names B, description C. Boost verified organisations slightly in ranking for companies (documented, fair). Never boost is_hagerland in organic ranking.
- Locations Combobox searches the locations table (name, name_am, path) with trigram.
- Analytics: track searches (q length only, vertical, result count — never store full q tied to user) and zero-result queries (aggregate table search_misses: q normalised, vertical, count, last_seen) to guide content and stock decisions.

======================================================================
SECTION 14 — HOMEPAGE (TOP TO BOTTOM)
======================================================================

Data: Server Component, revalidate 300, plus on-demand revalidateTag('home') when featured items change.

1. Announcement bar (optional, from site_settings.announcement_bar; hidden by default).
2. Header (Section 4.1).
3. HERO (ink background #152238 with subtle blueprint grid pattern; or full-bleed photo with dark gradient overlay once AB supplies licensed photography):
   - Eyebrow: "Ethiopia's construction and property platform"
   - H1: "From the first brick to the front door."
   - Sub: "Find homes and land, source construction materials, and hire trusted professionals across Ethiopia — all in one place."
   - Unified SearchBar card (white, elevated) with tabs Buy · Rent · Supplies · Professionals.
   - Below search, quick links: "Apartments in Bole" · "Land for sale" · "Request a materials quote" · "Find an architect" (only links that lead to non-empty pages; computed).
4. FOUR PILLARS (white): heading "Everything property and construction, in one place" — 4 large tiles (2×2 mobile → 4 across desktop), each with icon/photo, title, one line, and link:
   - Property — "Homes, land and commercial property for sale and to rent." → /property
   - Supplies — "Construction materials quoted fast and delivered to site." → /supplies
   - Professionals — "Architects, contractors and trades with real portfolios." → /professionals
   - HagerLand Developments (gold accent) — "Homes we build ourselves, with materials we source ourselves." → /our-developments
5. FEATURED / LATEST PROPERTIES (stone-50 background): tabs For sale | To rent; 8 PropertyCards (featured first, labelled; then newest); "View all properties". Hidden entirely if fewer than 4 published properties (then show a "List your property — be among the first" CTA panel instead).
6. SUPPLIES BAND (white): left: heading "Building something? Send us your materials list." + 3-step how it works + [Send your materials list] [Browse supplies]; right: 8 category tiles (icons). Always shown (does not depend on stock).
7. HAGERLAND DEVELOPMENTS FEATURE (ink background, gold accents): headline "Homes we build ourselves." + strategic story in two sentences + project card(s) if any, else register interest form; CTA.
8. PROFESSIONALS (stone-50): heading "Hire trusted professionals" + service chips (Architects, Contractors, Engineers, Electricians, Plumbers, Interior designers, Solar installers, Welders) + up to 4 verified company cards (hidden if none verified; show category chips only).
9. NEW DEVELOPMENTS (white): 4 DevelopmentCards (hidden if < 2).
10. POPULAR LOCATIONS (white): grid of top 8 areas by listing count with counts (hidden if total properties < 10).
11. TRUST STRIP (green-tint): 4 proof points from Section 3.3 with icons. No numeric stats unless real and meaningful (show "{n} verified businesses" only when n ≥ 25; configurable thresholds).
12. LIST WITH US (white): 4 audience cards with equal-width buttons: "Sell or let your property" → /signup?type=owner; "Agents & developers" → /list-with-us#agents; "Contractors & professionals" → /list-with-us#professionals; "Suppliers & manufacturers" → /list-with-us#suppliers. Line: "Listing is free while we launch." (only if AB confirms free listing at launch — Section 23).
13. GUIDES teaser (P2; hidden at launch).
14. Footer.
JSON-LD on homepage: Organization (name, url, logo, sameAs real socials) + WebSite with SearchAction (/search?q={search_term_string}).

======================================================================
SECTION 15 — CONTENT
======================================================================

15.1 Pages to delete — all legacy routes in Section 2.3.

15.2 Pages to write (final copy — implement as given; light edits allowed for fit)

/about
- H1: "Building the land."
- Intro: "HagerLand brings Ethiopia's property and construction market together in one trusted place. Find a home or a plot, source the materials to build, and hire the people to build it — with listings that are reviewed, current and honest."
- "Our name": "Hager (ሀገር) means homeland in Amharic. Land means the same in English. Together they say what we do: we help people buy, build and live on the land they call home."
- "What we do": four short paragraphs — Property marketplace; HagerLand Supply; Professionals & services; HagerLand Developments.
- "Why it works together": "Because we supply materials and build homes ourselves, we understand construction from the inside — prices, quality, timelines and the problems people face. That knowledge shapes every part of the platform."
- "Our standards": Every listing reviewed · Verified means checked · Stale listings removed · Our own projects always clearly labelled and never given hidden priority.
- CTA band: [Explore property] [Send a materials list].

/how-it-works — three audience tabs: Looking (search, compare, contact directly, view safely), Listing (create account, list, reviewed within 1 business day, manage enquiries, renew), Businesses (create profile, get verified, showcase portfolio, receive enquiries). Plus "Verification levels explained" (Listed / Claimed / Verified) and "Our marketplace rules" (integrity rule in plain words).

/list-with-us — sections with anchors #owners #agents #developers #professionals #suppliers; each: who it's for, what you get, how to start, CTA to /signup?type=…; FAQ.

/contact — contact options from site_settings (phone, WhatsApp, Telegram, email, office address/hours if provided), contact form (general enquiry → HagerLand inbox), quick links (Request a quote, Register interest, Report a listing).

/help — FAQs grouped (Buying & renting safely — include safety guidance: verify title deed/carta and lease documents, never pay before viewing, meet in safe places; Listing; Accounts; Supplies & quotes; Verification; Reporting problems). FAQPage JSON-LD.

/terms, /privacy, /cookies — rewrite completely for the new business: marketplace terms (listing rules, prohibited content, moderation rights, no guarantee of third-party listings, HagerLand's dual role disclosure, quote terms (quotes valid 14 days unless stated; prices in ETB), intellectual property, liability limits, governing law per AB), privacy (what we collect: account, listing, enquiry, quote, verification documents, contact reveals, analytics (cookieless); purposes; sharing with listers when you enquire; retention: enquiries 24 months, verification documents deleted 90 days after decision unless needed; rights; processors: Supabase, Vercel, Resend, Cloudflare, Google (maps embed)); cookies (essential auth cookies only + cookieless analytics). Mark at the top of each: "Last updated {date}". Add a visible notice in RELAUNCH_PROGRESS.md that AB must have these reviewed by a lawyer before launch (Section 23). Legal entity name/address from lib/brand.ts.

15.3 Email copy — concise, branded, every email includes: HagerLand header (logo text + descriptor), body, primary button, plain-text alternative, footer with contact link and "You're receiving this because…". Sender: "HagerLand <hello@hagerland.com>" (and "HagerLand Supply <supply@hagerland.com>" for quotes) once domain verified in Resend (Section 23); reply-to configured.

15.4 Microcopy standards — buttons are verbs ("Send enquiry", "Add to quote", "List your property"); errors say what to do ("Enter a phone number starting with +251 or 09"); empty states invite action.

15.5 Legacy-content sweep (WP-19) — grep the repo for: "diaspora", "Diaspora", "Where Ethiopia Does Business", "Made in Ethiopia", "BirrBank", "birrbank", "community directory", "Connect and Cooperate", "pillars", "Homeland", "ሃገር ·", "accountingbody", "hagerland-platform.vercel.app", "Free, always", "jobs", "tutors", "cars", "events", "housing", "money transfer", "addressCountry: 'GB'", "en_GB". Resolve every hit that is legacy (user-facing copy, metadata, emails, routes, config). Generic words like "events" will also match legitimate new code; ignore those. OpenGraph locale becomes 'en_US' (alternate 'am_ET' added in Phase 2).

======================================================================
SECTION 16 — SEO AND GEOGRAPHIC STRUCTURE
======================================================================

- Canonical host www.hagerland.com; all canonicals absolute via lib/site.ts.
- Metadata on every page via generateMetadata; titles ≤ 60 chars, descriptions 140–160 chars. Templates:
  - Results: "{Type plural or 'Property'} for sale in {Area}, {City} | HagerLand" e.g. "Apartments for sale in Bole, Addis Ababa | HagerLand"
  - Rent: "{Type} to rent in {Area}, {City} | HagerLand"
  - Property detail: "{beds}-bed {type} for {sale|rent} in {area}, {city} — ETB {price} | HagerLand"
  - Professionals: "{Service} in {Location} — verified professionals | HagerLand"
  - Product: "{Product name} — {Brand} | HagerLand Supply"
  - Company: "{Name} — {Kind label} in {City} | HagerLand"
- Path-based SEO facets at launch ONLY for purpose (for-sale/to-rent) + location path. Property type stays a query parameter (?type=apartment) to avoid thousands of thin combination pages; Phase 2 adds /property/for-sale/addis-ababa/bole/apartments style pages once inventory justifies them.
- Canonical rules: results pages with only path facets → self-canonical. Pages 2+ → self-canonical with "– Page N" in the title. Any other query parameter (filters, sort) → canonical to the path-only URL.
- Indexation threshold: location/service landing pages with fewer than site_settings.min_results_for_index (3) live results render with `robots: noindex, follow` and are excluded from sitemaps. They still render useful content (nearby areas, CTA).
- Each landing has a unique intro paragraph generated from data (count, price range, top types, sub-areas) — no thin boilerplate; optional admin-written seo_intro on locations (add column seo_intro_sale, seo_intro_rent, seo_intro_professionals to locations).
- Sitemaps: app/sitemap.ts using generateSitemaps() split by type: static, properties, developments, products, companies, locations-sale, locations-rent, professionals-locations, categories. app/robots.ts lists every sitemap URL, disallows /roodber8, /roodber8-login, /api/, /account, /onboarding, /auth, /search (search results noindex too), /supplies/quote, /dev/. Delete public/robots.txt.
- Structured data per Sections 8–14; validate with Google Rich Results test (manual AB check post-deploy).
- Open Graph images: dynamic OG images via next/og (app/**/opengraph-image.tsx) for property (cover photo + price + location + logo), development, company, product, and a branded default.
- Performance budgets (also SEO): LCP < 2.5s on 4G mid-range Android, CLS < 0.1, INP < 200ms; JS per route < 170 KB gzip on public pages.
- Internal linking: breadcrumbs everywhere; location pages link to child areas and sibling areas; detail pages link up to their location landing.
- Legacy URLs: handled in Section 20 (301 redirects); legacy entries disappear from the sitemap. After cutover AB resubmits the sitemap in Google Search Console (same domain, so no change-of-address is needed).
- Amharic (P2): /am locale with hreflang en/am, translated UI and SEO templates; listing content in the language the lister wrote, with optional Amharic title/description fields (add columns title_am, description_am in P2).

======================================================================
SECTION 17 — COMMERCIAL ARCHITECTURE
======================================================================

Launch position: listing is free for everyone (subject to AB confirmation); HagerLand earns from its own supply sales and own developments first. The product is built so the following can be switched on without restructuring:
- Featured / promoted listings: promotions table + is_featured/featured_until (admin-managed free at launch); placements: results top (max 2, labelled), homepage, category pages, "Spotlight" carousels.
- Professional/agent/supplier subscription plans: organisations.plan ('free' default) + P3 plans table (limits: active listings, featured credits, team seats, analytics), feature gates via lib/entitlements.ts reading plan (all plans = unlimited at launch except private owner cap).
- Lead generation fees: enquiries table is the lead ledger (count per org per month in admin reports).
- Commissions on HagerLand-brokered sales/rentals: enquiry status 'won' + P2 deals table (enquiry_id, value_etb, commission_etb, status).
- Construction product sales: quote_requests → P3 orders/payments; quotes already carry values for revenue reporting.
- Advertising: ad_slots (P3) with placements component <AdSlot placement="…" /> that renders nothing when no active ad (no empty "advertise here" boxes).
- Own developments: register-interest and enquiries routed to HagerLand sales view with pipeline statuses.
- Analytics for monetisation proof: per-entity views, contact reveals, enquiries shown in owner dashboards (builds the value case for paid plans later).

======================================================================
SECTION 18 — ADMIN SYSTEM (/roodber8)
======================================================================

18.1 Shell and access
- Keep /roodber8-login (username + password + TOTP) and session cookie hl_admin_session (httpOnly, secure, sameSite=lax, 8h). Add middleware guard for /roodber8/:path* and /api/admin/:path* using lib/admin-session-edge.ts (Web Crypto HMAC); keep per-page/per-action requireAdminSession() as defence in depth. Logout endpoint POST only.
- Admin UI rebuilt with Tailwind using the design tokens in a dark admin theme (ink/stone) — fast, dense tables, keyboard-friendly. AdminShell with sidebar (usePathname for active state) and top bar with global search (searches all entities by name/reference/short_id/phone/email).
- noindex on all admin pages; admin routes dynamic (no caching).

18.2 Sections
1. Dashboard: KPIs (pending reviews by type, new enquiries today/7d, open quotes, new signups, listings expiring soon, verification requests, claims), queues with direct links, recent audit activity.
2. Review queue (unified): tabs Properties · Developments · Organisations · Portfolio · Media · Pending changes · Claims · Verification. Each item: preview (as public card + key fields), diff view for pending_changes (old → new), actions: Approve, Reject (reason required; reason templates: incomplete info, poor photos, duplicate, suspected fraud, wrong category, prohibited content), Request changes (email with note), bulk approve.
3. Properties: table (search, filters: status, purpose, type, location, lister type, featured, expiring), detail/edit (all fields, media manager, status actions, feature toggle with end date, mark as HagerLand, internal notes, audit trail), create on behalf of a lister.
4. Developments: same pattern; bulk CSV import (columns: name, kind, city, sub_city, area, developer_name, completion_status, floors_label, total_units, price_from_etb, description) with validation preview and dedupe by name+location.
5. Organisations: table (kind, verification, status, source, claimed), detail/edit (all fields, members, services, product categories supplied, verification documents viewer via signed URLs, set verification level, feature, notes), merge duplicates tool (move members/listings/portfolio to target, archive source).
6. Products (HagerLand Supply catalogue): table + editor (all fields, specs builder, images, price + price_updated_at auto-set on price change, stock status, special-buy fields P2), CSV import/export (price updates in bulk: sku, price, stock_status) with preview.
7. Categories: product categories and service categories tree editors (add, rename, reorder, deactivate; slug lock after publish with redirect creation P2).
8. Locations: tree editor (regions → cities → sub-cities → areas), add/rename, Amharic names, SEO intros, active toggle, merge.
9. Enquiries: all enquiries with filters (target type, recipient, status, date), detail, CSV export; "unanswered > 48h" filter.
10. Quotes: pipeline board/table (submitted → in review → quoted → accepted/declined/expired), detail with items, attachments (signed URLs), enter quote total + upload quote PDF → sends quote email; notes; CSV export.
11. HagerLand Sales: register-interest leads + enquiries on own developments, statuses, export.
12. Users: list (search by email/phone/name), profile, organisations, listings, suspend/unsuspend (sets profiles.is_suspended + blocks posting via RLS/function check), trigger password reset email.
13. Promotions: create/edit featured placements with dates; list active/expired.
14. Imports: existing Places search/import/auto-import/history/bulk review, retargeted to create organisations with kind + services + location mapping; dedupe against import_log and organisations.google_place_id; imported orgs status published + verification 'listed' only after admin review of AI-drafted description (keep bulk review step).
15. Content & settings: site_settings editor (contact details, social links, thresholds, announcement bar, homepage featured picks), legal page "last updated" dates.
16. Reports: listings by status/type/location, enquiries per org, quotes value, search misses (zero-result queries), signups over time. Simple tables + CSV (no heavy chart library; if charts needed use lightweight inline SVG).
17. Audit log: every admin action (who: 'admin', what, entity, diff, time) — searchable.

18.3 Cron (/api/cron/daily at 06:00 UTC, Bearer CRON_SECRET)
- Expire listings past expires_at (status expired) + email owners.
- Email owners 7 days before expiry (once).
- Expire quotes older than 14 days in 'quoted'.
- Expire promotions; sync featured flags.
- Purge verification documents 90 days after decision; purge rate_limits rows older than 7 days; purge contact_reveals older than 12 months.
- Admin digest email (to admin email from env ADMIN_DIGEST_EMAIL): pending counts, new enquiries/quotes, unanswered enquiries > 48h, signups, expiring listings, errors summary. Send nothing if nothing to report.
- vercel.json: only this cron. Remove all old crons.

======================================================================
SECTION 19 — SECURITY, PERFORMANCE, ACCESSIBILITY, ANALYTICS, OPERATIONS
======================================================================

19.1 Security
- RLS on every table (Section 6.5). Base tables not readable by anon; public views expose safe columns only.
- Service-role key used only in server-only modules. Verify it never appears in client bundles (grep .next/static after build for "service_role" and the key prefix).
- Middleware: Supabase session refresh; admin guard; security headers on all responses:
  Content-Security-Policy (default-src 'self'; img-src 'self' data: blob: https://*.supabase.co https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com https://*.tile.openstreetmap.org (only if Leaflet used); script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com (tighten with nonces if feasible); frame-src https://challenges.cloudflare.com https://www.google.com https://www.youtube-nocookie.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'), Strict-Transport-Security (max-age=63072000; includeSubDomains; preload), X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera=(), microphone=(), geolocation=(self)), X-Frame-Options DENY.
- Inputs: zod everywhere; lengths capped; URLs validated (http/https only); YouTube URLs restricted to youtube.com/youtu.be and rendered via youtube-nocookie embed.
- Uploads: server-issued signed upload URLs; allowed types (images: jpeg, png, webp, heic→converted; docs: pdf, jpg, png, xlsx, docx for materials lists only); size limits (images 12 MB, docs 15 MB); magic-byte check; sharp re-encode for images (EXIF stripped); count limits per entity; private documents never in public bucket.
- Anti-abuse: Turnstile on signup, enquiry, quote, materials list, claim, contact form, report; honeypot; rate limits (Section 12); contact reveal limits; private owner listing cap; duplicate listing detection (same lister + similar title + same location + price within 5% → flag in admin queue).
- Auth: Supabase handles password hashing; enforce email confirmation; suspended users blocked from writes (RLS helper function is_active_user()).
- Admin: rotate ADMIN_PASSWORD and ADMIN_SESSION_SECRET at cutover (AB task); TOTP secret retained.
- Cron and webhook endpoints require Bearer CRON_SECRET; compare timing-safe.
- Report listing/profile flow: reports table (id, entity_type, entity_id, reason enum: fraud, wrong_info, duplicate, offensive, already_sold, other, details, reporter contact optional, status) → admin queue.
- Dependency audit: npm audit; fix high/critical.
- Secrets: .env.example updated with every variable (no real values); env validated by lib/env.ts.

19.2 Performance
- Remove global no-store headers. Public pages use ISR: homepage 300s, hubs 300s, results pages dynamic by searchParams but cache data fetches with tags (revalidate 120s), detail pages revalidate 600s + on-demand revalidateTag on any change by owner/admin.
- next/image everywhere; Supabase image transformation if on Pro plan (else pre-generated WebP sizes from the upload pipeline — implement the pipeline regardless).
- Fonts: next/font with display swap, subset latin + ethiopic for Noto only where used.
- No client-side data fetching for initial content; client components minimal; dynamic import for gallery lightbox, map picker, file uploader.
- Database: indexes listed in Section 6; EXPLAIN key search functions with representative data; page sizes fixed.
- Vercel Analytics + Speed Insights mounted in root layout (cookieless).

19.3 Accessibility — WCAG 2.2 AA (Section 5.4); run axe (via @axe-core/playwright) on key pages in e2e tests: zero serious/critical violations.

19.4 Error handling & monitoring
- app/error.tsx, app/global-error.tsx, app/not-found.tsx redesigned with brand and helpful links.
- Server actions return typed results ({ ok: true, data } | { ok: false, error, fieldErrors }) — never throw raw errors to the UI.
- Structured server logging helper (lib/log.ts) with route label, no PII (hash IPs, mask phones/emails).
- Recommend Sentry (free tier) for error monitoring — Section 23 (optional); if not approved, rely on Vercel logs + admin digest error counts (store errors in an errors table with throttling).

19.5 Analytics events (lib/analytics.ts → Vercel Analytics custom events)
search_performed (vertical, has_results), filter_applied (vertical), listing_viewed (type), contact_revealed (channel, target_type), enquiry_submitted (target_type, intent), quote_submitted (source, items_count), materials_list_uploaded, register_interest_submitted, signup_started (type), signup_completed (type), listing_created, listing_submitted, org_created, claim_submitted, verification_submitted. No PII in events.

19.6 Testing
- Add Playwright (in the Codespace install the browser once with: npx playwright install --with-deps chromium). Tests in e2e/: smoke (all public routes return 200, no console errors), home search flows, property results filters + detail, enquiry submit (Cloudflare Turnstile test keys), quote list submit, signup → onboarding (run against the preview deployment with Turnstile test keys; skip auth tests automatically if their env vars are not set), admin pages redirect when not signed in, legacy URL redirects, axe accessibility checks.
- Unit tests (vitest) for lib/format, lib/slug, validation schemas, rate limiter logic.
- npm scripts: typecheck, lint, test, test:e2e, build.

19.7 Operations
- CLAUDE.md at repo root: stack, conventions (Section 0.6), design rules, data model summary, route map, gotchas (Places API New + pageToken in body; cookies() auth on admin GET routes; no-store removed; never interpolate into PostgREST filters; SQL via migrations handed to AB), commands.
- README.md rewritten (what HagerLand is now, setup, env, scripts, deploy, migrations process).
- .env.example complete.
- docs/: spec, progress, docs/RUNBOOK.md (how to: approve listings, issue a quote, verify a business, add a location, run a migration, restore from backup, rotate secrets, what to do if the site is down).

======================================================================
SECTION 20 — LEGACY REMOVAL, MIGRATION AND CUTOVER
======================================================================

20.1 Code removal happens on the relaunch branch in WP-1 (Section 2.3 list), so the branch builds cleanly from a lean base. The live main branch is unaffected until merge.

20.2 Legacy URL handling (implemented in WP-1 via next.config.mjs redirects)
- 301 permanent redirects:
  Old /property/{uuid} detail URLs: the new /property/[slug] route treats any slug without a valid short_id suffix as legacy and issues a 301 to /property/for-sale (old /property/post, /property/manage, /property/edit-link → /list-with-us).
  /housing, /housing/:path* → /property
  /business, /business/:path* → /professionals
  /delivery, /delivery/:path* → /professionals
  /made-in-ethiopia, /made-in-ethiopia/:path* → /supplies
  /diaspora → /
  /money, /money/:path*, /birrbank, /birrbank/:path* → /
  /jobs, /cars, /tutors, /community, /events (and :path*) → /
  /edit-link → /login ; /how-it-works stays (new content) ; /about, /contact, /privacy, /terms stay (new content).
- Decision note: section roots 301 to the closest new section; detail pages under removed sections also 301 to that section root (simplest, preserves any link equity; Google will treat irrelevant ones as soft-404 and drop them, which is acceptable).

20.3 Data: legacy tables are NOT migrated into the new model (different business). Exception — none. (Old directory records are diaspora businesses abroad, not construction entities.) At cutover, migration 00XX_legacy_lockdown.sql: drop the public SELECT policies on legacy tables (so anon can read nothing), keep the data. Provide AB a verification query proving anon reads return zero rows.

20.4 Cutover (WP-20) sequence
1. Final full regression on preview (WP-19 checklist all green) and AB sign-off [STOP-GATE].
2. AB: Supabase backup (manual), confirm all migrations applied, Resend domain hagerland.com verified, Vercel env vars set for Production (list in WP-20), Supabase Auth URL configuration updated (Site URL https://www.hagerland.com; redirect URLs for production and previews), Google OAuth redirect URIs, Turnstile domain includes hagerland.com, CRON_SECRET set, ADMIN secrets rotated, Vercel plan suitable for commercial use (Section 23).
3. Merge relaunch/construction → main via PR (squash not required; keep history). Vercel deploys production.
4. Run legacy lockdown migration (AB).
5. Post-deploy checks (WP-20 list): homepage, search, all hubs, a property detail, quote submit, enquiry submit, signup/login, admin login, robots.txt, sitemap index, 3 legacy redirects, security headers (securityheaders.com), Lighthouse mobile ≥ 90 performance/accessibility/best-practices/SEO on homepage and a property page.
6. AB submits new sitemaps in Google Search Console; removes the old sitemap entry if separate.
7. Monitor logs and admin digest for 72 hours; fix issues as hotfix PRs.
8. Rollback plan: revert the merge commit on main (or redeploy previous production deployment in Vercel with one click). Legacy lockdown migration has a documented reverse script (re-create old policies) — write it alongside.

======================================================================
SECTION 21 — PHASING AND WORK PACKAGES (EXECUTE IN THIS ORDER)
======================================================================

PHASE 1 — LAUNCH-CRITICAL

WP-0 Safety & setup [STOP-GATE at end]
- Save spec + create progress file (Section 0.1). Tag main pre-construction-relaunch, create branch relaunch/construction, push.
- Ask AB to take a Supabase backup: Dashboard → Database → Backups (or Project Settings → Database → download a backup if on Free plan via pg_dump instructions you provide step by step).
- Give AB a SQL query that lists all existing tables, columns, RLS status, policies, functions, triggers, storage buckets (information_schema + pg_policies + pg_proc + storage.buckets) and ask him to paste the results back. Save them to docs/legacy-schema-snapshot.md. Confirm no new table names collide.
- Write CLAUDE.md (initial).
- Stop: explain the plan for WP-1 to AB.

WP-1 Strip legacy & fix foundations
- Delete everything in Section 2.3. Remove unused deps; add: @supabase/ssr, zod, server-only, sharp, vitest (dev), @playwright/test (dev), @axe-core/playwright (dev).
- Remove Google Translate, global no-store headers, property-discovery and other old crons (vercel.json emptied until WP-18).
- Add redirects (Section 20.2). Until WP-12 the branch may carry a bare temporary homepage; it must never reach production (main is only updated at WP-20).
- Add lib/env.ts, lib/site.ts, lib/brand.ts, lib/security.ts, lib/log.ts. Replace all hard-coded base URLs.
- Build green. Commit.

WP-2 Database foundation [STOP-GATE: AB runs migrations]
- Write migrations: 0001_extensions_enums.sql, 0002_core_tables.sql (all Phase-1 tables + indexes + triggers), 0003_rls_policies.sql, 0004_public_views.sql, 0005_search_functions.sql, 0006_storage_buckets_policies.sql, 0007_seed_reference_data.sql (locations, categories, HagerLand orgs, site_settings) — seed values shown to AB for confirmation first (regions especially).
- For each: plain explanation + verification queries. Include an RLS test script (SQL using `set local role anon;` and `set local request.jwt.claims` to simulate users) proving: anon can read only published rows via views; anon cannot read base tables or contact columns; owner can edit own draft; owner cannot set status published or is_featured; non-member cannot edit others' rows.
- Generate TypeScript types: give AB the command (npx supabase gen types typescript --project-id … > lib/database.types.ts) or, if CLI unavailable, write types by hand from the migrations (prefer generated).

WP-3 Design system & layout [STOP-GATE: AB signs off /dev/styleguide on preview]
- Tokens (Section 5.2), fonts, globals.css, components/ui primitives, SiteHeader with mega-menu + mobile drawer, SiteFooter, Container/Section, EmptyState, Skeletons, Breadcrumbs, Toast. Styleguide page.
- Restyle error, global-error and not-found pages.

WP-4 Auth & accounts
- @supabase/ssr clients, middleware (session refresh + admin guard + security headers), /login, /signup (type step), /auth/callback, reset/update password, /onboarding, AccountShell, /account overview, /account/settings (incl. delete account request → admin), organisation creation + duplicate detection, organisation switcher.
- Supabase Auth email templates HTML handed to AB.

WP-5 Media pipeline
- Buckets usage, signed upload route, FileDrop component with progress, server processing (sharp → WebP + thumb, EXIF strip), media rows, reorder/cover/delete, limits, private docs with signed downloads.

WP-6 Property marketplace
- Validation schemas, listing wizard (Section 7.4), My listings dashboard, property hub, results pages with filters/sort/pagination (search_properties RPC), location landings, detail page (all sections in 8.3), contact reveal API, report listing, similar listings, JSON-LD, OG image, revalidation tags, expiry fields.

WP-7 Companies, professionals, suppliers, agents, developers
- /professionals hub, service pages + location landings, /suppliers, /agents, /developers, /company/[slug] profile, company editor in account (services, areas served, product categories supplied, licence info), portfolio projects CRUD, claim flow, verification request flow.

WP-8 Developments & HagerLand Developments
- /developments, /developments/[slug], account developer tools (create development, link unit listings), /our-developments + project detail, register interest flow, HagerLand sales routing.

WP-9 Supplies
- /supplies hub, category/subcategory pages, product detail, Quote List (localStorage), quote submission, materials-list upload, confirmation pages + emails, /account/quotes (for signed-in requesters).

WP-10 Enquiries & leads
- EnquiryForm + server action, recipient routing & emails, /account/enquiries inbox, UTM capture, rate limits, Turnstile.

WP-11 Unified search
- search_all RPC, /api/search/suggest, header search overlay, /search page with vertical tabs, search_misses logging.

WP-12 Homepage [STOP-GATE: AB signs off on preview, phone + desktop]
- Exactly per Section 14, with all conditional-visibility rules.

WP-13 Content pages & emails
- /about, /how-it-works, /list-with-us, /contact (+ form), /help, /terms, /privacy, /cookies (Section 15), all email templates (lib/email), Auth email templates.

WP-14 Admin rebuild
- AdminShell + all sections in 18.2 (1–17), retargeted import pipeline, CSV import/export tools, audit logging on every admin action.

WP-15 SEO
- generateMetadata everywhere, canonical rules, noindex thresholds, sitemaps split + robots.ts, JSON-LD validation pass, OG images.

WP-16 Analytics, monitoring, cron
- Vercel Analytics + Speed Insights, analytics events, errors table/logging, /api/cron/daily with all jobs, vercel.json cron.

WP-17 Security hardening
- Headers/CSP verification, RLS re-test, upload abuse tests, rate-limit tests, service key bundle grep, npm audit, admin secret rotation instructions.

WP-18 Performance & accessibility
- Lighthouse mobile runs on key templates; fix to targets (Section 16 budgets); axe checks; image audit; bundle analysis (next build output review; remove heavy imports).

WP-19 QA, legacy sweep, final checklist [STOP-GATE]
- Run full test suite; manual responsive pass at all breakpoints for every template (record findings); legacy-content sweep (Section 15.5); broken-link check (crawl the preview with a small script); content proofread; verify every item in Section 22. Produce docs/LAUNCH_REPORT.md: what's done, evidence (test output, Lighthouse scores), known limitations, AB's pre-launch tasks.

WP-20 Cutover (Section 20.4) [STOP-GATE before merge]

PHASE 2 — SHORTLY AFTER LAUNCH (build only after launch; same rhythm)
- Amharic locale (/am) with professional translation, hreflang, Amharic listing fields.
- Saved items, saved searches & email alerts (daily/weekly digests), quote list synced to account.
- Map-based property search (Leaflet/MapLibre with a licensed tile provider), "draw area" P3.
- Supplier self-serve product listings with moderation (third-party marketplace), supplier product pages, org_product_categories filters.
- Special Buys (surplus/clearance) section with quantities and end dates.
- Trade accounts (contractor pricing tiers, account managers, repeat orders).
- Approximate USD prices for diaspora (admin-set rate, labelled "approx.").
- Guides & content hub (/guides) — buying process in Ethiopia, documents checklist, building costs, choosing a contractor; FAQ schema.
- Build-cost estimator ("How much to build a G+1?") using HagerLand Supply price data → leads to Supply quotes, professionals and HagerLand Developments.
- Team members for organisations (invites), agent branches.
- Phone OTP login (SMS provider), WhatsApp notifications for enquiries.
- Path-based property type SEO pages where inventory justifies; developer progress updates on own projects.
- Deals/commission tracking in admin.

PHASE 3 — LONGER TERM
- Online payments (Chapa / Telebirr / cards) and orders, invoices, delivery scheduling & logistics, delivery zones and fees.
- Paid plans & billing for agents/professionals/suppliers; paid featured placements; advertising slots.
- Reviews & ratings (verified-enquiry-based) with moderation and responses.
- Mortgage/finance partner integrations; equipment hire marketplace.
- Market data: price index by area, sold/let history (where lawful and available).
- Staff roles & permissions in admin (multiple admin users via Supabase Auth with role claims), audit per user.
- PWA/mobile app, partner API, regional expansion beyond Addis Ababa at scale, splitting divisions into separate businesses/brands when scale justifies (e.g. property vertical could later move to RealGojo).

======================================================================
SECTION 22 — ACCEPTANCE CRITERIA AND FINAL LAUNCH CHECKLIST
======================================================================
Verify each item and record evidence in docs/LAUNCH_REPORT.md.

Production-ready
[ ] lint, typecheck, unit tests, e2e tests, build: all pass on the final commit.
[ ] No console errors on any public page; no 500s in Vercel logs during a full crawl.
[ ] All env vars documented and validated; production env configured.
[ ] Error, 404 and global-error pages branded and helpful.
[ ] Runbook written; backup taken; rollback documented.

Mobile-responsive
[ ] Every template checked at 360/390/768/1024/1440 px; no horizontal scroll; tap targets ≥ 44px; filters bottom sheet works; detail bottom action bar works; forms usable with on-screen keyboard.

Commercially usable
[ ] A visitor can: search property, view a listing, reveal contact, send an enquiry; browse supplies, build a quote list, submit a quote; upload a materials list; find a professional and enquire; register interest in HagerLand Developments.
[ ] A lister can: sign up, create organisation, create/submit a listing with photos, get approved, receive and manage enquiries, renew a listing.
[ ] Admin can: approve/reject everything, manage catalogue and prices, issue a quote, verify a business, manage locations/categories, feature items, export leads.
[ ] Emails deliver from @hagerland.com with correct branding and links.

Consistent with the new brand
[ ] Tagline/descriptor/voice applied; colours/typography from tokens only; logo + ® consistent; HagerLand Developments gold treatment; integrity labels on own items.

Free from obsolete legacy content
[ ] Legacy sweep (Section 15.5) returns zero relevant hits; legacy routes redirect; no legacy nav/footer links; legacy tables private.

Technically stable
[ ] Server actions return typed results; no unhandled promise rejections; rate limiters active; cron runs successfully (manual trigger test).

SEO-ready
[ ] Unique titles/descriptions; canonicals correct; noindex thresholds working; sitemaps valid and listed in robots; JSON-LD validates (Rich Results test on property, product, company, homepage); OG images render.

Scalable
[ ] Unified entity model; search via indexed Postgres functions; pagination everywhere; ISR + tag revalidation; image pipeline produces sized WebP; location and category trees admin-managed.

Secure
[ ] RLS test script passes; anon cannot read base tables, contact columns, legacy tables, private docs; service key absent from client bundle; security headers present (A grade target on securityheaders.com); uploads validated; Turnstile on all public forms; admin guarded by middleware + per-action checks; secrets rotated.

Ready for real users
[ ] Legal pages reviewed by AB's lawyer; contact details real; HagerLand Supply and Developments org details real; at least the agreed launch content seeded (Section 23: launch content plan) so key pages are not empty; empty states honest and designed.

======================================================================
SECTION 23 — NEEDS AB (ASK, DO NOT INVENT) AND COSTS
======================================================================

Decisions/inputs AB must provide (ask at the relevant work package; record answers in RELAUNCH_PROGRESS.md):
1. Tagline confirmation: "Build. Buy. Live." (or alternative).
2. Free listing at launch for all audiences? (Spec assumes yes; private owners capped at 3 active listings.)
3. Legal entity that operates hagerland.com (name, registration number, address, governing law) for terms/privacy/footer; lawyer review of legal pages before launch.
4. Real contact details: phone, WhatsApp, Telegram, email addresses, office/showroom address and hours (if any); HagerLand Supply delivery coverage (e.g. Addis Ababa only?) and quote response time commitment.
5. Brand photography (licensed) of Ethiopian properties/construction/products; HagerLand Developments first project details (or confirm "in preparation" state).
6. Which "Why buy from HagerLand" claims are true today (Section 9.3 item 4).
7. Region/city seed list confirmation (Section 6.4) and the neighbourhood → sub-city mapping.
8. Launch content plan: initial HagerLand Supply catalogue (which categories/products to list at launch, with prices or price-on-request), initial organisations to import (which services/cities), initial developments/buildings to add, any real property listings ready.
9. Map provider for the listing location picker (Leaflet with a commercial-use-permitted tile provider, e.g. MapTiler/Stadia free tier) — or no pin at launch.
10. Google OAuth (Google Cloud OAuth client) — yes/no at launch.
11. Sentry error monitoring (free tier) — yes/no.
12. Social media account URLs (only real ones are shown).

Costs to confirm (quality first, cost stated up front — verify current prices on each provider's site):
- Vercel: Hobby plan is for non-commercial use only; a trading business needs Vercel Pro (about US$20 per member per month).
- Supabase Pro (about US$25/month): daily backups, no project pausing, image transformations, more storage — strongly recommended for a commercial launch.
- Resend Pro (about US$20/month) if the free plan's single verified domain is already used by accountingbody.com — needed to send from @hagerland.com.
- Google Maps Embed API: free (requires an API key restricted to hagerland.com). Places API (New) for imports: pay-as-you-go with monthly free credit — existing usage continues.
- Cloudflare Turnstile: free. Vercel Analytics: free tier on Pro is generous.
- Optional: Sentry free tier; map tiles free tiers; professional Amharic translation (Phase 2).

======================================================================
SECTION 24 — ECOSYSTEM EXPANSION (Phase 1.5, authorised by AB, 13 Oct 2026)
======================================================================

Source: docs/BRIEF_PHASE_1_5_AND_GO_LIVE.md (saved verbatim below). docs/PLATFORM_VISION.md is AB's full vision; where it conflicts with Sections 0–23, PLATFORM_VISION.md wins, with these amendments. All hard rules of the brief apply (no writes to the live database except as Section 25.6 allows; no legacy table changes; migrations 0001–0010 unchanged; new schema in additive migrations 0011+).

AUTONOMOUS MODE CONTINUES — authorised by AB. Phase 1 is accepted. Now complete PHASE 1.5: ECOSYSTEM EXPANSION, on relaunch/construction, without asking AB questions. Decide sensibly where needed and record every decision in docs/LAUNCH_REPORT.md. Stop only when everything below is complete.

SOURCE OF TRUTH: docs/PLATFORM_VISION.md (AB's full vision, read it all) + docs/HAGERLAND_RELAUNCH_SPEC.md. Where they conflict, PLATFORM_VISION.md wins, with the amendments below. Save these amendments as a new section "Section 24 — Ecosystem Expansion" at the end of the spec, and add every new work package (E1–E10) to docs/RELAUNCH_PROGRESS.md.

ALL HARD RULES FROM THE PREVIOUS INSTRUCTION STILL APPLY, unchanged: never push/merge to main, force-push or rewrite history; never write to the LIVE Supabase project (read-only checks only); never touch legacy tables or data; never change Vercel/Supabase/Resend/Cloudflare/GitHub/DNS settings; never commit secrets or .env files; never send real emails to real people; never alter migrations 0001–0010 (0010 is approved for AB to run). New schema = new additive migrations 0011+, tested on LOCAL Supabase, documented in supabase/README.md with check queries, RLS tests extended. Same quality bar per work package: verify after every write; lint, typecheck, build green; unit + Playwright tests added and green; commit, push branch, update progress.

24.1 Positioning. Master line: "One platform for property, construction and everything around it." Support line: "Find it. Buy it. Finance it. Build it. Supply it. Insure it. Maintain it. Sell it. Rent it." Audience line: "For Ethiopians in Ethiopia and around the world." Put these in lib/brand.ts and use them in the homepage hero, metadata and footer. Keep all existing integrity rules (HagerLand's own offers always labelled, never silently boosted).

24.2 Vertical registry (the core architecture change). New table `verticals` (key, name, slug, status: live | coming_soon | hidden, sort, short description, intro, icon, seo fields, interest_enabled, partner_signup_enabled). Ten verticals: property, building-supplies, professionals, contractors, repairs-maintenance, finance, insurance, diaspora, jobs, our-developments. Navigation, homepage tiles, mobile drawer, footer, sitemap, search and the admin all read from this registry. Admin can switch any vertical's status in one click, with an audit log entry. A coming_soon vertical shows a full, designed landing page: what the service will be, who it is for, how it will work, a working "Register your interest" form (stored and listed in admin with CSV export; confirmation email), and where relevant a "Become a partner" form. Coming-soon pages are clearly labelled "Coming soon" and never show fake listings, prices, providers or claims; they are noindex until live. This amends spec rule 0.6: "Coming soon" is allowed ONLY through the registry, with working interest capture.
Default statuses: property, building-supplies, professionals, contractors, repairs-maintenance = live; diaspora = live (with property management as "Request a consultation", see 24.6); finance, insurance, jobs, our-developments = coming_soon.

24.3 Navigation. Desktop header: Property ▾ · Building Supplies ▾ · Professionals & Contractors ▾ · Repairs & Maintenance · Diaspora Services ▾ · More ▾ (Finance, Insurance, Jobs & Recruitment, Our Developments) · [search] · Sign in · [List with us ▾] (Sell/let a property, List your business, Become a supplier, Join as a professional, Post a job). Coming-soon items show a small "Soon" badge. The mobile drawer lists all ten verticals plus Request a service, Request a quote, Help & advice, My account. The homepage gets an "Everything around your property" ecosystem section showing all ten verticals as tiles with live/soon status, and a short journey strip: find land → finance → design → build → supply → insure → maintain → sell or rent.

24.4 International foundation. Ethiopia stays the core market and its URLs do not change. Add a country dimension: locations gain country_code (default 'ET'); add country root locations for diaspora markets (United Kingdom, United States, Canada, United Arab Emirates, Sweden, Germany, Norway, Netherlands, Saudi Arabia, Israel, South Africa, Kenya), each with key cities (e.g. London, Birmingham, Manchester; Washington DC, Seattle, Minneapolis, Dallas, Atlanta, Los Angeles; Toronto, Calgary; Dubai, Abu Dhabi; Stockholm; Frankfurt; Oslo; Amsterdam; Riyadh, Jeddah; Tel Aviv; Johannesburg; Nairobi). Admin can add more. Records that can be outside Ethiopia (organisations, service requests, jobs, interest registrations) gain country_code and currency (ETB, GBP, USD, EUR, CAD, AED, SEK, NOK, SAR, ILS, ZAR, KES); display money in the record's currency. Property listings stay Ethiopia-only in this phase. Organisations can be marked as serving the Ethiopian community abroad (e.g. a London plumber), searchable by country and city.

24.5 Service request engine (generalises the quote flow). New tables: service_requests (reference HLS-YYYY-NNNNNN, vertical, service_category_id, title, details, structured answers jsonb, urgency: emergency | within_week | flexible, budget band, location_id, country_code, currency, preferred contact, requester contact details, attachments in private-docs, status: submitted → triaged → matched → quoted → won/lost/cancelled, source, utm), service_request_matches (request, organisation, status: offered → accepted/declined → quoted, quote amount, currency, message, quote document), plus commercial fields (lead_fee, commission_rate, commission_amount, invoiced flag) for admin only. Customer flow: "Request a service" from any relevant page, category-specific questions (driven by a JSON question schema per service category, editable in admin), contact details, Turnstile, confirmation email. Admin: triage queue, match up to 3 providers (suggested by category + location + verification), notify providers by email. Provider dashboard: offered requests, accept/decline, submit quote. Customer: sees received quotes in their account (or by secure emailed link if a guest). Use this engine for contractors, repairs & maintenance (with emergency urgency), valuations, finance enquiries, insurance quotes, diaspora services and staffing requests. Keep the existing materials quote_requests as they are.

24.6 Diaspora Services (live). Landing page for Ethiopians abroad with two directions. (a) Diaspora → Ethiopia: buy property, build a house, renovate family property, find contractors and professionals, buy materials, construction supervision, verification and due diligence, investment, all linking into existing verticals or the service request engine. (b) Services abroad: find Ethiopian-owned or Ethiopian-serving trades and professionals in your country and city (the international organisation search from 24.4), with request-a-service routing. Flagship: "HagerLand Property Care: property management for owners abroad". A premium page explaining the service: management, maintenance, security and monitoring, inspections with photo reports, tenant finding and management, rent collection, maintenance coordination, representation in property matters, and managed sale. The promise: peace of mind, transparency, accountability, and no more relying on friends and relatives. CTA "Request a consultation" collects owner details, country and time zone, property location and type, current occupancy, and the services wanted. It goes to a HagerLand Property Care pipeline in admin. Show no prices unless set in admin. Build the data model for the later owner portal (managed_properties, inspections with photos and notes, rent statements, maintenance log), with admin able to create these; the owner-facing portal is Phase 2 and must stay hidden until enabled.

24.7 Estate Agency Services. HagerLand acting as agent: pages for Sell with HagerLand, Let with HagerLand, Buyer representation, Property sourcing for diaspora buyers, and Developer sales. Each with a clear enquiry form, plus "Request a valuation" (service request type). Listings marketed by HagerLand use the existing lister_type 'hagerland' with a clear "Marketed by HagerLand" label. Add property-page actions: Save, Compare (up to 4 properties, side-by-side comparison page), Request a valuation, and "Ask about financing" (finance interest when finance is coming_soon; a finance service request when live). Saved properties and comparison require an account (compare works for guests via localStorage).

24.8 Finance and Insurance (coming_soon, partner-ready). Landing pages listing the categories from the vision (mortgages, construction and development finance, diaspora mortgages, home-improvement finance, supplier credit; home, building, landlord, construction, contractor, contents, professional indemnity and public liability insurance), clearly stating they will be "provided through approved, licensed partners". Register interest (by category) and Become a partner forms (banks, lenders, insurers, brokers). No rates, quotes, advice or eligibility statements. When switched live, requests flow through the service request engine to partner organisations (new org kinds: lender, insurer, broker).

24.9 Jobs & Recruitment (built fully, defaults to coming_soon). Jobs table (employer org, title, category, employment type, location/country, salary range + currency optional, description, requirements, closing date, status with moderation, expiry). Employer dashboard: post and manage jobs, view applications. Public job board with filters. Apply with CV upload (private-docs; PDF/DOCX only; size limits) and cover note. Candidate profile (opt-in, private by default: skills, trades, qualifications, experience, availability, CV). "Submit a staffing requirement" (service request type) for employers wanting recruitment help. Admin moderation and applications overview. Privacy: CVs never public; candidates control visibility; retention rules added to the privacy policy. While coming_soon: landing page plus two interest forms (employers / candidates).

24.10 Our Developments (coming_soon). Replace the current HagerLand Developments hub content with a designed "Coming soon" page: HagerLand intends to develop carefully selected residential and, potentially, commercial projects. Explain the supply-and-build advantage. Register your interest form. Make no claims of current activity. Keep the existing development/project templates and data model intact so projects appear automatically when published and the vertical is switched live.

24.11 Content and legal updates. Update the homepage, about, how-it-works, list-with-us, help/FAQs, footer and metadata for the ten-vertical ecosystem and the international audience. Update terms and privacy for service requests, provider matching and commissions, CVs and job applications, international users, and partner referrals (no regulated advice). Flag in LAUNCH_REPORT.md the regulatory checks AB must complete before switching on: estate agency, property management, recruitment, finance and insurance, in Ethiopia and in each country served.

24.12 Admin. Add: vertical registry switches; interest registrations (filter by vertical/category, CSV); partner applications; service request triage and matching board; provider quotes; commissions and lead-fee ledger with simple reports; HagerLand Property Care pipeline and managed-property records; jobs and applications moderation; question-schema editor per service category; countries and international locations in the locations editor. Every action is audit-logged.

WORK PACKAGES (in order): E1 registry + navigation + homepage ecosystem section; E2 international locations + currency; E3 service request engine (customer, admin, provider); E4 repairs & maintenance + contractors on the engine; E5 diaspora services + HagerLand Property Care; E6 estate agency services + save/compare/valuation/finance-ask; E7 finance + insurance coming-soon + partner forms; E8 jobs & recruitment (full, flagged coming_soon) + our-developments coming-soon; E9 content, legal, admin additions, SEO (sitemap respects registry; noindex for coming_soon), full QA pass (all previous checks re-run, accessibility, mobile widths, link crawl, Lighthouse on key pages); E10 Next.js upgrade to the current stable 15.x (and matching React) as a dedicated final step: upgrade, fix all breaking changes, re-run the ENTIRE test suite and build. If it cannot be made fully green, revert the upgrade cleanly and document exactly why. Then run npm audit and report.

WHEN COMPLETE: update docs/LAUNCH_REPORT.md: what was added (with evidence), the updated page-by-page review checklist (every new public page and admin screen with its path), the complete ordered to-do list for AB (all migrations 0010+ to run with checks, env vars, settings, regulatory checks, Section 23 items), and the vertical switch defaults. Then STOP and tell AB it is complete.

======================================================================
SECTION 25 — COMPLETENESS, HARDENING AND GO-LIVE (authorised by AB, 13 Oct 2026)
======================================================================

Note from AB (13 Oct 2026): Phase 1.5 had not been started when this was issued. "Work already in progress" means the E1–E10 work in this same brief. Order: 25.1 first, then E1–E10 with the 25.2 scope and 25.4 edge cases built in, then 25.5. After 25.5, wait for AB to type exactly "GO LIVE" before any cutover step.

ADDENDUM — SECTION 25: COMPLETENESS, HARDENING AND GO-LIVE. Authorised by AB. Append this as "Section 25" to docs/HAGERLAND_RELAUNCH_SPEC.md, add its work packages to docs/RELAUNCH_PROGRESS.md, and integrate it with the Phase 1.5 (E1–E10) work already in progress. Continue fully autonomously; do not ask AB questions. Every rule from previous instructions still applies, EXCEPT the two narrowly scoped permissions granted in 25.6 for the cutover only.

25.1 REQUIREMENTS TRACEABILITY MATRIX (do first, keep updated to the end)
Create docs/REQUIREMENTS_MATRIX.md listing EVERY requirement, one row each, from: spec Sections 1–24 (including every bullet in 4.3 route map, 5.3 components, 6.3 tables, 6.5 policies, 6.6 modules, 6.7 functions, 6.8 workflows, 7–18, 19, 22), docs/PLATFORM_VISION.md (every vertical, every listed capability, every listed category), and this Section 25. Columns: ID, requirement, source section, status (Done / Not done / Deferred-by-rule), implementing files, test or verification reference (test name, check query, or manual verification note with evidence). A row may be marked Done ONLY with a passing test or a recorded verification. Nothing may remain "Partly". "Deferred-by-rule" is allowed ONLY for the items in 25.3. At the end, the matrix must show zero "Not done".

25.2 ADDITIONAL SCOPE TO BUILD NOW (previously Phase 2), each fully, tested, and admin-controllable:
a) Saved properties/products/companies (account), saved searches with email alerts (instant/daily/weekly, unsubscribe link, cron), quote list synced to account when signed in.
b) Map search for properties and a location pin picker, with the tile provider configured via env/site settings. If no provider key is set, the map UI stays hidden (no broken map).
c) Supplier self-serve product listings with moderation (same review flow as properties), supplier product tab on company profile, org_product_categories filters.
d) Special Buys (surplus/clearance): quantities, was-price, end date, auto-hide when expired or sold out, admin-managed, /supplies/special-buys.
e) Trade accounts: trade application, admin approval, trade price display for approved trade accounts only, never exposed publicly.
f) Approximate prices in the visitor's chosen currency for diaspora visitors: admin-set exchange rates with "last updated" date, always labelled "approx.", ETB stays the price of record.
g) Guides/content hub (/guides) with an admin editor (draft/publish, SEO fields, FAQ schema). Create starter guides ONLY as unpublished drafts marked "Needs AB review" (no unverified legal or regulatory statements presented as fact).
h) Build-cost estimator (e.g. "How much to build a G+1?") driven by admin-entered rates per m² by finish level and location, with clear "estimate only" labelling. Hidden until AB enters rates.
i) Organisation team members (invite by email, roles, remove, ownership transfer, last-owner protection), agent/company branches.
j) Development progress updates (dated posts with photos) for developments, including HagerLand projects.
k) Deals/commission tracking in admin (linked to enquiries and service requests), monthly revenue and lead reports with CSV export.
l) Path-based property-type SEO pages (e.g. /property/for-sale/addis-ababa/bole/apartments), respecting the min-results noindex threshold.
m) Amharic language support: a full i18n architecture for UI text, an /am locale with hreflang, and an Ethiopic font. Machine-assisted Amharic UI translation is allowed but must be marked "needs native review" and the Amharic locale must be OFF by default behind an admin switch until AB approves it.
n) Health endpoint /api/health (public: ok/version only) and /api/health/full (requires CRON_SECRET as Bearer): reports, as true/false only (never values), whether every required env var is present, whether the database is reachable, whether Resend's sending domain is verified, whether storage buckets exist, and whether all migrations 0001–latest are applied (via a schema_migrations record or equivalent checks).

25.3 EXPLICITLY OUT OF SCOPE (need third-party contracts/accounts AB has not set up): online payments/checkout (Chapa, Telebirr, cards), SMS/phone OTP login, WhatsApp Business API notifications, live bank/insurer/mortgage partner APIs, native mobile apps. For each, build a clean integration point (interface + admin "not configured" state) where sensible, mark "Deferred-by-rule" in the matrix, and list it in LAUNCH_REPORT.md Phase 3.

25.4 EDGE CASES AND CROSS-CUTTING REQUIREMENTS — each needs a test or recorded verification in the matrix:
- Auth & accounts: unconfirmed email, expired/used magic and reset links, session expiry mid-form (input preserved), sign-out, account deletion request flow (data handling per privacy policy), "export my data" request, suspended users blocked from all writes, user in multiple organisations, org owner leaving (last-owner protection), duplicate signups, Google sign-in hidden unless configured.
- Listings & records: draft autosave, edit while pending changes exist, renewal windows, expired/paused/removed/rejected URL behaviour (200+noindex / 404 per spec), slug and short_id collision retry, private-owner cap, photo minimums and maximums, failed/oversized/HEIC/corrupt uploads, EXIF stripped, location renamed/merged/deactivated, price on request, negotiable, rent vs sale validation, duplicate-listing flag.
- Search & input: empty, very long, special characters (% _ , ( ) quotes), Ethiopic script, out-of-range pages, invalid filter values, invalid sort; zero-result logging.
- Forms: Turnstile failure, honeypot, rate-limit messages, double submit, server error with input preserved, email-send failure never blocks a submission (logged, visible to admin, retried by cron).
- Service requests & quotes: no matching provider (customer informed, admin alerted), all providers decline, quote expiry, guest secure-link expiry and re-send, emergency priority in admin and digest, international location and currency.
- Admin: every action permission-checked server-side and audit-logged, bulk actions with partial failures reported, CSV imports with validation preview and no partial writes, session expiry mid-action, concurrent edit protection (updated_at check).
- Email: every transactional email listed in the matrix, HTML + plain text, correct sender and reply-to, user content escaped, marketing emails only with consent and an unsubscribe link.
- Money, dates & language: currency formatting per currency (ETB no decimals for property), timestamps stored in UTC and shown in the user's time zone, Gregorian dates, Ethiopic names render correctly, slugs fall back safely for Ethiopic titles.
- Security: RLS + REVOKE-then-GRANT pattern on every new table/view, storage path ownership checks, signed URL expiry, CSP updated for every new third-party domain, no SSRF in any server-side URL fetching (import scraping limited to http/https, public IPs, timeouts, size caps), sanitised rendering of any rich text, redirect parameters whitelisted (no open redirects), no account/email enumeration, no PII in logs, client-bundle secret scan, npm audit with no high/critical left unaddressed.
- Privacy & legal: retention purges via cron (verification docs, CVs, contact reveals, rate limits, stale interest registrations), cookie policy accurate to what is actually set, consent records for marketing, privacy and terms cover UK GDPR and Ethiopian data protection, CVs, service matching, commissions and international users.
- Performance & accessibility: Lighthouse mobile ≥ 90 on homepage, a property page, a product page, a company page and a coming-soon page on the Vercel preview (measure there, not only locally); WCAG 2.2 AA with zero serious/critical axe issues on every public, account and admin page; indexes for all new query paths; no N+1 queries; ISR/tag revalidation on every admin change.
- SEO: sitemaps respect the vertical registry and thresholds, noindex for coming-soon and thin pages, canonicals, structured data per page type (incl. JobPosting only when jobs is live), OG images for all detail page types.
- Operations: daily cron covers listing/quote/job expiry, service-request reminders (unanswered matches > 48h), saved-search alerts, email retries, retention purges, featured sync, admin digest (now including interest registrations, service requests, Property Care leads, applications, partner applications).
- Legacy: every old URL redirects per Section 20; old API endpoints return 410; legacy lockdown migration and its reverse script ready.

25.5 GO-LIVE READINESS (end of build)
- Re-run everything: lint, typecheck, build, all unit tests, all Playwright tests (local + against the Vercel preview, read-only on preview), RLS tests (local), accessibility, link crawl, Lighthouse.
- Write scripts/preflight.sh that checks every verifiable go-live prerequisite against PRODUCTION once deployed: /api/health/full all true; Resend domain verified; DNS for hagerland.com resolves to Vercel; robots/sitemap reachable; security headers present.
- Update docs/LAUNCH_REPORT.md with the final matrix summary and AB's exact pre-go-live checklist (25.7). Then tell AB: "Ready. Complete your checklist and type GO LIVE." Wait for that exact phrase.

25.6 CUTOVER, run autonomously ONLY after AB types "GO LIVE". Two narrowly scoped permissions apply only during this procedure:
(i) You may apply migrations to the LIVE database using SUPABASE_DB_URL from .env.local (AB will add it), via psql, one migration at a time.
(ii) You may merge relaunch/construction into main and push main.
Procedure, stopping and rolling back on ANY failure:
1. Confirm AB's checklist items that can be verified (env vars via /api/health/full on the latest preview, Resend domain verified, SUPABASE_DB_URL present).
2. Take a fresh live backup with scripts/backup-supabase.sh (non-interactive mode using SUPABASE_DB_URL) and confirm the files exist.
3. Apply every migration 0010+ in order to live; after each, run its documented check query and compare with the expected result; stop on any mismatch.
4. Run the RLS test suite against live (it cleans up after itself); require 100% PASS.
5. Merge relaunch/construction into main with a merge commit (no squash, no force), push main, and wait for the Vercel production deployment to be Ready.
6. Run production smoke tests (Playwright against https://www.hagerland.com): every public route, every vertical page, coming-soon forms, search, property/product/company pages, admin login page renders and blocks unauthenticated access, legacy redirects, security headers, sitemap/robots, /api/health/full. Any write-path test must use records clearly prefixed "HL-SMOKE-TEST" and delete them afterwards via the service role.
7. Apply the legacy lockdown migration; re-verify the live site.
8. Run scripts/preflight.sh against production; all checks must pass.
ROLLBACK if step 6, 7 or 8 fails: revert the merge on main with git revert -m 1 (no force-push), push, wait for redeploy, confirm the old site is serving, run the lockdown REVERSE script if it was applied, and report exactly what failed. New tables are additive and can remain.
9. On success: update LAUNCH_REPORT.md (go-live time, commit hashes, test evidence), mark WP-20 Done, and tell AB in plain English what is live, what to check, and the post-launch steps (Google Search Console sitemap resubmission, first-week monitoring of the admin digest and error log).

25.7 AB'S PRE-GO-LIVE CHECKLIST (generate exact, step-by-step instructions for each in LAUNCH_REPORT.md, with exact values where they are not secrets):
Supabase Pro upgrade; SUPABASE_DB_URL added to .env.local; Vercel Production + Preview environment variables (full list); Supabase Auth Site URL and redirect URLs; Auth email templates; custom SMTP via Resend; Resend sending domain for hagerland.com with DNS records (SPF, DKIM, DMARC) and verification; Turnstile hostname includes www.hagerland.com; CRON_SECRET; rotated admin password and session secret; business details entered in admin → Settings (legal entity, contacts, socials, delivery area, response time); lawyer review of terms/privacy; UK ICO data-protection registration check; regulatory checks before switching any regulated vertical live (estate agency, property management, recruitment, finance, insurance).

======================================================================
SECTION 26 — PROPERTY ECOSYSTEM OPERATING MODEL (authorised by AB, 15 Oct 2026)
======================================================================

Source: docs/BRIEF_SECTION_26.md (saved verbatim below), with AB's update of 15 Oct 2026, which overrides the brief where they differ. Supporting material: docs/PROPERTY_ECOSYSTEM_MODEL.png (AB's ecosystem diagram) and docs/TRANSFORMATION_BLUEPRINT.md.

UPDATE FROM AB, 15 Oct 2026 (overrides the brief where it differs), verbatim:
HagerLand's regulatory approval covers ALL services: estate agency, property management (including collecting/holding rent for owners), recruitment and placement, and finance and insurance introductions. Therefore:
- Estate agency: live (Direct ON), as the brief says. Any earlier "coming soon" instruction for estate agency is cancelled.
- Manage Property: Direct ON and Aggregate ON. Remove the "AB to confirm" flag.
- Jobs: Direct ON (HagerLand recruitment and placement), Aggregate ON (job board), Interest ON. Remove the recruitment flag.
- Finance and Insurance: Interest ON now. Aggregate becomes switchable as soon as partner organisations are added (the stage gate still requires active partners, but regulatory clearance is already confirmed).
- In every stage-gate checklist, pre-fill "regulatory clearance confirmed by AB, 15 Oct 2026".
- In LAUNCH_REPORT, change the regulatory checks section to "Approved — confirmed by AB (15 Oct 2026)" for all services, and add a settings field to record each licence/approval reference so it can be shown on the relevant pages.

BRIEF (verbatim):

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

END OF SPECIFICATION
