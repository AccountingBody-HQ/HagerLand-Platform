import { expect, test, type Browser, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, createProvider, createUser, db, randomPhone, signIn, uniqueEmail, submitStaffSignIn } from './helpers'

/**
 * Jobs Phase 6 (migration 0044): AB's journeys J1–J19 on the local copy only. Insights, the owner's Jobs report, open
 * jobs on company pages, /jobs?company=, the Jobs ↔ Supplies signals, the project hiring line, the digest lines, and
 * the honest "who changed it" in the job status history. Run right after a fresh local copy (J9 checks the whole fee
 * ledger reconciles).
 */

test.describe.configure({ mode: 'serial' })
assertLocalStack()

const DAY = 86_400_000
const stamp = Date.now()
const W3 = (c: string) => `Jobs at ${c}, approved by HagerLand before they went live. Apply on each job's page.`
const W10 = 'How jobs move from posting to closing, where applications come from, what nobody is applying for yet, reports, call-backs and the recruitment desk. Counts only: no names or contact details, and no money.'
const W7 = "Need workers for this project? Ask HagerLand's recruitment team to help you find them."
const W26 = 'Recruitment fees are kept in their own record and are not in "Revenue": see the Jobs report.'
const PC_LABEL = 'Posted by HagerLand for a private client'
const day = (offset: number) => new Date(Date.now() + offset * DAY + 3 * 3_600_000).toISOString().slice(0, 10)

/** SQL on the LOCAL copy only (assertLocalStack above refuses anything else). */
function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}

function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`p6-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}

/** Calls a server action directly, as the page's own button would (plain arguments). */
async function callAction(page: Page, file: string, name: string, args: unknown[], path = '/roodber8'): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  const res = await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args), maxRedirects: 0 })
  return `${res.status()} ${await res.text()}`
}

async function setSwitch(page: Page, label: 'Private-client jobs', on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const state = page.getByText(new RegExp(`^${label}: (On|Off)$`))
  if ((await state.textContent())?.endsWith(on ? 'On' : 'Off')) return
  const box = state.locator('..')
  if (on && (await box.getByRole('checkbox').count())) await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  await expect(page.getByText(`${label} is now ${on ? 'on' : 'off'} on the website.`)).toBeVisible()
}

const cron = async (page: Page) => (await page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()

/** "from>to:actor" for every history row of a job, sorted. */
async function trail(jobId: string): Promise<string[]> {
  const { data } = await db().from('job_status_events').select('from_status, to_status, actor_kind').eq('job_post_id', jobId)
  return (data ?? []).map((e) => `${e.from_status ?? '-'}>${e.to_status}:${e.actor_kind}`).sort()
}

let bole = ''
/** A job sent for review straight in the database (the history says "server"), then approved by staff through the real action. */
async function seedApprovedJob(page: Page, orgId: string, title: string, trade: string | null = null): Promise<{ id: string; slug: string }> {
  const { data, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p6-${stamp}-${Math.random().toString(36).slice(2, 8)}`, employer_org_id: orgId, title, category: 'construction', employment_type: 'full_time', trade, location_id: bole, description: 'A test job for the Jobs Phase 6 journeys, long enough to pass.', status: 'pending_review' })
    .select('id, slug')
    .single()
  if (error || !data) throw new Error(`job seed failed: ${error?.message}`)
  await adminSession(page)
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [data.id, true])).toContain('Job approved and live.')
  return data
}

let employer: Awaited<ReturnType<typeof createProvider>>
let empName = ''
const jobs: { id: string; slug: string }[] = []
let fees: { etb: { placement: string; reference: string; terms: string }; usd: { placement: string; reference: string; terms: string } }
const workerName = `E2E P6 Worker Abebe ${stamp}`

