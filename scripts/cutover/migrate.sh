#!/usr/bin/env bash
# Cutover step 3: applies every migration from 0010 on that the database has not recorded yet, ONE AT A TIME, each as a
# single transaction, and runs its check (supabase/checks/NNNN.sql, the README's check query) straight after.
# Stops at the first failure or mismatch: a failed file is rolled back as a whole, nothing is half-applied.
. "$(dirname "$0")/env.sh"

applied() {
  local n="$1"
  if [ "$n" = "0010" ]; then
    # 0010 predates the schema_migrations table: it is applied when the settings view lists its new keys.
    [ "$("${PSQL[@]}" -Atc "select pg_get_viewdef('public.site_settings_public'::regclass) like '%delivery_area%'")" = "t" ]
  else
    [ "$("${PSQL[@]}" -Atc "select to_regclass('public.schema_migrations') is not null")" = "t" ] \
      && [ "$("${PSQL[@]}" -Atc "select exists (select 1 from public.schema_migrations where version = '$n')")" = "t" ]
  fi
}

count=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  n="$(basename "$f" | cut -d_ -f1)"
  [ "$((10#$n))" -ge 10 ] || continue
  if applied "$n"; then echo "  $n already applied"; continue; fi
  check="$ROOT/supabase/checks/$n.sql"
  [ -f "$check" ] || { echo "FAIL  no check file for $n (supabase/checks/$n.sql)"; exit 1; }
  echo "Applying $(basename "$f")..."
  if ! "${PSQL[@]}" -1 -f "$f"; then echo "FAIL  $n did not apply (rolled back as a whole). Stopping."; exit 1; fi
  expected="$(head -1 "$check" | sed 's/^-- expect: //')"
  got="$("${PSQL[@]}" -At -F'|' -f "$check")"
  if [ "$got" != "$expected" ]; then echo "FAIL  $n check: expected '$expected', got '$got'. Stopping."; exit 1; fi
  echo "PASS  $n check: $got"
  count=$((count + 1))
done
echo "Done: $count migration(s) applied and checked."
