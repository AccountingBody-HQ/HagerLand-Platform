#!/usr/bin/env bash
# Manual Supabase database backup (the Free plan has no downloadable backups).
# Usage, from the repository root in a Codespace terminal:  bash scripts/backup-supabase.sh
# Writes to ./backups/ (git-ignored). Download the files to your computer, then delete them here.
set -euo pipefail
umask 077

if ! command -v pg_dump >/dev/null; then
  echo "pg_dump is not installed. Install it with: sudo apt-get install -y postgresql-client-17"
  exit 1
fi

OUT_DIR="$(pwd)/backups"
STAMP="$(date -u +%Y%m%d-%H%M)"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

echo "Paste the Session pooler connection string exactly as Supabase shows it"
echo "(it contains [YOUR-PASSWORD]; leave that placeholder in), then press Enter:"
read -r DB_URL
if [[ "$DB_URL" != postgres* || "$DB_URL" != *":[YOUR-PASSWORD]@"* ]]; then
  echo "That does not look right. Copy the Session pooler string again, with [YOUR-PASSWORD] still in it."
  exit 1
fi
DB_URL="${DB_URL/:\[YOUR-PASSWORD\]@/@}"

echo "Now type or paste your database password (nothing will appear as you type), then press Enter:"
read -rs PGPASSWORD
echo
export PGPASSWORD PGSSLMODE=require

PUBLIC_DUMP="$OUT_DIR/hagerland-public-$STAMP.dump"
PUBLIC_SQL="$OUT_DIR/hagerland-public-$STAMP.sql"
PLATFORM_DUMP="$OUT_DIR/hagerland-auth-storage-$STAMP.dump"

echo "1/3  Backing up all app tables and data (public schema)..."
pg_dump "$DB_URL" --schema=public --format=custom --file="$PUBLIC_DUMP"

echo "2/3  Writing a human-readable copy of the same backup..."
pg_restore --file="$PUBLIC_SQL" "$PUBLIC_DUMP"

echo "3/3  Backing up Supabase auth users and storage records (best effort)..."
if ! pg_dump "$DB_URL" --schema=auth --schema=storage --data-only --format=custom --file="$PLATFORM_DUMP" 2>"$OUT_DIR/step3-errors.txt"; then
  echo "     Step 3 could not complete (see backups/step3-errors.txt). The main backup from step 1 is still valid."
  rm -f "$PLATFORM_DUMP"
else
  rm -f "$OUT_DIR/step3-errors.txt"
fi
unset PGPASSWORD

TABLES="$(pg_restore --list "$PUBLIC_DUMP" | grep -c ' TABLE DATA public ' || true)"
echo
echo "Backup finished."
echo "Tables with data saved: $TABLES"
ls -lh "$OUT_DIR" | grep "$STAMP"
