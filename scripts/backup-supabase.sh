#!/usr/bin/env bash
# HagerLand backup: database AND stored files, in ONE encrypted file (Fix F-6). Read-only against the project.
#
# Usage, from the repository root in a Codespace terminal:   bash scripts/backup-supabase.sh
# Check a backup file opens and is complete:                bash scripts/backup-supabase.sh --check backups/<file>.tar.gz.enc
# Restore (or test-restore into the local copy):            bash scripts/restore-supabase.sh backups/<file>.tar.gz.enc
# Step by step for AB: docs/RUNBOOK.md section 1.
#
# It works against any Supabase project (the live one, a new one, or the local copy for a rehearsal). Secrets are typed
# at hidden prompts, kept only in this script's memory, never printed, never written to disk, and forgotten at the end.
#
# Automatic mode (BK-1, the "Weekly backup" GitHub Actions workflow): when HL_BACKUP_DB_URL (the Session pooler string
# with the password in it), HL_BACKUP_SERVICE_ROLE_KEY and HL_BACKUP_PASSPHRASE are all set, it runs without prompts
# and its output names no table, file or count. On GitHub without them it stops with the "not set up" message.
set -euo pipefail
umask 077

SCRIPT_VERSION="2026-10-30.bk1"
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
CHECK_DIR=""
AUTO=0
CHECK_FILE=""
if [ "${1:-}" = "--check" ]; then CHECK_FILE="${2:-}"; fi
NOT_SET_UP="Backup not set up: add the secrets HL_BACKUP_DB_URL, HL_BACKUP_SERVICE_ROLE_KEY and HL_BACKUP_PASSPHRASE in GitHub (Settings → Secrets and variables → Actions)."

say() { printf '\n%s\n' "$*"; }
fail() { printf '\nThe backup STOPPED: %s\n' "$*" >&2; exit 1; }

