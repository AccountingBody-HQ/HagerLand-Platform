import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, allMail, asFreshVisitor, assertLocalStack, createUser, db, mailWithSubject, signIn, submitStaffSignIn, uniqueEmail } from './helpers'

/**
 * S6-2 order requests, stock reservations and the payment window: the whole journey to the cent on the local copy and
 * local mail catcher only. Catalogue ordering is switched on (and the payment details set) only inside this file and
 * put back in afterAll. Ends with the bad-actor sweep: customers never see a partner or a cost, partners never see a
 * customer. Runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width (the 375 px checks set their own size)'))

const stamp = Date.now()
const PARTNER_1 = `Kaliti Cement Partner ${stamp}`
const PARTNER_2 = `Akaki Steel Partner ${stamp}`
const PARTNER_PHONE = `+251911${String(stamp).slice(-6)}`
const SKU_1 = `KCP-${stamp}`
const COST_1 = 61337 // ETB 613.37: distinctive, so the sweep can look for it
const COST_2 = 98765 // ETB 987.65
const PAYMENT_DETAILS = `CBE account 1000 2345 6789, HagerLand Supply ${stamp}`
const CUSTOMER = { name: 'Selamawit Bekele', phone: `0922${String(stamp).slice(-6)}`, email: uniqueEmail('s6-2-customer'), address: `House ${stamp % 1000}, near Edna Mall` }

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
function ordering(on: boolean) {
  psql(`update public.site_settings set value = '${on}'::jsonb where key = 'supply_catalogue_ordering'`)
  psql(`update public.site_settings set value = '${on ? JSON.stringify(PAYMENT_DETAILS) : '""'}'::jsonb where key = 'supply_payment_details'`)
}
function addisLocal(msFromNow: number): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(Date.now() + msFromNow))
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
}
async function staffPage(browser: Browser, role: 'operations'): Promise<Page> {
  const encrypt = (plain: string) => {
    const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
    return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`s6-2-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  page.on('dialog', (d) => void d.accept())
  return page
}
async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}
async function cron(page: Page) {
  const res = await page.request.get('/api/cron/hourly', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  return res.json() as Promise<{ ordering: boolean; expired: number; deliveredEmails: number; failedSteps: string[] }>
}
async function ownerPage(page: Page, id: string) {
  await adminSession(page)
  page.on('dialog', (d) => void d.accept())
  await page.goto(`/roodber8/supply/order-requests/${id}`)
}
async function toast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible()
}
async function requestId(reference: string): Promise<string> {
  return (await db().from('order_requests').select('id').eq('reference', reference).single()).data!.id
}
async function status(id: string): Promise<string> {
  return (await db().from('order_requests').select('status').eq('id', id).single()).data!.status
}

/** One product per partner, sold by HagerLand Supply (published, price on request, 3-day lead time). */
const seeded: { org1?: string; org2?: string; p1?: { id: string; slug: string }; p2?: { id: string; slug: string } } = {}
async function seed() {
  const d = db()
  const { data: hls } = await d.from('organisations').select('id').eq('slug', 'hagerland-supply').single()
  const { data: cat } = await d.from('product_categories').select('id').order('sort').limit(1).single()
  const org = async (name: string) => (await d.from('organisations').insert({ kind: 'supplier', name, slug: `e2e-s62-${crypto.randomUUID().slice(0, 8)}`, status: 'draft', source: 'admin', phone: PARTNER_PHONE }).select('id').single()).data!.id
  seeded.org1 = await org(PARTNER_1)
  seeded.org2 = await org(PARTNER_2)
  await d.from('supply_contacts').insert({ org_id: seeded.org1, name: 'Partner Contact', phone: PARTNER_PHONE, phone_normalised: PARTNER_PHONE })
  const product = async (name: string) => (await d.from('products').insert({ name, slug: `e2e-s62-${crypto.randomUUID().slice(0, 8)}`, category_id: cat!.id, seller_org_id: hls!.id, unit: 'bag', status: 'published', price_type: 'on_request', lead_time_days: 3 }).select('id, slug').single()).data!
  seeded.p1 = await product(`Portland cement S62 ${stamp}`)
  seeded.p2 = await product(`Rebar 12 mm S62 ${stamp}`)
  await d.from('product_sources').insert([
    { product_id: seeded.p1.id, org_id: seeded.org1, partner_sku: SKU_1, cost_price_cents: COST_1, is_primary: true, created_by: 'e2e' },
    { product_id: seeded.p2.id, org_id: seeded.org2, partner_sku: `AKS-${stamp}`, cost_price_cents: COST_2, is_primary: true, created_by: 'e2e' },
  ])
}

