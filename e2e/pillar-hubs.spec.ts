import { expect, test } from '@playwright/test'
import { adminSession, db, setPillarModes } from './helpers'

/** Pillar hubs, visibility rules and deep-page links back to hubs (spec 26.2–26.4, 26.11, 26.16). */

test.describe.configure({ mode: 'serial' })

const HUBS: [string, string][] = [
  ['/buy', 'Buy & Sell Property'],
  ['/rent', 'Rent & Let Property'],
  ['/build', 'Build & Develop Property'],
  ['/maintain', 'Repair & Maintain Property'],
  ['/manage', 'Manage Property'],
  ['/advice', 'Knowledge & Advice'],
]

test('each service page shows what it does, an abroad panel and next steps, in customer language', async ({ page }) => {
  for (const [path, name] of HUBS) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
    await expect(page.locator('section.hl-blueprint .hl-eyebrow').first()).toHaveText(name)
    await expect(page.locator('h2[id^="abroad-"]')).toHaveText(/\?$/)
    await expect(page.locator('h2[id^="abroad-"]')).not.toContainText('From abroad?')
    await expect(page.getByRole('heading', { name: 'Your next steps' })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/Pillar \d|Provided by HagerLand|Trusted partners/)
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`${path}$`))
  }
  await page.goto('/buy')
  await expect(page.getByText('By HagerLand', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What we do for you' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Sell with HagerLand/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Property Finance.*Register interest/ })).toHaveAttribute('href', '/finance#register')
})

test('Knowledge & Advice links only to pages that have content; empty guide pages point to help and the team', async ({ page }) => {
  const { count } = await db().from('guides').select('id', { count: 'exact', head: true }).eq('status', 'published')
  test.skip((count ?? 0) > 0, 'a guide was published by an earlier run')
  await page.goto('/advice')
  await expect(page.locator('main').getByRole('link', { name: /Read the guides|^Guides|Process checklists|Glossary/ })).toHaveCount(0)
  await expect(page.locator('main').getByRole('link', { name: /Help & FAQs/ }).first()).toBeVisible()
  await page.goto('/advice/checklists')
  await expect(page.locator('main').getByRole('link', { name: 'Help & FAQs' })).toHaveAttribute('href', '/help')
  await expect(page.locator('main').getByRole('link', { name: 'Ask our team' })).toHaveAttribute('href', '/contact')
})

test('existing pages that act as hubs gain the abroad panel and next steps', async ({ page }) => {
  for (const path of ['/supplies', '/finance', '/insurance', '/jobs']) {
    await page.goto(path)
    await expect(page.locator('h2[id^="abroad-"]'), path).toBeVisible()
  }
  await page.goto('/jobs')
  await expect(page.getByRole('heading', { name: 'Recruitment and placement by HagerLand' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Candidate and employer registers' })).toBeVisible()
})

test('deeper pages link back to their pillar hub', async ({ page }) => {
  await page.goto('/property/to-rent')
  await expect(page.getByRole('navigation', { name: 'Part of' }).getByRole('link')).toHaveAttribute('href', '/rent')
  await page.goto('/repairs-maintenance')
  await expect(page.getByRole('navigation', { name: 'Part of' }).getByRole('link')).toHaveText(/Repair & Maintain Property/)
  await page.goto('/buy')
  await expect(page.getByRole('navigation', { name: 'Part of' })).toHaveCount(0)
})

test('visibility: interest only is coming soon and noindex; all modes off is hidden everywhere', async ({ page }) => {
  await adminSession(page)
  try {
    await setPillarModes('advice', { direct: false, interest: true })
    await page.goto('/roodber8/pillars')
    // An admin change refreshes the site at once; switch Interest through the screen to purge caches.
    await page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' }).click()
    await page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' }).click()
    await expect(page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' })).toHaveAttribute('aria-checked', 'true')
    await page.goto('/advice')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.getByRole('heading', { name: 'Knowledge & Advice is coming soon' })).toBeVisible()
    await expect(page.locator('#register form')).toBeVisible()
    await page.goto('/roodber8/pillars')
    await page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' }).click()
    await expect(page.getByText('Interest capture is now off for Knowledge & Advice.')).toBeVisible()
    expect((await page.goto('/advice'))?.status()).toBe(404)
    const sitemap = await (await page.request.get('/sitemap/static.xml')).text()
    expect(sitemap).not.toContain('/advice<')
    expect(sitemap).toContain('/buy<')
    await page.goto('/')
    await expect(page.locator('section[aria-labelledby="services-title"]').getByText('Knowledge & Advice')).toHaveCount(0)
  } finally {
    await setPillarModes('advice', { direct: true, interest: false })
    await page.goto('/roodber8/pillars')
    const sw = page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' })
    await sw.click()
    await expect(page.getByText('Interest capture is now on for Knowledge & Advice.')).toBeVisible()
    await page.reload()
    await sw.click()
    await expect(page.getByText('Interest capture is now off for Knowledge & Advice.')).toBeVisible()
  }
  const { data } = await db().from('pillars').select('direct_enabled, interest_enabled').eq('key', 'advice').single()
  expect(data).toEqual({ direct_enabled: true, interest_enabled: false })
})
