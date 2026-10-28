#!/usr/bin/env bash
# HagerLand backup: database AND stored files, in ONE encrypted file (Fix F-6). Read-only against the project.
#
# Usage, from the repository root in a Codespace terminal:   bash scripts/backup-supabase.sh
# Restore (or test-restore into the local copy):            bash scripts/restore-supabase.sh backups/<file>.tar.gz.enc
# Step by step for AB: docs/RUNBOOK.md section 1.
#
# It works against any Supabase project (the live one, a new one, or the local copy for a rehearsal). Secrets are typed
# at hidden prompts, kept only in this script's memory, never printed, never written to disk, and forgotten at the end.
set -euo pipefail
umask 077

SCRIPT_VERSION="2026-10-28.f6"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/backups"
STAMP="$(date -u +%Y%m%d-%H%M)"
NAME="hagerland-backup-$STAMP"
WORK="$OUT_DIR/.work-$NAME"
ENC="$OUT_DIR/$NAME.tar.gz.enc"
DONE=0
DB_URL=""
API_URL=""
SERVICE_KEY=""
PASSPHRASE=""

say() { printf '\n%s\n' "$*"; }
fail() { printf '\nThe backup STOPPED: %s\n' "$*" >&2; exit 1; }

# Whatever happens (an error, Ctrl+C, a closed terminal), nothing unencrypted is left behind.
cleanup() {
  local code=$?
  unset PGPASSWORD SERVICE_KEY PASSPHRASE
  if [ "$DONE" != 1 ]; then
    if [ -n "$ENC" ]; then rm -rf "$WORK" "$ENC.partial" "$ENC" "$ENC.sha256"; fi
    if [ "$code" != 0 ]; then
      printf '\nNothing was saved: the unfinished backup was deleted, so no unencrypted personal data is left on this machine.\n' >&2
      printf 'Your project was only read, never changed. Fix the problem above and run the backup again.\n' >&2
    fi
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

cat <<'BANNER'
==============================================================================
 HagerLand backup (database + stored files), encrypted
------------------------------------------------------------------------------
 What it does : copies every table, the sign-in accounts, and every stored file
                (photos, CVs, documents) into ONE encrypted file. It only READS
                your project: nothing there is changed or deleted.
 You need     : 1. the Session pooler connection string (Supabase > Connect)
                2. your database password (from your password manager)
                3. the service_role key (Supabase > Project Settings > API Keys)
                4. a backup passphrase (from your password manager; typed twice)
                Passwords and keys are typed at hidden prompts: nothing appears
                as you type, and nothing is saved.
 Time         : a few minutes today; longer as the site grows.
 Result       : backups/hagerland-backup-<date>.tar.gz.enc  (+ .sha256)
                Download it to your computer, then delete it here.
==============================================================================
BANNER

for tool in curl jq openssl tar sha256sum; do
  command -v "$tool" >/dev/null || fail "the tool \"$tool\" is missing on this machine."
done

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
# Never overwrite (or, on a failure, delete) an earlier backup with the same name.
if [ -e "$ENC" ] || [ -e "$WORK" ]; then
  ENC="" WORK=""
  fail "a backup with this name was made less than a minute ago. Wait a minute and run it again."
fi

# ---------------------------------------------------------------- 1. Connection details (secrets at hidden prompts)
echo
echo "1) Paste the Session pooler connection string exactly as Supabase shows it"
echo "   (it contains [YOUR-PASSWORD]; leave that placeholder in), then press Enter:"
read -r DB_URL
if [[ "$DB_URL" != postgres* || "$DB_URL" != *":[YOUR-PASSWORD]@"* ]]; then
  fail "that does not look like the Session pooler string. Copy it again, with [YOUR-PASSWORD] still in it."
fi
DB_URL="${DB_URL/:\[YOUR-PASSWORD\]@/@}"
echo "2) Type or paste your database password (nothing appears as you type), then press Enter:"
read -rs PGPASSWORD
echo
[ -n "$PGPASSWORD" ] || fail "no database password was typed."
export PGPASSWORD

HOST="$(sed -E 's#^[a-z]+://[^@]*@([^:/?]+).*#\1#' <<<"$DB_URL")"
REF="$(sed -nE 's#^[a-z]+://postgres\.([a-z0-9]+)@.*#\1#p' <<<"$DB_URL")"
case "$HOST" in localhost|127.0.0.1) export PGSSLMODE="${PGSSLMODE:-disable}" ;; *) export PGSSLMODE="${PGSSLMODE:-require}" ;; esac
if [ -n "$REF" ]; then
  API_URL="https://$REF.supabase.co"
  echo "   Project address: $API_URL"
else
  echo "3) Type the project address (for the local copy: http://localhost:54321), then press Enter:"
  read -r API_URL
