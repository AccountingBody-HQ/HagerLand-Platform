# Sourced by the cutover scripts (brief 25.6). Picks the database and refuses to touch production by accident.
#   Rehearsal on the local copy:  CUTOVER_DB=local bash scripts/cutover/<step>.sh
#   Production (only after AB has typed GO LIVE):  CUTOVER_DB=live HL_CONFIRM=GO-LIVE bash scripts/cutover/<step>.sh
# The live connection string is read from SUPABASE_DB_URL in .env.local (AB adds it); it is never printed.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

case "${CUTOVER_DB:-}" in
  local)
    DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"
    export PGSSLMODE=disable
    ;;
  live)
    if [ "${HL_CONFIRM:-}" != "GO-LIVE" ]; then echo "Refusing: production needs HL_CONFIRM=GO-LIVE (only after AB typed GO LIVE)." >&2; exit 2; fi
    DB_URL="${SUPABASE_DB_URL:-$(grep -E '^SUPABASE_DB_URL=' "$ROOT/.env.local" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')}"
    if [ -z "$DB_URL" ]; then echo "SUPABASE_DB_URL is not set in .env.local." >&2; exit 2; fi
    case "$DB_URL" in *localhost*|*127.0.0.1*) echo "Refusing: SUPABASE_DB_URL points at this machine, not production." >&2; exit 2;; esac
    export PGSSLMODE=require
    ;;
  *) echo "Set CUTOVER_DB=local (rehearsal) or CUTOVER_DB=live." >&2; exit 2 ;;
esac
export SUPABASE_DB_URL="$DB_URL"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q)
