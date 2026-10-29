import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { adminSession, allMail, assertLocalStack, createProvider, createUser, db, signIn } from './helpers'

/**
 * Fix F-3 "Safe choices" (J1–J7), local copy and local mail catcher only: choosing a quote is all or nothing and
 * never makes two deals; cancelling reports a failed save; the review queue's verification tab has no dead button.
 * J6 adds a trigger to the local database for a moment (dropped in `finally`), so the file runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'one width: these are server journeys'))

const CHOSEN = 'chose your quote'
const EXPIRED = 'This link has expired. Ask for a new one below.'
const stamp = Date.now()

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
async function callAction(page: Page, name: string, args: unknown[], path: string): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes('service-request-actions'))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  const res = await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args), maxRedirects: 0 })
  return `${res.status()} ${await res.text()}`
}
const chosenMails = async (email: string) => (await allMail(email)).filter((m) => m.subject.includes(CHOSEN)).length
/** Waits for the provider's email, then a little longer, so a second (wrong) one would have arrived too. */
async function settledChosenMails(email: string): Promise<number> {
  await expect.poll(() => chosenMails(email), { timeout: 20_000 }).toBeGreaterThan(0)
  await new Promise((r) => setTimeout(r, 2500))
  return chosenMails(email)
}

type Provider = Awaited<ReturnType<typeof createProvider>>
let a: Provider
let b: Provider
let customer: Awaited<ReturnType<typeof createUser>>
const created: string[] = []

/** A request with two quotes (A: ETB 25,000 with fees; B: ETB 30,000), for a signed-in customer or a private link. */
async function seed(title: string, owner: { userId?: string; token?: string }) {
  const { data: r, error } = await db()
    .from('service_requests')
    .insert({
      vertical_key: 'contractors',
      title: `${title} ${stamp}`,
      details: 'Water leaks under the kitchen sink.',
      name: 'Hanna Customer',
      phone: '+251911000461',
      email: 'f3-customer@test.hagerland.invalid',
      status: 'quoted',
      requester_user_id: owner.userId ?? null,
      access_token_hash: owner.token ? crypto.createHash('sha256').update(owner.token).digest('hex') : null,
      access_token_expires_at: owner.token ? new Date(Date.now() + 10 * 86_400_000).toISOString() : null,
    })
    .select('id, reference')
    .single()
  if (error || !r) throw new Error(`seed failed: ${error?.message}`)
  created.push(r.id)
  const valid = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const { data: ms } = await db()
    .from('service_request_matches')
    .insert([
      { request_id: r.id, org_id: a.orgId, status: 'quoted', quote_amount_minor: 2_500_000, quote_currency: 'ETB', quote_valid_until: valid, quoted_at: new Date().toISOString(), lead_fee_minor: 50_000, commission_minor: 125_000 },
      { request_id: r.id, org_id: b.orgId, status: 'quoted', quote_amount_minor: 3_000_000, quote_currency: 'ETB', quote_valid_until: valid, quoted_at: new Date().toISOString() },
    ])
    .select('id, org_id')
  const ma = ms!.find((m) => m.org_id === a.orgId)!.id
  const mb = ms!.find((m) => m.org_id === b.orgId)!.id
  return { id: r.id, reference: r.reference, ma, mb }
}
async function snapshot(id: string) {
  const [{ data: r }, { data: ms }, { data: deals }] = await Promise.all([
    db().from('service_requests').select('status, closed_reason, closed_at').eq('id', id).single(),
    db().from('service_request_matches').select('org_id, status').eq('request_id', id).order('org_id'),
    db().from('deals').select('source_type, match_id, org_id, title, currency, value_minor, lead_fee_minor, commission_minor, status, closed_at').eq('source_id', id),
  ])
  return { request: r, matches: ms, deals }
}
async function choose(page: Page, orgName: string) {
  const quote = page.locator('li', { hasText: orgName })
  await quote.getByRole('button', { name: 'Choose this quote' }).click()
  await quote.getByRole('button', { name: 'Yes, choose' }).click()
}

