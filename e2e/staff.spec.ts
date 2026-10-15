import { expect, test, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { authenticator } from 'otplib'
import { adminSession, db, linkMatching, mailWithSubject, uniqueEmail } from './helpers'

/** Staff accounts and roles (spec 26.15). */

test.describe.configure({ mode: 'serial' })

/** Same encryption as lib/admin/staff-crypto.ts, to create ready-made staff for the role checks. */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}

async function makeStaff(role: 'agent' | 'operations' | 'content'): Promise<{ email: string; password: string; secret: string; id: string }> {
  const email = uniqueEmail(`staff-${role}`)
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  const { data: s } = await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() }).select('id').single()
  return { email, password, secret, id: s!.id }
}

async function staffSignIn(page: Page, s: { email: string; password: string; secret: string }) {
  await page.context().clearCookies()
  await page.goto('/roodber8-login')
  await page.getByText('Staff sign in').click()
  await page.fill('#stf-email', s.email)
  await page.fill('#stf-pass', s.password)
  await page.fill('#stf-code', authenticator.generate(s.secret))
  await page.getByRole('button', { name: 'Sign in as staff' }).click()
  await page.waitForURL('**/roodber8')
}

test('owner invites an agent; the agent sets a password and enrols two-factor, then signs in to their areas only', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const email = uniqueEmail('agent-invite')
  await adminSession(page)
  await page.goto('/roodber8/staff')
  await expect(page.getByText('No staff yet: only you have access.').or(page.getByRole('region', { name: 'Staff' }))).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Hana Agent')
  await page.getByLabel('Work email').fill(email)
  await page.locator('#st-role').selectOption('agent')
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click()
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible()

  const mail = await mailWithSubject(email, 'invited to HagerLand admin')
  const u = new URL(linkMatching(mail.html, /\/roodber8-login\/staff\?token=/))
  const link = `${u.pathname}${u.search}`
  await page.context().clearCookies()
  await page.goto(link)
  await page.getByLabel('Choose a password').fill('agent-correct-horse')
  await page.getByLabel('Type it again').fill('agent-correct-horse')
  await page.getByRole('button', { name: 'Continue' }).click()
  const secret = (await page.getByTestId('totp-secret').textContent())!.trim()
  await page.getByLabel('The 6-digit code your app shows').fill('000000')
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByText('That code did not match.')).toBeVisible()
  await page.getByLabel('The 6-digit code your app shows').fill(authenticator.generate(secret))
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByText('Your staff account is ready. Sign in below.')).toBeVisible()

  // Wrong code: refused.
  await page.fill('#stf-email', email)
  await page.fill('#stf-pass', 'agent-correct-horse')
  await page.fill('#stf-code', '123456')
  await page.getByRole('button', { name: 'Sign in as staff' }).click()
  await expect(page.getByText('Those details did not match.')).toBeVisible()

  await staffSignIn(page, { email, password: 'agent-correct-horse', secret })
  await expect(page.getByRole('heading', { name: 'Hello, Hana' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Admin' })
  await expect(nav.getByRole('link', { name: 'Agency' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0)
  await page.goto('/roodber8/settings')
  await expect(page).toHaveURL(/\/roodber8\?denied=1$/)
  await expect(page.getByText('That area is not part of your role.')).toBeVisible()
  expect((await page.request.get('/api/admin/places-search?q=x')).status()).toBe(403)

  // Work is audited per person.
  const contact = `Audited Contact ${Date.now()}`
  await page.goto('/roodber8/agency/contacts')
  await page.fill('#nc-name', contact)
  await page.fill('#nc-phone', '+251911223399')
  await page.getByRole('checkbox', { name: 'Buyer' }).check()
  await page.getByRole('button', { name: 'Add contact' }).click()
  await expect(page.getByText('Contact added.')).toBeVisible()
  const { data: a } = await db().from('audit_log').select('actor').eq('action', 'agency.contact.create').eq('entity_label', contact).single()
  expect(a?.actor).toBe(`staff:${email}`)

  // The staff login is not a customer account.
  await page.context().clearCookies()
  await page.goto('/login')
  await page.fill('#login-email', email)
  await page.fill('#login-password', 'agent-correct-horse')
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await expect(page.getByText('This is a HagerLand staff account.')).toBeVisible()
})

test('operations and content roles reach only their areas; exports follow the role', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const ops = await makeStaff('operations')
  await staffSignIn(page, ops)
  expect((await page.goto('/roodber8/service-requests'))?.url()).toContain('/roodber8/service-requests')
  expect((await page.goto('/roodber8/property-care'))?.url()).toContain('/roodber8/property-care')
  await page.goto('/roodber8/guides')
  await expect(page).toHaveURL(/denied=1/)
  await page.goto('/roodber8/export/demand')
  await expect(page).toHaveURL(/denied=1/)

  const content = await makeStaff('content')
  await staffSignIn(page, content)
  expect((await page.goto('/roodber8/guides'))?.url()).toContain('/roodber8/guides')
  expect((await page.goto('/roodber8/locations'))?.url()).toContain('/roodber8/locations')
  await page.goto('/roodber8/agency')
  await expect(page).toHaveURL(/denied=1/)
  await page.goto('/roodber8/staff')
  await expect(page).toHaveURL(/denied=1/)

  const agent = await makeStaff('agent')
  await staffSignIn(page, agent)
  const csv = await page.request.get('/roodber8/export/agency-report')
  expect(csv.status()).toBe(200)
  expect(await csv.text()).toContain('Open instructions')
})

test('disabling a staff member ends their access at once; the master login still works', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const s = await makeStaff('agent')
  await staffSignIn(page, s)
  await page.goto('/roodber8/agency')
  await expect(page.getByRole('heading', { name: 'Agency' })).toBeVisible()
  // Owner disables them.
  const owner = await page.context().browser()!.newPage()
  await adminSession(owner)
  await owner.goto('/roodber8/staff')
  await owner.getByRole('row').filter({ hasText: s.email }).getByRole('button', { name: 'Disable' }).click()
  await expect(owner.getByText(`${s.email} can no longer sign in.`)).toBeVisible()
  await owner.close()
  await page.goto('/roodber8/agency')
  await expect(page).toHaveURL(/\/roodber8-login$/)
  const { data } = await db().from('audit_log').select('actor').eq('action', 'staff.disable').eq('entity_label', s.email).single()
  expect(data?.actor).toBe('admin')
})
