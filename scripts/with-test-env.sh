#!/usr/bin/env bash
# Runs a command with the LOCAL test Supabase settings from .env.test.local.
# Shell variables override .env.local, so tests and test builds can never use the live project.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env.test.local ]; then echo "Run: bash supabase/local-stack/setup.sh"; exit 1; fi
set -a; . ./.env.test.local; set +a
case "$NEXT_PUBLIC_SUPABASE_URL" in
  http://localhost:*|http://127.0.0.1:*) ;;
  *) echo "Refusing to run: .env.test.local does not point at the local stack."; exit 1 ;;
esac
export HL_TEST_ENV=1 NEXT_DIST_DIR=.next-test
exec "$@"
