import { expect, test, type Browser, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { adminSession, allMail, asFreshVisitor, createProvider, createUser, db, linkMatching, mailWithSubject, randomPhone, signIn, uniqueEmail, submitStaffSignIn } from './helpers'

/** Jobs Phase 3 (migration 0041): AB's journeys J1–J8 for the recruitment desk, on the local copy only. */

test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ROW3 = 'You told us you are based outside Ethiopia. We will agree a good time to call you.'
const ROW5 = 'No one has been introduced yet. We introduce only people who have agreed to be introduced to you.'
const ROW7 = 'These people agreed to be introduced to you for this request only. Please do not share their details with anyone else. Candidates must never be asked for money.'
const ROW19 = 'The fee is either a fixed amount or a percentage of pay, as agreed in writing before work starts.'
const addisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const plusDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`p3-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}

/**
 * Calls a server action directly, as a crafted request would. `args` are the leading arguments (JSON); with `form`,
 * the action's last two arguments are (previous state, form data).
 */
async function callAction(page: Page, file: string, name: string, args: unknown[], form?: Record<string, string>, path = '/roodber8'): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  if (!form) return (await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args) })).text()
  const multipart: Record<string, string> = { '0': JSON.stringify([...args, null, '$K1']) }
  for (const [k, v] of Object.entries(form)) multipart[`1_${k}`] = v
  return (await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component' }, multipart })).text()
}

async function setDesk(page: Page, on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const state = page.getByText(/^Recruitment desk: (On|Off)$/)
  if ((await state.textContent())?.endsWith(on ? 'On' : 'Off')) return
  const box = state.locator('..')
  if (on) await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  await expect(page.getByText(`The recruitment desk is now ${on ? 'on' : 'off'} on the website.`)).toBeVisible()
}

async function setMode(page: Page, mode: 'dry_run' | 'live') {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  await page.locator('#jc-mode').selectOption(mode)
  if (mode === 'live' && (await page.locator('#jc-read').count())) await page.locator('#jc-read').check()
  const save = page.getByRole('button', { name: 'Save mode' })
  if (await save.isEnabled()) {
    await save.click()
    await expect(page.getByText(mode === 'live' ? 'Live: the next daily run deletes personal details older than 12 months.' : 'Dry run: the daily run only counts.')).toBeVisible()
  }
}

async function seedJob(orgId: string, title: string) {
  const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data, error } = await db()
    .from('job_posts')
    .insert({ slug: `e2e-p3-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, employer_org_id: orgId, title, category: 'construction', employment_type: 'daily_labour', trade: 'mason', location_id: loc!.id, description: 'Block work on a G+2 house in Bole, six days a week, for the Phase 3 tests.', status: 'published', published_at: new Date().toISOString() })
    .select('id, slug')
    .single()
  if (error || !data) throw new Error(`job seed failed: ${error?.message}`)
  return data
}

async function sendStaffing(page: Page, o: { email: string; abroad: 'Yes' | 'No'; country?: string; title: string }) {
  await page.goto('/request-service/staffing')
  await page.getByLabel('Give your request a short title').fill(o.title)
  await page.getByLabel('Which roles do you need to fill?').fill('Ten masons and a foreman')
  await page.getByLabel('How many people?').fill('11')
  await page.getByText('Temporary or day labour', { exact: true }).click()
  await page.getByLabel('Describe the roles and the work').fill('Block work on a G+2 house in Bole.')
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('Tigist Employer')
  await page.locator('#sr-phone').fill(randomPhone())
  await page.getByLabel('Email').fill(o.email)
  await expect(page.getByText('This helps us arrange calls at a time that suits you.')).toBeVisible()
  await page.locator('fieldset', { hasText: 'Are you based outside Ethiopia?' }).getByText(o.abroad, { exact: true }).click()
  if (o.country) await page.getByLabel('Which country are you in?').selectOption({ label: o.country })
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data } = await db().from('service_requests').select('id, reference, answers').eq('title', o.title).single()
  return { id: data!.id as string, reference: data!.reference as string, answers: data!.answers as Record<string, unknown> }
}

let employer: Awaited<ReturnType<typeof createProvider>>
let otherEmployer: Awaited<ReturnType<typeof createProvider>>
let signedReq: { id: string; reference: string }
let guestReq: { id: string; reference: string }
let guestEmail = ''
let assignmentId = ''
let ops: Page
const stamp = Date.now()
const people = {
  app: { name: `Abebe Desk ${stamp}`, phone: '', ref: '' },
  other: { name: `Hidden Other ${stamp}`, phone: '', ref: '' },
  profile: { name: `Profile Desk ${stamp}`, ref: '', userId: '' },
  register: { name: `Register Desk ${stamp}`, phone: '', ref: '' },
  manual: { name: `Manual Desk ${stamp}`, phone: '' },
}
const candidateId = async (name: string) => (await db().from('recruitment_candidates').select('id').eq('assignment_id', assignmentId).eq('name', name).order('created_at', { ascending: false }).limit(1).single()).data!.id as string

