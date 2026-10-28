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
- People hired through HagerLand are kept out of the deletion while their fee records need them (Jobs Phase 3; see section 12).
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

## 12. The recruitment desk: from staffing request to placement (Jobs Phase 3, migration 0041)

**Where.** Admin → Jobs → **Recruitment desk** (`/roodber8/jobs/desk`, Owner and Operations; Agent and Content are refused). Fees are on the same pages but **only the owner** sees or changes them. The desk switch and the keeping period are on **Switches and data deletion** (`/roodber8/jobs/data`, owner only).

**The desk switch (starts Off).** Off: you and Operations use the desk inside admin (shortlists, consent, introductions, placements, fees), but nothing reaches employers: no "People introduced to you" on their request page, no introduction or placement emails, and the fee line in the Terms is hidden. On (tick that the lawyer has confirmed the points listed): introduced people appear on the employer's request page and the emails go out. People introduced while it was Off then appear on the employer's page, without an email. Keep it Off until the lawyer confirms: consent recorded by staff after a call, sharing workers' contact details with employers, the fee terms (VAT and licence conditions), the keeping period, and data held outside Ethiopia.

**Daily flow.**
1. A staffing request arrives in admin → Service requests. Staffing requests never show "Send to providers" or "HagerLand's quote" (the server refuses both). Press **Assign HagerLand's own team**: this opens one desk assignment (pressing again never opens a second). Work outside Ethiopia is refused.
2. On the assignment, check the roles, number of people, pay, start date and the employer (their business profile address, or empty for a private client). "Based outside Ethiopia" comes from the employer's answer on the form.
3. **Add to the shortlist** (you choose; nothing is added automatically): a job application reference (HLA-…), a candidate profile reference (C-…, only visible profiles asking for placement help), a worker register reference (HLW-…), or a person you spoke to (name, phone, trade, area). An application to a **different** employer's job shows only its reference and trade until the person agrees to be introduced to this employer.
4. **Phone the person.** Script (not public): "HagerLand has a job that may suit you: {role} in {area}, {pay}. May we give your name and phone number to this employer? You never pay HagerLand or the employer anything. You can say no or change your mind at any time."
5. Record the answer: **Mark as asked**; **Said no** (cannot be undone); or **Record consent**: how they agreed, an optional note, and tick each way the employer may contact them (Call, WhatsApp, Telegram, SMS, Email). Who recorded it is taken from your sign-in.
6. **18 or older**: carried over when the person ticked it on a phone application or the register; otherwise ask on the call and press **Record 18 or older**. The database refuses an introduction without consent and 18+.
7. **Introduce**: tick the people ready and press **Introduce selected**. With the switch On the employer gets one email (no phone numbers or emails in it) and sees the people on their request page with only the buttons each person agreed to.
8. **Withdrawal**: if a person changes their mind, tick and press **Consent withdrawn**. Their details leave the employer's page at once ("{First name} is no longer available for this request."); phone the employer to tell them. It cannot be undone; if they agree again, add them to the shortlist again (new consent).
9. **Interviewed / Not hired**, then **Record as hired**: role type (trade or professional), start date (Addis Ababa date) and the replacement guarantee (empty = 30 days for trades, 90 for professionals; editable). With the switch On the employer gets the placement email.
10. The daily job moves placements to "guarantee running" on the start date and to "completed" the day after the guarantee ends. The digest shows open assignments, people asked without an answer recorded, and guarantees ending within 7 days.
11. **Left inside the guarantee**: press **Record that they left** (last day and why). Inside the guarantee the placement becomes "replaced"; when you have found someone, use **Replace (free)** with an introduced person. The replacement is free (the database refuses a fee on it) and gets its own guarantee (same length by default).

**Fees (owner only).** On each placement: **fixed amount** (trades, daily labour) or **percentage** (professionals, with what it is based on and, optionally, the pay so the fee is worked out). Enter the date agreed in writing and upload the signed agreement (private; the link works for 10 minutes); then **Mark as agreed in writing** → invoiced → paid, or waive with a reason. Record **Fee due** yourself (never automatic), then **Fee received** (bank transfer, telebirr, CBE Birr, cash, other). Entries cannot be changed or deleted: correct a mistake with **Reverse** (once per entry). No fee email is sent automatically. Operations sees only "Fee agreed in writing: Yes/No". The "Lead fee / Commission" fields on staffing requests are owner only.

**Deletion (the daily job, still Dry run until you switch it).** Shortlist rows of people not hired are cleared 12 months after their last activity (never later than 12 months after the assignment closes). People hired through HagerLand keep their name, contact details and consent record on the shortlist row, and their name and contact on the application, while the fee records need them; their notes and cover note are cleared, and the CV is still deleted after 12 months. The keeping period is **empty until the lawyer confirms it**: until then those records are kept and counted as **"kept: period not set"**; once you enter it (months after the guarantee end or the last fee entry, whichever is later), they are counted as **"kept: hired through HagerLand"** until the period ends, then cleared. Both counts appear in the run list and the digest.