/** A customer request through the real form (375 px), returning its reference and private page path. */
async function sendRequest(browser: Browser, opts: { slug: string; quantity: string; email?: string | null }): Promise<{ reference: string; path: string }> {
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } })
  await asFreshVisitor(page)
  await page.goto(`/supplies/product/${opts.slug}/order`)
  await expect(page.getByRole('heading', { name: 'Request to order' })).toBeVisible()
  await noHorizontalScroll(page)
  await page.fill('#or-qty', opts.quantity)
  await page.fill('#or-name', CUSTOMER.name)
  await page.fill('#or-phone', CUSTOMER.phone)
  if (opts.email !== null) await page.fill('#or-email', opts.email ?? CUSTOMER.email)
  await page.locator('#or-area').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.fill('#or-address', CUSTOMER.address)
  await page.getByRole('button', { name: 'Send order request' }).click()
  await page.waitForURL(/\/supplies\/order-requests\/[A-Za-z0-9_-]{43}\?sent=1$/)
  const reference = (await page.locator('h1').textContent())!.replace('Order request ', '').trim()
  await expect(page.getByText(`Thank you. Your order request ${reference} is with our team. We will check stock and contact you. You have not paid anything.`)).toBeVisible()
  await expect(page.getByTestId('order-request-status')).toHaveText('Checking stock')
  await noHorizontalScroll(page)
  const path = new URL(page.url()).pathname
  await page.close()
  return { reference, path }
}

const journey: { id?: string; reference?: string; path?: string; line1?: string; line2?: string } = {}

test.afterAll(() => ordering(false))

