import { expect, test } from '@playwright/test'
import { adminSession, db } from './helpers'

/** Section 26 content, legal and structured data (spec 26.1, 26.11, 26.16). */

test('terms carry the estate agency terms of business; privacy covers agency, reviews and staff access', async ({ page }) => {
  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: /\d+\. HagerLand estate agency: terms of business/ })).toBeVisible()
  await expect(page.getByText('is an expression of interest only').first()).toBeVisible()
  await expect(page.getByText('A tenancy starts only when a written tenancy agreement is signed').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /\d+\. Reviews/ })).toBeVisible()
  await page.goto('/privacy')
  for (const t of ['Estate agency:', 'Tenancies and managed properties:', 'Reviews:', 'Newsletter:', 'two-factor sign-in']) await expect(page.getByText(t).first()).toBeVisible()
})

test('the diaspora hub is organised by the three segments, then services abroad', async ({ page }) => {
  await page.goto('/diaspora')
  for (const h of ['International buyers and investors', 'Overseas tenants and landlords', 'Remote management and support']) await expect(page.getByRole('heading', { name: h })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ethiopian-run trades and professionals near you' })).toBeVisible()
})

test('the contact form shows the visitor’s time zone and asks for good times to call', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByLabel('Your time zone')).not.toHaveValue('')
  await expect(page.getByLabel('Best times to call you')).toBeVisible()
})

test('licences: the agency page carries RealEstateAgent data with the licence, the terms and the agency page show it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const { data: before } = await db().from('site_settings').select('value').eq('key', 'licences').single()
  await adminSession(page)
  try {
    await page.goto('/roodber8/settings')
    await page.getByLabel('Estate agency: licence or approval number').fill('EA-TEST-77')
    await page.getByLabel('Issuing authority').first().fill('Ministry of Trade')
    await page.getByLabel('Recruitment and placement: licence or approval number').fill('RP-TEST-5')
    await page.locator('form').filter({ has: page.getByLabel('Estate agency: licence or approval number') }).getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved. The website updates within a minute.').first()).toBeVisible()
    await expect(page.getByText('Not configured').first()).toBeVisible()
    await page.goto('/agency')
    await expect(page.getByTestId('licence-estate_agency')).toContainText('EA-TEST-77')
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('')
    expect(ld).toContain('"RealEstateAgent"')
    expect(ld).toContain('"identifier":"EA-TEST-77"')
    await page.goto('/terms')
    await expect(page.locator('main').getByText(/Estate agency licence EA-TEST-77/)).toBeVisible()
    await expect(page.getByText(/Recruitment and placement licence RP-TEST-5/)).toBeVisible()
  } finally {
    await db().from('site_settings').update({ value: before!.value }).eq('key', 'licences')
    await page.goto('/roodber8/settings')
    await page.locator('form').filter({ has: page.getByLabel('Estate agency: licence or approval number') }).getByRole('button', { name: 'Save' }).click()
  }
})
