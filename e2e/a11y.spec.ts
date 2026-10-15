import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adminSession, createProvider, db, seedShowcase, signIn, type Showcase } from './helpers'

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
  '/agency',
  '/agency/let',
  '/property/compare',
  '/property/map',
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
  '/privacy',
  '/cookies',
  '/suppliers',
  '/developers',
  '/agency/sell',
  '/supplies/special-buys',
  '/supplies/trade',
  '/supplies/quote',
  '/supplies/building-materials',
  '/property/for-sale/addis-ababa/bole/apartments',
  '/professionals/architects',
  '/guides',
  '/dev/styleguide',
  '/auth/reset-password',
  '/alerts/unsubscribe?token=not-a-real-token',
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
  test.setTimeout(420_000)
  await adminSession(page)
  await checkAll(page, [
    '/roodber8', '/roodber8/review', '/roodber8/review?tab=products', '/roodber8/review?tab=jobs', '/roodber8/review?tab=updates', '/roodber8/verticals', '/roodber8/properties', '/roodber8/developments', '/roodber8/organisations',
    '/roodber8/products', '/roodber8/products/new', '/roodber8/trade-accounts', '/roodber8/categories', '/roodber8/locations', '/roodber8/exchange-rates', '/roodber8/enquiries', '/roodber8/quotes',
    '/roodber8/service-requests', '/roodber8/request-questions', '/roodber8/deals', '/roodber8/property-care', '/roodber8/managed-properties/new', '/roodber8/sales', '/roodber8/jobs', '/roodber8/interest', '/roodber8/partners',
    '/roodber8/users', '/roodber8/guides', '/roodber8/guides/new', '/roodber8/build-costs', '/roodber8/promotions', '/roodber8/import', '/roodber8/reports', '/roodber8/settings', '/roodber8/email-problems', '/roodber8/audit',
  ])
})

test('account pages have no serious accessibility problems', async ({ page }) => {
  test.setTimeout(300_000)
  const biz = await createProvider({ name: `E2E A11y Supplier ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'supplier' }).eq('id', biz.orgId)
  try {
    await signIn(page, biz.user.email, biz.user.password)
    await checkAll(page, [
      '/account', '/account/listings', '/account/listings/new', '/account/company', '/account/company/team', '/account/company/branches', '/account/company/portfolio', '/account/products',
      '/account/products/new', '/account/enquiries', '/account/requests', '/account/service-requests', '/account/quotes', '/account/saved', '/account/alerts', '/account/settings',
      '/account/jobs', '/account/candidate', '/account/applications', '/onboarding',
    ])
  } finally {
    await db().from('organisations').delete().eq('id', biz.orgId)
  }
})
