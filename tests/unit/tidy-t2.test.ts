import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// A fake database client for the T2-15 checks: records every `.in(column, ids)` and can fail one request.
const calls: { table: string; column: string; ids: unknown[] }[] = []
let failTable: string | null = null
function builder(table: string) {
  const b: Record<string, unknown> = {}
  const self = () => b
  for (const m of ['select', 'eq', 'neq', 'is', 'not', 'lt', 'lte', 'gt', 'gte', 'order', 'limit', 'range', 'maybeSingle', 'single']) b[m] = self
  b.in = (column: string, ids: unknown[]) => {
    calls.push({ table, column, ids })
    return b
  }
  b.then = (resolve: (v: unknown) => void) => resolve(failTable === table ? { data: null, error: { message: 'boom' } } : { data: [], error: null })
  return b
}
vi.mock('@/lib/supabase/admin', () => ({ getAdminSupabase: () => ({ from: (t: string) => builder(t) }) }))

const read = (p: string) => readFileSync(p, 'utf8')
const ids = (n: number) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)

describe('T2-1: lead fee and commission are the owner’s only, on every service', () => {
  it('the request page shows the fee tool only to the owner', () => {
    const page = read('app/roodber8/service-requests/[id]/page.tsx')
    expect(page).toContain('{owner && (\n                    <div className="mt-3 border-t border-border pt-3">\n                      <MatchCommercialTool')
    expect(page).not.toContain('(!staffing || owner)')
  })
  it('the save action checks the owner first, before anything is read', () => {
    const src = read('app/roodber8/actions/service-requests.ts')
    const body = src.slice(src.indexOf('export async function saveMatchCommercialAction'))
    const check = body.indexOf("if (!(await isOwnerSession())) return fail('Only the owner can see or change fees.')")
    expect(check).toBeGreaterThan(0)
    expect(check).toBeLessThan(body.indexOf('.safeParse('))
    expect(check).toBeLessThan(body.indexOf('getAdminSupabase()'))
    expect(body.indexOf('await assertAdmin(AREA)')).toBeLessThan(check)
  })
})

describe('T2-2: supply quotes are valid for 3 days', () => {
  it('3 days, from the moment the quote was issued', async () => {
    const { QUOTE_VALID_DAYS, quoteValidUntil } = await import('@/lib/listing-rules')
    expect(QUOTE_VALID_DAYS).toBe(3)
    expect(quoteValidUntil('2026-10-28T21:30:00Z').toISOString()).toBe('2026-10-31T21:30:00.000Z')
    // The daily job expires quotes issued more than QUOTE_VALID_DAYS ago.
    expect(read('lib/cron/daily.ts')).toContain(".eq('status', 'quoted').lt('quoted_at', iso(now - QUOTE_VALID_DAYS * DAY))")
  })
  it('the email, Terms and Help say 3 days', async () => {
    const { quoteIssuedEmail } = await import('@/lib/email/templates')
    expect(quoteIssuedEmail({ name: 'Abebe', reference: 'HLQ-2026-000009', totalCents: 100, hasDocument: false, validDays: 3 }).text).toContain('Prices are valid for 3 days unless stated otherwise. Reply to this email or call us to confirm your order and delivery.')
    expect(read('app/(site)/terms/page.tsx')).toContain('Quotes are valid for 3 days unless the quote states otherwise. Prices of volatile materials such as steel and cement are confirmed on each quote.')
    expect(read('lib/content/help.ts')).toContain('Quotes are valid for 3 days unless the quote says otherwise. Prices of steel and cement change often, so we confirm the price on each quote.')
    for (const f of ['app/(site)/terms/page.tsx', 'lib/content/help.ts']) expect(read(f)).not.toMatch(/Quotes are valid for 14 days/)
  })
  it('supplier price validity and provider quotes are untouched', () => {
    expect(read('lib/supply/offers.ts')).not.toContain('QUOTE_VALID_DAYS')
    expect(read('lib/service-requests/labels.ts')).not.toContain('QUOTE_VALID_DAYS')
  })
})

