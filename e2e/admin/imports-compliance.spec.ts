import crypto from 'node:crypto'
import http from 'node:http'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, allMail, assertLocalStack, db, uniqueEmail, submitStaffSignIn } from '../helpers'

// Imports compliance (Google Places data), on the local copy only. Google is replaced by a local stand-in on port 3199
// (scripts/with-test-env.sh points the Places client there in test runs, with a dummy key).

test.describe.configure({ mode: 'serial' })
test.use({ actionTimeout: 20_000 })

const ORG = (n: number) => `1ab00000-0000-4000-8000-${String(n).padStart(12, '0')}`
const FRESH = ORG(1)
const NEAR = ORG(2)
const EXPIRED_PRIVATE = ORG(3)
const EXPIRED_PUBLIC = ORG(4)
const PARTLY = ORG(5)
const CONFIRMED = ORG(6)
const SUPPLY = ORG(7)
const NOT_IMPORTED = ORG(8)
const CLAIMED = ORG(10)
const MOCK_ID = 'ChIJmockLeadPlace0000001'
const requests: { path: string; mask: string }[] = []
let server: http.Server

const GOOGLE_PLACE = {
  id: MOCK_ID,
  displayName: { text: 'Mock Merkato Cement Shop' },
  formattedAddress: 'Merkato, Addis Ababa, Ethiopia',
  internationalPhoneNumber: '+251 91 155 5000',
  websiteUri: 'https://mock-cement.example',
  location: { latitude: 9.03, longitude: 38.74 },
  businessStatus: 'OPERATIONAL',
  googleMapsUri: 'https://maps.google.com/?cid=1',
  types: ['hardware_store'],
}

test.beforeAll(async () => {
  assertLocalStack()
  execFileSync('bash', ['scripts/seed-imports-local.sh'], { stdio: 'ignore' })
  await db().from('site_settings').upsert({ key: 'imports_cleanup_mode', value: 'dry_run' })
  server = http.createServer((req, res) => {
    requests.push({ path: req.url ?? '', mask: String(req.headers['x-goog-fieldmask'] ?? '') })
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'POST' && req.url?.startsWith('/v1/places:searchText')) return res.end(JSON.stringify({ places: [GOOGLE_PLACE] }))
    if (req.url?.startsWith(`/v1/places/${MOCK_ID}`) || req.url?.startsWith('/v1/places/ChIJseedImport')) return res.end(JSON.stringify(GOOGLE_PLACE))
    res.statusCode = 404
    res.end(JSON.stringify({ error: { status: 'NOT_FOUND' } }))
  })
  await new Promise<void>((resolve) => server.listen(3199, resolve))
})

test.afterAll(async () => {
  await db().from('site_settings').upsert({ key: 'imports_cleanup_mode', value: 'dry_run' })
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const orgRow = async (id: string) => (await db().from('organisations').select('name, slug, status, phone, website, address_line, lat, lng, description, google_place_id, location_id').eq('id', id).single()).data!
const current = async (id: string) => (await db().from('org_field_sources').select('field, source, cleared_at').eq('org_id', id).eq('is_current', true).order('field')).data!
const cron = (page: Page) => page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })

