import { expect, test, type Browser, type Page } from '@playwright/test'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, createProvider, db, randomPhone, signUp, uniqueEmail, submitStaffSignIn } from './helpers'

/**
 * Tidy T-2 (migration 0045): AB's journeys J1–J13 on the local copy only. Switches are turned on here only on the
 * local copy and put back afterwards.
 */

test.describe.configure({ mode: 'serial' })
assertLocalStack()

const DAY = 86_400_000
const stamp = Date.now()
const T1 = '“Listed”, “Claimed” and “Verified” describe the checks we have made, explained on our How it works page.'
const OLD_BADGE = 'A Verified badge means we checked documents on the date shown.'
const W28 = 'A Verified badge means HagerLand checked the business\'s trade licence and tax number on the date shown. Verified badges are checked again every 12 months and can be removed at any time. It is not a guarantee of the business\'s work.'
const T2 = 'Quotes are valid for 3 days unless the quote states otherwise. Prices of volatile materials such as steel and cement are confirmed on each quote.'
const T3 = 'Quotes are valid for 3 days unless the quote says otherwise. Prices of steel and cement change often, so we confirm the price on each quote.'
const T5 = "Thanks. We'll check your claim and email you when it's decided."
const T6 = "We check every claim and will email you when it's decided."
const T11 = 'Reports about listings or businesses: your details, contact and the coded internet address are deleted 12 months after the report or our decision on it, whichever is later; the reason and what we did about it are kept.'
const T12 = 'Job reports: your details, contact and the coded internet address are deleted 12 months after the report or our decision on it, whichever is later; the reason and what we did about it are kept.'
const T15 = 'Only the owner can see or change fees.'

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
async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content', width = 1280): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  const email = uniqueEmail(`t2-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}
async function callAction(page: Page, file: string, name: string, args: unknown[], path = '/roodber8'): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  const res = await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args), maxRedirects: 0 })
  return `${res.status()} ${await res.text()}`
}
type SwitchLabel = 'Call-back requests' | 'Recruitment desk' | 'Private-client jobs'
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
const cron = async (page: Page) => (await page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
const mailIds = async () => ((await (await fetch('http://localhost:8025/api/v1/messages?limit=500')).json()) as { messages: { ID: string }[] }).messages.map((m) => m.ID)
async function mailSince(seen: Set<string>): Promise<{ to: string[]; replyTo: string[]; subject: string }[]> {
  const out = []
  for (const id of (await mailIds()).filter((i) => !seen.has(i))) {
    const m = (await (await fetch(`http://localhost:8025/api/v1/message/${id}`)).json()) as { To: { Address: string }[]; ReplyTo: { Address: string }[] | null; Subject: string }
    out.push({ to: m.To.map((t) => t.Address), replyTo: (m.ReplyTo ?? []).map((r) => r.Address), subject: m.Subject })
  }
  return out
}

let bole = ''
test.beforeAll(async () => {
  bole = (await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()).data!.id
})
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  for (const s of ['Call-back requests', 'Recruitment desk', 'Private-client jobs'] as SwitchLabel[]) await setSwitch(page, s, false)
  await page.close()
  psql(`update public.site_settings set value = '"dry_run"'::jsonb where key = 'jobs_data_cleanup_mode'`)
})

