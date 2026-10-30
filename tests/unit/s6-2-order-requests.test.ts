import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** S6-2 order requests, stock reservations and the payment window (migration 0049). */

const state = vi.hoisted(() => ({
  switches: { registration: false, catalogueOrdering: false, tradePricing: false, homeBusinessRow: false },
  // QC-2: the owner's active payment methods (replace the old single payment-details text).
  methods: [] as { id: string; name: string; instructions: string; active: boolean; sortOrder: number }[],
  unlock: { activePaymentMethods: 0, legalName: '', catalogueOrdering: false },
  rpc: [] as { name: string; args: unknown }[],
  inserts: [] as { table: string; row: unknown }[],
  owner: true,
  emails: [] as string[],
}))

vi.mock('@/lib/supply/partner-switches', () => ({ readSupplySwitches: async () => state.switches, readSupplySwitchesCached: async () => state.switches, readUnlockFacts: async () => state.unlock, SUPPLY_SWITCHES_TAG: 'supply-switches' }))
vi.mock('@/lib/supply/payment-methods-data', () => ({ activePaymentMethods: async () => state.methods.filter((m) => m.active), listPaymentMethods: async () => state.methods }))
vi.mock('@/lib/data-transfer-server', () => ({ recordTransferConsent: async () => undefined, accountConsentRefusal: async () => null, accountConsented: async () => true }))
vi.mock('@/lib/supply/order-requests-data', () => ({
  orderableProduct: async () => true,
  sendCustomerEmail: async (_id: string, kind: string) => (state.emails.push(kind), true),
  expireDueOrderRequests: async () => 0,
  sendMissedDeliveredEmails: async () => 0,
}))
vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: () => ({
    rpc: (name: string, args: unknown) => {
      state.rpc.push({ name, args })
      const result = { data: 1000, error: null }
      return Object.assign(Promise.resolve(result), { single: async () => ({ data: { id: 'r', reference: 'HLR-2026-000001' }, error: null }) })
    },
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      for (const k of ['select', 'eq', 'in', 'is', 'update', 'order']) chain[k] = () => chain
      chain.maybeSingle = async () => ({ data: table === 'order_requests' ? { id: '11111111-1111-4111-8111-111111111111', reference: 'HLR-2026-000001', status: 'checking_stock' } : { id: 'x' }, error: null })
      chain.insert = async (row: unknown) => (state.inserts.push({ table, row }), { error: null })
      return chain
    },
  }),
}))
vi.mock('@/lib/admin/guard', () => ({
  assertAdmin: async () => undefined,
  assertOwner: async () => {
    if (!state.owner) throw new Error('owner only')
  },
  audit: async () => undefined,
  adminActor: async () => 'test',
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: async () => ({ allowed: true }) }))
vi.mock('@/lib/turnstile', () => ({ isHoneypotFilled: () => false, verifyTurnstileToken: async () => true }))
vi.mock('@/lib/email/send', () => ({ sendEmail: async () => true }))
vi.mock('@/lib/security', async (real) => ({ ...(await real<typeof import('@/lib/security')>()), getClientIp: () => '127.0.0.1', hashIp: () => 'hash' }))

beforeEach(() => {
  state.switches = { registration: false, catalogueOrdering: false, tradePricing: false, homeBusinessRow: false }
  state.methods = []
  state.unlock = { activePaymentMethods: 0, legalName: '', catalogueOrdering: false }
  state.rpc = []
  state.inserts = []
  state.owner = true
  state.emails = []
})

const sql = readFileSync('supabase/migrations/0049_order_requests.sql', 'utf8')
const code = sql.replace(/--.*$/gm, '')
const REQ = '11111111-1111-4111-8111-111111111111'
const LINE = '22222222-2222-4222-8222-222222222222'

