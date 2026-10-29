import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, db, mailWithSubject, uniqueEmail, submitStaffSignIn } from '../helpers'

test.describe.configure({ mode: 'serial' })
test.beforeAll(() => {
  assertLocalStack()
  execFileSync('bash', ['scripts/seed-supply-local.sh'], { stdio: 'ignore' })
})

const OWNER_ONLY = /Commission still owed|Commission due \(owner only\)|HagerLand earned|Commission owed|agreement ended|commission due for/

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((x) => x.toString('base64url')).join('.')
}

async function staffSignIn(page: Page, role: 'operations' | 'agent' | 'content') {
  const email = uniqueEmail(`staff-insights-${role}`)
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

test('J1 demand, J2 price trends, J3 partner performance and J9 activity, as the owner', async ({ page }) => {
  await adminSession(page)
  // J1: the Supplies tab on Demand.
  await page.goto('/roodber8/demand')
  await page.getByRole('link', { name: 'Supplies' }).click()
  await page.waitForURL('**/roodber8/demand/supplies')
  await expect(page.getByText(/From request to delivery \(\d+ quotes\)/)).toBeVisible()
  for (const step of ['Requested', 'Suppliers asked', 'Reply received', 'Supplier chosen', 'Ordered', 'Completed']) await expect(page.getByText(step, { exact: true })).toBeVisible()
  await expect(page.getByText(/Gypsum board 12mm.*No partner has a price for this item/)).toBeVisible()
  await expect(page.getByText(/Corrugated roofing sheet 0\.3mm.*No partner with a current price delivers to Lideta/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add a supplier for this' }).first()).toHaveAttribute('href', '/roodber8/organisations/new?supplier=1')
  for (const area of ['Kirkos', 'Yeka', 'Lideta', 'Nifas Silk-Lafto', 'Bole']) await expect(page.getByRole('cell', { name: area, exact: true })).toBeVisible()
  // Jobs Phase 6: the jobs signal is open jobs by trade, by the public board's rule (the seed job has no trade).
  await expect(page.getByText('Trades being hired (open jobs)')).toBeVisible()
  await expect(page.getByText(/^No trade given: \d+$/)).toBeVisible()
  await expect(page.getByText(/Bole: \d+/).first()).toBeVisible()
  await page.getByRole('link', { name: 'Include cancelled quotes' }).click()
  await expect(page).toHaveURL(/cancelled=1/)
  await page.getByRole('link', { name: 'Last 30 days' }).click()
  await expect(page).toHaveURL(/days=30/)

  // J2: price trends with history and a chart.
  await page.goto('/roodber8/supply/partners')
  await page.getByRole('link', { name: 'Price trends' }).click()
  await page.waitForURL('**/roodber8/supply/partners/prices')
  const cement = page.getByRole('row', { name: /Dangote cement 50kg/ }).filter({ hasText: 'per bag' }).first()
  await expect(cement).toBeVisible()
  await expect(cement).not.toContainText('No earlier price')
  await expect(page.getByRole('img', { name: /Middle price of/ })).toBeVisible()

  // J3: partner performance with reliability; money lines for the owner.
  await page.goto('/roodber8/supply/performance')
  const merkato = page.getByRole('row', { name: /Merkato Steel House \(seed\)/ })
  await expect(merkato).toContainText(/\d+\/100/)
  await expect(page.getByRole('columnheader', { name: 'Commission owed' })).toBeVisible()
  await merkato.getByRole('link', { name: 'Merkato Steel House (seed)' }).click()
  await expect(page.getByRole('heading', { name: 'Supply performance' })).toBeVisible()
  await expect(page.getByText(/out of 100\. Replied to \d+ of \d+ requests/)).toBeVisible()
  await expect(page.getByText('Commission still owed')).toBeVisible()
  // J9: the same page links its supplier orders; the contractor's page shows jobs, the project and its quote.
  await expect(page.getByRole('heading', { name: 'Jobs, projects and supply activity' })).toBeVisible()
  await expect(page.getByRole('link', { name: /HLO-\d{4}-\d{6}/ }).first()).toBeVisible()
  await page.goto('/roodber8/organisations/5eed0000-0000-4000-8000-000000000007')
  await expect(page.getByRole('link', { name: 'Truck drivers and loaders (Drivers & loaders)' })).toBeVisible()
  await expect(page.getByRole('link', { name: /HLP-\d{4}-\d{6}: Seed G\+2 house in Bole/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'HLQ-SEED-BUILDERS' })).toBeVisible()
  // A partner that never replies: figures with fewer than 3 data points say so.
  await page.goto('/roodber8/organisations/5eed0000-0000-4000-8000-000000000003')
  await expect(page.getByText('Not enough history yet (0)').first()).toBeVisible()
  await expect(page.getByText(/^0% \(of \d+\)$/).first()).toBeVisible()
})

test('J4: the quote shortlist explains reliability; ranking still puts the cheapest delivered total first', async ({ page }) => {
  await adminSession(page)
  await page.goto('/roodber8/quotes/5eed9000-0000-4000-8000-000000000001')
  const suggested = page.getByRole('region', { name: 'Suppliers for Dangote cement 50kg' }).getByRole('listitem')
  await expect(suggested.nth(0)).toContainText('Merkato Steel House (seed)')
  await expect(suggested.nth(0)).toContainText(/Cheapest delivered total\. Replied to \d+ of \d+ requests; \d+ of \d+ deliveries on time/)
  await expect(suggested.nth(1)).toContainText('Abebe Building Materials (seed)')
})

test('J5 supply report reconciles with the ledger; J6 promised date on the timeline; J7 needs action, as the owner', async ({ page }) => {
  const d = db()
  await adminSession(page)
  // J5
  await page.goto('/roodber8/reports')
  await page.getByRole('link', { name: 'Supply report' }).first().click()
  await page.waitForURL('**/roodber8/reports/supply')
  await expect(page.getByText(/Reconciles with ledger: yes/)).toBeVisible()
  for (const b of ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days']) await expect(page.getByRole('cell', { name: b })).toBeVisible()
  await expect(page.getByText('Order value')).toBeVisible()
  const csv = await page.request.get(`/roodber8/reports/supply/export?month=${new Date().toISOString().slice(0, 7)}&table=money`)
  expect(csv.status()).toBe(200)
  expect(await csv.text()).toContain('reconciles_with_ledger')
  expect((await d.from('audit_log').select('id').eq('action', 'supply.report.export')).data!.length).toBeGreaterThan(0)

  // J6: a fresh model B order, placed; set and change the promised date.
  const { data: quote } = await d.from('quote_requests').insert({ name: 'Promise Test', phone: '+251911444000', source: 'materials_list', status: 'accepted' }).select('id').single()
  const { data: item } = await d.from('quote_request_items').insert({ quote_request_id: quote!.id, free_text_item: 'Cement', quantity: 10, unit: 'bag' }).select('id').single()
  const { data: line } = await d.from('supply_quote_lines').insert({ quote_request_id: quote!.id, quote_item_id: item!.id, org_id: '5eed0000-0000-4000-8000-000000000002', status: 'chosen', unit: 'bag', unit_price_cents: 100000, quantity: 10 }).select('id').single()
  const { data: created } = await d.rpc('supply_create_order', { p_quote: quote!.id, p_org: '5eed0000-0000-4000-8000-000000000002', p_model: 'B', p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: 500, p_supplier_delivery_cents: 0, p_actor: 'test', p_lines: [{ supply_quote_line_id: line!.id, quote_item_id: item!.id, item_name: 'Cement', quantity: 10, unit: 'bag', supplier_unit_price_cents: 100000, vat_flag: 'yes' }] }).single()
  const orderId = (created as { id: string }).id
  await d.from('supply_orders').update({ status: 'placed' }).eq('id', orderId)
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
  await page.goto(`/roodber8/supply/orders/${orderId}`)
  const dates = page.getByRole('group', { name: 'Promised delivery date' })
  await dates.getByLabel('Promised delivery date').fill(day(3))
  await dates.getByRole('button', { name: 'Save date' }).click()
  await expect(page.getByText(`Promised delivery date set to ${day(3)}.`)).toBeVisible()
  await dates.getByLabel('Promised delivery date').fill(day(5))
  await dates.getByLabel('Why it changed (optional)').fill('Truck broke down')
  await dates.getByRole('button', { name: 'Save date' }).click()
  await expect(page.getByText(`Promised delivery date: ${day(3)} → ${day(5)}`)).toBeVisible()
  await expect(page.getByText(/Truck broke down/)).toBeVisible()
  const events = (await d.from('supply_order_events').select('event_type, reason, detail').eq('order_id', orderId).eq('event_type', 'promised_date').order('created_at')).data!
  expect(events.map((e) => [e.reason, (e.detail as { from: string | null; to: string }).to])).toEqual([[null, day(3)], ['Truck broke down', day(5)]])
  // Once delivered the date is fixed, in the screen and in the database.
  await page.getByRole('button', { name: 'Supplier confirmed' }).click()
  await page.getByRole('button', { name: 'Out for delivery' }).click()
  await page.getByRole('button', { name: 'Delivered', exact: true }).click()
  await expect(page.getByText(`Promised for ${day(5)}`)).toBeVisible()
  expect((await d.from('supply_orders').update({ promised_delivery_on: day(9) }).eq('id', orderId)).error?.message).toMatch(/cannot change once the order is delivered/)
  // 0037 protections still hold after 0038: the golden rule and the allowed steps.
  expect((await d.from('supply_orders').update({ status: 'placed' }).eq('id', orderId)).error?.message).toMatch(/cannot go from delivered to placed/)

  // J7: one list of everything that needs action, with "Mark expired" for an agreement past its end date.
  await page.goto('/roodber8/supply/orders?action=1')
  const extra = page.getByRole('heading', { name: /Also needs action/ })
  await expect(extra).toBeVisible()
  await expect(page.getByText(/Contacted Cement Co \(seed\): agreement ended .* but is still marked active/)).toBeVisible()
  await expect(page.getByText(/Declined Blocks Co \(seed\): agreement ends/)).toBeVisible()
  await expect(page.getByText(/confirm Old warehouse manager’s details/)).toBeVisible()
  await expect(page.getByText(/Bole Trading \(seed\): re-verify/)).toBeVisible()
  await expect(page.getByText(/promised for .*, not delivered yet/).first()).toBeVisible()
  await expect(page.getByText(/commission due for \d+ days/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Mark expired' }).click()
  await expect.poll(async () => (await d.from('supply_agreements').select('status').eq('id', '5eeda000-0000-4000-8000-000000000006').single()).data?.status).toBe('expired')
  // Put the seed back so the test can run again.
  await d.from('supply_agreements').update({ status: 'active' }).eq('id', '5eeda000-0000-4000-8000-000000000006')
})

test('J8: the daily digest has a counts-only Supplies section', async ({ request }) => {
  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  expect((await res.json()).digestSent).toBe(true)
  const mail = await mailWithSubject(process.env.ADMIN_DIGEST_EMAIL ?? '', '')
  expect(mail.html).toMatch(/Supplies: quotes with no supplier asked yet|Supplies: orders needing action/)
  expect(mail.html).toContain('Supplies: commission due for over 30 days')
  for (const name of ['Merkato', 'Abebe', 'Bole Trading', 'Seed Customer', 'ETB 1,2']) expect(mail.html).not.toContain(name)
})

test('J3 and J7 for Operations: no money or agreements; J10: agent and content kept out of every new page', async ({ page }) => {
  const cleanups: (() => Promise<void>)[] = []
  try {
    cleanups.push(await staffSignIn(page, 'operations'))
    await page.goto('/roodber8/supply/performance')
    await expect(page.getByRole('row', { name: /Merkato Steel House \(seed\)/ })).toBeVisible()
    expect(await page.content()).not.toMatch(OWNER_ONLY)
    await page.goto('/roodber8/organisations/5eed0000-0000-4000-8000-000000000002')
    await expect(page.getByRole('heading', { name: 'Supply performance' })).toBeVisible()
    expect(await page.content()).not.toMatch(OWNER_ONLY)
    await page.goto('/roodber8/demand/supplies')
    await expect(page.getByText(/From request to delivery/)).toBeVisible()
    await page.goto('/roodber8/supply/partners/prices')
    await expect(page.getByRole('heading', { name: 'Price trends' })).toBeVisible()
    await page.goto('/roodber8/supply/orders?action=1')
    await expect(page.getByText(/re-verify/).first()).toBeVisible()
    expect(await page.content()).not.toMatch(OWNER_ONLY)
    await expect(page.getByRole('button', { name: 'Mark expired' })).toHaveCount(0)
    for (const path of ['/roodber8/reports/supply', '/roodber8/demand']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/denied=1/)
    }
    expect((await page.request.get('/roodber8/reports/supply/export?table=money')).url()).toMatch(/denied=1|roodber8-login/)
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Partner performance' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Supply report' })).toHaveCount(0)

    for (const role of ['agent', 'content'] as const) {
      cleanups.push(await staffSignIn(page, role))
      for (const path of ['/roodber8/supply/performance', '/roodber8/demand/supplies', '/roodber8/supply/partners/prices', '/roodber8/reports/supply']) {
        await page.goto(path)
        await expect(page, `${role} ${path}`).toHaveURL(/denied=1/)
      }
      await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: /Partner performance|Supply report/ })).toHaveCount(0)
    }
  } finally {
    for (const c of cleanups) await c()
  }
})

test('nothing new reaches public pages (including Jobs), the customer account, sitemaps or non-owner exports', async ({ page, request }) => {
  for (const path of ['/', '/supplies', '/supplies/materials-list', '/jobs', '/sitemap/companies.xml', '/sitemap/products.xml', '/search?q=Merkato']) {
    const res = await request.get(path)
    expect(res.status(), path).toBeLessThan(500)
    const body = await res.text()
    for (const s of ['Partner performance', 'Reliability', 'Merkato Steel House (seed)', 'Abebe Building Materials (seed)', 'Supply report', 'Price trends']) expect(body, `${path} shows ${s}`).not.toContain(s)
  }
  await adminSession(page)
  for (const kind of ['quotes', 'organisations', 'products']) {
    // The columns of the existing exports gain nothing from this phase (test businesses may have such words in their names).
    const header = (await (await page.request.get(`/roodber8/export/${kind}`)).text()).split(/\r?\n/)[0]
    expect(header, kind).not.toMatch(/reliability|commission|promised|margin|earned/i)
  }
})
