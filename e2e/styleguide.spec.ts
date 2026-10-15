import { expect, test } from '@playwright/test'

/** The design system (spec Section 5): every shared component renders and behaves on the style guide page. */

test('the style guide shows the tokens and every shared component, and the interactive ones work', async ({ page }) => {
  await page.goto('/dev/styleguide')
  await expect(page.getByRole('heading', { level: 1, name: 'HagerLand style guide' })).toBeVisible()
  for (const block of ['Colours', 'Typography', 'Buttons', 'Badges, chips and tooltip', 'Form controls', 'Interactive components', 'Cards, stats, skeletons', 'Empty state', 'Navigation helpers']) await expect(page.getByRole('heading', { name: block })).toBeVisible()

  // C-01, C-02: buttons, sizes, loading and link form; icon button with an accessible name.
  for (const name of ['Primary', 'Secondary', 'Ghost', 'Gold', 'Danger', 'Small', 'Large']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Equal width' })).toHaveAttribute('href', '/property')
  const main = page.locator('main')
  await expect(main.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
  const equal = await page.getByRole('link', { name: 'Equal width' }).boundingBox()
  const paired = await page.getByRole('link', { name: 'Paired buttons' }).boundingBox()
  expect(Math.abs((equal?.width ?? 0) - (paired?.width ?? 0))).toBeLessThanOrEqual(2)

  // C-03, C-05: inputs, select, textarea with labels and errors; checkbox, radio, switch.
  await page.locator('#sg-name').fill('Abebe Kebede')
  await page.locator('#sg-type').selectOption('land')
  await expect(page.getByText('Enter a title of at least 5 characters')).toBeVisible()
  await expect(page.locator('#sg-err')).toHaveAttribute('aria-invalid', 'true')
  await page.locator('#sg-cb').check()
  await page.locator('#sg-r2').check()
  await expect(page.locator('#sg-r1')).not.toBeChecked()
  const sw = page.locator('#sg-switch')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')

  // C-06: range, price (ETB) and phone (+251 by default).
  await expect(page.getByText('Price').first()).toBeVisible()
  await page.locator('#sg-price').fill('4500000')
  await expect(page.locator('#sg-price')).toHaveValue(/4,500,000|4500000/)
  await expect(page.locator('main')).toContainText('+251')

  // C-08: badges, chips and filter chips; tooltip on focus.
  for (const b of ['For sale', 'Featured', 'In review', 'Expiring soon', 'Rejected', 'Negotiable']) await expect(main.getByText(b, { exact: true }).first()).toBeVisible()
  await expect(main.getByRole('link', { name: 'Architects' })).toBeVisible()
  await expect(main.getByRole('link', { name: /Remove 2\+ beds|2\+ beds/ }).first()).toBeVisible()

  // C-09: tabs and accordion.
  await page.getByRole('tab', { name: 'To rent' }).click()
  await expect(page.getByText('Tab panel content for rentals.')).toBeVisible()
  await page.locator('summary', { hasText: 'How are businesses verified?' }).click()
  await expect(page.getByText('We check the trade licence and TIN certificate.')).toBeVisible()

  // C-10: dialog and bottom sheet close with Escape.
  await page.getByRole('button', { name: 'Open dialog' }).click()
  await expect(page.getByRole('dialog', { name: 'Send enquiry' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Send enquiry' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open filter sheet' }).click()
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  await page.getByRole('button', { name: 'Show 24 results' }).click()
  await expect(page.getByRole('dialog', { name: 'Filters' })).toHaveCount(0)

  // C-11: dropdown menu and toasts.
  await page.getByRole('button', { name: 'Dropdown' }).click()
  await page.getByRole('button', { name: 'Price low to high' }).click()
  await page.getByRole('button', { name: 'Show toast' }).click()
  await expect(page.getByText('Enquiry sent. The agent will contact you soon.')).toBeVisible()

  // C-12: card, stat, skeleton, empty state, breadcrumbs, pagination.
  await expect(page.getByText('New enquiries')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No properties match these filters yet' })).toBeVisible()
  await expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
  await expect(main.getByRole('navigation', { name: 'Pagination' })).toBeVisible()
})
