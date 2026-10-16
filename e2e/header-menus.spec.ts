import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Header menus can be used with a real mouse: the pointer travels from the button to a link inside the panel
 * (crossing other menu items on the way, as a person's mouse does), and the click lands. Plus keyboard and mobile.
 */

/** Moves the mouse gradually from the centre of `from` to the centre of `to`, like a real pointer. */
async function travel(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 })
}

test.describe('desktop header menus', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop header')
  })

  test('All services: the panel stays open while the mouse travels to a link, and the link works', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'All services' })
    await button.click()
    const panel = page.locator('#all-services-panel')
    await expect(panel).toBeVisible()
    const link = panel.getByRole('link', { name: /^Buy & Sell Property/ })
    await travel(page, button, link)
    await expect(panel).toBeVisible()
    await link.click()
    await page.waitForURL('**/buy')
    await expect(panel).toHaveCount(0)
  })

  test('All services: also from a link at the far side of the panel', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'All services' })
    await button.click()
    const link = page.locator('#all-services-panel').getByRole('link', { name: /^Jobs, Recruitment & Staffing/ })
    await travel(page, button, link)
    await link.click()
    await page.waitForURL('**/jobs')
  })

  test('every menu in the main row: a link inside it can be reached with the mouse and clicked', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main', exact: true })
    for (const name of ['Supplies', 'Advice', 'Buy', 'Rent', 'Build', 'Maintain', 'Manage', 'More']) {
      await page.goto('/')
      const button = nav.getByRole('button', { name: new RegExp(`^${name}`) })
      await button.click()
      const panel = page.locator('#mega-panel')
      await expect(panel, name).toBeVisible()
      // The last link in the panel is the furthest from the button: the hardest path.
      const link = panel.getByRole('link').last()
      const href = await link.getAttribute('href')
      await travel(page, button, link)
      await expect(panel, name).toBeVisible()
      await link.click()
      await expect.poll(() => { const u = new URL(page.url()); return `${u.pathname}${u.search}` }, { message: name }).toBe(href!.split('#')[0])
    }
  })

  test('List with us: a link inside it can be reached with the mouse and clicked', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'List with us' })
    await button.click()
    const menu = page.locator('#list-with-us-menu')
    const link = menu.getByRole('link', { name: 'Become a supplier' })
    await travel(page, button, link)
    await expect(menu).toBeVisible()
    await link.click()
    await page.waitForURL('**/list-with-us#suppliers')
  })

  test('menus close on Escape and on a click outside, and work from the keyboard', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'All services' })
    await button.click()
    await expect(page.locator('#all-services-panel')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('#all-services-panel')).toHaveCount(0)
    await button.click()
    await page.mouse.click(10, 700)
    await expect(page.locator('#all-services-panel')).toHaveCount(0)
    // Keyboard: open with Enter, Tab into the panel, Enter on a link.
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#all-services-panel')).toBeVisible()
    const first = page.locator('#all-services-panel').getByRole('link').first()
    const href = await first.getAttribute('href')
    for (let i = 0; i < 30 && !(await first.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(first).toBeFocused()
    await expect(page.locator('#all-services-panel')).toBeVisible()
    await page.keyboard.press('Enter')
    await page.waitForURL(`**${href}`)
  })
})

test('mobile menu: a link inside a section can be tapped', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'mobile menu')
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const drawer = page.getByRole('navigation', { name: 'Mobile', exact: true })
  await drawer.locator('summary').filter({ hasText: 'Buy & Sell Property' }).click()
  await drawer.getByRole('link', { name: /^Explore Buy & Sell Property/ }).click()
  await page.waitForURL('**/buy')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await drawer.getByRole('link', { name: 'Living abroad?' }).click()
  await page.waitForURL('**/diaspora')
})
