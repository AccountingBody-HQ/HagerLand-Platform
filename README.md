# HagerLand

Ethiopia's construction and property platform: one place for property, building and everything around them, for people in Ethiopia and Ethiopians abroad.

- **Property marketplace** — homes, land and commercial property for sale and to rent, every listing reviewed; HagerLand estate agency, saved searches and alerts, compare, map.
- **HagerLand Supply** — construction materials catalogue, quote lists, Special Buys and trade accounts; suppliers manage their own products.
- **Professionals, contractors, repairs** — directory with portfolios and verification, plus a request engine that sends one request to up to three suitable providers.
- **Diaspora** — services for people abroad and HagerLand Property Care.
- **Finance, insurance, jobs** — built and switched on from admin when ready (coming soon by default).
- **HagerLand Developments** — HagerLand's own future projects, always labelled as its own.

Each part is switched Live, Coming soon or Hidden in admin → Verticals.

Production: https://www.hagerland.com · Admin: `/roodber8`

## Documents

| File | What it is |
|---|---|
| `docs/HAGERLAND_RELAUNCH_SPEC.md` | The relaunch specification (source of truth) |
| `docs/PLATFORM_VISION.md` | The full platform vision (wins over the spec where they differ) |
| `docs/BRIEF_PHASE_1_5_AND_GO_LIVE.md` | Phase 1.5 brief: ecosystem expansion, hardening and go-live |
| `docs/REQUIREMENTS_MATRIX.md` | Every requirement with its status and evidence (`bash scripts/matrix-summary.sh`) |
| `docs/qa/` | Lighthouse and other quality results |
| `docs/RELAUNCH_PROGRESS.md` | Progress per work package, decisions and deviations |
| `docs/LAUNCH_REPORT.md` | What is finished, review checklist and the to-do list before launch |
| `docs/RUNBOOK.md` | Day-to-day operations: backups, migrations, secrets, daily job, rollback |
| `supabase/README.md` | Every database migration, with a plain-English explanation and a check query |
| `CLAUDE.md` | Working rules and conventions for code changes |

## Stack

Next.js 15.5 (App Router, React 19, TypeScript strict) · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Resend (email) · Cloudflare Turnstile · Vercel (hosting, cron, analytics).

## Getting started

```bash
cp .env.example .env.local      # fill in values (never commit this file)
npm install
npm run dev                     # http://localhost:3000
```

Every variable is described in `.env.example`; the server checks them at start-up and logs anything missing or malformed.

## Checks and tests

```bash
npm run lint                    # ESLint
npx tsc --noEmit                # type check
rm -rf .next && npm run build   # clean production build
npm test                        # unit tests (Vitest)

bash supabase/local-stack/setup.sh   # local copy of Supabase in Docker (tests never touch live data)
npm run test:e2e:build               # build against the local copy
npm run test:e2e                     # browser tests (Playwright): journeys, admin, SEO, security, accessibility
```

## Layout

```
app/(site)       public pages          app/(account)   signed-in account area
app/roodber8     admin                 app/api         API routes (search, uploads, contact reveal, cron, health)
components/      UI by area            lib/            data access, validation, email, i18n, security helpers
supabase/        migrations, tests, local stack       e2e/ tests/unit/   browser and unit tests
```
