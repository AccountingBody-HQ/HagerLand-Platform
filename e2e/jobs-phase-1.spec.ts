import { expect, test, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { authenticator } from 'otplib'
import { adminSession, asFreshVisitor, createProvider, createUser, db, firstLink, latestMail, mailWithSubject, randomPhone, uniqueEmail } from './helpers'

/** Jobs Phase 1 (docs/HAGERLAND_JOBS_BLUEPRINT.md section 9): AB's journeys J1–J8 on the local copy. */

test.describe.configure({ mode: 'serial' })

const STAFFING_STEPS = ['Tell us the roles', 'Who you need, how many and when.', 'We agree terms', 'HagerLand confirms the fee with you in writing before we start.', 'We introduce candidates', 'Only people who have agreed to be introduced.']
const DEFAULT_STEPS = ['Tell us what you need', 'A few questions about the job, where it is and how soon.', 'We match up to three providers', 'Chosen by service, location and verification. They contact you directly.', 'Compare quotes and choose', 'Quotes appear on your request page. Agree everything in writing before you pay.']
const STAFFING_FOOTER = "Your request goes to HagerLand's recruitment team. We share your phone or email with candidates only with your agreement."
const DEFAULT_FOOTER = 'We share your request with up to three suitable providers. Your phone and email go only to providers who accept it.'
const ETB_BANDS = ['Under ETB 10,000', 'ETB 10,000 – 50,000', 'ETB 50,000 – 250,000', 'ETB 250,000 – 1M', 'ETB 1M – 5M', 'Over ETB 5M']

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}

async function makeStaff(role: 'agent' | 'operations' | 'content') {
  const email = uniqueEmail(`p1-${role}`)
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  return { email, password, secret }
}

async function staffSignIn(page: Page, s: { email: string; password: string; secret: string }) {
  await page.context().clearCookies()
  await page.goto('/roodber8-login')
  await page.getByText('Staff sign in').click()
  await page.fill('#stf-email', s.email)
  await page.fill('#stf-pass', s.password)
  // A code about to expire may be stale by the time the form arrives: wait for the next one.
  if (authenticator.timeRemaining() < 5) await page.waitForTimeout(authenticator.timeRemaining() * 1000 + 500)
  await page.fill('#stf-code', authenticator.generate(s.secret))
  await page.getByRole('button', { name: 'Sign in as staff' }).click()
  await page.waitForURL('**/roodber8')
}

/** Server action ids from the test build, to call an action directly the way a crafted request would. */
function actionId(file: string, name: string): string {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string; workers: Record<string, { moduleId?: string | number }> }> }
  const hit = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))
  if (!hit) throw new Error(`No server action ${name} in ${file}`)
  return hit[0]
}

/** Calls a server action directly. 'ran' when the action returned a result, 'refused' when it threw or never ran. */
async function callAction(page: Page, id: string, args: unknown[]): Promise<'ran' | 'refused'> {
  const res = await page.request.post('/roodber8', { headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, data: JSON.stringify(args), maxRedirects: 0 })
  return res.status() === 200 && (await res.text()).includes('"ok":') ? 'ran' : 'refused'
}

async function fillRequestBasics(page: Page, title: string) {
  await page.getByLabel('Give your request a short title').fill(title)
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('Tigist Employer')
  await page.locator('#sr-phone').fill(randomPhone())
}

async function seedJob(orgId: string, title: string, opts: { category?: string; status?: string } = {}) {
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p1-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, employer_org_id: orgId, title, category: opts.category ?? 'construction', employment_type: 'contract', location_id: loc!.id, description: 'A job for the Jobs Phase 1 browser tests, on a site in Bole.', status: opts.status ?? 'pending_review' })
    .select('id, slug')
    .single()
  if (error || !data) throw new Error(`job seed failed: ${error?.message}`)
  return data
}

