import { expect, test } from '@playwright/test'
import { createProvider, db, seedShowcase, signIn, type Showcase } from './helpers'

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
  const paths = ['/', '/property', '/property/for-sale', '/property/for-sale/addis-ababa/bole', `/property/${s.propertySlugs[0]}`, '/supplies', '/supplies/materials-list', '/supplies/quote', `/supplies/product/${s.productSlug}`, '/professionals', '/agents', `/company/${s.orgSlug}`, '/developments', `/developments/${s.developmentSlug}`, '/our-developments', '/search?q=bole', '/about', '/how-it-works', '/list-with-us', '/contact', '/help', '/terms', '/login', '/signup?type=owner', '/no-such-page', '/developers', '/suppliers', '/contractors', '/repairs-maintenance', '/request-service', '/request-service/plumbers', '/diaspora', '/diaspora/property-care', '/agency', '/agency/sell', '/finance', '/jobs', '/supplies/special-buys', '/supplies/trade', '/supplies/building-materials', '/guides', '/property/map', '/property/compare', '/privacy', '/dev/styleguide']
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

test('account pages do not scroll sideways on phones or tablets', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'widths are set explicitly; run once')
  test.setTimeout(300_000)
  const biz = await createProvider({ name: `E2E Width Supplier ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'supplier' }).eq('id', biz.orgId)
  const problems: string[] = []
  try {
    for (const width of [360, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      await signIn(page, biz.user.email, biz.user.password)
      for (const path of ['/account', '/account/listings/new', '/account/company', '/account/company/team', '/account/products/new', '/account/requests', '/account/settings', '/account/alerts']) {
        await page.goto(path)
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        if (over > 0) problems.push(`${width}px ${path}: ${over}px`)
      }
      await page.close()
    }
  } finally {
    await db().from('organisations').delete().eq('id', biz.orgId)
  }
  expect(problems).toEqual([])
})
