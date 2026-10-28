import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fill, jobsTranslator, translateResult, translator } from '@/lib/i18n/translate'
import { isJobsAmPath, localizeHref } from '@/lib/i18n/config'
import { formatDateFor, relativeTimeFor } from '@/lib/i18n/dates'
import { AM_MESSAGES } from '@/lib/i18n/messages/am'
import { AM_REVIEWED } from '@/lib/i18n/messages/am-reviewed'
import { collectLabels, jobsKeys, missingReviewed } from '@/lib/i18n/jobs-keys'
import { JOBS_EMAIL_KEYS } from '@/lib/i18n/jobs-email-keys'
import { buildMetadata } from '@/lib/seo'
import { shareLinks, shareText, telegramPostText } from '@/lib/jobs-share'
import { CALLBACK_LANGUAGES, CALLBACK_LIMITS, CALLBACK_SCRIPT, CALLBACK_TEXT, CALLBACK_TIMES, applyOutcome, blockedUntil, callbackClearDue, callbackFieldErrors, callbackSchema, clearedCallback } from '@/lib/callbacks'
import { CLEANUP_KINDS, cleanupDigestCounts, runCleanupCore, type CleanupAdapter } from '@/lib/jobs-cleanup'
import { EXPECTED_MIGRATIONS } from '@/lib/health'
import { roleCanAccess } from '@/lib/admin/roles'
import * as T from '@/lib/email/templates'
import { TRADES } from '@/lib/jobs'
import { scan } from '../../scripts/i18n-jobs-keys.mjs'
import { parseCsv, placeholders, toCsv } from '../../scripts/i18n-csv.mjs'

/** Jobs Phase 5 (migration 0043): Amharic for Jobs, share links, call-back requests. */

const read = (p: string) => readFileSync(p, 'utf8')

describe('Amharic for Jobs: only native-reviewed text', () => {
  const reviewed = { 'Search jobs': '[AM TEST] search', 'Closes {date}': '[AM TEST] closes {date}' }
  it('the Jobs translator shows only reviewed entries and falls back to English', () => {
    const t = jobsTranslator('am', 'jobs', reviewed)
    expect(t('Search jobs')).toBe('[AM TEST] search')
    expect(t('Post a job')).toBe('Post a job')
    expect(fill(t('Closes {date}'), { date: 'X' })).toBe('[AM TEST] closes X')
  })
  it('English is never translated', () => {
    expect(jobsTranslator('en', 'jobs', reviewed)('Search jobs')).toBe('Search jobs')
    expect(translator('en', 'site')('Jobs')).toBe('Jobs')
  })
  it('the site-wide Amharic version is unchanged: full catalogue for the site, Jobs pages as before', () => {
    expect(translator('am', 'site')('Jobs')).toBe(AM_MESSAGES.Jobs)
    const jobsOnSite = jobsTranslator('am', 'site', reviewed)
    expect(jobsOnSite('Post a job')).toBe('Post a job')
    expect(jobsOnSite('Search jobs')).toBe('Search jobs')
    expect(jobsOnSite('Language')).toBe(AM_MESSAGES.Language)
    expect(jobsOnSite('English')).toBe(AM_MESSAGES.English)
  })
  it('action messages are translated the same way, English untouched', () => {
    const t = jobsTranslator('am', 'jobs', { 'Saved.': '[AM TEST] saved' })
    expect(translateResult({ ok: true, data: { message: 'Saved.' } }, t)).toEqual({ ok: true, data: { message: '[AM TEST] saved' } })
    expect(translateResult({ ok: false, error: 'Saved.', fieldErrors: { a: 'Saved.', b: '' } }, t)).toEqual({ ok: false, error: '[AM TEST] saved', fieldErrors: { a: '[AM TEST] saved', b: '' } })
    expect(translateResult({ ok: false, error: 'Saved.' }, jobsTranslator('en', 'jobs'))).toEqual({ ok: false, error: 'Saved.' })
  })
  it('no fake or test text is ever committed as reviewed', () => {
    for (const v of Object.values(AM_REVIEWED)) expect(v).not.toMatch(/AM TEST/)
  })
})

