import { expect, test, type Browser, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { adminSession, allMail, asFreshVisitor, createProvider, createUser, db, mailWithSubject, randomPhone, signIn, uniqueEmail } from './helpers'

/** Jobs Phase 4 (migration 0042): AB's journeys J1–J15 on the local copy only. */

test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const W1 = 'Posted by HagerLand for a private client'
const W3 = 'HagerLand is handling this job for a private client. Your application goes to HagerLand, and we introduce you to the employer only if you agree.'
const W4 = 'Send your CV and a short note. Only HagerLand can see your application.'
const W17 = 'Thank you. HagerLand will look into this job.'
const W27 = 'HagerLand may post jobs for private clients'
const addis = (ms = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
const plusDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<{ page: Page; actor: string }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`p4-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await page.goto('/roodber8-login')
  await page.getByText('Staff sign in').click()
  await page.fill('#stf-email', email)
  await page.fill('#stf-pass', 'staff-correct-horse')
  if (authenticator.timeRemaining() < 6) await page.waitForTimeout(authenticator.timeRemaining() * 1000 + 800)
  await page.fill('#stf-code', authenticator.generate(secret))
  await page.getByRole('button', { name: 'Sign in as staff' }).click()
  await page.waitForURL('**/roodber8')
  return { page, actor: `staff:${email}`.slice(0, 80) }
}

/** Calls a server action directly, as a crafted request would (plain arguments). */
async function callAction(page: Page, file: string, name: string, args: unknown[], path = '/roodber8'): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  return (await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args) })).text()
}

async function setSwitch(page: Page, label: 'Report this job' | 'Private-client jobs' | 'Legacy badge clean-up', on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const state = page.getByText(new RegExp(`^${label}: (On|Off)$`))
  if ((await state.textContent())?.endsWith(on ? 'On' : 'Off')) return
  const box = state.locator('..')
  if (on && (await box.getByRole('checkbox').count())) await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  const name = label === 'Report this job' ? '“Report this job”' : label === 'Private-client jobs' ? 'Private-client jobs' : 'The legacy badge clean-up'
  await expect(page.getByText(`${name} is now ${on ? 'on' : 'off'} on the website.`)).toBeVisible()
}

async function seedJob(orgId: string, title: string) {
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p4-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, employer_org_id: orgId, title, category: 'construction', employment_type: 'daily_labour', trade: 'mason', location_id: loc!.id, description: 'Block work on a G+2 house in Bole, six days a week, for the Phase 4 tests.', status: 'published' })
    .select('id, slug, expires_at')
    .single()
  if (error || !data) throw new Error(`job seed failed: ${error?.message}`)
  return data
}

async function recordCheck(page: Page, orgId: string) {
  await page.goto(`/roodber8/organisations/${orgId}`)
  const today = addis()
  await page.locator('#vc-lic').fill(`TL-${orgId.slice(0, 6)}`)
  await page.locator('#vc-lc').fill(today)
  await page.locator('#vc-tin').fill(today)
  await page.locator('#vc-ph').fill(today)
  await page.getByRole('button', { name: 'Record check and give the badge' }).click()
  await expect(page.getByText(/^Check recorded\. .* is Verified until /)).toBeVisible()
}

const cron = async (page: Page) => (await (await page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()) as { verification: { reminders: number; ended: number; legacyReminders: number; legacyEnded: number } | null; jobsDataCleanup: { counts: { due: Record<string, number>; cleared: Record<string, number> } } }

const stamp = Date.now()
let owned: Awaited<ReturnType<typeof createProvider>>
let opsOrg: Awaited<ReturnType<typeof createProvider>>
let legacy: Awaited<ReturnType<typeof createProvider>>
let expiring: Awaited<ReturnType<typeof createProvider>>
let employer: Awaited<ReturnType<typeof createProvider>>
let job: { id: string; slug: string; expires_at: string | null }
let ops: { page: Page; actor: string }
let pcAssignment = ''
const clientName = `Client Desta ${stamp}`

test.beforeAll(async () => {
  owned = await createProvider({ name: `E2E P4 Owned ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  opsOrg = await createProvider({ name: `E2E P4 Ops ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  expiring = await createProvider({ name: `E2E P4 Expiring ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  employer = await createProvider({ name: `E2E P4 Employer ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  // A legacy badge: verified with no recorded check (as businesses verified before 0042 are).
  legacy = await createProvider({ name: `E2E P4 Legacy ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole', verified: true })
  await db().from('employer_verifications').delete().eq('organisation_id', legacy.orgId)
  await db().from('organisations').update({ verified_at: new Date(Date.now() - 200 * DAY).toISOString() }).eq('id', legacy.orgId)
  job = await seedJob(employer.orgId, `E2E P4 Masons ${stamp}`)
  // A private-client staffing request with its desk assignment.
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'staffing').single()
  const { data: req } = await db().from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: `E2E P4 private ${stamp}`, details: 'Masons for a house.', name: clientName, phone: randomPhone(), email: uniqueEmail('p4-client') }).select('id').single()
  const { data: a } = await db().from('recruitment_assignments').insert({ service_request_id: req!.id, private_client: true, created_by: 'e2e' }).select('id').single()
  pcAssignment = a!.id
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setSwitch(page, 'Report this job', true)
  await setSwitch(page, 'Private-client jobs', false)
  await setSwitch(page, 'Legacy badge clean-up', false)
  await page.close()
  await ops?.page.close()
})

test('J1: the owner records a check → Verified badge with the new wording; the business sees "Verified until"', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await recordCheck(page, owned.orgId)
  const { data: rec } = await db().from('employer_verifications').select('status, valid_until, verified_by, licence_check_method').eq('organisation_id', owned.orgId).single()
  const [y, m, d] = addis().split('-')
  expect(rec).toMatchObject({ status: 'active', verified_by: 'admin', licence_check_method: 'document', valid_until: `${Number(y) + 1}-${m}-${d}` })
  expect((await db().from('organisations').select('verification_level').eq('id', owned.orgId).single()).data?.verification_level).toBe('verified')
  const html = await (await page.request.get(`/company/${owned.orgSlug}`)).text()
  expect(html).toContain('Verified: HagerLand checked this business&#x27;s trade licence and tax number on')
  expect(html).toContain('Next check due by')
  const member = await browser.newPage()
  await signIn(member, owned.user.email, owned.user.password)
  await member.goto('/account/company/verification')
  await expect(member.getByText(`E2E P4 Owned ${stamp} is Verified until`)).toBeVisible()
  await expect(member.getByText('The gold Verified badge shows customers and job seekers that HagerLand has checked your trade licence and tax number. We check again every 12 months.')).toBeVisible()
  await member.close()
})

