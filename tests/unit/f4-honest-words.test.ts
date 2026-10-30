import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** Fix F-4 + F-7 "Honest words and hygiene": rate limits, checked admin saves, owner-only agency fees, wording rules. */

const state = vi.hoisted(() => ({
  limited: false,
  limits: [] as string[],
  reads: [] as string[],
  rpcs: [] as string[],
  failUpdate: new Set<string>(),
  emptyUpdate: new Set<string>(),
  rows: {} as Record<string, unknown>,
  emails: 0,
  owner: true,
}))

function query(table: string): unknown {
  let op = 'select'
  const answer = () => {
    if (op === 'update' && state.failUpdate.has(table)) return { data: null, count: null, error: { message: 'boom' } }
    if (op === 'update') return { data: state.emptyUpdate.has(table) ? [] : [{ id: 'x' }], count: null, error: null }
    return { data: [], count: 0, error: null }
  }
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(answer()).then(ok, ko)
      if (prop === 'update' || prop === 'upsert') return () => ((op = 'update'), proxy)
      if (prop === 'insert') return () => ((op = 'insert'), proxy)
      if (prop === 'maybeSingle' || prop === 'single') return async () => ({ data: state.rows[table] ?? null, error: null })
      if (prop === 'select' && op === 'select') state.reads.push(table)
      return () => proxy
    },
  })
  return proxy
}
vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: () => ({ from: (t: string) => query(t), rpc: async (fn: string) => (state.rpcs.push(fn), { data: null, error: null }) }),
  getAdminSupabaseDynamic: () => ({ from: (t: string) => query(t) }),
}))
vi.mock('@/lib/supabase/server', () => ({ getServerSupabase: () => ({ from: (t: string) => query(t) }) }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: async (key: string) => (state.limits.push(key), { allowed: !state.limited, remaining: 0 }) }))
vi.mock('@/lib/email/send', () => ({ sendEmail: async () => ((state.emails += 1), true) }))
vi.mock('@/lib/admin/guard', () => ({ assertAdmin: async () => undefined, assertOwnerOrOperations: async () => undefined, audit: async () => undefined, isOwnerSession: async () => state.owner }))
vi.mock('@/lib/admin/notify', () => ({ ownerEmails: async () => ['owner@test.hagerland.invalid'], firstName: async () => 'Abebe' }))
vi.mock('@/lib/revalidate', () => ({ revalidateEntity: () => undefined }))
vi.mock('@/lib/auth', () => ({ requireUser: async () => ({ id: 'user-1', email: 'u@test.hagerland.invalid', email_confirmed_at: '2026-01-01' }), isEmailConfirmed: () => true, getProfile: async () => null }))
vi.mock('@/lib/turnstile', () => ({ isHoneypotFilled: () => false, verifyTurnstileToken: async () => true }))
// QC-2: this account has confirmed the data-transfer notice.
vi.mock('@/lib/data-transfer-server', () => ({ accountConsentRefusal: async () => null, accountConsented: async () => true, recordTransferConsent: async () => undefined }))
vi.mock('@/lib/env', () => ({ isSupabaseConfigured: () => true }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const UUID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  state.limited = false
  state.limits = []
  state.reads = []
  state.rpcs = []
  state.failUpdate = new Set()
  state.emptyUpdate = new Set()
  state.rows = {}
  state.emails = 0
  state.owner = true
})

describe('claims: at most 5 per person per day (B-02)', () => {
  it('the 6th claim is refused with the existing text and nothing is saved', async () => {
    const { submitClaimAction } = await import('@/app/actions/claim-actions')
    state.limited = true
    const form = new FormData()
    form.set('org_id', UUID)
    expect(await submitClaimAction(null, form)).toEqual({ ok: false, error: 'You have sent several requests recently. Please wait a while and try again, or contact us.' })
    expect(state.limits).toEqual(['claim:user-1'])
    expect(state.reads).toEqual([])
    expect(state.emails).toBe(0)
  })
})

describe('/api/views: no inflated counts (B-02)', () => {
  beforeEach(() => vi.stubEnv('IP_HASH_SALT', 'unit-test-salt-1234567890'))
  const request = () => new Request('http://localhost/api/views', { method: 'POST', body: JSON.stringify({ entity_type: 'property', id: UUID }), headers: { 'x-forwarded-for': '203.0.113.9' } })
  it('over the limit: answers 204 quietly and does not count the view', async () => {
    const { POST } = await import('@/app/api/views/route')
    const { NextRequest } = await import('next/server')
    state.limited = true
    const res = await POST(new NextRequest(request()))
    expect(res.status).toBe(204)
    expect(state.rpcs).toEqual([])
    expect(state.limits[0]).toMatch(/^views:/)
  })
  it('under the limit: counted once', async () => {
    const { POST } = await import('@/app/api/views/route')
    const { NextRequest } = await import('next/server')
    const res = await POST(new NextRequest(request()))
    expect(res.status).toBe(204)
    expect(state.rpcs).toEqual(['increment_view'])
  })
})

