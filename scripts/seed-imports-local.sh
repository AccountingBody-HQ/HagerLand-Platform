#!/usr/bin/env bash
# Seeds businesses imported from Google in every compliance state into the LOCAL Supabase copy (Imports compliance).
# Refuses any database that is not on this machine. Safe to run again: resets only its own fixed rows.
set -euo pipefail
HOST="${SEED_DB_HOST:-localhost}"
if [ "$HOST" != "localhost" ] && [ "$HOST" != "127.0.0.1" ]; then
  echo "Refusing: the seed only runs against the local copy (localhost), not $HOST." >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGPASSWORD=postgres psql -h "$HOST" -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -1 -f "$ROOT/scripts/seed-imports-local.sql"
echo "Local imports seed ready: 10 businesses (fresh, near expiry, expired private, expired public, partly and fully confirmed, a supply partner, a claimed one, a new lead) and one never imported."
