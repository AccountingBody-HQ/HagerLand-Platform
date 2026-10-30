import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** QC-1a "green and correct" (no migration). */
const read = (p: string) => readFileSync(p, 'utf8')
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))

describe('F2d imports compliance: fields always in the same order', () => {
  it('expired fields follow FIELD_LABEL order whatever order the database returns', async () => {
    const { compliance, TRACKED_FIELDS } = await import('@/lib/imports/compliance')
    const google = (field: string) => ({ field, source: 'google_places', fetchedAt: '2026-08-01T10:00:00Z', clearedAt: null })
    const shuffled = ['lat_lng', 'website', 'name', 'description', 'address_line', 'phone'].map(google)
    const c = compliance({ id: 'x', status: 'draft', claimed: false, sources: shuffled } as never, '2026-10-30')
    expect(c.plan.fields).toEqual([...TRACKED_FIELDS])
  })
})

describe('F4 Addis Ababa days', () => {
  it('a day starts at midnight in Addis Ababa (21:00 UTC the day before)', async () => {
    const { addisDayStart, todayInAddis } = await import('@/lib/supply/shortlist')
    expect(addisDayStart('2026-10-30')).toBe('2026-10-29T21:00:00.000Z')
    expect(todayInAddis(new Date('2026-10-29T22:30:00Z'))).toBe('2026-10-30')
    expect(todayInAddis(new Date('2026-10-29T20:59:00Z'))).toBe('2026-10-29')
  })
  it('the admin pages, counts and exports that cut a day or month use the Addis helpers', () => {
    expect(read('app/roodber8/page.tsx')).toContain('const startOfDay = new Date(addisDayStart(todayInAddis()))')
    expect(read('app/roodber8/demand/page.tsx')).toContain('const month = todayInAddis().slice(0, 7)')
    expect(read('app/roodber8/export/[kind]/route.ts')).toContain('const start = new Date(addisDayStart(`${month}-01`))')
    for (const f of ['app/roodber8/managed-properties/[id]/page.tsx', 'app/roodber8/supply/partners/page.tsx', 'lib/supply/offers-data.ts', 'lib/supply/data.ts', 'lib/maintenance.ts', 'components/admin/PromotionTools.tsx', 'components/admin/SupplyAgreements.tsx', 'app/roodber8/supply/ledger/export/route.ts', 'app/roodber8/supply/settlements/export/route.ts', 'app/roodber8/reports/supply-settlements/export/route.ts', 'app/roodber8/trade-accounts/prices/export/route.ts', 'app/roodber8/audit/page.tsx'])
      expect(read(f), f).not.toMatch(/new Date\(\)\.toISOString\(\)\.slice\(0, (10|7)\)|setUTCHours\(0, 0, 0, 0\)/)
  })
})