test('J2: Operations can record a check; Agent and Content are refused, pages and actions', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  ops = await staffPage(browser, 'operations')
  await recordCheck(ops.page, opsOrg.orgId)
  expect((await db().from('employer_verifications').select('verified_by').eq('organisation_id', opsOrg.orgId).single()).data?.verified_by).toBe(ops.actor)
  for (const role of ['agent', 'content'] as const) {
    const s = await staffPage(browser, role)
    await s.page.goto(`/roodber8/organisations/${employer.orgId}`)
    await expect(s.page).toHaveURL(/denied=1/)
    await s.page.goto('/roodber8/review?tab=verification')
    await expect(s.page.getByRole('link', { name: /^Verification/ })).toHaveCount(0)
    const res = await callAction(s.page, 'actions/verification', 'revokeBadgeAction', [owned.orgId, 'crafted by ' + role])
    expect(res).not.toContain('Badge removed.')
    expect((await db().from('organisations').select('verification_level').eq('id', owned.orgId).single()).data?.verification_level).toBe('verified')
    await s.page.close()
  }
})

test('J3: "verified" cannot be set through the admin fields or the database without a recorded check', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto(`/roodber8/organisations/${employer.orgId}`)
  await expect(page.locator('#oa-ver option[value="verified"]')).toBeDisabled()
  const res = await callAction(page, 'actions/organisations', 'saveOrgAdminFieldsAction', [employer.orgId, { verification_level: 'verified', trade_licence_number: '', tin: '', plan: 'free' }])
  expect(res).toContain('To give the Verified badge, use “Record verification check”.')
  const direct = await db().from('organisations').update({ verification_level: 'verified' }).eq('id', employer.orgId)
  expect(direct.error?.code).toBe('23514')
  expect((await db().from('organisations').select('verification_level').eq('id', employer.orgId).single()).data?.verification_level).not.toBe('verified')
})

