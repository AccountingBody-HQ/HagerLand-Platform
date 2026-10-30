import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, asFreshVisitor, assertLocalStack, createUser, db, mailWithSubject, signIn, submitStaffSignIn, uniqueEmail, tickTransferConsent } from './helpers'

/**
 * S6-4 per-customer trade prices and multi-item trade order requests, on the local copy and local mail catcher only.
 * Trade pricing and catalogue ordering (with payment details) are switched on only inside this file and put back in
 * afterAll. Trade customer A gets agreements; B is an approved trade customer without them; a visitor has no account.
 * Runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width (the 375 px checks set their own size)'))

const stamp = Date.now()
// QC-2: an active payment method (replaces the old single payment-details text).
const METHOD = { name: `CBE Birr ${stamp}`, instructions: `Account 1000 2345 6789, HagerLand LTD ${stamp}` }
const NAMES = { p1: `Paving slab S64 ${stamp}`, p2: `Kerb stone S64 ${stamp}`, p3: `Garden fence S64 ${stamp}` }
const PARTNER_1 = `Sululta Stone S64 ${stamp}`
const PARTNER_2 = `Burayu Fencing S64 ${stamp}`
const CUSTOMER = { phone: `0933${String(stamp).slice(-6)}`, address: `Site ${stamp % 1000}, CMC road` }

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
function switches(on: boolean) {
  psql(`update public.site_settings set value = '${on}'::jsonb where key in ('supply_catalogue_ordering', 'supply_trade_pricing')`)
  psql(`delete from public.supply_payment_methods where name = '${METHOD.name}'`)
  if (on) psql(`insert into public.supply_payment_methods (name, instructions) values ('${METHOD.name}', '${METHOD.instructions}')`)
}
function addisLocal(msFromNow: number): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(Date.now() + msFromNow))
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
}
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const encrypt = (plain: string) => {
    const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
    return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`s6-4-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}
async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}
async function toast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible()
}

interface Person {
  id: string
  email: string
  password: string
  account?: string
}
const seeded: { org1?: string; org2?: string; cat?: string; p?: Record<'p1' | 'p2' | 'p3', { id: string; slug: string }>; a?: Person; b?: Person } = {}

/** Three HagerLand Supply products in "Landscaping" from two partners; trade customers A and B (approved). */
async function seed() {
  const d = db()
  const { data: hls } = await d.from('organisations').select('id').eq('slug', 'hagerland-supply').single()
  seeded.cat = (await d.from('product_categories').select('id').eq('slug', 'landscaping').single()).data!.id
  const org = async (name: string) => (await d.from('organisations').insert({ kind: 'supplier', name, slug: `e2e-s64-${crypto.randomUUID().slice(0, 8)}`, status: 'draft', source: 'admin' }).select('id').single()).data!.id
  seeded.org1 = await org(PARTNER_1)
  seeded.org2 = await org(PARTNER_2)
  // Partner 2's terms come from its agreement (markup 20%).
  await d.from('supply_agreements').insert({ org_id: seeded.org2, money_model: 'A', default_markup_bps: 2000, start_date: '2026-01-01', status: 'active', created_by: 'e2e' })
  const product = async (name: string, trade: number | null) =>
    (await d.from('products').insert({ name, slug: `e2e-s64-${crypto.randomUUID().slice(0, 8)}`, category_id: seeded.cat, seller_org_id: hls!.id, unit: 'bag', status: 'published', price_type: 'on_request', trade_price_etb_cents: trade }).select('id, slug').single()).data!
  seeded.p = { p1: await product(NAMES.p1, 74000), p2: await product(NAMES.p2, null), p3: await product(NAMES.p3, null) }
  // p1: cost 700.00, markup 10% → suggests 770.00. p2: cost 500.00, markup 10% → 550.00. p3: cost 987.65, agreement 20% → 1,185.18.
  await d.from('product_sources').insert([
    { product_id: seeded.p.p1.id, org_id: seeded.org1, cost_price_cents: 70000, markup_bps: 1000, is_primary: true, created_by: 'e2e' },
    { product_id: seeded.p.p2.id, org_id: seeded.org1, cost_price_cents: 50000, markup_bps: 1000, is_primary: true, created_by: 'e2e' },
    { product_id: seeded.p.p3.id, org_id: seeded.org2, cost_price_cents: 98765, is_primary: true, created_by: 'e2e' },
  ])
  const trader = async (business: string): Promise<Person> => {
    const u = await createUser({ name: business })
    const { data: t } = await d.from('trade_accounts').insert({ user_id: u.id, business_name: business, trade_type: 'Contractor', phone: CUSTOMER.phone.replace(/^0/, '+251'), status: 'approved', decided_at: new Date().toISOString() }).select('id').single()
    return { ...u, account: t!.id }
  }
  seeded.a = await trader(`Abebe Builders S64 ${stamp}`)
  seeded.b = await trader(`Bethel Contractors S64 ${stamp}`)
}

