import { expect, test, type Browser, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { authenticator } from 'otplib'
import { adminSession, asFreshVisitor, createProvider, db, mailWithSubject, randomPhone, signIn, uniqueEmail, submitStaffSignIn, tickTransferConsent } from './helpers'
import { BANNED } from './plain-language-words'

/**
 * Jobs Phase 5 (migration 0043): AB's journeys J1–J14 on the local copy only. Amharic is tested with the TEST-ONLY
 * fixture e2e/fixtures/am-reviewed-test.json (fake "[AM TEST]" text, loaded only in the local test build): no real or
 * machine Amharic is ever marked reviewed.
 */

test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const W2 = 'Some text on this page is shown in English while we finish the translation.'
const W8 = 'Prefer to talk? Ask us to call you'
const W13 = "Thank you. HagerLand's recruitment team will call you. If you miss the call, you can ask again later."
const W14 = 'You have sent several requests recently. Please try again later.'
const AMTEST = '[AM TEST]'
const fixture = JSON.parse(readFileSync('e2e/fixtures/am-reviewed-test.json', 'utf8')) as Record<string, string>

function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`p5-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}

/** Calls a server action directly, as a crafted request would (plain arguments). */
async function callAction(page: Page, file: string, name: string, args: unknown[], path = '/roodber8'): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  const res = await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args), maxRedirects: 0 })
  return `${res.status()} ${await res.text()}`
}

type SwitchLabel = 'Amharic for Jobs' | 'Call-back requests' | 'Private-client jobs'
async function setSwitch(page: Page, label: SwitchLabel, on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const state = page.getByText(new RegExp(`^${label}: (On|Off)$`))
  if ((await state.textContent())?.endsWith(on ? 'On' : 'Off')) return
  const box = state.locator('..')
  if (on && (await box.getByRole('checkbox').count())) await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  await expect(page.getByText(`${label} is now ${on ? 'on' : 'off'} on the website.`)).toBeVisible()
}

/** Site-wide Amharic through the real admin form (it also refreshes the cached pages). */
async function setSiteAmharic(page: Page, on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/settings')
  const panel = page.locator('form').filter({ has: page.getByLabel('Show the Amharic version') })
  if (on) await panel.getByLabel('Show the Amharic version').check()
  else await panel.getByLabel('Show the Amharic version').uncheck()
  await panel.getByRole('button', { name: /Save/ }).click()
  await expect(panel.getByText(/Saved/)).toBeVisible()
}

/** The middleware re-reads the Amharic switches at most once a minute. */
async function waitForAm(page: Page, status: number) {
  await expect.poll(async () => (await page.request.get('/am/jobs')).status(), { timeout: 90_000, intervals: [5_000] }).toBe(status)
}

const cron = async (page: Page) =>
  (await (await page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()) as {
    callbackBlocksRemoved: number | null
    jobsDataCleanup: { mode: string; counts: { due: Record<string, number>; cleared: Record<string, number> } } | null
  }

const noHorizontalScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
const resetCallbackLimits = async () => {
  await db().from('rate_limits').delete().like('key', 'callback:%')
}

async function fillCallback(page: Page, phone: string, opts: { name?: string } = {}) {
  await page.getByLabel('Your name').fill(opts.name ?? 'E2E P5 Caller')
  await page.locator('#cb-phone').fill(phone)
  await page.getByLabel('What do you need?').fill('10 masons in Bole from next month.')
  await page.getByLabel('Area').fill('Bole')
  // QC-3: nothing is chosen at first, so the caller picks the language and the time.
  await page.locator('fieldset', { hasText: 'Language for the call' }).getByText('Amharic', { exact: true }).click()
  await page.getByText('Afternoon', { exact: true }).click()
  await page.getByLabel('HagerLand may call me on this number about my request.').check()
  await tickTransferConsent(page)
  await page.getByRole('button', { name: 'Ask for a call' }).click()
}

const stamp = Date.now()
let employer: Awaited<ReturnType<typeof createProvider>>
let job: { id: string; slug: string }
let privateJob: { id: string; slug: string } | null = null

async function seedJob(title: string, extra: Record<string, unknown> = {}) {
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p5-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, employer_org_id: employer.orgId, title, category: 'construction', employment_type: 'daily_labour', trade: 'mason', location_id: loc!.id, description: 'Block work on a G+2 house in Bole, six days a week, for the Phase 5 tests.', closing_date: '2030-12-31', salary_min_minor: 80000, salary_max_minor: 100000, salary_period: 'day', status: 'published', ...extra })
    .select('id, slug')
    .single()
  if (error || !data) throw new Error(`job seed failed: ${error?.message}`)
  return data
}

test.beforeAll(async ({ browser }) => {
  // Fix F-7 (N-03): a run that stopped half-way may have left Amharic on; switch it off through admin, never skip J1.
  const { data } = await db().from('site_settings').select('key, value').in('key', ['jobs_amharic', 'amharic_enabled'])
  if ((data ?? []).some((r) => r.value === true)) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await setSwitch(page, 'Amharic for Jobs', false)
    await setSiteAmharic(page, false)
    await page.close()
  }
  employer = await createProvider({ name: `E2E P5 Employer ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  job = await seedJob(`E2E P5 Masons ${stamp}`)
  await resetCallbackLimits()
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setSwitch(page, 'Amharic for Jobs', false)
  await setSwitch(page, 'Call-back requests', false)
  await setSwitch(page, 'Private-client jobs', false)
  await page.close()
  await resetCallbackLimits()
})

