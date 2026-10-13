import { expect, test } from '@playwright/test'
import { adminSession, db, trackErrors } from '../helpers'

test('a guest builds a quote list, requests a quote, and HagerLand issues it', async ({ browser, page }) => {
  test.setTimeout(180_000)
  const errors = trackErrors(page)
  const d = db()
  const [{ data: cat }, { data: supply }] = await Promise.all([
    d.from('product_categories').select('id').not('parent_id', 'is', null).limit(1).single(),
    d.from('organisations').select('id').eq('kind', 'hagerland').ilike('name', '%supply%').single(),
  ])
  const pname = `Rebar 12 mm ${Date.now()}`
  const { data: product } = await d.from('products').insert({ name: pname, slug: `rebar-12-${Date.now()}`, category_id: cat!.id, seller_org_id: supply!.id, unit: 'piece', price_type: 'fixed', price_etb_cents: 85_000, stock_status: 'in_stock', status: 'published' }).select('id, slug').single()

  await page.goto(`/supplies/product/${product!.slug}`)
  await page.getByRole('button', { name: /Add to quote/ }).first().click()
  await page.goto('/supplies/quote')
  await expect(page.getByText(pname)).toBeVisible()
  await page.fill('#q-name', 'Meron Girma')
  await page.fill('#q-phone', '0911445566')
  await page.getByRole('button', { name: 'Request my quote' }).click()
  await page.waitForURL(/\/supplies\/quote\/sent\?ref=HLQ-/)
  const ref = new URL(page.url()).searchParams.get('ref')!
  await expect(page.getByText(ref)).toBeVisible()
  const { data: q } = await d.from('quote_requests').select('id, status, items:quote_request_items(product_id, quantity)').eq('reference', ref).single()
  expect(q?.status).toBe('submitted')
  expect((q?.items as { product_id: string }[])[0]?.product_id).toBe(product!.id)

  const admin = await browser.newPage()
  await adminSession(admin)
  await admin.goto(`/roodber8/quotes/${q!.id}`)
  await expect(admin.getByText(pname)).toBeVisible()
  await admin.fill('#q-total', '17000')
  await admin.getByRole('button', { name: 'Issue quote' }).click()
  await expect.poll(async () => (await d.from('quote_requests').select('status').eq('id', q!.id).single()).data?.status).toBe('quoted')
  await admin.close()
  await d.from('quote_requests').delete().eq('id', q!.id)
  await d.from('products').delete().eq('id', product!.id)
  expect(errors).toEqual([])
})

test('a guest sends a materials list with a file', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/supplies/materials-list')
  await page.fill('#q-notes', '40 bags of cement, 2 tonnes of 12 mm rebar, 10 m³ sand')
  await page.locator('input[type=file]').setInputFiles({ name: 'list.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') })
  await expect(page.getByText('list.pdf')).toBeVisible()
  await expect(page.locator('input[type=hidden][name=files]')).toHaveCount(1, { timeout: 20_000 })
  await page.fill('#q-name', 'Hana Tadesse')
  await page.fill('#q-phone', '0911778899')
  await page.getByRole('button', { name: 'Request my quote' }).click()
  await page.waitForURL(/\/supplies\/quote\/sent\?ref=HLQ-/)
  const ref = new URL(page.url()).searchParams.get('ref')!
  const { data: q } = await db().from('quote_requests').select('id, source, materials_file_paths').eq('reference', ref).single()
  expect(q?.source).toBe('materials_list')
  expect(q?.materials_file_paths).toHaveLength(1)
  await db().from('quote_requests').delete().eq('id', q!.id)
})

test('register interest in HagerLand Developments and send a contact message', async ({ page }) => {
  await page.goto('/our-developments')
  const form = page.locator('form', { has: page.locator('#ri-empty-name') })
  await page.fill('#ri-empty-name', 'Yonas Bekele')
  await page.fill('#ri-empty-phone', '0911002233')
  await form.locator('button[type=submit]').click()
  await expect(page.getByText('Thanks, your interest is registered')).toBeVisible()
  const { data: e } = await db().from('enquiries').select('id, target_type, intent').eq('name', 'Yonas Bekele').order('created_at', { ascending: false }).limit(1).single()
  expect(e).toMatchObject({ target_type: 'hagerland_development', intent: 'register_interest' })

  await page.goto('/contact')
  await page.fill('#contact-name', 'Selam Abebe')
  await page.fill('#contact-phone', '0911334455')
  await page.fill('#contact-message', 'Do you deliver cement to Adama?')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
  const { data: c } = await db().from('enquiries').select('id, target_type').eq('name', 'Selam Abebe').order('created_at', { ascending: false }).limit(1).single()
  expect(c?.target_type).toBe('general')
  await db().from('enquiries').delete().in('id', [e!.id, c!.id])
})
