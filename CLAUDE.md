# CLAUDE.md — HagerLand

HagerLand is being relaunched as **Ethiopia's construction and property platform** (property marketplace, HagerLand Supply, professionals & services, HagerLand Developments).

## Source of truth
- **Read `docs/HAGERLAND_RELAUNCH_SPEC.md` before any work**, and again after a context compaction or in a new session. It decides everything; where it lists something under Section 23 ("Needs AB"), ask, never invent.
- Progress, decisions and deviations: `docs/RELAUNCH_PROGRESS.md`. Update it at the end of every work package.
- Live database structure before the relaunch: `docs/legacy-schema-snapshot.md` (query: `docs/sql/wp0_legacy_schema_snapshot.sql`).

## Working rules (spec Section 0)
- The owner (AB) is a solo founder learning as we build: explain in plain English at every stop.
- One work package (spec Section 21) at a time. Never start the next until AB replies "continue". Stop and wait for "go" at every [STOP-GATE].
- All relaunch work on branch `relaunch/construction`. `main` (live site) is untouched until WP-20. Rollback point: tag `pre-construction-relaunch`.
- **Never run SQL against the database.** Write numbered migrations in `supabase/migrations/` (e.g. `0001_core_schema.sql`); hand each to AB with a plain explanation and a verification query; wait for confirmation before writing code that depends on it.
- Database is in production use. New schema is additive. Never DROP or TRUNCATE legacy tables (companies, jobs, housing, money, cars, tutors, community, events, delivery, made_in_ethiopia, business_claims, listing_enquiries, import_log, admin_audit, rate_limits, countries, ...).
- Stay on Next.js 15.5.x / React 19 (upgraded in E10, authorised by the Phase 1.5 brief). No other major upgrades without AB.
- Never change without AB's explicit agreement: the name "HagerLand", green #1C7C4C, gold #B8862E, the three-node logo, admin path `/roodber8` and its username + password + TOTP login, canonical host `www.hagerland.com`.
- Never back up the database into git: backups go to `backups/` (git-ignored) via `scripts/backup-supabase.sh`.

## Commands
```bash
npm run dev                      # local dev server
npm test                         # unit tests (Vitest)
npm run stack                    # start the local Supabase copy (Docker)
npm run test:e2e:build && npm run test:e2e   # Playwright against the local copy
npm run lint                     # ESLint (next lint)
npx tsc --noEmit                 # typecheck
rm -rf .next && npm run build    # clean production build
```
Every work package must pass, in this order: lint, typecheck, clean build, with zero errors and no new warnings.

## Stack
Next.js 15.5 App Router · React 19 · TypeScript strict · Tailwind · Supabase (Postgres, Auth, Storage) · Resend · Cloudflare Turnstile · Vercel (Pro). Import alias `@/*` = repo root.

## Code conventions (spec 0.6)
- No `any` unless unavoidable and commented. `Array.from(new Set())`, not spread on Sets. No variables named `_` or `_score`.
- Explicit type annotations when a variable is reassigned from untyped API data inside loops.
- zod validation of every input on the server. Never trust the client.
- **Never interpolate user input into PostgREST filter strings** (e.g. `.or(\`name.ilike.%${q}%\`)`). Use `.ilike('col', pattern)` with `% _ , ( )` escaped, or an `.rpc()` Postgres function.
- Escape all user text placed in email HTML.
- Service-role client and secrets live in modules that `import 'server-only'`.
- Server Components by default; Client Components only for interactivity.
- Tailwind classes with design tokens; no inline style objects for theming. lucide-react icons only.
- No dead code, commented-out blocks or TODOs in shipped code (track them in RELAUNCH_PROGRESS.md).
- No placeholder, lorem ipsum, fake listings, fake stats, fake testimonials or invented counts in UI. Empty states are designed and honest.
- Integrity rule: HagerLand's own developments/products are always labelled and never silently boosted in organic results.

## Design rules
- Mobile-first (360px up), tap targets ≥ 44px, body text ≥ 16px on mobile, no horizontal scroll.
- Paired buttons equal width (`flex-1`). Nothing may depend on hover to look right.
- Tokens, typography and components: spec Section 5.

