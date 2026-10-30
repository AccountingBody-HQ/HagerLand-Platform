import { readFileSync, readdirSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** QC-2 seller-ready (AB's LR-1 decisions): consent tick, account notice, payment methods, receipts, unlock, wording. */

const read = (p: string) => readFileSync(p, 'utf8')

const state = vi.hoisted(() => ({
  owner: true,
  inserts: [] as { table: string; row: unknown }[],
  updates: [] as { table: string; row: unknown }[],
  audits: [] as string[],
  failInsert: false,
  errorsRow: null as { id: string; count: number } | null,
  methods: [] as { id: string; name: string; instructions: string; active: boolean; sort_order: number; created_at: string }[],
}))

function chain(table: string) {
  const c: Record<string, unknown> = {}
  for (const k of ['select', 'eq', 'in', 'order', 'limit', 'gte', 'neq']) c[k] = () => c
  c.maybeSingle = async () => ({ data: table === 'errors' ? state.errorsRow : null, error: null })
  c.single = async () => ({ data: { id: '99999999-9999-4999-8999-999999999999' }, error: null })
  c.range = async () => ({ data: table === 'supply_payment_methods' ? state.methods : [], error: null })
  c.insert = (row: unknown) => {
    state.inserts.push({ table, row })
    const res = { error: state.failInsert && table === 'data_transfer_consents' ? { message: 'down' } : null }
    const r: Record<string, unknown> = { ...res, select: () => r, single: async () => ({ data: { id: 'new-id' }, error: res.error }), then: (f: (v: unknown) => unknown) => f(res) }
    return r
  }
  c.update = (row: unknown) => {
    state.updates.push({ table, row })
    const r: Record<string, unknown> = { eq: () => r, then: (f: (v: unknown) => unknown) => f({ error: null }) }
    return r
  }
  c.then = (f: (v: unknown) => unknown) => f({ data: [], error: null })
  return c
}

vi.mock('@/lib/supabase/admin', () => ({ getAdminSupabase: () => ({ from: (t: string) => chain(t) }) }))
vi.mock('@/lib/admin/guard', () => ({
  assertAdmin: async () => undefined,
  assertOwner: async () => {
    if (!state.owner) throw new Error('owner only')
  },
  adminActor: async () => 'test',
  audit: async (action: string) => void state.audits.push(action),
}))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }))
vi.mock('@/lib/log', () => ({ log: { error: () => undefined, warn: () => undefined, info: () => undefined } }))

beforeEach(() => {
  state.owner = true
  state.inserts = []
  state.updates = []
  state.audits = []
  state.failInsert = false
  state.errorsRow = null
  state.methods = []
})

const W17 = 'I agree that HagerLand stores my details on secure servers outside Ethiopia (mainly in the European Union) to provide this service.'

// Every public form that collects personal details (QC-2 2.5): action file, honeypot form name(s) (none: no honeypot),
// and the component(s) that show the tick.
const PUBLIC_FORMS: { action: string; forms: string[]; components: string[] }[] = [
  { action: 'app/actions/enquiry-actions.ts', forms: ['submit_enquiry'], components: ['components/enquiry/EnquiryForm.tsx'] },
  { action: 'app/actions/report-actions.ts', forms: ['submit_report'], components: ['components/enquiry/ReportForm.tsx'] },
  { action: 'app/actions/quote-actions.ts', forms: ['submit_quote'], components: ['components/supplies/QuoteRequestForm.tsx'] },
  { action: 'app/actions/service-request-actions.ts', forms: ['submit_service_request'], components: ['components/service-requests/ServiceRequestForm.tsx'] },
  { action: 'app/actions/agency-actions.ts', forms: ['request_valuation', 'book_viewing', 'make_offer', 'apply_to_rent'], components: ['components/agency/AgencyForms.tsx'] },
  { action: 'app/actions/property-care-actions.ts', forms: ['request_property_care'], components: ['components/diaspora/PropertyCareForm.tsx'] },
  { action: 'app/actions/interest-actions.ts', forms: ['submit_interest', 'submit_partner'], components: ['components/verticals/InterestForm.tsx', 'components/verticals/PartnerForm.tsx'] },
  { action: 'app/actions/job-phone-actions.ts', forms: ['apply_by_phone', 'join_worker_register'], components: ['components/jobs/PhoneApplyForm.tsx', 'components/jobs/WorkerRegisterForm.tsx'] },
  { action: 'app/actions/callback-actions.ts', forms: ['submit_callback'], components: ['components/jobs/CallbackForm.tsx'] },
  { action: 'app/actions/job-report-actions.ts', forms: ['submit_job_report'], components: ['components/jobs/ReportJob.tsx'] },
  { action: 'app/actions/partner-registration-actions.ts', forms: ['submit_partner_registration'], components: ['components/supply/PartnerRegistrationForm.tsx'] },
  { action: 'app/actions/order-request-actions.ts', forms: ['submit_order_request'], components: ['components/supply/OrderRequestForm.tsx'] },
  { action: 'app/actions/trade-order-actions.ts', forms: ['submit_trade_order'], components: ['components/supply/OrderRequestForm.tsx'] },
  { action: 'app/actions/newsletter-actions.ts', forms: ['subscribe_newsletter'], components: ['components/advice/NewsletterForm.tsx'] },
  { action: 'app/(account)/auth-actions.ts', forms: ['sign_up'], components: ['components/auth/SignupFlow.tsx'] },
  { action: 'app/actions/job-actions.ts', forms: [], components: ['components/jobs/ApplyForm.tsx'] },
]

