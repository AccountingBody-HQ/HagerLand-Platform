#!/usr/bin/env node
// Jobs Phase 5: imports the native speaker's review sheet (S7). Only rows marked OK ("yes" or "OK") with reviewer text are imported,
// each as a reviewed entry in lib/i18n/messages/am-reviewed.json; everything else is left out (and shows in English).
//   node scripts/i18n-import-review.mjs <sheet.csv> --dry-run    shows what would change, writes nothing
//   node scripts/i18n-import-review.mjs <sheet.csv>              writes lib/i18n/messages/am-reviewed.json
//   node scripts/i18n-import-review.mjs <sheet.csv> --target <copy.json>   reads and writes a copy instead (tests)
// Rows are refused when the key is not a Jobs key or the {placeholders} differ from the English. Then run the unit
// tests and build, and commit the JSON file on a branch for AB's release.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCsv, placeholders } from './i18n-csv.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const [file, ...flags] = process.argv.slice(2)
if (!file) {
  console.error('Usage: node scripts/i18n-import-review.mjs <sheet.csv> [--dry-run]')
  process.exit(1)
}
const dryRun = flags.includes('--dry-run')
const keys = new Set(JSON.parse(readFileSync(join(ROOT, 'lib/i18n/jobs-review-keys.json'), 'utf8')).map((k) => k.key))
const targetAt = flags.indexOf('--target')
const target = targetAt >= 0 && flags[targetAt + 1] ? flags[targetAt + 1] : join(ROOT, 'lib/i18n/messages/am-reviewed.json')
const reviewed = JSON.parse(readFileSync(target, 'utf8'))

const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'))
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name)
const iKey = col('key')
const iText = col('reviewer text')
const iOk = col('ok')
if (iKey < 0 || iText < 0 || iOk < 0) {
  console.error('The sheet needs the columns "key", "reviewer text" and "OK".')
  process.exit(1)
}

const next = { ...reviewed }
const report = { imported: 0, unchanged: 0, skipped: 0, refused: [] }
for (const r of rows) {
  const key = r[iKey] ?? ''
  const text = (r[iText] ?? '').trim()
  if (!['OK', 'YES'].includes((r[iOk] ?? '').trim().toUpperCase()) || !text) {
    report.skipped++
    continue
  }
  if (!keys.has(key)) {
    report.refused.push(`${key} (not a Jobs key)`)
    continue
  }
  if (placeholders(key).join(',') !== placeholders(text).join(',')) {
    report.refused.push(`${key} (the {placeholders} must match the English)`)
    continue
  }
  if (next[key] === text) report.unchanged++
  else {
    next[key] = text
    report.imported++
  }
}
const sorted = Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]]))
console.log(`Imported ${report.imported}, unchanged ${report.unchanged}, not marked OK ${report.skipped}, refused ${report.refused.length}.`)
for (const line of report.refused) console.log(`  refused: ${line}`)
if (dryRun) console.log('Dry run: nothing was written.')
else writeFileSync(target, `${JSON.stringify(sorted, null, 2)}\n`)
