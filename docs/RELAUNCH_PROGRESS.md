# HagerLand Relaunch — Progress

Spec: `docs/HAGERLAND_RELAUNCH_SPEC.md` (v1.0, 13 Oct 2026; sha256 `37d6252628bcd738a7e6d229388cfbedd07e5654f94d71f485325248d54480be`)
Branch: `relaunch/construction` · Rollback tag: `pre-construction-relaunch` → `00de73c` on `main`

Status values: todo · in progress · done · blocked

## Work packages

| WP | Title | Status | Date | Commit | Notes / deviations |
|----|-------|--------|------|--------|--------------------|
| WP-0 | Safety & setup | in progress | 2026-10-13 | 080a4da | Waiting on AB: manual backup + schema snapshot (see below) |
| WP-1 | Strip legacy & fix foundations | todo | | | |
| WP-2 | Database foundation [STOP-GATE] | todo | | | Needs backup confirmed first |
| WP-3 | Design system & layout [STOP-GATE] | todo | | | |
| WP-4 | Auth & accounts | todo | | | |
| WP-5 | Media pipeline | todo | | | |
| WP-6 | Property marketplace | todo | | | |
| WP-7 | Companies, professionals, suppliers, agents, developers | todo | | | |
| WP-8 | Developments & HagerLand Developments | todo | | | |
| WP-9 | Supplies | todo | | | |
| WP-10 | Enquiries & leads | todo | | | |
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
