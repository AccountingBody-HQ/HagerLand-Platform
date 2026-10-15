import { expect, test, type Page } from '@playwright/test'
import { adminSession, adminSetPillarModes, createProvider, createUser, db, mailWithSubject, signIn, testPhotos } from './helpers'

/** Jobs & Recruitment (spec 24.9), development progress updates (25.2j) and Our Developments (24.10). */

test.describe.configure({ mode: 'serial' })

/** Jobs and Our Developments follow their pillar modes: switched through the admin screen unless already in that state. */
async function switchArea(page: Page, key: 'jobs' | 'our-developments', live: boolean) {
  const { data } = await db().from('verticals').select('status').eq('key', key).single()
  if ((data?.status === 'live') === live) return
  if (key === 'jobs') await adminSetPillarModes(page, 'jobs', 'Jobs, Recruitment & Staffing', { direct: live, aggregate: live, interest: true })
  else await adminSetPillarModes(page, 'our-developments', 'Our Developments', { direct: live }, { service: true })
}

/** Back to the launch modes (Jobs live, Our Developments interest only) when a test changed them. */
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await switchArea(page, 'jobs', true)
  await switchArea(page, 'our-developments', false)
  await page.close()
})

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

async function uploadCv(page: Page, name = 'cv.pdf', mimeType = 'application/pdf', buffer = PDF) {
  await page.locator('input[type=file]').setInputFiles({ name, mimeType, buffer })
}

test('with Interest only, jobs shows the landing with employer and candidate interest, and account pages say so', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'switches pillar modes through the admin screen')
  await switchArea(page, 'jobs', false)
  await page.context().clearCookies()
  await page.goto('/jobs')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Jobs in construction, engineering and property')
  await expect(page.getByText('I am hiring')).toBeVisible()
  await expect(page.getByText('I am looking for work')).toBeVisible()
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
  const user = await createUser()
  await signIn(page, user.email, user.password)
  await page.goto('/account/candidate')
  await expect(page.getByText('Jobs on HagerLand open soon')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Candidate profile' })).toHaveCount(0)
})

