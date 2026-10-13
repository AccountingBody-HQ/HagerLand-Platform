import { expect, test } from '@playwright/test'
import { adminSession, db, seedPublishedProperty } from './helpers'

/** International foundation and approximate prices (spec 24.4, 25.2f). */

test('location search is Ethiopia-only unless a form asks for every country', async ({ request }) => {
  const et = (await (await request.get('/api/locations?q=london')).json()) as unknown[]
  expect(et).toHaveLength(0)
  const all = (await (await request.get('/api/locations?q=london&scope=all')).json()) as { label: string; description?: string }[]
  expect(all.some((o) => o.label === 'London' && o.description === 'United Kingdom')).toBe(true)
  const bad = (await (await request.get('/api/locations?q=london&scope=nonsense')).json()) as unknown[]
  expect(bad).toHaveLength(0)
})

test('property pages stay Ethiopia-only', async ({ request }) => {
  expect((await request.get('/property/for-sale/united-kingdom')).status()).toBe(404)
  expect((await request.get('/property/to-rent/united-kingdom/london')).status()).toBe(404)
})

test('a business abroad is found by country and city, shows its badge and country, and stays out of Ethiopian lists', async ({ page }) => {
  const d = db()
  const stamp = Date.now()
  const [{ data: london }, { data: plumbers }] = await Promise.all([
    d.from('locations').select('id').eq('path', 'united-kingdom/london').single(),
    d.from('service_categories').select('id').eq('slug', 'plumbers').single(),
  ])
  const { data: org } = await d
    .from('organisations')
    .insert({ kind: 'sole_trader', name: `E2E London Plumbing ${stamp}`, slug: `e2e-london-plumbing-${stamp}`, location_id: london!.id, serves_diaspora: true, source: 'admin', status: 'published' })
    .select('id, slug, country_code, currency')
    .single()
  expect(org).toMatchObject({ country_code: 'GB', currency: 'GBP' })
  await d.from('organisation_services').insert({ org_id: org!.id, service_id: plumbers!.id })
  try {
    // A unique search term per run, so cached results from earlier runs never apply.
    const q = `?q=${encodeURIComponent(`London Plumbing ${stamp}`)}`
    await page.goto(`/professionals/plumbers/united-kingdom/london${q}`)
    await expect(page.getByRole('link', { name: `E2E London Plumbing ${stamp}` })).toBeVisible()
    await page.goto(`/professionals/plumbers${q}`)
    await expect(page.getByRole('link', { name: `E2E London Plumbing ${stamp}` })).toHaveCount(0)
    await page.goto(`/company/${org!.slug}`)
    await expect(page.getByText('Serves the Ethiopian community abroad').first()).toBeVisible()
    await expect(page.getByText('London, United Kingdom').first()).toBeVisible()
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(ld.join(' ')).toContain('"addressCountry":"GB"')
  } finally {
    await d.from('organisations').delete().eq('id', org!.id)
  }
})

test('approximate prices appear only after rates are set and the visitor picks a currency', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const p = await seedPublishedProperty({ price: 4_500_000, title: `E2E approx price ${Date.now()}` })
  try {
    await page.goto(`/property/${p.slug}`)
    await expect(page.getByText('Show approximate prices in')).toHaveCount(0)

    await adminSession(page)
    await page.goto('/roodber8/exchange-rates')
    await page.getByLabel('Birr for one USD').fill('150')
    await page.getByRole('button', { name: 'Save rates' }).click()
    await expect(page.getByText('Rates saved')).toBeVisible()

    await page.goto(`/property/${p.slug}`)
    await page.getByLabel('Show approximate prices in').selectOption('USD')
    await expect(page.getByText('≈ US$30,000').first()).toBeVisible()
    await expect(page.getByText('ETB 4,500,000').first()).toBeVisible()
    await page.reload()
    await expect(page.getByText('≈ US$30,000').first()).toBeVisible()
    const { data: audit } = await db().from('audit_log').select('action').eq('action', 'rates.update').order('created_at', { ascending: false }).limit(1).single()
    expect(audit?.action).toBe('rates.update')
  } finally {
    await page.goto('/roodber8/exchange-rates')
    await page.getByLabel('Birr for one USD').fill('')
    await page.getByRole('button', { name: 'Save rates' }).click()
    await expect(page.getByText('Rates saved')).toBeVisible()
    await db().from('properties').delete().eq('id', p.id)
  }
})

test('admin adds a country and a city under it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const d = db()
  await d.from('locations').delete().eq('path', 'e2e-testland/e2e-town')
  await d.from('locations').delete().eq('path', 'e2e-testland')
  await adminSession(page)
  await page.goto('/roodber8/locations')
  await page.getByLabel('Country name (English)').fill('E2E Testland')
  await page.getByLabel('Country code').fill('qz')
  await page.getByRole('button', { name: 'Add country' }).click()
  await expect(page.getByText('Added E2E Testland')).toBeVisible()
  await page.getByText('Add a city or area abroad').click()
  const abroad = page.locator('details', { hasText: 'Add a city or area abroad' })
  await abroad.getByLabel('Name (English)').fill('E2E Town')
  await abroad.getByLabel('Parent').selectOption({ label: 'E2E Testland' })
  await abroad.getByRole('button', { name: /add|save/i }).click()
  await expect(page.getByText('Added “E2E Town”')).toBeVisible()
  const { data } = await d.from('locations').select('level, country_code').eq('path', 'e2e-testland/e2e-town').single()
  expect(data).toMatchObject({ level: 'city', country_code: 'QZ' })
  await d.from('locations').delete().eq('path', 'e2e-testland/e2e-town')
  await d.from('locations').delete().eq('path', 'e2e-testland')
})
