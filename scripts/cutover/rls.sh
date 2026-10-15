#!/usr/bin/env bash
# Cutover step 4: runs the security test (supabase/tests/rls_test.sql) against the database. It creates its own test
# users and records and deletes them again. Every check must be PASS, and all of them must have run.
. "$(dirname "$0")/env.sh"
EXPECTED=190
out="$("${PSQL[@]}" -At -f "$ROOT/supabase/tests/rls_test.sql")"
pass="$(grep -c '^PASS' <<<"$out" || true)"
fail="$(grep -c '^FAIL' <<<"$out" || true)"
grep '^FAIL' <<<"$out" || true
echo "Security test: $pass PASS, $fail FAIL (expected $EXPECTED PASS)."
[ "$fail" = "0" ] && [ "$pass" = "$EXPECTED" ]
