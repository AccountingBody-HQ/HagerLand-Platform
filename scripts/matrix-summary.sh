#!/usr/bin/env bash
# Counts requirement rows in docs/REQUIREMENTS_MATRIX.md by status. Exit 1 if any row is "Not done".
set -euo pipefail
cd "$(dirname "$0")/.."
awk -F'|' 'NF>6 && $2 !~ /ID|---/ { gsub(/^ +| +$/,"",$5); n[$5]++; t++ } END { for (s in n) printf "%-18s %d\n", s, n[s]; printf "%-18s %d\n", "Total", t; exit (n["Not done"]>0) }' docs/REQUIREMENTS_MATRIX.md