describe('F5 spam check', () => {
  it('the field has an unusual name; the old name still counts', async () => {
    const { HONEYPOT_FIELD, LEGACY_HONEYPOT_FIELD } = await import('@/lib/honeypot')
    expect(HONEYPOT_FIELD).toBe('hl_zq9')
    expect(HONEYPOT_FIELD).not.toMatch(/name|mail|phone|tel|web|url|site|address|company/i)
    const { isHoneypotFilled } = await import('@/lib/turnstile')
    const fd = (k?: string) => {
      const f = new FormData()
      f.set('name', 'Abebe')
      if (k) f.set(k, 'spam')
      return f
    }
    expect(isHoneypotFilled(fd())).toBe(false)
    expect(isHoneypotFilled(fd(HONEYPOT_FIELD))).toBe(true)
    expect(isHoneypotFilled(fd(LEGACY_HONEYPOT_FIELD))).toBe(true)
  })
  it('the shared field carries the autofill-off hints, off-screen (not display:none)', () => {
    const c = read('components/forms/FormParts.tsx')
    for (const a of ['tabIndex={-1}', 'autoComplete="off"', 'data-1p-ignore="true"', 'data-lpignore="true"', 'data-bwignore="true"', 'data-form-type="other"', 'aria-hidden', 'absolute -left-[9999px]']) expect(c).toContain(a)
    const start = c.indexOf('export function Honeypot')
    const block = c.slice(start, c.indexOf('\nexport ', start + 10)).replace(/\/\/.*$/gm, '')
    expect(block).not.toMatch(/className="hidden|display:\s*none|type="hidden"/)
  })
  it('a drop key holds only the form and the hour', async () => {
    const { spamDropKey } = await import('@/lib/spam-check')
    expect(spamDropKey('submit_enquiry', new Date('2026-10-30T09:41:12Z'))).toBe('submit_enquiry 2026-10-30T09')
    expect(spamDropKey('a b@c', new Date('2026-10-30T09:41:12Z'))).toBe('abc 2026-10-30T09')
  })
  it('every server action that checked the honeypot now counts the drop and answers exactly as before', () => {
    const files = walk('app').filter((f) => /\.ts$/.test(f))
    const old = files.filter((f) => read(f).includes('isHoneypotFilled('))
    expect(old).toEqual([])
    const doors = files.flatMap((f) => (read(f).match(/if \(await spamCheckDrop\(formData, '[a-z_]+'\)\) return ok\(/g) ?? []).map(() => f))
    expect(doors.length).toBe(23)
    // Every form that renders the shared field posts to one of these actions (the component is unchanged otherwise).
    const forms = walk('components').filter((f) => read(f).includes('<Honeypot'))
    expect(forms.length).toBe(20)
  })
  it('the digest has the approved line and leaves the drops out of the error list', () => {
    const d = read('lib/cron/daily.ts')
    expect(d).toContain("['Messages stopped by the spam check in the last 24 hours', spamDropsSince(since)]")
    expect(d).toContain(".neq('route', SPAM_DROP_ROUTE)")
  })
})

describe('F6 account pages: a failed read is said, never shown as "nothing yet"', () => {
  it('the sentence is the one "My quotes" uses, with the page\'s own words', () => {
    expect(read('app/(account)/account/quotes/page.tsx')).toContain('We could not load your quotes just now. Please refresh the page.')
    expect(read('components/account/LoadFailed.tsx')).toContain('We could not load {what} just now. Please refresh the page.')
  })
  it('every account page read keeps its error', () => {
    const pages = walk('app/(account)/account').filter((f) => f.endsWith('page.tsx'))
    const bare = pages.flatMap((f) => (read(f).match(/const \{ data(: \w+)? \} = await (getServerSupabase\(\)|getAdminSupabase\(\)|supabase|query)/g) ?? []).map((m) => `${f}: ${m}`))
    // What is left degrades gracefully, never to "nothing yet": names fall back to the email, a missing cover to no photo.
    expect(bare.sort()).toEqual(
      [
        'app/(account)/account/company/team/page.tsx: const { data: profiles } = await db',
        'app/(account)/account/listings/page.tsx: const { data: covers } = ids.length',
      ].filter((x) => bare.includes(x)),
    )
    const nouns = ['your service requests', 'your job applications', 'your developments', 'your products', 'candidates', 'your building projects', 'your jobs', 'your saved items', 'your team', 'your enquiries', 'your listings', 'your search alerts', 'your portfolio', 'your branches', 'your verification', 'this request', 'this enquiry', 'this product', 'this project', 'this job']
    const all = pages.map(read).join('\n')
    for (const n of nouns) expect(all, n).toContain(`what="${n}"`)
  })
})

describe('F8 legal dates follow the switches', () => {
  it('the date shown is the latest of the code date, the override and the switch date (every combination)', async () => {
    const { latestLegalDate } = await import('@/lib/content/legal-dates')
    const W = '2026-10-29'
    const cases: [unknown, unknown, string][] = [
      [null, null, W],
      ['', undefined, W],
      ['2026-11-05', null, '2026-11-05'],
      ['2026-10-01', null, W],
      [null, '2026-11-05', '2026-11-05'],
      [null, '2026-10-01', W],
      ['2026-11-05', '2026-11-10', '2026-11-10'],
      ['2026-11-10', '2026-11-05', '2026-11-10'],
      ['2026-10-01', '2026-10-02', W],
      ['not a date', 42, W],
    ]
    for (const [override, switched, want] of cases) expect(latestLegalDate(W, override, switched), JSON.stringify([override, switched])).toBe(want)
  })
  it('every switch that shows or hides /privacy or /terms text moves the right page(s), in either direction', async () => {
    const { LEGAL_PAGES_FOR_SETTING, legalPagesChanged, withLegalSwitchDate } = await import('@/lib/content/legal-dates')
    expect(LEGAL_PAGES_FOR_SETTING).toEqual({
      supply_partner_registration: ['privacy'],
      supply_catalogue_ordering: ['terms', 'privacy'],
      jobs_private_client_posts: ['terms'],
      jobs_recruitment_desk: ['terms'],
      jobs_reports_enabled: ['terms'],
      jobs_amharic: ['terms', 'privacy'],
      amharic_enabled: ['terms', 'privacy'],
    })
    expect(legalPagesChanged('supply_catalogue_ordering', false, true)).toEqual(['terms', 'privacy'])
    expect(legalPagesChanged('supply_catalogue_ordering', true, false)).toEqual(['terms', 'privacy'])
    expect(legalPagesChanged('supply_catalogue_ordering', true, true)).toEqual([])
    for (const k of ['supply_trade_pricing', 'home_business_row', 'jobs_phone_apply', 'jobs_worker_register', 'jobs_callbacks', 'org_verification_expiry']) expect(legalPagesChanged(k, false, true), k).toEqual([])
    expect(withLegalSwitchDate({ terms: '2026-10-01', junk: 'x' }, ['privacy'], '2026-10-30')).toEqual({ terms: '2026-10-01', privacy: '2026-10-30' })
    expect(withLegalSwitchDate(null, ['terms', 'privacy'], '2026-10-30')).toEqual({ terms: '2026-10-30', privacy: '2026-10-30' })
  })
  it('the legal pages show only those switches (find every door)', () => {
    const privacy = read('app/(site)/privacy/page.tsx')
    const terms = read('app/(site)/terms/page.tsx')
    expect(privacy.match(/supplySwitches\.\w+/g)?.sort()).toEqual(['supplySwitches.catalogueOrdering', 'supplySwitches.registration'])
    expect(Array.from(new Set(terms.match(/(supplySwitches|jobsSwitches)\.\w+/g))).sort()).toEqual(['jobsSwitches.privateClientPosts', 'jobsSwitches.recruitmentDesk', 'jobsSwitches.reportsEnabled', 'supplySwitches.catalogueOrdering'])
    expect(read('lib/content/legal.ts')).toContain('return s.amharic_enabled === true || s.jobs_amharic === true')
  })
  it('the switch actions write the date first, in the same action and audit entry; never into the override boxes', () => {
    for (const f of ['app/roodber8/actions/supply-switches.ts', 'app/roodber8/actions/jobs-phase-2.ts', 'app/roodber8/actions/settings.ts']) {
      const c = read(f)
      expect(c, f).toContain('markLegalSwitchChange(')
      expect(c.indexOf('markLegalSwitchChange('), f).toBeLessThan(c.indexOf(".from('site_settings').upsert(", c.indexOf('markLegalSwitchChange(')))
      expect(c, f).toContain('legal_dates: legal')
    }
    const legal = read('lib/content/legal.ts')
    expect(legal).not.toMatch(/legal_last_updated'[^)]*upsert|upsert\(\{ key: 'legal_last_updated'/)
    expect(read('lib/content/legal-dates.ts')).toContain("export const LEGAL_SWITCH_KEY = 'legal_switch_changed'")
  })
  it('the new key is never public (not in the public settings view)', () => {
    const views = readdirSync('supabase/migrations').map((f) => read(`supabase/migrations/${f}`)).join('\n')
    expect(views).not.toContain('legal_switch_changed')
  })
  it('/privacy text changed in this job: its date is the release date; /terms and /cookies unchanged', async () => {
    const { LEGAL_WRITTEN } = await import('@/lib/content/legal')
    expect(LEGAL_WRITTEN).toEqual({ terms: '2026-10-29', privacy: '2026-10-30', cookies: '2026-10-14' })
    expect(read('app/(site)/privacy/page.tsx')).toContain('<li>Market appraisal requests, viewings, offers and applications to rent: 24 months after the last activity, unless they lead to a sale or tenancy, which we keep for as long as the law requires for our records.</li>')
  })
})

describe('F10 valuations and agency contacts', () => {
  const cutoff = '2024-10-30T21:00:00.000Z'
  const oldTs = '2024-09-01T10:00:00Z'
  const newTs = '2025-01-01T10:00:00Z'
  const v = (over: Record<string, unknown>) => ({ status: 'completed', created_at: oldTs, updated_at: oldTs, appointment_at: null, address_line: 'House 1', details: 'x', notes: null, report_path: null, preferred_times: null, time_zone: null, ip_hash: null, ...over }) as never
  it('a valuation: finished, 24 months after the latest activity, its instruction not open, something left to clear', async () => {
    const { valuationDue } = await import('@/lib/retention')
    expect(valuationDue(v({}), cutoff, false)).toBe(true)
    expect(valuationDue(v({ status: 'cancelled' }), cutoff, false)).toBe(true)
    expect(valuationDue(v({ status: 'booked' }), cutoff, false)).toBe(false)
    expect(valuationDue(v({ status: 'requested' }), cutoff, false)).toBe(false)
    expect(valuationDue(v({}), cutoff, true)).toBe(false)
    expect(valuationDue(v({ appointment_at: newTs }), cutoff, false)).toBe(false)
    expect(valuationDue(v({ updated_at: newTs }), cutoff, false)).toBe(false)
    expect(valuationDue(v({ address_line: null, details: null, notes: null, report_path: null }), cutoff, false)).toBe(false)
  })
  it('a contact: 24 months after the latest activity on it or anything linked, nothing linked open, not already cleared', async () => {
    const { agencyContactDue, REMOVED_EMAIL } = await import('@/lib/retention')
    const c = (over: Record<string, unknown> = {}) => ({ name: 'Abebe Kebede', email: null, phone: '+251911000000', created_at: oldTs, updated_at: oldTs, ...over }) as never
    expect(agencyContactDue(c(), cutoff, [])).toBe(true)
    expect(agencyContactDue(c(), cutoff, [{ updated_at: oldTs, open: false }])).toBe(true)
    expect(agencyContactDue(c(), cutoff, [{ updated_at: oldTs, open: true }])).toBe(false)
    expect(agencyContactDue(c(), cutoff, [{ updated_at: newTs, open: false }])).toBe(false)
    expect(agencyContactDue(c({ updated_at: newTs }), cutoff, [])).toBe(false)
    expect(agencyContactDue(c({ name: 'Removed', email: REMOVED_EMAIL, phone: null }), cutoff, [])).toBe(false)
  })
  it("a cleared valuation's clearing is not activity for its contact", async () => {
    const { valuationActivity } = await import('@/lib/retention')
    const base = { status: 'completed', created_at: oldTs, updated_at: '2026-10-30T06:00:00Z', appointment_at: null, address_line: null, details: null, notes: null, report_path: null, preferred_times: null, time_zone: null, ip_hash: null }
    expect(valuationActivity(base)).toBe(oldTs)
    expect(valuationActivity({ ...base, details: 'x' })).toBe('2026-10-30T06:00:00Z')
    expect(valuationActivity({ ...base, status: 'booked' })).toBe('2026-10-30T06:00:00Z')
  })
  it('clearing keeps the reference, dates, status, outcome and amounts, and satisfies every column rule', async () => {
    const { clearedValuation, clearedAgencyContact, OPEN_AGENCY, FINISHED_VALUATION } = await import('@/lib/retention')
    expect(clearedValuation).toEqual({ address_line: null, details: null, notes: null, report_path: null, preferred_times: null, time_zone: null, ip_hash: null })
    for (const k of ['reference', 'status', 'outcome', 'value_low_etb', 'value_high_etb', 'created_at', 'appointment_at', 'purpose']) expect(Object.keys(clearedValuation)).not.toContain(k)
    // agency_contacts: name 2–120 characters; an email or a phone (agency_contacts_reachable); the email never reaches anyone.
    expect(clearedAgencyContact).toMatchObject({ name: 'Removed', email: 'removed@removed.invalid', phone: null })
    for (const k of ['reference', 'roles', 'created_at', 'marketing_consent']) expect(Object.keys(clearedAgencyContact)).not.toContain(k)
    expect(FINISHED_VALUATION).toEqual(['completed', 'cancelled'])
    expect(OPEN_AGENCY.instruction).not.toContain('completed')
    expect(OPEN_AGENCY.tenancy).toEqual(['active', 'ending'])
  })
  it('both kinds run under the shared owner switch with their own digest lines', async () => {
    const { RETENTION_KINDS } = await import('@/lib/retention')
    const { KIND_LABEL, cleanupDigestCounts, CLEANUP_KINDS } = await import('@/lib/jobs-cleanup')
    expect(RETENTION_KINDS).toEqual(expect.arrayContaining(['agency_valuations', 'agency_contacts']))
    expect(KIND_LABEL.agency_valuations).toBe('valuation requests')
    expect(KIND_LABEL.agency_contacts).toBe('agency contacts')
    const zero = Object.fromEntries(CLEANUP_KINDS.map((k) => [k, 0]))
    const dry = cleanupDigestCounts({ mode: 'dry_run', counts: { due: { ...zero, agency_valuations: 3 }, cleared: zero, failed: zero, cvFilesDeleted: 0 }, failures: [] } as never)
    expect(dry).toContainEqual(['Data clean-up (dry run): 3 valuation requests whose personal details would be deleted', 3])
    const live = cleanupDigestCounts({ mode: 'live', counts: { due: zero, cleared: { ...zero, agency_contacts: 2 }, failed: { ...zero, agency_contacts: 1 }, cvFilesDeleted: 0 }, failures: [] } as never)
    expect(live).toContainEqual(['Data clean-up: personal details deleted from 2 agency contacts', 2])
    expect(live).toContainEqual(['1 agency contacts could not be cleared (retried tomorrow)', 1])
  })
  it('the report file is deleted only under the agency prefix; nothing is ever deleted from these tables', () => {
    const d = read('lib/retention-data.ts')
    expect(d).toContain('await removeFiles([v.report_path], [DELETABLE_PREFIXES.agency])')
    expect(d).not.toMatch(/from\('agency_(valuations|contacts)'\)\.delete\(/)
  })
  it('the switches page has the approved line', () => {
    expect(read('app/roodber8/jobs/data/page.tsx')).toContain("['Valuations and agency contacts', 'Address, details, notes, report, preferred times, time zone and IP code cleared 24 months after the last activity, once completed or cancelled; never while an instruction or tenancy is open.']") // QC-2 (T2)
  })
})

describe('F14 audit-log CSV period', () => {
  it('the last 90 Addis days by default; a chosen period; To before From refused', async () => {
    const { auditCsvRange } = await import('@/lib/admin/audit-range')
    expect(auditCsvRange(null, null, '2026-10-30')).toEqual({ from: '2026-08-02', to: '2026-10-30' })
    expect(auditCsvRange('2026-01-01', '2026-03-31', '2026-10-30')).toEqual({ from: '2026-01-01', to: '2026-03-31' })
    expect(auditCsvRange('2026-01-01', null, '2026-10-30')).toEqual({ from: '2026-01-01', to: '2026-10-30' })
    expect(auditCsvRange('bad', 'worse', '2026-10-30')).toEqual({ from: '2026-08-02', to: '2026-10-30' })
    expect(auditCsvRange('2026-10-30', '2026-10-01', '2026-10-30')).toBeNull()
  })
  it('the export reads every row of the period (readAll), From and To included, in Addis days', () => {
    const r = read('app/roodber8/export/[kind]/route.ts')
    expect(r).toContain(".gte('created_at', addisDayStart(range.from)).lt('created_at', addisDayStart(daysBefore(range.to, -1)))")
  })
})

describe('F3 merge search', () => {
  it('the same choices as the old list (same kind, not itself, not archived), at most 20, no 500 limit, no filter-string interpolation', () => {
    const a = read('app/roodber8/actions/organisations.ts')
    expect(a).toContain(".from('organisations').select('id, name, short_id').eq('kind', source.kind).neq('id', source.id).neq('status', 'archived')")
    expect(a).toContain(".ilike('name', `%${escapeLikePattern(q)}%`)")
    const body = a.slice(a.indexOf('export async function searchMergeTargetsAction'))
    expect(body.slice(0, 300)).toMatch(/\): Promise<ActionResult<\{ results: \{ id: string; label: string \}\[\] \}>> \{\n\s+await assertAdmin\(AREA\)/)
    expect(read('app/roodber8/organisations/[id]/page.tsx')).not.toContain('.limit(500)')
  })
})

describe('F9, F11, F15', () => {
  it('admin skip link and named logo link; /jobs filter is no longer a nested landmark', () => {
    const l = read('app/roodber8/layout.tsx')
    expect(l).toContain('<a href="#main"')
    expect(l).toContain('Skip to content')
    expect(l).toContain('aria-label="HagerLand admin"')
    expect(read('app/(site)/jobs/page.tsx')).not.toContain('<aside')
  })
  it('a global teardown resets every known switch on the local copy', async () => {
    const t = read('e2e/global.teardown.ts')
    expect(read('playwright.config.ts')).toContain("globalTeardown: './e2e/global.teardown.ts'")
    for (const k of ['amharic_enabled', 'home_business_row', 'imports_cleanup_mode', 'jobs_amharic', 'jobs_callbacks', 'jobs_data_cleanup_mode', 'jobs_phone_apply', 'jobs_private_client_posts', 'jobs_recruitment_desk', 'jobs_reports_enabled', 'jobs_worker_register', 'org_verification_expiry', 'supply_catalogue_ordering', 'supply_partner_registration', 'supply_payment_details', 'supply_trade_pricing', "'our-developments'", 'legal_switch_changed']) expect(t, k).toContain(k)
  })
  it('CLAUDE.md: run the unit suite again after committing', () => {
    expect(read('CLAUDE.md')).toContain('After committing, run the unit suite once more before pushing (some tests only read committed files).')
  })
})
