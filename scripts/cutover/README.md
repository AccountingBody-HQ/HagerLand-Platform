# Cutover scripts (brief 25.6)

Run ONLY after AB has typed exactly "GO LIVE". Each script refuses production unless `CUTOVER_DB=live HL_CONFIRM=GO-LIVE` is set,
and reads the live database address from `SUPABASE_DB_URL` in `.env.local` (never printed, never committed).
Every step can be rehearsed on the local copy with `CUTOVER_DB=local` (the rehearsal is recorded in docs/LAUNCH_REPORT.md).
Stop at the first failure. If step 6, 7 or 8 fails, run the rollback.

| Step | What | Command (production) |
|---|---|---|
| 1 | Verifiable checklist items: env vars and Resend domain on the latest preview (`/api/health/full`), `SUPABASE_DB_URL` present | `grep -q '^SUPABASE_DB_URL=' .env.local` and `PREFLIGHT_URL=<preview> bash scripts/preflight.sh` |
| 2 | Fresh live backup into `backups/` (git-ignored); confirm the files exist | `SUPABASE_DB_URL=… bash scripts/backup-supabase.sh` |
| 3 | Migrations 0010 onwards, one at a time, each one transaction, each followed by its check (`supabase/checks/NNNN.sql`) | `bash scripts/cutover/migrate.sh` |
| 4 | Security test against live (cleans up after itself): 100% PASS | `bash scripts/cutover/rls.sh` |
| 5 | Merge `relaunch/construction` into `main` (merge commit), push, wait until www.hagerland.com serves it | `bash scripts/cutover/merge.sh` |
| 6 | Production smoke tests (read-only) | `CRON_SECRET=… npx playwright test -c playwright.production.config.ts` |
| 7 | Legacy lockdown, then its proof (every row PASS), then re-check the site | `bash scripts/cutover/lockdown.sh`, then step 6 again |
| 8 | Preflight against production: all checks pass | `bash scripts/preflight.sh` |
| Rollback | Revert the merge (`git revert -m 1`, no force), push, wait for the old site, undo the lockdown if applied | `bash scripts/cutover/rollback.sh [--lockdown-applied]` |

After the migrations, service categories are cached by the site for up to an hour, so new services can take that long to appear.