test('J4: a legacy verified business saves ordinary edits and keeps today’s wording', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const edit = await db().from('organisations').update({ description: 'Plumbing and drainage for homes in Bole and Kirkos, edited in the Phase 4 test.' }).eq('id', legacy.orgId)
  expect(edit.error).toBeNull()
  expect((await db().from('organisations').select('verification_level').eq('id', legacy.orgId).single()).data?.verification_level).toBe('verified')
  const html = await (await page.request.get(`/company/${legacy.orgSlug}`)).text()
  expect(html).toContain('Verified: HagerLand checked this business&#x27;s trade licence on')
  expect(html).not.toContain('and tax number')
  const member = await browser.newPage()
  await signIn(member, legacy.user.email, legacy.user.password)
  await member.goto('/account/company/verification')
  await expect(member.getByText(`E2E P4 Legacy ${stamp} is Verified.`, { exact: true })).toBeVisible()
  await member.close()
  await adminSession(page)
  await page.goto(`/roodber8/organisations/${legacy.orgId}`)
  await expect(page.getByText(/legacy badge/)).toBeVisible()
})

test('J5: a new-standard badge sends one reminder 30 days before, then ends; candidate access follows', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const verifiedAt = new Date(Date.now() - 345 * DAY).toISOString()
  await db().from('employer_verifications').insert({ organisation_id: expiring.orgId, licence_number: 'TL-EXP', licence_checked_at: verifiedAt, licence_check_method: 'document', tin_checked_at: verifiedAt, phone_checked_at: verifiedAt, verified_by: 'e2e', verified_at: verifiedAt, valid_until: plusDays(addis(), 15) })
  await db().from('organisations').update({ verification_level: 'verified', verified_at: verifiedAt }).eq('id', expiring.orgId)
  // A visible candidate: the verified business may see them (decision #2).
  const cand = await createUser({ name: 'Visible Candidate P4' })
  await db().from('candidate_profiles').insert({ user_id: cand.id, full_name: 'Visible Candidate P4', visibility: 'employers', placement_wanted: false })
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  await client.auth.signInWithPassword({ email: expiring.user.email, password: expiring.user.password })
  expect(((await client.from('candidates_for_employers').select('candidate_id').eq('candidate_id', cand.id)).data ?? []).length).toBe(1)
  const first = await cron(page)
  expect(first.verification?.reminders).toBeGreaterThanOrEqual(1)
  const mail = await mailWithSubject(expiring.user.email, 'Your HagerLand Verified badge ends on')
  expect(mail.text).toContain('To keep the Verified badge, upload your current trade licence in your account.')
  expect(mail.html).toContain('Keep my badge')
  await cron(page)
  expect((await allMail(expiring.user.email)).filter((m) => m.subject.startsWith('Your HagerLand Verified badge ends on'))).toHaveLength(1)
  // The end date passes.
  const older = new Date(Date.now() - 380 * DAY).toISOString()
  const moved = await db().from('employer_verifications').update({ verified_at: older, valid_until: plusDays(addis(), -20) }).eq('organisation_id', expiring.orgId)
  expect(moved.error).toBeNull()
  const second = await cron(page)
  expect(second.verification?.ended).toBeGreaterThanOrEqual(1)
  expect((await db().from('employer_verifications').select('status').eq('organisation_id', expiring.orgId).single()).data?.status).toBe('expired')
  expect((await db().from('organisations').select('verification_level').eq('id', expiring.orgId).single()).data?.verification_level).toBe('claimed')
  expect(((await client.from('candidates_for_employers').select('candidate_id').eq('candidate_id', cand.id)).data ?? []).length).toBe(0)
  const digest = await mailWithSubject('admin@test.hagerland.invalid', 'HagerLand daily digest')
  expect(digest.text).toMatch(/Verified badges (ending within 30 days|ended today)/)
})

