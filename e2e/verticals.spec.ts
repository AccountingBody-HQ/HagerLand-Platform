import { expect, test } from '@playwright/test'
import { adminSession, adminSwitchVertical as adminSwitch, asFreshVisitor, db, latestMail, setVerticalStatus as setStatus, uniqueEmail } from './helpers'

/** Vertical registry, navigation, coming-soon pages and interest capture (spec 24.1–24.3). */

test.describe('registry navigation', () => {
  test('header shows the six menus in order with Soon badges, and List with us items', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop header')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main', exact: true })
    await expect(nav.locator(':scope > ul > li')).toHaveText([/^Property/, /^Building Supplies/, /^Professionals & Contractors/, /^Repairs & Maintenance/, /^Diaspora Services/, /^More/])
    await nav.getByRole('button', { name: /^More/ }).click()
    const panel = page.locator('#mega-panel')
    for (const name of ['Finance', 'Insurance', 'Jobs & Recruitment', 'Our Developments']) {
      await expect(panel.getByRole('link', { name: new RegExp(`${name}.*Soon`) })).toBeVisible()
    }
    await page.getByRole('button', { name: 'List with us' }).click()
    await expect(page.locator('#list-with-us-menu').getByRole('link')).toHaveText([/Sell or let a property/, /List your business/, /Become a supplier/, /Join as a professional/, /Post a job.*Soon/])
  })

  test('mobile drawer lists all ten verticals and the service shortcuts', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile drawer')
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const drawer = page.getByRole('navigation', { name: 'Mobile', exact: true })
    for (const name of ['Property', 'Building Supplies', 'Find Professionals', 'Construction & Contractors', 'Repairs & Maintenance', 'Finance', 'Insurance', 'Diaspora Services', 'Jobs & Recruitment', 'Our Developments']) {
      await expect(drawer.getByText(new RegExp(`^${name.replace(/[&]/g, '\\$&')}`)).first()).toBeVisible()
    }
    for (const name of ['Request a service', 'Request a quote', 'Help & advice', 'My account']) await expect(drawer.getByRole('link', { name })).toBeVisible()
  })

  test('homepage shows the positioning lines, ten ecosystem tiles and the journey strip', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('One platform for property, construction and everything around it.')
    await expect(page.getByText('Find it. Buy it. Finance it. Build it. Supply it. Insure it. Maintain it. Sell it. Rent it.').first()).toBeVisible()
    await expect(page.getByText('For Ethiopians in Ethiopia and around the world.').first()).toBeVisible()
    const eco = page.locator('section[aria-labelledby="ecosystem-title"]')
    await expect(eco.locator('ul').first().locator(':scope > li')).toHaveCount(10)
    await expect(eco.locator('ul').first().getByText('Soon')).toHaveCount(4)
    for (const step of ['Find land', 'Finance', 'Design', 'Build', 'Supply', 'Insure', 'Maintain', 'Sell or rent']) await expect(eco.getByRole('listitem').filter({ hasText: new RegExp(`^${step}`) }).first()).toBeVisible()
    await expect(page.locator('footer')).toContainText('One platform for property, construction and everything around it.')
    // Our Developments is coming soon: the homepage invites interest and claims no current projects.
    await expect(page.getByRole('heading', { name: 'Hear first when we announce a project' })).toBeVisible()
    await expect(page.getByText('We are not building or selling any development yet').first()).toBeVisible()
  })
})

