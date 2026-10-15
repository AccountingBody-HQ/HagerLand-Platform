#!/usr/bin/env bash
# Regenerates lib/database.types.ts from the LOCAL Supabase stack (after applying migrations there).
# Never reads the live project. Usage from the repo root: bash scripts/gen-types.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=lib/database.types.ts
TMP=$(mktemp)
npx --yes supabase@2.120.0 gen types typescript --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --schema public > "$TMP"
# The local copy also holds a replica of the old site's tables (supabase/local-stack/legacy.sql). The app uses only
# import_log and rate_limits of those; the others are left out so nobody queries them by mistake (e.g. legacy "jobs").
LEGACY='admin_audit|agent_log|business_claims|cars|claimed_profiles|claiming_requests|community|companies|countries|delivery|directors|events|formation_agent_addresses|housing|jobs|listing_enquiries|made_in_ethiopia|money|sole_traders|tutors'
{
  echo '// Generated from supabase/migrations by `supabase gen types typescript`. Do not edit by hand.'
  echo
  npx --yes prettier@3.9.10 --no-semi --single-quote --print-width 140 --stdin-filepath types.ts < "$TMP" \
    | awk -v re="^      (${LEGACY}): [{]$" '$0 ~ re { skip = 1 } !skip { print } skip && /^      }$/ { skip = 0 }'
} > "$OUT"
rm -f "$TMP"
echo "Wrote $OUT"