describe('the state machine', () => {
  it('the app and the database allow exactly the same moves', async () => {
    const { ORDER_REQUEST_TRANSITIONS } = await import('@/lib/supply/order-requests')
    const body = /order_request_transition_allowed[\s\S]*?select \(p_from, p_to\) in \(([\s\S]*?)\)\s*\$\$/.exec(code)?.[1] ?? ''
    const pairs = Array.from(body.matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)).map((m) => `${m[1]}>${m[2]}`).sort()
    const app = Object.entries(ORDER_REQUEST_TRANSITIONS).flatMap(([from, tos]) => tos.map((to) => `${from}>${to}`)).sort()
    expect(pairs).toEqual(app)
    expect(pairs.length).toBe(24)
  })
  it('every allowed and refused move', async () => {
    const { ORDER_REQUEST_STATUSES, ORDER_REQUEST_TRANSITIONS, canMoveOrderRequest } = await import('@/lib/supply/order-requests')
    for (const from of ORDER_REQUEST_STATUSES) for (const to of ORDER_REQUEST_STATUSES) expect(canMoveOrderRequest(from, to), `${from} → ${to}`).toBe(ORDER_REQUEST_TRANSITIONS[from].includes(to))
    expect(canMoveOrderRequest('submitted', 'paid')).toBe(false)
    expect(canMoveOrderRequest('checking_stock', 'paid')).toBe(false)
    expect(canMoveOrderRequest('expired', 'paid')).toBe(false)
    expect(canMoveOrderRequest('expired', 'reserved')).toBe(false)
    expect(canMoveOrderRequest('paid', 'cancelled')).toBe(false)
    for (const end of ['completed', 'cancelled', 'unavailable', 'refunded'] as const) expect(ORDER_REQUEST_TRANSITIONS[end]).toEqual([])
  })
  it('golden rule: "paid" only with recorded payments covering the total, before the reservation ends', () => {
    expect(code).toMatch(/if new\.status = 'paid' then\s+if now\(\) > old\.reserved_until or coalesce\(new\.customer_total_cents, 0\) <= 0 or public\.order_request_net_cents\(new\.id\) < new\.customer_total_cents then/)
    // The only code that sets "paid" is the database's own settle step, after a payment.
    expect(code.match(/update public\.order_requests set status = 'paid'/g)?.length).toBe(1)
    expect(code).toMatch(/order_request_settle[\s\S]*?if r\.id is null or r\.status <> 'reserved' or now\(\) > r\.reserved_until/)
    expect(readFileSync('app/roodber8/actions/order-requests.ts', 'utf8')).not.toMatch(/status: 'paid'/)
  })
  it('a payment after the end is never accepted on its own: "expired" cannot become "paid"', () => {
    expect(code).not.toMatch(/\('expired', 'paid'\)/)
    expect(code).toMatch(/\('expired', 'checking_stock'\)/)
    expect(code).toMatch(/if new\.status = 'expired' and \(old\.reserved_until is null or old\.reserved_until >= now\(\)\)/)
  })
  it('refunds never above what is held; a double tap never makes two supplier orders', () => {
    expect(code).toMatch(/elsif new\.entry_type in \('refund', 'moved_to_order'\) and new\.amount_cents > v_net then/)
    expect(code).toMatch(/create unique index if not exists supply_orders_one_live_per_partner_key on public\.supply_orders \(order_request_id, org_id\) where order_request_id is not null and status <> 'cancelled'/)
    expect(code).toMatch(/select \* into r from public\.order_requests where order_requests\.id = p_request for update;\s+if r\.id is null or r\.status <> 'paid'/)
  })
})

