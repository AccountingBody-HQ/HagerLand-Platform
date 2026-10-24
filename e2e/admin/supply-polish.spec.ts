import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, db, uniqueEmail } from '../helpers'

// Supply polish (daily use): status saved by the main button (P1), no false "someone else changed this" after your
// own save (P2), shorter quote Suppliers panel (P3), order cards on phones (P4), refund prefill (P5), print (P6),
// contact cards with tap-to-call (P7). Local copy only.

test.describe.configure({ mode: 'serial' })
test.use({ actionTimeout: 20_000 })
test.beforeAll(() => {
  assertLocalStack()
  execFileSync('bash', ['scripts/seed-supply-local.sh'], { stdio: 'ignore' })
})

const addisDay = (n: number) => new Date(Date.now() + 3 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10)
const STALE = 'Someone else changed this since you opened it.'

async function partner(stamp: number, opts: { status?: string; phone?: string } = {}) {
  const d = db()
  const name = `Polish Supplies ${stamp}`
  const { data: org } = await d.from('organisations').insert({ kind: 'supplier', name, slug: `polish-supplies-${stamp}`, status: 'draft', source: 'admin' }).select('id').single()
  await d.from('supply_partners').insert({ org_id: org!.id, relationship_status: opts.status ?? 'contacted', roles: ['retail_shop'] })
  return { id: org!.id, name }
}

/** A model A or B order from a fresh quote line, in the given status. */
async function order(stamp: number, orgId: string, model: 'A' | 'B', status: string) {
  const d = db()
  const { data: quote } = await d.from('quote_requests').insert({ name: 'Polish Customer', phone: '+251911555111', source: 'materials_list', status: 'accepted' }).select('id').single()
  const { data: item } = await d.from('quote_request_items').insert({ quote_request_id: quote!.id, free_text_item: `Cement ${stamp}`, quantity: 10, unit: 'bag' }).select('id').single()
  const { data: line } = await d.from('supply_quote_lines').insert({ quote_request_id: quote!.id, quote_item_id: item!.id, org_id: orgId, status: 'chosen', unit: 'bag', unit_price_cents: 100000, quantity: 10 }).select('id').single()
  const { data: created } = await d.rpc('supply_create_order', { p_quote: quote!.id, p_org: orgId, p_model: model, p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: model === 'B' ? 500 : (null as unknown as number), p_supplier_delivery_cents: 0, p_actor: 'test', p_lines: [{ supply_quote_line_id: line!.id, quote_item_id: item!.id, item_name: `Cement ${stamp}`, quantity: 10, unit: 'bag', supplier_unit_price_cents: 100000, vat_flag: 'yes' }] }).single()
  const id = (created as { id: string }).id
  if (model === 'A') {
    await d.from('supply_order_lines').update({ customer_unit_price_cents: 110000 }).eq('order_id', id)
    await d.from('supply_orders').update({ status: 'awaiting_payment' }).eq('id', id)
  }
  if (status === 'placed') {
    if (model === 'A') {
      await d.from('supply_ledger_entries').insert({ entry_type: 'customer_payment', direction: 'in', amount_cents: 1_100_000, occurred_on: addisDay(0), order_id: id })
      await d.from('supply_orders').update({ status: 'paid' }).eq('id', id)
    }
    await d.from('supply_orders').update({ status: 'placed' }).eq('id', id)
  }
  return id
}

// A plain 375px window (as e2e/responsive.spec.ts): in phone emulation the browser widens the page to fit any
// overflow, so a sideways scroll would go unnoticed.
async function phone(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const page = await context.newPage()
  await adminSession(page)
  return page
}

async function noSidewaysScroll(page: Page, what: string) {
  const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(scroll, `${what} is wider than the screen`).toBeLessThanOrEqual(width)
}

