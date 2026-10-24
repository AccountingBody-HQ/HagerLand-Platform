import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, createUser, db, mailWithSubject, randomPhone, signIn, SUPABASE_URL, uniqueEmail } from '../helpers'

test.describe.configure({ mode: 'serial' })
test.beforeAll(() => {
  assertLocalStack()
  // Local test partners and prices (refuses anything but the local copy).
  execFileSync('bash', ['scripts/seed-supply-local.sh'], { stdio: 'ignore' })
})

const SUPPLIERS = ['Abebe Building Materials (seed)', 'Merkato Steel House (seed)', 'Bole Trading (seed)']
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
const section = (page: Page, item: string) => page.getByRole('region', { name: `Suppliers for ${item}` })
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function addItem(page: Page, name: string, category: string | null, quantity: string, unit: string) {
  const form = page.getByRole('group', { name: 'Add item' })
  await form.getByLabel('Item').fill(name)
  if (category) await form.getByLabel('Category').selectOption({ label: category })
  await form.getByLabel('Quantity').fill(quantity)
  await form.getByLabel('Unit').selectOption(unit)
  await form.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('cell', { name: new RegExp(`^${name}`) })).toBeVisible()
}

test('database: supplier lines are HagerLand-only; customers never see or add HagerLand items; one choice per item', async () => {
  const d = db()
  const user = await createUser()
  const { data: quote } = await d.from('quote_requests').insert({ requester_user_id: user.id, name: 'RLS Customer', phone: '+251911555000', source: 'materials_list' }).select('id').single()
  try {
    const { data: items, error: seedError } = await d.from('quote_request_items').insert([
      { quote_request_id: quote!.id, free_text_item: 'Customer cement', quantity: 10, unit: 'bag', added_by_admin: false },
      { quote_request_id: quote!.id, free_text_item: 'HagerLand note item', quantity: 5, unit: 'bag', added_by_admin: true },
    ]).select('id, free_text_item')
    expect(seedError).toBeNull()
    const customer = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false } })
    await customer.auth.signInWithPassword({ email: user.email, password: user.password })
    const seen = await customer.from('quote_request_items').select('free_text_item').eq('quote_request_id', quote!.id)
    expect(seen.data).toEqual([{ free_text_item: 'Customer cement' }])
    const add = await customer.from('quote_request_items').insert({ quote_request_id: quote!.id, free_text_item: 'Sneaky', quantity: 1, unit: 'bag', added_by_admin: true })
    expect(add.error).not.toBeNull()
    const remove = await customer.from('quote_request_items').update({ removed_at: new Date().toISOString() }).eq('quote_request_id', quote!.id).select('id')
    expect(remove.error !== null || (remove.data ?? []).length === 0).toBe(true)

    const anon = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false } })
    for (const client of [anon, customer]) {
      const read = await client.from('supply_quote_lines').select('*').limit(1)
      expect(read.error).not.toBeNull()
      const write = await client.from('supply_quote_lines').insert({ quote_request_id: quote!.id, org_id: '5eed0000-0000-4000-8000-000000000001' })
      expect(write.error).not.toBeNull()
    }

    const itemId = items!.find((i) => i.free_text_item === 'Customer cement')!.id
    const chosen = (org: string) => ({ quote_request_id: quote!.id, quote_item_id: itemId, org_id: org, status: 'chosen', unit_price_cents: 100, quantity: 1 })
    expect((await d.from('supply_quote_lines').insert(chosen('5eed0000-0000-4000-8000-000000000001'))).error).toBeNull()
    expect((await d.from('supply_quote_lines').insert(chosen('5eed0000-0000-4000-8000-000000000002'))).error?.code).toBe('23505')
    expect((await d.from('supply_quote_lines').insert({ quote_request_id: quote!.id, quote_item_id: itemId, org_id: '5eed0000-0000-4000-8000-000000000003', status: 'received' })).error?.code).toBe('23514')
  } finally {
    await d.from('quote_requests').delete().eq('id', quote!.id)
    await d.auth.admin.deleteUser(user.id)
  }
})