test('J1: an employer sends a staffing requirement in hiring words; HagerLand sees the pay offered in admin and in the email', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await asFreshVisitor(page)
  const { count: before } = await db().from('service_requests').select('id', { count: 'exact', head: true })
  await page.goto('/request-service/staffing')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Submit a staffing requirement')
  expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('Tell HagerLand which roles you need to fill. We find, check and introduce suitable candidates. Fees are agreed with you in writing before we start.')
  await expect(page.getByText('For example: "10 masons and a foreman for a G+2 site in Bole".')).toBeVisible()
  await expect(page.getByLabel('Describe the roles and the work')).toBeVisible()
  await expect(page.getByText('Skills and experience needed, working hours, where the site is, and anything else candidates should know.')).toBeVisible()
  await expect(page.getByLabel('Pay offered (optional)')).toBeVisible()
  await expect(page.getByText('For example: ETB 800 per day, or ETB 30,000 per month.')).toBeVisible()
  await expect(page.locator('#sr-budget')).toHaveCount(0)
  await expect(page.getByText('Are you hiring from abroad or placing people abroad?')).toHaveCount(0)
  await expect(page.getByLabel('Where is the job?')).toBeVisible()
  await expect(page.getByText('Start typing a city, sub-city or area.', { exact: true })).toBeVisible()
  for (const t of STAFFING_STEPS) await expect(page.getByText(t, { exact: true })).toBeVisible()
  await expect(page.getByText(STAFFING_FOOTER)).toBeVisible()
  const html = await page.content()
  for (const banned of [...ETB_BANDS, 'up to three', 'We also cover cities abroad', 'International placements', 'placing people abroad']) expect(html, banned).not.toContain(banned)

  // With pay offered.
  const stamp = Date.now()
  const email = uniqueEmail('staffing')
  const title = `E2E 10 masons ${stamp}`
  await page.getByLabel('Which roles do you need to fill?').fill('Ten masons and one foreman')
  await page.getByLabel('How many people?').fill('11')
  await page.getByText('Temporary or day labour', { exact: true }).click()
  await page.getByLabel('Describe the roles and the work').fill('Block work on a G+2 house in Bole, six days a week.')
  await page.getByLabel('Pay offered (optional)').fill('ETB 800 per day')
  await fillRequestBasics(page, title)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data: row } = await db().from('service_requests').select('id, reference, details, budget_band, answers').eq('title', title).single()
  expect(row?.details).toBe('Block work on a G+2 house in Bole, six days a week.\n\nPay offered: ETB 800 per day')
  expect(row?.budget_band).toBeNull()
  expect(Object.keys((row?.answers as Record<string, unknown>) ?? {})).not.toContain('international')
  const notice = await mailWithSubject('inbox@test.hagerland.invalid', row!.reference)
  expect(notice.html).toContain('Pay offered')
  expect(notice.html).toContain('ETB 800 per day')
  await adminSession(page)
  await page.goto(`/roodber8/service-requests/${row!.id}`)
  await expect(page.getByText('Pay offered: ETB 800 per day')).toBeVisible()

  // Without pay offered, and a crafted budget band and abroad answer are ignored.
  await page.goto('/request-service/staffing')
  const title2 = `E2E 3 carpenters ${stamp}`
  await page.getByLabel('Which roles do you need to fill?').fill('Three carpenters')
  await page.getByLabel('How many people?').fill('3')
  await page.getByText('Permanent', { exact: true }).click()
  await page.getByLabel('Describe the roles and the work').fill('Formwork for a G+4 building in Bole.')
  await fillRequestBasics(page, title2)
  await page.getByLabel('Email').fill(uniqueEmail('staffing2'))
  await page.evaluate(() => {
    const form = document.querySelector('form')!
    for (const [n, v] of [['budget_band', 'Over ETB 5M'], ['q_international', 'yes']]) {
      const i = document.createElement('input')
      i.type = 'hidden'
      i.name = n
      i.value = v
      form.appendChild(i)
    }
  })
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data: row2 } = await db().from('service_requests').select('details, budget_band, answers').eq('title', title2).single()
  expect(row2).toMatchObject({ details: 'Formwork for a G+4 building in Bole.', budget_band: null })
  expect(Object.keys((row2?.answers as Record<string, unknown>) ?? {})).not.toContain('international')
  const { count: after } = await db().from('service_requests').select('id', { count: 'exact', head: true })
  expect(after).toBe((before ?? 0) + 2)
})