test('J1: Amharic for Jobs Off — /am/jobs not available, no switch link, no /am sitemap entries, no hreflang', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(180_000)
  const { data } = await db().from('site_settings').select('key, value').in('key', ['jobs_amharic', 'amharic_enabled'])
  expect((data ?? []).filter((r) => r.value === true)).toEqual([])
  // The site reads the switches through a cache of about a minute ("The website updates within a minute"), so a run
  // that has just switched Amharic off waits for it, as J4 does when switching on.
  for (const p of ['/am/jobs', `/am/jobs/${job.slug}`, '/am/request-service/staffing', '/am/account/jobs']) await expect.poll(async () => (await page.request.get(p)).status(), { message: p, timeout: 90_000, intervals: [5_000] }).toBe(404)
  const res = await page.goto('/jobs')
  expect(res?.headers()['link'] ?? '').not.toContain('hreflang')
  await expect(page.getByRole('link', { name: 'አማርኛ' })).toHaveCount(0)
  await expect(page.getByText(W2)).toHaveCount(0)
  const sitemap = await (await page.request.get('/sitemap/jobs.xml')).text()
  expect(sitemap).toContain('<loc>https://www.hagerland.com/jobs/')
  expect(sitemap).not.toContain('/am/')
})

test('J3: the Amharic switch needs the native-speaker tick; Operations cannot see or use the switches', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const box = page.getByText(/^Amharic for Jobs: (On|Off)$/).locator('..')
  await expect(box.getByText('Native-speaker review done: Jobs pages, header and footer, and the Ethiopian date format.')).toBeVisible()
  await box.getByRole('button', { name: 'Switch on' }).click()
  await expect(page.getByText('Tick that the native-speaker review is done before switching this on.')).toBeVisible()
  const cb = page.getByText(/^Call-back requests: (On|Off)$/).locator('..')
  await expect(cb.getByText('Lawyer has confirmed: calling people who leave their number, the consent wording, data held outside Ethiopia, and the keeping period.')).toBeVisible()
  expect((await db().from('site_settings').select('value').eq('key', 'jobs_amharic').single()).data?.value).toBe(false)
  const ops = await staffPage(browser, 'operations')
  expect((await ops.goto('/roodber8/jobs/data'))?.url()).toContain('denied=1')
  expect(await callAction(ops, 'jobs-phase-2', 'setJobsSwitchAction', ['jobs_amharic', true, true])).not.toContain('is now on')
  expect((await db().from('site_settings').select('value').eq('key', 'jobs_amharic').single()).data?.value).toBe(false)
  await ops.close()
})