async function tradePriceText(page: Page, slug: string): Promise<string | null> {
  await page.goto(`/supplies/product/${slug}`)
  await expect(page.locator('h1')).toBeVisible()
  // The trade price arrives after the page (a private request): give it time to show.
  const badge = page.getByText(/^\s*Your trade price:/)
  try {
    await badge.waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    return null
  }
  return (await badge.textContent())?.trim() ?? null
}
async function fillBasket(page: Page, items: { key: string; productId?: string; slug?: string; name: string; quantity: number }[]) {
  await page.goto('/supplies/quote')
  await expect(page.getByRole('heading', { name: 'Get your quote' })).toBeVisible()
  await page.evaluate((list) => window.localStorage.setItem('hl_quote_v1', JSON.stringify(list.map((i) => ({ unit: 'bag', ...i })))), items)
  await page.goto('/supplies')
  await page.goto('/supplies/quote')
  await expect(page.getByRole('heading', { name: `Items (${items.length})` })).toBeVisible()
}
const basket = () => [
  { key: 'k1', productId: seeded.p!.p1.id, slug: seeded.p!.p1.slug, name: NAMES.p1, quantity: 10 },
  { key: 'k2', productId: seeded.p!.p2.id, slug: seeded.p!.p2.slug, name: NAMES.p2, quantity: 4 },
  { key: 'k3', productId: seeded.p!.p3.id, slug: seeded.p!.p3.slug, name: NAMES.p3, quantity: 2 },
]
async function accountPage(browser: Browser, who: Person, width = 1280): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await signIn(page, who.email, who.password)
  return page
}

/** Everything as before S6-4 with the switches off (checked first and again at the end). */
async function switchesOffChecks(browser: Browser) {
  const a = await accountPage(browser, seeded.a!)
  // The existing general trade price, with its existing wording (no "per bag"); nothing where there is none.
  expect(await tradePriceText(a, seeded.p!.p1.slug)).toBe('Your trade price: ETB 740 (including VAT)')
  expect(await tradePriceText(a, seeded.p!.p2.slug)).toBeNull()
  await expect(a.getByRole('link', { name: 'Request to order' })).toHaveCount(0)
  await fillBasket(a, basket())
  await expect(a.getByRole('heading', { name: 'Get your quote' })).toBeVisible()
  await a.waitForTimeout(1500)
  await expect(a.getByRole('button', { name: 'Request to order these items' })).toHaveCount(0)
  await expect(a.getByText('No payment now. We check stock first, then reserve it for you.')).toHaveCount(0)
  expect((await a.goto('/account/trade-orders'))?.status()).toBe(404)
  await a.goto('/account')
  await expect(a.getByRole('link', { name: 'Your trade orders' })).toHaveCount(0)
  await a.close()
  const b = await accountPage(browser, seeded.b!)
  expect(await tradePriceText(b, seeded.p!.p1.slug)).toBe('Your trade price: ETB 740 (including VAT)')
  await b.close()
  const visitor = await browser.newPage()
  await asFreshVisitor(visitor)
  expect(await tradePriceText(visitor, seeded.p!.p1.slug)).toBeNull()
  const api = await visitor.request.get(`/api/trade-prices?ids=${seeded.p!.p1.id}&effective=1`)
  expect(await api.json()).toEqual({ prices: {} })
  await visitor.close()
}

const journey: { id?: string; reference?: string; path?: string; lines?: Record<string, string> } = {}

test.afterAll(() => switches(false))

test('switches off: product pages, the basket and the account are exactly as before', async ({ browser }) => {
  switches(false)
  await seed()
  await switchesOffChecks(browser)
})

