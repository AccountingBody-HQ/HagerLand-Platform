# HagerLand Relaunch — Progress

Spec: `docs/HAGERLAND_RELAUNCH_SPEC.md` (v1.0, 13 Oct 2026, sha256 `37d62526…`; v1.1 with Sections 24 and 25 appended verbatim from `docs/BRIEF_PHASE_1_5_AND_GO_LIVE.md`, 13 Oct 2026). Vision: `docs/PLATFORM_VISION.md`. Requirements matrix: `docs/REQUIREMENTS_MATRIX.md`
Branch: `relaunch/construction` · Rollback tag: `pre-construction-relaunch` → `00de73c` on `main`

Status values: todo · in progress · done · blocked

## Work packages

| WP | Title | Status | Date | Commit | Notes / deviations |
|----|-------|--------|------|--------|--------------------|
| WP-0 | Safety & setup | done | 2026-10-13 | 080a4da | Manual backup taken and downloaded by AB before any database change; schema snapshot saved (13 Oct 2026) |
| WP-1 | Strip legacy & fix foundations | done | 2026-10-13 | e7dade5 | Also removed old about/contact/terms pages and admin import UI (rebuilt in WP-13/14) |
| WP-2 | Database foundation [STOP-GATE] | done (applied to live + verified) | 2026-10-13 | dacbf08 + fixes | AB applied 0001–0009 to the live project on 13 Oct 2026; every check matched; RLS test 28/28 PASS. Fixes before applying: next_reference, read-only views, collision pre-flight, popular_locations |
| WP-3 | Design system & layout [STOP-GATE] | done | 2026-10-13 | 05ef6be | Styleguide sign-off waived by AB ("don't stop") |
| WP-4 | Auth & accounts | done | 2026-10-13 | 0fcf8d3 | Google sign-in hidden until NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true |
| WP-5 | Media pipeline | done | 2026-10-13 | 71cc2ee | HEIC not decodable by prebuilt sharp: browsers convert on upload |
| WP-6 | Property marketplace | done | 2026-10-13 | 36d5579 | End-to-end tested on local Supabase stack. Map pin omitted (no provider confirmed) |
| WP-7 | Companies, professionals, suppliers, agents, developers | done | 2026-10-13 | 36d5579 |  |
| WP-8 | Developments & HagerLand Developments | done | 2026-10-13 | bffb4a1 | "Why buy" claims hidden until AB confirms |
| WP-9 | Supplies | done | 2026-10-13 | 3122b0b | Quote flow covered by admin e2e (issue quote) |
| WP-10 | Enquiries & leads | done | 2026-10-13 | 220196f | Inbox with status, private notes, reply shortcuts |
| WP-11 | Unified search | done | 2026-10-13 | 203a513 + d93745d | Location/service/category-only matches count as results |
| WP-12 | Homepage [STOP-GATE] | done | 2026-10-13 | e53385b | Design direction approved by AB; homepage picks from admin Settings added in WP-14 |
| WP-13 | Content pages & emails | done | 2026-10-13 | e53385b | Business details come from site_settings (migration 0010); empty values hidden |
| WP-14 | Admin rebuild | done | 2026-10-13 | 78da435 + 7e5a30c | All 17 sections of spec 18.2. Admin e2e suite (e2e/admin). Users email search scans auth pages (no email filter in the auth admin API) |
| WP-15 | SEO | done | 2026-10-13 | 3d50dbc | Sitemaps split by type (/sitemap/<type>.xml, listed in robots.txt); landing pages listed only when they meet min_results_for_index; share images at /og/<kind>/<slug> (WebP photos converted with sharp, Manrope font bundled under OFL); admin homepage picks |
| WP-16 | Analytics, monitoring, cron | done | 2026-10-13 | 73c4841 | /api/cron/daily (Bearer CRON_SECRET, constant-time) at 06:00 UTC via vercel.json. Server errors counted in the errors table and listed in the digest. Purging old rate_limits rows (a pre-existing table) is off unless CRON_PURGE_RATE_LIMITS=true, because of the no-deleting-legacy-data rule |
| WP-17 | Security hardening | done | 2026-10-13 | 5823b29 | Headers/CSP, upload abuse, rate limits, admin lock and bundle secret scan covered by e2e; RLS 28/28 on local. npm audit: low-risk dev fixes applied; remaining high/critical advisories are in Next.js 14.2 (newest 14.2 release installed) and Tailwind 3 build tools; fixing needs Next 15 (major upgrade, AB decision). Mitigations: AVIF off, image optimiser limited to our photo bucket, Vercel hosting. Env validated at start-up (instrumentation.ts). docs/RUNBOOK.md written |
| WP-18 | Performance & accessibility | done | 2026-10-13 | b45c878 | axe: 0 serious/critical on 26 public pages (mobile + desktop) and 9 admin pages. Lighthouse: docs/qa/lighthouse-2026-10-13.md (simulated 82–97; applied throttling 89–98; LCP 1.7–2.0 s). Home/property/product below 90 in the simulated run only. gold-dark token darkened to 128 92 28 for contrast (brand gold unchanged) |
| WP-19 | QA, legacy sweep, final checklist [STOP-GATE] | done | 2026-10-13 | cea90ab | 145 e2e passed (journeys, admin, SEO, security, a11y, widths), 85 unit, RLS 28/28, crawl 290 pages 0 broken. Fixed: guest enquiries hidden from owners' inbox; duplicate-business confirm did nothing; tap targets; tooltip overflow. Legacy sweep clean (remaining hits are redirects). Report: docs/LAUNCH_REPORT.md |
| WP-20 | Cutover [STOP-GATE] | todo | | | |

