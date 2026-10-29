import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, db, submitStaffSignIn, uniqueEmail } from './helpers'
import { roundDiv, suggestedTerms } from '../lib/supply/terms'

/**
 * S6-3 partner terms → prices, settlements after delivery, and the money reconciliation — local copy only.
 * 200 order requests across 4 partners (markup source, commission source, agreement-default markup, and a manual
 * up-front partner) go through reserve → pay → supplier orders → delivered with proof → settlements → paid, with
 * owner price overrides, delivery charges, partial availability, cancellations, and refunds before and after
 * settlement. Every report figure is checked to the cent against an independent model of the same data; then one case
 * is broken on purpose (test-only) and the report must say "no" with that order's reference. Runs in order.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width'))
test.setTimeout(600_000)

const stamp = Date.now()
const N = 200

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
function addisDay(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
const TODAY = addisDay(new Date())
const PREV = (() => {
  const [y, m] = TODAY.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 10))
  return d.toISOString().slice(0, 10)
})()
const month = (day: string) => day.slice(0, 7)

async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const encrypt = (plain: string) => {
    const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
    return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`s6-3-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}
async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  if (data === null || data === undefined) throw new Error('no data')
  return data as NonNullable<T>
}

/** The four partners and their products (each partner supplies one HagerLand Supply product). */
interface Partner {
  key: string
  orgId: string
  productId: string
  cost: number
  markup: number | null
  commission: number | null
  agreementMarkup: number | null
  upfront: boolean
}
const partners: Partner[] = []
const CUSTOMER = { name: 'Reconciliation Customer', phone: '+251911555000', address: 'Bole, near Edna Mall' }

/** The independent model of what the report must show. */
interface ModelOrder {
  i: number
  partner: Partner
  reference: string
  orderId: string
  requestRef: string
  qty: number
  price: number
  payableUnit: number
  delivery: number
  paidOn: string
  deliveredOn: string
  refundBefore: number
  refundAfter: number
  customerLine: number
  payable: number
}
const model: ModelOrder[] = []
let cancelledCount = 0
/** The report before this run (other tests' data in the same local copy): the expected figures add to it. */
let baseline: Map<string, Record<string, number>> = new Map()

