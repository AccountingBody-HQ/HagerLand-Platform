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
- Stay on Next.js 14.2.x / React 18. No major upgrades.
- Never change without AB's explicit agreement: the name "HagerLand", green #1C7C4C, gold #B8862E, the three-node logo, admin path `/roodber8` and its username + password + TOTP login, canonical host `www.hagerland.com`.
- Never back up the database into git: backups go to `backups/` (git-ignored) via `scripts/backup-supabase.sh`.

## Commands
```bash
npm run dev                      # local dev server
npm run lint                     # ESLint (next lint)
npx tsc --noEmit                 # typecheck
rm -rf .next && npm run build    # clean production build
```
Every work package must pass, in this order: lint, typecheck, clean build, with zero errors and no new warnings.

## Stack
Next.js 14.2 App Router · TypeScript strict · Tailwind · Supabase (Postgres, Auth, Storage) · Resend · Cloudflare Turnstile · Vercel (Pro). Import alias `@/*` = repo root.

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

## Target architecture (being built; see spec Sections 4, 6, 7)
- Unified entity model: `profiles`, `organisations` (+ members, services, product categories), `locations` tree, `properties`, `developments`, `products`, `media`, `enquiries`, `quote_requests`, `claims`, `verification_requests`, `promotions`, `site_settings`, `audit_log`.
- RLS on every new table; anon reads only through `*_public` views and SECURITY DEFINER search functions. Contact details only via `/api/contact-reveal`.
- Supabase Auth via `@supabase/ssr`; accounts at `/account`, admin at `/roodber8`.
- Route map: spec Section 4.3.

## Gotchas
- Google Places imports use Places API (New): `POST places.googleapis.com/v1/places:searchText` with `pageToken` **in the POST body**. Do not reintroduce legacy Places pagination.
- Admin GET routes authenticate with `cookies()`. Keep that pattern.
- Google Places content may only be used to discover businesses: store `place_id`, never Google reviews/ratings/photos.
- Legacy (being removed in WP-1): `next.config.mjs` sets `Cache-Control: no-store` on every route; `middleware.ts` is empty; `vercel.json` schedules a non-existent `/api/cron/property-discovery`; base URL falls back to `hagerland-platform.vercel.app`; emails send from accountingbody.com.