## Phase 1.5 and Section 25 work packages

Authorised by AB on 13 Oct 2026 (brief: `docs/BRIEF_PHASE_1_5_AND_GO_LIVE.md`), to run autonomously in this order. The Section 25.2 items that are not part of an E package have their own H packages. Migrations 0011+ are tested on the local stack only and handed to AB (they are applied to the live database only in the cutover, after AB types GO LIVE).

| WP | Title | Status | Date | Commit | Notes / deviations |
|----|-------|--------|------|--------|--------------------|
| 25.1 | Requirements traceability matrix | done (kept updated) | 2026-10-13 | see git log | `docs/REQUIREMENTS_MATRIX.md`, kept up to date to the end |
| E1 | Vertical registry, navigation, homepage ecosystem section (+ schema_migrations record) | done | 2026-10-13 | see git log | Migration 0011 (local only; for AB at cutover). RLS 38/38 local. 183 e2e passed. Decisions in LAUNCH_REPORT Phase 1.5 log |
| E2 | International locations and currency (+ 25.2f approximate prices) | done | 2026-10-13 | see git log | Migrations 0012 (new list values) and 0013. RLS 42/42 local. 177 e2e + 93 unit passed |
| E3 | Service request engine: customer, admin, provider (+ 25.2k deals and commission ledger) | done | 2026-10-13 | see git log | Migration 0014. RLS 57/57 local. 193 e2e + 102 unit passed |
| E4 | Repairs & maintenance and contractors on the engine | done | 2026-10-14 | see git log | Migration 0015. 202 e2e + 120 unit passed |
| E5 | Diaspora services and HagerLand Property Care | done | 2026-10-14 | see git log | Migration 0016. RLS 67/67 local. 214 e2e passed |
| E6 | Estate agency services, save, compare, valuation, finance ask (+ 25.2a saved items/searches/alerts, 25.2b map, 25.2l path SEO pages) | done | 2026-10-14 | see git log | Migration 0017. RLS 74/74 local. 234+ e2e passed (re-runs of fixed tests green). Leaflet 1.9.4 added |
| E7 | Finance and insurance (coming soon, partner forms; live pages on the request engine) | done | 2026-10-14 | see git log | Migration 0018. RLS 74/74 local. 242 e2e + 149 unit passed (one test-data fix re-run green) |
| E8 | Jobs & Recruitment (built, coming soon) + Our Developments coming soon + 25.2j development progress updates | done | 2026-10-14 | see git log | Migration 0019. RLS 96/96 local. Jobs spec 7 passed + full regression; site search covers jobs when live; privacy policy CV retention added |
| H1 | Supplies marketplace: supplier self-serve products, Special Buys, trade accounts (25.2c, d, e) | todo | | | |
| H2 | Guides hub and build-cost estimator (25.2g, h) | todo | | | |
| H3 | Organisation team members and branches (25.2i) | todo | | | |
| H4 | Amharic i18n architecture, /am locale behind an admin switch (25.2m) | todo | | | |
| H5 | Health endpoints (25.2n) | done | 2026-10-14 | see git log | `/api/health`, `/api/health/full` (CRON_SECRET; booleans only). e2e health spec + unit test passed |
| H6 | Edge cases and cross-cutting hardening (25.4) | todo | | | |
| E9 | Content, legal, admin additions, SEO, full QA pass | todo | | | |
| E10 | Next.js 15 upgrade (or clean revert with reasons), npm audit | todo | | | |
| 25.5 | Go-live readiness: full re-run, preflight script, final report | todo | | | |
| 25.6 | Cutover (only after AB types GO LIVE) | todo | | | Replaces WP-20 |

