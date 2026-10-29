#!/usr/bin/env bash
# Local Supabase test stack (Postgres + Auth + PostgREST + Storage + Mailpit) for automated tests.
# Never touches the live project. Usage from the repo root:
#   bash supabase/local-stack/setup.sh        # first time: create keys, start, apply migrations
#   bash supabase/local-stack/setup.sh reset  # wipe the local database and start fresh
#   bash supabase/local-stack/setup.sh reset 0009  # fresh, but stop after migration 0009 (the live state before cutover: rehearsal)
# Writes supabase/local-stack/.env and .env.test.local (both git-ignored).
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"

if [ ! -f .env ]; then
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  mk() { node -e "
const c=require('crypto');const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const h=b({alg:'HS256',typ:'JWT'});const p=b({role:'$1',iss:'supabase',iat:1700000000,exp:2000000000});
console.log(h+'.'+p+'.'+c.createHmac('sha256','$JWT_SECRET').update(h+'.'+p).digest('base64url'))"; }
  printf 'JWT_SECRET=%s\nANON_KEY=%s\nSERVICE_KEY=%s\nPOSTGRES_PASSWORD=postgres\n' "$JWT_SECRET" "$(mk anon)" "$(mk service_role)" > .env
fi
set -a; . ./.env; set +a

# A reset gives every row a new id, so the local builds' saved data (e.g. the place search) is cleared too: otherwise
# forms keep offering ids that no longer exist ("Choose a place from the list", Fix F-3). Cache only, never data.
if [ "${1:-}" = "reset" ]; then docker compose down -v; rm -rf "$ROOT/.next-test/cache/fetch-cache" "$ROOT/.next/cache/fetch-cache"; fi
docker compose up -d
echo "Waiting for the database..."
for _ in $(seq 1 90); do
  PGPASSWORD=postgres pg_isready -h localhost -p 54322 -U postgres >/dev/null 2>&1 && break
  sleep 2
done
sleep 3
if ! PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -Atc "select 1 from storage.buckets limit 1" >/dev/null 2>&1; then
  echo "New database: restarting auth, API and storage so they set up their tables..."
  docker compose restart auth rest storage >/dev/null
fi
echo "Waiting for the storage service..."
for _ in $(seq 1 90); do
  PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -Atc "select 1 from storage.buckets limit 1" >/dev/null 2>&1 \
    && PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -Atc "select 1 from auth.users limit 1" >/dev/null 2>&1 && break
  sleep 2
done

export PGPASSWORD=postgres
P="psql -h localhost -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
if [ "$($P -Atc "select to_regclass('public.locations') is null")" = "t" ]; then
  echo "Creating a replica of the live site's legacy tables (structure only)..."
  $P -f legacy.sql
  UPTO="${2:-9999}"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    [ "$((10#$(basename "$f" | cut -d_ -f1)))" -le "$((10#$UPTO))" ] || break
    echo "Applying $(basename "$f")"; $P -1 -f "$f"
  done
  # Fix F-7: production closed the old site's tables at the cutover (step 7); the local copy does the same so tests run
  # with live's legacy security. Not in the "reset 0009" rehearsal, which imitates the state before the cutover.
  if [ -z "${2:-}" ]; then
    echo "Closing the legacy tables to visitors, as on live (cutover step 7)..."
    $P -1 -f "$ROOT/supabase/legacy/cutover_legacy_lockdown.sql"
    check="$($P -At -f "$ROOT/supabase/legacy/cutover_legacy_lockdown_check.sql")"
    if printf '%s\n' "$check" | grep -q '^FAIL'; then
      printf '%s\n' "$check" | grep '^FAIL'
      echo "Legacy lockdown check failed (see the FAIL lines above)." >&2
      exit 1
    fi
    echo "Legacy lockdown: $(printf '%s\n' "$check" | grep -c '^PASS') checks PASS."
  fi
else
  for f in "$ROOT"/supabase/migrations/*.sql; do
    n=$(basename "$f" | cut -d_ -f1)
    # Applied migrations are recorded in public.schema_migrations (0011 back-filled 0001-0010), as in production.
    # Each file runs as one transaction (-1), as in the Supabase SQL editor and the cutover runner.
    if [ "$n" -ge 10 ] && [ "$($P -Atc "select case when to_regclass('public.schema_migrations') is null then (select count(*) from public.site_settings where key = 'migration_$n') else (select count(*) from public.schema_migrations where version = '$n') end")" = "0" ]; then
      echo "Applying $(basename "$f")"; $P -1 -f "$f"
    fi
  done
fi

cat > "$ROOT/.env.test.local" <<ENV
NEXT_PUBLIC_SITE_URL=http://localhost:3100
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SECRET_KEY=$SERVICE_KEY
ADMIN_USERNAME=testadmin
ADMIN_PASSWORD=test-admin-password
ADMIN_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_TOTP_SECRET=JBSWY3DPEHPK3PXP
ADMIN_DIGEST_EMAIL=admin@test.hagerland.invalid
HAGERLAND_INBOX_EMAIL=inbox@test.hagerland.invalid
CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
IP_HASH_SALT=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
EMAIL_TEST_MAILPIT_URL=http://localhost:8025
NEXT_PUBLIC_MAP_TILE_URL=http://localhost:3100/test-map-tiles/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION="Test tiles"
ENV
echo "Local stack ready: API http://localhost:54321, mail http://localhost:8025, DB localhost:54322"