/** A hired placement with fee terms (owner money) on a desk assignment for the employer. */
async function seedPlacement(currency: 'ETB' | 'USD'): Promise<{ placement: string; reference: string; terms: string }> {
  const d = db()
  const { data: cat } = await d.from('service_categories').select('id').eq('slug', 'staffing').single()
  const { data: req } = await d.from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: `E2E P6 staffing ${currency} ${stamp}`, details: 'Masons.', name: 'E2E P6 Employer', phone: randomPhone(), email: uniqueEmail('p6-req'), location_id: bole }).select('id').single()
  const { data: a } = await d.from('recruitment_assignments').insert({ service_request_id: req!.id, employer_org_id: employer.orgId, created_by: 'e2e' }).select('id').single()
  const now = new Date().toISOString()
  const { data: c, error: ce } = await d
    .from('recruitment_candidates')
    .insert({ assignment_id: a!.id, source: 'manual', name: workerName, phone: randomPhone(), trade: 'mason', created_by: 'e2e', status: 'hired', consent_at: now, consent_method: 'phone_call', consent_recorded_by: 'e2e', share_phone: true, adult_confirmed_at: now, adult_confirmed_method: 'phone_call', adult_confirmed_by: 'e2e', introduced_at: now, introduced_by: 'e2e' })
    .select('id')
    .single()
  if (ce) throw new Error(ce.message)
  const { data: p, error: pe } = await d.from('recruitment_placements').insert({ candidate_id: c!.id, assignment_id: a!.id, role_type: 'trade', trade: 'mason', start_date: day(-45), guarantee_days: 30, created_by: 'e2e' }).select('id, reference').single()
  if (pe) throw new Error(pe.message)
  const { data: t, error: te } = await d.from('recruitment_fee_terms').insert({ placement_id: p!.id, fee_type: 'fixed', currency, amount_minor: currency === 'ETB' ? 5_000_000 : 120_000, agreed_in_writing_on: day(-44), status: 'agreed', created_by: 'e2e' }).select('id').single()
  if (te) throw new Error(te.message)
  return { placement: p!.id, reference: p!.reference, terms: t!.id }
}
async function feeEntry(terms: string, type: string, amount: number, currency: string, on: string, reverses: string | null = null): Promise<string> {
  const { data, error } = await db()
    .from('recruitment_fee_entries')
    .insert({ fee_terms_id: terms, entry_type: type, amount_minor: amount, currency, occurred_on: on, reverses_entry_id: reverses, method: type === 'fee_received' ? 'bank_transfer' : null, reason: type === 'reversal' || type === 'waived' ? 'e2e' : null, created_by: 'e2e' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data!.id
}

test.beforeAll(async () => {
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  bole = loc!.id
  empName = `E2E P6 Hiring Builders ${stamp}`
  employer = await createProvider({ name: empName, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const etb = await seedPlacement('ETB')
  const usd = await seedPlacement('USD')
  fees = { etb, usd }
  // ETB 50,000 due 40 days ago, 20,000 received; USD 1,200 due 10 days ago.
  await feeEntry(etb.terms, 'fee_due', 5_000_000, 'ETB', day(-40))
  await feeEntry(etb.terms, 'fee_received', 2_000_000, 'ETB', day(-20))
  await feeEntry(usd.terms, 'fee_due', 120_000, 'USD', day(-10))
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setSwitch(page, 'Private-client jobs', false)
  await page.close()
  psql(`update public.site_settings set value = '"dry_run"'::jsonb where key = 'jobs_data_cleanup_mode'`)
})

test('J1: an employer posts a job, staff approve it, the history records who did what, and the company page shows it', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const title = `E2E P6 Site foreman ${stamp}`
  const emp = await browser.newPage()
  await signIn(emp, employer.user.email, employer.user.password)
  await emp.goto('/account/jobs/new')
  await emp.getByLabel('Job title').fill(title)
  await emp.getByLabel('Category').selectOption('construction')
  await emp.getByLabel('Type of job').selectOption('full_time')
  await emp.locator('#job-location').fill('Bole')
  await emp.getByRole('option', { name: /^Bole/ }).first().click()
  await emp.getByLabel('Description').fill('Lead a team of masons on a G+4 building in Bole, six days a week.')
  await emp.getByRole('button', { name: 'Submit for review' }).click()
  await expect(emp.getByText('Sent to HagerLand for review')).toBeVisible()
  const { data: job } = await db().from('job_posts').select('id, slug').eq('title', title).single()
  await adminSession(page)
  await page.goto(`/roodber8/jobs/${job!.id}`)
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', job!.id).single()).data?.status).toBe('published')
  expect(await trail(job!.id)).toEqual(['->pending_review:employer', 'pending_review>published:staff'])
  jobs.push(job!)

  await page.context().clearCookies()
  await page.goto(`/company/${employer.orgSlug}`)
  await expect(page.getByRole('heading', { name: 'Open jobs (1)' })).toBeVisible()
  await expect(page.getByText(W3(empName))).toBeVisible()
  await expect(page.locator('#jobs').getByRole('link', { name: title })).toBeVisible()
  // The card leaves out the employer line (the page is the employer's own).
  await expect(page.locator('#jobs article')).not.toContainText(empName)
  await expect(page.getByRole('navigation', { name: 'Profile sections' }).getByRole('link', { name: 'Jobs' })).toBeVisible()
  // No JobPosting data on the company page; the board still lists the job with its employer.
  expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('')).not.toContain('JobPosting')
  await page.goto(`/jobs?q=${encodeURIComponent(title)}`)
  await expect(page.locator('article', { hasText: title })).toContainText(empName)
  await emp.close()
})

test('J2: seven open jobs show six and "See all 7 jobs", which opens /jobs?company= (noindex)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  for (let i = 2; i <= 7; i++) jobs.push(await seedApprovedJob(page, employer.orgId, `E2E P6 Job ${i} ${stamp}`, i % 2 ? 'mason' : 'carpenter'))
  await page.context().clearCookies()
  await page.goto(`/company/${employer.orgSlug}`)
  await expect(page.getByRole('heading', { name: 'Open jobs (7)' })).toBeVisible()
  await expect(page.locator('#jobs article')).toHaveCount(6)
  // Newest approved first: job 7 is shown, job 1 (the oldest) is not.
  await expect(page.locator('#jobs')).toContainText(`E2E P6 Job 7 ${stamp}`)
  await expect(page.locator('#jobs')).not.toContainText(`E2E P6 Site foreman ${stamp}`)
  await page.getByRole('link', { name: 'See all 7 jobs' }).click()
  await expect(page).toHaveURL(new RegExp(`/jobs\\?company=${employer.orgSlug}$`))
  await expect(page.getByRole('heading', { name: `Jobs at ${empName}` })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('7 jobs match your search')
  await expect(page.locator('article')).toHaveCount(7)
  // One robots tag, noindex (locally every page is noindex; the unit test checks the ?company= rule in the code).
  expect((await (await page.request.get(`/jobs?company=${employer.orgSlug}`)).text()).match(/<meta name="robots" content="noindex/g)).toHaveLength(1)
})

test('J3: paused, removed, closed by the employer and expired jobs leave the company page; every path records who did it', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const [paused, reported, restored, closed, expired] = jobs.slice(1, 6)
  await adminSession(page)
  // Staff pause.
  expect(await callAction(page, 'actions/jobs', 'adminJobStatusAction', [paused.id, 'paused'])).toContain('Job paused.')
  // A report: "Pause while we check", then "Restore"; another report: "Remove".
  const report = async (jobId: string) => (await db().from('job_reports').insert({ job_post_id: jobId, reason: 'fake_or_scam', ip_hash: `e2e-${Math.random()}` }).select('id').single()).data!.id
  expect(await callAction(page, 'actions/job-reports', 'pauseJobFromReportAction', [await report(restored.id)])).toContain('Job paused while you check it.')
  expect(await callAction(page, 'actions/job-reports', 'restoreJobAction', [restored.id])).toContain('Job back on the board.')
  expect(await callAction(page, 'actions/job-reports', 'removeJobFromReportAction', [await report(reported.id)])).toContain('Job removed.')
  // The employer closes one with their own session.
  const emp = await browser.newPage()
  await signIn(emp, employer.user.email, employer.user.password)
  expect(await callAction(emp, 'actions/job-actions', 'setJobStatusAction', [closed.id, 'archived'], '/account/jobs')).not.toContain('error')
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', closed.id).single()).data?.status).toBe('archived')
  // The daily job closes one whose closing time has passed.
  await db().from('job_posts').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', expired.id)
  await cron(page)
  // Staff send a newly submitted job back.
  const { data: back } = await db().from('job_posts').insert({ slug: `e2e-p6-back-${stamp}`, employer_org_id: employer.orgId, title: `E2E P6 Sent back ${stamp}`, category: 'construction', employment_type: 'full_time', location_id: bole, description: 'A job that HagerLand sends back for changes, long enough.', status: 'pending_review' }).select('id').single()
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [back!.id, false, 'Please add the pay.'])).toContain('Sent back to the employer.')

  expect(await trail(paused.id)).toContain('published>paused:staff')
  expect(await trail(restored.id)).toEqual(expect.arrayContaining(['published>paused:staff', 'paused>published:staff']))
  expect(await trail(reported.id)).toContain('published>removed:staff')
  expect(await trail(closed.id)).toContain('published>archived:employer')
  expect(await trail(expired.id)).toContain('published>expired:system')
  expect(await trail(back!.id)).toEqual(['->pending_review:server', 'pending_review>rejected:staff'])

  await page.context().clearCookies()
  await page.goto(`/company/${employer.orgSlug}`)
  await expect(page.getByRole('heading', { name: 'Open jobs (3)' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^See all/ })).toHaveCount(0)
  for (const gone of [paused, reported, closed, expired]) await expect(page.locator(`#jobs a[href="/jobs/${gone.slug}"]`)).toHaveCount(0)
  await expect(page.locator(`#jobs a[href="/jobs/${restored.slug}"]`)).toHaveCount(1)
  await emp.close()
})

test('J4 + J5: private-client jobs never reach a company page or ?company=; unknown, unpublished and HagerLand slugs show the normal board', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  await setSwitch(page, 'Private-client jobs', true)
  const d = db()
  const { data: cat } = await d.from('service_categories').select('id').eq('slug', 'staffing').single()
  const client = `Client Mulu ${stamp}`
  const { data: req } = await d.from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: `E2E P6 private ${stamp}`, details: 'Masons for a villa.', name: client, phone: randomPhone(), email: uniqueEmail('p6-client') }).select('id').single()
  const { data: a } = await d.from('recruitment_assignments').insert({ service_request_id: req!.id, private_client: true, created_by: 'e2e' }).select('id').single()
  const title = `E2E P6 Private masons ${stamp}`
  await adminSession(page)
  await page.goto(`/roodber8/jobs/desk/${a!.id}`)
  await page.getByLabel('Job title').fill(title)
  await page.locator('#pc-cat').selectOption('construction')
  await page.locator('#pc-type').selectOption('daily_labour')
  await page.locator('#pc-trade').selectOption('mason')
  await page.locator('#pc-loc').selectOption(bole)
  await page.getByLabel(/^Description/).fill('Block work on a G+1 villa, six days a week. HagerLand handles all applications.')
  await page.getByRole('button', { name: 'Create the job for review' }).click()
  await expect(page.getByText('Job created and waiting for review. Another person must approve it.')).toBeVisible()
  const { data: pc } = await d.from('job_posts').select('id, slug').eq('title', title).single()
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [pc!.id, true, 'Owner approves: client starts Monday.'])).toContain('Job approved and live.')
  expect(await trail(pc!.id)).toEqual(['->pending_review:staff', 'pending_review>published:staff'])

  await page.context().clearCookies()
  // The board shows it with the label.
  await page.goto(`/jobs?q=${encodeURIComponent(title)}`)
  await expect(page.locator('article', { hasText: title })).toContainText(PC_LABEL)
  // No company page, no ?company= view and no HagerLand organisation lists it.
  for (const slug of ['hagerland-services', 'hagerland-supply', 'hagerland-developments']) {
    const res = await page.goto(`/company/${slug}`)
    expect(res?.status()).toBe(200)
    await expect(page.locator('#jobs')).toHaveCount(0)
    await expect(page.getByText(/^Open jobs \(/)).toHaveCount(0)
    expect(await page.content()).not.toContain(title)
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('')).not.toContain('JobPosting')
    expect((await page.request.get(`/og/company/${slug}`)).status()).toBe(200)
  }
  const unpublished = await createProvider({ name: `E2E P6 Unpublished ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  await d.from('organisations').update({ status: 'pending_review' }).eq('id', unpublished.orgId)
  const { count: open } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', { auth: { persistSession: false } }).from('jobs_public').select('id', { count: 'exact', head: true })
  for (const slug of ['hagerland-services', 'hagerland-supply', 'does-not-exist-p6', unpublished.orgSlug, 'BAD SLUG!']) {
    await page.goto(`/jobs?company=${encodeURIComponent(slug)}`)
    await expect(page.getByRole('heading', { name: /^Jobs at / })).toHaveCount(0)
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
    // The normal board, exactly as without the filter (first page of every open job, the private-client job among them).
    await expect(page.getByRole('status')).toHaveText(open === 1 ? '1 job open now' : `${open} jobs open now`)
  }
  // Sitemaps, site search and the companies sitemap.
  expect(await (await page.request.get('/sitemap/companies.xml')).text()).not.toContain('hagerland-services')
  const search = await (await page.request.get(`/search?q=${encodeURIComponent(title)}`)).text()
  expect(search).toContain(PC_LABEL)
  for (const secret of [client, a!.id]) for (const path of [`/jobs/${pc!.slug}`, '/sitemap/jobs.xml', `/search?q=${encodeURIComponent(title)}`, '/company/hagerland-services', '/jobs?company=hagerland-services']) expect(await (await page.request.get(path)).text(), `${secret} on ${path}`).not.toContain(secret)

  // Switched off again: hidden everywhere.
  await setSwitch(page, 'Private-client jobs', false)
  await page.context().clearCookies()
  await page.goto(`/jobs?q=${encodeURIComponent(title)}`)
  await expect(page.locator('article', { hasText: title })).toHaveCount(0)
  expect((await page.goto(`/jobs/${pc!.slug}`))?.status()).toBe(404)
  void browser
})

test('J6 + J17: a business with no jobs, HagerLand Supply and the plumbers page are unchanged', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop')
  const none = await createProvider({ name: `E2E P6 No jobs ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  for (const slug of [none.orgSlug, 'hagerland-supply']) {
    await page.goto(`/company/${slug}`)
    await expect(page.locator('#jobs')).toHaveCount(0)
    await expect(page.getByText(/^Open jobs/)).toHaveCount(0)
    const nav = page.getByRole('navigation', { name: 'Profile sections' })
    if (await nav.count()) await expect(nav.getByRole('link', { name: 'Jobs', exact: true })).toHaveCount(0)
  }
  const res = await page.goto('/professionals/plumbers')
  expect(res?.status()).toBe(200)
  await expect(page.getByText(/^Open jobs/)).toHaveCount(0)
})

