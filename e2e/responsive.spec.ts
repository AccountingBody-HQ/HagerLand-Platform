import { expect, test } from '@playwright/test'
import { seedShowcase, type Showcase } from './helpers'

/** Spec 22: every template at 360/390/768/1024/1440 px, with no sideways scrolling. */
let s: Showcase
test.beforeAll(async () => {
  s = await seedShowcase()
})
test.afterAll(async () => {
  await s?.cleanup()
})

test('no page scrolls sideways at any common width', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'widths are set explicitly; run once')
  test.setTimeout(300_000)
  const paths = ['/', '/property', '/property/for-sale', '/property/for-sale/addis-ababa/bole', `/property/${s.propertySlugs[0]}`, '/supplies', '/supplies/materials-list', '/supplies/quote', `/supplies/product/${s.productSlug}`, '/professionals', '/agents', `/company/${s.orgSlug}`, '/developments', `/developments/${s.developmentSlug}`, '/our-developments', '/search?q=bole', '/about', '/how-it-works', '/list-with-us', '/contact', '/help', '/terms', '/login', '/signup?type=owner', '/no-such-page']
  const problems: string[] = []
  for (const width of [360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    for (const path of paths) {
      await page.goto(path)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (over > 0) problems.push(`${width}px ${path}: ${over}px`)
    }
    await page.close()
  }
  expect(problems).toEqual([])
})
