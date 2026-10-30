import crypto from 'node:crypto'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page, type Request } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, allMail, assertLocalStack, createUser, db, randomPhone, signIn, uniqueEmail, submitStaffSignIn, tickTransferConsent } from '../helpers'

// The "Supply A–Z test" of docs/LIVE_JOURNEY_TEST.md as one journey through the real admin screens, on the local copy
// only: a new private supplier, its prices and agreement, a customer's materials list, suppliers asked and chosen,
// model A and model B orders to completion, the unhappy paths, roles, the customer's view, phone widths and the digest.
// Screenshots go to test-results/supply-a-z (git-ignored).

test.describe.configure({ mode: 'serial' })
test.use({ actionTimeout: 20_000 })
test.beforeAll(() => {
  assertLocalStack()
  execFileSync('bash', ['scripts/seed-supply-local.sh'], { stdio: 'ignore' })
  fs.mkdirSync(SHOTS, { recursive: true })
})

// The checklist's contact phone (0911 23 45 67) is also used by supply-partners.spec.ts: remove ours afterwards.
test.afterAll(async () => {
  if (S.orgId) await db().from('supply_contacts').delete().eq('org_id', S.orgId)
})

const SHOTS = 'test-results/supply-a-z'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')
const MERKATO = '5eed0000-0000-4000-8000-000000000002'
const ABEBE = '5eed0000-0000-4000-8000-000000000001'
const ENDED_AGREEMENT = '5eeda000-0000-4000-8000-000000000006'
const addisToday = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10)
const addisDay = (n: number) => new Date(Date.now() + 3 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10)

let shotNo = 0
async function shot(page: Page, name: string) {
  shotNo++
  await page.screenshot({ path: `${SHOTS}/${String(shotNo).padStart(2, '0')}-${name}.png`, fullPage: true })
}
const log = (step: string, note: string) => console.log(`A–Z ${step}: PASS — ${note}`)

/** Shared between the tests of this file (they run in order). */
const S = {
  stamp: Date.now(),
  name: '',
  orgId: '',
  phone: randomPhone(),
  customer: { id: '', email: '', password: '' },
  quoteId: '',
  ref: '',
  orderA: { id: '', reference: '' },
  orderB: { id: '', reference: '' },
  orderCancel: { id: '', reference: '' },
  actions: {} as Record<string, { url: string; headers: Record<string, string>; body: string }>,
}

/** Remembers the next server action the page posts (to replay it later as another role). */
function captureAction(page: Page, key: string) {
  const handler = (req: Request) => {
    const h = req.headers()
    if (req.method() === 'POST' && h['next-action'] && !S.actions[key]) {
      S.actions[key] = { url: req.url(), headers: { 'next-action': h['next-action'], 'content-type': h['content-type'] ?? 'text/plain;charset=UTF-8', accept: 'text/x-component' }, body: req.postData() ?? '' }
      page.off('request', handler)
    }
  }
  page.on('request', handler)
}

const section = (page: Page, item: string) => page.getByRole('region', { name: `Suppliers for ${item}` })

async function addItem(page: Page, name: string, category: string | null, quantity: string, unit: string) {
  const form = page.getByRole('group', { name: 'Add item' })
  await form.getByLabel('Item').fill(name)
  if (category) await form.getByLabel('Category').selectOption({ label: category })
  await form.getByLabel('Quantity').fill(quantity)
  await form.getByLabel('Unit').selectOption(unit)
  await form.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('cell', { name: new RegExp(`^${name}`) })).toBeVisible()
}

async function reply(page: Page, item: string, supplier: string, price: string, quantity: string, delivery: string, save: boolean) {
  const box = section(page, item)
  await box.getByRole('row', { name: new RegExp(supplier.replace(/[()]/g, '\\$&')) }).getByRole('button', { name: 'Enter reply' }).click()
  await box.getByLabel(/Unit price/).fill(price)
  await box.getByLabel('Quantity').fill(quantity)
  await box.getByLabel('Delivery charge (ETB)').fill(delivery)
  await box.getByLabel('Valid until').fill(addisDay(7))
  if (!save) await box.getByLabel('Also save as this supplier’s current price').uncheck()
  await box.getByRole('button', { name: 'Save reply' }).click()
  await expect(box.getByRole('button', { name: 'Save reply' })).toHaveCount(0)
}

