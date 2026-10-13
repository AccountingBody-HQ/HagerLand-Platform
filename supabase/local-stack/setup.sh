#!/usr/bin/env bash
# Local Supabase test stack (Postgres + Auth + PostgREST + Storage + Mailpit) for automated tests.
# Never touches the live project. Usage from the repo root:
#   bash supabase/local-stack/setup.sh        # first time: create keys, start, apply migrations
#   bash supabase/local-stack/setup.sh reset  # wipe the local database and start fresh
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

if [ "${1:-}" = "reset" ]; then docker compose down -v; fi
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
  echo "Creating stand-ins for the two legacy tables the app uses..."
  $P -c "create table if not exists public.import_log (google_place_id text not null, section text not null, listing_id text, listing_name text, status text not null default 'imported', error text, imported_at timestamptz not null default now(), primary key (google_place_id, section));
         create table if not exists public.rate_limits (key text primary key, count integer not null default 1, reset_at timestamptz not null);"
  for f in "$ROOT"/supabase/migrations/*.sql; do echo "Applying $(basename "$f")"; $P -f "$f"; done
else
  for f in "$ROOT"/supabase/migrations/*.sql; do
    n=$(basename "$f" | cut -d_ -f1)
    if [ "$n" -ge 10 ] && [ "$($P -Atc "select count(*) from public.site_settings where key = 'migration_$n'")" = "0" ]; then
      echo "Applying $(basename "$f")"; $P -f "$f"; $P -c "insert into public.site_settings (key, value) values ('migration_$n', 'true') on conflict do nothing"
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
ENV
echo "Local stack ready: API http://localhost:54321, mail http://localhost:8025, DB localhost:54322"
