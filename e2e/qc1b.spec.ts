import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, createUser, db, signIn, submitStaffSignIn, uniqueEmail } from './helpers'

/**
 * QC-1b, local copy only: the customer's cancel is one step (a failure while withdrawing the offers leaves the request
 * open), and merges are for the owner only and never for a private supply partner. One test adds a trigger to the local
 * database for a moment (dropped in `finally`), so the file runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'one width: these are server and admin journeys'))

const stamp = Date.now()
const REFUSED = 'Merging is not available for supply partner businesses.'

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
async function callAction(page: Page, file: string, name: string, args: unknown[], path: string): Promise<string> {
  const manifest = JSON.parse(readFileSync('.next-test/server/server-reference-manifest.json', 'utf8')) as { node: Record<string, { exportedName?: string; filename?: string }> }
  const id = Object.entries(manifest.node).find(([, v]) => v.exportedName === name && (v.filename ?? '').includes(file))?.[0]
  if (!id) throw new Error(`no action ${name}`)
  const res = await page.request.post(path, { headers: { 'Next-Action': id, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, data: JSON.stringify(args), maxRedirects: 0 })
  return `${res.status()} ${await res.text()}`
}

// ---------------------------------------------------------------------------------------------------------------
// F1: one-step cancel
// ---------------------------------------------------------------------------------------------------------------
test('F1: a failure while withdrawing the offers shows the existing error and leaves the request open; the usual cancel still works', async ({ page }) => {
  const customer = await createUser({ name: 'QC1b Customer' })
  const orgs = (await db().from('organisations').insert([1, 2].map((n) => ({ kind: 'contractor', name: `QC1b Cancel Provider ${n} ${stamp}`, slug: `qc1b-cancel-${n}-${stamp}`, status: 'published' }))).select('id')).data!
  const seed = async (title: string) => {
    const { data: r } = await db().from('service_requests').insert({ vertical_key: 'contractors', title: `${title} ${stamp}`, details: 'Water leaks under the kitchen sink.', name: 'Hanna Customer', phone: '+251911000471', status: 'quoted', requester_user_id: customer.id }).select('id').single()
    await db().from('service_request_matches').insert([
      { request_id: r!.id, org_id: orgs[0].id, status: 'quoted', quote_amount_minor: 2500000, quote_currency: 'ETB' },
      { request_id: r!.id, org_id: orgs[1].id, status: 'offered' },
    ])
    return r!.id
  }
  const snapshot = async (id: string) => ({
    request: (await db().from('service_requests').select('status, closed_reason, closed_at').eq('id', id).single()).data,
    matches: (await db().from('service_request_matches').select('status').eq('request_id', id).order('status')).data?.map((m) => m.status),
  })
  try {
    await signIn(page, customer.email, customer.password)
    const failing = await seed('QC1b cancel fails')
    const before = await snapshot(failing)
    expect(before.request).toMatchObject({ status: 'quoted', closed_at: null })
    // Only the second part (withdrawing the offers) fails: before QC-1b the request stayed cancelled.
    psql(`create function public.e2e_qc1b_refuse() returns trigger language plpgsql as $$ begin raise exception 'e2e: refused'; end $$;
      create trigger e2e_qc1b_refuse before update on public.service_request_matches for each row when (old.request_id = '${failing}') execute function public.e2e_qc1b_refuse();`)
    try {
      await page.goto(`/account/service-requests/${failing}`)
      await page.getByRole('button', { name: 'Cancel this request' }).click()
      await page.getByRole('button', { name: 'Yes, cancel' }).click()
      await expect(page.getByText('Something went wrong. Please refresh the page.')).toBeVisible()
      await expect(page.getByText('Your request is cancelled')).toHaveCount(0)
    } finally {
      psql('drop trigger if exists e2e_qc1b_refuse on public.service_request_matches; drop function if exists public.e2e_qc1b_refuse();')
    }
    expect(await snapshot(failing)).toEqual(before)

    // The same request now cancels normally, with the unchanged message; offers withdrawn; no email to anyone.
    await page.goto(`/account/service-requests/${failing}`)
    await page.getByRole('button', { name: 'Cancel this request' }).click()
    await page.getByRole('button', { name: 'Yes, cancel' }).click()
    await expect(page.getByText('Your request is cancelled. Thank you for letting us know.')).toBeVisible()
    const done = await snapshot(failing)
    expect(done.request).toMatchObject({ status: 'cancelled', closed_reason: 'customer_cancelled' })
    expect(done.request?.closed_at).not.toBeNull()
    expect(done.matches).toEqual(['withdrawn', 'withdrawn'])
    // Cancelling again: the existing "already closed" message.
    expect(await callAction(page, 'service-request-actions', 'cancelServiceRequestAction', [{ request_id: failing }], '/account')).toContain('This request is already closed.')
  } finally {
    await db().from('service_requests').delete().like('title', `QC1b cancel%${stamp}`)
    await db().from('organisations').delete().in('id', orgs.map((o) => o.id))
    await db().auth.admin.deleteUser(customer.id)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// F3: merges owner-only, partners refused
// ---------------------------------------------------------------------------------------------------------------
/** Same encryption as lib/admin/staff-crypto.ts (and e2e/staff.spec.ts), to create a ready-made Operations account. */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}