test('AB’s journey J0–J10 and J12: items, suggestions, asking, replies, comparison, basket, choice, total, issuing', async ({ page, browser }) => {
  test.setTimeout(300_000)
  const d = db()
  const user = await createUser({ name: 'Selam Bekele' })
  const merkatoCementBefore = '5eed0f00-0000-4000-8000-000000000012'
  const restoreSeedPrice = async () => {
    await d.from('supplier_offers').update({ superseded_by: null }).eq('id', merkatoCementBefore)
    await d.from('supplier_offers').delete().eq('org_id', '5eed0000-0000-4000-8000-000000000002').eq('item_key', 'dangote cement 50kg').not('id', 'in', `(${merkatoCementBefore},5eed0f00-0000-4000-8000-000000000011)`)
    await d.from('supplier_offers').update({ status: 'current' }).eq('id', merkatoCementBefore)
  }
  await restoreSeedPrice()
  let quoteId = ''
  try {
    // J0: the customer sends a materials list (file and typed lines) for delivery to Bole.
    await signIn(page, user.email, user.password)
    await page.goto('/supplies/materials-list')
    await page.fill('#q-notes', '50 bags cement\n250 hollow blocks 20cm\n100 rebar 12mm')
    await page.locator('input[type=file]').setInputFiles({ name: 'list.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') })
    await expect(page.locator('input[type=hidden][name=files]')).toHaveCount(1, { timeout: 20_000 })
    await page.fill('#q-name', 'Selam Bekele')
    await page.fill('#q-phone', randomPhone())
    await page.fill('#q-email', user.email)
    await page.fill('#q-loc', 'Bole')
    await page.getByRole('option', { name: /^Bole/ }).first().click()
    await page.getByRole('button', { name: 'Request my quote' }).click()
    await page.waitForURL(/\/supplies\/quote\/sent\?ref=HLQ-/)
    const ref = new URL(page.url()).searchParams.get('ref')!
    quoteId = (await d.from('quote_requests').select('id').eq('reference', ref).single()).data!.id

    // J1
    const admin = await browser.newPage()
    await adminSession(admin)
    await admin.goto('/roodber8/quotes')
    await admin.getByRole('link', { name: ref }).click()
    await admin.waitForURL(`**/roodber8/quotes/${quoteId}`)
    await expect(admin.getByText('Materials list 1.pdf')).toBeVisible()

    // J2: items typed in from the list; one added by mistake and removed; one edited.
    await addItem(admin, 'Dangote cement 50kg', 'Building materials › Cement & concrete', '50', 'bag')
    await addItem(admin, 'Hollow block 20cm', 'Building materials › Blocks & bricks', '150', 'piece')
    await addItem(admin, 'Rebar 12mm', null, '100', 'piece')
    await addItem(admin, 'Mistake item', null, '1', 'bag')
    await expect(admin.getByText('Added by HagerLand')).toHaveCount(4)
    admin.once('dialog', (dlg) => void dlg.accept())
    await admin.getByRole('row', { name: /Mistake item/ }).getByRole('button', { name: 'Remove' }).click()
    await expect(admin.getByText('1 item added by HagerLand was removed.')).toBeVisible()
    expect((await d.from('quote_request_items').select('removed_at, removed_by').eq('quote_request_id', quoteId).eq('free_text_item', 'Mistake item').single()).data?.removed_by).toBe('admin')
    await admin.getByRole('row', { name: /Hollow block 20cm/ }).getByRole('button', { name: 'Edit' }).click()
    const edit = admin.getByRole('group', { name: 'Edit Hollow block 20cm' })
    await edit.getByLabel('Quantity').fill('250')
    await edit.getByRole('button', { name: 'Save' }).click()
    await expect(admin.getByRole('row', { name: /Hollow block 20cm/ }).getByText('250 pieces')).toBeVisible()

    // J3: suggestions with reasons, trial label, and partners left out with reasons.
    const cement = section(admin, 'Dangote cement 50kg')
    const suggested = cement.getByRole('listitem')
    await expect(suggested.nth(0)).toContainText('Merkato Steel House (seed)')
    await expect(suggested.nth(0)).toContainText('ETB 62,500.00')
    await expect(suggested.nth(0)).toContainText('Active partner. Delivers to Bole. Price checked yesterday. Cheapest delivered total.')
    await expect(suggested.nth(1)).toContainText('Abebe Building Materials (seed)')
    await expect(suggested.nth(2)).toContainText('Bole Trading (seed)')
    await expect(suggested.nth(2)).toContainText('Trial')
    await expect(suggested.nth(2)).toContainText('Price is ageing')
    await expect(suggested.nth(2).getByText('Do not contact', { exact: true }).first()).toBeVisible()
    await cement.getByRole('button', { name: /not suggested, with reasons/ }).click()
    await expect(cement.getByText('Contacted Cement Co (seed)')).toBeVisible()
    await expect(cement.getByText('Contacted, not yet interested')).toBeVisible()
    await expect(cement.getByText('Asked not to be contacted')).toBeVisible()
    const rebar = section(admin, 'Rebar 12mm')
    await rebar.getByRole('button', { name: /not suggested, with reasons/ }).click()
    await expect(rebar.getByText('Priced per tonne, quote asks in pieces; no pack size recorded')).toBeVisible()
    await expect(rebar.getByText(/Price expired/)).toBeVisible()
    const blocks = section(admin, 'Hollow block 20cm')
    await expect(blocks.getByRole('listitem').nth(0)).toContainText('Bole Trading (seed)')
    await blocks.getByRole('button', { name: /not suggested, with reasons/ }).click()
    await expect(blocks.getByText('Declined to work with us')).toBeVisible()

    // J4: add a supplier by hand.
    await rebar.getByLabel('Add supplier manually').selectOption({ label: 'Merkato Steel House (seed)' })
    await rebar.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(rebar.getByText('Added by staff')).toBeVisible()

    // J5: tick and mark as asked (nothing is sent). Do-not-contact cannot be ticked, nor marked through the server.
    await expect(cement.getByRole('checkbox', { name: 'Select Bole Trading (seed)' })).toBeDisabled()
    await cement.getByRole('checkbox', { name: 'Select Merkato Steel House (seed)' }).check()
    await cement.getByRole('checkbox', { name: 'Select Abebe Building Materials (seed)' }).check()
    await rebar.getByRole('checkbox', { name: 'Select Abebe Building Materials (seed)' }).check()
    await rebar.getByRole('checkbox', { name: 'Select Merkato Steel House (seed)' }).check()
    await admin.getByRole('button', { name: 'Mark as asked' }).click()
    await expect(admin.getByText(/Marked 4 suppliers as asked\. Nothing was sent/)).toBeVisible()
    await expect(cement.getByText('Sales desk · +251 91 120 2020 · WhatsApp +251 91 120 2020')).toBeVisible()
    const asked = (await d.from('supply_quote_lines').select('status, asked_at').eq('quote_request_id', quoteId)).data!
    expect(asked.filter((l) => l.status === 'asked' && l.asked_at)).toHaveLength(4)
    await cement.getByRole('checkbox', { name: 'Select Bole Trading (seed)' }).evaluate((el) => el.removeAttribute('disabled'))
    await cement.getByRole('checkbox', { name: 'Select Bole Trading (seed)' }).check({ force: true })
    await admin.getByRole('button', { name: 'Mark as asked' }).click()
    await expect(admin.getByText('Bole Trading (seed) asked not to be contacted.')).toBeVisible()
    await admin.reload()

    // J6: replies; one also saved as the supplier's current price (history kept).
    const reply = async (item: string, supplier: string, price: string, quantity: string, delivery: string, save: boolean) => {
      const box = section(admin, item)
      await box.getByRole('row', { name: new RegExp(supplier.replace(/[()]/g, '\\$&')) }).getByRole('button', { name: 'Enter reply' }).click()
      await box.getByLabel(/Unit price/).fill(price)
      await box.getByLabel('Quantity').fill(quantity)
      await box.getByLabel('Delivery charge (ETB)').fill(delivery)
      await box.getByLabel('Valid until').fill(iso(7))
      if (!save) await box.getByLabel('Also save as this supplier’s current price').uncheck()
      await box.getByRole('button', { name: 'Save reply' }).click()
      await expect(box.getByRole('button', { name: 'Save reply' })).toHaveCount(0)
    }
    await reply('Dangote cement 50kg', 'Merkato Steel House (seed)', '1,220', '50', '1000', true)
    await reply('Dangote cement 50kg', 'Abebe Building Materials (seed)', '1240', '50', '500', false)
    await reply('Rebar 12mm', 'Abebe Building Materials (seed)', '975', '100', '0', false)
    expect((await d.from('supplier_offers').select('status, superseded_by').eq('id', merkatoCementBefore).single()).data?.status).toBe('superseded')
    const newPrice = (await d.from('supplier_offers').select('price_etb_cents, source, source_note').eq('org_id', '5eed0000-0000-4000-8000-000000000002').eq('item_key', 'dangote cement 50kg').eq('status', 'current').single()).data
    expect(newPrice).toMatchObject({ price_etb_cents: 122000, source: 'partner_submitted', source_note: `Reply to quote ${ref}` })

    // J7: comparison and basket.
    await expect(cement.getByRole('row', { name: /Merkato Steel House/ })).toContainText('ETB 62,000.00')
    await expect(cement.getByRole('row', { name: /Merkato Steel House/ })).toContainText('Cheapest')
    await expect(cement.getByRole('row', { name: /Merkato Steel House/ })).toContainText('Same as their price list')
    await expect(cement.getByRole('row', { name: /Abebe Building Materials/ })).toContainText('−ETB 10.00 vs their price list')
    await expect(admin.getByText('Basket: one supplier or several?')).toBeVisible()
    // Abebe covers all three items within 3% of the cheapest split (one delivery each), so one supplier is recommended.
    await expect(admin.getByText('Abebe Building Materials (seed) can supply every item for ETB 169,625.00, only ETB 925.00 more than splitting the order (ETB 168,700.00). Within 3%, one supplier is simpler: one delivery and one invoice.')).toBeVisible()

    // J8: choose one per item; a second choice is refused; reject with a reason.
    await cement.getByRole('row', { name: /Merkato Steel House/ }).getByRole('button', { name: 'Choose' }).click()
    await expect(cement.getByRole('row', { name: /Merkato Steel House/ }).getByText('chosen')).toBeVisible()
    await cement.getByRole('row', { name: /Abebe Building Materials/ }).getByRole('button', { name: 'Choose' }).click()
    await expect(cement.getByText('Another supplier is already chosen for this item. Undo that choice first.')).toBeVisible()
    admin.once('dialog', (dlg) => void dlg.accept('Dearer and slower'))
    await cement.getByRole('row', { name: /Abebe Building Materials/ }).getByRole('button', { name: 'Reject' }).click()
    await expect(cement.getByText('Rejected: Dearer and slower')).toBeVisible()
    await rebar.getByRole('row', { name: /Abebe Building Materials/ }).getByRole('button', { name: 'Choose' }).click()
    await expect(rebar.getByRole('row', { name: /Abebe Building Materials/ }).getByText('chosen')).toBeVisible()
    // An item with a chosen supplier cannot be removed.
    admin.once('dialog', (dlg) => void dlg.accept())
    await admin.getByRole('row', { name: /Dangote cement 50kg/ }).first().getByRole('button', { name: 'Remove' }).click()
    await expect(admin.getByText('A supplier is chosen for this item. Undo the choice first.')).toBeVisible()

    // J9: suggested total; the owner sees margin and commission, worked out on screen only.
    await expect(admin.getByText('Cost: ETB 159,500.00')).toBeVisible()
    await expect(admin.getByText('2 of 3 items have a chosen supplier.')).toBeVisible()
    await admin.getByLabel(/Margin %/).fill('8')
    await expect(admin.getByText(/\+ margin ETB/)).toContainText('ETB 172,260.00')
    await admin.getByLabel(/Commission %/).fill('5')
    await expect(admin.getByText(/HagerLand would earn/)).toContainText('ETB 7,975.00')
    await expect(admin.getByText('Copy the price into “Issue the quote” on this page. Nothing is sent automatically.')).toBeVisible()
    const audits = (await d.from('audit_log').select('action').eq('entity_id', quoteId)).data!.map((a) => a.action)
    expect(audits).toEqual(expect.arrayContaining(['supply.quote.item_add', 'supply.quote.item_edit', 'supply.quote.item_remove', 'supply.quote.shortlist', 'supply.quote.asked', 'supply.quote.reply', 'supply.quote.choose', 'supply.quote.reject']))

    // J10: issue the quote exactly as before; the customer sees nothing of the supplier work.
    await admin.fill('#q-total', '172260')
    await admin.getByRole('button', { name: 'Issue quote' }).click()
    await expect.poll(async () => (await d.from('quote_requests').select('status').eq('id', quoteId).single()).data?.status).toBe('quoted')
    const mail = await mailWithSubject(user.email, `Your quote is ready (${ref})`)
    for (const secret of [...SUPPLIERS, 'Added by HagerLand', 'Hollow block 20cm', 'Margin', 'commission', '1,220']) {
      expect(mail.html, `email shows ${secret}`).not.toContain(secret)
      expect(mail.text, `email shows ${secret}`).not.toContain(secret)
    }
    await page.goto('/account/quotes')
    await expect(page.getByText(ref)).toBeVisible()
    const account = await page.content()
    for (const secret of [...SUPPLIERS, 'Added by HagerLand', 'Hollow block 20cm', 'Margin']) expect(account, `account shows ${secret}`).not.toContain(secret)

    // J12: a cancelled quote is read-only; a page left open is refused by the server.
    await d.from('quote_requests').update({ status: 'cancelled' }).eq('id', quoteId)
    await admin.getByRole('group', { name: 'Add item' }).getByLabel('Item').fill('Too late')
    await admin.getByRole('group', { name: 'Add item' }).getByLabel('Quantity').fill('1')
    await admin.getByRole('group', { name: 'Add item' }).getByRole('button', { name: 'Add' }).click()
    await expect(admin.getByText('This quote is cancelled: its items and suppliers can no longer be changed.')).toBeVisible()
    await admin.reload()
    await expect(admin.getByRole('group', { name: 'Add item' })).toHaveCount(0)
    await expect(admin.getByRole('button', { name: 'Mark as asked' })).toHaveCount(0)
    await expect(admin.getByRole('button', { name: 'Enter reply' })).toHaveCount(0)
    await expect(admin.getByRole('button', { name: 'Choose' })).toHaveCount(0)
    await admin.close()
  } finally {
    if (quoteId) await d.from('quote_requests').delete().eq('id', quoteId)
    await d.auth.admin.deleteUser(user.id)
    // Put the seed's Merkato cement price back, so the journey can run again.
    await restoreSeedPrice()
  }
})

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}

