import { expect, test } from '@playwright/test'
import { adminSession, createProvider, createUser, db, mailWithSubject, signIn, testPhotos } from './helpers'

/** Supplier self-serve products, Special Buys and trade accounts (spec 25.2c–e), and the full category list (Vision §1). */

test('HagerLand Supply lists every building-supplies category from the vision', async ({ page }) => {
  await page.goto('/supplies')
  const main = page.locator('#categories')
  for (const name of ['Building materials', 'Roofing', 'Plumbing', 'Electrical', 'Bathroom & sanitaryware', 'Kitchen', 'Tiles & flooring', 'Doors, windows & ironmongery', 'Paint & decorating', 'Tools', 'Safety & workwear', 'Construction equipment', 'Interior finishing', 'Landscaping', 'Specialist products'])
    await expect(main.getByRole('link', { name, exact: true })).toBeVisible()
  for (const sub of ['Cement & concrete', 'Steel & rebar', 'Blocks & bricks', 'Sand & aggregates', 'Timber & boards', 'Lighting']) await expect(page.getByRole('link', { name: sub, exact: true }).first()).toBeAttached()
  await expect(page.getByRole('link', { name: 'Apply for a trade account' })).toHaveAttribute('href', '/supplies/trade')
})

test('a supplier lists a product, HagerLand approves it, and it shows on HagerLand Supply and the supplier profile', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const stamp = Date.now()
  const supplier = await createProvider({ name: `E2E Cement Traders ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'supplier' }).eq('id', supplier.orgId)
  const name = `E2E Dangote cement 50kg ${stamp}`
  const s = await browser.newPage()
  await signIn(s, supplier.user.email, supplier.user.password)
  await s.goto('/account')
  await s.getByRole('link', { name: 'Products', exact: true }).first().click()
  await s.getByRole('link', { name: 'Add product' }).first().click()
  await s.locator('#pr-name').fill(name)
  await s.locator('#pr-cat').selectOption({ label: 'Building materials › Cement & concrete' })
  await expect(s.getByLabel('New brand name')).toHaveCount(0)
  await expect(s.getByLabel('Seller')).toHaveCount(0)
  await s.getByLabel('Price type').selectOption('fixed')
  await s.locator('#pr-price').fill('1250')
  await s.locator('#pr-trade').fill('1100')
  await s.getByRole('button', { name: 'Save draft' }).click()
  await s.waitForURL(/\/account\/products\/[0-9a-f-]+\/edit\?created=1/)
  const id = s.url().split('/products/')[1].split('/')[0]
  expect((await db().from('products').select('status, seller_org_id, trade_price_etb_cents, is_special_buy').eq('id', id).single()).data).toMatchObject({ status: 'draft', seller_org_id: supplier.orgId, trade_price_etb_cents: 110000, is_special_buy: false })

  await s.getByRole('button', { name: 'Submit for review' }).click()
  await expect(s.getByText('Add at least one photo before you submit the product.')).toBeVisible()
  const [photo] = await testPhotos(1)
  await s.locator('input[type=file]').first().setInputFiles(photo)
  await expect(s.locator('img[alt]').filter({ hasNot: s.locator('header *') }).first()).toBeVisible()
  await expect.poll(async () => (await db().from('media').select('id', { count: 'exact', head: true }).eq('entity_type', 'product').eq('entity_id', id)).count).toBe(1)
  await s.getByRole('button', { name: 'Submit for review' }).click()
  await expect.poll(async () => (await db().from('products').select('status').eq('id', id).single()).data?.status).toBe('pending_review')

  await adminSession(page)
  await page.goto('/roodber8/review?tab=products')
  await expect(page.getByText(name)).toBeVisible()
  await page.goto(`/roodber8/products/${id}`)
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await expect.poll(async () => (await db().from('products').select('status').eq('id', id).single()).data?.status).toBe('published')
  await mailWithSubject(supplier.user.email, name)

  const { data: prod } = await db().from('products').select('slug').eq('id', id).single()
  await page.goto(`/supplies/product/${prod!.slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
  await expect(page.getByText('Your trade price')).toHaveCount(0)
  const { data: org } = await db().from('organisations').select('slug').eq('id', supplier.orgId).single()
  await page.goto(`/company/${org!.slug}`)
  await expect(page.getByRole('heading', { name: 'Products (1)' })).toBeVisible()
  await expect(page.getByRole('link', { name })).toBeVisible()

  // The suppliers directory filters by the categories a supplier sells (org_product_categories).
  const { data: landscaping } = await db().from('product_categories').select('id').eq('slug', 'landscaping').single()
  await db().from('org_product_categories').insert({ org_id: supplier.orgId, product_category_id: landscaping!.id })
  await page.goto(`/suppliers?category=landscaping&q=${encodeURIComponent(`E2E Cement Traders ${stamp}`)}`)
  await expect(page.getByRole('link', { name: `E2E Cement Traders ${stamp}` }).first()).toBeVisible()
  await page.goto(`/suppliers?category=roofing&q=${encodeURIComponent(`E2E Cement Traders ${stamp}`)}`)
  await expect(page.getByRole('link', { name: `E2E Cement Traders ${stamp}` })).toHaveCount(0)

  // Edits to a live product wait for review; the live product is unchanged.
  await s.goto(`/account/products/${id}/edit`)
  await s.locator('#pr-price').fill('1300')
  await s.getByRole('button', { name: 'Save product' }).click()
  await expect(s.getByText(/Your changes will appear once HagerLand has reviewed them/)).toBeVisible()
  expect((await db().from('products').select('price_etb_cents').eq('id', id).single()).data?.price_etb_cents).toBe(125000)

  await db().from('products').delete().eq('id', id)
  await db().from('organisations').delete().eq('id', supplier.orgId)
})

test('Special Buys: HagerLand sets the offer, it shows with the was-price, and hides itself when sold out', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const stamp = Date.now()
  const supplier = await createProvider({ name: `E2E Clearance Co ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'supplier' }).eq('id', supplier.orgId)
  const { data: cat } = await db().from('product_categories').select('id').eq('slug', 'roofing').single()
  const name = `E2E Surplus roof sheets ${stamp}`
  const { data: p } = await db().from('products').insert({ slug: `e2e-surplus-${stamp}`, name, category_id: cat!.id, seller_org_id: supplier.orgId, price_type: 'fixed', price_etb_cents: 90000, stock_status: 'in_stock', status: 'published' }).select('id, slug').single()
  try {
    await adminSession(page)
    await page.goto(`/roodber8/products/${p!.id}`)
    await page.getByLabel('On Special Buy').check()
    await page.getByLabel('Ends on').fill(new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10))
    await page.getByLabel('Was price (ETB)').fill('800')
    await page.getByRole('button', { name: 'Save offer' }).click()
    await expect(page.getByText('The was-price must be higher than the current price.')).toBeVisible()
    await page.getByLabel('Was price (ETB)').fill('1200')
    await page.getByLabel('Quantity available').fill('40')
    await page.getByRole('button', { name: 'Save offer' }).click()
    await expect(page.getByText('Special Buy saved.')).toBeVisible()

    await page.goto('/supplies/special-buys')
    const card = page.locator('article').filter({ hasText: name })
    await expect(card).toBeVisible()
    await expect(card.getByText('ETB 900')).toBeVisible()
    await expect(card.locator('s')).toHaveText('ETB 1,200')
    await expect(card.getByText(/40 .* left/)).toBeVisible()
    await page.goto(`/supplies/product/${p!.slug}`)
    await expect(page.getByText('Special Buy', { exact: true })).toBeVisible()

    await page.goto(`/roodber8/products/${p!.id}`)
    await page.getByLabel('Quantity available').fill('0')
    await page.getByRole('button', { name: 'Save offer' }).click()
    await expect(page.getByText('Special Buy saved.')).toBeVisible()
    await page.goto('/supplies/special-buys')
    await expect(page.locator('article').filter({ hasText: name })).toHaveCount(0)
  } finally {
    await db().from('products').delete().eq('id', p!.id)
    await db().from('organisations').delete().eq('id', supplier.orgId)
  }
})

test('trade accounts: a business applies, HagerLand approves, and only then trade prices appear', async ({ page, browser, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const stamp = Date.now()
  const supplier = await createProvider({ name: `E2E Trade Seller ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  const { data: cat } = await db().from('product_categories').select('id').eq('slug', 'tools').single()
  const { data: p } = await db().from('products').insert({ slug: `e2e-trade-${stamp}`, name: `E2E Angle grinder ${stamp}`, category_id: cat!.id, seller_org_id: supplier.orgId, price_type: 'fixed', price_etb_cents: 500000, trade_price_etb_cents: 420000, status: 'published' }).select('id, slug').single()
  const buyer = await createUser({ name: 'Trade Buyer' })
  try {
    expect((await (await request.get(`/api/trade-prices?ids=${p!.id}`)).json()).prices).toEqual({})
    const b = await browser.newPage()
    await b.goto('/supplies/trade')
    await expect(b.getByRole('heading', { name: 'Sign in to apply' })).toBeVisible()
    await signIn(b, buyer.email, buyer.password)
    await b.goto('/supplies/trade')
    await b.getByLabel('Business name').fill(`E2E Builders PLC ${stamp}`)
    await b.getByLabel('Type of business').fill('General contractor')
    await b.getByLabel('Phone').fill('0911223344')
    await b.getByRole('button', { name: 'Apply for a trade account' }).click()
    await expect(b.getByText(/Your application \(HLT-\d{4}-\d+\) is with us/)).toBeVisible()
    await mailWithSubject(buyer.email, 'Trade account application received')
    await b.goto(`/supplies/product/${p!.slug}`)
    await expect(b.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(b.getByText('Your trade price')).toHaveCount(0)

    await adminSession(page)
    await page.goto('/roodber8/trade-accounts')
    const row = page.getByRole('row').filter({ hasText: `E2E Builders PLC ${stamp}` })
    await row.getByRole('button', { name: 'Approve' }).click()
    await expect.poll(async () => (await db().from('trade_accounts').select('status').eq('user_id', buyer.id).single()).data?.status).toBe('approved')
    await mailWithSubject(buyer.email, 'Your trade account is approved')

    await b.goto(`/supplies/product/${p!.slug}`)
    await expect(b.getByText('Your trade price: ETB 4,200')).toBeVisible()
    // Anonymous visitors still never see it.
    await page.context().clearCookies()
    await page.goto(`/supplies/product/${p!.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Your trade price')).toHaveCount(0)
    expect(await page.content()).not.toContain('4,200')
  } finally {
    await db().from('trade_accounts').delete().eq('user_id', buyer.id)
    await db().from('products').delete().eq('id', p!.id)
    await db().from('organisations').delete().eq('id', supplier.orgId)
  }
})
