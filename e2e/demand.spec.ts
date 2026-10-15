import { expect, test } from '@playwright/test'
import { adminSession, db, mailWithSubject, randomPhone, uniqueEmail } from './helpers'

/** Demand intelligence (spec 26.13) and pillar performance (spec 26.14). */

test('demand dashboard: signals by pillar, activation recommendations linked to the stage gate, monthly CSV, digest line', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const d = db()
  const stamp = Date.now()
  await d.from('interest_registrations').insert({ vertical_key: 'insurance', pillar_key: 'insurance', category: `E2E landlord cover ${stamp}`, name: 'Demand Person', email: uniqueEmail('demand'), country_code: 'GB', city: 'London' })
  const { data: cat } = await d.from('service_categories').select('id').eq('slug', 'solar-installers').single()
  await d.from('service_requests').insert({ vertical_key: 'contractors', service_category_id: cat!.id, title: 'E2E unmatched solar', name: 'Unmatched Customer', phone: randomPhone(), status: 'triaged', closed_reason: null, created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() })
  await d.from('search_misses').upsert({ q_normalised: `e2e nothing ${stamp}`, vertical: 'supplies', count: 4, last_seen_at: new Date().toISOString() })

  await adminSession(page)
  await page.goto('/roodber8/demand?days=30')
  const byPillar = page.getByRole('region', { name: 'Demand by pillar' })
  await expect(byPillar.getByRole('row', { name: /Property Insurance/ })).toBeVisible()
  await expect(byPillar.getByRole('row', { name: /Building & Construction Supplies/ })).toBeVisible()
  const recs = page.getByRole('region', { name: 'Activation recommendations' })
  await expect(recs.getByText(`E2E landlord cover ${stamp}`)).toBeVisible()
  await expect(recs.getByRole('link', { name: 'Stage gate' }).first()).toHaveAttribute('href', /\/roodber8\/pillars#pillar-/)
  await expect(page.getByRole('region', { name: 'By country' }).getByText('GB')).toBeVisible()

  const month = new Date().toISOString().slice(0, 7)
  const csv = await (await page.request.get(`/roodber8/export/demand?month=${month}`)).text()
  expect(csv.split('\n')[0]).toContain('date,source,pillar,category,place,country,count')
  expect(csv).toContain(`E2E landlord cover ${stamp}`)
  expect(csv).toContain('Unmatched requests')

  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  expect((await mailWithSubject(process.env.ADMIN_DIGEST_EMAIL ?? '', 'digest')).text).toContain('Demand (24 h)')
})

test('performance dashboard: per-pillar leads, response, conversion, revenue, listings and providers, with CSV', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await db().from('deals').insert({ source_type: 'manual', title: 'E2E maintain deal', pillar_key: 'maintain', currency: 'ETB', commission_minor: 1_234_500, status: 'won' })
  await adminSession(page)
  await page.goto('/roodber8/performance?days=30')
  const t = page.getByRole('region', { name: 'Pillar KPIs' })
  await expect(t.getByRole('row')).toHaveCount(11)
  await expect(t.getByRole('row', { name: /Repair & Maintain Property/ })).toContainText('ETB')
  await expect(page.getByText('Average days on market')).toBeVisible()
  const csv = await (await page.request.get('/roodber8/export/performance?days=30')).text()
  expect(csv.split('\n')[0]).toContain('pillar,leads,median_first_response_hours,won,conversion_percent,revenue_etb,live_listings,live_providers')
  expect(csv).toMatch(/maintain,\d+,[^,]*,\d+,[^,]*,\d{5,}/)
})