describe('Amharic for Jobs: which pages and links', () => {
  it('Jobs pages, the staffing journey and the Jobs account pages', () => {
    for (const p of ['/jobs', '/jobs?q=mason', '/jobs/site-engineer-abc', '/jobs/call-back', '/request-service/staffing', '/request-service/sent?ref=HLS-2026-000001&for=staffing', '/account/jobs', '/account/jobs/new', '/account/candidate', '/account/applications', '/requests/abc', '/account/service-requests/abc']) expect(isJobsAmPath(p)).toBe(true)
    for (const p of ['/', '/property', '/request-service/plumbers', '/request-service/sent?ref=HLS-2026-000001', '/request-service/sent?for=plumbers', '/account', '/account/service-requests', '/jobsite', '/privacy', '/terms']) expect(isJobsAmPath(p)).toBe(false)
  })
  it('links on Jobs pages keep Amharic only for Jobs pages; everything else stays English', () => {
    expect(localizeHref('/jobs/x', 'am', 'jobs')).toBe('/am/jobs/x')
    expect(localizeHref('/property', 'am', 'jobs')).toBe('/property')
    expect(localizeHref('/privacy', 'am', 'jobs')).toBe('/privacy')
    expect(localizeHref('/property', 'am', 'site')).toBe('/am/property')
    expect(localizeHref('/jobs', 'en', 'jobs')).toBe('/jobs')
  })
  it('SEO: an Amharic page has its own canonical and og:locale am_ET; English is unchanged', () => {
    const am = buildMetadata({ title: 'T', description: 'D', path: '/jobs/x', locale: 'am' })
    expect(am.alternates?.canonical).toBe('https://www.hagerland.com/am/jobs/x')
    expect((am.openGraph as { locale?: string }).locale).toBe('am_ET')
    const en = buildMetadata({ title: 'T', description: 'D', path: '/jobs/x' })
    expect(en.alternates?.canonical).toBe('https://www.hagerland.com/jobs/x')
    expect((en.openGraph as { locale?: string }).locale).toBe('en_US')
  })
})

describe('dates: Ethiopian calendar first, Gregorian in brackets (Addis Ababa time)', () => {
  it('Amharic pages', () => {
    expect(formatDateFor('2026-10-26T20:59:00Z', 'am')).toBe('16 ጥቅምት 2019 (26 Oct 2026)')
    expect(formatDateFor('2026-10-26T21:00:00Z', 'am')).toMatch(/^17 ጥቅምት 2019 \(/)
  })
  it('English pages exactly as before, Western digits throughout', () => {
    expect(formatDateFor('2026-10-26T09:00:00Z', 'en')).toBe('26 Oct 2026')
    expect(formatDateFor('2026-10-26T09:00:00Z', 'am')).not.toMatch(/[፩-፼]/)
    const now = new Date('2026-10-26T09:00:00Z')
    expect(relativeTimeFor('2026-10-23T09:00:00Z', 'en', (s) => s, now)).toBe('3 days ago')
    expect(relativeTimeFor('2026-10-23T09:00:00Z', 'am', (s) => s, now)).toBe('3 days ago')
  })
})

describe('the Jobs key list (review sheet, W2 notice, coverage)', () => {
  it('the scanned list is up to date (node scripts/i18n-jobs-keys.mjs)', () => {
    expect(JSON.parse(read('lib/i18n/jobs-static-keys.json'))).toEqual(scan())
  })
  it('the review key list is up to date (UPDATE_JOBS_KEYS=1 npx vitest run tests/unit/jobs-phase-5.test.ts)', () => {
    const fresh = Array.from(jobsKeys().entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, where]) => ({ key, where, draft: AM_MESSAGES[key] ?? '' }))
    if (process.env.UPDATE_JOBS_KEYS === '1') writeFileSync('lib/i18n/jobs-review-keys.json', `${JSON.stringify(fresh, null, 2)}\n`)
    expect(JSON.parse(read('lib/i18n/jobs-review-keys.json'))).toEqual(fresh)
  })
  it('covers the approved wording, the staffing form, the emails and the lists', () => {
    const keys = jobsKeys()
    for (const k of [CALLBACK_TEXT.boxHeading, CALLBACK_TEXT.thanks, 'Share this job', 'Link copied.', 'Some text on this page is shown in English while we finish the translation.', 'Submit a staffing requirement', TRADES[0].label, 'Your job is live: {title}', 'Morning']) expect(keys.has(k), k).toBe(true)
  })
  it('lists the Jobs keys without a reviewed entry (S8): today, all of them', () => {
    const missing = missingReviewed(AM_REVIEWED)
    console.info(`Jobs keys without a native-reviewed Amharic entry: ${missing.length} of ${jobsKeys().size}`)
    expect(missing.length).toBe(jobsKeys().size - Object.keys(AM_REVIEWED).filter((k) => jobsKeys().has(k)).length)
  })
  it('the W2 notice stays while any Jobs, menu or footer text is unreviewed', () => {
    const all = Object.fromEntries(Array.from(jobsKeys().keys()).map((k) => [k, `[AM TEST] ${k}`]))
    expect(missingReviewed(all)).toEqual([])
    expect(missingReviewed(all, ['A menu label'])).toEqual(['A menu label'])
    expect(collectLabels({ groups: [{ label: 'A', href: '/a', links: [{ label: 'B', description: 'C' }] }] })).toEqual(['A', 'B', 'C'])
  })
  it('Jobs email texts are keys that match what the emails send (still sent in English)', () => {
    const v = { title: 'TTT', name: 'NNN', date: '1 Nov 2026', reference: 'REF', applicantName: 'AAA', orgName: 'OOO', employer: 'EEE', count: 2 }
    const sent = [
      T.jobDecisionEmail({ name: v.name, title: v.title, approved: true, url: 'https://x', expiresAt: '2026-11-01T09:00:00Z' }),
      T.jobDecisionEmail({ name: v.name, title: v.title, approved: false, reason: 'R', url: 'https://x', expiresAt: null }),
      T.newApplicationEmail({ orgName: v.orgName, title: v.title, reference: v.reference, applicantName: v.applicantName, url: 'https://x', byPhone: true }),
      T.newApplicationEmail({ orgName: v.orgName, title: v.title, reference: v.reference, applicantName: v.applicantName, url: 'https://x' }),
      T.applicationReceivedEmail({ name: v.name, title: v.title, employer: v.employer, reference: v.reference }),
      T.recruitmentIntroductionEmail({ reference: v.reference, count: v.count, link: 'https://x' }),
      T.jobPausedEmail({ title: v.title }),
    ]
      // Preheaders are only in the HTML version.
      .map((e) => `${e.subject}\n${e.text}\n${e.html.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')}`)
      .join('\n')
    for (const k of JOBS_EMAIL_KEYS.flatMap((e) => e.keys)) expect(sent, k).toContain(fill(k, v))
  })
})

