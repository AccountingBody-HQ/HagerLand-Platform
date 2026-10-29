import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, allMail, assertLocalStack, createProvider, createUser, db, signIn, submitStaffSignIn, uniqueEmail } from './helpers'

/**
 * F-5 keeping periods (decision D3), local copy and local mail catcher only. Seeds an old (due) and a not-due record of
 * every kind, with real files in storage and real money records, and moves their dates back 25 months in the local
 * database. Dry run counts and changes nothing; Live clears exactly the personal details and files; a second run
 * changes nothing; one failing row does not stop the others; every money figure, report and CSV is identical before
 * and after. The switch is put back to Dry run in `finally`. Runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width'))

const stamp = Date.now()
const BUCKET = 'private-docs'
const OLD = "now() - interval '25 months'"

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
/** Moves dates back without firing the "updated_at" triggers or the order rules (local test data only). */
function backdate(statements: string[]) {
  psql(`begin; set local session_replication_role = replica; ${statements.join('; ')}; commit;`)
}
async function upload(path: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, Buffer.from('%PDF-1.4 F-5 test'), { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
  return path
}
async function fileExists(path: string): Promise<boolean> {
  const { data, error } = await db().storage.from(BUCKET).download(path)
  return !error && Boolean(data)
}
async function cron(request: APIRequestContext) {
  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, timeout: 280_000 })
  expect(res.status()).toBe(200)
  return res.json() as Promise<{ housekeeping: { errorsDeleted: number; invitationsDeleted: number; invitationsCleared: number } | null; failedSteps: string[] }>
}
async function setMode(page: Page, mode: 'dry_run' | 'live') {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  await page.locator('#jc-mode').selectOption(mode)
  if (mode === 'live' && (await page.locator('#jc-read').count())) await page.locator('#jc-read').check()
  const save = page.getByRole('button', { name: 'Save mode' })
  if (await save.isEnabled()) {
    await save.click()
    await expect(page.getByText(mode === 'live' ? 'Live: the next daily run deletes the personal details listed above, each after its own period.' : 'Dry run: the daily run only counts.')).toBeVisible()
  }
}
async function latestRun() {
  const { data } = await db().from('job_data_cleanup_runs').select('mode, counts, failures').order('started_at', { ascending: false }).limit(1).single()
  return data as { mode: string; counts: { due: Record<string, number>; cleared: Record<string, number>; failed: Record<string, number> }; failures: { kind: string; id: string }[] }
}

// ----------------------------------------------------------------------------------------------------------------
// Seed
// ----------------------------------------------------------------------------------------------------------------
type Seed = Awaited<ReturnType<typeof seed>>
let s: Seed

