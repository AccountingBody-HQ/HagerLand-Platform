import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { adminSession, assertLocalStack, db, seedPublishedProperty } from './helpers'

/**
 * F-8: the house logo E1 on the local copy. Every icon file answers with the right type and size, the homepage links
 * them, the share images render, and the header, footer and admin show the new mark with the layout unchanged.
 * Screenshots for AB go to reports/F8-1_png (not committed).
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())

const HOUSE = 'M17 30 L32 17 L47 30 V46 H17 Z'
const DOOR = 'M27.5 46 V39.5 A4.5 4.5 0 0 1 36.5 39.5 V46'
const SHOTS = 'reports/F8-1_png'

/** Width, height and whether a PNG has an alpha channel, read from its header. */
function pngInfo(b: Buffer) {
  expect(b.subarray(1, 4).toString()).toBe('PNG')
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), alpha: b[25] === 6 || b[25] === 4 }
}
async function get(request: APIRequestContext, url: string) {
  const res = await request.get(url)
  expect(res.status(), url).toBe(200)
  return { type: res.headers()['content-type'] ?? '', body: await res.body() }
}
async function expectE1(page: Page, scope: string) {
  const mark = page.locator(`${scope} svg:has(path[d="${HOUSE}"])`).first()
  await expect(mark).toBeVisible()
  await expect(mark.locator(`path[d="${DOOR}"]`)).toHaveCount(1)
  await expect(mark.locator('circle[fill="#1C7C4C"]')).toHaveCount(1)
  await expect(page.locator(`${scope} circle[r="2.6"]`)).toHaveCount(0)
  return mark
}

test('every icon file answers 200 with the right type and size', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'files do not depend on screen width')
  const ico = await get(request, '/favicon.ico')
  expect(ico.type).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/)
  expect(ico.body.readUInt16LE(2)).toBe(1)
  const count = ico.body.readUInt16LE(4)
  expect(Array.from({ length: count }, (_, i) => ico.body[6 + i * 16])).toEqual([16, 32, 48])
  const svg = await get(request, '/icon.svg')
  expect(svg.type).toContain('image/svg+xml')
  expect(svg.body.toString()).toContain('stroke-width="4.25"')
  const apple = await get(request, '/apple-icon.png')
  expect(apple.type).toContain('image/png')
  expect(pngInfo(apple.body)).toEqual({ width: 180, height: 180, alpha: false })
  for (const [url, size] of [['/icons/icon-192.png', 192], ['/icons/icon-512.png', 512], ['/icons/icon-maskable-512.png', 512]] as const) {
    const f = await get(request, url)
    expect(f.type, url).toContain('image/png')
    expect(pngInfo(f.body), url).toEqual({ width: size, height: size, alpha: false })
  }
  const logo = await get(request, '/logo.png')
  expect(logo.type).toContain('image/png')
  expect(pngInfo(logo.body)).toMatchObject({ width: 512, height: 512 })
  const manifest = await get(request, '/manifest.webmanifest')
  expect(manifest.type).toContain('application/manifest+json')
  const m = JSON.parse(manifest.body.toString())
  expect(m).toMatchObject({ name: 'HagerLand', short_name: 'HagerLand', display: 'browser', theme_color: '#152238', background_color: '#FFFFFF', start_url: '/' })
  expect(m.icons.map((i: { src: string; purpose: string }) => `${i.src} ${i.purpose}`)).toEqual(['/icons/icon-192.png any', '/icons/icon-512.png any', '/icons/icon-maskable-512.png maskable'])
})