test('J1: lead fee and commission are the owner’s only, on a plumbers request too', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const provider = await createProvider({ name: `E2E T2 Plumbing ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'plumbers').single()
  const { data: r } = await db().from('service_requests').insert({ vertical_key: 'repairs-maintenance', service_category_id: cat!.id, title: `E2E T2 leak ${stamp}`, details: 'Kitchen sink leak.', name: 'E2E T2 Customer', phone: randomPhone(), email: uniqueEmail('t2-cust'), location_id: bole, status: 'quoted' }).select('id').single()
  const { data: m } = await db().from('service_request_matches').insert({ request_id: r!.id, org_id: provider.orgId, status: 'quoted', quote_amount_minor: 12_345_600, quote_currency: 'ETB', lead_fee_minor: 777_700, commission_rate: 7, commission_minor: 864_100 }).select('id').single()
  const ops = await staffPage(browser, 'operations')
  await ops.goto(`/roodber8/service-requests/${r!.id}`)
  await expect(ops.getByText('E2E T2 Plumbing', { exact: false }).first()).toBeVisible()
  const html = await (await ops.request.get(`/roodber8/service-requests/${r!.id}`)).text()
  const rsc = await (await ops.request.get(`/roodber8/service-requests/${r!.id}`, { headers: { RSC: '1' } })).text()
  for (const body of [html, rsc]) {
    expect(body).not.toContain('Lead fee')
    expect(body).not.toMatch(/7,777|7777|8,641|8641/)
  }
  expect(await callAction(ops, 'actions/service-requests', 'saveMatchCommercialAction', [m!.id, { lead_fee: '1', commission_rate: '', commission: '', invoiced: true }])).toContain(T15)
  expect((await db().from('service_request_matches').select('lead_fee_minor, invoiced').eq('id', m!.id).single()).data).toEqual({ lead_fee_minor: 777_700, invoiced: false })
  await ops.close()
  await adminSession(page)
  await page.goto(`/roodber8/service-requests/${r!.id}`)
  await expect(page.getByLabel('Lead fee (ETB)')).toHaveValue('7777')
  expect(await callAction(page, 'actions/service-requests', 'saveMatchCommercialAction', [m!.id, { lead_fee: '5000', commission_rate: '', commission: '', invoiced: false }])).toContain('Saved.')
  expect((await db().from('service_request_matches').select('lead_fee_minor').eq('id', m!.id).single()).data?.lead_fee_minor).toBe(500_000)
})

test('J2 + J8: quotes valid for 3 days (email, admin, Terms, Help); Terms and Privacy wording', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const email = uniqueEmail('t2-quote')
  const { data: q } = await db().from('quote_requests').insert({ name: 'E2E T2 Quote', phone: randomPhone(), email, source: 'basket' }).select('id').single()
  await adminSession(page)
  expect(await callAction(page, 'actions/leads', 'issueQuoteAction', [{ id: q!.id, total_etb: '25000', document_path: null, notify: true }])).toContain('Quote issued and emailed to the customer.')
  let text = ''
  for (let i = 0; i < 40 && !text; i++) {
    const list = (await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()) as { messages: { ID: string }[] }
    if (list.messages[0]) text = ((await (await fetch(`http://localhost:8025/api/v1/message/${list.messages[0].ID}`)).json()) as { Text: string }).Text
    else await page.waitForTimeout(500)
  }
  expect(text).toContain('Prices are valid for 3 days unless stated otherwise. Reply to this email or call us to confirm your order and delivery.')
  const { data: quoted } = await db().from('quote_requests').select('quoted_at').eq('id', q!.id).single()
  const until = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(new Date(new Date(quoted!.quoted_at!).getTime() + 3 * DAY))
  await page.goto(`/roodber8/quotes/${q!.id}`)
  await expect(page.getByText(`Valid until ${until}`)).toBeVisible()
  await page.context().clearCookies()
  await page.goto('/terms')
  await expect(page.getByText(T1)).toBeVisible()
  await expect(page.getByText(OLD_BADGE)).toHaveCount(0)
  await expect(page.getByText(W28)).toBeVisible()
  await expect(page.getByText(T2)).toBeVisible()
  await page.goto('/help')
  await expect(page.getByText(T3)).toHaveCount(1)
  expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('')).toContain(T3)
  await page.goto('/privacy')
  await expect(page.getByText(T11)).toBeVisible()
  await expect(page.getByText(T12)).toBeVisible()
})