fi
[[ "$API_URL" =~ ^https?://[A-Za-z0-9.:-]+$ ]] || fail "the project address should look like https://<ref>.supabase.co"
echo "4) Paste the service_role key (nothing appears as you type), then press Enter:"
read -rs SERVICE_KEY
echo
[ -n "$SERVICE_KEY" ] || fail "no service_role key was typed."
echo "5) Type a passphrase for this backup (at least 12 characters; keep it in your password manager):"
read -rs PASSPHRASE
echo
echo "   Type the same passphrase again:"
read -rs PASSPHRASE2
echo
[ "$PASSPHRASE" = "$PASSPHRASE2" ] || { unset PASSPHRASE2; fail "the two passphrases are different."; }
unset PASSPHRASE2
[ "${#PASSPHRASE}" -ge 12 ] || fail "the passphrase is shorter than 12 characters."

# The key goes to curl through a pipe, never on the command line (where other programs could see it) or on disk.
api() { curl -sS --fail --retry 2 --retry-delay 2 -H @<(printf 'apikey: %s\nAuthorization: Bearer %s\n' "$SERVICE_KEY" "$SERVICE_KEY") "$@"; }
# Read-only SQL: every statement runs inside a READ ONLY transaction.
q() { psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 -c "begin transaction read only" -c "$1" -c "commit"; }

STARTED_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STARTED_LONDON="$(TZ=Europe/London date +%Y-%m-%dT%H:%M:%S%z)"

# ---------------------------------------------------------------- 2. Backup tools that match the database version
install_client() {
  local major="$1"
  say "Installing the PostgreSQL ${major} backup tools (one-time; this can take a minute)..."
  if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl ca-certificates lsb-release >/dev/null
    sudo install -d /usr/share/postgresql-common/pgdg
    sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
    sudo apt-get update -qq
  fi
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "postgresql-client-${major}" >/dev/null
}
command -v psql >/dev/null || install_client 17
say "Checking the connection (read-only)..."
SERVER_NUM="$(q 'show server_version_num' 2>&1)" || fail "could not connect to the database. Check the password and that you copied the Session pooler string."
SERVER_MAJOR=$((SERVER_NUM / 10000))
PG_BIN="/usr/lib/postgresql/${SERVER_MAJOR}/bin"
[ -x "$PG_BIN/pg_dump" ] || install_client "$SERVER_MAJOR"
[ -x "$PG_BIN/pg_dump" ] || fail "the PostgreSQL ${SERVER_MAJOR} backup tool could not be installed."
echo "Database: PostgreSQL ${SERVER_MAJOR}, backup tool ready."
api -o /dev/null "$API_URL/storage/v1/bucket" || fail "the project address or the service_role key was not accepted by Storage."

mkdir -p "$WORK/db" "$WORK/storage"

# ---------------------------------------------------------------- 3. Database (read-only dumps)
say "1/5  Backing up every table of the site (public schema: structure, data, security rules)..."
"$PG_BIN/pg_dump" "$DB_URL" --schema=public --format=custom --file="$WORK/db/public.dump"
echo "2/5  Backing up the sign-in accounts (auth data) and the stored-file records..."
"$PG_BIN/pg_dump" "$DB_URL" --schema=auth --data-only --exclude-table=auth.schema_migrations --format=custom --file="$WORK/db/auth.dump"
# For reference only (the restore re-uploads the files through Storage, which recreates these records).
"$PG_BIN/pg_dump" "$DB_URL" --data-only --table=storage.buckets --table=storage.objects --format=custom --file="$WORK/db/storage-records.dump" 2>/dev/null ||
  { rm -f "$WORK/db/storage-records.dump"; echo "     (The stored-file records could not be copied; the files themselves are still backed up below.)"; }
# What the app needs outside the public schema: its extensions and its own triggers on auth tables.
q "select coalesce(json_agg(json_build_object('name', extname, 'schema', extnamespace::regnamespace::text) order by extname), '[]') from pg_extension where extname <> 'plpgsql'" >"$WORK/db/extensions.json"
q "set local search_path = pg_catalog; select coalesce(string_agg(format('drop trigger if exists %I on %s;', t.tgname, t.tgrelid::regclass) || E'\n' || pg_get_triggerdef(t.oid) || ';', E'\n' order by t.tgname), '') from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relnamespace = 'auth'::regnamespace and t.tgfoid::regproc::text not like 'auth.%'" >"$WORK/db/auth-triggers.sql"

# Row counts come from the dump itself, so they describe exactly what was saved.
count_rows() { "$PG_BIN/pg_restore" --data-only --file=- "$1" | awk '/^COPY [^ ]+ /{t=$2; n=0; inside=1; next} inside && /^\\\.$/{print t "\t" n; inside=0; next} inside{n++}'; }
count_rows "$WORK/db/public.dump" >"$WORK/db/public-rows.tsv"
count_rows "$WORK/db/auth.dump" >"$WORK/db/auth-rows.tsv"

# ---------------------------------------------------------------- 4. Stored files (every bucket, every object)
say "3/5  Listing the stored files (read-only)..."
q "select coalesce(json_agg(json_build_object('id', id, 'name', name, 'public', public, 'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types) order by id), '[]') from storage.buckets" >"$WORK/storage/buckets.json"
q "select coalesce(json_agg(json_build_object('bucket', bucket_id, 'name', name, 'size', coalesce((metadata->>'size')::bigint, 0), 'mimetype', coalesce(metadata->>'mimetype', 'application/octet-stream')) order by bucket_id, name), '[]') from storage.objects" >"$WORK/storage/objects.json"
TOTAL="$(jq length "$WORK/storage/objects.json")"
echo "4/5  Downloading $TOTAL stored files..."
jq -r '.[] | [.bucket, .name, (.name | split("/") | map(@uri) | join("/")), (.size | tostring)] | @tsv' "$WORK/storage/objects.json" >"$WORK/storage/.list"
: >"$WORK/storage/objects.sha256"
i=0
while IFS=$'\t' read -r bucket name encoded size; do
  case "$name" in /*|*../*|*/..|..) fail "an unexpected file name was found ($bucket/$name)." ;; esac
  dest="$WORK/storage/files/$bucket/$name"
  mkdir -p "$(dirname "$dest")"
  api -o "$dest" "$API_URL/storage/v1/object/$bucket/$encoded" || fail "could not download $bucket/$name."
  [ "$(stat -c %s "$dest")" = "$size" ] || fail "the downloaded size of $bucket/$name does not match."
  (cd "$WORK/storage/files" && sha256sum "$bucket/$name") >>"$WORK/storage/objects.sha256"
  i=$((i + 1))
  if [ $((i % 50)) = 0 ]; then echo "     $i of $TOTAL"; fi
done <"$WORK/storage/.list"
rm -f "$WORK/storage/.list"
unset SERVICE_KEY

# ---------------------------------------------------------------- 5. Manifest, checksums, one encrypted file
FINISHED_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINISHED_LONDON="$(TZ=Europe/London date +%Y-%m-%dT%H:%M:%S%z)"
jq -n \
  --arg version "$SCRIPT_VERSION" --arg host "$HOST" --arg ref "$REF" --arg pg "$SERVER_NUM" \
  --arg su "$STARTED_UTC" --arg sl "$STARTED_LONDON" --arg fu "$FINISHED_UTC" --arg fl "$FINISHED_LONDON" \
  --rawfile public "$WORK/db/public-rows.tsv" --rawfile auth "$WORK/db/auth-rows.tsv" \
  --slurpfile objects "$WORK/storage/objects.json" --slurpfile buckets "$WORK/storage/buckets.json" --slurpfile ext "$WORK/db/extensions.json" '
  def rows($t): $t | split("\n") | map(select(length > 0) | split("\t") | {(.[0]): (.[1] | tonumber)}) | add // {};
  {
    script_version: $version,
    source: { host: $host, project_ref: $ref, postgres_version_num: $pg },
    started: { utc: $su, london: $sl },
    finished: { utc: $fu, london: $fl },
    tables: rows($public),
    auth_tables: rows($auth),
    buckets: ($buckets[0] | map(. as $b | {key: $b.id, value: {objects: ([$objects[0][] | select(.bucket == $b.id)] | length), bytes: ([$objects[0][] | select(.bucket == $b.id) | .size] | add // 0)}}) | from_entries),
    extensions: $ext[0]
  }' >"$WORK/manifest.json"
(cd "$WORK" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum >SHA256SUMS)

say "5/5  Encrypting everything into one file (AES-256, passphrase-protected)..."
# The passphrase reaches openssl through a pipe (fd 3), never the command line or the disk.
tar -czf - -C "$WORK" . | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass fd:3 -out "$ENC.partial" 3< <(printf '%s' "$PASSPHRASE")
# Prove the file opens with this passphrase and is complete before deleting the unencrypted copy.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass fd:3 -in "$ENC.partial" 3< <(printf '%s' "$PASSPHRASE") | tar -xzOf - ./SHA256SUMS | cmp -s - "$WORK/SHA256SUMS" ||
  fail "the encrypted file could not be read back."
unset PASSPHRASE
mv "$ENC.partial" "$ENC"
(cd "$OUT_DIR" && sha256sum "$(basename "$ENC")" >"$(basename "$ENC").sha256")
chmod 600 "$ENC" "$ENC.sha256"
SUMMARY="$(jq -r '"Tables: \(.tables | length) (\([.tables[]] | add // 0) rows). Sign-in accounts: \(.auth_tables["auth.users"] // 0). Files: \([.buckets[].objects] | add // 0) (\([.buckets[].bytes] | add // 0) bytes) in \(.buckets | length) buckets."' "$WORK/manifest.json")"
rm -rf "$WORK"
DONE=1

say "Backup finished: $FINISHED_UTC"
echo "$SUMMARY"
echo "File: backups/$(basename "$ENC")  ($(du -h "$ENC" | cut -f1))"
echo "Next: in the file list on the left, open backups, right-click the .enc file > Download (and the .sha256 file),"
echo "keep both on your computer, then delete them here:  rm backups/hagerland-backup-*"