async function staffPage(page: Page, role: 'operations' | 'agent' | 'content') {
  const email = uniqueEmail(`staff-qs-${role}`)
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

test('J11: operations uses suppliers but never sees margin or commission; agent and content cannot open quotes', async ({ page }) => {
  const seedQuote = '5eed9000-0000-4000-8000-000000000001'
  const cleanups: (() => Promise<void>)[] = []
  try {
    cleanups.push(await staffPage(page, 'operations'))
    await page.goto(`/roodber8/quotes/${seedQuote}`)
    await expect(page.getByRole('region', { name: 'Suppliers for Dangote cement 50kg' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Add item' })).toBeVisible()
    await expect(page.getByText(/^Cost: ETB/)).toBeVisible()
    await expect(page.getByLabel(/Margin %/)).toHaveCount(0)
    await expect(page.getByLabel(/Commission %/)).toHaveCount(0)
    expect(await page.content()).not.toMatch(/Margin %|Commission %|HagerLand would earn/)

    for (const role of ['agent', 'content'] as const) {
      cleanups.push(await staffPage(page, role))
      await page.goto(`/roodber8/quotes/${seedQuote}`)
      await expect(page).toHaveURL(/denied=1/)
      await expect(page.getByRole('region', { name: /Suppliers for/ })).toHaveCount(0)
    }
  } finally {
    for (const c of cleanups) await c()
  }
})

test('nothing about suppliers reaches public pages, sitemaps, the digest or the quotes export', async ({ page, request }) => {
  for (const path of ['/', '/supplies', '/suppliers?q=Merkato', '/search?q=Merkato%20Steel', '/sitemap/companies.xml', '/sitemap/products.xml', '/supplies/materials-list']) {
    const res = await request.get(path)
    expect(res.status(), path).toBeLessThan(500)
    const body = await res.text()
    for (const s of SUPPLIERS) expect(body, `${path} shows ${s}`).not.toContain(s)
  }
  const daily = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(daily.status()).toBe(200)
  const digest = await mailWithSubject(process.env.ADMIN_DIGEST_EMAIL ?? '', 'HagerLand').catch(() => null)
  if (digest) for (const s of [...SUPPLIERS, 'ETB 1,230']) expect(digest.html).not.toContain(s)
  await adminSession(page)
  const csv = await page.request.get('/roodber8/export/quotes')
  expect(csv.status()).toBe(200)
  const text = await csv.text()
  for (const s of SUPPLIERS) expect(text).not.toContain(s)
})