async function seedOrgs() {
  const names = ['Plain Dup', 'Plain Keep', 'Partner', 'Registered']
  const { data } = await db()
    .from('organisations')
    .insert(names.map((n) => ({ kind: 'supplier', name: `QC1b Merge ${n} ${stamp}`, slug: `qc1b-merge-${n.toLowerCase().replace(' ', '-')}-${stamp}`, status: 'draft', source: 'admin' })))
    .select('id, name')
  const [plainDup, plainKeep, partner, registered] = data!
  expect((await db().from('supply_partners').insert({ org_id: partner.id, relationship_status: 'active' })).error).toBeNull()
  expect((await db().from('partner_registrations').insert({ org_id: registered.id, roles: ['supplier'], business_name: registered.name, contact_name: 'Abebe Kebede', phone: '+251911000472', source: 'staff' })).error).toBeNull()
  return { plainDup, plainKeep, partner, registered }
}
async function removeOrgs(ids: string[]) {
  await db().from('partner_registrations').delete().in('org_id', ids)
  await db().from('organisations').delete().in('id', ids)
}
const orgState = async (ids: string[]) => (await db().from('organisations').select('id, status').in('id', ids).order('id')).data

test('F3: Operations does not see the merge panel and is refused when calling the merge directly; nothing changes', async ({ page }) => {
  const o = await seedOrgs()
  const ids = Object.values(o).map((x) => x.id)
  const email = uniqueEmail('qc1b-ops')
  const secret = authenticator.generateSecret()
  const { data: u } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: 'E2E operations', role: 'operations', status: 'active', user_id: u.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  try {
    const before = await orgState(ids)
    await page.context().clearCookies()
    await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
    await page.goto(`/roodber8/organisations/${o.plainDup.id}`)
    await expect(page.getByRole('heading', { name: o.plainDup.name })).toBeVisible()
    await expect(page.getByText('Members', { exact: true })).toBeVisible()
    await expect(page.getByText('Merge duplicate', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Find the organisation to merge into')).toHaveCount(0)
    const path = `/roodber8/organisations/${o.plainDup.id}`
    const search = await callAction(page, 'roodber8/actions/organisations', 'searchMergeTargetsAction', [o.plainDup.id, 'QC1b Merge'], path)
    expect(search).not.toContain(o.plainKeep.name)
    const merge = await callAction(page, 'roodber8/actions/organisations', 'mergeOrganisationsAction', [o.plainDup.id, o.plainKeep.id], path)
    expect(merge).not.toContain('was merged into')
    expect(await orgState(ids)).toEqual(before)
    expect((await db().from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'organisation.merge').in('entity_id', ids)).count).toBe(0)
  } finally {
    await db().from('staff_users').delete().eq('email', email)
    await db().auth.admin.deleteUser(u.user!.id)
    await removeOrgs(ids)
  }
})

test('F3: the owner never merges a supply partner (either side); partners are left out of the search; ordinary businesses still merge', async ({ page }) => {
  const o = await seedOrgs()
  const ids = Object.values(o).map((x) => x.id)
  try {
    await adminSession(page)
    // A partner's page (a partner record, or a partner registration) shows the approved line instead of the tool.
    for (const p of [o.partner, o.registered]) {
      await page.goto(`/roodber8/organisations/${p.id}`)
      await expect(page.getByText('Merge duplicate', { exact: true })).toBeVisible()
      await expect(page.getByText(REFUSED)).toBeVisible()
      await expect(page.getByLabel('Find the organisation to merge into')).toHaveCount(0)
    }
    // An ordinary business's search finds the other ordinary one, never the partners.
    await page.goto(`/roodber8/organisations/${o.plainDup.id}`)
    await page.getByLabel('Find the organisation to merge into').fill(`QC1b Merge`)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    const options = page.getByLabel('Merge into', { exact: true }).locator('option')
    await expect(options.filter({ hasText: o.plainKeep.name })).toHaveCount(1)
    await expect(options.filter({ hasText: o.partner.name })).toHaveCount(0)
    await expect(options.filter({ hasText: o.registered.name })).toHaveCount(0)
    // Direct calls with a partner on either side: the approved message; nothing changes.
    const before = await orgState(ids)
    const path = `/roodber8/organisations/${o.plainDup.id}`
    for (const [from, into] of [[o.plainDup, o.partner], [o.partner, o.plainDup], [o.plainDup, o.registered], [o.registered, o.plainKeep]]) {
      expect(await callAction(page, 'roodber8/actions/organisations', 'mergeOrganisationsAction', [from.id, into.id], path)).toContain(REFUSED)
    }
    expect(await orgState(ids)).toEqual(before)
    expect((await db().from('supply_partners').select('org_id').eq('org_id', o.partner.id)).data).toEqual([{ org_id: o.partner.id }])
    // The owner still merges two ordinary businesses.
    await page.getByLabel('Merge into', { exact: true }).selectOption(o.plainKeep.id)
    await page.getByLabel('I understand this cannot be undone automatically').check()
    await page.getByRole('button', { name: 'Merge', exact: true }).click()
    await expect.poll(async () => (await db().from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'organisation.merge').eq('entity_id', o.plainKeep.id)).count).toBe(1)
    expect((await db().from('organisations').select('status').eq('id', o.plainDup.id).single()).data?.status).toBe('archived')
  } finally {
    await removeOrgs(ids)
  }
})

test('F3: the merge panel and the partner line fit a 375px screen', async ({ page }) => {
  const o = await seedOrgs()
  const ids = Object.values(o).map((x) => x.id)
  try {
    await page.setViewportSize({ width: 375, height: 812 })
    await adminSession(page)
    for (const id of [o.plainDup.id, o.partner.id]) {
      await page.goto(`/roodber8/organisations/${id}`)
      await expect(page.getByText('Merge duplicate', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  } finally {
    await removeOrgs(ids)
  }
})
