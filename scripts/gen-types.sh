#!/usr/bin/env bash
# Regenerates lib/database.types.ts from the LOCAL Supabase stack (after applying migrations there).
# Never reads the live project. Usage from the repo root: bash scripts/gen-types.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=lib/database.types.ts
TMP=$(mktemp)
npx --yes supabase@2.120.0 gen types typescript --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" --schema public > "$TMP"
{
  echo '// Generated from supabase/migrations by `supabase gen types typescript`. Do not edit by hand.'
  echo
  npx --yes prettier@3.9.10 --no-semi --single-quote --print-width 140 --stdin-filepath types.ts < "$TMP"
} > "$OUT"
rm -f "$TMP"
echo "Wrote $OUT"