describe('T2-4: a phone-only staffing request only for staff from an open call-back', async () => {
  const { phoneOnlyAllowed } = await import('@/lib/service-requests/phone-only')
  const yes = async () => true
  const no = async () => false
  const base = { categorySlug: 'staffing', callbackId: '11111111-2222-4333-8444-555555555555', staffSession: yes, callbackOpen: yes }
  it('allowed only when all four hold', async () => {
    expect(await phoneOnlyAllowed(base, 'staffing')).toBe(true)
  })
  it('any one missing keeps the email required', async () => {
    expect(await phoneOnlyAllowed({ ...base, categorySlug: 'plumbers' }, 'staffing')).toBe(false)
    expect(await phoneOnlyAllowed({ ...base, callbackId: '' }, 'staffing')).toBe(false)
    expect(await phoneOnlyAllowed({ ...base, callbackId: 'not-a-uuid' }, 'staffing')).toBe(false)
    expect(await phoneOnlyAllowed({ ...base, staffSession: no }, 'staffing')).toBe(false)
    expect(await phoneOnlyAllowed({ ...base, callbackOpen: no }, 'staffing')).toBe(false)
  })
  it('the action uses the staff schema only through that check, and skips every customer email without one', () => {
    const src = read('app/actions/service-request-actions.ts')
    expect(src).toContain('const parsed = (phoneOnly ? phoneOnlySchema : schema).safeParse(')
    expect(src).toMatch(/const schema = fields\.refine\(whereRule, WHERE\)/)
    expect(src).toContain('const link = user || !d.email ? null : newRequestToken()')
    expect(src).toContain('if (d.email) await sendEmail({ to: d.email, ...serviceRequestReceivedEmail(')
    expect(src).toContain('...(d.email ? { replyTo: d.email } : {}),')
  })
})

