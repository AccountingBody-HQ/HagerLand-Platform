#!/usr/bin/env bash
# Manual Supabase database backup (the Free plan has no downloadable backups).
# Usage, from the repository root in a Codespace terminal:  bash scripts/backup-supabase.sh
# Non-interactive (cutover): SUPABASE_DB_URL=<full connection string> bash scripts/backup-supabase.sh
# Writes to ./backups/ (git-ignored). Download the files to your computer, then delete them here.
#
# The backup tool (pg_dump) must be the same major version as the database or newer.
# This script checks the database version and installs the matching tool from the
# official PostgreSQL package repository (PGDG) if needed.
set -euo pipefail
umask 077

say() { printf '\n%s\n' "$*"; }

add_pgdg_repo() {
  if [ -f /etc/apt/sources.list.d/pgdg.list ]; then return; fi
  say "Adding the official PostgreSQL package repository (one-time setup)..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl ca-certificates lsb-release >/dev/null
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update -qq
}

install_client() {
  local major="$1"
  add_pgdg_repo
  say "Installing the PostgreSQL ${major} backup tools (this can take a minute)..."
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "postgresql-client-${major}" >/dev/null
  echo "Installed PostgreSQL ${major} backup tools."
}

OUT_DIR="$(pwd)/backups"
STAMP="$(date -u +%Y%m%d-%H%M)"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  # Non-interactive (cutover): the full connection string, password included, comes from the environment.
  DB_URL="$SUPABASE_DB_URL"
  PGPASSWORD="${PGPASSWORD:-}"
  echo "Using SUPABASE_DB_URL from the environment."
else
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
fi
export PGPASSWORD PGSSLMODE="${PGSSLMODE:-require}"

# Step 0: make sure we have tools that can talk to this database.
if ! command -v psql >/dev/null; then
  say "No PostgreSQL tools found on this machine yet."
  install_client 17
fi

say "Checking your database version..."
if ! SERVER_NUM="$(psql "$DB_URL" -Atc 'SHOW server_version_num' 2>"$OUT_DIR/connect-error.txt")"; then
  echo "Could not connect to your database. The message was:"
  cat "$OUT_DIR/connect-error.txt"
  echo "Check the password (Project Settings > Database) and that you copied the Session pooler string."
  exit 1
fi
rm -f "$OUT_DIR/connect-error.txt"
SERVER_MAJOR=$((SERVER_NUM / 10000))
echo "Your database runs PostgreSQL ${SERVER_MAJOR}."

PG_DUMP="/usr/lib/postgresql/${SERVER_MAJOR}/bin/pg_dump"
PG_RESTORE="/usr/lib/postgresql/${SERVER_MAJOR}/bin/pg_restore"
if [ ! -x "$PG_DUMP" ]; then
  CLIENT_MAJOR=0
  if command -v pg_dump >/dev/null; then
    CLIENT_MAJOR="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
  fi
  if [ "$CLIENT_MAJOR" -ge "$SERVER_MAJOR" ]; then
    PG_DUMP="$(command -v pg_dump)"
    PG_RESTORE="$(command -v pg_restore)"
    echo "The installed backup tool (version ${CLIENT_MAJOR}) can back up this database."
  else
    if [ "$CLIENT_MAJOR" -eq 0 ]; then echo "The backup tool is not installed yet."; else echo "The installed backup tool (version ${CLIENT_MAJOR}) is older than your database."; fi
    install_client "$SERVER_MAJOR"
  fi
else
  echo "Matching backup tool (version ${SERVER_MAJOR}) is ready."
fi

PUBLIC_DUMP="$OUT_DIR/hagerland-public-$STAMP.dump"
PUBLIC_SQL="$OUT_DIR/hagerland-public-$STAMP.sql"
PLATFORM_DUMP="$OUT_DIR/hagerland-auth-storage-$STAMP.dump"

say "1/3  Backing up all app tables and data (public schema)..."
"$PG_DUMP" "$DB_URL" --schema=public --format=custom --file="$PUBLIC_DUMP"

echo "2/3  Writing a human-readable copy of the same backup..."
"$PG_RESTORE" --file="$PUBLIC_SQL" "$PUBLIC_DUMP"

echo "3/3  Backing up Supabase auth users and storage records (best effort)..."
if ! "$PG_DUMP" "$DB_URL" --schema=auth --schema=storage --data-only --format=custom --file="$PLATFORM_DUMP" 2>"$OUT_DIR/step3-errors.txt"; then
  echo "     Step 3 could not complete (see backups/step3-errors.txt). The main backup from step 1 is still valid."
  rm -f "$PLATFORM_DUMP"
else
  rm -f "$OUT_DIR/step3-errors.txt"
fi
unset PGPASSWORD
# Backups contain personal data: readable by you only (some folders override umask).
chmod 600 "$OUT_DIR"/*"$STAMP"*

TABLES="$("$PG_RESTORE" --list "$PUBLIC_DUMP" | grep -c ' TABLE DATA public ' || true)"
say "Backup finished."
echo "Tables with data saved: $TABLES"
ls -lh "$OUT_DIR" | grep "$STAMP"