test('P1: a changed status is saved by “Save supply record”, once, with the same audit entry; a refused one saves nothing', async ({ page }) => {
  const d = db()
  const p = await partner(Date.now())
  await adminSession(page)
  await page.goto(`/roodber8/organisations/${p.id}`)
  await expect(page.getByText('Unsaved status change')).toHaveCount(0)
  await page.locator('#sp-status').selectOption('active')
  await expect(page.getByText(/Unsaved status change/)).toBeVisible()
  await page.getByRole('button', { name: 'Save supply record' }).click()
  await expect(page.getByText('Supply partner record saved. Status: Active.').first()).toBeVisible()
  await expect(page.getByText(/Unsaved status change/)).toHaveCount(0)
  await expect(page.locator('#supply-partner').getByText('active', { exact: true }).first()).toBeVisible()
  const row = (await d.from('supply_partners').select('relationship_status, status_changed_at').eq('org_id', p.id).single()).data!
  expect(row.relationship_status).toBe('active')
  expect(Date.now() - new Date(row.status_changed_at as string).getTime()).toBeLessThan(120_000)
  const audits = (await d.from('audit_log').select('action, diff').eq('entity_id', p.id)).data!
  expect(audits.filter((a) => a.action === 'supply.partner.status')).toHaveLength(1)
  expect(audits.find((a) => a.action === 'supply.partner.status')?.diff).toEqual({ relationship_status: { from: 'contacted', to: 'active' } })

  // "Change status" still works, and a save straight after it is not refused as someone else's change (P2).
  await page.locator('#sp-status').selectOption('terms_agreed')
  await page.getByRole('button', { name: 'Change status' }).click()
  await expect(page.getByText('Status: Terms agreed.').first()).toBeVisible()
  await page.locator('#sp-role-wholesaler').check()
  await page.getByRole('button', { name: 'Save supply record' }).click()
  await expect(page.getByText('Supply partner record saved.').first()).toBeVisible()
  await expect(page.getByText(STALE)).toHaveCount(0)
  expect((await d.from('supply_partners').select('relationship_status, roles').eq('org_id', p.id).single()).data).toEqual({ relationship_status: 'terms_agreed', roles: ['retail_shop', 'wholesaler'] })

  // A refused status (not on the list, e.g. from an old page) saves nothing at all.
  await page.reload()
  await page.locator('#sp-status').evaluate((el: HTMLSelectElement) => {
    const o = document.createElement('option')
    o.value = 'best_friend'
    o.textContent = 'Not a status'
    el.appendChild(o)
  })
  await page.locator('#sp-status').selectOption('best_friend')
  await page.locator('#sp-notes').fill('Should not be saved')
  await page.getByRole('button', { name: 'Save supply record' }).click()
  await expect(page.getByText('Choose a status from the list. Nothing was saved.').first()).toBeVisible()
  expect((await d.from('supply_partners').select('relationship_status, notes').eq('org_id', p.id).single()).data).toEqual({ relationship_status: 'terms_agreed', notes: null })
  expect((await d.from('audit_log').select('id').eq('entity_id', p.id).eq('action', 'supply.partner.status')).data).toHaveLength(2)
  await d.from('organisations').delete().eq('id', p.id)
})