test('J0, J1, J6: importing keeps only the place ID; the panel shows the deadline; Google’s details are shown live, never saved', async ({ page }) => {
  const d = db()
  await d.from('organisations').delete().eq('google_place_id', MOCK_ID)
  await d.from('import_log').delete().eq('google_place_id', MOCK_ID)
  await adminSession(page)
  await page.goto('/roodber8/import')
  await page.fill('#im-q', 'cement Merkato')
  await page.locator('#im-kind').selectOption('supplier')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('Mock Merkato Cement Shop')).toBeVisible()
  await expect(page.getByText('Google Maps', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Select Mock Merkato Cement Shop' }).check()
  await page.getByRole('button', { name: /Import 1 selected/ }).click()
  await expect(page.getByText('Imported', { exact: true })).toBeVisible()
  const lead = (await d.from('organisations').select('id, name, slug, status, phone, website, address_line, lat, lng, description, source').eq('google_place_id', MOCK_ID).single()).data!
  expect(lead).toMatchObject({ name: 'Unconfirmed lead — refetch from Google', status: 'draft', phone: null, website: null, address_line: null, lat: null, lng: null, description: null, source: 'import' })
  expect(lead.slug).toMatch(/^unconfirmed-lead-/)
  expect((await d.from('import_log').select('listing_name').eq('google_place_id', MOCK_ID).single()).data?.listing_name).toBe('')
  expect(await current(lead.id)).toEqual([])
  // The import asked Google only whether the place still trades.
  expect(requests.filter((r) => r.path.startsWith(`/v1/places/${MOCK_ID}`)).map((r) => r.mask)).toEqual(['id,businessStatus'])
  const audit = (await d.from('audit_log').select('entity_label, diff').eq('entity_id', lead.id).eq('action', 'organisation.import').single()).data!
  expect(JSON.stringify(audit)).not.toContain('Mock Merkato')

  // J1 on seeded businesses: deadlines.
  await page.goto(`/roodber8/organisations/${FRESH}`)
  const panel = page.locator('#google-data')
  await expect(panel.getByText('Google data, within 30 days')).toBeVisible()
  await expect(panel.getByText('Confirm within 24 days')).toBeVisible()
  await expect(panel.getByText('ChIJseedImport000001')).toBeVisible()
  await page.goto(`/roodber8/organisations/${NEAR}`)
  await expect(page.locator('#google-data').getByText('Confirm within 4 days')).toHaveClass(/text-error/)
  await page.goto(`/roodber8/organisations/${EXPIRED_PRIVATE}`)
  await expect(page.locator('#google-data').getByText('Expired — will be cleared')).toBeVisible()
  await page.goto(`/roodber8/organisations/${NOT_IMPORTED}`)
  await expect(page.locator('#google-data')).toHaveCount(0)

  // J6: shown live with the Google Maps attribution; nothing saved.
  await page.goto(`/roodber8/organisations/${lead.id}`)
  await expect(page.locator('#google-data').getByText('Lead: place ID only')).toBeVisible()
  const before = await orgRow(lead.id)
  await page.getByRole('button', { name: /Show Google’s details/ }).click()
  const box = page.getByRole('region', { name: 'Google’s details' })
  await expect(box.getByText('Mock Merkato Cement Shop')).toBeVisible()
  await expect(box.getByText('+251 91 155 5000')).toBeVisible()
  await expect(box.getByText('Google Maps', { exact: true })).toHaveAttribute('translate', 'no')
  expect(await orgRow(lead.id)).toEqual(before)
  expect(await current(lead.id)).toEqual([])
})

test('J2, J3: confirm with the business (partly, then fully); publishing is blocked until then', async ({ page }) => {
  const d = db()
  const lead = (await d.from('organisations').select('id').eq('google_place_id', MOCK_ID).single()).data!
  await adminSession(page)
  // J3: an unconfirmed business cannot be published, from the page or from the Imports review list.
  await page.goto(`/roodber8/organisations/${lead.id}`)
  page.once('dialog', (dlg) => void dlg.accept())
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.getByText(/Confirm the business’s name with the business first/).first()).toBeVisible()
  expect((await orgRow(lead.id)).status).toBe('draft')
  expect((await d.from('organisations').update({ status: 'published' }).eq('id', lead.id)).error?.message).toMatch(/not confirmed with the business/)

  // J2 partly: the near-expiry business confirms only its phone; the other Google fields keep the timer.
  await page.goto(`/roodber8/organisations/${NEAR}`)
  await page.getByRole('button', { name: 'Confirm with the business' }).click()
  const form = page.getByRole('group', { name: 'Confirm with the business' })
  await form.getByLabel('How you confirmed it').selectOption('whatsapp')
  await form.getByLabel('Phone').fill('0911 70 00 22')
  await form.getByRole('button', { name: 'Save confirmed details' }).click()
  await expect(page.getByText(/Confirmed with the business: 1 detail saved/).first()).toBeVisible()
  const near = await current(NEAR)
  expect(near.find((f) => f.field === 'phone')?.source).toBe('confirmed_with_business')
  expect(near.filter((f) => f.source === 'google_places' && !f.cleared_at).map((f) => f.field).sort()).toEqual(['address_line', 'description', 'name'])
  expect(near.find((f) => f.field === 'lat_lng')?.cleared_at).toBeTruthy()
  expect((await orgRow(NEAR)).phone).toBe('+251911700022')
  await expect(page.locator('#google-data').getByText('Confirm within 4 days')).toBeVisible()

  // J2 fully: the new lead, everything typed from what the business said, then published from the review list.
  await page.goto(`/roodber8/organisations/${lead.id}`)
  await page.getByRole('button', { name: 'Confirm with the business' }).click()
  const full = page.getByRole('group', { name: 'Confirm with the business' })
  await full.getByLabel('How you confirmed it').selectOption('phone')
  await full.getByLabel('Business name').fill('Selam Cement Trading')
  await full.getByLabel('Phone').fill('0911 55 50 00')
  await full.getByLabel('Address').fill('Near Anwar Mosque, Merkato')
  await full.getByLabel('The business has none').nth(2).check()
  await full.getByLabel('Area (sub-city)').fill('Addis Ketema')
  await page.getByRole('option', { name: /Addis Ketema/ }).first().click()
  await full.getByLabel('Description', { exact: true }).fill('Selam Cement Trading sells cement and blocks in Merkato, with delivery across Addis Ababa.')
  await full.getByRole('button', { name: 'Save confirmed details' }).click()
  await expect(page.getByText(/Confirmed with the business: 5 details saved/).first()).toBeVisible()
  const confirmed = await orgRow(lead.id)
  expect(confirmed).toMatchObject({ name: 'Selam Cement Trading', phone: '+251911555000', address_line: 'Near Anwar Mosque, Merkato', website: null, google_place_id: MOCK_ID })
  expect(confirmed.slug).toMatch(/^selam-cement-trading-/)
  const audit = (await d.from('audit_log').select('diff').eq('entity_id', lead.id).eq('action', 'imports.confirm').single()).data!.diff as Record<string, unknown>
  expect(audit).toMatchObject({ method: 'phone', confirmed: ['name', 'phone', 'address_line', 'description'], has_none: ['website'] })
  await page.goto('/roodber8/import?tab=review')
  await page.getByRole('checkbox', { name: 'Select Selam Cement Trading' }).check()
  await page.getByRole('button', { name: /^Publish/ }).click()
  await expect(page.getByText('Published 1.').first()).toBeVisible()
  expect((await orgRow(lead.id)).status).toBe('published')
  // Confirmed details are on its public page; tidy up so the test can run again.
  expect((await page.request.get(`/company/${confirmed.slug}`)).status()).toBe(200)
  await d.from('organisations').update({ status: 'draft' }).eq('id', lead.id)
})

