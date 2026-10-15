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

test('each new hub shows what it does, its modes, a From abroad panel and next steps', async ({ page }) => {
  for (const [path, name] of HUBS) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
    await expect(page.getByText(new RegExp(`Pillar \\d+ · ${name.replace(/&/g, '&')}`, 'i'))).toBeVisible()
    await expect(page.getByRole('list', { name: 'How this is provided' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^From abroad\?/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Your next steps' })).toBeVisible()
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`${path}$`))
  }
  await page.goto('/buy')
  await expect(page.getByRole('list', { name: 'How this is provided' }).first()).toHaveText(/Provided by HagerLand\s*Trusted partners/)
  await expect(page.getByRole('heading', { name: 'What HagerLand does for you' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Sell with HagerLand/ }).first()).toBeVisible()
})

test('existing pages that act as hubs gain the abroad panel and next steps', async ({ page }) => {
  for (const path of ['/supplies', '/finance', '/insurance', '/jobs']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: /^From abroad\?/ }), path).toBeVisible()
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
    await expect(page.locator('section[aria-labelledby="ecosystem-title"]').getByText('Knowledge & Advice')).toHaveCount(0)
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