test('J2: other services keep their budget bands, sidebar, footer and location text, and still send', async ({ page }) => {
  await asFreshVisitor(page)
  for (const slug of ['plumbers', 'electricians', 'painters']) {
    const res = await page.goto(`/request-service/${slug}`)
    if (res?.status() === 404) continue
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Request /)
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toMatch(/^Describe what you need and get quotes from up to three .+ on HagerLand\. Free for customers; you choose who to hire\.$/)
    await expect(page.getByLabel('Describe what you need')).toBeVisible()
    await expect(page.getByText('Size, materials, access, anything a provider should know before quoting.')).toBeVisible()
    await expect(page.getByText(/^For example: “.+ for a G\+1 house in Bole”\.$/)).toBeVisible()
    for (const b of ETB_BANDS) await expect(page.locator('#sr-budget option', { hasText: b })).toHaveCount(1)
    await expect(page.getByLabel('Pay offered (optional)')).toHaveCount(0)
    await expect(page.getByLabel('Where is the work?')).toBeVisible()
    await expect(page.getByText('Start typing a city, sub-city or area. We also cover cities abroad.')).toBeVisible()
    for (const t of DEFAULT_STEPS) await expect(page.getByText(t, { exact: true }).first()).toBeVisible()
    await expect(page.getByText(DEFAULT_FOOTER)).toBeVisible()
  }
  await page.goto('/request-service/plumbers')
  const title = `E2E Leaking pipe ${Date.now()}`
  await page.getByLabel('Describe what you need').fill('The kitchen pipe leaks under the sink.')
  await page.locator('#sr-budget').selectOption('ETB 10,000 – 50,000')
  await fillRequestBasics(page, title)
  await page.getByLabel('Email').fill(uniqueEmail('plumber'))
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data } = await db().from('service_requests').select('details, budget_band').eq('title', title).single()
  expect(data).toMatchObject({ details: 'The kitchen pipe leaks under the sink.', budget_band: 'ETB 10,000 – 50,000' })
})

test('J3: "Post a job" returns to the job form after signing in or signing up; bad return addresses fall back', async ({ page }) => {
  test.setTimeout(120_000)
  await asFreshVisitor(page)
  const user = await createUser({ name: 'Return Person' })
  await page.goto('/jobs')
  await page.getByRole('link', { name: 'Post a job' }).first().click()
  await page.waitForURL(/\/login\?next=%2Faccount%2Fjobs%2Fnew$/)
  await page.fill('#login-email', user.email)
  await page.fill('#login-password', user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/account/jobs/new')

  // Sign-up keeps the address through the email confirmation.
  await page.context().clearCookies()
  await page.goto('/account/candidate')
  await page.waitForURL(/\/login\?next=%2Faccount%2Fcandidate$/)
  const href = await page.getByRole('link', { name: 'Create an account' }).getAttribute('href')
  expect(href).toBe('/signup?next=%2Faccount%2Fcandidate')
  const email = uniqueEmail('return-signup')
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })
  await page.goto(`${href}&type=looking`)
  await page.fill('#su-name', 'Return Signup')
  await page.fill('#su-email', email)
  await page.fill('#su-phone', '911234567')
  await page.fill('#su-password', 'correct-horse-battery')
  await page.check('#su-terms')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Check your email')).toBeVisible()
  await page.setExtraHTTPHeaders({})
  const link = new URL(firstLink((await latestMail(email)).html))
  expect(link.hostname).toBe('localhost')
  expect(decodeURIComponent(link.searchParams.get('redirect_to') ?? link.href)).toContain('next=/account/candidate')
  await page.goto(link.href)
  await page.waitForURL((u) => u.host === 'localhost:3100' && u.pathname === '/account/candidate')

  // Crafted return addresses go to the usual place.
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '%2F%2Fevil.com', '/%2F%2Fevil.com', '/roodber8', '/roodber8/jobs']) {
    await page.context().clearCookies()
    await page.goto(`/login?next=${encodeURIComponent(bad)}`)
    await page.fill('#login-email', user.email)
    await page.fill('#login-password', user.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((u) => u.pathname.startsWith('/account'))
    expect(new URL(page.url()).host, bad).toBe('localhost:3100')
    expect(new URL(page.url()).pathname, bad).toBe('/account')
  }
  // A visitor cannot inject the return address header.
  await page.context().clearCookies()
  const res = await page.request.get('/account/jobs/new', { headers: { 'x-hl-return-path': '//evil.com' }, maxRedirects: 0 })
  expect(res.headers().location).toBe('/login?next=%2Faccount%2Fjobs%2Fnew')
})

