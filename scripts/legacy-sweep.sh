#!/usr/bin/env bash
# Legacy-content sweep (spec 15.5): looks for wording of the old site in shipped code and config.
# Generic words of the new platform ("diaspora", "jobs", "events", "housing", "cars", and "pillars", which
# Section 26 reuses for the ten business pillars of the property ecosystem) are not searched: they are legitimate now. The only expected hits are the redirect lists for old addresses.
set -euo pipefail
cd "$(dirname "$0")/.."
TERMS=("Where Ethiopia Does Business" "Made in Ethiopia" "BirrBank" "birrbank" "community directory" "Connect and Cooperate" "Homeland" "ሃገር ·" "accountingbody" "hagerland-platform.vercel.app" "Free, always" "tutors" "money transfer" "addressCountry: 'GB'" "en_GB")
# Files that must name old sections on purpose: redirects (next.config.mjs) and the 410 list for old APIs.
ALLOWED='^(next\.config\.mjs|lib/legacy-api\.ts):'
hits=0
for t in "${TERMS[@]}"; do
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if ! [[ "$line" =~ $ALLOWED ]]; then echo "LEGACY: $line"; hits=$((hits + 1)); fi
  done < <(grep -rnF "$t" app components lib next.config.mjs middleware.ts --include=*.ts --include=*.tsx --include=*.mjs 2>/dev/null | grep -v 'lib/database.types.ts' || true)
done
if [ "$hits" -gt 0 ]; then echo "$hits legacy hit(s) to resolve"; exit 1; fi
echo "Legacy sweep: no relevant hits"
