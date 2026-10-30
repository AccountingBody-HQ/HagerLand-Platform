import { expect, test } from '@playwright/test'
import { adminSetPillarModes, asFreshVisitor, createProvider, db, randomPhone, seedPublishedProperty, setPillarModes, uniqueEmail, tickTransferConsent } from './helpers'

/** Finance and insurance through licensed partners (spec 24.8). */

test.describe.configure({ mode: 'serial' })

/** Back to the launch modes (Interest only) when a test left Aggregate on. */
test.afterAll(async () => {
  await setPillarModes('finance', { direct: false, aggregate: false, interest: true })
  await setPillarModes('insurance', { direct: false, aggregate: false, interest: true })
})

test('with Interest only, finance and insurance list every category for interest and make no offers', async ({ page }) => {
  await page.goto('/finance')
  const finance = page.locator('#register').getByLabel('Which type of finance interests you?')
  for (const c of ['Mortgages', 'Diaspora mortgages', 'Housing finance', 'Land financing', 'Construction finance', 'Development finance', 'Bridging finance', 'Commercial property finance', 'Home-improvement finance', 'Supplier credit', 'Equipment finance']) await expect(finance.locator('option', { hasText: new RegExp(`^${c}$`) })).toHaveCount(1)
  await page.goto('/insurance')
  const ins = page.locator('#register').getByLabel('What would you like to insure?')
  for (const c of ['Home insurance', 'Building insurance', 'Landlord insurance', 'Contents insurance', 'Commercial property insurance', 'Construction insurance', 'Development and project insurance', 'Contractor insurance', 'Professional indemnity insurance', 'Public liability insurance']) await expect(ins.locator('option', { hasText: new RegExp(`^${c}$`) })).toHaveCount(1)
  await expect(page.locator('main')).not.toContainText(/\d+(\.\d+)?\s*%|premium of|per annum|you qualify|eligible for/i)
  await expect(page.locator('#partner').getByLabel('Type of organisation').locator('option')).toHaveText(['Insurer', 'Broker', 'Other'])
})

test('with Aggregate on, finance requests go through the engine to a lender, and property pages ask about financing', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const lender = await createProvider({ name: `E2E Partner Bank ${Date.now()}`, serviceSlug: 'mortgages', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'lender' }).eq('id', lender.orgId)
  const prop = await seedPublishedProperty({ title: `E2E finance ask ${Date.now()}` })
  try {
    await adminSetPillarModes(page, 'finance', 'Property Finance', { aggregate: true })
    await page.goto('/finance')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Property and construction finance')
    await expect(page.getByText('provided through approved, licensed partners')).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/\d+(\.\d+)?\s*%|per annum|you qualify/i)
    await page.goto(`/property/${prop.slug}`)
    await expect(page.getByRole('link', { name: 'Ask about financing' })).toHaveAttribute('href', '/request-service/mortgages')

    await page.context().clearCookies()
    await asFreshVisitor(page)
    await page.goto('/request-service/mortgages')
    await page.fill('#sr-title', 'Mortgage for a Bole apartment')
    await page.locator('label', { has: page.locator('input[name=q_amount]') }).filter({ hasText: 'ETB 1M – 5M' }).click()
    await page.locator('label', { has: page.locator('input[name=q_lives_in_ethiopia]') }).filter({ hasText: 'No' }).click()
    await page.fill('#sr-details', 'I live in London and want to buy a two-bedroom apartment.')
    await page.fill('#sr-location', 'Bole')
    await page.getByRole('option', { name: /^Bole/ }).first().click()
    await page.fill('#sr-name', 'Finance Applicant')
    await page.fill('#sr-phone', randomPhone())
    await page.fill('#sr-email', uniqueEmail('finance'))
    await tickTransferConsent(page)
    await page.getByRole('button', { name: 'Send my request' }).click()
    await page.waitForURL(/\/request-service\/sent/)
    const ref = new URL(page.url()).searchParams.get('ref') ?? ''
    const { data: req } = await db().from('service_requests').select('id, vertical_key, answers').eq('reference', ref).single()
    expect(req).toMatchObject({ vertical_key: 'finance', answers: { amount: 'ETB 1M – 5M', lives_in_ethiopia: false } })

    const { adminSession } = await import('./helpers')
    await adminSession(page)
    await page.goto(`/roodber8/service-requests/${req!.id}`)
    await expect(page.getByRole('checkbox', { name: new RegExp(`^E2E Partner Bank`) }).first()).toBeVisible()
    await db().from('service_requests').delete().eq('id', req!.id)
  } finally {
    await adminSetPillarModes(page, 'finance', 'Property Finance', { aggregate: false })
    await db().from('organisations').delete().eq('id', lender.orgId)
    await db().from('properties').delete().eq('id', prop.id)
  }
})

test('with Aggregate on, insurance lists its request categories', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSetPillarModes(page, 'insurance', 'Property Insurance', { aggregate: true })
  try {
    await page.goto('/insurance')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Property and construction insurance')
    await expect(page.getByRole('link', { name: 'Get quotes: Landlord insurance' })).toHaveAttribute('href', '/request-service/landlord-insurance')
  } finally {
    await adminSetPillarModes(page, 'insurance', 'Property Insurance', { aggregate: false })
  }
})

test('admin can add a lender, insurer or broker as a partner organisation', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const { adminSession } = await import('./helpers')
  await adminSession(page)
  await page.goto('/roodber8/organisations/new')
  const kinds = await page.locator('#org-kind option').allTextContents()
  expect(kinds).toEqual(expect.arrayContaining(['Lender', 'Insurer', 'Broker']))
})
