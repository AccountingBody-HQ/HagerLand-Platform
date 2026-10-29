import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { deletionRequestsLine, fallbackLine, failedStepsLine, lastRunStatus, NOTHING_TODAY, NO_RECENT_RUN, problemKind, runLine } from '@/lib/cron/digest-text'

vi.mock('server-only', () => ({}))

// A fake database: every query answers "nothing", except the tables in `failing`, which answer with an error.
const failing = new Set<string>()
const counts = new Map<string, number>()
const inserts: { table: string; row: Record<string, unknown> }[] = []
function query(table: string): unknown {
  const answer = () => (failing.has(table) ? { data: null, count: null, error: { message: 'permission denied' } } : { data: [], count: counts.get(table) ?? 0, error: null })
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(answer()).then(ok, ko)
      if (prop === 'insert') return (row: Record<string, unknown>) => (inserts.push({ table, row }), proxy)
      return () => proxy
    },
  })
  return proxy
}
vi.mock('@/lib/supabase/admin', () => ({ getAdminSupabase: () => ({ from: (t: string) => query(t), rpc: (fn: string) => query(`rpc:${fn}`), storage: { from: () => ({ remove: async () => ({ error: null }) }) } }) }))

const sent: { to: string | string[]; subject: string; text: string }[] = []
let sendWorks = true
vi.mock('@/lib/email/send', () => ({ sendEmail: async (m: { to: string; subject: string; text: string }) => (sent.push(m), sendWorks) }))
vi.mock('@/lib/log', () => ({ log: { info: () => undefined, warn: () => undefined, error: () => undefined } }))
vi.mock('@/lib/alerts', () => ({ runScheduledAlerts: async () => 0 }))
vi.mock('@/lib/email/outbox', () => ({ retryOutbox: async () => ({ sent: 0 }) }))
vi.mock('@/lib/imports/compliance-data', () => ({ runImportsCleanup: async () => null, importsDigestCounts: () => [] }))
vi.mock('@/lib/jobs-cleanup-data', () => ({ runJobsDataCleanup: async () => null }))
vi.mock('@/lib/jobs-desk-cron', () => ({ runDeskDaily: async () => ({ moved: 0 }), deskDigestCounts: async () => [] }))
vi.mock('@/lib/verification-data', () => ({ runVerificationDaily: async () => null, verificationDigestCounts: async () => [] }))
vi.mock('@/lib/job-reports-data', () => ({ jobReportDigestCounts: async () => [] }))
vi.mock('@/lib/callbacks-data', () => ({ purgeExpiredCallbackBlocks: async () => 0, waitingCallbacks: async () => 0 }))
vi.mock('@/lib/jobs-insights-data', () => ({ quietJobCount: async () => 0 }))
let feesFail = false
vi.mock('@/lib/jobs-fee-report-data', () => ({ feesOwedOver30Days: async () => { if (feesFail) throw new Error('Could not read from the database: permission denied'); return 0 } }))
vi.mock('@/lib/admin/demand', () => ({ demandDigestLine: async () => null }))
vi.mock('@/lib/supply/insights-data', () => ({ supplyDigestCounts: async () => [] }))
vi.mock('@/lib/revalidate', () => ({ revalidateEntity: () => undefined }))

const HOUR = 3_600_000
// Wednesday 28 Oct 2026, 06:00 UTC (London is on GMT again from 25 Oct: 06:00). Monday 2 Nov 2026 for the backup reminder.
const WEDNESDAY = Date.parse('2026-10-28T06:00:00Z')
const MONDAY = Date.parse('2026-11-02T06:00:00Z')

beforeEach(() => {
  failing.clear()
  counts.clear()
  inserts.length = 0
  sent.length = 0
  sendWorks = true
  feesFail = false
  process.env.ADMIN_DIGEST_EMAIL = 'admin@test.hagerland.invalid'
})