async function reportCsv(page: Page): Promise<Map<string, Record<string, number>> & { reconciles?: string }> {
  await adminSession(page)
  const csv = await (await page.request.get('/roodber8/reports/supply-settlements/export')).text()
  const lines = csv.replace(/^﻿/, '').trim().split(/\r?\n/)
  const head = lines[0].split(',')
  const out: Map<string, Record<string, number>> & { reconciles?: string } = new Map()
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    out.set(cells[0], Object.fromEntries(head.slice(2).filter((h) => h !== 'reconciles_with_ledger').map((h) => [h, Math.round(Number(cells[head.indexOf(h)].replace(/^'/, '')) * 100)])))
    if (cells[0] === 'to date') out.reconciles = line.slice(line.lastIndexOf(',') + 1)
  }
  return out
}

test.afterAll(() => {
  psql(`update public.site_settings set value = 'false'::jsonb where key = 'supply_catalogue_ordering'`)
})

test('the code and the database suggest exactly the same prices (400 generated cases)', async () => {
  let seed = stamp % 9973
  const rnd = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n
  for (let k = 0; k < 400; k++) {
    const cost = 1 + rnd(5_000_000)
    const markup = k % 3 === 0 ? rnd(30000) : null
    const commission = markup === null && k % 3 === 1 ? rnd(10000) : null
    const [row] = await must(db().rpc('supply_suggested_terms', { p_cost: cost, p_markup_bps: markup as number, p_commission_bps: commission as number }))
    const ts = suggestedTerms(cost, markup, commission)
    expect({ model: row.terms_model, bps: row.terms_bps, customer: row.customer_unit_cents, payable: row.payable_unit_cents }, `cost ${cost} markup ${markup} commission ${commission}`).toEqual({ model: ts.model, bps: ts.bps, customer: ts.customerUnitCents, payable: ts.payableUnitCents })
  }
})

test('200 order requests across 4 partners, through to paid settlements', async ({ page }) => {
  baseline = await reportCsv(page)
  const d = db()
  const hls = (await must(d.from('organisations').select('id').eq('slug', 'hagerland-supply').single())).id
  const cat = (await must(d.from('product_categories').select('id').order('sort').limit(1).single())).id
  const specs = [
    { key: 'P1 markup source', cost: 61337, markup: 1250, commission: null, agreementMarkup: null, upfront: false },
    { key: 'P2 commission source', cost: 120000, markup: null, commission: 500, agreementMarkup: null, upfront: false },
    { key: 'P3 agreement markup', cost: 45050, markup: null, commission: null, agreementMarkup: 1000, upfront: false },
    { key: 'P4 manual up front', cost: 99999, markup: null, commission: null, agreementMarkup: null, upfront: true },
  ]
  for (const s of specs) {
    const org = await must(d.from('organisations').insert({ kind: 'supplier', name: `S63 ${s.key} ${stamp}`, slug: `e2e-s63-${crypto.randomUUID().slice(0, 8)}`, status: 'draft', source: 'admin' }).select('id').single())
    const product = await must(d.from('products').insert({ name: `S63 product ${s.key} ${stamp}`, slug: `e2e-s63-${crypto.randomUUID().slice(0, 8)}`, category_id: cat, seller_org_id: hls, unit: 'bag', status: 'published', price_type: 'on_request' }).select('id').single())
    await must(d.from('product_sources').insert({ product_id: product.id, org_id: org.id, cost_price_cents: s.cost, markup_bps: s.markup, commission_bps: s.commission, settlement_timing: s.upfront ? 'upfront' : 'after_delivery', is_primary: true, created_by: 'e2e' }).select('id'))
    if (s.agreementMarkup !== null) await must(d.from('supply_agreements').insert({ org_id: org.id, money_model: 'A', default_markup_bps: s.agreementMarkup, start_date: PREV, status: 'active', created_by: 'e2e' }).select('id'))
    partners.push({ ...s, orgId: org.id, productId: product.id })
  }

  const deliver = async (orderId: string, deliveredOn: string) => {
    for (const st of ['placed', 'confirmed', 'out_for_delivery', 'delivered']) await must(d.from('supply_orders').update({ status: st, updated_by: 'e2e' }).eq('id', orderId).select('id'))
    await must(d.from('supply_delivery_proofs').insert({ order_id: orderId, file_path: `proofs/${orderId}/e2e.jpg`, file_type: 'image/jpeg', file_size_bytes: 1000, uploaded_by: 'e2e' }).select('id'))
    // The delivery day (local test data only): previous month for the first half, so the report has two months.
    if (deliveredOn !== TODAY) psql(`begin; set local session_replication_role = replica; update public.supply_orders set delivered_at = '${deliveredOn}T09:00:00+03:00' where id = '${orderId}'; commit;`)
  }
  const refund = (o: ModelOrder, amount: number) =>
    must(d.from('supply_ledger_entries').insert({ entry_type: 'refund', direction: 'out', amount_cents: amount, occurred_on: TODAY, method: 'bank_transfer', order_id: o.orderId, org_id: o.partner.orgId, reason: 'e2e: two bags damaged', created_by: 'e2e' }).select('id'))

  const early: ModelOrder[] = []
  for (let i = 0; i < N; i++) {
    const p = partners[i % 4]
    const qty = 1 + ((i * 7) % 23)
    const short = i % 10 === 3 && qty > 1
    const confirmed = short ? qty - 1 : qty
    const delivery = (i % 3) * 50000
    const paidOn = i < N / 2 ? PREV : TODAY
    const [req] = await must(d.rpc('order_request_submit', { p_name: CUSTOMER.name, p_phone: CUSTOMER.phone, p_email: null as unknown as string, p_location: null as unknown as string, p_address: CUSTOMER.address, p_needed_by: null as unknown as string, p_note: null as unknown as string, p_user: null as unknown as string, p_token_hash: null as unknown as string, p_token_expires: null as unknown as string, p_ip_hash: null as unknown as string, p_lines: [{ product_id: p.productId, quantity: qty }] }))
    const line = await must(d.from('order_request_lines').select('id').eq('order_request_id', req.id).single())
    await must(d.from('order_requests').update({ status: 'checking_stock', updated_by: 'e2e' }).eq('id', req.id).select('id'))
    await must(d.from('order_request_lines').update({ status: short ? 'short' : 'confirmed', confirmed_qty: confirmed }).eq('id', line.id).select('id'))
    if (i % 25 === 7) {
      await must(d.from('order_requests').update({ status: 'cancelled', status_reason: 'e2e: the customer changed their mind', updated_by: 'e2e' }).eq('id', req.id).select('id'))
      cancelledCount++
      continue
    }
    if (short) await must(d.from('order_requests').update({ status: 'partially_reserved', updated_by: 'e2e' }).eq('id', req.id).select('id'))
    await must(d.from('stock_reservations').insert({ order_request_line_id: line.id, org_id: p.orgId, qty: confirmed, held_until: new Date(Date.now() + 3 * 86_400_000).toISOString() }).select('id'))
    const terms = p.markup !== null || p.commission !== null ? suggestedTerms(p.cost, p.markup, p.commission) : p.agreementMarkup !== null ? suggestedTerms(p.cost, p.agreementMarkup, null) : suggestedTerms(p.cost, null, null)
    // Manual partner: the owner types cost × 1.2; others: the suggestion, overridden (+10.01) on every 9th request.
    const price = terms.customerUnitCents === null ? roundDiv(p.cost * 12000, 10000) : i % 9 === 0 ? terms.customerUnitCents + 1001 : terms.customerUnitCents
    const prices = terms.customerUnitCents === null || i % 9 === 0 ? [{ line_id: line.id, price_cents: price }] : []
    const total = Number(await must(d.rpc('order_request_reserve', { p_request: req.id, p_hours: 48, p_delivery_cents: delivery, p_prices: prices, p_actor: 'e2e' })))
    await must(d.from('order_request_payments').insert({ order_request_id: req.id, entry_type: 'customer_payment', direction: 'in', amount_cents: total, occurred_on: paidOn, method: 'bank_transfer', created_by: 'e2e' }).select('id'))
    const [order] = await must(d.rpc('order_request_create_supply_orders', { p_request: req.id, p_actor: 'e2e', p_today: paidOn }))
    const m: ModelOrder = {
      i, partner: p, reference: order.reference, orderId: order.id, requestRef: req.reference, qty: confirmed, price, payableUnit: terms.payableUnitCents as number, delivery, paidOn,
      deliveredOn: i < N / 2 ? PREV : TODAY, refundBefore: i % 20 === 11 ? 10000 : 0, refundAfter: i % 40 === 13 ? 20000 : 0,
      customerLine: Math.round(price * confirmed), payable: Math.round((terms.payableUnitCents as number) * confirmed),
    }
    expect(total, `request ${i}`).toBe(m.customerLine + delivery)
    model.push(m)
    // Up-front partner: half its orders are settled before delivery (with the owner's reason).
    if (p.upfront && i % 8 === 3) early.push(m)
    else {
      await deliver(m.orderId, m.deliveredOn)
      if (m.refundBefore) await refund(m, m.refundBefore)
    }
  }
  expect(model.length + cancelledCount).toBe(N)

  const settle = async (p: Partner, orders: ModelOrder[], reasons: Record<string, string> = {}) => {
    const [s] = await must(d.rpc('partner_settlement_create', { p_org: p.orgId, p_from: PREV, p_to: TODAY, p_orders: orders.map((o) => o.orderId), p_upfront_reasons: reasons, p_actor: 'e2e' }))
    await must(d.from('partner_settlements').update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: 'e2e' }).eq('id', s.id).select('id'))
    await must(d.rpc('partner_settlement_pay', { p_settlement: s.id, p_paid_on: TODAY, p_method: 'bank_transfer', p_reference: `TRX-${s.reference}`, p_actor: 'e2e' }))
    return s as { id: string; reference: string }
  }
  // Up front (before delivery, with a reason), then delivered. (The existing golden rule stops delivery steps on an
  // order whose customer was partly refunded, so a refund on these comes after delivery: a refund after settlement.)
  await settle(partners[3], early, Object.fromEntries(early.map((o) => [o.orderId, 'Agreed: paid on order for imported stock'])))
  for (const o of early) {
    await deliver(o.orderId, o.deliveredOn)
    if (o.refundBefore) {
      await refund(o, o.refundBefore)
      o.refundAfter = o.refundBefore
      o.refundBefore = 0
    }
  }
  // First round: everything delivered except the last 20 requests.
  for (const p of partners) await settle(p, model.filter((o) => o.partner === p && o.i < N - 20 && !early.includes(o)))
  // Refunds after settlement: each makes an adjustment for the partner's next settlement.
  for (const o of model.filter((x) => x.refundAfter && !early.includes(x))) await refund(o, o.refundAfter)
  // Second round: the last 20, with the waiting adjustments; partner 4's round is left unpaid (due).
  for (const p of partners.slice(0, 3)) await settle(p, model.filter((o) => o.partner === p && o.i >= N - 20 && !early.includes(o)))
})

test('the report: every figure to the cent, and "Reconciles with ledger: yes"', async ({ page }) => {
  const unpaid = model.filter((o) => o.partner === partners[3] && o.i >= N - 20 && !(o.i % 8 === 3))
  const settledAfterRefund = (o: ModelOrder) => o.refundAfter > 0
  const exp: Record<string, Record<string, number>> = {}
  const add = (m: string, k: string, v: number) => {
    exp[m] ??= { moneyIn: 0, refunds: 0, deliveryIncome: 0, payablesEarned: 0, adjustments: 0, paidToPartners: 0, margin: 0 }
    exp[m][k] += v
  }
  for (const o of model) {
    add(month(o.paidOn), 'moneyIn', o.customerLine + o.delivery)
    add(month(o.deliveredOn), 'deliveryIncome', o.delivery)
    add(month(o.deliveredOn), 'payablesEarned', o.payable)
    add(month(o.deliveredOn), 'margin', o.customerLine - o.payable)
    if (o.refundBefore) {
      add(month(TODAY), 'refunds', o.refundBefore)
      add(month(TODAY), 'margin', -o.refundBefore)
    }
    if (settledAfterRefund(o)) {
      add(month(TODAY), 'refunds', o.refundAfter)
      add(month(TODAY), 'margin', -o.refundAfter)
      add(month(TODAY), 'adjustments', -Math.min(o.refundAfter, o.payable))
      add(month(TODAY), 'margin', Math.min(o.refundAfter, o.payable))
    }
  }
  // Paid: every payable except partner 4's unpaid round, less every refund adjustment: partner 2's are taken in its
  // second round; partner 4's (its up-front orders, refunded after delivery) in its first normal round.
  const adjustmentsPaid = model.filter((o) => settledAfterRefund(o)).reduce((s, o) => s + Math.min(o.refundAfter, o.payable), 0)
  add(month(TODAY), 'paidToPartners', model.filter((o) => !unpaid.includes(o)).reduce((s, o) => s + o.payable, 0) - adjustmentsPaid)
  const months = Object.keys(exp).sort()
  let running = 0
  const due: Record<string, number> = {}
  for (const m of months) {
    running += exp[m].payablesEarned + exp[m].adjustments - exp[m].paidToPartners
    due[m] = running
  }

  const after = await reportCsv(page)
  const base = (period: string, key: string) => baseline.get(period)?.[key] ?? 0
  const baseDue = (m: string) => {
    // The baseline's "due" at the end of month m is the last baseline month on or before m.
    const earlier = Array.from(baseline.keys()).filter((k) => k !== 'to date' && k <= m).sort()
    return earlier.length ? base(earlier[earlier.length - 1], 'dueToPartners') : 0
  }
  for (const m of months) {
    for (const k of Object.keys(exp[m])) expect(after.get(m)?.[k], `${m} ${k}`).toBe(base(m, k) + exp[m][k])
    expect(after.get(m)?.dueToPartners, `${m} due`).toBe(baseDue(m) + due[m])
  }
  for (const k of Object.keys(exp[months[0]])) expect(after.get('to date')?.[k], `to date ${k}`).toBe(base('to date', k) + months.reduce((s, m) => s + exp[m][k], 0))
  expect(after.get('to date')?.dueToPartners).toBe(base('to date', 'dueToPartners') + running)
  expect(running).toBe(unpaid.reduce((s, o) => s + o.payable, 0))
  expect(after.reconciles).toBe('yes')
  await page.goto('/roodber8/reports/supply-settlements')
  await expect(page.getByTestId('reconciles')).toHaveText('Reconciles with ledger: yes')
  // Partner 4's last orders are due: shown on "Due to partners".
  await page.goto('/roodber8/supply/settlements')
  await expect(page.getByText(`S63 P4 manual up front ${stamp}`).first()).toBeVisible()
  console.log(`[s6-3] ${model.length} orders, ${cancelledCount} cancelled; to date (ETB): ${months.map((m) => `${m}: in ${exp[m].moneyIn / 100}, payables ${exp[m].payablesEarned / 100}, paid ${exp[m].paidToPartners / 100}, margin ${exp[m].margin / 100}`).join(' | ')}; due ${running / 100}`)
})

test('a deliberate break (test-only) makes the report say "no" with that order; the reversal puts it right', async ({ page }) => {
  const o = model.find((x) => x.i < N - 20 && !x.refundAfter && x.partner !== partners[3])!
  const { data: wrong } = await db().from('supply_ledger_entries').insert({ entry_type: 'supplier_payment', direction: 'out', amount_cents: o.payable, occurred_on: TODAY, method: 'cash', reference: 'TEST-BREAK', order_id: o.orderId, org_id: o.partner.orgId, created_by: 'e2e' }).select('id').single()
  await adminSession(page)
  await page.goto('/roodber8/reports/supply-settlements')
  await expect(page.getByTestId('reconciles')).toHaveText(`Reconciles with ledger: no (No delivered order paid out twice: ${o.reference})`)
  await db().from('supply_ledger_entries').insert({ entry_type: 'reversal', direction: 'in', amount_cents: o.payable, occurred_on: TODAY, order_id: o.orderId, org_id: o.partner.orgId, reverses_entry_id: wrong!.id, reason: 'e2e: undo the deliberate break', created_by: 'e2e' })
  await page.reload()
  await expect(page.getByTestId('reconciles')).toHaveText('Reconciles with ledger: yes')
})

test('the statement shows exactly the approved wording, and nothing about customers', async ({ page }) => {
  const p = partners[0]
  const { data: s } = await db().from('partner_settlements').select('id, reference, total_cents').eq('org_id', p.orgId).eq('status', 'paid').order('created_at').limit(1).single()
  await adminSession(page)
  const res = await page.request.get(`/roodber8/supply/settlements/${s!.id}/statement`)
  expect(res.status()).toBe(200)
  const html = await res.text()
  expect(html).toContain(`<title>HagerLand Supply — statement ${s!.reference}</title>`)
  for (const t of [`Partner: S63 ${p.key} ${stamp}`, 'Period: ', ' to ', '<th>Order</th>', '<th>Delivered on</th>', '<th>Item</th>', '<th>Quantity</th>', 'Amount due (ETB)', 'Total due: ETB ', 'Paid on ', '(bank transfer, reference TRX-', 'Questions? Contact HagerLand Supply.']) expect(html, t).toContain(t)
  const theirs = model.filter((o) => o.partner === p && o.i < N - 20)
  for (const o of theirs.slice(0, 5)) expect(html).toContain(o.reference)
  for (const banned of [CUSTOMER.name, CUSTOMER.phone, CUSTOMER.address, 'HLR-', 'Margin', 'customer', 'Customer', 'delivery charge', 'Delivery income', 'S63 P2', 'S63 P3', 'S63 P4']) expect(html.includes(banned), banned).toBe(false)
  // Customer prices never appear: the first order's customer line total is not on the statement.
  const sample = theirs[0]
  expect(html.includes((sample.customerLine / 100).toLocaleString('en', { minimumFractionDigits: 2 }))).toBe(false)
  const download = await page.request.get(`/roodber8/supply/settlements/${s!.id}/statement?download=1`)
  expect(download.headers()['content-disposition']).toContain(`statement-${s!.reference}.html`)
  // The page offers it to the owner.
  await page.goto(`/roodber8/supply/settlements/${s!.id}`)
  await expect(page.getByRole('link', { name: 'Statement for the partner' })).toBeVisible()
})

test('the owner creates, approves, pays and voids in the admin pages; Operations, Agent and Content are refused everywhere', async ({ page, browser }) => {
  // Partner 4's unpaid orders, through the real pages.
  await adminSession(page)
  page.on('dialog', (dlg) => void dlg.accept())
  await page.goto('/roodber8/supply/settlements')
  const p4 = page.locator('li', { hasText: `S63 P4 manual up front ${stamp}` }).first()
  await p4.getByRole('button', { name: 'Create draft settlement' }).click()
  await page.waitForURL(/\/roodber8\/supply\/settlements\/[0-9a-f-]{36}\?created=1/)
  // Void the first draft (its orders become due again), then make it again.
  await page.getByRole('button', { name: 'Void' }).click()
  await page.getByLabel('Reason (kept in admin)').fill('Wrong period: making it again.')
  await page.getByRole('button', { name: 'Void' }).click()
  await expect(page.getByText('Voided.')).toBeVisible()
  await page.goto('/roodber8/supply/settlements')
  await page.locator('li', { hasText: `S63 P4 manual up front ${stamp}` }).first().getByRole('button', { name: 'Create draft settlement' }).click()
  await page.waitForURL(/\/roodber8\/supply\/settlements\/[0-9a-f-]{36}\?created=1/)
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Approved. Record the payment when you have paid the partner.')).toBeVisible()
  await page.reload()
  await page.getByLabel('Bank or transfer reference').fill('CBE-E2E-1')
  await page.getByRole('button', { name: 'Record payment to the partner' }).click()
  await expect(page.getByText('Paid. The payment is in the supply ledger.')).toBeVisible()
  await page.goto('/roodber8/reports/supply-settlements')
  await expect(page.getByTestId('reconciles')).toHaveText('Reconciles with ledger: yes')
  for (const role of ['operations', 'agent', 'content'] as const) {
    const staff = await staffPage(browser, role)
    for (const path of ['/roodber8/supply/settlements', '/roodber8/reports/supply-settlements']) {
      await staff.goto(path)
      await expect(staff, `${role} ${path}`).toHaveURL(/denied=1/)
    }
    for (const path of ['/roodber8/supply/settlements/export', '/roodber8/reports/supply-settlements/export']) {
      const res = await staff.request.get(path, { maxRedirects: 0 })
      expect(res.status(), `${role} ${path}`).not.toBe(200)
      expect(await res.text()).not.toMatch(/HLG-|paid_to_partners|total_etb/)
    }
    await staff.close()
  }
})

test('the dashboard leaves out the hourly runs; the audit log keeps them', async ({ page }) => {
  await adminSession(page)
  const res = await page.request.get('/api/cron/hourly', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  await page.goto('/roodber8')
  await expect(page.getByText('cron.hourly')).toHaveCount(0)
  await page.goto('/roodber8/audit')
  await expect(page.getByText('cron.hourly').first()).toBeVisible()
})