async function seed() {
  const d = db()
  const name = (what: string) => `F5 ${what} ${stamp}`
  const user = await createUser({ name: 'F5 Person' })
  const other = await createUser({ name: 'F5 Approved Trader' })
  const provider = await createProvider({ name: `E2E F5 Plumbing ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const { data: bole } = await d.from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const ins = async <T extends Record<string, unknown>>(table: string, row: T) => {
    const { data, error } = await d.from(table as 'enquiries').insert(row as never).select('id').single()
    if (error || !data) throw new Error(`${table}: ${error?.message}`)
    return (data as { id: string }).id
  }

  // Enquiries: one old, one recent, one old that a deal points at.
  const enqOld = await ins('enquiries', { target_type: 'general', name: name('Old Enquirer'), phone: '+251911500001', email: uniqueEmail('f5-enq'), message: 'Old message about a flat in Bole', ip_hash: 'f5-ip' })
  const enqNew = await ins('enquiries', { target_type: 'general', name: name('New Enquirer'), phone: '+251911500002', message: 'Recent message' })
  const enqDeal = await ins('enquiries', { target_type: 'general', name: name('Deal Enquirer'), phone: '+251911500003', message: 'Old message with a deal' })
  const dealEnq = await ins('deals', { source_type: 'enquiry', source_id: enqDeal, title: 'F5 enquiry deal', currency: 'ETB', value_minor: 5_000_000, commission_minor: 150_000, status: 'won' })

  // Service requests: one closed with a won and a lost quote, files, a deal and fees; one still open.
  const upl = crypto.randomUUID()
  const srAttach = await upload(`docs/request/${upl}/photo.pdf`)
  const sr = await ins('service_requests', { vertical_key: 'contractors', title: name('Leaking pipe'), details: 'Old details with a house number', name: name('Old Requester'), phone: '+251911500010', email: uniqueEmail('f5-sr'), status: 'won', closed_reason: 'completed', closed_at: new Date().toISOString(), attachment_paths: [srAttach], location_id: bole!.id, location_text: 'Bole', answers: { floors: 2 }, ip_hash: 'f5-ip' })
  const docWon = await upload(`docs/match/${crypto.randomUUID()}/quote.pdf`)
  const docLost = await upload(`docs/match/${crypto.randomUUID()}/quote.pdf`)
  const otherProvider = await createProvider({ name: `E2E F5 Other Plumbing ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const matchWon = await ins('service_request_matches', { request_id: sr, org_id: provider.orgId, status: 'won', quote_amount_minor: 2_500_000, quote_currency: 'ETB', quote_message: 'Hello F5 Old Requester, we can come Tuesday', quote_document_path: docWon, lead_fee_minor: 50_000, commission_minor: 125_000, invoiced: true })
  const matchLost = await ins('service_request_matches', { request_id: sr, org_id: otherProvider.orgId, status: 'lost', quote_amount_minor: 3_000_000, quote_currency: 'ETB', quote_message: 'Our quote', quote_document_path: docLost })
  const dealSr = await ins('deals', { source_type: 'service_request', source_id: sr, match_id: matchWon, org_id: provider.orgId, title: 'F5 request deal', currency: 'ETB', value_minor: 2_500_000, lead_fee_minor: 50_000, commission_minor: 125_000, status: 'won', closed_at: new Date().toISOString() })
  const srOpen = await ins('service_requests', { vertical_key: 'contractors', title: name('Still open'), name: name('Open Requester'), phone: '+251911500011', status: 'matched' })

  // Quote requests: one with a completed order and ledger entries; one with an open order; one with no order.
  const supplier = await d.from('organisations').insert({ kind: 'supplier', name: name('Supplier'), slug: `f5-supplier-${stamp}`, status: 'draft', source: 'admin' }).select('id').single()
  const orgS = supplier.data!.id
  await d.from('supply_partners').insert({ org_id: orgS, relationship_status: 'active' })
  const quoteWithOrder = async (label: string) => {
    const materials = await upload(`docs/materials/${crypto.randomUUID()}/list.pdf`)
    const quoteDoc = await upload(`docs/quote/${crypto.randomUUID()}/quote.pdf`)
    const q = await ins('quote_requests', { name: name(label), phone: '+251911500020', email: uniqueEmail('f5-quote'), delivery_location_id: bole!.id, delivery_address: 'House 12, near the school', source: 'materials_list', status: 'accepted', materials_file_paths: [materials], quote_document_path: quoteDoc, notes: 'Call me after 5', internal_notes: 'Customer is a friend of Abebe' })
    const item = await ins('quote_request_items', { quote_request_id: q, free_text_item: 'Cement', quantity: 10, unit: 'bag', added_by_admin: false, notes: 'Deliver to the back gate' })
    const line = await ins('supply_quote_lines', { quote_request_id: q, quote_item_id: item, org_id: orgS, status: 'chosen', unit: 'bag', unit_price_cents: 100000, quantity: 10, delivery_charge_cents: 20000, chosen_at: new Date().toISOString() })
    const { data: created, error } = await d.rpc('supply_create_order', { p_quote: q, p_org: orgS, p_model: 'A', p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: null as unknown as number, p_supplier_delivery_cents: 20000, p_actor: 'test', p_lines: [{ supply_quote_line_id: line, quote_item_id: item, item_name: 'Cement', quantity: 10, unit: 'bag', supplier_unit_price_cents: 100000, vat_flag: 'yes' }] }).single()
    if (error) throw new Error(`order: ${error.message}`)
    return { q, item, materials, quoteDoc, order: (created as { id: string }).id }
  }
  const qDone = await quoteWithOrder('Done Customer')
  const step = async (status: string, extra: Record<string, unknown> = {}) => {
    const { error } = await d.from('supply_orders').update({ status, ...extra }).eq('id', qDone.order)
    if (error) throw new Error(`step ${status}: ${error.message}`)
  }
  await d.from('supply_order_lines').update({ customer_unit_price_cents: 110000 }).eq('order_id', qDone.order)
  await step('awaiting_payment', { customer_delivery_charge_cents: 25000 })
  const pay = await d.from('supply_ledger_entries').insert({ entry_type: 'customer_payment', direction: 'in', amount_cents: 1_125_000, occurred_on: new Date().toISOString().slice(0, 10), order_id: qDone.order })
  if (pay.error) throw new Error(`pay: ${pay.error.message}`)
  for (const st of ['paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered']) await step(st)
  const proof = await d.from('supply_delivery_proofs').insert({ order_id: qDone.order, file_path: `supply/orders/${qDone.order}/proof.pdf`, file_size_bytes: 10, file_type: 'application/pdf', received_by_name: 'Site keeper' })
  if (proof.error) throw new Error(`proof: ${proof.error.message}`)
  await step('completed')
  const qOpen = await quoteWithOrder('Open Order Customer')
  await d.from('supply_orders').update({ status: 'awaiting_payment' }).eq('id', qOpen.order)
  const qNoOrderMaterials = await upload(`docs/materials/${crypto.randomUUID()}/list.pdf`)
  const qNoOrderDoc = await upload(`docs/quote/${crypto.randomUUID()}/quote.pdf`)
  const qNoOrder = await ins('quote_requests', { name: name('No Order Customer'), phone: '+251911500021', source: 'materials_list', status: 'expired', materials_file_paths: [qNoOrderMaterials], quote_document_path: qNoOrderDoc })

  // Property Care: an old enquiry; one whose property is still managed; an ended managed property with money and files.
  const careOld = await ins('property_care_requests', { name: name('Care Old'), email: uniqueEmail('f5-care'), phone: '+447700900111', property_type: 'house', occupancy: 'family', country_code: 'GB', message: 'Please look after my mother’s house' })
  const careHeld = await ins('property_care_requests', { name: name('Care Held'), email: uniqueEmail('f5-care'), phone: '+447700900112', property_type: 'house', occupancy: 'vacant', country_code: 'GB' })
  const mpActive = await ins('managed_properties', { care_request_id: careHeld, owner_name: name('Active Owner'), owner_email: uniqueEmail('f5-owner'), title: name('Active flat'), status: 'active' })
  const mpEnded = await ins('managed_properties', { owner_name: name('Ended Owner'), owner_email: uniqueEmail('f5-owner'), owner_phone: '+447700900113', address_line: 'House 7, Bole', title: name('Ended flat'), status: 'active', monthly_fee_minor: 300_000, notes: 'Key with the neighbour' })
  const photo = await upload(`docs/inspection/${mpEnded}/photo.pdf`)
  const document = await upload(`docs/agency/${crypto.randomUUID()}/lease.pdf`)
  await ins('property_inspections', { managed_property_id: mpEnded, inspected_on: '2026-01-10', condition: 'good', notes: 'Owner’s cousin lives here', photo_paths: [photo] })
  await ins('managed_property_documents', { managed_property_id: mpEnded, label: 'Lease', storage_path: document })
  await ins('owner_messages', { managed_property_id: mpEnded, sender: 'owner', sender_name: name('Ended Owner'), body: 'My phone is 0911 22 33 44' })
  const statement = await ins('rent_statements', { managed_property_id: mpEnded, period_start: '2026-01-01', period_end: '2026-01-31', currency: 'ETB', rent_due_minor: 2_000_000, rent_received_minor: 2_000_000, fees_minor: 200_000 })
  await d.from('managed_properties').update({ status: 'ended' }).eq('id', mpEnded)

  // Building projects, partner applications, claims, trade accounts: one due and one held of each.
  const bpOld = await ins('build_projects', { user_id: user.id, title: name('Villa'), name: name('Builder Person'), phone: '+251911500030', email: uniqueEmail('f5-bp'), services: ['design'], timeline: 'now', budget_band: 'not_sure', status: 'closed', location_id: bole!.id, location_text: 'Bole', details: 'Plot behind the church' })
  const bpOpen = await ins('build_projects', { user_id: user.id, title: name('Open villa'), name: name('Open Builder'), phone: '+251911500031', email: uniqueEmail('f5-bp'), services: ['design'], timeline: 'now', budget_band: 'not_sure', status: 'submitted' })
  const paOld = await ins('partner_applications', { vertical_key: 'finance', organisation_name: name('Bank'), contact_name: name('Partner Person'), email: uniqueEmail('f5-pa'), phone: '+251911500040', partner_type: 'bank', status: 'declined', message: 'Call me' })
  const paNew = await ins('partner_applications', { vertical_key: 'finance', organisation_name: name('Bank 2'), contact_name: name('New Partner'), email: uniqueEmail('f5-pa'), partner_type: 'bank', status: 'new' })
  const claimOrg = await d.from('organisations').insert({ kind: 'supplier', name: name('Claimed'), slug: `f5-claimed-${stamp}`, status: 'published', source: 'import', verification_level: 'listed' }).select('id').single()
  const evidence = await upload(`docs/claim/${claimOrg.data!.id}/licence.pdf`)
  const claimOld = await ins('claims', { org_id: claimOrg.data!.id, user_id: user.id, claimant_name: name('Claimant'), claimant_phone: '+251911500050', claimant_email: uniqueEmail('f5-claim'), relationship: 'owner', status: 'rejected', decided_at: new Date().toISOString(), evidence_paths: [evidence], message: 'I own it' })
  const claimPending = await ins('claims', { org_id: claimOrg.data!.id, user_id: other.id, claimant_name: name('Pending Claimant'), claimant_phone: '+251911500051', relationship: 'owner', status: 'pending' })
  const taOld = await ins('trade_accounts', { user_id: user.id, business_name: name('Trader'), trade_type: 'Contractor', phone: '+251911500060', tin: '0012345678', status: 'rejected', decided_at: new Date().toISOString(), notes: 'Big orders' })
  const taApproved = await ins('trade_accounts', { user_id: other.id, business_name: name('Approved Trader'), trade_type: 'Contractor', phone: '+251911500061', status: 'approved', decided_at: new Date().toISOString() })

  // Supply contacts: old, old do-not-contact, recent.
  const scOld = await ins('supply_contacts', { org_id: orgS, name: name('Old Contact'), phone: '0911 50 00 70', phone_normalised: '+251911500070', email: uniqueEmail('f5-sc') })
  const scDnc = await ins('supply_contacts', { org_id: orgS, name: name('Do Not Contact'), role: 'Sales', phone: '0911 50 00 71', phone_normalised: '+251911500071', whatsapp: '+251911500071', email: uniqueEmail('f5-sc'), consent_note: 'Asked us to stop', do_not_contact: true })
  const scNew = await ins('supply_contacts', { org_id: orgS, name: name('Recent Contact'), phone: '0911 50 00 72', phone_normalised: '+251911500072', last_contacted_at: new Date().toISOString() })

  // Audit entries: an ordinary old one; an old money one (kept); a 7-year-old money one (deleted).
  const auOld = await ins('audit_log', { actor: 'staff:f5@test', action: 'enquiry.status', entity_type: 'enquiry', entity_id: enqOld, entity_label: name('Old Enquirer') })
  const auMoney = await ins('audit_log', { actor: 'staff:f5@test', action: 'deal.create', entity_type: 'deal', entity_id: dealSr, entity_label: 'F5 money' })
  const auAncient = await ins('audit_log', { actor: 'staff:f5@test', action: 'supply.ledger.entry', entity_type: 'supply_order', entity_id: qDone.order, entity_label: 'F5 ancient money' })

  // Always on: an old error record and an old unaccepted invitation; an invitation accepted 25 months ago.
  const errOld = await ins('errors', { route: `f5-${stamp}`, message: 'old failure' })
  const invOld = await ins('org_invitations', { org_id: provider.orgId, email: uniqueEmail('f5-inv').toLowerCase(), token_hash: `f5-${stamp}-a`, expires_at: new Date(Date.now() - 40 * 86_400_000).toISOString() })
  const invAccepted = await ins('org_invitations', { org_id: provider.orgId, email: uniqueEmail('f5-inv2').toLowerCase(), token_hash: `f5-${stamp}-b`, expires_at: new Date().toISOString() })

  backdate([
    `update public.enquiries set created_at = ${OLD}, updated_at = ${OLD} where id in ('${enqOld}', '${enqDeal}')`,
    `update public.service_requests set created_at = ${OLD}, updated_at = ${OLD}, closed_at = ${OLD} where id in ('${sr}', '${srOpen}')`,
    `update public.service_request_matches set updated_at = ${OLD} where request_id = '${sr}'`,
    `update public.quote_requests set created_at = ${OLD}, updated_at = ${OLD}, quoted_at = ${OLD} where id in ('${qDone.q}', '${qOpen.q}', '${qNoOrder}')`,
    `update public.supply_orders set updated_at = ${OLD} where id in ('${qDone.order}', '${qOpen.order}')`,
    `update public.property_care_requests set created_at = ${OLD}, updated_at = ${OLD} where id in ('${careOld}', '${careHeld}')`,
    `update public.managed_properties set ended_at = ${OLD}, updated_at = ${OLD} where id = '${mpEnded}'`,
    `update public.build_projects set created_at = ${OLD}, updated_at = ${OLD} where id in ('${bpOld}', '${bpOpen}')`,
    `update public.partner_applications set created_at = ${OLD}, updated_at = ${OLD} where id in ('${paOld}', '${paNew}')`,
    `update public.claims set created_at = ${OLD}, updated_at = ${OLD}, decided_at = ${OLD} where id in ('${claimOld}', '${claimPending}')`,
    `update public.trade_accounts set created_at = ${OLD}, updated_at = ${OLD}, decided_at = ${OLD} where id in ('${taOld}', '${taApproved}')`,
    `update public.supply_contacts set created_at = ${OLD}, last_contacted_at = ${OLD} where id in ('${scOld}', '${scDnc}')`,
    `update public.audit_log set created_at = ${OLD} where id in ('${auOld}', '${auMoney}')`,
    `update public.audit_log set created_at = now() - interval '7 years' where id = '${auAncient}'`,
    `update public.errors set first_seen_at = now() - interval '100 days', last_seen_at = now() - interval '100 days' where id = '${errOld}'`,
    `update public.org_invitations set accepted_at = ${OLD} where id = '${invAccepted}'`,
  ])
  return { user, other, provider, otherProvider, orgS, claimOrg: claimOrg.data!.id, enqOld, enqNew, enqDeal, dealEnq, sr, srAttach, docWon, docLost, matchWon, matchLost, dealSr, srOpen, qDone, qOpen, qNoOrder, qNoOrderMaterials, qNoOrderDoc, careOld, careHeld, mpActive, mpEnded, photo, document, statement, bpOld, bpOpen, paOld, paNew, claimOld, claimPending, evidence, taOld, taApproved, scOld, scDnc, scNew, auOld, auMoney, auAncient, errOld, invOld, invAccepted }
}

// ----------------------------------------------------------------------------------------------------------------
// Money: every figure that must not move (database figures, report pages, CSV exports)
// ----------------------------------------------------------------------------------------------------------------
const PAGES = ['/roodber8/reports/supply', '/roodber8/reports/jobs', '/roodber8/deals', '/roodber8/performance', '/roodber8/demand', '/roodber8/demand/supplies', '/roodber8/demand/jobs', '/roodber8/supply/ledger', '/roodber8/reports']
const FEE_TABLES = ['fees-month', 'fees-to-date', 'fee-ageing', 'fee-records', 'fee-reconciliation']
const CSVS = [
  '/roodber8/export/deals',
  '/roodber8/export/report-revenue',
  '/roodber8/export/performance',
  '/roodber8/export/demand',
  '/roodber8/export/agency-report',
  '/roodber8/export/report-quotes',
  '/roodber8/supply/ledger/export',
  ...['orders', 'money', 'ageing', 'items', 'areas', 'partners'].map((t) => `/roodber8/reports/supply/export?table=${t}`),
  ...FEE_TABLES.map((t) => `/roodber8/reports/jobs/export?table=${t}`),
  '/roodber8/demand/jobs/export?table=flow',
]
/** The figures on a page or file: every number, in order (names and contact details are not figures). */
const figures = (text: string) => (text.replace(/\b\d{1,2}:\d{2}\b/g, '').match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).join(' ')

async function moneySnapshot(page: Page) {
  const d = db()
  const sorted = async (table: string, select: string) => JSON.stringify((await d.from(table as 'deals').select(select).order('id')).data)
  const database = {
    deals: await sorted('deals', 'id, reference, source_type, source_id, match_id, org_id, title, currency, value_minor, commission_minor, lead_fee_minor, status, closed_at, notes, pillar_key'),
    ledger: await sorted('supply_ledger_entries', 'id, entry_type, direction, amount_cents, occurred_on, order_id, quote_request_id'),
    orders: await sorted('supply_orders', 'id, reference, status, quote_request_id, org_id, money_model, customer_delivery_charge_cents, supplier_delivery_charge_cents'),
    lines: await sorted('supply_order_lines', 'id, order_id, quantity, customer_unit_price_cents, supplier_unit_price_cents'),
    matches: await sorted('service_request_matches', 'id, request_id, org_id, status, quote_amount_minor, quote_currency, lead_fee_minor, commission_minor, invoiced'),
    statements: await sorted('rent_statements', 'id, managed_property_id, period_start, period_end, rent_due_minor, rent_received_minor, expenses_minor, fees_minor'),
    fees: await sorted('recruitment_fee_entries', 'id, amount_minor, occurred_on'),
  }
  await adminSession(page)
  const pages: Record<string, string> = {}
  for (const p of PAGES) {
    const res = await page.goto(p)
    expect(res?.status(), p).toBe(200)
    pages[p] = figures((await page.locator('main').innerText()) ?? '')
  }
  const csvs: Record<string, string> = {}
  for (const c of CSVS) {
    const res = await page.request.get(c)
    expect(res.status(), c).toBe(200)
    csvs[c] = figures(await res.text())
  }
  return { database, pages, csvs }
}
let moneyBefore: Awaited<ReturnType<typeof moneySnapshot>>

/** The seeded rows as they are (to prove Dry run and a second run change nothing). */
async function seededRows() {
  const d = db()
  const pick = async (table: string, ids: string[]) => JSON.stringify((await d.from(table as 'enquiries').select('*').in('id', ids).order('id')).data)
  return [
    await pick('enquiries', [s.enqOld, s.enqNew, s.enqDeal]),
    await pick('service_requests', [s.sr, s.srOpen]),
    await pick('service_request_matches', [s.matchWon, s.matchLost]),
    await pick('quote_requests', [s.qDone.q, s.qOpen.q, s.qNoOrder]),
    await pick('property_care_requests', [s.careOld, s.careHeld]),
    await pick('managed_properties', [s.mpActive, s.mpEnded]),
    await pick('build_projects', [s.bpOld, s.bpOpen]),
    await pick('partner_applications', [s.paOld, s.paNew]),
    await pick('claims', [s.claimOld, s.claimPending]),
    await pick('trade_accounts', [s.taOld, s.taApproved]),
    await pick('supply_contacts', [s.scOld, s.scDnc, s.scNew]),
    await pick('audit_log', [s.auOld, s.auMoney, s.auAncient]),
  ].join('\n')
}

/**
 * Rows left by an earlier run of this file that stopped half-way (local copy only): deleted where they can be; quote
 * requests tied to append-only orders are marked as already cleared so they do not count again.
 */
function tidyEarlierRuns() {
  psql(`delete from public.audit_log where actor = 'staff:f5@test';
    delete from public.errors where route like 'f5-%';
    delete from public.org_invitations where token_hash like 'f5-%' or token_hash like 'removed:%' and email = '';
    delete from public.supply_contacts where name like 'F5 % Contact %' or name like 'F5 Do Not Contact %' or (name = 'Removed' and org_id in (select id from public.organisations where name like 'F5 Supplier %'));
    delete from public.deals where title in ('F5 enquiry deal', 'F5 request deal');
    delete from public.enquiries where name like 'F5 % Enquirer %' or (name = 'Removed' and message = '(removed)' and target_type = 'general');
    delete from public.service_requests where title like 'F5 %';
    delete from public.managed_properties where title like 'F5 %';
    delete from public.property_care_requests where name like 'F5 Care %' or (name = 'Removed' and country_code = 'GB');
    delete from public.build_projects where title like 'F5 %';
    delete from public.partner_applications where organisation_name like 'F5 Bank%';
    delete from public.claims where org_id in (select id from public.organisations where name like 'F5 Claimed %');
    delete from public.trade_accounts where business_name like 'F5 %';
    update public.quote_requests set personal_data_deleted_at = now() where personal_data_deleted_at is null and (name like 'F5 % Customer %' or quote_document_path like 'docs/quote/%' and name = 'Removed')`)
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000)
  tidyEarlierRuns()
  s = await seed()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setMode(page, 'dry_run')
  await page.close()
})