test('J9: the owner Jobs report keeps currencies apart, ages fees and says whether the fee ledger reconciles', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await adminSession(page)
  const line = page.getByText(/^Reconciles with fee ledger:/)
  await page.goto('/roodber8/reports')
  await page.locator('#main').getByRole('link', { name: 'Jobs report' }).click()
  await expect(page).toHaveURL(/\/roodber8\/reports\/jobs$/)
  await expect(page.getByText('Jobs, the recruitment desk and recruitment fees for one month. Owner only. Fees are shown per currency, as recorded in the fee record.')).toBeVisible()
  await expect(line).toHaveText('Reconciles with fee ledger: yes (all 5 checks passed)')
  const toDate = page.getByRole('region', { name: 'Fees to date' })
  await expect(toDate.getByRole('row', { name: /^ETB ETB/ })).toHaveCount(1)
  await expect(toDate.getByRole('row', { name: /^USD US\$/ })).toHaveCount(1)
  await expect(toDate.getByRole('row')).toHaveCount(3) // the header, ETB and USD: never added together
  const records = page.getByRole('region', { name: 'Fee records' })
  await expect(records.getByRole('row', { name: new RegExp(`^${fees.etb.reference} `) })).toHaveText(new RegExp(`${fees.etb.reference}\\s*agreed\\s*ETB 50,000\\s*ETB 20,000\\s*ETB 0\\s*ETB 30,000`))
  await expect(records.getByRole('row', { name: new RegExp(`^${fees.usd.reference} `) })).toHaveText(new RegExp(`${fees.usd.reference}\\s*agreed\\s*US\\$1,200\\s*US\\$0\\s*US\\$0\\s*US\\$1,200`))
  const ageing = page.getByRole('region', { name: 'Fees owed by age' })
  await expect(ageing.getByRole('row', { name: /^31–60 days ETB/ })).toHaveCount(1)
  await expect(ageing.getByRole('row', { name: /^0–30 days USD/ })).toHaveCount(1)
  await expect(page.getByText('Counted from the date the fee was first recorded as due, up to the end of the month (or today).')).toBeVisible()

  // Over-payment: flagged, not hidden; corrected with a reversal.
  const over = await feeEntry(fees.usd.terms, 'fee_received', 150_000, 'USD', day(0))
  await page.reload()
  await expect(line).toHaveText(`Reconciles with fee ledger: no (These fee records need a look: ${fees.usd.reference}.)`)
  await expect(page.getByText(`${fees.usd.reference}: More received or waived than was due (check 2).`)).toBeVisible()
  await feeEntry(fees.usd.terms, 'reversal', 150_000, 'USD', day(0), over)
  // "Paid" with money owed.
  await db().from('recruitment_fee_terms').update({ status: 'paid' }).eq('id', fees.etb.terms)
  await page.reload()
  await expect(line).toHaveText(`Reconciles with fee ledger: no (These fee records need a look: ${fees.etb.reference}.)`)
  await db().from('recruitment_fee_terms').update({ status: 'agreed' }).eq('id', fees.etb.terms)
  // "Waived" without a waived entry.
  await db().from('recruitment_fee_terms').update({ status: 'waived', waived_reason: 'e2e' }).eq('id', fees.usd.terms)
  await page.reload()
  await expect(line).toHaveText(`Reconciles with fee ledger: no (These fee records need a look: ${fees.usd.reference}.)`)
  await db().from('recruitment_fee_terms').update({ status: 'agreed', waived_reason: null }).eq('id', fees.usd.terms)
  await page.reload()
  await expect(line).toHaveText('Reconciles with fee ledger: yes (all 5 checks passed)')

  // The fee CSV: references, currency, amounts, status and dates; audited; no names, contacts or document paths.
  const res = await page.request.get('/roodber8/reports/jobs/export?table=fee-records')
  expect(res.status()).toBe(200)
  const csv = await res.text()
  expect(csv.split('\r\n')[0]).toBe('placement,currency,status,fee_due,received,waived,outstanding,as_of')
  expect(csv).toContain(`${fees.etb.reference},ETB,agreed,50000.00,20000.00,0.00,30000.00`)
  for (const secret of [workerName, 'recruitment-private', '+251', '@']) expect(csv).not.toContain(secret)
  await expect.poll(async () => (await db().from('audit_log').select('id').eq('action', 'jobs.report.export').limit(1)).data?.length).toBe(1)
})