test('switched live: an employer posts a job, HagerLand approves it, a candidate applies with a CV and the employer shortlists them', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  const stamp = Date.now()
  const employer = await createProvider({ name: `E2E Hiring Builders ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const candidate = await createUser({ name: 'Selam Candidate' })
  const title = `E2E Site engineer ${stamp}`

  await switchArea(page, 'jobs', true)

  // Employer posts and submits a job.
  const emp = await browser.newPage()
  await signIn(emp, employer.user.email, employer.user.password)
  await emp.goto('/account/jobs')
  await expect(emp.getByRole('link', { name: 'Jobs', exact: true })).toBeVisible()
  await emp.goto('/account/jobs/new')
  await emp.getByLabel('Job title').fill(title)
  await emp.getByLabel('Category').selectOption('engineering')
  await emp.getByLabel('Type of job').selectOption('full_time')
  await emp.locator('#job-location').fill('Bole')
  await emp.getByRole('option', { name: /^Bole/ }).first().click()
  await emp.locator('#job-smin').fill('30000')
  await emp.locator('#job-smax').fill('45000')
  await emp.locator('#job-speriod').selectOption('month')
  await emp.getByLabel('Description').fill('Supervise reinforced concrete works on a G+12 residential building in Bole.')
  await emp.getByRole('button', { name: 'Submit for review' }).click()
  await expect(emp.getByText('Sent to HagerLand for review')).toBeVisible()
  const { data: job } = await db().from('job_posts').select('id, slug, status, currency').eq('title', title).single()
  expect(job).toMatchObject({ status: 'pending_review', currency: 'ETB' })

  // Not public before approval.
  expect((await page.goto(`/jobs/${job!.slug}`))?.status()).toBe(404)

  // HagerLand approves it in the review queue.
  await adminSession(page)
  await page.goto('/roodber8/review?tab=jobs')
  await expect(page.getByText(title)).toBeVisible()
  await page.goto(`/roodber8/jobs/${job!.id}`)
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect.poll(async () => (await db().from('job_posts').select('status').eq('id', job!.id).single()).data?.status).toBe('published')
  await mailWithSubject(employer.user.email, `Your job is live: ${title}`)

  // Public board, filters and JobPosting structured data.
  await page.goto(`/jobs?category=engineering&loc=addis-ababa&q=${encodeURIComponent('site engineer')}`)
  await expect(page.getByRole('link', { name: title })).toBeVisible()
  await page.goto(`/jobs/${job!.slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  await expect(page.getByText('ETB 30,000 – 45,000 per month')).toBeVisible()
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(ld.some((t) => t.includes('"JobPosting"') && t.includes('"FULL_TIME"'))).toBe(true)
  // Site search covers jobs while the vertical is live.
  await page.goto(`/search?q=${encodeURIComponent(`site engineer ${stamp}`)}`)
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: title })).toBeVisible()

  // Candidate builds a profile with a CV (PDF or Word only), visible to employers.
  const cand = await browser.newPage()
  await signIn(cand, candidate.email, candidate.password)
  await cand.goto('/account/candidate')
  await uploadCv(cand, 'notes.txt', 'text/plain', Buffer.from('not a cv'))
  await expect(cand.getByText('Upload your CV as a PDF or Word (.docx) file.')).toBeVisible()
  await uploadCv(cand)
  await expect(cand.getByRole('button', { name: 'Remove' })).toBeVisible()
  await cand.locator('#cp-headline').fill(`Civil engineer, 6 years on high-rise projects ${stamp}`)
  await cand.locator('#cp-skills').fill('AutoCAD, site supervision, formwork')
  await cand.locator('#cp-vis-employers').check()
  await cand.getByRole('button', { name: 'Save profile' }).click()
  await expect(cand.getByText(/Employers on HagerLand can now find it/)).toBeVisible()

  // Applies with the saved CV.
  await cand.goto(`/jobs/${job!.slug}`)
  await cand.getByRole('link', { name: 'Apply now' }).click()
  await expect(cand.getByLabel('Send the CV saved in my candidate profile')).toBeChecked()
  await cand.locator('#ap-note').fill('I have run concrete works on three G+10 buildings.')
  await cand.getByRole('button', { name: 'Send application' }).click()
  await cand.waitForURL(/\/account\/applications\?applied=HLA-/)
  await expect(cand.getByText(/Your application has been sent/)).toBeVisible()
  await mailWithSubject(candidate.email, `Application sent: ${title}`)
  await mailWithSubject(employer.user.email, `New application for ${title}`)

  // Applying twice is refused.
  await cand.goto(`/jobs/${job!.slug}/apply`)
  await cand.getByRole('button', { name: 'Send application' }).click()
  await expect(cand.getByText('You have already applied for this job')).toBeVisible()

  // Employer reads it, opens the CV through a private link, and shortlists.
  await emp.goto(`/account/jobs/${job!.id}`)
  await expect(emp.getByText('Selam Candidate')).toBeVisible()
  const cvRes = await emp.request.get(await emp.getByRole('link', { name: 'Download CV' }).getAttribute('href').then((h) => h ?? ''), { maxRedirects: 0 })
  expect(cvRes.status()).toBe(307)
  expect(cvRes.headers()['location']).toContain('/storage/v1/object/sign/private-docs/docs/cv/')
  await emp.getByLabel('Status').selectOption('shortlisted')
  await emp.getByRole('button', { name: 'Update' }).click()
  await expect(emp.getByText('Application updated.')).toBeVisible()
  await cand.goto('/account/applications')
  await expect(cand.getByText('Shortlisted')).toBeVisible()

  // A stranger cannot open the CV.
  const stranger = await createUser()
  const other = await browser.newPage()
  await signIn(other, stranger.email, stranger.password)
  const { data: app } = await db().from('job_applications').select('id').eq('job_id', job!.id).single()
  expect((await other.request.get(`/account/cv/${app!.id}`, { maxRedirects: 0 })).status()).toBe(404)

  // Employers find the opted-in candidate, without contact details.
  await emp.goto('/account/jobs/candidates?q=formwork')
  await expect(emp.getByText(`Civil engineer, 6 years on high-rise projects ${stamp}`)).toBeVisible()
  await expect(emp.locator('main')).not.toContainText(candidate.email)

  await db().from('job_posts').delete().eq('id', job!.id)
  await db().from('candidate_profiles').delete().eq('user_id', candidate.id)
  await db().from('organisations').delete().eq('id', employer.orgId)
})

