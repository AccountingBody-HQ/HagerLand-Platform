import { expect, test } from '@playwright/test'
import { adminSession, db } from './helpers'

/** Guides content hub (spec 25.2g) and the build-cost estimator (spec 25.2h). */

test.describe.configure({ mode: 'serial' })

test('starter guides are unpublished drafts marked "Needs AB review", and nothing shows until a guide is published', async ({ page }) => {
  const { data } = await db().from('guides').select('slug, status, needs_review').in('slug', ['how-to-prepare-a-materials-list', 'questions-to-ask-a-contractor', 'property-viewing-checklist'])
  expect(data).toHaveLength(3)
  for (const g of data ?? []) expect(g).toMatchObject({ needs_review: true })
  const live = (data ?? []).filter((g) => g.status === 'published')
  test.skip(live.length > 0, 'a guide was published by an earlier run')
  expect((await page.goto('/guides/questions-to-ask-a-contractor'))?.status()).toBe(404)
  await page.goto('/guides')
  await expect(page.getByRole('heading', { name: 'Our first guides are being written' })).toBeVisible()
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
})

test('HagerLand reviews and publishes a guide; it appears with FAQ data, on the guides hub and as teasers', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(120_000)
  const { data: g } = await db().from('guides').select('id').eq('slug', 'property-viewing-checklist').single()
  await adminSession(page)
  await page.goto('/roodber8/guides')
  await expect(page.getByRole('row').filter({ hasText: 'Property viewing checklist' }).getByText('Needs AB review')).toBeVisible()
  await page.goto(`/roodber8/guides/${g!.id}`)
  await expect(page.getByText(/Needs AB review: this draft was prepared for you/)).toBeVisible()
  await page.getByLabel('Status').selectOption('published')
  await page.getByRole('button', { name: 'Save guide' }).click()
  await expect(page.getByText(/Tick “Content checked” before publishing|Tick "Content checked" before publishing/).first()).toBeVisible()
  expect((await db().from('guides').select('status').eq('id', g!.id).single()).data?.status).toBe('draft')
  await page.getByLabel(/Content checked/).check()
  await page.getByRole('button', { name: 'Save guide' }).click()
  await expect(page.getByText('Saved and published.')).toBeVisible()
  try {
    await page.goto('/guides/property-viewing-checklist')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Property viewing checklist')
    await expect(page.getByRole('heading', { name: 'Questions to ask' })).toBeVisible()
    await expect(page.getByText(/not legal, financial or professional advice/)).toBeVisible()
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('')
    expect(ld).toContain('"FAQPage"')
    expect(ld).toContain('"Article"')
    await page.goto('/guides')
    await expect(page.getByRole('link', { name: 'Property viewing checklist' })).toBeVisible()
    await page.goto('/property')
    await expect(page.getByRole('heading', { name: 'Property guides' })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Property viewing checklist' })).toBeVisible()
  } finally {
    await page.goto(`/roodber8/guides/${g!.id}`)
    await page.getByLabel('Status').selectOption('draft')
    await page.getByLabel(/Content checked/).uncheck()
    await page.getByRole('button', { name: 'Save guide' }).click()
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
  }
  expect((await page.goto('/guides/property-viewing-checklist'))?.status()).toBe(404)
})

test('the build-cost estimator is hidden until HagerLand enters a rate, then estimates and links to quotes', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await db().from('build_cost_rates').delete().not('id', 'is', null)
  await adminSession(page)
  await page.goto('/roodber8/build-costs')
  await expect(page.getByText(/the estimator is hidden/)).toBeVisible()
  expect((await page.goto('/build-cost-estimator'))?.status()).toBe(404)
  await page.goto('/roodber8/build-costs')
  await page.getByLabel('Rate (ETB per m²)').fill('20000')
  await page.getByRole('button', { name: 'Save rate' }).click()
  await expect(page.getByText(/Rate saved/)).toBeVisible()
  try {
    await page.goto('/build-cost-estimator')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How much will it cost to build?')
    await page.getByLabel('How many floors?').selectOption('2')
    await page.getByLabel('Floor area of each storey (m²)').fill('150')
    await expect(page.getByText('ETB 6,000,000')).toBeVisible()
    await expect(page.getByText('Estimate only')).toBeVisible()
    await expect(page.getByText(/not a quote/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get building quotes' })).toBeVisible()
    await page.goto('/contractors')
    await expect(page.getByRole('link', { name: /Try the build-cost estimator/ })).toHaveAttribute('href', '/build-cost-estimator')
  } finally {
    await page.goto('/roodber8/build-costs')
    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: 'Delete' }).first().click()
    await expect(page.getByText('Rate deleted.')).toBeVisible()
  }
})