test('ordering off: the product page is unchanged, the form is not found, no /terms or /privacy lines', async ({ page }) => {
  ordering(false)
  await seed()
  await page.goto(`/supplies/product/${seeded.p1!.slug}`)
  await expect(page.getByRole('heading', { name: `Portland cement S62 ${stamp}` })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Request to order' })).toHaveCount(0)
  await expect(page.getByText('No payment now. We check stock first, then reserve it for you.')).toHaveCount(0)
  await expect(page.getByText('Lead time: about 3 days')).toBeVisible()
  expect((await page.goto(`/supplies/product/${seeded.p1!.slug}/order`))?.status()).toBe(404)
  await page.goto('/terms')
  await expect(page.getByText('HagerLand is the seller', { exact: false })).toHaveCount(0)
  await page.goto('/privacy')
  await expect(page.getByText('Order requests:', { exact: false })).toHaveCount(0)
  // The hourly job does nothing while ordering is off.
  expect(await cron(page)).toEqual({ ok: true, ordering: false, expired: 0, deliveredEmails: 0, failedSteps: [] })
})

test('ordering on: the product page offers "Request to order"; a visitor sends a request without an account', async ({ page, browser }) => {
  ordering(true)
  await page.goto(`/supplies/product/${seeded.p1!.slug}`)
  await expect(page.getByRole('link', { name: 'Request to order' })).toBeVisible()
  await expect(page.getByText('No payment now. We check stock first, then reserve it for you.')).toBeVisible()
  await expect(page.getByText('We confirm the price when we reserve your order.')).toBeVisible()
  await expect(page.getByText('Typical lead time: 3 days. We confirm it when we reserve your order.')).toBeVisible()
  await page.goto('/terms')
  await expect(page.getByText('When you buy from HagerLand Supply, HagerLand is the seller. A reservation holds stock until the time shown. It ends automatically if we do not receive payment by then.')).toBeVisible()
  await page.goto('/privacy')
  await expect(page.getByText('Suppliers fulfilling your order:', { exact: false })).toBeVisible()

  const r = await sendRequest(browser, { slug: seeded.p1!.slug, quantity: '30' })
  Object.assign(journey, r)
  journey.id = await requestId(r.reference)
  const { data: req } = await db().from('order_requests').select('status, phone, requester_user_id').eq('id', journey.id).single()
  expect(req).toMatchObject({ status: 'submitted', phone: `+251${CUSTOMER.phone.slice(1)}`, requester_user_id: null })
  const mail = await mailWithSubject(CUSTOMER.email, `We received your order request (${r.reference})`)
  expect(mail.text).toContain('Thank you. We are checking stock and will contact you. You have not paid anything yet.')
  expect(mail.html).toContain(r.path)
  // A second item from another partner (the database takes items only while the request is new).
  const { data: lines } = await db().from('order_request_lines').insert({ order_request_id: journey.id, product_id: seeded.p2!.id, item_name: `Rebar 12 mm S62 ${stamp}`, quantity: 4, unit: 'bag' }).select('id')
  journey.line2 = lines![0].id
  journey.line1 = (await db().from('order_request_lines').select('id').eq('order_request_id', journey.id).eq('product_id', seeded.p1!.id).single()).data!.id
})

test('Operations check stock and record holds, and never see a price, a cost or money', async ({ browser }) => {
  const ops = await staffPage(browser, 'operations')
  await ops.goto('/roodber8/supply/order-requests')
  await ops.getByRole('link', { name: journey.reference! }).click()
  await ops.getByRole('button', { name: 'Start stock check' }).click()
  await toast(ops, 'Checking stock. Record what each partner can hold.')
  for (const [line, qty] of [[journey.line1!, '30'], [journey.line2!, '4']] as const) {
    await ops.locator(`#ls-${line}`).selectOption('confirmed')
    await ops.locator(`#ls-${line}`).locator('xpath=ancestor::div[contains(@class,"items-end")][1]').getByRole('button', { name: 'Save' }).click()
    await toast(ops, 'Saved.')
    await ops.fill(`#hq-${line}`, qty)
    await ops.fill(`#hu-${line}`, addisLocal(3 * 86_400_000))
    await ops.locator(`#hp-${line}`).locator('xpath=ancestor::div[contains(@class,"grid")][1]').getByRole('button', { name: 'Record hold' }).click()
    await toast(ops, 'Hold recorded.')
  }
  const html = await ops.content()
  for (const secret of ['613.37', '987.65', 'Money (owner only)', 'Reserve (owner)', 'customer price', 'partner cost', 'Customer total']) expect(html, secret).not.toContain(secret)
  // Operations see partner names (they phone them) and cannot open the money pages.
  expect(html).toContain(PARTNER_1)
  await ops.goto('/roodber8/supply/ledger')
  await expect(ops).toHaveURL(/denied=1/)
  await ops.close()
})

test('owner prices and reserves (email 2 with the payment details); the customer page says how to pay', async ({ page, browser }) => {
  await ownerPage(page, journey.id!)
  await page.fill(`#rp-${journey.line1}`, '850.50')
  await page.fill(`#rp-${journey.line2}`, '1200')
  await page.fill(`#rd-${journey.id}`, '1500')
  await page.getByRole('button', { name: 'Reserve and email how to pay' }).click()
  await toast(page, 'Reserved. The customer was emailed how to pay.')
  // 30 × 850.50 = 25,515.00; 4 × 1,200 = 4,800.00; delivery 1,500.00 → 31,815.00
  const { data: r } = await db().from('order_requests').select('status, lines_total_cents, delivery_charge_cents, customer_total_cents, reserved_until').eq('id', journey.id!).single()
  expect(r).toMatchObject({ status: 'reserved', lines_total_cents: 3031500, delivery_charge_cents: 150000, customer_total_cents: 3181500 })
  const hours = (new Date(r!.reserved_until!).getTime() - Date.now()) / 3_600_000
  expect(hours).toBeGreaterThan(47.5)
  expect(hours).toBeLessThanOrEqual(48)
  const until = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Addis_Ababa', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(r!.reserved_until!))
  const mail = await mailWithSubject(CUSTOMER.email, `Your items are reserved (${journey.reference})`)
  expect(mail.text).toContain(`Good news: we have reserved your items until ${until} (Addis Ababa time). To confirm your order, pay ETB 31,815 to HagerLand by then. Please include ${journey.reference} with your payment. Payment details: ${PAYMENT_DETAILS}. If we do not receive payment by then, the reservation ends and you will not be charged.`)
  const customer = await browser.newPage({ viewport: { width: 375, height: 800 } })
  await customer.goto(journey.path!)
  await expect(customer.getByTestId('order-request-status')).toHaveText(`Reserved until ${until} (Addis Ababa time): pay ETB 31,815 by then`)
  await expect(customer.getByRole('heading', { name: 'How to pay' })).toBeVisible()
  await expect(customer.getByText(PAYMENT_DETAILS)).toBeVisible()
  await noHorizontalScroll(customer)
  await customer.close()
})

test('a part payment is not "paid"; full payment is (email 6); supplier orders take the money, to the cent, once', async ({ page }) => {
  await ownerPage(page, journey.id!)
  await page.fill(`#pa-${journey.id}`, '20000')
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await toast(page, 'Recorded.')
  expect(await status(journey.id!)).toBe('reserved')
  await page.fill(`#pa-${journey.id}`, '11,815')
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await toast(page, 'Recorded. Paid in full: the customer was emailed.')
  expect(await status(journey.id!)).toBe('paid')
  const paidMail = await mailWithSubject(CUSTOMER.email, `Payment received (${journey.reference})`)
  expect(paidMail.text).toContain(`Thank you. We received ETB 31,815 for ${journey.reference}. We will contact you to arrange delivery.`)
  await page.reload()
  await page.getByRole('button', { name: 'Create supplier orders' }).click()
  await toast(page, /Supplier orders HLO-\d{4}-\d{6}, HLO-\d{4}-\d{6} created and paid from the customer's payment\./)
  // A second tap (straight to the server step) is refused by the database.
  const again = await db().rpc('order_request_create_supply_orders', { p_request: journey.id!, p_actor: 'e2e', p_today: '2026-10-29' })
  expect(again.error?.message).toMatch(/created once|already exist/)
  const { data: orders } = await db().from('supply_orders').select('id, org_id, status, quote_request_id, money_model, customer_delivery_charge_cents').eq('order_request_id', journey.id!)
  expect(orders).toHaveLength(2)
  expect(orders!.every((o) => o.status === 'paid' && o.quote_request_id === null && o.money_model === 'A')).toBe(true)
  const ids = orders!.map((o) => o.id)
  const { data: ledger } = await db().from('supply_ledger_entries').select('amount_cents, entry_type, order_id').in('order_id', ids)
  expect(ledger!.filter((e) => e.entry_type === 'customer_payment').reduce((s, e) => s + Number(e.amount_cents), 0)).toBe(3181500)
  const byOrg = Object.fromEntries(orders!.map((o) => [o.org_id, o.id]))
  const { data: lines } = await db().from('supply_order_lines').select('order_id, quantity, supplier_unit_price_cents, customer_unit_price_cents, supply_quote_line_id, order_request_line_id').in('order_id', ids)
  expect(lines!.find((l) => l.order_id === byOrg[seeded.org1!])).toMatchObject({ quantity: 30, supplier_unit_price_cents: COST_1, customer_unit_price_cents: 85050, supply_quote_line_id: null, order_request_line_id: journey.line1 })
  expect(lines!.find((l) => l.order_id === byOrg[seeded.org2!])).toMatchObject({ quantity: 4, supplier_unit_price_cents: COST_2, customer_unit_price_cents: 120000 })
  const { data: net } = await db().rpc('order_request_net_cents', { p_request: journey.id! })
  const { data: held } = await db().rpc('order_request_held_cents', { p_request: journey.id! })
  expect([Number(net), Number(held)]).toEqual([0, 3181500])
  expect(await status(journey.id!)).toBe('fulfilling')
  await page.goto('/roodber8/supply/orders')
  await expect(page.getByRole('link', { name: journey.reference! }).first()).toBeVisible()
})

test('delivery: supplier orders delivered → request delivered (email 8); a dispute; then completed with proof', async ({ page, browser }) => {
  const { data: orders } = await db().from('supply_orders').select('id').eq('order_request_id', journey.id!)
  for (const o of orders!) for (const s of ['placed', 'confirmed', 'out_for_delivery', 'delivered']) await db().from('supply_orders').update({ status: s, updated_by: 'e2e' }).eq('id', o.id)
  expect(await status(journey.id!)).toBe('delivered')
  // The hourly job's backstop tells the customer (the delivery steps here were made directly in the database).
  const run = await cron(page)
  expect(run).toMatchObject({ ordering: true, deliveredEmails: 1, failedSteps: [] })
  const mail = await mailWithSubject(CUSTOMER.email, `Your order has been delivered (${journey.reference})`)
  expect(mail.text).toContain(`Your order ${journey.reference} has been delivered. Thank you for buying from HagerLand Supply.`)
  expect((await cron(page)).deliveredEmails).toBe(0)
  const ops = await staffPage(browser, 'operations')
  await ops.goto(`/roodber8/supply/order-requests/${journey.id}`)
  await ops.getByRole('button', { name: 'Mark disputed' }).click()
  await ops.fill(`#rs-dispute-${journey.id}`, 'Four bags arrived torn.')
  await ops.getByRole('button', { name: 'Mark disputed' }).click()
  await toast(ops, 'Marked disputed.')
  await ops.close()
  expect(await status(journey.id!)).toBe('disputed')
  const customer = await browser.newPage()
  await customer.goto(journey.path!)
  await expect(customer.getByTestId('order-request-status')).toHaveText('Delivered')
  await customer.close()
  for (const o of orders!) {
    await db().from('supply_delivery_proofs').insert({ order_id: o.id, file_path: `proofs/${o.id}/e2e.jpg`, file_type: 'image/jpeg', file_size_bytes: 1000, uploaded_by: 'e2e' })
    await db().from('supply_orders').update({ status: 'completed', updated_by: 'e2e' }).eq('id', o.id)
  }
  expect(await status(journey.id!)).toBe('completed')
})

test('part available (email 3) → reserved → cancelled unpaid (email 7, not charged)', async ({ page, browser }) => {
  const email = uniqueEmail('s6-2-partial')
  const r = await sendRequest(browser, { slug: seeded.p1!.slug, quantity: '30', email })
  const id = await requestId(r.reference)
  const line = (await db().from('order_request_lines').select('id').eq('order_request_id', id).single()).data!.id
  await ownerPage(page, id)
  await page.getByRole('button', { name: 'Start stock check' }).click()
  await toast(page, 'Checking stock.')
  await page.locator(`#ls-${line}`).selectOption('short')
  await page.fill(`#lq-${line}`, '20')
  await page.locator(`#ls-${line}`).locator('xpath=ancestor::div[contains(@class,"items-end")][1]').getByRole('button', { name: 'Save' }).click()
  await toast(page, 'Saved.')
  await page.fill(`#hq-${line}`, '20')
  await page.fill(`#hu-${line}`, addisLocal(3 * 86_400_000))
  await page.locator(`#hp-${line}`).locator('xpath=ancestor::div[contains(@class,"grid")][1]').getByRole('button', { name: 'Record hold' }).click()
  await toast(page, 'Hold recorded.')
  await page.getByRole('button', { name: 'Part available: tell the customer' }).click()
  await toast(page, 'Marked part available. The customer was emailed')
  const mail = await mailWithSubject(email, `Part of your order is available (${r.reference})`)
  expect(mail.text).toContain(`We can reserve Portland cement S62 ${stamp} (20 bags), but not Portland cement S62 ${stamp} (10 bags). Reply to this email or call us to tell us whether you want the available items. You have not been charged.`)
  const customer = await browser.newPage()
  await customer.goto(r.path)
  await expect(customer.getByTestId('order-request-status')).toHaveText('Part of your order is available')
  await customer.close()
  // The customer said yes (by phone): reserve the available part.
  await page.reload()
  await page.fill(`#rp-${line}`, '900')
  await page.getByRole('button', { name: 'Reserve and email how to pay' }).click()
  await toast(page, 'Reserved.')
  expect((await db().from('order_requests').select('customer_total_cents').eq('id', id).single()).data!.customer_total_cents).toBe(1800000)
  await page.reload()
  await page.getByRole('button', { name: 'Cancel (nothing was paid)' }).click()
  await page.fill(`#rs-cancel-${id}`, 'The customer changed their mind.')
  await page.getByRole('button', { name: 'Cancel (nothing was paid)' }).click()
  await toast(page, 'Cancelled. The customer was emailed.')
  const cancelled = await mailWithSubject(email, `Your order request is cancelled (${r.reference})`)
  expect(cancelled.text).toContain(`Your order request ${r.reference} is cancelled. You have not been charged.`)
  expect((await db().from('stock_reservations').select('status').eq('order_request_line_id', line)).data!.map((h) => h.status)).toEqual(['released'])
})

test('nothing available (email 4); a request without an email gets no email', async ({ page, browser }) => {
  const email = uniqueEmail('s6-2-none')
  const r = await sendRequest(browser, { slug: seeded.p2!.slug, quantity: '7', email })
  const id = await requestId(r.reference)
  await ownerPage(page, id)
  await page.getByRole('button', { name: 'Nothing available: tell the customer' }).click()
  await toast(page, 'Marked not available. The customer was emailed.')
  const mail = await mailWithSubject(email, `We could not confirm stock (${r.reference})`)
  expect(mail.text).toContain(`Sorry, we could not confirm stock for Rebar 12 mm S62 ${stamp} (7 bags). You have not been charged.`)
  const customer = await browser.newPage()
  await customer.goto(r.path)
  await expect(customer.getByTestId('order-request-status')).toHaveText('Not available')
  await customer.close()
  const silent = await sendRequest(browser, { slug: seeded.p2!.slug, quantity: '1', email: null })
  expect((await db().from('order_requests').select('email').eq('reference', silent.reference).single()).data!.email).toBeNull()
})

test('the reservation ends (hourly job, time travel; email 5); a late payment is refused until reopen; refund → refunded (email 7)', async ({ page, browser }) => {
  const email = uniqueEmail('s6-2-expiry')
  const r = await sendRequest(browser, { slug: seeded.p1!.slug, quantity: '10', email })
  const id = await requestId(r.reference)
  const line = (await db().from('order_request_lines').select('id').eq('order_request_id', id).single()).data!.id
  await ownerPage(page, id)
  await page.getByRole('button', { name: 'Start stock check' }).click()
  await toast(page, 'Checking stock.')
  await page.locator(`#ls-${line}`).selectOption('confirmed')
  await page.locator(`#ls-${line}`).locator('xpath=ancestor::div[contains(@class,"items-end")][1]').getByRole('button', { name: 'Save' }).click()
  await toast(page, 'Saved.')
  await page.fill(`#hu-${line}`, addisLocal(3 * 86_400_000))
  await page.locator(`#hp-${line}`).locator('xpath=ancestor::div[contains(@class,"grid")][1]').getByRole('button', { name: 'Record hold' }).click()
  await toast(page, 'Hold recorded.')
  await page.fill(`#rp-${line}`, '1000')
  await page.fill(`#rh-${id}`, '1')
  await page.getByRole('button', { name: 'Reserve and email how to pay' }).click()
  await toast(page, 'Reserved.')
  // Time travel (local test copy only): the reservation ended a minute ago.
  psql(`update public.order_requests set reserved_until = now() - interval '1 minute', payment_due_at = now() - interval '1 minute' where id = '${id}'`)
  const run = await cron(page)
  expect(run.expired).toBeGreaterThanOrEqual(1)
  expect(await status(id)).toBe('expired')
  const mail = await mailWithSubject(email, `Your reservation has ended (${r.reference})`)
  expect(mail.text).toContain(`Your reservation ${r.reference} ended because we did not receive payment in time. If you still need the items, send a new request. Prices and stock may have changed.`)
  expect((await allMail(email)).filter((m) => m.subject.startsWith('Your reservation has ended')).length).toBe(1)
  const customer = await browser.newPage()
  await customer.goto(r.path)
  await expect(customer.getByTestId('order-request-status')).toHaveText('Reservation ended')
  await customer.close()
  // The money arrives late: recorded, never accepted on its own.
  await page.reload()
  await page.fill(`#pa-${id}`, '10000')
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await toast(page, 'Recorded. The reservation had ended, so the request is not paid: reopen it (check stock again) or refund.')
  expect(await status(id)).toBe('expired')
  // The owner refunds instead of reopening, then closes it as refunded.
  await page.reload()
  await page.locator(`#pt-${id}`).selectOption('refund')
  await page.fill(`#pa-${id}`, '10000')
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await toast(page, 'Recorded.')
  await page.reload()
  await page.getByRole('button', { name: 'Close as refunded' }).click()
  await page.fill(`#rs-refunded-${id}`, 'Paid after the reservation ended; stock no longer held.')
  await page.getByRole('button', { name: 'Close as refunded' }).click()
  await toast(page, 'Closed as refunded. The customer was emailed.')
  const refunded = await mailWithSubject(email, `Your order request is cancelled (${r.reference})`)
  expect(refunded.text).toContain(`Your order ${r.reference} is cancelled. We will refund ETB 10,000 to you.`)
  const customer2 = await browser.newPage()
  await customer2.goto(r.path)
  await expect(customer2.getByTestId('order-request-status')).toHaveText('Refunded')
  await customer2.close()
})

test('reopen after the end: back to checking stock', async ({ page, browser }) => {
  const r = await sendRequest(browser, { slug: seeded.p2!.slug, quantity: '2', email: null })
  const id = await requestId(r.reference)
  const line = (await db().from('order_request_lines').select('id').eq('order_request_id', id).single()).data!.id
  psql(`update public.order_requests set status = 'checking_stock', updated_by = 'e2e' where id = '${id}'`)
  psql(`update public.order_request_lines set status = 'confirmed', confirmed_qty = 2 where id = '${line}'`)
  psql(`insert into public.stock_reservations (order_request_line_id, org_id, qty, held_until) values ('${line}', '${seeded.org2}', 2, now() + interval '3 days')`)
  psql(`select public.order_request_reserve('${id}', 1, 0, '[{"line_id": "${line}", "price_cents": 50000}]'::jsonb, 'e2e')`)
  psql(`update public.order_requests set reserved_until = now() - interval '1 minute', payment_due_at = now() - interval '1 minute' where id = '${id}'`)
  await ownerPage(page, id)
  expect(await status(id)).toBe('expired')
  await page.getByRole('button', { name: 'Reopen: check stock again' }).click()
  await toast(page, 'Reopened: check stock again, then reserve.')
  expect(await status(id)).toBe('checking_stock')
})

test('bad-actor sweep: customers never see a partner or a cost; partners never see a customer', async ({ page, browser, request }) => {
  const partnerSecrets = [PARTNER_1, PARTNER_2, 'Kaliti Cement', 'Akaki Steel', PARTNER_PHONE, PARTNER_PHONE.replace('+251', '0'), SKU_1, `AKS-${stamp}`, '613.37', '987.65', '61,337', '98,765']
  const clean = (label: string, body: string) => {
    for (const s of partnerSecrets) expect(body.includes(s), `${label} contains "${s}"`).toBe(false)
  }
  // Every customer email of this run, and the customer's page.
  for (const to of [CUSTOMER.email]) for (const m of await allMail(to)) clean(`email "${m.subject}"`, m.text + m.html)
  for (const m of (await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent('subject:"order request"')}`)).json()).messages ?? []) {
    const full = (await (await fetch(`http://localhost:8025/api/v1/message/${m.ID}`)).json()) as { HTML: string; Text: string; Subject: string; To: { Address: string }[] }
    if (!full.Subject.startsWith('New order request')) clean(`email "${full.Subject}"`, full.Text + full.HTML)
  }
  const statusPage = await (await request.get(journey.path!)).text()
  clean('customer status page', statusPage)
  // The customer's own reading (signed in): their row, and the cost-free line view.
  const signedIn = await createUser({ name: 'Signed In Buyer' })
  await db().from('order_requests').update({ requester_user_id: signedIn.id }).eq('id', journey.id!)
  await signIn(page, signedIn.email, signedIn.password)
  const own = await page.goto(`/supplies/order-requests/${journey.reference}`)
  expect(own?.status()).toBe(200)
  clean('customer page by reference', await page.content())
  // Product pages, search-engine data, share image, sitemaps, search.
  for (const p of [seeded.p1!, seeded.p2!]) {
    const html = await (await request.get(`/supplies/product/${p.slug}`)).text()
    clean(`product page ${p.slug}`, html)
    clean(`share image ${p.slug}`, (await (await request.get(`/og/product/${p.slug}`)).body()).toString('latin1'))
  }
  for (const path of ['/sitemap/products.xml', '/sitemap/companies.xml', `/api/search/suggest?q=${encodeURIComponent('Portland cement S62')}`, `/search?q=${encodeURIComponent('Portland cement')}`]) clean(path, await (await request.get(path)).text())
  // Staff CSV exports (owner session): no partner cost, code or phone next to a customer.
  await adminSession(page)
  for (const kind of ['products', 'quotes', 'organisations']) {
    const csv = await (await page.request.get(`/roodber8/export/${kind}`)).text()
    for (const s of [SKU_1, '613.37', '987.65']) expect(csv.includes(s), `${kind} CSV contains ${s}`).toBe(false)
  }
  // A partner member's private area shows nothing of the customer.
  const partnerUser = await createUser({ name: 'Partner Member' })
  await db().from('partner_registrations').insert({ reference: `HLB-E2E-${stamp}`, roles: ['manufacturer'], business_name: PARTNER_1, contact_name: 'Partner Contact', phone: PARTNER_PHONE, org_id: seeded.org1!, source: 'staff', status: 'approved' })
  await db().from('partner_members').insert({ org_id: seeded.org1!, user_id: partnerUser.id })
  const partner = await browser.newPage()
  await signIn(partner, partnerUser.email, partnerUser.password)
  await partner.goto('/partner')
  await expect(partner.getByRole('heading', { name: 'Your products' })).toBeVisible()
  const portal = await partner.content()
  for (const s of [CUSTOMER.name, CUSTOMER.phone, `+251${CUSTOMER.phone.slice(1)}`, CUSTOMER.address, CUSTOMER.email, journey.reference!, '850.50', '31,815']) expect(portal.includes(s), `partner area contains ${s}`).toBe(false)
  await partner.close()
})