test.beforeAll(async () => {
  a = await createProvider({ name: `E2E F3 Abebe Plumbing ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  b = await createProvider({ name: `E2E F3 Bekele Plumbing ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  customer = await createUser({ name: 'Hanna Customer' })
})
test.afterAll(async () => {
  if (created.length) {
    await db().from('deals').delete().in('source_id', created)
    await db().from('service_requests').delete().in('id', created)
  }
  await db().from('verification_requests').delete().in('org_id', [a.orgId, b.orgId])
  await db().from('organisations').delete().in('id', [a.orgId, b.orgId])
})

test('J1 + J4: a signed-in customer chooses a quote; one deal, the other quote lost, one email; another choice is refused', async ({ page }) => {
  const s = await seed('E2E F3 signed', { userId: customer.id })
  await signIn(page, customer.email, customer.password)
  await page.goto(`/account/service-requests/${s.id}`)
  await choose(page, `E2E F3 Abebe Plumbing ${stamp}`)
  await expect(page.getByText(`You chose E2E F3 Abebe Plumbing ${stamp}. They will contact you to agree the details.`)).toBeVisible()
  await expect(page.getByText('You chose this quote')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose this quote' })).toHaveCount(0)

  const after = await snapshot(s.id)
  expect(after.request).toMatchObject({ status: 'won', closed_reason: 'completed' })
  expect(after.matches?.find((m) => m.org_id === a.orgId)?.status).toBe('won')
  expect(after.matches?.find((m) => m.org_id === b.orgId)?.status).toBe('lost')
  expect(after.deals).toHaveLength(1)
  expect(after.deals![0]).toMatchObject({ source_type: 'service_request', match_id: s.ma, org_id: a.orgId, title: `${s.reference}: E2E F3 signed ${stamp}`, currency: 'ETB', value_minor: 2_500_000, lead_fee_minor: 50_000, commission_minor: 125_000, status: 'won', closed_at: after.request!.closed_at })
  expect(await settledChosenMails(a.user.email)).toBe(1)
  expect(await chosenMails(b.user.email)).toBe(0)

  // J4: choosing the other quote afterwards (a crafted call) is refused with the existing text; nothing changes.
  const res = await callAction(page, 'chooseQuoteAction', [{ request_id: s.id, match_id: s.mb }], '/account')
  expect(res).toContain('This request is closed.')
  expect(await snapshot(s.id)).toEqual(after)
  expect(await chosenMails(b.user.email)).toBe(0)
})

test('J2: a guest with the private link chooses a quote, exactly as a signed-in customer', async ({ page }) => {
  const token = crypto.randomBytes(32).toString('base64url')
  const s = await seed('E2E F3 guest', { token })
  const before = await chosenMails(b.user.email)
  await page.context().clearCookies()
  await page.goto(`/requests/${token}`)
  await choose(page, `E2E F3 Bekele Plumbing ${stamp}`)
  await expect(page.getByText(`You chose E2E F3 Bekele Plumbing ${stamp}. They will contact you to agree the details.`)).toBeVisible()
  await expect(page.getByText('You chose this quote')).toBeVisible()
  const after = await snapshot(s.id)
  expect(after.request?.status).toBe('won')
  expect(after.matches?.find((m) => m.org_id === b.orgId)?.status).toBe('won')
  expect(after.matches?.find((m) => m.org_id === a.orgId)?.status).toBe('lost')
  expect(after.deals).toHaveLength(1)
  expect(after.deals![0]).toMatchObject({ match_id: s.mb, org_id: b.orgId, value_minor: 3_000_000, lead_fee_minor: null, commission_minor: null })
  expect(await settledChosenMails(b.user.email)).toBe(before + 1)
})

test('J3: a double tap in two tabs and five calls at once make one deal and one email', async ({ page }) => {
  // Two tabs of the same signed-in customer press "Yes, choose" together.
  const s = await seed('E2E F3 double', { userId: customer.id })
  const mailsBefore = await chosenMails(a.user.email)
  await signIn(page, customer.email, customer.password)
  const second = await page.context().newPage()
  for (const p of [page, second]) {
    await p.goto(`/account/service-requests/${s.id}`)
    const quote = p.locator('li', { hasText: `E2E F3 Abebe Plumbing ${stamp}` })
    await quote.getByRole('button', { name: 'Choose this quote' }).click()
  }
  await Promise.all([page, second].map((p) => p.locator('li', { hasText: `E2E F3 Abebe Plumbing ${stamp}` }).getByRole('button', { name: 'Yes, choose' }).click()))
  for (const p of [page, second]) await expect(p.getByText(`You chose E2E F3 Abebe Plumbing ${stamp}. They will contact you to agree the details.`)).toBeVisible()
  expect((await snapshot(s.id)).deals).toHaveLength(1)
  expect(await settledChosenMails(a.user.email)).toBe(mailsBefore + 1)
  await second.close()

  // Five crafted calls at the same moment.
  const t = await seed('E2E F3 burst', { userId: customer.id })
  const burstBefore = await chosenMails(a.user.email)
  const results = await Promise.all(Array.from({ length: 5 }, () => callAction(page, 'chooseQuoteAction', [{ request_id: t.id, match_id: t.ma }], '/account')))
  for (const r of results) expect(r).toContain(`You chose E2E F3 Abebe Plumbing ${stamp}.`)
  const after = await snapshot(t.id)
  expect(after.deals).toHaveLength(1)
  expect(after.matches?.map((m) => m.status).sort()).toEqual(['lost', 'won'])
  expect(await settledChosenMails(a.user.email)).toBe(burstBefore + 1)
})

test('J5: another user, a wrong link or an expired link cannot choose or cancel; nothing changes', async ({ page }) => {
  const token = crypto.randomBytes(32).toString('base64url')
  const mine = await seed('E2E F3 not yours', { userId: customer.id })
  const guest = await seed('E2E F3 not your link', { token })
  const before = [await snapshot(mine.id), await snapshot(guest.id)]
  const mails = await chosenMails(a.user.email)

  const other = await createUser({ name: 'Other Person' })
  await signIn(page, other.email, other.password)
  expect(await callAction(page, 'chooseQuoteAction', [{ request_id: mine.id, match_id: mine.ma }], '/account')).toContain(EXPIRED)
  expect(await callAction(page, 'cancelServiceRequestAction', [{ request_id: mine.id }], '/account')).toContain(EXPIRED)
  // A signed-in user on a guest's request (no account on it), with no link.
  expect(await callAction(page, 'chooseQuoteAction', [{ request_id: guest.id, match_id: guest.ma }], '/account')).toContain(EXPIRED)
  await page.context().clearCookies()
  const wrong = crypto.randomBytes(32).toString('base64url')
  expect(await callAction(page, 'chooseQuoteAction', [{ request_id: guest.id, match_id: guest.ma, token: wrong }], `/requests/${wrong}`)).toContain(EXPIRED)
  // The real link, but after it expired.
  await db().from('service_requests').update({ access_token_expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', guest.id)
  expect(await callAction(page, 'chooseQuoteAction', [{ request_id: guest.id, match_id: guest.ma, token }], `/requests/${token}`)).toContain(EXPIRED)
  expect(await callAction(page, 'cancelServiceRequestAction', [{ request_id: guest.id, token }], `/requests/${token}`)).toContain(EXPIRED)

  const after = [await snapshot(mine.id), await snapshot(guest.id)]
  expect(after).toEqual(before)
  expect(after[0].request?.status).toBe('quoted')
  expect(after.every((x) => x.deals?.length === 0)).toBe(true)
  await new Promise((r) => setTimeout(r, 1500))
  expect(await chosenMails(a.user.email)).toBe(mails)
  await db().auth.admin.deleteUser(other.id)
})

test('J6: cancel saves with the usual text; a failed save shows the existing error and changes nothing; a closed request is refused', async ({ page }) => {
  await signIn(page, customer.email, customer.password)

  // A save that fails (a local-only trigger refuses changes to this one request).
  const failing = await seed('E2E F3 cancel fails', { userId: customer.id })
  const before = await snapshot(failing.id)
  psql(`create function public.e2e_f3_refuse() returns trigger language plpgsql as $$ begin raise exception 'e2e: refused'; end $$;
    create trigger e2e_f3_refuse before update on public.service_requests for each row when (old.id = '${failing.id}') execute function public.e2e_f3_refuse();`)
  try {
    await page.goto(`/account/service-requests/${failing.id}`)
    await page.getByRole('button', { name: 'Cancel this request' }).click()
    await page.getByRole('button', { name: 'Yes, cancel' }).click()
    await expect(page.getByText('Something went wrong. Please refresh the page.')).toBeVisible()
    await expect(page.getByText('Your request is cancelled')).toHaveCount(0)
  } finally {
    psql('drop trigger if exists e2e_f3_refuse on public.service_requests; drop function if exists public.e2e_f3_refuse();')
  }
  expect(await snapshot(failing.id)).toEqual(before)

  // The usual cancel.
  const s = await seed('E2E F3 cancel', { userId: customer.id })
  await page.goto(`/account/service-requests/${s.id}`)
  await page.getByRole('button', { name: 'Cancel this request' }).click()
  await page.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(page.getByText('Your request is cancelled. Thank you for letting us know.')).toBeVisible()
  const done = await snapshot(s.id)
  expect(done.request).toMatchObject({ status: 'cancelled', closed_reason: 'customer_cancelled' })
  expect(done.matches?.map((m) => m.status)).toEqual(['withdrawn', 'withdrawn'])

  // Not cancellable: a request whose quote was chosen.
  const won = await seed('E2E F3 cancel won', { userId: customer.id })
  expect(await callAction(page, 'chooseQuoteAction', [{ request_id: won.id, match_id: won.ma }], '/account')).toContain('You chose')
  const chosen = await snapshot(won.id)
  expect(await callAction(page, 'cancelServiceRequestAction', [{ request_id: won.id }], '/account')).toContain('This request is already closed.')
  expect(await snapshot(won.id)).toEqual(chosen)
})

test('J7: the verification tab links to the business page (no dead button); Decline still works', async ({ page }) => {
  const [{ data: va }, { data: vb }] = await Promise.all([
    db().from('verification_requests').insert({ org_id: a.orgId, submitted_by: a.user.id }).select('id').single(),
    db().from('verification_requests').insert({ org_id: b.orgId, submitted_by: b.user.id }).select('id').single(),
  ])
  const manifest = readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')
  expect(manifest).not.toContain('"exportedName":"verificationDecisionAction"')
  await adminSession(page)
  await page.goto('/roodber8/review?tab=verification')
  const qa = page.locator('section', { hasText: `E2E F3 Abebe Plumbing ${stamp}` })
  const qb = page.locator('section', { hasText: `E2E F3 Bekele Plumbing ${stamp}` })
  await expect(page.getByRole('button', { name: /Mark Verified/ })).toHaveCount(0)
  await expect(qa.getByRole('link', { name: 'Record the check on the business page' })).toHaveAttribute('href', `/roodber8/organisations/${a.orgId}`)

  await qb.getByRole('textbox', { name: 'Note to the applicant (optional)' }).fill('The licence photo is not readable.')
  await qb.getByRole('button', { name: 'Decline' }).click()
  await expect(page.getByText('Verification declined.')).toBeVisible()
  await expect.poll(async () => (await db().from('verification_requests').select('status, admin_notes').eq('id', vb!.id).single()).data).toEqual({ status: 'rejected', admin_notes: 'The licence photo is not readable.' })
  expect((await db().from('organisations').select('verification_level').eq('id', b.orgId).single()).data?.verification_level).toBe('listed')

  await qa.getByRole('link', { name: 'Record the check on the business page' }).click()
  await page.waitForURL(`**/roodber8/organisations/${a.orgId}`)
  await expect(page.getByText('Record verification check', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record check and give the badge' })).toBeVisible()
  expect((await db().from('verification_requests').select('status').eq('id', va!.id).single()).data?.status).toBe('pending')
})
