import { expect, test } from '@playwright/test'
import { db, seedPublishedProperty, seedShowcase } from './helpers'

test.describe('SEO', () => {
  test('sitemaps are split by type', async ({ request }) => {
    const ids = ['static', 'properties', 'developments', 'products', 'companies', 'locations-sale', 'locations-rent', 'professionals', 'categories']
    for (const id of ids) {
      const res = await request.get(`/sitemap/${id}.xml`)
      expect(res.status(), id).toBe(200)
      expect(res.headers()['content-type']).toContain('xml')
    }
    const staticXml = await (await request.get('/sitemap/static.xml')).text()
    expect(staticXml).toContain('https://www.hagerland.com/supplies')
    expect(staticXml).not.toContain('/roodber8')
    expect(await (await request.get('/sitemap/properties.xml')).text()).toContain('<urlset')
  })

  test('robots.txt blocks everything outside production', async ({ request }) => {
    const txt = await (await request.get('/robots.txt')).text()
    expect(txt).toMatch(/Disallow: \//)
  })

  test('share images render as PNG', async ({ request }) => {
    const p = await seedPublishedProperty({ price: 3_250_000 })
    const def = await request.get('/og/default')
    expect(def.status()).toBe(200)
    expect(def.headers()['content-type']).toBe('image/png')
    const prop = await request.get(`/og/property/${p.slug}`)
    expect(prop.status()).toBe(200)
    expect(prop.headers()['content-type']).toBe('image/png')
    expect((await request.get('/og/property/not-a-real-listing-zzzzzzzz')).status()).toBe(404)
    expect((await request.get('/og/unknown/x')).status()).toBe(404)
    await db().from('properties').delete().eq('id', p.id)
  })

  test('detail pages have absolute canonicals and their own share image', async ({ page }) => {
    const p = await seedPublishedProperty()
    await page.goto(`/property/${p.slug}`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.hagerland.com/property/${p.slug}`)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`/og/property/${p.slug}$`))
    await page.goto('/property/for-sale?sort=price_asc')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.hagerland.com/property/for-sale')
    await page.goto('/about')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/default$/)
    await db().from('properties').delete().eq('id', p.id)
  })
})

test('structured data (JSON-LD) is valid on key pages', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'markup is identical at every width')
  const { seedShowcase } = await import('./helpers')
  const s = await seedShowcase()
  const expected: [string, string[]][] = [
    ['/', ['Organization', 'WebSite']],
    [`/property/${s.propertySlugs[0]}`, ['BreadcrumbList']],
    [`/supplies/product/${s.productSlug}`, ['Product']],
    [`/company/${s.orgSlug}`, ['BreadcrumbList']],
    ['/help', ['FAQPage']],
  ]
  for (const [path, types] of expected) {
    await page.goto(path)
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(blocks.length, path).toBeGreaterThan(0)
    const found = blocks.flatMap((b) => {
      const j = JSON.parse(b) as Record<string, unknown> | Record<string, unknown>[]
      return (Array.isArray(j) ? j : [j]).map((x) => {
        expect(x['@context'], path).toBe('https://schema.org')
        return String(x['@type'])
      })
    })
    for (const t of types) expect(found, path).toContain(t)
  }
  await s.cleanup()
})

test('key pages keep titles within 60 characters and descriptions within 110–160', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'metadata is the same at every width')
  const pages = ['/', '/property', '/property/for-sale', '/property/to-rent', '/developments', '/supplies', '/supplies/special-buys', '/supplies/trade', '/professionals', '/agents', '/developers', '/suppliers', '/contractors', '/repairs-maintenance', '/agency', '/diaspora', '/diaspora/property-care', '/guides', '/about', '/how-it-works', '/list-with-us', '/help', '/contact', '/terms', '/privacy', '/cookies', '/professionals/architects']
  const problems: string[] = []
  for (const path of pages) {
    await page.goto(path)
    const title = await page.title()
    const desc = (await page.locator('meta[name=description]').getAttribute('content')) ?? ''
    if (title.length > 60) problems.push(`${path}: title ${title.length} "${title}"`)
    if (desc.length < 110 || desc.length > 160) problems.push(`${path}: description ${desc.length}`)
  }
  expect(problems).toEqual([])
})

test('results pages: page 2+ is self-canonical with "Page N"; filters and sort point to the path-only URL', async ({ page }) => {
  await page.goto('/property/for-sale?page=2')
  await expect(page).toHaveTitle(/– Page 2/)
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://www.hagerland.com/property/for-sale?page=2')
  await page.goto('/property/for-sale?beds=2&sort=price_asc')
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://www.hagerland.com/property/for-sale')
  await page.goto('/property/for-sale/addis-ababa')
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://www.hagerland.com/property/for-sale/addis-ababa')
})

test('every detail page type has its own share image', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'same at every width')
  const s = await seedShowcase()
  try {
    for (const path of [`/og/development/${s.developmentSlug}`, `/og/company/${s.orgSlug}`, `/og/product/${s.productSlug}`, `/og/property/${s.propertySlugs[0]}`]) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(200)
      expect(res.headers()['content-type'], path).toBe('image/png')
    }
  } finally {
    await s.cleanup()
  }
})