/** Waits for the refresh that follows a save, so each check reads the updated page. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
}

async function ledgerCount(orderId: string, type?: string) {
  let q = db().from('supply_ledger_entries').select('id').eq('order_id', orderId)
  if (type) q = q.eq('entry_type', type)
  return ((await q).data ?? []).length
}

async function phonePage(browser: Browser) {
  // A plain 375px window: phone emulation widens the page to fit overflow, hiding sideways scrolling.
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const page = await context.newPage()
  await adminSession(page)
  return page
}

async function noSidewaysScroll(page: Page, what: string) {
  const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(scroll, `${what}: page is wider than the screen`).toBeLessThanOrEqual(width)
}

async function reachable(page: Page, name: string | RegExp, scope = page.locator('body')) {
  const button = scope.getByRole('button', { name }).first()
  await button.scrollIntoViewIfNeeded()
  const box = await button.boundingBox()
  expect(box, `${String(name)} has a size`).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width, `${String(name)} fits the screen`).toBeLessThanOrEqual(376)
  expect(box!.height, `${String(name)} tap target`).toBeGreaterThanOrEqual(36)
}

test('T1 steps 1–4: add a private supplier, its supply record, prices and a model A agreement', async ({ page }) => {
  test.setTimeout(240_000)
  const d = db()
  S.name = `A-Z Cement Depot ${S.stamp}`
  await adminSession(page)

  // Step 1: Supply partners → Add new supplier (private).
  await page.goto('/roodber8/supply/partners')
  await page.getByRole('link', { name: 'Add new supplier' }).click()
  await expect(page.locator('#org-vis-private')).toBeChecked()
  await page.fill('#org-name', S.name)
  await page.fill('#org-location', 'Bole')
  await page.getByRole('option', { name: /Bole/ }).first().click()
  await page.fill('#org-phone', S.phone)
  await page.getByRole('button', { name: 'Create supplier' }).click()
  await page.waitForURL(/\/roodber8\/organisations\/[0-9a-f-]{36}\?created=1/)
  S.orgId = /organisations\/([0-9a-f-]{36})/.exec(page.url())![1]
  await expect(page.getByText('Private: not shown on the public site.')).toBeVisible()
  expect((await d.from('organisations').select('status').eq('id', S.orgId).single()).data?.status).toBe('draft')
  expect((await d.from('supply_partners').select('relationship_status').eq('org_id', S.orgId).single()).data?.relationship_status).toBe('discovered')
  await shot(page, 'step1-created-private')
  // The same business again: warned by phone (typed with spaces) and by name; not created.
  await page.goto('/roodber8/supply/partners')
  await page.getByRole('link', { name: 'Add new supplier' }).click()
  await page.fill('#org-name', S.name)
  await page.fill('#org-location', 'Bole')
  await page.getByRole('option', { name: /Bole/ }).first().click()
  await page.fill('#org-phone', `${S.phone.slice(0, 4)} ${S.phone.slice(4, 6)} ${S.phone.slice(6, 8)} ${S.phone.slice(8)}`)
  await page.getByRole('button', { name: 'Create supplier' }).click()
  await expect(page.getByRole('heading', { name: 'Possible duplicates' })).toBeVisible()
  await expect(page.getByRole('link', { name: S.name })).toHaveAttribute('href', `/roodber8/organisations/${S.orgId}`)
  await shot(page, 'step1-duplicate-warning')
  expect((await d.from('organisations').select('id').eq('name', S.name)).data).toHaveLength(1)
  log('Step 1', 'private supplier created (draft, “Discovered”); a second try with the same phone and name shows “Possible duplicates”')

  // Step 2: roles, contact, verification dates, evidence photo; status to Active so it can be suggested.
  await page.goto(`/roodber8/organisations/${S.orgId}`)
  await page.locator('#sp-role-wholesaler').check()
  await page.locator('#sp-lic').fill(addisDay(-2))
  await page.locator('#sp-visit').fill(addisDay(-1))
  await page.getByRole('button', { name: 'Save supply record' }).click()
  await expect.poll(async () => (await d.from('supply_partners').select('reverify_by').eq('org_id', S.orgId).single()).data?.reverify_by).toBeTruthy()
  const partner = (await d.from('supply_partners').select('roles, reverify_by, verified_by').eq('org_id', S.orgId).single()).data!
  expect(partner.roles).toContain('wholesaler')
  await page.reload()
  await page.locator('#supply-partner input[type=file]').setInputFiles({ name: 'shop.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('Evidence (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.locator('#sc-name').fill('Sales desk')
  await page.locator('#sc-phone').fill('0911 23 45 67')
  await page.getByRole('button', { name: 'Add contact' }).click()
  await expect.poll(async () => (await d.from('supply_contacts').select('phone_normalised').eq('org_id', S.orgId).maybeSingle()).data?.phone_normalised).toBe('+251911234567')
  await page.locator('#sp-status').selectOption('active')
  await page.getByRole('button', { name: 'Change status' }).click()
  await expect.poll(async () => (await d.from('supply_partners').select('relationship_status').eq('org_id', S.orgId).single()).data?.relationship_status).toBe('active')
  await shot(page, 'step2-partner-panel')
  await page.goto('/roodber8/supply/partners')
  await page.getByPlaceholder('Name, other name or phone').fill('+251911234567')
  await page.getByRole('button', { name: 'Filter' }).click()
  await expect(page.getByRole('link', { name: S.name })).toBeVisible()
  log('Step 2', `wholesaler role, licence and site visit dates (re-verify by ${partner.reverify_by}), evidence photo, contact found as +251911234567, status Active`)

  // Step 3: price list: one price by hand (delivers to Bole), a pasted list of 3 (no delivery areas), a replacement.
  await page.goto(`/roodber8/organisations/${S.orgId}`)
  await page.getByRole('link', { name: 'Open price list' }).click()
  await page.waitForURL(`**/roodber8/supply/partners/${S.orgId}/offers`)
  await page.getByRole('button', { name: 'Add price' }).click()
  await page.locator('#of-category').selectOption({ label: 'Building materials › Cement & concrete' })
  await page.locator('#of-item').fill('Habesha cement 50kg')
  await page.locator('#of-unit').selectOption('bag')
  await page.locator('#of-price').fill('1,250')
  await expect(page.locator('#of-valid')).toHaveValue(addisDay(7))
  await page.locator('#of-areas').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.locator('#of-charge').fill('500')
  await page.locator('#of-lead').fill('1')
  await page.locator('#of-vat').selectOption('yes')
  await page.locator('#of-source').selectOption('direct_call')
  await page.getByRole('button', { name: 'Save price' }).click()
  await expect(page.getByRole('cell', { name: /ETB 1,250/ }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Paste a price list' }).click()
  await page.locator('#pl-text').fill('Rebar 12mm, piece, 990\nHollow block 15cm, piece, 34\nRiver sand, m3, 2500')
  await page.getByRole('button', { name: 'Check the list' }).click()
  await page.getByLabel('Category for line 1').selectOption({ label: 'Building materials › Steel & rebar' })
  await page.getByLabel('Category for line 2').selectOption({ label: 'Building materials › Blocks & bricks' })
  await page.getByLabel('Category for line 3').selectOption({ index: 1 })
  await page.locator('#pl-source').selectOption('price_list_photo')
  await page.getByRole('button', { name: 'Save 3 prices' }).click()
  await expect.poll(async () => (await d.from('supplier_offers').select('id').eq('org_id', S.orgId).eq('status', 'current')).data?.length).toBe(4)
  await page.getByRole('button', { name: 'Add price' }).click()
  await page.locator('#of-category').selectOption({ label: 'Building materials › Cement & concrete' })
  await page.locator('#of-item').fill('Habesha cement 50kg')
  await page.locator('#of-unit').selectOption('bag')
  await page.locator('#of-price').fill('1300')
  await page.locator('#of-areas').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.locator('#of-charge').fill('500')
  await page.locator('#of-source').selectOption('direct_call')
  await page.getByRole('button', { name: 'Save price' }).click()
  await expect.poll(async () => (await d.from('supplier_offers').select('status, price_etb_cents').eq('org_id', S.orgId).eq('item_key', 'habesha cement 50kg').order('price_etb_cents')).data).toEqual([
    { status: 'superseded', price_etb_cents: 125000 },
    { status: 'current', price_etb_cents: 130000 },
  ])
  await page.reload()
  await page.getByRole('button', { name: 'History (1)' }).click()
  await expect(page.getByText(/ETB 1,250 · dated/)).toBeVisible()
  await shot(page, 'step3-price-list')
  log('Step 3', 'cement price valid for 7 days by default; pasted 3 lines saved; ETB 1,300 replaced ETB 1,250, which stays in History (1)')

  // Step 4: model A agreement with the signed PDF; a second active one is refused by the database.
  await page.goto(`/roodber8/organisations/${S.orgId}`)
  await page.getByRole('button', { name: 'Add agreement' }).click()
  const ag = page.getByRole('group', { name: 'Add agreement' })
  await ag.getByLabel('Money model').selectOption('A')
  await ag.getByLabel('Payment terms').fill('Cash on delivery note')
  await ag.getByLabel('Signed agreement (photo or PDF)').setInputFiles({ name: 'agreement.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(ag.getByText('Uploaded: agreement.pdf')).toBeVisible()
  await ag.getByRole('button', { name: 'Save agreement' }).click()
  await expect(page.getByRole('link', { name: 'Signed agreement' })).toBeVisible()
  expect((await d.from('supply_agreements').insert({ org_id: S.orgId, money_model: 'B', commission_rate_bps: 500, start_date: addisToday(), status: 'active' })).error?.code).toBe('23505')
  await shot(page, 'step4-agreement')
  log('Step 4', 'active model A agreement with signed PDF (10-minute link); a second active agreement is refused (unique rule)')
})

test('T1 steps 5–13 with T2 (model A), T3 (model B) and T4 (unhappy paths)', async ({ page, browser }) => {
  test.setTimeout(600_000)
  const d = db()
  // Step 5: the customer sends a materials list for delivery to Bole.
  S.customer = await createUser({ name: 'Hanna Tesfaye' })
  const customer = await browser.newPage()
  await signIn(customer, S.customer.email, S.customer.password)
  await customer.goto('/supplies/materials-list')
  await customer.fill('#q-notes', '50 bags cement\n100 rebar 12mm\n250 hollow blocks 20cm')
  await customer.fill('#q-name', 'Hanna Tesfaye')
  await customer.fill('#q-phone', randomPhone())
  await customer.fill('#q-email', S.customer.email)
  await customer.fill('#q-loc', 'Bole')
  await customer.getByRole('option', { name: /^Bole/ }).first().click()
  await tickTransferConsent(customer)
  await customer.getByRole('button', { name: 'Request my quote' }).click()
  await customer.waitForURL(/\/supplies\/quote\/sent\?ref=HLQ-/)
  S.ref = new URL(customer.url()).searchParams.get('ref')!
  S.quoteId = (await d.from('quote_requests').select('id').eq('reference', S.ref).single()).data!.id
  await adminSession(page)
  await page.goto('/roodber8/quotes')
  await page.getByRole('link', { name: S.ref }).click()
  await page.waitForURL(`**/roodber8/quotes/${S.quoteId}`)
  log('Step 5', `customer sent ${S.ref} (delivery to Bole); it appears in Quotes`)

  // Step 6: items, suggestions with reasons, and partners left out with reasons.
  await addItem(page, 'Habesha cement 50kg', 'Building materials › Cement & concrete', '50', 'bag')
  await addItem(page, 'Rebar 12mm', null, '100', 'piece')
  await addItem(page, 'Hollow block 20cm', 'Building materials › Blocks & bricks', '250', 'piece')
  const cement = section(page, 'Habesha cement 50kg')
  const rebar = section(page, 'Rebar 12mm')
  const blocks = section(page, 'Hollow block 20cm')
  const suggested = cement.getByRole('listitem')
  // The best 3 show first; the rest behind "Show N more" (Supply polish P3).
  await expect(suggested).toHaveCount(3)
  await cement.getByRole('button', { name: /^Show \d+ more$/ }).click()
  await expect(suggested.filter({ hasText: S.name })).toContainText('Active partner. Delivers to Bole. Price checked today.')
  await expect(suggested.filter({ hasText: S.name })).toContainText('No delivery history yet.')
  await expect(suggested.filter({ hasText: 'Merkato Steel House (seed)' })).toContainText(/Replied to \d+ of \d+ requests/)
  const totals = (await suggested.allInnerTexts()).map((t) => Number(/delivered total ETB ([\d,]+\.\d\d)/.exec(t)?.[1].replace(/,/g, '') ?? 'NaN')).filter((n) => !Number.isNaN(n))
  expect(totals.length).toBeGreaterThanOrEqual(3)
  expect([...totals].sort((a, b) => a - b)).toEqual(totals)
  await expect(cement.getByRole('checkbox', { name: 'Select Bole Trading (seed)' })).toBeDisabled()
  await rebar.getByRole('button', { name: /not suggested, with reasons/ }).click()
  await expect(rebar.getByRole('listitem').filter({ hasText: S.name })).toContainText('No delivery areas recorded')
  await expect(rebar.getByText(/Price expired/)).toBeVisible()
  await shot(page, 'step6-suggestions')
  log('Step 6', `cheapest delivered total first (${totals.join(' ≤ ')}); reasons with reliability; Bole Trading (do not contact) cannot be ticked; “No delivery areas recorded” and “Price expired” reasons (T4)`)

  // Step 7: ask (nothing sent), replies (one saved as the supplier's price), comparison, basket, choice.
  await rebar.getByLabel('Add supplier manually').selectOption({ label: 'Merkato Steel House (seed)' })
  await rebar.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(rebar.getByText('Added by staff')).toBeVisible()
  await cement.getByRole('checkbox', { name: `Select ${S.name}` }).check()
  await cement.getByRole('checkbox', { name: 'Select Merkato Steel House (seed)' }).check()
  await rebar.getByRole('checkbox', { name: 'Select Merkato Steel House (seed)' }).check()
  await blocks.getByRole('checkbox', { name: 'Select Abebe Building Materials (seed)' }).check()
  await page.getByRole('button', { name: 'Mark as asked' }).click()
  await expect(page.getByText(/Marked 4 suppliers as asked\. Nothing was sent/)).toBeVisible()
  await page.reload()
  await reply(page, 'Habesha cement 50kg', S.name, '1,280', '50', '500', true)
  await reply(page, 'Habesha cement 50kg', 'Merkato Steel House (seed)', '1220', '50', '1000', false)
  await reply(page, 'Rebar 12mm', 'Merkato Steel House (seed)', '975', '100', '0', false)
  await reply(page, 'Hollow block 20cm', 'Abebe Building Materials (seed)', '38.50', '250', '300', false)
  expect((await d.from('supplier_offers').select('price_etb_cents, source_note').eq('org_id', S.orgId).eq('item_key', 'habesha cement 50kg').eq('status', 'current').single()).data).toMatchObject({ price_etb_cents: 128000, source_note: `Reply to quote ${S.ref}` })
  await expect(cement.getByRole('row', { name: /Merkato Steel House/ })).toContainText('Cheapest')
  await expect(page.getByText('Basket: one supplier or several?')).toBeVisible()
  await cement.getByRole('row', { name: new RegExp(S.name) }).getByRole('button', { name: 'Choose' }).click()
  await expect(cement.getByRole('row', { name: new RegExp(S.name) }).getByText('chosen')).toBeVisible()
  // T4: a second supplier for the same item is refused.
  await cement.getByRole('row', { name: /Merkato Steel House/ }).getByRole('button', { name: 'Choose' }).click()
  await expect(cement.getByText('Another supplier is already chosen for this item. Undo that choice first.')).toBeVisible()
  await rebar.getByRole('row', { name: /Merkato Steel House/ }).getByRole('button', { name: 'Choose' }).click()
  await expect(rebar.getByRole('row', { name: /Merkato Steel House/ }).getByText('chosen')).toBeVisible()
  await blocks.getByRole('row', { name: /Abebe Building Materials/ }).getByRole('button', { name: 'Choose' }).click()
  await expect(blocks.getByRole('row', { name: /Abebe Building Materials/ }).getByText('chosen')).toBeVisible()
  // Suggested total: 64,500 + 97,500 + 9,925.
  await expect(page.getByText('Cost: ETB 171,925.00')).toBeVisible()
  await expect(page.getByText('3 of 3 items have a chosen supplier.')).toBeVisible()
  await shot(page, 'step7-chosen')
  log('Step 7', 'marked 4 asked (nothing sent); reply saved as the new current price; comparison “Cheapest” and basket shown; second choice refused (T4); suggested cost ETB 171,925.00')

  // Step 8: Create orders: model from each agreement (A for the new supplier and Abebe, B for Merkato).
  const stale = await browser.newPage()
  await adminSession(stale)
  await stale.goto(`/roodber8/quotes/${S.quoteId}`)
  await page.getByRole('button', { name: 'Create orders' }).click()
  const co = page.getByRole('group', { name: 'Create orders' })
  await expect(co.getByLabel(`Money model for ${S.name}`)).toHaveValue('A')
  await expect(co.getByLabel('Money model for Merkato Steel House (seed)')).toHaveValue('B')
  await expect(co.getByLabel('Money model for Abebe Building Materials (seed)')).toHaveValue('A')
  await co.getByRole('button', { name: 'Create draft orders' }).click()
  await expect(page.getByText(/Draft orders HLO-\d{4}-\d{6}, HLO-\d{4}-\d{6}, HLO-\d{4}-\d{6} created/)).toBeVisible()
  const orders = (await d.from('supply_orders').select('id, reference, org_id, money_model').eq('quote_request_id', S.quoteId)).data!
  S.orderA = orders.find((o) => o.org_id === S.orgId)!
  S.orderB = orders.find((o) => o.org_id === MERKATO)!
  S.orderCancel = orders.find((o) => o.org_id === ABEBE)!
  expect(orders.map((o) => o.money_model).sort()).toEqual(['A', 'A', 'B'])
  // T4: the same lines ordered again from a page left open: refused.
  await stale.getByRole('button', { name: 'Create orders' }).click()
  await stale.getByRole('group', { name: 'Create orders' }).getByRole('button', { name: 'Create draft orders' }).click()
  await expect(stale.getByText(/already (be )?in an order/)).toBeVisible()
  expect((await d.from('supply_orders').select('id').eq('quote_request_id', S.quoteId)).data).toHaveLength(3)
  await stale.close()
  await shot(page, 'step8-orders-created')

  // Model A order: customer prices, then send for payment.
  await page.goto(`/roodber8/supply/orders/${S.orderA.id}`)
  await page.getByLabel('Margin % helper').fill('10')
  await page.getByRole('button', { name: 'Fill customer prices' }).click()
  await expect(page.getByLabel('Customer price for Habesha cement 50kg')).toHaveValue('1408.00')
  await page.getByLabel('Customer delivery charge (ETB)').fill('600')
  await page.getByRole('button', { name: 'Save order' }).click()
  await expect(page.getByText('ETB 71,000.00').first()).toBeVisible()
  page.once('dialog', (dlg) => void dlg.accept())
  await page.getByRole('button', { name: 'Send to customer for payment' }).click()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Place with supplier' })).toHaveCount(0)
  log('Step 8', `${S.orderA.reference} (A), ${S.orderB.reference} (B), ${S.orderCancel.reference} (A) created with the agreement's model; customer total ETB 71,000.00; Mark as paid off; ordering the same lines twice refused (T4)`)

  // Step 9: two payments (one in GBP with a rate), golden rule, then paid and placed.
  await page.getByRole('button', { name: 'Record customer payment' }).click()
  const pay1 = page.getByRole('group', { name: 'Record customer payment' })
  await pay1.getByLabel('Amount (ETB)').fill('30000')
  await pay1.getByLabel('Method').selectOption('telebirr')
  await pay1.getByLabel('Reference').fill('TB-AZ-1')
  await pay1.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Customer payment · ETB 30,000\.00/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeDisabled()
  // The golden rule also holds in the database: not paid, not placed.
  expect((await d.from('supply_orders').update({ status: 'paid' }).eq('id', S.orderA.id)).error?.message).toBe('The customer has not paid this order in full yet')
  await page.getByRole('button', { name: 'Record customer payment' }).click()
  const pay2 = page.getByRole('group', { name: 'Record customer payment' })
  await expect(pay2.getByLabel('Amount (ETB)')).toHaveValue('41000.00')
  await pay2.getByLabel('Paid in another currency?').fill('GBP')
  await pay2.getByLabel('Amount in GBP').fill('565.52')
  await pay2.getByLabel('Rate used (ETB per unit)').fill('72.5')
  await pay2.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/GBP 565\.52 at 72\.5/)).toBeVisible()
  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await page.getByRole('button', { name: 'Place with supplier' }).click()
  await expect(page.getByRole('button', { name: 'Supplier confirmed' })).toBeVisible()
  await shot(page, 'step9-paid-placed')
  log('Step 9', 'ETB 30,000 by telebirr, then ETB 41,000 as GBP 565.52 at 72.5; Mark as paid stayed off until paid in full; database refused “paid” early; then paid and placed')

  // Step 10: promised date, then confirmed → out for delivery → delivered.
  captureAction(page, 'promisedDate')
  const dates = page.getByRole('group', { name: 'Promised delivery date' })
  await dates.getByLabel('Promised delivery date').fill(addisDay(2))
  await dates.getByRole('button', { name: 'Save date' }).click()
  await expect(page.getByText(`Promised delivery date set to ${addisDay(2)}.`)).toBeVisible()
  // The timeline gains the date once the page refreshes (an immediate status click is covered by supply-polish.spec.ts).
  await expect(page.getByText(`Promised delivery date: none → ${addisDay(2)}`)).toBeVisible()
  await page.getByRole('button', { name: 'Supplier confirmed' }).click()
  await page.getByRole('button', { name: 'Out for delivery' }).click()
  await page.getByRole('button', { name: 'Delivered', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Complete' })).toBeDisabled()
  const timeline = await page.locator('ol').filter({ hasText: 'Order created' }).innerText()
  for (const t of ['Order created', 'Draft → Waiting for customer payment', 'Paid by customer → Placed with supplier', `Promised delivery date: none → ${addisDay(2)}`, 'Out for delivery → Delivered']) expect(timeline).toContain(t)
  log('Step 10', 'promised date saved and on the timeline with every status step; Complete stays off without proof')

  // Step 11: delivery proof from a phone-sized screen (and a wrong one removed with a reason), then Complete.
  const phone = await phonePage(browser)
  await phone.goto(`/roodber8/supply/orders/${S.orderA.id}`)
  await noSidewaysScroll(phone, 'order page at 375px')
  const proof = phone.getByRole('group', { name: 'Add delivery proof' })
  await proof.getByLabel('Photo or signed delivery note').setInputFiles({ name: 'delivery.png', mimeType: 'image/png', buffer: PNG })
  await expect(proof.getByText('Uploaded: delivery.png')).toBeVisible()
  await proof.getByLabel('Received by').fill('Site foreman')
  await proof.getByLabel('Receiver’s phone').fill('0911 22 33 44')
  await reachable(phone, 'Save delivery proof', proof)
  await proof.getByRole('button', { name: 'Save delivery proof' }).click()
  await expect(phone.getByText('Received by Site foreman · +251 91 122 3344')).toBeVisible()
  await phone.getByRole('group', { name: 'Add delivery proof' }).getByLabel('Photo or signed delivery note').setInputFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: PDF })
  await phone.getByRole('group', { name: 'Add delivery proof' }).getByRole('button', { name: 'Save delivery proof' }).click()
  await expect(phone.getByRole('link', { name: /Proof 2/ })).toBeVisible()
  phone.once('dialog', (dlg) => void dlg.accept('Wrong site'))
  await phone.getByRole('button', { name: 'Remove' }).nth(1).click()
  await expect(phone.getByText('Removed: Wrong site')).toBeVisible()
  await noSidewaysScroll(phone, 'order page with proofs at 375px')
  await shot(phone, 'step11-proof-phone')
  await phone.getByRole('button', { name: 'Complete' }).click()
  await expect.poll(async () => (await d.from('supply_orders').select('status').eq('id', S.orderA.id).single()).data?.status).toBe('completed')
  expect((await d.from('supply_delivery_proofs').select('removed_at, removed_reason').eq('order_id', S.orderA.id).not('removed_at', 'is', null)).data).toHaveLength(1)
  await phone.context().close()
  // Pay the supplier, record a wrong service fee (reversed in step 13).
  await page.reload()
  await page.getByRole('button', { name: 'Record payment to supplier' }).click()
  await page.getByRole('group', { name: 'Record payment to supplier' }).getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Payment to supplier · ETB 64,500\.00/)).toBeVisible()
  captureAction(page, 'serviceFee')
  await page.getByRole('button', { name: 'Record a service fee' }).click()
  const fee = page.getByRole('group', { name: 'Record a service fee' })
  await fee.getByLabel('Amount (ETB)').fill('250')
  await fee.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Service fee · ETB 250\.00/)).toBeVisible()
  log('Step 11', 'proof added at 375px (no sideways scroll, button reachable), a wrong proof removed with a reason (kept, marked removed), order completed; supplier paid ETB 64,500')

  // Step 12 (T3): model B: placed → delivered with a dispute and its resolution → commission due and received → completed.
  await page.goto(`/roodber8/supply/orders/${S.orderB.id}`)
  await page.getByRole('button', { name: 'Place with supplier' }).click()
  await page.getByRole('button', { name: 'Supplier confirmed' }).click()
  await page.getByRole('button', { name: 'Out for delivery' }).click()
  await page.getByRole('button', { name: 'Delivered', exact: true }).click()
  await expect(page.getByText('Commission due ETB 4,875.00')).toBeVisible()
  page.once('dialog', (dlg) => void dlg.accept('Five bars bent'))
  await page.getByRole('button', { name: 'Report a problem' }).click()
  await expect(page.getByText('Reason: Five bars bent')).toBeVisible()
  await page.getByRole('button', { name: 'Problem solved: delivered' }).click()
  await page.getByRole('button', { name: 'Record commission due' }).click()
  const due = page.getByRole('group', { name: 'Record commission due' })
  await expect(due.getByLabel('Amount (ETB)')).toHaveValue('4875.00')
  await due.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Commission due · ETB 4,875\.00/)).toBeVisible()
  // Commission ageing in this month's report: the order is owed for 0–30 days until it is received.
  const report = await browser.newPage()
  await adminSession(report)
  await report.goto('/roodber8/reports/supply')
  const owedBefore = await report.getByRole('row', { name: /0–30 days/ }).innerText()
  expect(owedBefore).toContain('ETB')
  await page.getByRole('button', { name: 'Record commission received' }).click()
  await page.getByRole('group', { name: 'Record commission received' }).getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Commission received · ETB 4,875\.00/)).toBeVisible()
  await page.getByRole('group', { name: 'Add delivery proof' }).getByLabel('Photo or signed delivery note').setInputFiles({ name: 'note.pdf', mimeType: 'application/pdf', buffer: PDF })
  await page.getByRole('group', { name: 'Add delivery proof' }).getByRole('button', { name: 'Save delivery proof' }).click()
  await expect(page.getByRole('link', { name: /Proof 1/ })).toBeVisible()
  await page.getByRole('button', { name: 'Complete' }).click()
  await expect.poll(async () => (await d.from('supply_orders').select('status').eq('id', S.orderB.id).single()).data?.status).toBe('completed')
  await report.reload()
  const owedAfter = await report.getByRole('row', { name: /0–30 days/ }).innerText()
  const cents = (t: string) => Number(/ETB ([\d,]+\.\d\d)/.exec(t)?.[1].replace(/,/g, '') ?? '0')
  expect(cents(owedBefore) - cents(owedAfter)).toBeCloseTo(4875, 2)
  await report.close()
  const timelineB = await page.locator('ol').filter({ hasText: 'Order created' }).innerText()
  for (const t of ['Delivered → Disputed', 'Disputed → Delivered', 'Delivered → Completed']) expect(timelineB).toContain(t)
  await shot(page, 'step12-model-b')
  log('Step 12', `model B: commission ETB 4,875.00 (5%) due then received; problem reported and solved on the timeline; report 0–30 days fell by ETB 4,875.00 once received; completed`)

  // T4: cancel the paid model A order (Abebe): refund prompt, then a refund entry.
  await page.goto(`/roodber8/supply/orders/${S.orderCancel.id}`)
  await page.getByLabel('Margin % helper').fill('10')
  await page.getByRole('button', { name: 'Fill customer prices' }).click()
  await page.getByRole('button', { name: 'Save order' }).click()
  await expect(page.getByText('ETB 10,587.50').first()).toBeVisible()
  await settle(page)
  page.once('dialog', (dlg) => void dlg.accept())
  await page.getByRole('button', { name: 'Send to customer for payment' }).click()
  await page.getByRole('button', { name: 'Record customer payment' }).click()
  await page.getByRole('group', { name: 'Record customer payment' }).getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Customer payment · ETB/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeEnabled()
  await settle(page)
  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByRole('button', { name: 'Place with supplier' })).toBeVisible()
  await settle(page)
  const dialogs: string[] = []
  const onDialog = (dlg: import('@playwright/test').Dialog) => {
    dialogs.push(dlg.message())
    void (dlg.type() === 'prompt' ? dlg.accept('Customer changed the design') : dlg.accept())
  }
  page.on('dialog', onDialog)
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByText('The customer paid for this order: record a refund in the ledger.')).toBeVisible()
  page.off('dialog', onDialog)
  expect(dialogs).toContain('The customer has paid for this order: record a refund in the ledger.')
  await page.getByRole('button', { name: 'Record a refund' }).click()
  // Customer total: 250 × 42.35 + 300 delivery.
  await page.getByRole('group', { name: 'Record a refund' }).getByLabel('Amount (ETB)').fill('10887.50')
  await page.getByRole('group', { name: 'Record a refund' }).getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/Refund to customer · ETB/)).toBeVisible()
  expect(await ledgerCount(S.orderCancel.id, 'refund')).toBe(1)
  await shot(page, 't4-cancel-refund')
  log('T4 cancel', `${S.orderCancel.reference} paid then cancelled with a reason: refund prompt shown, refund recorded`)

  // Step 13: ledger: reverse the wrong fee once (a second reversal from a page left open is refused); CSV audited.
  await page.goto(`/roodber8/supply/ledger?order=${S.orderA.reference}`)
  const staleLedger = await browser.newPage()
  await adminSession(staleLedger)
  await staleLedger.goto(`/roodber8/supply/ledger?order=${S.orderA.reference}`)
  page.once('dialog', (dlg) => void dlg.accept('Fee entered by mistake'))
  await page.getByRole('row', { name: /Service fee/ }).getByRole('button', { name: 'Reverse entry' }).click()
  await expect(page.getByText('Fee entered by mistake')).toBeVisible()
  staleLedger.once('dialog', (dlg) => void dlg.accept('Again'))
  await staleLedger.getByRole('row', { name: /Service fee/ }).getByRole('button', { name: 'Reverse entry' }).click()
  await expect(staleLedger.getByText('This entry has already been reversed.')).toBeVisible()
  expect(await ledgerCount(S.orderA.id, 'reversal')).toBe(1)
  await staleLedger.close()
  // Earned on model A: customer 71,000 − supplier 64,500 (+ fee 250 − its reversal) = 6,500.
  await expect(page.getByRole('row', { name: new RegExp(S.orderA.reference) }).filter({ hasText: 'ETB 6,500.00' })).toBeVisible()
  const csv = await page.request.get(`/roodber8/supply/ledger/export?order=${S.orderA.reference}`)
  expect(csv.status()).toBe(200)
  expect(await csv.text()).toContain('reversal')
  expect((await d.from('audit_log').select('id').eq('action', 'supply.ledger.export')).data!.length).toBeGreaterThan(0)
  const entries = (await d.from('supply_ledger_entries').select('entry_type').eq('order_id', S.orderA.id)).data!.map((e) => e.entry_type).sort()
  expect(entries).toEqual(['customer_payment', 'customer_payment', 'reversal', 'service_fee', 'supplier_payment'])
  await shot(page, 'step13-ledger')
  log('Step 13', 'wrong fee reversed once (the entry stays; a second reversal refused); HagerLand earned ETB 6,500.00 on the model A order; CSV downloaded and audited')
})

