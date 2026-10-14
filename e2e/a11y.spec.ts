import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adminSession, seedShowcase, type Showcase } from './helpers'

/** WCAG 2.2 AA (spec 19.3): zero serious or critical axe violations on key pages. */
let s: Showcase

test.beforeAll(async () => {
  s = await seedShowcase()
})
test.afterAll(async () => {
  await s?.cleanup()
})

async function problems(page: import('@playwright/test').Page, path: string): Promise<string[]> {
  await page.goto(path)
  await page.waitForLoadState('load')
  await page.waitForTimeout(300)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  return bad.map((v) => `${path} → ${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
}

async function checkAll(page: import('@playwright/test').Page, paths: string[]) {
  const all: string[] = []
  for (const path of paths) all.push(...(await problems(page, path)))
  expect(all).toEqual([])
}

const PUBLIC = (x: Showcase) => [
  '/',
  '/property',
  '/property/for-sale',
  '/property/to-rent',
  '/property/for-sale/addis-ababa/bole',
  `/property/${x.propertySlugs[0]}`,
  '/supplies',
  '/supplies/materials-list',
  `/supplies/product/${x.productSlug}`,
  '/professionals',
  '/agents',
  `/company/${x.orgSlug}`,
  '/developments',
  `/developments/${x.developmentSlug}`,
  '/our-developments',
  '/finance',
  '/insurance',
  '/jobs',
  '/advertise',
  '/request-service',
  '/repairs-maintenance',
  '/diaspora',
  '/diaspora/property-care',
  '/diaspora/services-abroad?country=GB',
  '/contractors',
  '/request-service/house-builders',
  '/request-service/plumbers',
  '/requests/resend',
  '/search?q=bole',
  '/about',
  '/how-it-works',
  '/list-with-us',
  '/contact',
  '/help',
  '/terms',
  '/login',
  '/signup',
  '/signup?type=owner',
  '/this-page-does-not-exist',
]

test('public pages have no serious accessibility problems', async ({ page }) => {
  test.setTimeout(240_000)
  await checkAll(page, PUBLIC(s))
})

test('admin pages have no serious accessibility problems', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin is checked at desktop width')
  test.setTimeout(180_000)
  await adminSession(page)
  await checkAll(page, ['/roodber8', '/roodber8/review', '/roodber8/properties', '/roodber8/products/new', '/roodber8/quotes', '/roodber8/settings', '/roodber8/import', '/roodber8/reports', '/roodber8/locations', '/roodber8/verticals', '/roodber8/interest', '/roodber8/partners', '/roodber8/exchange-rates', '/roodber8/service-requests', '/roodber8/request-questions', '/roodber8/deals', '/roodber8/property-care', '/roodber8/managed-properties/new'])
})
