import { expect, test } from '@playwright/test'

/** Follows internal links from the homepage (spec 22): no server errors and no broken internal links. */
test('a crawl of the public site finds no server errors and no broken links', async ({ request }, info) => {
  test.skip(info.project.name !== 'desktop', 'one crawl is enough')
  test.setTimeout(600_000)
  const seen = new Map<string, number>()
  const brokenFrom: string[] = []
  const queue: { path: string; from: string }[] = [{ path: '/', from: 'start' }]
  const skip = /^\/(account|roodber8|api|auth\/callback|og|_next|invite|requests\/[A-Za-z0-9_-]{20,}|dev)/
  while (queue.length && seen.size < 400) {
    const { path, from } = queue.shift()!
    if (seen.has(path)) continue
    const res = await request.get(path, { maxRedirects: 5 })
    seen.set(path, res.status())
    if (res.status() >= 500) brokenFrom.push(`${res.status()} ${path} (linked from ${from})`)
    else if (res.status() === 404 && from !== 'start') brokenFrom.push(`404 ${path} (linked from ${from})`)
    if (!(res.headers()['content-type'] ?? '').includes('text/html') || res.status() !== 200) continue
    const html = await res.text()
    for (const m of Array.from(html.matchAll(/href="(\/[^"#]*)"/g))) {
      const href = m[1].replace(/&amp;/g, '&')
      // Filters and sorts multiply forever; their pages are tested elsewhere. Follow paths and simple paging only.
      const [p, q = ''] = href.split('?')
      // Records made by other tests (e2e-…) can be deleted while a cached page still links to them.
      if (skip.test(p) || /\.(png|jpg|webp|svg|ico|xml|txt|pdf)$/.test(p) || p.includes('/e2e-')) continue
      if (q && !/^(page=\d+|q=[^&]*|category=[a-z0-9-]+|type=[a-z,]+)$/.test(q)) continue
      if (!seen.has(href)) queue.push({ path: href, from: path })
    }
  }
  expect(seen.size).toBeGreaterThan(80)
  expect(brokenFrom).toEqual([])
})