test('Dry run: counts every kind and changes nothing; the always-on housekeeping still runs; digest lines are counts only', async ({ page, request }) => {
  test.setTimeout(300_000)
  moneyBefore = await moneySnapshot(page)
  const rowsBefore = await seededRows()
  const mails = (await allMail(process.env.ADMIN_DIGEST_EMAIL ?? '')).length
  const r = await cron(request)
  expect(r.failedSteps).toEqual([])
  const run = await latestRun()
  expect(run.mode).toBe('dry_run')
  expect(run.counts.due).toMatchObject({ enquiries: 2, service_requests: 1, quote_requests: 2, property_care: 1, managed_properties: 1, build_projects: 1, partner_applications: 1, claims: 1, trade_accounts: 1, supply_contacts: 2, audit_log: 2 })
  expect(Object.values(run.counts.cleared).every((n) => n === 0)).toBe(true)
  expect(await seededRows()).toBe(rowsBefore)
  for (const f of [s.srAttach, s.docWon, s.docLost, s.qDone.materials, s.qDone.quoteDoc, s.qNoOrderMaterials, s.qNoOrderDoc, s.photo, s.document, s.evidence]) expect(await fileExists(f), f).toBe(true)
  // Always on (D4): the old error record and the expired invitation went; the accepted invitation lost its email.
  expect(r.housekeeping).toMatchObject({ errorsDeleted: 1, invitationsDeleted: 1, invitationsCleared: 1 })
  expect((await db().from('errors').select('id').eq('id', s.errOld)).data).toEqual([])
  expect((await db().from('org_invitations').select('id').eq('id', s.invOld)).data).toEqual([])
  expect((await db().from('org_invitations').select('email, token_hash').eq('id', s.invAccepted).single()).data).toEqual({ email: '', token_hash: `removed:${s.invAccepted}` })
  // The digest: dry-run lines above 0 only, counts and kinds, never a name or contact.
  await expect.poll(async () => (await allMail(process.env.ADMIN_DIGEST_EMAIL ?? '')).length, { timeout: 30_000 }).toBeGreaterThan(mails)
  const digest = (await allMail(process.env.ADMIN_DIGEST_EMAIL ?? ''))[0].text
  expect(digest).toContain('Data clean-up (dry run): 2 enquiries whose personal details would be deleted')
  expect(digest).toContain('Data clean-up (dry run): 2 supply contacts whose personal details would be deleted')
  expect(digest).toContain('Data clean-up: personal details deleted from 1 old error records (always on)')
  expect(digest).not.toMatch(/whose personal details would be deleted\s*0/)
  expect(digest).not.toContain(`${stamp}`)
  expect(digest).not.toMatch(/\+251911500/)
})

