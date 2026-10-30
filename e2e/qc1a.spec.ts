import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adminSession, allMail, asFreshVisitor, assertLocalStack, createUser, db, randomPhone, seedShowcase, signIn, uniqueEmail, type Showcase } from './helpers'
import { addisDay } from '../lib/jobs-privacy'

/**
 * QC-1a "green and correct", on the local copy and local mail catcher only: the spam check counts its drops, account
 * pages say when a read failed, every guide is listed, legal dates follow switches, the valuation keeping period clears
 * exactly the right rows (money unchanged), merge search, the audit CSV period, Addis "today", the admin skip link,
 * and the partner gold mine stays private on every public read path. Switches are restored in finally blocks and by
 * the global teardown.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width (the 375 px checks set their own size)'))

const stamp = Date.now()
const today = addisDay(new Date())

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
async function cron(request: APIRequestContext) {
  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, timeout: 280_000 })
  expect(res.status()).toBe(200)
  return res.json() as Promise<{ failedSteps: string[]; jobsDataCleanup: { mode: string; counts: { due: Record<string, number>; cleared: Record<string, number>; failed: Record<string, number> } } | null }>
}
/** The id an "insert … returning id" gives back (psql also prints the command tag). */
const psqlId = (sql: string) => psql(sql).split('\n')[0].trim()
const spamCount = () => Number(psql("select coalesce(sum(count), 0) from public.errors where route = 'spam_check_drop'"))