test.beforeAll(async () => {
  employer = await createProvider({ name: `E2E P3 Builders ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  otherEmployer = await createProvider({ name: `E2E P3 Other ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const job = await seedJob(employer.orgId, `E2E P3 Masons ${stamp}`)
  const otherJob = await seedJob(otherEmployer.orgId, `E2E P3 Other job ${stamp}`)
  people.app.phone = randomPhone().replace(/^0/, '+251')
  const { data: a } = await db().from('job_applications').insert({ job_id: job.id, applicant_user_id: null, channel: 'phone', name: people.app.name, phone: people.app.phone, trade: 'mason', area_text: 'Bole', preferred_contact: 'whatsapp', language: 'am', adult_confirmed_at: new Date().toISOString(), consent_at: new Date().toISOString() }).select('reference').single()
  people.app.ref = a!.reference
  const applicant = await createUser({ name: people.other.name })
  people.other.phone = randomPhone().replace(/^0/, '+251')
  const { data: o } = await db().from('job_applications').insert({ job_id: otherJob.id, applicant_user_id: applicant.id, name: people.other.name, email: applicant.email, phone: people.other.phone, cover_note: 'Hidden cover note' }).select('reference').single()
  people.other.ref = o!.reference
  const cand = await createUser({ name: people.profile.name })
  people.profile.userId = cand.id
  await db().from('candidate_profiles').insert({ user_id: cand.id, full_name: people.profile.name, headline: 'Site foreman', visibility: 'employers', placement_wanted: true })
  people.profile.ref = `C-${cand.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
  people.register.phone = randomPhone().replace(/^0/, '+251')
  const { data: w } = await db().from('worker_register').insert({ name: people.register.name, phone: people.register.phone, trades: ['carpenter'], area_text: 'Kirkos', availability: 'now', preferred_contact: 'call', language: 'am', adult_confirmed_at: new Date().toISOString(), consent_at: new Date().toISOString() }).select('reference').single()
  people.register.ref = w!.reference
  // Typed and stored in the international form (+251…), as the desk stores it.
  people.manual.phone = randomPhone().replace(/^0/, '+251')
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setDesk(page, false)
  await setMode(page, 'dry_run')
  await page.close()
  await ops?.close()
})

test('J1: staffing requests with the abroad question; assigning opens one desk assignment; providers and quotes are refused for staffing only', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  await setDesk(page, false)
  // Guest employer abroad.
  await page.context().clearCookies()
  await asFreshVisitor(page)
  guestEmail = uniqueEmail('p3-guest')
  const g = await sendStaffing(page, { email: guestEmail, abroad: 'Yes', country: 'United Kingdom', title: `E2E P3 guest ${stamp}` })
  guestReq = g
  expect(g.answers).toMatchObject({ employer_abroad: true, employer_country: 'GB' })
  expect(g.answers.international).toBeUndefined()
  const mail = await mailWithSubject(guestEmail, g.reference)
  expect(mail.text).toContain(ROW3)
  const link = linkMatching(mail.html, /\/requests\/[A-Za-z0-9_-]{43}/)
  await page.goto(new URL(link).pathname)
  await expect(page.getByText(ROW3)).toBeVisible()
  await expect(page.getByText('Are you based outside Ethiopia?')).toBeVisible()
  await expect(page.getByText('United Kingdom').first()).toBeVisible()
  // The question is optional: without an answer the request is sent and nothing about it is stored.
  await page.goto('/request-service/staffing')
  await page.getByLabel('Give your request a short title').fill(`E2E P3 no answer ${stamp}`)
  await page.getByLabel('Which roles do you need to fill?').fill('Masons')
  await page.getByLabel('How many people?').fill('2')
  await page.getByText('Not sure', { exact: true }).click()
  await page.getByLabel('Describe the roles and the work').fill('Block work on a house in Bole.')
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('No Answer')
  await page.locator('#sr-phone').fill(randomPhone())
  await page.getByLabel('Email').fill(uniqueEmail('p3-noanswer'))
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data: unanswered } = await db().from('service_requests').select('answers').eq('title', `E2E P3 no answer ${stamp}`).single()
  expect(unanswered!.answers).not.toHaveProperty('employer_abroad')
  // "Yes" without a country: the existing message, nothing stored.
  await page.goto('/request-service/staffing')
  await page.getByLabel('Give your request a short title').fill(`E2E P3 no country ${stamp}`)
  await page.getByLabel('Which roles do you need to fill?').fill('Masons')
  await page.getByLabel('How many people?').fill('2')
  await page.getByText('Not sure', { exact: true }).click()
  await page.getByLabel('Describe the roles and the work').fill('Block work on a house in Bole.')
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('No Country')
  await page.locator('#sr-phone').fill(randomPhone())
  await page.getByLabel('Email').fill(uniqueEmail('p3-nocountry'))
  await page.locator('fieldset', { hasText: 'Are you based outside Ethiopia?' }).getByText('Yes', { exact: true }).click()
  await page.getByRole('button', { name: 'Send my request' }).click()
  await expect(page.getByText('Choose one of the options')).toBeVisible()
  expect((await db().from('service_requests').select('id').eq('title', `E2E P3 no country ${stamp}`)).data ?? []).toHaveLength(0)

  // Signed-in employer in Ethiopia.
  await signIn(page, employer.user.email, employer.user.password)
  const s = await sendStaffing(page, { email: employer.user.email, abroad: 'No', title: `E2E P3 signed ${stamp}` })
  signedReq = s
  expect(s.answers).toMatchObject({ employer_abroad: false })
  expect((await mailWithSubject(employer.user.email, s.reference)).text).not.toContain(ROW3)

  // Owner assigns HagerLand's own team: one assignment, the abroad answer copied.
  await adminSession(page)
  await page.goto(`/roodber8/service-requests/${s.id}`)
  await expect(page.getByRole('heading', { name: 'Send to providers' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Send HagerLand’s quote' })).toHaveCount(0)
  await expect(page.getByText('Are you based outside Ethiopia?')).toBeVisible()
  await page.getByRole('button', { name: 'Assign HagerLand’s own team' }).click()
  await expect(page.getByText(/Recruitment desk assignment HLR-\d{4}-\d{6} is open\./)).toBeVisible()
  const { data: a } = await db().from('recruitment_assignments').select('*').eq('service_request_id', s.id).single()
  assignmentId = a!.id
  expect(a).toMatchObject({ employer_org_id: employer.orgId, private_client: false, employer_based_abroad: false, headcount: 11, roles: 'Ten masons and a foreman', status: 'open' })
  await page.reload()
  await expect(page.getByRole('link', { name: a!.reference })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Assign HagerLand’s own team' })).toHaveCount(0)
  // Pressing it again (a crafted second call) never opens a second assignment.
  const again = await callAction(page, 'actions/service-requests', 'assignHagerlandTeamAction', [s.id])
  expect(again).toContain(`already has this request (assignment ${a!.reference})`)
  expect((await db().from('recruitment_assignments').select('id').eq('service_request_id', s.id)).data).toHaveLength(1)

  await page.goto(`/roodber8/service-requests/${g.id}`)
  await page.getByRole('button', { name: 'Assign HagerLand’s own team' }).click()
  await expect(page.getByText(/Recruitment desk assignment HLR-/)).toBeVisible()
  expect((await db().from('recruitment_assignments').select('private_client, employer_based_abroad, employer_country').eq('service_request_id', g.id).single()).data).toEqual({ private_client: true, employer_based_abroad: true, employer_country: 'GB' })

  // Crafted calls: providers, HagerLand's quote and "no provider" are refused for staffing; nothing changes.
  const refused = 'never sent to providers or quoted'
  expect(await callAction(page, 'actions/service-requests', 'matchProvidersAction', [s.id, [otherEmployer.orgId]])).toContain(refused)
  const { data: team } = await db().from('service_request_matches').select('id').eq('request_id', s.id).single()
  expect(await callAction(page, 'actions/service-requests', 'hagerlandQuoteAction', [team!.id], { amount: '5000', currency: 'ETB' })).toContain(refused)
  expect(await callAction(page, 'actions/service-requests', 'noProviderAction', [s.id])).toContain('Close it with the status instead')
  expect((await db().from('service_request_matches').select('org_id, status, quote_amount_minor').eq('request_id', s.id)).data).toEqual([{ org_id: expect.any(String), status: 'accepted', quote_amount_minor: null }])
  expect((await db().from('service_requests').select('status').eq('id', s.id).single()).data?.status).toBe('matched')
  expect((await allMail(employer.user.email)).filter((m) => /quote/i.test(m.subject))).toHaveLength(0)
  // A provider who somehow holds a staffing match cannot accept or quote it.
  const { data: legacy } = await db().from('service_request_matches').insert({ request_id: g.id, org_id: otherEmployer.orgId }).select('id').single()
  const provider = await browser.newPage()
  await signIn(provider, otherEmployer.user.email, otherEmployer.user.password)
  await provider.goto('/account/requests')
  expect(await callAction(provider, 'account/requests/actions', 'respondToMatchAction', [legacy!.id, 'accept'], undefined, '/account/requests')).toContain('This request is no longer waiting for an answer.')
  expect((await db().from('service_request_matches').select('status').eq('id', legacy!.id).single()).data?.status).toBe('offered')
  await db().from('service_request_matches').update({ status: 'accepted' }).eq('id', legacy!.id)
  await provider.goto(`/account/requests/${legacy!.id}`)
  await provider.getByLabel('Total price').fill('900')
  await provider.getByRole('button', { name: 'Send quote' }).click()
  await expect(provider.getByText('You can send a quote once you have accepted the request.')).toBeVisible()
  expect((await db().from('service_request_matches').select('quote_amount_minor').eq('id', legacy!.id).single()).data?.quote_amount_minor).toBeNull()
  await db().from('service_request_matches').update({ status: 'withdrawn' }).eq('id', legacy!.id)
  await provider.close()

  // Other services unchanged: plumbers and renovation still offer "Send to providers", and sending works.
  for (const slug of ['plumbers', 'renovation']) {
    const { data: cat } = await db().from('service_categories').select('id, vertical_key').eq('slug', slug).single()
    const { data: r } = await db().from('service_requests').insert({ vertical_key: cat!.vertical_key, service_category_id: cat!.id, title: `E2E P3 ${slug} ${stamp}`, details: 'A job in Bole.', name: 'Plumbing Customer', phone: randomPhone(), email: uniqueEmail(`p3-${slug}`) }).select('id').single()
    await page.goto(`/roodber8/service-requests/${r!.id}`)
    await expect(page.getByRole('heading', { name: 'Send to providers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recruitment desk' })).toHaveCount(0)
    expect(await callAction(page, 'actions/service-requests', 'matchProvidersAction', [r!.id, [otherEmployer.orgId]])).toContain('Sent to 1 provider')
    expect((await db().from('service_request_matches').select('org_id').eq('request_id', r!.id)).data).toEqual([{ org_id: otherEmployer.orgId }])
  }
})

test('J2: Operations builds the shortlist from four sources; another employer’s applicant stays hidden; no introduction without consent and 18+', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  ops = await staffPage(browser, 'operations')
  await ops.goto('/roodber8/jobs/desk')
  await expect(ops.getByRole('heading', { name: 'Recruitment desk' })).toBeVisible()
  await ops.goto(`/roodber8/jobs/desk/${assignmentId}`)
  const add = async (label: string, value: string, button: string) => {
    await ops.getByLabel(label).fill(value)
    await ops.getByRole('button', { name: button }).click()
    await expect(ops.getByText(/^Added /).first()).toBeVisible()
    await ops.reload()
  }
  await add('Job application reference', people.app.ref, 'Add the applicant')
  await add('Job application reference', people.other.ref, 'Add the applicant')
  await add('Candidate profile reference', people.profile.ref, 'Add the candidate')
  await add('Worker register reference', people.register.ref, 'Add from the register')
  await ops.getByLabel('Name (after a call)').fill(people.manual.name)
  await ops.locator('#sl-phone').fill(people.manual.phone)
  await ops.locator('#sl-trade').selectOption('labourer')
  await ops.locator('#sl-area').fill('Bole')
  await ops.getByRole('button', { name: 'Add the person' }).click()
  await expect(ops.getByText(/^Added /).first()).toBeVisible()
  await ops.reload()
  const { data: rows } = await db().from('recruitment_candidates').select('source, other_employer, name, phone, email, adult_confirmed_method').eq('assignment_id', assignmentId).order('created_at')
  expect(rows?.map(({ phone, email, ...r }) => ({ ...r, contact: Boolean(phone || email) }))).toEqual([
    { source: 'application', other_employer: false, name: people.app.name, contact: true, adult_confirmed_method: 'source_record' },
    { source: 'application', other_employer: true, name: null, contact: false, adult_confirmed_method: null },
    { source: 'profile', other_employer: false, name: people.profile.name, contact: true, adult_confirmed_method: null },
    { source: 'register', other_employer: false, name: people.register.name, contact: true, adult_confirmed_method: 'source_record' },
    { source: 'manual', other_employer: false, name: people.manual.name, contact: true, adult_confirmed_method: null },
  ])
  expect(rows?.[0].phone).toBe(people.app.phone)
  expect(rows?.[4].phone).toBe(people.manual.phone)
  const html = await ops.content()
  expect(html).not.toContain(people.other.name)
  expect(html).not.toContain(people.other.phone)
  expect(html).not.toContain('Hidden cover note')
  await expect(ops.getByText(/contact details hidden until they agree/)).toBeVisible()
  // A profile that is private, or not asking for placement help, cannot be added.
  const quiet = await createUser({ name: 'Quiet Candidate' })
  await db().from('candidate_profiles').insert({ user_id: quiet.id, full_name: 'Quiet Candidate', visibility: 'private', placement_wanted: true })
  await ops.getByLabel('Candidate profile reference').fill(`C-${quiet.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`)
  await ops.getByRole('button', { name: 'Add the candidate' }).click()
  await expect(ops.getByText('Only visible candidate profiles that ask for placement help can be added.')).toBeVisible()

  // Asked, said no, consent with chosen methods, 18+ on the call.
  const card = (name: string) => ops.locator('li', { hasText: name }).first()
  await card(people.app.name).getByRole('button', { name: 'Mark as asked' }).click()
  await expect(ops.getByText('Marked as asked.')).toBeVisible()
  await card(people.register.name).getByRole('button', { name: 'Said no' }).click()
  await expect(ops.getByText('Recorded: this person said no. They will not be introduced.')).toBeVisible()
  await ops.reload()
  const consent = async (name: string, methods: string[]) => {
    const c = card(name)
    for (const m of methods) await c.getByLabel(m, { exact: true }).check()
    await c.getByRole('button', { name: 'Record consent' }).click()
    // The consent form disappears once consent exists, so the saved row is checked instead of the message.
    await expect.poll(async () => (await db().from('recruitment_candidates').select('consent_at').eq('assignment_id', assignmentId).eq('name', name).single()).data?.consent_at).not.toBeNull()
    await ops.reload()
  }
  await consent(people.app.name, ['Call', 'WhatsApp'])
  await consent(people.manual.name, ['Call', 'SMS'])
  expect((await db().from('recruitment_candidates').select('consent_method, consent_recorded_by, share_phone, share_whatsapp, share_telegram, share_sms, share_email, status').eq('name', people.manual.name).single()).data).toEqual({ consent_method: 'phone_call', consent_recorded_by: expect.stringMatching(/^staff:/), share_phone: true, share_whatsapp: false, share_telegram: false, share_sms: true, share_email: false, status: 'agreed' })

  // Not ready: the introduce list shows only the person with consent and 18+.
  await expect(ops.getByLabel(new RegExp(`^${people.manual.name}`))).toHaveCount(0)
  await expect(ops.getByLabel(new RegExp(`^${people.app.name}`))).toHaveCount(1)
  const manualId = await candidateId(people.manual.name)
  const profileId = await candidateId(people.profile.name)
  expect(await callAction(ops, 'actions/jobs-desk', 'introduceAction', [assignmentId, [profileId]])).toContain('Record their consent first.')
  expect(await callAction(ops, 'actions/jobs-desk', 'introduceAction', [assignmentId, [manualId]])).toContain('Confirm they are 18 or older first.')
  // And the database refuses it directly, whatever the screen does.
  const direct = await db().from('recruitment_candidates').update({ introduced_at: new Date().toISOString(), introduced_by: 'crafted' }).eq('id', manualId)
  expect(direct.error?.code).toBe('23514')
  expect((await db().from('recruitment_candidates').select('introduced_at').eq('id', manualId).single()).data?.introduced_at).toBeNull()
  // 18+ confirmed on the call.
  await card(people.manual.name).getByLabel('The person told me they are 18 or older').check()
  await card(people.manual.name).getByRole('button', { name: 'Record 18 or older' }).click()
  await expect(ops.getByText('Recorded: 18 or older.')).toBeVisible()
  // Operations never reaches the owner switches page.
  await ops.goto('/roodber8/jobs/data')
  await expect(ops).toHaveURL(/denied=1/)
})

test('J3: desk switch Off — an introduction is recorded on the desk only; the employer sees and gets nothing; no fee line in the Terms', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await setDesk(page, false)
  await ops.goto(`/roodber8/jobs/desk/${assignmentId}`)
  await ops.getByLabel(new RegExp(`^${people.app.name}`)).check()
  await ops.getByRole('button', { name: 'Introduce selected' }).click()
  await expect(ops.getByText('1 introduced on the desk only. The recruitment desk switch is off, so nothing is shown or emailed to the employer.')).toBeVisible()
  const emp = await browser.newPage()
  await signIn(emp, employer.user.email, employer.user.password)
  await emp.goto(`/account/service-requests/${signedReq.id}`)
  await expect(emp.getByRole('heading', { name: /E2E P3 signed/ })).toBeVisible()
  await expect(emp.getByRole('heading', { name: 'People introduced to you' })).toHaveCount(0)
  await expect(emp.getByText(/Candidates introduced:/)).toHaveCount(0)
  expect(await emp.content()).not.toContain(people.app.name)
  expect((await allMail(employer.user.email)).filter((m) => m.subject.startsWith('Candidates introduced'))).toHaveLength(0)
  await emp.goto('/terms')
  await expect(emp.getByText(ROW19)).toHaveCount(0)
  await emp.close()
})

test('J4: desk switch On — introduced people appear with only the agreed buttons, one email without contact details; a withdrawal removes them at once', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await setDesk(page, true)
  await ops.goto(`/roodber8/jobs/desk/${assignmentId}`)
  await ops.getByLabel(new RegExp(`^${people.manual.name}`)).check()
  await ops.getByRole('button', { name: 'Introduce selected' }).click()
  await expect(ops.getByText('1 introduced. The employer was emailed (no contact details in the email).')).toBeVisible()
  const mail = await mailWithSubject(employer.user.email, `Candidates introduced for request ${signedReq.reference}`)
  expect(mail.text).toContain(`We have introduced 1 candidate(s) for your request ${signedReq.reference}. Each of them agreed to be introduced to you. See their details on your request page.`)
  expect(mail.html).toContain('See the candidates')
  for (const secret of [people.manual.phone, people.manual.phone.replace('+251', '0'), people.app.phone, people.manual.name, people.app.name]) expect(mail.html + mail.text).not.toContain(secret)

  const emp = await browser.newPage()
  await signIn(emp, employer.user.email, employer.user.password)
  await emp.goto(`/account/service-requests/${signedReq.id}`)
  await expect(emp.getByRole('heading', { name: 'People introduced to you' })).toBeVisible()
  await expect(emp.getByText('Candidates introduced: 2')).toBeVisible()
  await expect(emp.getByText(ROW7)).toBeVisible()
  const appCard = emp.locator('li', { hasText: people.app.name })
  await expect(appCard.getByText(new RegExp(`^${people.app.name} · E2E P3 Masons \\d+ · Introduced `))).toBeVisible()
  await expect(appCard.getByRole('link')).toHaveText(['Call', 'WhatsApp'])
  await expect(appCard.getByRole('link', { name: 'Call' })).toHaveAttribute('href', `tel:${people.app.phone}`)
  const manCard = emp.locator('li', { hasText: people.manual.name })
  await expect(manCard.getByRole('link')).toHaveText(['Call', 'SMS'])
  const page1 = await emp.content()
  for (const hidden of [people.profile.name, people.register.name, people.register.phone, people.other.name]) expect(page1).not.toContain(hidden)
  await emp.goto('/terms')
  await expect(emp.getByText(ROW19)).toBeVisible()

  // Withdrawal: contact details vanish at once; it cannot be undone.
  await ops.reload()
  const c = ops.locator('li', { hasText: people.manual.name }).first()
  await c.getByLabel(/The person changed their mind/).check()
  await c.getByRole('button', { name: 'Consent withdrawn' }).click()
  await expect(ops.getByText(/Consent withdrawn\. Their details are no longer shown to the employer\./)).toBeVisible()
  await emp.goto(`/account/service-requests/${signedReq.id}`)
  await expect(emp.getByText(`${people.manual.name.split(' ')[0]} is no longer available for this request.`)).toBeVisible()
  const page2 = await emp.content()
  expect(page2).not.toContain(people.manual.phone)
  expect(page2).not.toContain(people.manual.name)
  const manualId = await candidateId(people.manual.name)
  expect((await db().from('recruitment_candidates').update({ consent_withdrawn_at: null, consent_withdrawn_by: null }).eq('id', manualId)).error?.code).toBe('23514')

  // A plain 375 px window: no sideways scroll on the employer's section.
  const small = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const sp = await small.newPage()
  await signIn(sp, employer.user.email, employer.user.password)
  await sp.goto(`/account/service-requests/${signedReq.id}`)
  await expect(sp.getByRole('heading', { name: 'People introduced to you' })).toBeVisible()
  expect(await sp.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await small.close()

  // Another employer, a random user and another request's guest link see none of it.
  const other = await browser.newPage()
  await signIn(other, otherEmployer.user.email, otherEmployer.user.password)
  expect((await other.goto(`/account/service-requests/${signedReq.id}`))?.status()).toBe(404)
  await other.close()
  const guestMail = (await allMail(guestEmail)).find((m) => m.subject.includes(guestReq.reference))!
  const guest = await browser.newPage()
  await guest.goto(new URL(linkMatching(guestMail.html, /\/requests\/[A-Za-z0-9_-]{43}/)).pathname)
  await expect(guest.getByRole('heading', { name: 'People introduced to you' })).toBeVisible()
  await expect(guest.getByText(ROW5)).toBeVisible()
  expect(await guest.content()).not.toContain(people.app.name)
  await guest.close()
  const client = createClient(URL_, ANON, { auth: { persistSession: false } })
  await client.auth.signInWithPassword({ email: employer.user.email, password: employer.user.password })
  for (const t of ['recruitment_candidates', 'recruitment_assignments', 'recruitment_placements', 'recruitment_fee_terms']) {
    const r = await client.from(t).select('*')
    expect(r.error ?? (r.data ?? []).length === 0, t).toBeTruthy()
  }
  await emp.close()
})

test('J5: placement, guarantee dates, the daily job and a free replacement', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const today = addisToday()
  await adminSession(page)
  await page.goto(`/roodber8/jobs/desk/${assignmentId}`)
  const c = page.locator('li', { hasText: people.app.name }).first()
  await c.getByLabel('Start date').fill(today)
  await c.getByRole('button', { name: 'Record as hired' }).click()
  const appId = await candidateId(people.app.name)
  await expect.poll(async () => (await db().from('recruitment_placements').select('id').eq('candidate_id', appId)).data?.length).toBe(1)
  const { data: p } = await db().from('recruitment_placements').select('*').eq('candidate_id', appId).single()
  expect(p).toMatchObject({ role_type: 'trade', guarantee_days: 30, start_date: today, guarantee_ends_on: plusDays(today, 30), status: 'hired', is_free_replacement: false })
  const placed = await mailWithSubject(employer.user.email, `Placement confirmed: ${people.app.name}`)
  expect(placed.text).toContain(`Thank you for confirming that ${people.app.name} starts work as`)
  expect(placed.text).toContain('If they leave within the replacement period in your written agreement, we will look for a replacement at no extra cost.')

  const cron = async () => (await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()) as { placementsMoved: number; jobsDataCleanup: { counts: { kept?: { hired: number; periodNotSet: number }; due: Record<string, number>; cleared: Record<string, number> } } }
  await cron()
  expect((await db().from('recruitment_placements').select('status').eq('id', p!.id).single()).data?.status).toBe('guarantee_running')
  // Ending within 7 days: the digest says so.
  await db().from('recruitment_placements').update({ start_date: plusDays(today, -25) }).eq('id', p!.id)
  await cron()
  const digest = await mailWithSubject('admin@test.hagerland.invalid', 'HagerLand daily digest')
  expect(digest.text).toContain('Recruitment desk: replacement guarantees ending within 7 days')
  expect(digest.text).toContain('Recruitment desk: open assignments')

  // The profile candidate agrees, is confirmed 18+ and introduced (for the replacement).
  await page.reload()
  const pc = page.locator('li', { hasText: people.profile.name }).first()
  await pc.getByLabel('Email', { exact: true }).check()
  await pc.getByRole('button', { name: 'Record consent' }).click()
  await expect.poll(async () => (await db().from('recruitment_candidates').select('consent_at').eq('assignment_id', assignmentId).eq('name', people.profile.name).single()).data?.consent_at).not.toBeNull()
  await page.reload()
  await page.locator('li', { hasText: people.profile.name }).first().getByLabel('The person told me they are 18 or older').check()
  await page.locator('li', { hasText: people.profile.name }).first().getByRole('button', { name: 'Record 18 or older' }).click()
  await expect(page.getByText('Recorded: 18 or older.')).toBeVisible()
  await page.reload()
  await page.getByLabel(new RegExp(`^${people.profile.name}`)).check()
  await page.getByRole('button', { name: 'Introduce selected' }).click()
  await expect(page.getByText(/^1 introduced\./)).toBeVisible()

  // Left inside the guarantee → replace for free: linked, free, its own guarantee; fee terms refused.
  await page.reload()
  const pl = page.getByTestId(`placement-${p!.reference}`)
  await pl.getByLabel('Last day').fill(today)
  await pl.getByLabel('Why').selectOption('left_by_worker')
  await pl.getByRole('button', { name: 'Record that they left' }).click()
  await expect.poll(async () => (await db().from('recruitment_placements').select('status').eq('id', p!.id).single()).data?.status).toBe('replaced')
  await page.reload()
  const pl2 = page.getByTestId(`placement-${p!.reference}`)
  await pl2.getByLabel('Replacement (introduced person)').selectOption(await candidateId(people.profile.name))
  await pl2.getByLabel('Start date').fill(plusDays(today, 2))
  await pl2.getByRole('button', { name: 'Replace (free)' }).click()
  await expect.poll(async () => (await db().from('recruitment_placements').select('id').eq('replaces_placement_id', p!.id)).data?.length).toBe(1)
  const { data: rep } = await db().from('recruitment_placements').select('*').eq('replaces_placement_id', p!.id).single()
  expect(rep).toMatchObject({ is_free_replacement: true, guarantee_days: 30, start_date: plusDays(today, 2), guarantee_ends_on: plusDays(today, 32), status: 'hired' })
  expect((await db().from('recruitment_placements').select('status, ended_on, end_reason').eq('id', p!.id).single()).data).toEqual({ status: 'replaced', ended_on: today, end_reason: 'left_by_worker' })
  expect(await callAction(page, 'actions/jobs-desk', 'saveFeeTermsAction', [rep!.id, { fee_type: 'fixed', currency: 'ETB', amount: '1000' }])).toContain('A free replacement has no fee.')
  expect((await db().from('recruitment_fee_terms').insert({ placement_id: rep!.id, fee_type: 'fixed', amount_minor: 100000, created_by: 'crafted' })).error?.code).toBe('23514')
  // The daily job completes a placement the day after its guarantee ends.
  await db().from('recruitment_placements').update({ start_date: plusDays(today, -40) }).eq('id', rep!.id)
  await cron()
  expect((await db().from('recruitment_placements').select('status').eq('id', rep!.id).single()).data?.status).toBe('completed')
})

test('J6: fees are the owner’s only — fixed or percentage, agreement upload, entries and a reversal; Operations sees Yes/No only', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const appId = await candidateId(people.app.name)
  const { data: p } = await db().from('recruitment_placements').select('id, reference').eq('candidate_id', appId).single()
  await adminSession(page)
  await page.goto(`/roodber8/jobs/desk/${assignmentId}`)
  const box = page.getByTestId(`placement-${p!.reference}`)
  await expect(box.getByText('Fee (owner only)')).toBeVisible()
  // Percentage first (a draft), then fixed: only one kind is ever stored.
  await box.getByLabel('Fee type').selectOption('percentage')
  await box.getByLabel('Percentage').fill('12.5')
  await box.getByLabel('Pay it is based on').fill('30000')
  await box.getByRole('button', { name: 'Save fee terms' }).click()
  await expect(page.getByText('Fee terms saved as a draft.')).toBeVisible()
  expect((await db().from('recruitment_fee_terms').select('fee_type, percent_bps, basis, basis_amount_minor, amount_minor').eq('placement_id', p!.id).single()).data).toEqual({ fee_type: 'percentage', percent_bps: 1250, basis: 'first_year_salary', basis_amount_minor: 3_000_000, amount_minor: null })
  await page.reload()
  const box2 = page.getByTestId(`placement-${p!.reference}`)
  await expect(box2.getByText(/fee worked out: ETB 3,750 \(12\.5%\)/)).toBeVisible()
  await box2.getByLabel('Fee type').selectOption('fixed')
  await box2.getByLabel('Fixed fee').fill('3000')
  await box2.getByRole('button', { name: 'Mark as agreed in writing' }).click()
  await expect(page.getByText('Enter the date the fee was agreed in writing first.')).toBeVisible()
  await box2.getByLabel('Agreed in writing on').fill(addisToday())
  await box2.locator('input[type="file"]').setInputFiles({ name: 'agreement.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') })
  await expect(box2.getByText('agreement.pdf')).toBeVisible()
  await box2.getByRole('button', { name: 'Save fee terms' }).click()
  await expect(page.getByText('Fee terms saved as a draft.')).toBeVisible()
  const { data: t } = await db().from('recruitment_fee_terms').select('*').eq('placement_id', p!.id).single()
  expect(t).toMatchObject({ fee_type: 'fixed', amount_minor: 300_000, percent_bps: null, basis: null, status: 'draft' })
  expect(t!.document_path).toMatch(new RegExp(`^agreements/${p!.id}/[0-9a-f-]{36}\\.pdf$`))
  await page.reload()
  const box3 = page.getByTestId(`placement-${p!.reference}`)
  const docUrl = await box3.getByRole('link', { name: /Signed agreement/ }).getAttribute('href')
  expect(docUrl).toContain('/storage/v1/object/sign/recruitment-private/')
  expect((await page.request.get(docUrl!)).status()).toBe(200)
  expect((await page.request.get(`${URL_}/storage/v1/object/public/recruitment-private/${t!.document_path}`)).status()).not.toBe(200)
  await box3.getByRole('button', { name: 'Mark as agreed in writing' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()
  // Entries: fee due, fee received by telebirr, a reversal (once only); entries cannot be changed or deleted.
  const entry = async (type: string, amount: string, method?: string) => {
    await page.reload()
    const b = page.getByTestId(`placement-${p!.reference}`)
    await b.getByLabel('Entry').selectOption(type)
    await b.getByLabel('Amount').fill(amount)
    await b.getByLabel('Date').fill(addisToday())
    if (method) await b.getByLabel('Paid by').selectOption(method)
    await b.getByRole('button', { name: 'Add entry' }).click()
    await expect(page.getByText('Recorded.')).toBeVisible()
  }
  await entry('fee_due', '3000')
  await entry('fee_received', '3000', 'telebirr')
  const { data: received } = await db().from('recruitment_fee_entries').select('id').eq('fee_terms_id', t!.id).eq('entry_type', 'fee_received').single()
  await page.reload()
  const b = page.getByTestId(`placement-${p!.reference}`)
  await b.locator('li', { hasText: 'Fee received' }).getByLabel('Why reverse it').fill('Entered twice by mistake')
  await b.locator('li', { hasText: 'Fee received' }).getByRole('button', { name: 'Reverse' }).click()
  await expect(page.getByText('Reversed.')).toBeVisible()
  expect(await callAction(page, 'actions/jobs-desk', 'reverseFeeEntryAction', [received!.id, 'again'])).toContain('cannot be reversed')
  expect((await db().from('recruitment_fee_entries').update({ amount_minor: 1 }).eq('id', received!.id)).error?.code).toBe('42501')
  expect((await db().from('recruitment_fee_entries').delete().eq('id', received!.id)).error?.code).toBe('42501')
  expect((await db().from('recruitment_fee_entries').select('entry_type').eq('fee_terms_id', t!.id).order('created_at')).data?.map((e) => e.entry_type)).toEqual(['fee_due', 'fee_received', 'reversal'])

  // Operations: "Fee agreed in writing: Yes" only — no amounts, methods or fee tools in the page; fee actions refused.
  await ops.goto(`/roodber8/jobs/desk/${assignmentId}`)
  const opsBox = ops.getByTestId(`placement-${p!.reference}`)
  await expect(opsBox.getByText('Fee agreed in writing:')).toBeVisible()
  await expect(opsBox.getByText('Yes', { exact: true })).toBeVisible()
  const opsHtml = await ops.content()
  for (const money of ['Fee (owner only)', 'telebirr', 'Entered twice by mistake', 'recruitment-private', 'Fixed fee']) expect(opsHtml, money).not.toContain(money)
  // The amount as a number on its own (Tidy T-2, T2-14b): random test emails such as "…330009@…" must not match.
  expect(opsHtml).not.toMatch(/(?<![\d.])3,?000(?![\d])/)
  for (const [name, args] of [
    ['saveFeeTermsAction', [p!.id, { fee_type: 'fixed', currency: 'ETB', amount: '1' }]],
    ['addFeeEntryAction', [p!.id, { type: 'fee_received', amount: '1', date: addisToday(), method: 'cash' }]],
    ['setFeeStatusAction', [p!.id, 'paid']],
    ['feeAgreementUploadAction', [p!.id, 'application/pdf', 100]],
    ['reverseFeeEntryAction', [received!.id, 'crafted']],
  ] as [string, unknown[]][]) {
    const res = await callAction(ops, 'actions/jobs-desk', name, args)
    expect(res, name).not.toMatch(/"ok":true/)
    expect(res, name).not.toMatch(/(?<![\d.])300000(?![\d])/)
  }
  expect((await db().from('recruitment_fee_entries').select('id').eq('fee_terms_id', t!.id)).data).toHaveLength(3)
  expect((await db().from('recruitment_fee_terms').select('status').eq('id', t!.id).single()).data?.status).toBe('agreed')

  // Lead fee / Commission on a staffing request: hidden and refused for Operations; unchanged for plumbers.
  await ops.goto(`/roodber8/service-requests/${signedReq.id}`)
  await expect(ops.getByText(/Lead fee/)).toHaveCount(0)
  const { data: team } = await db().from('service_request_matches').select('id').eq('request_id', signedReq.id).single()
  expect(await callAction(ops, 'actions/service-requests', 'saveMatchCommercialAction', [team!.id, { lead_fee: '500', commission_rate: '', commission: '', invoiced: false }])).toContain('Only the owner can see or change fees.')
  expect((await db().from('service_request_matches').select('lead_fee_minor').eq('id', team!.id).single()).data?.lead_fee_minor).toBeNull()
  const { data: plumb } = await db().from('service_requests').select('id').eq('title', `E2E P3 plumbers ${stamp}`).single()
  await ops.goto(`/roodber8/service-requests/${plumb!.id}`)
  // Tidy T-2 (T2-1): fees are the owner's only on every service now, plumbers included.
  await expect(ops.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(ops.getByText(/Lead fee/)).toHaveCount(0)
  const { data: plumbMatch } = await db().from('service_request_matches').select('id').eq('request_id', plumb!.id).single()
  expect(await callAction(ops, 'actions/service-requests', 'saveMatchCommercialAction', [plumbMatch!.id, { lead_fee: '250', commission_rate: '', commission: '', invoiced: false }])).toContain('Only the owner can see or change fees.')
  expect((await db().from('service_request_matches').select('lead_fee_minor').eq('id', plumbMatch!.id).single()).data?.lead_fee_minor).toBeNull()
  // The owner still sees the staffing fee fields.
  await page.goto(`/roodber8/service-requests/${signedReq.id}`)
  await expect(page.getByText(/Lead fee/).first()).toBeVisible()
  // CSV: the Operations export of service requests has no fee columns.
  const csv = await (await ops.request.get('/roodber8/export/service-requests')).text()
  expect(csv).not.toMatch(/lead_fee|commission|fee/i)
})

test('J7: deletion — Dry run counts and changes nothing; Live keeps a hired person’s details and clears a not-hired row after 12 months', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  const old = new Date(Date.now() - 400 * DAY).toISOString()
  const recent = new Date(Date.now() - 300 * DAY).toISOString()
  const appId = await candidateId(people.app.name)
  const { data: app } = await db().from('job_applications').select('id').eq('reference', people.app.ref).single()
  await db().from('job_applications').update({ created_at: old, cover_note: 'Hired cover note', employer_notes: 'Hired employer note' }).eq('id', app!.id)
  await db().from('recruitment_candidates').update({ last_activity_at: old, notes: 'Hired desk note' }).eq('id', appId)
  const ins = async (name: string, at: string) => (await db().from('recruitment_candidates').insert({ assignment_id: assignmentId, source: 'manual', name, phone: randomPhone(), trade: 'mason', area_text: 'Bole', notes: 'Old note', created_by: 'e2e', last_activity_at: at }).select('id').single()).data!.id as string
  const notHiredOld = await ins(`Old Not Hired ${stamp}`, old)
  const notHiredRecent = await ins(`Recent Not Hired ${stamp}`, recent)
  const snap = async () => ({
    cands: (await db().from('recruitment_candidates').select('*').in('id', [appId, notHiredOld, notHiredRecent]).order('id')).data,
    app: (await db().from('job_applications').select('name, phone, cover_note, employer_notes, personal_data_deleted_at').eq('id', app!.id).single()).data,
  })
  const cron = async () => (await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()) as { jobsDataCleanup: { mode: string; counts: { kept: { hired: number; periodNotSet: number }; due: Record<string, number>; cleared: Record<string, number>; failed: Record<string, number> } } }

  await setMode(page, 'dry_run')
  const before = await snap()
  const dry = await cron()
  expect(dry.jobsDataCleanup.mode).toBe('dry_run')
  expect(dry.jobsDataCleanup.counts.due.shortlist).toBeGreaterThanOrEqual(1)
  expect(dry.jobsDataCleanup.counts.kept.periodNotSet).toBeGreaterThanOrEqual(2)
  expect(dry.jobsDataCleanup.counts.cleared.shortlist).toBe(0)
  const strip = (x: Awaited<ReturnType<typeof snap>>) => ({ ...x, cands: (x.cands ?? []).map((r) => ({ ...r, updated_at: null })) })
  expect(strip(await snap())).toEqual(strip(before))
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  await expect(page.getByRole('region', { name: 'Deletion runs' }).getByText(/kept: period not set/).first()).toBeVisible()

  await setMode(page, 'live')
  const live = await cron()
  expect(live.jobsDataCleanup.counts.failed.shortlist).toBe(0)
  const after = await snap()
  const row = (id: string) => after.cands!.find((r) => r.id === id)!
  // Hired: name, phone and the consent record stay; only the free-text notes go.
  expect(row(appId)).toMatchObject({ name: people.app.name, phone: people.app.phone, consent_method: 'phone_call', share_phone: true, share_whatsapp: true, notes: null, personal_data_deleted_at: null })
  expect(row(appId).consent_at).not.toBeNull()
  expect(after.app).toEqual({ name: people.app.name, phone: people.app.phone, cover_note: null, employer_notes: null, personal_data_deleted_at: null })
  // Not hired and older than 12 months: cleared, reference and status kept.
  expect(row(notHiredOld)).toMatchObject({ name: null, phone: null, area_text: null, notes: null, trade: 'mason', reference: before.cands!.find((r) => r.id === notHiredOld)!.reference })
  expect(row(notHiredOld).personal_data_deleted_at).not.toBeNull()
  // Not hired, 10 months: untouched.
  expect(row(notHiredRecent)).toEqual(before.cands!.find((r) => r.id === notHiredRecent))
  await setMode(page, 'dry_run')
})

test('J8: unchanged — Phase 2 switches Off, "Apply now", the staffing wording, other services; nothing from the desk on any public page', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const { data: settings } = await db().from('site_settings').select('key, value').in('key', ['jobs_phone_apply', 'jobs_worker_register'])
  expect(Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]))).toEqual({ jobs_phone_apply: false, jobs_worker_register: false })
  await page.context().clearCookies()
  await page.goto('/request-service/staffing')
  await expect(page.getByText("Your request goes to HagerLand's recruitment team. We share your phone or email with candidates only with your agreement.")).toBeVisible()
  await expect(page.getByText('Are you hiring from abroad or placing people abroad?')).toHaveCount(0)
  await page.goto('/request-service/plumbers')
  await expect(page.getByText('Are you based outside Ethiopia?')).toHaveCount(0)
  await expect(page.getByText('We share your request with up to three suitable providers at a time.', { exact: false })).toBeVisible()
  await page.goto('/privacy')
  await expect(page.getByText('Employers we recruit for:')).toBeVisible()
  await expect(page.getByText('Records of people our recruitment team contacted for a role but who were not hired: deleted 12 months after the last contact.')).toBeVisible()
  for (const path of ['/jobs', '/sitemap.xml', '/sitemap/jobs.xml', '/search?q=mason', '/privacy', '/terms', '/request-service/staffing', '/api/health']) {
    const html = await (await page.request.get(path)).text()
    for (const secret of [people.app.name, people.app.phone, people.manual.name, people.manual.phone, people.profile.name, people.register.name, 'Hired desk note', 'HLR-']) expect(html, `${secret} on ${path}`).not.toContain(secret)
  }
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  for (const t of ['recruitment_assignments', 'recruitment_candidates', 'recruitment_events', 'recruitment_placements', 'recruitment_fee_terms', 'recruitment_fee_entries']) {
    const r = await anon.from(t).select('*').limit(1)
    expect(r.error, t).not.toBeNull()
  }
  expect((await anon.storage.from('recruitment-private').list('agreements')).data ?? []).toHaveLength(0)
})

test('Agent and Content cannot open the desk or use its actions', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  for (const role of ['agent', 'content'] as const) {
    const p = await staffPage(browser, role)
    await p.goto('/roodber8/jobs/desk')
    await expect(p).not.toHaveURL(/\/roodber8\/jobs\/desk$/)
    const res = await callAction(p, 'actions/jobs-desk', 'markAskedAction', [await candidateId(people.profile.name)])
    expect(res).not.toContain('Marked as asked.')
    await p.close()
  }
})

test('the desk pages in a plain 375 px window: no sideways scroll', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin pages, one run')
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  await adminSession(page)
  for (const path of ['/roodber8/jobs/desk', `/roodber8/jobs/desk/${assignmentId}`]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(375)
  }
  await ctx.close()
})
