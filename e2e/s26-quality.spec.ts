import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adminSession, createUser, db, seedPublishedProperty, signIn } from './helpers'

/**
 * Section 26 pages: zero serious or critical axe problems (WCAG 2.2 AA) and no sideways scrolling at phone, tablet
 * and desktop widths. Each work package adds its new public, account and admin pages here.
 */
export const S26_PUBLIC = ['/buy', '/rent', '/build', '/maintain', '/manage', '/advice', '/agency', '/agency/valuation', '/agency/landlords', '/agency/tenants', '/diaspora/property-care', '/build/project', '/advice/market-insight', '/advice/checklists', '/advice/glossary']
export const S26_ADMIN = ['/roodber8/pillars', '/roodber8/agency', '/roodber8/agency/contacts', '/roodber8/agency/instructions', '/roodber8/agency/valuations', '/roodber8/agency/viewings', '/roodber8/agency/offers', '/roodber8/agency/applications', '/roodber8/agency/tenancies', '/roodber8/agency/settings', '/roodber8/projects', '/roodber8/area-guides', '/roodber8/newsletter']

async function axeProblems(page: Page, path: string): Promise<string[]> {
  await page.goto(path)
  await page.waitForLoadState('load')
  await page.waitForTimeout(300)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${path} → ${v.id}: ${v.help} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
}

test('Section 26 public pages: accessibility', async ({ page }) => {
  test.setTimeout(240_000)
  const all: string[] = []
  for (const p of S26_PUBLIC) all.push(...(await axeProblems(page, p)))
  expect(all).toEqual([])
})

test('Section 26 admin pages: accessibility', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await adminSession(page)
  const all: string[] = []
  for (const p of S26_ADMIN) all.push(...(await axeProblems(page, p)))
  expect(all).toEqual([])
})

test('Section 26 public pages: no sideways scrolling from 360 to 1440 px', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs its own widths')
  test.setTimeout(300_000)
  const problems: string[] = []
  for (const width of [360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    for (const path of S26_PUBLIC) {
      await page.goto(path)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (over > 0) problems.push(`${path} @ ${width}px: ${over}px too wide`)
    }
    await page.close()
  }
  expect(problems).toEqual([])
})

test('Section 26 listing, account and record pages: accessibility', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one width is enough for record pages; widths are checked above')
  test.setTimeout(300_000)
  const sale = await seedPublishedProperty({ title: `E2E a11y sale ${Date.now()}` })
  const rent = await seedPublishedProperty({ purpose: 'rent', title: `E2E a11y rent ${Date.now()}`, price: 25_000 })
  const { data: ins } = await db().from('agency_instructions').insert({ purpose: 'sale', title: 'E2E a11y instruction', stage: 'live', fee_type: 'fixed', fee_amount_etb: 50_000, agency_type: 'multi', term_start: '2026-10-01', property_id: sale.id }).select('id').single()
  const { data: c } = await db().from('agency_contacts').insert({ name: 'E2E a11y contact', email: 'a11y@test.hagerland.invalid', roles: ['buyer'] }).select('id').single()
  const user = await createUser()
  const all: string[] = []
  for (const p of [`/property/${sale.slug}`, `/property/${sale.slug}/viewing`, `/property/${sale.slug}/offer`, `/property/${rent.slug}/apply`]) all.push(...(await axeProblems(page, p)))
  await adminSession(page)
  for (const p of [`/roodber8/agency/instructions/${ins!.id}`, `/roodber8/agency/contacts/${c!.id}`]) all.push(...(await axeProblems(page, p)))
  await signIn(page, user.email, user.password)
  all.push(...(await axeProblems(page, '/account/agency')))
  all.push(...(await axeProblems(page, '/owner')))
  all.push(...(await axeProblems(page, '/build/project')))
  all.push(...(await axeProblems(page, '/account/projects')))
  const { data: mp } = await db().from('managed_properties').insert({ owner_name: 'A11y owner', title: 'E2E a11y managed', status: 'active', owner_user_id: user.id }).select('id').single()
  all.push(...(await axeProblems(page, `/owner/${mp!.id}`)))
  await adminSession(page)
  all.push(...(await axeProblems(page, `/roodber8/managed-properties/${mp!.id}`)))
  expect(all).toEqual([])
})