test.describe('coming-soon pages', () => {
  test('finance is a labelled coming-soon page, never indexed, with no rates or providers', async ({ page }) => {
    const res = await page.goto('/finance')
    expect(res?.status()).toBe(200)
    expect(res?.headers()['x-robots-tag']).toContain('noindex')
    await expect(page.getByText('Coming soon').first()).toBeVisible()
    await expect(page.getByText('provided through approved, licensed partners')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.locator('main')).not.toContainText(/%|interest rate|APR/i)
    const sitemap = await (await page.request.get('/sitemap/static.xml')).text()
    expect(sitemap).not.toContain('/finance<')
    expect(sitemap).toContain('/property<')
  })

  test('register interest is stored, emailed and listed in admin with CSV export', async ({ page }) => {
    await asFreshVisitor(page)
    const email = uniqueEmail('interest')
    await page.goto('/insurance')
    const form = page.locator('#register')
    await form.getByLabel('What would you like to insure?').selectOption({ label: 'Landlord insurance' })
    await form.getByLabel('Your name').fill('Selam Interest')
    await form.getByLabel('Email').fill(email)
    await form.getByLabel('Country you live in').selectOption('GB')
    await form.getByLabel('City').fill('London')
    await form.getByRole('button', { name: 'Register my interest' }).click()
    await expect(page.getByText('Thanks, your interest is registered')).toBeVisible()
    const { data } = await db().from('interest_registrations').select('reference, category, country_code, currency, vertical_key').eq('email', email).single()
    expect(data).toMatchObject({ category: 'Landlord insurance', country_code: 'GB', currency: 'GBP', vertical_key: 'insurance' })
    const mail = await latestMail(email)
    expect(mail.subject).toContain(data!.reference)
    expect(mail.text).toContain('Insurance')

    await adminSession(page)
    await page.goto('/roodber8/interest?vertical=insurance')
    await expect(page.getByText(email)).toBeVisible()
    const csv = await (await page.request.get('/roodber8/export/interest?vertical=insurance')).text()
    expect(csv).toContain(email)
  })

  test('validation errors keep what was typed', async ({ page }) => {
    await page.goto('/jobs')
    const form = page.locator('#register')
    await form.getByLabel('Your name').fill('Abebe')
    await form.getByLabel('Email').fill('not-an-email')
    await form.getByRole('button', { name: 'Register my interest' }).click()
    await expect(form.getByText('Enter a valid email address')).toBeVisible()
    await expect(form.getByLabel('Your name')).toHaveValue('Abebe')
  })

  test('become a partner is stored and listed in admin', async ({ page }) => {
    await asFreshVisitor(page)
    const email = uniqueEmail('partner')
    await page.goto('/finance')
    const form = page.locator('#partner')
    await form.getByRole('textbox', { name: /^Organisation/ }).fill('E2E Test Bank')
    await form.getByLabel('Type of organisation').selectOption('bank')
    await form.getByLabel('Your name').fill('Partner Person')
    await form.getByLabel('Work email').fill(email)
    await form.getByRole('button', { name: 'Apply to partner' }).click()
    await expect(page.getByText('Thanks, we have your application')).toBeVisible()
    await adminSession(page)
    await page.goto('/roodber8/partners')
    await expect(page.getByText('E2E Test Bank').first()).toBeVisible()
  })
})

test.describe('admin switches', () => {
  test.describe.configure({ mode: 'serial' })
  test.afterAll(async () => {
    await setStatus('insurance', 'coming_soon')
    await setStatus('property', 'live')
  })

  test('hiding a vertical removes it from menus and its page returns 404; the switch is audit-logged', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    await adminSwitch(page, 'Insurance', 'Hidden')
    const res = await page.goto('/insurance')
    expect(res?.status()).toBe(404)
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('button', { name: /^More/ }).click()
    await expect(page.locator('#mega-panel').getByRole('link', { name: /Insurance/ })).toHaveCount(0)
    const { data } = await db().from('audit_log').select('action, entity_label').eq('action', 'vertical.status').order('created_at', { ascending: false }).limit(1).single()
    expect(data).toMatchObject({ action: 'vertical.status', entity_label: 'Insurance' })
    await adminSwitch(page, 'Insurance', 'Coming soon')
    expect((await page.goto('/insurance'))?.status()).toBe(200)
  })

  test('a live vertical switched to coming soon shows its coming-soon page instead', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    await adminSwitch(page, 'Property', 'Coming soon')
    await page.goto('/property/for-sale')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ethiopia’s property marketplace is on its way')
    const suggest = (await (await page.request.get('/api/search/suggest?q=bole')).json()) as { groups: { id: string; items: unknown[] }[] }
    for (const id of ['locations', 'properties', 'developments']) expect(suggest.groups.find((g) => g.id === id)?.items ?? []).toHaveLength(0)
    await adminSwitch(page, 'Property', 'Live')
    await page.goto('/property/for-sale')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Ethiopia’s property marketplace is on its way')
  })
})