test('staffing requirements go through the request engine, and the daily job closes old jobs and deletes old CVs', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await switchArea(page, 'jobs', true)
  const { data: svc } = await db().from('service_categories').select('vertical_key, question_schema').eq('slug', 'staffing').single()
  expect(svc?.vertical_key).toBe('jobs')
  expect(JSON.stringify(svc?.question_schema)).toContain('How many people?')
  await page.goto('/request-service/staffing')
  await expect(page.getByLabel('Which roles do you need to fill?')).toBeVisible()

  const employer = await createProvider({ name: `E2E Expiry Co ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  const applicant = await createUser()
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa').single()
  const { data: job } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-old-job-${Date.now()}`, employer_org_id: employer.orgId, title: 'E2E Old job', category: 'construction', employment_type: 'contract', location_id: loc!.id, description: 'A job that closed a while ago, for the daily job test.', status: 'published' })
    .select('id')
    .single()
  await db().from('job_posts').update({ expires_at: new Date(Date.now() - 86_400_000).toISOString() }).eq('id', job!.id)
  const cvPath = `docs/cv/${applicant.id}/old.pdf`
  await db().storage.from('private-docs').upload(cvPath, PDF, { contentType: 'application/pdf' })
  const { data: app } = await db()
    .from('job_applications')
    .insert({ job_id: job!.id, applicant_user_id: applicant.id, name: 'Old Applicant', email: applicant.email, cv_path: cvPath, created_at: new Date(Date.now() - 400 * 86_400_000).toISOString() })
    .select('id')
    .single()
  const res = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
  expect(res.jobsExpired).toBeGreaterThanOrEqual(1)
  expect(res.cvsPurged).toBeGreaterThanOrEqual(1)
  expect((await db().from('job_posts').select('status').eq('id', job!.id).single()).data?.status).toBe('expired')
  const { data: after } = await db().from('job_applications').select('cv_path, cv_purged_at').eq('id', app!.id).single()
  expect(after).toMatchObject({ cv_path: null })
  expect(after?.cv_purged_at).not.toBeNull()
  const { data: files } = await db().storage.from('private-docs').list(`docs/cv/${applicant.id}`)
  expect(files ?? []).toHaveLength(0)
  await db().from('organisations').delete().eq('id', employer.orgId)
})