test('J3 + J4: staff send a phone-only staffing request from a call-back; nobody else can leave the email out', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  await setSwitch(page, 'Call-back requests', true)
  const callback = async (name: string) => (await db().from('callback_requests').insert({ name, phone: randomPhone().replace(/^0/, '+251'), need: `Masons for ${name}`, area_text: 'Bole', language: 'am', time_of_day: 'any', consent_at: new Date().toISOString() }).select('id').single()).data!.id
  const fill = async (p: Page, title: string) => {
    await p.getByLabel('Which roles do you need to fill?').fill('Five masons')
    await p.getByLabel('How many people?').fill('5')
    await p.getByText('Temporary or day labour', { exact: true }).click()
    await p.getByLabel('Give your request a short title').fill(title)
    if (!(await p.getByLabel('Describe the roles and the work').inputValue())) await p.getByLabel('Describe the roles and the work').fill('Block work for a G+1 house in Bole, six days a week.')
    await p.locator('#sr-location').fill('Bole')
    await p.getByRole('option', { name: /^Bole/ }).first().click()
    if (!(await p.getByLabel('Your name').inputValue())) await p.getByLabel('Your name').fill('E2E T2 Public')
    if (!(await p.locator('#sr-phone').inputValue())) await p.locator('#sr-phone').fill('0911' + String(stamp).slice(-6))
  }
  // J3: Operations, from an open call-back, leaves the email empty.
  const cb = await callback(`E2E T2 Caller ${stamp}`)
  const ops = await staffPage(browser, 'operations')
  await ops.goto(`/request-service/staffing?callback=${cb}`)
  await expect(ops.getByText('Leave it empty if the caller has no email. They will get no emails or link: keep them updated by phone.')).toBeVisible()
  await fill(ops, `E2E T2 phone-only ${stamp}`)
  // "Email" as the preferred reply with no email is refused.
  await ops.locator('#sr-pref').selectOption('email')
  await ops.getByRole('button', { name: 'Send my request' }).click()
  await expect(ops.getByText('Choose phone, WhatsApp or Telegram, or add an email')).toBeVisible()
  await ops.locator('#sr-pref').selectOption('phone')
  const seen = new Set(await mailIds())
  await ops.getByRole('button', { name: 'Send my request' }).click()
  await ops.waitForURL('**/roodber8/jobs/callbacks?made=HLS-*')
  const ref = new URL(ops.url()).searchParams.get('made') ?? ''
  await expect(ops.getByText(`Staffing request ${ref} created and linked to the call-back. No email was sent: give the caller the reference by phone.`)).toBeVisible()
  const { data: sr } = await db().from('service_requests').select('id, email, access_token_hash').eq('reference', ref).single()
  expect(sr).toMatchObject({ email: null, access_token_hash: null })
  expect((await db().from('callback_requests').select('status, outcome, service_request_id').eq('id', cb).single()).data).toEqual({ status: 'closed', outcome: 'staffing_request', service_request_id: sr!.id })
  await expect.poll(async () => (await mailSince(seen)).length, { timeout: 15_000 }).toBeGreaterThan(0)
  await ops.waitForTimeout(2000)
  const mails = await mailSince(seen)
  for (const m of mails) {
    expect(m.to.every((t) => t === process.env.ADMIN_DIGEST_EMAIL || t === process.env.HAGERLAND_INBOX_EMAIL || t.endsWith('@test.hagerland.invalid')), m.subject).toBe(true)
    expect(m.replyTo, m.subject).toEqual([])
  }
  expect(mails.some((m) => m.subject.includes(ref))).toBe(true)

  // J4: everyone else still has to give an email.
  const refused = async (p: Page, url: string, extra?: (p: Page) => Promise<void>) => {
    await p.goto(url)
    await fill(p, `E2E T2 refused ${Math.random()}`)
    if (extra) await extra(p)
    await p.getByRole('button', { name: 'Send my request' }).click()
    await expect(p.getByText('Enter a valid email address')).toBeVisible()
  }
  const visitor = await browser.newPage()
  await refused(visitor, '/request-service/staffing')
  // A visitor adding a call-back id to the form.
  const cb2 = await callback(`E2E T2 Forged ${stamp}`)
  await refused(visitor, '/request-service/staffing', async (p) => {
    await p.locator('form').first().evaluate((f, id) => {
      const i = document.createElement('input')
      i.type = 'hidden'
      i.name = 'callback_id'
      i.value = id
      f.appendChild(i)
    }, cb2)
  })
  const agent = await staffPage(browser, 'agent')
  await refused(agent, `/request-service/staffing?callback=${cb2}`, async (p) => {
    await p.locator('form').first().evaluate((f, id) => {
      const i = document.createElement('input')
      i.type = 'hidden'
      i.name = 'callback_id'
      i.value = id
      f.appendChild(i)
    }, cb2)
  })
  // A closed call-back: Operations must give an email.
  await refused(ops, `/request-service/staffing?callback=${cb}`, async (p) => {
    await p.locator('form').first().evaluate((f, id) => {
      const i = document.createElement('input')
      i.type = 'hidden'
      i.name = 'callback_id'
      i.value = id
      f.appendChild(i)
    }, cb)
  })
  await db().from('callback_requests').update({ status: 'closed', outcome: 'spam' }).eq('id', cb2)
  for (const p of [visitor, agent, ops]) await p.close()

  // J5: the desk takes the phone-only request; an introduction is recorded and nothing breaks without an email.
  await setSwitch(page, 'Recruitment desk', true)
  await adminSession(page)
  expect(await callAction(page, 'actions/service-requests', 'assignHagerlandTeamAction', [sr!.id])).not.toContain('error')
  const { data: a } = await db().from('recruitment_assignments').select('id').eq('service_request_id', sr!.id).single()
  const now = new Date().toISOString()
  const { data: c } = await db().from('recruitment_candidates').insert({ assignment_id: a!.id, source: 'manual', name: `E2E T2 Worker ${stamp}`, phone: randomPhone(), trade: 'mason', created_by: 'e2e', status: 'agreed', consent_at: now, consent_method: 'phone_call', consent_recorded_by: 'e2e', share_phone: true, adult_confirmed_at: now, adult_confirmed_method: 'phone_call', adult_confirmed_by: 'e2e' }).select('id').single()
  const res = await callAction(page, 'actions/jobs-desk', 'introduceAction', [a!.id, [c!.id]])
  expect(res).toContain('1 introduced.')
  expect(res).toContain('The email could not be sent: tell the employer by phone.')
  await page.goto(`/roodber8/jobs/desk/${a!.id}`)
  await expect(page.getByText(`E2E T2 Worker ${stamp}`)).toBeVisible()
  await setSwitch(page, 'Recruitment desk', false)
  await setSwitch(page, 'Call-back requests', false)
})

