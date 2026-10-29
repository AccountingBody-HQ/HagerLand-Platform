import { expect, test, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { adminSession, asFreshVisitor, createProvider, createUser, db, mailWithSubject, randomPhone, signIn, uniqueEmail, submitStaffSignIn } from './helpers'

/** Jobs Phase 2 (migration 0040): AB's journeys J1–J8 on the local copy. Switches are flipped through the owner page. */

test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

async function setSwitch(page: Page, label: 'Apply by phone' | 'Worker register', on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const state = page.getByText(new RegExp(`^${label}: (On|Off)$`))
  const box = state.locator('..')
  if ((await state.textContent())?.endsWith(on ? 'On' : 'Off')) return
  if (on) await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  await expect(page.getByText(`${label === 'Apply by phone' ? 'Apply by phone' : 'The worker register'} is now ${on ? 'on' : 'off'} on the website.`)).toBeVisible()
}

/** F-5 (and S6-1's partner kinds): the keeping-period kinds run in the same daily run; this test's records are not among them. */
const NO_KEEPING_PERIOD_COUNTS = Object.fromEntries(['enquiries', 'service_requests', 'quote_requests', 'property_care', 'managed_properties', 'build_projects', 'partner_applications', 'claims', 'trade_accounts', 'supply_contacts', 'audit_log', 'partner_registrations', 'partner_drafts'].map((k) => [k, 0]))

async function setMode(page: Page, mode: 'dry_run' | 'live') {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  await page.locator('#jc-mode').selectOption(mode)
  if (mode === 'live' && (await page.locator('#jc-read').count())) await page.locator('#jc-read').check()
  const save = page.getByRole('button', { name: 'Save mode' })
  if (await save.isEnabled()) {
    await save.click()
    await expect(page.getByText(mode === 'live' ? 'Live: the next daily run deletes the personal details listed above, each after its own period.' : 'Dry run: the daily run only counts.')).toBeVisible()
  }
}

async function seedJob(orgId: string, title: string, extra: Record<string, unknown> = {}) {
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p2-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, employer_org_id: orgId, title, category: 'construction', employment_type: 'daily_labour', trade: 'mason', location_id: loc!.id, description: 'Block work on a G+2 house in Bole, six days a week, for the Phase 2 tests.', status: 'published', ...extra })
    .select('id, slug')
    .single()
  if (error || !data) throw new Error(`job seed failed: ${error?.message}`)
  return data
}

async function fillPhoneForm(page: Page, o: { name: string; local: string; code?: string; contact?: string; language?: string }) {
  const form = page.locator('form', { has: page.locator('#pa-name') })
  await form.locator('#pa-name').fill(o.name)
  if (o.code) await form.getByLabel('Country code').selectOption(o.code)
  await form.locator('#pa-phone').fill(o.local)
  await form.locator('#pa-trade').selectOption('mason')
  await form.locator('#pa-area').fill('Bole, Addis Ababa')
  await form.getByText(o.contact ?? 'WhatsApp', { exact: true }).click()
  await form.getByText(o.language ?? 'Afaan Oromo', { exact: true }).click()
  await form.getByLabel('I am 18 or older').check()
  await form.getByLabel(/^I agree that HagerLand shares my name, phone, trade and area/).check()
}

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}
async function staffSignIn(page: Page, role: 'operations' | 'agent' | 'content') {
  const email = uniqueEmail(`p2-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await page.context().clearCookies()
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
}

/** Calls a server action directly, as a crafted request would. */
async function callAction(page: Page, file: string, name: string, form: Record<string, string>, path = '/jobs') {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  // The encoding React uses for (previous state, form data): the form fields are sent as "1_<name>".
  const multipart: Record<string, string> = { '0': '[null,"$K1"]' }
  for (const [k, v] of Object.entries(form)) multipart[`1_${k}`] = v
  const res = await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component' }, multipart })
  return res.text()
}

let employer: Awaited<ReturnType<typeof createProvider>>
let job: { id: string; slug: string }
const jobTitle = `E2E P2 Masons ${Date.now()}`
const applicantName = `Abebe P2 ${Date.now()}`
let applicantPhone = ''

test.beforeAll(async () => {
  employer = await createProvider({ name: `E2E P2 Builders ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  job = await seedJob(employer.orgId, jobTitle)
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setSwitch(page, 'Apply by phone', false)
  await setSwitch(page, 'Worker register', false)
  await setMode(page, 'dry_run')
  await page.close()
})

