import { expect, test } from '@playwright/test'
import { adminLogin, adminSession, db, trackErrors, uniqueEmail } from '../helpers'

/** Admin system (spec Section 18), against the local stack only. */

const PAGES: [string, string][] = [
  ['/roodber8', 'Dashboard'],
  ['/roodber8/review', 'Review queue'],
  ['/roodber8/properties', 'Properties'],
  ['/roodber8/properties/new', 'New listing'],
  ['/roodber8/developments', 'Developments'],
  ['/roodber8/developments/import', 'Import developments and buildings'],
  ['/roodber8/organisations', 'Organisations'],
  ['/roodber8/products', 'Products'],
  ['/roodber8/products/new', 'New product'],
  ['/roodber8/products/prices', 'Update prices and stock'],
  ['/roodber8/categories', 'Categories'],
  ['/roodber8/categories?type=service', 'Categories'],
  ['/roodber8/locations', 'Locations'],
  ['/roodber8/enquiries', 'Enquiries'],
  ['/roodber8/enquiries?unanswered=1', 'Enquiries'],
  ['/roodber8/quotes', 'Quotes'],
  ['/roodber8/sales', 'HagerLand sales'],
  ['/roodber8/users', 'Users'],
  ['/roodber8/promotions', 'Promotions'],
  ['/roodber8/import', 'Imports'],
  ['/roodber8/import?tab=review', 'Imports'],
  ['/roodber8/import?tab=history', 'Imports'],
  ['/roodber8/reports', 'Reports'],
  ['/roodber8/settings', 'Settings'],
  ['/roodber8/audit', 'Audit log'],
  ['/roodber8/search?q=cement', 'Search'],
  ['/roodber8/verticals', 'Verticals'],
  ['/roodber8/interest', 'Interest registrations'],
  ['/roodber8/partners', 'Partner applications'],
  ['/roodber8/exchange-rates', 'Exchange rates'],
  ['/roodber8/service-requests', 'Service requests'],
  ['/roodber8/service-requests?status=cancelled', 'Service requests'],
  ['/roodber8/request-questions', 'Request questions'],
  ['/roodber8/deals', 'Deals and commissions'],
  ['/roodber8/property-care', 'Property Care pipeline'],
  ['/roodber8/managed-properties', 'Managed properties'],
  ['/roodber8/managed-properties/new', 'Add a managed property'],
]

test('admin signs in with username, password and one-time code', async ({ page }) => {
  await adminLogin(page)
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
})

test('wrong one-time code is refused', async ({ page }) => {
  await page.goto('/roodber8-login')
  await page.fill('#adm-user', process.env.ADMIN_USERNAME ?? '')
  await page.fill('#adm-pass', process.env.ADMIN_PASSWORD ?? '')
  await page.fill('#adm-code', '000000')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText('Those details did not match')).toBeVisible()
})

test('every admin screen loads without errors', async ({ page }) => {
  await adminSession(page)
  const errors = trackErrors(page)
  for (const [path, heading] of PAGES) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: heading }), path).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('create a product, change its price, update stock by CSV and find it', async ({ page }) => {
  await adminSession(page)
  const sku = `E2E-${Date.now()}`
  await page.goto('/roodber8/products/new')
  await page.fill('#pr-name', `E2E Rebar 12mm ${sku}`)
  await page.selectOption('#pr-cat', { index: 1 })
  await page.fill('#pr-sku', sku)
  await page.selectOption('#pr-ptype', 'fixed')
  await page.fill('#pr-price', '1250.50')
  await page.getByRole('button', { name: 'Add specification' }).click()
  await page.getByLabel('Label').fill('Diameter')
  await page.getByLabel('Value').fill('12')
  await page.getByRole('button', { name: 'Create product' }).click()
  await page.waitForURL(/\/roodber8\/products\/[0-9a-f-]{36}\?created=1/)
  await expect(page.getByText('Product created as a draft')).toBeVisible()
  const id = page.url().split('/').pop()?.split('?')[0] ?? ''
  const { data: p } = await db().from('products').select('price_etb_cents, specs, status, price_updated_at').eq('id', id).single()
  expect(p?.price_etb_cents).toBe(125050)
  expect(p?.status).toBe('draft')
  expect(p?.specs).toEqual([{ label: 'Diameter', value: '12' }])

  await page.fill('#pr-price', '1300')
  await page.getByRole('button', { name: 'Save product' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  await page.goto('/roodber8/products/prices')
  await page.locator('input[type=file]').setInputFiles({ name: 'prices.csv', mimeType: 'text/csv', buffer: Buffer.from(`sku,price,stock_status\n${sku},1400,low_stock\nNOPE-1,10,in_stock\n`) })
  await expect(page.getByText('No product with this SKU')).toBeVisible()
  await page.getByRole('button', { name: 'Import 1 row' }).click()
  await expect(page.getByText('Updated 1 product.')).toBeVisible()
  const { data: after } = await db().from('products').select('price_etb_cents, stock_status').eq('id', id).single()
  expect(after).toEqual({ price_etb_cents: 140000, stock_status: 'low_stock' })

  await page.goto(`/roodber8/search?q=${sku}`)
  await expect(page.getByRole('link', { name: new RegExp(sku) })).toBeVisible()
  await db().from('products').delete().eq('id', id)
})

test('add and rename a category, add a location', async ({ page }) => {
  await adminSession(page)
  const name = `E2E Category ${Date.now()}`
  await page.goto('/roodber8/categories')
  await page.getByText('Add a product category').click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).first().fill(name)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(`Added “${name}”.`)).toBeVisible()
  await page.getByPlaceholder('Find by name').first().fill(name)
  await page.getByRole('button', { name: 'Edit' }).first().click()
  await page.getByRole('textbox', { name: 'Name', exact: true }).last().fill(`${name} renamed`)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect.poll(async () => (await db().from('product_categories').select('name').ilike('name', `${name}%`).single()).data?.name).toBe(`${name} renamed`)
  await db().from('product_categories').delete().ilike('name', `${name}%`)

  const area = `E2E Area ${Date.now()}`
  await page.goto('/roodber8/locations')
  await page.getByText('Add a place in Ethiopia').click()
  await page.getByRole('textbox', { name: 'Name (English)', exact: true }).first().fill(area)
  const parent = await page.locator('select[name="parent_id"]').first().locator('option', { hasText: 'Bole, Addis Ababa' }).first().getAttribute('value')
  await page.locator('select[name="parent_id"]').first().selectOption(parent ?? '')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(`Added “${area}”.`)).toBeVisible()
  const { data: loc } = await db().from('locations').select('level, display_name').eq('name', area).single()
  expect(loc?.level).toBe('area')
  expect(loc?.display_name).toContain('Bole')
  await db().from('locations').delete().eq('name', area)
})