describe('reservation length and Addis Ababa time', () => {
  it('48 hours by default, 1–168 allowed', async () => {
    const { reservationHours } = await import('@/lib/supply/order-requests')
    expect(reservationHours('')).toBe(48)
    expect(reservationHours(undefined)).toBe(48)
    expect(reservationHours('1')).toBe(1)
    expect(reservationHours('168')).toBe(168)
    expect(reservationHours('0')).toBeNull()
    expect(reservationHours('169')).toBeNull()
    expect(reservationHours('2.5')).toBeNull()
    expect(code).toMatch(/if p_hours is null or p_hours not between 1 and 168 then/)
  })
  it('shows the date and time in Addis Ababa (UTC+3)', async () => {
    const { addisDateTime } = await import('@/lib/supply/order-requests')
    expect(addisDateTime('2026-10-31T11:30:00Z')).toBe('31 Oct 2026, 14:30')
    expect(addisDateTime('2026-10-31T22:15:00Z')).toBe('1 Nov 2026, 01:15')
    expect(addisDateTime(null)).toBe('')
  })
  it('totals round half up to the cent, like the database', async () => {
    const { requestTotalCents } = await import('@/lib/supply/order-requests')
    expect(requestTotalCents([{ unitPriceCents: 85050, quantity: 30 }], 150000)).toBe(2701500)
    expect(requestTotalCents([{ unitPriceCents: 333, quantity: 1.5 }], 0)).toBe(500)
    expect(requestTotalCents([{ unitPriceCents: null, quantity: 1 }], 0)).toBeNull()
  })
})

describe('approved customer text (section 3), verbatim', () => {
  it('product page, form and status page', async () => {
    const { CUSTOMER_TEXT, customerStatusLabel } = await import('@/lib/supply/order-requests')
    expect(CUSTOMER_TEXT.button).toBe('Request to order')
    expect(CUSTOMER_TEXT.note).toBe('No payment now. We check stock first, then reserve it for you.')
    expect(CUSTOMER_TEXT.priceLine).toBe('We confirm the price when we reserve your order.')
    expect(CUSTOMER_TEXT.leadTime(3)).toBe('Typical lead time: 3 days. We confirm it when we reserve your order.')
    expect(CUSTOMER_TEXT.emailHint).toBe('Leave it empty if you have no email. We will phone you instead.')
    expect(CUSTOMER_TEXT.submit).toBe('Send order request')
    expect(CUSTOMER_TEXT.success('HLR-2026-000001')).toBe('Thank you. Your order request HLR-2026-000001 is with our team. We will check stock and contact you. You have not paid anything.')
    expect(CUSTOMER_TEXT.heading('HLR-2026-000001')).toBe('Order request HLR-2026-000001')
    expect(CUSTOMER_TEXT.howToPay).toBe('How to pay')
    const label = (status: string) => customerStatusLabel({ status, reservedUntil: '2026-10-31T11:30:00Z', totalCents: 2701500 })
    expect(label('submitted')).toBe('Checking stock')
    expect(label('checking_stock')).toBe('Checking stock')
    expect(label('reserved')).toBe('Reserved until 31 Oct 2026, 14:30 (Addis Ababa time): pay ETB 27,015 (including VAT) by then')
    expect(label('partially_reserved')).toBe('Part of your order is available')
    expect(label('unavailable')).toBe('Not available')
    expect(label('paid')).toBe('Paid')
    expect(label('fulfilling')).toBe('Preparing delivery')
    expect(label('delivered')).toBe('Delivered')
    expect(label('completed')).toBe('Completed')
    expect(label('expired')).toBe('Reservation ended')
    expect(label('cancelled')).toBe('Cancelled')
    expect(label('refunded')).toBe('Refunded')
    const form = readFileSync('components/supply/OrderRequestForm.tsx', 'utf8')
    for (const l of ['"Quantity"', '"Your name"', '"Phone"', '"Email"', '"Delivery area"', '"Delivery address"', '"Needed by"', '"Anything else we should know?"']) expect(form).toContain(l)
  })
  it('the eight customer emails', async () => {
    const T = await import('@/lib/email/templates')
    const R = 'HLR-2026-000001'
    const cases: [ReturnType<typeof T.orderRequestPaidEmail>, string, string][] = [
      [T.orderRequestReceivedEmail({ reference: R, link: 'https://www.hagerland.com/supplies/order-requests/x' }), `We received your order request (${R})`, 'Thank you. We are checking stock and will contact you. You have not paid anything yet.'],
      [T.orderRequestReservedEmail({ reference: R, until: '31 Oct 2026, 14:30', amount: 'ETB 27,015', methods: [{ name: 'CBE Birr', instructions: '1000123456789, HagerLand' }] }), `Your items are reserved (${R})`, `Good news: we have reserved your items until 31 Oct 2026, 14:30 (Addis Ababa time). To confirm your order, pay ETB 27,015 (including VAT) to HagerLand by then. Please include ${R} with your payment. How to pay:\n\nCBE Birr\n1000123456789, HagerLand\n\nIf we do not receive payment by then, the reservation ends and you will not be charged.`],
      [T.orderRequestPartialEmail({ reference: R, available: 'Cement (20 bags)', unavailable: 'Cement (10 bags)' }), `Part of your order is available (${R})`, 'We can reserve Cement (20 bags), but not Cement (10 bags). Reply to this email or call us to tell us whether you want the available items. You have not been charged.'],
      [T.orderRequestUnavailableEmail({ reference: R, items: 'Cement (30 bags)' }), `We could not confirm stock (${R})`, 'Sorry, we could not confirm stock for Cement (30 bags). You have not been charged.'],
      [T.orderRequestExpiredEmail({ reference: R }), `Your reservation has ended (${R})`, `Your reservation ${R} ended because we did not receive payment in time. If you still need the items, send a new request. Prices and stock may have changed.`],
      [T.orderRequestPaidEmail({ reference: R, amount: 'ETB 27,015' }), `Payment received (${R})`, `Thank you. We received ETB 27,015 for ${R}. We will contact you to arrange delivery.`],
      [T.orderRequestCancelledEmail({ reference: R, refundAmount: null }), `Your order request is cancelled (${R})`, `Your order request ${R} is cancelled. You have not been charged.`],
      [T.orderRequestCancelledEmail({ reference: R, refundAmount: 'ETB 27,015' }), `Your order request is cancelled (${R})`, `Your order ${R} is cancelled. We will refund ETB 27,015 to you.`],
      [T.orderRequestDeliveredEmail({ reference: R }), `Your order has been delivered (${R})`, `Your order ${R} has been delivered. Thank you for buying from HagerLand Supply.`],
    ]
    for (const [mail, subject, body] of cases) {
      expect(mail.subject).toBe(subject)
      expect(mail.text).toContain(body)
      expect(mail.text).not.toMatch(/partner|supplier/i)
    }
  })
})

