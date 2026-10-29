import crypto from 'node:crypto'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, allMail, asFreshVisitor, assertLocalStack, createUser, db, signIn, submitStaffSignIn, uniqueEmail } from './helpers'

/**
 * Fix F-4 + F-7 "Honest words and hygiene" on the local copy only (local mail catcher; no switch is changed): FAQ text
 * and its structured data, the claim limit, sign-in emails behind the security check, the "Quote reply time" field
 * gone without touching its stored value, and agency fee income for the owner only.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width'))

function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<{ page: Page; email: string }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`f4-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return { page, email }
}
const ld = async (page: Page) => (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n')

test('the FAQ answers and their structured data say what happens, never when', async ({ page }) => {
  await page.goto('/help')
  const help = [
    'Yes. We review your changes, and the current version stays live until then.',
    'Go to My account → Company profile → Get Verified and upload your trade licence and TIN certificate. We check them and email you when we have decided.',
    "It means our team checked the business's trade licence and tax number (TIN). The badge shows the date of the check, and we check again every 12 months.",
    'HagerLand sends it to up to three suitable providers at a time who work in your area',
  ]
  const helpLd = await ld(page)
  // The answers sit in closed accordions: read the text the page holds, not only what is open.
  const helpText = (await page.locator('main').textContent()) ?? ''
  for (const s of help) {
    expect(helpLd, s).toContain(s)
    expect(helpText.replace(/’/g, "'"), s).toContain(s.replace(/’/g, "'"))
  }
  for (const old of ['reviewed quickly', 'business day', 'licence category and grade', 'up to three suitable providers who']) {
    expect(helpLd, old).not.toContain(old)
    expect(helpText, old).not.toContain(old)
  }
  await page.goto('/list-with-us')
  const lw = await ld(page)
  expect(lw).toContain('"How does the review work?"')
  expect(lw).toContain('We review every listing and profile before it goes live. You get an email when yours is live, or if anything needs changing.')
  expect(lw).not.toContain('How long does the review take?')
  await expect(page.getByText('How does the review work?')).toBeVisible()
})

test('the 6th claim in a day is refused with the existing text and nothing is saved', async ({ page }) => {
  const name = `E2E F4 Claim Cement ${Date.now()}`
  const { data: org } = await db().from('organisations').insert({ kind: 'supplier', name, slug: `e2e-f4-claim-${Date.now()}`, description: 'Cement supplier for the claim limit test.', source: 'import', status: 'published', verification_level: 'listed' }).select('id, slug').single()
  const user = await createUser({ name: 'Dawit Bekele' })
  // Five claims already today (the limit's own counter, local copy only).
  await db().from('rate_limits').upsert({ key: `claim:${user.id}`, count: 5, reset_at: new Date(Date.now() + 3_600_000).toISOString() })
  try {
    await signIn(page, user.email, user.password)
    await page.goto(`/company/${org!.slug}`)
    await page.getByRole('link', { name: 'Claim this business' }).click()
    await page.selectOption('#cl-rel', 'owner')
    await page.fill('#cl-phone', '0911223344')
    await page.getByRole('button', { name: 'Submit claim' }).click()
    await expect(page.getByText('You have sent several requests recently. Please wait a while and try again, or contact us.')).toBeVisible()
    expect((await db().from('claims').select('id').eq('org_id', org!.id)).data).toEqual([])
  } finally {
    await db().from('rate_limits').delete().eq('key', `claim:${user.id}`)
    await db().from('organisations').delete().eq('id', org!.id)
    await db().auth.admin.deleteUser(user.id)
  }
})

test('password reset and magic-link sign-in still send their emails with the security check in place', async ({ page }) => {
  // Two people: the local sign-in service allows one email per address every few seconds.
  const resetUser = await createUser({ name: 'Reset Person' })
  const magicUser = await createUser({ name: 'Magic Person' })
  try {
    await asFreshVisitor(page)
    await page.goto('/auth/reset-password')
    await page.fill('#rp-email', resetUser.email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/we've sent a link to set a new password/)).toBeVisible()
    await expect.poll(async () => (await allMail(resetUser.email)).length, { timeout: 20_000 }).toBe(1)
    await page.goto('/login')
    await page.getByRole('tab', { name: 'Email link' }).click()
    await page.fill('#magic-email', magicUser.email)
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
    await expect(page.getByText(/we've sent a sign-in link/)).toBeVisible()
    await expect.poll(async () => (await allMail(magicUser.email)).length, { timeout: 20_000 }).toBe(1)
  } finally {
    await db().auth.admin.deleteUser(resetUser.id)
    await db().auth.admin.deleteUser(magicUser.id)
  }
})

test('admin Settings has no "Quote reply time" field, and saving keeps the stored value as it was', async ({ page }) => {
  const { data: before } = await db().from('site_settings').select('value').eq('key', 'quote_response_target').single()
  await adminSession(page)
  await page.goto('/roodber8/settings')
  await expect(page.getByText('Quote reply time')).toHaveCount(0)
  const panel = page.locator('form').filter({ has: page.getByLabel('HagerLand Supply delivery area') })
  await panel.getByRole('button', { name: /Save/ }).click()
  await expect(panel.getByText(/Saved/)).toBeVisible()
  expect((await db().from('site_settings').select('value').eq('key', 'quote_response_target').single()).data?.value).toEqual(before?.value)
})

test('agency fee income: the owner sees it on the page and in the CSV; Agents get no fee figure anywhere', async ({ page, browser }) => {
  await adminSession(page)
  await page.goto('/roodber8/agency')
  await expect(page.getByText('Fee income', { exact: true })).toBeVisible()
  const ownerCsv = await (await page.request.get('/roodber8/export/agency-report?days=90')).text()
  expect(ownerCsv).toContain('Fee income (ETB)')

  const agent = await staffPage(browser, 'agent')
  try {
    const html = await (await agent.page.request.get('/roodber8/agency')).text()
    expect(html).toContain('Open instructions')
    expect(html).not.toContain('Fee income')
    const csv = await agent.page.request.get('/roodber8/export/agency-report?days=90')
    expect(csv.status()).toBe(200)
    const body = await csv.text()
    expect(body).toContain('Open instructions')
    expect(body).not.toContain('Fee income')
    // The performance page (with its own fee tile) stays the owner's: an Agent is turned away.
    await agent.page.goto('/roodber8/performance')
    await expect(agent.page).toHaveURL(/denied=1/)
  } finally {
    await agent.page.close()
    await db().from('staff_users').delete().eq('email', agent.email)
  }
  for (const role of ['operations', 'content'] as const) {
    const s = await staffPage(browser, role)
    try {
      await s.page.goto('/roodber8/agency')
      await expect(s.page).toHaveURL(/denied=1/)
      const res = await s.page.request.get('/roodber8/export/agency-report?days=90', { maxRedirects: 0 })
      expect(await res.text()).not.toContain('Fee income')
    } finally {
      await s.page.close()
      await db().from('staff_users').delete().eq('email', s.email)
    }
  }
})
