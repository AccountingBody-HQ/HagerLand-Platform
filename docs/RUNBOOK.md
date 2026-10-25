# HagerLand — Runbook

Plain-English instructions for running the site day to day. Written for AB.

---

## 1. Backups

Supabase's Free plan keeps no downloadable backups. Until you upgrade to Pro (which keeps daily backups for 7 days), take a manual backup **before every database change** and at least weekly.

1. Open the Codespace for this repository.
2. In Supabase: **Project Settings → Database → Connection string → Session pooler**. Copy it (leave `[YOUR-PASSWORD]` in it).
3. In the Codespace terminal run:
   ```bash
   bash scripts/backup-supabase.sh
   ```
4. Paste the connection string, then your database password when asked.
5. Three files appear in `backups/`. Right-click each in the file list → **Download**. Keep them somewhere safe (they contain personal data).
6. Delete them from the Codespace afterwards: `rm backups/*`.

`backups/` is never committed to git.

## 2. Running a database migration

All changes are numbered files in `supabase/migrations/`. Instructions and a check query for each are in `supabase/README.md`.

1. Take a backup (section 1).
2. Supabase → **SQL Editor → New query**. Paste the whole migration file. Click **Run**.
3. Paste the matching check query from `supabase/README.md`, run it and compare the result.
4. Run `supabase/tests/rls_test.sql` the same way: every row must start with `PASS`.

If anything fails, Supabase undoes the whole file. Nothing is half-applied. Send the error message to your developer.

## 3. Rotating admin secrets

Do this at launch (cutover), whenever someone who knew them leaves, or if you suspect a leak.

| Secret | Where | How to make a new one |
|---|---|---|
| `ADMIN_PASSWORD` | Vercel → Project → Settings → Environment Variables (Production) | A long passphrase from your password manager |
| `ADMIN_SESSION_SECRET` | Same place | Run `openssl rand -hex 32` in the Codespace terminal and paste the output |
| `CRON_SECRET` | Same place | `openssl rand -hex 32` |
| `IP_HASH_SALT` | Same place | `openssl rand -hex 32` (changing it resets rate-limit counters; harmless) |
| `ADMIN_TOTP_SECRET` | Same place | Keep it unless your phone was lost. If you change it, add the new secret to your authenticator app first |

Steps:
1. Edit the value in Vercel and save.
2. **Deployments → latest → ⋯ → Redeploy** so the new value is used.
3. Changing `ADMIN_SESSION_SECRET` signs everyone out of the admin. Sign in again with the new password and a fresh code.

Never paste secrets into chat, email or a git commit.

## 4. The daily job

Every day at 06:00 UTC Vercel calls `/api/cron/daily` (set in `vercel.json`, protected by `CRON_SECRET`). It:

- takes down listings past their expiry date and emails the owner;
- emails owners once, 7 days before their listing expires;
- marks quotes as expired 14 days after they were issued;
- switches "featured" badges on and off as promotions start and end;
- reminds providers once when they have not answered a service request within 48 hours;
- sends daily and weekly saved-search alerts (instant alerts go out when a listing is approved);
- closes jobs past their closing date;
- retries emails that failed to send (up to five times; see admin → **Email problems**);
- deletes verification documents 90 days after the decision, contact-reveal records older than 12 months, CVs sent with job applications after 12 months, and interest registrations after 24 months;
- emails you a digest at `ADMIN_DIGEST_EMAIL`, only when there is something to look at (reviews waiting, new leads and requests, emergencies, unanswered enquiries, emails waiting to be resent, errors).

To check it ran: Vercel → Project → **Logs**, filter by `/api/cron/daily`, or Vercel → **Settings → Cron Jobs**.

The pre-existing `rate_limits` table is not cleaned unless you set `CRON_PURGE_RATE_LIMITS=true` in Vercel. It only holds short-lived counters, so switching it on after launch is safe.

Health checks: `/api/health` answers `ok` for anyone when the website is up (use it for an uptime monitor; it checks nothing else). `/api/health/full` with the header `Authorization: Bearer <CRON_SECRET>` answers true/false for each setting being present, the database, every migration, the storage buckets and the email domain. Details, and what neither checks: section 11.

## 5. Errors

Server errors are written to Vercel's logs and counted in the `errors` table (one row per kind of error, with a count). The five most frequent of the last day appear in the daily digest. To look at them all: Supabase → **Table editor → errors**, sorted by `last_seen_at`.

## 6. Admin