test('J4: Operations runs Jobs admin with audit entries, and gains nothing else', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const employer = await createProvider({ name: `E2E P1 Employer ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const toApprove = await seedJob(employer.orgId, `E2E P1 approve ${Date.now()}`)
  const toReject = await seedJob(employer.orgId, `E2E P1 send back ${Date.now()}`)
  const applicant = await createUser({ name: 'Abebe Applicant' })
  await db().from('job_applications').insert({ job_id: toApprove.id, applicant_user_id: applicant.id, name: 'Abebe Applicant', email: applicant.email, phone: '+251911223344', cover_note: 'I have five years of block work.' })

  const ops = await makeStaff('operations')
  await staffSignIn(page, ops)
  await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Jobs and applications' })).toBeVisible()
  await page.goto('/roodber8/jobs')
  await expect(page).toHaveURL(/\/roodber8\/jobs$/)
  await page.goto(`/roodber8/jobs/${toApprove.id}`)
  await expect(page.getByText('Abebe Applicant').first()).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Job approved and live.')).toBeVisible()
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', toApprove.id).single()).data?.status).toBe('published')
  await page.reload()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', toApprove.id).single()).data?.status).toBe('paused')
  await page.reload()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', toApprove.id).single()).data?.status).toBe('archived')
  await page.reload()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', toApprove.id).single()).data?.status).toBe('removed')

  await page.goto(`/roodber8/jobs/${toReject.id}`)
  await page.getByLabel('Note to the applicant (optional)').fill('Please add the salary.')
  await page.getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByText('Sent back to the employer.')).toBeVisible()
  const { data: audits } = await db().from('audit_log').select('action, actor').in('entity_id', [toApprove.id, toReject.id])
  const actions = (audits ?? []).map((a) => a.action)
  for (const a of ['job.approve', 'job.paused', 'job.archived', 'job.removed', 'job.reject']) expect(actions).toContain(a)
  expect((audits ?? []).every((a) => a.actor.includes(ops.email) || a.actor.includes('E2E operations'))).toBe(true)

  // Pages outside Jobs stay closed.
  for (const p of ['/roodber8/developments', '/roodber8/review', '/roodber8/supply/ledger', '/roodber8/deals', '/roodber8/settings', '/roodber8/staff']) {
    await page.goto(p)
    await expect(page, p).toHaveURL(/\/roodber8\?denied=1$/)
  }
  // Crafted calls to progress-update, agreement and settings actions are refused on the server; Jobs actions work.
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data: dev } = await db().from('developments').insert({ name: `E2E P1 Towers ${Date.now()}`, slug: `e2e-p1-towers-${Date.now()}`, developer_org_id: employer.orgId, location_id: loc!.id, description: 'A residential building used for the Jobs Phase 1 role checks.', status: 'published', completion_status: 'under_construction' }).select('id').single()
  const { data: upd } = await db().from('development_updates').insert({ development_id: dev!.id, title: 'E2E P1 pending update', body: 'Slab poured on level three.', happened_on: new Date().toISOString().slice(0, 10), status: 'pending_review' }).select('id').single()
  const updateId = upd!.id as string
  const { data: agreement } = await db().from('supply_agreements').select('id, org_id, status').limit(1).maybeSingle()
  const fakeId = '00000000-0000-4000-8000-000000000000'
  expect(await callAction(page, actionId('development-updates', 'developmentUpdateDecisionAction'), [updateId, true])).toBe('refused')
  expect(await callAction(page, actionId('development-updates', 'removeDevelopmentUpdateAction'), [updateId])).toBe('refused')
  expect(await callAction(page, actionId('supply-agreements', 'setAgreementStatusAction'), [agreement?.org_id ?? employer.orgId, agreement?.id ?? fakeId, 'terminated', 'E2E'])).toBe('refused')
  expect((await db().from('development_updates').select('status').eq('id', updateId).single()).data?.status).toBe('pending_review')
  if (agreement) expect((await db().from('supply_agreements').select('status').eq('id', agreement.id).single()).data?.status).toBe(agreement.status)
  const third = await seedJob(employer.orgId, `E2E P1 crafted ${Date.now()}`)
  expect(await callAction(page, actionId('actions/jobs', 'jobDecisionAction'), [third.id, true])).toBe('ran')
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', third.id).single()).data?.status).toBe('published')

  // The owner can still publish progress updates.
  await adminSession(page)
  expect(await callAction(page, actionId('supply-agreements', 'setAgreementStatusAction'), [employer.orgId, fakeId, 'terminated', 'E2E'])).toBe('ran')
  expect(await callAction(page, actionId('development-updates', 'developmentUpdateDecisionAction'), [updateId, false, 'E2E clean-up'])).toBe('ran')
  await expect.poll(async () => (await db().from('development_updates').select('status').eq('id', updateId).single()).data?.status).toBe('rejected')
  await db().from('developments').delete().eq('id', dev!.id)
  await db().from('organisations').delete().eq('id', employer.orgId)
})

test('J5: Agent and Content staff still cannot open Jobs admin or approve jobs', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(120_000)
  const employer = await createProvider({ name: `E2E P1 Agent check ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const job = await seedJob(employer.orgId, `E2E P1 agent ${Date.now()}`)
  for (const role of ['agent', 'content'] as const) {
    await staffSignIn(page, await makeStaff(role))
    await page.goto('/roodber8/jobs')
    await expect(page).toHaveURL(/\/roodber8\?denied=1$/)
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Jobs and applications' })).toHaveCount(0)
    expect(await callAction(page, actionId('actions/jobs', 'jobDecisionAction'), [job.id, true])).toBe('refused')
  }
  expect((await db().from('job_posts').select('status').eq('id', job.id).single()).data?.status).toBe('pending_review')
  await db().from('organisations').delete().eq('id', employer.orgId)
})

test('J6: "International placements" is offered nowhere and refused when crafted; an existing job still shows it', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await page.goto('/jobs')
  await expect(page.locator('#j-cat option', { hasText: 'International placements' })).toHaveCount(0)
  await expect(page.locator('#j-cat option', { hasText: 'Engineering' })).toHaveCount(1)
  await expect(page.locator('#jobs-reg-category option', { hasText: 'International placements' })).toHaveCount(0)
  expect(await page.content()).not.toContain('International placements')
  const crafted = await page.goto('/jobs?category=international-placements')
  expect(crafted?.status()).toBe(200)
  await expect(page.locator('#j-cat')).toHaveValue('')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jobs in construction, engineering and property')
  expect(await page.content()).not.toContain('International placements')

  // An existing job with the category still displays it, publicly and in admin.
  const employer = await createProvider({ name: `E2E P1 Overseas ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const old = await seedJob(employer.orgId, `E2E P1 overseas ${Date.now()}`, { category: 'international-placements', status: 'published' })
  const { data: before } = await db().from('job_posts').select('category, status, updated_at').eq('id', old.id).single()
  await page.goto(`/jobs/${old.slug}`)
  await expect(page.getByText('International placements').first()).toBeVisible()
  await adminSession(page)
  await page.goto(`/roodber8/jobs/${old.id}`)
  await expect(page.getByText('International placements').first()).toBeVisible()
  expect((await db().from('job_posts').select('category, status, updated_at').eq('id', old.id).single()).data).toEqual(before)

  // The job form does not offer it, and a crafted submission is refused.
  const emp = await browser.newPage()
  await asFreshVisitor(emp)
  await emp.goto('/login')
  await emp.fill('#login-email', employer.user.email)
  await emp.fill('#login-password', employer.user.password)
  await emp.getByRole('button', { name: 'Sign in', exact: true }).click()
  await emp.waitForURL((u) => u.pathname.startsWith('/account') || u.pathname.startsWith('/onboarding'))
  await emp.goto('/account/jobs/new')
  await expect(emp.locator('#job-category option', { hasText: 'International placements' })).toHaveCount(0)
  await expect(emp.getByText('A city or area in Ethiopia', { exact: true })).toBeVisible()
  const title = `E2E P1 crafted overseas ${Date.now()}`
  await emp.getByLabel('Job title').fill(title)
  await emp.locator('#job-category').evaluate((el) => {
    const o = document.createElement('option')
    o.value = 'international-placements'
    o.textContent = 'International placements'
    el.appendChild(o)
  })
  await emp.locator('#job-category').selectOption('international-placements')
  await emp.getByLabel('Type of job').selectOption('full_time')
  await emp.locator('#job-location').fill('Bole')
  await emp.getByRole('option', { name: /^Bole/ }).first().click()
  await emp.getByLabel('Description').fill('Recruit masons for work on a site, with travel arranged by the employer.')
  await emp.getByRole('button', { name: 'Submit for review' }).click()
  await expect(emp.getByText('This category is not available at the moment. Choose another category.')).toBeVisible()
  expect((await db().from('job_posts').select('id').eq('title', title)).data ?? []).toHaveLength(0)
  await emp.close()

  // A crafted register sign-up with the category is refused.
  await page.goto('/jobs')
  const regEmail = uniqueEmail('p1-register')
  await page.locator('#jobs-reg-category').evaluate((el) => {
    const o = document.createElement('option')
    o.value = 'international-placements'
    o.textContent = 'International placements'
    el.appendChild(o)
  })
  await page.locator('#jobs-reg-category').selectOption('international-placements')
  await page.locator('#jobs-reg-name').fill('Crafted Register')
  await page.locator('#jobs-reg-email').fill(regEmail)
  await page.getByRole('button', { name: 'Join the register' }).click()
  await expect(page.getByText('Choose one of the listed options').first()).toBeVisible()
  expect((await db().from('interest_registrations').select('id').eq('email', regEmail)).data ?? []).toHaveLength(0)
  await db().from('organisations').delete().eq('id', employer.orgId)
})

test('J7: /jobs wording, and the recruitment licence line only once a number is entered', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(120_000)
  await page.goto('/jobs')
  await expect(page.getByText('Tell us the roles you need to fill. HagerLand finds, checks and introduces suitable candidates in Ethiopia. Fees are agreed with you in writing before we start.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hiring or job hunting from abroad?' })).toBeVisible()
  await expect(page.getByText('Employers abroad can post roles in Ethiopia, and candidates anywhere can search jobs in Ethiopia.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jobs in construction, engineering and property')
  await expect(page.getByText('Vacancies from employers in Ethiopia and abroad. Apply with your CV, or create a profile and choose whether employers can find you.')).toBeVisible()
  expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('Vacancies from construction, engineering, architecture, property and trades employers in Ethiopia and abroad. Apply with your CV on HagerLand.')
  expect(await page.content()).not.toContain('suitable candidates, in Ethiopia or abroad')

  const { data: before } = await db().from('site_settings').select('value').eq('key', 'licences').single()
  const setLicence = async (recruitment: Record<string, string> | null) => {
    const value = { ...((before?.value as Record<string, unknown>) ?? {}) }
    if (recruitment) value.recruitment = recruitment
    else delete value.recruitment
    await db().from('site_settings').update({ value }).eq('key', 'licences')
    // Saving in admin → Settings refreshes the cached pages (as AB does).
    await adminSession(page)
    await page.goto('/roodber8/settings')
    await page.locator('form').filter({ has: page.getByLabel('Estate agency: licence or approval number') }).getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Saved. The website updates within a minute.').first()).toBeVisible()
  }
  try {
    await setLicence(null)
    await page.goto('/jobs')
    await expect(page.getByTestId('licence-recruitment')).toHaveCount(0)
    expect(await page.locator('main').innerText()).not.toMatch(/Recruitment and placement licence|licence pending|pending licence/i)

    await setLicence({ number: 'RP-P1-9', authority: '', holder: '', date: '' })
    await page.goto('/jobs')
    await expect(page.getByTestId('licence-recruitment')).toHaveText('Recruitment and placement licence RP-P1-9.')
    await page.goto('/terms')
    await expect(page.getByText('Recruitment and placement licence RP-P1-9.')).toBeVisible()

    await setLicence({ number: 'RP-P1-9', authority: 'Ministry of Labour and Skills', holder: 'HagerLand PLC', date: '2026-10-01' })
    await page.goto('/jobs')
    await expect(page.getByTestId('licence-recruitment')).toHaveText(/^Recruitment and placement licence RP-P1-9, issued by Ministry of Labour and Skills, to HagerLand PLC, on 1 Oct 2026\.$/)
    await page.goto('/terms')
    await expect(page.getByText(/Recruitment and placement licence RP-P1-9, issued by Ministry of Labour and Skills, to HagerLand PLC, on 1 Oct 2026\./)).toBeVisible()
  } finally {
    await db().from('site_settings').update({ value: before!.value }).eq('key', 'licences')
    await page.goto('/roodber8/settings')
    await page.locator('form').filter({ has: page.getByLabel('Estate agency: licence or approval number') }).getByRole('button', { name: 'Save' }).click()
  }
})

test('J8: privacy and candidate profile wording', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByText(/^Last updated \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible()
  await expect(page.getByText('the employer receives your application and CV. CVs are never public. Your candidate profile is private unless you choose to make it visible to verified businesses and businesses that have had a job approved by HagerLand, and even then they see neither your contact details nor your CV.')).toBeVisible()
  await expect(page.getByText('CVs and other details sent with job applications (your name, contact details and cover note): deleted 12 months after the application. Your candidate profile and its CV: until you delete them.')).toBeVisible()
  expect(await page.content()).not.toContain('visible to approved employers')
  await page.goto('/terms')
  await expect(page.getByText(/^Last updated \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible()
  await page.goto('/cookies')
  await expect(page.getByText(/^Last updated \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible()

  await asFreshVisitor(page)
  const user = await createUser({ name: 'Profile Person' })
  await page.goto('/login?next=%2Faccount%2Fcandidate')
  await page.fill('#login-email', user.email)
  await page.fill('#login-password', user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/account/candidate')
  await expect(page.getByRole('radio', { name: /^Verified businesses and employers with an approved job/ })).toBeVisible()
  await expect(page.getByText('They see your first name, headline, skills, qualifications and experience. Never your contact details or CV: HagerLand asks you before any introduction.')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Approved employers/ })).toHaveCount(0)
})

test('phone width: no sideways scroll on the changed pages (plain 375 px window)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  await asFreshVisitor(page)
  const user = await createUser({ name: 'Narrow Person' })
  for (const p of ['/jobs', '/request-service/staffing', '/privacy']) {
    await page.goto(p)
    expect(await page.evaluate(() => document.documentElement.scrollWidth), p).toBeLessThanOrEqual(375)
  }
  await page.goto('/login?next=%2Faccount%2Fcandidate')
  await page.fill('#login-email', user.email)
  await page.fill('#login-password', user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/account/candidate')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await ctx.close()
})