test('J7 + J8: Operations sees counts and "fee agreed" only; Agent and Content are refused; nobody but the owner gets money', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const ops = await staffPage(browser, 'operations')
  await ops.goto('/roodber8/demand/jobs')
  await expect(ops.getByRole('heading', { name: 'Demand: jobs' })).toBeVisible()
  await expect(ops.getByText(W10)).toBeVisible()
  await expect(ops.getByText(/^Fee agreed in writing: \d+ yes, \d+ no$/)).toBeVisible()
  // Amounts as shown (ETB 50,000 / US$1,200), as stored (5000000 / 120000) and as in CSVs (50000.00 / 1200.00). ("$1" alone is React’s own page data.)
  const money = /ETB\s?[\d,]|US\$|50,000|30,000|1,200|5000000|120000|50000\.00|1200\.00|\bUSD\b/
  const html = await (await ops.request.get('/roodber8/demand/jobs')).text()
  const rsc = await (await ops.request.get('/roodber8/demand/jobs', { headers: { RSC: '1' } })).text()
  expect(html).not.toMatch(money)
  expect(rsc).not.toMatch(money)
  for (const table of ['flow', 'status', 'applications', 'unmet-trades', 'unmet-areas', 'reports', 'callbacks', 'desk']) {
    const r = await ops.request.get(`/roodber8/demand/jobs/export?days=365&table=${table}`)
    expect(r.status(), table).toBe(200)
    expect(await r.text(), table).not.toMatch(money)
  }
  // Owner-only places.
  for (const path of ['/roodber8/reports/jobs', '/roodber8/reports', '/roodber8/performance', '/roodber8/demand']) expect((await ops.goto(path))?.url(), path).toContain('denied=1')
  const csv = await ops.request.get('/roodber8/reports/jobs/export?table=fees-to-date', { maxRedirects: 0 })
  expect(csv.status()).not.toBe(200)
  expect(await csv.text()).not.toMatch(money)
  for (const role of ['agent', 'content'] as const) {
    const p = await staffPage(browser, role)
    for (const path of ['/roodber8/demand/jobs', '/roodber8/reports/jobs']) expect((await p.goto(path))?.url(), `${role} ${path}`).toContain('denied=1')
    expect((await p.request.get('/roodber8/demand/jobs/export?table=flow', { maxRedirects: 0 })).status(), role).not.toBe(200)
    await p.close()
  }
  await ops.close()
})