**Read-only check after AB applies 0041 on live:** `docs/sql/0041_jobs_phase_3_verify.sql` (every row PASS). 0041 only adds tables and settings, so the Supabase editor should show no "destructive" warning.

## 13. Trust: verification, job reports, private-client jobs (Jobs Phase 4, migration 0042)

**Verified badge (all businesses).**
- **Record a check** (Owner or Operations): admin → Organisations → the business → **Verified badge** → *Record verification check*. Enter the trade licence number (and its expiry date if shown), the day you checked the licence and how (from the document; the Ministry of Trade online register if it works — optional; in person), the day you checked the tax number (TIN), and the day you phoned the business on a number you found yourself (not only the one they typed). Save: the badge is given for 12 months, or until the licence expires if sooner. A waiting verification request is marked approved and the business is emailed.
- The review queue's Verification tab only declines requests now; to give the badge, open the business and record the check. Agent and Content no longer see this tab.
- **Revoke**: same panel → *Revoke badge* with a reason (audited). The business keeps "Claimed" if someone manages it, else "Listed".
- **Re-check**: if a business changes its name or trade licence number, its check becomes "needs re-check". The badge stays for up to 30 days; record a new check, or it ends on its own.
- **Ending**: the daily job sends one email 30 days before a badge ends ("Your HagerLand Verified badge ends on …") and ends it on time. Digest: "Verified badges ending within 30 days", "Verified badges ended today".
- **Legacy badges** (verified before 0042, no recorded check) keep their old wording and are left alone while **Legacy badge clean-up** is Off (Switches and data deletion). Switching it on gives every legacy badge 90 days from that day (one reminder 30 days before), then it ends unless you record a check. HagerLand's own organisations are not included.

**"Report this job".**
- Anyone can report a job from its page (security check; at most 5 an hour and 20 a day from one connection; a second report on the same job from the same person is not stored, they see the same thanks).
- **Handle reports** (Owner or Operations): admin → Jobs → **Job reports** (or the review queue's Job reports tab). Each job shows its reports, how many different people reported it, any contact details (never share them with the employer) and a warning if a reporter manages a business (could be a competitor). Actions: *Pause while we check* (the job leaves the board and the employer gets a neutral email, never who reported), *Restore* (on the job's admin page: back with its original closing date), *Dismiss*, *Employer contacted*, *Remove the job*, and a staff note. **Jobs are never paused automatically.** Reporters get no reply unless you contact them yourself.
- Digest: "Job reports to review", "Jobs with 3 or more reports this week". A job reported for asking candidates for money is highlighted.
- **Switch**: "Report this job" (On by default). Off removes the button and the server refuses reports.
- Report details, contact and the coded internet address are cleared 12 months after the report (or its handling, if later) by the 12-month deletion job (same Dry run / Live switch; counted as "job reports").

**Private-client jobs (switch Off until the lawyer confirms).**
- Switch **Private-client jobs** on (owner, with the lawyer tick) only after the lawyer confirms: anonymous postings under the recruitment licence; HagerLand named as the hiring organisation (employer-of-record risk); data held outside Ethiopia.
- On a **private-client** desk assignment: *Post a job for this assignment* → title, category, type, trade, **city or sub-city only**, pay, description (no client names, phone numbers or house numbers — admin shows warnings). The job belongs to HagerLand Services and waits for review.
- **Four-eyes**: whoever created the job cannot approve it. The owner may approve their own only by writing the reason in the note (stored and audited).
- The public sees "Posted by HagerLand for a private client" (no name, link, logo or badge); applications go to HagerLand's inbox and appear on the assignment under *Applications to this job* → *Add to shortlist*. The client sees people only through the recruitment desk introductions (consent and 18+).
- Switched off: no desk button, creating and approving are refused, and every private-client job disappears from the website, search and the sitemap.

**Read-only check after AB applies 0042 on live:** `docs/sql/0042_jobs_phase_4_trust_verify.sql` (every row PASS). 0042 only adds tables, columns with defaults, checks and triggers beside the existing ones and replaces the job list view with every column kept, so the Supabase editor should show no "destructive" warning.


## 14. Amharic for Jobs, share links, call-backs (Jobs Phase 5, migration 0043)

