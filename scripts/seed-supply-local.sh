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

# Small sample delivery proofs (a PNG photo and a PDF note) in the local private bucket, for the seeded completed orders.
KEY="$(grep -E '^SUPABASE_SECRET_KEY=' "$ROOT/.env.test.local" | cut -d= -f2-)"
PNG="$(mktemp)"; PDF="$(mktemp)"
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' | base64 -d > "$PNG"
printf '%%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF\n' > "$PDF"
for order in 5eed0d00-0000-4000-8000-000000000008 5eed0d00-0000-4000-8000-000000000016; do
  curl -s -o /dev/null -X POST "http://$HOST:54321/storage/v1/object/supply-private/proofs/$order/5eedf000-0000-4000-8000-000000000001.png" \
    -H "Authorization: Bearer $KEY" -H "apikey: $KEY" -H "Content-Type: image/png" -H "x-upsert: true" --data-binary "@$PNG"
  curl -s -o /dev/null -X POST "http://$HOST:54321/storage/v1/object/supply-private/proofs/$order/5eedf000-0000-4000-8000-000000000002.pdf" \
    -H "Authorization: Bearer $KEY" -H "apikey: $KEY" -H "Content-Type: application/pdf" -H "x-upsert: true" --data-binary "@$PDF"
done
rm -f "$PNG" "$PDF"
echo "Local supply seed ready: 6 partners with contacts, prices and agreements; quote HLQ-SEED-BOLE (delivery to Bole); quote HLQ-SEED-ORDERS with 18 orders in every status."