test('J10: a database error shows an error, never zeros or "yes"', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await adminSession(page)
  const cases: [string, string, string][] = [
    ['job_status_events', '/roodber8/demand/jobs', 'Jobs from posting to closing'],
    ['job_status_events', '/roodber8/reports/jobs', 'Reconciles with fee ledger'],
    ['recruitment_fee_entries', '/roodber8/reports/jobs', 'Reconciles with fee ledger'],
    ['supply_quote_lines', `/roodber8/organisations/${employer.orgId}`, 'Hiring:'],
    ['worker_register', '/roodber8/jobs', 'Jobs are reviewed in the review queue.'],
    ['search_misses', '/roodber8/demand', 'Activation recommendations'],
    ['property_care_requests', '/roodber8/performance', 'Estate agency'],
  ]
  for (const [table, path, normal] of cases) {
    psql(`revoke select on public.${table} from service_role`)
    try {
      const res = await page.request.get(path)
      const body = await res.text()
      expect(res.status(), `${path} without ${table}`).toBe(500)
      expect(body, path).toContain('__next_error__')
      expect(body, path).not.toContain(normal)
    } finally {
      psql(`grant select on public.${table} to service_role`)
    }
    const back = await page.request.get(path)
    expect(back.status(), `${path} back to normal`).toBe(200)
    expect(await back.text(), path).toContain(normal)
  }
})

