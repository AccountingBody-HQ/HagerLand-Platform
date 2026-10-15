#!/usr/bin/env bash
# Cutover rollback (brief 25.6): reverts the merge on main with "git revert -m 1" (no force-push), pushes, waits until the
# old site is serving again, and undoes the legacy lockdown if it was applied. New tables are additive and stay.
#   CUTOVER_DB=live HL_CONFIRM=GO-LIVE bash scripts/cutover/rollback.sh [--lockdown-applied]
. "$(dirname "$0")/env.sh"
[ "$CUTOVER_DB" = "live" ] || { echo "Rollback only makes sense for production (CUTOVER_DB=live)." >&2; exit 2; }
cd "$ROOT"
sha="$(cat "$ROOT/backups/cutover-merge-sha.txt")"
git checkout -q main
git pull -q --ff-only origin main
git revert -m 1 --no-edit "$sha"
git push origin main
echo "Reverted $sha. Waiting for the old site (it has no /api/health, so that address stops answering 200)..."
ok=""
for _ in $(seq 1 120); do
  code="$(curl -s -o /dev/null -w '%{http_code}' https://www.hagerland.com/api/health)"
  if [ "$code" != "200" ]; then ok=1; break; fi
  sleep 10
done
[ -n "$ok" ] && echo "The old site is serving again." || echo "FAIL  the new site is still answering after 20 minutes: check Vercel → Deployments."
if [ "${1:-}" = "--lockdown-applied" ]; then bash "$(dirname "$0")/lockdown.sh" reverse; fi