test('J7: with both switches off (the live default) every door is closed; trades and daily labour still work', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await setSwitch(page, 'Apply by phone', false)
  await setSwitch(page, 'Worker register', false)
  await page.context().clearCookies()
  await page.goto(`/jobs/${job.slug}`)
  await expect(page.getByRole('link', { name: 'Apply now' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Apply by phone' })).toHaveCount(0)
  expect((await page.goto(`/jobs/${job.slug}/apply-by-phone`))?.status()).toBe(404)
  await page.goto('/jobs')
  await expect(page.getByRole('heading', { name: 'Find work by trade' })).toBeVisible()
  await expect(page.getByRole('heading', { name: "Looking for work? Tell us you're available" })).toHaveCount(0)
  expect(await page.content()).not.toContain('apply-by-phone')
  const sitemap = await (await page.request.get('/sitemap/jobs.xml')).text()
  expect(sitemap).not.toContain('apply-by-phone')
  // Crafted calls to the server actions are refused and store nothing.
  const phone = randomPhone()
  const res = await callAction(page, 'job-phone-actions', 'applyByPhoneAction', { job_id: job.id, name: 'Crafted Caller', phone, trade: 'mason', area: 'Bole', preferred_contact: 'call', language: 'am', adult: 'on', consent: 'on' })
  expect(res).toContain('Something went wrong. Please refresh the page.')
  const reg = await callAction(page, 'job-phone-actions', 'joinWorkerRegisterAction', { name: 'Crafted Caller', phone, trades: 'mason', area: 'Bole', availability: 'now', preferred_contact: 'call', language: 'am', adult: 'on', consent: 'on' })
  expect(reg).toContain('Something went wrong. Please refresh the page.')
  expect((await db().from('job_applications').select('id').eq('phone', phone)).data ?? []).toHaveLength(0)
  expect((await db().from('worker_register').select('id').eq('phone', phone)).data ?? []).toHaveLength(0)
  // Trades and daily labour work whatever the switches say.
  // A search unique to this job, so the job board's 5-minute cache cannot hide a job seeded a moment ago.
  await page.goto(`/jobs?trade=mason&type=daily_labour&q=${jobTitle.split(' ').pop()}`)
  await expect(page.getByRole('link', { name: jobTitle })).toBeVisible()
})

test('J1: a worker applies by phone; duplicates, closed jobs, limits, missing ticks and the honeypot are handled', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await setSwitch(page, 'Apply by phone', true)
  await page.context().clearCookies()
  await asFreshVisitor(page)
  await page.goto(`/jobs/${job.slug}`)
  await expect(page.getByText('Trade: Mason')).toBeVisible()
  await expect(page.getByText('Daily labour').first()).toBeVisible()
  await page.getByRole('link', { name: 'Apply by phone' }).click()
  await page.waitForURL(`**/jobs/${job.slug}/apply-by-phone`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Apply by phone')
  await expect(page.getByText('No account or email needed. If the employer wants to talk, they will contact you on this number.')).toBeVisible()
  await expect(page.getByText('Never pay anyone to get a job.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'See our Privacy Policy.' })).toHaveAttribute('href', '/privacy')
  const local = randomPhone().replace('+251', '0')
  applicantPhone = `+251${local.slice(1)}`
  await fillPhoneForm(page, { name: applicantName, local })
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByRole('heading', { name: 'Application sent' })).toBeVisible()
  const ref = (await page.getByText(/^Your reference is HLA-/).textContent())?.match(/HLA-\d{4}-\d{6}/)?.[0]
  expect(ref).toBeTruthy()
  await expect(page.getByText(`Your reference is ${ref}. Keep it in case you need to contact HagerLand. The employer will contact you if they want to talk.`)).toBeVisible()
  const { data: row } = await db().from('job_applications').select('*').eq('reference', ref!).single()
  expect(row).toMatchObject({ channel: 'phone', applicant_user_id: null, email: null, phone: applicantPhone, trade: 'mason', area_text: 'Bole, Addis Ababa', preferred_contact: 'whatsapp', language: 'om', name: applicantName })
  expect(row.adult_confirmed_at).not.toBeNull()
  expect(row.consent_at).not.toBeNull()
  const mail = await mailWithSubject(employer.user.email, ref!)
  expect(mail.subject).toContain('New application for')
  expect(mail.text).toContain(`${applicantName} applied for "`)
  expect(mail.text).toContain('" by phone. Open the application to see how to contact them.')
  expect((await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${applicantPhone}"`)}`).then((r) => r.json())).messages ?? []).toHaveLength(0)

  // The same phone again for the same job.
  await page.goto(`/jobs/${job.slug}/apply-by-phone`)
  await fillPhoneForm(page, { name: applicantName, local })
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByText("We couldn't send this application. If you've already applied for this job with this phone number, you don't need to apply again.")).toBeVisible()

  // A foreign number written with its country code is accepted.
  await page.goto(`/jobs/${job.slug}/apply-by-phone`)
  await fillPhoneForm(page, { name: 'Selam Abroad', local: `7700${Math.floor(100000 + Math.random() * 899999)}`, code: '+44', contact: 'Phone call', language: 'English' })
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByRole('heading', { name: 'Application sent' })).toBeVisible()

  // A missing tick (the browser check removed, as a crafted page would) is refused with the highlighted fields.
  await page.goto(`/jobs/${job.slug}/apply-by-phone`)
  await fillPhoneForm(page, { name: 'No Tick', local: randomPhone().replace('+251', '0') })
  await page.getByLabel('I am 18 or older').uncheck()
  await page.locator('#pa-adult').evaluate((el) => el.removeAttribute('required'))
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByText('Please check the highlighted fields.')).toBeVisible()
  expect((await db().from('job_applications').select('id').eq('name', 'No Tick')).data ?? []).toHaveLength(0)

  // Honeypot: looks sent, nothing stored.
  await page.goto(`/jobs/${job.slug}/apply-by-phone`)
  await fillPhoneForm(page, { name: 'Bot Filler', local: randomPhone().replace('+251', '0') })
  await page.locator('input[name="hl_extra_field"]').evaluate((el: HTMLInputElement) => (el.value = 'spam'))
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByRole('heading', { name: 'Application sent' })).toBeVisible()
  expect((await db().from('job_applications').select('id').eq('name', 'Bot Filler')).data ?? []).toHaveLength(0)

  // A job that closes while the form is open.
  const closing = await seedJob(employer.orgId, `E2E P2 Closing ${Date.now()}`)
  await page.goto(`/jobs/${closing.slug}/apply-by-phone`)
  await fillPhoneForm(page, { name: 'Late Applicant', local: randomPhone().replace('+251', '0') })
  await db().from('job_posts').update({ status: 'archived' }).eq('id', closing.id)
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByText('This job is no longer open.')).toBeVisible()

  // Too many from one visitor: five an hour.
  const busy = await browser.newPage()
  await asFreshVisitor(busy)
  for (let i = 0; i < 6; i++) {
    await busy.goto(`/jobs/${job.slug}/apply-by-phone`)
    await fillPhoneForm(busy, { name: `Busy Worker ${i}`, local: randomPhone().replace('+251', '0') })
    await busy.getByRole('button', { name: 'Send my application' }).click()
    if (i < 5) await expect(busy.getByRole('heading', { name: 'Application sent' })).toBeVisible()
    else await expect(busy.getByText('You have sent several applications recently. Please try again later.')).toBeVisible()
  }
  await busy.close()
})