test('the owner adds trade prices for customer A; below cost and overlaps are refused with a clear message', async ({ page }) => {
  await adminSession(page)
  await page.goto('/roodber8/trade-accounts?status=approved')
  await page.getByRole('link', { name: (await db().from('trade_accounts').select('reference').eq('id', seeded.a!.account!).single()).data!.reference }).click()
  await expect(page.getByRole('heading', { name: 'Trade prices' })).toBeVisible()
  await expect(page.getByText('No trade prices yet.')).toBeVisible()
  await expect(page.getByText('Trade pricing is off: customers do not see these prices yet, and reservations use the partner terms.')).toBeVisible()
  const add = async (opts: { product?: string; category?: string; price?: string; discount?: string }) => {
    if (opts.product) {
      await page.locator('#tp-target').selectOption('product')
      await page.locator('#tp-product').selectOption({ label: opts.product })
    } else {
      await page.locator('#tp-target').selectOption('category')
      await page.locator('#tp-category').selectOption({ label: opts.category! })
    }
    if (opts.discount) {
      await page.locator('#tp-kind').selectOption('discount')
      await page.fill('#tp-discount', opts.discount)
    } else {
      if (opts.category) await page.locator('#tp-kind').selectOption('price')
      await page.fill('#tp-price', opts.price!)
    }
    await page.getByRole('button', { name: 'Add trade price' }).click()
  }
  // Below what HagerLand pays the partner (500.00): refused before saving.
  await add({ product: NAMES.p2, price: '499' })
  await toast(page, 'Below what HagerLand pays the partner (ETB 500). Choose a higher price.')
  await add({ product: NAMES.p1, price: '750' })
  await toast(page, 'Trade price saved.')
  await page.reload()
  // The same product in the same dates: refused by the database.
  await add({ product: NAMES.p1, price: '755' })
  await toast(page, 'This customer already has a price for that item in those dates. End it first, or choose other dates.')
  // A 60% category discount puts the kerb stones (550.00 → 220.00) below the 500.00 paid: refused, naming the products (earlier local runs' products in the category are named too).
  await page.reload()
  await add({ category: 'Landscaping', discount: '60' })
  await expect(page.getByText(/^Below what HagerLand pays the partner for: .*Kerb stone S64 .*Choose a higher price or a smaller discount\.$/).first()).toBeVisible()
  await page.reload()
  await add({ category: 'Landscaping', discount: '5' })
  await toast(page, 'Trade price saved.')
  const { data: rows } = await db().from('trade_price_agreements').select('product_id, category_id, price_cents, discount_bps, status').eq('trade_account_id', seeded.a!.account!)
  expect(rows).toHaveLength(2)
  expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ product_id: seeded.p!.p1.id, price_cents: 75000, status: 'active' }), expect.objectContaining({ category_id: seeded.cat, discount_bps: 500 })]))
  // The preview: every covered product, its rule, the partner payable and the no-loss result.
  await page.reload()
  const preview = page.locator('section', { has: page.getByRole('heading', { name: 'Effective prices today' }) })
  await expect(preview.locator('tr', { hasText: NAMES.p1 })).toContainText('ETB 750Agreed product price')
  await expect(preview.locator('tr', { hasText: NAMES.p2 })).toContainText('ETB 522.50Category discount')
  await expect(preview.locator('tr', { hasText: NAMES.p3 })).toContainText('ETB 1,125.92Category discount')
  await expect(preview.locator('tr', { hasText: NAMES.p3 })).toContainText('ETB 987.65Pass: not below the partner payable')
  // B: a price, then ended with a reason (kept, no longer used).
  await page.goto(`/roodber8/trade-accounts/${seeded.b!.account}`)
  await add({ product: NAMES.p1, price: '760' })
  await toast(page, 'Trade price saved.')
  await page.reload()
  await page.getByRole('button', { name: 'End', exact: true }).click()
  await page.getByLabel('Reason (kept in admin)').fill('Agreed by phone: back to the general trade price.')
  await page.getByRole('button', { name: 'End trade price' }).click()
  await toast(page, 'Trade price ended.')
  await page.reload()
  await expect(page.getByText('Ended: Agreed by phone: back to the general trade price.')).toBeVisible()
  // The owner's CSV: references and prices, no phone, TIN, cost or partner.
  const csv = await page.request.get('/roodber8/trade-accounts/prices/export')
  expect(csv.status()).toBe(200)
  const text = await csv.text()
  expect(text).toContain('trade_account,business,product,category,price_etb,discount_percent,valid_from,valid_until,status,end_reason,note')
  expect(text).toContain(`Abebe Builders S64 ${stamp},${NAMES.p1},,750.00`)
  expect(text).toContain(`Abebe Builders S64 ${stamp},,Landscaping,,5`)
  for (const secret of ['987.65', '700.00', PARTNER_1, CUSTOMER.phone.replace(/^0/, '+251')]) expect(text, secret).not.toContain(secret)
})