test('J6: legacy clean-up — Off changes nothing; On gives 90 days, one reminder, then the badge ends', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await setSwitch(page, 'Legacy badge clean-up', false)
  await cron(page)
  expect((await db().from('organisations').select('verification_level').eq('id', legacy.orgId).single()).data?.verification_level).toBe('verified')
  expect((await db().from('org_verification_notices').select('id').eq('organisation_id', legacy.orgId)).data).toHaveLength(0)
  await setSwitch(page, 'Legacy badge clean-up', true)
  expect((await db().from('site_settings').select('value').eq('key', 'org_verification_expiry_started_on').single()).data?.value).toBe(addis())
  await page.goto('/roodber8/jobs/data')
  await expect(page.getByText(/they end on /)).toBeVisible()
  // 70 days in: inside the 30-day reminder window.
  await db().from('site_settings').update({ value: plusDays(addis(), -70) }).eq('key', 'org_verification_expiry_started_on')
  await cron(page)
  const remind = await mailWithSubject(legacy.user.email, 'Your HagerLand Verified badge ends on')
  expect(remind.text).toContain("If we don't hear from you, the badge will end on")
  await cron(page)
  expect((await allMail(legacy.user.email)).filter((m) => m.subject.startsWith('Your HagerLand Verified badge ends on'))).toHaveLength(1)
  // 91 days in: ended.
  await db().from('site_settings').update({ value: plusDays(addis(), -91) }).eq('key', 'org_verification_expiry_started_on')
  await cron(page)
  expect((await db().from('organisations').select('verification_level').eq('id', legacy.orgId).single()).data?.verification_level).toBe('claimed')
  const member = await page.context().browser()!.newPage()
  await signIn(member, legacy.user.email, legacy.user.password)
  await member.goto('/account/company/verification')
  await expect(member.getByText('Your Verified badge has ended. Upload your current trade licence to get it back.')).toBeVisible()
  await member.close()
  await setSwitch(page, 'Legacy badge clean-up', false)
})

test('J7: a name change on an active check → needs re-check → ends after 30 days', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await db().from('organisations').update({ name: `E2E P4 Owned Renamed ${stamp}` }).eq('id', owned.orgId)
  const { data: r } = await db().from('employer_verifications').select('id, status').eq('organisation_id', owned.orgId).in('status', ['active', 'needs_recheck']).single()
  expect(r?.status).toBe('needs_recheck')
  await adminSession(page)
  await page.goto(`/roodber8/organisations/${owned.orgId}`)
  await expect(page.getByText(/needs re-check: the name or licence number changed/)).toBeVisible()
  expect((await db().from('organisations').select('verification_level').eq('id', owned.orgId).single()).data?.verification_level).toBe('verified')
  await db().from('employer_verifications').update({ needs_recheck_since: new Date(Date.now() - 32 * DAY).toISOString() }).eq('id', r!.id)
  await cron(page)
  expect((await db().from('employer_verifications').select('status').eq('id', r!.id).single()).data?.status).toBe('expired')
  expect((await db().from('organisations').select('verification_level').eq('id', owned.orgId).single()).data?.verification_level).toBe('claimed')
})

