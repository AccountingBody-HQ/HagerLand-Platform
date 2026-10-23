import crypto from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, db, uniqueEmail } from '../helpers'
import { ADMIN_NAV, ADMIN_NAV_GROUPS, navForRole } from '../../components/admin/admin-nav-items'

test.beforeAll(() => assertLocalStack())

const nav = (page: Page) => page.getByRole('navigation', { name: 'Admin' })
const search = (page: Page) => nav(page).getByLabel('Find a section')

test('owner sees every group; collapse persists; Find a section filters, opens, clears and has a shortcut', async ({ page }) => {
  await adminSession(page)
  await page.goto('/roodber8')
  for (const g of ADMIN_NAV_GROUPS) await expect(nav(page).getByRole('button', { name: g.label, exact: true })).toBeVisible()

  // Collapse "Setup", reload: still collapsed; expand again.
  const setup = nav(page).getByRole('button', { name: 'Setup', exact: true })
  await setup.click()
  await expect(setup).toHaveAttribute('aria-expanded', 'false')
  await expect(nav(page).getByRole('link', { name: 'Staff' })).toHaveCount(0)
  await page.reload()
  await expect(nav(page).getByRole('button', { name: 'Setup', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await expect(nav(page).getByRole('link', { name: 'Staff' })).toHaveCount(0)
  await nav(page).getByRole('button', { name: 'Setup', exact: true }).click()
  await expect(nav(page).getByRole('link', { name: 'Staff' })).toBeVisible()

  // "/" focuses the search; typing filters; Esc clears.
  await page.locator('main').first().click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('/')
  await expect(search(page)).toBeFocused()
  await page.keyboard.type('quo')
  await expect(nav(page).getByRole('link')).toHaveCount(1)
  await expect(nav(page).getByRole('link', { name: 'Quotes' })).toBeVisible()
  await expect(nav(page).getByRole('button', { name: 'Customer requests', exact: true })).toBeVisible()
  await expect(nav(page).getByRole('button', { name: 'Setup', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(search(page)).toHaveValue('')
  await expect(nav(page).getByRole('link')).toHaveCount(ADMIN_NAV.length)

  await search(page).fill('zzzz')
  await expect(nav(page).getByText('No section matches')).toBeVisible()
  await search(page).fill('money')
  await expect(nav(page).getByRole('link')).toHaveCount(2)
  await expect(nav(page).getByRole('link', { name: 'Deals and commissions' })).toBeVisible()
  await expect(nav(page).getByRole('link', { name: 'Supply ledger' })).toBeVisible()

  // Enter opens the first match.
  await search(page).fill('quo')
  await search(page).press('Enter')
  await page.waitForURL('**/roodber8/quotes')
  await expect(nav(page).getByRole('link', { name: 'Quotes' })).toHaveAttribute('aria-current', 'page')
})

test('the active item is highlighted on nested pages, and its group cannot be collapsed away', async ({ page }) => {
  const d = db()
  const { data: quote } = await d.from('quote_requests').insert({ name: 'Nav Test', phone: '+251911000222', notes: 'Navigation test', source: 'materials_list' }).select('id').single()
  const { data: org } = await d.from('organisations').insert({ kind: 'supplier', name: 'Nav Test Supplies', slug: `nav-test-${Date.now()}`, status: 'draft', source: 'admin' }).select('id').single()
  await d.from('supply_partners').insert({ org_id: org!.id })
  try {
    await adminSession(page)
    await page.goto(`/roodber8/quotes/${quote!.id}`)
    await expect(nav(page).getByRole('link', { name: 'Quotes' })).toHaveAttribute('aria-current', 'page')
    await expect(nav(page).getByRole('button', { name: 'Customer requests', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await page.goto(`/roodber8/supply/partners/${org!.id}/offers`)
    await expect(nav(page).getByRole('link', { name: 'Supply partners' })).toHaveAttribute('aria-current', 'page')
    await expect(nav(page).getByRole('link', { name: 'Quotes' })).not.toHaveAttribute('aria-current', 'page')
  } finally {
    await d.from('quote_requests').delete().eq('id', quote!.id)
    await d.from('organisations').delete().eq('id', org!.id)
  }
})

test('every menu link opens (200) for the owner', async ({ page }) => {
  test.setTimeout(240_000)
  await adminSession(page)
  for (const item of ADMIN_NAV) {
    const res = await page.goto(item.href)
    expect(res?.status(), item.href).toBe(200)
    expect(new URL(page.url()).pathname, item.href).toBe(item.href)
  }
})

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}

test('operations staff see only their groups and items', async ({ page }) => {
  const email = uniqueEmail('staff-nav')
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: 'E2E nav operations', role: 'operations', status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  try {
    await page.goto('/roodber8-login')
    await page.getByText('Staff sign in').click()
    await page.fill('#stf-email', email)
    await page.fill('#stf-pass', password)
    await page.fill('#stf-code', authenticator.generate(secret))
    await page.getByRole('button', { name: 'Sign in as staff' }).click()
    await page.waitForURL('**/roodber8')
    const expected = navForRole('operations')
    const headings = await nav(page).getByRole('button').allTextContents()
    expect(headings.map((h) => h.trim())).toEqual(expected.map((g) => g.label))
    const links = await nav(page).getByRole('link').allTextContents()
    expect(links.map((l) => l.replace(/\d+$/, '').trim())).toEqual(expected.flatMap((g) => g.items.map((i) => i.label)))
    for (const hidden of ['Deals and commissions', 'Staff', 'Guides', 'Settings']) await expect(nav(page).getByRole('link', { name: hidden })).toHaveCount(0)
  } finally {
    await db().from('staff_users').delete().eq('email', email)
    await db().auth.admin.deleteUser(data.user!.id)
  }
})

test('the phone menu has the same groups and search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await adminSession(page)
  await page.goto('/roodber8')
  await page.getByRole('button', { name: 'Open admin menu' }).click()
  const menu = nav(page)
  await expect(menu.getByRole('button', { name: 'Supplies', exact: true })).toBeVisible()
  await menu.getByLabel('Find a section').fill('suppliers')
  await expect(menu.getByRole('link')).toHaveCount(1)
  await menu.getByRole('link', { name: 'Supply partners' }).click()
  await page.waitForURL('**/roodber8/supply/partners')
  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0)
})
