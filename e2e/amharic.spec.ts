import { expect, test, type Page } from '@playwright/test'
import { adminSession, db } from './helpers'

/** Amharic locale (spec 25.2m): off by default; when AB switches it on, /am serves the site with Amharic menus and hreflang. */

test.describe.configure({ mode: 'serial' })

async function setAmharic(page: Page, on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/settings')
  const panel = page.locator('form').filter({ has: page.getByLabel('Show the Amharic version') })
  const box = panel.getByLabel('Show the Amharic version')
  if (on) await box.check()
  else await box.uncheck()
  await panel.getByRole('button', { name: /Save/ }).click()
  await expect(panel.getByText(/Saved/)).toBeVisible()
}

test('Amharic is off by default: /am does not exist and nothing points to it', async ({ page, request }) => {
  const { data } = await db().from('site_settings').select('value').eq('key', 'amharic_enabled').single()
  test.skip(data?.value === true, 'switched on by another run')
  expect((await request.get('/am')).status()).toBe(404)
  expect((await request.get('/am/property')).status()).toBe(404)
  const res = await page.goto('/')
  expect(res?.headers()['link'] ?? '').not.toContain('hreflang')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('link', { name: 'አማርኛ' })).toHaveCount(0)
})

test('switched on, /am serves Amharic menus with hreflang, keeps links in Amharic, and never exposes admin', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await setAmharic(page, true)
  try {
    // The middleware re-reads the switch at most once a minute.
    await expect.poll(async () => (await request.get('/am')).status(), { timeout: 90_000, intervals: [5_000] }).toBe(200)
    const res = await page.goto('/am')
    expect(res?.headers()['content-language']).toBe('am')
    expect(res?.headers()['link']).toContain('hreflang="am"')
    await expect(page.locator('html')).toHaveAttribute('lang', 'am')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ለንብረት፣ ለግንባታ እና በዙሪያቸው ላሉ ነገሮች ሁሉ አንድ መድረክ።')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('button', { name: /ግዢ/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'English' }).first()).toHaveAttribute('href', '/')
    await expect(page.locator('footer').getByRole('link', { name: 'ግላዊነት' })).toHaveAttribute('href', '/am/privacy')
    // The English page now advertises its Amharic version and offers the switch.
    const en = await page.goto('/property')
    expect(en?.headers()['link']).toContain('<https://www.hagerland.com/am/property>; rel="alternate"; hreflang="am"')
    await expect(page.getByRole('link', { name: 'አማርኛ' }).first()).toHaveAttribute('href', '/am/property')
    await page.goto('/am/property')
    await expect(page.locator('html')).toHaveAttribute('lang', 'am')
    expect((await request.get('/am/roodber8')).status()).toBe(404)
    // Visitors cannot force the language with a header.
    const forced = await request.get('/', { headers: { 'x-hl-locale': 'am' } })
    expect(await forced.text()).toContain('<html lang="en"')
  } finally {
    await setAmharic(page, false)
  }
})
