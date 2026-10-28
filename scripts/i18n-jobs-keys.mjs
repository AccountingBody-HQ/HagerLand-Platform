#!/usr/bin/env node
// Jobs Phase 5: lists the text in the Jobs files that goes through t() (and the fixed messages Jobs actions return),
// so the native-speaker review sheet and the "shown in English" notice cover every Jobs text.
//   node scripts/i18n-jobs-keys.mjs           writes lib/i18n/jobs-static-keys.json
//   node scripts/i18n-jobs-keys.mjs --check   exits 1 if that file is out of date (also checked by a unit test)
// Text built at run time from lists (trades, statuses, staffing form wording, …) is added in lib/i18n/jobs-keys.ts.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const OUT = join(ROOT, 'lib/i18n/jobs-static-keys.json')

/** The Jobs pages, forms, components and actions, and the shared header and footer as shown on them. */
export const JOBS_SOURCES = [
  'app/(site)/jobs',
  'app/(account)/account/jobs',
  'app/(account)/account/candidate',
  'app/(account)/account/applications',
  'app/(account)/account/service-requests/[id]',
  'app/(site)/requests/[token]',
  'app/(site)/request-service/[slug]',
  'app/(site)/request-service/sent',
  'components/jobs',
  'components/service-requests/ServiceRequestForm.tsx',
  'components/service-requests/RequestView.tsx',
  'components/service-requests/IntroducedPeople.tsx',
  'components/service-requests/RequestActions.tsx',
  'components/layout/SiteHeader.tsx',
  'components/layout/MobileDrawer.tsx',
  'components/layout/SiteFooter.tsx',
  'components/layout/LanguageSwitch.tsx',
  'components/layout/JobsAmharicNotice.tsx',
  'lib/jobs.ts',
  'lib/i18n/dates.ts',
  'app/actions/job-actions.ts',
  'app/actions/job-phone-actions.ts',
  'app/actions/job-report-actions.ts',
  'app/actions/callback-actions.ts',
]

function files(path) {
  const abs = join(ROOT, path)
  let st
  try {
    st = statSync(abs)
  } catch {
    return []
  }
  if (st.isFile()) return /\.(ts|tsx)$/.test(abs) ? [abs] : []
  return readdirSync(abs).flatMap((f) => files(join(path, f)))
}

const unescape = (s, q) => s.replace(new RegExp(`\\\\${q}`, 'g'), q).replace(/\\\\/g, '\\')
// [pattern, quote, actions only]: t('…'), t("…"), t(`…` without ${}); in actions also fail('…') and message: '…'
// (action messages are translated too).
const PATTERNS = [
  [/\bt\(\s*'((?:[^'\\]|\\.)+)'\s*\)/g, "'", false],
  [/\bt\(\s*"((?:[^"\\]|\\.)+)"\s*\)/g, '"', false],
  [/\bt\(\s*`([^`$\\]+)`\s*\)/g, '`', false],
  [/\bfail\(\s*'((?:[^'\\]|\\.)+)'/g, "'", true],
  [/\bfail\(\s*"((?:[^"\\]|\\.)+)"/g, '"', true],
  [/\bmessage:\s*'((?:[^'\\]|\\.)+)'/g, "'", true],
  [/\bmessage:\s*"((?:[^"\\]|\\.)+)"/g, '"', true],
]

export function scan() {
  const keys = {}
  for (const src of JOBS_SOURCES)
    for (const file of files(src)) {
      const text = readFileSync(file, 'utf8')
      const where = relative(ROOT, file)
      for (const [re, quote, actionsOnly] of PATTERNS) {
        if (actionsOnly && !where.startsWith('app/actions/')) continue
        for (const m of text.matchAll(re)) (keys[unescape(m[1], quote)] ??= new Set()).add(where)
      }
    }
  return Object.fromEntries(
    Object.keys(keys)
      .sort()
      .map((k) => [k, Array.from(keys[k]).sort()]),
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = `${JSON.stringify(scan(), null, 2)}\n`
  if (process.argv.includes('--check')) {
    const current = (() => {
      try {
        return readFileSync(OUT, 'utf8')
      } catch {
        return ''
      }
    })()
    if (current !== json) {
      console.error('lib/i18n/jobs-static-keys.json is out of date: run node scripts/i18n-jobs-keys.mjs')
      process.exit(1)
    }
    console.log('Jobs key list is up to date.')
  } else {
    writeFileSync(OUT, json)
    console.log(`Wrote ${Object.keys(JSON.parse(json)).length} Jobs keys to lib/i18n/jobs-static-keys.json`)
  }
}
