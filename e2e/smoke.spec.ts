import { expect, test } from '@playwright/test'
import { trackErrors } from './helpers'
import { PUBLIC_ROUTES } from './public-routes'


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
