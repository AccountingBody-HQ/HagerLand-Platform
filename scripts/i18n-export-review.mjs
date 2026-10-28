#!/usr/bin/env node
// Jobs Phase 5: writes the Amharic review sheet for the native speaker (S7).
//   node scripts/i18n-export-review.mjs [output.csv]     default: reports/amharic_review_sheet.csv
// Columns: key, where, draft (machine-assisted), reviewer text, OK, notes. "draft" carries the existing machine-assisted
// catalogue entry where there is one (never shown on Jobs pages); new keys have no draft. "reviewer text" and "OK" are
// filled in already for entries that were reviewed before. The reviewer writes the Amharic in "reviewer text" and puts
// yes in the OK column for every row that is right (no, or empty, otherwise); scripts/i18n-import-review.mjs imports
// only the rows marked yes.
// No Amharic is written by this script.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { toCsv } from './i18n-csv.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const out = process.argv[2] ?? join(ROOT, 'reports/amharic_review_sheet.csv')
const keys = JSON.parse(readFileSync(join(ROOT, 'lib/i18n/jobs-review-keys.json'), 'utf8'))
const reviewed = JSON.parse(readFileSync(join(ROOT, 'lib/i18n/messages/am-reviewed.json'), 'utf8'))

const rows = [['key', 'where', 'draft (machine-assisted)', 'reviewer text', 'OK', 'notes']]
for (const k of keys) rows.push([k.key, k.where.join('; '), k.draft ?? '', reviewed[k.key] ?? '', reviewed[k.key] ? 'yes' : '', ''])
mkdirSync(dirname(out), { recursive: true })
// A byte-order mark so spreadsheet programs open the Amharic correctly.
writeFileSync(out, `﻿${toCsv(rows)}`)
const done = keys.filter((k) => reviewed[k.key]).length
console.log(`Wrote ${keys.length} rows to ${out} (${done} already reviewed, ${keys.length - done} to review).`)
