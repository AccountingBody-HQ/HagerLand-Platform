import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adminSession } from './helpers'

/**
 * Section 26 pages: zero serious or critical axe problems (WCAG 2.2 AA) and no sideways scrolling at phone, tablet
 * and desktop widths. Each work package adds its new public, account and admin pages here.
 */
export const S26_PUBLIC = ['/buy', '/rent', '/build', '/maintain', '/manage', '/advice']
export const S26_ADMIN = ['/roodber8/pillars']

async function axeProblems(page: Page, path: string): Promise<string[]> {
  await page.goto(path)
  await page.waitForLoadState('load')
  await page.waitForTimeout(300)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${path} → ${v.id}: ${v.help} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
}

test('Section 26 public pages: accessibility', async ({ page }) => {
  test.setTimeout(240_000)
  const all: string[] = []
  for (const p of S26_PUBLIC) all.push(...(await axeProblems(page, p)))
  expect(all).toEqual([])
})

test('Section 26 admin pages: accessibility', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await adminSession(page)
  const all: string[] = []
  for (const p of S26_ADMIN) all.push(...(await axeProblems(page, p)))
  expect(all).toEqual([])
})

test('Section 26 public pages: no sideways scrolling from 360 to 1440 px', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'runs its own widths')
  test.setTimeout(300_000)
  const problems: string[] = []
  for (const width of [360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    for (const path of S26_PUBLIC) {
      await page.goto(path)
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (over > 0) problems.push(`${path} @ ${width}px: ${over}px too wide`)
    }
    await page.close()
  }
  expect(problems).toEqual([])
})
