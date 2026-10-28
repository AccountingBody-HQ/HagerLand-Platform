#!/usr/bin/env node
// Jobs Phase 5 (S8): local-only check that highlights the Jobs text still shown in English on Amharic pages.
//   node scripts/i18n-am-check.mjs [base-url] [path …]      default base http://localhost:3000, paths /am/jobs …
// Needs the local site running with Amharic for Jobs switched on (local copy only). It reads each page and lists the
// Jobs keys (lib/i18n/jobs-review-keys.json) that appear in English in the visible text. Refuses anything but localhost.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const [base = 'http://localhost:3000', ...rest] = process.argv.slice(2)
const url = new URL(base)
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error('This check runs only against the local copy (localhost).')
  process.exit(1)
}
const paths = rest.length ? rest : ['/am/jobs', '/am/request-service/staffing', '/am/jobs/call-back']
const keys = JSON.parse(readFileSync(join(ROOT, 'lib/i18n/jobs-review-keys.json'), 'utf8'))
  .map((k) => k.key)
  .filter((k) => !k.includes('{') && k.length > 2)

const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

for (const path of paths) {
  const res = await fetch(new URL(path, url), { redirect: 'manual' })
  if (res.status !== 200) {
    console.log(`${path}: HTTP ${res.status} (is Amharic for Jobs switched on locally?)`)
    continue
  }
  const lines = new Set(visibleText(await res.text()))
  const english = keys.filter((k) => lines.has(k))
  console.log(`${path}: ${english.length} Jobs texts shown in English`)
  for (const k of english) console.log(`  · ${k}`)
}
process.exit(0)