test('J11 + J12 + J13 + J16: small numbers, the Supplies signals, the organisation box and Performance', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await adminSession(page)
  // J11: medians that rest on fewer than 3 data points (a past month with no data; the same panels as the Jobs tab).
  await page.goto('/roodber8/reports/jobs?month=2026-01')
  await expect(page.getByText('Not enough data yet (0). Shown from 3.')).toHaveCount(6)

  // J12: trades being hired, by the public board's rule. Two open glass-fitter jobs count; one past its closing time
  // (not closed yet) and one hidden private-client job do not.
  const fitter = `E2E P6 Glass ${stamp}`
  await seedApprovedJob(page, employer.orgId, `${fitter} 1`, 'aluminium-and-glass-fitter')
  await seedApprovedJob(page, employer.orgId, `${fitter} 2`, 'aluminium-and-glass-fitter')
  const late = await seedApprovedJob(page, employer.orgId, `${fitter} 3`, 'aluminium-and-glass-fitter')
  await db().from('job_posts').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', late.id)
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', { auth: { persistSession: false } })
  const { count: fitters } = await anon.from('jobs_public').select('id', { count: 'exact', head: true }).eq('trade', 'aluminium-and-glass-fitter')
  expect((await db().from('job_posts').select('id', { count: 'exact', head: true }).eq('trade', 'aluminium-and-glass-fitter').eq('status', 'published')).count).toBeGreaterThan(fitters ?? 0)
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'staffing').single()
  const { count: staffing } = await db().from('service_requests').select('id', { count: 'exact', head: true }).eq('service_category_id', cat!.id).in('status', ['submitted', 'triaged', 'matched', 'quoted'])
  await page.goto('/roodber8/demand/supplies')
  await expect(page.getByText('Trades being hired (open jobs)')).toBeVisible()
  await expect(page.getByText('Open job posts by kind of work')).toHaveCount(0)
  await expect(page.getByText(`Aluminium & glass fitter: ${fitters}`, { exact: true })).toBeVisible()
  await expect(page.getByText(`Open staffing requests with HagerLand: ${staffing}`)).toBeVisible()
  const list = page.getByRole('region', { name: 'Hiring, no supply activity yet' })
  await expect(page.getByRole('heading', { name: 'Hiring, no supply activity yet' })).toBeVisible()
  await expect(list.getByRole('link', { name: empName })).toBeVisible()
  expect(await list.textContent()).not.toMatch(/HagerLand (Services|Supply|Developments)/)

  // J13: the organisation box, for the owner and for Operations: the hiring line, no fee figures.
  const ops = await staffPage(browser, 'operations')
  for (const p of [page, ops]) {
    await p.goto(`/roodber8/organisations/${employer.orgId}`)
    await expect(p.getByText(/^Hiring: \d+ open jobs \(.*Aluminium & glass fitter.*\)\. Staffing request with HagerLand: open \(HLR-/)).toBeVisible()
    // The employer is not a supply partner: nothing on its page shows the owner's fee figures.
    expect(await p.locator('main').textContent()).not.toMatch(/ETB\s?[\d,]|US\$|50,000|1,200/)
  }
  await ops.close()

  // J16: Performance: the note, and Jobs "Live listings" by the open rule.
  const { count: openJobs } = await anon.from('jobs_public').select('id', { count: 'exact', head: true })
  await page.goto('/roodber8/performance')
  await expect(page.getByText(W26)).toBeVisible()
  const { data: pillar } = await db().from('pillars').select('name').eq('key', 'jobs').single()
  await expect(page.getByRole('region', { name: 'Pillar KPIs' }).getByRole('row', { name: new RegExp(`^${pillar!.name}`) }).getByRole('cell').nth(6)).toHaveText(String(openJobs))
})