test('J8: a visitor reports a job; a repeat shows the same thanks without a second report; limits apply', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  await setSwitch(page, 'Report this job', true)
  await page.context().clearCookies()
  await asFreshVisitor(page)
  await page.goto(`/jobs/${job.slug}`)
  await expect(page.getByText('Never pay an employer or agent to get a job. Report anything suspicious to HagerLand.')).toBeVisible()
  const report = async (p: Page, reason: string) => {
    await p.getByRole('button', { name: 'Report this job' }).click()
    const sheet = p.getByRole('dialog', { name: 'Report this job' })
    await sheet.getByLabel(reason).check()
    await sheet.getByLabel('What did you notice?').fill('They asked for a registration fee of 500 birr.')
    await sheet.getByLabel('Your phone or email').fill('0911000555')
    await sheet.getByRole('button', { name: 'Send report' }).click()
    return sheet
  }
  const sheet = await report(page, 'Asks candidates for money')
  await expect(sheet.getByText(W17)).toBeVisible()
  await expect(page.getByText("Only if you're happy for us to follow up. We don't share it with the employer.")).toHaveCount(0)
  const { data: rows } = await db().from('job_reports').select('reason, details, contact, ip_hash, status').eq('job_post_id', job.id)
  expect(rows).toHaveLength(1)
  expect(rows![0]).toMatchObject({ reason: 'asks_for_money', contact: '0911000555', status: 'open' })
  expect(rows![0].ip_hash).toMatch(/^[0-9a-f]{64}$/)
  // The same visitor again: the same thanks, nothing new stored.
  await page.reload()
  await expect((await report(page, 'Looks fake or like a scam')).getByText(W17)).toBeVisible()
  expect((await db().from('job_reports').select('id').eq('job_post_id', job.id)).data).toHaveLength(1)
  // A busy visitor: five an hour.
  const busy = await browser.newPage()
  await asFreshVisitor(busy)
  for (let i = 0; i < 6; i++) {
    await busy.goto(`/jobs/${job.slug}`)
    const s = await report(busy, 'Something else')
    if (i < 5) await expect(s.getByText(W17)).toBeVisible()
    else await expect(s.getByText('You have sent several reports recently. Please try again later.')).toBeVisible()
  }
  await busy.close()
  expect((await db().from('job_reports').select('id').eq('job_post_id', job.id)).data).toHaveLength(2)
})

test('J9: staff dismiss, pause (employer emailed, job leaves the board), restore and remove; Agent/Content and employers cannot see reports', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await ops.page.goto('/roodber8/jobs/reports')
  const group = ops.page.locator('li', { hasText: `E2E P4 Masons ${stamp}` }).first()
  await expect(group.getByText('Reported for asking candidates for money')).toBeVisible()
  await expect(group.getByText('2 different reporters')).toBeVisible()
  await expect(group.getByText(/Contact \(never share with the employer\): 0911000555/).first()).toBeVisible()
  await group.getByRole('button', { name: 'Pause while we check' }).click()
  await expect(ops.page.getByText(/^Job paused while you check it\. The employer was emailed/)).toBeVisible()
  expect((await db().from('job_posts').select('status').eq('id', job.id).single()).data?.status).toBe('paused')
  const paused = await mailWithSubject(employer.user.email, 'Your job advert is paused while we check it')
  expect(paused.text).toContain(`We have paused your job "E2E P4 Masons ${stamp}" while we check it. We will be in touch if we need anything from you.`)
  expect(paused.text).not.toContain('0911000555')
  expect((await page.goto(`/jobs/${job.slug}`))?.status()).toBe(404)
  expect((await db().from('job_reports').select('status, outcome').eq('job_post_id', job.id)).data?.every((r) => r.status === 'actioned' && r.outcome === 'paused')).toBe(true)
  // Restore keeps the original closing date.
  await ops.page.goto(`/roodber8/jobs/${job.id}`)
  await ops.page.getByRole('button', { name: 'Restore' }).click()
  await expect(ops.page.getByText('Job back on the board.')).toBeVisible()
  const restored = (await db().from('job_posts').select('status, expires_at').eq('id', job.id).single()).data
  expect(restored?.status).toBe('published')
  expect(new Date(restored!.expires_at!).getTime()).toBe(new Date(job.expires_at!).getTime())
  // A new report → dismiss; another → remove.
  const { data: r1 } = await db().from('job_reports').insert({ job_post_id: job.id, reason: 'wrong_or_misleading', ip_hash: 'e2e-hash-1' }).select('id').single()
  expect(await callAction(ops.page, 'actions/job-reports', 'dismissJobReportsAction', [r1!.id])).toContain('Reports dismissed.')
  const { data: r2 } = await db().from('job_reports').insert({ job_post_id: job.id, reason: 'fake_or_scam', ip_hash: 'e2e-hash-2' }).select('id').single()
  // Agent and Content: no page, actions refused.
  for (const role of ['agent', 'content'] as const) {
    const s = await staffPage(browser, role)
    await s.page.goto('/roodber8/jobs/reports')
    await expect(s.page).toHaveURL(/denied=1/)
    await s.page.goto('/roodber8/review?tab=job-reports')
    await expect(s.page.getByRole('link', { name: /^Job reports/ })).toHaveCount(0)
    expect(await callAction(s.page, 'actions/job-reports', 'removeJobFromReportAction', [r2!.id])).not.toContain('Job removed.')
    await s.page.close()
  }
  expect((await db().from('job_posts').select('status').eq('id', job.id).single()).data?.status).toBe('published')
  // The employer can never read reports.
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  await client.auth.signInWithPassword({ email: employer.user.email, password: employer.user.password })
  const er = await client.from('job_reports').select('*')
  expect(er.error ?? (er.data ?? []).length === 0).toBeTruthy()
  expect(await callAction(ops.page, 'actions/job-reports', 'removeJobFromReportAction', [r2!.id])).toContain('Job removed.')
  expect((await db().from('job_posts').select('status').eq('id', job.id).single()).data?.status).toBe('removed')
})