**Two new switches** (admin → Jobs → Switches and data deletion, owner only). Both start **Off**. The website notices a change within about a minute.
- **Amharic for Jobs**, with the tick "Native-speaker review done: Jobs pages, header and footer, and the Ethiopian date format." On: the Jobs pages, the staffing request pages (form, thank-you page, request page) and the Jobs account pages have an Amharic version at `/am/…`, the language switch shows on them, and the jobs sitemap lists `/am/jobs/…`. Only text a native speaker has marked OK shows in Amharic; everything else stays English with the note "Some text on this page is shown in English while we finish the translation." Links to other sections stay English. Dates show the Ethiopian date first with the usual date in brackets. Off: `/am/jobs` answers "page not found", as today. The site-wide setting "Show the Amharic version" (admin → Settings) is separate and works exactly as before.
- **Call-back requests**, with the tick "Lawyer has confirmed: calling people who leave their number, the consent wording, data held outside Ethiopia, and the keeping period." On: the box "Prefer to talk? Ask us to call you" appears on `/jobs` and on the staffing request page, with the form at `/jobs/call-back`. Off: no box, the form address shows "not found", and the server refuses anything sent.
- While either Amharic switch is on, /privacy and /terms show one extra line saying the English version applies.

**Getting the Amharic reviewed (step by step).**
1. On the computer with the project, run `node scripts/i18n-export-review.mjs`. It writes `reports/amharic_review_sheet.csv` (not part of the website code).
2. Open it in a spreadsheet and send it to the native speaker. Columns: *key* (the English text), *where* (the page or file), *draft (machine-assisted)* (an old machine translation, if there is one; just a starting point), *reviewer text*, *OK*, *notes*. Words in curly brackets, such as `{date}`, must stay exactly as they are in the translation.
3. The reviewer writes the Amharic in *reviewer text* and puts **yes** in *OK* for each row they are happy with (leave it empty or write no otherwise).
4. Save the returned sheet as CSV and first run `node scripts/i18n-import-review.mjs <file.csv> --dry-run`: it shows how many rows would be imported and lists any refused rows (unknown text, or the curly-bracket words changed).
5. Run it again without `--dry-run`. It writes `lib/i18n/messages/am-reviewed.json` (only the rows marked yes). Then run the unit tests and build, and release it on a branch like any other change.
6. Run the unit tests again: the test "lists the Jobs keys without a reviewed entry" shows how many are still missing. Switch **Amharic for Jobs** on only when that number is 0 and the reviewer has checked the pages, header, footer and the date format. To see the English fallbacks on a page locally: `node scripts/i18n-am-check.mjs http://localhost:3000` (local copy only).
Emails stay in English for now (their text is on the sheet, ready for later).

**Share links (no switch).** Every live job page has "Share this job" with WhatsApp, Telegram, the phone's own share menu (where the phone has one) and Copy link. The message is "{Job title} in {place}. See the job and apply on HagerLand: {link}" (private-client jobs: "…, posted by HagerLand for a private client. …"). No tracking tags, nothing loaded from other websites.

**Copy for Telegram (Owner and Operations).** On a live job's admin page, *Copy for Telegram* copies "New job: {title} in {place}, {pay}. Apply on HagerLand: {link}" (private-client jobs are masked) for pasting into HagerLand's Telegram channel by hand. The text also appears under the button.

**The call queue** (admin → Jobs → **Call-back requests**, Owner and Operations; Agent and Content are refused). Call people at the time they chose (Addis Ababa time). What to say:
> Hello, this is HagerLand. Did you ask us to call you about hiring staff? [If no: 'Sorry for the call. We will delete your number.'] We can find and introduce suitable people. Our fee is agreed with you in writing before we start, and candidates never pay anything.

Then record what happened:
- **Called — turned into a staffing request**: opens the normal staffing request form in a new tab, filled in with the caller's name, phone and what they need. Ask them for their email and the details, send it, and the call-back is closed and linked. The request then goes through the recruitment desk as usual ("Assign to HagerLand's own team").
- **Called — no further action**.
- **No answer**: counts a try; the third "No answer" closes the request.
- **Wrong number / did not ask**: deletes the caller's details at once and blocks the number (kept only in coded form) for 30 days; a new request from that number gets the usual thank-you and is not stored.
- **Spam**.
Callers get nothing by email or text, ever. Limits: 3 requests an hour and 10 a day from one connection; one open request per phone number and at most 2 a week (a repeat sees the usual thank-you, nothing new is stored).

