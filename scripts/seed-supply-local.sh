#!/usr/bin/env bash
# Seeds supply partners, contacts, prices and one materials-list quote into the LOCAL Supabase copy, for trying
# Supply Phase 3 by hand. Refuses any database that is not on this machine. Safe to run again (fixed ids).
set -euo pipefail
HOST="${SEED_DB_HOST:-localhost}"
if [ "$HOST" != "localhost" ] && [ "$HOST" != "127.0.0.1" ]; then
  echo "Refusing: the seed only runs against the local copy (localhost), not $HOST." >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGPASSWORD=postgres psql -h "$HOST" -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -1 -f "$ROOT/scripts/seed-supply-local.sql"
echo "Local supply seed ready: 6 partners, their contacts and prices, and quote HLQ-SEED-BOLE (delivery to Bole)."