describe('F-2 digest texts', () => {
  it('first line: when the job ran (UTC and London) and how many steps worked and failed', () => {
    expect(runLine(new Date(WEDNESDAY), 21, 0)).toBe('Daily job ran at 06:00 UTC (06:00 London time): 21 steps OK, 0 failed.')
    expect(runLine(new Date('2026-07-01T06:00:00Z'), 20, 1)).toBe('Daily job ran at 06:00 UTC (07:00 London time): 20 steps OK, 1 failed.')
    expect(runLine(new Date(WEDNESDAY), 1, 2)).toBe('Daily job ran at 06:00 UTC (06:00 London time): 1 step OK, 2 failed.')
  })
  it('names the failed steps, or nothing when all worked', () => {
    expect(failedStepsLine([])).toBeNull()
    expect(failedStepsLine(['reveals purge', 'expire jobs'])).toBe('Steps that failed: reveals purge, expire jobs.')
  })
  it('account deletion requests: count and oldest age; urgent from 21 days; nothing when none', () => {
    expect(deletionRequestsLine(0, null, WEDNESDAY)).toBeNull()
    expect(deletionRequestsLine(2, new Date(WEDNESDAY - 5 * 24 * HOUR).toISOString(), WEDNESDAY)).toEqual({ line: ['Account deletion requests waiting', '2 (oldest 5 days; promised within 30)'], urgent: false })
    expect(deletionRequestsLine(1, new Date(WEDNESDAY - 20 * 24 * HOUR - HOUR).toISOString(), WEDNESDAY)?.urgent).toBe(false)
    expect(deletionRequestsLine(1, new Date(WEDNESDAY - 21 * 24 * HOUR).toISOString(), WEDNESDAY)).toEqual({ line: ['URGENT: Account deletion requests waiting', '1 (oldest 21 days; promised within 30)'], urgent: true })
    expect(deletionRequestsLine(1, new Date(WEDNESDAY - 3 * HOUR).toISOString(), WEDNESDAY)?.line[1]).toBe('1 (oldest 0 days; promised within 30)')
  })
  it('the fallback reason names the kind of problem only, never its message (no data or secrets)', () => {
    expect(problemKind(new Error('Could not read from the database: relation "profiles" abebe@example.com'))).toBe('a database read failed')
    expect(problemKind(new Error('More than 200,000 rows: narrow the period or the filter.'))).toBe('too many rows to read')
    expect(problemKind(new TypeError('cannot read x of secret-token-123'))).toBe('an unexpected error (TypeError)')
    expect(problemKind('a string')).toBe('an unexpected error')
    expect(fallbackLine(new Error('key sk_live_123'))).toBe('Daily job ran but the summary could not be built: an unexpected error.')
    expect(fallbackLine(new Error('key sk_live_123'))).not.toContain('sk_live')
  })
})

describe('F-2 last daily run (admin home)', () => {
  const record = (hoursAgo: number) => ({ created_at: new Date(WEDNESDAY - hoursAgo * HOUR).toISOString(), diff: { steps_ok: 21, steps_failed: 1, digest_sent: true } })
  it('shows the last run in London time with its counts', () => {
    expect(lastRunStatus(record(0), WEDNESDAY)).toEqual({ line: 'Last daily run: 28 Oct 2026, 06:00 (London) — 21 steps OK, 1 failed, digest sent.', warning: false })
  })
  it('warns only after 26 hours: 25 h 59 no warning, 26 h 01 warning', () => {
    expect(lastRunStatus(record(25 + 59 / 60), WEDNESDAY).warning).toBe(false)
    expect(lastRunStatus(record(26), WEDNESDAY).warning).toBe(false)
    expect(lastRunStatus(record(26 + 1 / 60), WEDNESDAY).warning).toBe(true)
  })
  it('warns when no run was ever recorded', () => {
    expect(lastRunStatus(null, WEDNESDAY)).toEqual({ line: null, warning: true })
    expect(NO_RECENT_RUN).toBe('The daily job has not run in the last 26 hours — check Vercel (RUNBOOK §11).')
  })
})

describe('F-2 the daily job always sends the digest', () => {
  const run = async (now: number, opts = {}) => (await import('@/lib/cron/daily')).runDaily(now, opts)

  it('with nothing to report: the run line first, then "Nothing needs your attention today."', async () => {
    const summary = await run(WEDNESDAY)
    expect(summary.digestSent).toBe(true)
    expect(summary.failedSteps).toEqual([])
    expect(sent).toHaveLength(1)
    const text = sent[0].text
    expect(text.indexOf('Daily job ran at 06:00 UTC (06:00 London time):')).toBeGreaterThan(-1)
    expect(text).toMatch(new RegExp(`Daily job ran at 06:00 UTC \\(06:00 London time\\): ${summary.stepsOk} steps OK, 0 failed\\.\\s+${NOTHING_TODAY}`))
    expect(text).not.toContain('Could not read')
    expect(text).not.toContain('Weekly reminder')
  })

  it('a failed step and an unreadable count: run line shows 1 failed, the step named, "Could not read: …"', async () => {
    failing.add('contact_reveals')
    failing.add('partner_applications')
    const summary = await run(WEDNESDAY)
    expect(summary.failedSteps).toEqual(['reveals purge'])
    const text = sent[0].text
    expect(text).toContain(`${summary.stepsOk} steps OK, 1 failed.`)
    expect(text).toContain('Steps that failed: reveals purge.')
    expect(text).toContain('Could not read: Partner applications to review')
    expect(text).not.toContain(NOTHING_TODAY)
    // "Could not read" lines come first, before the usual lines.
    expect(text.indexOf('Could not read')).toBeLessThan(text.indexOf('Open admin'))
  })

  it('a failed section is named, never left out', async () => {
    feesFail = true
    await run(WEDNESDAY)
    expect(sent[0].text).toContain('Could not read: Recruitment fees owed for over 30 days')
  })

  it('counts above zero are listed as before, and the account deletion line appears', async () => {
    counts.set('claims', 3)
    counts.set('profiles', 2)
    await run(WEDNESDAY)
    expect(sent[0].text).toContain('Claims to decide: 3')
    expect(sent[0].text).toContain('Account deletion requests waiting: 2 (oldest 0 days; promised within 30)')
    expect(sent[0].text).toContain('Here is what needs attention today.')
  })

  it('the digest-building failure sends the minimal fallback email', async () => {
    const summary = await run(WEDNESDAY, { failDigestForTest: true })
    expect(summary.digestSent).toBe(true)
    expect(sent).toHaveLength(1)
    expect(sent[0].text).toContain('Daily job ran but the summary could not be built: an unexpected error (TypeError).')
    expect(sent[0].text).toContain('Daily job ran at 06:00 UTC')
  })

  it('the Monday backup reminder is still there (Addis Ababa Monday)', async () => {
    await run(MONDAY)
    expect(sent[0].text).toContain('Weekly reminder: run the backup (RUNBOOK §1).')
  })

  it('records each run in audit_log (cron.daily: steps OK, failed, digest sent)', async () => {
    failing.add('contact_reveals')
    sendWorks = false
    const summary = await run(WEDNESDAY)
    const rec = inserts.find((i) => i.table === 'audit_log' && i.row.action === 'cron.daily')
    expect(rec?.row).toMatchObject({ actor: 'daily job', entity_type: 'cron', diff: { steps_ok: summary.stepsOk, steps_failed: 1, failed_steps: ['reveals purge'], digest_sent: false } })
  })
})

