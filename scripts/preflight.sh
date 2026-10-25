#!/usr/bin/env bash
# Go-live preflight (brief 25.5): checks every prerequisite that can be verified from outside, against PRODUCTION.
# Read-only: it only makes GET requests and DNS lookups.
#   bash scripts/preflight.sh                       # https://www.hagerland.com, CRON_SECRET from .env.local
#   PREFLIGHT_URL=http://localhost:3100 PREFLIGHT_LOCAL=1 bash scripts/preflight.sh   # rehearsal (skips DNS and https checks)
# Exit code 0 only when every check passes.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
URL="${PREFLIGHT_URL:-https://www.hagerland.com}"
LOCAL="${PREFLIGHT_LOCAL:-}"
SECRET="${CRON_SECRET:-$(grep -E '^CRON_SECRET=' "$ROOT/.env.local" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')}"
fails=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; fails=$((fails + 1)); }
check() { if eval "$2"; then pass "$1"; else fail "$1"; fi; }

# 1. The site answers, and the full health check (settings, database, migrations, storage, email domain) is all true.
check "/api/health answers ok" "curl -fsS '$URL/api/health' | grep -q '\"ok\":true'"
if [ -z "$SECRET" ]; then
  fail "/api/health/full (CRON_SECRET not available)"
else
  full="$(curl -fsS -H "Authorization: Bearer $SECRET" "$URL/api/health/full" || true)"
  if [ -z "$full" ]; then fail "/api/health/full answers"
  else
    # Every leaf value must be true; list any that are not (names only, never values).
    bad="$(node -e '
      const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, p + k + ".") : [[p + k, v]]))
      // latestMigration and notChecked describe the report; they are not checks.
      const info = (k) => k === "version" || k === "ok" || k === "latestMigration" || k.startsWith("notChecked.")
      const out = flat(JSON.parse(process.argv[1])).filter(([k, v]) => v !== true && !info(k)).map(([k]) => k)
      console.log(out.join(", "))' "$full" 2>/dev/null || echo "unreadable answer")"
    if [ -z "$bad" ]; then pass "/api/health/full: every check true (env vars, database, migrations, storage, Resend domain verified)"
    else fail "/api/health/full not true: $bad"; fi
  fi
fi

# 2. DNS: both names point at Vercel, and the bare domain sends visitors to www.
if [ -z "$LOCAL" ]; then
  dns="$(node -e '
    const dns = require("dns").promises
    // Vercel DNS names (vercel-dns.com and the newer vercel-dns-NNN.com) and Vercel anycast addresses, old and new (216.150.x).
    const vercel = (a) => a.some((x) => /vercel-dns(-\d+)?\.com\.?$/.test(x) || /^76\.76\.21\./.test(x) || /^66\.33\.60\./.test(x) || /^216\.150\.(1|16)\./.test(x))
    const look = async (h) => [...(await dns.resolveCname(h).catch(() => [])), ...(await dns.resolve4(h).catch(() => []))]
    Promise.all([look("www.hagerland.com"), look("hagerland.com")]).then(([w, a]) => console.log(`${vercel(w)} ${vercel(a)}`))')"
  check "DNS: www.hagerland.com points to Vercel" "[ '${dns%% *}' = true ]"
  check "DNS: hagerland.com points to Vercel" "[ '${dns##* }' = true ]"
  check "https://hagerland.com redirects to https://www.hagerland.com" \
    "curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' https://hagerland.com/ | grep -qE '^30[178] https://www\.hagerland\.com/'"
fi

# 3. Search engines: robots.txt allows the site and lists the sitemaps; every listed sitemap answers with XML.
robots="$(curl -fsS "$URL/robots.txt" || true)"
maps="$(grep -i '^Sitemap:' <<<"$robots" | awk '{print $2}' | tr -d '\r')"
if [ -n "$LOCAL" ]; then
  # Test builds block robots on purpose; check the sitemap parts directly.
  maps="$(grep -o "SITEMAP_IDS = \[[^]]*\]" "$ROOT/lib/sitemap-rules.ts" | grep -o "'[a-z-]*'" | tr -d "'" | sed 's|^|https://www.hagerland.com/sitemap/|; s|$|.xml|')"
else
  check "robots.txt does not block the whole site" "! grep -qx 'Disallow: /' <<<\"\$robots\""
fi
check "robots.txt lists the sitemaps" "[ -n \"\$maps\" ]"
for m in $maps; do
  local_m="${m/https:\/\/www.hagerland.com/$URL}"
  check "sitemap ${m##*/} answers" "curl -fsS '$local_m' | grep -q '<urlset'"
done

# 4. Security headers on the homepage.
headers="$(curl -fsSI "$URL/" || true)"
for h in strict-transport-security content-security-policy x-content-type-options x-frame-options referrer-policy permissions-policy; do
  check "header $h" "grep -qi '^$h:' <<<\"\$headers\""
done
check "admin sends visitors to its sign-in page" "curl -sSI '$URL/roodber8' | grep -qiE '^location: (/|$URL/)roodber8-login'"
check "admin sign-in page is not indexed" "curl -sSI '$URL/roodber8-login' | grep -qi '^x-robots-tag: noindex'"

echo
if [ "$fails" -eq 0 ]; then echo "Preflight: all checks passed."; else echo "Preflight: $fails check(s) failed."; fi
[ "$fails" -eq 0 ]