test('J6: Telegram share has the link once; WhatsApp and Copy link unchanged', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop')
  const org = await createProvider({ name: `E2E T2 Employer ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const { data: job } = await db().from('job_posts').insert({ slug: `e2e-t2-share-${stamp}`, employer_org_id: org.orgId, title: 'E2E T2 Mason', category: 'construction', employment_type: 'full_time', location_id: bole, description: 'A job for the share link check, long enough to pass.', status: 'published' }).select('slug').single()
  await page.goto(`/jobs/${job!.slug}`)
  const link = `https://www.hagerland.com/jobs/${job!.slug}`
  const tg = new URL((await page.getByRole('link', { name: 'Telegram' }).getAttribute('href')) ?? '')
  expect(tg.searchParams.get('url')).toBe(link)
  expect(tg.searchParams.get('text')).toBe('E2E T2 Mason in Bole. See the job and apply on HagerLand.')
  expect(decodeURIComponent(tg.toString()).split(link)).toHaveLength(2)
  const wa = new URL((await page.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')) ?? '')
  expect(wa.searchParams.get('text')).toBe(`E2E T2 Mason in Bole. See the job and apply on HagerLand: ${link}`)
})

test('J7: claims make no time promise', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop')
  test.setTimeout(120_000)
  const name = `E2E T2 Imported ${stamp}`
  const { data: org } = await db().from('organisations').insert({ kind: 'supplier', name, slug: `e2e-t2-imported-${stamp}`, description: 'Cement supplier.', source: 'import', status: 'published', verification_level: 'listed' }).select('slug').single()
  const email = await signUp(page, { type: 'supplier', name: 'Hanna Claimant' })
  await page.goto(`/company/${org!.slug}`)
  await page.getByRole('link', { name: 'Claim this business' }).click()
  await page.selectOption('#cl-rel', 'owner')
  await page.fill('#cl-phone', '0911223344')
  await page.getByRole('button', { name: 'Submit claim' }).click()
  await expect(page.getByText(T5)).toBeVisible()
  let html = ''
  for (let i = 0; i < 40 && !html; i++) {
    const list = (await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${email}" subject:"claim"`)}`)).json()) as { messages: { ID: string }[] }
    if (list.messages[0]) html = ((await (await fetch(`http://localhost:8025/api/v1/message/${list.messages[0].ID}`)).json()) as { HTML: string }).HTML
    else await page.waitForTimeout(500)
  }
  expect(html).toContain(T6.replace("'", '&#39;'))
  expect(html).not.toMatch(/business day/i)
})

test('J9: listing reports are cleared 12 months after the report or the decision (Dry run first, then Live)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const old = new Date(Date.now() - 400 * DAY).toISOString()
  const ins = async (extra: Record<string, unknown>) => (await db().from('reports').insert({ entity_type: 'organisation', entity_id: crypto.randomUUID(), reason: 'fraud', details: `E2E T2 details ${stamp}`, reporter_contact: '+251911000000', ip_hash: 'e2e-hash', ...extra }).select('id').single()).data!.id
  const oldOpen = await ins({ created_at: old })
  const oldDecidedRecently = await ins({ created_at: old, status: 'dismissed', handled_at: new Date(Date.now() - 10 * DAY).toISOString() })
  const oldDecidedLongAgo = await ins({ created_at: old, status: 'actioned', handled_at: new Date(Date.now() - 380 * DAY).toISOString() })
  const recent = await ins({})
  // A report decided before 0045 (no handled_at): its date comes from the audit log.
  const preDated = await ins({ created_at: old, status: 'dismissed' })
  await db().from('audit_log').insert({ actor: 'e2e', action: 'report.dismissed', entity_type: 'report', entity_id: preDated, created_at: new Date(Date.now() - 20 * DAY).toISOString() })
  // The admin decision records when it was made.
  await adminSession(page)
  expect(await callAction(page, 'actions/moderation', 'reportDecisionAction', [recent, 'dismissed'])).toContain('Dismissed.')
  expect((await db().from('reports').select('handled_at').eq('id', recent).single()).data?.handled_at).not.toBeNull()

  const dry = await cron(page)
  expect(dry.jobsDataCleanup.mode).toBe('dry_run')
  expect(dry.jobsDataCleanup.counts.due.listing_reports).toBeGreaterThanOrEqual(2)
  expect((await db().from('reports').select('details').eq('id', oldOpen).single()).data?.details).toBe(`E2E T2 details ${stamp}`)
  await page.goto('/roodber8/jobs/data')
  await expect(page.getByText('Listing reports', { exact: true })).toBeVisible()

  psql(`update public.site_settings set value = '"live"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  try {
    await cron(page)
  } finally {
    psql(`update public.site_settings set value = '"dry_run"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  }
  const row = async (id: string) => (await db().from('reports').select('reason, status, entity_type, created_at, details, reporter_contact, ip_hash, personal_data_deleted_at').eq('id', id).single()).data!
  for (const id of [oldOpen, oldDecidedLongAgo]) expect(await row(id)).toMatchObject({ reason: 'fraud', entity_type: 'organisation', details: null, reporter_contact: null, ip_hash: null })
  expect((await row(oldOpen)).personal_data_deleted_at).not.toBeNull()
  expect((await row(oldOpen)).status).toBe('open')
  expect((await row(oldDecidedLongAgo)).status).toBe('actioned')
  for (const id of [oldDecidedRecently, recent, preDated]) expect(await row(id), id).toMatchObject({ details: `E2E T2 details ${stamp}`, reporter_contact: '+251911000000', ip_hash: 'e2e-hash', personal_data_deleted_at: null })
})

test('J10: the admin organisation page fits a 375 px phone with a long member email', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'one plain 375 px window')
  const org = await createProvider({ name: `E2E T2 Members ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const long = `${'a'.repeat(30)}.member.${stamp}@long-domain.test.hagerland.invalid`
  const { data: u } = await db().auth.admin.createUser({ email: long, password: 'correct-horse-battery', email_confirm: true })
  await db().from('organisation_members').insert({ org_id: org.orgId, user_id: u.user!.id, role: 'member' })
  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } })
  await adminSession(phone)
  await phone.goto(`/roodber8/organisations/${org.orgId}`)
  await expect(phone.getByText(long, { exact: false })).toBeVisible()
  expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  const remove = phone.locator('li', { hasText: long }).getByRole('button', { name: 'Remove' })
  expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await phone.close()
})

test('J11: the agency figures show an error on a database error, never zeros', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  const cases: [string, string][] = [
    ['/roodber8/agency', 'Fee income'],
    ['/roodber8/performance', 'Estate agency'],
  ]
  psql('revoke select on public.agency_offers from service_role')
  try {
    for (const [path, normal] of cases) {
      const res = await page.request.get(path)
      expect(res.status(), path).toBe(500)
      expect(await res.text(), path).not.toContain(normal)
    }
    const csv = await page.request.get('/roodber8/export/agency-report?days=90')
    expect(csv.status()).not.toBe(200)
  } finally {
    psql('grant select on public.agency_offers to service_role')
  }
  for (const [path, normal] of cases) {
    const res = await page.request.get(path)
    expect(res.status(), path).toBe(200)
    expect(await res.text(), path).toContain(normal)
  }
  expect((await page.request.get('/roodber8/export/agency-report?days=90')).status()).toBe(200)
})

test('J12 + J13: Supplies pages still load with the long lists read in parts; other services unchanged', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  for (const path of ['/roodber8/demand/supplies', '/roodber8/reports/supply', '/roodber8/supply/orders', '/roodber8/supply/ledger', '/roodber8/supply/partners', '/roodber8/supply/performance']) {
    const res = await page.request.get(path)
    expect(res.status(), path).toBe(200)
    expect(await res.text(), path).not.toContain('__next_error__')
  }
  await page.context().clearCookies()
  for (const path of ['/request-service/plumbers', '/request-service/electricians']) {
    await page.goto(path)
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByText('Leave it empty if the caller has no email.')).toHaveCount(0)
    await expect(page.getByText('We email you a link to follow your request and see quotes.')).toBeVisible()
  }
})