test('J14: the hiring line on the customer’s own project page, and the staffing signal on the admin project page', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const owner = await createUser({ name: 'E2E P6 Builder' })
  const { data: project } = await db().from('build_projects').insert({ user_id: owner.id, title: `E2E P6 House ${stamp}`, budget_band: '2m_5m', timeline: 'now', services: ['contractor'], name: 'E2E P6 Builder', phone: randomPhone(), email: owner.email }).select('id').single()
  const me = await browser.newPage()
  await signIn(me, owner.email, owner.password)
  await me.goto(`/account/projects/${project!.id}`)
  await expect(me.getByText(W7)).toBeVisible()
  await me.getByRole('link', { name: 'Submit a staffing requirement' }).click()
  await expect(me).toHaveURL(/\/request-service\/staffing$/)
  const stranger = await createUser()
  const other = await browser.newPage()
  await signIn(other, stranger.email, stranger.password)
  expect((await other.goto(`/account/projects/${project!.id}`))?.status()).toBe(404)
  // Admin: no line until the customer has a staffing request.
  await adminSession(page)
  await page.goto(`/roodber8/projects/${project!.id}`)
  await expect(page.getByText(/^This customer has a staffing request with HagerLand:/)).toHaveCount(0)
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'staffing').single()
  const { data: req } = await db().from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: `E2E P6 crew ${stamp}`, details: 'Masons.', name: 'E2E P6 Builder', phone: randomPhone(), email: owner.email, requester_user_id: owner.id }).select('reference').single()
  await page.reload()
  await expect(page.getByText(`This customer has a staffing request with HagerLand: ${req!.reference}`)).toBeVisible()
  await me.close()
  await other.close()
})

