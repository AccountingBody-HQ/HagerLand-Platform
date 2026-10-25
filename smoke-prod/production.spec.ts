import { expect, test } from '@playwright/test'
import { PUBLIC_ROUTES } from '../e2e/public-routes'
import { LEGACY_REDIRECTS } from '../e2e/legacy-redirects'

/** Read-only production smoke tests (brief 25.6 step 6). Nothing here signs in, submits or writes. */

const base = () => test.info().project.use.baseURL ?? ''
const errorsOf = (page: import('@playwright/test').Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 404|_rsc=/.test(m.text())) errors.push(m.text())
  })
  return errors
}

// The style guide is a development page and is not part of the public site.
for (const route of PUBLIC_ROUTES.filter((r) => !r.startsWith('/dev/'))) {
  test(`loads ${route}`, async ({ page }) => {
    // The map exists only when map tiles are configured (NEXT_PUBLIC_MAP_TILE_URL); the results page then offers "Map view".
    if (route === '/property/map') {
      await page.goto('/property/for-sale')
      const mapOn = (await page.getByRole('link', { name: 'Map view' }).count()) > 0
      if (!mapOn) {
        expect((await page.goto(route))?.status(), 'map without tiles').toBe(404)
        return
      }
    }
    const errors = errorsOf(page)
    const res = await page.goto(route)
    expect(res?.status(), `status for ${route}`).toBe(200)
    await expect(page.locator('h1').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, 'no horizontal scroll').toBeLessThanOrEqual(0)
    expect(errors, 'no console errors').toEqual([])
  })
}

test('detail pages listed in the sitemaps open (property, product, company, development)', async ({ page, request }) => {
  for (const part of ['properties', 'products', 'companies', 'developments']) {
    const xml = await (await request.get(`/sitemap/${part}.xml`)).text()
    const first = xml.match(/<loc>([^<]+)<\/loc>/)?.[1]
    // A new database may have nothing published yet; then there is nothing to open.
    if (!first) continue
    const res = await page.goto(new URL(first).pathname)
    expect(res?.status(), first).toBe(200)
    await expect(page.locator('h1').first()).toBeVisible()
  }
})

test('site search answers', async ({ page }) => {
  const res = await page.goto('/search?q=addis')
  expect(res?.status()).toBe(200)
  await expect(page.locator('h1').first()).toBeVisible()
})

test('coming-soon register-interest forms show and check what is typed, without sending', async ({ page }) => {
  for (const route of ['/finance', '/insurance', '/jobs']) {
    await page.goto(route)
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /Register (my )?interest/i }) }).first()
    if (!(await form.count())) continue
    // An empty form is refused by the server's checks before anything is stored.
    await form.getByRole('button', { name: /Register (my )?interest/i }).click()
    await expect(form.getByRole('alert').first()).toBeVisible()
    await expect(page.getByText('Thanks, your interest is registered')).toHaveCount(0)
  }
})

test('unknown pages return the branded 404', async ({ page }) => {
  const res = await page.goto('/hl-smoke-test-page-that-does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: "We couldn't find that page" })).toBeVisible()
})

for (const [from, to] of LEGACY_REDIRECTS) {
  test(`old address ${from} redirects permanently to ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 })
    expect([301, 308]).toContain(res.status())
    expect(new URL(res.headers().location ?? '', base()).pathname).toBe(to)
  })
}

test('old API addresses answer 410 Gone', async ({ request }) => {
  for (const path of ['/api/housing', '/api/enquiry', '/api/birrbank-rates']) expect((await request.get(path)).status(), path).toBe(410)
})

test('admin needs a session and its sign-in page is not indexed', async ({ page, request }) => {
  const res = await request.get('/roodber8', { maxRedirects: 0 })
  expect([302, 307]).toContain(res.status())
  expect(res.headers().location).toContain('/roodber8-login')
  expect((await request.get('/api/admin/places-search?query=x', { maxRedirects: 0 })).status()).toBe(401)
  const login = await page.goto('/roodber8-login')
  expect(login?.headers()['x-robots-tag']).toContain('noindex')
  await expect(page.locator('#adm-user')).toBeVisible()
  await expect(page.locator('#adm-pass')).toBeVisible()
  await expect(page.locator('#adm-code')).toBeVisible()
})

test('security headers, robots and sitemaps', async ({ request }) => {
  const res = await request.get('/')
  const h = res.headers()
  for (const name of ['strict-transport-security', 'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']) expect(h[name], name).toBeTruthy()
  const robots = await (await request.get('/robots.txt')).text()
  const maps = Array.from(robots.matchAll(/^Sitemap: (\S+)/gm)).map((m) => m[1])
  if (base().startsWith('https://www.hagerland.com')) {
    expect(robots).not.toMatch(/^Disallow: \/$/m)
    expect(maps.length).toBeGreaterThan(0)
  }
  for (const m of maps) expect((await request.get(new URL(m).pathname)).status(), m).toBe(200)
})

test('sitemap index matches robots.txt; every sitemap is valid XML; static sitemap lists only public pages', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('application/xml')
  const xml = await res.text()
  expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  const children = Array.from(xml.matchAll(/<sitemap><loc>([^<]+)<\/loc><\/sitemap>/g)).map((m) => m[1])
  expect(children.length).toBeGreaterThan(0)
  for (const c of children) {
    const child = await request.get(new URL(c).pathname)
    expect(child.status(), c).toBe(200)
    expect(child.headers()['content-type'], c).toContain('xml')
    expect(await child.text(), c).toMatch(/<urlset[\s>][\s\S]*<\/urlset>/)
  }
  if (base().startsWith('https://www.hagerland.com')) {
    const robots = await (await request.get('/robots.txt')).text()
    const maps = Array.from(robots.matchAll(/^Sitemap: (\S+)/gm)).map((m) => m[1])
    expect(maps).toEqual(['https://www.hagerland.com/sitemap.xml', ...children])
    const disallowed = Array.from(robots.matchAll(/^Disallow: (\S+)/gm)).map((m) => m[1])
    const banned = ['/roodber8', '/roodber8-login', '/api', '/account', '/onboarding', '/auth', '/search', '/dev', ...disallowed]
    const urls = Array.from((await (await request.get('/sitemap/static.xml')).text()).matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1])
    for (const u of urls) {
      expect(u.startsWith('https://www.hagerland.com/'), u).toBe(true)
      const path = new URL(u).pathname
      expect(banned.some((b) => path === b.replace(/\/$/, '') || path.startsWith(b.endsWith('/') ? b : `${b}/`)), u).toBe(false)
    }
  }
})

test('/api/health/full: every check is true', async ({ request }) => {
  const secret = process.env.CRON_SECRET
  test.skip(!secret, 'CRON_SECRET not provided')
  const body = (await (await request.get('/api/health/full', { headers: { authorization: `Bearer ${secret}` } })).json()) as Record<string, unknown>
  const flat = (o: Record<string, unknown>, p = ''): [string, unknown][] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, v] as [string, unknown]]))
  // latestMigration and notChecked describe the report; they are not checks.
  const info = (k: string) => k === 'version' || k === 'ok' || k === 'latestMigration' || k.startsWith('notChecked.')
  const notTrue = flat(body).filter(([k, v]) => !info(k) && v !== true).map(([k]) => k)
  expect(notTrue).toEqual([])
})