// ---------------------------------------------------------------------------------------------------------------
// F13: the partner gold mine on every public read path
// ---------------------------------------------------------------------------------------------------------------
test('F13: a partner-sourced product never shows the partner name, phone, code or cost on any public read path', async ({ page, request }) => {
  const d = db()
  const PARTNER = `Kality Gold Partner ${stamp}`
  const PHONE = `+2519${String(stamp).slice(-8)}`
  const SKU = `KGP-${stamp}`
  const COST = 73519 // ETB 735.19
  const { data: hls } = await d.from('organisations').select('id').eq('slug', 'hagerland-supply').single()
  const { data: sub } = await d.from('product_categories').select('id, slug, parent_id').not('parent_id', 'is', null).eq('is_active', true).order('sort').limit(1).single()
  const parentSlug = (await d.from('product_categories').select('slug').eq('id', sub!.parent_id!).single()).data!.slug
  const { data: brand } = await d.from('brands').insert({ name: `QC Brand ${stamp}`, slug: `qc-brand-${stamp}`, is_active: true }).select('id, slug').single()
  const { data: org } = await d.from('organisations').insert({ kind: 'supplier', name: PARTNER, slug: `e2e-qc-partner-${stamp}`, status: 'draft', source: 'admin', phone: PHONE }).select('id, slug').single()
  const { data: product } = await d.from('products').insert({ name: `QC gold cement ${stamp}`, slug: `qc-gold-cement-${stamp}`, category_id: sub!.id, seller_org_id: hls!.id, brand_id: brand!.id, unit: 'bag', status: 'published', price_type: 'on_request' }).select('id, slug').single()
  try {
    await d.from('supply_partners').insert({ org_id: org!.id, roles: ['manufacturer'] })
    await d.from('product_sources').insert({ product_id: product!.id, org_id: org!.id, partner_sku: SKU, cost_price_cents: COST, is_primary: true, created_by: 'e2e' })
    const secrets = [PARTNER, PHONE, PHONE.slice(4), SKU, '735.19']
    const clean = (where: string, text: string) => {
      for (const s of secrets) expect(text, `${where} shows ${s}`).not.toContain(s)
    }
    await asFreshVisitor(page)
    for (const path of [`/supplies/${parentSlug}`, `/supplies/${parentSlug}/${sub!.slug}`, `/supplies/${parentSlug}?brand=${brand!.slug}`, `/supplies/${parentSlug}/${sub!.slug}?brand=${brand!.slug}`, '/suppliers', `/supplies/product/${product!.slug}`]) {
      const res = await page.goto(path)
      expect(res?.status(), path).toBe(200)
      clean(path, await page.content())
    }
    // The product itself is public (so the checks above looked at live pages; category lists and the brand list are
    // cached, so a brand made seconds ago may not filter yet: the leak checks hold either way).
    await page.goto(`/supplies/product/${product!.slug}`)
    await expect(page.getByRole('heading', { level: 1, name: `QC gold cement ${stamp}` })).toBeVisible()
    // The partner has no company page and no share image.
    expect((await request.get(`/company/${org!.slug}`)).status()).toBe(404)
    expect((await request.get(`/og/company/${org!.slug}`)).status()).toBe(404)
    // APIs.
    for (const path of [`/api/locations?q=${encodeURIComponent('Bole')}`, `/api/locations?q=${encodeURIComponent(PARTNER.slice(0, 20))}&scope=all`, '/api/properties/count?purpose=sale', `/api/search/suggest?q=${encodeURIComponent('QC gold cement')}`]) {
      const res = await request.get(path)
      expect(res.status(), path).toBeLessThan(500)
      clean(path, await res.text())
    }
    for (const body of [{ entity_type: 'product', id: product!.id }, { entity_type: 'organisation', id: org!.id }]) {
      const res = await request.post('/api/views', { data: body })
      expect(res.status()).toBeLessThan(500)
      clean('/api/views', await res.text())
    }
    // Contact reveal on the partner-sourced product: HagerLand Supply's contact (or none), never the partner's.
    for (const channel of ['phone', 'whatsapp', 'email']) {
      const res = await request.post('/api/contact-reveal', { data: { target_type: 'product', target_id: product!.id, channel } })
      clean(`/api/contact-reveal ${channel}`, await res.text())
    }
    const orgReveal = await request.post('/api/contact-reveal', { data: { target_type: 'organisation', target_id: org!.id, channel: 'phone' } })
    expect(orgReveal.status()).toBe(404)
    clean('/api/contact-reveal organisation', await orgReveal.text())
  } finally {
    await d.from('product_sources').delete().eq('product_id', product!.id)
    await d.from('products').delete().eq('id', product!.id)
    await d.from('supply_partners').delete().eq('org_id', org!.id)
    await d.from('organisations').delete().eq('id', org!.id)
    await d.from('brands').delete().eq('id', brand!.id)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// F5: the spam check
// ---------------------------------------------------------------------------------------------------------------
async function sendContact(page: Page, name: string, email: string) {
  await asFreshVisitor(page)
  await page.goto('/contact')
  await page.fill('#contact-name', name)
  await page.fill('#contact-phone', randomPhone())
  await page.fill('#contact-email', email)
  await page.fill('#contact-message', `QC-1a contact check ${name}`)
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
}

test('F5: a normal message is saved and emailed; a filled spam check shows the same success, saves and sends nothing, and is counted; the digest says so', async ({ page, request }) => {
  const field = page.locator('input[name="hl_zq9"]')
  await page.goto('/contact')
  // Hints that keep browsers and password managers from filling the hidden field.
  await expect(field).toHaveAttribute('autocomplete', 'off')
  await expect(field).toHaveAttribute('data-1p-ignore', 'true')
  await expect(field).toHaveAttribute('data-lpignore', 'true')
  await expect(field).toHaveAttribute('tabindex', '-1')
  expect(await page.locator('input[name="hl_extra_field"]').count()).toBe(0)

  const inbox = process.env.HAGERLAND_INBOX_EMAIL ?? ''
  const okName = `QC1a Normal ${stamp}`
  const okEmail = uniqueEmail('qc1a-normal')
  const before = spamCount()
  await sendContact(page, okName, okEmail)
  await expect.poll(async () => (await db().from('enquiries').select('id').eq('name', okName)).data?.length).toBe(1)
  await expect.poll(async () => (await allMail(inbox)).filter((m) => m.text.includes(okName)).length).toBe(1)
  expect(spamCount()).toBe(before)

  for (const [trap, n] of [['hl_zq9', 1], ['hl_extra_field', 2]] as const) {
    const botName = `QC1a Bot ${trap} ${stamp}`
    const botEmail = uniqueEmail('qc1a-bot')
    await asFreshVisitor(page)
    await page.goto('/contact')
    await page.fill('#contact-name', botName)
    await page.fill('#contact-phone', randomPhone())
    await page.fill('#contact-email', botEmail)
    await page.fill('#contact-message', `QC-1a contact check ${botName}`)
    if (trap === 'hl_zq9') await page.locator('input[name="hl_zq9"]').evaluate((el: HTMLInputElement) => (el.value = 'spam'))
    // A page opened before the release still posts the old field name: a filled one counts too.
    else await page.locator('input[name="hl_zq9"]').evaluate((el: HTMLInputElement) => {
      const legacy = document.createElement('input')
      legacy.type = 'hidden'
      legacy.name = 'hl_extra_field'
      legacy.value = 'spam'
      el.after(legacy)
    })
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
    await page.waitForTimeout(1500)
    expect((await db().from('enquiries').select('id').eq('name', botName)).data).toHaveLength(0)
    expect((await allMail(inbox)).filter((m) => m.text.includes(botName))).toHaveLength(0)
    expect(await allMail(botEmail)).toHaveLength(0)
    expect(spamCount()).toBe(before + n)
  }
  // Only the form and the hour are stored: no message, name, phone, email, address or browser.
  const rows = psql("select message from public.errors where route = 'spam_check_drop'").split('\n')
  for (const r of rows) expect(r).toMatch(/^[a-z_]+ \d{4}-\d{2}-\d{2}T\d{2}$/)
  expect(rows.some((r) => r.startsWith('submit_enquiry '))).toBe(true)

  // The daily digest: one line, only when above 0.
  await cron(request)
  const digest = (await allMail(process.env.ADMIN_DIGEST_EMAIL ?? ''))[0]
  expect(digest.text).toMatch(/Messages stopped by the spam check in the last 24 hours: \d+/)
  // Not listed among the errors.
  expect(digest.text).not.toContain('spam_check_drop')
})

// ---------------------------------------------------------------------------------------------------------------
// F6: account pages say when a read failed
// ---------------------------------------------------------------------------------------------------------------
test('F6: a failed read on an account page shows the error sentence, never "nothing yet"', async ({ page }) => {
  const user = await createUser({ name: 'QC1a Account' })
  await signIn(page, user.email, user.password)
  await page.goto('/account/service-requests')
  await expect(page.getByText('No requests yet')).toBeVisible()
  // Signed-in reads use the "authenticated" role; the building projects page reads on the server.
  psql('revoke select on public.service_requests from authenticated')
  try {
    await page.goto('/account/service-requests')
    await expect(page.getByText('We could not load your service requests just now. Please refresh the page.')).toBeVisible()
    await expect(page.getByText('No requests yet')).toHaveCount(0)
  } finally {
    psql('grant select on public.service_requests to authenticated')
  }
  await page.goto('/account/projects')
  await expect(page.getByText('No projects yet')).toBeVisible()
  psql('revoke select on public.build_projects from service_role')
  try {
    await page.goto('/account/projects')
    await expect(page.getByText('We could not load your building projects just now. Please refresh the page.')).toBeVisible()
    await expect(page.getByText('No projects yet')).toHaveCount(0)
  } finally {
    psql('grant select on public.build_projects to service_role')
  }
  await page.goto('/account/saved')
  await expect(page.getByText('Nothing saved yet')).toBeVisible()
  psql('revoke select on public.saved_items from authenticated')
  try {
    await page.goto('/account/saved')
    await expect(page.getByText('We could not load your saved items just now. Please refresh the page.')).toBeVisible()
  } finally {
    psql('grant select on public.saved_items to authenticated')
  }
  // Restored: back to the honest empty state.
  await page.goto('/account/service-requests')
  await expect(page.getByText('No requests yet')).toBeVisible()
})

/** Saves a starter guide unchanged (still a draft) in admin: the real way the cached guide lists are refreshed. */
async function refreshGuides(page: Page) {
  const { data: g } = await db().from('guides').select('id').eq('slug', 'property-viewing-checklist').single()
  await adminSession(page)
  await page.goto(`/roodber8/guides/${g!.id}`)
  await page.getByRole('button', { name: 'Save guide' }).click()
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
}

// ---------------------------------------------------------------------------------------------------------------
// F7: every published guide on /guides and in the sitemap
// ---------------------------------------------------------------------------------------------------------------
test('F7: with 150 published guides, /guides and the guides sitemap list every one (no cap, no paging)', async ({ page, request }) => {
  test.setTimeout(240_000)
  psql(`insert into public.guides (slug, title, summary, topic, body, status, needs_review, published_at) select 'qc1a-guide-${stamp}-' || g, 'QC1a guide ' || g, 'A plain summary.', 'buying', 'Plain body text for the guide.', 'published', false, now() - (g || ' minutes')::interval from generate_series(1, 150) g`)
  try {
    const truth = Number(psql("select count(*) from public.guides_public"))
    expect(truth).toBeGreaterThanOrEqual(150)
    await refreshGuides(page)
    const sitemap = await (await request.get('/sitemap/guides.xml')).text()
    expect((sitemap.match(new RegExp(`/guides/qc1a-guide-${stamp}-`, 'g')) ?? []).length).toBe(150)
    await asFreshVisitor(page)
    await page.goto('/guides')
    await expect(page.locator(`a[href^="/guides/qc1a-guide-${stamp}-"]`)).toHaveCount(150)
    await expect(page.getByText(/page \d+ of/i)).toHaveCount(0)
  } finally {
    psql(`delete from public.guides where slug like 'qc1a-guide-${stamp}-%'`)
    await refreshGuides(page)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// F8: legal dates follow the switches
// ---------------------------------------------------------------------------------------------------------------
test('F8: switching partner registration moves the /privacy date (not /terms); the override boxes stay empty; the audit entry records it', async ({ page }) => {
  psql("delete from public.site_settings where key = 'legal_switch_changed'")
  psql(`update public.site_settings set value = '{}'::jsonb where key = 'legal_last_updated'`)
  const fmt = (d: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).format(new Date(`${d}T12:00:00+03:00`))
  await page.goto('/terms')
  const termsBefore = await page.getByText(/^Last updated /).first().textContent()
  try {
    await adminSession(page)
    page.on('dialog', (dlg) => void dlg.accept())
    await page.goto('/roodber8/supply/switches')
    await page.locator('div', { has: page.getByText(/^Partner registration:/) }).last().getByRole('button', { name: 'Switch on' }).click()
    await expect.poll(() => psql("select value->>'privacy' from public.site_settings where key = 'legal_switch_changed'")).toBe(today)
    expect(psql("select coalesce(value->>'terms', '') from public.site_settings where key = 'legal_switch_changed'")).toBe('')
    expect(psql("select value::text from public.site_settings where key = 'legal_last_updated'")).toBe('{}')
    const diff = JSON.parse(psql("select diff::text from public.audit_log where action = 'supply.switch' and entity_label = 'supply_partner_registration' order by created_at desc limit 1"))
    expect(diff).toMatchObject({ to: true, legal_dates: { pages: ['privacy'], date: today } })
    await page.goto('/privacy')
    await expect(page.getByText(`Last updated ${fmt(today)}`)).toBeVisible()
    await page.goto('/terms')
    expect(await page.getByText(/^Last updated /).first().textContent()).toBe(termsBefore)
  } finally {
    psql("update public.site_settings set value = 'false'::jsonb where key = 'supply_partner_registration'")
    psql("delete from public.site_settings where key = 'legal_switch_changed'")
  }
})

// ---------------------------------------------------------------------------------------------------------------
// F10: valuations and agency contacts (shared owner switch)
// ---------------------------------------------------------------------------------------------------------------
async function agencyFigures(page: Page) {
  await adminSession(page)
  const out: Record<string, string> = {}
  for (const path of ['/roodber8/export/agency-report', '/roodber8/export/agency-instructions', '/roodber8/export/deals']) {
    const res = await page.request.get(path)
    expect(res.status(), path).toBe(200)
    out[path] = (await res.text()).replace(/\b\d{1,2}:\d{2}\b/g, '').match(/-?\d[\d,]*(?:\.\d+)?/g)?.join(' ') ?? ''
  }
  for (const path of ['/roodber8/agency', '/roodber8/agency/tenancies']) {
    await page.goto(path)
    out[path] = ((await page.locator('main').innerText()).replace(/\b\d{1,2}:\d{2}\b/g, '').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).join(' ')
  }
  out.amounts = psql("select string_agg(reference || ':' || coalesce(value_low_etb::text, '') || '-' || coalesce(value_high_etb::text, '') || ':' || status || ':' || outcome, ',' order by reference) from public.agency_valuations")
  out.tenancies = psql("select string_agg(reference || ':' || rent_minor::text || ':' || status, ',' order by reference) from public.tenancies")
  return out
}

test('F10: Dry run counts and a Live run clears exactly the right valuations and agency contacts; files go; money stays identical', async ({ page, request }) => {
  test.setTimeout(600_000)
  const d = db()
  const old = `now() - interval '25 months'`
  const contact = (name: string, when: string) => psqlId(`insert into public.agency_contacts (name, phone, roles, created_at, updated_at) values ('${name}', '${randomPhone()}', '{vendor}', ${when}, ${when}) returning id`)
  const cDue = contact(`QC1a Due Contact ${stamp}`, old)
  const cOpen = contact(`QC1a Open Contact ${stamp}`, old)
  const cNew = contact(`QC1a Recent Contact ${stamp}`, 'now()')
  const openInstruction = psqlId(`insert into public.agency_instructions (purpose, title, contact_id, stage, created_at, updated_at) values ('sale', 'QC1a open instruction ${stamp}', '${cOpen}', 'lead', ${old}, ${old}) returning id`)
  const reportPath = `docs/agency/${crypto.randomUUID()}/qc1a-report.pdf`
  const up = await d.storage.from('private-docs').upload(reportPath, Buffer.from('%PDF-1.4 qc1a'), { contentType: 'application/pdf' })
  expect(up.error).toBeNull()
  const val = (contactId: string, status: string, when: string, instruction: string | null = null, report: string | null = null) =>
    psqlId(`insert into public.agency_valuations (purpose, contact_id, instruction_id, status, address_line, details, notes, report_path, value_low_etb, value_high_etb, outcome, created_at, updated_at) values ('sale', '${contactId}', ${instruction ? `'${instruction}'` : 'null'}, '${status}', 'House ${stamp}, Bole', 'Three bedrooms ${stamp}', 'Owner notes ${stamp}', ${report ? `'${report}'` : 'null'}, 6500000, 7000000, 'not_instructed', ${when}, ${when}) returning id`)
  const vDue = val(cDue, 'completed', old, null, reportPath)
  const vOpenInstr = val(cOpen, 'completed', old, openInstruction)
  const vBooked = val(cNew, 'booked', old)
  const vRecent = val(cNew, 'completed', `now() - interval '23 months'`)
  const ids = [vDue, vOpenInstr, vBooked, vRecent]
  const row = (id: string) => psql(`select coalesce(address_line, '∅') || '|' || coalesce(details, '∅') || '|' || coalesce(notes, '∅') || '|' || coalesce(report_path, '∅') || '|' || value_low_etb || '|' || status from public.agency_valuations where id = '${id}'`)
  const contactRow = (id: string) => psql(`select name || '|' || coalesce(email, '∅') || '|' || coalesce(phone, '∅') from public.agency_contacts where id = '${id}'`)
  const before = Object.fromEntries(ids.map((id) => [id, row(id)]))
  const moneyBefore = await agencyFigures(page)
  try {
    // Dry run: counts only, nothing changes.
    const dry = await cron(request)
    expect(dry.failedSteps).toEqual([])
    expect(dry.jobsDataCleanup?.mode).toBe('dry_run')
    expect(dry.jobsDataCleanup?.counts.due.agency_valuations).toBeGreaterThanOrEqual(1)
    expect(dry.jobsDataCleanup?.counts.due.agency_contacts).toBeGreaterThanOrEqual(1)
    for (const id of ids) expect(row(id)).toBe(before[id])
    expect(contactRow(cDue)).toContain(`QC1a Due Contact ${stamp}`)
    // The switches page shows the approved line.
    await adminSession(page)
    await page.goto('/roodber8/jobs/data')
    await expect(page.getByText('Valuations and agency contacts')).toBeVisible()
    await expect(page.getByText('Address, details, notes and report cleared 24 months after the last activity, once completed or cancelled; never while an instruction or tenancy is open.')).toBeVisible()
    // Live.
    psql(`update public.site_settings set value = '"live"'::jsonb where key = 'jobs_data_cleanup_mode'`)
    const live = await cron(request)
    expect(live.failedSteps).toEqual([])
    expect(live.jobsDataCleanup?.counts.failed.agency_valuations).toBe(0)
    expect(live.jobsDataCleanup?.counts.failed.agency_contacts).toBe(0)
  } finally {
    psql(`update public.site_settings set value = '"dry_run"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  }
  // Exactly the due valuation: address, details, notes and report gone; amounts and status stay.
  expect(row(vDue)).toBe('∅|∅|∅|∅|6500000|completed')
  for (const id of [vOpenInstr, vBooked, vRecent]) expect(row(id)).toBe(before[id])
  expect((await d.storage.from('private-docs').download(reportPath)).error).not.toBeNull()
  // Exactly the due contact: anonymised; the one with an open instruction and the recent one untouched.
  expect(contactRow(cDue)).toBe('Removed|removed@removed.invalid|∅')
  expect(contactRow(cOpen)).toContain(`QC1a Open Contact ${stamp}`)
  expect(contactRow(cNew)).toContain(`QC1a Recent Contact ${stamp}`)
  // The valuation and contact rows themselves stay (other records point at them).
  expect(Number(psql(`select count(*) from public.agency_valuations where id in ('${ids.join("','")}')`))).toBe(4)
  // Money proof: every agency figure, CSV and the deals CSV identical.
  expect(await agencyFigures(page)).toEqual(moneyBefore)
  // A second Live run changes nothing more.
  psql(`update public.site_settings set value = '"live"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  try {
    const again = await cron(request)
    expect(again.jobsDataCleanup?.counts.due.agency_valuations).toBe(0)
    expect(again.jobsDataCleanup?.counts.due.agency_contacts).toBe(0)
  } finally {
    psql(`update public.site_settings set value = '"dry_run"'::jsonb where key = 'jobs_data_cleanup_mode'`)
  }
  // The privacy page names valuation requests.
  await page.goto('/privacy')
  await expect(page.getByText('Valuation requests, viewings, offers and applications to rent: 24 months after the last activity, unless they lead to a sale or tenancy, which we keep for as long as the law requires for our records.')).toBeVisible()
})

// ---------------------------------------------------------------------------------------------------------------
// F3: merge search
// ---------------------------------------------------------------------------------------------------------------
test('F3: the merge search finds an organisation beyond the old 500 limit, with the same choices as before (same kind, not itself, not archived)', async ({ page }) => {
  test.setTimeout(240_000)
  psql(`insert into public.organisations (kind, name, slug, status, source) select 'supplier', 'AAA QC1a filler ' || g, 'qc1a-filler-${stamp}-' || g, 'draft', 'admin' from generate_series(1, 600) g`)
  const ins = (name: string, kind: string, status: string) => psqlId(`insert into public.organisations (kind, name, slug, status, source) values ('${kind}', '${name}', 'qc1a-${crypto.randomUUID().slice(0, 8)}', '${status}', 'admin') returning id`)
  const dup = ins(`ZZZ QC1a Dup ${stamp}`, 'supplier', 'draft')
  const keep = ins(`ZZZ QC1a Keep ${stamp}`, 'supplier', 'draft')
  const archived = ins(`ZZZ QC1a Archived ${stamp}`, 'supplier', 'archived')
  const other = ins(`ZZZ QC1a Other kind ${stamp}`, 'contractor', 'draft')
  try {
    await adminSession(page)
    await page.goto(`/roodber8/organisations/${dup}`)
    await page.getByLabel('Find the organisation to merge into').fill('a')
    await expect(page.getByRole('button', { name: 'Find', exact: true })).toBeDisabled()
    await page.getByLabel('Find the organisation to merge into').fill(`ZZZ QC1a`)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    const options = page.getByLabel('Merge into', { exact: true }).locator('option')
    await expect(options.filter({ hasText: `ZZZ QC1a Keep ${stamp}` })).toHaveCount(1)
    await expect(options.filter({ hasText: `ZZZ QC1a Dup ${stamp}` })).toHaveCount(0)
    await expect(options.filter({ hasText: `ZZZ QC1a Archived ${stamp}` })).toHaveCount(0)
    await expect(options.filter({ hasText: `ZZZ QC1a Other kind ${stamp}` })).toHaveCount(0)
    // By reference too.
    const ref = psql(`select short_id from public.organisations where id = '${keep}'`)
    await page.getByLabel('Find the organisation to merge into').fill(ref)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    await expect(options.filter({ hasText: `ZZZ QC1a Keep ${stamp} (${ref})` })).toHaveCount(1)
    await page.getByLabel('Find the organisation to merge into').fill(`nothing like this ${stamp}`)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    await expect(page.getByText('No organisation of this kind matches.')).toBeVisible()
  } finally {
    psql(`delete from public.organisations where slug like 'qc1a-filler-${stamp}-%' or id in ('${dup}', '${keep}', '${archived}', '${other}')`)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// F14: the audit-log CSV period; F4: Addis "today"
// ---------------------------------------------------------------------------------------------------------------
test('F14: the audit-log CSV covers the last 90 Addis days by default, or the period chosen', async ({ page }) => {
  psql(`insert into public.audit_log (actor, action, entity_type, entity_label, created_at) values ('e2e-qc1a', 'e2e.qc1a', 'test', 'QC1a old ${stamp}', now() - interval '100 days'), ('e2e-qc1a', 'e2e.qc1a', 'test', 'QC1a new ${stamp}', now())`)
  try {
    await adminSession(page)
    await page.goto('/roodber8/audit')
    await expect(page.getByText('Addis Ababa dates. Empty: the last 90 days.')).toBeVisible()
    const csv = async (q: string) => (await page.request.get(`/roodber8/export/audit${q}`)).text()
    const dflt = await csv('')
    expect(dflt).toContain(`QC1a new ${stamp}`)
    expect(dflt).not.toContain(`QC1a old ${stamp}`)
    const from = addisDay(new Date(Date.now() - 120 * 86_400_000))
    const all = await csv(`?from=${from}&to=${today}`)
    expect(all).toContain(`QC1a old ${stamp}`)
    expect(all).toContain(`QC1a new ${stamp}`)
    const res = await page.request.get(`/roodber8/export/audit?from=${today}&to=${from}`)
    expect(res.status()).toBe(400)
    expect(await res.text()).toBe('Choose a To date on or after the From date.')
  } finally {
    psql(`delete from public.audit_log where actor = 'e2e-qc1a'`)
  }
})

test('F4: "Enquiries today" on the dashboard counts the Addis Ababa day', async ({ page }) => {
  // One enquiry just after midnight in Addis Ababa (the evening before in UTC), one just before.
  const start = new Date(`${today}T00:00:00+03:00`)
  psql(`insert into public.enquiries (target_type, name, phone, message, created_at) values ('general', 'QC1a after midnight ${stamp}', '+251911000001', 'QC1a', '${new Date(start.getTime() + 60_000).toISOString()}'), ('general', 'QC1a before midnight ${stamp}', '+251911000002', 'QC1a', '${new Date(start.getTime() - 60_000).toISOString()}')`)
  try {
    const truth = Number(psql(`select count(*) from public.enquiries where created_at >= '${start.toISOString()}'`))
    await adminSession(page)
    await page.goto('/roodber8')
    const tile = page.locator('a', { hasText: 'Enquiries today' }).first()
    await expect(tile).toContainText(String(truth))
  } finally {
    psql(`delete from public.enquiries where name like 'QC1a % midnight ${stamp}'`)
  }
})

// ---------------------------------------------------------------------------------------------------------------
// F9: admin skip link and axe on the QC-0 pages
// ---------------------------------------------------------------------------------------------------------------
let showcase: Showcase
test('F9: the admin has a "Skip to content" link and a named logo link; axe finds no serious or critical problem on the QC-0 pages', async ({ browser }) => {
  test.setTimeout(300_000)
  showcase = await seedShowcase()
  try {
    for (const width of [375, 1280]) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } })
      const page = await ctx.newPage()
      const paths = ['/', '/supplies', `/supplies/product/${showcase.productSlug}`, '/jobs', `/company/${showcase.orgSlug}`, '/request-service/plumbers', '/about', '/help', '/roodber8-login']
      await adminSession(page)
      const all: string[] = []
      for (const path of [...paths, '/roodber8', '/roodber8/supply/order-requests']) {
        await page.goto(path)
        await page.waitForLoadState('load')
        await page.waitForTimeout(300)
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        all.push(...r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${width} ${path} → ${v.id}`))
      }
      expect(all).toEqual([])
      await page.goto('/roodber8')
      await page.keyboard.press('Tab')
      const skip = page.getByRole('link', { name: 'Skip to content' })
      await expect(skip).toBeFocused()
      await expect(skip).toBeVisible()
      await expect(skip).toHaveAttribute('href', '#main')
      await expect(page.getByRole('link', { name: 'HagerLand admin' })).toHaveCount(1)
      await ctx.close()
    }
  } finally {
    await showcase.cleanup()
  }
})
