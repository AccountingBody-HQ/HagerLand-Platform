# HagerLand Relaunch — Progress

Spec: `docs/HAGERLAND_RELAUNCH_SPEC.md` (v1.0, 13 Oct 2026; sha256 `37d6252628bcd738a7e6d229388cfbedd07e5654f94d71f485325248d54480be`)
Branch: `relaunch/construction` · Rollback tag: `pre-construction-relaunch` → `00de73c` on `main`

Status values: todo · in progress · done · blocked

## Work packages

| WP | Title | Status | Date | Commit | Notes / deviations |
|----|-------|--------|------|--------|--------------------|
| WP-0 | Safety & setup | done (code) | 2026-10-13 | 080a4da | AB still to take backup + run snapshot query |
| WP-1 | Strip legacy & fix foundations | done | 2026-10-13 | e7dade5 | Also removed old about/contact/terms pages and admin import UI (rebuilt in WP-13/14) |
| WP-2 | Database foundation [STOP-GATE] | done (written + tested locally) | 2026-10-13 | dacbf08 | AB must run migrations 0001–0009 (see supabase/README.md); 0008/0009 added later. next_reference fixed in 0002 |
| WP-3 | Design system & layout [STOP-GATE] | done | 2026-10-13 | 05ef6be | Styleguide sign-off waived by AB ("don't stop") |
| WP-4 | Auth & accounts | done | 2026-10-13 | 0fcf8d3 | Google sign-in hidden until NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true |
| WP-5 | Media pipeline | done | 2026-10-13 | 71cc2ee | HEIC not decodable by prebuilt sharp: browsers convert on upload |
| WP-6 | Property marketplace | done | 2026-10-13 | 36d5579 | End-to-end tested on local Supabase stack. Map pin omitted (no provider confirmed) |
| WP-7 | Companies, professionals, suppliers, agents, developers | done | 2026-10-13 | 36d5579 |  |
| WP-8 | Developments & HagerLand Developments | done | 2026-10-13 | bffb4a1 | "Why buy" claims hidden until AB confirms |
| WP-9 | Supplies | done (not yet e2e-tested) | 2026-10-13 | see git log |  |
| WP-10 | Enquiries & leads | partly done | 2026-10-13 | | Enquiry form/action/emails built; /account/enquiries inbox still to do |
| WP-11 | Unified search | todo | | | |
| WP-12 | Homepage [STOP-GATE] | todo | | | |
| WP-13 | Content pages & emails | todo | | | |
| WP-14 | Admin rebuild | todo | | | |
| WP-15 | SEO | todo | | | |
| WP-16 | Analytics, monitoring, cron | todo | | | |
| WP-17 | Security hardening | todo | | | |
| WP-18 | Performance & accessibility | todo | | | |
| WP-19 | QA, legacy sweep, final checklist [STOP-GATE] | todo | | | |
| WP-20 | Cutover [STOP-GATE] | todo | | | |

## WP-0 checklist

- [x] Spec moved from `.next/docs/` (wiped on every build) to `docs/HAGERLAND_RELAUNCH_SPEC.md`
- [x] This progress file created
- [x] Tag `pre-construction-relaunch` created on `main` (`00de73c`) and pushed
- [x] Branch `relaunch/construction` created and pushed
- [x] Backup tooling: `scripts/backup-supabase.sh`, PostgreSQL 17 client installed in the Codespace, `backups/` git-ignored
- [x] Schema snapshot query written and tested: `docs/sql/wp0_legacy_schema_snapshot.sql`
- [x] `CLAUDE.md` (initial)
- [ ] AB: manual Supabase backup taken and downloaded to his computer
- [ ] AB: snapshot result pasted back → saved as `docs/legacy-schema-snapshot.md`
- [ ] Name-collision check confirmed against the live database

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

## Pre-launch tasks for AB

- Legal pages (/terms, /privacy, /cookies) must be reviewed by a lawyer before launch.