test('J10: reports switched off — no button, the server refuses', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const fresh = await seedJob(employer.orgId, `E2E P4 Switch ${stamp}`)
  await setSwitch(page, 'Report this job', false)
  await page.context().clearCookies()
  await page.goto(`/jobs/${fresh.slug}`)
  await expect(page.getByText('Never pay an employer or agent to get a job.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Report this job' })).toHaveCount(0)
  expect(await page.content()).not.toContain('Report this job')
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === 'submitJobReportAction')![0]
  const res = await (await page.request.post(`/jobs/${fresh.slug}`, { headers: { 'Next-Action': id, Accept: 'text/x-component' }, multipart: { '0': '[null,"$K1"]', '1_job_id': fresh.id, '1_reason': 'fake_or_scam' } })).text()
  expect(res).toContain('We could not send your report. Please try again.')
  expect((await db().from('job_reports').select('id').eq('job_post_id', fresh.id)).data).toHaveLength(0)
  await setSwitch(page, 'Report this job', true)
})

test('J11: private-client jobs — four-eyes, the public label, no client identity, applications to HagerLand and the desk', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  await setSwitch(page, 'Private-client jobs', true)
  const title = `E2E P4 Private masons ${stamp}`
  const create = async (p: Page, t: string) => {
    await p.goto(`/roodber8/jobs/desk/${pcAssignment}`)
    await p.getByLabel('Job title').fill(t)
    await p.locator('#pc-cat').selectOption('construction')
    await p.locator('#pc-type').selectOption('daily_labour')
    await p.locator('#pc-trade').selectOption('mason')
    const { data: bole } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
    await p.locator('#pc-loc').selectOption(bole!.id)
    await p.getByLabel(/^Description/).fill('Block work on a G+1 house, six days a week. HagerLand handles all applications.')
    await p.getByRole('button', { name: 'Create the job for review' }).click()
    await expect(p.getByText('Job created and waiting for review. Another person must approve it.')).toBeVisible()
    return (await db().from('job_posts').select('*').eq('title', t).single()).data!
  }
  const j = await create(ops.page, title)
  expect(j).toMatchObject({ posted_for: 'private_client', recruitment_assignment_id: pcAssignment, created_by_staff: ops.actor, status: 'pending_review' })
  // Operations created it: Operations cannot approve it.
  await ops.page.goto(`/roodber8/jobs/${j.id}`)
  await expect(ops.page.getByText('Created by you: another person must approve.')).toBeVisible()
  expect(await callAction(ops.page, 'actions/jobs', 'jobDecisionAction', [j.id, true, 'please'])).toContain('You created this job: another person must approve it.')
  // The owner approves it (not the creator).
  await adminSession(page)
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [j.id, true])).toContain('Job approved and live.')
  expect((await db().from('job_posts').select('status, approved_by, self_approval_reason').eq('id', j.id).single()).data).toEqual({ status: 'published', approved_by: 'admin', self_approval_reason: null })
  // The owner's own job needs a reason.
  const own = await create(page, `${title} owner`)
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [own.id, true])).toContain('To approve it yourself, write the reason in the note (owner only).')
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [own.id, true, 'Client starts on Monday; no second person available.'])).toContain('Job approved and live.')
  expect((await db().from('job_posts').select('self_approval_reason').eq('id', own.id).single()).data?.self_approval_reason).toBe('Client starts on Monday; no second person available.')

  // Public: the label, no client identity anywhere.
  await page.context().clearCookies()
  await page.goto(`/jobs?q=${encodeURIComponent(stamp.toString())}`)
  await expect(page.locator('article', { hasText: title }).first().getByText(W1)).toBeVisible()
  await page.goto(`/jobs/${j.slug}`)
  await expect(page.getByText(W1).first()).toBeVisible()
  await expect(page.getByText(W3)).toBeVisible()
  await expect(page.getByText(W4)).toBeVisible()
  const html = await page.content()
  const ld = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((m) => m[1]).join('\n')
  expect(ld).toContain('"hiringOrganization":{"@type":"Organization","name":"HagerLand"')
  for (const path of [`/jobs/${j.slug}`, '/sitemap/jobs.xml', `/search?q=${encodeURIComponent(title)}`, `/jobs?q=${encodeURIComponent(title)}`]) {
    const body = await (await page.request.get(path)).text()
    for (const secret of [clientName, pcAssignment, 'hagerland-services', 'HagerLand Services']) expect(body, `${secret} on ${path}`).not.toContain(secret)
  }
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  const row = (await anon.from('jobs_public').select('*').eq('id', j.id).single()).data as Record<string, unknown>
  expect(row).toMatchObject({ employer_name: W1, employer_slug: null, employer_logo_path: null, employer_verification: null, posted_for: 'private_client' })
  expect(JSON.stringify(row)).not.toContain(clientName)
  // A candidate applies by email: HagerLand's inbox, never the client; the desk lists it and adds it to the shortlist.
  const candidate = await createUser({ name: 'Private Applicant' })
  const cp = await browser.newPage()
  await signIn(cp, candidate.email, candidate.password)
  await cp.goto(`/jobs/${j.slug}/apply`)
  await cp.getByLabel('Full name').fill('Private Applicant')
  await cp.getByLabel('Phone').fill(randomPhone())
  await cp.getByRole('button', { name: 'Send application' }).click()
  await cp.waitForURL('**/account/applications?applied=*')
  const ref = new URL(cp.url()).searchParams.get('applied')!
  const inbox = await mailWithSubject('inbox@test.hagerland.invalid', ref)
  expect(inbox.subject).toContain(`New application for ${title}`)
  const sent = await mailWithSubject(candidate.email, ref)
  expect(sent.text).toContain('to HagerLand.')
  expect(sent.text).not.toContain(clientName)
  await cp.close()
  await ops.page.goto(`/roodber8/jobs/desk/${pcAssignment}`)
  const item = ops.page.locator('li', { hasText: ref })
  await item.getByRole('button', { name: 'Add to shortlist' }).click()
  await expect.poll(async () => (await db().from('recruitment_candidates').select('source, other_employer, name').eq('assignment_id', pcAssignment).eq('source', 'application')).data).toEqual([{ source: 'application', other_employer: false, name: 'Private Applicant' }])
  await page.goto('/terms')
  await expect(page.getByText(W27, { exact: false })).toBeVisible()
})