test('P2: a status click straight after saving the promised date works; a real change by someone else is still caught', async ({ page, browser }) => {
  const d = db()
  const stamp = Date.now()
  const p = await partner(stamp, { status: 'active' })
  const id = await order(stamp, p.id, 'B', 'placed')
  await adminSession(page)
  await page.goto(`/roodber8/supply/orders/${id}`)
  const dates = page.getByRole('group', { name: 'Promised delivery date' })
  await dates.getByLabel('Promised delivery date').fill(addisDay(2))
  await dates.getByRole('button', { name: 'Save date' }).click()
  await expect(page.getByText(`Promised delivery date set to ${addisDay(2)}.`)).toBeVisible()
  // No waiting for the page to refresh: straight to the next step.
  await page.getByRole('button', { name: 'Supplier confirmed' }).click()
  await expect.poll(async () => (await d.from('supply_orders').select('status').eq('id', id).single()).data?.status).toBe('confirmed')
  await expect(page.getByText(STALE)).toHaveCount(0)
  await page.getByRole('button', { name: 'Out for delivery' }).click()
  await expect.poll(async () => (await d.from('supply_orders').select('status').eq('id', id).single()).data?.status).toBe('out_for_delivery')

  // Two people: the other session changes the date; this page's next step is refused.
  const other = await browser.newPage()
  await adminSession(other)
  await other.goto(`/roodber8/supply/orders/${id}`)
  await page.reload()
  const otherDates = other.getByRole('group', { name: 'Promised delivery date' })
  await otherDates.getByLabel('Promised delivery date').fill(addisDay(4))
  await otherDates.getByLabel('Why it changed (optional)').fill('Truck delayed')
  await otherDates.getByRole('button', { name: 'Save date' }).click()
  await expect(other.getByText(`Promised delivery date set to ${addisDay(4)}.`)).toBeVisible()
  await page.getByRole('button', { name: 'Delivered', exact: true }).click()
  await expect(page.getByText(STALE)).toBeVisible()
  expect((await d.from('supply_orders').select('status').eq('id', id).single()).data?.status).toBe('out_for_delivery')
  await other.close()
})

test('P3: the quote Suppliers panel shows the best 3, then “Show N more”; reasons collapsed; usable at 375px', async ({ browser }) => {
  const d = db()
  const stamp = Date.now()
  const { data: cat } = await d.from('product_categories').select('id').eq('slug', 'cement-concrete').single()
  const { data: bole } = await d.from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const extra: string[] = []
  for (const i of [1, 2]) {
    const p = await partner(stamp + i, { status: 'active' })
    extra.push(p.id)
    await d.from('supplier_offers').insert({ org_id: p.id, category_id: cat!.id, item_name: 'Dangote cement 50kg', item_key: 'dangote cement 50kg', unit: 'bag', price_etb_cents: 140000 + i * 1000, price_date: addisDay(0), valid_until: addisDay(7), delivery_area_ids: [bole!.id], source: 'direct_call' })
  }
  try {
    const page = await phone(browser)
    await page.goto('/roodber8/quotes/5eed9000-0000-4000-8000-000000000001')
    const cement = page.getByRole('region', { name: 'Suppliers for Dangote cement 50kg' })
    const listed = cement.getByRole('listitem')
    await expect(listed).toHaveCount(3)
    await expect(listed.nth(0)).toContainText('Merkato Steel House (seed)')
    await expect(cement.getByText('Contacted Cement Co (seed)')).toHaveCount(0)
    await noSidewaysScroll(page, 'quote at 375px')
    const more = cement.getByRole('button', { name: /^Show \d+ more$/ })
    await expect(more).toBeVisible()
    // The sticky "Mark as asked" bar covers the bottom of a phone screen: bring the button to the middle first.
    await more.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await more.click()
    await expect(listed.filter({ hasText: `Polish Supplies ${stamp + 2}` })).toBeVisible()
    const all = await listed.allInnerTexts()
    const totals = all.map((t) => Number(/delivered total ETB ([\d,]+\.\d\d)/.exec(t)?.[1].replace(/,/g, '')))
    expect([...totals].sort((a, b) => a - b)).toEqual(totals)
    const reasons = cement.getByRole('button', { name: /^Show \d+ not suggested, with reasons$/ })
    await reasons.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await reasons.click()
    await expect(cement.getByText('Contacted Cement Co (seed)')).toBeVisible()
    await expect(cement.getByRole('button', { name: 'Hide not suggested' })).toBeVisible()
    await noSidewaysScroll(page, 'quote with everything open at 375px')
    await page.context().close()
  } finally {
    await d.from('organisations').delete().in('id', extra)
  }
})