test('the homepage links the icons and the manifest', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'head does not depend on screen width')
  await page.goto('/')
  const links = await page.locator('head link').evaluateAll((els) => els.map((e) => `${e.getAttribute('rel')} ${e.getAttribute('href')} ${e.getAttribute('type') ?? ''} ${e.getAttribute('sizes') ?? ''}`.trim()))
  expect(links.some((l) => /^icon \/favicon\.ico(\?\S+)? image\/x-icon/.test(l)), links.join('\n')).toBe(true)
  expect(links.some((l) => /^icon \/icon\.svg(\?\S+)? image\/svg\+xml/.test(l)), links.join('\n')).toBe(true)
  expect(links.some((l) => /^apple-touch-icon \/apple-icon\.png(\?\S+)? image\/png 180x180/.test(l)), links.join('\n')).toBe(true)
  expect(links.some((l) => /^manifest \/manifest\.webmanifest/.test(l)), links.join('\n')).toBe(true)
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n')
  expect(ld).toContain('"logo":"https://www.hagerland.com/logo.png"')
})

test('share images render with the new mark (default and a property)', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  const def = await get(request, '/og/default')
  expect(def.type).toContain('image/png')
  expect(pngInfo(def.body)).toMatchObject({ width: 1200, height: 630 })
  const p = await seedPublishedProperty({ title: `F8 share image ${Date.now()}` })
  try {
    const one = await get(request, `/og/property/${p.slug}`)
    expect(pngInfo(one.body)).toMatchObject({ width: 1200, height: 630 })
  } finally {
    await db().from('properties').delete().eq('id', p.id)
  }
  mkdirSync(SHOTS, { recursive: true })
  writeFileSync(`${SHOTS}/og-default.png`, def.body)
})

test('header, footer and /about show the house mark; the wordmark and layout are unchanged', async ({ page }, info) => {
  await page.goto('/about')
  const header = await expectE1(page, 'header')
  await expect(page.locator('header').getByRole('link', { name: 'HagerLand home' })).toHaveText('HagerLand®')
  expect(await header.getAttribute('class')).toContain('size-8')
  const box = await header.boundingBox()
  expect(Math.round(box!.width)).toBe(32)
  await expectE1(page, 'footer')
  await expect(page.getByText('Our mark is a simple house: the home at the centre of everything we do.')).toBeVisible()
  await expect(page.getByText('three connected points')).toHaveCount(0)
  // The header bar keeps its height (h-16 = 64 px) and nothing scrolls sideways.
  const bar = page.locator('header').getByRole('link', { name: 'HagerLand home' }).locator('..')
  expect(Math.round((await bar.boundingBox())!.height)).toBe(64)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  mkdirSync(SHOTS, { recursive: true })
  const width = info.project.name === 'desktop' ? 'desktop' : '390px'
  await page.goto('/')
  await page.locator('header').first().screenshot({ path: `${SHOTS}/header-${width}.png` })
  await page.locator('footer').first().screenshot({ path: `${SHOTS}/footer-${width}.png` })
})

test('at 375 px the header keeps its height and nothing scrolls sideways', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  await page.goto('/')
  await expectE1(page, 'header')
  const bar = page.locator('header').getByRole('link', { name: 'HagerLand home' }).locator('..')
  expect(Math.round((await bar.boundingBox())!.height)).toBe(64)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  mkdirSync(SHOTS, { recursive: true })
  await page.locator('header').first().screenshot({ path: `${SHOTS}/header-375px.png` })
  await page.close()
})

test('admin header and the admin sign-in pages show the house mark', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const signIn = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  for (const path of ['/roodber8-login', '/roodber8-login/staff']) {
    await signIn.goto(path)
    const mark = await expectE1(signIn, 'main')
    expect(Math.round((await mark.boundingBox())!.width)).toBe(44)
  }
  mkdirSync(SHOTS, { recursive: true })
  await signIn.goto('/roodber8-login')
  await signIn.locator('main').screenshot({ path: `${SHOTS}/admin-signin.png` })
  await signIn.close()
  await adminSession(page)
  await page.goto('/roodber8')
  const mark = await expectE1(page, 'header')
  expect(Math.round((await mark.boundingBox())!.width)).toBe(28)
  await page.locator('header').first().screenshot({ path: `${SHOTS}/admin-header.png` })
})