## Architecture (spec Sections 4, 6, 7)
- Unified entity model: `profiles`, `organisations` (+ members, services, product categories, invitations, branches), `locations` tree (countries at the top), `properties`, `developments` (+ progress updates), `products`, `media`, `enquiries`, `quote_requests`, `claims`, `verification_requests`, `promotions`, `site_settings`, `audit_log`.
- Phase 1.5 (spec Section 24, PLATFORM_VISION wins where they differ): `verticals` registry (Live / Coming soon / Hidden, `VerticalGate` in each vertical's layout, middleware noindex), request engine (`service_requests`, matches, quotes, `deals`), Property Care, saved items and saved searches, exchange rates, jobs and candidate profiles, guides and build-cost rates, trade accounts, `email_outbox`, Amharic (`lib/i18n`, `/am` rewrite in middleware, off by default). Migrations are recorded in `schema_migrations`.
- Section 26 (property ecosystem): `pillars` + `pillar_services` with Direct/Aggregate/Interest modes and DB-enforced stage gates (`pillar_gate_checks`); pillar-controlled verticals follow the modes by trigger. Agency CRM (`agency_*`, `rental_applications`, `tenancies`), owner portal, `build_projects`, `reviews`, `market_insight`, `staff_users`. Route ↔ pillar map: `docs/PILLAR_ROUTES.md`.
- RLS on every new table; anon reads only through `*_public` views and SECURITY DEFINER search functions. Contact details only via `/api/contact-reveal`.
- Supabase Auth via `@supabase/ssr`; accounts at `/account`, admin at `/roodber8`.
- Route map: spec Section 4.3.

## Gotchas
- Google Places imports use Places API (New): `POST places.googleapis.com/v1/places:searchText` with `pageToken` **in the POST body**. Do not reintroduce legacy Places pagination.
- Admin GET routes authenticate with `cookies()`. Keep that pattern. Admin pages/actions also call `requireAdminPage()` / `assertAdmin(AREA)` (lib/admin/guard.ts) and record actions with `audit()`. Every admin action file declares `const AREA = '/roodber8/…'` so staff roles (lib/admin/roles.ts) are checked per action; a unit test enforces it. New admin areas must be added to the role map.
- Google Places content may only be used to discover businesses: store `place_id`, never Google reviews/ratings/photos.
- Tests that write data run only against the local Supabase copy (`supabase/local-stack`, `.env.test.local`, `scripts/with-test-env.sh` refuses non-localhost URLs). Never point tests at the live project.
- `rate_limits` and `import_log` are pre-existing (legacy) tables the app still uses: never delete their data without AB's agreement (the daily job's rate-limit purge is opt-in via `CRON_PURGE_RATE_LIMITS`).
- Photos are stored as WebP. `next/og` cannot read WebP: share images convert with sharp first (`lib/og.tsx`).
- Hidden form fields that must change after a click (e.g. confirmations) must be set before submitting; a button that hides itself on click loses the submission (see `OrganisationForm`).
- Admin nav links use `prefetch={false}`: every admin page is a dynamic, database-backed render.
- The test build lives in `.next-test` (`npm run test:e2e:build`); Playwright reuses any server already on port 3100, so kill a stale `next-server` first or tests run against an old build.
- `supabase/local-stack/setup.sh` applies only migrations not yet in `schema_migrations`; after a Codespace restart, remove broken Docker containers (`docker rm -f`, keep the db one) and run it again.
- Editors send `expected_updated_at`; save actions refuse stale edits (`lib/concurrency.ts`). Keep that when adding editors.
- Emails go through `lib/email/send.ts`: a failed send is queued in `email_outbox`, never thrown at the visitor.
- User-facing text in shared chrome goes through `t()` / `getT()` (`lib/i18n`) so Amharic can fall back cleanly.
- Do not run `npx prettier --write` (no prettier config; it reformats the codebase).
- Next 15: `cookies()`, `headers()`, `params` and `searchParams` are async (await them). `requireAdminPage()`, `assertAdmin()`, `isAdminRequest()` and `getLocale()` are async too.
- Files with `'use server'` may export only async functions (move constants to `lib/`). Non-component exports from `'use client'` modules are not usable in server components (the admin menu list lives in `components/admin/admin-nav-items.ts`).
- Email links use the canonical (live) host even in test builds: e2e tests take the path from them.
- React 19 resets a form after its action runs. Forms that show validation errors use `NoResetForm` (`components/forms/NoResetForm.tsx`) so typed values stay; submit buttons read its pending state via `useFormPending()`.

## Status
Phase 1 (WP-0 to WP-19), Phase 1.5 (E1–E10, H1–H6, `docs/BRIEF_PHASE_1_5_AND_GO_LIVE.md`) and Section 26 (S1–S12, `docs/BRIEF_SECTION_26.md`) are built; see `docs/LAUNCH_REPORT.md`, `docs/RELAUNCH_PROGRESS.md` and `docs/REQUIREMENTS_MATRIX.md`. Cutover (25.6) runs only after AB types exactly "GO LIVE".