test('P4: supply orders are cards on a phone and a table on a computer', async ({ browser, page }) => {
  const small = await phone(browser)
  await small.goto('/roodber8/supply/orders')
  const cards = small.getByRole('list', { name: 'Supply orders' }).getByRole('listitem')
  await expect(cards.first()).toBeVisible()
  await expect(cards.first().getByRole('link', { name: /^HLO-\d{4}-\d{6}$/ })).toBeVisible()
  await expect(cards.first()).toContainText(/Model [AB] · last update/)
  await expect(small.getByRole('region', { name: 'Supply orders' })).toBeHidden()
  await noSidewaysScroll(small, 'orders list at 375px')
  await small.goto('/roodber8/supply/orders?action=1')
  await expect(small.getByRole('list', { name: 'Supply orders' }).getByText(/^Needs action: /).first()).toBeVisible()
  await small.context().close()
  await adminSession(page)
  await page.goto('/roodber8/supply/orders')
  await expect(page.getByRole('region', { name: 'Supply orders' }).getByRole('columnheader', { name: 'Last update' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Supply orders' })).toBeHidden()
})

test('P5: “Record a refund” starts from what the customer paid minus refunds; nothing left says so', async ({ page }) => {
  const d = db()
  const stamp = Date.now()
  const p = await partner(stamp, { status: 'active' })
  const id = await order(stamp, p.id, 'A', 'placed')
  await d.from('supply_ledger_entries').insert({ entry_type: 'refund', direction: 'out', amount_cents: 300_000, occurred_on: addisDay(0), order_id: id })
  await adminSession(page)
  await page.goto(`/roodber8/supply/orders/${id}`)
  await page.getByRole('button', { name: 'Record a refund' }).click()
  const refund = page.getByRole('group', { name: 'Record a refund' })
  // Paid 11,000, refunded 3,000.
  await expect(refund.getByLabel('Amount (ETB)')).toHaveValue('8000.00')
  await refund.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText('Nothing left to refund: the customer’s payments have all been refunded.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record a refund' })).toHaveCount(0)
  expect((await d.from('supply_ledger_entries').select('amount_cents').eq('order_id', id).eq('entry_type', 'refund').order('amount_cents')).data).toEqual([{ amount_cents: 300_000 }, { amount_cents: 800_000 }])
})

test('P6: the Supply report prints without the menu, filters or buttons, and its tables fit A4', async ({ page }) => {
  await adminSession(page)
  await page.addInitScript(() => {
    ;(window as unknown as { printed: number }).printed = 0
    window.print = () => {
      ;(window as unknown as { printed: number }).printed++
    }
  })
  await page.goto('/roodber8/reports/supply')
  await page.getByRole('button', { name: 'Print or save as PDF' }).click()
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1)
  // A4 at 96 dpi with 12 mm margins is about 700 px wide.
  await page.setViewportSize({ width: 700, height: 1000 })
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText(/Reconciles with ledger: (yes|no)/)).toBeVisible()
  for (const hidden of [page.getByRole('navigation', { name: 'Admin' }), page.getByRole('search'), page.getByRole('button', { name: 'Print or save as PDF' }), page.getByRole('button', { name: 'Show' }), page.getByRole('link', { name: 'CSV' }).first()]) await expect(hidden).toBeHidden()
  const widest = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('main table')).map((t) => t.getBoundingClientRect().width)))
  expect(widest).toBeLessThanOrEqual(700)
  await page.emulateMedia({ media: 'screen' })
})