describe('review sheet scripts (CSV)', () => {
  it('round-trips quotes, commas, line breaks and Amharic', () => {
    const rows = [['key', 'reviewer text'], ['Say "hi", then go', 'ሰላም\nደህና']]
    expect(parseCsv(`﻿${toCsv(rows)}`)).toEqual(rows)
  })
  it('placeholders must match', () => {
    expect(placeholders('Closes {date} at {place}')).toEqual(['date', 'place'])
  })
})

describe('share links (W3–W7) and Copy for Telegram (W16)', () => {
  const job = { title: 'Site engineer', place: 'Bole', link: 'https://www.hagerland.com/jobs/site-engineer-abc', privateClient: false }
  it('approved share text, no tracking tags', () => {
    expect(shareText(job)).toBe('Site engineer in Bole. See the job and apply on HagerLand: https://www.hagerland.com/jobs/site-engineer-abc')
    expect(shareText({ ...job, privateClient: true })).toBe('Site engineer in Bole, posted by HagerLand for a private client. See the job and apply on HagerLand: https://www.hagerland.com/jobs/site-engineer-abc')
    const l = shareLinks(shareText(job), job.link)
    expect(l.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(shareText(job))}`)
    expect(l.telegram).toBe(`https://t.me/share/url?url=${encodeURIComponent(job.link)}&text=${encodeURIComponent(shareText(job))}`)
    expect(`${l.whatsapp}${l.telegram}`).not.toMatch(/utm_/)
  })
  it('the share text goes through the Jobs translator on Amharic pages', () => {
    const t = jobsTranslator('am', 'jobs', { '{title} in {place}. See the job and apply on HagerLand: {link}': '[AM TEST] {title} {place} {link}' })
    expect(shareText({ ...job, link: 'https://www.hagerland.com/am/jobs/x' }, t)).toBe('[AM TEST] Site engineer Bole https://www.hagerland.com/am/jobs/x')
  })
  it('Telegram post text', () => {
    expect(telegramPostText({ ...job, pay: 'ETB 30,000 per month' })).toBe('New job: Site engineer in Bole, ETB 30,000 per month. Apply on HagerLand: https://www.hagerland.com/jobs/site-engineer-abc')
    expect(telegramPostText({ ...job, pay: null })).toBe('New job: Site engineer in Bole. Apply on HagerLand: https://www.hagerland.com/jobs/site-engineer-abc')
    expect(telegramPostText({ ...job, privateClient: true, pay: 'ETB 1' })).toBe('Site engineer in Bole, posted by HagerLand for a private client. Apply on HagerLand: https://www.hagerland.com/jobs/site-engineer-abc')
  })
  it('Copy for Telegram is for Owner and Operations only', () => {
    expect(roleCanAccess('operations', '/roodber8/jobs')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/jobs')).toBe(false)
    expect(roleCanAccess('content', '/roodber8/jobs')).toBe(false)
    expect(read('app/roodber8/actions/jobs.ts')).toMatch(/export async function telegramTextAction[\s\S]*?assertAdmin\(AREA\)\s*\n\s*await assertOwnerOrOperations\(\)/)
  })
})

describe('call-back requests (W8–W15)', () => {
  const valid = { name: 'Abebe Kebede', phone: '0911234567', need: '10 masons in Bole', area: 'Bole', language: 'am', time_of_day: 'morning', consent: 'on' }
  it('approved wording, word for word', () => {
    expect(CALLBACK_TEXT.boxHeading).toBe('Prefer to talk? Ask us to call you')
    expect(CALLBACK_TEXT.boxText).toBe("Leave your number and HagerLand's recruitment team will call you about the staff you need. There is no charge to ask.")
    expect([CALLBACK_TEXT.name, CALLBACK_TEXT.phone, CALLBACK_TEXT.need, CALLBACK_TEXT.needHint, CALLBACK_TEXT.area, CALLBACK_TEXT.language, CALLBACK_TEXT.time, CALLBACK_TEXT.abroad, CALLBACK_TEXT.country]).toEqual(['Your name', 'Phone', 'What do you need?', 'For example: 10 masons in Bole from next month.', 'Area', 'Language for the call', 'Best time to call (Addis Ababa time)', 'I am based outside Ethiopia', 'Which country are you in?'])
    expect(CALLBACK_LANGUAGES.map((l) => l.label)).toEqual(['Amharic', 'Afaan Oromo', 'Tigrinya', 'English'])
    expect(CALLBACK_TIMES.map((l) => l.label)).toEqual(['Morning', 'Afternoon', 'Evening', 'Any time'])
    expect(CALLBACK_TEXT.consent).toBe('HagerLand may call me on this number about my request.')
    expect(CALLBACK_TEXT.submit).toBe('Ask for a call')
    expect(CALLBACK_TEXT.thanks).toBe("Thank you. HagerLand's recruitment team will call you. If you miss the call, you can ask again later.")
    expect(CALLBACK_TEXT.tooMany).toBe('You have sent several requests recently. Please try again later.')
    expect(CALLBACK_TEXT.security).toBe('Please complete the security check and try again.')
    expect(CALLBACK_TEXT.unavailable).toBe('Something went wrong. Please refresh the page.')
    expect(CALLBACK_SCRIPT).toBe("Hello, this is HagerLand. Did you ask us to call you about hiring staff? [If no: 'Sorry for the call. We will delete your number.'] We can find and introduce suitable people. Our fee is agreed with you in writing before we start, and candidates never pay anything.")
  })
  it('the form rules: phone normalised, consent required, a country when abroad', () => {
    const ok = callbackSchema.safeParse(valid)
    expect(ok.success && ok.data.phone).toBe('+251911234567')
    expect(ok.success && ok.data.country_code).toBe(null)
    const noConsent = callbackSchema.safeParse({ ...valid, consent: undefined })
    expect(noConsent.success).toBe(false)
    if (!noConsent.success) expect(callbackFieldErrors(noConsent.error)).toEqual({ consent: '' })
    expect(callbackSchema.safeParse({ ...valid, based_abroad: 'on' }).success).toBe(false)
    const abroad = callbackSchema.safeParse({ ...valid, based_abroad: 'on', country_code: 'GB' })
    expect(abroad.success && abroad.data.country_code).toBe('GB')
    expect(callbackSchema.safeParse({ ...valid, country_code: 'GB' }).success && callbackSchema.parse({ ...valid, country_code: 'GB' }).country_code).toBe(null)
    expect(callbackSchema.safeParse({ ...valid, language: 'fr' }).success).toBe(false)
    expect(callbackSchema.safeParse({ ...valid, need: 'x'.repeat(501) }).success).toBe(false)
    const badPhone = callbackSchema.safeParse({ ...valid, phone: '12' })
    if (!badPhone.success) expect(callbackFieldErrors(badPhone.error).phone).toBe('Enter a phone number starting with +251 or 09')
  })
  it('limits', () => {
    expect(CALLBACK_LIMITS).toEqual({ hour: 3, day: 10, perPhoneWeek: 2 })
  })
  it('outcomes: no answer counts tries and closes on the third; wrong number clears and blocks', () => {
    expect(applyOutcome('no_answer', 0)).toEqual({ status: 'open', outcome: null, tries: 1, clearNow: false, block: false })
    expect(applyOutcome('no_answer', 1)).toEqual({ status: 'open', outcome: null, tries: 2, clearNow: false, block: false })
    expect(applyOutcome('no_answer', 2)).toEqual({ status: 'closed', outcome: 'no_answer', tries: 3, clearNow: false, block: false })
    expect(applyOutcome('wrong_number', 1)).toEqual({ status: 'closed', outcome: 'wrong_number', tries: 1, clearNow: true, block: true })
    expect(applyOutcome('spam', 0).status).toBe('closed')
    expect(applyOutcome('no_action', 0)).toMatchObject({ status: 'closed', clearNow: false, block: false })
    expect(blockedUntil(new Date('2026-10-26T00:00:00Z'))).toBe('2026-11-25T00:00:00.000Z')
  })
  it('kept 12 months after the later of the request and the last handling; clearing removes every personal detail', () => {
    expect(callbackClearDue('2026-10-26T09:00:00Z', null).toISOString()).toBe('2027-10-26T09:00:00.000Z')
    expect(callbackClearDue('2026-10-26T09:00:00Z', '2026-12-01T09:00:00Z').toISOString()).toBe('2027-12-01T09:00:00.000Z')
    const c = clearedCallback('2027-10-27T00:00:00Z')
    expect(c).toMatchObject({ name: null, phone: null, need: null, area_text: null, consent_at: null, ip_hash: null, staff_note: null, personal_data_deleted_at: '2027-10-27T00:00:00Z' })
  })
  it('the deletion kind "call-back requests" (dry run counts, live clears)', async () => {
    expect(CLEANUP_KINDS).toContain('callbacks')
    const cleared: string[] = []
    const adapter: CleanupAdapter = {
      countDue: async (k) => (k === 'callbacks' ? 2 : 0),
      listDue: async (k) => (k === 'callbacks' ? ['c1', 'c2'] : []),
      clear: async (k, id) => (cleared.push(`${k}:${id}`), {}),
      countKept: async () => ({ hired: 0, periodNotSet: 0 }),
      trimHeld: async () => 0,
    }
    const dry = await runCleanupCore(adapter, 'dry_run')
    expect(dry.counts.due.callbacks).toBe(2)
    expect(cleared).toEqual([])
    expect(cleanupDigestCounts(dry)).toContainEqual(['Jobs data (dry run): call-back requests whose personal details would be deleted', 2])
    const live = await runCleanupCore(adapter, 'live')
    expect(live.counts.cleared.callbacks).toBe(2)
    expect(cleared).toEqual(['callbacks:c1', 'callbacks:c2'])
  })
  it('the daily job always removes expired blocks, failure-isolated and counted; the digest line', () => {
    const src = read('lib/cron/daily.ts')
    expect(src).toMatch(/const callbackBlocksRemoved = await step\('call-back blocks', \(\) => purgeExpiredCallbackBlocks\(/)
    expect(src).not.toMatch(/cleanupMode[^\n]*purgeExpiredCallbackBlocks/)
    expect(src).toContain("'Call-back requests waiting'")
  })
  it('no email or text message anywhere in the call-back code', () => {
    for (const f of ['lib/callbacks.ts', 'lib/callbacks-data.ts', 'app/actions/callback-actions.ts', 'app/roodber8/actions/jobs-callbacks.ts']) expect(read(f)).not.toMatch(/sendEmail|sms\(|twilio/i)
  })
})

describe('legal wording and the health check', () => {
  it('/privacy: W17 and W18 always, W19 only while Amharic is on', () => {
    const p = read('app/(site)/privacy/page.tsx')
    expect(p).toContain('<li><strong>Call-back requests:</strong> your name, phone number, what you need, your area, the language and time of day you prefer, whether you are based outside Ethiopia, and that you agreed to be called.</li>')
    expect(p).toContain('<li>Call-back requests: deleted 12 months after the request or our last call, whichever is later. If you tell us you did not ask for the call, we delete your number straight away and keep only a coded version for 30 days to stop repeat calls.</li>')
    expect(p).toContain('{amharicOn && <p>This policy is written in English. If a translation differs, the English version applies.</p>}')
  })
  it('/terms: W20 only while Amharic is on', () => {
    expect(read('app/(site)/terms/page.tsx')).toContain('{amharicOn && <p>These terms are written in English. If a translation differs, the English version applies.</p>}')
  })
  it('the health check expects migration 0043', () => {
    expect(EXPECTED_MIGRATIONS[EXPECTED_MIGRATIONS.length - 1]).toBe('0043')
  })
})