test('J2: Amharic for Jobs On — reviewed (test) text in Amharic, the rest English with W2; links, SEO, sitemap, Ethiopian dates', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  await setSwitch(page, 'Amharic for Jobs', true)
  await page.context().clearCookies()
  await waitForAm(page, 200)
  const res = await page.goto('/am/jobs')
  expect(res?.headers()['content-language']).toBe('am')
  expect(res?.headers()['link']).toContain('<https://www.hagerland.com/am/jobs>; rel="alternate"; hreflang="am"')
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  // Reviewed (test fixture) text is shown; everything else falls back to English, with the notice.
  await expect(page.getByRole('button', { name: fixture['Search jobs'] })).toBeVisible()
  await expect(page.getByText(W2)).toBeVisible()
  await expect(page.getByText('Need help hiring?')).toBeVisible()
  // Links to Jobs pages keep Amharic; links to other sections stay English.
  await expect(page.locator('footer a[href="/privacy"]')).toHaveCount(1)
  await expect(page.locator('footer a[href="/am/privacy"]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'English' }).first()).toHaveAttribute('href', '/jobs')
  // SEO: own canonical, og:locale am_ET; filtered pages noindex.
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe('https://www.hagerland.com/am/jobs')
  expect(await page.locator('meta[property="og:locale"]').getAttribute('content')).toBe('am_ET')
  await page.goto(`/am/jobs?q=${stamp}`)
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex')
  await expect(page.locator(`a[href="/am/jobs/${job.slug}"]`).first()).toBeVisible()
  // The job page: Ethiopian date first, Gregorian in brackets; the share link is the /am address.
  await page.goto(`/am/jobs/${job.slug}`)
  await expect(page.getByText(/\[AM TEST\] Closes [^\n(]*ታኅሣሥ[^\n(]* \(31 Dec 2030\)/)).toBeVisible()
  await expect(page.getByRole('heading', { name: fixture['Share this job'] })).toBeVisible()
  const wa = await page.locator('[aria-labelledby="share-job-h"] a', { hasText: 'WhatsApp' }).getAttribute('href')
  expect(decodeURIComponent(wa ?? '')).toContain(`[AM TEST] E2E P5 Masons ${stamp} · Bole · https://www.hagerland.com/am/jobs/${job.slug}`)
  // The English page offers the switch and advertises the Amharic version.
  const en = await page.goto('/jobs')
  expect(en?.headers()['link']).toContain('hreflang="am"')
  await expect(page.getByRole('link', { name: 'አማርኛ' }).first()).toHaveAttribute('href', '/am/jobs')
  // Not a Jobs page: still not available in Amharic (site-wide Amharic is off).
  expect((await page.request.get('/am/property')).status()).toBe(404)
  expect((await page.request.get('/am/request-service/plumbers')).status()).toBe(404)
  // The jobs sitemap lists the Amharic pages while the switch is on.
  await expect.poll(async () => (await (await page.request.get('/sitemap/jobs.xml')).text()).includes(`https://www.hagerland.com/am/jobs/${job.slug}`), { timeout: 30_000 }).toBe(true)
  // The staffing journey and the call-back path (when on) are Jobs pages too.
  await page.goto('/am/request-service/staffing')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fixture['Submit a staffing requirement'])
  await expect(page.getByText(W2)).toBeVisible()
  // Plain-language check on the Amharic Jobs pages (S9) and the listed headings/buttons do not fall back.
  for (const p of ['/am/jobs', `/am/jobs/${job.slug}`, '/am/request-service/staffing']) {
    await page.goto(p)
    const text = await page.evaluate(() => `${document.body.innerText}\n${document.title}`)
    for (const [name, re] of BANNED) expect(text.split('\n').find((l) => re.test(l)), `"${name}" on ${p}`).toBeUndefined()
    expect(text).toContain(AMTEST)
  }
  // The Jobs account pages for a signed-in employer.
  await signIn(page, employer.user.email, employer.user.password)
  await page.goto('/am/account/jobs')
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await expect(page.getByRole('heading', { name: fixture.Jobs, exact: true })).toBeVisible()
  await expect(page.getByText(W2)).toBeVisible()
})

test('J4: the site-wide Amharic version behaves exactly as before on Jobs pages', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  await setSwitch(page, 'Amharic for Jobs', false)
  await setSiteAmharic(page, true)
  try {
    await page.context().clearCookies()
    await expect.poll(async () => (await page.request.get('/am')).status(), { timeout: 90_000, intervals: [5_000] }).toBe(200)
    await page.goto('/jobs')
    const englishH1 = await page.getByRole('heading', { level: 1 }).textContent()
    await page.goto('/am/jobs')
    await expect(page.locator('html')).toHaveAttribute('lang', 'am')
    // Body as before (English, no test text, no notice); job links as before (no /am); the site menus in Amharic.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishH1 ?? '')
    expect(await page.evaluate(() => document.body.innerText)).not.toContain(AMTEST)
    await expect(page.getByText(W2)).toHaveCount(0)
    await expect(page.locator(`a[href="/jobs/${job.slug}"]`).first()).toBeVisible()
    await expect(page.locator('footer').getByRole('link', { name: 'ግላዊነት' })).toHaveAttribute('href', '/am/privacy')
    await page.goto(`/am/jobs/${job.slug}`)
    await expect(page.getByText('Closes 31 Dec 2030')).toBeVisible()
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(`https://www.hagerland.com/jobs/${job.slug}`)
    // The legal notes appear while any Amharic version is on (W19, W20).
    await page.goto('/privacy')
    await expect(page.getByText('This policy is written in English. If a translation differs, the English version applies.')).toBeVisible()
  } finally {
    await setSiteAmharic(page, false)
  }
  await page.goto('/privacy')
  await expect(page.getByText('This policy is written in English. If a translation differs, the English version applies.')).toHaveCount(0)
  await page.goto('/terms')
  await expect(page.getByText('These terms are written in English. If a translation differs, the English version applies.')).toHaveCount(0)
})

test('J5: the review sheet export and an import of a test sheet (only OK rows, on a temporary copy)', async ({}, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  const dir = mkdtempSync(join(tmpdir(), 'hl-review-'))
  const sheet = join(dir, 'sheet.csv')
  execFileSync('node', ['scripts/i18n-export-review.mjs', sheet])
  const text = readFileSync(sheet, 'utf8').replace(/^﻿/, '')
  const [header, ...lines] = text.trim().split(/\r\n/)
  expect(header).toBe('key,where,draft (machine-assisted),reviewer text,OK,notes')
  const row = (key: string) => lines.find((l) => l.startsWith(`${key},`) || l.startsWith(`"${key}",`)) ?? ''
  // An existing catalogue entry carries its machine-assisted draft; a new key has no draft and no reviewer text.
  expect(row('Language')).toMatch(/^Language,[^,]*,ቋንቋ,,,$/)
  expect(row('Share this job')).toMatch(/^Share this job,[^,]*,,,,$/)
  // A test sheet: one OK row, one "no", one with broken placeholders. Imported into a COPY of the reviewed file.
  const copy = join(dir, 'am-reviewed.json')
  copyFileSync('lib/i18n/messages/am-reviewed.json', copy)
  const before = readFileSync('lib/i18n/messages/am-reviewed.json', 'utf8')
  writeFileSync(join(dir, 'test.csv'), ['key,where,draft (machine-assisted),reviewer text,OK,notes', 'Share this job,x,,[AM TEST] share,yes,', 'Copy link,x,,[AM TEST] copy,no,', '"Closes {date}",x,,[AM TEST] closes,OK,'].join('\r\n'))
  const out = execFileSync('node', ['scripts/i18n-import-review.mjs', join(dir, 'test.csv'), '--target', copy]).toString()
  expect(out).toContain('Imported 1, unchanged 0, not marked OK 1, refused 1.')
  expect(JSON.parse(readFileSync(copy, 'utf8'))).toEqual({ ...JSON.parse(before), 'Share this job': '[AM TEST] share' })
  // The real file is untouched.
  expect(readFileSync('lib/i18n/messages/am-reviewed.json', 'utf8')).toBe(before)
})

test('J6: share buttons on a live job only; private-client masked; closed jobs not found; no third-party requests', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(240_000)
  const hosts = new Set<string>()
  page.on('request', (r) => hosts.add(new URL(r.url()).host))
  await asFreshVisitor(page)
  await page.goto(`/jobs/${job.slug}`)
  const box = page.locator('[aria-labelledby="share-job-h"]')
  const link = `https://www.hagerland.com/jobs/${job.slug}`
  const message = `E2E P5 Masons ${stamp} in Bole. See the job and apply on HagerLand: ${link}`
  await expect(box.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(message)}`)
  // Tidy T-2 (T2-6): Telegram adds the link itself, so its text leaves it out (the link appears once).
  await expect(box.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`E2E P5 Masons ${stamp} in Bole. See the job and apply on HagerLand.`)}`)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await box.getByRole('button', { name: 'Copy link' }).click()
  await expect(box.getByText('Link copied.')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link)
  expect(Array.from(hosts).filter((h) => !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h))).toEqual([])
  // Not on job cards, account or admin pages.
  await page.goto(`/jobs?q=${stamp}`)
  await expect(page.getByText('Share this job')).toHaveCount(0)
  await signIn(page, employer.user.email, employer.user.password)
  await page.goto(`/account/jobs/${job.id}`)
  await expect(page.getByText('Share this job')).toHaveCount(0)
  await adminSession(page)
  await page.goto(`/roodber8/jobs/${job.id}`)
  await expect(page.getByText('Share this job')).toHaveCount(0)
  // A paused or closed job's link answers "not found".
  const paused = await seedJob(`E2E P5 Paused ${stamp}`)
  await db().from('job_posts').update({ status: 'paused' }).eq('id', paused.id)
  expect((await page.request.get(`/jobs/${paused.slug}`)).status()).toBe(404)
  // A private-client job: the masked text only, never the client.
  await setSwitch(page, 'Private-client jobs', true)
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'staffing').single()
  const { data: req } = await db().from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: `E2E P5 private ${stamp}`, details: 'Masons for a house.', name: `Client Desta ${stamp}`, phone: randomPhone(), email: uniqueEmail('p5-client') }).select('id').single()
  const { data: a } = await db().from('recruitment_assignments').insert({ service_request_id: req!.id, private_client: true, created_by: 'e2e' }).select('id').single()
  const { data: hs } = await db().from('organisations').select('id').eq('slug', 'hagerland-services').single()
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data: pc, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p5-pc-${stamp}`, employer_org_id: hs!.id, title: `E2E P5 Private masons ${stamp}`, category: 'construction', employment_type: 'daily_labour', location_id: loc!.id, description: 'Block work on a G+1 house, six days a week. HagerLand handles all applications.', posted_for: 'private_client', recruitment_assignment_id: a!.id, created_by_staff: 'staff:e2e-creator', status: 'pending_review' })
    .select('id, slug')
    .single()
  expect(error).toBeNull()
  await db().from('job_posts').update({ status: 'published', approved_by: 'admin' }).eq('id', pc!.id)
  privateJob = pc
  const fresh = await browser.newPage()
  await fresh.goto(`/jobs/${pc!.slug}`)
  const pcHref = await fresh.locator('[aria-labelledby="share-job-h"] a', { hasText: 'WhatsApp' }).getAttribute('href')
  expect(decodeURIComponent(pcHref ?? '')).toBe(`https://wa.me/?text=E2E P5 Private masons ${stamp} in Bole, posted by HagerLand for a private client. See the job and apply on HagerLand: https://www.hagerland.com/jobs/${pc!.slug}`)
  expect(await fresh.content()).not.toContain(`Client Desta ${stamp}`)
  await fresh.close()
})