describe('T2-6: Telegram gets the link once', async () => {
  const { shareLinks, shareText, telegramShareText } = await import('@/lib/jobs-share')
  const job = { title: 'Mason', place: 'Bole', link: 'https://www.hagerland.com/jobs/mason-ab12', privateClient: false }
  it('Telegram: T7 text and the link once; WhatsApp unchanged', () => {
    const l = shareLinks(shareText(job), job.link, telegramShareText(job))
    const tg = decodeURIComponent(l.telegram)
    expect(tg.split(job.link)).toHaveLength(2)
    expect(new URL(l.telegram).searchParams.get('text')).toBe('Mason in Bole. See the job and apply on HagerLand.')
    expect(l.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent('Mason in Bole. See the job and apply on HagerLand: https://www.hagerland.com/jobs/mason-ab12')}`)
    expect(telegramShareText({ ...job, privateClient: true })).toBe('Mason in Bole, posted by HagerLand for a private client. See the job and apply on HagerLand.')
  })
})

describe('T2-7: no time promise for claims', () => {
  it('the claim message and the claim email', async () => {
    const { claimSubmittedEmail } = await import('@/lib/email/templates')
    expect(read('app/actions/claim-actions.ts')).toContain("Thanks. We'll check your claim and email you when it's decided.")
    const mail = claimSubmittedEmail({ name: 'Abebe', orgName: 'Abebe Builders' })
    expect(mail.html).toContain("We check every claim and will email you when it&#39;s decided.")
    for (const t of [read('app/actions/claim-actions.ts'), mail.html, mail.text]) expect(t).not.toMatch(/business day/i)
  })
})

describe('T2-8: the staffing texts stored in the database are review keys', async () => {
  const { STAFFING_DB_KEYS, STAFFING_DB_PLACE } = await import('@/lib/i18n/jobs-db-keys')
  const { jobsKeys } = await import('@/lib/i18n/jobs-keys')
  it('the list matches the 0019 seed (the hidden overseas question left out)', () => {
    const sql = read('supabase/migrations/0019_jobs.sql')
    const seed = sql.slice(sql.indexOf("select p.id, 'staffing', 'Staffing requirement'"))
    const json = JSON.parse(seed.slice(seed.indexOf("'[") + 1, seed.indexOf("]'") + 1)) as { id: string; label: string; options?: string[] }[]
    const fromSeed = ['Staffing requirement', 'Recruitment', ...json.filter((q) => q.id !== 'international').flatMap((q) => [q.label, ...(q.options ?? [])])]
    expect(sql).toContain("values ('Recruitment', 'recruitment'")
    expect([...STAFFING_DB_KEYS].sort()).toEqual(fromSeed.sort())
  })
  it('they are on the review sheet with their place', () => {
    const keys = jobsKeys()
    for (const k of STAFFING_DB_KEYS) expect(keys.get(k), k).toContain(STAFFING_DB_PLACE)
  })
})

describe('T2-9: listing reports are cleared 12 months after the report or the decision', async () => {
  const { clearedListingReport, listingReportClockFrom, LISTING_REPORT_DECISIONS } = await import('@/lib/listing-reports')
  const { CLEANUP_KINDS, cleanupRunText } = await import('@/lib/jobs-cleanup')
  const { deletionCutoff } = await import('@/lib/jobs-privacy')
  it('the clock is the later of the report and the decision (handled_at, else the audit log)', () => {
    expect(listingReportClockFrom('2026-01-01T00:00:00Z', null)).toBe('2026-01-01T00:00:00Z')
    expect(listingReportClockFrom('2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z')).toBe('2026-03-01T00:00:00Z')
    expect(listingReportClockFrom('2026-01-01T00:00:00Z', null, '2026-02-01T00:00:00Z')).toBe('2026-02-01T00:00:00Z')
    expect(listingReportClockFrom('2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBe('2026-03-01T00:00:00Z')
    expect(LISTING_REPORT_DECISIONS).toEqual(['report.actioned', 'report.dismissed'])
  })
  it('due on the first Addis Ababa day 12 months later (midnight in Addis, not UTC)', () => {
    // On 28 Oct 2027 at 00:30 in Addis Ababa (still 27 Oct in UTC), reports decided on 28 Oct 2026 (Addis date) are due:
    // one decided at 23:30 Addis time on 28 Oct 2026 is due, one decided at 00:30 Addis time on 29 Oct 2026 is not yet.
    const cutoff = deletionCutoff(new Date('2027-10-27T21:30:00Z'))
    expect(listingReportClockFrom('2026-10-01T00:00:00Z', '2026-10-28T20:30:00Z') < cutoff).toBe(true)
    expect(listingReportClockFrom('2026-10-01T00:00:00Z', '2026-10-28T21:30:00Z') < cutoff).toBe(false)
  })
  it('clears the details, contact and coded internet address; keeps reason, status, what was reported and the dates', () => {
    expect(clearedListingReport('2027-10-28T00:00:00Z')).toEqual({ details: null, reporter_contact: null, ip_hash: null, personal_data_deleted_at: '2027-10-28T00:00:00Z' })
  })
  it('is its own kind (not "reports", which are job reports) in the shared deletion', () => {
    expect(CLEANUP_KINDS).toContain('listing_reports')
    expect(CLEANUP_KINDS).toContain('reports')
    const zero = Object.fromEntries(CLEANUP_KINDS.map((k) => [k, 0]))
    expect(cleanupRunText('dry_run', { due: { ...zero, listing_reports: 2 } as never, cleared: zero as never, failed: zero as never, cvFilesDeleted: 0 })).toContain('2 listing reports would be cleared')
  })
  it('the admin decision records when it was made, and the deletion reads only these sources', () => {
    expect(read('app/roodber8/actions/moderation.ts')).toContain(".update({ status, handled_at: new Date().toISOString() })")
    const data = read('lib/jobs-cleanup-data.ts')
    expect(data).toContain(".from('reports').update(clearedListingReport(now)).eq('id', id).is('personal_data_deleted_at', null)")
    expect(data).toContain(".from('audit_log').select('entity_id, created_at').eq('entity_type', 'report')")
  })
})

describe('T2-15: long id lists are read in parts of 50, with the failure rule', () => {
  it('ledger summaries (owner) and the orders list ask for at most 50 ids at a time', async () => {
    const { orderSummaries } = await import('@/lib/supply/orders-data')
    calls.length = 0
    await orderSummaries(ids(123))
    const parts = calls.filter((c) => c.table === 'supply_orders' || c.table === 'supply_ledger_entries')
    expect(parts.map((c) => c.ids.length).sort((a, b) => a - b)).toEqual([23, 23, 50, 50, 50, 50])
  })
  it('price counts per partner ask for at most 50 ids at a time', async () => {
    const { offerCounts } = await import('@/lib/supply/offers-data')
    calls.length = 0
    await offerCounts(ids(60))
    expect(calls.filter((c) => c.table === 'supplier_offers').map((c) => c.ids.length)).toEqual([50, 10])
  })
  it('a failed part stops with an error (never an empty list)', async () => {
    const { orderSummaries } = await import('@/lib/supply/orders-data')
    failTable = 'supply_ledger_entries'
    await expect(orderSummaries(ids(3))).rejects.toThrow('Could not read from the database: boom')
    failTable = null
  })
  it('in the Supplies insights every list that grows with the data goes through chunked()', () => {
    const src = read('lib/supply/insights-data.ts')
    const lists = Array.from(src.matchAll(/\.in\('[a-z_]+', ([^,)\]]+)/g)).map((m) => m[1].trim())
    const direct = lists.filter((x) => !['part', 'LIVE_ORDER', 'OPEN_QUOTE'].includes(x) && !x.startsWith("['"))
    // Only the bounded one is left: the partners asked for by the caller (one business on its page).
    expect(direct).toEqual(['opts.orgIds.length ? opts.orgIds : [\'00000000-0000-0000-0000-000000000000\''])
  })
})

describe('T2-10 and T2-13', () => {
  it('long member emails wrap; Remove is 44 px tall', () => {
    const src = read('components/admin/OrgTools.tsx')
    expect(src).toContain('<span className="min-w-0 [overflow-wrap:anywhere]">')
    expect(src).toContain('className="min-h-11 shrink-0 text-caption font-semibold text-error"')
  })
  it('the agency figures follow the failure rule', () => {
    expect(read('lib/admin/agency-reports.ts')).toContain('const [ins, val, vw, off, app, done, deals, ten] = must(await Promise.all([')
  })
})

describe('the health check', () => {
  it('expects migration 0045 (and the later ones)', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS).toContain('0045')
  })
})
