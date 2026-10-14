# HagerLand — Requirements traceability matrix

Spec Section 25.1. One row per requirement from `docs/HAGERLAND_RELAUNCH_SPEC.md` Sections 1–25 and `docs/PLATFORM_VISION.md`.

**Status rules.** `Done` only with a passing test or a recorded verification (named below). `Not done` until then. `Deferred-by-rule` only for the items listed in spec 25.3. Nothing is "Partly": where a requirement has several parts, each part has its own row.

**Evidence shorthand.**
- `e2e:file › test` — a Playwright test in `e2e/` (run against the local Supabase copy).
- `unit:file › test` — a Vitest test in `tests/unit/`.
- `rls:check` — a line of `supabase/tests/rls_test.sql` (local copy; every line must print PASS).
- `sql:` — a check query in `supabase/README.md`, run on the local copy, with its result.
- `verify:` — a recorded verification: what was checked, how, and the result.
- `build` — `npm run lint`, `npx tsc --noEmit` and `rm -rf .next && npm run build` all pass with zero errors.

**Superseded requirements.** Where Section 24 or PLATFORM_VISION.md replaces an earlier requirement (for example the hero headline or the "HagerLand Developments" pillar), the row says so and is verified against the newer requirement.

**Phase 3 roadmap.** Spec Section 21 lists Phase 3 ("longer term") items. They are not requirements of this release, except the ones Section 25.3 names, which are rows below marked `Deferred-by-rule`. The rest are listed at the end, for the record, without a status.

Summary (updated at the end of every work package): see the last section.

---

## Section 1 — What HagerLand is

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S1-01 | Integrity rule: HagerLand's own developments and products are always labelled | 1.3 | Done | components/property/PropertyBadges.tsx, components/supplies/ProductCard.tsx, components/development/DevelopmentCard.tsx | verify: badges "HagerLand Development" / "Sold by HagerLand Supply" rendered from is_hagerland / seller_is_hagerland (WP-19 report) |
| S1-02 | Integrity rule: own items are never boosted in organic search or sort | 1.3 | Done | supabase/migrations/0005_search_functions.sql | verify: no search function orders by is_hagerland (grep of 0005; ORDER BY clauses list rank, price, area, date, verification only) |
| S1-03 | Phone numbers: +251 then 9 digits, mobile starting 9 or 7; international numbers accepted | 1.5 | Done | lib/validation/common.ts, components/ui/PhoneInput.tsx | unit:validation.test.ts › normalises phone numbers to E.164; unit:format.test.ts › displays Ethiopian numbers in groups |
| S1-04 | Currency shown as "ETB 4,500,000" | 1.5 | Done | lib/format.ts | unit:format.test.ts › formats whole birr |
| S1-05 | Property norms modelled: leasehold tenure, title deed, G+X floors, finishing level, condominiums, advance months, negotiable, off-plan | 1.5 | Done | supabase/migrations/0001,0002; components/account/ListingWizard.tsx | unit:validation.test.ts › rejects unknown features and bad building heights; e2e:flows/owner-listing.spec.ts › owner lists a property… |
| S1-06 | Supplies units (piece … pair, quintal, m², m³) | 1.5 | Done | lib/units.ts, 0002 products.unit check | unit:product.test.ts › rejects unknown units |
| S1-07 | "Price updated" dates and "call for today's price" on volatile products | 1.5 | Done | lib/product-price.ts, app/(site)/supplies/product/[slug]/page.tsx | e2e:admin/admin.spec.ts › create a product, change its price… (price_updated_at set) |
| S1-08 | Contractor licence category, grade and number captured; verified manually | 1.5 | Done | components/account/OrganisationForm.tsx, 0002 organisations | e2e:flows/business.spec.ts › a contractor creates a business profile… |
| S1-09 | Verification documents: trade licence and TIN | 1.5 | Done | components/account/VerificationForm.tsx | e2e:flows/business.spec.ts › a contractor creates a business profile… (uploads documents, marked Verified) |