test('J7: Copy for Telegram — Owner and Operations; Agent and Content refused', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto(`/roodber8/jobs/${job.id}`)
  await page.getByRole('button', { name: 'Copy for Telegram' }).click()
  await expect(page.getByTestId('telegram-text')).toHaveValue(`New job: E2E P5 Masons ${stamp} in Bole, ETB 800 – 1,000 per day. Apply on HagerLand: https://www.hagerland.com/jobs/${job.slug}`)
  if (privateJob) {
    expect(await callAction(page, 'actions/jobs', 'telegramTextAction', [privateJob.id])).toContain(`E2E P5 Private masons ${stamp} in Bole, posted by HagerLand for a private client. Apply on HagerLand: https://www.hagerland.com/jobs/${privateJob.slug}`)
  }
  const ops = await staffPage(browser, 'operations')
  await ops.goto(`/roodber8/jobs/${job.id}`)
  await ops.getByRole('button', { name: 'Copy for Telegram' }).click()
  await expect(ops.getByTestId('telegram-text')).toHaveValue(/^New job: E2E P5 Masons/)
  await ops.close()
  for (const role of ['agent', 'content'] as const) {
    const p = await staffPage(browser, role)
    const r = await p.goto(`/roodber8/jobs/${job.id}`)
    expect(r?.url() ?? '', role).not.toContain(`/roodber8/jobs/${job.id}`)
    expect(await callAction(p, 'actions/jobs', 'telegramTextAction', [job.id]), role).not.toContain('New job:')
    await p.close()
  }
})

