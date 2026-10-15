#!/usr/bin/env bash
# Cutover step 5: merges relaunch/construction into main with a merge commit (no squash, no force), pushes main and
# waits until www.hagerland.com serves that commit (/api/health reports it).
#   Rehearsal (merges in a throw-away worktree, pushes nothing):  CUTOVER_DB=local bash scripts/cutover/merge.sh
#   Production (only after AB typed GO LIVE):                     CUTOVER_DB=live HL_CONFIRM=GO-LIVE bash scripts/cutover/merge.sh
. "$(dirname "$0")/env.sh"
cd "$ROOT"
git fetch -q origin main relaunch/construction
if [ "$CUTOVER_DB" = "local" ]; then
  tmp="$(mktemp -d)"
  git worktree add -q --detach "$tmp" origin/main
  git -C "$tmp" merge --no-ff --no-edit -q origin/relaunch/construction -m "Merge relaunch/construction (rehearsal)"
  echo "Rehearsal merge OK: $(git -C "$tmp" log -1 --format='%h %s'), parents $(git -C "$tmp" log -1 --format='%p')"
  git worktree remove --force "$tmp"
  exit 0
fi
[ -z "$(git status --porcelain)" ] || { echo "Refusing: the working tree has uncommitted changes." >&2; exit 1; }
[ "$(git rev-parse relaunch/construction)" = "$(git rev-parse origin/relaunch/construction)" ] || { echo "Refusing: push relaunch/construction first." >&2; exit 1; }
git checkout -q main
git merge -q --ff-only origin/main
git merge --no-ff --no-edit origin/relaunch/construction -m "Merge relaunch/construction: HagerLand construction and property platform (WP-20 cutover)"
sha="$(git rev-parse HEAD)"
git push origin main
echo "Merged and pushed: $sha"
echo "$sha" > "$ROOT/backups/cutover-merge-sha.txt"
echo "Waiting for www.hagerland.com to serve ${sha:0:7} (up to 20 minutes)..."
for _ in $(seq 1 120); do
  v="$(curl -fsS https://www.hagerland.com/api/health 2>/dev/null | sed -n 's/.*"version":"\([0-9a-f]*\)".*/\1/p')"
  if [ "$v" = "${sha:0:7}" ]; then echo "Production deployment is live: $v"; exit 0; fi
  sleep 10
done
echo "FAIL  production did not report ${sha:0:7} within 20 minutes."; exit 1
