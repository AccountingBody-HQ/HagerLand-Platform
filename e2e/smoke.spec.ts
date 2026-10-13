import { expect, test } from '@playwright/test'
import { trackErrors } from './helpers'

const PUBLIC_ROUTES = [
  '/',
  '/property',
  '/property/for-sale',
  '/property/to-rent',
  '/property/for-sale/addis-ababa/bole',
  '/supplies',
  '/supplies/building-materials',
  '/supplies/building-materials/cement-concrete',
  '/supplies/quote',
  '/supplies/materials-list',
  '/professionals',
  '/professionals/architects',
  '/professionals/plumbers/addis-ababa',
  '/suppliers',
  '/agents',
  '/developers',
  '/developments',
  '/our-developments',
  '/search?q=bole',
  '/login',
  '/signup',
  '/auth/reset-password',
]

for (const route of PUBLIC_ROUTES) {
  test(`loads ${route}`, async ({ page }) => {
    const errors = trackErrors(page)
    const res = await page.goto(route)
    expect(res?.status(), `status for ${route}`).toBe(200)
    await expect(page.locator('h1').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0)
    expect(errors, 'no console errors').toEqual([])
  })
}

test('unknown pages return a branded 404', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: "We couldn't find that page" })).toBeVisible()
})
