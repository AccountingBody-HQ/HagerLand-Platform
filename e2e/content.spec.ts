import { expect, test } from '@playwright/test'
import { createProvider, createUser, db, seedPublishedProperty, signIn } from './helpers'

/** Content, account pages and search for E9 (spec 24.11, 15, 13, 7). */

test('About, How it works, List with us and Help describe every service without pretending', async ({ page }) => {
  const { data: verticals } = await db().from('verticals').select('key, status')
  const status = Object.fromEntries((verticals ?? []).map((v) => [v.key, v.status]))
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Building the land.')
  // What we do follows the pillar registry, in the same customer groups as the homepage (spec 26.16, polish round 1).
  for (const t of ['Buy & Sell Property', 'Building & Construction Supplies', 'Build & Develop Property', 'Repair & Maintain Property']) await expect(page.locator('main').getByRole('link', { name: t, exact: true })).toBeVisible()
  if (status.finance === 'coming_soon') await expect(page.locator('main').getByText('Soon').first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/Provided by HagerLand|Trusted partners/)

  await page.goto('/how-it-works')
  await page.getByRole('tab', { name: 'Getting quotes' }).click()
  await expect(page.getByText(/up to three suitable providers/)).toBeVisible()

  await page.goto('/list-with-us')
  for (const id of ['owners', 'agents', 'developers', 'professionals', 'suppliers', 'businesses']) await expect(page.locator(`section#${id}`)).toBeVisible()
  if (status.jobs === 'coming_soon') await expect(page.locator('section#employers').getByRole('link', { name: 'Register interest as an employer' })).toHaveAttribute('href', '/jobs#register')
  await expect(page.locator('section#partners')).toBeVisible()

  await page.goto('/help')
  await expect(page.getByRole('heading', { name: 'Getting quotes for work' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toHaveCount(status.jobs === 'live' ? 1 : 0)
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('')
  expect(ld).toContain('"FAQPage"')
})

test('the legal pages cover requests, matching, commissions, partners, CVs and people abroad, with a last-updated date', async ({ page }) => {
  await page.goto('/terms')
  await expect(page.getByText(/^Last updated/)).toBeVisible()
  for (const h of ['12. Service requests and matching', '13. Finance and insurance partners', '14. Jobs', '15. People outside Ethiopia']) await expect(page.getByRole('heading', { name: h })).toBeVisible()
  await expect(page.getByText(/may receive a fee or commission from a provider/)).toBeVisible()
  await page.goto('/privacy')
  for (const h of ['People outside Ethiopia', 'How long we keep it']) await expect(page.getByRole('heading', { name: h })).toBeVisible()
  for (const t of [/Providers matched to your request/, /CVs and other details sent with job applications/, /UK GDPR/, /Download my data/]) await expect(page.getByText(t).first()).toBeVisible()
  await page.goto('/cookies')
  await expect(page.getByText(/the currency you chose for approximate prices/)).toBeVisible()
})

test('a signed-in requester sees their quotes in their account', async ({ page }) => {
  const user = await createUser({ name: 'Quote Person' })
  const { data: q } = await db().from('quote_requests').insert({ name: 'Quote Person', phone: '+251911000333', requester_user_id: user.id, source: 'materials_list' }).select('id, reference').single()
  try {
    await signIn(page, user.email, user.password)
    await page.goto('/account/quotes')
    await expect(page.getByText(q!.reference)).toBeVisible()
  } finally {
    await db().from('quote_requests').delete().eq('id', q!.id)
  }
})

test('the header search shows grouped suggestions and remembers recent searches', async ({ page, request }) => {
  const prop = await seedPublishedProperty({ title: `E2E Suggest Zebra ${Date.now()}` })
  try {
    const res = await request.get(`/api/search/suggest?q=${encodeURIComponent('Zebra')}&v=${Date.now()}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.groups.find((g: { id: string }) => g.id === 'properties').items[0].label).toContain('E2E Suggest Zebra')
    await page.goto('/')
    await page.getByRole('button', { name: 'Search', exact: true }).first().click()
    const box = page.locator('#global-search')
    await box.fill('Zebra')
    await expect(page.getByText('Properties', { exact: true }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: /E2E Suggest Zebra/ }).first()).toBeVisible()
    await box.press('Enter')
    await page.waitForURL(/\/search\?q=Zebra/)
    await page.getByRole('button', { name: 'Search', exact: true }).first().click()
    await page.locator('#global-search').fill('')
    await expect(page.getByText('Recent searches')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zebra' })).toBeVisible()
  } finally {
    await db().from('properties').delete().eq('id', prop.id)
  }
})

test('a developer adds a development from the dashboard, and building pages offer listing alerts', async ({ page }) => {
  const dev = await createProvider({ name: `E2E Dashboard Developer ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'developer' }).eq('id', dev.orgId)
  try {
    await signIn(page, dev.user.email, dev.user.password)
    await page.goto('/account/developments')
    await page.getByRole('link', { name: /Add development/ }).first().click()
    await page.locator('#dv-name').fill(`E2E Sunrise Residences ${Date.now()}`)
    await page.locator('#dv-loc').fill('Bole')
    await page.getByRole('option', { name: /^Bole/ }).first().click()
    await page.getByRole('button', { name: 'Create development' }).click()
    await page.waitForURL(/\/account\/developments\/[0-9a-f-]+\?created=1/)
    await expect(page.getByText('Saved as a draft. Add photos, then submit it for review.')).toBeVisible()

    const { data: published } = await db().from('developments').select('slug, id').eq('developer_org_id', dev.orgId).single()
    await db().from('developments').update({ status: 'published' }).eq('id', published!.id)
    await page.goto(`/developments/${published!.slug}?v=${Date.now()}`)
    const alerts = page.getByRole('button', { name: 'Get alerts for new listings here' })
    await expect(alerts).toBeVisible()
    await alerts.click()
    await page.getByRole('button', { name: 'Save search' }).click()
    await expect(page.getByText(/Search saved/)).toBeVisible()
    const { data: saved } = await db().from('saved_searches').select('params').eq('user_id', dev.user.id).single()
    expect(saved?.params).toMatchObject({ purpose: 'sale', query: `development=${published!.id}` })
  } finally {
    await db().from('developments').delete().eq('developer_org_id', dev.orgId)
    await db().from('organisations').delete().eq('id', dev.orgId)
  }
})