- Address: `/roodber8`. Sign-in needs the username, password and a 6-digit code from your authenticator app. Five wrong attempts lock that connection for 15 minutes.
- Every admin action is recorded in **Audit log**.
- **Verticals** switches each part of HagerLand between Live, Coming soon and Hidden. Pages follow within about a minute. Service lists are cached for up to an hour, so after a migration that adds services, new ones can take up to an hour to appear.
- **Settings → Amharic (አማርኛ)** switches the `/am` version on or off (off until a native speaker has reviewed the translation in `lib/i18n/messages/am.ts`).
- Business details shown on the website (phone, email, address, social links, legal name, delivery area, quote reply time, "why buy" points, announcement bar, homepage picks) are edited in **Settings**. Anything left empty is hidden from visitors.

## 7. Testing changes safely (for developers)

Tests never touch the live database. They use a local copy of Supabase running in Docker in the Codespace.

```bash
bash supabase/local-stack/setup.sh          # start (add "reset" to wipe and rebuild)
npm run lint && npx tsc --noEmit             # code checks
npm test                                     # unit tests
npm run test:e2e:build && npm run test:e2e   # browser tests against the local copy
```

`scripts/with-test-env.sh` refuses to run against anything other than `localhost`. Emails sent during tests go to the local mail catcher (http://localhost:8025) or are only logged, never to real people.

## 8. Rolling back

- Code: Vercel → **Deployments**, pick the previous good deployment → **⋯ → Promote to Production**. Takes seconds.
- Before the relaunch: git tag `pre-construction-relaunch` marks the old live site.
- Database: restore from your latest backup (Supabase support can help on Pro). This is a last resort: prefer fixing forward with a new migration.

## 9. Imports and Google data

**The rule (Google Maps Platform terms, read 24 Oct 2026).** HagerLand may keep a Google **place ID** for ever and Google's map position (latitude/longitude) for at most 30 consecutive calendar days. It may not store any other Google Places content (names, phones, addresses, websites) and may not create content from it (such as AI descriptions). Sources:
- Terms of Service §3.2.3 (a) No scraping, (b) No caching, (c) No creating content from Google Maps Content, (d)(iii) not in a listings or directory service: https://cloud.google.com/maps-platform/terms (last modified 26 Aug 2026).
- Service Specific Terms, General Terms §3 (Google ID caching: `place_id`) and §14.3 Places API caching (latitude/longitude, 30 days): https://cloud.google.com/maps-platform/terms/maps-service-terms (last modified 15 Oct 2026).
- Places API policies (place IDs exempt from caching; attribution when shown without a Google map): https://developers.google.com/maps/documentation/places/web-service/policies (updated 21 Oct 2026).

**What the app does since migration 0039.**
- **Imports** (admin → Businesses & people → Imports) is a lead finder: search results are shown, never saved. Importing keeps only the place ID; the business becomes a private lead named “Unconfirmed lead — refetch from Google” in the area you chose. No AI descriptions.
- Each lead's page has a **Google data** panel: where each detail came from, the deadline, **Show Google's details** (live, not saved, with the “Google Maps” attribution) and **Confirm with the business** (type what the business told you: method, date, who, note). Only confirmed details become HagerLand's data. Confirming removes Google's map position: the location is the area you choose.
- An imported business cannot be published until its name and every displayed detail are confirmed or replaced (checked on every publish path and by the database).
- `org_field_sources` records the source of each field; `import_cleanup_runs` logs every clean-up run (append-only).

**Clean-up (daily job, step “imports clean-up”).** Mode is the setting `imports_cleanup_mode` on **Imports compliance** (`/roodber8/imports/compliance`):
- **Dry run — report only** (default): records what would be cleared. Changes nothing.
- **Live — clear expired Google data** (owner only; tick that the dry-run list was read): Google details older than 30 days are emptied on **private, unclaimed** businesses; the place ID is kept; a name from Google becomes “Unconfirmed lead — refetch from Google” and the web address (slug) loses Google's name; the business names copied into the import history (`import_log.listing_name`) are emptied. Rows are never deleted; each clearing is in the audit log with field names only.
- **Public or claimed businesses are never cleared automatically.** They appear under **Public — needs your decision** with two owner buttons: **Make private and clear**, or **Confirmed with business** (opens the confirm form).
- A failing clean-up is logged (“imports clean-up failed”) and never stops the rest of the daily job or the digest. The digest shows counts only.

**Not cleared (by design, tell AB).** Older audit-log entries may contain business names or details copied at import or edit time (the audit trail is kept). The location (sub-city) of businesses imported before 0039 may have been matched from Google's address; it stays until confirmed.

**Switching back.** Set the mode to Dry run at any time; cleared fields cannot be restored from HagerLand (use **Show Google's details** and confirm with the business again).

## 10. Jobs: apply by phone, worker register and deleting personal details (Jobs Phase 2, migration 0040)

**Where.** Admin → Jobs → Jobs and applications → **Switches and data deletion** (`/roodber8/jobs/data`, owner only; staff are sent back to the dashboard). The worker register is admin → Jobs → **Worker register** (`/roodber8/jobs/register`, Owner and Operations).

**The two website switches (both start Off).**
- **Apply by phone**: adds an “Apply by phone” button to every open job; workers apply with name, phone, trade, area, how to contact them and language, and tick “I am 18 or older” and the consent. No account or email. The employer sees “By phone” with Call, WhatsApp, Telegram and SMS buttons (the worker's choice first) and gets the usual email.
- **Worker register**: adds “Looking for work? Tell us you're available” to `/jobs`. Only HagerLand staff see the list; ask the worker before giving their number to an employer.
- **Keep both Off until the lawyer has confirmed**: the consent wording, the 18+ rule, sharing phone numbers with employers, keeping data outside Ethiopia (Supabase, Resend) and calling workers on the register. Switching on asks you to tick that this is done.
- **Off closes every door**: no button or section, the form address answers “not found”, and the server refuses anything sent to it. Switching takes effect on the next page load. Each change is in the audit log (`jobs.switch`).

**Deleting personal details after 12 months (daily job, step “jobs data clean-up”).**
- **Dry run — report only** (the default): each day counts what would be cleared and records it in the run list on the same page. Nothing changes. “Run a dry run now” does the same at once.
- **Live — delete personal details after 12 months** (owner only; tick that you read the latest dry run). **Must be Live before 15 October 2027** (the privacy page promises it; applications exist on live since 15 October 2026).
- What is cleared, 12 months after the application (Addis Ababa date; due on the first day on or after the same date a year later): the applicant's name becomes “Removed”; email, phone, cover note, employer notes, area, contact method and language are emptied; the CV file is deleted unless it is still on the candidate's profile or on a newer application. Worker register entries: the same, 12 months after the worker last updated the entry. Queued emails older than 12 months are emptied and never retried.
- What stays: every row, its reference, job, status, channel, trade and dates, the link to the candidate's own account, the audit log (which never holds applicants' details), and candidate profiles (they stay until the candidate deletes them).
- No exception yet for people hired through HagerLand (it comes with the recruitment desk, Phase 3).
- Results: the run list shows, per run, how many would be / were cleared and how many failed. A failed row is logged (“could not clear …”), counted, and tried again the next day; it never stops the rest. The daily digest shows the same counts.

**Read-only check after AB applies 0040 on live:** `docs/sql/0040_jobs_phase_2_verify.sql` (every row PASS). The migration replaces the job-type check to add “daily labour”, so the Supabase editor shows its warning about a “destructive” statement; no data is removed.

## 11. Health checks: what each address checks

**`https://www.hagerland.com/api/health`** (public, anyone can open it).
- Checks: only that the website answered, and which version is live (`version` is the first 7 characters of the commit).
- Does **not** check: the database, migrations, storage, email or the daily job. The answer says so itself (`"checks": ["website"]`, `"notChecked": [...]`).
- `"ok": true` therefore means "the site is up on this version", nothing more. Use it after a release to see the new version is live.
- Not ok, or no answer: the site is down or still deploying. Wait two minutes and try again; if it stays down, check Vercel → Deployments for a failed build and roll back (section 8).

**`https://www.hagerland.com/api/health/full`** (protected: only answers with `Authorization: Bearer <CRON_SECRET>`; without it, 401).
- Checks (true/false): every required setting is **present** (`env`, never the values and not whether they are right); the database answers (`database`); every migration the code expects is recorded in `schema_migrations` (`migrations`); both storage buckets exist with the right privacy (`storage`); Resend reports the sending domain as verified (`emailDomain`). `ok` is true only when all of these are.
- Also shows `latestMigration`: the newest migration recorded in the database (read only), for example `"0040"`.
- Does **not** check (listed in `notChecked`): whether the daily job ran (see the daily digest email and the run lists in admin), whether emails were actually delivered (admin → Email problems), whether the Turnstile keys or secrets are correct, and whether the live data matches the verify files. **The proof for a migration is its read-only verify file in `docs/sql/`** (every row PASS), not this address.
- If a value is false: `env.<NAME>` — the variable is missing in Vercel (tell your developer; never paste the value in chat). `database` — Supabase is down or paused (Supabase dashboard). `migrations` — a migration the code needs has not been applied on live: apply it with its verify file (section 2) or roll back the release. `storage` — a bucket is missing or has the wrong privacy (Supabase → Storage). `emailDomain` — the domain is not verified in Resend (Resend → Domains).
- `scripts/preflight.sh` reads this address and lists any check that is not true (names only).