describe('verification Decline: the save is checked (B7)', () => {
  beforeEach(() => {
    state.rows = { verification_requests: { id: UUID, org_id: 'org', status: 'pending', submitted_by: 'u' }, organisations: { id: 'org', name: 'Abebe Builders' } }
  })
  it('a failed save: "Please try again.", no email', async () => {
    const { declineVerificationAction } = await import('@/app/roodber8/actions/moderation')
    state.failUpdate.add('verification_requests')
    expect(await declineVerificationAction(UUID)).toEqual({ ok: false, error: 'Please try again.' })
    expect(state.emails).toBe(0)
  })
  it('decided meanwhile (nothing saved): "already been decided", no email', async () => {
    const { declineVerificationAction } = await import('@/app/roodber8/actions/moderation')
    state.emptyUpdate.add('verification_requests')
    expect(await declineVerificationAction(UUID)).toEqual({ ok: false, error: 'This request has already been decided.' })
    expect(state.emails).toBe(0)
  })
  it('saved: declined and the business is emailed once', async () => {
    const { declineVerificationAction } = await import('@/app/roodber8/actions/moderation')
    expect(await declineVerificationAction(UUID)).toEqual({ ok: true, data: { message: 'Verification declined.' } })
    expect(state.emails).toBe(1)
  })
})

describe('claim decision: every save is checked (B8)', () => {
  beforeEach(() => {
    state.rows = { claims: { id: UUID, org_id: 'org', user_id: 'u', status: 'pending', claimant_name: 'Abebe Kebede', claimant_email: 'a@test.hagerland.invalid' }, organisations: { id: 'org', name: 'Abebe Builders', slug: 'abebe', verification_level: 'listed' } }
  })
  for (const table of ['organisations', 'profiles', 'claims']) {
    it(`approve: a failed ${table} save gives "Please try again." and no email`, async () => {
      const { claimDecisionAction } = await import('@/app/roodber8/actions/moderation')
      state.failUpdate.add(table)
      expect(await claimDecisionAction(UUID, true)).toEqual({ ok: false, error: 'Please try again.' })
      expect(state.emails).toBe(0)
    })
  }
  it('decided meanwhile: "already been decided", no email', async () => {
    const { claimDecisionAction } = await import('@/app/roodber8/actions/moderation')
    state.emptyUpdate.add('claims')
    expect(await claimDecisionAction(UUID, false)).toEqual({ ok: false, error: 'This claim has already been decided.' })
    expect(state.emails).toBe(0)
  })
  it('all saved: the usual message and one email', async () => {
    const { claimDecisionAction } = await import('@/app/roodber8/actions/moderation')
    expect(await claimDecisionAction(UUID, true)).toEqual({ ok: true, data: { message: 'Abebe Kebede now manages Abebe Builders.' } })
    expect(state.emails).toBe(1)
  })
})

describe('agency fee income is the owner\'s only (C8)', () => {
  it('not the owner: the deals ledger is never read and no figure is returned', async () => {
    const { agencyKpis } = await import('@/lib/admin/agency-reports')
    const k = await agencyKpis(new Date(), { owner: false })
    expect(k.feeIncomeEtb).toBeNull()
    expect(state.reads).not.toContain('deals')
  })
  it('the owner: the ledger is read and the figure returned', async () => {
    const { agencyKpis } = await import('@/lib/admin/agency-reports')
    const k = await agencyKpis(new Date(), { owner: true })
    expect(k.feeIncomeEtb).toBe(0)
    expect(state.reads).toContain('deals')
  })
  it('every caller passes the owner check from the session', () => {
    for (const f of ['app/roodber8/agency/page.tsx', 'app/roodber8/performance/page.tsx', 'app/roodber8/export/[kind]/route.ts']) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).toMatch(/agencyKpis\(.*\{ owner(: await isOwnerSession\(\))? \}\)/)
      expect(src, f).toMatch(/isOwnerSession\(\)/)
      expect(src, f).toMatch(/feeIncomeEtb !== null/)
    }
  })
})

describe('honest words (F-4)', () => {
  it('no Anthropic package or settings are left', () => {
    expect(readFileSync('package.json', 'utf8')).not.toMatch(/anthropic/i)
    expect(readFileSync('lib/env.ts', 'utf8')).not.toMatch(/ANTHROPIC/)
    expect(readFileSync('.env.example', 'utf8')).not.toMatch(/ANTHROPIC/)
  })
  it('the quote email never promises a time, whatever the old setting holds', async () => {
    const { quoteReceivedEmail } = await import('@/lib/email/templates')
    const m = quoteReceivedEmail({ name: 'Meron', reference: 'HLQ-1', itemCount: 2, hasFiles: false })
    expect(m.text).toContain('Our team will reply with a clear price and delivery details.')
    expect(m.text).not.toMatch(/as soon as possible|business day/)
    expect(readFileSync('app/roodber8/settings/page.tsx', 'utf8')).not.toContain('Quote reply time')
    expect(readFileSync('app/roodber8/actions/settings.ts', 'utf8')).not.toContain('quote_response_target')
  })
  it('the emergency preheader and listing email say what happens, not when', async () => {
    const T = await import('@/lib/email/templates')
    const listing = T.listingSubmittedEmail({ name: 'Meron', title: 'Flat in Bole' })
    expect(listing.text).toContain("We review every listing before it goes live, and we'll email you when it's approved.")
    expect(listing.html).toContain('We review every listing before it goes live and email you when it is approved.')
    expect(readFileSync('lib/email/templates.ts', 'utf8')).toContain("'Marked as an emergency: it is looked at first.'")
  })
})