test('J15 + J18: digest lines (counts only, failure-isolated) and the same figures after the 12-month deletion', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  // A job live for 15 days with no applications.
  const quiet = await seedApprovedJob(page, employer.orgId, `E2E P6 Quiet ${stamp}`, 'tiler')
  await db().from('job_posts').update({ published_at: new Date(Date.now() - 15 * DAY).toISOString() }).eq('id', quiet.id)
  const to = process.env.ADMIN_DIGEST_EMAIL ?? ''
  const digestIds = async () => ((await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"daily digest"`)}`)).json()) as { messages: { ID: string }[] }).messages.map((m) => m.ID)
  const digest = async () => {
    const seen = new Set(await digestIds())
    await cron(page)
    for (let i = 0; i < 40; i++) {
      const fresh = (await digestIds()).find((id) => !seen.has(id))
      if (fresh) return ((await (await fetch(`http://localhost:8025/api/v1/message/${fresh}`)).json()) as { Text: string }).Text
      await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error('no digest')
  }
  const text = await digest()
  expect(text).toMatch(/Jobs: open 14 days or more with no applications: [1-9]\d*/)
  expect(text).toMatch(/Recruitment fees owed for over 30 days: [1-9]\d*/)
  expect(text).not.toMatch(/ETB\s?[\d,]|US\$|50,000|HLP-|Abebe/)
  // One group failing (the fee record cannot be read) does not stop the others.
  psql('revoke select on public.recruitment_fee_entries from service_role')
  let failed = ''
  try {
    failed = await digest()
  } finally {
    psql('grant select on public.recruitment_fee_entries to service_role')
  }
  expect(failed).toContain('Jobs: open 14 days or more with no applications')
  // Fix F-2: the failed group is named ("Could not read"), never shown as a figure or left out.
  expect(failed).not.toMatch(/Recruitment fees owed for over 30 days: \d/)
  expect(failed).toContain('Could not read: Recruitment fees owed for over 30 days')

  // J18: a phone application from 13 months ago; the figures before and after the deletion clears its details.
  const { data: app } = await db().from('job_applications').insert({ job_id: quiet.id, channel: 'phone', name: 'E2E P6 Old Applicant', phone: randomPhone(), trade: 'tiler', area_text: 'Bole', preferred_contact: 'call', language: 'am', adult_confirmed_at: new Date().toISOString(), consent_at: new Date().toISOString(), created_at: new Date(Date.now() - 400 * DAY).toISOString() }).select('id').single()
  await adminSession(page)
  const figures = async () => Promise.all(['applications', 'flow', 'desk', 'reports', 'callbacks'].map(async (t) => (await page.request.get(`/roodber8/demand/jobs/export?days=1825&table=${t}`)).text()))
  const before = await figures()
  psql(`update public.site_settings set value = '"live"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  try {
    await cron(page)
  } finally {
    psql(`update public.site_settings set value = '"dry_run"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  }
  expect((await db().from('job_applications').select('name, phone, personal_data_deleted_at').eq('id', app!.id).single()).data).toMatchObject({ name: 'Removed', phone: null })
  expect(await figures()).toEqual(before)
})

test('J19: at 375 px the company jobs section has no sideways scroll and the Jobs tab is readable', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one plain 375 px window')
  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } })
  await phone.goto(`/company/${employer.orgSlug}`)
  await phone.locator('#jobs').scrollIntoViewIfNeeded()
  await expect(phone.getByRole('heading', { name: /^Open jobs \(\d+\)$/ })).toBeVisible()
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await adminSession(phone)
  await phone.goto('/roodber8/demand/jobs')
  await expect(phone.getByRole('heading', { name: 'Demand: jobs' })).toBeVisible()
  await expect(phone.getByText(W10)).toBeVisible()
  await phone.close()
})