test('J8: call-backs Off — no box, the form is not found, the server refuses', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(180_000)
  // A form opened while the switch was on, then the switch goes off: the server refuses what is sent.
  await setSwitch(page, 'Call-back requests', true)
  await resetCallbackLimits()
  const visitor = await browser.newPage()
  await asFreshVisitor(visitor)
  await visitor.goto('/jobs/call-back')
  await setSwitch(page, 'Call-back requests', false)
  const before = (await db().from('callback_requests').select('id', { count: 'exact', head: true })).count ?? 0
  await fillCallback(visitor, randomPhone())
  await expect(visitor.getByText('Something went wrong. Please refresh the page.')).toBeVisible()
  expect((await db().from('callback_requests').select('id', { count: 'exact', head: true })).count ?? 0).toBe(before)
  await visitor.close()
  await page.context().clearCookies()
  await page.goto('/jobs')
  await expect(page.getByTestId('callback-box')).toHaveCount(0)
  expect(await page.content()).not.toContain(W8)
  await page.goto('/request-service/staffing')
  await expect(page.getByTestId('callback-box')).toHaveCount(0)
  expect((await page.request.get('/jobs/call-back')).status()).toBe(404)
  const sitemaps = await Promise.all(['/sitemap/static.xml', '/sitemap/jobs.xml'].map(async (p) => (await page.request.get(p)).text()))
  for (const s of sitemaps) expect(s).not.toContain('call-back')
})

