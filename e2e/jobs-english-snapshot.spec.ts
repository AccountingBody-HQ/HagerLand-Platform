import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { adminSession, db, signIn } from './helpers'

/**
 * Jobs Phase 5: English Jobs pages must stay exactly as they were when their text moved into t(). The visible text,
 * title, description and canonical of each page (and the form error messages) were recorded from the build before the
 * change (SNAPSHOT_WRITE=1) into e2e/fixtures/jobs-english-snapshot.json; this test compares the current build against
 * it. Seeded with fixed names so the text is the same on every run (local copy only).
 */

const FILE = 'e2e/fixtures/jobs-english-snapshot.json'
const WRITE = process.env.SNAPSHOT_WRITE === '1'
const PASSWORD = 'correct-horse-battery'
const EMPLOYER = 'snapshot-employer@test.hagerland.invalid'
const CANDIDATE = 'snapshot-candidate@test.hagerland.invalid'
const SLUG = 'e2e-snapshot-masons-bole'

async function user(email: string, name: string): Promise<string> {
  const d = db()
  for (let page = 1; page <= 20; page++) {
    const { data } = await d.auth.admin.listUsers({ page, perPage: 1000 })
    const found = data.users.find((u) => u.email === email)
    if (found) return found.id
    if (data.users.length < 1000) break
  }
  const { data, error } = await d.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name } })
  if (error || !data.user) throw new Error(`user failed: ${error?.message}`)
  await d.from('profiles').update({ full_name: name }).eq('id', data.user.id)
  return data.user.id
}

async function seed(): Promise<{ jobId: string; requestId: string }> {
  const d = db()
  const employerId = await user(EMPLOYER, 'Snapshot Employer')
  const candidateId = await user(CANDIDATE, 'Snapshot Candidate')
  const { data: loc } = await d.from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  let { data: org } = await d.from('organisations').select('id').eq('slug', 'e2e-snapshot-builders').maybeSingle()
  if (!org) {
    org = (await d.from('organisations').insert({ kind: 'contractor', name: 'Snapshot Builders', slug: 'e2e-snapshot-builders', location_id: loc!.id, phone: '+251911000222', source: 'admin', status: 'published', verification_level: 'listed' }).select('id').single()).data
    await d.from('organisation_members').insert({ org_id: org!.id, user_id: employerId, role: 'owner' })
  }
  let { data: job } = await d.from('job_posts').select('id').eq('slug', SLUG).maybeSingle()
  if (!job) {
    job = (
      await d
        .from('job_posts')
        .insert({ slug: SLUG, employer_org_id: org!.id, title: 'Snapshot masons for a G+2 house', category: 'construction', employment_type: 'daily_labour', trade: 'mason', location_id: loc!.id, salary_min_minor: 80000, salary_max_minor: 100000, salary_period: 'day', description: 'Block work on a G+2 house in Bole, six days a week. Bring your own hand tools.', requirements: 'Two years of block work.', closing_date: '2030-12-31', status: 'published' })
        .select('id')
        .single()
    ).data
  }
  const { data: app } = await d.from('job_applications').select('id').eq('job_id', job!.id).eq('applicant_user_id', candidateId).maybeSingle()
  if (!app) await d.from('job_applications').insert({ job_id: job!.id, applicant_user_id: candidateId, name: 'Snapshot Candidate', email: CANDIDATE, phone: '+251911000333', cover_note: 'I have built three houses in Bole.', created_at: '2026-10-26T08:00:00Z' })
  const { data: profile } = await d.from('candidate_profiles').select('user_id').eq('user_id', candidateId).maybeSingle()
  if (!profile) await d.from('candidate_profiles').insert({ user_id: candidateId, full_name: 'Snapshot Candidate', headline: 'Mason', visibility: 'private' })
  const { data: cat } = await d.from('service_categories').select('id').eq('slug', 'staffing').single()
  let { data: req } = await d.from('service_requests').select('id').eq('title', 'Snapshot staffing request').maybeSingle()
  if (!req) req = (await d.from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: 'Snapshot staffing request', details: 'Ten masons for a house in Bole.\n\nPay offered: ETB 900 per day', answers: { roles: 'Masons', headcount: 10, employer_abroad: false }, location_id: loc!.id, name: 'Snapshot Employer', phone: '+251911000222', email: EMPLOYER, requester_user_id: employerId, created_at: '2026-10-20T08:00:00Z' }).select('id').single()).data
  return { jobId: job!.id, requestId: req!.id }
}

/**
 * Visible text and head of the page, with times that move on their own replaced. The share box (new in Phase 5, AB's
 * approved wording W3–W5) is left out of the comparison and checked on its own below.
 */
async function capture(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  return page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[aria-labelledby="share-job-h"]'))) el.style.display = 'none'
    const meta = (n: string) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute('content') ?? ''
    const text = document.body.innerText.replace(/Posted [^\n]*? ago/g, 'Posted <time> ago').replace(/Posted (today|yesterday)/g, 'Posted <time> ago').replace(/Last updated \d{1,2} [A-Z][a-z]{2,8} \d{4}/g, 'Last updated <date>').replace(/\b(HLA|HLS)-\d{4}-\d{6}\b/g, '<ref>')
    return { title: document.title, description: meta('description'), ogTitle: meta('og:title'), canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '', lang: document.documentElement.lang, text }
  })
}