test('switches on: A sees their own prices per unit; B sees the general one; a visitor sees nothing (375 px)', async ({ browser }) => {
  switches(true)
  const a = await accountPage(browser, seeded.a!, 375)
  expect(await tradePriceText(a, seeded.p!.p1.slug)).toBe('Your trade price: ETB 750 per bag (including VAT)')
  await noHorizontalScroll(a)
  expect(await tradePriceText(a, seeded.p!.p2.slug)).toBe('Your trade price: ETB 522.50 per bag (including VAT)')
  expect(await tradePriceText(a, seeded.p!.p3.slug)).toBe('Your trade price: ETB 1,125.92 per bag (including VAT)')
  // A's prices never reach anyone else, even when asked for directly.
  const asB = await accountPage(browser, seeded.b!, 375)
  expect(await tradePriceText(asB, seeded.p!.p1.slug)).toBe('Your trade price: ETB 740 per bag (including VAT)')
  expect(await tradePriceText(asB, seeded.p!.p2.slug)).toBeNull()
  const bApi = await asB.request.get(`/api/trade-prices?ids=${seeded.p!.p1.id},${seeded.p!.p2.id},${seeded.p!.p3.id}&effective=1`)
  expect(await bApi.json()).toEqual({ prices: { [seeded.p!.p1.id]: 74000 } })
  await asB.close()
  const visitor = await browser.newPage({ viewport: { width: 375, height: 800 } })
  await asFreshVisitor(visitor)
  expect(await tradePriceText(visitor, seeded.p!.p1.slug)).toBeNull()
  await noHorizontalScroll(visitor)
  await fillBasket(visitor, basket())
  await visitor.waitForTimeout(1500)
  await expect(visitor.getByRole('button', { name: 'Request to order these items' })).toHaveCount(0)
  await visitor.close()
  // "Your trade orders" in A's account menu, empty so far.
  await a.goto('/account/trade-orders')
  await expect(a.getByRole('heading', { name: 'Your trade orders' })).toBeVisible()
  await expect(a.getByText('No trade orders yet.')).toBeVisible()
  await noHorizontalScroll(a)
  await a.close()
})

test('A orders the whole basket (3 items, 2 partners) as one order request; a custom item hides the button', async ({ browser }) => {
  const a = await accountPage(browser, seeded.a!, 375)
  await fillBasket(a, [...basket(), { key: 'k4', name: 'Something not in the catalogue', quantity: 1 }])
  await a.waitForTimeout(1500)
  await expect(a.getByRole('button', { name: 'Request to order these items' })).toHaveCount(0)
  // A signed-in basket is kept with the account too: the custom item is removed on the page.
  await a.getByRole('button', { name: 'Remove Something not in the catalogue' }).click()
  await expect(a.getByRole('heading', { name: 'Items (3)' })).toBeVisible()
  await a.getByRole('button', { name: 'Request to order these items' }).click()
  await expect(a.getByText('No payment now. We check stock first, then reserve it for you.')).toBeVisible()
  await noHorizontalScroll(a)
  await a.fill('#or-name', 'Abebe Kebede')
  await a.fill('#or-phone', CUSTOMER.phone)
  await a.fill('#or-email', seeded.a!.email)
  await a.locator('#or-area').fill('Bole')
  await a.getByRole('option', { name: /^Bole/ }).first().click()
  await a.fill('#or-address', CUSTOMER.address)
  await tickTransferConsent(a)
  await a.getByRole('button', { name: 'Send order request' }).click()
  await a.waitForURL(/\/supplies\/order-requests\/[A-Za-z0-9_-]{43}\?sent=1$/)
  const reference = (await a.locator('h1').textContent())!.replace('Order request ', '').trim()
  await expect(a.getByText(`Thank you. Your order request ${reference} is with our team. We will check stock and contact you. You have not paid anything.`)).toBeVisible()
  await expect(a.getByTestId('order-request-status')).toHaveText('Checking stock')
  journey.reference = reference
  journey.path = new URL(a.url()).pathname
  // The basket is cleared after sending.
  await a.goto('/supplies/quote')
  await expect(a.getByRole('heading', { name: 'Items (0)' })).toBeVisible()
  await a.close()
  const { data: r } = await db().from('order_requests').select('id, requester_user_id, status').eq('reference', reference).single()
  expect(r).toMatchObject({ requester_user_id: seeded.a!.id, status: 'submitted' })
  journey.id = r!.id
  const { data: lines } = await db().from('order_request_lines').select('id, product_id, quantity').eq('order_request_id', r!.id)
  expect(lines!.map((l) => [l.product_id, Number(l.quantity)]).sort()).toEqual([[seeded.p!.p1.id, 10], [seeded.p!.p2.id, 4], [seeded.p!.p3.id, 2]].sort())
  journey.lines = Object.fromEntries(lines!.map((l) => [l.product_id, l.id]))
  // The S6-2 email, unchanged.
  const mail = await mailWithSubject(seeded.a!.email, `We received your order request (${reference})`)
  expect(mail.text).toContain('Thank you. We are checking stock and will contact you. You have not paid anything yet.')
})

