import { expect, test } from '@playwright/test'
import { adminSession, asFreshVisitor, createUser, db, linkMatching, mailWithSubject, seedPublishedProperty, signIn } from './helpers'

/** Estate agency, save, compare, valuation, financing, saved searches and alerts, map and type pages (spec 24.7, 25.2a/b/l). */

test('agency pages explain each service and their enquiries reach the HagerLand sales view', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await asFreshVisitor(page)
  await page.goto('/agency')
  for (const name of ['Sell with HagerLand', 'Let with HagerLand', 'Buyer representation', 'Property sourcing for diaspora buyers', 'Developer sales', 'Request a valuation']) await expect(page.getByRole('heading', { name })).toBeVisible()
  for (const name of ['Seller representation', 'Viewing coordination', 'Negotiation assistance', 'Investment property sourcing']) await expect(page.getByRole('link', { name })).toBeVisible()
  await page.getByRole('link', { name: /Sell with HagerLand/ }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sell with HagerLand')
  const name = `Agency Seller ${Date.now()}`
  await page.locator('#ag-sell-name').fill(name)
  await page.locator('#ag-sell-phone').fill('0911002244')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
  await adminSession(page)
  await page.goto('/roodber8/sales')
  await expect(page.getByText(name)).toBeVisible()
  await db().from('enquiries').delete().eq('name', name)
})