describe('F-2 source checks', () => {
  const read = (p: string) => readFileSync(p, 'utf8')
  it('the cron route forces the fallback only in the local test environment', () => {
    expect(read('app/api/cron/daily/route.ts')).toContain("process.env.HL_TEST_ENV === '1' && request.headers.get('x-test-fail-digest') === '1'")
  })
  it('the admin layout counts per role and never reads a count the role cannot open', () => {
    const src = read('app/roodber8/layout.tsx')
    expect(src).toContain('await menuBadges(role)')
    expect(src).not.toContain('.count ?? 0')
  })
  it('the admin home, review queue counts and digest apply the failure rule', () => {
    expect(read('app/roodber8/page.tsx')).toContain('must(await Promise.all([')
    expect(read('lib/admin/counts.ts')).toContain('must(await Promise.all([')
    expect(read('lib/cron/daily.ts')).not.toMatch(/if \(lines\.length\)/)
  })
  it('error pages for the account area and admin reuse the existing ErrorPanel texts', () => {
    const site = read('app/(site)/error.tsx')
    for (const p of ['app/(account)/error.tsx', 'app/roodber8/error.tsx']) {
      const src = read(p)
      for (const text of ['code="Something went wrong"', 'title="This page didn\'t load properly"', 'message="It\'s on our side, not yours. Please try again. If it keeps happening, contact us and we\'ll fix it."']) {
        expect(site).toContain(text)
        expect(src).toContain(text)
      }
    }
  })
})

describe('F-2 menu counts by role', () => {
  const load = () => import('@/lib/admin/counts')
  it('each role is counted only the areas it may open (new: Enquiries, Call-back requests, Partner applications, Users)', async () => {
    const { badgeKeysFor } = await load()
    const sorted = (r: Parameters<typeof badgeKeysFor>[0]) => badgeKeysFor(r).sort()
    // S6-1 added partner registrations and partner product drafts (owner and operations).
    const all = ['agency', 'callbacks', 'care', 'email', 'enquiries', 'interest', 'partnerDrafts', 'partnerRegistrations', 'partners', 'quotes', 'requests', 'review', 'reviews', 'trade', 'users']
    expect(sorted(null)).toEqual(all)
    expect(sorted('owner')).toEqual(all)
    expect(sorted('agent')).toEqual(['agency', 'enquiries', 'review'])
    expect(sorted('operations')).toEqual(['callbacks', 'care', 'partnerDrafts', 'partnerRegistrations', 'quotes', 'requests', 'reviews', 'trade'])
    expect(sorted('content')).toEqual([])
  })
  it('a count that cannot be read is null ("!"), the others still count', async () => {
    const { menuBadges } = await load()
    failing.add('partner_applications')
    counts.set('profiles', 2)
    const badges = await menuBadges(null, WEDNESDAY)
    expect(badges.partners).toBeNull()
    expect(badges.users).toBe(2)
    expect(badges.quotes).toBe(0)
    // The review count fails as a whole when any of its tabs cannot be read.
    failing.add('claims')
    expect((await menuBadges('agent', WEDNESDAY)).review).toBeNull()
  })
  it('never returns a count for an area the role cannot open', async () => {
    const { menuBadges } = await load()
    counts.set('profiles', 2)
    for (const role of ['agent', 'operations', 'content'] as const) {
      const badges = await menuBadges(role, WEDNESDAY)
      expect(Object.keys(badges)).not.toContain('users')
      expect(Object.keys(badges)).not.toContain('partners')
    }
  })
})
