import { expect, test } from '@playwright/test'
import { PUBLIC_ROUTES } from './public-routes'
import { BANNED } from './plain-language-words'

/**
 * Plain customer language on every public page (polish round 1, AB's direction 2.2): the internal strategy words
 * of the operating model never reach visitors, in the visible text, the page title, the search description or the
 * structured data. The admin keeps them (admin → Pillars and modes).
 */

const EXTRA = ['/finance', '/insurance', '/supplies/special-buys', '/advice/market-insight', '/advice/checklists', '/advice/glossary', '/agency/valuation', '/agency/landlords', '/agency/tenants', '/build/project']
const ROUTES = Array.from(new Set([...PUBLIC_ROUTES.filter((r) => !r.startsWith('/dev/')), ...EXTRA]))

for (const route of ROUTES) {
  test(`no internal strategy words on ${route}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'the words do not depend on screen width')
    const res = await page.goto(route)
    // Pages that only exist in some states (for example the map without tiles) have nothing to check.
    if (res?.status() === 404) return
    const content = await page.evaluate(() => {
      const meta = (n: string) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute('content') ?? ''
      const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent ?? '')
      return { text: document.body.innerText, title: document.title, description: meta('description'), og: `${meta('og:title')} ${meta('og:description')}`, ld: ld.join('\n') }
    })
    for (const [name, re] of BANNED) {
      for (const [where, value] of Object.entries(content)) {
        const hit = value.split('\n').find((line) => re.test(line))
        expect(hit, `"${name}" in the ${where} of ${route}`).toBeUndefined()
      }
    }
  })
}