## WP-0 checklist

- [x] Spec moved from `.next/docs/` (wiped on every build) to `docs/HAGERLAND_RELAUNCH_SPEC.md`
- [x] This progress file created
- [x] Tag `pre-construction-relaunch` created on `main` (`00de73c`) and pushed
- [x] Branch `relaunch/construction` created and pushed
- [x] Backup tooling: `scripts/backup-supabase.sh`, PostgreSQL 17 client installed in the Codespace, `backups/` git-ignored
- [x] Schema snapshot query written and tested: `docs/sql/wp0_legacy_schema_snapshot.sql`
- [x] `CLAUDE.md` (initial)
- [x] AB: manual Supabase backup taken and downloaded (13 Oct 2026, before any database change)
- [x] AB: snapshot result saved → `docs/legacy-schema-snapshot.md`
- [x] Name-collision check confirmed against the live database (no clashes)

## Database changes applied to the live project (13 Oct 2026, by AB)

Order: backup → legacy hotfix → migrations 0001–0009 → RLS test.

| Step | Check | Result |
|------|-------|--------|
| Backup | Downloaded before any change | Done |
| Legacy hotfix `supabase/legacy/2026-10-13_drop_open_read_policies.sql` | Non-active rows visible to anon (7 tables) | 0 in all seven; active rows still visible |
| 0001 extensions, enums | Enum count | 17 |
| 0002 core tables | Table count | 28 |
| 0003 RLS | Tables without RLS | 0 |
| 0004 public views | View count | 9 |
| 0005 search functions | Function count | 9 |
| 0006 storage | Buckets | private-docs false, public-media true |
| 0007 seed | locations, services, product categories, organisations, settings | 39, 60, 87, 2, 10 |
| 0008 account helpers | Function present | 1 |
| 0009 counters | Function present | 1 |
| `supabase/tests/rls_test.sql` | Security checks | 28 of 28 PASS |

## Answers from AB (Section 23)

| # | Question | Answer | Date |
|---|----------|--------|------|
| Hosting | Plans | Vercel: Pro. Supabase: Free (upgrade before WP-20). Resend: Free (upgrade before WP-20). | 2026-10-13 |
| 1 | Tagline | | |
| 2 | Free listing at launch | | |
| 3 | Legal entity | | |
| 4 | Contact details, delivery coverage, quote response time | | |
| 5 | Brand photography; first HagerLand project | | |
| 6 | "Why buy from HagerLand" claims | | |
| 7 | Region/city seed list; neighbourhood mapping | | |
| 8 | Launch content plan | | |
| 9 | Map provider | | |
| 10 | Google OAuth | | |
| 11 | Sentry | | |
| 12 | Social media URLs | | |

## Open items and deferred work

- Supabase Free plan: no automatic daily backups and the project can pause after a week of inactivity. Upgrade to Pro before WP-20; until then take a manual backup before every migration.
- Resend Free: needs hagerland.com verified as a sending domain (and Pro if the free domain slot is used by accountingbody.com) before emails go live.
- Legacy live-site security (13 Oct 2026): hotfix `supabase/legacy/2026-10-13_drop_open_read_policies.sql` removes the seven `USING (true)` anon read policies (cars, community, companies, events, housing, jobs, tutors) so non-active rows are hidden. **Still exposed, deliberately, until the WP-20 legacy lockdown:** ACTIVE rows on the legacy tables remain readable by the public anon key in full, including `manage_token`, `verification_token`, `contact_email`, `contact_phone` and similar columns. The live site's anon `select('*')` queries (detail pages) and claim pages (which select `manage_token`) depend on this, so tightening it now would break the live site. It is closed at cutover by the legacy lockdown migration (Section 20.3).
- Legacy tables also grant ALL privileges to anon/authenticated (Supabase defaults); writes are blocked only because no INSERT/UPDATE/DELETE policies exist. Revoke at the WP-20 lockdown.
- Schema snapshot taken 13 Oct 2026 (`docs/legacy-schema-snapshot.md`): no name clashes with migrations 0001–0009; `import_log` and `rate_limits` match what the code expects. Database is PostgreSQL 17.6.

## Pre-launch tasks for AB

The full ordered list is in `docs/LAUNCH_REPORT.md` section 3 (migration 0010, Vercel variables, Supabase Auth, Resend domain, Supabase Pro before 3 Nov 2026, Section 23 items).


- Legal pages (/terms, /privacy, /cookies) must be reviewed by a lawyer before launch.