test('T1 steps 14–17 and T4 (agreement past its end date): demand, price trends, performance, needs action, report', async ({ page, browser }) => {
  test.setTimeout(240_000)
  const d = db()
  await adminSession(page)
  // Step 14: Demand → Supplies.
  await page.goto('/roodber8/demand')
  await page.getByRole('link', { name: 'Supplies' }).click()
  await page.waitForURL('**/roodber8/demand/supplies')
  await expect(page.getByText(/From request to delivery \(\d+ quotes\)/)).toBeVisible()
  for (const step of ['Requested', 'Suppliers asked', 'Reply received', 'Supplier chosen', 'Ordered', 'Completed']) await expect(page.getByText(step, { exact: true })).toBeVisible()
  await expect(page.getByText(/Habesha cement 50kg/).first()).toBeVisible()
  await expect(page.getByText(/No partner has a price for this item/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add a supplier for this' }).first()).toBeVisible()
  await shot(page, 'step14-demand')
  log('Step 14', 'funnel, areas, this quote’s items, “Nobody can supply yet” with “Add a supplier for this”')

  // Step 15: price trends and partner performance.
  await page.goto('/roodber8/supply/partners/prices')
  const trend = page.getByRole('row', { name: /Habesha cement 50kg/ }).first()
  await expect(trend).toContainText('ETB 1,280')
  await expect(page.getByRole('row', { name: /Dangote cement 50kg/ }).first()).not.toContainText('No earlier price')
  await shot(page, 'step15-price-trends')
  await page.goto('/roodber8/supply/performance')
  await expect(page.getByRole('row', { name: new RegExp(S.name) })).toContainText('Not enough history yet')
  await expect(page.getByRole('row', { name: /Merkato Steel House \(seed\)/ })).toContainText(/\d+\/100/)
  await page.goto(`/roodber8/organisations/${S.orgId}`)
  await expect(page.getByRole('heading', { name: 'Supply performance' })).toBeVisible()
  await expect(page.getByText(/Not enough history yet \(1\)/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: S.orderA.reference })).toBeVisible()
  await shot(page, 'step15-performance')
  log('Step 15', 'Habesha cement at ETB 1,280 in price trends; seed cement compared with earlier prices; the new partner shows “Not enough history yet (1)”; Merkato has a score out of 100')

  // Step 16: Needs action: overdue delivery, agreement past its end date (Mark expired), contacts to re-confirm.
  await page.goto('/roodber8/supply/orders?action=1')
  await expect(page.getByRole('heading', { name: /Also needs action/ })).toBeVisible()
  await expect(page.getByText(/promised for .*, not delivered yet/).first()).toBeVisible()
  await expect(page.getByText(/agreement ended .* but is still marked active/)).toBeVisible()
  await expect(page.getByText(/not contacted for 6 months/).first()).toBeVisible()
  const phone = await phonePage(browser)
  await phone.goto('/roodber8/supply/orders?action=1')
  await noSidewaysScroll(phone, 'needs action at 375px')
  await reachable(phone, 'Mark expired')
  await shot(phone, 'step16-needs-action-phone')
  await phone.context().close()
  await page.getByRole('button', { name: 'Mark expired' }).click()
  await expect.poll(async () => (await d.from('supply_agreements').select('status').eq('id', ENDED_AGREEMENT).single()).data?.status).toBe('expired')
  await page.reload()
  await expect(page.getByText(/agreement ended .* but is still marked active/)).toHaveCount(0)
  await d.from('supply_agreements').update({ status: 'active' }).eq('id', ENDED_AGREEMENT)
  log('Step 16', 'overdue delivery, ended agreement and contacts to re-confirm listed; Mark expired worked (T4); usable at 375px')

  // Step 17: the supply report for this month.
  await page.goto('/roodber8/reports')
  await page.getByRole('link', { name: 'Supply report' }).first().click()
  await page.waitForURL('**/roodber8/reports/supply')
  await expect(page.getByText('Reconciles with ledger: yes')).toBeVisible()
  for (const b of ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days']) await expect(page.getByRole('cell', { name: b })).toBeVisible()
  // This month's top partners list the most orders first; ours (one order) may fall outside the top 10 after reruns.
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible()
  const month = addisToday().slice(0, 7)
  const money = await page.request.get(`/roodber8/reports/supply/export?month=${month}&table=money`)
  expect(await money.text()).toMatch(/reconciles_with_ledger.*\n.*yes|yes/)
  await shot(page, 'step17-report')
  log('Step 17', 'Reconciles with ledger: yes; ageing buckets; “Print or save as PDF” button; money CSV')
})

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((x) => x.toString('base64url')).join('.')
}

async function staffSignIn(page: Page, role: 'operations' | 'agent' | 'content') {
  const email = uniqueEmail(`staff-az-${role}`)
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await page.context().clearCookies()
  await submitStaffSignIn(page, email, password, secret)
  return async () => {
    await db().from('staff_users').delete().eq('email', email)
    await db().auth.admin.deleteUser(data.user!.id)
  }
}

// Owner-only words and figures: none may reach Operations in a page or response.
const OWNER_ONLY = /Customer price|Customer total|Margin %|HagerLand earned|Commission due|Commission received|Commission owed|Commission still owed|commission due for|Record customer payment|Supply ledger|Money \(owner only\)|agreement ended|Cash on delivery note|Signed agreement|ETB 71,000|ETB 1,408|ETB 6,500|ETB 4,875|HagerLand would earn/

test('T5 roles: Operations without money or agreements; Agent and Content kept out, including server actions', async ({ page }) => {
  test.setTimeout(240_000)
  const d = db()
  const cleanups: (() => Promise<void>)[] = []
  try {
    cleanups.push(await staffSignIn(page, 'operations'))
    const screens = ['/roodber8/supply/partners', `/roodber8/organisations/${S.orgId}`, `/roodber8/supply/partners/${S.orgId}/offers`, `/roodber8/quotes/${S.quoteId}`, '/roodber8/supply/orders', '/roodber8/supply/orders?action=1', `/roodber8/supply/orders/${S.orderA.id}`, `/roodber8/supply/orders/${S.orderB.id}`, `/roodber8/supply/orders/${S.orderCancel.id}`, '/roodber8/supply/performance', '/roodber8/demand/supplies', '/roodber8/supply/partners/prices']
    for (const path of screens) {
      const res = await page.goto(path)
      expect(res?.status(), path).toBe(200)
      expect(page.url(), path).not.toMatch(/denied=1/)
      const html = await page.content()
      const leak = OWNER_ONLY.exec(html)
      expect(leak?.[0] ?? null, `Operations sees “${leak?.[0]}” on ${path}`).toBeNull()
    }
    await expect(page.getByRole('button', { name: 'Mark expired' })).toHaveCount(0)
    for (const path of ['/roodber8/supply/ledger', '/roodber8/reports/supply']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/denied=1/)
    }
    for (const path of ['/roodber8/supply/ledger/export', '/roodber8/reports/supply/export?table=money']) expect((await page.request.get(path)).url(), path).toMatch(/denied=1|roodber8-login/)
    // An owner-only action replayed as Operations is refused: no new service fee.
    const fees = await ledgerCount(S.orderA.id, 'service_fee')
    const fee = S.actions.serviceFee
    expect(fee, 'service fee action captured').toBeTruthy()
    await page.request.post(fee.url, { headers: fee.headers, data: fee.body, maxRedirects: 0 })
    expect(await ledgerCount(S.orderA.id, 'service_fee')).toBe(fees)
    log('T5 Operations', `${screens.length} supply screens open with none of the owner-only words or figures in the HTML; ledger, report and both CSVs refused; a replayed service-fee action wrote nothing`)

    const promised = (await d.from('supply_orders').select('promised_delivery_on').eq('id', S.orderA.id).single()).data?.promised_delivery_on
    for (const role of ['agent', 'content'] as const) {
      cleanups.push(await staffSignIn(page, role))
      for (const path of [...screens, '/roodber8/supply/ledger', '/roodber8/reports/supply', '/roodber8/supply/partners/new']) {
        await page.goto(path)
        await expect(page, `${role} ${path}`).toHaveURL(/denied=1/)
      }
      for (const path of ['/roodber8/supply/ledger/export', '/roodber8/reports/supply/export?table=money']) expect((await page.request.get(path)).url(), path).toMatch(/denied=1|roodber8-login/)
      await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: /Supply|Partner performance|Price trends/ })).toHaveCount(0)
      const act = S.actions.promisedDate
      expect(act, 'promised date action captured').toBeTruthy()
      await page.request.post(act.url, { headers: act.headers, data: act.body, maxRedirects: 0 })
      await page.request.post(S.actions.serviceFee.url, { headers: S.actions.serviceFee.headers, data: S.actions.serviceFee.body, maxRedirects: 0 })
      expect((await d.from('supply_orders').select('promised_delivery_on').eq('id', S.orderA.id).single()).data?.promised_delivery_on).toBe(promised)
      expect(await ledgerCount(S.orderA.id, 'service_fee')).toBe(fees)
      log(`T5 ${role}`, 'every supply page and CSV refused (denied); no supply menu items; replayed promised-date and service-fee actions changed nothing')
    }
  } finally {
    for (const c of cleanups) await c()
  }
})