## Section 2 — Audit of the old codebase

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S2-01 | Unified entity model replaces per-section duplication | 2.1 | Done | supabase/migrations/0002_core_tables.sql | sql: 0002 check → 28 tables |
| S2-02 | Real user accounts replace manage tokens | 2.1 | Done | app/(account), lib/auth.ts | e2e:flows/owner-listing.spec.ts › owner lists a property… |
| S2-03 | Database migrations kept in the repository | 2.1 | Done | supabase/migrations/ | verify: 0001–0010 present and applied on the local copy by supabase/local-stack/setup.sh |
| S2-04 | Central admin protection in middleware | 2.1 | Done | middleware.ts, lib/admin-session-edge.ts | e2e:redirects.spec.ts › admin pages require a session |
| S2-05 | Admin sidebar uses usePathname (no x-invoke-path) | 2.1 | Done | components/admin/AdminNav.tsx | verify: grep finds no x-invoke-path in the repo |
| S2-06 | No global Cache-Control: no-store | 2.1 | Done | next.config.mjs | verify: next.config.mjs has no headers() entry for no-store |
| S2-07 | ISR and on-demand revalidation instead of force-dynamic everywhere | 2.1 | Done | lib/revalidate.ts, page revalidate exports | verify: public pages export revalidate; admin changes call revalidateEntity / revalidateTag |
| S2-08 | Google Translate widget removed | 2.1 | Done | app/layout.tsx | verify: grep finds no translate.google in the repo |
| S2-09 | No user input interpolated into PostgREST filter strings | 2.1 | Done | lib/data/*, app/api/search | verify: grep for `.or(\`` with user input finds none; search uses .rpc() |
| S2-10 | Email HTML escapes user input; sender hagerland.com; one base URL helper | 2.1 | Done | lib/email/layout.ts, lib/site.ts | verify: renderEmail escapes every interpolated value (escapeHtml); grep finds no hagerland-platform.vercel.app |
| S2-11 | Non-existent property-discovery cron removed | 2.1 | Done | vercel.json | verify: vercel.json lists only /api/cron/daily |
| S2-12 | JSON-LD addressCountry ET (not GB) | 2.1 | Done | lib/jsonld.ts, lib/jsonld-org.ts | e2e:seo.spec.ts › structured data (JSON-LD) is valid on key pages |
| S2-13 | Unused dependencies removed (Sanity, recharts, react-markdown) | 2.1 | Done | package.json | verify: package.json has none of them |
| S2-14 | Google Places only to discover businesses: store place_id, never Google reviews, ratings or photos | 2.1 | Done | lib/admin/place-mapping.ts | unit:place-mapping.test.ts (maps name, phone, website, location only) |
| S2-15 | Admin HMAC session + TOTP kept, with an Edge verifier | 2.2 | Done | lib/admin-auth.ts, lib/admin-session-edge.ts | e2e:admin/admin.spec.ts › admin signs in with username, password and one-time code |
| S2-16 | Rate limiter generalised and reused for public forms | 2.2 | Done | lib/rate-limit.ts | unit:rate-limit.test.ts; e2e:security.spec.ts › contact reveals are rate limited per visitor |
| S2-17 | Turnstile + honeypot on public forms | 2.2 | Done | lib/turnstile.ts, components/forms/Turnstile.tsx | verify: every public form action calls verifyTurnstileToken and isHoneypotFilled (grep app/actions) |
| S2-18 | Audit log extended to new entities (audit_log) | 2.2 | Done | lib/admin/guard.ts audit() | e2e:admin/admin.spec.ts (audit page loads with entries) |
| S2-19 | Moderation concepts re-implemented generically | 2.2 | Done | app/roodber8/actions/moderation.ts | e2e:flows/owner-listing.spec.ts; e2e:flows/business.spec.ts |
| S2-20 | Import pipeline kept (Places API New, pageToken in POST body) and retargeted to organisations | 2.2 | Done | lib/admin/places.ts, app/api/admin/places-search | unit:place-mapping.test.ts › builds the import section; verify: places.ts posts pageToken in the body |
| S2-21 | Brand assets kept (logo, favicon, wordmark ®) | 2.2 | Done | components/brand/Logo.tsx, app/icon.svg | e2e:smoke.spec.ts (header renders on every route) |
| S2-22 | Fonts via next/font (Inter, Manrope); unused fonts dropped | 2.2 | Done | app/layout.tsx | verify: only Inter, Manrope, Noto Sans Ethiopic loaded |
| S2-23 | Legacy routes, APIs, admin sections, components and lib files removed | 2.3 | Done | (deleted in WP-1) | e2e:redirects.spec.ts › legacy URLs redirect; verify: WP-19 legacy sweep |
| S2-24 | BirrBank env vars removed from .env.example | 2.3 | Done | .env.example | verify: grep BIRRBANK in .env.example → none |
| S2-25 | README rewritten for the new platform | 2.3 | Done | README.md | verify: README describes the construction and property platform |

## Section 3 — Brand and positioning

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S3-01 | Name meaning ("Hager" ሀገር) used on About | 3.2 | Done | app/(site)/about/page.tsx | e2e:smoke.spec.ts › loads /about |
| S3-02 | Tagline configurable in lib/brand.ts (superseded by the 24.1 positioning lines) | 3.3 | Done | lib/brand.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… (tagline replaced by the 24.1 lines; decision in LAUNCH_REPORT) |
| S3-03 | Descriptor near the name in metadata, footer and share images | 3.3 | Done | lib/brand.ts, app/layout.tsx, SiteFooter.tsx, lib/email/layout.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… (footer); verify: root metadata uses brand.titleLine and masterLine; emails show brand.descriptor |
| S3-04 | Hero headline and support line (superseded by 24.1 master and support lines) | 3.3 / 24.1 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S3-05 | Proof points only where true at launch | 3.3 | Done | app/(site)/page.tsx | verify: proof point "Built and supplied by us … HagerLand develops" replaced by "We know construction: HagerLand Supply sources building materials" (no development claim) |
| S3-06 | Voice: no exclamation marks, no hype words in UI | 3.3 | Not done | all UI copy | verify in E9 copy sweep (grep for "!" in JSX text) |
| S3-07 | Retired phrases absent (directory-era slogans, BirrBank, "Free, always", etc.) | 3.3 | Done | — | verify: WP-19 legacy sweep (docs/LAUNCH_REPORT.md) |
| S3-08 | Division names in lib/brand.ts (HagerLand Supply, HagerLand Developments) | 3.4 | Done | lib/brand.ts | verify: brand.divisions used across UI |
| S3-09 | "Sold by HagerLand Supply" seller badge; gold "HagerLand Development" badge | 3.4 | Done | components/supplies, components/property/PropertyBadges.tsx | verify: badges rendered from flags |
| S3-10 | Visual identity: green action colour, gold for verification and own developments, ink and stone neutrals | 3.5 | Done | tailwind.config.ts, app/globals.css | verify: tokens defined as CSS variables (WP-3) |

## Section 4 — Information architecture and routes

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S4-01 | Desktop navigation with mega-menus (superseded by 24.3) | 4.1 / 24.3 | Done | lib/navigation.ts, SiteHeader.tsx | e2e:verticals.spec.ts › header shows the six menus in order… |
| S4-02 | Mobile sticky top bar (logo, search, menu) | 4.1 | Done | components/layout/SiteHeader.tsx | e2e:smoke.spec.ts (mobile project renders header on every route) |
| S4-03 | Mobile full-screen drawer with accordion sections (now all ten verticals, 24.3) | 4.1 / 24.3 | Done | MobileDrawer.tsx | e2e:verticals.spec.ts › mobile drawer lists all ten verticals… |
| S4-04 | Fixed bottom action bar on detail pages only (Call · WhatsApp · Enquire) | 4.1 | Done | components/enquiry/ContactPanel.tsx | e2e:flows/owner-listing.spec.ts (visitor reveals phone on mobile) |
| S4-05 | Footer: brand column, link columns, bottom bar with legal line; socials only when configured | 4.2 | Done | SiteFooter.tsx | e2e:admin/admin.spec.ts › settings: contact phone appears on the site once set… |
| S4-06 | Footer columns reflect the ten-vertical ecosystem (24.11) | 4.2 / 24.11 | Done | lib/navigation.ts buildFooterColumns | e2e:verticals.spec.ts › homepage shows… (footer); e2e:smoke.spec.ts |
| R-01 | / Homepage | 4.3 | Done | app/(site)/page.tsx | e2e:smoke.spec.ts › loads / |
| R-02 | /search unified search with vertical tabs | 4.3 | Done | app/(site)/search | e2e:smoke.spec.ts › loads /search?q=bole |
| R-03 | /property hub | 4.3 | Done | app/(site)/property/page.tsx | e2e:smoke.spec.ts › loads /property |
| R-04 | /property/for-sale | 4.3 | Done | app/(site)/property/for-sale | e2e:smoke.spec.ts › loads /property/for-sale |
| R-05 | /property/to-rent | 4.3 | Done | app/(site)/property/to-rent | e2e:smoke.spec.ts › loads /property/to-rent |
| R-06 | /property/for-sale/[...location] | 4.3 | Done | app/(site)/property/for-sale/[...location] | e2e:smoke.spec.ts › loads /property/for-sale/addis-ababa/bole |
| R-07 | /property/to-rent/[...location] | 4.3 | Done | app/(site)/property/to-rent/[...location] | e2e:smoke.spec.ts › loads /property/to-rent/addis-ababa |
| R-08 | /property/[slug] detail, slug ends in short id | 4.3 | Done | app/(site)/property/[slug] | unit:slug.test.ts › builds listing slugs ending in the short id; e2e:a11y.spec.ts (detail page) |
| R-09 | /developments | 4.3 | Done | app/(site)/developments | e2e:smoke.spec.ts › loads /developments |
| R-10 | /developments/[slug] | 4.3 | Done | app/(site)/developments/[slug] | e2e:responsive.spec.ts (development page) |
| R-11 | /our-developments (now coming soon, 24.10) | 4.3 / 24.10 | Not done | app/(site)/our-developments | see S24-90 |
| R-12 | /our-developments/[slug] premium project page | 4.3 | Not done | app/(site)/our-developments/[slug] | needs a test with a seeded HagerLand development |
| R-13 | /supplies hub | 4.3 | Done | app/(site)/supplies/page.tsx | e2e:smoke.spec.ts › loads /supplies |
| R-14 | /supplies/[category] | 4.3 | Done | app/(site)/supplies/[category] | e2e:smoke.spec.ts › loads /supplies/building-materials |
| R-15 | /supplies/[category]/[subcategory] | 4.3 | Done | app/(site)/supplies/[category]/[subcategory] | e2e:smoke.spec.ts › loads /supplies/building-materials/cement-concrete |
| R-16 | /supplies/product/[slug] | 4.3 | Done | app/(site)/supplies/product/[slug] | e2e:a11y.spec.ts (product page) |
| R-17 | /supplies/quote quote list | 4.3 | Done | app/(site)/supplies/quote | e2e:flows/supplies-and-contact.spec.ts › a guest builds a quote list… |
| R-18 | /supplies/materials-list | 4.3 | Done | app/(site)/supplies/materials-list | e2e:flows/supplies-and-contact.spec.ts › a guest sends a materials list with a file |
| R-19 | /supplies/special-buys (25.2d) | 4.3 / 25.2d | Not done | — | H1 |
| R-20 | /suppliers directory | 4.3 | Done | app/(site)/suppliers | e2e:smoke.spec.ts › loads /suppliers |
| R-21 | /professionals hub | 4.3 | Done | app/(site)/professionals | e2e:smoke.spec.ts › loads /professionals |
| R-22 | /professionals/[service] | 4.3 | Done | app/(site)/professionals/[service] | e2e:smoke.spec.ts › loads /professionals/architects |
| R-23 | /professionals/[service]/[...location] | 4.3 | Done | app/(site)/professionals/[service]/[[...location]] | e2e:smoke.spec.ts › loads /professionals/plumbers/addis-ababa |
| R-24 | /agents | 4.3 | Done | app/(site)/agents | e2e:smoke.spec.ts › loads /agents |
| R-25 | /developers | 4.3 | Done | app/(site)/developers | e2e:smoke.spec.ts › loads /developers |
| R-26 | /company/[slug] unified profile | 4.3 | Done | app/(site)/company/[slug] | e2e:flows/business.spec.ts; e2e:a11y.spec.ts (company page) |
| R-27 | /company/[slug]/claim | 4.3 | Done | app/(site)/company/[slug]/claim | e2e:flows/business.spec.ts › someone claims an imported business… |
| R-28 | /list-with-us with anchors | 4.3 | Done | app/(site)/list-with-us | e2e:smoke.spec.ts › loads /list-with-us |
| R-29 | /about, /how-it-works, /contact, /help, /terms, /privacy, /cookies | 4.3 | Done | app/(site)/* | e2e:smoke.spec.ts (each route) |
| R-30 | /guides and /guides/[slug] (25.2g) | 4.3 / 25.2g | Not done | — | H2 |
| R-31 | /login, /signup, /auth/callback, /auth/reset-password, /auth/update-password | 4.3 | Done | app/(site)/login, signup, auth; app/auth/callback | e2e:smoke.spec.ts (login, signup, reset-password); e2e:flows/owner-listing.spec.ts (callback via email link) |
| R-32 | /account dashboard | 4.3 | Done | app/(account)/account/page.tsx | e2e:flows/owner-listing.spec.ts |
| R-33 | /account/listings, /new, /[id]/edit | 4.3 | Done | app/(account)/account/listings | e2e:flows/owner-listing.spec.ts |
| R-34 | /account/products, /new, /[id]/edit (25.2c) | 4.3 / 25.2c | Not done | — | H1 |
| R-35 | /account/company and /account/company/verification | 4.3 | Done | app/(account)/account/company | e2e:flows/business.spec.ts |
| R-36 | /account/enquiries and /account/enquiries/[id] | 4.3 | Done | app/(account)/account/enquiries | e2e:flows/owner-listing.spec.ts (owner sees the enquiry) |
| R-37 | /account/quotes | 4.3 | Not done | app/(account)/account/quotes | add test: signed-in requester sees quote |
| R-38 | /account/saved (25.2a) | 4.3 / 25.2a | Not done | — | E6 |
| R-39 | /account/alerts (25.2a) | 4.3 / 25.2a | Not done | — | E6 |
| R-40 | /account/settings (name, phone, password, notifications, delete account) | 4.3 | Not done | app/(account)/account/settings | add test (H6 covers deletion and export requests) |
| R-41 | /onboarding | 4.3 | Done | app/(account)/onboarding | e2e:flows/business.spec.ts |
| R-42 | /roodber8-login and /roodber8 sub-routes | 4.3 | Done | app/roodber8-login, app/roodber8 | e2e:admin/admin.spec.ts › every admin screen loads without errors |
| R-43 | POST /api/enquiries equivalent (server action) | 4.3 | Done | app/actions/enquiry-actions.ts | e2e:flows/owner-listing.spec.ts |
| R-44 | POST /api/contact-reveal | 4.3 | Done | app/api/contact-reveal | e2e:security.spec.ts › contact reveals are rate limited per visitor |
| R-45 | POST /api/quotes equivalent (server action) | 4.3 | Done | app/actions/quote-actions.ts | e2e:flows/supplies-and-contact.spec.ts |
| R-46 | POST /api/uploads/sign | 4.3 | Done | app/api/uploads/sign | e2e:security.spec.ts › upload signing refuses bad types… |
| R-47 | GET /api/search/suggest | 4.3 | Not done | app/api/search/suggest | add test: returns grouped results |
| R-48 | /api/cron/daily (Bearer CRON_SECRET) | 4.3 | Done | app/api/cron/daily | e2e:cron.spec.ts › refuses requests without the secret |
| R-49 | /api/admin/places-search, place-details, import, auto-import | 4.3 | Done | app/api/admin/* | e2e:admin/admin.spec.ts (imports screen); verify: routes check cookies() admin session |
| S4-07 | Property detail → lister profile, development, "Professionals for this property", land "Build on this plot" | 4.4 | Done | app/(site)/property/[slug], components/company/ProfessionalsModule.tsx | verify: detail page renders ProfessionalsModule by purpose/type (code review, WP-6) |
| S4-08 | Development detail → developer profile, units, nearby developments | 4.4 | Done | components/development/DevelopmentDetail.tsx | verify: code review WP-8 |
| S4-09 | Product detail → seller, related products, "Need it installed?" professionals | 4.4 | Done | app/(site)/supplies/product/[slug] | verify: code review WP-9 |
| S4-10 | Professional profile → portfolio, services, areas served, enquiry | 4.4 | Done | app/(site)/company/[slug] | e2e:flows/business.spec.ts |
| S4-11 | Breadcrumbs on every listing page | 4.4 | Done | components/ui/Breadcrumbs.tsx | e2e:seo.spec.ts (BreadcrumbList JSON-LD) |

## Section 5 — Design system and UX

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S5-01 | Colour tokens (brand, gold, ink, stone, muted, border, state) as CSS variables mapped in Tailwind | 5.2 | Done | app/globals.css, tailwind.config.ts | verify: WP-3; gold-dark/info-dark darkened for contrast (WP-18) |
| S5-02 | Typography: Manrope display, Inter body, Noto Sans Ethiopic with font-ethiopic utility; type scale; tabular numerals for prices | 5.2 | Done | app/layout.tsx, tailwind.config.ts | verify: fonts loaded via next/font; prices use tabular-nums |
| S5-03 | Spacing, container, radius and shadow tokens | 5.2 | Done | tailwind.config.ts, components/ui/Layout.tsx | verify: WP-3 styleguide |
| S5-04 | lucide-react icons only; no inline SVG icon strings | 5.2 | Not done | components/* | verify in E9 (grep for dangerouslySetInnerHTML and inline svg icons) |
| S5-05 | Imagery: next/image with sizes and lazy loading; aspect ratios per type; no hotlinking | 5.2 | Done | components/media/MediaImage.tsx | verify: all photos rendered through MediaImage (next/image) with sizes |
| S5-06 | Design looks complete without photos (blueprint hero, icon tiles) | 5.2 | Done | app/globals.css .hl-blueprint | e2e:smoke.spec.ts › loads / |
| C-01 | Button (variants primary, secondary, ghost, gold, danger; sizes; loading; link form) | 5.3 | Not done | components/ui/Button.tsx | e2e:styleguide.spec.ts (to add) |
| C-02 | IconButton | 5.3 | Not done | components/ui/Button.tsx | e2e:styleguide.spec.ts (to add) |
| C-03 | Input, Textarea, Select | 5.3 | Not done | components/ui/Field.tsx | e2e:styleguide.spec.ts (to add) |
| C-04 | Combobox (searchable, locations and categories) | 5.3 | Done | components/ui/Combobox.tsx | e2e:flows/owner-listing.spec.ts (location chosen in the wizard) |
| C-05 | Checkbox, Radio, Switch | 5.3 | Not done | components/ui/Field.tsx, Switch.tsx | e2e:styleguide.spec.ts (to add) |
| C-06 | RangeInputs, PriceInput (ETB), PhoneInput (+251 default) | 5.3 | Not done | components/ui/Field.tsx, PriceInput.tsx, PhoneInput.tsx | e2e:styleguide.spec.ts (to add) |
| C-07 | FileDrop with progress | 5.3 | Done | components/media/FileDrop.tsx | e2e:flows/owner-listing.spec.ts (photos uploaded) |
| C-08 | Badge, Chip, FilterChip | 5.3 | Not done | components/ui/Badge.tsx, Chip.tsx | e2e:styleguide.spec.ts (to add) |
| C-09 | Tabs, Accordion | 5.3 | Not done | components/ui/Tabs.tsx, Accordion.tsx | e2e:styleguide.spec.ts (to add) |
| C-10 | Dialog / bottom Sheet | 5.3 | Not done | components/ui/Dialog.tsx | e2e:styleguide.spec.ts (to add) |
| C-11 | Dropdown menu, Tooltip, Toast | 5.3 | Not done | components/ui/DropdownMenu.tsx, Tooltip.tsx, Toast.tsx | e2e:styleguide.spec.ts (to add) |
| C-12 | Skeleton, EmptyState, Pagination, Breadcrumbs, Stat, Card, Section, SectionHeader, Container | 5.3 | Not done | components/ui/Layout.tsx, Pagination.tsx, Breadcrumbs.tsx | e2e:styleguide.spec.ts (to add) |
| C-13 | SiteHeader with mega-menu, MobileDrawer, SiteFooter | 5.3 | Done | components/layout/* | e2e:smoke.spec.ts (every route) |
| C-14 | AccountShell (sidebar desktop, tabs mobile) | 5.3 | Done | app/(account)/account/layout.tsx, components/account/AccountNav.tsx | e2e:flows/owner-listing.spec.ts |
| C-15 | AdminShell | 5.3 | Done | app/roodber8/layout.tsx | e2e:admin/admin.spec.ts › every admin screen loads without errors |
| C-16 | PropertyCard, horizontal card, Gallery with lightbox, KeyFacts, PriceBlock, LocationBlock, ContactPanel | 5.3 | Done | components/property/*, components/media/Gallery.tsx | e2e:a11y.spec.ts (property pages); e2e:flows/owner-listing.spec.ts |
| C-17 | MortgageNote (P2): finance ask on property pages | 5.3 / 24.7 | Not done | — | E6 ("Ask about financing") |
| C-18 | DevelopmentCard, hero, UnitTypesTable, PaymentPlanBlock, ConstructionProgress, RegisterInterestForm | 5.3 | Done | components/development/* | e2e:flows/supplies-and-contact.spec.ts › register interest…; e2e:responsive.spec.ts |
| C-19 | ProductCard, ProductSpecsTable, QuoteBasket, QuantityStepper with unit, MaterialsListUploader | 5.3 | Done | components/supplies/* | e2e:flows/supplies-and-contact.spec.ts |
| C-20 | CompanyCard, CompanyHeader, PortfolioGrid, ServicesList, AreasServed, VerificationBadge with tooltip | 5.3 | Done | components/company/* | e2e:flows/business.spec.ts |
| C-21 | SearchBar with homepage tabs, LocationPicker, FiltersPanel (mobile bottom sheet), SortSelect, ResultsHeader, NoResults | 5.3 | Done | components/home/HomeSearch.tsx, components/property/* | e2e:smoke.spec.ts; e2e:a11y.spec.ts (results pages) |
| C-22 | EnquiryForm, TrustStrip, HowItWorksSteps, CTASection; no LogoWall at launch | 5.3 | Done | components/enquiry/EnquiryForm.tsx | e2e:flows/owner-listing.spec.ts (enquiry sent) |
| S5-07 | Mobile-first, no horizontal scroll at 360/390/768/1024/1440 | 5.4 | Done | all pages | e2e:responsive.spec.ts › no page scrolls sideways at any common width (to be extended to new pages in E9) |
| S5-08 | Tap targets ≥ 44px; body ≥ 16px on mobile | 5.4 | Done | tailwind tokens | e2e:a11y.spec.ts (target-size rule, wcag22aa) |
| S5-09 | Paired buttons equal width; no hover-dependent design | 5.4 | Done | components/* | verify: WP-19 manual pass |
| S5-10 | Filters in URL query params; typeahead debounced 250 ms | 5.4 | Done | lib/property-search.ts, components/search/SearchOverlay.tsx | unit:property-search.test.ts › round-trips through the query string |
| S5-11 | Every list has loading skeleton, empty state, error state | 5.4 | Done | app/(site)/**/loading.tsx, error.tsx, EmptyState | verify: WP-19 |
| S5-12 | Forms: inline validation, preserve input on error, no double submit, success screen | 5.4 | Not done | components/forms/* | H6 (25.4 forms rows) |
| S5-13 | Prices "ETB 4,500,000", rent "/month", "Price on request", "Negotiable"; area "120 m²" | 5.4 | Done | lib/format.ts, components/property/PriceLine.tsx | unit:format.test.ts › formats whole birr; formats square metres |
| S5-14 | Dates "12 Oct 2026"; relative freshness | 5.4 | Done | lib/format.ts | unit:format.test.ts › formats dates as 12 Oct 2026; describes freshness |
| S5-15 | Meaningful alt text on images | 5.4 | Done | components/media/* | e2e:a11y.spec.ts (image-alt rule) |
| S5-16 | WCAG 2.2 AA: contrast, focus rings, landmarks, labels, aria-live, keyboard, reduced motion | 5.4 | Done | app/globals.css | e2e:a11y.spec.ts › public pages have no serious accessibility problems |
| S5-17 | /dev/styleguide shows tokens and all components (not public in production) | 5.5 | Not done | app/(site)/dev/styleguide | e2e:styleguide.spec.ts (to add) |

## Section 6 — Data model and backend

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S6-01 | New tables do not collide with legacy names | 6.1 | Done | 0001 pre-flight block | verify: WP-0 snapshot check; 0001 refuses on clashes |
| S6-02 | UUID keys, created_at/updated_at with trigger on every table | 6.1 | Done | 0002 | sql: 0002 check |
| S6-03 | Public records: status, slug, short_id, published_at | 6.1 | Done | 0002 | unit:slug.test.ts |
| S6-04 | RLS on every new table, default deny | 6.1 | Done | 0003 (+ every migration 0011+) | sql: 0003 check → 0 tables without RLS; rls_test.sql |
| S6-05 | Money as bigint ETB (cents for products); areas numeric(10,2) | 6.1 | Done | 0002 | verify: column types in 0002 |
| S6-06 | Full-text search (tsvector + GIN), pg_trgm, unaccent | 6.1 | Done | 0001, 0002 | sql: 0005 check |
| S6-07 | User writes through user-scoped client (RLS); admin writes via service role in server-only modules | 6.1 | Done | lib/supabase/*.ts | e2e:security.spec.ts › the service key never reaches the browser |
| S6-08 | protect_privileged_columns trigger; owners move status only among draft, pending_review, paused, archived | 6.1 | Done | 0001, 0002 | rls:Owner cannot publish own listing; Owner cannot set is_featured |
| S6-09 | Enums (17) | 6.2 | Done | 0001 | sql: 0001 check → 17 |
| T-01 | profiles + signup trigger | 6.3 | Done | 0002 | rls:Signup trigger creates a profile |
| T-02 | organisations (all columns, indexes) | 6.3 | Done | 0002 | rls:New organisation is forced to pending review… |
| T-03 | organisation_members | 6.3 | Done | 0002 | rls:Creator becomes organisation owner |
| T-04 | organisation_services | 6.3 | Done | 0002 | e2e:flows/business.spec.ts |
| T-05 | org_product_categories | 6.3 | Done | 0002 | verify: used by supplier editor (OrganisationForm) |
| T-06 | reports | 6.3 | Done | 0002, app/actions/report-actions.ts | verify: report form inserts (admin review queue lists reports) |
| T-07 | search_misses | 6.3 | Done | 0002 | verify: record_search_miss called from lib/data/search.ts |
| T-08 | service_categories tree | 6.3 | Done | 0002, 0007 | sql: 0007 check → 60 services |
| T-09 | portfolio_projects | 6.3 | Done | 0002 | e2e:flows/business.spec.ts |
| T-10 | locations hierarchy + locations_descendants | 6.3 | Done | 0002 | sql: 0007 check → 39 locations |
| T-11 | developments | 6.3 | Done | 0002 | e2e:responsive.spec.ts (development page) |
| T-12 | properties (all fields, rent period constraint) | 6.3 | Done | 0002 | rls:Owner can create a draft listing |
| T-13 | media | 6.3 | Done | 0002 | e2e:flows/owner-listing.spec.ts |
| T-14 | product_categories tree | 6.3 | Done | 0002, 0007 | sql: 0007 check → 87 |
| T-15 | brands | 6.3 | Done | 0002 | verify: admin products editor lists brands |
| T-16 | products (incl. trade price, special-buy fields) | 6.3 | Done | 0002 | e2e:admin/admin.spec.ts › create a product… |
| T-17 | quote_requests + quote_request_items | 6.3 | Done | 0002 | e2e:flows/supplies-and-contact.spec.ts |
| T-18 | enquiries | 6.3 | Done | 0002 | e2e:flows/owner-listing.spec.ts |
| T-19 | contact_reveals | 6.3 | Done | 0002 | e2e:security.spec.ts › contact reveals are rate limited… |
| T-20 | claims | 6.3 | Done | 0002 | e2e:flows/business.spec.ts › someone claims… |
| T-21 | verification_requests | 6.3 | Done | 0002 | e2e:flows/business.spec.ts |
| T-22 | admin_notes | 6.3 | Done | 0002 | verify: admin entity pages add notes (RecordTools) |
| T-23 | saved_items (25.2a) | 6.3 | Not done | — | E6 |
| T-24 | saved_searches (25.2a) | 6.3 | Not done | — | E6 |
| T-25 | promotions (+ featured sync trigger) | 6.3 | Done | 0002 | e2e:cron.spec.ts (featured sync step) |
| T-26 | site_settings + site_settings_public whitelist | 6.3 | Done | 0002, 0004, 0010 | sql: 0010 check → 14 |
| T-27 | audit_log | 6.3 | Done | 0002 | e2e:admin/admin.spec.ts |
| T-28 | import_log entity_type column; sections org_<kind> | 6.3 | Done | 0002 | unit:place-mapping.test.ts › builds the import section |
| T-29 | rate_limits kept | 6.3 | Done | lib/rate-limit.ts | unit:rate-limit.test.ts |
| S6-10 | Seed: regions, Addis sub-cities, key cities | 6.4 | Done | 0007 | sql: 0007 check |
| S6-11 | Seed: service categories (two levels) | 6.4 | Done | 0007 | sql: 0007 check |
| S6-12 | Seed: product categories (two levels) | 6.4 | Done | 0007 | sql: 0007 check |
| S6-13 | Seed: HagerLand Supply and HagerLand Developments organisations | 6.4 | Done | 0007 | sql: 0007 check → 2 organisations |
| S6-14 | site_settings defaults (expiry 60, min results 3, owner cap 3) | 6.4 | Done | 0007 | sql: 0007 check → 10 settings |
| S6-15 | Public reads only through *_public views and SECURITY DEFINER search functions; views filter and expose safe columns | 6.5 | Done | 0004, 0005 | rls:Anonymous visitors cannot read base tables…; sql: 0004 check |
| S6-16 | Base tables: nothing for anon; reference tables readable when active | 6.5 | Done | 0003 | rls checks (anon) |
| S6-17 | Contact details only via /api/contact-reveal | 6.5 | Done | app/api/contact-reveal | e2e:flows/owner-listing.spec.ts (phone revealed); rls:views expose no contact columns |
| S6-18 | Owners select/insert/update own properties and org-owned records; no delete | 6.5 | Done | 0003 | rls:Owner can edit own draft; Another user cannot edit the listing |
| S6-19 | Organisations: members read/update non-privileged; insert forced pending + listed | 6.5 | Done | 0003 | rls:Owner cannot verify own organisation |
| S6-20 | Enquiries: server insert only; recipients update status/notes; sender reads own | 6.5 | Done | 0003 | rls checks (enquiries) |
| S6-21 | Quote requests: server insert; requester reads own | 6.5 | Done | 0003 | rls checks (quotes) |
| S6-22 | Claims/verification: insert own, read own | 6.5 | Done | 0003 | rls checks (claims) |
| S6-23 | saved_items/saved_searches owner-only | 6.5 | Not done | — | E6 + rls test |
| S6-24 | Service-role-only tables (audit_log, admin_notes, settings write, promotions, import_log, rate_limits, contact_reveals) | 6.5 | Done | 0003 | rls checks |
| S6-25 | Storage: public-media (server-signed uploads only), private-docs (10-minute signed links, owner/admin only) | 6.5 | Done | 0006, lib/storage.ts | e2e:security.spec.ts › upload signing refuses…; sql: 0006 check |
| M-01 | lib/env.ts zod-validated env, fail fast | 6.6 | Done | lib/env.ts, instrumentation.ts | unit:env.test.ts |
| M-02 | lib/site.ts SITE_URL and absoluteUrl | 6.6 | Done | lib/site.ts | e2e:seo.spec.ts › detail pages have absolute canonicals… |
| M-03 | lib/brand.ts | 6.6 | Done | lib/brand.ts | verify: imported by layout, footer, emails |
| M-04 | lib/supabase server, browser, admin (server-only), middleware | 6.6 | Done | lib/supabase/* | e2e:security.spec.ts › the service key never reaches the browser |
| M-05 | lib/auth.ts getUser, requireUser, memberships, requireOrgRole | 6.6 | Done | lib/auth.ts | e2e:flows/* |
| M-06 | lib/admin-auth.ts + lib/admin-session-edge.ts | 6.6 | Done | lib/admin-auth.ts, lib/admin-session-edge.ts | e2e:admin/admin.spec.ts |
| M-07 | lib/validation/* zod schemas shared by forms and actions | 6.6 | Done | lib/validation/* | unit:validation.test.ts |
| M-08 | lib/slug.ts slugify (Ethiopic stripped) and shortId | 6.6 | Done | lib/slug.ts | unit:slug.test.ts › drops Ethiopic characters but keeps the rest |
| M-09 | lib/format.ts | 6.6 | Done | lib/format.ts | unit:format.test.ts |
| M-10 | lib/rate-limit.ts | 6.6 | Done | lib/rate-limit.ts | unit:rate-limit.test.ts |
| M-11 | lib/security.ts escapeHtml, hashIp, sanitizeText | 6.6 | Done | lib/security.ts | unit:validation.test.ts › strips control characters… |
| M-12 | lib/email: Resend client, branded layout with plain text, every listed template | 6.6 | Not done | lib/email/* | H6: unit test rendering every template (HTML + text, escaping) |
| M-13 | lib/storage.ts: signed uploads with ownership/type/size/count checks; sharp WebP + 640 px thumb; EXIF stripped | 6.6 | Done | lib/storage.ts, lib/media-actions.ts | unit:sniff.test.ts; e2e:security.spec.ts › upload signing refuses…; EXIF: see X-LST-11 |
| M-14 | lib/search.ts via Postgres functions | 6.6 | Done | lib/data/search.ts | e2e:smoke.spec.ts › loads /search?q=bole |
| M-15 | lib/seo.ts buildMetadata and JSON-LD builders | 6.6 | Done | lib/seo.ts, lib/jsonld.ts | e2e:seo.spec.ts › structured data… |
| M-16 | lib/analytics.ts track() | 6.6 | Done | lib/analytics.ts | verify: events listed in S19-30 call track() |
| M-17 | lib/revalidate.ts tag helpers | 6.6 | Done | lib/revalidate.ts | verify: used by every admin and owner action |
| F-01 | search_properties | 6.7 | Done | 0005 | unit:property-search.test.ts; e2e:smoke.spec.ts (results pages) |
| F-02 | search_products | 6.7 | Done | 0005 | e2e:admin/admin.spec.ts › …and find it |
| F-03 | search_organisations (verified boost, location or areas served) | 6.7 | Done | 0005 | e2e:smoke.spec.ts › loads /professionals/plumbers/addis-ababa |
| F-04 | search_developments | 6.7 | Done | 0005 | e2e:smoke.spec.ts › loads /developments |
| F-05 | search_all | 6.7 | Done | 0005 | e2e:smoke.spec.ts › loads /search?q=bole |
| F-06 | increment_view (server, deduped per session) | 6.7 | Done | 0002, app/api/views | verify: ViewTracker posts once per session |
| F-07 | next_reference (HLE, HLQ) | 6.7 | Done | 0002 | e2e:flows/supplies-and-contact.spec.ts (reference shown) |
| F-08 | Triggers: set_updated_at, protect_privileged_columns, publish/expiry, featured sync, profile on signup, owner on org insert | 6.7 | Done | 0002 | rls checks; e2e:cron.spec.ts |
| W-01 | Property: draft → pending → published (60-day expiry) / rejected → resubmit | 6.8 | Done | app/roodber8/actions/moderation.ts | e2e:flows/owner-listing.spec.ts |
| W-02 | Published edits go to pending_changes; auto-apply rules for verified orgs | 6.8 | Not done | lib/data/owner-listings.ts | H6: test "edit while pending changes exist" |
| W-03 | Pause and resume (no re-review if unchanged) | 6.8 | Done | lib/listing-rules.ts | unit:listing-rules.test.ts › resuming a paused listing |
| W-04 | Expire via cron; renew within 30 days after expiry | 6.8 | Done | lib/cron/daily.ts, lib/listing-rules.ts | e2e:cron.spec.ts › expires listings…; unit:listing-rules.test.ts › renewing |
| W-05 | Archive (owner); remove (admin, with reason) | 6.8 | Not done | ListingActions.tsx, moderation.ts | H6: test removed → 404 |
| W-06 | Organisation: self-signup → approve → Listed → verification → Verified | 6.8 | Done | — | e2e:flows/business.spec.ts › a contractor creates a business profile… |
| W-07 | Imported organisation → claim → owner, Claimed | 6.8 | Done | — | e2e:flows/business.spec.ts › someone claims an imported business… |
| W-08 | Enquiry statuses; unviewed > 48 h in digest | 6.8 | Done | lib/cron/daily.ts | e2e:admin/admin.spec.ts › …move an enquiry through statuses |
| W-09 | Quote: submitted → in review → quoted → accepted/declined → expired after 14 days | 6.8 | Done | app/roodber8/actions/leads.ts | e2e:flows/supplies-and-contact.spec.ts; e2e:cron.spec.ts |
| W-10 | Register interest → enquiry intent register_interest → HagerLand sales view | 6.8 | Done | app/actions/enquiry-actions.ts | e2e:flows/supplies-and-contact.spec.ts › register interest in HagerLand Developments… |

## Section 7 — Accounts, authentication and dashboards

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S7-01 | Supabase Auth via @supabase/ssr, middleware session refresh | 7.1 | Done | lib/supabase/middleware.ts | e2e:flows/* (sessions persist across pages) |
| S7-02 | Email + password sign-in | 7.1 | Done | components/auth/LoginForms.tsx | e2e:flows/owner-listing.spec.ts |
| S7-03 | Magic link sign-in | 7.1 | Not done | components/auth/LoginForms.tsx | H6: test magic link (and expired/used link) |
| S7-04 | Google OAuth, hidden unless configured | 7.1 | Not done | components/auth/GoogleButton.tsx | H6: test button hidden without NEXT_PUBLIC_GOOGLE_AUTH_ENABLED |
| S7-05 | Email confirmation required before listing; passwords ≥ 10 characters | 7.1 | Done | lib/validation/auth.ts | unit:validation.test.ts › requires 10+ character passwords…; e2e:flows/owner-listing.spec.ts › confirmation email… |
| S7-06 | Auth emails via Resend SMTP with branded templates (HTML for AB) | 7.1 | Done | docs/auth-email-templates/* | verify: four templates in docs/auth-email-templates |
| S7-07 | Guests browse, enquire and request quotes without an account | 7.1 | Done | — | e2e:flows/supplies-and-contact.spec.ts (guest quote) |
| S7-08 | Signup step 1 audience cards; step 2 details; step 3 confirm | 7.2 | Done | components/auth/SignupFlow.tsx | e2e:helpers signUp() used by flows |
| S7-09 | Onboarding: business types create an organisation; duplicate detection offers claim | 7.2 | Done | app/(account)/onboarding | e2e:flows/business.spec.ts |
| S7-10 | User can belong to several organisations, with a switcher | 7.2 | Not done | components/account/OrgSwitcher.tsx | H6: test user in two organisations switches |
| S7-11 | Overview with status cards and tasks | 7.3 | Done | app/(account)/account/page.tsx | e2e:flows/owner-listing.spec.ts |
| S7-12 | Personal lister dashboard (listings with status, views, enquiries, expiry, actions) | 7.3 | Done | app/(account)/account/listings | e2e:flows/owner-listing.spec.ts |
| S7-13 | Developer dashboard (developments, unit listings) | 7.3 | Not done | app/(account)/account/developments | add test: developer creates a development |
| S7-14 | Professional dashboard (profile, portfolio, verification) | 7.3 | Done | app/(account)/account/company | e2e:flows/business.spec.ts |
| S7-15 | Supplier dashboard products (25.2c) | 7.3 | Not done | — | H1 |
| S7-16 | Agency team members (25.2i) | 7.3 | Not done | — | H3 |
| S7-17 | Listing wizard steps 1–6 with autosave, min 3 photos, declarations | 7.4 | Done | components/account/ListingWizard.tsx | e2e:flows/owner-listing.spec.ts |
| S7-18 | Map pin on the wizard location step (25.2b) | 7.4 / 25.2b | Not done | — | E6 |
| S7-19 | Private owners limited to N active listings | 7.4 | Not done | lib/data/owner-listings.ts | H6: test private-owner cap |

## Section 8 — Property marketplace

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S8-01 | Hub: compact search, popular locations, latest sale/rent, developments, type links, agent strip, list CTA | 8.1 | Done | app/(site)/property/page.tsx | e2e:smoke.spec.ts › loads /property |
| S8-02 | Hub guide teasers (25.2g) | 8.1 | Not done | — | H2 |
| S8-03 | Results: desktop filters sidebar, mobile bottom sheet, sort, cards | 8.2 | Done | components/property/* | e2e:a11y.spec.ts (results pages, mobile and desktop) |
| S8-04 | All listed filters | 8.2 | Done | lib/property-search.ts | unit:property-search.test.ts › parses filters… |
| S8-05 | Sort options | 8.2 | Done | lib/property-search.ts | unit:property-search.test.ts › defaults sort to relevance only when searching text |
| S8-06 | At most 2 labelled Featured cards on page 1 | 8.2 | Done | components/property/PropertyResults.tsx | verify: code review WP-6 (slice(0, 2), Featured label) |
| S8-07 | Results header with count, chips, clear all | 8.2 | Done | components/property/PropertyResults.tsx | unit:property-search.test.ts › counts and removes filters |
| S8-08 | "Save this search" (25.2a) | 8.2 | Not done | — | E6 |
| S8-09 | Pagination 24 per page | 8.2 | Done | components/ui/Pagination.tsx | verify: page size 24 in lib/data/properties.ts |
| S8-10 | Empty state with widen-search and "Tell us what you're looking for" | 8.2 | Done | components/property/PropertyResults.tsx | e2e:smoke.spec.ts › loads /contact?topic=property-request |
| S8-11 | Detail sections 1–13 (breadcrumbs, gallery, title, contact, facts, description, features, location, development, info, safety, similar, professionals) | 8.3 | Done | app/(site)/property/[slug]/page.tsx | e2e:flows/owner-listing.spec.ts; e2e:a11y.spec.ts |
| S8-12 | Detail JSON-LD RealEstateListing + BreadcrumbList | 8.3 | Done | lib/jsonld.ts | e2e:seo.spec.ts › structured data… |
| S8-13 | Expired listing: 200 + noindex + "no longer available" + similar | 8.3 | Not done | app/(site)/property/[slug] | H6 test |
| S8-14 | Removed, rejected or never published: 404 | 8.3 | Not done | app/(site)/property/[slug] | H6 test |
| S8-15 | /agents and /developers: search, location, verified first then listings | 8.4 | Done | components/company/DirectoryPage.tsx | e2e:smoke.spec.ts › loads /agents; loads /developers |
| S8-16 | Company profile tabs for agents/developers | 8.4 | Done | app/(site)/company/[slug] | e2e:a11y.spec.ts (company page) |
| S8-17 | Building/development pages without listings; "List your property" CTA | 8.5 | Done | components/development/DevelopmentDetail.tsx | e2e:responsive.spec.ts (development page) |
| S8-18 | "Register for alerts" on building pages (25.2a) | 8.5 | Not done | — | E6 |
| S8-19 | Admin bulk CSV creation of developments with preview | 8.5 | Done | app/roodber8/developments/import | unit:dev-import.test.ts |

## Section 9 — Developments and HagerLand Developments

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S9-01 | /developments grid with filters; "From HagerLand" row labelled, not mixed | 9.1 | Done | app/(site)/developments/page.tsx | e2e:smoke.spec.ts › loads /developments |
| S9-02 | Development detail (all listed sections, off-plan safety note) | 9.2 | Done | components/development/DevelopmentDetail.tsx | e2e:responsive.spec.ts; e2e:a11y.spec.ts |
| S9-03 | /our-developments hub (superseded by 24.10 coming-soon page while the vertical is coming_soon; full hub when live) | 9.3 / 24.10 | Not done | app/(site)/our-developments | E8 |
| S9-04 | No fake renders or invented projects | 9.3 | Done | — | verify: page shows only published HagerLand developments |
| S9-05 | Project detail premium template with progress timeline and dated updates (25.2j) | 9.3 / 25.2j | Not done | app/(site)/our-developments/[slug] | E8 |

## Section 10 — Construction supplies

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S10-01 | Quote-based commerce, no checkout | 10.1 | Done | — | e2e:flows/supplies-and-contact.spec.ts |
| S10-02 | Supplies hub sections (hero, categories, how it works, featured if any, trade team enquiry, suppliers strip, become a supplier) | 10.2 | Done | app/(site)/supplies/page.tsx | e2e:smoke.spec.ts › loads /supplies |
| S10-03 | Delivery trust line only if set | 10.2 | Done | lib/data/business.ts | verify: delivery line hidden when delivery_area empty |
| S10-04 | Category pages: intro, chips, filters, sort, grid, custom-item CTA | 10.3 | Done | components/supplies/CategoryPage.tsx | e2e:smoke.spec.ts (category pages) |
| S10-05 | Product detail (gallery, specs, price block, stock, lead time, min qty, stepper, add to quote, seller badge, JSON-LD) | 10.4 | Done | app/(site)/supplies/product/[slug] | e2e:seo.spec.ts › structured data…; e2e:flows/supplies-and-contact.spec.ts |
| S10-06 | Quote list in localStorage (hl_quote_v1) | 10.5 | Done | components/supplies/quoteStore.ts | e2e:flows/supplies-and-contact.spec.ts |
| S10-07 | Quote list synced to account when signed in (25.2a) | 10.5 / 25.2a | Not done | — | E6 |
| S10-08 | Quote submit → reference HLQ, emails to customer and team | 10.5 | Done | app/actions/quote-actions.ts | e2e:flows/supplies-and-contact.spec.ts |
| S10-09 | Materials list upload (≤ 5 files, 15 MB) | 10.6 | Done | components/supplies/MaterialsListForm.tsx | e2e:flows/supplies-and-contact.spec.ts › a guest sends a materials list with a file |
| S10-10 | Suppliers directory with product-category filter | 10.7 | Done | app/(site)/suppliers | e2e:smoke.spec.ts › loads /suppliers |
| S10-11 | Supplier profile Products tab (25.2c) | 10.7 / 25.2c | Not done | — | H1 |
| S10-12 | Data model ready for third-party products, trade prices, special buys, brands, stock, lead times | 10.8 | Done | 0002 products | verify: columns present |

## Section 11 — Companies and professional services

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S11-01 | /professionals hub: hero, service search, category tiles, how hiring works, featured verified, join CTA | 11.1 | Done | app/(site)/professionals/page.tsx | e2e:smoke.spec.ts › loads /professionals |
| S11-02 | Service listing filters (location, verified, portfolio, licence grade) and sort | 11.2 | Done | components/company/DirectoryFilters.tsx | e2e:smoke.spec.ts › loads /professionals/architects |
| S11-03 | Company profile header, sections shown only with content, claim banner, report link, JSON-LD LocalBusiness | 11.3 | Done | app/(site)/company/[slug] | e2e:seo.spec.ts; e2e:flows/business.spec.ts |
| S11-04 | Claim flow: sign-in required, evidence, no duplicate pending claims | 11.4 | Done | app/actions/claim-actions.ts | e2e:flows/business.spec.ts › someone claims… |
| S11-05 | Verification upload and admin decision; gold tick with tooltip | 11.5 | Done | components/account/VerificationForm.tsx | e2e:flows/business.spec.ts |

## Section 12 — Enquiries, quotes and leads

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S12-01 | One EnquiryForm configured by target, Turnstile, honeypot, consent line | 12 | Done | components/enquiry/EnquiryForm.tsx | e2e:flows/owner-listing.spec.ts |
| S12-02 | Server action: validate, rate-limit (10/hour per IP, 20/day per phone), Turnstile, insert, counters, emails with reply-to and dashboard link | 12 | Done | app/actions/enquiry-actions.ts | e2e:flows/owner-listing.spec.ts (owner receives email and sees it) |
| S12-03 | Contact reveal returns one channel, logs, rate-limited; WhatsApp and Telegram links | 12 | Done | app/api/contact-reveal | e2e:security.spec.ts; unit:format.test.ts › builds WhatsApp and Telegram links |
| S12-04 | Recipient inbox: statuses, filters, detail, notes | 12 | Done | app/(account)/account/enquiries | e2e:flows/owner-listing.spec.ts |
| S12-05 | Admin enquiries, quotes, register-interest leads with filters and CSV | 12 | Done | app/roodber8/enquiries, quotes, sales, export | e2e:admin/admin.spec.ts |
| S12-06 | UTM capture in sessionStorage hl_utm, sent with forms | 12 | Done | components/enquiry/UtmCapture.tsx | verify: enquiry and quote actions store utm |

## Section 13 — Search and discovery

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S13-01 | Homepage SearchBar tabs Buy · Rent · Supplies · Professionals | 13 | Done | components/home/HomeSearch.tsx | e2e:smoke.spec.ts › loads / |
| S13-02 | Header search overlay with grouped typeahead and recent searches | 13 | Not done | components/search/SearchOverlay.tsx | add test: overlay shows grouped suggestions |
| S13-03 | /search with vertical tabs and counts | 13 | Done | app/(site)/search | e2e:smoke.spec.ts › loads /search?q=bole |
| S13-04 | Relevance weights; small verified boost; never boost is_hagerland | 13 | Done | 0005 | verify: S1-02 |
| S13-05 | Locations combobox searches name, Amharic name and path | 13 | Done | 0005 search_locations | e2e:flows/owner-listing.spec.ts |
| S13-06 | Searches tracked without the query text; zero-result queries aggregated | 13 | Done | lib/data/search.ts, record_search_miss | verify: admin reports lists search misses |
| S13-07 | Search covers the new verticals (services, jobs when live, international organisations) | 24.2 | Not done | — | E1/E3/E8 |

## Section 14 — Homepage

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S14-01 | Server component, revalidate 300, revalidateTag('home') | 14 | Done | app/(site)/page.tsx | verify: export const revalidate = 300; revalidateEntity tags home |
| S14-02 | Announcement bar from settings, hidden by default | 14.1 | Done | app/(site)/page.tsx | e2e:admin/admin.spec.ts › settings… |
| S14-03 | Hero (ink with blueprint grid), eyebrow, H1, support line (now the 24.1 lines), search card, computed quick links | 14.3 / 24.1 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S14-04 | Pillars section (superseded by the 24.3 ten-vertical ecosystem section) | 14.4 / 24.3 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows… ten ecosystem tiles… |
| S14-05 | Latest properties (tabs, featured first, hidden below 4, CTA panel instead) | 14.5 | Done | components/home/LatestProperties.tsx | e2e:smoke.spec.ts › loads / (CTA panel on empty data) |
| S14-06 | Supplies band (always shown) | 14.6 | Done | app/(site)/page.tsx | e2e:smoke.spec.ts › loads / |
| S14-07 | HagerLand Developments feature (now coming soon wording, no current-activity claims, 24.10) | 14.7 / 24.10 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows… (Our Developments block: "Hear first…", no current-project claims) |
| S14-08 | Professionals band with chips; verified cards only if any | 14.8 | Done | app/(site)/page.tsx | e2e:smoke.spec.ts › loads / |
| S14-09 | New developments (hidden if < 2) | 14.9 | Done | app/(site)/page.tsx | verify: conditional on newDevs.items.length >= 2 |
| S14-10 | Popular locations (hidden if < 10 properties) | 14.10 | Done | app/(site)/page.tsx | verify: conditional on totalProperties >= 10 |
| S14-11 | Trust strip; verified count only when ≥ threshold | 14.11 | Done | app/(site)/page.tsx | verify: conditional on verifiedBusinessCountMin |
| S14-12 | List with us audience cards with equal-width buttons; "free while we launch" only if confirmed | 14.12 | Done | app/(site)/page.tsx | verify: conditional on freeListingConfirmed |
| S14-13 | Guides teaser (25.2g, hidden until published guides exist) | 14.13 | Not done | — | H2 |
| S14-14 | Homepage JSON-LD Organization + WebSite SearchAction | 14 | Done | lib/seo.ts | e2e:seo.spec.ts › structured data… |

## Section 15 — Content

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S15-01 | /about copy (Building the land, name, what we do, why it works, standards, CTAs), updated for the ecosystem (24.11) | 15.2 / 24.11 | Not done | app/(site)/about | E9 |
| S15-02 | /how-it-works three audiences, verification levels, marketplace rules; updated for service requests (24.11) | 15.2 / 24.11 | Not done | app/(site)/how-it-works | E9 |
| S15-03 | /list-with-us anchors per audience, updated (post a job, partners) | 15.2 / 24.11 | Not done | app/(site)/list-with-us | E9 |
| S15-04 | /contact options from settings, form, quick links | 15.2 | Done | app/(site)/contact | e2e:flows/supplies-and-contact.spec.ts › …send a contact message |
| S15-05 | /help FAQs grouped with safety guidance, FAQPage JSON-LD; updated for new verticals | 15.2 / 24.11 | Not done | lib/content/help.ts | E9 |
| S15-06 | Terms, privacy, cookies rewritten with "Last updated"; updated for service requests, matching, commissions, CVs, international users, partner referrals | 15.2 / 24.11 | Not done | lib/content/legal.ts | E9 |
| S15-07 | Every email: header, body, button, plain text, footer reason; sender hello@ / supply@ | 15.3 | Not done | lib/email/* | H6 unit test of every template |
| S15-08 | Microcopy: verb buttons, actionable errors, inviting empty states | 15.4 | Done | — | verify: WP-19 proofread |
| S15-09 | Legacy sweep returns no relevant hits | 15.5 | Not done | — | re-run in E9 (new pages use the word "diaspora" legitimately: Diaspora Services vertical) |

## Section 16 — SEO

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S16-01 | Canonical host www.hagerland.com, absolute canonicals | 16 | Done | lib/site.ts, lib/seo.ts | e2e:seo.spec.ts › detail pages have absolute canonicals… |
| S16-02 | Metadata on every page; title and description templates | 16 | Not done | lib/seo.ts | E9: test titles ≤ 60 and descriptions 140–160 on key and new pages |
| S16-03 | Path facets only purpose + location; type as query param (Phase 2 type pages: 25.2l) | 16 | Done | app/(site)/property/* | e2e:smoke.spec.ts |
| S16-04 | Canonical rules: page 2+ self-canonical with "Page N"; other params → path-only canonical | 16 | Not done | lib/property-pages.ts | E9 test |
| S16-05 | Landing pages below min results → noindex, follow and excluded from sitemaps | 16 | Done | lib/sitemap-rules.ts | unit:sitemap.test.ts › keeps only paths at or above the threshold |
| S16-06 | Unique data-driven intro on landings; admin seo_intro on locations | 16 | Done | 0002 locations, lib/property-pages.ts | e2e:smoke.spec.ts › loads /property/for-sale/addis-ababa/bole |
| S16-07 | Sitemaps split by type and listed in robots.ts; robots disallow list | 16 | Done | app/sitemap.ts, app/robots.ts | e2e:seo.spec.ts › sitemaps are split by type; robots.txt blocks everything outside production |
| S16-08 | OG images for property, development, company, product and default | 16 | Done | app/og | e2e:seo.spec.ts › share images render as PNG |
| S16-09 | Performance budgets: LCP < 2.5 s, CLS < 0.1, JS < 170 KB per route | 16 | Done | — | verify: docs/qa/lighthouse-2026-10-13.md (to re-run in E9 and on the preview) |
| S16-10 | Internal linking: breadcrumbs, child and sibling areas, detail → landing | 16 | Done | — | verify: WP-15 |
| S16-11 | Amharic /am with hreflang (25.2m) | 16 / 25.2m | Not done | — | H4 |

## Section 17 — Commercial architecture

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S17-01 | Featured listings via promotions (max 2, labelled) | 17 | Done | 0002 promotions, PromotionTools | e2e:cron.spec.ts (featured sync) |
| S17-02 | organisations.plan + feature gates in lib/entitlements.ts (all plans unlimited except private-owner cap) | 17 | Not done | — | H6: add lib/entitlements.ts and use it for the owner cap |
| S17-03 | Lead ledger: enquiries per org per month in admin reports | 17 | Done | lib/admin/reports.ts | e2e:admin/admin.spec.ts (reports screen) |
| S17-04 | Commission tracking (deals table, 25.2k) | 17 / 25.2k | Done | 0014 deals | see X-252-23 |
| S17-05 | Quote values available for revenue reporting | 17 | Done | lib/admin/reports.ts | e2e:admin/admin.spec.ts (reports) |
| S17-06 | Own developments routed to HagerLand sales pipeline | 17 | Done | app/roodber8/sales | e2e:flows/supplies-and-contact.spec.ts › register interest… |
| S17-07 | Owner dashboards show views, reveals and enquiries | 17 | Done | app/(account)/account/listings | e2e:flows/owner-listing.spec.ts |

## Section 18 — Admin

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S18-01 | /roodber8-login (username + password + TOTP), 8 h httpOnly session, middleware guard, per-action checks, POST logout | 18.1 | Done | lib/admin-auth.ts, middleware.ts | e2e:admin/admin.spec.ts › admin signs in…; wrong one-time code is refused; e2e:security.spec.ts › admin login is locked after five failed attempts |
| S18-02 | Admin shell with sidebar, global search; noindex; dynamic | 18.1 | Done | app/roodber8/layout.tsx | e2e:admin/admin.spec.ts › every admin screen loads without errors |
| S18-03 | Dashboard KPIs and queues | 18.2.1 | Done | app/roodber8/page.tsx | e2e:admin/admin.spec.ts |
| S18-04 | Unified review queue with tabs, diff view, approve/reject with reason templates, request changes, bulk approve | 18.2.2 | Done | app/roodber8/review | e2e:flows/owner-listing.spec.ts (admin approves); e2e:flows/business.spec.ts |
| S18-05 | Properties table, edit, feature, mark HagerLand, notes, create on behalf | 18.2.3 | Done | app/roodber8/properties | e2e:admin/admin.spec.ts |
| S18-06 | Developments with CSV import | 18.2.4 | Done | app/roodber8/developments | unit:dev-import.test.ts |
| S18-07 | Organisations: edit, members, services, categories, documents, verification, merge | 18.2.5 | Done | app/roodber8/organisations | e2e:flows/business.spec.ts |
| S18-08 | Products: editor, specs, images, CSV price/stock update | 18.2.6 | Done | app/roodber8/products | e2e:admin/admin.spec.ts › create a product, change its price, update stock by CSV… |
| S18-09 | Categories tree editors | 18.2.7 | Done | app/roodber8/categories | e2e:admin/admin.spec.ts › add and rename a category… |
| S18-10 | Locations tree editor (Amharic names, SEO intros, active, merge); countries and international locations (24.12) | 18.2.8 / 24.12 | Done | app/roodber8/locations | e2e:admin/admin.spec.ts › …add a location; e2e:international.spec.ts › admin adds a country… |
| S18-11 | Enquiries with filters, CSV, unanswered > 48 h | 18.2.9 | Done | app/roodber8/enquiries | e2e:admin/admin.spec.ts |
| S18-12 | Quotes pipeline, issue quote with PDF and email, CSV | 18.2.10 | Done | app/roodber8/quotes | e2e:admin/admin.spec.ts › issue a quote… |
| S18-13 | HagerLand sales view | 18.2.11 | Done | app/roodber8/sales | e2e:admin/admin.spec.ts |
| S18-14 | Users: search, profile, suspend, password reset, deletion requests | 18.2.12 | Done | app/roodber8/users | e2e:admin/admin.spec.ts › suspend and restore a user |
| S18-15 | Promotions | 18.2.13 | Done | app/roodber8/promotions | e2e:admin/admin.spec.ts |
| S18-16 | Imports (Places search, import, history, AI drafts, bulk review) | 18.2.14 | Done | app/roodber8/import | e2e:admin/admin.spec.ts (screen) |
| S18-17 | Content & settings editor | 18.2.15 | Done | app/roodber8/settings | e2e:admin/admin.spec.ts › settings… |
| S18-18 | Reports with CSV | 18.2.16 | Done | app/roodber8/reports | unit:aggregate.test.ts |
| S18-19 | Audit log searchable | 18.2.17 | Done | app/roodber8/audit | e2e:admin/admin.spec.ts |
| S18-20 | Cron: expire listings + email; 7-day reminder; expire quotes; promotions; purges; digest only when needed; one cron in vercel.json | 18.3 | Done | lib/cron/daily.ts | e2e:cron.spec.ts › expires listings and quotes, sends reminders… |

## Section 19 — Security, performance, accessibility, analytics, operations

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S19-01 | Service key never in client bundles | 19.1 | Done | — | e2e:security.spec.ts › the service key never reaches the browser |
| S19-02 | Security headers incl. CSP, HSTS, nosniff, referrer, permissions, frame | 19.1 | Done | middleware.ts | e2e:security.spec.ts › every response carries the security headers |
| S19-03 | Inputs zod-validated, lengths capped, URLs http/https, YouTube only | 19.1 | Done | lib/validation/* | unit:validation.test.ts › accepts only YouTube video links |
| S19-04 | Uploads: signed URLs, type and size limits, magic bytes, re-encode, counts, private docs never public | 19.1 | Done | lib/storage.ts | e2e:security.spec.ts › upload signing refuses…; unit:sniff.test.ts |
| S19-05 | Anti-abuse: Turnstile on signup, enquiry, quote, materials list, claim, contact, report; honeypot; rate limits | 19.1 | Done | app/actions/*, app/(account)/auth-actions.ts | verify: grep (see S2-17) |
| S19-06 | Duplicate listing detection flags in admin queue | 19.1 | Not done | — | H6 |
| S19-07 | Suspended users blocked from writes (is_active_user) | 19.1 | Done | 0002, 0003 | e2e:admin/admin.spec.ts › suspend and restore a user; X-AUTH-07 extends it to every new table |
| S19-08 | Cron/webhooks require Bearer CRON_SECRET, timing-safe | 19.1 | Done | app/api/cron/daily | e2e:cron.spec.ts › refuses requests without the secret |
| S19-09 | Reports flow → admin queue | 19.1 | Done | app/actions/report-actions.ts | verify: review queue lists reports |
| S19-10 | npm audit high/critical fixed | 19.1 | Not done | — | E10 |
| S19-11 | .env.example lists every variable | 19.1 | Not done | .env.example | re-check after new variables (E9) |
| S19-12 | ISR per route; detail pages revalidate 600 + on-demand | 19.2 | Done | — | verify: WP-16 |
| S19-13 | Image pipeline sized WebP | 19.2 | Done | lib/media-actions.ts | e2e:flows/owner-listing.spec.ts |
| S19-14 | Dynamic imports for lightbox, map picker, uploader | 19.2 | Done | components/media/Gallery.tsx | verify: next/dynamic used (map picker: E6) |
| S19-15 | Vercel Analytics + Speed Insights mounted | 19.2 | Done | app/layout.tsx | verify: mounted when VERCEL is set |
| S19-16 | axe in e2e: zero serious/critical on key pages | 19.3 | Done | e2e/a11y.spec.ts | e2e:a11y.spec.ts (to be extended to every new page in E9) |
| S19-17 | Branded error, global-error and not-found pages | 19.4 | Done | app/not-found.tsx, app/global-error.tsx | e2e:smoke.spec.ts › unknown pages return a branded 404 |
| S19-18 | Server actions return typed results | 19.4 | Done | lib/action-result.ts | verify: all actions return ActionResult |
| S19-19 | lib/log.ts with no PII | 19.4 | Done | lib/log.ts | verify: maskEmail used; X-SEC-11 re-checks |
| S19-20 | errors table with throttling, in digest | 19.4 | Done | lib/error-store.ts | unit:error-store.test.ts |
| S19-21 | Analytics events (search, filter, listing view, contact reveal, enquiry, quote, materials, register interest, signup, listing, org, claim, verification) | 19.5 | Not done | lib/analytics.ts | E9: verify every event is fired (grep track) and add new-vertical events |
| S19-22 | Playwright suite, unit tests, npm scripts | 19.6 | Done | e2e/, tests/ | build |
| S19-23 | CLAUDE.md, README, .env.example, RUNBOOK | 19.7 | Not done | — | update in E9 for new features |

## Section 20 — Legacy removal and cutover

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S20-01 | Legacy URL 301s (housing, business, delivery, made-in-ethiopia, money, birrbank, jobs, cars, tutors, community, events, edit-link) | 20.2 | Done | next.config.mjs | e2e:redirects.spec.ts (/diaspora and /jobs are verticals again; old job URLs redirect to /jobs) |
| S20-02 | Old /property/{uuid} URLs 301 to /property/for-sale | 20.2 | Done | app/(site)/property/[slug] | unit:slug.test.ts › treats slugs without a short id as legacy |
| S20-03 | Legacy lockdown migration (drop public SELECT policies, revoke grants) + reverse script + verification query | 20.3 | Not done | — | 25.5 |
| S20-04 | Old API endpoints return 410 (25.4) | 20 / 25.4 | Not done | — | H6 |
| S20-05 | Cutover sequence and rollback plan | 20.4 | Not done | — | 25.5 / 25.6 |

## Section 22 — Acceptance criteria

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S22-01 | lint, typecheck, unit, e2e, build all pass on the final commit | 22 | Not done | — | 25.5 |
| S22-02 | No console errors on public pages; no 500s during a full crawl | 22 | Not done | — | 25.5 crawl |
| S22-03 | Env vars documented, validated, production configured | 22 | Not done | — | 25.5 + /api/health/full |
| S22-04 | Runbook, backup, rollback documented | 22 | Not done | docs/RUNBOOK.md | 25.5 |
| S22-05 | Every template at 5 widths; filter sheet, bottom bar, forms with keyboard | 22 | Not done | — | E9 |
| S22-06 | Visitor journeys (search, view, reveal, enquire, quote, materials list, find professional, register interest) | 22 | Done | — | e2e:flows/* |
| S22-07 | Lister journeys (sign up, org, listing with photos, approval, enquiries, renew) | 22 | Not done | — | renewal by owner needs an e2e step (H6) |
| S22-08 | Admin journeys (approve/reject, catalogue, quote, verify, taxonomy, feature, export) | 22 | Done | — | e2e:admin/admin.spec.ts; e2e:flows/* |
| S22-09 | Emails deliver from @hagerland.com with correct branding and links | 22 | Not done | — | AB checklist (Resend domain); H6 template test |
| S22-10 | Brand consistency, integrity labels | 22 | Not done | — | E9 review |
| S22-11 | Legacy sweep zero relevant hits; legacy tables private | 22 | Not done | — | E9 + cutover |
| S22-12 | Typed action results; no unhandled rejections; rate limiters; cron manual trigger | 22 | Done | — | e2e:cron.spec.ts; unit:rate-limit.test.ts |
| S22-13 | SEO-ready (titles, canonicals, noindex, sitemaps, JSON-LD, OG) | 22 | Not done | — | E9 |
| S22-14 | Scalable (unified model, indexed search, pagination, ISR, image pipeline, admin-managed trees) | 22 | Done | — | rows S6-*, F-* |
| S22-15 | Secure (RLS script, anon blocked, no key in bundle, headers, uploads, Turnstile, admin guard, secrets rotated) | 22 | Not done | — | E9 + AB checklist (rotation) |
| S22-16 | Ready for real users (legal review, real contacts, launch content) | 22 | Not done | — | AB checklist items (25.7); platform side: X-AB rows |

## Section 23 — Needs AB (platform side)

The decisions themselves are AB's (listed in `docs/LAUNCH_REPORT.md` to-do list). The platform requirement is that nothing is invented and every item is configurable.

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S23-01 | Tagline configurable; positioning lines from 24.1 in lib/brand.ts | 23.1 / 24.1 | Done | lib/brand.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S23-02 | "Free while we launch" shown only when confirmed in settings | 23.2 | Done | free_listing_confirmed | verify: S14-12 |
| S23-03 | Legal entity from settings; hidden when empty | 23.3 | Done | lib/data/business.ts | e2e:admin/admin.spec.ts › settings… |
| S23-04 | Contact details, delivery area, quote response time from settings; hidden when empty | 23.4 | Done | lib/data/business.ts | e2e:admin/admin.spec.ts › settings… |
| S23-05 | Works without brand photography; HagerLand Developments in "coming soon" state | 23.5 | Not done | — | E8 |
| S23-06 | "Why buy" claims only from settings | 23.6 | Done | developments_claims setting | verify: hidden when empty |
| S23-07 | Neighbourhoods added by AB in admin (no guessed parents) | 23.7 | Done | app/roodber8/locations | e2e:admin/admin.spec.ts › …add a location |
| S23-08 | Pages honest when empty (launch content not seeded by us) | 23.8 | Done | EmptyState everywhere | e2e:smoke.spec.ts (empty local data) |
| S23-09 | Map provider via env/settings; map hidden without a key (25.2b) | 23.9 / 25.2b | Not done | — | E6 |
| S23-10 | Google OAuth hidden unless enabled | 23.10 | Not done | — | see S7-04 |
| S23-11 | Error monitoring without Sentry (errors table + digest) | 23.11 | Done | lib/error-store.ts | unit:error-store.test.ts |
| S23-12 | Social links shown only when real (https) | 23.12 | Done | lib/data/business.ts | unit:settings.test.ts › requires https social links |

## Section 24 — Ecosystem expansion

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S24-01 | Master line "One platform for property, construction and everything around it." in lib/brand.ts | 24.1 | Done | lib/brand.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S24-02 | Support line "Find it. Buy it. Finance it. Build it. Supply it. Insure it. Maintain it. Sell it. Rent it." | 24.1 | Done | lib/brand.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S24-03 | Audience line "For Ethiopians in Ethiopia and around the world." | 24.1 | Done | lib/brand.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S24-04 | Lines used in homepage hero | 24.1 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S24-05 | Lines used in default metadata | 24.1 | Done | app/layout.tsx, app/(site)/page.tsx | verify: default title "HagerLand — Property, construction and everything around it", description = master + audience line (app/layout.tsx) |
| S24-06 | Lines used in footer | 24.1 | Done | SiteFooter.tsx | e2e:verticals.spec.ts › homepage shows… (footer contains the master line) |
| S24-07 | Integrity rules kept for own offers | 24.1 | Not done | — | re-verify after E1–E8 (S1-01, S1-02) |
| S24-10 | verticals table (key, name, slug, status live/coming_soon/hidden, sort, short description, intro, icon, SEO fields, interest_enabled, partner_signup_enabled) | 24.2 | Done | supabase/migrations/0011_vertical_registry.sql | sql: 0011 check → 10 · 6 · 11 · 2 (local) |
| S24-11 | Ten verticals seeded with default statuses (5 live + diaspora live; finance, insurance, jobs, our-developments coming soon) | 24.2 | Done | 0011 | sql: 0011 check (10 verticals, 6 live); e2e:verticals.spec.ts › homepage shows… (4 Soon tiles) |
| S24-12 | Desktop navigation reads the registry | 24.2 | Done | lib/navigation.ts, SiteHeader.tsx | e2e:verticals.spec.ts › header shows the six menus…; › hiding a vertical removes it from menus… |
| S24-13 | Homepage tiles read the registry | 24.2 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows… ten ecosystem tiles |
| S24-14 | Mobile drawer reads the registry | 24.2 | Done | MobileDrawer.tsx | e2e:verticals.spec.ts › mobile drawer lists all ten verticals… |
| S24-15 | Footer reads the registry | 24.2 | Done | SiteFooter.tsx | e2e:verticals.spec.ts › homepage shows… (footer) |
| S24-16 | Sitemap reads the registry (coming soon and hidden excluded) | 24.2 | Done | app/sitemap.ts | e2e:verticals.spec.ts › finance is a labelled coming-soon page… (static sitemap excludes /finance, includes /property) |
| S24-17 | Search reads the registry (no results from non-live verticals) | 24.2 | Done | lib/data/search.ts, app/(site)/search/page.tsx | e2e:verticals.spec.ts › a live vertical switched to coming soon… (typeahead returns no places, properties or developments) |
| S24-18 | Admin reads the registry (vertical list, labels) | 24.2 | Done | app/roodber8/verticals | e2e:admin/admin.spec.ts › every admin screen loads… (Verticals) |
| S24-19 | Admin switches a vertical's status in one click, with audit entry | 24.2 | Done | app/roodber8/actions/verticals.ts | e2e:verticals.spec.ts › hiding a vertical… the switch is audit-logged |
| S24-1A | Coming-soon landing: what, who for, how it will work | 24.2 | Done | components/verticals/ComingSoonPage.tsx, lib/content/verticals.ts | e2e:verticals.spec.ts › finance is a labelled coming-soon page… |
| S24-1B | Working "Register your interest" form: stored, listed in admin, CSV, confirmation email | 24.2 | Done | app/actions/interest-actions.ts, app/roodber8/interest | e2e:verticals.spec.ts › register interest is stored, emailed and listed in admin with CSV export |
| S24-1C | "Become a partner" form where relevant | 24.2 | Done | components/verticals/PartnerForm.tsx, app/roodber8/partners | e2e:verticals.spec.ts › become a partner is stored and listed in admin |
| S24-1D | Clearly labelled "Coming soon"; no fake listings, prices, providers or claims | 24.2 | Done | ComingSoonPage.tsx | e2e:verticals.spec.ts › finance is a labelled coming-soon page… (no rates; "Coming soon" label) |
| S24-1E | Coming-soon pages noindex until live | 24.2 | Done | middleware.ts, ComingSoonPage.tsx | e2e:verticals.spec.ts › finance… (X-Robots-Tag noindex and meta robots noindex) |
| S24-1F | "Coming soon" appears only through the registry | 24.2 | Not done | — | E9 grep |
| S24-1G | Hidden verticals: pages 404 and disappear from navigation | 24.2 | Done | components/verticals/VerticalGate.tsx | e2e:verticals.spec.ts › hiding a vertical removes it from menus and its page returns 404… |
| S24-20 | Desktop header order: Property ▾ · Building Supplies ▾ · Professionals & Contractors ▾ · Repairs & Maintenance · Diaspora Services ▾ · More ▾ · search · Sign in · List with us ▾ | 24.3 | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows the six menus in order… |
| S24-21 | More ▾ holds Finance, Insurance, Jobs & Recruitment, Our Developments | 24.3 | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… (More menu with Soon badges) |
| S24-22 | List with us ▾: Sell/let a property, List your business, Become a supplier, Join as a professional, Post a job | 24.3 | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| S24-23 | Coming-soon items show a small "Soon" badge | 24.3 | Done | SoonBadge.tsx | e2e:verticals.spec.ts › header shows… Soon badges |
| S24-24 | Mobile drawer: ten verticals + Request a service, Request a quote, Help & advice, My account | 24.3 | Done | MobileDrawer.tsx | e2e:verticals.spec.ts › mobile drawer lists all ten verticals and the service shortcuts |
| S24-25 | Homepage "Everything around your property" section: ten tiles with live/soon status | 24.3 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows… ten ecosystem tiles |
| S24-26 | Journey strip: find land → finance → design → build → supply → insure → maintain → sell or rent | 24.3 | Done | app/(site)/page.tsx | e2e:verticals.spec.ts › homepage shows… journey strip |
| S24-30 | locations.country_code (default ET); Ethiopian URLs unchanged | 24.4 | Done | supabase/migrations/0013_international.sql | sql: 0013 check → 12 · 22 · 39 · 3 · 0 (local); e2e:international.spec.ts › property pages stay Ethiopia-only |
| S24-31 | Country root locations for 12 diaspora markets | 24.4 | Done | 0013 | sql: 0013 check (12 countries) |
| S24-32 | Key cities under each country | 24.4 | Done | 0013 | sql: 0013 check (22 cities); e2e:international.spec.ts › location search… (London, United Kingdom) |
| S24-33 | Admin can add countries and cities | 24.4 | Done | app/roodber8/locations, actions/taxonomy.ts addCountryAction | e2e:international.spec.ts › admin adds a country and a city under it |
| S24-34 | organisations, service_requests, jobs, interest_registrations carry country_code and currency | 24.4 | Not done | 0011 (interest_registrations), 0013 (organisations) | organisations and interest registrations done (e2e:verticals › register interest…, e2e:international.spec.ts › a business abroad…); service_requests (E3) and jobs (E8) pending |
| S24-35 | Currency list ETB, GBP, USD, EUR, CAD, AED, SEK, NOK, SAR, ILS, ZAR, KES | 24.4 | Done | lib/countries.ts, check constraints in 0011/0013 | unit:currency.test.ts › countries |
| S24-36 | Money displayed in the record's currency | 24.4 | Not done | lib/format.ts formatMoney | unit:currency.test.ts › money in a record’s currency; used for service-request quotes in E3 |
| S24-37 | Property listings stay Ethiopia-only | 24.4 | Done | 0013 require_ethiopian_location trigger, lib/data/reference.ts isEthiopianLocation, /api/locations default scope ET | rls:A listing cannot be moved outside Ethiopia; e2e:international.spec.ts › property pages stay Ethiopia-only; › location search is Ethiopia-only… |
| S24-38 | Organisations can be marked as serving the Ethiopian community abroad | 24.4 | Done | organisations.serves_diaspora, OrganisationForm | e2e:flows/business.spec.ts › a contractor creates… (ticks the box); e2e:international.spec.ts › a business abroad… (badge) |
| S24-39 | International organisations searchable by country and city | 24.4 | Done | 0013 search_organisations(p_country_code, p_serves_diaspora), lib/data/organisations.ts | e2e:international.spec.ts › a business abroad is found by country and city… |
| S24-40 | service_requests table with all listed fields and reference HLS-YYYY-NNNNNN | 24.5 | Done | supabase/migrations/0014_service_requests.sql | sql: 0014 check → 3 · 0 · 1 (local); e2e:flows/service-requests.spec.ts › a guest requests a plumber… (reference HLS-…) |
| S24-41 | Request statuses submitted → triaged → matched → quoted → won/lost/cancelled | 24.5 | Done | 0014, app/roodber8/actions/service-requests.ts | e2e:flows/service-requests.spec.ts › a guest requests… (submitted → matched → quoted → won); › when every provider declines… (→ triaged → cancelled) |
| S24-42 | Attachments in private-docs | 24.5 | Done | lib/media.ts PRIVATE_AREAS 'request', ServiceRequestForm | e2e:flows/service-requests.spec.ts › a guest requests… (photo attached, provider opens it after accepting) |
| S24-43 | service_request_matches (offered → accepted/declined → quoted, amount, currency, message, document) | 24.5 | Done | 0014 service_request_matches | e2e:flows/service-requests.spec.ts › a guest requests… ; rls:Provider sees contact details after accepting |
| S24-44 | Commercial fields (lead fee, commission rate/amount, invoiced) admin-only | 24.5 | Done | 0014 grants (no commercial columns for users) | rls:Provider cannot read commercial fields; rls:Provider cannot change commercial fields; e2e:flows/service-requests.spec.ts › …HagerLand records its lead fee |
| S24-45 | "Request a service" reachable from every relevant page | 24.5 | Done | RequestCta (professional service pages), hubs, /request-service, drawer and footer links | e2e:repairs-contractors.spec.ts; e2e:verticals.spec.ts (drawer Request a service); e2e:smoke.spec.ts |
| S24-46 | Category-specific questions from a JSON schema per service category | 24.5 | Done | lib/service-requests/questions.ts, ServiceRequestForm | unit:service-requests.test.ts; e2e:flows/service-requests.spec.ts › a guest requests… (answers stored) |
| S24-47 | Question schema editable in admin | 24.5 | Done | app/roodber8/request-questions, components/admin/QuestionEditor.tsx | e2e:flows/service-requests.spec.ts › a guest requests… (questions set through the admin editor) |
| S24-48 | Contact details, Turnstile, confirmation email | 24.5 | Done | app/actions/service-request-actions.ts | e2e:flows/service-requests.spec.ts › a guest requests… (confirmation email); verify: verifyTurnstileToken + isHoneypotFilled in submitServiceRequestAction |
| S24-49 | Admin triage queue | 24.5 | Done | app/roodber8/service-requests | e2e:flows/service-requests.spec.ts › a guest requests…; e2e:admin/admin.spec.ts › every admin screen loads… |
| S24-4A | Match up to 3 providers, suggested by category + location + verification | 24.5 | Done | app/roodber8/service-requests/[id] (suggestions by service, nearest location, verified first) | e2e:flows/service-requests.spec.ts › a guest requests… (provider chosen from suggestions) |
| S24-4B | Providers notified by email | 24.5 | Done | matchProvidersAction, providerOfferedEmail | e2e:flows/service-requests.spec.ts › a guest requests… (provider email with link) |
| S24-4C | Provider dashboard: offered requests, accept/decline, submit quote | 24.5 | Done | app/(account)/account/requests | e2e:flows/service-requests.spec.ts › a guest requests… (accept, quote); › when every provider declines… |
| S24-4D | Customer sees quotes in account | 24.5 | Done | app/(account)/account/service-requests | verify: same RequestView as the guest page; RLS rls:Requester reads their own request / sees the quote once it is sent |
| S24-4E | Guest sees quotes by secure emailed link | 24.5 | Done | app/(site)/requests/[token] | e2e:flows/service-requests.spec.ts › a guest requests… (quote seen and chosen through the emailed link); › guest links expire… |
| S24-4F | Engine used for contractors, repairs (emergency), valuations, finance, insurance, diaspora, staffing | 24.5 | Not done | — | contractors and repairs done (e2e:repairs-contractors.spec.ts); valuations (E6), finance and insurance (E7), diaspora (E5), staffing (E8) pending |
| S24-4G | Materials quote_requests unchanged | 24.5 | Not done | — | verify: e2e supplies flow still green at E3 |
| S24-50 | Diaspora landing with two directions | 24.6 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| S24-51 | Diaspora → Ethiopia items link to verticals or the engine | 24.6 | Done | app/(site)/diaspora/page.tsx HOME_NEEDS | e2e:diaspora.spec.ts › the diaspora page offers both directions and links into the live services |
| S24-52 | Services abroad: international organisation search with request routing | 24.6 | Done | app/(site)/diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds an Ethiopian-run business… |
| S24-53 | HagerLand Property Care premium page (all listed services, the promise) | 24.6 | Done | app/(site)/diaspora/property-care | e2e:diaspora.spec.ts › an owner abroad requests a Property Care consultation… |
| S24-54 | "Request a consultation" with owner details, country, time zone, property location/type, occupancy, services | 24.6 | Done | components/diaspora/PropertyCareForm.tsx, app/actions/property-care-actions.ts | e2e:diaspora.spec.ts › an owner abroad requests… |
| S24-55 | Property Care pipeline in admin | 24.6 | Done | app/roodber8/property-care | e2e:diaspora.spec.ts › an owner abroad requests… (stage changed in admin) |
| S24-56 | No prices unless set in admin | 24.6 | Done | property_care_pricing setting | e2e:diaspora.spec.ts › Property Care prices appear only once set in admin settings |
| S24-57 | Data model: managed_properties, inspections (photos, notes), rent statements, maintenance log | 24.6 | Done | supabase/migrations/0016_property_care.sql | sql: 0016 check → 5 · 0 · 1 (local); rls:Anonymous/Signed-in user cannot read managed_properties etc. |
| S24-58 | Admin creates managed properties, inspections, statements, maintenance entries | 24.6 | Done | app/roodber8/managed-properties | e2e:diaspora.spec.ts › an owner abroad requests… (inspection with photo, statement, maintenance entry) |
| S24-59 | Owner portal hidden until enabled | 24.6 | Done | — | verify: no owner-facing routes exist; rls: signed-in users cannot read any Property Care table |
| S24-60 | Pages: Sell with HagerLand, Let with HagerLand, Buyer representation, Property sourcing for diaspora buyers, Developer sales | 24.7 | Not done | app/(site)/agency/* | E6 |
| S24-61 | Each agency page has an enquiry form | 24.7 | Not done | — | E6 |
| S24-62 | "Request a valuation" (service request type) | 24.7 | Not done | — | E6 |
| S24-63 | lister_type hagerland labelled "Marketed by HagerLand" | 24.7 | Not done | PropertyBadges | E6 |
| S24-64 | Property page: Save (account required) | 24.7 | Not done | — | E6 |
| S24-65 | Compare up to 4 properties, side-by-side page; guests via localStorage | 24.7 | Not done | — | E6 |
| S24-66 | Property page: Request a valuation | 24.7 | Not done | — | E6 |
| S24-67 | "Ask about financing": finance interest when coming soon, service request when live | 24.7 | Not done | — | E6 |
| S24-70 | Finance landing with all categories, "provided through approved, licensed partners" | 24.8 | Not done | — | E7 |
| S24-71 | Insurance landing with all categories, same partner statement | 24.8 | Not done | — | E7 |
| S24-72 | Register interest by category | 24.8 | Not done | — | E7 |
| S24-73 | Become a partner for banks, lenders, insurers, brokers | 24.8 | Not done | — | E7 |
| S24-74 | No rates, quotes, advice or eligibility statements | 24.8 | Not done | — | E7 review |
| S24-75 | When live, requests go through the engine to partner organisations | 24.8 | Not done | — | E7 |
| S24-76 | New organisation kinds lender, insurer, broker | 24.8 | Not done | migration | E3/E7 |
| S24-80 | jobs table (employer org, title, category, type, location/country, salary + currency optional, description, requirements, closing date, moderated status, expiry) | 24.9 | Not done | migration | E8 |
| S24-81 | Employer dashboard: post and manage jobs | 24.9 | Not done | — | E8 |
| S24-82 | Employer views applications | 24.9 | Not done | — | E8 |
| S24-83 | Public job board with filters | 24.9 | Not done | — | E8 |
| S24-84 | Apply with CV (PDF/DOCX only, size limit, private-docs) and cover note | 24.9 | Not done | — | E8 |
| S24-85 | Candidate profile, opt-in, private by default | 24.9 | Not done | — | E8 |
| S24-86 | "Submit a staffing requirement" (service request type) | 24.9 | Not done | — | E8 |
| S24-87 | Admin job moderation and applications overview | 24.9 | Not done | — | E8 |
| S24-88 | CVs never public; candidates control visibility; retention in privacy policy | 24.9 | Not done | — | E8 + rls test |
| S24-89 | While coming soon: landing + employer and candidate interest forms | 24.9 | Not done | — | E8 |
| S24-90 | Our Developments coming-soon page (intent, supply-and-build advantage, register interest, no claims of activity) | 24.10 | Not done | app/(site)/our-developments | E8 |
| S24-91 | Templates and data model intact; projects appear when published and the vertical is live | 24.10 | Not done | — | E8 test |
| S24-A1 | Homepage, about, how-it-works, list-with-us, help, footer and metadata updated | 24.11 | Not done | — | E9 |
| S24-A2 | Terms and privacy updated (service requests, matching, commissions, CVs, international users, partner referrals, no regulated advice) | 24.11 | Not done | lib/content/legal.ts | E9 |
| S24-A3 | Regulatory checks flagged in LAUNCH_REPORT.md | 24.11 | Not done | docs/LAUNCH_REPORT.md | E9 |
| S24-B1 | Admin: vertical registry switches | 24.12 | Done | app/roodber8/verticals | e2e:verticals.spec.ts › hiding a vertical… (switched through the admin screen) |
| S24-B2 | Admin: interest registrations with vertical/category filter and CSV | 24.12 | Done | app/roodber8/interest, export/interest | e2e:verticals.spec.ts › register interest… listed in admin with CSV export |
| S24-B3 | Admin: partner applications | 24.12 | Done | app/roodber8/partners | e2e:verticals.spec.ts › become a partner is stored and listed in admin |
| S24-B4 | Admin: service request triage and matching board | 24.12 | Done | app/roodber8/service-requests | e2e:flows/service-requests.spec.ts › a guest requests… |
| S24-B5 | Admin: provider quotes | 24.12 | Done | app/roodber8/service-requests/[id] (quotes per match) | e2e:flows/service-requests.spec.ts › a guest requests… |
| S24-B6 | Admin: commissions and lead-fee ledger with simple reports | 24.12 | Done | app/roodber8/deals, lib/admin/aggregate.ts monthlyReport | unit:aggregate.test.ts › monthly revenue and lead report; e2e:flows/service-requests.spec.ts (deal created on choice); e2e:admin/admin.spec.ts (Deals screen) |
| S24-B7 | Admin: Property Care pipeline and managed-property records | 24.12 | Done | app/roodber8/property-care, app/roodber8/managed-properties | e2e:diaspora.spec.ts › an owner abroad requests… |
| S24-B8 | Admin: jobs and applications moderation | 24.12 | Not done | — | E8 |
| S24-B9 | Admin: question-schema editor per service category | 24.12 | Done | app/roodber8/request-questions | e2e:flows/service-requests.spec.ts › a guest requests… |
| S24-BA | Admin: countries and international locations in the locations editor | 24.12 | Done | app/roodber8/locations | e2e:international.spec.ts › admin adds a country and a city under it; e2e:admin/admin.spec.ts › add and rename a category, add a location |
| S24-BB | Every new admin action audit-logged | 24.12 | Not done | — | each package + E9 test |
| S24-C1 | E9: sitemap respects registry; noindex for coming soon; full QA re-run (accessibility, widths, link crawl, Lighthouse) | 24 WPs | Not done | — | E9 |
| S24-C2 | E10: Next.js 15 upgrade fully green, or clean revert with documented reasons | 24 WPs | Not done | — | E10 |
| S24-C3 | E10: npm audit run and reported | 24 WPs | Not done | — | E10 |
| S24-C4 | LAUNCH_REPORT updated: additions with evidence, page-by-page checklist, AB to-do list, vertical defaults | 24 | Not done | docs/LAUNCH_REPORT.md | 25.5 |

## PLATFORM_VISION.md

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| V1-01 | Building supplies category: Cement | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-02 | Building supplies category: Reinforcement steel | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-03 | Building supplies category: Blocks and bricks | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-04 | Building supplies category: Sand and aggregates | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-05 | Building supplies category: Roofing materials | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-06 | Building supplies category: Electrical materials | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-07 | Building supplies category: Plumbing materials | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-08 | Building supplies category: Tiles and flooring | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-09 | Building supplies category: Paint and decorating materials | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-10 | Building supplies category: Doors and windows | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-11 | Building supplies category: Sanitary ware | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-12 | Building supplies category: Kitchens | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-13 | Building supplies category: Lighting | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-14 | Building supplies category: Hardware and tools | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-15 | Building supplies category: Timber | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-16 | Building supplies category: Construction equipment | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-17 | Building supplies category: Interior finishing materials | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-18 | Building supplies category: Landscaping materials | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-19 | Building supplies category: Safety equipment | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-20 | Building supplies category: Specialist construction products | Vision §1 | Not done | product_categories seed | sql: category present and active (H1 check) |
| V1-21 | Own products and third-party suppliers' products | Vision §1 | Not done | products.seller_org_id | H1 (25.2c) |
| V2-01 | Property marketplace: Buy property | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-02 | Property marketplace: Sell property | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-03 | Property marketplace: Rent property | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-04 | Property marketplace: Let property | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-05 | Property marketplace: Search new developments | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-06 | Property marketplace: Search commercial property | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-07 | Property marketplace: Search land | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-08 | Property marketplace: Search investment opportunities | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-09 | Property marketplace: Search by city, sub-city, district and neighbourhood | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-10 | Property marketplace: Contact agents, developers and owners | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-11 | Property marketplace: Save properties | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-12 | Property marketplace: Compare opportunities | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-13 | Property marketplace: Submit property enquiries | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-14 | Property marketplace: Request valuations | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-15 | Property marketplace: Advertise properties | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V2-16 | Property marketplace: Serves domestic and diaspora buyers | Vision §2 | Not done | — | see linked S8/S24 rows; verified in E6 |
| V3-01 | Estate agency service: Property sales | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-02 | Estate agency service: Property letting | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-03 | Estate agency service: Buyer representation | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-04 | Estate agency service: Seller representation | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-05 | Estate agency service: Property sourcing | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-06 | Estate agency service: Property marketing | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-07 | Estate agency service: Property valuation coordination | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-08 | Estate agency service: Viewing coordination | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-09 | Estate agency service: Negotiation assistance | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-10 | Estate agency service: Diaspora property acquisition assistance | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-11 | Estate agency service: Developer sales | Vision §3 | Not done | agency pages + service categories | E6 |
| V3-12 | Estate agency service: Investment property sourcing | Vision §3 | Not done | agency pages + service categories | E6 |
| V4-01 | Contractor category: General contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-02 | Contractor category: House builders | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-03 | Contractor category: Renovation contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-04 | Contractor category: Civil contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-05 | Contractor category: Electrical contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-06 | Contractor category: Plumbing contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-07 | Contractor category: Roofing contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-08 | Contractor category: Painting contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-09 | Contractor category: Flooring specialists | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-10 | Contractor category: Carpenters | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-11 | Contractor category: Joiners | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-12 | Contractor category: Tilers | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-13 | Contractor category: Plasterers | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-14 | Contractor category: Welders | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-15 | Contractor category: Aluminium specialists | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-16 | Contractor category: HVAC contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-17 | Contractor category: Landscaping contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-18 | Contractor category: Interior contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-19 | Contractor category: Groundworks contractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-20 | Contractor category: Specialist subcontractors | Vision §4 | Done | 0007/0015 service_categories, app/(site)/contractors | e2e:repairs-contractors.spec.ts › the contractors hub offers… (new types); sql: 0015 check; verify: other types exist since 0007 (general, renovation, road & civil, roofers, painters, flooring, carpenters & joiners, tilers, plasterers, welders, aluminium & glass, HVAC, landscaping, excavation, specialised) |
| V4-21 | Customers submit requirements and request quotations from providers | Vision §4 | Done | service request engine | e2e:flows/service-requests.spec.ts (all) |
| V5-01 | Professional category: Architects | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-02 | Professional category: Civil engineers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-03 | Professional category: Structural engineers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-04 | Professional category: Electrical engineers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-05 | Professional category: Mechanical engineers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-06 | Professional category: Quantity surveyors | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-07 | Professional category: Land surveyors | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-08 | Professional category: Interior designers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-09 | Professional category: Planning consultants | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-10 | Professional category: Project managers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-11 | Professional category: Construction managers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-12 | Professional category: Property valuers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-13 | Professional category: Property consultants | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-14 | Professional category: Property legal professionals | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-15 | Professional category: Property accountants and tax advisers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-16 | Professional category: Mortgage/finance advisers | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-17 | Professional category: Insurance professionals | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-18 | Professional category: Environmental consultants | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-19 | Professional category: Other specialist professionals | Vision §5 | Done | 0007/0015 service_categories | sql: select count(*) from service_categories where slug in (architects, civil-engineers, structural-engineers, electrical-engineers, mechanical-engineers, quantity-surveyors, land-surveyors, interior-designers, planning-consultants, project-managers, construction-managers, property-valuers, property-consultants, property-lawyers, property-accountants, mortgage-finance, insurance-professionals, environmental-consultants, other-specialists) → 19 (local) |
| V5-20 | Professional profile: qualifications, services, areas covered, portfolio, enquiry, verification | Vision §5 | Done | organisations.qualifications (0015), OrganisationForm, company profile | e2e:repairs-contractors.spec.ts › a professional profile shows qualifications |
| V6-01 | Repairs & maintenance request type: Plumbing repairs | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-02 | Repairs & maintenance request type: Electrical repairs | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-03 | Repairs & maintenance request type: Painting | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-04 | Repairs & maintenance request type: Roofing repairs | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-05 | Repairs & maintenance request type: Appliance repair | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-06 | Repairs & maintenance request type: Carpentry | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-07 | Repairs & maintenance request type: Locksmith services | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-08 | Repairs & maintenance request type: Drainage | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-09 | Repairs & maintenance request type: Cleaning | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-10 | Repairs & maintenance request type: Gardening | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-11 | Repairs & maintenance request type: Pest control | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-12 | Repairs & maintenance request type: Property inspections | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-13 | Repairs & maintenance request type: General handyman services | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-14 | Repairs & maintenance request type: Preventative maintenance | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-15 | Repairs & maintenance request type: Emergency repairs | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-16 | Repairs & maintenance request type: Property refurbishment | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V6-17 | Repairs & maintenance request type: Property management support | Vision §6 | Done | supabase/migrations/0015_repairs_contractors.sql, app/(site)/repairs-maintenance | e2e:repairs-contractors.spec.ts › the repairs hub lists every repair service…; sql: 0015 check → 17 |
| V7-01 | Insurance category: Home insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-02 | Insurance category: Building insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-03 | Insurance category: Landlord insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-04 | Insurance category: Commercial property insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-05 | Insurance category: Construction insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-06 | Insurance category: Contractor insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-07 | Insurance category: Contents insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-08 | Insurance category: Professional indemnity insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-09 | Insurance category: Public liability insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-10 | Insurance category: Development/project insurance | Vision §7 | Not done | insurance landing + categories | E7 |
| V7-11 | Users can request insurance quotations matched to providers (when live) | Vision §7 | Not done | engine | E7 |
| V7-12 | Regulated activity only once licences/partners exist; labelled Coming soon / Register interest / Provided through approved partners | Vision §7 | Not done | registry | E7 |
| V8-01 | Finance category: Mortgage providers | Vision §8 | Not done | finance landing + categories | E7 |
| V8-02 | Finance category: Banks | Vision §8 | Not done | finance landing + categories | E7 |
| V8-03 | Finance category: Housing finance providers | Vision §8 | Not done | finance landing + categories | E7 |
| V8-04 | Finance category: Construction finance | Vision §8 | Not done | finance landing + categories | E7 |
| V8-05 | Finance category: Development finance | Vision §8 | Not done | finance landing + categories | E7 |
| V8-06 | Finance category: Bridging finance | Vision §8 | Not done | finance landing + categories | E7 |
| V8-07 | Finance category: Commercial property finance | Vision §8 | Not done | finance landing + categories | E7 |
| V8-08 | Finance category: Diaspora mortgage products | Vision §8 | Not done | finance landing + categories | E7 |
| V8-09 | Finance category: Land financing | Vision §8 | Not done | finance landing + categories | E7 |
| V8-10 | Finance category: Home-improvement finance | Vision §8 | Not done | finance landing + categories | E7 |
| V8-11 | Finance category: Supplier credit | Vision §8 | Not done | finance landing + categories | E7 |
| V8-12 | Finance category: Equipment finance | Vision §8 | Not done | finance landing + categories | E7 |
| V8-13 | Finance enquiry from property, construction project and development pages | Vision §8 | Not done | Ask about financing | E6/E7 |
| V8-14 | Regulated finance only transactional once arrangements exist | Vision §8 | Not done | registry | E7 |
| V9-01 | Diaspora → Ethiopia: Buying property in Ethiopia | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-02 | Diaspora → Ethiopia: Building a house in Ethiopia | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-03 | Diaspora → Ethiopia: Renovating family property | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-04 | Diaspora → Ethiopia: Finding contractors | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-05 | Diaspora → Ethiopia: Purchasing construction materials | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-06 | Diaspora → Ethiopia: Supervising construction | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-07 | Diaspora → Ethiopia: Finding architects or engineers | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-08 | Diaspora → Ethiopia: Maintaining property | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-09 | Diaspora → Ethiopia: Insurance | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-10 | Diaspora → Ethiopia: Financing | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-11 | Diaspora → Ethiopia: Property management | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-12 | Diaspora → Ethiopia: Investment | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-13 | Diaspora → Ethiopia: Verification and due diligence | Vision §9 | Done | app/(site)/diaspora/page.tsx | e2e:diaspora.spec.ts › the diaspora page offers both directions… |
| V9-14 | Services abroad provider type: Plumbers | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-15 | Services abroad provider type: Electricians | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-16 | Services abroad provider type: Builders | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-17 | Services abroad provider type: Decorators | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-18 | Services abroad provider type: Architects | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-19 | Services abroad provider type: Engineers | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-20 | Services abroad provider type: Property agents | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-21 | Services abroad provider type: Mortgage advisers | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-22 | Services abroad provider type: Insurance professionals | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-23 | Services abroad provider type: Surveyors | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-24 | Services abroad provider type: Conveyancing/property lawyers | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-25 | Services abroad provider type: Cleaners | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-26 | Services abroad provider type: Handymen | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-27 | Services abroad provider type: Removal companies | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-28 | Services abroad provider type: Other home and property services | Vision §9 | Done | service categories + /diaspora/services-abroad | e2e:diaspora.spec.ts › services abroad finds…; verify: categories exist (plumbers, electricians, building-contractors, painters, architects, civil/structural engineers, estate-agents, mortgage-finance, insurance-professionals, land-surveyors, property-lawyers, cleaning, general-handyman, movers, other-specialists) |
| V9-29 | Customer abroad submits requirement, platform matches provider, earns commission/referral/lead/booking fee | Vision §9 | Done | matches + deals ledger | e2e:flows/service-requests.spec.ts › a guest requests… (deal with lead fee) |
| V9-30 | Architecture international from the outset; Ethiopia core | Vision §9 | Done | lib/countries.ts, 0013 | e2e:international.spec.ts (all tests) |
| V9-31 | Property Care: Manages the property | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-32 | Property Care: Maintains | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-33 | Property Care: Secures | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-34 | Property Care: Monitors | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-35 | Property Care: Tenant management | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-36 | Property Care: Property rental | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-37 | Property Care: Rent collection | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-38 | Property Care: Inspections | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-39 | Property Care: Maintenance coordination | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-40 | Property Care: Representation of the owner | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-41 | Property Care: Managed sale on request | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V9-42 | Property Care: Removes dependence on friends and relatives (promise) | Vision §9 | Done | lib/property-care.ts CARE_SERVICES, property-care page | e2e:diaspora.spec.ts › an owner abroad requests… (services shown and chosen) |
| V10-01 | Job category: Construction jobs | Vision §10 | Not done | job categories | E8 |
| V10-02 | Job category: Engineering jobs | Vision §10 | Not done | job categories | E8 |
| V10-03 | Job category: Architecture jobs | Vision §10 | Not done | job categories | E8 |
| V10-04 | Job category: Skilled trades | Vision §10 | Not done | job categories | E8 |
| V10-05 | Job category: Project-management positions | Vision §10 | Not done | job categories | E8 |
| V10-06 | Job category: Property jobs | Vision §10 | Not done | job categories | E8 |
| V10-07 | Job category: Estate-agency jobs | Vision §10 | Not done | job categories | E8 |
| V10-08 | Job category: Sales positions | Vision §10 | Not done | job categories | E8 |
| V10-09 | Job category: Site management | Vision §10 | Not done | job categories | E8 |
| V10-10 | Job category: Quantity surveying | Vision §10 | Not done | job categories | E8 |
| V10-11 | Job category: Procurement | Vision §10 | Not done | job categories | E8 |
| V10-12 | Job category: Administration | Vision §10 | Not done | job categories | E8 |
| V10-13 | Job category: Finance | Vision §10 | Not done | job categories | E8 |
| V10-14 | Job category: Graduate opportunities | Vision §10 | Not done | job categories | E8 |
| V10-15 | Job category: Temporary labour | Vision §10 | Not done | job categories | E8 |
| V10-16 | Job category: Permanent recruitment | Vision §10 | Not done | job categories | E8 |
| V10-17 | Job category: Executive recruitment | Vision §10 | Not done | job categories | E8 |
| V10-18 | Job category: International placements | Vision §10 | Not done | job categories | E8 |
| V10-19 | Employers advertise vacancies | Vision §10 | Not done | jobs vertical | E8 |
| V10-20 | Employers search candidates (opted-in only) | Vision §10 | Not done | jobs vertical | E8 |
| V10-21 | Employers request recruitment assistance | Vision §10 | Not done | jobs vertical | E8 |
| V10-22 | Employers submit staffing requirements | Vision §10 | Not done | jobs vertical | E8 |
| V10-23 | Candidates create profiles | Vision §10 | Not done | jobs vertical | E8 |
| V10-24 | Candidates upload CVs | Vision §10 | Not done | jobs vertical | E8 |
| V10-25 | Candidates list qualifications | Vision §10 | Not done | jobs vertical | E8 |
| V10-26 | Candidates list experience | Vision §10 | Not done | jobs vertical | E8 |
| V10-27 | Candidates search vacancies | Vision §10 | Not done | jobs vertical | E8 |
| V10-28 | Candidates apply for jobs | Vision §10 | Not done | jobs vertical | E8 |
| V10-29 | Candidates register for placement | Vision §10 | Not done | jobs vertical | E8 |
| V10-30 | Revenue fields: job ads, recruitment fees, placement commissions | Vision §10 | Not done | jobs vertical | E8 |
| V11-01 | Our Developments shows Coming Soon; no impression developments exist | Vision §11 | Not done | our-developments | E8 |
| V11-02 | Supporting message: intends to develop selected residential and potentially commercial projects | Vision §11 | Not done | our-developments | E8 |
| V11-03 | When live: current, coming-soon and completed developments | Vision §11 | Not done | our-developments | E8 |
| V11-04 | When live: available units, floor plans, prices | Vision §11 | Not done | our-developments | E8 |
| V11-05 | When live: construction progress and development updates | Vision §11 | Not done | our-developments | E8 |
| V11-06 | When live: register interest and viewing requests | Vision §11 | Not done | our-developments | E8 |
| V11-07 | Supply-chain advantage explained | Vision §11 | Not done | our-developments | E8 |
| V12-01 | Verticals cross-link as one ecosystem (land → finance → architect → engineer → contractor → materials → insurance → maintenance → sell/rent → recruit) | Vision: model/positioning/launch | Not done | — | E1/E9 |
| V12-02 | Positioning: not only a supplier, agent or directory | Vision: model/positioning/launch | Not done | — | E1/E9 |
| V12-03 | Ten-vertical top-level structure | Vision: model/positioning/launch | Done | lib/verticals.ts | e2e:verticals.spec.ts › homepage shows… ten ecosystem tiles |
| V12-04 | Supporting area: Sell/List a property | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| V12-05 | Supporting area: List your business | Vision: model/positioning/launch | Not done | — | E1/E9 |
| V12-06 | Supporting area: Become a supplier | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| V12-07 | Supporting area: Join as a professional | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| V12-08 | Supporting area: Post a job | Vision: model/positioning/launch | Not done | — | E1/E9 |
| V12-09 | Supporting area: Request a service | Vision: model/positioning/launch | Done | /request-service | e2e:smoke.spec.ts › loads /request-service; e2e:flows/service-requests.spec.ts |
| V12-10 | Supporting area: Request a quote | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › mobile drawer… (Request a quote) |
| V12-11 | Supporting area: Advertise | Vision: model/positioning/launch | Done | app/(site)/advertise/page.tsx | e2e:smoke.spec.ts › loads /advertise |
| V12-12 | Supporting area: Help & advice | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › mobile drawer… (Help & advice) |
| V12-13 | Supporting area: My account | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › mobile drawer… (My account) |
| V12-14 | Non-live services use Coming soon / Register interest / Request information / Waiting list / Become a partner | Vision: model/positioning/launch | Done | ComingSoonPage.tsx | e2e:verticals.spec.ts › register interest…; › become a partner… |
| V12-15 | Never pretend a service exists before it is ready | Vision: model/positioning/launch | Not done | — | E1/E9 |

## Section 25 — Completeness, hardening and go-live

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| X-MAT-01 | Requirements matrix covers spec 1–25 and the vision; zero Not done at the end | 25.1 | Not done | docs/REQUIREMENTS_MATRIX.md | scripts/matrix-summary.sh |
| X-252-01 | Saved properties, products and companies in the account | 25.2a | Not done | — | E6 |
| X-252-02 | Saved searches with email alerts (instant, daily, weekly), unsubscribe link, cron | 25.2a | Not done | — | E6 |
| X-252-03 | Quote list synced to the account when signed in | 25.2a | Not done | — | E6 |
| X-252-04 | Map search for properties | 25.2b | Not done | — | E6 |
| X-252-05 | Location pin picker in the listing wizard | 25.2b | Not done | — | E6 |
| X-252-06 | Tile provider from env/site settings; map hidden without a key | 25.2b | Not done | — | E6 |
| X-252-07 | Supplier self-serve product listings with moderation | 25.2c | Not done | — | H1 |
| X-252-08 | Supplier products tab on company profile | 25.2c | Not done | — | H1 |
| X-252-09 | org_product_categories filters | 25.2c | Not done | — | H1 |
| X-252-10 | Special Buys: quantities, was-price, end date | 25.2d | Not done | — | H1 |
| X-252-11 | Special Buys auto-hide when expired or sold out | 25.2d | Not done | — | H1 |
| X-252-12 | Special Buys admin-managed; /supplies/special-buys | 25.2d | Not done | — | H1 |
| X-252-13 | Trade application and admin approval | 25.2e | Not done | — | H1 |
| X-252-14 | Trade price shown only to approved trade accounts, never public | 25.2e | Not done | — | H1 |
| X-252-15 | Approximate prices in the visitor's chosen currency; admin rates with last-updated date; labelled approx.; ETB price of record | 25.2f | Done | 0013 exchange_rates(+ public view), app/roodber8/exchange-rates, components/currency/* | e2e:international.spec.ts › approximate prices appear only after rates are set and the visitor picks a currency |
| X-252-16 | /guides hub with admin editor (draft/publish, SEO, FAQ schema) | 25.2g | Not done | — | H2 |
| X-252-17 | Starter guides only as unpublished drafts marked Needs AB review | 25.2g | Not done | — | H2 |
| X-252-18 | Build-cost estimator from admin rates per m² by finish and location; 'estimate only'; hidden until rates exist | 25.2h | Not done | — | H2 |
| X-252-19 | Team members: invite by email, roles, remove | 25.2i | Not done | — | H3 |
| X-252-20 | Ownership transfer with last-owner protection | 25.2i | Not done | — | H3 |
| X-252-21 | Agent/company branches | 25.2i | Not done | — | H3 |
| X-252-22 | Development progress updates (dated posts with photos) | 25.2j | Not done | — | E8 |
| X-252-23 | Deals/commission tracking linked to enquiries and service requests | 25.2k | Done | 0014 deals, chooseQuoteAction, app/roodber8/deals | e2e:flows/service-requests.spec.ts › a guest requests… (deal won with value); admin deals form |
| X-252-24 | Monthly revenue and lead reports with CSV | 25.2k | Done | app/roodber8/deals, export report-revenue | unit:aggregate.test.ts › monthly revenue and lead report; e2e:admin/admin.spec.ts (Deals screen) |
| X-252-25 | Path-based property-type SEO pages respecting min-results noindex | 25.2l | Not done | — | E6 |
| X-252-26 | i18n architecture for UI text | 25.2m | Not done | — | H4 |
| X-252-27 | /am locale with hreflang and Ethiopic font | 25.2m | Not done | — | H4 |
| X-252-28 | Machine-assisted Amharic marked needs native review; locale off by default behind admin switch | 25.2m | Not done | — | H4 |
| X-252-29 | /api/health public ok/version only | 25.2n | Not done | — | H5 |
| X-252-30 | /api/health/full with CRON_SECRET bearer: env presence, DB, Resend domain, buckets, migrations — booleans only | 25.2n | Not done | — | H5 |
| X-253-01 | Online payments/checkout (Chapa, Telebirr, cards): integration point + admin 'not configured' | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-02 | SMS/phone OTP login: integration point | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-03 | WhatsApp Business API notifications: integration point | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-04 | Live bank/insurer/mortgage partner APIs: integration point | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-05 | Native mobile apps | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-AUTH-01 | Unconfirmed email cannot list/publish | 25.4 | Not done | — | H6/E9 |
| X-AUTH-02 | Expired or used magic link handled | 25.4 | Not done | — | H6/E9 |
| X-AUTH-03 | Expired or used reset link handled | 25.4 | Not done | — | H6/E9 |
| X-AUTH-04 | Session expiry mid-form preserves input | 25.4 | Not done | — | H6/E9 |
| X-AUTH-05 | Sign-out | 25.4 | Not done | — | H6/E9 |
| X-AUTH-06 | Account deletion request flow per privacy policy | 25.4 | Not done | — | H6/E9 |
| X-AUTH-07 | Export my data request | 25.4 | Not done | — | H6/E9 |
| X-AUTH-08 | Suspended users blocked from all writes (every table) | 25.4 | Not done | — | H6/E9 |
| X-AUTH-09 | User in multiple organisations | 25.4 | Not done | — | H6/E9 |
| X-AUTH-10 | Org owner leaving: last-owner protection | 25.4 | Not done | — | H6/E9 |
| X-AUTH-11 | Duplicate signups handled without enumeration | 25.4 | Not done | — | H6/E9 |
| X-AUTH-12 | Google sign-in hidden unless configured | 25.4 | Not done | — | H6/E9 |
| X-LST-01 | Draft autosave | 25.4 | Not done | — | H6/E9 |
| X-LST-02 | Edit while pending changes exist | 25.4 | Not done | — | H6/E9 |
| X-LST-03 | Renewal windows | 25.4 | Not done | — | H6/E9 |
| X-LST-04 | Expired URL 200 + noindex | 25.4 | Not done | — | H6/E9 |
| X-LST-05 | Paused/removed/rejected URL 404 | 25.4 | Not done | — | H6/E9 |
| X-LST-06 | Slug and short_id collision retry | 25.4 | Not done | — | H6/E9 |
| X-LST-07 | Private-owner cap | 25.4 | Not done | — | H6/E9 |
| X-LST-08 | Photo minimum and maximum | 25.4 | Not done | — | H6/E9 |
| X-LST-09 | Failed/oversized/HEIC/corrupt uploads | 25.4 | Not done | — | H6/E9 |
| X-LST-10 | EXIF stripped | 25.4 | Not done | — | H6/E9 |
| X-LST-11 | Location renamed/merged/deactivated | 25.4 | Not done | — | H6/E9 |
| X-LST-12 | Price on request | 25.4 | Not done | — | H6/E9 |
| X-LST-13 | Negotiable | 25.4 | Not done | — | H6/E9 |
| X-LST-14 | Rent vs sale validation | 25.4 | Not done | — | H6/E9 |
| X-LST-15 | Duplicate-listing flag | 25.4 | Not done | — | H6/E9 |
| X-SRCH-01 | Empty query | 25.4 | Not done | — | H6/E9 |
| X-SRCH-02 | Very long query | 25.4 | Not done | — | H6/E9 |
| X-SRCH-03 | Special characters % _ , ( ) quotes | 25.4 | Not done | — | H6/E9 |
| X-SRCH-04 | Ethiopic script | 25.4 | Not done | — | H6/E9 |
| X-SRCH-05 | Out-of-range pages | 25.4 | Not done | — | H6/E9 |
| X-SRCH-06 | Invalid filter values | 25.4 | Not done | — | H6/E9 |
| X-SRCH-07 | Invalid sort | 25.4 | Not done | — | H6/E9 |
| X-SRCH-08 | Zero-result logging | 25.4 | Not done | — | H6/E9 |
| X-FORM-01 | Turnstile failure | 25.4 | Not done | — | H6/E9 |
| X-FORM-02 | Honeypot | 25.4 | Not done | — | H6/E9 |
| X-FORM-03 | Rate-limit messages | 25.4 | Not done | — | H6/E9 |
| X-FORM-04 | Double submit | 25.4 | Not done | — | H6/E9 |
| X-FORM-05 | Server error with input preserved | 25.4 | Not done | — | H6/E9 |
| X-FORM-06 | Email failure never blocks submission (logged, visible to admin, retried by cron) | 25.4 | Not done | — | H6/E9 |
| X-SR-01 | No matching provider: customer informed, admin alerted | 25.4 | Done | noProviderAction, serviceNoProviderEmail | e2e:flows/service-requests.spec.ts › when every provider declines… (customer emailed); digest line "waiting to be matched" |
| X-SR-02 | All providers decline | 25.4 | Done | checkAllDeclined | e2e:flows/service-requests.spec.ts › when every provider declines, the request goes back to HagerLand and admins are told |
| X-SR-03 | Quote expiry | 25.4 | Done | lib/service-requests/labels.ts isQuoteExpired, chooseQuoteAction | unit:service-requests.test.ts › quote expiry; verify: expired quotes cannot be chosen (chooseQuoteAction) |
| X-SR-04 | Guest secure-link expiry and re-send | 25.4 | Done | app/(site)/requests/[token], resendRequestLinkAction | e2e:flows/service-requests.spec.ts › guest links expire, and a new one can be requested without revealing whether a request exists |
| X-SR-05 | Emergency priority in admin and digest | 25.4 | Done | adminNoticeEmail EMERGENCY, cron digest, queue order | e2e:flows/service-requests.spec.ts › a guest requests… (EMERGENCY admin email) |
| X-SR-06 | International location and currency | 25.4 | Done | 0014 service_requests_sync_country | e2e:flows/service-requests.spec.ts › guest links expire… (London, GB, GBP) |
| X-ADM-01 | Every action permission-checked server-side and audit-logged | 25.4 | Not done | — | H6/E9 |
| X-ADM-02 | Bulk actions report partial failures | 25.4 | Not done | — | H6/E9 |
| X-ADM-03 | CSV imports: validation preview, no partial writes | 25.4 | Not done | — | H6/E9 |
| X-ADM-04 | Session expiry mid-action | 25.4 | Not done | — | H6/E9 |
| X-ADM-05 | Concurrent edit protection (updated_at check) | 25.4 | Not done | — | H6/E9 |
| X-MAIL-01 | Every transactional email listed | 25.4 | Not done | — | H6/E9 |
| X-MAIL-02 | HTML + plain text | 25.4 | Not done | — | H6/E9 |
| X-MAIL-03 | Correct sender and reply-to | 25.4 | Not done | — | H6/E9 |
| X-MAIL-04 | User content escaped | 25.4 | Not done | — | H6/E9 |
| X-MAIL-05 | Marketing only with consent and unsubscribe link | 25.4 | Not done | — | H6/E9 |
| X-I18N-01 | Currency formatting per currency (ETB no decimals for property) | 25.4 | Done | lib/format.ts formatETB/formatMoney | unit:currency.test.ts › keeps ETB… no decimals; › uses symbols or codes… |
| X-I18N-02 | Timestamps UTC, shown in user's time zone | 25.4 | Not done | — | H6/E9 |
| X-I18N-03 | Gregorian dates | 25.4 | Not done | — | H6/E9 |
| X-I18N-04 | Ethiopic names render | 25.4 | Not done | — | H6/E9 |
| X-I18N-05 | Slugs fall back safely for Ethiopic titles | 25.4 | Not done | — | H6/E9 |
| X-SEC-01 | RLS + REVOKE-then-GRANT on every new table/view | 25.4 | Not done | — | H6/E9 |
| X-SEC-02 | Storage path ownership checks | 25.4 | Not done | — | H6/E9 |
| X-SEC-03 | Signed URL expiry | 25.4 | Not done | — | H6/E9 |
| X-SEC-04 | CSP updated for every new third-party domain | 25.4 | Not done | — | H6/E9 |
| X-SEC-05 | No SSRF in server-side fetching | 25.4 | Not done | — | H6/E9 |
| X-SEC-06 | Sanitised rich text rendering | 25.4 | Not done | — | H6/E9 |
| X-SEC-07 | Redirect parameters whitelisted | 25.4 | Not done | — | H6/E9 |
| X-SEC-08 | No account/email enumeration | 25.4 | Not done | — | H6/E9 |
| X-SEC-09 | No PII in logs | 25.4 | Not done | — | H6/E9 |
| X-SEC-10 | Client-bundle secret scan | 25.4 | Not done | — | H6/E9 |
| X-SEC-11 | npm audit: no high/critical unaddressed | 25.4 | Not done | — | H6/E9 |
| X-PRIV-01 | Retention purge: verification docs | 25.4 | Not done | — | H6/E9 |
| X-PRIV-02 | Retention purge: CVs | 25.4 | Not done | — | H6/E9 |
| X-PRIV-03 | Retention purge: contact reveals | 25.4 | Not done | — | H6/E9 |
| X-PRIV-04 | Retention purge: rate limits | 25.4 | Not done | — | H6/E9 |
| X-PRIV-05 | Retention purge: stale interest registrations | 25.4 | Not done | — | H6/E9 |
| X-PRIV-06 | Cookie policy accurate | 25.4 | Not done | — | H6/E9 |
| X-PRIV-07 | Consent records for marketing | 25.4 | Not done | — | H6/E9 |
| X-PRIV-08 | Privacy/terms cover UK GDPR, Ethiopian data protection, CVs, matching, commissions, international users | 25.4 | Not done | — | H6/E9 |
| X-PERF-01 | Lighthouse mobile ≥ 90: homepage (Vercel preview) | 25.4 | Not done | — | H6/E9 |
| X-PERF-02 | Lighthouse ≥ 90: property page | 25.4 | Not done | — | H6/E9 |
| X-PERF-03 | Lighthouse ≥ 90: product page | 25.4 | Not done | — | H6/E9 |
| X-PERF-04 | Lighthouse ≥ 90: company page | 25.4 | Not done | — | H6/E9 |
| X-PERF-05 | Lighthouse ≥ 90: coming-soon page | 25.4 | Not done | — | H6/E9 |
| X-PERF-06 | WCAG 2.2 AA zero serious/critical on every public page | 25.4 | Not done | — | H6/E9 |
| X-PERF-07 | …on every account page | 25.4 | Not done | — | H6/E9 |
| X-PERF-08 | …on every admin page | 25.4 | Not done | — | H6/E9 |
| X-PERF-09 | Indexes for new query paths | 25.4 | Not done | — | H6/E9 |
| X-PERF-10 | No N+1 queries | 25.4 | Not done | — | H6/E9 |
| X-PERF-11 | ISR/tag revalidation on every admin change | 25.4 | Not done | — | H6/E9 |
| X-SEO-01 | Sitemaps respect registry and thresholds | 25.4 | Not done | — | H6/E9 |
| X-SEO-02 | Noindex coming-soon and thin pages | 25.4 | Not done | — | H6/E9 |
| X-SEO-03 | Canonicals | 25.4 | Not done | — | H6/E9 |
| X-SEO-04 | Structured data per page type (JobPosting only when jobs live) | 25.4 | Not done | — | H6/E9 |
| X-SEO-05 | OG images for all detail page types | 25.4 | Not done | — | H6/E9 |
| X-OPS-01 | Cron: listing/quote/job expiry | 25.4 | Not done | — | H6/E9 |
| X-OPS-02 | Cron: service-request reminders (unanswered matches > 48h) | 25.4 | Done | lib/cron/daily.ts remindUnansweredMatches | e2e:flows/service-requests.spec.ts › the daily job reminds providers who have not answered within 48 hours, once |
| X-OPS-03 | Cron: saved-search alerts | 25.4 | Not done | — | H6/E9 |
| X-OPS-04 | Cron: email retries | 25.4 | Not done | — | H6/E9 |
| X-OPS-05 | Cron: retention purges | 25.4 | Not done | — | H6/E9 |
| X-OPS-06 | Cron: featured sync | 25.4 | Not done | — | H6/E9 |
| X-OPS-07 | Admin digest includes interest registrations, service requests, Property Care leads, applications, partner applications | 25.4 | Not done | lib/cron/daily.ts | interest, partner, service requests and Property Care leads in digest; job applications pending (E8) |
| X-LEG-01 | Every old URL redirects per Section 20 | 25.4 | Not done | — | H6/E9 |
| X-LEG-02 | Old API endpoints return 410 | 25.4 | Not done | — | H6/E9 |
| X-LEG-03 | Legacy lockdown migration and reverse script ready | 25.4 | Not done | — | H6/E9 |
| X-255-01 | Re-run lint, typecheck, build, unit, Playwright (local + preview read-only), RLS, a11y, crawl, Lighthouse | 25.5 | Not done | — | 25.5 |
| X-255-02 | scripts/preflight.sh checks production prerequisites | 25.5 | Not done | — | 25.5 |
| X-255-03 | LAUNCH_REPORT final matrix summary + AB pre-go-live checklist (25.7) | 25.5 | Not done | — | 25.5 |
| X-255-04 | Tell AB 'Ready. Complete your checklist and type GO LIVE.' | 25.5 | Not done | — | 25.5 |
| X-256-01 | Cutover procedure prepared: non-interactive backup, one-at-a-time migration runner with checks, live RLS run, merge, production smoke (HL-SMOKE-TEST cleanup), lockdown, preflight, rollback | 25.6 | Not done | scripts/cutover/* | dry run on local copy |
| X-256-02 | Cutover executed only after AB types GO LIVE | 25.6 | Not done | scripts/cutover/* | dry run on local copy |
| X-257-01 | Step-by-step AB checklist for every 25.7 item in LAUNCH_REPORT.md | 25.7 | Not done | docs/LAUNCH_REPORT.md | 25.5 |

## Phase 3 roadmap (spec Section 21) — not requirements of this release

Recorded for completeness, no status: orders, invoices and delivery scheduling; delivery zones and fees; paid plans and billing; paid featured placements and advertising slots; reviews and ratings; equipment hire marketplace; market data (price index, sold/let history); multiple admin users with roles; PWA, partner API, regional expansion at scale and brand splits. The items Section 25.3 names (payments, SMS OTP, WhatsApp API, partner APIs, native apps) are rows X-253-* above.

## Summary

Generated by `bash scripts/matrix-summary.sh` (counts rows by status).

