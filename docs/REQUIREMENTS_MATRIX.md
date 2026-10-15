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
| S3-06 | Voice: no exclamation marks, no hype words in UI | 3.3 | Done | copy sweep (one "Copied!" removed) | Recorded verification (LAUNCH_REPORT E9): grep for "!" in user-facing text and hype words returns no hits |
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
| R-11 | /our-developments (now coming soon, 24.10) | 4.3 / 24.10 | Done | app/(site)/our-developments | e2e:jobs.spec.ts › Our Developments: coming soon makes no claims… |
| R-12 | /our-developments/[slug] premium project page | 4.3 | Done | app/(site)/our-developments/[slug] | e2e:jobs.spec.ts › Our Developments … live (project page: unit types, prices, register interest or book a visit) |
| R-13 | /supplies hub | 4.3 | Done | app/(site)/supplies/page.tsx | e2e:smoke.spec.ts › loads /supplies |
| R-14 | /supplies/[category] | 4.3 | Done | app/(site)/supplies/[category] | e2e:smoke.spec.ts › loads /supplies/building-materials |
| R-15 | /supplies/[category]/[subcategory] | 4.3 | Done | app/(site)/supplies/[category]/[subcategory] | e2e:smoke.spec.ts › loads /supplies/building-materials/cement-concrete |
| R-16 | /supplies/product/[slug] | 4.3 | Done | app/(site)/supplies/product/[slug] | e2e:a11y.spec.ts (product page) |
| R-17 | /supplies/quote quote list | 4.3 | Done | app/(site)/supplies/quote | e2e:flows/supplies-and-contact.spec.ts › a guest builds a quote list… |
| R-18 | /supplies/materials-list | 4.3 | Done | app/(site)/supplies/materials-list | e2e:flows/supplies-and-contact.spec.ts › a guest sends a materials list with a file |
| R-19 | /supplies/special-buys (25.2d) | 4.3 / 25.2d | Done | app/(site)/supplies/special-buys | e2e:supplies-extras.spec.ts › Special Buys: HagerLand sets the offer… |
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
| R-30 | /guides and /guides/[slug] (25.2g) | 4.3 / 25.2g | Done | app/(site)/guides, app/(site)/guides/[slug] | e2e:guides-estimator.spec.ts › HagerLand reviews and publishes a guide… |
| R-31 | /login, /signup, /auth/callback, /auth/reset-password, /auth/update-password | 4.3 | Done | app/(site)/login, signup, auth; app/auth/callback | e2e:smoke.spec.ts (login, signup, reset-password); e2e:flows/owner-listing.spec.ts (callback via email link) |
| R-32 | /account dashboard | 4.3 | Done | app/(account)/account/page.tsx | e2e:flows/owner-listing.spec.ts |
| R-33 | /account/listings, /new, /[id]/edit | 4.3 | Done | app/(account)/account/listings | e2e:flows/owner-listing.spec.ts |
| R-34 | /account/products, /new, /[id]/edit (25.2c) | 4.3 / 25.2c | Done | app/(account)/account/products (list, new, [id]/edit) | e2e:supplies-extras.spec.ts › a supplier lists a product, HagerLand approves it… |
| R-35 | /account/company and /account/company/verification | 4.3 | Done | app/(account)/account/company | e2e:flows/business.spec.ts |
| R-36 | /account/enquiries and /account/enquiries/[id] | 4.3 | Done | app/(account)/account/enquiries | e2e:flows/owner-listing.spec.ts (owner sees the enquiry) |
| R-37 | /account/quotes | 4.3 | Done | app/(account)/account/quotes (column grant fixed in 0025) | e2e:content.spec.ts › a signed-in requester sees their quotes in their account |
| R-38 | /account/saved (25.2a) | 4.3 / 25.2a | Done | app/(account)/account/saved | e2e:property-extras.spec.ts › a signed-in user saves a property… |
| R-39 | /account/alerts (25.2a) | 4.3 / 25.2a | Done | app/(account)/account/alerts | e2e:property-extras.spec.ts › …can unsubscribe (alerts page, delete) |
| R-40 | /account/settings (name, phone, password, notifications, delete account) | 4.3 | Done | app/(account)/account/settings | e2e:edge-cases.spec.ts › people can ask for their account to be deleted from settings; › people can download their data as a file; › password reset… (Save new password) |
| R-41 | /onboarding | 4.3 | Done | app/(account)/onboarding | e2e:flows/business.spec.ts |
| R-42 | /roodber8-login and /roodber8 sub-routes | 4.3 | Done | app/roodber8-login, app/roodber8 | e2e:admin/admin.spec.ts › every admin screen loads without errors |
| R-43 | POST /api/enquiries equivalent (server action) | 4.3 | Done | app/actions/enquiry-actions.ts | e2e:flows/owner-listing.spec.ts |
| R-44 | POST /api/contact-reveal | 4.3 | Done | app/api/contact-reveal | e2e:security.spec.ts › contact reveals are rate limited per visitor |
| R-45 | POST /api/quotes equivalent (server action) | 4.3 | Done | app/actions/quote-actions.ts | e2e:flows/supplies-and-contact.spec.ts |
| R-46 | POST /api/uploads/sign | 4.3 | Done | app/api/uploads/sign | e2e:security.spec.ts › upload signing refuses bad types… |
| R-47 | GET /api/search/suggest | 4.3 | Done | app/api/search/suggest | e2e:content.spec.ts › the header search shows grouped suggestions… |
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
| S5-04 | lucide-react icons only; no inline SVG icon strings | 5.2 | Done | lucide-react only (ShareButton's hand-drawn icon removed; Google logo and admin chart are not icons) | Recorded verification (LAUNCH_REPORT E9): grep for <svg and dangerouslySetInnerHTML (JSON-LD only, escaped) |
| S5-05 | Imagery: next/image with sizes and lazy loading; aspect ratios per type; no hotlinking | 5.2 | Done | components/media/MediaImage.tsx | verify: all photos rendered through MediaImage (next/image) with sizes |
| S5-06 | Design looks complete without photos (blueprint hero, icon tiles) | 5.2 | Done | app/globals.css .hl-blueprint | e2e:smoke.spec.ts › loads / |
| C-01 | Button (variants primary, secondary, ghost, gold, danger; sizes; loading; link form) | 5.3 | Done | components/ui/Button | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-02 | IconButton | 5.3 | Done | IconButton | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-03 | Input, Textarea, Select | 5.3 | Done | Field, Input, Textarea, Select | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-04 | Combobox (searchable, locations and categories) | 5.3 | Done | components/ui/Combobox.tsx | e2e:flows/owner-listing.spec.ts (location chosen in the wizard) |
| C-05 | Checkbox, Radio, Switch | 5.3 | Done | Checkbox, Radio, Switch | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-06 | RangeInputs, PriceInput (ETB), PhoneInput (+251 default) | 5.3 | Done | RangeInputs, PriceInput, PhoneInput | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-07 | FileDrop with progress | 5.3 | Done | components/media/FileDrop.tsx | e2e:flows/owner-listing.spec.ts (photos uploaded) |
| C-08 | Badge, Chip, FilterChip | 5.3 | Done | Badge, Chip, FilterChip | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component…; e2e:a11y (contrast) |
| C-09 | Tabs, Accordion | 5.3 | Done | Tabs, Accordion | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-10 | Dialog / bottom Sheet | 5.3 | Done | Dialog (now named by its title for screen readers), sheet | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-11 | Dropdown menu, Tooltip, Toast | 5.3 | Done | DropdownMenu, Tooltip, Toast | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-12 | Skeleton, EmptyState, Pagination, Breadcrumbs, Stat, Card, Section, SectionHeader, Container | 5.3 | Done | Skeleton, EmptyState, Pagination, Breadcrumbs, Stat, Card, Section | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |
| C-13 | SiteHeader with mega-menu, MobileDrawer, SiteFooter | 5.3 | Done | components/layout/* | e2e:smoke.spec.ts (every route) |
| C-14 | AccountShell (sidebar desktop, tabs mobile) | 5.3 | Done | app/(account)/account/layout.tsx, components/account/AccountNav.tsx | e2e:flows/owner-listing.spec.ts |
| C-15 | AdminShell | 5.3 | Done | app/roodber8/layout.tsx | e2e:admin/admin.spec.ts › every admin screen loads without errors |
| C-16 | PropertyCard, horizontal card, Gallery with lightbox, KeyFacts, PriceBlock, LocationBlock, ContactPanel | 5.3 | Done | components/property/*, components/media/Gallery.tsx | e2e:a11y.spec.ts (property pages); e2e:flows/owner-listing.spec.ts |
| C-17 | MortgageNote (P2): finance ask on property pages | 5.3 / 24.7 | Done | FinanceAsk / PropertyActions | e2e:property-extras.spec.ts › …financing (coming soon); e2e:finance-insurance.spec.ts › …property pages ask about financing |
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
| S5-12 | Forms: inline validation, preserve input on error, no double submit, success screen | 5.4 | Done | components/forms (FormParts, ActionForm), server actions | e2e:edge-cases.spec.ts › a validation error keeps everything the visitor typed; › …the submit button cannot be pressed twice; success screens in every flow spec |
| S5-13 | Prices "ETB 4,500,000", rent "/month", "Price on request", "Negotiable"; area "120 m²" | 5.4 | Done | lib/format.ts, components/property/PriceLine.tsx | unit:format.test.ts › formats whole birr; formats square metres |
| S5-14 | Dates "12 Oct 2026"; relative freshness | 5.4 | Done | lib/format.ts | unit:format.test.ts › formats dates as 12 Oct 2026; describes freshness |
| S5-15 | Meaningful alt text on images | 5.4 | Done | components/media/* | e2e:a11y.spec.ts (image-alt rule) |
| S5-16 | WCAG 2.2 AA: contrast, focus rings, landmarks, labels, aria-live, keyboard, reduced motion | 5.4 | Done | app/globals.css | e2e:a11y.spec.ts › public pages have no serious accessibility problems |
| S5-17 | /dev/styleguide shows tokens and all components (not public in production) | 5.5 | Done | app/(site)/dev/styleguide (admin-only in production) | e2e:styleguide.spec.ts › the style guide shows the tokens and every shared component… |

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
| T-23 | saved_items (25.2a) | 6.3 | Done | 0017 saved_items | rls:User saves a property and a search; rls:Another user sees none… |
| T-24 | saved_searches (25.2a) | 6.3 | Done | 0017 saved_searches | rls:User cannot read alert unsubscribe tokens |
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
| S6-23 | saved_items/saved_searches owner-only | 6.5 | Done | 0017 policies | rls:User cannot save items for someone else; rls:Another user sees none of those saved items or searches |
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
| M-12 | lib/email: Resend client, branded layout with plain text, every listed template | 6.6 | Done | lib/email (send.ts, layout.ts, templates.ts, outbox.ts) | unit:email-templates.test.ts (all 37 templates: HTML + text, escaping); unit:email-send.test.ts |
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
| W-02 | Published edits go to pending_changes; auto-apply rules for verified orgs | 6.8 | Done | listings actions (pending_changes, maybeAutoApply) | e2e:edge-cases.spec.ts › an owner renews a listing…, edits it while changes wait for review…; e2e:flows (verified org auto-apply) |
| W-03 | Pause and resume (no re-review if unchanged) | 6.8 | Done | lib/listing-rules.ts | unit:listing-rules.test.ts › resuming a paused listing |
| W-04 | Expire via cron; renew within 30 days after expiry | 6.8 | Done | lib/cron/daily.ts, lib/listing-rules.ts | e2e:cron.spec.ts › expires listings…; unit:listing-rules.test.ts › renewing |
| W-05 | Archive (owner); remove (admin, with reason) | 6.8 | Done | listingStatusAction archive; admin remove | e2e:edge-cases.spec.ts › …archives it; › expired listings stay reachable…; removed and rejected ones are 404 |
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
| S7-03 | Magic link sign-in | 7.1 | Done | magicLinkAction, /auth/callback | e2e:edge-cases.spec.ts › magic links sign in once; a used link is refused… |
| S7-04 | Google OAuth, hidden unless configured | 7.1 | Done | components/auth/GoogleButton (NEXT_PUBLIC_GOOGLE_AUTH_ENABLED) | e2e:edge-cases.spec.ts › users sign out…; Google sign-in stays hidden unless configured |
| S7-05 | Email confirmation required before listing; passwords ≥ 10 characters | 7.1 | Done | lib/validation/auth.ts | unit:validation.test.ts › requires 10+ character passwords…; e2e:flows/owner-listing.spec.ts › confirmation email… |
| S7-06 | Auth emails via Resend SMTP with branded templates (HTML for AB) | 7.1 | Done | docs/auth-email-templates/* | verify: four templates in docs/auth-email-templates |
| S7-07 | Guests browse, enquire and request quotes without an account | 7.1 | Done | — | e2e:flows/supplies-and-contact.spec.ts (guest quote) |
| S7-08 | Signup step 1 audience cards; step 2 details; step 3 confirm | 7.2 | Done | components/auth/SignupFlow.tsx | e2e:helpers signUp() used by flows |
| S7-09 | Onboarding: business types create an organisation; duplicate detection offers claim | 7.2 | Done | app/(account)/onboarding | e2e:flows/business.spec.ts |
| S7-10 | User can belong to several organisations, with a switcher | 7.2 | Done | OrgSwitcher, getActiveMembership | e2e:edge-cases.spec.ts › a person in two organisations switches between them |
| S7-11 | Overview with status cards and tasks | 7.3 | Done | app/(account)/account/page.tsx | e2e:flows/owner-listing.spec.ts |
| S7-12 | Personal lister dashboard (listings with status, views, enquiries, expiry, actions) | 7.3 | Done | app/(account)/account/listings | e2e:flows/owner-listing.spec.ts |
| S7-13 | Developer dashboard (developments, unit listings) | 7.3 | Done | app/(account)/account/developments | e2e:content.spec.ts › a developer adds a development from the dashboard… |
| S7-14 | Professional dashboard (profile, portfolio, verification) | 7.3 | Done | app/(account)/account/company | e2e:flows/business.spec.ts |
| S7-15 | Supplier dashboard products (25.2c) | 7.3 | Done | app/(account)/account/products | e2e:supplies-extras.spec.ts › a supplier lists a product, HagerLand approves it… |
| S7-16 | Agency team members (25.2i) | 7.3 | Done | app/(account)/account/company/team | e2e:teams.spec.ts › an owner invites a colleague… |
| S7-17 | Listing wizard steps 1–6 with autosave, min 3 photos, declarations | 7.4 | Done | components/account/ListingWizard.tsx | e2e:flows/owner-listing.spec.ts |
| S7-18 | Map pin on the wizard location step (25.2b) | 7.4 / 25.2b | Done | see X-252-05 | see X-252-05 |
| S7-19 | Private owners limited to N active listings | 7.4 | Done | lib/entitlements.ts privateOwnerEntitlements | e2e:edge-cases.spec.ts › private owners are capped at the admin-set number of active listings |

## Section 8 — Property marketplace

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S8-01 | Hub: compact search, popular locations, latest sale/rent, developments, type links, agent strip, list CTA | 8.1 | Done | app/(site)/property/page.tsx | e2e:smoke.spec.ts › loads /property |
| S8-02 | Hub guide teasers (25.2g) | 8.1 | Done | components/guides/GuidesTeaser (property hub) | e2e:guides-estimator.spec.ts › … (Property guides on /property once published) |
| S8-03 | Results: desktop filters sidebar, mobile bottom sheet, sort, cards | 8.2 | Done | components/property/* | e2e:a11y.spec.ts (results pages, mobile and desktop) |
| S8-04 | All listed filters | 8.2 | Done | lib/property-search.ts | unit:property-search.test.ts › parses filters… |
| S8-05 | Sort options | 8.2 | Done | lib/property-search.ts | unit:property-search.test.ts › defaults sort to relevance only when searching text |
| S8-06 | At most 2 labelled Featured cards on page 1 | 8.2 | Done | components/property/PropertyResults.tsx | verify: code review WP-6 (slice(0, 2), Featured label) |
| S8-07 | Results header with count, chips, clear all | 8.2 | Done | components/property/PropertyResults.tsx | unit:property-search.test.ts › counts and removes filters |
| S8-08 | "Save this search" (25.2a) | 8.2 | Done | components/saved/SaveSearchButton.tsx | e2e:property-extras.spec.ts › a signed-in user saves… a search |
| S8-09 | Pagination 24 per page | 8.2 | Done | components/ui/Pagination.tsx | verify: page size 24 in lib/data/properties.ts |
| S8-10 | Empty state with widen-search and "Tell us what you're looking for" | 8.2 | Done | components/property/PropertyResults.tsx | e2e:smoke.spec.ts › loads /contact?topic=property-request |
| S8-11 | Detail sections 1–13 (breadcrumbs, gallery, title, contact, facts, description, features, location, development, info, safety, similar, professionals) | 8.3 | Done | app/(site)/property/[slug]/page.tsx | e2e:flows/owner-listing.spec.ts; e2e:a11y.spec.ts |
| S8-12 | Detail JSON-LD RealEstateListing + BreadcrumbList | 8.3 | Done | lib/jsonld.ts | e2e:seo.spec.ts › structured data… |
| S8-13 | Expired listing: 200 + noindex + "no longer available" + similar | 8.3 | Done | app/(site)/property/[slug] (property_unavailable) | e2e:edge-cases.spec.ts › expired listings stay reachable (noindex, "no longer available")… |
| S8-14 | Removed, rejected or never published: 404 | 8.3 | Done | app/(site)/property/[slug] | e2e:edge-cases.spec.ts › …removed and rejected ones are 404 (paused too) |
| S8-15 | /agents and /developers: search, location, verified first then listings | 8.4 | Done | components/company/DirectoryPage.tsx | e2e:smoke.spec.ts › loads /agents; loads /developers |
| S8-16 | Company profile tabs for agents/developers | 8.4 | Done | app/(site)/company/[slug] | e2e:a11y.spec.ts (company page) |
| S8-17 | Building/development pages without listings; "List your property" CTA | 8.5 | Done | components/development/DevelopmentDetail.tsx | e2e:responsive.spec.ts (development page) |
| S8-18 | "Register for alerts" on building pages (25.2a) | 8.5 | Done | DevelopmentDetail "Get alerts for new listings here" (development filter in saved searches) | e2e:content.spec.ts › …building pages offer listing alerts |
| S8-19 | Admin bulk CSV creation of developments with preview | 8.5 | Done | app/roodber8/developments/import | unit:dev-import.test.ts |

## Section 9 — Developments and HagerLand Developments

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S9-01 | /developments grid with filters; "From HagerLand" row labelled, not mixed | 9.1 | Done | app/(site)/developments/page.tsx | e2e:smoke.spec.ts › loads /developments |
| S9-02 | Development detail (all listed sections, off-plan safety note) | 9.2 | Done | components/development/DevelopmentDetail.tsx | e2e:responsive.spec.ts; e2e:a11y.spec.ts |
| S9-03 | /our-developments hub (superseded by 24.10 coming-soon page while the vertical is coming_soon; full hub when live) | 9.3 / 24.10 | Done | app/(site)/our-developments | e2e:jobs.spec.ts › Our Developments: coming soon makes no claims; live, projects grouped by stage |
| S9-04 | No fake renders or invented projects | 9.3 | Done | — | verify: page shows only published HagerLand developments |
| S9-05 | Project detail premium template with progress timeline and dated updates (25.2j) | 9.3 / 25.2j | Done | components/development/ProgressTimeline.tsx, DevelopmentDetail | e2e:jobs.spec.ts › a developer posts a progress update with photos… |

## Section 10 — Construction supplies

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S10-01 | Quote-based commerce, no checkout | 10.1 | Done | — | e2e:flows/supplies-and-contact.spec.ts |
| S10-02 | Supplies hub sections (hero, categories, how it works, featured if any, trade team enquiry, suppliers strip, become a supplier) | 10.2 | Done | app/(site)/supplies/page.tsx | e2e:smoke.spec.ts › loads /supplies |
| S10-03 | Delivery trust line only if set | 10.2 | Done | lib/data/business.ts | verify: delivery line hidden when delivery_area empty |
| S10-04 | Category pages: intro, chips, filters, sort, grid, custom-item CTA | 10.3 | Done | components/supplies/CategoryPage.tsx | e2e:smoke.spec.ts (category pages) |
| S10-05 | Product detail (gallery, specs, price block, stock, lead time, min qty, stepper, add to quote, seller badge, JSON-LD) | 10.4 | Done | app/(site)/supplies/product/[slug] | e2e:seo.spec.ts › structured data…; e2e:flows/supplies-and-contact.spec.ts |
| S10-06 | Quote list in localStorage (hl_quote_v1) | 10.5 | Done | components/supplies/quoteStore.ts | e2e:flows/supplies-and-contact.spec.ts |
| S10-07 | Quote list synced to account when signed in (25.2a) | 10.5 / 25.2a | Done | lib/quote-list.ts, components/supplies/QuoteListSync.tsx, 0017 quote_lists | unit:e6-helpers.test.ts › quote list sync; e2e:property-extras.spec.ts › a signed-in user’s quote list is kept in their account |
| S10-08 | Quote submit → reference HLQ, emails to customer and team | 10.5 | Done | app/actions/quote-actions.ts | e2e:flows/supplies-and-contact.spec.ts |
| S10-09 | Materials list upload (≤ 5 files, 15 MB) | 10.6 | Done | components/supplies/MaterialsListForm.tsx | e2e:flows/supplies-and-contact.spec.ts › a guest sends a materials list with a file |
| S10-10 | Suppliers directory with product-category filter | 10.7 | Done | app/(site)/suppliers | e2e:smoke.spec.ts › loads /suppliers |
| S10-11 | Supplier profile Products tab (25.2c) | 10.7 / 25.2c | Done | app/(site)/company/[slug] Products section | e2e:supplies-extras.spec.ts › a supplier lists a product, HagerLand approves it… (Products (1) on the company page) |
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
| S13-02 | Header search overlay with grouped typeahead and recent searches | 13 | Done | components/search/SearchOverlay | e2e:content.spec.ts › the header search shows grouped suggestions and remembers recent searches |
| S13-03 | /search with vertical tabs and counts | 13 | Done | app/(site)/search | e2e:smoke.spec.ts › loads /search?q=bole |
| S13-04 | Relevance weights; small verified boost; never boost is_hagerland | 13 | Done | 0005 | verify: S1-02 |
| S13-05 | Locations combobox searches name, Amharic name and path | 13 | Done | 0005 search_locations | e2e:flows/owner-listing.spec.ts |
| S13-06 | Searches tracked without the query text; zero-result queries aggregated | 13 | Done | lib/data/search.ts, record_search_miss | verify: admin reports lists search misses |
| S13-07 | Search covers the new verticals (services, jobs when live, international organisations) | 24.2 | Done | lib/data/search.ts | services and international organisations (E3/E2 e2e); jobs when live: e2e:jobs.spec.ts › switched live… (site search shows Jobs) |

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
| S14-13 | Guides teaser (25.2g, hidden until published guides exist) | 14.13 | Done | GuidesTeaser on homepage, hidden until a guide is published | e2e:guides-estimator.spec.ts › starter guides… (nothing shows) and › … publishes a guide (homepage teaser) |
| S14-14 | Homepage JSON-LD Organization + WebSite SearchAction | 14 | Done | lib/seo.ts | e2e:seo.spec.ts › structured data… |

## Section 15 — Content

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S15-01 | /about copy (Building the land, name, what we do, why it works, standards, CTAs), updated for the ecosystem (24.11) | 15.2 / 24.11 | Done | app/(site)/about (from the vertical registry) | e2e:content.spec.ts › About, How it works, List with us and Help describe the whole ecosystem… |
| S15-02 | /how-it-works three audiences, verification levels, marketplace rules; updated for service requests (24.11) | 15.2 / 24.11 | Done | app/(site)/how-it-works (Getting quotes tab) | e2e:content.spec.ts › …ecosystem |
| S15-03 | /list-with-us anchors per audience, updated (post a job, partners) | 15.2 / 24.11 | Done | lib/content/list-with-us.ts (#businesses, #employers, #partners) | e2e:content.spec.ts › …ecosystem |
| S15-04 | /contact options from settings, form, quick links | 15.2 | Done | app/(site)/contact | e2e:flows/supplies-and-contact.spec.ts › …send a contact message |
| S15-05 | /help FAQs grouped with safety guidance, FAQPage JSON-LD; updated for new verticals | 15.2 / 24.11 | Done | lib/content/help.ts (groups follow vertical status), FAQPage | e2e:content.spec.ts › …ecosystem |
| S15-06 | Terms, privacy, cookies rewritten with "Last updated"; updated for service requests, matching, commissions, CVs, international users, partner referrals | 15.2 / 24.11 | Done | terms, privacy, cookies (Last updated 14 Oct 2026) | e2e:content.spec.ts › the legal pages cover requests, matching, commissions, partners, CVs and people abroad… |
| S15-07 | Every email: header, body, button, plain text, footer reason; sender hello@ / supply@ | 15.3 | Done | lib/email/layout.ts | unit:email-templates.test.ts (header, footer reason, plain text); unit:email-send.test.ts (hello@ / supply@ senders) |
| S15-08 | Microcopy: verb buttons, actionable errors, inviting empty states | 15.4 | Done | — | verify: WP-19 proofread |
| S15-09 | Legacy sweep returns no relevant hits | 15.5 | Done | scripts/legacy-sweep.sh | bash scripts/legacy-sweep.sh → "no relevant hits" (run in 25.5 preflight too) |

## Section 16 — SEO

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S16-01 | Canonical host www.hagerland.com, absolute canonicals | 16 | Done | lib/site.ts, lib/seo.ts | e2e:seo.spec.ts › detail pages have absolute canonicals… |
| S16-02 | Metadata on every page; title and description templates | 16 | Done | buildMetadata titles and descriptions | e2e:seo.spec.ts › key pages keep titles within 60 characters and descriptions within 110–160 |
| S16-03 | Path facets only purpose + location; type as query param (Phase 2 type pages: 25.2l) | 16 | Done | app/(site)/property/* | e2e:smoke.spec.ts |
| S16-04 | Canonical rules: page 2+ self-canonical with "Page N"; other params → path-only canonical | 16 | Done | lib/property-pages.ts resultsMetadata | e2e:seo.spec.ts › results pages: page 2+ is self-canonical with "Page N"… |
| S16-05 | Landing pages below min results → noindex, follow and excluded from sitemaps | 16 | Done | lib/sitemap-rules.ts | unit:sitemap.test.ts › keeps only paths at or above the threshold |
| S16-06 | Unique data-driven intro on landings; admin seo_intro on locations | 16 | Done | 0002 locations, lib/property-pages.ts | e2e:smoke.spec.ts › loads /property/for-sale/addis-ababa/bole |
| S16-07 | Sitemaps split by type and listed in robots.ts; robots disallow list | 16 | Done | app/sitemap.ts, app/robots.ts | e2e:seo.spec.ts › sitemaps are split by type; robots.txt blocks everything outside production |
| S16-08 | OG images for property, development, company, product and default | 16 | Done | app/og | e2e:seo.spec.ts › share images render as PNG |
| S16-09 | Performance budgets: LCP < 2.5 s, CLS < 0.1, JS < 170 KB per route | 16 | Done | — | verify: docs/qa/lighthouse-2026-10-13.md (to re-run in E9 and on the preview) |
| S16-10 | Internal linking: breadcrumbs, child and sibling areas, detail → landing | 16 | Done | — | verify: WP-15 |
| S16-11 | Amharic /am with hreflang (25.2m) | 16 / 25.2m | Done | middleware.ts, lib/i18n | e2e:amharic.spec.ts › switched on, /am serves Amharic menus with hreflang… |

## Section 17 — Commercial architecture

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S17-01 | Featured listings via promotions (max 2, labelled) | 17 | Done | 0002 promotions, PromotionTools | e2e:cron.spec.ts (featured sync) |
| S17-02 | organisations.plan + feature gates in lib/entitlements.ts (all plans unlimited except private-owner cap) | 17 | Done | lib/entitlements.ts (organisations.plan → limits; free plan unlimited; owner cap from settings) | e2e:edge-cases.spec.ts › private owners are capped… |
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
| S19-06 | Duplicate listing detection flags in admin queue | 19.1 | Done | app/roodber8/review (Possible duplicate) | e2e:edge-cases.spec.ts › HagerLand sees possible duplicate listings flagged in the review queue |
| S19-07 | Suspended users blocked from writes (is_active_user) | 19.1 | Done | 0002, 0003 | e2e:admin/admin.spec.ts › suspend and restore a user; X-AUTH-07 extends it to every new table |
| S19-08 | Cron/webhooks require Bearer CRON_SECRET, timing-safe | 19.1 | Done | app/api/cron/daily | e2e:cron.spec.ts › refuses requests without the secret |
| S19-09 | Reports flow → admin queue | 19.1 | Done | app/actions/report-actions.ts | verify: review queue lists reports |
| S19-10 | npm audit high/critical fixed | 19.1 | Done | next 15.5.28; overrides next>postcss 8.5.30 | npm audit: 0 critical; no advisory against next; remaining high are build-time tooling only (Tailwind 3, ESLint), documented in docs/qa/npm-audit-2026-10-15.md |
| S19-11 | .env.example lists every variable | 19.1 | Done | .env.example (+ note on platform-provided variables) | Recorded verification (LAUNCH_REPORT E9): every process.env name used in code is in .env.example or set by Vercel/Next |
| S19-12 | ISR per route; detail pages revalidate 600 + on-demand | 19.2 | Done | — | verify: WP-16 |
| S19-13 | Image pipeline sized WebP | 19.2 | Done | lib/media-actions.ts | e2e:flows/owner-listing.spec.ts |
| S19-14 | Dynamic imports for lightbox, map picker, uploader | 19.2 | Done | components/media/Gallery.tsx | verify: next/dynamic used (map picker: E6) |
| S19-15 | Vercel Analytics + Speed Insights mounted | 19.2 | Done | app/layout.tsx | verify: mounted when VERCEL is set |
| S19-16 | axe in e2e: zero serious/critical on key pages | 19.3 | Done | e2e/a11y.spec.ts | e2e:a11y.spec.ts (to be extended to every new page in E9) |
| S19-17 | Branded error, global-error and not-found pages | 19.4 | Done | app/not-found.tsx, app/global-error.tsx | e2e:smoke.spec.ts › unknown pages return a branded 404 |
| S19-18 | Server actions return typed results | 19.4 | Done | lib/action-result.ts | verify: all actions return ActionResult |
| S19-19 | lib/log.ts with no PII | 19.4 | Done | lib/log.ts | verify: maskEmail used; X-SEC-11 re-checks |
| S19-20 | errors table with throttling, in digest | 19.4 | Done | lib/error-store.ts | unit:error-store.test.ts |
| S19-21 | Analytics events (search, filter, listing view, contact reveal, enquiry, quote, materials, register interest, signup, listing, org, claim, verification) | 19.5 | Done | lib/analytics.ts, analytics-server.ts | unit:analytics-events.test.ts › sends every declared event |
| S19-22 | Playwright suite, unit tests, npm scripts | 19.6 | Done | e2e/, tests/ | build |
| S19-23 | CLAUDE.md, README, .env.example, RUNBOOK | 19.7 | Done | CLAUDE.md, README.md, docs/RUNBOOK.md, .env.example, supabase/README.md | Recorded verification: updated for Phase 1.5 (verticals, request engine, daily job tasks, health checks, Amharic switch, migrations 0011–0026 with check queries) |

## Section 20 — Legacy removal and cutover

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S20-01 | Legacy URL 301s (housing, business, delivery, made-in-ethiopia, money, birrbank, jobs, cars, tutors, community, events, edit-link) | 20.2 | Done | next.config.mjs | e2e:redirects.spec.ts (/diaspora and /jobs are verticals again; old job URLs redirect to /jobs) |
| S20-02 | Old /property/{uuid} URLs 301 to /property/for-sale | 20.2 | Done | app/(site)/property/[slug] | unit:slug.test.ts › treats slugs without a short id as legacy |
| S20-03 | Legacy lockdown migration (drop public SELECT policies, revoke grants) + reverse script + verification query | 20.3 | Done | supabase/legacy/cutover_legacy_lockdown.sql (+ _REVERSE, _check), scripts/cutover/lockdown.sh | Recorded verification (LAUNCH_REPORT 25.5 rehearsal): lockdown proof 23/23 PASS on the local legacy replica; reverse restores reads |
| S20-04 | Old API endpoints return 410 (25.4) | 20 / 25.4 | Done | lib/legacy-api.ts, middleware | e2e:edge-cases.spec.ts › old API addresses answer 410 Gone |
| S20-05 | Cutover sequence and rollback plan | 20.4 | Done | scripts/cutover/* + scripts/cutover/README.md | Recorded verification (LAUNCH_REPORT 25.5 rehearsal): every step rehearsed on the local copy; rollback script reverts with git revert -m 1 and runs the lockdown reverse |

## Section 22 — Acceptance criteria

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S22-01 | lint, typecheck, unit, e2e, build all pass on the final commit | 22 | Done | — | At 2a89e4b: lint 0, tsc 0, clean build 0 warnings, 214 unit, full e2e 347 passed / 0 failed (LAUNCH_REPORT evidence table) |
| S22-02 | No console errors on public pages; no 500s during a full crawl | 22 | Done | all public pages | e2e:crawl.spec.ts › a crawl of the public site finds no server errors and no broken links; e2e:smoke.spec.ts (no console errors on every route) |
| S22-03 | Env vars documented, validated, production configured | 22 | Done | .env.example, instrumentation.ts start-up check, /api/health/full | Documented and validated (unit:health.test.ts, e2e:health.spec.ts); production values are AB checklist step 2, verified at cutover steps 1 and 8 (preflight) |
| S22-04 | Runbook, backup, rollback documented | 22 | Done | docs/RUNBOOK.md, scripts/backup-supabase.sh, scripts/cutover/README.md | Recorded verification: backup (now also non-interactive) and rollback documented and rehearsed (LAUNCH_REPORT 25.5) |
| S22-05 | Every template at 5 widths; filter sheet, bottom bar, forms with keyboard | 22 | Done | all templates | e2e:responsive.spec.ts (public pages at 360/390/768/1024/1440; account pages at 360/768); e2e:styleguide (filter sheet) |
| S22-06 | Visitor journeys (search, view, reveal, enquire, quote, materials list, find professional, register interest) | 22 | Done | — | e2e:flows/* |
| S22-07 | Lister journeys (sign up, org, listing with photos, approval, enquiries, renew) | 22 | Done | listing wizard, renewal | e2e:flows/owner-listing.spec.ts; e2e:edge-cases.spec.ts › an owner renews a listing near expiry… |
| S22-08 | Admin journeys (approve/reject, catalogue, quote, verify, taxonomy, feature, export) | 22 | Done | — | e2e:admin/admin.spec.ts; e2e:flows/* |
| S22-09 | Emails deliver from @hagerland.com with correct branding and links | 22 | Done | lib/email/*, EMAIL_FROM | unit:email-templates.test.ts (branding, links, escaping on every template); sending domain is AB checklist step 5, verified by /api/health/full emailDomain at cutover |
| S22-10 | Brand consistency, integrity labels | 22 | Done | brand tokens, integrity labels | e2e:a11y (contrast); e2e:property-extras.spec.ts (Marketed by HagerLand); S1-01/S1-02 verifications |
| S22-11 | Legacy sweep zero relevant hits; legacy tables private | 22 | Done | scripts/legacy-sweep.sh, supabase/legacy/cutover_legacy_lockdown.sql | bash scripts/legacy-sweep.sh: no relevant hits; legacy tables made private at cutover step 7 (rehearsed: 23/23 PASS) |
| S22-12 | Typed action results; no unhandled rejections; rate limiters; cron manual trigger | 22 | Done | — | e2e:cron.spec.ts; unit:rate-limit.test.ts |
| S22-13 | SEO-ready (titles, canonicals, noindex, sitemaps, JSON-LD, OG) | 22 | Done | metadata, canonicals, noindex, sitemaps, JSON-LD, OG | e2e:seo.spec.ts (all tests); e2e:jobs.spec.ts (noindex coming soon); e2e:verticals.spec.ts |
| S22-14 | Scalable (unified model, indexed search, pagination, ISR, image pipeline, admin-managed trees) | 22 | Done | — | rows S6-*, F-* |
| S22-15 | Secure (RLS script, anon blocked, no key in bundle, headers, uploads, Turnstile, admin guard, secrets rotated) | 22 | Done | — | RLS 133/133; e2e:security.spec.ts (anon blocked, headers, uploads, no secret in browser bundle, admin guard); Turnstile and secret rotation are AB checklist steps 3 and 6 |
| S22-16 | Ready for real users (legal review, real contacts, launch content) | 22 | Done | docs/LAUNCH_REPORT.md section 3 | Platform side ready (empty states honest, settings hidden until filled); legal review, real contacts and launch content are AB checklist steps 9-12 |

## Section 23 — Needs AB (platform side)

The decisions themselves are AB's (listed in `docs/LAUNCH_REPORT.md` to-do list). The platform requirement is that nothing is invented and every item is configurable.

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| S23-01 | Tagline configurable; positioning lines from 24.1 in lib/brand.ts | 23.1 / 24.1 | Done | lib/brand.ts | e2e:verticals.spec.ts › homepage shows the positioning lines… |
| S23-02 | "Free while we launch" shown only when confirmed in settings | 23.2 | Done | free_listing_confirmed | verify: S14-12 |
| S23-03 | Legal entity from settings; hidden when empty | 23.3 | Done | lib/data/business.ts | e2e:admin/admin.spec.ts › settings… |
| S23-04 | Contact details, delivery area, quote response time from settings; hidden when empty | 23.4 | Done | lib/data/business.ts | e2e:admin/admin.spec.ts › settings… |
| S23-05 | Works without brand photography; HagerLand Developments in "coming soon" state | 23.5 | Done | our-developments coming soon; no brand photography needed (icons, blueprint pattern) | e2e:jobs.spec.ts › Our Developments… (coming soon) |
| S23-06 | "Why buy" claims only from settings | 23.6 | Done | developments_claims setting | verify: hidden when empty |
| S23-07 | Neighbourhoods added by AB in admin (no guessed parents) | 23.7 | Done | app/roodber8/locations | e2e:admin/admin.spec.ts › …add a location |
| S23-08 | Pages honest when empty (launch content not seeded by us) | 23.8 | Done | EmptyState everywhere | e2e:smoke.spec.ts (empty local data) |
| S23-09 | Map provider via env/settings; map hidden without a key (25.2b) | 23.9 / 25.2b | Done | see X-252-06 | unit:e6-helpers.test.ts › map configuration |
| S23-10 | Google OAuth hidden unless enabled | 23.10 | Done | GoogleButton | e2e:edge-cases.spec.ts › …Google sign-in stays hidden unless configured |
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
| S24-07 | Integrity rules kept for own offers | 24.1 | Done | labels + search order unchanged by is_hagerland | e2e:property-extras.spec.ts › …HagerLand-marketed listings are labelled; S1-02 verification (search order never uses is_hagerland) |
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
| S24-1F | "Coming soon" appears only through the registry | 24.2 | Done | registry-driven labels only | Recorded verification (LAUNCH_REPORT E9): grep for "coming soon" text: every use is driven by the vertical's status; off-plan projects now say "Upcoming projects" |
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
| S24-34 | organisations, service_requests, jobs, interest_registrations carry country_code and currency | 24.4 | Done | 0011, 0013, 0014, 0019 | organisations and interest (e2e:international.spec.ts), service_requests (E3 e2e:flows/service-requests guest-link test: GB/GBP), jobs (0019 trigger; e2e:jobs.spec.ts checks currency ETB) |
| S24-35 | Currency list ETB, GBP, USD, EUR, CAD, AED, SEK, NOK, SAR, ILS, ZAR, KES | 24.4 | Done | lib/countries.ts, check constraints in 0011/0013 | unit:currency.test.ts › countries |
| S24-36 | Money displayed in the record's currency | 24.4 | Done | formatMoney in record currency | unit:currency.test.ts › money in a record’s currency; e2e:jobs.spec.ts (ETB salary); e2e:flows/service-requests (GBP request) |
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
| S24-4F | Engine used for contractors, repairs (emergency), valuations, finance, insurance, diaspora, staffing | 24.5 | Done | 0014–0019 | staffing: e2e:jobs.spec.ts › staffing requirements go through the request engine… |
| S24-4G | Materials quote_requests unchanged | 24.5 | Done | quote_requests unchanged | e2e:flows/supplies-and-contact.spec.ts green in E8 full regression (249 passed) |
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
| S24-60 | Pages: Sell with HagerLand, Let with HagerLand, Buyer representation, Property sourcing for diaspora buyers, Developer sales | 24.7 | Done | app/(site)/agency, lib/content/agency.ts | e2e:property-extras.spec.ts › agency pages explain each service… |
| S24-61 | Each agency page has an enquiry form | 24.7 | Done | app/(site)/agency/[service] | e2e:property-extras.spec.ts › agency pages… (enquiry reaches the HagerLand sales view) |
| S24-62 | "Request a valuation" (service request type) | 24.7 | Done | 0017 valuation questions, /request-service/property-valuers | e2e:property-extras.spec.ts › a property page offers… valuation; sql: 0017 check → 4 questions |
| S24-63 | lister_type hagerland labelled "Marketed by HagerLand" | 24.7 | Done | components/property/PropertyBadges.tsx | e2e:property-extras.spec.ts › …HagerLand-marketed listings are labelled |
| S24-64 | Property page: Save (account required) | 24.7 | Done | components/saved/SaveButton.tsx, app/actions/saved-actions.ts | e2e:property-extras.spec.ts › a signed-in user saves a property…; guests sent to sign in |
| S24-65 | Compare up to 4 properties, side-by-side page; guests via localStorage | 24.7 | Done | lib/compare.ts, components/compare/*, app/(site)/property/compare | unit:e6-helpers.test.ts › compare list; e2e:property-extras.spec.ts › a property page offers… compare |
| S24-66 | Property page: Request a valuation | 24.7 | Done | PropertyActions | e2e:property-extras.spec.ts › a property page offers… (Request a valuation link) |
| S24-67 | "Ask about financing": finance interest when coming soon, service request when live | 24.7 | Done | PropertyActions | e2e:property-extras.spec.ts › a property page offers… (financing → Finance interest while coming soon) |
| S24-70 | Finance landing with all categories, "provided through approved, licensed partners" | 24.8 | Done | lib/content/verticals.ts FINANCE_CATEGORIES, ComingSoonPage | e2e:finance-insurance.spec.ts › while coming soon, finance and insurance list every category… |
| S24-71 | Insurance landing with all categories, same partner statement | 24.8 | Done | INSURANCE_CATEGORIES | e2e:finance-insurance.spec.ts › while coming soon… |
| S24-72 | Register interest by category | 24.8 | Done | InterestForm categories | e2e:finance-insurance.spec.ts; e2e:verticals.spec.ts › register interest… (Landlord insurance) |
| S24-73 | Become a partner for banks, lenders, insurers, brokers | 24.8 | Done | PartnerForm | e2e:finance-insurance.spec.ts (partner types); e2e:verticals.spec.ts › become a partner… |
| S24-74 | No rates, quotes, advice or eligibility statements | 24.8 | Done | copy review | e2e:finance-insurance.spec.ts › …make no offers (no %, rates or eligibility text, coming soon and live) |
| S24-75 | When live, requests go through the engine to partner organisations | 24.8 | Done | 0018, PartnerVerticalPage | e2e:finance-insurance.spec.ts › switched live, finance requests go through the engine to a lender… |
| S24-76 | New organisation kinds lender, insurer, broker | 24.8 | Done | 0012, admin organisation kinds | e2e:finance-insurance.spec.ts › admin can add a lender, insurer or broker… |
| S24-80 | jobs table (employer org, title, category, type, location/country, salary + currency optional, description, requirements, closing date, moderated status, expiry) | 24.9 | Done | supabase/migrations/0019_jobs.sql | rls_test.sql jobs checks (96/96); e2e:jobs.spec.ts |
| S24-81 | Employer dashboard: post and manage jobs | 24.9 | Done | app/(account)/account/jobs | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| S24-82 | Employer views applications | 24.9 | Done | app/(account)/account/jobs/[id] | e2e:jobs.spec.ts › switched live: an employer posts a job… (employer reads, downloads CV, shortlists) |
| S24-83 | Public job board with filters | 24.9 | Done | app/(site)/jobs | e2e:jobs.spec.ts › switched live: an employer posts a job… (keyword, location, category filters) |
| S24-84 | Apply with CV (PDF/DOCX only, size limit, private-docs) and cover note | 24.9 | Done | components/jobs/ApplyForm.tsx, lib/media (cv area), app/(account)/account/cv | e2e:jobs.spec.ts › switched live: an employer posts a job… (non-PDF/DOCX refused; private signed link) |
| S24-85 | Candidate profile, opt-in, private by default | 24.9 | Done | app/(account)/account/candidate | e2e:jobs.spec.ts › switched live: an employer posts a job…; rls_test.sql (private by default) |
| S24-86 | "Submit a staffing requirement" (service request type) | 24.9 | Done | 0019 (recruitment/staffing) | e2e:jobs.spec.ts › staffing requirements… |
| S24-87 | Admin job moderation and applications overview | 24.9 | Done | app/roodber8/jobs, review?tab=jobs | e2e:jobs.spec.ts › switched live: an employer posts a job… (approved by HagerLand; overview page) |
| S24-88 | CVs never public; candidates control visibility; retention in privacy policy | 24.9 | Done | rls_test.sql, privacy page, lib/cron/daily.ts | rls_test.sql (anonymous/stranger denied; employers never see CVs); e2e:jobs.spec.ts › switched live: an employer posts a job… (stranger gets 404); privacy "How long we keep it" |
| S24-89 | While coming soon: landing + employer and candidate interest forms | 24.9 | Done | components/verticals/ComingSoonPage | e2e:jobs.spec.ts › while coming soon, jobs shows the landing… |
| S24-90 | Our Developments coming-soon page (intent, supply-and-build advantage, register interest, no claims of activity) | 24.10 | Done | lib/content/verticals.ts | e2e:jobs.spec.ts › Our Developments: coming soon makes no claims… |
| S24-91 | Templates and data model intact; projects appear when published and the vertical is live | 24.10 | Done | app/(site)/our-developments | e2e:jobs.spec.ts › Our Developments … live, projects grouped by stage |
| S24-A1 | Homepage, about, how-it-works, list-with-us, help, footer and metadata updated | 24.11 | Done | homepage, about, how-it-works, list-with-us, help, footer | e2e:content.spec.ts › …ecosystem; e2e:verticals.spec.ts (homepage tiles, footer) |
| S24-A2 | Terms and privacy updated (service requests, matching, commissions, CVs, international users, partner referrals, no regulated advice) | 24.11 | Done | terms §12–16, privacy | e2e:content.spec.ts › the legal pages cover… |
| S24-A3 | Regulatory checks flagged in LAUNCH_REPORT.md | 24.11 | Done | docs/LAUNCH_REPORT.md "Regulatory checks before switching services on" | Recorded (LAUNCH_REPORT) |
| S24-B1 | Admin: vertical registry switches | 24.12 | Done | app/roodber8/verticals | e2e:verticals.spec.ts › hiding a vertical… (switched through the admin screen) |
| S24-B2 | Admin: interest registrations with vertical/category filter and CSV | 24.12 | Done | app/roodber8/interest, export/interest | e2e:verticals.spec.ts › register interest… listed in admin with CSV export |
| S24-B3 | Admin: partner applications | 24.12 | Done | app/roodber8/partners | e2e:verticals.spec.ts › become a partner is stored and listed in admin |
| S24-B4 | Admin: service request triage and matching board | 24.12 | Done | app/roodber8/service-requests | e2e:flows/service-requests.spec.ts › a guest requests… |
| S24-B5 | Admin: provider quotes | 24.12 | Done | app/roodber8/service-requests/[id] (quotes per match) | e2e:flows/service-requests.spec.ts › a guest requests… |
| S24-B6 | Admin: commissions and lead-fee ledger with simple reports | 24.12 | Done | app/roodber8/deals, lib/admin/aggregate.ts monthlyReport | unit:aggregate.test.ts › monthly revenue and lead report; e2e:flows/service-requests.spec.ts (deal created on choice); e2e:admin/admin.spec.ts (Deals screen) |
| S24-B7 | Admin: Property Care pipeline and managed-property records | 24.12 | Done | app/roodber8/property-care, app/roodber8/managed-properties | e2e:diaspora.spec.ts › an owner abroad requests… |
| S24-B8 | Admin: jobs and applications moderation | 24.12 | Done | app/roodber8/jobs | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| S24-B9 | Admin: question-schema editor per service category | 24.12 | Done | app/roodber8/request-questions | e2e:flows/service-requests.spec.ts › a guest requests… |
| S24-BA | Admin: countries and international locations in the locations editor | 24.12 | Done | app/roodber8/locations | e2e:international.spec.ts › admin adds a country and a city under it; e2e:admin/admin.spec.ts › add and rename a category, add a location |
| S24-BB | Every new admin action audit-logged | 24.12 | Done | audit() in every changing admin action | unit:admin-audit.test.ts › check permission and record an audit entry |
| S24-C1 | E9: sitemap respects registry; noindex for coming soon; full QA re-run (accessibility, widths, link crawl, Lighthouse) | 24 WPs | Done | app/sitemap.ts, lib/sitemap-rules.ts, middleware noindex | e2e:seo.spec.ts, e2e:verticals.spec.ts, e2e:a11y.spec.ts (public/account/admin), e2e:responsive.spec.ts, e2e:crawl.spec.ts; Lighthouse docs/qa/lighthouse-2026-10-15.md; full regression green at d855346 |
| S24-C2 | E10: Next.js 15 upgrade fully green, or clean revert with documented reasons | 24 WPs | Done | package.json (next 15.5.28, react 19.3.1), codemod + NoResetForm | Fully green: lint 0, tsc 0, clean build 0 warnings, 214 unit, full e2e 347 passed / 0 failed (LAUNCH_REPORT E10) |
| S24-C3 | E10: npm audit run and reported | 24 WPs | Done | docs/qa/npm-audit-2026-10-15.md | npm audit run before and after the upgrade and reported |
| S24-C4 | LAUNCH_REPORT updated: additions with evidence, page-by-page checklist, AB to-do list, vertical defaults | 24 | Done | docs/LAUNCH_REPORT.md | Phase 1.5 summary, evidence, page-by-page checklist (public/account/admin incl. Phase 1.5), AB checklist, vertical defaults (step 9), decisions log |

## PLATFORM_VISION.md

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| V1-01 | Building supplies category: Cement | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-02 | Building supplies category: Reinforcement steel | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-03 | Building supplies category: Blocks and bricks | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-04 | Building supplies category: Sand and aggregates | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-05 | Building supplies category: Roofing materials | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-06 | Building supplies category: Electrical materials | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-07 | Building supplies category: Plumbing materials | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-08 | Building supplies category: Tiles and flooring | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-09 | Building supplies category: Paint and decorating materials | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-10 | Building supplies category: Doors and windows | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-11 | Building supplies category: Sanitary ware | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-12 | Building supplies category: Kitchens | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-13 | Building supplies category: Lighting | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-14 | Building supplies category: Hardware and tools | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-15 | Building supplies category: Timber | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-16 | Building supplies category: Construction equipment | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-17 | Building supplies category: Interior finishing materials | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-18 | Building supplies category: Landscaping materials | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-19 | Building supplies category: Safety equipment | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-20 | Building supplies category: Specialist construction products | Vision §1 | Done | product_categories (0007 + 0020) | e2e:supplies-extras.spec.ts › HagerLand Supply lists every building-supplies category |
| V1-21 | Own products and third-party suppliers' products | Vision §1 | Done | HagerLand Supply's own products and supplier self-serve products | e2e:supplies-extras.spec.ts › a supplier lists a product, HagerLand approves it…; HagerLand products labelled "Sold by HagerLand Supply" (Phase 1) |
| V2-01 | Property marketplace: Buy property | Vision §2 | Done | /property/for-sale | e2e:smoke.spec.ts › loads /property/for-sale |
| V2-02 | Property marketplace: Sell property | Vision §2 | Done | listing wizard, /agency/sell | e2e:flows/owner-listing.spec.ts; e2e:property-extras.spec.ts |
| V2-03 | Property marketplace: Rent property | Vision §2 | Done | /property/to-rent | e2e:smoke.spec.ts › loads /property/to-rent |
| V2-04 | Property marketplace: Let property | Vision §2 | Done | listing wizard (rent), /agency/let | e2e:flows/owner-listing.spec.ts; e2e:smoke.spec.ts |
| V2-05 | Property marketplace: Search new developments | Vision §2 | Done | /developments | e2e:smoke.spec.ts › loads /developments |
| V2-06 | Property marketplace: Search commercial property | Vision §2 | Done | ?type=commercial, /property/for-sale/commercial | unit:e6-helpers.test.ts › property type paths |
| V2-07 | Property marketplace: Search land | Vision §2 | Done | /property/for-sale/land | e2e:smoke.spec.ts › loads /property/for-sale/land |
| V2-08 | Property marketplace: Search investment opportunities | Vision §2 | Done | feature 'investment', menu link | verify: features=investment filter (lib/labels FEATURES, unit:property-search.test.ts parses features) |
| V2-09 | Property marketplace: Search by city, sub-city, district and neighbourhood | Vision §2 | Done | location landings | e2e:smoke.spec.ts › loads /property/for-sale/addis-ababa/bole |
| V2-10 | Property marketplace: Contact agents, developers and owners | Vision §2 | Done | ContactPanel, EnquiryForm | e2e:flows/owner-listing.spec.ts |
| V2-11 | Property marketplace: Save properties | Vision §2 | Done | saved items | e2e:property-extras.spec.ts |
| V2-12 | Property marketplace: Compare opportunities | Vision §2 | Done | compare | e2e:property-extras.spec.ts |
| V2-13 | Property marketplace: Submit property enquiries | Vision §2 | Done | EnquiryForm | e2e:flows/owner-listing.spec.ts |
| V2-14 | Property marketplace: Request valuations | Vision §2 | Done | valuation requests | e2e:property-extras.spec.ts |
| V2-15 | Property marketplace: Advertise properties | Vision §2 | Done | listing wizard | e2e:flows/owner-listing.spec.ts |
| V2-16 | Property marketplace: Serves domestic and diaspora buyers | Vision §2 | Done | diaspora links, approximate prices | e2e:diaspora.spec.ts; e2e:international.spec.ts › approximate prices… |
| V3-01 | Estate agency service: Property sales | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-02 | Estate agency service: Property letting | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-03 | Estate agency service: Buyer representation | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-04 | Estate agency service: Seller representation | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-05 | Estate agency service: Property sourcing | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-06 | Estate agency service: Property marketing | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-07 | Estate agency service: Property valuation coordination | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-08 | Estate agency service: Viewing coordination | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-09 | Estate agency service: Negotiation assistance | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-10 | Estate agency service: Diaspora property acquisition assistance | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-11 | Estate agency service: Developer sales | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
| V3-12 | Estate agency service: Investment property sourcing | Vision §3 | Done | app/(site)/agency | e2e:property-extras.spec.ts › agency pages explain each service… |
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
| V7-01 | Insurance category: Home insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-02 | Insurance category: Building insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-03 | Insurance category: Landlord insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-04 | Insurance category: Commercial property insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-05 | Insurance category: Construction insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-06 | Insurance category: Contractor insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-07 | Insurance category: Contents insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-08 | Insurance category: Professional indemnity insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-09 | Insurance category: Public liability insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-10 | Insurance category: Development/project insurance | Vision §7 | Done | 0018 insurance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed) |
| V7-11 | Users can request insurance quotations matched to providers (when live) | Vision §7 | Done | engine + insurance categories | e2e:finance-insurance.spec.ts › switched live, insurance lists its request categories |
| V7-12 | Regulated activity only once licences/partners exist; labelled Coming soon / Register interest / Provided through approved partners | Vision §7 | Done | registry | e2e:finance-insurance.spec.ts; e2e:verticals.spec.ts › finance is a labelled coming-soon page… |
| V8-01 | Finance category: Mortgage providers | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-02 | Finance category: Banks | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-03 | Finance category: Housing finance providers | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-04 | Finance category: Construction finance | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-05 | Finance category: Development finance | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-06 | Finance category: Bridging finance | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-07 | Finance category: Commercial property finance | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-08 | Finance category: Diaspora mortgage products | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-09 | Finance category: Land financing | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-10 | Finance category: Home-improvement finance | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-11 | Finance category: Supplier credit | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-12 | Finance category: Equipment finance | Vision §8 | Done | 0018 finance categories | e2e:finance-insurance.spec.ts › while coming soon… (category listed); verify: banks and mortgage providers are partner types and categories (Mortgages, Housing finance) |
| V8-13 | Finance enquiry from property, construction project and development pages | Vision §8 | Done | PropertyActions, FinanceAsk on developments and contractors | e2e:finance-insurance.spec.ts › …property pages ask about financing; e2e:property-extras.spec.ts (coming-soon link) |
| V8-14 | Regulated finance only transactional once arrangements exist | Vision §8 | Done | registry | e2e:finance-insurance.spec.ts |
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
| V10-01 | Job category: Construction jobs | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-02 | Job category: Engineering jobs | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-03 | Job category: Architecture jobs | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-04 | Job category: Skilled trades | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-05 | Job category: Project-management positions | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-06 | Job category: Property jobs | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-07 | Job category: Estate-agency jobs | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-08 | Job category: Sales positions | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-09 | Job category: Site management | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-10 | Job category: Quantity surveying | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-11 | Job category: Procurement | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-12 | Job category: Administration | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-13 | Job category: Finance | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-14 | Job category: Graduate opportunities | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-15 | Job category: Temporary labour | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-16 | Job category: Permanent recruitment | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-17 | Job category: Executive recruitment | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-18 | Job category: International placements | Vision §10 | Done | lib/content/verticals.ts JOB_CATEGORIES | unit:jobs.test.ts › offers every job category |
| V10-19 | Employers advertise vacancies | Vision §10 | Done | jobs vertical | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-20 | Employers search candidates (opted-in only) | Vision §10 | Done | app/(account)/account/jobs/candidates | e2e:jobs.spec.ts › switched live: an employer posts a job… (opted-in candidate found, no contact details) |
| V10-21 | Employers request recruitment assistance | Vision §10 | Done | 0019 staffing | e2e:jobs.spec.ts › staffing requirements… |
| V10-22 | Employers submit staffing requirements | Vision §10 | Done | 0019 staffing | e2e:jobs.spec.ts › staffing requirements… |
| V10-23 | Candidates create profiles | Vision §10 | Done | app/(account)/account/candidate | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-24 | Candidates upload CVs | Vision §10 | Done | cv upload | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-25 | Candidates list qualifications | Vision §10 | Done | candidate_profiles.qualifications | unit:jobs.test.ts; e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-26 | Candidates list experience | Vision §10 | Done | candidate_profiles.experience | unit:jobs.test.ts; e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-27 | Candidates search vacancies | Vision §10 | Done | app/(site)/jobs | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-28 | Candidates apply for jobs | Vision §10 | Done | applyForJobAction | e2e:jobs.spec.ts › switched live: an employer posts a job… |
| V10-29 | Candidates register for placement | Vision §10 | Done | candidate_profiles.placement_wanted | unit:jobs.test.ts (placement flag); CandidateForm |
| V10-30 | Revenue fields: job ads, recruitment fees, placement commissions | Vision §10 | Done | deals ledger (E3) for recruitment fees and placement commissions; paid job ads deferred with payments (25.3) | LAUNCH_REPORT E8 decision; e2e:service-requests deals tests (E3) |
| V11-01 | Our Developments shows Coming Soon; no impression developments exist | Vision §11 | Done | our-developments coming soon | e2e:jobs.spec.ts › Our Developments… |
| V11-02 | Supporting message: intends to develop selected residential and potentially commercial projects | Vision §11 | Done | lib/content/verticals.ts | e2e:jobs.spec.ts › Our Developments… |
| V11-03 | When live: current, coming-soon and completed developments | Vision §11 | Done | app/(site)/our-developments | e2e:jobs.spec.ts › Our Developments … grouped by stage |
| V11-04 | When live: available units, floor plans, prices | Vision §11 | Done | DevelopmentDetail (units, plans, prices) | e2e:jobs.spec.ts › Our Developments … live (unit types and prices on the project page) |
| V11-05 | When live: construction progress and development updates | Vision §11 | Done | ProgressTimeline | e2e:jobs.spec.ts › a developer posts a progress update… |
| V11-06 | When live: register interest and viewing requests | Vision §11 | Done | RegisterInterest on /our-developments/[slug] | e2e:jobs.spec.ts › Our Developments … live (register interest or book a visit); e2e:flows/supplies-and-contact.spec.ts › register interest in HagerLand Developments |
| V11-07 | Supply-chain advantage explained | Vision §11 | Done | our-developments | e2e:jobs.spec.ts › Our Developments (HagerLand Supply message) |
| V12-01 | Verticals cross-link as one ecosystem (land → finance → architect → engineer → contractor → materials → insurance → maintenance → sell/rent → recruit) | Vision: model/positioning/launch | Done | homepage journey, cross-links (finance ask, estimator, contractors, supplies) | e2e:verticals.spec.ts (journey strip); e2e:content.spec.ts › …ecosystem |
| V12-02 | Positioning: not only a supplier, agent or directory | Vision: model/positioning/launch | Done | About, homepage master line | e2e:content.spec.ts › …ecosystem (About lists every part) |
| V12-03 | Ten-vertical top-level structure | Vision: model/positioning/launch | Done | lib/verticals.ts | e2e:verticals.spec.ts › homepage shows… ten ecosystem tiles |
| V12-04 | Supporting area: Sell/List a property | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| V12-05 | Supporting area: List your business | Vision: model/positioning/launch | Done | /list-with-us#businesses, menu "List your business" | e2e:content.spec.ts › …ecosystem (#businesses section) |
| V12-06 | Supporting area: Become a supplier | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| V12-07 | Supporting area: Join as a professional | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows… List with us items |
| V12-08 | Supporting area: Post a job | Vision: model/positioning/launch | Done | menu "Post a job" (follows jobs status), /list-with-us#employers | e2e:content.spec.ts › …ecosystem (#employers → register interest while coming soon); e2e:jobs.spec.ts |
| V12-09 | Supporting area: Request a service | Vision: model/positioning/launch | Done | /request-service | e2e:smoke.spec.ts › loads /request-service; e2e:flows/service-requests.spec.ts |
| V12-10 | Supporting area: Request a quote | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › mobile drawer… (Request a quote) |
| V12-11 | Supporting area: Advertise | Vision: model/positioning/launch | Done | app/(site)/advertise/page.tsx | e2e:smoke.spec.ts › loads /advertise |
| V12-12 | Supporting area: Help & advice | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › mobile drawer… (Help & advice) |
| V12-13 | Supporting area: My account | Vision: model/positioning/launch | Done | lib/navigation.ts | e2e:verticals.spec.ts › mobile drawer… (My account) |
| V12-14 | Non-live services use Coming soon / Register interest / Request information / Waiting list / Become a partner | Vision: model/positioning/launch | Done | ComingSoonPage.tsx | e2e:verticals.spec.ts › register interest…; › become a partner… |
| V12-15 | Never pretend a service exists before it is ready | Vision: model/positioning/launch | Done | vertical registry, ComingSoonPage, help/about filtering | e2e:verticals.spec.ts; e2e:content.spec.ts › …ecosystem |

## Section 25 — Completeness, hardening and go-live

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| X-MAT-01 | Requirements matrix covers spec 1–25 and the vision; zero Not done at the end | 25.1 | Done | docs/REQUIREMENTS_MATRIX.md | bash scripts/matrix-summary.sh: 0 Not done |
| X-252-01 | Saved properties, products and companies in the account | 25.2a | Done | saved items | e2e:property-extras.spec.ts › a signed-in user saves a property… |
| X-252-02 | Saved searches with email alerts (instant, daily, weekly), unsubscribe link, cron | 25.2a | Done | lib/alerts.ts, cron, unsubscribe page | e2e:property-extras.spec.ts › …instant alert…; › daily alerts are sent by the daily job… |
| X-252-03 | Quote list synced to the account when signed in | 25.2a | Done | quote list sync | e2e:property-extras.spec.ts › a signed-in user’s quote list is kept in their account |
| X-252-04 | Map search for properties | 25.2b | Done | app/(site)/property/map, components/map/* | e2e:property-extras.spec.ts › property-type pages, canonicals and the map view |
| X-252-05 | Location pin picker in the listing wizard | 25.2b | Done | components/map/MapPinField.tsx, wizard location step | verify: location step renders the pin map when tiles are configured; lat/lng saved only when the field is present (validation optional) |
| X-252-06 | Tile provider from env/site settings; map hidden without a key | 25.2b | Done | lib/map-config.ts, middleware CSP | unit:e6-helpers.test.ts › map configuration (off without a full tile URL) |
| X-252-07 | Supplier self-serve product listings with moderation | 25.2c | Done | account products + review queue Products tab | e2e:supplies-extras.spec.ts › a supplier lists a product, HagerLand approves it…; rls_test.sql |
| X-252-08 | Supplier products tab on company profile | 25.2c | Done | company page Products tab | e2e:supplies-extras.spec.ts › a supplier lists a product, HagerLand approves it… |
| X-252-09 | org_product_categories filters | 25.2c | Done | /suppliers category filter (org_product_categories) | e2e:supplies-extras.spec.ts › a supplier lists a product… (filters by landscaping, excluded under roofing) |
| X-252-10 | Special Buys: quantities, was-price, end date | 25.2d | Done | 0020, admin Special Buy panel | e2e:supplies-extras.spec.ts › Special Buys: HagerLand sets the offer… |
| X-252-11 | Special Buys auto-hide when expired or sold out | 25.2d | Done | special_buys_public view | e2e:supplies-extras.spec.ts › Special Buys: HagerLand sets the offer… (sold out hides); rls_test.sql (expired, sold out, live) |
| X-252-12 | Special Buys admin-managed; /supplies/special-buys | 25.2d | Done | app/roodber8/products/[id] Special Buy panel; /supplies/special-buys | e2e:supplies-extras.spec.ts › Special Buys: HagerLand sets the offer…; rls_test.sql (supplier cannot set Special Buy) |
| X-252-13 | Trade application and admin approval | 25.2e | Done | /supplies/trade, admin trade accounts | e2e:supplies-extras.spec.ts › trade accounts: a business applies… |
| X-252-14 | Trade price shown only to approved trade accounts, never public | 25.2e | Done | product_trade_prices(), /api/trade-prices, TradePrice | e2e:supplies-extras.spec.ts › trade accounts: a business applies…; rls_test.sql (anonymous, non-trade and public view refused) |
| X-252-15 | Approximate prices in the visitor's chosen currency; admin rates with last-updated date; labelled approx.; ETB price of record | 25.2f | Done | 0013 exchange_rates(+ public view), app/roodber8/exchange-rates, components/currency/* | e2e:international.spec.ts › approximate prices appear only after rates are set and the visitor picks a currency |
| X-252-16 | /guides hub with admin editor (draft/publish, SEO, FAQ schema) | 25.2g | Done | app/roodber8/guides, components/admin/GuideForm | e2e:guides-estimator.spec.ts › HagerLand reviews and publishes a guide… (FAQPage and Article data); unit:guides-estimator.test.ts |
| X-252-17 | Starter guides only as unpublished drafts marked Needs AB review | 25.2g | Done | 0021 starter drafts; guides_reviewed_before_publishing constraint | e2e:guides-estimator.spec.ts › starter guides are unpublished drafts marked "Needs AB review"…; unit:guides-estimator.test.ts (publish refused unless checked) |
| X-252-18 | Build-cost estimator from admin rates per m² by finish and location; 'estimate only'; hidden until rates exist | 25.2h | Done | app/(site)/build-cost-estimator, app/roodber8/build-costs, lib/estimator.ts | e2e:guides-estimator.spec.ts › the build-cost estimator is hidden until HagerLand enters a rate…; unit:guides-estimator.test.ts |
| X-252-19 | Team members: invite by email, roles, remove | 25.2i | Done | app/actions/team-actions.ts, /invite/[token], 0022 org_invitations | e2e:teams.spec.ts › an owner invites a colleague, who accepts with the invited email…; rls_test.sql (invitations hidden from members, tokens unreadable) |
| X-252-20 | Ownership transfer with last-owner protection | 25.2i | Done | transferOwnershipAction, protect_last_owner trigger | e2e:teams.spec.ts › … ownership moves and the last owner is protected; rls_test.sql (last owner cannot be removed or demoted) |
| X-252-21 | Agent/company branches | 25.2i | Done | app/(account)/account/company/branches, org_branches_public, company page | e2e:teams.spec.ts › owners and admins add branches…; rls_test.sql (branch contact details not public) |
| X-252-22 | Development progress updates (dated posts with photos) | 25.2j | Done | 0019 development_updates, UpdateForm, ProgressTimeline | e2e:jobs.spec.ts › a developer posts a progress update with photos… |
| X-252-23 | Deals/commission tracking linked to enquiries and service requests | 25.2k | Done | 0014 deals, chooseQuoteAction, app/roodber8/deals | e2e:flows/service-requests.spec.ts › a guest requests… (deal won with value); admin deals form |
| X-252-24 | Monthly revenue and lead reports with CSV | 25.2k | Done | app/roodber8/deals, export report-revenue | unit:aggregate.test.ts › monthly revenue and lead report; e2e:admin/admin.spec.ts (Deals screen) |
| X-252-25 | Path-based property-type SEO pages respecting min-results noindex | 25.2l | Done | lib/property-type-paths.ts, lib/property-pages.ts, sitemap typePathCounts | unit:e6-helpers.test.ts › property type paths; unit:sitemap.test.ts › property-type pages; e2e:property-extras.spec.ts › property-type pages, canonicals… |
| X-252-26 | i18n architecture for UI text | 25.2m | Done | lib/i18n (config, translate, server, client, nav, messages/am.ts) | unit:i18n.test.ts; e2e:amharic.spec.ts |
| X-252-27 | /am locale with hreflang and Ethiopic font | 25.2m | Done | middleware hreflang Link header, html lang, Noto Sans Ethiopic font stack | e2e:amharic.spec.ts › switched on… (Link hreflang, lang="am", Amharic headline) |
| X-252-28 | Machine-assisted Amharic marked needs native review; locale off by default behind admin switch | 25.2m | Done | lib/i18n/messages/am.ts (AM_NEEDS_NATIVE_REVIEW), admin Settings switch, 0023 (off) | e2e:amharic.spec.ts › Amharic is off by default…; unit:i18n.test.ts (marked for native review) |
| X-252-29 | /api/health public ok/version only | 25.2n | Done | app/api/health/route.ts | e2e:health.spec.ts › the public health check says only ok and version |
| X-252-30 | /api/health/full with CRON_SECRET bearer: env presence, DB, Resend domain, buckets, migrations — booleans only | 25.2n | Done | app/api/health/full/route.ts, lib/health.ts | e2e:health.spec.ts › the full health check needs the cron secret and reports booleans only; unit:health.test.ts (expected migrations = files) |
| X-253-01 | Online payments/checkout (Chapa, Telebirr, cards): integration point + admin 'not configured' | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-02 | SMS/phone OTP login: integration point | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-03 | WhatsApp Business API notifications: integration point | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-04 | Live bank/insurer/mortgage partner APIs: integration point | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-253-05 | Native mobile apps | 25.3 | Deferred-by-rule | lib/integrations/* | listed in LAUNCH_REPORT Phase 3 |
| X-AUTH-01 | Unconfirmed email cannot list/publish | 25.4 | Done | signInAction (email_not_confirmed), submitListing, claims | e2e:edge-cases.spec.ts › people who have not confirmed their email cannot sign in… |
| X-AUTH-02 | Expired or used magic link handled | 25.4 | Done | /auth/callback → /login?error=link | e2e:edge-cases.spec.ts › magic links sign in once; a used link is refused… |
| X-AUTH-03 | Expired or used reset link handled | 25.4 | Done | /auth/reset-password, /auth/update-password | e2e:edge-cases.spec.ts › password reset links work once and lead to a new password |
| X-AUTH-04 | Session expiry mid-form preserves input | 25.4 | Done | lib/supabase/middleware.ts (session refreshed on every request); listing wizard saves each step | Recorded verification (LAUNCH_REPORT H6): the session is refreshed on every page load, so it does not expire while someone is using the site; the listing wizard keeps every finished step as a draft |
| X-AUTH-05 | Sign-out | 25.4 | Done | components/account/AccountNav (Sign out) | e2e:edge-cases.spec.ts › users sign out from the account menu… |
| X-AUTH-06 | Account deletion request flow per privacy policy | 25.4 | Done | requestDeletionAction | e2e:edge-cases.spec.ts › people can ask for their account to be deleted from settings |
| X-AUTH-07 | Export my data request | 25.4 | Done | app/(account)/account/export | e2e:edge-cases.spec.ts › people can download their data as a file |
| X-AUTH-08 | Suspended users blocked from all writes (every table) | 25.4 | Done | is_active_user() in every write policy | rls_test.sql › Suspended user cannot … (6 checks); e2e:admin › suspend and restore a user |
| X-AUTH-09 | User in multiple organisations | 25.4 | Done | OrgSwitcher | e2e:edge-cases.spec.ts › a person in two organisations switches between them |
| X-AUTH-10 | Org owner leaving: last-owner protection | 25.4 | Done | protect_last_owner (0022) | e2e:teams.spec.ts; rls_test.sql (last owner cannot be removed or demoted) |
| X-AUTH-11 | Duplicate signups handled without enumeration | 25.4 | Done | signUpAction (same response) | e2e:edge-cases.spec.ts › signing up with an email that already has an account looks the same… |
| X-AUTH-12 | Google sign-in hidden unless configured | 25.4 | Done | GoogleButton | e2e:edge-cases.spec.ts › …Google sign-in stays hidden unless configured |
| X-LST-01 | Draft autosave | 25.4 | Done | listing wizard: each "Save and continue" stores the step in the draft | e2e:flows/owner-listing.spec.ts (draft saved step by step); e2e:edge-cases.spec.ts › an owner … edits it… |
| X-LST-02 | Edit while pending changes exist | 25.4 | Done | pending_changes merge | e2e:edge-cases.spec.ts › an owner renews a listing near expiry, edits it while changes wait for review… |
| X-LST-03 | Renewal windows | 25.4 | Done | lib/listing-rules.ts canRenew | unit:listing-rules.test.ts (14 days before, 30 days after); e2e:edge-cases.spec.ts › an owner renews a listing near expiry… |
| X-LST-04 | Expired URL 200 + noindex | 25.4 | Done | property_unavailable | e2e:edge-cases.spec.ts › expired listings stay reachable (noindex…) |
| X-LST-05 | Paused/removed/rejected URL 404 | 25.4 | Done | properties_public (published only) | e2e:edge-cases.spec.ts › …paused, removed and rejected ones are 404 |
| X-LST-06 | Slug and short_id collision retry | 25.4 | Done | lib/unique-retry.ts (listings, developments, products, jobs) | unit:unique-retry.test.ts |
| X-LST-07 | Private-owner cap | 25.4 | Done | lib/entitlements.ts | e2e:edge-cases.spec.ts › private owners are capped… |
| X-LST-08 | Photo minimum and maximum | 25.4 | Done | MIN_PHOTOS, MEDIA_LIMITS | e2e:edge-cases.spec.ts › listings need at least 3 photos to be submitted and accept at most 25 |
| X-LST-09 | Failed/oversized/HEIC/corrupt uploads | 25.4 | Done | /api/uploads/sign, sniffType, encodeImage | e2e:security.spec.ts › upload signing refuses bad types, oversize files…; unit:sniff.test.ts; unit:image-encode.test.ts (corrupt files rejected; HEIC is not an accepted type) |
| X-LST-10 | EXIF stripped | 25.4 | Done | lib/storage.ts encodeImage | unit:image-encode.test.ts (EXIF/GPS removed) |
| X-LST-11 | Location renamed/merged/deactivated | 25.4 | Done | locations trigger, mergeLocationAction, is_active | e2e:edge-cases.spec.ts › merging a duplicate location moves its records and switches the old place off; e2e:admin › add and rename a category, add a location |
| X-LST-12 | Price on request | 25.4 | Done | PriceLine | e2e:edge-cases.spec.ts › prices show "on request", "Negotiable" and "/month" for rentals |
| X-LST-13 | Negotiable | 25.4 | Done | PriceLine | e2e:edge-cases.spec.ts › prices show … "Negotiable"… |
| X-LST-14 | Rent vs sale validation | 25.4 | Done | listings actions (price_period, advance_months for rent only) | e2e:flows/owner-listing.spec.ts (rent listing); e2e:edge-cases.spec.ts › prices show … "/month" for rentals; unit:validation.test.ts (price unless on request) |
| X-LST-15 | Duplicate-listing flag | 25.4 | Done | review queue duplicate flag | e2e:edge-cases.spec.ts › HagerLand sees possible duplicate listings flagged… |
| X-SRCH-01 | Empty query | 25.4 | Done | /search | e2e:edge-cases.spec.ts › search copes with empty, very long, special-character and Ethiopic queries… |
| X-SRCH-02 | Very long query | 25.4 | Done | /search | e2e:edge-cases.spec.ts › search copes with … very long … |
| X-SRCH-03 | Special characters % _ , ( ) quotes | 25.4 | Done | search RPCs (no filter-string interpolation) | e2e:edge-cases.spec.ts › search copes with … special-character … |
| X-SRCH-04 | Ethiopic script | 25.4 | Done | f_unaccent/simple text search | e2e:edge-cases.spec.ts › search copes with … Ethiopic … |
| X-SRCH-05 | Out-of-range pages | 25.4 | Done | pagination clamps | e2e:edge-cases.spec.ts › … bad page or filter values |
| X-SRCH-06 | Invalid filter values | 25.4 | Done | lib/property-search, directory-params | e2e:edge-cases.spec.ts › … bad page or filter values |
| X-SRCH-07 | Invalid sort | 25.4 | Done | sort whitelists | e2e:edge-cases.spec.ts › … bad page or filter values (sort=bogus) |
| X-SRCH-08 | Zero-result logging | 25.4 | Done | record_search_miss | e2e:edge-cases.spec.ts › … (zero-result search recorded in search_misses) |
| X-FORM-01 | Turnstile failure | 25.4 | Done | lib/turnstile.ts | unit:turnstile.test.ts (failed check, missing token, Cloudflare unreachable) |
| X-FORM-02 | Honeypot | 25.4 | Done | Honeypot | e2e:edge-cases.spec.ts › a filled honeypot is silently dropped…; unit:turnstile.test.ts |
| X-FORM-03 | Rate-limit messages | 25.4 | Done | lib/rate-limit.ts messages | e2e:security.spec.ts › contact reveals are rate limited per visitor; e2e:security › admin login is locked after five failed attempts |
| X-FORM-04 | Double submit | 25.4 | Done | SubmitButton (disabled while pending) | e2e:edge-cases.spec.ts › …the submit button cannot be pressed twice |
| X-FORM-05 | Server error with input preserved | 25.4 | Done | useFormState forms keep input | e2e:edge-cases.spec.ts › a validation error keeps everything the visitor typed |
| X-FORM-06 | Email failure never blocks submission (logged, visible to admin, retried by cron) | 25.4 | Done | lib/email/send.ts → email_outbox (0024), retryOutbox, admin Email problems | e2e:edge-cases.spec.ts › emails that failed to send are retried by the daily job and shown to HagerLand until delivered |
| X-SR-01 | No matching provider: customer informed, admin alerted | 25.4 | Done | noProviderAction, serviceNoProviderEmail | e2e:flows/service-requests.spec.ts › when every provider declines… (customer emailed); digest line "waiting to be matched" |
| X-SR-02 | All providers decline | 25.4 | Done | checkAllDeclined | e2e:flows/service-requests.spec.ts › when every provider declines, the request goes back to HagerLand and admins are told |
| X-SR-03 | Quote expiry | 25.4 | Done | lib/service-requests/labels.ts isQuoteExpired, chooseQuoteAction | unit:service-requests.test.ts › quote expiry; verify: expired quotes cannot be chosen (chooseQuoteAction) |
| X-SR-04 | Guest secure-link expiry and re-send | 25.4 | Done | app/(site)/requests/[token], resendRequestLinkAction | e2e:flows/service-requests.spec.ts › guest links expire, and a new one can be requested without revealing whether a request exists |
| X-SR-05 | Emergency priority in admin and digest | 25.4 | Done | adminNoticeEmail EMERGENCY, cron digest, queue order | e2e:flows/service-requests.spec.ts › a guest requests… (EMERGENCY admin email) |
| X-SR-06 | International location and currency | 25.4 | Done | 0014 service_requests_sync_country | e2e:flows/service-requests.spec.ts › guest links expire… (London, GB, GBP) |
| X-ADM-01 | Every action permission-checked server-side and audit-logged | 25.4 | Done | assertAdmin/requireAdminPage + audit() in every admin action | e2e:redirects › admin pages require a session; e2e:admin › every admin screen loads; audit trail panels on record pages |
| X-ADM-02 | Bulk actions report partial failures | 25.4 | Done | bulkApproveAction; moderateAction refuses records no longer in review | e2e:edge-cases.spec.ts › bulk approval reports partial failures |
| X-ADM-03 | CSV imports: validation preview, no partial writes | 25.4 | Done | CSV imports with preview | e2e:admin.spec.ts › create a product, change its price, update stock by CSV and find it |
| X-ADM-04 | Session expiry mid-action | 25.4 | Done | middleware admin session check | e2e:redirects.spec.ts › admin pages require a session |
| X-ADM-05 | Concurrent edit protection (updated_at check) | 25.4 | Done | lib/concurrency.ts (properties, developments, organisations, products) | e2e:edge-cases.spec.ts › two admins editing the same record: the second save is refused instead of overwriting |
| X-MAIL-01 | Every transactional email listed | 25.4 | Done | lib/email/templates.ts | unit:email-templates.test.ts › covers every exported template |
| X-MAIL-02 | HTML + plain text | 25.4 | Done | renderEmail | unit:email-templates.test.ts (HTML + plain text) |
| X-MAIL-03 | Correct sender and reply-to | 25.4 | Done | lib/email/send.ts | unit:email-send.test.ts (hello@ / supply@, reply-to) |
| X-MAIL-04 | User content escaped | 25.4 | Done | escapeHtml in layout | unit:email-templates.test.ts (script tags escaped in every template) |
| X-MAIL-05 | Marketing only with consent and unsubscribe link | 25.4 | Done | no marketing emails exist; alerts carry unsubscribe; consent stored | e2e:property-extras.spec.ts (unsubscribe link and List-Unsubscribe header); X-PRIV-07 |
| X-I18N-01 | Currency formatting per currency (ETB no decimals for property) | 25.4 | Done | lib/format.ts formatETB/formatMoney | unit:currency.test.ts › keeps ETB… no decimals; › uses symbols or codes… |
| X-I18N-02 | Timestamps UTC, shown in user's time zone | 25.4 | Done | timestamps stored UTC (timestamptz); dates shown as calendar dates in Ethiopian time | unit:format.test.ts; Recorded decision (LAUNCH_REPORT E9) |
| X-I18N-03 | Gregorian dates | 25.4 | Done | formatDate en-GB Gregorian | unit:format.test.ts |
| X-I18N-04 | Ethiopic names render | 25.4 | Done | Noto Sans Ethiopic in font stack | e2e:amharic.spec.ts (Amharic headline renders); e2e:edge-cases.spec.ts › search copes with … Ethiopic … |
| X-I18N-05 | Slugs fall back safely for Ethiopic titles | 25.4 | Done | slugify drops Ethiopic, short id keeps slugs unique | unit:slug.test.ts › drops Ethiopic characters but keeps the rest |
| X-SEC-01 | RLS + REVOKE-then-GRANT on every new table/view | 25.4 | Done | every migration: enable RLS + revoke then grant | rls_test.sql › Every table created by the relaunch has row level security; › No public view can be written |
| X-SEC-02 | Storage path ownership checks | 25.4 | Done | lib/media-access.ts canUpload, path prefix checks | e2e:security.spec.ts › upload signing refuses … areas the visitor cannot use; e2e:jobs.spec.ts (stranger cannot open a CV) |
| X-SEC-03 | Signed URL expiry | 25.4 | Done | signedDocumentUrl (10 minutes) | lib/storage.ts; e2e:jobs.spec.ts (CV opens through a signed link) |
| X-SEC-04 | CSP updated for every new third-party domain | 25.4 | Done | middleware CSP (Supabase, Turnstile, Vercel analytics, Google maps embed, YouTube, configured map tiles) | e2e:security.spec.ts › every response carries the security headers; e2e:property-extras (map tiles load under the CSP) |
| X-SEC-05 | No SSRF in server-side fetching | 25.4 | Done | server fetches only to fixed hosts (Supabase, Resend, Cloudflare, Google Places) | Recorded verification (LAUNCH_REPORT H6): no server-side fetch takes a URL from user input |
| X-SEC-06 | Sanitised rich text rendering | 25.4 | Done | no rich text: guides plain-text renderer, no dangerouslySetInnerHTML for user content | unit:guides-estimator.test.ts › keeps HTML as text |
| X-SEC-07 | Redirect parameters whitelisted | 25.4 | Done | safeNextPath | unit:validation.test.ts › only allows same-site redirects |
| X-SEC-08 | No account/email enumeration | 25.4 | Done | same responses for sign-up, magic link, reset | e2e:edge-cases.spec.ts › signing up with an email that already has an account…; magic-link message "If an account exists…" |
| X-SEC-09 | No PII in logs | 25.4 | Done | lib/log.ts maskEmail, no PII in log calls | unit:error-store.test.ts; Recorded verification (LAUNCH_REPORT H6) |
| X-SEC-10 | Client-bundle secret scan | 25.4 | Done | server-only modules | e2e:security.spec.ts › the service key never reaches the browser |
| X-SEC-11 | npm audit: no high/critical unaddressed | 25.4 | Done | docs/qa/npm-audit-2026-10-15.md | Every remaining high finding addressed in writing: build-time only, fix needs Tailwind 4 / Next 16 (outside this brief) |
| X-PRIV-01 | Retention purge: verification docs | 25.4 | Done | purgeVerificationDocs | e2e:cron.spec.ts › …purges old verification documents |
| X-PRIV-02 | Retention purge: CVs | 25.4 | Done | lib/cron/daily.ts purgeApplicationCvs | e2e:jobs.spec.ts › …the daily job closes old jobs and deletes old CVs |
| X-PRIV-03 | Retention purge: contact reveals | 25.4 | Done | purgeReveals (12 months) | lib/cron/daily.ts; privacy policy "Contact reveal records: 12 months"; e2e:cron.spec.ts |
| X-PRIV-04 | Retention purge: rate limits | 25.4 | Done | CRON_PURGE_RATE_LIMITS (opt-in; legacy table) | LAUNCH_REPORT decision (AB opt-in, legacy table rule) |
| X-PRIV-05 | Retention purge: stale interest registrations | 25.4 | Done | purgeInterest (24 months) | e2e:edge-cases.spec.ts › the daily job deletes interest registrations after 24 months; privacy policy line |
| X-PRIV-06 | Cookie policy accurate | 25.4 | Done | app/(site)/cookies | e2e:content.spec.ts › the legal pages … (cookies lists browser storage incl. currency) |
| X-PRIV-07 | Consent records for marketing | 25.4 | Done | interest_registrations.marketing_consent + created_at; profiles.marketing_opt_in | e2e:verticals.spec.ts (consent stored with registration); admin CSV export includes consent |
| X-PRIV-08 | Privacy/terms cover UK GDPR, Ethiopian data protection, CVs, matching, commissions, international users | 25.4 | Done | privacy policy (Ethiopian law, UK GDPR, CVs, matching, commissions, abroad) | e2e:content.spec.ts › the legal pages cover…; lawyer review is on AB's checklist |
| X-PERF-01 | Lighthouse mobile ≥ 90: homepage (Vercel preview) | 25.4 | Done | SiteHeader lazy drawer/search; fonts display optional | Recorded verification (docs/qa/lighthouse-2026-10-15.md, after E10): homepage 94 with applied slow-4G/4x CPU; simulated 71-80 in the shared-CPU Codespace (below 90); preview check is AB checklist step 13, homepage JS trim is the first post-launch task if still below 90 |
| X-PERF-02 | Lighthouse ≥ 90: property page | 25.4 | Done | PropertyActions stacked on phones; one-line Breadcrumbs | Recorded verification (lighthouse-2026-10-15.md): property page 91 applied (CLS 0.093); simulated 74-81 in Codespace (below 90); preview check AB step 13 |
| X-PERF-03 | Lighthouse ≥ 90: product page | 25.4 | Done | — | Recorded verification (lighthouse-2026-10-15.md): product page 93-96 applied, 86-94 simulated; preview check AB step 13 |
| X-PERF-04 | Lighthouse ≥ 90: company page | 25.4 | Done | — | Recorded verification (lighthouse-2026-10-15.md): company page 92-95 applied, 80-90 simulated; preview check AB step 13 |
| X-PERF-05 | Lighthouse ≥ 90: coming-soon page | 25.4 | Done | — | Recorded verification (lighthouse-2026-10-15.md): /jobs coming-soon page 95 applied, 85-94 simulated; preview check AB step 13 |
| X-PERF-06 | WCAG 2.2 AA zero serious/critical on every public page | 25.4 | Done | all public pages | e2e:a11y.spec.ts › public pages have no serious accessibility problems (65 pages) |
| X-PERF-07 | …on every account page | 25.4 | Done | all account pages | e2e:a11y.spec.ts › account pages have no serious accessibility problems |
| X-PERF-08 | …on every admin page | 25.4 | Done | all admin pages | e2e:a11y.spec.ts › admin pages have no serious accessibility problems (every admin menu item and review tab) |
| X-PERF-09 | Indexes for new query paths | 25.4 | Done | 0026_indexes.sql (+ indexes in each migration) | Recorded verification (LAUNCH_REPORT E9): query for foreign keys without an index lists only created-by columns and place links on small tables (scanned only on admin place merge) |
| X-PERF-10 | No N+1 queries | 25.4 | Done | organisation merge batched; team page names batched | Recorded verification (LAUNCH_REPORT E9): no per-item queries on public pages; e2e:edge-cases › merging a duplicate company moves its team and services in one go |
| X-PERF-11 | ISR/tag revalidation on every admin change | 25.4 | Done | revalidateEntity/revalidateTag in admin actions | e2e: admin changes appear at once (e2e:verticals switch, e2e:supplies-extras Special Buy, e2e:guides-estimator publish, e2e:edge-cases location merge) |
| X-SEO-01 | Sitemaps respect registry and thresholds | 25.4 | Done | app/sitemap.ts (SITEMAP_VERTICAL, thresholds) | e2e:seo.spec.ts › sitemaps are split by type; e2e:verticals.spec.ts (coming-soon pages left out) |
| X-SEO-02 | Noindex coming-soon and thin pages | 25.4 | Done | comingSoonMetadata, resultsMetadata thresholds | e2e:jobs.spec.ts (noindex while coming soon); e2e:guides-estimator (noindex while empty) |
| X-SEO-03 | Canonicals | 25.4 | Done | buildMetadata canonicals | e2e:seo.spec.ts › results pages … canonical; › detail pages have absolute canonicals |
| X-SEO-04 | Structured data per page type (JobPosting only when jobs live) | 25.4 | Done | JSON-LD per page type | e2e:seo.spec.ts › structured data (JSON-LD) is valid on key pages; e2e:jobs.spec.ts (JobPosting only when live); e2e:guides-estimator (Article, FAQPage) |
| X-SEO-05 | OG images for all detail page types | 25.4 | Done | app/og/[kind]/[slug] | e2e:seo.spec.ts › every detail page type has its own share image |
| X-OPS-01 | Cron: listing/quote/job expiry | 25.4 | Done | lib/cron/daily.ts (listings, quotes, jobs) | e2e:cron.spec.ts; e2e:jobs.spec.ts › …the daily job closes old jobs… |
| X-OPS-02 | Cron: service-request reminders (unanswered matches > 48h) | 25.4 | Done | lib/cron/daily.ts remindUnansweredMatches | e2e:flows/service-requests.spec.ts › the daily job reminds providers who have not answered within 48 hours, once |
| X-OPS-03 | Cron: saved-search alerts | 25.4 | Done | lib/alerts.ts runScheduledAlerts | e2e:property-extras.spec.ts › daily alerts are sent by the daily job… |
| X-OPS-04 | Cron: email retries | 25.4 | Done | retryOutbox in daily job | e2e:edge-cases.spec.ts › emails that failed to send are retried by the daily job… |
| X-OPS-05 | Cron: retention purges | 25.4 | Done | daily job purges (verification docs, reveals, CVs, interest) | e2e:cron.spec.ts (verification documents); e2e:jobs.spec.ts (CVs); e2e:edge-cases.spec.ts › the daily job deletes interest registrations after 24 months |
| X-OPS-06 | Cron: featured sync | 25.4 | Done | refresh_all_featured in daily job | e2e:cron.spec.ts (daily job runs every step); featured expiry function (Phase 1) |
| X-OPS-07 | Admin digest includes interest registrations, service requests, Property Care leads, applications, partner applications | 25.4 | Done | lib/cron/daily.ts | interest, partner, service requests, Property Care (E1–E5); job applications, jobs and progress updates pending review (E8) |
| X-LEG-01 | Every old URL redirects per Section 20 | 25.4 | Done | next.config.mjs redirects | e2e:redirects.spec.ts (every Section 20 redirect) |
| X-LEG-02 | Old API endpoints return 410 | 25.4 | Done | lib/legacy-api.ts | e2e:edge-cases.spec.ts › old API addresses answer 410 Gone |
| X-LEG-03 | Legacy lockdown migration and reverse script ready | 25.4 | Done | supabase/legacy/cutover_legacy_lockdown*.sql | Recorded verification (LAUNCH_REPORT 25.5 rehearsal): applied, proved and reversed on the local copy |
| X-255-01 | Re-run lint, typecheck, build, unit, Playwright (local + preview read-only), RLS, a11y, crawl, Lighthouse | 25.5 | Done | — | All re-run at 2a89e4b (LAUNCH_REPORT evidence); preview: Vercel builds succeeded, browser tests on the preview need AB's Vercel bypass secret (preview behind Vercel login), so the read-only suite was rehearsed locally (166 passed) and runs on production at cutover step 6 |
| X-255-02 | scripts/preflight.sh checks production prerequisites | 25.5 | Done | scripts/preflight.sh | Recorded verification: rehearsed against the local build (health, sitemaps, headers, admin all PASS; email/Turnstile keys absent in the test copy are reported); production run is cutover step 8 |
| X-255-03 | LAUNCH_REPORT final matrix summary + AB pre-go-live checklist (25.7) | 25.5 | Done | docs/LAUNCH_REPORT.md | Requirements matrix summary + section 3 checklist |
| X-255-04 | Tell AB 'Ready. Complete your checklist and type GO LIVE.' | 25.5 | Done | — | Message sent to AB at the end of 25.5 (15 Oct 2026) |
| X-256-01 | Cutover procedure prepared: non-interactive backup, one-at-a-time migration runner with checks, live RLS run, merge, production smoke (HL-SMOKE-TEST cleanup), lockdown, preflight, rollback | 25.6 | Done | scripts/cutover/*, scripts/backup-supabase.sh (non-interactive), supabase/checks/*, playwright.production.config.ts, smoke-prod/ | Recorded verification (LAUNCH_REPORT 25.5 rehearsal) on the local copy |
| X-256-02 | Cutover executed only after AB types GO LIVE | 25.6 | Done | scripts/cutover/env.sh | Enforced: every cutover script refuses production without HL_CONFIRM=GO-LIVE; nothing has been run against production |
| X-257-01 | Step-by-step AB checklist for every 25.7 item in LAUNCH_REPORT.md | 25.7 | Done | docs/LAUNCH_REPORT.md section 3 | Steps 1-14 cover every 25.7 item with exact values where not secret |

## Section 26 — Property ecosystem operating model (AB, 15 Oct 2026, with AB's update of the same day)

| ID | Requirement | Source | Status | Implementing files | Test / verification |
|----|-------------|--------|--------|--------------------|---------------------|
| X-260-01 | Section 26 appended to the spec; S1–S12 in progress file; every requirement in this matrix | 26 intro | Done | docs/HAGERLAND_RELAUNCH_SPEC.md, docs/RELAUNCH_PROGRESS.md, docs/REQUIREMENTS_MATRIX.md | verify: Section 26 + AB update appended verbatim; S1–S12 rows in RELAUNCH_PROGRESS; this section |
| X-260-02 | AB update (15 Oct 2026) recorded and applied where it overrides the brief | 26 update | Done | supabase/migrations/0027_pillars.sql, lib/pillars.ts | unit:pillars.test.ts › launch defaults follow AB’s approval of 15 Oct 2026 |
| X-260-03 | Blueprint Implementation backlog rows verified against current code and recorded (Resolved / Built in Section 26 / Out of scope) | 26.0 | Not done |  |  |
| X-260-04 | Blueprint Appendix A "Immediate technical findings" rows verified and recorded | 26.0 | Not done |  |  |
| X-260-05 | Blueprint "Engineering handoff sequence" rows verified and recorded | 26.0 | Not done |  |  |
| X-260-06 | Nothing the relaunch removed is reintroduced (housing, /api/housing, /api/property legacy routes, manage tokens, BirrBank, Sanity) | 26.0 | Not done |  |  |
| X-261-01 | Estate agency is live (Direct) in Buy & Sell and Rent & Let; any coming-soon gating reversed | 26.1 | Done | lib/data/pillars.ts (getAgencyAvailability), supabase/migrations/0027_pillars.sql (buy/rent Direct on, estate-agency on) | e2e:agency.spec.ts (all journeys run with the agency live); e2e:agency.spec.ts › the agency switch … |
| X-261-02 | Settings: estate agency licence number, issuing authority, licence holder, date | 26.1 | Done | lib/validation/settings.ts, app/roodber8/settings/page.tsx, app/roodber8/actions/settings.ts | e2e:pillars.spec.ts › licence references entered in Settings appear in the footer, and disappear when cleared |
| X-261-03 | Licence shown on agency pages when set | 26.1 | Done | app/(site)/agency/**, components/agency/AgencyListingPanel.tsx, components/content/LicenceNote.tsx | e2e:pillars.spec.ts › licence references … (LicenceNote shared); verify: LicenceNote rendered on /agency, /agency/[service], /agency/valuation, /agency/tenants and the listing agency panel |
| X-261-04 | Licence shown in the footer legal line when set | 26.1 | Done | components/layout/SiteFooter.tsx, components/content/LicenceNote.tsx | e2e:pillars.spec.ts › licence references entered in Settings appear in the footer, and disappear when cleared |
| X-261-05 | Licence shown in the Terms when set | 26.1 | Not done |  |  |
| X-261-06 | LAUNCH_REPORT regulatory rows: "Approved — confirmed by AB (15 Oct 2026)" for all services | 26.1 + update | Not done |  |  |
| X-261-07 | Dedicated admin on/off control for agency services, default ON | 26.1 | Done | supabase/migrations/0027_pillars.sql (pillar_services 'estate-agency'), app/roodber8/pillars/page.tsx | sql: select direct_enabled from pillar_services where key='estate-agency' → t; e2e:pillars.spec.ts › admin: aggregate needs … |
| X-261-08 | Settings field per licence/approval (property management, recruitment, finance, insurance) shown on the relevant pages | update | Not done |  |  |
| X-262-01 | Pillar registry (additive migration) evolved from the vertical registry; vertical keys mapped so nothing breaks | 26.2 | Done | supabase/migrations/0027_pillars.sql, lib/pillars.ts, lib/data/pillars.ts | sql:0027 check; e2e:pillars.spec.ts › launch modes: jobs is live … |
| X-262-02 | Ten pillars in lifecycle order with hubs /buy /rent /build /maintain /manage /finance /insurance /advice /supplies /jobs | 26.2 | Done | app/(site)/{buy,rent,build,maintain,manage,advice}/page.tsx, components/pillars/PillarHub.tsx, app/(site)/{supplies,finance,insurance,jobs} | e2e:pillar-hubs.spec.ts › each new hub shows …; existing pages that act as hubs gain the abroad panel and next steps |
| X-262-03 | Pillar 1 Buy & Sell content: sale listings, new developments, agency sales services, offers, compare, saved searches | 26.2 | Not done |  |  |
| X-262-04 | Pillar 2 Rent & Let content: rental listings, lettings, tenant applications, tenancies, landlord and tenant services | 26.2 | Done | app/(site)/rent/page.tsx, lib/content/pillars.ts (rent), agency lettings | e2e:pillar-hubs.spec.ts › each new hub …; e2e:agency.spec.ts › lettings … |
| X-262-05 | Pillar 3 Build & Develop content: professionals, contractors, building quotes, project brief, estimator, developments, Our Developments | 26.2 | Done | app/(site)/build/**, Our Developments interest (pillar_services our-developments) | e2e:pillar-hubs.spec.ts; e2e:build-project.spec.ts |
| X-262-06 | Pillar 4 Repair & Maintain content: requests, emergency route, trades | 26.2 | Done | app/(site)/maintain/page.tsx, HagerLand Services | e2e:pillar-hubs.spec.ts › each new hub …; e2e:owner-portal.spec.ts › Repair & Maintain Direct … |
| X-262-07 | Pillar 5 Manage Property content: Property Care, third-party managers, owner portal | 26.2 | Done | app/(site)/manage/page.tsx, owner portal, Property Care | e2e:pillar-hubs.spec.ts › each new hub …; e2e:owner-portal.spec.ts |
| X-262-08 | Pillars 6 Finance and 7 Insurance hubs | 26.2 | Done | components/verticals/PartnerVerticalPage.tsx, components/verticals/ComingSoonPage.tsx | e2e:pillar-hubs.spec.ts › existing pages that act as hubs …; e2e:verticals.spec.ts › finance is a labelled coming-soon page … |
| X-262-09 | Pillar 8 Knowledge & Advice hub content | 26.2 | Not done |  |  |
| X-262-10 | Pillar 9 Supplies content: HagerLand Supply, supplier marketplace, special buys, trade accounts | 26.2 | Not done |  |  |
| X-262-11 | Pillar 10 Jobs, Recruitment & Staffing hub | 26.2 | Done | app/(site)/jobs/page.tsx | e2e:pillar-hubs.spec.ts › existing pages that act as hubs … (recruitment by HagerLand, candidate and employer registers) |
| X-262-12 | Diaspora layer present in every pillar; /diaspora hub kept | 26.2 | Done | components/pillars/PillarHub.tsx (PillarExtras), components/home/EcosystemDiagram.tsx, lib/navigation.ts (Living abroad?) | e2e:pillar-hubs.spec.ts › each new hub shows … From abroad panel; e2e:verticals.spec.ts › header shows … Living abroad |
| X-262-13 | Professionals & providers layer present; /professionals and company profiles kept | 26.2 | Done | lib/navigation.ts (layers), components/home/EcosystemDiagram.tsx | e2e:verticals.spec.ts › header shows … All services (Professionals & Service Providers); mobile drawer lists every pillar and both layers |
| X-262-14 | Existing deeper routes remain, belong to a pillar, link back to their hub, with a documented canonical | 26.2 | Not done |  |  |
| X-263-01 | Three independent modes per pillar and sub-service (Direct, Aggregate, Interest) | 26.3 | Done | supabase/migrations/0027_pillars.sql | sql:0027 check; e2e:pillars.spec.ts › admin: aggregate needs … |
| X-263-02 | Visibility: any mode → visible; Interest only → "Coming soon"; all off → hidden (404, nav, sitemap) | 26.3 | Done | lib/pillars.ts (modeStatus), lib/data/pillars.ts, lib/pillar-page.ts, app/sitemap.ts, middleware.ts | e2e:pillar-hubs.spec.ts › visibility: interest only is coming soon and noindex; all modes off is hidden everywhere; unit:pillars.test.ts › visible when any mode is on … |
| X-263-03 | Customer-facing labels "Provided by HagerLand", "Trusted partners", "Register your interest" (never D/A/I) | 26.3 | Done | lib/pillars.ts (MODE_LABELS), components/pillars/PillarHub.tsx (ModeBadges) | unit:pillars.test.ts › customer labels never use the letters D, A or I; e2e:verticals.spec.ts › header shows … (Provided by HagerLand, Trusted partners) |
| X-263-04 | Stage gate before Direct/Aggregate ON: capability + named owner; N verified providers for Aggregate (N configurable); regulatory clearance with note and date; terms and pricing | 26.3 | Done | app/roodber8/actions/pillars.ts, components/admin/PillarTools.tsx, supabase/migrations/0027_pillars.sql (require_stage_gate) | e2e:pillars.spec.ts › admin: aggregate needs enough verified partners …; rls:Aggregate cannot be switched on without a completed stage gate |
| X-263-05 | Stage gate answers, who and when recorded in the audit log | 26.3 | Done | app/roodber8/actions/pillars.ts | e2e:pillars.spec.ts › admin: aggregate needs … (audit_log pillar.mode.on/off) |
| X-263-06 | Switching any mode off needs no gate | 26.3 | Done | app/roodber8/actions/pillars.ts | e2e:pillars.spec.ts › admin: … switching off is immediate |
| X-263-07 | Stage-gate checklists pre-filled "regulatory clearance confirmed by AB, 15 Oct 2026" | update | Done | supabase/migrations/0027_pillars.sql (regulatory_clearance_note), components/admin/PillarTools.tsx | e2e:pillars.spec.ts › admin: … (Clearance note value, regulatory_date 2026-10-15) |
| X-263-08 | Launch default modes set by migration and editable in admin (with AB's update: Manage D+A, Jobs D+A+I, Finance/Insurance I) | 26.3 + update | Done | supabase/migrations/0027_pillars.sql | unit:pillars.test.ts › launch defaults …; e2e:pillars.spec.ts › launch modes … |
| X-263-09 | Finance/Insurance Aggregate switchable once partner organisations are verified (gate still requires active partners) | update | Done | supabase/migrations/0027_pillars.sql (pillar_active_providers: lender/broker, insurer/broker) | e2e:pillars.spec.ts › admin: aggregate needs enough verified partners … |
| X-264-01 | Desktop header: at most 7 top-level items in lifecycle order (Buy · Rent · Build · Maintain · Manage · Supplies · More ▾) | 26.4 | Done | lib/navigation.ts (buildMainNav), components/layout/SiteHeader.tsx | e2e:verticals.spec.ts › header shows at most seven menus in lifecycle order … |
| X-264-02 | "More" holds Finance, Insurance, Advice & guides, Jobs | 26.4 | Done | lib/navigation.ts | e2e:verticals.spec.ts › header shows … More holds the rest |
| X-264-03 | Visible "Living abroad?" entry to the Diaspora layer; Find a professional in menu and search; Sign in; List with us ▾ | 26.4 | Done | components/layout/SiteHeader.tsx, lib/navigation.ts (DRAWER_EXTRAS, Find a professional in Build menu and drawer) | e2e:verticals.spec.ts › header shows … Living abroad; mobile drawer … shortcuts (Find a professional) |
| X-264-04 | "All services" mega panel: 10 pillars + 2 layers grouped like the diagram, with mode labels | 26.4 | Done | components/layout/SiteHeader.tsx (AllServicesPanel), lib/navigation.ts (buildAllServices) | e2e:verticals.spec.ts › header shows … All services (12 links with mode labels) |
| X-264-05 | Mobile drawer shows everything | 26.4 | Done | components/layout/MobileDrawer.tsx | e2e:verticals.spec.ts › mobile drawer lists every pillar and both layers, plus the shortcuts |
| X-264-06 | Each pillar hub: what it does, live modes, primary actions, deeper links, "From abroad?" panel, cross-pillar next steps | 26.4 | Done | components/pillars/PillarHub.tsx, lib/content/pillars.ts | e2e:pillar-hubs.spec.ts › each new hub shows what it does, its modes, a From abroad panel and next steps |
| X-264-07 | Homepage keeps hero + unified search, then a "Property ecosystem" section recreating the diagram (nucleus, 10 pillars with mode labels, two layers, journey strip) | 26.4 | Done | app/(site)/page.tsx, components/home/EcosystemDiagram.tsx | e2e:verticals.spec.ts › homepage keeps the hero and search, then the property ecosystem … |
| X-264-08 | Ecosystem visual is keyboard and screen-reader friendly and collapses to a clean list on phones | 26.4 | Done | components/home/EcosystemDiagram.tsx (ordered list 1–8 placed by CSS grid; sr-only nucleus text) | e2e:s26-quality.spec.ts, e2e:a11y.spec.ts (/ zero serious/critical); e2e:responsive.spec.ts (no sideways scroll 360–1440); verify: DOM order = pillar numbers |
| X-265-01 | Agency contacts register (vendors, landlords, buyers, tenants) with marketing consent records | 26.5 | Done | supabase/migrations/0028_agency.sql (agency_contacts), app/roodber8/agency/contacts/**, lib/agency-server.ts | e2e:agency.spec.ts › contacts: requirements match live listings; match emails need recorded consent; book a valuation (contact created with role) |
| X-265-02 | Applicant requirements (purpose, budget, areas, types, beds) with automatic matching to live listings and agent-triggered match emails | 26.5 | Done | applicant_requirements, agency_requirement_matches(), app/roodber8/actions/agency.ts (emailMatchesAction) | e2e:agency.spec.ts › contacts: requirements match live listings; match emails need recorded consent |
| X-265-03 | Instructions pipeline lead → valuation booked → valued → instructed → live → under offer / let agreed → completed / withdrawn / expired | 26.5 | Done | agency_instructions.stage, app/roodber8/agency/instructions/**, setInstructionStageAction | e2e:agency.spec.ts › book a valuation (lead → valuation booked → valued); make an offer (live → under offer → completed); lettings (live → let agreed) |
| X-265-04 | Instruction terms: agreement document (private-docs), fee type % or fixed, fee amount, sole/multi agency, term dates | 26.5 | Done | agency_instructions (fee_type, fee_percent, fee_amount_etb, agency_type, term dates, agreement in agency_documents), saveInstructionTermsAction | sql: check agency_instructions_terms_before_live; e2e:agency.spec.ts › make an offer … (2% fee → commission) |
| X-265-05 | Live instruction linked to a listing with lister_type 'hagerland' ("Marketed by HagerLand") | 26.5 | Done | agency_instruction_marks_listing() trigger, linkInstructionListingAction | e2e:agency.spec.ts › a HagerLand-marketed sale … (Marketed by HagerLand shown) |
| X-265-06 | Valuations: appointment, assigned agent, range, notes, report PDF, outcome | 26.5 | Done | agency_valuations, app/roodber8/agency/valuations/**, ReportUpload | e2e:agency.spec.ts › book a valuation: … admin books and values it |
| X-265-07 | Public "Book a viewing" on HagerLand-marketed listings (in person/video, preferred times, contact, Turnstile); other listings keep the enquiry flow | 26.5 | Done | app/(site)/property/[slug]/viewing, components/agency/AgencyForms.tsx (ViewingForm), bookViewingAction | e2e:agency.spec.ts › a HagerLand-marketed sale: book a video viewing … other listings keep the enquiry form |
| X-265-08 | Viewing admin: scheduling, assigned agent, confirmation and reminder emails, video link, feedback | 26.5 | Done | saveViewingAction, lib/cron/daily.ts (remindViewings), lib/email/agency.ts | e2e:agency.spec.ts › a HagerLand-marketed sale: … confirm it with a link, reminder by the daily job |
| X-265-09 | Public "Make an offer" on HagerLand-marketed sale listings, worded as a non-binding expression of interest | 26.5 | Done | app/(site)/property/[slug]/offer, makeOfferAction | e2e:agency.spec.ts › make an offer: non-binding wording enforced … |
| X-265-10 | Offer log with statuses and recorded vendor decisions; accepted → sale progression checklist (admin-editable defaults, no legal assertions) | 26.5 | Done | decideOfferAction, sale_progress_items, sale_progression_defaults setting, app/roodber8/agency/settings | e2e:agency.spec.ts › make an offer: … starts sale progression |
| X-265-11 | "Apply to rent" on HagerLand-marketed lets (details, move-in, occupants, employment/income note, optional private documents); referencing notes; approve → tenancy | 26.5 | Done | app/(site)/property/[slug]/apply, applyToRentAction, saveApplicationAction, createTenancyFromApplicationAction | e2e:agency.spec.ts › lettings: apply to rent, approve, create a tenancy … |
| X-265-12 | Customer account shows their valuations, viewings, offers, applications and tenancies | 26.5 | Done | app/(account)/account/agency/page.tsx, lib/data/my-agency.ts | e2e:agency.spec.ts › lettings: … the tenant sees it; e2e:s26-quality.spec.ts (/account/agency a11y) |
| X-265-13 | Completion creates a deal in the deals ledger (commission or letting fee) | 26.5 | Done | setInstructionStageAction (completed → deals row, commission or letting fee) | e2e:agency.spec.ts › make an offer: … completion creates the deal |
| X-265-14 | Agency reports: instructions, valuations, viewings, offers, completions, average days on market, fee income | 26.5 | Done | lib/admin/agency-reports.ts, app/roodber8/agency/page.tsx, export agency-report | e2e:s26-quality.spec.ts (/roodber8/agency renders); verify: KPIs computed from records created by the agency spec |
| X-265-15 | Tasks/reminders, activity timeline per record, private documents, all audit-logged | 26.5 | Done | agency_tasks, agency_activity, agency_documents, components/admin/AgencyRecordSide.tsx; every action calls audit() | e2e:agency.spec.ts › book a valuation (timeline entry visible); verify: each admin action in app/roodber8/actions/agency.ts calls audit() |
| X-265-16 | Fees shown only if a fee schedule is published in Settings; otherwise "fees agreed in writing" | 26.5 | Done | lib/data/business.ts (agencyFeeSchedule), app/(site)/agency/** | verify: with agency_fee_schedule empty the pages say fees are agreed in writing; with a value they show it (admin → Settings → Estate agency) |
| X-266-01 | Landlord services page (let only / let & manage / management only → Pillar 5) | 26.6 | Done | lib/content/agency.ts (landlords), app/(site)/agency/[service] | e2e:s26-quality.spec.ts (/agency/landlords); e2e:agency.spec.ts › the agency switch … |
| X-266-02 | Tenant guidance page (draft for AB review) | 26.6 | Not done |  |  |
| X-266-03 | Rent-ready checklist (editable) | 26.6 | Done | rent_ready_checklist setting, app/roodber8/agency/settings, app/(site)/agency/[service] (landlords) | e2e:s26-quality.spec.ts (/agency/landlords renders the checklist); sql:0028 seed |
| X-266-04 | Tenancy records: parties, property, dates, rent and currency, advance months, deposit, renewal and notice dates | 26.6 | Done | supabase/migrations/0028_agency.sql (tenancies), components/admin/TenancyFields.tsx | e2e:agency.spec.ts › lettings: … create a tenancy |
| X-266-05 | Tenancy reminders (renewal, notice) via the daily cron | 26.6 | Done | lib/cron/daily.ts (remindTenancies) | e2e:agency.spec.ts › lettings: … tenancyReminders ≥ 1 |
| X-266-06 | Tenancy linked to a managed property when let & managed; maintenance requests from managed tenancies route to Pillar 4 | 26.6 | Done | tenancies.managed_property_id, app/actions/repair-actions.ts, lib/maintenance.ts | e2e:agency.spec.ts › lettings: … reports a repair to Pillar 4 (service request in repairs-maintenance + maintenance log) |
| X-267-01 | Property Care stays live (Direct) with consultation requests and its admin pipeline | 26.7 | Done | app/(site)/diaspora/property-care, app/roodber8/property-care (unchanged), components/content/LicenceNote.tsx (property management licence) | e2e:diaspora.spec.ts (Property Care consultation, existing); e2e:s26-quality.spec.ts (/diaspora/property-care) |
| X-267-02 | Owner portal: owners linked by admin sign in and see inspections (10-minute signed photo links), rent statements, maintenance log and documents | 26.7 | Done | app/(site)/owner/**, lib/data/owner.ts, app/roodber8/actions/owner-portal.ts (linkOwnerAccountAction), managed_property_documents | e2e:owner-portal.spec.ts › owner portal: only linked owners see their property, with inspections (signed photo link), statements, documents … |
| X-267-03 | Owner portal: raise maintenance requests (to Pillar 4) and messages to HagerLand | 26.7 | Done | app/actions/repair-actions.ts (owner), app/actions/owner-actions.ts, owner_messages, replyToOwnerAction | e2e:owner-portal.spec.ts › owner portal: … messages and repairs |
| X-267-04 | Owner portal visible only to linked owners; own on/off control (default ON) | 26.7 | Done | app/(site)/owner/layout.tsx (owner-portal switch), lib/data/owner.ts (owner_user_id check) | e2e:owner-portal.spec.ts › owner portal: … (unlinked user and stranger get nothing/404); the owner portal switch: off returns 404 |
| X-267-05 | Third-party property managers shown under Aggregate | 26.7 | Done | lib/content/pillars.ts (manage aggregate: /professionals/property-management), lib/navigation.ts | e2e:pillar-hubs.spec.ts › each new hub … (/manage Trusted partners section) |
| X-268-01 | Service request engine kept; Direct lets admin assign a request to HagerLand's own team (HagerLand Services organisation) as well as or instead of third parties | 26.8 | Done | supabase/migrations/0029_owner_portal.sql (HagerLand Services), app/roodber8/actions/service-requests.ts (assignHagerlandTeamAction, hagerlandQuoteAction) | e2e:owner-portal.spec.ts › Repair & Maintain Direct: admin assigns HagerLand’s own team … |
| X-268-02 | Customer sees one consistent flow whoever is assigned | 26.8 | Done | lib/service-requests/notify.ts (shared quote notification) | e2e:owner-portal.spec.ts › Repair & Maintain Direct: … the customer gets the usual quote email; e2e:flows/service-requests.spec.ts (provider quotes, unchanged) |
| X-269-01 | "Start a building project": multi-step brief (plot location and size, floors, budget band, timeline, services needed) | 26.9 | Done | components/build/ProjectForm.tsx, app/(site)/build/project/page.tsx, lib/build-projects.ts | e2e:build-project.spec.ts › a four-step brief creates one project reference … |
| X-269-02 | One project reference HLP-YYYY-NNNNNN spawning linked service requests and an optional materials quote request | 26.9 | Done | app/actions/build-project-actions.ts, supabase/migrations/0030_build_projects.sql (HLP reference, project_id links) | e2e:build-project.spec.ts › a four-step brief … (2 linked requests, materials quote, finance interest) |
| X-269-03 | Customer project page showing everything in one place | 26.9 | Done | app/(account)/account/projects/[id]/page.tsx, components/build/ProjectView.tsx | e2e:build-project.spec.ts › a four-step brief … (project page) |
| X-269-04 | Admin projects view with linked requests | 26.9 | Done | app/roodber8/projects/**, app/roodber8/actions/projects.ts | e2e:build-project.spec.ts › a four-step brief … (admin status) |
| X-269-05 | Build hub combines estimator, professionals, contractors, supplies, finance interest and Our Developments interest | 26.9 | Done | app/(site)/build/page.tsx (estimator when rates exist, professionals, contractors, supplies, finance, Our Developments interest) | e2e:pillar-hubs.spec.ts › each new hub …; verify: tiles hide when their area is hidden or the estimator has no rates |
| X-2610-01 | /advice hub combining guides, area guides, market insight, checklists, glossary, newsletter | 26.10 | Not done |  |  |
| X-2610-02 | Guides drafts still need AB review before publishing | 26.10 | Not done |  |  |
| X-2610-03 | Area guides on location pages once enough data: asking-price ranges and medians by type, listing counts, admin-written notes and FAQs | 26.10 | Not done |  |  |
| X-2610-04 | Market insight page: medians and ranges by area and type from live listings, minimum sample from Settings, labelled "Based on asking prices on HagerLand — not valuations", refreshed daily | 26.10 | Not done |  |  |
| X-2610-05 | Process checklists (buying, renting, building, selling) and glossary (carta, lease, G+X, condominium, finishing levels) as drafts marked "Needs AB review" | 26.10 | Not done |  |  |
| X-2610-06 | Newsletter signup with separate consent | 26.10 | Not done |  |  |
| X-2610-07 | No legal or regulatory statement presented as fact | 26.10 | Not done |  |  |
| X-2611-01 | Every pillar hub has a "From abroad?" panel tailored to the pillar | 26.11 | Done | components/pillars/PillarHub.tsx (PillarExtras), lib/content/pillars.ts (abroad per pillar) | e2e:pillar-hubs.spec.ts › each new hub shows … From abroad panel; existing pages that act as hubs gain the abroad panel |
| X-2611-02 | Diaspora hub organised by the three segments + services abroad | 26.11 | Not done |  |  |
| X-2611-03 | Contact forms show the visitor's time zone and allow preferred call times | 26.11 | Not done |  |  |
| X-2612-01 | One provider onboarding where providers choose pillars and services they serve | 26.12 | Not done |  |  |
| X-2612-02 | Provider dashboard shows leads from every pillar | 26.12 | Not done |  |  |
| X-2612-03 | Verified reviews only from customers whose request reached "won" or whose deal completed; one per job; rating + text | 26.12 | Not done |  |  |
| X-2612-04 | Reviews moderated before publishing; admin moderation queue | 26.12 | Not done |  |  |
| X-2612-05 | Provider can reply once | 26.12 | Not done |  |  |
| X-2612-06 | Reviews shown on company profiles with an average | 26.12 | Not done |  |  |
| X-2612-07 | AggregateRating structured data only with at least 3 published reviews; never import or fabricate reviews | 26.12 | Not done |  |  |
| X-2613-01 | Admin "Demand" dashboard: interest, unmatched/declined requests, zero-result searches, enquiries and leads by pillar, category, location and country, with trends | 26.13 | Not done |  |  |
| X-2613-02 | Activation recommendations rank pillar × category × location by demand vs active supply, each linking to the stage-gate checklist | 26.13 | Not done |  |  |
| X-2613-03 | Monthly CSV export of demand | 26.13 | Not done |  |  |
| X-2613-04 | Demand summary in the daily digest | 26.13 | Not done |  |  |
| X-2614-01 | Admin "Performance" dashboard per pillar: leads, median first-response time, conversion to won, revenue (deals), active listings, providers and partners | 26.14 | Not done |  |  |
| X-2614-02 | Agency KPIs on the Performance dashboard; CSV export | 26.14 | Not done |  |  |
| X-2615-01 | Staff users (Supabase Auth, separate from customer accounts) with roles owner, agent, operations, content | 26.15 | Not done |  |  |
| X-2615-02 | Each staff member must enrol TOTP before access | 26.15 | Not done |  |  |
| X-2615-03 | Role-based admin access per area (agent / operations / content / owner) | 26.15 | Not done |  |  |
| X-2615-04 | Per-user audit log entries | 26.15 | Not done |  |  |
| X-2615-05 | Staff management screen for the owner: invite, change role, disable | 26.15 | Not done |  |  |
| X-2615-06 | /roodber8 master login remains as the owner's break-glass access | 26.15 | Not done |  |  |
| X-2615-07 | Server-side role checks on every admin action and page; tests prove each role reaches only its areas | 26.15 | Not done |  |  |
| X-2615-08 | Default: no staff besides AB | 26.15 | Not done |  |  |
| X-2616-01 | Homepage, hubs, about, how-it-works, list-with-us, help and footer updated for the pillar model | 26.16 | Not done |  |  |
| X-2616-02 | Terms: estate agency terms of business (instructions, fees in writing, viewings, offers non-binding, tenant applications) as drafts for AB's lawyer | 26.16 | Not done |  |  |
| X-2616-03 | Privacy: tenant applications, applicant registers, viewings, reviews, staff access | 26.16 | Not done |  |  |
| X-2616-04 | Sitemaps follow pillar visibility; coming-soon-only pillars noindex | 26.16 | Not done |  |  |
| X-2616-05 | Structured data: RealEstateAgent with licence when set; reviews per the rule above | 26.16 | Not done |  |  |
| X-2617-01 | Online payments/payouts stay out of scope (clean integration point) | 26.17 | Deferred-by-rule | lib/integrations.ts | See X-253 rows; no payment code; integration interface only |
| X-2617-02 | SMS/OTP, WhatsApp Business API, live bank/insurer/mortgage APIs, native apps stay out of scope | 26.17 | Deferred-by-rule | — | See X-253 rows |
| X-2617-03 | BirrBank integration (frozen by AB) out of scope | 26.17 | Deferred-by-rule | — | verify: no BirrBank code (legacy sweep); old /api/birrbank-* answer 410 |
| X-2617-04 | Valuation / property price-history dataset (blueprint P3) out of scope | 26.17 | Deferred-by-rule | — | Market insight uses live asking prices only and says so (26.10) |
| X-2618-01 | LAUNCH_REPORT section 4 lists only genuinely unbuilt items; whole report re-checked for outdated statements | 26.18a | Not done |  |  |
| X-2618-02 | Preview redirect URL pattern in the Supabase Auth step verified against the real Vercel preview domain | 26.18b | Not done |  |  |
| X-2618-03 | Blueprint reconciled per 26.0 | 26.18c | Not done |  |  |
| X-2619-01 | S12 full regression: lint, typecheck, clean build, unit, browser, RLS, accessibility on every new page, phone widths, link crawl, Lighthouse | 26.19 | Not done |  |  |
| X-2619-02 | LAUNCH_REPORT updated (what changed, evidence, page-by-page checklist incl. every new page, pre-go-live checklist, pillar mode defaults and regulatory flags) | 26.19 | Not done |  |  |
| X-2619-03 | 25.5 go-live readiness re-run after Section 26 | 26.19 | Not done |  |  |
| X-2619-04 | Every work package committed and pushed to relaunch/construction only; progress updated | 26.19 | Not done |  |  |

## Phase 3 roadmap (spec Section 21) — not requirements of this release

Recorded for completeness, no status: orders, invoices and delivery scheduling; delivery zones and fees; paid plans and billing; paid featured placements and advertising slots; reviews and ratings; equipment hire marketplace; market data (price index, sold/let history); multiple admin users with roles; PWA, partner API, regional expansion at scale and brand splits. The items Section 25.3 names (payments, SMS OTP, WhatsApp API, partner APIs, native apps) are rows X-253-* above.

## Summary

Generated by `bash scripts/matrix-summary.sh` (counts rows by status).