describe('W17: the shared data-transfer tick', () => {
  it('approved text, error and version; checked from the form data, never trusted', async () => {
    const m = await import('@/lib/data-transfer')
    expect(m.TRANSFER_CONSENT_TEXT).toBe(W17)
    expect(m.TRANSFER_CONSENT_ERROR).toBe('Tick the box to continue.')
    expect(m.TRANSFER_CONSENT_VERSION).toBe('w17-2026-10')
    const fd = new FormData()
    expect(m.transferConsentMissing(fd)).toEqual({ ok: false, error: 'Please check the highlighted fields.', fieldErrors: { transfer_consent: 'Tick the box to continue.' } })
    fd.set('transfer_consent', 'off')
    expect(m.transferConsentMissing(fd)).not.toBeNull()
    fd.set('transfer_consent', 'on')
    expect(m.transferConsentMissing(fd)).toBeNull()
  })
  it('built once: one shared component, required, with the form error', () => {
    const parts = read('components/forms/FormParts.tsx')
    expect(parts).toContain('export function TransferConsent({ error, label }: { error?: string; label?: string })')
    expect(parts).toContain('name={TRANSFER_CONSENT_FIELD} label={label ?? TRANSFER_CONSENT_TEXT} required')
  })
  it('every public form: the server checks the tick right after the spam check (a honeypot drop writes nothing), and records consent after saving', () => {
    for (const f of PUBLIC_FORMS) {
      const code = read(f.action)
      for (const form of f.forms) {
        const spam = code.indexOf(`spamCheckDrop(formData, '${form}'))`)
        expect(spam, `${f.action} ${form}`).toBeGreaterThan(0)
        const next = code.slice(code.indexOf('\n', spam) + 1, code.indexOf('\n', spam) + 120)
        expect(next, `${f.action} ${form}`).toMatch(/^ {2}const noConsent = transferConsentMissing\(formData\)\n {2}if \(noConsent\) return noConsent\n/)
      }
      expect(code, f.action).toContain('transferConsentMissing(formData)')
      expect(code, f.action).toMatch(/recordTransferConsent\(\{ form: '/)
      for (const c of f.components) expect(read(c), c).toContain('<TransferConsent error={errors.transfer_consent}')
    }
  })
  it('the agency forms show the tick on all four forms', () => {
    expect(read('components/agency/AgencyForms.tsx').match(/<Footer errors=\{errors\}/g)).toHaveLength(4)
  })
  it('a consent row holds no personal data; a failed write never fails the visitor and is counted for the digest', async () => {
    const { recordTransferConsent } = await import('@/lib/data-transfer-server')
    await recordTransferConsent({ form: 'enquiry', subjectTable: 'enquiries', subjectId: '11111111-1111-4111-8111-111111111111', subjectReference: 'HLE-2026-000001' })
    expect(state.inserts).toEqual([{ table: 'data_transfer_consents', row: { form: 'enquiry', subject_table: 'enquiries', subject_id: '11111111-1111-4111-8111-111111111111', subject_reference: 'HLE-2026-000001', consent_version: 'w17-2026-10' } }])
    state.inserts = []
    state.failInsert = true
    await expect(recordTransferConsent({ form: 'enquiry', subjectTable: 'enquiries' })).resolves.toBeUndefined()
    expect(state.inserts.map((i) => i.table)).toEqual(['data_transfer_consents', 'errors'])
    expect(state.inserts[1].row).toMatchObject({ route: 'transfer_consent_failed', message: expect.stringMatching(/^enquiry \d{4}-\d{2}-\d{2}T\d{2}$/) })
  })
  it('the digest line, shown only above 0 like the other counts', () => {
    const d = read('lib/cron/daily.ts')
    expect(d).toContain("['Data-transfer consent records that failed to save in the last 24 hours', consentFailuresSince(since)],")
    expect(d).toContain(".neq('route', CONSENT_FAILED_ROUTE)")
  })
})

describe('the account notice for existing accounts', () => {
  it('approved wording; shown at the top of every account page until confirmed; sign-up writes the row for new accounts', async () => {
    const { ACCOUNT_CONSENT_TEXT } = await import('@/lib/data-transfer')
    expect(ACCOUNT_CONSENT_TEXT).toEqual({ heading: 'To keep using your account, please confirm:', button: 'Confirm', refusal: 'Please confirm the notice at the top of your account first.' })
    const layout = read('app/(account)/account/layout.tsx')
    expect(layout).toContain('const consented = await accountConsented(user.id)')
    expect(layout).toContain('{!consented && <AccountConsentNotice />}')
    const action = read('app/(account)/account/consent-actions.ts')
    expect(action).toContain("recordTransferConsent({ form: 'account_notice', subjectTable: 'profiles', subjectId: user.id })")
    expect(read('app/(account)/auth-actions.ts')).toContain("recordTransferConsent({ form: 'sign_up', subjectTable: 'profiles', subjectId: signed.user.id })")
  })
  it('signed-in-only forms refuse until the notice is confirmed (server checks)', () => {
    for (const f of [
      'app/actions/claim-actions.ts',
      'app/(account)/account/company/verification/actions.ts',
      'app/actions/build-project-actions.ts',
      'app/actions/trade-actions.ts',
      'app/actions/saved-search-actions.ts',
      'app/actions/repair-actions.ts',
      'app/actions/owner-actions.ts',
      'app/actions/team-actions.ts',
      'app/actions/job-actions.ts',
    ])
      expect(read(f), f).toMatch(/const (consentRefusal|refusal) = await accountConsentRefusal\(user\.id\)\n {2}if \((consentRefusal|refusal)\) return fail\((consentRefusal|refusal)\)/)
  })
  it('an unreadable consent table never locks people out (counts as confirmed)', () => {
    const s = read('lib/data-transfer-server.ts')
    expect(s).toMatch(/if \(error\) \{\n {4}log\.error\('data-transfer', 'account consent could not be read', error\)\n {4}return true\n {2}\}/)
  })
})

describe('W18, W19: age', () => {
  it('sign-up: the 18+ sentence on the terms tick, and the W17 tick separately', () => {
    const s = read('components/auth/SignupFlow.tsx')
    expect(s).toContain('I am 18 or older and I agree to the{\' \'}')
    expect(s).toContain('<TransferConsent error={errors.transfer_consent} />')
  })
  it('online job application and candidate profile: required "I am 18 or older", checked on the server', () => {
    for (const c of ['components/jobs/ApplyForm.tsx', 'components/jobs/CandidateForm.tsx']) expect(read(c), c).toContain("name=\"adult\" label={t('I am 18 or older')} required")
    const a = read('app/actions/job-actions.ts')
    expect(a.match(/if \(formData\.get\('adult'\) !== 'on'\) return fail\('Please check the highlighted fields\.', \{ adult: TRANSFER_CONSENT_ERROR \}\)/g)).toHaveLength(2)
  })
})

describe('payment methods (owner only)', () => {
  it('Operations, Agent and Content are refused by every action; nothing is written', async () => {
    const a = await import('@/app/roodber8/actions/payment-methods')
    state.owner = false
    const id = '11111111-1111-4111-8111-111111111111'
    await expect(a.createPaymentMethodAction({ name: 'telebirr', instructions: 'x' })).rejects.toThrow('owner only')
    await expect(a.updatePaymentMethodAction(id, { name: 'telebirr', instructions: 'x' })).rejects.toThrow('owner only')
    await expect(a.setPaymentMethodActiveAction(id, false)).rejects.toThrow('owner only')
    await expect(a.movePaymentMethodAction(id, 'up')).rejects.toThrow('owner only')
    expect(state.inserts).toEqual([])
    expect(state.updates).toEqual([])
  })
  it('the owner adds, edits, hides and reorders, each audited; there is no delete', async () => {
    const a = await import('@/app/roodber8/actions/payment-methods')
    expect(await a.createPaymentMethodAction({ name: ' telebirr ', instructions: 'Pay to 0911 000 000' })).toEqual({ ok: true, data: { message: 'Payment method added.' } })
    expect(state.inserts[0]).toMatchObject({ table: 'supply_payment_methods', row: { name: 'telebirr', instructions: 'Pay to 0911 000 000', sort_order: 0, created_by: 'test' } })
    expect(await a.createPaymentMethodAction({ name: '', instructions: 'x' })).toEqual({ ok: false, error: 'Enter a name' })
    const m1 = '11111111-1111-4111-8111-111111111111'
    const m2 = '22222222-2222-4222-8222-222222222222'
    state.methods = [
      { id: m1, name: 'telebirr', instructions: 'a', active: true, sort_order: 0, created_at: '2026-10-30T00:00:00Z' },
      { id: m2, name: 'CBE Birr', instructions: 'b', active: true, sort_order: 1, created_at: '2026-10-30T00:01:00Z' },
    ]
    expect((await a.updatePaymentMethodAction(m1, { name: 'telebirr', instructions: 'new' })).ok).toBe(true)
    expect((await a.setPaymentMethodActiveAction(m1, false)).ok).toBe(true)
    expect((await a.movePaymentMethodAction(m2, 'up')).ok).toBe(true)
    expect(state.updates.slice(-2)).toEqual([
      { table: 'supply_payment_methods', row: { sort_order: 0 } },
      { table: 'supply_payment_methods', row: { sort_order: 1 } },
    ])
    expect(state.audits).toEqual(['supply.payment_method.created', 'supply.payment_method.updated', 'supply.payment_method.deactivated', 'supply.payment_method.reordered'])
    expect(read('app/roodber8/actions/payment-methods.ts')).not.toMatch(/\.delete\(/)
  })
  it('owner-only page, menu entry for the owner only (no staff role has the area), 6-year audit keeping', async () => {
    const page = read('app/roodber8/supply/payment-methods/page.tsx')
    expect(page).toContain("if (!(await isOwnerSession())) redirect('/roodber8?denied=1')")
    const { roleCanAccess } = await import('@/lib/admin/roles')
    for (const role of ['operations', 'agent', 'content'] as const) expect(roleCanAccess(role, '/roodber8/supply/payment-methods'), role).toBe(false)
    expect(roleCanAccess('owner', '/roodber8/supply/payment-methods')).toBe(true)
    expect(read('components/admin/admin-nav-items.ts')).toContain("{ href: '/roodber8/supply/payment-methods', label: 'Payment methods', icon: Wallet }")
    const { auditKeeping } = (await import('@/lib/retention')) as unknown as { auditKeeping?: (a: string) => string }
    const { AUDIT_SIX_YEARS } = await import('@/lib/retention')
    expect(AUDIT_SIX_YEARS).toEqual(expect.arrayContaining(['supply.payment_method.', 'supply.payment.receipt_number_set']))
    if (auditKeeping) for (const x of ['supply.payment_method.created', 'supply.payment_method.reordered', 'supply.payment.receipt_number_set']) expect(auditKeeping(x)).toBe('six_years')
  })
  it('customers see the active methods in order, then the approved reference line', async () => {
    const { activeInOrder, referenceLine, methodsAsText, PAYMENT_METHODS_TEXT } = await import('@/lib/supply/payment-methods')
    const list = activeInOrder([
      { id: 'b', name: 'CBE Birr', instructions: '100', active: true, sortOrder: 2 },
      { id: 'c', name: 'Old bank', instructions: 'x', active: false, sortOrder: 0 },
      { id: 'a', name: 'telebirr', instructions: '0911', active: true, sortOrder: 1 },
    ])
    expect(list.map((m) => m.name)).toEqual(['telebirr', 'CBE Birr'])
    expect(methodsAsText(list)).toBe('telebirr\n0911\n\nCBE Birr\n100')
    expect(referenceLine('HLR-2026-000001')).toBe('Include your order reference HLR-2026-000001 with your payment.')
    expect(PAYMENT_METHODS_TEXT).toEqual({ title: 'Payment methods', add: 'Add a payment method', name: 'Name', instructions: 'How to pay (shown to customers)', active: 'Active', up: 'Move up', down: 'Move down', save: 'Save', empty: 'No payment methods yet. Add at least one before ordering can be switched on.' })
    const page = read('app/(site)/supplies/order-requests/[key]/page.tsx')
    expect(page).toContain("const methods = r.status === 'reserved' ? await activePaymentMethods() : []")
    expect(page).toContain('<p className="mt-3">{referenceLine(r.reference)}</p>')
    expect(page).not.toContain('readPaymentDetails')
  })
  it('the old single payment-details setting is no longer read by customer pages, emails or the switch; its Settings help text says so', () => {
    for (const f of ['app/(site)/supplies/order-requests/[key]/page.tsx', 'lib/supply/order-requests-data.ts', 'app/roodber8/actions/supply-switches.ts', 'app/roodber8/actions/order-requests.ts', 'app/roodber8/supply/order-requests/[id]/page.tsx']) expect(read(f), f).not.toMatch(/readPaymentDetails|supply_payment_details/)
    expect(read('app/roodber8/settings/page.tsx')).toContain('No longer used. Payment methods are now managed in Supplies → Payment methods.')
    expect(read('app/roodber8/actions/settings.ts')).toContain("rows.push({ key: 'supply_payment_details', value: p.data.supply_payment_details })")
  })
})

describe('receipt numbers', () => {
  it('entered with a payment (optional), added or corrected later by the owner as a new entry, audited', async () => {
    const a = read('app/roodber8/actions/order-requests.ts')
    expect(a).toContain("receipt_number: z.string().trim().max(64, 'Use 64 characters or fewer').optional().default(''),")
    expect(a).toContain('    receipt_number: d.receipt_number || null,')
    const set = a.slice(a.indexOf('export async function setReceiptNumberAction'), a.indexOf('/** Owner: correct a mistaken entry'))
    expect(set).toContain('await assertOwner()')
    expect(set).toContain(".from('order_request_payment_receipts').insert(")
    expect(set).toContain("await audit('supply.payment.receipt_number_set',")
    expect(set).not.toMatch(/\.update\(/)
    const tools = read('components/admin/OrderRequestTools.tsx')
    expect(tools).toContain("const RECEIPT_LABEL = 'Receipt number'")
    expect(tools).toContain("const RECEIPT_HINT = 'The official receipt number for this payment (from the sales register or e-invoice).'")
    expect(read('app/roodber8/supply/order-requests/[id]/page.tsx')).toContain("{e.receiptNumber ? ` · receipt ${e.receiptNumber}` : ''}")
  })
  it('W14: the paid email names the receipt only when one is recorded', async () => {
    const { orderRequestPaidEmail } = await import('@/lib/email/templates')
    expect(orderRequestPaidEmail({ reference: 'HLR-1', amount: 'ETB 100', receiptNumber: 'FS-000123' }).text).toContain('Thank you. We received ETB 100 for HLR-1. Your receipt number is FS-000123. We will contact you to arrange delivery.')
    expect(orderRequestPaidEmail({ reference: 'HLR-1', amount: 'ETB 100', receiptNumber: null }).text).toContain('Thank you. We received ETB 100 for HLR-1. We will contact you to arrange delivery.')
    expect(orderRequestPaidEmail({ reference: 'HLR-1', amount: 'ETB 100' }).text).not.toContain('receipt')
  })
})

describe('the owner unlock for catalogue ordering and trade price agreements', () => {
  it('needs an active payment method and the company name; trade also needs catalogue ordering; other switches unaffected', async () => {
    const { unlockMissing, unlockLine, UNLOCK_TEXT } = await import('@/lib/supply/partner-rules')
    const none = { activePaymentMethods: 0, legalName: '', catalogueOrdering: false }
    expect(unlockMissing('catalogueOrdering', none)).toEqual(['add an active payment method in Supplies → Payment methods', 'enter the company name in Settings → Legal entity'])
    expect(unlockMissing('catalogueOrdering', { ...none, activePaymentMethods: 1 })).toEqual(['enter the company name in Settings → Legal entity'])
    expect(unlockMissing('catalogueOrdering', { ...none, legalName: '  ' })).toEqual(['add an active payment method in Supplies → Payment methods', 'enter the company name in Settings → Legal entity'])
    expect(unlockMissing('catalogueOrdering', { activePaymentMethods: 1, legalName: 'HagerLand LTD', catalogueOrdering: false })).toEqual([])
    expect(unlockMissing('tradePricing', { activePaymentMethods: 1, legalName: 'HagerLand LTD', catalogueOrdering: false })).toEqual(['switch on Catalogue ordering first'])
    expect(unlockMissing('registration', none)).toEqual([])
    expect(unlockMissing('homeBusinessRow', none)).toEqual([])
    expect(UNLOCK_TEXT.ready).toBe('Can be switched on: an active payment method and the company name in Settings are in place.')
    expect(unlockLine([])).toBe(UNLOCK_TEXT.ready)
    expect(unlockLine(['add an active payment method in Supplies → Payment methods'])).toBe('Cannot be switched on yet: add an active payment method in Supplies → Payment methods.')
  })
  it('checked on the server at the moment of switching, before the legal date and the switch are saved; old lock and old note gone', () => {
    const a = read('app/roodber8/actions/supply-switches.ts')
    expect(a.indexOf('unlockMissing(parsed.data.which, await readUnlockFacts())')).toBeLessThan(a.indexOf('markLegalSwitchChange('))
    expect(a).not.toContain('NOT_YET_USED')
    const page = read('app/roodber8/supply/switches/page.tsx')
    expect(page).not.toContain('Waits for HagerLand Ltd (Ethiopia), a bank account and VAT registration.')
    expect(page).toContain('{unlockLine(unlockMissing(r.which, facts))}')
    const facts = read('lib/supply/partner-switches.ts')
    expect(facts).toContain("db.from('supply_payment_methods').select('id', { count: 'exact', head: true }).eq('active', true)")
    expect(facts).toContain("db.from('site_settings').select('value').eq('key', 'legal_entity').maybeSingle()")
  })
})

describe('legal dates: W37 and W8 wiring', () => {
  it('jobs_reports_enabled moves the /terms date; catalogue ordering still moves /terms and /privacy', async () => {
    const { LEGAL_PAGES_FOR_SETTING, legalPagesChanged } = await import('@/lib/content/legal-dates')
    expect(LEGAL_PAGES_FOR_SETTING.jobs_reports_enabled).toEqual(['terms'])
    expect(legalPagesChanged('jobs_reports_enabled', true, false)).toEqual(['terms'])
    expect(LEGAL_PAGES_FOR_SETTING.supply_catalogue_ordering).toEqual(['terms', 'privacy'])
    const action = read('app/roodber8/actions/jobs-phase-2.ts')
    expect(action).toContain("reports: REPORTS_SWITCH_KEY,")
    expect(action).toContain('markLegalSwitchChange(key, before?.value ?? false, parsed.data.on)')
    expect(action).toContain("if (parsed.data.which === 'reports') revalidatePath('/terms')")
  })
})

describe('W5, W6: the company', () => {
  it('brand constants added, existing ones unchanged', async () => {
    const { brand } = await import('@/lib/brand')
    expect(brand.legalName).toBe('HagerLand LTD')
    expect(brand.legalAddress).toBe('Addis Ababa, Ethiopia')
    expect(brand.name).toBe('HagerLand')
    expect(brand.supportLine).toBe('Buy, rent, build and manage property in Ethiopia, with partners we check, wherever you live.')
  })
  it('every email footer has the company line before "Questions?" (HTML and text); plain paragraphs render as before', async () => {
    const { renderEmail } = await import('@/lib/email/layout')
    const m = renderEmail({ subject: 'S', preheader: 'P', heading: 'H', paragraphs: ['One & two'], reason: 'Because.' })
    expect(m.html).toContain('Because.<br>HagerLand LTD, Addis Ababa, Ethiopia<br>Questions?')
    expect(m.html).toContain('<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#152238">One &amp; two</p>')
    expect(m.text.split('\n').slice(-3)).toEqual(['Because.', 'HagerLand LTD, Addis Ababa, Ethiopia', 'Contact HagerLand: https://www.hagerland.com/contact'])
    const list = renderEmail({ subject: 'S', preheader: 'P', heading: 'H', paragraphs: ['How to pay:', { items: [{ title: 'telebirr', text: 'Pay 0911 <x>' }] }, 'After.'], reason: 'R' })
    expect(list.html).toContain('<li style="margin:0 0 8px"><strong>telebirr</strong><br><span style="white-space:pre-line">Pay 0911 &lt;x&gt;</span></li>')
    expect(list.text).toContain('How to pay:\n\ntelebirr\nPay 0911 <x>\n\nAfter.')
  })
  it('site-wide Organization JSON-LD has the legal name and an Addis Ababa, Ethiopia address', async () => {
    const { organizationJsonLd } = await import('@/lib/seo')
    expect(organizationJsonLd([])).toMatchObject({ '@type': 'Organization', name: 'HagerLand', legalName: 'HagerLand LTD', address: { '@type': 'PostalAddress', addressLocality: 'Addis Ababa', addressCountry: 'ET' } })
  })
})

describe('approved wording W1–W41, verbatim', () => {
  const terms = read('app/(site)/terms/page.tsx')
  const privacy = read('app/(site)/privacy/page.tsx')
  const cookies = read('app/(site)/cookies/page.tsx')
  it('/terms', () => {
    expect(terms).toContain('Some products on {brand.name} are sold by other businesses. Their product pages say “Sold by” and the business name, and the contract for those products is between you and that business.')
    expect(terms).not.toContain('HagerLand is the seller. A reservation holds stock until the time shown.')
    expect(terms).toContain('These terms are governed by the laws of the Federal Democratic Republic of Ethiopia, and the courts of Addis Ababa deal with any dispute. If you are a consumer living outside Ethiopia, you keep any rights that the law where you live gives you and that cannot be removed by agreement.')
    expect(terms).not.toContain('legal.governingLaw')
    for (const li of [
      'When you buy from {brand.divisions.supply}, the seller is {brand.legalName}, {brand.legalAddress}.',
      'Prices are in Ethiopian Birr (ETB) and include VAT.',
      'When we reserve your order, we tell you the total and how long the reservation lasts. A reservation ends automatically if we do not receive your payment by then, and you are not charged.',
      'Pay only by one of the payment methods shown on your order page, and include your order reference. We give you an official receipt for every payment.',
      'We deliver in Addis Ababa. Your goods become yours, and our responsibility for them ends, when they are delivered.',
      'Please check your goods when they arrive. If anything is missing, damaged or not what you ordered, tell us as soon as you can.',
      'You can cancel before we confirm delivery is on its way, and we refund what you paid by the same method. After that, we accept returns of goods that are faulty or not what you ordered.',
      'Nothing in these terms affects your rights under Ethiopian consumer law.',
    ])
      expect(terms).toContain(`<li>${li}</li>`)
    expect(terms).toContain('{supplySwitches.catalogueOrdering && (\n          <TextSection title={n(`Buying from ${brand.divisions.supply}`)}>')
    expect(terms).toContain('When we say we check listings, partners or businesses, we mean we review them before they appear and make the checks described on our How it works page. A check is not a guarantee.')
    expect(terms).toContain('If a change significantly affects you, we will tell you before it applies.')
    expect(terms).toContain('{jobsSwitches.reportsEnabled && <p>Anyone can report a job; HagerLand reviews reports and may pause or remove a job.</p>}')
    expect(terms).toContain('{brand.name}® is a registered trade mark of AccountingBody Ltd in the United Kingdom. The {brand.name} name, logo and site design are protected, and you may not use them without written permission. You keep ownership of the content you upload')
  })
  it('/privacy', () => {
    expect(privacy).toContain('{brand.legalName}, {brand.legalAddress}, runs {brand.name} and is responsible for your personal information. For people in the UK, AccountingBody Ltd is our UK contact. To ask about your information, <Link href="/contact">contact us</Link>.')
    expect(privacy).not.toContain('LegalEntity')
    expect(privacy).toContain('We use your information because we need it to provide what you ask for (accounts, enquiries, quotes, requests and orders); because you agreed (news and offers, storing your details outside Ethiopia, introductions to employers); because the law requires it (tax and accounting records); or to keep {brand.name} safe (reviews, fraud and spam checks).')
    expect(privacy).toContain('Cloudflare (bot protection), Google (maps on listing pages, only when you open one), our map image provider (map pages) and YouTube (development videos, only when you play one). They process data only on our instructions.')
    expect(privacy).toContain('Our database and files are kept on servers in the European Union (Ireland). Our hosting, email and bot-check providers may process information in other countries, including the United States. We ask for your agreement before storing your details outside Ethiopia, and we use providers that commit in their terms to keep information secure.')
    expect(privacy).toContain('download a copy of the main details in your account (My account → Settings → Download my data); for a copy of everything else we hold about you, <Link href="/contact">contact us</Link>. You can also ask us to correct or delete your information, and object to marketing.')
    expect(privacy).toContain('If you are unhappy with how we handle your information, please tell us first. You can also complain to the Ethiopian Communications Authority, which oversees personal data protection in Ethiopia, or, if you are in the UK, to the Information Commissioner&apos;s Office (ICO).')
    expect(privacy).toContain('<TextSection title="Children">\n          <p>{brand.name} is for adults. You must be 18 or older to create an account or to apply for work through {brand.name}.</p>')
    expect(privacy.indexOf('title="Children"')).toBeGreaterThan(privacy.indexOf('title="Your rights"'))
    expect(privacy).toContain('<li>Market appraisal requests, viewings, offers and applications to rent:')
  })
  it('/cookies', () => {
    expect(cookies).toContain('keep you signed in to your account (up to 400 days).')
    expect(cookies).toContain('remembers which of your businesses you are working as (1 year).')
    expect(cookies).toContain('It holds short codes, not personal details (until you close your browser).')
    expect(cookies).toContain('HagerLand staff have a separate sign-in cookie for the admin area (8 hours). Visitors never get it.')
    expect(cookies).toContain('may set a cookie when a form is shown, to tell people from bots.')
    expect(cookies).toContain('<TextSection title="Maps and videos">\n          <p>If you open a Google map on a listing or play a development video, Google or YouTube may set its own cookies. Map pages load map images from our map image provider, which receives your internet address. These load only when you use them.</p>')
    expect(cookies.indexOf('Maps and videos')).toBeLessThan(cookies.indexOf('title="Analytics"'))
  })
  it('the cookie lifetimes stated match the code', () => {
    expect(read('node_modules/@supabase/ssr/dist/main/utils/constants.js')).toContain('maxAge: 400 * 24 * 60 * 60')
    expect(read('app/(account)/account/company/org-actions.ts')).toContain('maxAge: 60 * 60 * 24 * 365')
    expect(read('app/api/views/route.ts')).toContain("{ httpOnly: true, sameSite: 'lax', secure: true, path: '/' })")
    expect(read('app/api/views/route.ts')).not.toMatch(/maxAge|expires/)
    expect(read('lib/admin-auth.ts')).toContain('const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours')
    for (const f of readdirSync('lib/supabase')) expect(read(`lib/supabase/${f}`), f).not.toMatch(/maxAge|cookieOptions/)
  })
  it('supplies, product, trade, order and email texts (W2, W7, W9–W16)', async () => {
    const product = read('app/(site)/supplies/product/[slug]/page.tsx')
    expect(product).toContain('{p.seller_is_hagerland ? <Badge tone="gold">Sold by {brand.divisions.supply}</Badge> : p.seller_name ? <Badge tone="gold">Sold by {p.seller_name}</Badge> : null}')
    expect(product).toContain('Prices include VAT. They change often — we confirm today&apos;s price on your quote.')
    const order = read('components/supply/OrderRequestForm.tsx')
    expect(order).toMatch(/By sending, you accept our\{' '\}\n\s+<Link href="\/terms" className="underline">\n\s+Terms\n\s+<\/Link>\{' '\}\n\s+and\{' '\}\n\s+<Link href="\/privacy" className="underline">\n\s+Privacy Policy\n\s+<\/Link>\n\s+\./)
    expect(read('components/supplies/TradeOrderPanel.tsx')).toContain('<OrderRequestTermsLine />')
    const T = await import('@/lib/email/templates')
    const reserved = T.orderRequestReservedEmail({ reference: 'HLR-1', until: '1 Nov', amount: 'ETB 10', methods: [{ name: 'telebirr', instructions: '0911' }] })
    expect(reserved.text).toContain('pay ETB 10 (including VAT) to HagerLand by then. Please include HLR-1 with your payment. How to pay:\n\ntelebirr\n0911\n\nIf we do not receive payment by then, the reservation ends and you will not be charged.')
    expect(reserved.text).toContain('You are receiving this because you sent an order request to HagerLand Supply.')
    expect(read('lib/email/templates.ts')).toContain("'You are receiving this because you sent an enquiry on HagerLand.'")
    expect(T.quoteIssuedEmail({ name: 'A', reference: 'HLQ-1', totalCents: 1000000, hasDocument: false, validDays: 3 }).text).toContain('Your quote total is ETB 10,000, including VAT.')
    expect(T.quoteIssuedEmail({ name: 'A', reference: 'HLQ-1', totalCents: null, hasDocument: false, validDays: 3 }).text).toContain('Your quote is ready.')
    const { customerStatusLabel } = await import('@/lib/supply/order-requests')
    expect(customerStatusLabel({ status: 'reserved', reservedUntil: '2026-10-31T11:30:00Z', totalCents: 2701500 })).toBe('Reserved until 31 Oct 2026, 14:30 (Addis Ababa time): pay ETB 27,015 (including VAT) by then')
    const supplies = read('app/(site)/supplies/page.tsx')
    expect(supplies).toContain('We check prices and availability and send you one quote, including VAT and delivery in Addis Ababa.')
    expect(supplies).toContain('You confirm, pay HagerLand by one of the payment methods we give you, and we deliver.')
    const sent = read('app/(site)/supplies/quote/sent/page.tsx')
    expect(sent).toContain('2. We contact you with one clear quote, including VAT and delivery in Addis Ababa.')
    expect(sent).toContain('3. You confirm, pay HagerLand by one of the payment methods we give you, and we deliver.')
    expect(read('app/(site)/supplies/[category]/[subcategory]/page.tsx')).toContain('Add to your quote list for a clear price with delivery in Addis Ababa.')
    expect(read('lib/content/help.ts')).toContain('No. You confirm the quote with us, pay HagerLand by one of the payment methods we give you, and we arrange delivery.')
  })
  it('verification, developments and market appraisal (W31–W33, W36, W38–W40)', async () => {
    expect(read('app/(site)/how-it-works/page.tsx')).toContain('We checked the business’s trade licence and tax number (TIN), and the licence grade for contractors. The date of the check is shown on the badge.')
    expect(read('lib/org-labels.ts')).toContain("Verified: HagerLand checked this business's trade licence.")
    expect(read('app/(site)/agents/page.tsx')).toContain('Verified agents have had their trade licence and tax number checked.')
    expect(read('app/(site)/contractors/page.tsx')).toContain('Businesses marked Verified have had their trade licence and tax number checked by HagerLand;')
    expect(read('app/(site)/professionals/[service]/[[...location]]/page.tsx')).toContain('Verified businesses have had their trade licence and tax number checked by our team.')
    expect(read('lib/verification.ts')).toContain("Verified: HagerLand checked this business's trade licence on")
    expect(read('app/(site)/about/page.tsx')).toContain('The Verified badge appears only after we have checked a business’s trade licence and tax number.')
    expect(read('app/(site)/page.tsx')).toContain('A business shows the Verified badge only after we have checked its trade licence and tax number.')
    const dev = read('app/(site)/our-developments/page.tsx')
    expect(dev).toContain('We will secure land with clear title and lease documents before we plan anything.')
    expect(dev).toContain('We will manage the build directly and hand over with the documents in order.')
    const val = read('app/(site)/agency/valuation/page.tsx')
    expect(val).toContain("title: 'Book a market appraisal',")
    expect(val).toContain('<h1 className="hl-h1 mt-8 max-w-3xl">Book a market appraisal</h1>')
    expect(val).toContain('A market appraisal is our agent&apos;s opinion of a likely price or rent. It is not a formal valuation by a licensed valuer, for example for a bank or court. For those, <Link href="/request-service/property-valuers"')
    expect(val).toContain("path: '/agency/valuation',")
    const forms = read('components/agency/AgencyForms.tsx')
    expect(forms).toContain('submit="Book my market appraisal"')
    expect(forms).toContain('<Done title="Market appraisal requested"')
    const { valuationReceivedEmail } = await import('@/lib/email/agency')
    const m = valuationReceivedEmail({ name: 'Abebe', reference: 'HLVA-1', preferredTimes: null })
    expect(m.subject).toBe('Your market appraisal request (HLVA-1)')
    expect(m.text).toContain('Thank you: we will arrange your market appraisal')
    expect(m.text).toContain("We have your request for a market appraisal by HagerLand's estate agency.")
    expect(m.text).toContain('A market appraisal is our opinion of what the property could sell or let for, not a formal valuation by a licensed valuer. There is no obligation to instruct us afterwards.')
  })
})

describe('tidy T1–T4', () => {
  it('T1: Operations are told to ask the owner to merge', () => {
    expect(read('components/account/OrganisationForm.tsx')).toContain('add the supply record there, or ask the owner to merge them.')
    expect(read('components/admin/SupplyPartnerPanel.tsx')).toContain('If one is the same business, ask the owner to merge them before creating the record.')
    expect(read('components/account/OrganisationForm.tsx') + read('components/admin/SupplyPartnerPanel.tsx')).not.toContain('Merge duplicate')
  })
  it('T2: the Jobs → data valuations line', () => {
    expect(read('app/roodber8/jobs/data/page.tsx')).toContain("['Valuations and agency contacts', 'Address, details, notes, report, preferred times, time zone and IP code cleared 24 months after the last activity, once completed or cancelled; never while an instruction or tenancy is open.']")
  })
  it('T3: the QC-1a test restores exactly the grants it found', () => {
    const t = read('e2e/qc1a.spec.ts')
    expect(t).toContain("psql(tableGrant === '0' ? `grant select (${grantedColumns}) on public.service_requests to authenticated` : 'grant select on public.service_requests to authenticated')")
    expect(t).not.toContain("    psql('grant select on public.service_requests to authenticated')\n")
  })
  it('T4: no SUPABASE_DB_URL line; the cutover scripts refuse to run', () => {
    expect(read('.env.example')).not.toContain('SUPABASE_DB_URL')
    const env = read('scripts/cutover/env.sh')
    expect(env.indexOf('echo "These one-off cutover scripts are retired (CLAUDE.md rule 17a)." >&2\nexit 1')).toBeLessThan(env.indexOf('DB_URL="${SUPABASE_DB_URL'))
    for (const f of readdirSync('scripts/cutover').filter((x) => x.endsWith('.sh') && x !== 'env.sh')) {
      const c = read(`scripts/cutover/${f}`)
      if (c.includes('SUPABASE_DB_URL')) expect(c, f).toMatch(/source "\$\(dirname "\$0"\)\/env\.sh"|\. "\$\(dirname "\$0"\)\/env\.sh"|env\.sh/)
    }
  })
})

describe('migration 0053', () => {
  const sql = read('supabase/migrations/0053_qc2_seller_ready.sql').replace(/--.*$/gm, '')
  it('additive only: new tables, one nullable column with a check, existing trigger functions attached; nothing dropped or deleted', () => {
    expect(sql).not.toMatch(/\b(drop|truncate table|delete from|create or replace function|alter column|rename)\b/i)
    expect(sql.match(/create table if not exists public\.\w+/g)).toEqual(['create table if not exists public.supply_payment_methods', 'create table if not exists public.data_transfer_consents', 'create table if not exists public.order_request_payment_receipts'])
    expect(sql).toContain('alter table public.order_request_payments add column if not exists receipt_number text;')
    expect(sql).toContain('check (receipt_number is null or char_length(receipt_number) between 1 and 64)')
    expect(sql).toContain('revoke all on table public.supply_payment_methods, public.data_transfer_consents, public.order_request_payment_receipts from public, anon, authenticated;')
    expect(sql).not.toMatch(/\bgrant\b/i)
    expect(sql).not.toMatch(/insert into public\.supply_payment_methods/)
    expect(sql).toContain("values ('0053', 'qc2_seller_ready')")
    expect(sql).toMatch(/order_request_payment_receipts_append_only before update or delete on public\.order_request_payment_receipts\s+for each row execute function public\.supply_append_only\(\)/)
  })
  it('the consent table has no personal-data column', () => {
    const t = sql.slice(sql.indexOf('create table if not exists public.data_transfer_consents'), sql.indexOf(');', sql.indexOf('create table if not exists public.data_transfer_consents')))
    expect(t).not.toMatch(/\b(name|phone|email|ip|ip_hash|address)\b\s+text/)
  })
  it('health expects 0053 last; the verify file is read-only and checks the ledger fingerprint', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS[EXPECTED_MIGRATIONS.length - 1]).toBe('0053')
    const v = read('docs/sql/0053_qc2_seller_ready_verify.sql').replace(/--.*$/gm, '')
    expect(v).not.toMatch(/\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b/i)
    expect(v).toContain('6fc7e5654337f30b914fbeb1489856e8')
  })
})
