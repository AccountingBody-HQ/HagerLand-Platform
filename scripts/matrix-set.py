#!/usr/bin/env python3
"""Sets status, implementing files and evidence of matrix rows: matrix-set.py ID 'files' 'evidence' [status]."""
import sys
p = 'docs/REQUIREMENTS_MATRIX.md'
rid, files, evidence = sys.argv[1], sys.argv[2], sys.argv[3]
status = sys.argv[4] if len(sys.argv) > 4 else 'Done'
lines = open(p).read().split('\n')
hit = 0
for i, l in enumerate(lines):
    if l.startswith(f'| {rid} |'):
        f = l.split(' | ')
        f[3], f[4], f[5] = status, files, evidence + ' |'
        lines[i] = ' | '.join(f[:6])
        hit += 1
if hit != 1:
    sys.exit(f'{rid}: {hit} rows')
open(p, 'w').write('\n'.join(lines))