const visible = (html: string) => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').toLowerCase()
const SECRETS = () => [S.name, 'Merkato', 'Abebe', 'Bole Trading', 'Added by HagerLand', 'Hollow block 20cm', 'Habesha cement', 'margin', 'commission', '1,280', '1,408', S.orderA.reference, S.orderB.reference, S.orderCancel.reference, 'HLO-']

test('T6 customer: account and emails show nothing of the supply work; issuing and the 3-day expiry (Tidy T-2)', async ({ page, request }) => {
  const d = db()
  await adminSession(page)
  await page.goto(`/roodber8/quotes/${S.quoteId}`)
  await page.fill('#q-total', '180000')
  await page.getByRole('button', { name: 'Issue quote' }).click()
  await expect.poll(async () => (await d.from('quote_requests').select('status').eq('id', S.quoteId).single()).data?.status).toBe('quoted')
  await expect.poll(async () => (await allMail(S.customer.email)).some((m) => m.subject.includes(`Your quote is ready (${S.ref})`))).toBe(true)
  const mails = await allMail(S.customer.email)
  expect(mails.length).toBeGreaterThanOrEqual(2)
  for (const m of mails) {
    for (const secret of SECRETS()) {
      // Visible words only: the HTML's own styling uses words like "margin".
      expect(visible(m.html), `“${m.subject}” shows ${secret}`).not.toContain(secret.toLowerCase())
      expect(m.text.toLowerCase(), `“${m.subject}” shows ${secret}`).not.toContain(secret.toLowerCase())
    }
  }
  expect(mails.find((m) => m.subject.includes('Your quote is ready'))!.text).toMatch(/3 days/)
  const customer = await page.context().browser()!.newPage()
  await signIn(customer, S.customer.email, S.customer.password)
  await customer.goto('/account/quotes')
  await expect(customer.getByText(S.ref)).toBeVisible()
  await expect(customer.getByText('ETB 180,000').first()).toBeVisible()
  const account = visible(await customer.locator('main').innerHTML())
  for (const secret of SECRETS()) expect(account, `account shows ${secret}`).not.toContain(secret.toLowerCase())
  const raw = await customer.content()
  for (const secret of [S.name, 'Merkato', 'Abebe', 'Bole Trading', 'Habesha cement', 'HLO-', 'supply_quote_lines', 'added_by_admin']) expect(raw, `account HTML contains ${secret}`).not.toContain(secret)
  await shot(customer, 't6-customer-account')
  // 3-day expiry (Tidy T-2): 2 days after issuing it stays quoted; after 4 days the daily job expires it.
  const cron = () => request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  await d.from('quote_requests').update({ quoted_at: new Date(Date.now() - 2 * 86_400_000).toISOString() }).eq('id', S.quoteId)
  expect((await cron()).status()).toBe(200)
  expect((await d.from('quote_requests').select('status').eq('id', S.quoteId).single()).data?.status).toBe('quoted')
  await d.from('quote_requests').update({ quoted_at: new Date(Date.now() - 4 * 86_400_000).toISOString() }).eq('id', S.quoteId)
  expect((await cron()).status()).toBe(200)
  expect((await d.from('quote_requests').select('status').eq('id', S.quoteId).single()).data?.status).toBe('expired')
  log('T6', `${mails.length} customer emails and /account/quotes show no supplier, price, margin, commission, admin item or order; quote issued as before (“valid for 3 days”); expired by the daily job after 15 days, not after 13`)
})