test('P7: contact cards show the readable phone as tap-to-call, WhatsApp and Telegram, and Do not contact; same on the quote', async ({ browser }) => {
  const d = db()
  const stamp = Date.now()
  const p = await partner(stamp, { status: 'active' })
  const added = await d.from('supply_contacts').insert([
    { org_id: p.id, name: 'Sales desk', role: 'Sales', phone: '0911 50 60 70', phone_normalised: '+251911506070', whatsapp: '+251911506070', telegram: '@polishsales', preferred_channel: 'whatsapp', do_not_contact: false },
    { org_id: p.id, name: 'Old manager', role: null, phone: '0911 80 90 10', phone_normalised: '+251911809010', whatsapp: null, telegram: null, preferred_channel: null, do_not_contact: true },
  ])
  expect(added.error).toBeNull()
  const page = await phone(browser)
  await page.goto(`/roodber8/organisations/${p.id}`)
  const card = page.locator('#supply-partner li').filter({ hasText: 'Sales desk' })
  await expect(card).toContainText('Sales desk · Sales')
  await expect(card.getByRole('link', { name: '+251 91 150 6070' }).first()).toHaveAttribute('href', 'tel:+251911506070')
  await expect(card.getByRole('link', { name: '+251 91 150 6070' }).nth(1)).toHaveAttribute('href', 'https://wa.me/251911506070')
  await expect(card.getByRole('link', { name: '@polishsales' })).toHaveAttribute('href', 'https://t.me/polishsales')
  await expect(page.locator('#supply-partner li').filter({ hasText: 'Old manager' }).getByText('Do not contact')).toBeVisible()
  await noSidewaysScroll(page, 'partner panel at 375px')
  // The quote's Suppliers panel uses the same style (seed: Merkato's sales desk).
  await page.goto('/roodber8/quotes/5eed9000-0000-4000-8000-000000000001')
  const merkato = page.getByRole('region', { name: 'Suppliers for Dangote cement 50kg' }).getByRole('listitem').filter({ hasText: 'Merkato Steel House (seed)' })
  await expect(merkato).toContainText('Sales desk · +251 91 120 2020 · WhatsApp +251 91 120 2020')
  await expect(merkato.getByRole('link', { name: '+251 91 120 2020' }).first()).toHaveAttribute('href', 'tel:+251911202020')
  await page.context().close()
  await d.from('organisations').delete().eq('id', p.id)
})

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((x) => x.toString('base64url')).join('.')
}

async function staffSignIn(page: Page, role: 'operations' | 'agent') {
  const email = uniqueEmail(`staff-polish-${role}`)
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await page.context().clearCookies()
  await page.goto('/roodber8-login')
  await page.getByText('Staff sign in').click()
  await page.fill('#stf-email', email)
  await page.fill('#stf-pass', password)
  await page.fill('#stf-code', authenticator.generate(secret))
  await page.getByRole('button', { name: 'Sign in as staff' }).click()
  await page.waitForURL('**/roodber8')
  return async () => {
    await db().from('staff_users').delete().eq('email', email)
    await db().auth.admin.deleteUser(data.user!.id)
  }
}

test('roles: Operations sees the new cards and contact links without owner-only money; Agent still has no supply access', async ({ page }) => {
  const cleanups: (() => Promise<void>)[] = []
  try {
    cleanups.push(await staffSignIn(page, 'operations'))
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/roodber8/supply/orders')
    await expect(page.getByRole('list', { name: 'Supply orders' }).getByRole('listitem').first()).toBeVisible()
    await page.goto('/roodber8/supply/orders/5eed0d00-0000-4000-8000-000000000004')
    await page.goto('/roodber8/organisations/5eed0000-0000-4000-8000-000000000002')
    await expect(page.locator('#supply-partner').getByRole('link', { name: '+251 91 120 2020' }).first()).toBeVisible()
    for (const path of ['/roodber8/supply/orders', '/roodber8/supply/orders/5eed0d00-0000-4000-8000-000000000004', '/roodber8/organisations/5eed0000-0000-4000-8000-000000000002']) {
      await page.goto(path)
      expect(await page.content(), path).not.toMatch(/Record a refund|Nothing left to refund|Customer total|HagerLand earned|Commission due|Signed agreement|Print or save as PDF/)
    }
    await page.goto('/roodber8/reports/supply')
    await expect(page).toHaveURL(/denied=1/)
    cleanups.push(await staffSignIn(page, 'agent'))
    for (const path of ['/roodber8/supply/orders', '/roodber8/supply/partners', '/roodber8/reports/supply']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/denied=1/)
    }
  } finally {
    for (const c of cleanups) await c()
  }
})
