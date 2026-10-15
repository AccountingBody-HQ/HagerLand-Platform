#!/usr/bin/env bash
# Cutover step 7: closes the legacy tables to the public key (spec 20.3) and proves it. "reverse" undoes it (rollback).
#   bash scripts/cutover/lockdown.sh          apply, then run the check (every row must be PASS)
#   bash scripts/cutover/lockdown.sh reverse  put the old read policies and permissions back
. "$(dirname "$0")/env.sh"
L="$ROOT/supabase/legacy"
if [ "${1:-}" = "reverse" ]; then
  "${PSQL[@]}" -1 -f "$L/cutover_legacy_lockdown_REVERSE.sql"
  echo "Legacy lockdown reversed."
  exit 0
fi
"${PSQL[@]}" -1 -f "$L/cutover_legacy_lockdown.sql"
out="$("${PSQL[@]}" -At -f "$L/cutover_legacy_lockdown_check.sql")"
echo "$out"
! grep -q '^FAIL' <<<"$out"