test('T7 public pages, sitemaps and Jobs show no supply data', async ({ request }) => {
  const paths = ['/', '/supplies', '/supplies/materials-list', '/suppliers', `/suppliers?q=${encodeURIComponent('A-Z Cement')}`, `/search?q=${encodeURIComponent('Habesha cement')}`, `/api/search/suggest?q=Habesha`, '/jobs', '/sitemap.xml', '/sitemap/companies.xml', '/sitemap/products.xml', '/sitemap/jobs.xml']
  for (const path of paths) {
    const res = await request.get(path)
    expect(res.status(), path).toBeLessThan(500)
    const body = await res.text()
    for (const secret of [S.name, 'Merkato Steel House (seed)', 'Abebe Building Materials (seed)', 'Bole Trading (seed)', S.orderA.reference, 'Partner performance', 'Supply report', 'Price trends', 'Reconciles with ledger']) expect(body, `${path} shows ${secret}`).not.toContain(secret)
  }
  log('T7', `${paths.length} public pages, searches and sitemaps (including /jobs) contain no supplier, order or insight data`)
})

test('T8 phone width: the quote Suppliers panel and the orders list at 375px', async ({ browser }) => {
  const phone = await phonePage(browser)
  await phone.goto('/roodber8/quotes/5eed9000-0000-4000-8000-000000000001')
  await expect(phone.getByRole('region', { name: 'Suppliers for Dangote cement 50kg' })).toBeVisible()
  await noSidewaysScroll(phone, 'quote with Suppliers panel at 375px')
  await reachable(phone, 'Mark as asked')
  await reachable(phone, /not suggested, with reasons/, phone.getByRole('region', { name: 'Suppliers for Dangote cement 50kg' }))
  await shot(phone, 't8-quote-suppliers-phone')
  await phone.goto('/roodber8/supply/orders')
  await noSidewaysScroll(phone, 'orders list at 375px')
  await phone.context().close()
  log('T8', 'quote Suppliers panel and orders list at 375px: no sideways scroll; Mark as asked and Not suggested reachable (order page, proof upload and Needs action checked in steps 11 and 16)')
})