test('J2: the employer sees the phone application with the contact buttons; nobody else can', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await signIn(page, employer.user.email, employer.user.password)
  await page.goto(`/account/jobs/${job.id}`)
  const card = page.locator('li', { hasText: applicantName })
  await expect(card.getByText('By phone')).toBeVisible()
  await expect(card.getByRole('link')).toHaveText(['WhatsApp', 'Call', 'Telegram', 'SMS'])
  await expect(card.getByRole('link', { name: 'Call' })).toHaveAttribute('href', `tel:${applicantPhone}`)
  await expect(card.getByRole('link', { name: 'SMS' })).toHaveAttribute('href', `sms:${applicantPhone}`)
  await expect(card.getByText('Download CV')).toHaveCount(0)
  await card.locator('select[name="status"]').selectOption('shortlisted')
  await card.locator('textarea[name="employer_notes"]').fill('Call on Monday')
  await card.getByRole('button', { name: 'Update' }).click()
  await expect.poll(async () => (await db().from('job_applications').select('status, employer_notes').eq('phone', applicantPhone).eq('job_id', job.id).single()).data).toEqual({ status: 'shortlisted', employer_notes: 'Call on Monday' })

  // Another employer and a random signed-in user: no page, and the database refuses them directly.
  const other = await createProvider({ name: `E2E P2 Other ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const stranger = await createUser({ name: 'Random Person' })
  for (const who of [other.user, stranger]) {
    const p = await browser.newPage()
    await signIn(p, who.email, who.password)
    expect((await p.goto(`/account/jobs/${job.id}`))?.status()).toBe(404)
    const client = createClient(URL_, ANON, { auth: { persistSession: false } })
    await client.auth.signInWithPassword({ email: who.email, password: who.password })
    expect((await client.from('job_applications').select('id, phone').eq('job_id', job.id)).data ?? []).toHaveLength(0)
    expect((await client.from('job_applications').select('id').is('applicant_user_id', null)).data ?? []).toHaveLength(0)
    const reg = await client.from('worker_register').select('id')
    expect(reg.error ?? (reg.data ?? []).length === 0).toBeTruthy()
    const log = await client.from('job_data_cleanup_runs').select('id')
    expect(log.error ?? (log.data ?? []).length === 0).toBeTruthy()
    const upd = await client.from('job_applications').update({ phone: '+251900000000' }).eq('job_id', job.id).select('id')
    expect((upd.data ?? []).length).toBe(0)
    await p.close()
  }
  // Visitors (no sign-in): no rows anywhere.
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  for (const table of ['job_applications', 'worker_register', 'job_data_cleanup_runs', 'candidates_for_employers'] as const) {
    const r = await anon.from(table).select('*').limit(1)
    expect(r.error ?? (r.data ?? []).length === 0, table).toBeTruthy()
  }
  await db().from('organisations').delete().eq('id', other.orgId)
})

test('J3: a worker joins the register (and again); only Owner and Operations see it', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await setSwitch(page, 'Worker register', true)
  await page.context().clearCookies()
  await asFreshVisitor(page)
  const name = `Tigist Register ${Date.now()}`
  const local = randomPhone().replace('+251', '0')
  const phone = `+251${local.slice(1)}`
  const join = async () => {
    await page.goto('/jobs')
    await expect(page.getByRole('heading', { name: "Looking for work? Tell us you're available" })).toBeVisible()
    await expect(page.getByText('Leave your phone number and trade. HagerLand may call you about suitable work. No account or email needed.')).toBeVisible()
    const form = page.locator('#worker-register')
    await form.locator('#wr-name').fill(name)
    await form.locator('#wr-phone').fill(local)
    await form.getByLabel('Tiler', { exact: true }).check()
    await form.getByLabel('Mason', { exact: true }).check()
    await form.locator('#wr-area').fill('Kolfe Keranio')
    await form.getByText('Within a month', { exact: true }).click()
    await form.getByText('Telegram', { exact: true }).click()
    await form.getByText('Tigrinya', { exact: true }).click()
    await form.getByLabel('I am 18 or older').check()
    await form.getByLabel(/^I agree that HagerLand keeps my details to contact me about work/).check()
    await form.getByRole('button', { name: 'Join the register' }).click()
    const done = form.getByText(/^Thank you\. You're on the register\. Your reference is HLW-\d{4}-\d{6}\.$/)
    await expect(done).toBeVisible()
    return (await done.textContent())?.match(/HLW-\d{4}-\d{6}/)?.[0]
  }
  const first = await join()
  const { data: a } = await db().from('worker_register').select('*').eq('phone', phone).single()
  expect(a).toMatchObject({ name, trades: ['mason', 'tiler'], area_text: 'Kolfe Keranio', availability: 'within_month', preferred_contact: 'telegram', language: 'ti', reference: first })
  await page.waitForTimeout(1100)
  const second = await join()
  const { data: rows } = await db().from('worker_register').select('id, reference, last_updated_at').eq('phone', phone)
  expect(rows).toHaveLength(1)
  expect(rows![0].reference).toBe(second)
  expect(new Date(rows![0].last_updated_at).getTime()).toBeGreaterThan(new Date(a!.last_updated_at).getTime())
  expect(second).not.toBe(first)
  expect(await page.content()).not.toContain(phone)

  // Owner and Operations see it; Agent and Content are refused; a customer account has no admin access.
  await adminSession(page)
  await page.goto('/roodber8/jobs/register')
  await expect(page.getByText(`${name} · ${second}`)).toBeVisible()
  await staffSignIn(page, 'operations')
  await page.goto('/roodber8/jobs/register')
  await expect(page.getByText(`${name} · ${second}`)).toBeVisible()
  expect((await page.goto('/roodber8/jobs/data'))?.url()).toContain('denied=1')
  for (const role of ['agent', 'content'] as const) {
    await staffSignIn(page, role)
    await page.goto('/roodber8/jobs/register')
    await expect(page).toHaveURL(/\/roodber8\?denied=1$/)
  }
  const customer = await browser.newPage()
  await signIn(customer, employer.user.email, employer.user.password)
  await customer.goto('/roodber8/jobs/register')
  await expect(customer).toHaveURL(/\/roodber8-login/)
  await customer.close()
})

test('J4: an employer posts a job with a trade and "Daily labour" (and one without); filters and shortcuts find it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const stamp = Date.now()
  await signIn(page, employer.user.email, employer.user.password)
  const post = async (title: string, trade: string | null) => {
    await page.goto('/account/jobs/new')
    await page.getByLabel('Job title').fill(title)
    await page.getByLabel('Category').selectOption('construction')
    await page.getByLabel('Type of job').selectOption('daily_labour')
    if (trade) await page.locator('#job-trade').selectOption(trade)
    await page.locator('#job-location').fill('Bole')
    await page.getByRole('option', { name: /^Bole/ }).first().click()
    await page.getByLabel('Description').fill('Plaster work on a G+1 house in Bole for two weeks, start Monday.')
    await page.getByRole('button', { name: 'Submit for review' }).click()
    await expect(page.getByText('Sent to HagerLand for review')).toBeVisible()
    return (await db().from('job_posts').select('id, slug, trade, employment_type').eq('title', title).single()).data!
  }
  const withTrade = await post(`E2E P2 Plasterers ${stamp}`, 'plasterer')
  const without = await post(`E2E P2 Helpers ${stamp}`, null)
  expect(withTrade).toMatchObject({ trade: 'plasterer', employment_type: 'daily_labour' })
  expect(without.trade).toBeNull()
  await adminSession(page)
  for (const j of [withTrade, without]) {
    await page.goto(`/roodber8/jobs/${j.id}`)
    await page.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByText('Job approved and live.')).toBeVisible()
  }
  await page.context().clearCookies()
  await page.goto('/jobs')
  await page.locator('#by-trade').locator('..').getByRole('link', { name: 'Plasterer', exact: true }).click()
  await page.waitForURL('**/jobs?trade=plasterer')
  await expect(page.getByRole('link', { name: `E2E P2 Plasterers ${stamp}` })).toBeVisible()
  await expect(page.getByRole('link', { name: `E2E P2 Helpers ${stamp}` })).toHaveCount(0)
  await page.locator('#j-trade').selectOption('')
  await page.locator('#j-type').selectOption('daily_labour')
  await page.getByRole('button', { name: 'Search jobs' }).click()
  await expect(page.getByRole('link', { name: `E2E P2 Plasterers ${stamp}` })).toBeVisible()
  await expect(page.getByRole('link', { name: `E2E P2 Helpers ${stamp}` })).toBeVisible()
  await expect(page.locator('#j-trade option').first()).toHaveText('Any trade')
  await page.goto(`/jobs/${withTrade.slug}`)
  await expect(page.getByText('Trade: Plasterer')).toBeVisible()
  await expect(page.getByText('Daily labour').first()).toBeVisible()
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('')
  expect(ld).toContain('"employmentType":"PER_DIEM"')
  await page.goto(`/jobs/${without.slug}`)
  await expect(page.getByText(/^Trade:/)).toHaveCount(0)
})

test('J5: only verified businesses, or ones with an approved job not removed by HagerLand, see candidate profiles', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const cand = await createUser({ name: 'Visible Candidate' })
  await db().from('candidate_profiles').insert({ user_id: cand.id, full_name: 'Meron Visible', headline: `E2E P2 visible site engineer ${Date.now()}`, skills: ['concrete'], visibility: 'employers', availability: 'immediately' })
  const profileOnly = await createProvider({ name: `E2E P2 Profile only ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const verified = await createProvider({ name: `E2E P2 Verified ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole', verified: true })
  const approved = await createProvider({ name: `E2E P2 Approved job ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const removed = await createProvider({ name: `E2E P2 Removed job ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  await seedJob(approved.orgId, `E2E P2 approved ${Date.now()}`, { status: 'archived', published_at: new Date(Date.now() - 20 * DAY).toISOString() })
  const gone = await seedJob(removed.orgId, `E2E P2 removed ${Date.now()}`)
  await db().from('job_posts').update({ status: 'removed' }).eq('id', gone.id)
  const check = async (who: typeof profileOnly, sees: boolean) => {
    const p = await browser.newPage()
    await signIn(p, who.user.email, who.user.password)
    await p.goto('/account/jobs/candidates')
    if (sees) {
      await expect(p.getByText('Meron').first()).toBeVisible()
      expect(await p.content()).not.toContain(cand.email)
    } else await expect(p.getByText('Candidate profiles are open to verified businesses and businesses that have had a job approved by HagerLand. Post a job or ask us to verify your business.')).toBeVisible()
    const client = createClient(URL_, ANON, { auth: { persistSession: false } })
    await client.auth.signInWithPassword({ email: who.user.email, password: who.user.password })
    const { data } = await client.from('candidates_for_employers').select('*').eq('candidate_id', cand.id)
    expect((data ?? []).length, who.orgSlug).toBe(sees ? 1 : 0)
    if (sees) expect(Object.keys(data![0]).sort()).not.toEqual(expect.arrayContaining(['email', 'phone', 'cv_path']))
    await p.close()
  }
  await check(profileOnly, false)
  await check(verified, true)
  await check(approved, true)
  await check(removed, false)
  const before = (await db().from('candidate_profiles').select('*').eq('user_id', cand.id).single()).data
  expect(before?.visibility).toBe('employers')
  await db().from('candidate_profiles').delete().eq('user_id', cand.id)
  for (const o of [profileOnly, verified, approved, removed]) await db().from('organisations').delete().eq('id', o.orgId)
})

test('J6: the 12-month deletion: dry run changes nothing; live clears exactly the personal details', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  const old = new Date(Date.now() - 400 * DAY).toISOString()
  const recent = new Date(Date.now() - 300 * DAY).toISOString()
  const owner = await createUser({ name: 'Old Applicant' })
  const keeper = await createUser({ name: 'Profile Keeper' })
  const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')
  const cvGone = `docs/cv/${owner.id}/old.pdf`
  const cvKept = `docs/cv/${keeper.id}/kept.pdf`
  await db().storage.from('private-docs').upload(cvGone, PDF, { contentType: 'application/pdf' })
  await db().storage.from('private-docs').upload(cvKept, PDF, { contentType: 'application/pdf' })
  await db().from('candidate_profiles').insert({ user_id: keeper.id, full_name: 'Profile Keeper', cv_path: cvKept, visibility: 'private' })
  const ins = async (row: Record<string, unknown>) => (await db().from('job_applications').insert({ job_id: job.id, ...row }).select('id').single()).data!.id as string
  const aOld = await ins({ applicant_user_id: owner.id, name: 'Old Email Applicant', email: owner.email, phone: randomPhone(), cover_note: 'Five years of block work.', cv_path: cvGone, employer_notes: 'Good', created_at: old })
  const aKept = await ins({ applicant_user_id: keeper.id, name: 'Kept CV Applicant', email: keeper.email, cv_path: cvKept, created_at: old })
  const aPhone = await ins({ applicant_user_id: null, channel: 'phone', name: 'Old Phone Applicant', phone: randomPhone(), trade: 'mason', area_text: 'Bole', preferred_contact: 'call', language: 'am', adult_confirmed_at: old, consent_at: old, created_at: old })
  const aRecent = await ins({ applicant_user_id: null, channel: 'phone', name: 'Recent Phone Applicant', phone: randomPhone(), trade: 'mason', area_text: 'Bole', preferred_contact: 'call', language: 'am', adult_confirmed_at: recent, consent_at: recent, created_at: recent })
  const { data: w } = await db().from('worker_register').insert({ name: 'Old Register Worker', phone: randomPhone(), trades: ['mason'], area_text: 'Bole', availability: 'now', preferred_contact: 'call', language: 'am', adult_confirmed_at: old, consent_at: old, last_updated_at: old, admin_notes: 'Called once' }).select('id').single()
  const { data: e } = await db().from('email_outbox').insert({ to_addresses: ['employer@example.invalid'], subject: 'New application for Mason', html: '<p>Old Email Applicant applied</p>', text_body: 'Old Email Applicant applied', status: 'failed', created_at: old }).select('id').single()
  const snapshot = async () => ({
    apps: (await db().from('job_applications').select('*').in('id', [aOld, aKept, aPhone, aRecent]).order('id')).data,
    reg: (await db().from('worker_register').select('*').eq('id', w!.id).single()).data,
    mail: (await db().from('email_outbox').select('*').eq('id', e!.id).single()).data,
    profile: (await db().from('candidate_profiles').select('*').eq('user_id', keeper.id).single()).data,
  })
  const cron = async () => (await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()) as { jobsDataCleanup: { mode: string; counts: { due: Record<string, number>; cleared: Record<string, number>; failed: Record<string, number> } } }

  await setMode(page, 'dry_run')
  const before = await snapshot()
  // The CV clean-up from Phase 1 (lib/cron/daily.ts, purgeApplicationCvs) already deletes CVs after 12 months whatever
  // the mode, so the CV columns (and the update time) are left out when proving the dry run changed nothing else.
  const withoutCv = (x: Awaited<ReturnType<typeof snapshot>>) => ({ ...x, apps: (x.apps ?? []).map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => !['cv_path', 'cv_purged_at', 'updated_at'].includes(k)))) })
  const dry = await cron()
  expect(dry.jobsDataCleanup.mode).toBe('dry_run')
  expect(dry.jobsDataCleanup.counts.due.applications).toBeGreaterThanOrEqual(3)
  expect(dry.jobsDataCleanup.counts.due.register).toBeGreaterThanOrEqual(1)
  expect(dry.jobsDataCleanup.counts.due.emails).toBeGreaterThanOrEqual(1)
  expect(dry.jobsDataCleanup.counts.cleared).toEqual({ applications: 0, register: 0, emails: 0, shortlist: 0, reports: 0, callbacks: 0, listing_reports: 0, ...NO_KEEPING_PERIOD_COUNTS })
  expect(withoutCv(await snapshot())).toEqual(withoutCv(before))
  const files = async (folder: string) => ((await db().storage.from('private-docs').list(folder)).data ?? []).map((f) => f.name)
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  await expect(page.getByRole('region', { name: 'Deletion runs' }).getByText(/job applications would be cleared/).first()).toBeVisible()
  const digest = await mailWithSubject('admin@test.hagerland.invalid', 'HagerLand daily digest')
  expect(digest.text).toContain('Jobs data (dry run): job applications whose personal details would be deleted')

  await setMode(page, 'live')
  const live = await cron()
  expect(live.jobsDataCleanup.mode).toBe('live')
  expect(live.jobsDataCleanup.counts.failed).toEqual({ applications: 0, register: 0, emails: 0, shortlist: 0, reports: 0, callbacks: 0, listing_reports: 0, ...NO_KEEPING_PERIOD_COUNTS })
  const after = await snapshot()
  const byId = (id: string) => after.apps!.find((a) => a.id === id)!
  for (const id of [aOld, aKept, aPhone]) {
    expect(byId(id)).toMatchObject({ name: 'Removed', email: null, phone: null, cover_note: null, employer_notes: null, area_text: null, preferred_contact: null, language: null, cv_path: null })
    expect(byId(id).personal_data_deleted_at).not.toBeNull()
  }
  // Kept: the row, reference, job, status, channel, trade, dates and the link to the candidate's own account.
  expect(byId(aOld)).toMatchObject({ reference: before.apps!.find((a) => a.id === aOld)!.reference, job_id: job.id, status: 'submitted', channel: 'account', applicant_user_id: owner.id, created_at: before.apps!.find((a) => a.id === aOld)!.created_at })
  expect(byId(aPhone)).toMatchObject({ channel: 'phone', trade: 'mason' })
  expect(byId(aRecent)).toEqual(before.apps!.find((a) => a.id === aRecent))
  expect(byId(aRecent).personal_data_deleted_at).toBeNull()
  expect(await files(`docs/cv/${owner.id}`)).not.toContain('old.pdf')
  expect(await files(`docs/cv/${keeper.id}`)).toContain('kept.pdf')
  expect(after.profile).toEqual(before.profile)
  expect(after.reg).toMatchObject({ name: null, phone: null, area_text: null, admin_notes: null, preferred_contact: null, language: null, reference: before.reg!.reference, trades: ['mason'] })
  expect(after.mail).toMatchObject({ subject: '(removed after 12 months)', html: '', text_body: '', status: 'gave_up' })
  await page.goto('/roodber8/jobs/data')
  await expect(page.getByRole('region', { name: 'Deletion runs' }).getByText(/job applications cleared/).first()).toBeVisible()
  await page.goto(`/roodber8/jobs/${job.id}`)
  await expect(page.getByText(/^Details deleted/).first()).toBeVisible()
  await setMode(page, 'dry_run')
})

test('J8 and exclusions: no applicant or register details on any public page; the email "Apply now" and other services unchanged', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await page.context().clearCookies()
  for (const path of ['/jobs', `/jobs/${job.slug}`, '/sitemap.xml', '/sitemap/jobs.xml', '/search?q=mason', '/privacy']) {
    const html = await (await page.request.get(path)).text()
    for (const secret of [applicantName, applicantPhone, applicantPhone.replace('+251', '0'), 'Tigist Register', 'Call on Monday']) expect(html, `${secret} on ${path}`).not.toContain(secret)
  }
  await page.goto('/privacy')
  await expect(page.getByText(/^Last updated \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible()
  await expect(page.getByText('…visible to verified businesses'.slice(1))).toBeVisible()
  await expect(page.getByText('If you apply by phone or join the worker register: your name, phone, trade, area, preferred language, how you want to be contacted, and that you confirmed you are 18 or older.')).toBeVisible()
  await expect(page.getByText('Worker register: deleted 12 months after you last updated it.')).toBeVisible()
  await page.goto('/request-service/plumbers')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request plumbers')
  await page.goto(`/jobs/${job.slug}/apply`)
  await expect(page).toHaveURL(/\/login\?next=/)
})

test('plain 375 px window: phone form, register, /jobs and the employer view have no sideways scroll', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'switches are set through the desktop admin')
  const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setSwitch(admin, 'Apply by phone', true)
  await setSwitch(admin, 'Worker register', true)
  await admin.close()
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  for (const path of ['/jobs', `/jobs/${job.slug}/apply-by-phone`]) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(375)
  }
  await page.goto('/jobs#worker-register')
  await expect(page.locator('#wr-name')).toBeVisible()
  await signIn(page, employer.user.email, employer.user.password)
  await page.goto(`/account/jobs/${job.id}`)
  await expect(page.getByText('By phone').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await ctx.close()
})