test('J4, J5: compliance list and dry run change nothing; live clears only expired Google data of private businesses', async ({ page }) => {
  const d = db()
  execFileSync('bash', ['scripts/seed-imports-local.sh'], { stdio: 'ignore' })
  const ids = [FRESH, NEAR, EXPIRED_PRIVATE, EXPIRED_PUBLIC, PARTLY, CONFIRMED, SUPPLY, NOT_IMPORTED, CLAIMED]
  const snapshot = async () => ({ orgs: await Promise.all(ids.map(orgRow)), sources: await Promise.all(ids.map(current)), log: (await d.from('import_log').select('google_place_id, listing_name').like('google_place_id', 'ChIJseedImport%').order('google_place_id')).data })
  const before = await snapshot()
  await adminSession(page)
  await page.goto('/roodber8/imports/compliance')
  await expect(page.getByText('Mode: Dry run — report only')).toBeVisible()
  const table = page.getByRole('region', { name: 'Imported businesses' })
  await expect(table.getByRole('row', { name: /Expired Private Blocks/ })).toContainText('Name, Phone, Address, Website, Description (AI-written from Google data), Map position (latitude and longitude) · renamed to “Unconfirmed lead”')
  await expect(table.getByRole('row', { name: /Partly Confirmed Paint/ })).toContainText('Website, Map position (latitude and longitude)')
  await expect(table.getByRole('row', { name: /Not Imported Hardware/ })).toHaveCount(0)
  const decisions = page.getByText(/^Public — needs your decision \(\d+\)$/)
  await expect(decisions).toContainText('(2)')
  await page.getByRole('button', { name: 'Filter' }).first().isVisible()
  await page.goto('/roodber8/imports/compliance?state=expired&vis=public')
  await expect(page.getByRole('region', { name: 'Imported businesses' }).getByRole('row', { name: /Expired Public Tiles/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Imported businesses' }).getByRole('row', { name: /Expired Private Blocks/ })).toHaveCount(0)

  // CSV: owner only, audited, never Google's names.
  const csv = await page.request.get('/roodber8/imports/compliance/export')
  expect(csv.status()).toBe(200)
  const text = await csv.text()
  expect(text).toContain('Fully Confirmed Glass')
  expect(text).not.toContain('Expired Private Blocks')
  expect(text).toContain('(from Google, not exported)')
  expect((await d.from('audit_log').select('id').eq('action', 'imports.compliance_export')).data!.length).toBeGreaterThan(0)

  // Dry run: by button and by the daily job.
  await page.goto('/roodber8/imports/compliance')
  await page.getByRole('button', { name: 'Run a dry run now' }).click()
  await expect(page.getByText(/Dry run done: 3 businesses would be cleared, 2 need your decision\. Nothing was changed\./).first()).toBeVisible()
  expect((await cron(page)).status()).toBe(200)
  expect(await snapshot()).toEqual(before)
  const dry = (await d.from('import_cleanup_runs').select('mode, counts').order('started_at', { ascending: false }).limit(1).single()).data!
  expect(dry.mode).toBe('dry_run')
  expect(dry.counts).toMatchObject({ orgsToClear: 3, publicDecisions: 2, orgsCleared: 0 })
  expect((await d.from('import_cleanup_runs').update({ mode: 'live' }).eq('mode', 'dry_run')).error?.message).toMatch(/append-only/)

  // Live: the owner switches it on (after ticking that the dry-run list was read), then the daily job runs.
  await page.getByLabel('Imports clean-up mode').selectOption('live')
  await page.getByRole('button', { name: 'Save mode' }).click()
  await expect(page.getByText(/Tick that you have read the dry-run list/).first()).toBeVisible()
  await page.getByLabel(/I have read the dry-run list/).check()
  await page.getByRole('button', { name: 'Save mode' }).click()
  await expect(page.getByText('Mode: Live — clear expired Google data')).toBeVisible()
  await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' })
  const res = await cron(page)
  expect((await res.json()).importsCleanup).toMatchObject({ mode: 'live', orgsCleared: 3, publicDecisions: 2 })
  for (const id of [EXPIRED_PRIVATE, SUPPLY]) {
    const o = await orgRow(id)
    expect(o).toMatchObject({ name: 'Unconfirmed lead — refetch from Google', phone: null, address_line: null, description: null, lat: null, lng: null, status: 'draft' })
    expect(o.google_place_id).toMatch(/^ChIJseedImport/)
    expect(o.slug).toMatch(/^unconfirmed-lead-/)
    expect((await current(id)).every((f) => f.cleared_at)).toBe(true)
  }
  const partly = await orgRow(PARTLY)
  expect(partly).toMatchObject({ name: 'Partly Confirmed Paint', phone: '+251911700005', website: null, address_line: 'Sarbet, Addis Ababa', lat: null })
  // Untouched: fresh, near expiry, public, claimed, fully confirmed, never imported.
  for (const [i, id] of ids.entries()) if ([FRESH, NEAR, EXPIRED_PUBLIC, CLAIMED, CONFIRMED, NOT_IMPORTED].includes(id)) expect(await orgRow(id), id).toEqual(before.orgs[i])
  expect((await d.from('import_log').select('listing_name').like('google_place_id', 'ChIJseedImport%')).data!.every((r) => r.listing_name === '')).toBe(true)
  expect((await d.from('organisations').select('id').in('id', [...ids, ORG(9)])).data).toHaveLength(10)
  const cleared = (await d.from('audit_log').select('actor, diff').eq('action', 'imports.google_cleared').eq('entity_id', EXPIRED_PRIVATE)).data!
  expect(cleared[0].actor).toBe('system:daily job')
  expect(JSON.stringify(cleared)).not.toMatch(/Expired Private Blocks|251911700003/)
  // The public business stays live until the owner decides.
  expect((await page.request.get('/company/expired-public-tiles-seed')).status()).toBe(200)
  const digest = (await allMail(process.env.ADMIN_DIGEST_EMAIL ?? '')).find((m) => /digest/i.test(m.subject))!
  expect(digest.text).toMatch(/Imports: businesses with Google data cleared today\s*:?\s*3/)
  expect(digest.text).toMatch(/Imports: public businesses needing your decision\s*:?\s*2/)
  expect(digest.html).not.toMatch(/Expired Public Tiles|Expired Private Blocks|ChIJseed/)

  // Owner decision: make the public one private and clear it.
  await page.goto('/roodber8/imports/compliance')
  page.once('dialog', (dlg) => void dlg.accept())
  await page.getByRole('listitem').filter({ hasText: 'Expired Public Tiles' }).getByRole('button', { name: 'Make private and clear' }).click()
  await expect(page.getByText(/Made private and cleared its Google data/).first()).toBeVisible()
  expect(await orgRow(EXPIRED_PUBLIC)).toMatchObject({ status: 'draft', name: 'Unconfirmed lead — refetch from Google', phone: null, google_place_id: 'ChIJseedImport000004' })
  expect((await page.request.get('/company/expired-public-tiles-seed')).status()).toBe(404)
  await d.from('site_settings').upsert({ key: 'imports_cleanup_mode', value: 'dry_run' })
})

test('a failing clean-up never stops the daily job or the digest', async ({ page }) => {
  const sql = (q: string) => execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', q], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString()
  sql('revoke select on public.org_field_sources from service_role')
  try {
    await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' })
    const res = await cron(page)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.importsCleanup).toBeNull()
    expect(body.digestSent).toBe(true)
  } finally {
    sql('grant select on public.org_field_sources to service_role')
  }
})

/** Same encryption as lib/admin/staff-crypto.ts (see e2e/staff.spec.ts). */
function encrypt(plain: string): string {
  const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((x) => x.toString('base64url')).join('.')
}

async function staffSignIn(page: Page, role: 'operations' | 'agent' | 'content') {
  const email = uniqueEmail(`staff-imports-${role}`)
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await page.context().clearCookies()
  await submitStaffSignIn(page, email, password, secret)
  return async () => {
    await db().from('staff_users').delete().eq('email', email)
    await db().auth.admin.deleteUser(data.user!.id)
  }
}

test('J7 roles: Operations views and confirms but cannot switch the mode, decide on public businesses or download the CSV; Agent and Content have no access', async ({ page }) => {
  execFileSync('bash', ['scripts/seed-imports-local.sh'], { stdio: 'ignore' })
  const cleanups: (() => Promise<void>)[] = []
  try {
    cleanups.push(await staffSignIn(page, 'operations'))
    await page.goto('/roodber8/imports/compliance')
    await expect(page.getByRole('heading', { name: 'Imports compliance' })).toBeVisible()
    await expect(page.getByLabel('Imports clean-up mode')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Make private and clear' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Download CSV' })).toHaveCount(0)
    expect((await page.request.get('/roodber8/imports/compliance/export')).status()).toBe(401)
    await page.goto(`/roodber8/organisations/${FRESH}`)
    await page.getByRole('button', { name: 'Confirm with the business' }).click()
    const form = page.getByRole('group', { name: 'Confirm with the business' })
    await form.getByLabel('How you confirmed it').selectOption('visit')
    await form.getByLabel('Website').fill('https://fresh-cement.example')
    await form.getByRole('button', { name: 'Save confirmed details' }).click()
    await expect(page.getByText(/Confirmed with the business: 1 detail saved/).first()).toBeVisible()
    await page.goto('/roodber8/import')
    await expect(page).toHaveURL(/denied=1/)
    for (const role of ['agent', 'content'] as const) {
      cleanups.push(await staffSignIn(page, role))
      for (const path of ['/roodber8/imports/compliance', '/roodber8/import']) {
        await page.goto(path)
        await expect(page, `${role} ${path}`).toHaveURL(/denied=1/)
      }
      await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: /Imports/ })).toHaveCount(0)
    }
  } finally {
    for (const c of cleanups) await c()
  }
  expect((await db().from('site_settings').select('value').eq('key', 'imports_cleanup_mode').single()).data?.value).toBe('dry_run')
})

test('nothing reaches public pages: imported businesses still show as before until a button is pressed; sitemaps and Supplies unchanged', async ({ request }) => {
  execFileSync('bash', ['scripts/seed-imports-local.sh'], { stdio: 'ignore' })
  for (const path of ['/', '/supplies', '/suppliers', '/jobs', '/sitemap/companies.xml']) {
    const body = await (await request.get(path)).text()
    for (const s of ['Imports compliance', 'Unconfirmed lead', 'ChIJseed', 'Google data']) expect(body, `${path} shows ${s}`).not.toContain(s)
  }
  expect((await request.get('/company/expired-public-tiles-seed')).status()).toBe(200)
  expect((await request.get('/company/fully-confirmed-glass')).status()).toBe(200)
  expect(await (await request.get('/sitemap/companies.xml')).text()).toContain('/company/expired-public-tiles-seed')
})