test('Live: exactly the personal details and files go; what stays stays; held records are untouched; every money figure is identical; a second run changes nothing', async ({ page, request }) => {
  test.setTimeout(600_000)
  const d = db()
  // One failing row (a local-only trigger refuses the old enquiry) must not stop the others.
  psql(`create function public.e2e_f5_refuse() returns trigger language plpgsql as $$ begin raise exception 'e2e: refused'; end $$;
    create trigger e2e_f5_refuse before update on public.enquiries for each row when (old.id = '${s.enqOld}') execute function public.e2e_f5_refuse();`)
  try {
    await setMode(page, 'live')
    expect((await cron(request)).failedSteps).toEqual([])
  } finally {
    psql('drop trigger if exists e2e_f5_refuse on public.enquiries; drop function if exists public.e2e_f5_refuse();')
    await setMode(page, 'dry_run')
  }
  const run = await latestRun()
  expect(run.mode).toBe('live')
  expect(run.counts.cleared).toMatchObject({ enquiries: 1, service_requests: 1, quote_requests: 2, property_care: 1, managed_properties: 1, build_projects: 1, partner_applications: 1, claims: 1, trade_accounts: 1, supply_contacts: 2, audit_log: 2 })
  expect(run.counts.failed.enquiries).toBe(1)
  expect(run.failures).toContainEqual({ kind: 'enquiries', id: s.enqOld })
  // The run log holds ids and counts only.
  expect(JSON.stringify(run)).not.toContain(`${stamp}`)

  const one = async (table: string, id: string, select = '*') => (await d.from(table as 'enquiries').select(select).eq('id', id).single()).data as unknown as Record<string, unknown>
  // Enquiries: the deal-linked one cleared (its deal unchanged); the failing one untouched; the recent one untouched.
  expect(await one('enquiries', s.enqDeal)).toMatchObject({ name: 'Removed', phone: '', email: null, message: '(removed)', ip_hash: null, target_type: 'general' })
  expect((await one('enquiries', s.enqDeal)).personal_data_deleted_at).not.toBeNull()
  expect(await one('enquiries', s.enqOld)).toMatchObject({ name: `F5 Old Enquirer ${stamp}`, personal_data_deleted_at: null })
  expect(await one('enquiries', s.enqNew)).toMatchObject({ name: `F5 New Enquirer ${stamp}`, personal_data_deleted_at: null })
  // Service request: personal details and the attachment gone; area, answers and fees stay; won quote document kept.
  expect(await one('service_requests', s.sr)).toMatchObject({ name: 'Removed', phone: '', email: null, details: '', attachment_paths: [], location_text: 'Bole', answers: { floors: 2 }, status: 'won' })
  expect(await one('service_request_matches', s.matchWon)).toMatchObject({ quote_message: null, quote_document_path: s.docWon, lead_fee_minor: 50_000, commission_minor: 125_000, quote_amount_minor: 2_500_000, invoiced: true })
  expect(await one('service_request_matches', s.matchLost)).toMatchObject({ quote_message: null, quote_document_path: null, quote_amount_minor: 3_000_000 })
  expect(await fileExists(s.srAttach)).toBe(false)
  expect(await fileExists(s.docLost)).toBe(false)
  expect(await fileExists(s.docWon)).toBe(true)
  expect(await one('service_requests', s.srOpen)).toMatchObject({ name: `F5 Open Requester ${stamp}`, personal_data_deleted_at: null })
  // Quote requests: with a completed order → cleared, quote document kept; open order → untouched; no order → both files gone.
  expect(await one('quote_requests', s.qDone.q)).toMatchObject({ name: 'Removed', phone: '', email: null, delivery_address: null, notes: null, internal_notes: null, materials_file_paths: [], quote_document_path: s.qDone.quoteDoc, status: 'accepted' })
  expect(await one('quote_request_items', s.qDone.item, 'notes, quantity')).toEqual({ notes: null, quantity: 10 })
  expect(await fileExists(s.qDone.materials)).toBe(false)
  expect(await fileExists(s.qDone.quoteDoc)).toBe(true)
  expect(await one('quote_requests', s.qOpen.q)).toMatchObject({ name: `F5 Open Order Customer ${stamp}`, personal_data_deleted_at: null })
  expect(await fileExists(s.qOpen.materials)).toBe(true)
  expect(await one('quote_requests', s.qNoOrder)).toMatchObject({ name: 'Removed', quote_document_path: null, materials_file_paths: [] })
  expect(await fileExists(s.qNoOrderMaterials)).toBe(false)
  expect(await fileExists(s.qNoOrderDoc)).toBe(false)
  // Property Care and managed properties.
  expect(await one('property_care_requests', s.careOld)).toMatchObject({ name: 'Removed', phone: '', email: '', message: null })
  expect(await one('property_care_requests', s.careHeld)).toMatchObject({ name: `F5 Care Held ${stamp}`, personal_data_deleted_at: null })
  expect(await one('managed_properties', s.mpEnded)).toMatchObject({ owner_name: 'Removed', owner_email: null, owner_phone: null, address_line: null, notes: null, status: 'ended', monthly_fee_minor: 300_000 })
  expect(await one('managed_properties', s.mpActive)).toMatchObject({ owner_name: `F5 Active Owner ${stamp}`, personal_data_deleted_at: null })
  expect((await d.from('owner_messages').select('sender_name, body').eq('managed_property_id', s.mpEnded).single()).data).toEqual({ sender_name: 'Removed', body: '(removed)' })
  expect((await d.from('property_inspections').select('notes, photo_paths, condition').eq('managed_property_id', s.mpEnded).single()).data).toEqual({ notes: null, photo_paths: [], condition: 'good' })
  expect((await d.from('managed_property_documents').select('label, storage_path').eq('managed_property_id', s.mpEnded).single()).data).toEqual({ label: 'Lease', storage_path: '' })
  expect(await fileExists(s.photo)).toBe(false)
  expect(await fileExists(s.document)).toBe(false)
  expect(await one('rent_statements', s.statement, 'rent_due_minor, rent_received_minor, fees_minor')).toEqual({ rent_due_minor: 2_000_000, rent_received_minor: 2_000_000, fees_minor: 200_000 })
  // Building projects, partner applications, claims, trade accounts.
  expect(await one('build_projects', s.bpOld)).toMatchObject({ name: 'Removed', phone: '', email: '', details: null, location_text: 'Bole', status: 'closed' })
  expect(await one('build_projects', s.bpOpen)).toMatchObject({ personal_data_deleted_at: null })
  expect(await one('partner_applications', s.paOld)).toMatchObject({ contact_name: 'Removed', email: 'removed@removed.invalid', phone: null, message: null, organisation_name: `F5 Bank ${stamp}`, status: 'declined' })
  expect(await one('partner_applications', s.paNew)).toMatchObject({ personal_data_deleted_at: null })
  expect(await one('claims', s.claimOld)).toMatchObject({ claimant_name: 'Removed', claimant_phone: '', claimant_email: null, message: null, evidence_paths: [], status: 'rejected' })
  expect(await fileExists(s.evidence)).toBe(false)
  expect(await one('claims', s.claimPending)).toMatchObject({ personal_data_deleted_at: null })
  expect(await one('trade_accounts', s.taOld)).toMatchObject({ phone: '', tin: null, notes: null, business_name: `F5 Trader ${stamp}`, status: 'rejected' })
  expect(await one('trade_accounts', s.taApproved)).toMatchObject({ personal_data_deleted_at: null, phone: '+251911500061' })
  // Supply contacts: the old one deleted; the do-not-contact one kept with only its number and flag; the recent one kept.
  expect((await d.from('supply_contacts').select('id').eq('id', s.scOld)).data).toEqual([])
  expect(await one('supply_contacts', s.scDnc, 'name, role, phone_normalised, whatsapp, email, consent_note, do_not_contact, org_id')).toEqual({ name: 'Removed', role: 'Sales', phone_normalised: '+251911500071', whatsapp: null, email: null, consent_note: null, do_not_contact: true, org_id: s.orgS })
  expect((await one('supply_contacts', s.scNew)).name).toBe(`F5 Recent Contact ${stamp}`)
  // Audit log: the ordinary old entry and the 7-year-old money entry deleted; the 25-month-old money entry kept.
  expect((await d.from('audit_log').select('id').in('id', [s.auOld, s.auAncient])).data).toEqual([])
  expect((await d.from('audit_log').select('id').eq('id', s.auMoney)).data).toHaveLength(1)

  // Q3: every admin page that shows a cleared record still loads, showing "Removed" where a name was.
  await adminSession(page)
  for (const [path, shows] of [
    [`/roodber8/enquiries/${s.enqDeal}`, 'Removed'],
    [`/roodber8/service-requests/${s.sr}`, 'Removed'],
    [`/roodber8/quotes/${s.qDone.q}`, 'Removed'],
    [`/roodber8/property-care/${s.careOld}`, 'Removed'],
    [`/roodber8/managed-properties/${s.mpEnded}`, 'Removed'],
    [`/roodber8/projects/${s.bpOld}`, 'Removed'],
    ['/roodber8/partners', 'Removed'],
    ['/roodber8/trade-accounts', ''],
    [`/roodber8/organisations/${s.orgS}`, 'Removed'],
    ['/roodber8/enquiries', 'Removed'],
    ['/roodber8/audit', ''],
  ] as const) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
    await expect(page.getByText("This page didn't load properly")).toHaveCount(0)
    // Some pages keep contact details in a collapsed section: the text must be on the page.
    if (shows) await expect(page.locator('main').getByText(shows).first(), path).toBeAttached()
  }
  // The provider who won still sees their job, with the customer's details gone.
  const provider = await page.context().browser()!.newPage()
  await signIn(provider, s.provider.user.email, s.provider.user.password)
  expect((await provider.goto(`/account/requests/${s.matchWon}`))?.status()).toBe(200)
  await expect(provider.getByText(`F5 Leaking pipe ${stamp}`).first()).toBeVisible()
  await expect(provider.getByText(`F5 Old Requester ${stamp}`)).toHaveCount(0)
  await provider.close()

  // MONEY PROOF (review B4): every database figure, report page and CSV identical apart from the cleared columns.
  const moneyAfter = await moneySnapshot(page)
  expect(moneyAfter.database).toEqual(moneyBefore.database)
  for (const p of PAGES) expect(moneyAfter.pages[p], p).toBe(moneyBefore.pages[p])
  for (const c of CSVS) expect(moneyAfter.csvs[c], c).toBe(moneyBefore.csvs[c])

  // A second Live run changes nothing (except the enquiry that failed, now cleared).
  const rowsAfterFirst = await seededRows()
  try {
    await setMode(page, 'live')
    await cron(request)
  } finally {
    await setMode(page, 'dry_run')
  }
  const second = await latestRun()
  expect(second.counts.cleared).toMatchObject({ enquiries: 1, service_requests: 0, quote_requests: 0, claims: 0, supply_contacts: 0, audit_log: 0 })
  expect(await one('enquiries', s.enqOld)).toMatchObject({ name: 'Removed' })
  const rowsAfterSecond = await seededRows()
  expect(rowsAfterSecond.split('\n').slice(1).join('\n')).toBe(rowsAfterFirst.split('\n').slice(1).join('\n'))
})