test('T9 digest: a counts-only Supplies section; a failure in it still lets the digest send', async ({ request }) => {
  const digest = process.env.ADMIN_DIGEST_EMAIL ?? ''
  const latest = async () => (await allMail(digest)).find((m) => /digest|HagerLand/i.test(m.subject))
  await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' })
  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect((await res.json()).digestSent).toBe(true)
  const mail = (await latest())!
  expect(mail.html).toMatch(/Supplies: /)
  const supplyLines = mail.text.split('\n').filter((l) => l.includes('Supplies:'))
  for (const l of supplyLines) expect(l, l).toMatch(/^\s*Supplies: [^:]+:?\s*\d+\s*$/)
  for (const s of [S.name, 'Merkato', 'Abebe', 'Hanna', 'Seed Customer', 'ETB', S.orderA.reference]) expect(mail.html).not.toContain(s)
  log('T9 counts', `${supplyLines.length} Supplies lines, each a label and a number only`)

  // Force the Supplies section to fail (local copy only): the server may not read supply orders for a moment.
  const sql = (q: string) => execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', q], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString()
  sql('revoke select on public.supply_orders from service_role')
  try {
    await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' })
    const broken = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
    expect(broken.status()).toBe(200)
    expect((await broken.json()).digestSent).toBe(true)
    const without = (await latest())!
    expect(without.html).not.toMatch(/Supplies: /)
    log('T9 failure', 'with supply orders unreadable the daily job still answered 200 and sent the digest, without the Supplies lines')
  } finally {
    sql('grant select on public.supply_orders to service_role')
  }
})
