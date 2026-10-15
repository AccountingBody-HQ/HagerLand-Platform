import { expect, test } from '@playwright/test'
import { adminSession, asFreshVisitor, db, latestMail, setPillarModes, uniqueEmail } from './helpers'

/** Vertical registry, navigation, coming-soon pages and interest capture (spec 24.1–24.3). */

test.describe('pillar navigation (spec 26.4)', () => {
  test('header shows at most seven menus in lifecycle order, More holds the rest, plus All services and Living abroad', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop header')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main', exact: true })
    await expect(nav.locator(':scope > ul > li')).toHaveText([/^Buy/, /^Rent/, /^Build/, /^Maintain/, /^Manage/, /^Supplies/, /^More/])
    await nav.getByRole('button', { name: /^More/ }).click()
    const panel = page.locator('#mega-panel')
    await expect(panel.getByRole('link', { name: /Property Finance.*Soon/ })).toBeVisible()
    await expect(panel.getByRole('link', { name: /Property Insurance.*Soon/ })).toBeVisible()
    await expect(panel.getByRole('link', { name: /Advice & guides/ })).toBeVisible()
    await expect(panel.getByRole('link', { name: /Jobs, Recruitment & Staffing/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Living abroad?' })).toHaveAttribute('href', '/diaspora')
    await page.getByRole('button', { name: 'All services' }).click()
    const all = page.locator('#all-services-panel')
    await expect(all.getByRole('link')).toHaveCount(12)
    for (const group of ['Buy, sell and rent', 'Build and improve', 'Own and manage', 'Supplies and jobs']) await expect(all.getByText(group, { exact: true })).toBeVisible()
    await expect(all.getByRole('link', { name: /Buy & Sell Property.*estate agents/ })).toBeVisible()
    await expect(all.getByRole('link', { name: /Property Finance.*Soon/ })).toBeVisible()
    await expect(all).not.toContainText(/Provided by HagerLand|Trusted partners/)
    await expect(all.getByRole('link', { name: /Living abroad/ })).toBeVisible()
    await expect(all.getByRole('link', { name: /Find a professional/ })).toBeVisible()
    await page.getByRole('button', { name: 'List with us' }).click()
    await expect(page.locator('#list-with-us-menu').getByRole('link')).toHaveText([/Sell or let a property/, /List your business/, /Become a supplier/, /Join as a professional/, /^Post a job$/])
  })

  test('mobile drawer lists every service, Living abroad and Find a professional, plus the shortcuts', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile drawer')
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const drawer = page.getByRole('navigation', { name: 'Mobile', exact: true })
    for (const name of ['Buy & Sell Property', 'Rent & Let Property', 'Build & Develop Property', 'Repair & Maintain Property', 'Manage Property', 'Property Finance', 'Property Insurance', 'Knowledge & Advice', 'Building & Construction Supplies', 'Jobs, Recruitment & Staffing', 'Living abroad', 'Find a professional']) {
      await expect(drawer.getByRole('link', { name: new RegExp(`^${name.replace(/[&,]/g, '\\$&')}`) }).or(drawer.locator('summary').filter({ hasText: name })).first()).toBeVisible()
    }
    await expect(drawer.getByRole('link', { name: 'Living abroad?' })).toBeVisible()
    for (const name of ['Request a service', 'Request a quote', 'Find a professional', 'Help & advice', 'My account']) await expect(drawer.getByRole('link', { name })).toBeVisible()
  })

  test('homepage keeps the hero and search, then the ten services in four customer groups, Living abroad and Professionals', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('One platform for property, construction and everything around it.')
    await expect(page.getByText('Buy, rent, build and manage property in Ethiopia, with verified partners, wherever you live.').first()).toBeVisible()
    const services = page.locator('section[aria-labelledby="services-title"]')
    await expect(services.getByRole('heading', { level: 2, name: 'Everything your property needs' })).toBeVisible()
    for (const group of ['Buy, sell and rent', 'Build and improve', 'Own and manage', 'Supplies and jobs']) await expect(services.getByRole('heading', { level: 3, name: group })).toBeVisible()
    await expect(services.getByRole('listitem')).toHaveCount(10)
    await expect(services.getByRole('link', { name: /Building & Construction Supplies.*Get a quote/ })).toHaveAttribute('href', '/supplies')
    await expect(services.getByRole('link', { name: /Property Finance.*Register interest/ })).toHaveAttribute('href', '/finance#register')
    await expect(services.getByText('Coming soon').filter({ visible: true })).toHaveCount(2)
    await expect(services.getByRole('heading', { name: /^Living abroad\? We act as your hands on the ground/ })).toBeVisible()
    await expect(services.getByRole('heading', { name: /^Are you a professional or supplier\?/ })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/ecosystem|pillar|nucleus|Provided by HagerLand|Trusted partners/i)
    await expect(page.locator('footer')).toContainText('One platform for property, construction and everything around it.')
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
    await page.goto('/insurance')
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

test.describe('admin switches (pillar-controlled areas follow the pillar modes)', () => {
  test.describe.configure({ mode: 'serial' })
  test.afterAll(async () => {
    await setPillarModes('insurance', { direct: false, aggregate: false, interest: true })
    await setPillarModes('buy', { direct: true, aggregate: true, interest: false })
    await setPillarModes('rent', { direct: true, aggregate: true, interest: false })
  })

  async function switchInterest(page: import('@playwright/test').Page, name: string, on: boolean) {
    await adminSession(page)
    await page.goto('/roodber8/pillars')
    const sw = page.getByRole('switch', { name: `Interest capture for ${name}` })
    if ((await sw.getAttribute('aria-checked')) !== String(on)) {
      await sw.click()
      await expect(page.getByText(`Interest capture is now ${on ? 'on' : 'off'} for ${name}.`)).toBeVisible()
    }
  }

  test('switching every mode off hides a pillar: menus drop it and its page returns 404; the switch is audit-logged', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    await switchInterest(page, 'Property Insurance', false)
    expect((await page.goto('/insurance'))?.status()).toBe(404)
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('button', { name: /^More/ }).click()
    await expect(page.locator('#mega-panel').getByRole('link', { name: /Insurance/ })).toHaveCount(0)
    const { data } = await db().from('audit_log').select('action, entity_label').eq('action', 'pillar.mode.off').order('created_at', { ascending: false }).limit(1).single()
    expect(data).toMatchObject({ action: 'pillar.mode.off', entity_label: 'Property Insurance' })
    await switchInterest(page, 'Property Insurance', true)
    expect((await page.goto('/insurance'))?.status()).toBe(200)
  })

  test('Buy and Rent with only Interest on make Property a coming-soon area', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    await setPillarModes('buy', { direct: false, aggregate: false, interest: false })
    await setPillarModes('rent', { direct: false, aggregate: false, interest: false })
    await switchInterest(page, 'Buy & Sell Property', true)
    await page.goto('/property/for-sale')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ethiopia’s property marketplace is on its way')
    const suggest = (await (await page.request.get('/api/search/suggest?q=bole')).json()) as { groups: { id: string; items: unknown[] }[] }
    for (const id of ['locations', 'properties', 'developments']) expect(suggest.groups.find((g) => g.id === id)?.items ?? []).toHaveLength(0)
    await setPillarModes('buy', { direct: true, aggregate: true })
    await setPillarModes('rent', { direct: true, aggregate: true })
    await switchInterest(page, 'Buy & Sell Property', false)
    await page.goto('/property/for-sale')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Ethiopia’s property marketplace is on its way')
  })
})