test('issue a quote and move an enquiry through statuses', async ({ page }) => {
  await adminSession(page)
  const d = db()
  const { data: q } = await d.from('quote_requests').insert({ name: 'E2E Buyer', phone: '+251911234567', email: uniqueEmail('quote'), source: 'materials_list', notes: 'Need 40 bags of cement' }).select('id, reference').single()
  await d.from('quote_request_items').insert({ quote_request_id: q!.id, free_text_item: 'Cement OPC 50kg', quantity: 40, unit: 'bag' })
  await page.goto(`/roodber8/quotes/${q!.id}`)
  await expect(page.getByRole('heading', { level: 1, name: q!.reference })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Cement OPC 50kg' })).toBeVisible()
  await page.fill('#q-total', '52000')
  await page.getByRole('button', { name: 'Issue quote' }).click()
  await expect(page.getByText(/Quote (issued|saved)/)).toBeVisible()
  const { data: issued } = await d.from('quote_requests').select('status, quoted_total_etb_cents, quoted_at').eq('id', q!.id).single()
  expect(issued?.status).toBe('quoted')
  expect(issued?.quoted_total_etb_cents).toBe(5_200_000)

  const { data: e } = await d.from('enquiries').insert({ target_type: 'general', intent: 'other', name: 'E2E Sender', phone: '+251911234567', message: 'Hello from the admin test' }).select('id, reference').single()
  await page.goto(`/roodber8/enquiries/${e!.id}`)
  await expect(page.getByText('Hello from the admin test')).toBeVisible()
  await page.getByLabel('Status').selectOption('contacted')
  await page.getByRole('button', { name: 'Set status' }).click()
  await expect(page.getByText('Marked as contacted.')).toBeVisible()
  await page.getByLabel('New internal note').fill('Called back')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByText('Called back')).toBeVisible()
  await page.goto('/roodber8/audit?type=enquiry')
  await expect(page.getByRole('link', { name: e!.reference }).first()).toBeVisible()
  await d.from('enquiries').delete().eq('id', e!.id)
  await d.from('quote_requests').delete().eq('id', q!.id)
})

test('settings: contact phone appears on the site once set, and hides again when cleared', async ({ page }) => {
  await adminSession(page)
  await page.goto('/roodber8/settings')
  await page.fill('#set-contact-phone', '0911 22 33 44')
  await page.locator('form', { has: page.locator('#set-contact-phone') }).getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved. The website updates within a minute.').first()).toBeVisible()
  const { data } = await db().from('site_settings').select('value').eq('key', 'contact_details').single()
  expect((data?.value as { phone: string }).phone).toBe('+251911223344')
  await page.goto('/contact')
  await expect(page.getByText('+251 91 122 3344').first()).toBeVisible()

  await page.goto('/roodber8/settings')
  await page.fill('#set-contact-phone', '')
  await page.locator('form', { has: page.locator('#set-contact-phone') }).getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved. The website updates within a minute.').first()).toBeVisible()
  await page.goto('/contact')
  await expect(page.getByText('+251 91 122 3344')).toHaveCount(0)
})

test('suspend and restore a user', async ({ page }) => {
  await adminSession(page)
  const email = uniqueEmail('suspend')
  const { data: created } = await db().auth.admin.createUser({ email, password: 'correct-horse-battery', email_confirm: true, user_metadata: { full_name: 'Suspend Me' } })
  const id = created.user!.id
  await page.goto(`/roodber8/users?q=${encodeURIComponent(email)}`)
  await page.getByRole('link', { name: email }).click()
  await page.getByRole('button', { name: 'Suspend user' }).click()
  await expect(page.getByText(/User suspended/)).toBeVisible()
  expect((await db().from('profiles').select('is_suspended').eq('id', id).single()).data?.is_suspended).toBe(true)
  await page.getByRole('button', { name: 'Lift suspension' }).click()
  await expect(page.getByText('Suspension lifted.')).toBeVisible()
  await page.getByRole('button', { name: 'Delete account…' }).click()
  await page.fill('#del-confirm', email)
  await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  await page.waitForURL('**/roodber8/users?deleted=1')
  expect((await db().auth.admin.getUserById(id)).data.user).toBeNull()
})