test('a developer posts a progress update with photos; once HagerLand publishes it, it appears on the development page', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const dev = await createProvider({ name: `E2E Progress Developer ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  await db().from('organisations').update({ kind: 'developer' }).eq('id', dev.orgId)
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const stamp = Date.now()
  const { data: d } = await db()
    .from('developments')
    .insert({ name: `E2E Progress Towers ${stamp}`, slug: `e2e-progress-${stamp}`, developer_org_id: dev.orgId, location_id: loc!.id, description: 'A residential building used for the progress updates test.', status: 'published', completion_status: 'under_construction' })
    .select('id, slug')
    .single()
  const owner = await browser.newPage()
  await signIn(owner, dev.user.email, dev.user.password)
  await owner.goto(`/account/developments/${d!.id}`)
  await owner.getByLabel('Title').last().fill('Ground-floor slab poured')
  await owner.locator('#du-date').fill('2026-10-01')
  await owner.getByLabel('What happened').fill('The ground-floor slab was poured and is curing on schedule.')
  const [photo] = await testPhotos(1)
  await owner.locator('input[type=file][aria-label="Add progress photos"]').setInputFiles(photo)
  await expect(owner.getByRole('button', { name: 'Remove photo 1' })).toBeVisible()
  await owner.getByRole('button', { name: 'Post update' }).click()
  await expect(owner.getByText(/once HagerLand has reviewed it/)).toBeVisible()
  const { data: upd } = await db().from('development_updates').select('id, status, photo_paths').eq('development_id', d!.id).single()
  expect(upd?.status).toBe('pending_review')
  expect(upd?.photo_paths).toHaveLength(1)

  await page.goto(`/developments/${d!.slug}`)
  await expect(page.getByRole('heading', { name: 'Construction progress' })).toHaveCount(0)

  await adminSession(page)
  await page.goto(`/roodber8/developments/${d!.id}`)
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect.poll(async () => (await db().from('development_updates').select('status').eq('id', upd!.id).single()).data?.status).toBe('published')
  await page.goto(`/developments/${d!.slug}`)
  await expect(page.getByRole('heading', { name: 'Construction progress' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ground-floor slab poured' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Ground-floor slab poured, photo 1/ })).toBeVisible()
  await db().from('developments').delete().eq('id', d!.id)
  await db().from('organisations').delete().eq('id', dev.orgId)
})

test('Our Developments: coming soon makes no claims; live, HagerLand projects are grouped by stage', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await page.goto('/our-developments?cs=1')
  await expect(page.getByText(/intends to develop carefully selected residential/).first()).toBeVisible()
  await expect(page.getByText(/HagerLand Supply/).first()).toBeVisible()
  await expect(page.locator('#register')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/our current projects|units sold|now selling/i)

  const { data: hl } = await db().from('organisations').select('id').eq('kind', 'hagerland').limit(1).maybeSingle()
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/yeka').single()
  const stamp = Date.now()
  const { data: made, error: madeError } = await db()
    .from('developments')
    .insert([
      { name: `E2E HL Current ${stamp}`, slug: `e2e-hl-current-${stamp}`, developer_org_id: hl?.id ?? null, is_hagerland: true, location_id: loc!.id, status: 'pending_review', completion_status: 'under_construction', price_from_etb: 4_200_000, unit_types: [{ type: 'Two-bedroom apartment', beds: 2, area_min: 85, price_from_etb: 4_200_000 }] },
      { name: `E2E HL Done ${stamp}`, slug: `e2e-hl-done-${stamp}`, developer_org_id: hl?.id ?? null, is_hagerland: true, location_id: loc!.id, status: 'pending_review', completion_status: 'ready', price_from_etb: null, unit_types: [] },
    ])
    .select('id')
  expect(madeError).toBeNull()
  try {
    // Approved through the admin screen, which refreshes the cached project lists.
    await adminSession(page)
    for (const m of made ?? []) {
      await page.goto(`/roodber8/developments/${m.id}`)
      await page.getByRole('button', { name: 'Approve' }).first().click()
      await expect.poll(async () => (await db().from('developments').select('status').eq('id', m.id).single()).data?.status).toBe('published')
    }
    await switchArea(page, 'our-developments', true)
    await page.goto(`/our-developments?live=${stamp}`)
    await expect(page.getByRole('heading', { name: 'Current projects' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Completed' })).toBeVisible()
    await expect(page.getByText(`E2E HL Current ${stamp}`)).toBeVisible()
    await page.goto(`/our-developments/e2e-hl-current-${stamp}`)
    await expect(page.getByRole('heading', { name: 'Unit types' })).toBeVisible()
    await expect(page.getByText('Two-bedroom apartment').first()).toBeVisible()
    await expect(page.getByText(/ETB 4,200,000/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Register interest or book a visit' })).toBeVisible()
  } finally {
    await switchArea(page, 'our-developments', false)
    await db().from('developments').delete().in('id', (made ?? []).map((m) => m.id))
  }
})