/** The job lists are cached for 5 minutes: an admin job action (archiving a throwaway job) refreshes them. */
async function refreshJobLists(browser: Browser) {
  const { data: org } = await db().from('organisations').select('id, location_id').eq('slug', 'e2e-snapshot-builders').single()
  const { data: tmp } = await db().from('job_posts').insert({ slug: `e2e-snapshot-refresh-${Date.now()}`, employer_org_id: org!.id, title: 'Snapshot refresh', category: 'construction', employment_type: 'contract', location_id: org!.location_id, description: 'A throwaway job that only refreshes the cached job lists.', status: 'paused' }).select('id').single()
  const ctx = await browser.newContext()
  const admin = await ctx.newPage()
  await adminSession(admin)
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === 'adminJobStatusAction' && (v.filename ?? '').includes('actions/jobs'))?.[0]
  const res = await admin.request.post('/roodber8', { headers: { 'Next-Action': id ?? '', Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify([tmp!.id, 'archived']) })
  expect(await res.text()).toContain('Job closed.')
  await ctx.close()
}

test('English Jobs pages are unchanged by Jobs Phase 5 (text, title, description, canonical, error messages)', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one width is enough for text')
  test.setTimeout(240_000)
  const { jobId, requestId } = await seed()
  // Other tests leave jobs and visible candidates on the local copy: hide them while recording, so the lists match the recording (put back after).
  const others = ((await db().from('job_posts').select('id').eq('status', 'published').neq('slug', SLUG)).data ?? []).map((j) => j.id)
  if (others.length) await db().from('job_posts').update({ status: 'paused' }).in('id', others)
  const visible = (await db().from('candidate_profiles').select('user_id, visibility').neq('visibility', 'private')).data ?? []
  if (visible.length) await db().from('candidate_profiles').update({ visibility: 'private' }).in('user_id', visible.map((c) => c.user_id))
  try {
    await refreshJobLists(browser)
    await record(page, jobId, requestId)
  } finally {
    if (others.length) await db().from('job_posts').update({ status: 'published' }).in('id', others)
    for (const c of visible) await db().from('candidate_profiles').update({ visibility: c.visibility }).eq('user_id', c.user_id)
    await refreshJobLists(browser)
  }
})

async function record(page: Page, jobId: string, requestId: string) {
  const out: Record<string, unknown> = {}
  const pub = ['/jobs', `/jobs?q=snapshot`, `/jobs?trade=mason`, `/jobs/${SLUG}`, '/request-service/staffing', '/request-service/sent?ref=HLS-2026-000001&for=staffing', '/terms', '/request-service/plumbers']
  for (const p of pub) out[p] = await capture(page, p)
  // The only addition on English Jobs pages: the share box on the job page, in the approved words.
  await page.goto(`/jobs/${SLUG}`)
  const share = page.locator('[aria-labelledby="share-job-h"]')
  await expect(share.getByRole('heading', { name: 'Share this job' })).toBeVisible()
  await expect(share.getByRole('link', { name: 'WhatsApp' })).toBeVisible()
  await expect(share.getByRole('link', { name: 'Telegram' })).toBeVisible()
  await expect(share.getByRole('button', { name: 'Copy link' })).toBeVisible()
  // The report sheet as a visitor sees it.
  await page.goto(`/jobs/${SLUG}`)
  await page.getByRole('button', { name: 'Report this job' }).click()
  out['report sheet'] = await page.getByRole('dialog').innerText()
  // Errors from the staffing form when nothing is filled in.
  await page.goto('/request-service/staffing')
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForTimeout(1500)
  out['staffing form errors'] = await page.locator('form').first().innerText()
  // The employer's pages.
  await signIn(page, EMPLOYER, PASSWORD)
  for (const [key, p] of [['/account/jobs', '/account/jobs'], ['/account/jobs/new', '/account/jobs/new'], ['/account/jobs/[id]', `/account/jobs/${jobId}`], ['/account/jobs/candidates', '/account/jobs/candidates'], ['/account/service-requests/[id]', `/account/service-requests/${requestId}`]]) {
    const c = await capture(page, p)
    out[key] = { ...c, canonical: c.canonical.replace(jobId, '[id]').replace(requestId, '[id]') }
  }
  await page.goto('/account/jobs/new')
  await page.getByRole('button', { name: /Submit for review/ }).click()
  await page.waitForTimeout(1500)
  out['job form errors'] = await page.locator('form').first().innerText()
  // The candidate's pages.
  await page.context().clearCookies()
  await signIn(page, CANDIDATE, PASSWORD)
  for (const p of ['/account/candidate', '/account/applications', `/jobs/${SLUG}/apply`]) out[p] = await capture(page, p)
  if (WRITE) {
    mkdirSync('e2e/fixtures', { recursive: true })
    writeFileSync(FILE, `${JSON.stringify(out, null, 2)}\n`)
    return
  }
  expect(existsSync(FILE), 'snapshot recorded from the build before the change').toBe(true)
  // Times that move on their own ("Posted today" one day, "Posted 2 days ago" the next) are compared as "<time>", and
  // the legal pages' "Last updated" date (set at each release that changes them, F-8) as "<date>".
  const before = JSON.parse(readFileSync(FILE, 'utf8').replace(/Posted (today|yesterday)/g, 'Posted <time> ago').replace(/Last updated \d{1,2} [A-Z][a-z]{2,8} \d{4}/g, 'Last updated <date>')) as Record<string, unknown>
  for (const key of Object.keys(before)) expect(out[key], key).toEqual(before[key])
}
