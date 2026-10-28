#!/usr/bin/env bash
# HagerLand restore (Fix F-6): puts a backup made by scripts/backup-supabase.sh into a TARGET Supabase project:
# the local copy (for the quarterly test-restore) or a NEW empty project. Restoring over the live project is a last
# resort only after talking it through (docs/RUNBOOK.md section 1), and needs a typed phrase.
#
# Usage, from the repository root:   bash scripts/restore-supabase.sh backups/hagerland-backup-<date>.tar.gz.enc
#
# What it does, in order: checks the file's checksum, decrypts it (passphrase at a hidden prompt) into a private
# temporary folder, checks every file inside, restores the site's tables, the sign-in accounts and the app's auth
# trigger, re-uploads every stored file, then compares the target with the backup's manifest (rows, files, bytes,
# checksums). The temporary folder is deleted at the end, whatever happens. Secrets are never printed or saved.
set -euo pipefail
umask 077

LIVE_REF="fcgqdsekfvwfivutftvj"
LIVE_PHRASE="RESTORE OVER LIVE HAGERLAND"
REPLACE_PHRASE="REPLACE ALL DATA IN TARGET"
ARCHIVE="${1:-}"
TMP=""
DB_URL=""
API_URL=""
SERVICE_KEY=""

say() { printf '\n%s\n' "$*"; }
fail() { printf '\nThe restore STOPPED: %s\n' "$*" >&2; exit 1; }
cleanup() {
  unset PGPASSWORD SERVICE_KEY PASSPHRASE
  if [ -n "$TMP" ]; then rm -rf "$TMP"; fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

cat <<'BANNER'
==============================================================================
 HagerLand restore
------------------------------------------------------------------------------
 Restores a backup into a TARGET project: the local copy (test-restore) or a
 NEW empty Supabase project. It REPLACES the target's site data and files.
 You need: the backup passphrase, and the TARGET's Session pooler string,
 database password and service_role key (typed at hidden prompts).
 Restoring over the LIVE project is refused unless you type a special phrase:
 read docs/RUNBOOK.md section 1 first.
==============================================================================
BANNER

[ -n "$ARCHIVE" ] && [ -f "$ARCHIVE" ] || fail "give the backup file, e.g.: bash scripts/restore-supabase.sh backups/hagerland-backup-20261028-0900.tar.gz.enc"
for tool in curl jq openssl tar sha256sum psql; do
  command -v "$tool" >/dev/null || fail "the tool \"$tool\" is missing on this machine."
done

# ---------------------------------------------------------------- 1. The file: checksum, passphrase, contents
if [ -f "$ARCHIVE.sha256" ]; then
  (cd "$(dirname "$ARCHIVE")" && sha256sum --quiet -c "$(basename "$ARCHIVE").sha256") || fail "the backup file is damaged (its checksum does not match). Nothing was restored."
  echo "Backup file checksum: OK"
else
  echo "Note: no .sha256 file next to the backup; the contents are still checked after decrypting."
fi
echo "Type the backup passphrase (nothing appears as you type), then press Enter:"
read -rs PASSPHRASE
echo
TMP="$(mktemp -d)"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$ARCHIVE" -pass fd:3 3< <(printf '%s' "$PASSPHRASE") 2>/dev/null | tar -xzf - -C "$TMP" 2>/dev/null ||
  fail "the passphrase is wrong or the file is damaged. Nothing was restored."
unset PASSPHRASE
(cd "$TMP" && sha256sum --quiet -c SHA256SUMS) || fail "a file inside the backup is damaged. Nothing was restored."
(cd "$TMP/storage/files" 2>/dev/null && sha256sum --quiet -c ../objects.sha256) || [ ! -s "$TMP/storage/objects.sha256" ] || fail "a stored file inside the backup is damaged. Nothing was restored."
jq -r '"Backup from \(.started.utc) (London \(.started.london)), script \(.script_version): \(.tables | length) tables, \([.buckets[].objects] | add // 0) files."' "$TMP/manifest.json"

# ---------------------------------------------------------------- 2. The TARGET (secrets at hidden prompts)
echo
echo "Paste the TARGET's Session pooler connection string (with [YOUR-PASSWORD] still in it), then press Enter:"
read -r DB_URL
if [[ "$DB_URL" != postgres* || "$DB_URL" != *":[YOUR-PASSWORD]@"* ]]; then fail "that does not look like a Session pooler string."; fi
DB_URL="${DB_URL/:\[YOUR-PASSWORD\]@/@}"
HOST="$(sed -E 's#^[a-z]+://[^@]*@([^:/?]+).*#\1#' <<<"$DB_URL")"
REF="$(sed -nE 's#^[a-z]+://postgres\.([a-z0-9]+)@.*#\1#p' <<<"$DB_URL")"
if [ -n "$REF" ]; then API_URL="https://$REF.supabase.co"; else
  echo "Type the TARGET's project address (for the local copy: http://localhost:54321), then press Enter:"
  read -r API_URL
fi
[[ "$API_URL" =~ ^https?://[A-Za-z0-9.:-]+$ ]] || fail "the project address should look like https://<ref>.supabase.co"

# Safety: the live project is refused unless the exact phrase is typed (checked before any password is asked).
if [[ "$DB_URL" == *"$LIVE_REF"* || "$API_URL" == *"$LIVE_REF"* ]]; then
  echo
  echo "WARNING: this target is the LIVE HagerLand project. Restoring REPLACES everything customers see."
  echo "Only do this after talking it through (docs/RUNBOOK.md section 1). To go ahead, type exactly:"
  echo "  $LIVE_PHRASE"
  read -r answer
  [ "$answer" = "$LIVE_PHRASE" ] || fail "the phrase was not typed exactly, so nothing was changed."
fi

echo "Type the TARGET's database password (nothing appears as you type), then press Enter:"
read -rs PGPASSWORD
echo
export PGPASSWORD
case "$HOST" in localhost|127.0.0.1) export PGSSLMODE="${PGSSLMODE:-disable}" ;; *) export PGSSLMODE="${PGSSLMODE:-require}" ;; esac
echo "Paste the TARGET's service_role key (nothing appears as you type), then press Enter:"
read -rs SERVICE_KEY
echo
api() { curl -sS --fail --retry 2 --retry-delay 2 -H @<(printf 'apikey: %s\nAuthorization: Bearer %s\n' "$SERVICE_KEY" "$SERVICE_KEY") "$@"; }
sql() { psql "$DB_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }

SERVER_NUM="$(sql -c 'show server_version_num')" || fail "could not connect to the target database."
PG_BIN="/usr/lib/postgresql/$((SERVER_NUM / 10000))/bin"
[ -x "$PG_BIN/pg_restore" ] || PG_BIN="$(dirname "$(command -v pg_restore)")"
api -o /dev/null "$API_URL/storage/v1/bucket" || fail "the target's project address or service_role key was not accepted by Storage."

EXISTING="$(sql -c "select (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')) + (select count(*) from auth.users)")"
if [ "$EXISTING" != 0 ]; then
  echo
  echo "The target already holds tables or sign-in accounts. They will be DELETED and replaced by the backup."
  echo "To go ahead, type exactly:  $REPLACE_PHRASE"
  read -r answer
  [ "$answer" = "$REPLACE_PHRASE" ] || fail "the phrase was not typed exactly, so nothing was changed."
fi

# ---------------------------------------------------------------- 3. Database
START=$(date +%s)
say "1/4  Emptying the target's site tables and sign-in accounts..."
# The public schema itself stays, with the platform's own permissions (Supabase sets them; they cannot be recreated):
# only the objects inside it are removed (never anything that belongs to an extension). If a restore ever stops
# halfway, run it again: the target is emptied first every time.
sql --single-transaction >/dev/null <<'SQL'
do $$
declare r record;
begin
  for r in
    select format('drop %s if exists %s cascade', kind, ident) as stmt from (
      select 'view' as kind, c.oid::regclass::text as ident, c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
      union all select 'materialized view', c.oid::regclass::text, c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'm'
      union all select 'table', c.oid::regclass::text, c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and c.relispartition is false
      union all select 'sequence', c.oid::regclass::text, c.oid from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
      union all select case p.prokind when 'p' then 'procedure' when 'a' then 'aggregate' else 'function' end, p.oid::regprocedure::text, p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace
      union all select case t.typtype when 'd' then 'domain' else 'type' end, t.oid::regtype::text, t.oid from pg_type t where t.typnamespace = 'public'::regnamespace and (t.typtype in ('e', 'd', 'r') or (t.typtype = 'c' and (select relkind from pg_class where oid = t.typrelid) = 'c'))
    ) o
    where not exists (select 1 from pg_depend d where d.objid = o.oid and d.deptype = 'e')
    order by case kind when 'view' then 1 when 'materialized view' then 1 when 'table' then 2 when 'sequence' then 3 when 'function' then 4 when 'procedure' then 4 when 'aggregate' then 4 else 5 end
  loop
    execute r.stmt;
  end loop;
end $$;
delete from auth.users;
SQL
say "2/4  Restoring the extensions, the sign-in accounts and every table..."
jq -r '.[] | "create extension if not exists \"\(.name)\" with schema \(.schema);"' "$TMP/db/extensions.json" | sql 2>/dev/null || true
# Accounts first (the site tables' links to them are added afterwards). Triggers stay off while loading.
"$PG_BIN/pg_restore" --data-only --file=- "$TMP/db/auth.dump" | sql --single-transaction -c "set session_replication_role = replica" -f - >/dev/null
# The site's tables: structure, data, then indexes, links, triggers and security rules, exactly as backed up.
# Everything except the schema entry, its comment and permissions, and the platform's (supabase_admin) default
# permissions, which the target already has.
"$PG_BIN/pg_restore" --list "$TMP/db/public.dump" | grep -vE ' (SCHEMA - public|COMMENT - SCHEMA public|ACL - SCHEMA public) |DEFAULT ACL public .* supabase_admin$' >"$TMP/restore.list"
# In ONE transaction: first switch off the target's automatic grants for new objects in public (Supabase grants
# everything to anon, authenticated and service_role by default), so each table, sequence and function gets exactly
# the permissions it had in the backup; the backup's own default-permission entries then put the defaults back.
"$PG_BIN/pg_restore" --no-owner --use-list="$TMP/restore.list" --file=- "$TMP/db/public.dump" |
  sql --single-transaction \
    -c "alter default privileges for role current_user in schema public revoke all on tables from anon, authenticated, service_role" \
    -c "alter default privileges for role current_user in schema public revoke all on sequences from anon, authenticated, service_role" \
    -c "alter default privileges for role current_user in schema public revoke all on functions from anon, authenticated, service_role" \
    -f - >/dev/null
# The app's own trigger on auth.users (it lives outside the public schema).
[ ! -s "$TMP/db/auth-triggers.sql" ] || sql --single-transaction -f "$TMP/db/auth-triggers.sql" >/dev/null
sql -c "notify pgrst, 'reload schema'" >/dev/null

# ---------------------------------------------------------------- 4. Stored files
say "3/4  Re-creating the buckets and uploading $(jq length "$TMP/storage/objects.json") stored files..."
jq -c '.[]' "$TMP/storage/buckets.json" | while read -r bucket; do
  id="$(jq -r .id <<<"$bucket")"
  [[ "$id" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || fail "unexpected bucket name in the backup: $id"
  if api -o /dev/null "$API_URL/storage/v1/bucket/$id" 2>/dev/null; then
    api -o /dev/null -X PUT -H 'Content-Type: application/json' --data "$bucket" "$API_URL/storage/v1/bucket/$id"
  else
    api -o /dev/null -X POST -H 'Content-Type: application/json' --data "$bucket" "$API_URL/storage/v1/bucket"
  fi
done
jq -r '.[] | [.bucket, .name, (.name | split("/") | map(@uri) | join("/")), .mimetype] | @tsv' "$TMP/storage/objects.json" >"$TMP/upload.tsv"
n=0
while IFS=$'\t' read -r bucket name encoded mime; do
  api -o /dev/null -X POST -H "Content-Type: $mime" -H 'x-upsert: true' --data-binary @"$TMP/storage/files/$bucket/$name" "$API_URL/storage/v1/object/$bucket/$encoded" ||
    fail "could not upload $bucket/$name."
  n=$((n + 1))
  if [ $((n % 50)) = 0 ]; then echo "     $n uploaded"; fi
done <"$TMP/upload.tsv"

# ---------------------------------------------------------------- 5. Check the target against the manifest
say "4/4  Checking the target against the backup..."
problems=0
while IFS=$'\t' read -r table expected; do
  [[ "$table" =~ ^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$ ]] || fail "unexpected table name in the backup's manifest: $table"
  actual="$(sql -c "select count(*) from $table")"
  if [ "$actual" != "$expected" ]; then echo "  rows differ in $table: backup $expected, target $actual"; problems=$((problems + 1)); fi
done < <(jq -r '.tables + .auth_tables | to_entries[] | [.key, (.value | tostring)] | @tsv' "$TMP/manifest.json")
while IFS=$'\t' read -r bucket objects bytes; do
  [[ "$bucket" =~ ^[a-z0-9][a-z0-9._-]*$ ]] || fail "unexpected bucket name in the backup's manifest: $bucket"
  got="$(sql -c "select count(*) || E'\t' || coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects where bucket_id = '$bucket'")"
  if [ "$got" != "$objects"$'\t'"$bytes" ]; then echo "  files differ in bucket $bucket: backup $objects files / $bytes bytes, target ${got/$'\t'/ files \/ } bytes"; problems=$((problems + 1)); fi
done < <(jq -r '.buckets | to_entries[] | [.key, (.value.objects | tostring), (.value.bytes | tostring)] | @tsv' "$TMP/manifest.json")
# Byte-for-byte: download back up to 25 files and compare their checksums with the backup's.
mkdir -p "$TMP/check"
while IFS= read -r line; do
  sum="${line%% *}"; rel="${line#*  }"; bucket="${rel%%/*}"; name="${rel#*/}"
  encoded="$(jq -rn --arg p "$name" '$p | split("/") | map(@uri) | join("/")')"
  api -o "$TMP/check/f" "$API_URL/storage/v1/object/$bucket/$encoded" || { echo "  could not download $rel back"; problems=$((problems + 1)); continue; }
  [ "$(sha256sum "$TMP/check/f" | cut -d' ' -f1)" = "$sum" ] || { echo "  $rel differs from the backup"; problems=$((problems + 1)); }
done < <(shuf -n 25 "$TMP/storage/objects.sha256" 2>/dev/null || true)
unset SERVICE_KEY
[ "$problems" = 0 ] || fail "$problems check(s) did not match the backup (listed above)."
echo "Every table's rows, every bucket's files and bytes, and a sample of files byte for byte match the backup."
say "Restore finished in $(( $(date +%s) - START )) seconds."