async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const encrypt = (plain: string) => {
    const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
    return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`f5-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}

test('the owner’s switches page shows every kind, the deadline and the always-on rows; other roles are refused', async ({ page, browser }) => {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  await expect(page.getByRole('heading', { name: 'Deleting personal details', exact: true })).toBeVisible()
  await expect(page.getByText('Switch to Live before 15 Oct 2027 (covers Jobs and all keeping periods).')).toBeVisible()
  for (const t of ['Name, contact and message cleared 24 months after the last activity. Reference and dates stay.', 'Deleted 24 months after the last contact; do-not-contact numbers kept.', 'Entries deleted after 24 months; payments, fees and data-protection decisions after 6 years.', 'Deleted 90 days after last seen (always on).', 'Unaccepted invitations deleted 30 days after expiry (always on).'])
    await expect(page.getByText(t)).toBeVisible()
  await expect(page.getByText(/Dry run — report only/).first()).toBeVisible()
  for (const role of ['operations', 'agent', 'content'] as const) {
    const staff = await staffPage(browser, role)
    await staff.goto('/roodber8/jobs/data')
    await expect(staff).toHaveURL(/denied=1/)
    await staff.close()
  }
})

test('/privacy shows the approved keeping periods', async ({ page }) => {
  await page.goto('/privacy')
  for (const t of [
    'your name, phone, email, message and the listing or business you contacted (or "HagerLand" when you use our contact form).',
    'Enquiries and messages sent through our contact form: your name, contact details and message are deleted 24 months after the last activity on them. The reference and dates are kept.',
    'Business contacts our supply team works with: deleted 24 months after the last contact, except that if you asked us not to contact you again, we keep your number only to respect that.',
    'Records of changes made by our team: 24 months; records of payments, fees and data-protection decisions: 6 years.',
  ])
    await expect(page.getByText(t)).toBeVisible()
  await expect(page.getByText('Enquiries: 24 months.', { exact: true })).toHaveCount(0)
})

test.afterAll(async () => {
  if (!s) return
  const d = db()
  await d.from('deals').delete().in('id', [s.dealEnq, s.dealSr])
  await d.from('enquiries').delete().in('id', [s.enqOld, s.enqNew, s.enqDeal])
  await d.from('service_requests').delete().in('id', [s.sr, s.srOpen])
  await d.from('managed_properties').delete().in('id', [s.mpActive, s.mpEnded])
  await d.from('property_care_requests').delete().in('id', [s.careOld, s.careHeld])
  await d.from('build_projects').delete().in('id', [s.bpOld, s.bpOpen])
  await d.from('partner_applications').delete().in('id', [s.paOld, s.paNew])
  await d.from('claims').delete().in('id', [s.claimOld, s.claimPending])
  await d.from('trade_accounts').delete().in('id', [s.taOld, s.taApproved])
  await d.from('org_invitations').delete().eq('id', s.invAccepted)
  tidyEarlierRuns()
  // Supply orders and the ledger are append-only records: the test's order, quotes and supplier stay on the local copy.
  await d.from('organisations').delete().in('id', [s.provider.orgId, s.otherProvider.orgId, s.claimOrg])
  for (const u of [s.user.id, s.other.id]) await d.auth.admin.deleteUser(u)
})