test('J12: private-client switch Off — no desk button, create and approve refused, the job hidden everywhere, no Terms line', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const { data: pub } = await db().from('job_posts').select('id, slug, title').eq('posted_for', 'private_client').eq('status', 'published').limit(1).single()
  await setSwitch(page, 'Private-client jobs', false)
  await ops.page.goto(`/roodber8/jobs/desk/${pcAssignment}`)
  await expect(ops.page.getByText('Private-client jobs are switched off (owner switch on Switches and data deletion).')).toBeVisible()
  await expect(ops.page.getByRole('button', { name: 'Create the job for review' })).toHaveCount(0)
  const { data: hs } = await db().from('organisations').select('id').eq('slug', 'hagerland-services').single()
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data: pending } = await db().from('job_posts').insert({ slug: `e2e-p4-off-${stamp}`, employer_org_id: hs!.id, title: 'E2E P4 pending private', category: 'construction', employment_type: 'daily_labour', location_id: loc!.id, description: 'A pending private-client job while the switch is off.', status: 'pending_review', posted_for: 'private_client', recruitment_assignment_id: pcAssignment, created_by_staff: 'someone-else' }).select('id').single()
  await adminSession(page)
  expect(await callAction(page, 'actions/jobs', 'jobDecisionAction', [pending!.id, true])).toContain('Private-client jobs are switched off.')
  await page.context().clearCookies()
  expect((await page.goto(`/jobs/${pub!.slug}`))?.status()).toBe(404)
  for (const path of ['/sitemap/jobs.xml', `/jobs?q=${encodeURIComponent(pub!.title)}`, `/search?q=${encodeURIComponent(pub!.title)}`]) expect(await (await page.request.get(path)).text(), path).not.toContain(pub!.slug)
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  expect((await anon.from('jobs_public').select('id').eq('posted_for', 'private_client')).data ?? []).toHaveLength(0)
  await page.goto('/terms')
  await expect(page.getByText(W27, { exact: false })).toHaveCount(0)
  await expect(page.getByText('Anyone can report a job; HagerLand reviews reports and may pause or remove a job.')).toBeVisible()
})

