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
- deletes verification documents 90 days after the decision, and contact-reveal records older than 12 months;
- emails you a digest at `ADMIN_DIGEST_EMAIL`, only when there is something to look at (reviews waiting, new leads, unanswered enquiries, errors).

To check it ran: Vercel → Project → **Logs**, filter by `/api/cron/daily`, or Vercel → **Settings → Cron Jobs**.

The pre-existing `rate_limits` table is not cleaned unless you set `CRON_PURGE_RATE_LIMITS=true` in Vercel. It only holds short-lived counters, so switching it on after launch is safe.

## 5. Errors

Server errors are written to Vercel's logs and counted in the `errors` table (one row per kind of error, with a count). The five most frequent of the last day appear in the daily digest. To look at them all: Supabase → **Table editor → errors**, sorted by `last_seen_at`.

## 6. Admin

- Address: `/roodber8`. Sign-in needs the username, password and a 6-digit code from your authenticator app. Five wrong attempts lock that connection for 15 minutes.
- Every admin action is recorded in **Audit log**.
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
