# Jobs Phase 2: report (Stage 1: built, tested, pushed, not merged)

Branch `jobs/phase-2-phone-trades`, from `main` at `3adcd50`. Code commit `0c9ff29`. Migration 0040 is applied to the LOCAL copy only. AB applies it on live; Stage 2 starts with the phrase "RELEASE JOBS PHASE 2" and pasted verify results.

## 1. What changed (in AB's words)

1. **Trades and daily labour.** Jobs can have a trade (26 trades, in AB's order, including "Other"). "Daily labour" is a new job type. On `/jobs`: "Find work by trade" (one button per trade), a "Trade" filter ("Any trade"), and the job page shows "Trade: …".
2. **Apply by phone** (switch, starts Off). Workers apply on every open job without an account or email, and tick "I am 18 or older" and the consent. They see "Application sent" with a reference; nothing is sent to them.
3. **Employer view.** Phone applications show "By phone" and four buttons (Call, WhatsApp, Telegram, SMS), the worker's chosen method first. The employer email says "… applied for "…" by phone. Open the application to see how to contact them." Email applications are unchanged.
4. **Worker register** (switch, starts Off). "Looking for work? Tell us you're available" appears on `/jobs`. Joining again with the same phone updates the entry and shows the same confirmation. Only HagerLand staff with the Owner or Operations role see the list (admin → Jobs → Worker register).
5. **Owner switches.** Admin → Jobs → Switches and data deletion (owner only). While a switch is Off there is no button or section, the form address answers "not found", and the server refuses anything sent to it.
6. **Stricter candidate visibility** (decision 2), enforced in the database. Only verified businesses, or businesses with a job HagerLand approved and has not removed, can see visible profiles. Other businesses see the approved C5 text. No profile was changed.
7. **12-month deletion** (must be Live before 15 Oct 2027). It runs in the daily job and starts on **Dry run**.
   - Applications (phone and email): cleared 12 months after the application.
   - Worker register entries: cleared 12 months after the worker last updated them.
   - Old queued emails: cleared after 12 months.
   - The owner page shows the mode, every run's counts and the failures. The digest shows the same counts.
8. **Admin.** Phone applications appear in Jobs admin, and the overview shows phone and register counts. The digest gains phone-application and register lines. Job review shows scam and fairness warnings (warnings only, nothing is rejected automatically).
9. **Privacy and candidate wording** exactly as approved (W-C1 to W-C4). The privacy page shows "Last updated 25 Oct 2026".

## 2. Discovery answers

- **Q1. Approved and removed.**
  - *Approved* means HagerLand sets the job to `published`: `jobDecisionAction` in `app/roodber8/actions/jobs.ts` (audit `job.approve`). Employers cannot publish, because the `protect_privileged_columns` trigger (`0001_extensions_enums.sql`) only lets them set draft, pending review, paused or archived. On first publication the trigger `jobs_before_write` (`0019_jobs.sql`) sets `published_at`, which is a privileged column.
  - *Removed* is status `removed`, set only by `adminJobStatusAction` (audit `job.removed`). Once removed, employers cannot change the job.
  - The rule used in `candidates_for_employers` (0040): a published organisation the user belongs to, AND (`verification_level = 'verified'` OR a job of that organisation with `published_at IS NOT NULL AND status <> 'removed'`). A job that was approved and later expired, paused or closed still counts. A job that was only ever removed does not.
  - The same rule is in `lib/jobs-privacy.ts` (`canSeeCandidates`), and the "Find candidates" page uses it to show the C5 text.
- **Q2. Verified business.** It's `organisations.verification_level` (`listed`, `claimed`, `verified`). A business becomes verified when HagerLand approves its verification request in the review queue: `verificationDecisionAction` in `app/roodber8/actions/moderation.ts` sets `verification_level = 'verified'` and `verified_at`.
- **Q3. Settings switches.**
  - They are `site_settings` rows `jobs_phone_apply` (false), `jobs_worker_register` (false) and `jobs_data_cleanup_mode` ("dry_run"), added by 0040 only if absent. None is in `site_settings_public`, so they are never public (verify row 22).
  - They are shown and changed on `/roodber8/jobs/data` (`app/roodber8/jobs/data/page.tsx`). The page sends non-owners to the dashboard, and the actions in `app/roodber8/actions/jobs-phase-2.ts` call `assertAdmin(AREA)` and then `assertOwner()`.
  - Each change is audited (`jobs.switch`, `jobs.cleanup_mode`). Switching on needs the "lawyer has confirmed" tick; Live deletion needs the "I have read the latest dry run" tick.
  - The switches are read fresh on every request (`lib/jobs-switches.ts`).
- **Q4. CV clean-up, and how it was reused.**
  - The existing step `purgeApplicationCvs` (`lib/cron/daily.ts`, Phase 1) runs whatever the mode. It takes applications with a CV older than 365 days, deletes the file from `private-docs` unless the candidate's profile or a newer application uses it, then clears `cv_path` and sets `cv_purged_at`.
  - The new deletion (`lib/jobs-cleanup-data.ts`) uses the same rule, bucket and storage call for any CV still attached. It treats "newer application" as one not yet due and not yet cleared.
  - The Phase 1 step is unchanged, so in practice the CV file is usually gone already and the new step clears the rest.
- **Q5. Tables that can hold applicant or register details.**
  - `audit_log`: none today. Job actions record job titles and ids. The new register action records the reference only ("notes_changed", never the notes).
  - `errors` and logs: messages only (`lib/log.ts` stores `error.message`, which has no row values), and no new log line contains a name or phone.
  - `email_outbox`: holds whole emails (applicant names), so it is cleared after 12 months.
  - `rate_limits` (legacy): the new keys are hashes, never the phone or address.
  - `job_data_cleanup_runs`: ids only.
  - Outside HagerLand: copies kept by the email service (Resend) are outside our control (lawyer to confirm).
- **Q6. Register rate limits.** 5 an hour per visitor address (the same as Apply by phone) and 3 a day per phone number. Joining again only updates the entry, so three a day is plenty, and it limits anyone overwriting someone else's entry. Both use hashed keys.
- **Q7. Deletion date rule.**
  - A record is due on the first **Addis Ababa** calendar day on or after the same date 12 months later. A 29 February date counts from 28 February, so the record is deleted on 1 March.
  - The cut-off is midnight Addis time (UTC+3, no daylight saving) at the start of the day after "today minus 12 months" (`deletionCutoff` in `lib/jobs-privacy.ts`).
  - Tests prove an application sent at 21:30 UTC on 24 Oct 2025 (22:30 in London, already 00:30 on 25 Oct in Addis) is not due at 23:59 Addis on 24 Oct 2026, and is due from 00:00 Addis on 25 Oct 2026.
  - Why: the privacy page promises "12 months after", and Ethiopia dates are the rule for this platform.

## 3. Side effects checked

| Could be affected | How it was checked | Result |
|---|---|---|
| Existing job applications, jobs, profiles | Verify rows 9, 10, 24; e2e J5 and J6 (before/after) | Unchanged. New columns only; existing rows get channel "account" by default |
| Email "Apply now" flow | `e2e/jobs.spec.ts` (full Jobs journey) | Passes, unchanged |
| Staffing request wording (1b, 1c) | Phase 1b and 1c specs | Pass, unchanged |
| Other services (`/request-service/plumbers`) | Phase 1/1b/1c specs, J8 | Unchanged |
| Supply area | Supply A–Z automatic test | Passes |
| Public pages, sitemaps, search | J7, J8 exclusion check (`/jobs`, the job page, `/sitemap.xml`, `/sitemap/jobs.xml`, `/search`, `/privacy`) | No phone, name, notes or register data anywhere; no form link while Off |
| Who reads applications and the register | RLS script (13 new checks) and e2e J2 and J3 as visitor, random user, another employer, the job's employer, owner, Operations, Agent, Content | Only the job's employer (their own jobs) and Owner/Operations admin. Direct database reads return nothing |
| Staff roles | Unit tests; e2e J3 | Register: Owner and Operations. Switches page: owner only. Agent and Content refused |
| Emails | Employer email: only the phone body is new (W-C6). The confirmation email to candidates is unchanged. No email or SMS to phone applicants or workers (J1 checks the mail catcher) | As approved |
| Daily job and digest | e2e J6 (cron run, digest in the mail catcher); the step is isolated like the others | Dry run changes nothing; live clears exactly the S8 fields |
| Admin menu | Unit test updated | One new item, "Worker register" |
| Privacy dates | J8 | Privacy 25 Oct 2026; Terms and Cookies stay 14 Oct 2026 |
| Shared components | `ChoiceChips` and the forms are new; `Field`, `PhoneInput` and the email templates gained no new behaviour for other uses (`newApplicationEmail` gets `byPhone` only from the phone action) | No other service changed |
| Settings on external services | None touched | — |

## 4. Tests

| Check | Result |
|---|---|
| Lint, typecheck, clean production build | Pass (no warnings) |
| Unit tests | 484 of 484 (50 files), including the new `tests/unit/jobs-phase-2.test.ts` |
| RLS script (`supabase/tests/rls_test.sql`, local) | 225 PASS, 0 FAIL (13 new Phase 2 checks) |
| New e2e `e2e/jobs-phase-2.spec.ts` | 10 of 10 (J1–J8, exclusions, plain 375 px window) |
| Regression e2e (Jobs, Jobs 1, 1b, 1c, Supply A–Z, service requests, repairs, staff, admin menu, plain language, content, S26 content, security, phone widths, edge cases, cron) | 209 passed, 0 failed (94 skipped: tests that run on one screen width only, by design) |
| Verify 0040 (local) | 26 of 26 PASS |
| Verify 0034–0039 (local) | 132 PASS, 0 FAIL (the 0036 row that may fail did not) |

## 5. Decisions and why

1. **Wording.** No new customer text beyond section 2.
   - Errors reuse existing site messages: "Please check the highlighted fields.", "Enter a phone number starting with +251 or 09", "Name needs at least 2 characters", "Please complete the security check and try again." and "Something went wrong. Please refresh the page." (used when a switch is off).
   - Missing ticks and choices are outlined in red under that general message, and the browser's own required-field check stops most of them first.
   - Placeholders reuse "Choose…" and "Sending…".
   - The job page reuses the approved label: "Trade: Mason".
2. **Form address while Off.** It answers 404 ("not found"), which needs no new wording.
3. **Re-joining the register gives a new reference each time**, so a repeat join looks the same as a new one and never shows that a number is known.
4. **Switches are read fresh on every request.** A cached copy could have kept the "Apply by phone" button visible for up to a minute after switching off (found in testing). The pages are already rendered per request, so this costs one small read.
5. **Data choices.**
   - Phone applications are stored in `job_applications` (email made optional), as reviewed.
   - The register's 12-month clock is `last_updated_at`, which only the worker's own join or update moves.
   - Telegram opens `t.me/+<number>`, which works when the person allows being found by number.
6. **Old queued emails** are emptied and marked so they are never retried. The existing outbox clean-up (since 0024) then deletes them as it does every finished email after 30 days.
7. **No hired-through-HagerLand exception** in Phase 2, as approved; it is recorded in the blueprint for Phase 3.
8. **Health check.** `lib/health.ts` now expects migrations 0001–0040, so `/api/health/full` reports `migrations: false` until AB applies 0040. `/api/health` (the public liveness check) does not check migrations and is unchanged.

## 6. Limits and things not done

- Without SMS codes we can't prove a phone belongs to the person. Employers and staff confirm by calling.
- Failure handling in the deletion (one failing row is counted, logged and retried, and the rest continue) is proven with unit tests on the core. On the local copy no real row failure could be forced.
- New strings go through `t()` but have no Amharic entries yet, so they fall back to English (assumption 11).
- The privacy date is 25 Oct 2026. If Stage 2 is released on another day, `LEGAL_WRITTEN.privacy` in `lib/content/legal.ts` needs that date (one line).
- The Phase 2 browser tests run in the desktop project; phone width is checked with a plain 375 px window, as asked.
- The T-1 tidy items ("link works for 0 days", health check honesty) were left alone, as asked.
- Setting up this Codespace (local only): the local Supabase copy was recreated after Codespace restarts, using `supabase/local-stack/setup.sh` with local-only keys. Nothing points at live, and no `SUPABASE_DB_URL` was created.

## 7. Migration and Supabase warning

`supabase/migrations/0040_jobs_phase_2.sql` runs as one transaction, is additive and safe to run twice (tested). It touches no legacy table (the old `jobs` table is untouched, verify row 23).

**Expected Supabase editor warning: yes.** To add "daily_labour", the migration drops and re-adds the job-type check. No row is removed or changed. Making `applicant_user_id` and `email` optional changes column rules, not data.

## 8. SHAs

- Branch: `jobs/phase-2-phone-trades`
- Code: `0c9ff29`
- Report: this commit (see `git log`)
- Not merged.

## 9. Confirmation

No live database writes, no settings changed on any service, no real emails (local mail catcher only). Migration 0040 was applied to the local copy only.