test('J13: work outside Ethiopia is refused for private-client jobs (database) and for desk assignments', async () => {
  const { data: hs } = await db().from('organisations').select('id').eq('slug', 'hagerland-services').single()
  const { data: abroad } = await db().from('locations').select('id').neq('country_code', 'ET').eq('level', 'city').limit(1).single()
  const res = await db().from('job_posts').insert({ slug: `e2e-p4-abroad-${stamp}`, employer_org_id: hs!.id, title: 'E2E P4 abroad', category: 'construction', employment_type: 'daily_labour', location_id: abroad!.id, description: 'A private-client job abroad that must be refused.', status: 'pending_review', posted_for: 'private_client', recruitment_assignment_id: pcAssignment, created_by_staff: 'e2e' })
  expect(res.error?.code).toBe('23514')
})

test('J14: unchanged — plumbers form, a company page with a legacy badge, a normal employer job', async ({ page }) => {
  await page.context().clearCookies()
  expect((await page.goto('/request-service/plumbers'))?.status()).toBe(200)
  await expect(page.getByText('Are you based outside Ethiopia?')).toHaveCount(0)
  expect((await page.goto('/company/hagerland-supply'))?.status()).toBe(200)
  const html = await page.content()
  expect(html).not.toContain('and tax number on')
  const normal = await seedJob(employer.orgId, `E2E P4 Normal ${stamp}`)
  await page.goto(`/jobs/${normal.slug}`)
  await expect(page.getByText(`E2E P4 Employer ${stamp}`).first()).toBeVisible()
  await expect(page.getByText(W1)).toHaveCount(0)
  await expect(page.getByText('Only HagerLand can see your application.')).toHaveCount(0)
})

test('J15: plain 375 px window — job page, report sheet, desk and verification page', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  const fresh = await seedJob(employer.orgId, `E2E P4 Small ${stamp}`)
  await page.goto(`/jobs/${fresh.slug}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await page.getByRole('button', { name: 'Report this job' }).click()
  await expect(page.getByRole('dialog', { name: 'Report this job' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await adminSession(page)
  await page.goto(`/roodber8/jobs/desk/${pcAssignment}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  // (The admin organisation page is already wider than 375 px before this phase: recorded in the report, not changed here.)
  await signIn(page, owned.user.email, owned.user.password)
  await page.goto('/account/company/verification')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await ctx.close()
})
