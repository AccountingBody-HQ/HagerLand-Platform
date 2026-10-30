import { expect, test } from '@playwright/test'

/** QC-2b wording tidy: the approved texts show, at 375 px, with no sideways scrolling (local copy only). */

test('market appraisal and delivery in Addis Ababa show on phones without sideways scrolling', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'width is set explicitly; run once')
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  const checks: [string, string][] = [
    ['/agency', 'Book a market appraisal'],
    ['/agency/sell', 'Book a market appraisal first'],
    ['/', 'Get one clear price, including delivery in Addis Ababa'],
    ['/supplies', 'We check prices and availability and send you one quote, including VAT and delivery in Addis Ababa.'],
  ]
  for (const [path, text] of checks) {
    await page.goto(path)
    await expect(page.getByText(text, { exact: false }).first(), path).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0)
  }
  await page.goto('/diaspora/property-care')
  await page.locator('summary', { hasText: 'Can you help if I decide to sell?' }).click()
  await expect(page.getByText('from market appraisal and marketing to viewings.')).toBeVisible()
  await page.goto('/supplies')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /one clear price with delivery in Addis Ababa\.$/)
  await page.goto('/agency')
  await expect(page.getByText('Book a valuation')).toHaveCount(0)
  await page.close()
})