**Counts.** The daily digest shows "Call-back requests waiting". The 12-month deletion job (same Dry run / Live switch) counts and later clears "call-back requests": 12 months after the request or the last call, whichever is later (the reference, outcome and dates stay). Expired wrong-number blocks are removed every day whatever the deletion mode (`callbackBlocksRemoved` in the daily job's result).

**Read-only check after AB applies 0043 on live:** `docs/sql/0043_jobs_phase_5_verify.sql` (every row PASS). 0043 only adds two tables, two settings and one key to the public settings list (same two columns), so the Supabase editor should show no "destructive" warning.

## 15. Jobs insights, the Jobs report and company jobs (Jobs Phase 6, migration 0044)

**Where each figure is.**
- **Insights → Demand → Jobs** (`/roodber8/demand/jobs`; also in the menu as Jobs → *Jobs insights*). Owner and Operations; Agent and Content are refused. Choose *Last 30 / 90 / 365 days* or type a number of days; a period starts at midnight in Addis Ababa. Panels: *Jobs from posting to closing*, *Every status change, and who made it*, *Applications* (by channel, trade and the place of the job), *Jobs with no applications after 14 days* (each links to its admin page), *Few candidates yet*, *Reports about jobs*, *Call-back requests*, *Recruitment desk*. Every panel except the list of quiet jobs has a CSV button (counts only).
- **Insights → Reports → Jobs report** (`/roodber8/reports/jobs`; also *Jobs report* in the menu). **Owner only.** One Addis Ababa calendar month (choose it at the top) with the same panels, plus the recruitment fees. *Print or save as PDF* prints it without the menu.
- **Insights → Demand → Supplies**: *Trades being hired (open jobs)*, *Open staffing requests with HagerLand*, and the list *Hiring, no supply activity yet* (businesses with open jobs or an open desk assignment that have never asked for a materials quote or had a supply order).
- **Organisation page (admin)**: the box *Jobs, projects and supply activity* starts with "Hiring: {n} open jobs ({trades}). Staffing request with HagerLand: open / none."
- **Building project (admin)**: "This customer has a staffing request with HagerLand: {ref}" when they have one.
- **Daily digest**: "Jobs: open 14 days or more with no applications" and "Recruitment fees owed for over 30 days" (counts only; each appears only when above 0).

**Who sees what.** Operations sees counts, timings and "Fee agreed in writing: {yes} yes, {no} no", never an amount (not on the page, not in the page's data, not in a CSV). Only the owner opens the Jobs report, its CSVs, Reports and Performance. Names, phone numbers, emails, notes and CVs never appear in any of these figures or CSVs.

**Reading the numbers.**
- "Sent back" counts every send-back (a job sent back twice counts 2). "Time to approval" runs from a job's first submission to its first approval. Putting a paused job back is not an approval.
- *Every status change, and who made it*: **By the employer** (in their account), **By HagerLand staff** (admin pages), **By the daily job** (closing jobs on their date), **Other** (anything else, for example a change made directly in the database).
- **Small numbers**: a median or "90% within" needs at least 3 data points; below that the page says "Not enough data yet ({n}). Shown from 3." Counts are always shown.
- **Few candidates yet**: a trade is flagged when it has fewer than 3 applications per open job **and** fewer than 3 workers on the register; an area when it has fewer than 3 applications per open job (the register keeps areas as typed, so it is matched by trade only). Call-backs are counted, but not by trade or area.
- **Fees** are shown per currency, as recorded in the fee record; ETB and other currencies are never added together. *This month* uses entries dated in the month (a reversal counts in the month it was made); *to date* uses everything up to the month end (or today). A negative "Outstanding" means more was received than was due.
- **Ageing**: counted from the date the fee was first recorded as due, up to the end of the month (or today): 0–30, 31–60, 61–90 and over 90 days.
- **"Reconciles with fee ledger: yes"** only when all five checks pass: (1) the fee records' totals equal the ledger's totals, currency by currency (an entry in another currency than its record fails); (2) nothing has more received or waived than due; (3) every *Paid* record has nothing outstanding; (4) every *Waived* record has a waived entry; (5) every reversal mirrors the entry it corrects. "No" names the placements that need a look and says which check failed. Fix the record on the desk page (a reversal for a wrong entry, or the right status).
- **Failure rule**: if the database cannot be read, these pages show an error page, never zeros and never "yes". Reload later; if it stays, check the health page.

**Company pages.** A business's page shows "Open jobs ({n})" with up to 6 of its approved, open jobs (newest approved first) and "See all {n} jobs" when there are more, which opens `/jobs?company={slug}` ("Jobs at {company}"). There is no section and no *Jobs* tab when there are none. Jobs HagerLand posts for a private client never appear on any company page, and HagerLand's own businesses (HagerLand Services, Supply, Developments) show no jobs section at all; `/jobs?company=` for them, for an unknown address or for an unpublished business shows the normal board. Every `?company=` address is hidden from search engines. Closed, paused, removed and expired jobs leave the page within minutes.

**Read-only check after AB applies 0044 on live:** `docs/sql/0044_jobs_phase_6_verify.sql` (every row PASS; the last row, "history rows equal jobs", is meaningful right after the migration: 0 = 0 on live). 0044 only adds one table, one function, its triggers and two indexes, so the Supabase editor should show no "destructive" warning. Until 0044 is on live, a preview of the branch shows an error on the Jobs insights and the Jobs report (they read the new table): that is expected.