test('J9: call-backs On — ask, repeats, limits, and every queue outcome (incl. the pre-filled staffing request)', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(360_000)
  await setSwitch(page, 'Call-back requests', true)
  await resetCallbackLimits()
  const visitor = await browser.newPage()
  await asFreshVisitor(visitor)
  await visitor.goto('/jobs')
  await expect(visitor.getByTestId('callback-box').getByRole('heading', { name: W8 })).toBeVisible()
  await expect(visitor.getByText("Leave your number and HagerLand's recruitment team will call you about the staff you need. There is no charge to ask.").first()).toBeVisible()
  await visitor.goto('/request-service/staffing')
  await expect(visitor.getByTestId('callback-box')).toBeVisible()
  await visitor.getByTestId('callback-box').getByRole('link', { name: 'Ask for a call' }).click()
  await visitor.waitForURL('**/jobs/call-back')
  expect(await visitor.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex')
  const phone = randomPhone()
  await fillCallback(visitor, phone)
  await expect(visitor.getByText(W13)).toBeVisible()
  const e164 = (await db().from('callback_requests').select('phone').eq('name', 'E2E P5 Caller').order('created_at', { ascending: false }).limit(1).single()).data!.phone!
  const rows = async (p: string) => (await db().from('callback_requests').select('id, status, outcome, tries, name, phone, need, service_request_id, personal_data_deleted_at, ip_hash, consent_at, language, time_of_day').eq('phone', p)).data ?? []
  expect(await rows(e164)).toHaveLength(1)
  expect((await rows(e164))[0]).toMatchObject({ status: 'open', language: 'am', time_of_day: 'afternoon', need: '10 masons in Bole from next month.' })
  expect((await rows(e164))[0].ip_hash).toMatch(/^[0-9a-f]{64}$/)
  // The same number again: the same thank-you, no new row.
  await visitor.goto('/jobs/call-back')
  await fillCallback(visitor, phone)
  await expect(visitor.getByText(W13)).toBeVisible()
  expect(await rows(e164)).toHaveLength(1)
  // A busy connection: three an hour.
  await visitor.goto('/jobs/call-back')
  await fillCallback(visitor, randomPhone())
  await expect(visitor.getByText(W13)).toBeVisible()
  await visitor.goto('/jobs/call-back')
  await fillCallback(visitor, randomPhone())
  await expect(visitor.getByText(W14)).toBeVisible()
  await resetCallbackLimits()

  // The queue (Owner): the request, the script, and "no answer" three times closes it.
  await adminSession(page)
  await page.goto('/roodber8/jobs/callbacks')
  await expect(page.getByText('Hello, this is HagerLand. Did you ask us to call you about hiring staff?')).toBeVisible()
  const item = page.locator('li', { hasText: e164.slice(-4) }).filter({ hasText: 'E2E P5 Caller' }).first()
  await expect(item.getByText('10 masons in Bole from next month.')).toBeVisible()
  for (let i = 1; i <= 3; i++) {
    await page.locator('li', { hasText: '10 masons in Bole from next month.' }).filter({ has: page.locator(`a[href="tel:${e164}"]`) }).getByRole('button', { name: 'No answer' }).click()
    await expect.poll(async () => (await rows(e164))[0].tries).toBe(i)
  }
  expect((await rows(e164))[0]).toMatchObject({ status: 'closed', outcome: 'no_answer', tries: 3 })

  // Seeded open requests for the other outcomes (each with its own number).
  const seed = async (name: string) => {
    const p = `+2519${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
    await db().from('callback_requests').insert({ name, phone: p, need: `Need for ${name}`, area_text: 'Bole', language: 'en', time_of_day: 'any', consent_at: new Date().toISOString() })
    return p
  }
  const toRequest = await seed(`E2E P5 Convert ${stamp}`)
  const wrong = await seed(`E2E P5 Wrong ${stamp}`)
  const spam = await seed(`E2E P5 Spam ${stamp}`)
  const plain = await seed(`E2E P5 Done ${stamp}`)
  await page.goto('/roodber8/jobs/callbacks')
  const row = (name: string) => page.locator('li', { hasText: name }).filter({ has: page.getByRole('button', { name: 'Spam' }) })

  // Called — no further action.
  await row(`E2E P5 Done ${stamp}`).getByRole('button', { name: 'Called — no further action' }).click()
  await expect.poll(async () => (await rows(plain))[0]?.outcome).toBe('no_action')

  // Spam.
  page.once('dialog', (d) => d.accept())
  await row(`E2E P5 Spam ${stamp}`).getByRole('button', { name: 'Spam' }).click()
  await expect.poll(async () => (await rows(spam))[0]?.outcome).toBe('spam')

  // Wrong number: details cleared at once, the number blocked; asking again → W13 and no row.
  page.once('dialog', (d) => d.accept())
  await row(`E2E P5 Wrong ${stamp}`).getByRole('button', { name: 'Wrong number / did not ask' }).click()
  await expect.poll(async () => (await db().from('callback_requests').select('personal_data_deleted_at').eq('need', `Need for E2E P5 Wrong ${stamp}`).maybeSingle()).data).toBeNull()
  const cleared = (await db().from('callback_requests').select('name, phone, need, outcome, personal_data_deleted_at').eq('outcome', 'wrong_number').order('handled_at', { ascending: false }).limit(1).single()).data!
  expect(cleared).toMatchObject({ name: null, phone: null, need: null, outcome: 'wrong_number' })
  expect(cleared.personal_data_deleted_at).not.toBeNull()
  expect((await db().from('callback_blocked_phones').select('phone_hash', { count: 'exact', head: true }).gt('blocked_until', new Date(Date.now() + 29 * DAY).toISOString())).count).toBeGreaterThan(0)
  await visitor.goto('/jobs/call-back')
  await fillCallback(visitor, `0${wrong.slice(4)}`, { name: 'E2E P5 Blocked' })
  await expect(visitor.getByText(W13)).toBeVisible()
  expect(await rows(wrong)).toHaveLength(0)

  // Called — turned into a staffing request: the existing staffing form, pre-filled for staff; sending it links the request.
  const [form] = await Promise.all([page.context().waitForEvent('page'), row(`E2E P5 Convert ${stamp}`).getByRole('link', { name: 'Called — turned into a staffing request' }).click()])
  await form.waitForLoadState()
  await expect(form.getByLabel('Your name')).toHaveValue(`E2E P5 Convert ${stamp}`)
  await expect(form.getByLabel('Describe the roles and the work')).toHaveValue(`Need for E2E P5 Convert ${stamp}`)
  await form.getByLabel('Which roles do you need to fill?').fill('Ten masons')
  await form.getByLabel('How many people?').fill('10')
  await form.getByText('Temporary or day labour', { exact: true }).click()
  await form.getByLabel('Give your request a short title').fill(`E2E P5 staffing from a call ${stamp}`)
  await form.locator('#sr-location').fill('Bole')
  await form.getByRole('option', { name: /^Bole/ }).first().click()
  await form.getByLabel('Email').fill(uniqueEmail('p5-caller'))
  await tickTransferConsent(form)
  await form.getByRole('button', { name: 'Send my request' }).click()
  await form.waitForURL('**/request-service/sent**')
  await expect.poll(async () => (await rows(toRequest))[0]?.outcome).toBe('staffing_request')
  const linked = (await rows(toRequest))[0]
  const { data: sr } = await db().from('service_requests').select('id, title').eq('id', linked.service_request_id!).single()
  expect(sr?.title).toBe(`E2E P5 staffing from a call ${stamp}`)
  await form.close()
  // The same link opened by a visitor is just the empty form.
  const { data: other } = await db().from('callback_requests').insert({ name: `E2E P5 Private ${stamp}`, phone: randomPhone().replace(/^0/, '+251'), need: 'Secret need', area_text: 'Bole', language: 'en', time_of_day: 'any', consent_at: new Date().toISOString() }).select('id').single()
  await visitor.goto(`/request-service/staffing?callback=${other!.id}`)
  await expect(visitor.getByLabel('Your name')).toHaveValue('')
  expect(await visitor.content()).not.toContain('Secret need')
  await db().from('callback_requests').update({ status: 'closed', outcome: 'spam' }).eq('id', other!.id)
  // Agent and Content cannot see the queue or record outcomes.
  for (const role of ['agent', 'content'] as const) {
    const p = await staffPage(browser, role)
    const r = await p.goto('/roodber8/jobs/callbacks')
    expect(r?.url() ?? '', role).not.toContain('/roodber8/jobs/callbacks')
    expect(await callAction(p, 'jobs-callbacks', 'recordCallbackOutcomeAction', [other!.id, 'no_action']), role).not.toContain('"ok":true')
    await p.close()
  }
  await visitor.close()
})

test('J10–J12: the daily job removes expired blocks (in Dry run), counts call-backs for deletion, and the digest line', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(180_000)
  expect((await db().from('site_settings').select('value').eq('key', 'jobs_data_cleanup_mode').single()).data?.value).toBe('dry_run')
  const expired = crypto.randomBytes(32).toString('hex')
  const live = crypto.randomBytes(32).toString('hex')
  await db().from('callback_blocked_phones').insert([
    { phone_hash: expired, blocked_until: new Date(Date.now() - DAY).toISOString() },
    { phone_hash: live, blocked_until: new Date(Date.now() + 10 * DAY).toISOString() },
  ])
  const old = new Date(Date.now() - 400 * DAY).toISOString()
  const { data: aged } = await db().from('callback_requests').insert({ name: `E2E P5 Aged ${stamp}`, phone: `+2519${String(stamp).slice(-8)}`, need: 'Old need', area_text: 'Bole', language: 'am', time_of_day: 'any', consent_at: old, created_at: old, status: 'closed', outcome: 'no_action', handled_at: old }).select('id').single()
  await db().from('callback_requests').insert({ name: `E2E P5 Waiting ${stamp}`, phone: `+2519${String(stamp + 1).slice(-8)}`, need: 'Waiting', area_text: 'Bole', language: 'am', time_of_day: 'any', consent_at: new Date().toISOString() })
  const result = await cron(page)
  // J10: the expired block is gone, the current one stays (whatever the deletion mode).
  expect(result.callbackBlocksRemoved).toBeGreaterThanOrEqual(1)
  expect((await db().from('callback_blocked_phones').select('phone_hash').eq('phone_hash', expired)).data).toHaveLength(0)
  expect((await db().from('callback_blocked_phones').select('phone_hash').eq('phone_hash', live)).data).toHaveLength(1)
  // J11: counted for deletion in Dry run, nothing cleared.
  expect(result.jobsDataCleanup?.mode).toBe('dry_run')
  expect(result.jobsDataCleanup?.counts.due.callbacks).toBeGreaterThanOrEqual(1)
  expect(result.jobsDataCleanup?.counts.cleared.callbacks).toBe(0)
  expect((await db().from('callback_requests').select('name').eq('id', aged!.id).single()).data?.name).toBe(`E2E P5 Aged ${stamp}`)
  // J12: the digest line.
  const digest = await mailWithSubject(process.env.ADMIN_DIGEST_EMAIL ?? '', 'digest')
  expect(digest.text).toMatch(/Call-back requests waiting/)
  expect(digest.text).toMatch(/call-back requests whose personal details would be deleted/)
  await db().from('callback_blocked_phones').delete().eq('phone_hash', live)
  await db().from('callback_requests').update({ status: 'closed', outcome: 'spam' }).eq('name', `E2E P5 Waiting ${stamp}`)
})

test('J13: unchanged — plumbers form, the switch-Off journeys, the report sheet, private-client masking, /privacy wording', async ({ page }) => {
  await asFreshVisitor(page)
  await page.goto('/request-service/plumbers')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request plumbers')
  await expect(page.getByTestId('callback-box')).toHaveCount(0)
  await expect(page.getByText('Budget')).toBeVisible()
  // Phase 2 and 3 switches stay off.
  expect((await page.request.get(`/jobs/${job.slug}/apply-by-phone`)).status()).toBe(404)
  await page.goto(`/jobs/${job.slug}`)
  await expect(page.getByRole('button', { name: 'Report this job' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Apply by phone' })).toHaveCount(0)
  await page.goto('/privacy')
  await expect(page.getByText('Call-back requests:', { exact: true })).toBeVisible()
  await expect(page.getByText('your name, phone number, what you need, your area, the language and time of day you prefer, whether you are based outside Ethiopia, and that you agreed to be called.', { exact: false })).toBeVisible()
  await expect(page.getByText('Call-back requests: deleted 12 months after the request or our last call, whichever is later. If you tell us you did not ask for the call, we delete your number straight away and keep only a coded version for 30 days to stop repeat calls.')).toBeVisible()
  await expect(page.getByText('This policy is written in English.')).toHaveCount(0)
})

test('J14: plain 375 px window — /am/jobs (test fixture), the job page with share, the call-back form, the queue', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(240_000)
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  await setSwitch(page, 'Amharic for Jobs', true)
  await setSwitch(page, 'Call-back requests', true)
  await page.context().clearCookies()
  await waitForAm(page, 200)
  for (const p of ['/am/jobs', `/am/jobs/${job.slug}`, `/jobs/${job.slug}`, '/jobs/call-back']) {
    await page.goto(p)
    await noHorizontalScroll(page)
  }
  await page.goto(`/jobs/${job.slug}`)
  for (const b of await page.locator('[aria-labelledby="share-job-h"] a, [aria-labelledby="share-job-h"] button').all()) expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  await adminSession(page)
  await page.goto('/roodber8/jobs/callbacks')
  await noHorizontalScroll(page)
  await setSwitch(page, 'Amharic for Jobs', false)
  await setSwitch(page, 'Call-back requests', false)
  await ctx.close()
})