# Whatever happens (an error, Ctrl+C, a closed terminal), nothing unencrypted is left behind.
cleanup() {
  local code=$?
  unset PGPASSWORD SERVICE_KEY PASSPHRASE HL_BACKUP_DB_URL HL_BACKUP_SERVICE_ROLE_KEY HL_BACKUP_PASSPHRASE
  wipe_check_dir
  if [ "$DONE" != 1 ]; then
    if [ -n "$ENC" ]; then rm -rf "$WORK" "$ENC.partial" "$ENC" "$ENC.sha256"; fi
    if [ "$code" != 0 ]; then
      printf '\nNothing was saved: the unfinished backup was deleted, so no unencrypted personal data is left on this machine.\n' >&2
      printf 'Your project was only read, never changed. Fix the problem above and run the backup again.\n' >&2
    fi
  fi
}
# The self-check's decrypted copy: overwritten, then deleted (also when anything fails).
wipe_check_dir() {
  if [ -n "$CHECK_DIR" ] && [ -d "$CHECK_DIR" ]; then
    find "$CHECK_DIR" -type f -exec shred -u {} + 2>/dev/null || true
    rm -rf "$CHECK_DIR"
  fi
  CHECK_DIR=""
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

# The newest backup tools installed here (for --check: reading a dump needs the same or a newer version).
newest_tools() {
  local d best=""
  for d in /usr/lib/postgresql/*/bin; do
    [ -x "$d/pg_restore" ] || continue
    best="$d"
  done
  [ -n "$best" ] || best="$(dirname "$(command -v pg_restore 2>/dev/null || echo /missing/pg_restore)")"
  [ -x "$best/pg_restore" ] && PG_BIN="$best"
}

# Self-check (BK-1): a backup that cannot be opened is worthless. Checks the file's fingerprint (.sha256), decrypts it
# into a private temporary folder, checks every expected part is there and every checksum inside matches, then wipes
# the decrypted copy. Any failure stops with a plain message.
self_check() {
  local file="$1" part listed present objects
  (cd "$(dirname "$file")" && sha256sum --quiet -c "$(basename "$file").sha256") >/dev/null 2>&1 ||
    fail "self-check: the file's fingerprint (.sha256) does not match the file."
  CHECK_DIR="$(mktemp -d "$(dirname "$file")/.check-XXXXXX")"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$file" -pass fd:3 3< <(printf '%s' "$PASSPHRASE") 2>/dev/null | tar -xzf - -C "$CHECK_DIR" 2>/dev/null ||
    fail "self-check: the file could not be opened with this passphrase, or it is damaged."
  for part in manifest.json SHA256SUMS db/public.dump db/auth.dump db/extensions.json db/auth-triggers.sql storage/buckets.json storage/objects.json storage/objects.sha256; do
    [ -f "$CHECK_DIR/$part" ] || fail "self-check: the backup has no $part."
  done
  (cd "$CHECK_DIR" && sha256sum --quiet -c SHA256SUMS) >/dev/null 2>&1 || fail "self-check: a checksum inside the backup does not match."
  listed="$(wc -l <"$CHECK_DIR/SHA256SUMS")"
  present="$(cd "$CHECK_DIR" && find . -type f ! -name SHA256SUMS | wc -l)"
  [ "$listed" = "$present" ] || fail "self-check: the backup holds files its checksum list does not name."
  objects="$(jq length "$CHECK_DIR/storage/objects.json")"
  if [ "$objects" != "$(wc -l <"$CHECK_DIR/storage/objects.sha256")" ] || [ "$objects" != "$(jq '[.buckets[].objects] | add // 0' "$CHECK_DIR/manifest.json")" ]; then
    fail "self-check: the number of stored files does not match the manifest."
  fi
  if [ -s "$CHECK_DIR/storage/objects.sha256" ]; then
    (cd "$CHECK_DIR/storage/files" && sha256sum --quiet -c ../objects.sha256) >/dev/null 2>&1 || fail "self-check: a stored file inside the backup is damaged."
  fi
  jq -e '(.tables | length) > 0 and (.auth_tables | type) == "object"' "$CHECK_DIR/manifest.json" >/dev/null || fail "self-check: the manifest lists no tables."
  "$PG_BIN/pg_restore" --list "$CHECK_DIR/db/public.dump" >/dev/null 2>&1 || fail "self-check: the database part cannot be read."
  "$PG_BIN/pg_restore" --list "$CHECK_DIR/db/auth.dump" 2>/dev/null | grep -q 'TABLE DATA auth users ' || fail "self-check: the sign-in accounts are missing."
  wipe_check_dir
}
SELF_CHECK_OK="Self-check passed: the file opens with the passphrase, and the database (with the sign-in accounts), the stored files, the manifest and every checksum are complete."

# ---------------------------------------------------------------- --check: open an existing backup file and check it
if [ -n "${1:-}" ]; then
  DONE=1
  if [ "$1" != "--check" ] || [ -z "$CHECK_FILE" ] || [ ! -f "$CHECK_FILE" ] || [ ! -f "$CHECK_FILE.sha256" ]; then
    fail "to check a backup, give the file (its .sha256 next to it), e.g.: bash scripts/backup-supabase.sh --check backups/hagerland-backup-20261102-0217.tar.gz.enc"
  fi
  for tool in jq openssl tar sha256sum; do command -v "$tool" >/dev/null || fail "the tool \"$tool\" is missing on this machine."; done
  newest_tools || fail "the PostgreSQL backup tools (pg_restore) are missing on this machine."
  if [ -n "${HL_BACKUP_PASSPHRASE:-}" ]; then PASSPHRASE="$HL_BACKUP_PASSPHRASE"; unset HL_BACKUP_PASSPHRASE; else
    echo "Type the backup passphrase (nothing appears as you type), then press Enter:"
    read -rs PASSPHRASE
    echo
  fi
  self_check "$CHECK_FILE"
  unset PASSPHRASE
  echo "$SELF_CHECK_OK"
  exit 0
fi

if [ -n "${HL_BACKUP_DB_URL:-}" ] && [ -n "${HL_BACKUP_SERVICE_ROLE_KEY:-}" ] && [ -n "${HL_BACKUP_PASSPHRASE:-}" ]; then
  AUTO=1
elif [ "${GITHUB_ACTIONS:-}" = true ] || [ "${CI:-}" = true ]; then
  DONE=1
  fail "$NOT_SET_UP"
fi

if [ "$AUTO" = 1 ]; then
  echo "HagerLand backup (database + stored files), encrypted. Automatic mode: read-only against the project."
else
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
fi

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

# The password inside a connection string may be %-encoded (e.g. %40 for @): psql reads it decoded.
url_decode() {
  if [[ "$1" == *%* ]]; then printf '%s' "$1" | python3 -c 'import sys, urllib.parse; sys.stdout.write(urllib.parse.unquote(sys.stdin.read()))'; else printf '%s' "$1"; fi
}

# ---------------------------------------------------------------- 1. Connection details (secrets at hidden prompts)
if [ "$AUTO" = 1 ]; then
  # Automatic mode: the three values come from the environment, are copied into this script's memory and removed from
  # the environment, so no tool it runs can see them. They are never printed.
  DB_URL="$HL_BACKUP_DB_URL"
  SERVICE_KEY="$HL_BACKUP_SERVICE_ROLE_KEY"
  PASSPHRASE="$HL_BACKUP_PASSPHRASE"
  unset HL_BACKUP_DB_URL HL_BACKUP_SERVICE_ROLE_KEY HL_BACKUP_PASSPHRASE
  [[ "$DB_URL" == postgres* ]] || fail "HL_BACKUP_DB_URL does not look like a connection string (it should start with postgresql://)."
  [[ "$DB_URL" != *"[YOUR-PASSWORD]"* ]] || fail "HL_BACKUP_DB_URL still contains [YOUR-PASSWORD]: put the database password in its place."
  # scheme://user:password@host:port/db  (the last @ ends the password, so a password may contain @)
  if [[ "$DB_URL" =~ ^([a-z]+://)([^:@/]+):(.+)@([^@/]+(/[^@]*)?)$ ]]; then
    PGPASSWORD="$(url_decode "${BASH_REMATCH[3]}")"
    DB_URL="${BASH_REMATCH[1]}${BASH_REMATCH[2]}@${BASH_REMATCH[4]}"
  else
    fail "HL_BACKUP_DB_URL has no password in it (it should look like postgresql://postgres.<ref>:<password>@<host>:5432/postgres)."
  fi
  [ -n "$PGPASSWORD" ] || fail "HL_BACKUP_DB_URL has an empty password."
  export PGPASSWORD
  # On GitHub, also hide the password on its own (GitHub already hides each whole secret).
  if [ "${GITHUB_ACTIONS:-}" = true ]; then echo "::add-mask::$PGPASSWORD"; fi
  [ "${#PASSPHRASE}" -ge 12 ] || fail "HL_BACKUP_PASSPHRASE is shorter than 12 characters."
  HOST="$(sed -E 's#^[a-z]+://[^@]*@([^:/?]+).*#\1#' <<<"$DB_URL")"
  REF="$(sed -nE 's#^[a-z]+://postgres\.([a-z0-9]+)@.*#\1#p' <<<"$DB_URL")"
  case "$HOST" in localhost|127.0.0.1) export PGSSLMODE="${PGSSLMODE:-disable}" ;; *) export PGSSLMODE="${PGSSLMODE:-require}" ;; esac
  if [ -n "$REF" ]; then
    API_URL="https://$REF.supabase.co"
  elif [ "$HOST" = localhost ] || [ "$HOST" = 127.0.0.1 ]; then
    # The local copy (rehearsals only): its address is fixed by supabase/local-stack.
    API_URL="http://localhost:54321"
  else
    fail "the project address could not be found in HL_BACKUP_DB_URL: use the Session pooler string from Supabase → Connect."
  fi
else
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
fi

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
# The backup tools must be the database's version or newer: the closest installed one, otherwise install the matching one.
PG_BIN=""
matching_tools() {
  local d m best=""
  for d in /usr/lib/postgresql/*/bin; do
    m="$(basename "$(dirname "$d")")"
    if ! [[ "$m" =~ ^[0-9]+$ ]] || [ ! -x "$d/pg_dump" ] || [ ! -x "$d/pg_restore" ] || [ "$m" -lt "$SERVER_MAJOR" ]; then continue; fi
    if [ -z "$best" ] || [ "$m" -lt "$best" ]; then best="$m"; fi
  done
  [ -n "$best" ] && PG_BIN="/usr/lib/postgresql/$best/bin"
}
matching_tools || install_client "$SERVER_MAJOR"
[ -n "$PG_BIN" ] || matching_tools || fail "the PostgreSQL ${SERVER_MAJOR} backup tool could not be installed."
echo "Database: PostgreSQL ${SERVER_MAJOR}, backup tool $("$PG_BIN/pg_dump" --version | awk '{print $3}') ready."
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
if [ "$AUTO" = 1 ]; then echo "4/5  Downloading the stored files..."; else echo "4/5  Downloading $TOTAL stored files..."; fi
# In automatic mode messages never name a file (the run's log may be public).
label() { if [ "$AUTO" = 1 ]; then echo "a stored file"; else echo "$1/$2"; fi; }
jq -r '.[] | [.bucket, .name, (.name | split("/") | map(@uri) | join("/")), (.size | tostring)] | @tsv' "$WORK/storage/objects.json" >"$WORK/storage/.list"
: >"$WORK/storage/objects.sha256"
i=0
while IFS=$'\t' read -r bucket name encoded size; do
  case "$name" in /*|*../*|*/..|..) fail "an unexpected file name was found ($(label "$bucket" "$name"))." ;; esac
  dest="$WORK/storage/files/$bucket/$name"
  mkdir -p "$(dirname "$dest")"
  api -o "$dest" "$API_URL/storage/v1/object/$bucket/$encoded" || fail "could not download $(label "$bucket" "$name")."
  [ "$(stat -c %s "$dest")" = "$size" ] || fail "the downloaded size of $(label "$bucket" "$name") does not match."
  (cd "$WORK/storage/files" && sha256sum "$bucket/$name") >>"$WORK/storage/objects.sha256"
  i=$((i + 1))
  if [ "$AUTO" != 1 ] && [ $((i % 50)) = 0 ]; then echo "     $i of $TOTAL"; fi
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
# shellcheck disable=SC2094 # SHA256SUMS is written, never read: find leaves it out.
(cd "$WORK" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum >SHA256SUMS)