describe('the public form', () => {
  const good = { product_id: '33333333-3333-4333-8333-333333333333', quantity: '30', name: 'Kebede Alemu', phone: '0911 223 344', email: '', delivery_location_id: '44444444-4444-4444-8444-444444444444', delivery_address: 'Bole, near Edna Mall', needed_by: '', note: '', transfer_consent: 'on' }
  const form = (v: Record<string, string>) => {
    const f = new FormData()
    for (const [k, x] of Object.entries(v)) f.append(k, x)
    return f
  }
  it('phone to +251, email optional, area and address needed', async () => {
    const { orderRequestSchema } = await import('@/lib/supply/order-requests')
    const r = orderRequestSchema.safeParse(good)
    expect(r.success && r.data.phone).toBe('+251911223344')
    expect(r.success && r.data.email).toBeUndefined()
    expect(orderRequestSchema.safeParse({ ...good, delivery_location_id: '' }).error?.issues[0]?.message).toBe('Choose the location')
    expect(orderRequestSchema.safeParse({ ...good, delivery_address: '' }).success).toBe(false)
    expect(orderRequestSchema.safeParse({ ...good, quantity: '0' }).success).toBe(false)
  })
  it('switch off: the form is refused before anything is saved', async () => {
    const { submitOrderRequestAction } = await import('@/app/actions/order-request-actions')
    expect(await submitOrderRequestAction(null, form(good))).toEqual({ ok: false, error: 'Something went wrong. Please refresh the page.' })
    expect(state.rpc).toEqual([])
  })
  it('switch on: one database step, a private link, the first email', async () => {
    state.switches.catalogueOrdering = true
    const { submitOrderRequestAction } = await import('@/app/actions/order-request-actions')
    const res = await submitOrderRequestAction(null, form(good))
    expect(res?.ok).toBe(true)
    expect(res?.ok && res.data.path).toMatch(/^\/supplies\/order-requests\/[A-Za-z0-9_-]{43}$/)
    expect(state.rpc.map((c) => c.name)).toEqual(['order_request_submit'])
    expect(state.rpc[0].args).toMatchObject({ p_phone: '+251911223344', p_email: null, p_lines: [{ product_id: good.product_id, quantity: 30 }] })
    expect(state.emails).toEqual(['received'])
  })
  it('the product page, the form page and the status page close with the switch', () => {
    const product = readFileSync('app/(site)/supplies/product/[slug]/page.tsx', 'utf8')
    expect(product).toContain('const ordering = Boolean(p.seller_is_hagerland && (await readSupplySwitches()).catalogueOrdering && (await orderableProduct(p.id)))')
    expect(product).toMatch(/\{ordering && \(\s*<div className="space-y-2">\s*<ButtonLink/)
    // Off: the lead-time line is exactly as before.
    expect(product).toContain("`Lead time: about ${p.lead_time_days} day${p.lead_time_days === 1 ? '' : 's'}`")
    const order = readFileSync('app/(site)/supplies/product/[slug]/order/page.tsx', 'utf8')
    expect(order).toMatch(/if \(!\(await readSupplySwitches\(\)\)\.catalogueOrdering\) return null/)
    expect(order).toContain('if (!p?.id) notFound()')
    for (const p of ['app/(site)/terms/page.tsx', 'app/(site)/privacy/page.tsx']) expect(readFileSync(p, 'utf8')).toMatch(/catalogueOrdering/)
    expect(readFileSync('app/(site)/privacy/page.tsx', 'utf8').match(/\{orderLines && <li>/g)).toHaveLength(3)
  })
})

describe('the hourly job', () => {
  it('runs every hour with the same secret, and does nothing while ordering is off', async () => {
    expect(JSON.parse(readFileSync('vercel.json', 'utf8')).crons).toEqual(expect.arrayContaining([{ path: '/api/cron/hourly', schedule: '5 * * * *' }, { path: '/api/cron/daily', schedule: '0 6 * * *' }]))
    expect(readFileSync('app/api/cron/hourly/route.ts', 'utf8')).toContain("safeEqual(header, `Bearer ${secret}`)")
    const { runHourly } = await import('@/lib/cron/hourly')
    const off = await runHourly(Date.parse('2026-10-29T10:05:00Z'))
    expect(off).toEqual({ ordering: false, expired: 0, deliveredEmails: 0, failedSteps: [] })
    expect(state.inserts).toEqual([{ table: 'audit_log', row: expect.objectContaining({ action: 'cron.hourly', entity_label: 'Catalogue ordering is off: nothing to do' }) }])
  })
})

describe('owner money steps', () => {
  it('no reservation (and no switch) without an active payment method', async () => {
    const { reserveAction } = await import('@/app/roodber8/actions/order-requests')
    expect(await reserveAction(REQ, { hours: '48', delivery: '0', prices: { [LINE]: '850.50' } })).toEqual({ ok: false, error: 'Add an active payment method in Supplies → Payment methods first: the customer needs it to pay.' })
    expect(state.rpc).toEqual([])
    state.methods = [{ id: 'm1', name: 'CBE Birr', instructions: '1000123456789', active: true, sortOrder: 0 }]
    expect((await reserveAction(REQ, { hours: '48', delivery: '1500', prices: { [LINE]: '850.50' } })).ok).toBe(true)
    expect(state.rpc[0]).toEqual({ name: 'order_request_reserve', args: { p_request: REQ, p_hours: 48, p_delivery_cents: 150000, p_prices: [{ line_id: LINE, price_cents: 85050 }], p_actor: 'test' } })
    expect(state.emails).toEqual(['reserved'])
    expect(await reserveAction(REQ, { hours: '200', delivery: '0', prices: {} })).toEqual({ ok: false, error: 'A reservation lasts between 1 and 168 hours.' })
    const { setSupplySwitchAction } = await import('@/app/roodber8/actions/supply-switches')
    // QC-2: the switch needs an active payment method and the company name (checked on the server).
    expect(await setSupplySwitchAction('catalogueOrdering', true)).toMatchObject({ ok: false, error: 'Cannot be switched on yet: add an active payment method in Supplies → Payment methods; enter the company name in Settings → Legal entity.' })
    state.unlock = { activePaymentMethods: 1, legalName: '', catalogueOrdering: false }
    expect(await setSupplySwitchAction('catalogueOrdering', true)).toMatchObject({ ok: false, error: 'Cannot be switched on yet: enter the company name in Settings → Legal entity.' })
  })
  it('Operations are refused every money step (server checks)', async () => {
    state.owner = false
    state.methods = [{ id: 'm1', name: 'CBE Birr', instructions: '1000123456789', active: true, sortOrder: 0 }]
    const a = await import('@/app/roodber8/actions/order-requests')
    await expect(a.reserveAction(REQ, { hours: '48', delivery: '0', prices: {} })).rejects.toThrow('owner only')
    await expect(a.recordPaymentAction(REQ, { type: 'customer_payment', amount: '100', date: '2026-10-29', method: 'bank_transfer', reference: '', note: '' })).rejects.toThrow('owner only')
    await expect(a.reversePaymentAction(REQ, LINE, 'mistake')).rejects.toThrow('owner only')
    await expect(a.cancelOrderRequestAction(REQ, 'customer changed mind')).rejects.toThrow('owner only')
    await expect(a.markRefundedAction(REQ, 'refunded')).rejects.toThrow('owner only')
    await expect(a.createSupplierOrdersAction(REQ)).rejects.toThrow('owner only')
    await expect(a.closeDisputeAction(REQ)).rejects.toThrow('owner only')
    expect(state.rpc).toEqual([])
    expect(state.inserts).toEqual([])
  })
  it('Operations never get money in page data: prices, costs and payments are loaded for the owner only', () => {
    const data = readFileSync('lib/supply/order-requests-data.ts', 'utf8')
    expect(data).toMatch(/\.\.\.\(owner\s*\?\s*\{\s*money: \{\s*unitPriceCents: l\.customer_unit_price_cents,\s*costCents: l\.cost_price_cents/)
    expect(data).toMatch(/if \(owner\) \{\s+const \[\{ data: entries \}/)
    const page = readFileSync('app/roodber8/supply/order-requests/[id]/page.tsx', 'utf8')
    expect(page).toContain('{r.money && (')
    expect(page).toContain("owner ? e.type.replace('_', ' ') : 'Money entry'")
    const list = readFileSync('app/roodber8/supply/order-requests/page.tsx', 'utf8')
    expect(list).not.toMatch(/total|price|cents/i)
  })
  it('staff roles: Operations open order requests; Agent and Content do not', async () => {
    const { roleCanAccess } = await import('@/lib/admin/roles')
    expect(roleCanAccess('operations', '/roodber8/supply/order-requests/x')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/supply/order-requests')).toBe(false)
    expect(roleCanAccess('content', '/roodber8/supply/order-requests')).toBe(false)
  })
})

describe('customer views never carry the partner or the cost', () => {
  it('the customer line view and the customer loader', () => {
    const view = /create or replace view public\.order_request_lines_customer[\s\S]*?select ([\s\S]*?)\nfrom/.exec(code)?.[1] ?? ''
    expect(view).not.toMatch(/source_org_id|cost_price_cents/)
    const data = readFileSync('lib/supply/order-requests-data.ts', 'utf8')
    const loader = data.split('export async function loadCustomerOrderRequest')[1]
    expect(loader).not.toMatch(/source_org_id|cost_price_cents|stock_reservations|order_request_events|organisations/)
    const page = readFileSync('app/(site)/supplies/order-requests/[key]/page.tsx', 'utf8').replace(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    expect(page).not.toMatch(/partner|org_id|cost/i)
  })
})

describe('keeping periods', () => {
  it('order requests join the shared clean-up, only once finished; money records stay', async () => {
    const { RETENTION_KINDS, clearedOrderRequest } = await import('@/lib/retention')
    const { FINISHED } = await import('@/lib/supply/order-requests')
    expect(RETENTION_KINDS).toContain('order_requests')
    expect(FINISHED).toEqual(['completed', 'cancelled', 'expired', 'unavailable', 'refunded'])
    expect(clearedOrderRequest('t')).toEqual({ name: 'Removed', phone: '', email: null, delivery_address: null, note: null, access_token_hash: null, access_token_expires_at: null, ip_hash: null, personal_data_deleted_at: 't' })
    const { auditKeep } = await import('@/lib/retention')
    expect(auditKeep('supply.order_request.payment')).toBe('six_years')
    expect(auditKeep('supply.order_request.reserve')).toBe('six_years')
    expect(auditKeep('supply.order_request.check')).toBe('two_years')
  })
})

describe('migration 0049', () => {
  it('additive except exactly the two approved "drop not null" statements, isolated at the end', () => {
    const drops = code.match(/\bdrop\b[^;]*/gi) ?? []
    expect(drops).toEqual(['drop not null', 'drop not null'])
    expect(code).toContain('alter table public.supply_order_lines alter column supply_quote_line_id drop not null;')
    expect(code).toContain('alter table public.supply_orders alter column quote_request_id drop not null;')
    const marker = sql.indexOf('THE ONLY TWO NON-ADDITIVE STEPS')
    expect(marker).toBeGreaterThan(0)
    expect(sql.indexOf('alter column supply_quote_line_id drop not null')).toBeGreaterThan(marker)
    expect(sql.indexOf('alter column quote_request_id drop not null')).toBeGreaterThan(marker)
    // "before truncate" lines are the append-only protections (they refuse emptying a table), not deletions.
    expect(code).not.toMatch(/^\s*truncate\b|\brename\b|delete\s+from/im)
    expect(code).toContain("add constraint supply_order_lines_one_source check ((supply_quote_line_id is null) <> (order_request_line_id is null))")
    expect(code).toContain("add constraint supply_orders_one_source check ((quote_request_id is null) <> (order_request_id is null))")
    expect(code).toContain("values ('0049', 'order_requests')")
    // The supply ledger's rules are untouched.
    expect(code).not.toMatch(/alter table public\.supply_ledger_entries/)
    expect(code).toContain("insert into public.site_settings (key, value) values ('supply_payment_details', '\"\"'::jsonb) on conflict (key) do nothing;")
  })
  it('the health check expects 0049 (S6-3 added 0050 after it)', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS).toContain('0049')
  })
  it('the quote → order path is unchanged: supply_create_order is not redefined, and quote orders keep their quote', () => {
    expect(code).not.toMatch(/function public\.supply_create_order\b/)
    expect(code).not.toMatch(/function public\.supply_orders_guard\b/)
    const actions = readFileSync('app/roodber8/actions/supply-orders.ts', 'utf8')
    expect(actions).toContain(".rpc('supply_create_order', { p_quote: quoteId,")
  })
})
