import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { adminSession, assertLocalStack, createProvider, db, randomPhone, uniqueEmail } from '../helpers'

/**
 * Fix F-1 ("read everything"): with the local copy capped like live (PGRST_DB_MAX_ROWS=1000), every report, CSV,
 * sitemap, compliance list and digest count that needs a complete list still sees every row. Each journey seeds more
 * than 1,000 rows (local copy only) and compares the page or CSV with the true figure worked out directly in SQL.
 * Seeds are left in place (the supply ledger is append-only): run this after the other specs, or on a fresh copy.
 */

test.describe.configure({ mode: 'serial' })
assertLocalStack()

const stamp = Date.now()
const DAY = 86_400_000
const N = 1250
/** SQL on the LOCAL copy only (assertLocalStack above refuses anything else). */
function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
const count = (sql: string) => Number(psql(sql))
const addisToday = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10)
const month = () => addisToday().slice(0, 7)
const cents = (n: number) => (n / 100).toFixed(2)

/** Records in a CSV body (quoted fields may hold commas and line breaks). */
function csvRecords(body: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && body[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}
async function csv(page: Page, path: string): Promise<{ header: string[]; rows: string[][] }> {
  const res = await page.request.get(path)
  expect(res.status(), path).toBe(200)
  const [header, ...rows] = csvRecords(await res.text())
  return { header, rows }
}
const col = (c: { header: string[]; rows: string[][] }, row: string[], name: string) => row[c.header.indexOf(name)]

let employerOrg = ''
let supplier = ''

test.beforeAll(async () => {
  employerOrg = (await createProvider({ name: `E2E F1 Employer ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })).orgId
  supplier = psql(`select id from public.organisations where kind = 'hagerland' and name ilike '%supply%' limit 1`)
  expect(supplier).toMatch(/^[0-9a-f-]{36}$/)
})

test('the local copy is capped like live: a plain read of more than 1,000 rows returns 1,000', async () => {
  psql(`insert into public.interest_registrations (vertical_key, name, email, created_at) select 'finance', 'E2E F1 Interest ' || g, 'f1-' || g || '-${stamp}@test.hagerland.invalid', now() - (g || ' minutes')::interval from generate_series(1, ${N}) g`)
  const { data } = await db().from('interest_registrations').select('id').like('email', `%-${stamp}@test.hagerland.invalid`).limit(50_000)
  expect(data).toHaveLength(1000)
  expect(count(`select count(*) from public.interest_registrations where email like '%-${stamp}@test.hagerland.invalid'`)).toBe(N)
})

test('J1: recruitment fee report (owner): totals and reconciliation with 1,250 fee entries', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const d = db()
  const { data: cat } = await d.from('service_categories').select('id').eq('slug', 'staffing').single()
  const { data: req } = await d.from('service_requests').insert({ vertical_key: 'jobs', service_category_id: cat!.id, title: `E2E F1 staffing ${stamp}`, details: 'Masons.', name: 'E2E F1 Employer', phone: randomPhone(), email: uniqueEmail('f1-req') }).select('id').single()
  const { data: a } = await d.from('recruitment_assignments').insert({ service_request_id: req!.id, employer_org_id: employerOrg, created_by: 'e2e' }).select('id').single()
  const now = new Date().toISOString()
  const { data: c } = await d.from('recruitment_candidates').insert({ assignment_id: a!.id, source: 'manual', name: `E2E F1 Worker ${stamp}`, phone: randomPhone(), trade: 'mason', created_by: 'e2e', status: 'hired', consent_at: now, consent_method: 'phone_call', consent_recorded_by: 'e2e', share_phone: true, adult_confirmed_at: now, adult_confirmed_method: 'phone_call', adult_confirmed_by: 'e2e', introduced_at: now, introduced_by: 'e2e' }).select('id').single()
  const startDate = new Date(Date.now() - 45 * DAY).toISOString().slice(0, 10)
  const { data: p } = await d.from('recruitment_placements').insert({ candidate_id: c!.id, assignment_id: a!.id, role_type: 'trade', trade: 'mason', start_date: startDate, guarantee_days: 30, created_by: 'e2e' }).select('id').single()
  const { data: t } = await d.from('recruitment_fee_terms').insert({ placement_id: p!.id, fee_type: 'fixed', currency: 'ETB', amount_minor: 200_000, agreed_in_writing_on: startDate, status: 'agreed', created_by: 'e2e' }).select('id').single()
  const day = addisToday()
  psql(`insert into public.recruitment_fee_entries (fee_terms_id, entry_type, amount_minor, currency, occurred_on, created_by) values ('${t!.id}', 'fee_due', 200000, 'ETB', '${day}', 'e2e-f1')`)
  psql(`insert into public.recruitment_fee_entries (fee_terms_id, entry_type, amount_minor, currency, occurred_on, method, created_by) select '${t!.id}', 'fee_received', 100, 'ETB', '${day}', 'bank_transfer', 'e2e-f1' from generate_series(1, ${N})`)
  expect(count(`select count(*) from public.recruitment_fee_entries`)).toBeGreaterThan(1000)
  // The true totals, worked out in SQL exactly as the report defines them (a reversal takes its original's kind).
  const truth = (kind: string) =>
    count(`select coalesce(sum(case when e.entry_type = '${kind}' then e.amount_minor when e.entry_type = 'reversal' and o.entry_type = '${kind}' then -e.amount_minor else 0 end), 0) from public.recruitment_fee_entries e left join public.recruitment_fee_entries o on o.id = e.reverses_entry_id where e.currency = 'ETB' and e.occurred_on <= '${day}'`)
  await adminSession(page)
  const toDate = await csv(page, `/roodber8/reports/jobs/export?month=${month()}&table=fees-to-date`)
  const etb = toDate.rows.find((r) => col(toDate, r, 'currency') === 'ETB')!
  expect(col(toDate, etb, 'fee_due')).toBe(cents(truth('fee_due')))
  expect(col(toDate, etb, 'received')).toBe(cents(truth('fee_received')))
  expect(col(toDate, etb, 'waived')).toBe(cents(truth('waived')))
  await page.goto(`/roodber8/reports/jobs?month=${month()}`)
  await expect(page.getByText('Reconciles with fee ledger: yes (all 5 checks passed)')).toBeVisible()
})

test('J2 + J4: supply ledger and supply report (owner) with 1,250 ledger entries; the ledger CSV has every row', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const day = addisToday()
  psql(`insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on, org_id, method, reference, created_by) select 'service_fee', 'in', 100, '${day}', '${supplier}', 'cash', 'E2E F1 ' || g, 'e2e-f1' from generate_series(1, ${N}) g`)
  const all = count(`select count(*) from public.supply_ledger_entries`)
  expect(all).toBeGreaterThan(1000)
  const start = `${month()}-01`
  const inMonth = `e.occurred_on >= '${start}' and e.occurred_on < ('${start}'::date + interval '1 month')::date`
  // Money in minus out for the month, leaving out reversals whose original is in another month (as the report does).
  const net = count(`select coalesce(sum(case e.direction when 'in' then e.amount_cents when 'out' then -e.amount_cents else 0 end), 0) from public.supply_ledger_entries e where ${inMonth} and not (e.entry_type = 'reversal' and not exists (select 1 from public.supply_ledger_entries o where o.id = e.reverses_entry_id and o.occurred_on >= '${start}' and o.occurred_on < ('${start}'::date + interval '1 month')::date))`)
  const fees = count(`select coalesce(sum(case when e.entry_type = 'service_fee' then e.amount_cents when e.entry_type = 'reversal' and o.entry_type = 'service_fee' then -e.amount_cents else 0 end), 0) from public.supply_ledger_entries e left join public.supply_ledger_entries o on o.id = e.reverses_entry_id and o.occurred_on >= '${start}' and o.occurred_on < ('${start}'::date + interval '1 month')::date where ${inMonth}`)
  await adminSession(page)
  const money = await csv(page, `/roodber8/reports/supply/export?month=${month()}&table=money`)
  expect(col(money, money.rows[0], 'service_fees_etb')).toBe(cents(fees))
  expect(col(money, money.rows[0], 'reconciles_with_ledger')).toBe('yes')
  await page.goto(`/roodber8/reports/supply?month=${month()}`)
  const exact = (c: number) => `ETB ${Math.floor(Math.abs(c) / 100).toLocaleString('en-US')}.${String(Math.abs(c) % 100).padStart(2, '0')}`
  await expect(page.getByText(`money in minus out ${net < 0 ? '-' : ''}${exact(net)}`)).toBeVisible()
  await expect(page.getByText(/Reconciles with ledger: yes/)).toBeVisible()
  // J4: the ledger CSV lists every entry (it was 5,000 at most, and 1,000 on live).
  expect((await csv(page, '/roodber8/supply/ledger/export')).rows).toHaveLength(all)
})

test('J3: Jobs insights and Supplies insights count more than 1,000 rows correctly', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const job = psql(`insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, status, published_at, expires_at) values ('e2e-f1-job-${stamp}', '${employerOrg}', 'E2E F1 Tilers', 'construction', 'full_time', 'Tiling work in Bole for an experienced team.', 'published', now(), now() + interval '20 days') returning id`).split('\n')[0]
  psql(`insert into public.job_applications (job_id, channel, name, phone, trade, area_text, preferred_contact, language, adult_confirmed_at, consent_at) select '${job}', 'phone', 'E2E F1 Applicant ' || g, '+2519' || lpad(g::text, 8, '0'), 'tiler', 'Bole', 'call', 'am', now(), now() from generate_series(1, 1100) g`)
  // Supply quotes from customers: 1,100 open requests.
  psql(`insert into public.quote_requests (name, phone, status, source) select 'E2E F1 Customer ' || g, '+2519' || lpad((g + 50000000)::text, 8, '0'), 'submitted', 'materials_list' from generate_series(1, 1100) g`)
  await adminSession(page)
  const apps = await csv(page, '/roodber8/demand/jobs/export?days=1825&table=applications')
  const total = apps.rows.find((r) => col(apps, r, 'group') === 'All' && col(apps, r, 'item') === 'Applications')!
  expect(Number(col(apps, total, 'count'))).toBe(count(`select count(*) from public.job_applications where created_at > now() - interval '1800 days'`))
  expect(Number(col(apps, total, 'count'))).toBeGreaterThan(1000)
  // Supplies demand: "From request to delivery (N quotes)" for 90 days, cancelled left out (the page's default).
  const since = `${new Date(Date.now() + 3 * 3_600_000 - 90 * DAY).toISOString().slice(0, 10)}T00:00:00+03:00`
  const quotes = count(`select count(*) from public.quote_requests where created_at >= '${since}' and status <> 'cancelled'`)
  expect(quotes).toBeGreaterThan(1000)
  await page.goto('/roodber8/demand/supplies')
  await expect(page.getByText(`From request to delivery (${quotes} quotes)`)).toBeVisible({ timeout: 60_000 })
})

test('J4: CSV exports list every row (more than 1,000)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  await adminSession(page)
  for (const [path, table] of [
    ['/roodber8/export/interest', 'interest_registrations'],
    ['/roodber8/export/quotes', 'quote_requests'],
  ] as const) {
    const truth = count(`select count(*) from public.${table}`)
    expect(truth, table).toBeGreaterThan(1000)
    expect((await csv(page, path)).rows, path).toHaveLength(truth)
  }
  // The audit-log export writes its own audit row after reading, so the count is taken just before.
  psql(`insert into public.audit_log (actor, action, entity_type, entity_label) select 'e2e-f1', 'e2e.f1_seed', 'test', 'E2E F1 ' || g from generate_series(1, ${N}) g`)
  const audit = count('select count(*) from public.audit_log')
  expect(audit).toBeGreaterThan(1000)
  expect((await csv(page, '/roodber8/export/audit')).rows).toHaveLength(audit)
})

test('J5: the products sitemap lists every published product (more than 1,000)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(180_000)
  const category = psql(`select id from public.product_categories where parent_id is not null and is_active order by sort limit 1`)
  psql(`insert into public.products (name, slug, category_id, seller_org_id, unit, price_type, price_etb_cents, stock_status, status) select 'E2E F1 Block ' || g, 'e2e-f1-block-${stamp}-' || g, '${category}', '${supplier}', 'piece', 'fixed', 1000 + g, 'in_stock', 'published' from generate_series(1, 1100) g`)
  const truth = count(`select count(*) from public.products_public where slug is not null`)
  expect(truth).toBeGreaterThan(1000)
  // Sitemaps are cached; saving a product through the admin (as any edit does) refreshes them.
  const one = psql(`select id from public.products where slug = 'e2e-f1-block-${stamp}-1'`)
  await adminSession(page)
  await page.goto(`/roodber8/products/${one}`)
  await page.getByRole('button', { name: 'Save product' }).click()
  await expect(page.getByText(/saved/i).first()).toBeVisible()
  await expect.poll(async () => ((await (await page.request.get('/sitemap/products.xml')).text()).match(/<loc>/g) ?? []).length, { timeout: 60_000 }).toBe(truth)
})

test('J6: Imports compliance with more than 1,000 imported businesses: complete, no gateway error', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  psql(`insert into public.organisations (kind, name, slug, status, source, google_place_id, created_at) select 'supplier', 'E2E F1 Import ' || g, 'e2e-f1-import-${stamp}-' || g, 'draft', 'import', 'f1-place-${stamp}-' || g, now() - interval '2 days' from generate_series(1, 1100) g`)
  const truth = count(`select count(*) from public.organisations o where o.source = 'import' or exists (select 1 from public.org_field_sources f where f.org_id = o.id and f.is_current)`)
  expect(truth).toBeGreaterThan(1000)
  await adminSession(page)
  const res = await page.goto('/roodber8/imports/compliance')
  expect(res?.status()).toBe(200)
  expect((await csv(page, '/roodber8/imports/compliance/export')).rows).toHaveLength(truth)
})

test('J7: digest counts that read rows are right with more than 1,000 rows', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run')
  test.setTimeout(300_000)
  const truth = count(`select count(*) from public.quote_requests q where q.status in ('submitted', 'in_review') and not exists (select 1 from public.supply_quote_lines l where l.quote_request_id = q.id)`)
  expect(truth).toBeGreaterThan(1000)
  const to = process.env.ADMIN_DIGEST_EMAIL ?? ''
  const ids = async () => ((await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${to}" subject:"daily digest"`)}`)).json()) as { messages: { ID: string }[] }).messages.map((m) => m.ID)
  const seen = new Set(await ids())
  await page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, timeout: 280_000 })
  let text = ''
  for (let i = 0; i < 40 && !text; i++) {
    const fresh = (await ids()).find((id) => !seen.has(id))
    if (fresh) text = ((await (await fetch(`http://localhost:8025/api/v1/message/${fresh}`)).json()) as { Text: string }).Text
    else await new Promise((r) => setTimeout(r, 500))
  }
  expect(text).toContain(`Supplies: quotes with no supplier asked yet: ${truth}`)
  expect(text).toContain(`Quotes waiting for a price: ${count(`select count(*) from public.quote_requests where status in ('submitted', 'in_review')`)}`)
})

test('J9: a database error shows an error, never part of a total', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  psql('revoke select on public.recruitment_fee_entries from service_role')
  try {
    const res = await page.request.get(`/roodber8/reports/jobs/export?month=${month()}&table=fees-to-date`)
    expect(res.status()).toBe(500)
    await page.goto(`/roodber8/reports/jobs?month=${month()}`)
    await expect(page.getByText('Reconciles with fee ledger')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /Something went wrong|This page didn.t load/ })).toBeVisible()
  } finally {
    psql('grant select on public.recruitment_fee_entries to service_role')
  }
})