test('a property page offers save, compare, valuation and financing; HagerLand-marketed listings are labelled', async ({ page }) => {
  const a = await seedPublishedProperty({ title: `E2E compare A ${Date.now()}`, price: 3_000_000 })
  const b = await seedPublishedProperty({ title: `E2E compare B ${Date.now()}`, price: 5_000_000 })
  await db().from('properties').update({ is_hagerland: true }).eq('id', a.id)
  try {
    await page.goto(`/property/${a.slug}`)
    await expect(page.getByText('Marketed by HagerLand').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Request a valuation' })).toHaveAttribute('href', '/request-service/property-valuers')
    await expect(page.getByRole('link', { name: /Ask about financing \(coming soon\)/ })).toHaveAttribute('href', '/finance#register')
    await page.getByRole('button', { name: 'Compare', exact: true }).click()
    await expect(page.getByRole('button', { name: 'In compare list' })).toBeVisible()
    await page.goto(`/property/${b.slug}`)
    await page.getByRole('button', { name: 'Compare', exact: true }).click()
    await page.getByRole('link', { name: 'Compare (2)' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compare properties')
    await expect(page.getByRole('columnheader', { name: /E2E compare A/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /E2E compare B/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'ETB 5,000,000' })).toBeVisible()
    await page.getByRole('button', { name: 'Remove' }).first().click()
    await expect(page.getByRole('columnheader', { name: /E2E compare A/ })).toHaveCount(0)

    await page.goto(`/property/${b.slug}`)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForURL(/\/login\?next=/)
  } finally {
    await db().from('properties').delete().in('id', [a.id, b.id])
  }
})

test('a signed-in user saves a property and a search, gets an instant alert when a match is approved, and can unsubscribe', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const user = await createUser({ name: 'Alert Person' })
  const existing = await seedPublishedProperty({ title: `E2E saved ${Date.now()}`, purpose: 'rent', locationPath: 'addis-ababa/yeka', price: 30_000 })
  await db().from('properties').update({ price_period: 'month' }).eq('id', existing.id)
  await signIn(page, user.email, user.password)
  await page.goto(`/property/${existing.slug}`)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible()
  await page.goto('/account/saved')
  await expect(page.getByText(/E2E saved/)).toBeVisible()

  await page.goto('/property/to-rent/addis-ababa/yeka?beds=2')
  await page.getByRole('button', { name: 'Save this search' }).click()
  await page.getByLabel('Name this search').fill('Yeka two-bed rentals')
  await page.getByLabel('Email me').selectOption('instant')
  await page.getByRole('button', { name: 'Save search' }).click()
  await expect(page.getByText(/Search saved/)).toBeVisible()
  const { data: search } = await db().from('saved_searches').select('id, params, alert_frequency').eq('user_id', user.id).single()
  expect(search).toMatchObject({ alert_frequency: 'instant', params: { purpose: 'rent', location: 'addis-ababa/yeka', query: 'beds=2' } })

  // A new matching listing is approved by HagerLand: the alert goes out at once.
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/yeka').single()
  const { data: fresh } = await db().from('properties').insert({ title: `E2E alert match ${Date.now()}`, slug: `e2e-alert-${Date.now()}`, purpose: 'rent', property_type: 'apartment', location_id: loc!.id, bedrooms: 2, bathrooms: 1, price_etb: 40_000, price_period: 'month', description: 'A two-bedroom apartment for the alerts test.', lister_type: 'owner', status: 'pending_review' }).select('id').single()
  const admin = await browser.newPage()
  await adminSession(admin)
  await admin.goto(`/roodber8/properties/${fresh!.id}`)
  await admin.getByRole('button', { name: 'Approve' }).first().click()
  await expect.poll(async () => (await db().from('properties').select('status').eq('id', fresh!.id).single()).data?.status).toBe('published')
  const alert = await mailWithSubject(user.email, 'Yeka two-bed rentals')
  expect(alert.text).toContain('E2E alert match')
  await page.goto(new URL(linkMatching(alert.html, /\/alerts\/unsubscribe\?token=/)).pathname + new URL(linkMatching(alert.html, /\/alerts\/unsubscribe\?token=/)).search)
  await page.getByRole('button', { name: 'Stop these emails' }).click()
  await expect(page.getByText(/You will no longer get emails/)).toBeVisible()
  expect((await db().from('saved_searches').select('alert_frequency').eq('id', search!.id).single()).data?.alert_frequency).toBe('off')

  await page.goto('/account/alerts')
  await expect(page.getByRole('link', { name: 'Yeka two-bed rentals' })).toHaveAttribute('href', '/property/to-rent/addis-ababa/yeka?beds=2')
  await page.getByRole('button', { name: 'Delete Yeka two-bed rentals' }).click()
  await expect(page.getByText('No saved searches yet')).toBeVisible()
  await db().from('properties').delete().in('id', [existing.id, fresh!.id])
})

test('daily alerts are sent by the daily job only when there is something new', async ({ request }) => {
  const user = await createUser()
  const { data: s } = await db().from('saved_searches').insert({ user_id: user.id, name: 'Daily Bole sales', params: { purpose: 'sale', location: 'addis-ababa/bole', query: '' }, alert_frequency: 'daily', created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() }).select('id').single()
  const p = await seedPublishedProperty({ title: `E2E daily alert ${Date.now()}` })
  const res = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
  expect(res.searchAlerts).toBeGreaterThanOrEqual(1)
  await mailWithSubject(user.email, 'Daily Bole sales')
  const again = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
  expect(again.ok).toBe(true)
  const { data } = await db().from('saved_searches').select('last_sent_at').eq('id', s!.id).single()
  expect(data?.last_sent_at).not.toBeNull()
  await db().from('properties').delete().eq('id', p.id)
})

test('a signed-in user’s quote list is kept in their account', async ({ page }) => {
  const user = await createUser()
  await signIn(page, user.email, user.password)
  await page.goto('/supplies/quote')
  await page.getByLabel('Item description').fill('E2E sync nails')
  await page.getByLabel('Item description').press('Enter')
  await expect(page.getByText('E2E sync nails')).toBeVisible()
  await expect.poll(async () => JSON.stringify((await db().from('quote_lists').select('items').eq('user_id', user.id).maybeSingle()).data?.items ?? [])).toContain('E2E sync nails')
})

test('property-type pages, canonicals and the map view', async ({ page }) => {
  const made = await Promise.all([0, 1, 2].map((i) => seedPublishedProperty({ title: `E2E type page ${Date.now()}-${i}`, locationPath: 'addis-ababa/bole' })))
  await db().from('properties').update({ lat: 8.99, lng: 38.79 }).in('id', made.map((m) => m.id))
  try {
    const res = await page.goto('/property/for-sale/addis-ababa/bole/apartments')
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apartments for sale in Bole, Addis Ababa')
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://www.hagerland.com/property/for-sale/addis-ababa/bole/apartments')
    await page.goto('/property/for-sale/addis-ababa/bole?type=apartment')
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://www.hagerland.com/property/for-sale/addis-ababa/bole/apartments')
    expect((await page.goto('/property/for-sale/addis-ababa/bole/not-a-type'))?.status()).toBe(404)
    await page.goto('/property/for-sale/addis-ababa/bole')
    await page.getByRole('link', { name: 'Map view' }).click()
    await expect(page.getByRole('application', { name: 'Map of properties' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText(/have a location on the map/)
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible()
  } finally {
    await db().from('properties').delete().in('id', made.map((m) => m.id))
  }
})