say "5/5  Encrypting everything into one file (AES-256, passphrase-protected)..."
# The passphrase reaches openssl through a pipe (fd 3), never the command line or the disk.
tar -czf - -C "$WORK" . | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass fd:3 -out "$ENC.partial" 3< <(printf '%s' "$PASSPHRASE")
# Prove the file opens with this passphrase and is complete before deleting the unencrypted copy.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass fd:3 -in "$ENC.partial" 3< <(printf '%s' "$PASSPHRASE") | tar -xzOf - ./SHA256SUMS | cmp -s - "$WORK/SHA256SUMS" ||
  fail "the encrypted file could not be read back."
mv "$ENC.partial" "$ENC"
(cd "$OUT_DIR" && sha256sum "$(basename "$ENC")" >"$(basename "$ENC").sha256")
chmod 600 "$ENC" "$ENC.sha256"
say "Self-check: opening the finished file again and checking every part..."
self_check "$ENC"
unset PASSPHRASE
echo "$SELF_CHECK_OK"
SUMMARY="$(jq -r '"Tables: \(.tables | length) (\([.tables[]] | add // 0) rows). Sign-in accounts: \(.auth_tables["auth.users"] // 0). Files: \([.buckets[].objects] | add // 0) (\([.buckets[].bytes] | add // 0) bytes) in \(.buckets | length) buckets."' "$WORK/manifest.json")"
rm -rf "$WORK"
DONE=1

say "Backup finished: $FINISHED_UTC"
if [ "$AUTO" = 1 ]; then
  echo "File: backups/$(basename "$ENC")  ($(du -h "$ENC" | cut -f1))"
  exit 0
fi
echo "$SUMMARY"
echo "File: backups/$(basename "$ENC")  ($(du -h "$ENC" | cut -f1))"
echo "Next: in the file list on the left, open backups, right-click the .enc file > Download (and the .sha256 file),"
echo "keep both on your computer, then delete them here:  rm backups/hagerland-backup-*"