test('stock check → reservation priced from A’s trade terms (one override, in the history) → payment → 2 supplier orders → delivered → due to partners', async ({ page, browser }) => {
  await adminSession(page)
  page.on('dialog', (d) => void d.accept())
  await page.goto(`/roodber8/supply/order-requests/${journey.id}`)
  await page.getByRole('button', { name: 'Start stock check' }).click()
  await toast(page, 'Checking stock.')
  for (const [product, qty] of [[seeded.p!.p1.id, '10'], [seeded.p!.p2.id, '4'], [seeded.p!.p3.id, '2']] as const) {
    const line = journey.lines![product]
    await page.locator(`#ls-${line}`).selectOption('confirmed')
    await page.locator(`#ls-${line}`).locator('xpath=ancestor::div[contains(@class,"items-end")][1]').getByRole('button', { name: 'Save' }).click()
    await toast(page, 'Saved.')
    await page.fill(`#hq-${line}`, qty)
    await page.fill(`#hu-${line}`, addisLocal(3 * 86_400_000))
    await page.locator(`#hp-${line}`).locator('xpath=ancestor::div[contains(@class,"grid")][1]').getByRole('button', { name: 'Record hold' }).click()
    await toast(page, 'Hold recorded.')
  }
  await page.reload()
  // Pre-filled with A's trade prices, not the partner-terms suggestions (770.00, 550.00, 1,185.18).
  await expect(page.locator(`#rp-${journey.lines![seeded.p!.p1.id]}`)).toHaveValue('750.00')
  await expect(page.locator(`#rp-${journey.lines![seeded.p!.p2.id]}`)).toHaveValue('522.50')
  await expect(page.locator(`#rp-${journey.lines![seeded.p!.p3.id]}`)).toHaveValue('1125.92')
  await expect(page.getByText('trade price ETB 750 (agreed product price)')).toBeVisible()
  // The owner overrides one price (kept in the history).
  await page.fill(`#rp-${journey.lines![seeded.p!.p3.id]}`, '1130')
  await page.fill(`#rd-${journey.id}`, '500')
  await page.getByRole('button', { name: 'Reserve and email how to pay' }).click()
  await toast(page, 'Reserved. The customer was emailed how to pay.')
  // 10 × 750 = 7,500.00; 4 × 522.50 = 2,090.00; 2 × 1,130 = 2,260.00; delivery 500 → 12,350.00
  const { data: r } = await db().from('order_requests').select('status, lines_total_cents, customer_total_cents').eq('id', journey.id!).single()
  expect(r).toMatchObject({ status: 'reserved', lines_total_cents: 1185000, customer_total_cents: 1235000 })
  const { data: priced } = await db().from('order_request_lines').select('product_id, customer_unit_price_cents, partner_payable_unit_cents').eq('order_request_id', journey.id!)
  const by = Object.fromEntries(priced!.map((l) => [l.product_id, [l.customer_unit_price_cents, l.partner_payable_unit_cents]]))
  expect(by).toEqual({ [seeded.p!.p1.id]: [75000, 70000], [seeded.p!.p2.id]: [52250, 50000], [seeded.p!.p3.id]: [113000, 98765] })
  const { data: overrides } = await db().from('order_request_events').select('detail').eq('order_request_id', journey.id!).eq('event_type', 'price_override')
  expect(overrides).toEqual([{ detail: expect.objectContaining({ line: journey.lines![seeded.p!.p3.id], suggested_cents: 112592, price_cents: 113000, trade: true }) }])
  await mailWithSubject(seeded.a!.email, `Your items are reserved (${journey.reference})`)

  // A part payment: A's account shows the total, what is paid and what is waiting.
  await page.reload()
  await page.fill(`#pa-${journey.id}`, '5000')
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await toast(page, 'Recorded.')
  const a = await accountPage(browser, seeded.a!, 375)
  await a.goto('/account')
  await a.getByRole('link', { name: 'Your trade orders' }).first().click()
  await expect(a.getByRole('heading', { name: 'Your trade orders' })).toBeVisible()
  await expect(a.getByText('Waiting for payment: ETB 7,350')).toBeVisible()
  const card = a.locator('li', { hasText: journey.reference! })
  await expect(card).toContainText('12,350.00')
  await expect(card).toContainText('5,000.00')
  await expect(card).toContainText(/Reserved until .* \(Addis Ababa time\): pay ETB 12,350 \(including VAT\) by then/)
  await noHorizontalScroll(a)
  // The reference opens the S6-2 order request page.
  await card.getByRole('link', { name: journey.reference! }).click()
  await expect(a.locator('h1')).toHaveText(`Order request ${journey.reference}`)

  await page.fill(`#pa-${journey.id}`, '7,350')
  await page.getByRole('button', { name: 'Record', exact: true }).click()
  await toast(page, 'Recorded. Paid in full: the customer was emailed.')
  await page.reload()
  await page.getByRole('button', { name: 'Create supplier orders' }).click()
  await toast(page, /Supplier orders HLO-\d{4}-\d{6}, HLO-\d{4}-\d{6} created and paid from the customer's payment\./)
  const { data: orders } = await db().from('supply_orders').select('id, org_id').eq('order_request_id', journey.id!)
  expect(orders!.map((o) => o.org_id).sort()).toEqual([seeded.org1, seeded.org2].sort())
  for (const o of orders!) {
    for (const s of ['placed', 'confirmed', 'out_for_delivery', 'delivered']) await db().from('supply_orders').update({ status: s, updated_by: 'e2e' }).eq('id', o.id)
    await db().from('supply_delivery_proofs').insert({ order_id: o.id, file_path: `proofs/${o.id}/e2e.jpg`, file_type: 'image/jpeg', file_size_bytes: 1000, uploaded_by: 'e2e' })
  }
  // What HagerLand owes each partner: 10 × 700 + 4 × 500 = 9,000.00; 2 × 987.65 = 1,975.30.
  const payable = Object.fromEntries(await Promise.all(orders!.map(async (o) => [o.org_id, Number((await db().rpc('supply_order_payable_cents', { p_order: o.id })).data)])))
  expect(payable).toEqual({ [seeded.org1!]: 900000, [seeded.org2!]: 197530 })
  await page.goto('/roodber8/supply/settlements')
  await expect(page.locator('li', { hasText: PARTNER_1 }).first()).toContainText('due now ETB 9,000')
  await expect(page.locator('li', { hasText: PARTNER_2 }).first()).toContainText('due now ETB 1,975.30')
  await a.goto('/account/trade-orders')
  const row = a.locator('li', { hasText: journey.reference! })
  await expect(row).toContainText('Delivered')
  await expect(row).toContainText('12,350.00')
  await expect(a.getByText(/^Waiting for payment/)).toHaveCount(0)
  await a.close()
})

test('Operations, Agent and Content are refused the trade prices page and CSV; Operations still see the list without links', async ({ browser }) => {
  for (const role of ['operations', 'agent', 'content'] as const) {
    const staff = await staffPage(browser, role)
    await staff.goto(`/roodber8/trade-accounts/${seeded.a!.account}`)
    await expect(staff, role).toHaveURL(/denied=1/)
    await expect(staff.getByRole('heading', { name: 'Trade prices' })).toHaveCount(0)
    expect(await staff.locator('body').innerText()).not.toMatch(/ETB 750|Agreed product price|Effective prices today/)
    const res = await staff.request.get('/roodber8/trade-accounts/prices/export', { maxRedirects: 0 })
    expect(res.status(), role).not.toBe(200)
    expect(await res.text()).not.toMatch(/price_etb|Abebe Builders/)
    if (role === 'operations') {
      await staff.goto('/roodber8/trade-accounts?status=approved')
      await expect(staff.getByText(`Abebe Builders S64 ${stamp}`)).toBeVisible()
      await expect(staff.locator(`a[href="/roodber8/trade-accounts/${seeded.a!.account}"]`)).toHaveCount(0)
    }
    await staff.close()
  }
})

test('switches off again: everything is exactly as before; agreements stay for later', async ({ browser }) => {
  switches(false)
  await switchesOffChecks(browser)
  expect((await db().from('trade_price_agreements').select('id').eq('trade_account_id', seeded.a!.account!).eq('status', 'active')).data).toHaveLength(2)
})
