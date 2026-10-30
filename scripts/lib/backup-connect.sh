# shellcheck shell=bash
# BK-1b: plain-English reasons when scripts/backup-supabase.sh cannot connect, a sanitiser that keeps every secret out
# of what is printed, and safe shape checks on HL_BACKUP_DB_URL. Loaded by the backup script; tested by
# tests/unit/bk1b-connection-errors.test.ts. Nothing here prints a password, a key or a connection string.

# The error text with every secret removed: each value given after the text (the password in plain and %-encoded form,
# the connection string, keys) is replaced by [hidden], then anything that looks like a connection string, a
# "password=" setting or a key. At most two lines of 300 characters.
sanitise_error() {
  local text="$1" secret
  shift
  for secret in "$@"; do
    if [ -n "$secret" ]; then text="${text//"$secret"/[hidden]}"; fi
  done
  printf '%s\n' "$text" | sed -E \
    -e 's#postgres(ql)?://[^[:space:]"'"'"']*#[hidden]#g' \
    -e 's#(password|passwd|pwd)[[:space:]]*=[[:space:]]*[^[:space:]"'"'"']*#\1=[hidden]#Ig' \
    -e 's#eyJ[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*#[hidden]#g' \
    -e 's#sb_(secret|publishable)_[A-Za-z0-9_-]+#[hidden]#g' \
    -e 's#^(psql|pg_dump): error: ##' |
    grep -v '^[[:space:]]*$' | head -n 2 | cut -c1-300
}

# One plain-English line for the database client's error text.
connection_reason() {
  local e
  e="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$e" in
    *"password authentication failed"*)
      echo "The database refused the password. Copy the current database password into the connection string again (Supabase → Connect → Session pooler)." ;;
    *"circuit breaker"* | *"too many authentication"*)
      echo "Supabase has paused new connections for a while after too many failed sign-in attempts. Wait about 30 minutes, check the password in the connection string, then run it once." ;;
    *"tenant or user not found"* | *"tenant not found"* | *"user not found"* | *"role \""*"\" does not exist"*)
      echo "Supabase does not recognise the project or user in the connection string. Copy the Session pooler string again; the user must be postgres.<project ref>." ;;
    *"could not translate host name"* | *"name or service not known"* | *"temporary failure in name resolution"* | *"nodename nor servname"* | *"no address associated"*)
      echo "The database address could not be found. Check the part after @ in the connection string." ;;
    *"too many connections"* | *"remaining connection slots"* | *"max client connections"* | *"maxclientsinsessionmode"* | *"too many clients"*)
      echo "The database has too many open connections right now. Wait a few minutes and run it again." ;;
    *"project is paused"* | *"paused"* | *"restricted"* | *"suspended"*)
      echo "Supabase refused the connection because the project is paused or restricted. Open the project in Supabase, check it is active, and run it again." ;;
    *ssl* | *tls*)
      echo "The secure connection could not be set up." ;;
    *"timeout expired"* | *"timed out"* | *"connection refused"* | *"network is unreachable"* | *"no route to host"*)
      echo "The database could not be reached from this machine (network). Check Supabase → Database → Settings → Network restrictions allow all addresses, and that you used the Session pooler (port 5432)." ;;
    *"server closed the connection unexpectedly"* | *"connection reset"*)
      echo "The database closed the connection straight away. It may be restarting or paused: open the project in Supabase, check it is active, and run it again." ;;
    *)
      echo "Reason from the database: $(sanitise_error "$1" "${@:2}" | head -n 1)" ;;
  esac
}

# Is this error about setting up the secure connection?
is_ssl_error() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    *"password authentication"* | *"tenant"*) return 1 ;;
    *ssl* | *tls*) return 0 ;;
    *) return 1 ;;
  esac
}

# Shape checks on the Session pooler string, before connecting. $1 = the string with the password taken out,
# $2 = the password as written in it. Prints one plain line per problem (never the password); prints nothing when
# the shape is right.
url_shape_problems() {
  local url="$1" pw="$2" user host port db
  if [[ "$url$pw" =~ [[:space:]] ]]; then echo "it contains a space (a space in the password must be written as %20)."; fi
  if [[ "$url" == *[\[\]]* ]] || [[ "$pw" == \[*\] ]]; then echo "it still has square brackets [ ]: remove them (only the password goes between : and @)."; fi
  if [[ "$(printf '%s' "$url$pw" | tr '[:lower:]' '[:upper:]')" == *"YOUR-PASSWORD"* ]]; then echo "it still contains YOUR-PASSWORD: put the database password in its place."; fi
  if [[ ! "$url" =~ ^postgres(ql)?://([^@/]+)@([^:/?]+)(:([0-9]+))?(/([^?]*))?(\?.*)?$ ]]; then
    echo "it is not in the form postgresql://postgres.<project ref>:<password>@<host>:5432/postgres."
    return 0
  fi
  user="${BASH_REMATCH[2]}" host="${BASH_REMATCH[3]}" port="${BASH_REMATCH[5]}" db="${BASH_REMATCH[7]}"
  if [[ ! "$user" =~ ^postgres\.[a-z0-9]{20}$ ]]; then echo "the user (before the password) should be postgres.<project ref> (postgres, a dot, then 20 letters and numbers)."; fi
  if [[ "$host" != *.pooler.supabase.com ]]; then echo "the address after @ should end with .pooler.supabase.com (the Session pooler address from Supabase → Connect)."; fi
  if [ "$port" = 6543 ]; then echo "the port is 6543 (the Transaction pooler): use the Session pooler, port 5432."
  elif [ "$port" != 5432 ]; then echo "the port (after the address) should be 5432."; fi
  if [ "$db" != postgres ]; then echo "the database name at the end should be postgres (…:5432/postgres)."; fi
  return 0
}
