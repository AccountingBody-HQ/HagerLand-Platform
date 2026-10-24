import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { adminSession, assertLocalStack, createUser, db, mailWithSubject, signIn, SUPABASE_URL, uniqueEmail } from '../helpers'

test.describe.configure({ mode: 'serial' })
test.beforeAll(() => {
  assertLocalStack()
  execFileSync('bash', ['scripts/seed-supply-local.sh'], { stdio: 'ignore' })
})

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const NEW_TABLES = ['supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries']

/** A fresh active partner, a quote in Bole and one chosen supplier line per partner, as Phase 3 leaves them. */
async function setup(stamp: number, partners: { name: string; agreement?: 'A' | 'B' }[]) {
  const d = db()
  const { data: bole } = await d.from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data: quote } = await d.from('quote_requests').insert({ name: 'Order Test Customer', phone: '+251911777000', email: uniqueEmail('order-customer'), delivery_location_id: bole!.id, source: 'materials_list', status: 'accepted' }).select('id, reference').single()
  const orgs: { id: string; name: string }[] = []
  for (const [i, p] of partners.entries()) {
    const name = `${p.name} ${stamp}`
    const { data: org } = await d.from('organisations').insert({ kind: 'supplier', name, slug: `order-test-${i}-${stamp}`, status: 'draft', source: 'admin' }).select('id').single()
    await d.from('supply_partners').insert({ org_id: org!.id, relationship_status: 'active' })
    await d.from('supply_contacts').insert({ org_id: org!.id, name: 'Order desk', phone: '0911 66 77 88', phone_normalised: '+251911667788', preferred_channel: 'phone' })
    if (p.agreement) await d.from('supply_agreements').insert({ org_id: org!.id, money_model: p.agreement, commission_rate_bps: p.agreement === 'B' ? 500 : null, start_date: new Date().toISOString().slice(0, 10), status: 'active', created_by: 'test' })
    const { data: item } = await d.from('quote_request_items').insert({ quote_request_id: quote!.id, free_text_item: `Cement for ${name}`, quantity: 10, unit: 'bag', added_by_admin: false }).select('id').single()
    await d.from('supply_quote_lines').insert({ quote_request_id: quote!.id, quote_item_id: item!.id, org_id: org!.id, status: 'chosen', unit: 'bag', unit_price_cents: 100000, quantity: 10, delivery_charge_cents: 20000, chosen_at: new Date().toISOString() })
    orgs.push({ id: org!.id, name })
  }
  return { quote: quote!, orgs }
}

test('database: golden rule, allowed steps, append-only ledger and timeline, one active agreement, one live order per line, no outside access', async () => {
  const d = db()
  const stamp = Date.now()
  const { quote, orgs } = await setup(stamp, [{ name: 'Rules Supplier', agreement: 'A' }])
  const { data: line } = await d.from('supply_quote_lines').select('id, quote_item_id').eq('quote_request_id', quote.id).single()
  const lines = [{ supply_quote_line_id: line!.id, quote_item_id: line!.quote_item_id, item_name: 'Cement', quantity: 10, unit: 'bag', supplier_unit_price_cents: 100000, vat_flag: 'yes' }]
  const { data: created, error } = await d.rpc('supply_create_order', { p_quote: quote.id, p_org: orgs[0].id, p_model: 'A', p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: null as unknown as number, p_supplier_delivery_cents: 20000, p_actor: 'test', p_lines: lines }).single()
  expect(error).toBeNull()
  const orderId = (created as { id: string; reference: string }).id
  expect((created as { reference: string }).reference).toMatch(/^HLO-\d{4}-\d{6}$/)
  await d.from('supply_order_lines').update({ customer_unit_price_cents: 110000 }).eq('order_id', orderId)
  await d.from('supply_orders').update({ customer_delivery_charge_cents: 25000, status: 'awaiting_payment' }).eq('id', orderId)
  const pay = (amount: number) => d.from('supply_ledger_entries').insert({ entry_type: 'customer_payment', direction: 'in', amount_cents: amount, occurred_on: new Date().toISOString().slice(0, 10), order_id: orderId }).select('id').single()
  const step = (status: string) => d.from('supply_orders').update({ status }).eq('id', orderId)

  expect((await step('paid')).error?.message).toBe('The customer has not paid this order in full yet')
  await pay(500000)
  expect((await step('paid')).error?.message).toBe('The customer has not paid this order in full yet')
  expect((await step('placed')).error?.message).toMatch(/cannot go from awaiting_payment to placed/)
  await pay(625000)
  expect((await step('paid')).error).toBeNull()
  expect((await step('placed')).error).toBeNull()
  expect((await step('completed')).error?.message).toMatch(/cannot go from placed to completed/)
  expect((await d.from('supply_orders').update({ status: 'cancelled', status_reason: null }).eq('id', orderId)).error?.message).toMatch(/Give a reason/)

  const { data: entry } = await d.from('supply_ledger_entries').select('id').eq('order_id', orderId).limit(1).single()
  expect((await d.from('supply_ledger_entries').update({ amount_cents: 1 }).eq('id', entry!.id)).error?.message).toMatch(/append-only/)
  expect((await d.from('supply_ledger_entries').delete().eq('id', entry!.id)).error?.message).toMatch(/append-only/)
  expect((await d.from('supply_order_events').delete().eq('order_id', orderId)).error?.message).toMatch(/append-only/)
  const reversal = { entry_type: 'reversal', direction: 'out', amount_cents: 500000, occurred_on: new Date().toISOString().slice(0, 10), order_id: orderId, reverses_entry_id: entry!.id, reason: 'Typed twice' }
  expect((await d.from('supply_ledger_entries').insert(reversal)).error).toBeNull()
  expect((await d.from('supply_ledger_entries').insert(reversal)).error?.code).toBe('23505')

  expect((await d.from('supply_agreements').insert({ org_id: orgs[0].id, money_model: 'A', start_date: '2026-01-01', status: 'active' })).error?.code).toBe('23505')
  const again = await d.rpc('supply_create_order', { p_quote: quote.id, p_org: orgs[0].id, p_model: 'B', p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: 500, p_supplier_delivery_cents: 0, p_actor: 'test', p_lines: lines })
  expect(again.error?.message).toBe('This supplier line is already in an order')

  const events = (await d.from('supply_order_events').select('event_type, to_status').eq('order_id', orderId).order('created_at')).data!.map((e) => `${e.event_type}${e.to_status ? `:${e.to_status}` : ''}`)
  expect(events).toEqual(['created:draft', 'status:awaiting_payment', 'ledger_entry', 'ledger_entry', 'status:paid', 'status:placed', 'ledger_entry'])

  const anon = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false } })
  const user = await createUser()
  const signed = createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false } })
  await signed.auth.signInWithPassword({ email: user.email, password: user.password })
  for (const client of [anon, signed]) {
    for (const t of NEW_TABLES) expect((await client.from(t).select('*').limit(1)).error, t).not.toBeNull()
    const files = await client.storage.from('supply-private').list('proofs')
    expect(files.data ?? []).toEqual([])
    const read = await client.storage.from('supply-private').download('proofs/5eed0d00-0000-4000-8000-000000000008/5eedf000-0000-4000-8000-000000000001.png')
    expect(read.data).toBeNull()
  }
  await d.auth.admin.deleteUser(user.id)
})

test('model A journey: agreement, create orders, customer prices, golden rule in the screens, payments, proof, completion, ledger', async ({ page }) => {
  test.setTimeout(300_000)
  const d = db()
  const stamp = Date.now()
  const { quote, orgs } = await setup(stamp, [{ name: 'Margin Supplier' }, { name: 'Commission Supplier' }])
  await adminSession(page)

  // J1: add an active model A agreement with the signed copy, on the partner page.
  await page.goto(`/roodber8/organisations/${orgs[0].id}`)
  await expect(page.getByText('No active agreement.')).toBeVisible()
  await page.getByRole('button', { name: 'Add agreement' }).click()
  const ag = page.getByRole('group', { name: 'Add agreement' })
  await ag.getByLabel('Money model').selectOption('A')
  await ag.getByLabel('Payment terms').fill('Bank transfer within 7 days')
  await ag.getByLabel('Credit days').fill('7')
  await ag.getByLabel('Signed agreement (photo or PDF)').setInputFiles({ name: 'agreement.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(ag.getByText('Uploaded: agreement.pdf')).toBeVisible()
  await ag.getByRole('button', { name: 'Save agreement' }).click()
  await expect(page.getByRole('link', { name: 'Signed agreement' })).toBeVisible()
  const link = await page.getByRole('link', { name: 'Signed agreement' }).getAttribute('href')
  const token = new URL(link!).searchParams.get('token')!
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { exp: number; iat: number }
  expect(claims.exp - claims.iat).toBeLessThanOrEqual(600)
  // Wrong file types are refused with a plain message.
  await page.getByRole('button', { name: 'Add agreement' }).click()
  await page.getByRole('group', { name: 'Add agreement' }).getByLabel('Signed agreement (photo or PDF)').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(page.getByText('Upload a photo (JPEG, PNG, WebP or HEIC) or a PDF.')).toBeVisible()
  await page.getByRole('group', { name: 'Add agreement' }).getByLabel('Signed agreement (photo or PDF)').setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) })
  await expect(page.getByText('Files must be 10 MB or smaller.')).toBeVisible()

  // J2: create orders from the quote: model from the agreement; the other supplier has none.
  await page.goto(`/roodber8/quotes/${quote.id}`)
  await page.getByRole('button', { name: 'Create orders' }).click()
  const co = page.getByRole('group', { name: 'Create orders' })
  await expect(co.getByLabel(`Money model for ${orgs[0].name}`)).toHaveValue('A')
  await expect(co.getByLabel(`Money model for ${orgs[0].name}`)).toBeDisabled()
  await expect(co.getByText('No signed agreement')).toBeVisible()
  await co.getByLabel(`Money model for ${orgs[1].name}`).selectOption('B')
  await co.getByLabel(`Commission % for ${orgs[1].name}`).fill('5')
  await co.getByRole('button', { name: 'Create draft orders' }).click()
  await expect(page.getByText(`${orgs[1].name} has no signed agreement. Tick “Proceed without an agreement” to continue.`)).toBeVisible()
  await co.getByLabel(`Proceed without an agreement for ${orgs[1].name}`).check()
  await co.getByRole('button', { name: 'Create draft orders' }).click()
  await expect(page.getByText(/Draft orders HLO-\d{4}-\d{6}, HLO-\d{4}-\d{6} created/)).toBeVisible()
  const orders = (await d.from('supply_orders').select('id, reference, org_id, money_model, proceed_without_agreement').eq('quote_request_id', quote.id)).data!
  const a = orders.find((o) => o.org_id === orgs[0].id)!
  const b = orders.find((o) => o.org_id === orgs[1].id)!
  expect([a.money_model, a.proceed_without_agreement, b.money_model, b.proceed_without_agreement]).toEqual(['A', false, 'B', true])
  await expect(page.getByRole('link', { name: a.reference })).toBeVisible()
  await expect(page.getByRole('button', { name: /Create order/ })).toHaveCount(0)

  // J3: customer prices with the margin helper.
  await page.goto(`/roodber8/supply/orders/${a.id}`)
  await page.getByLabel('Margin % helper').fill('10')
  await page.getByRole('button', { name: 'Fill customer prices' }).click()
  await expect(page.getByLabel(`Customer price for Cement for ${orgs[0].name}`)).toHaveValue('1100.00')
  await page.getByLabel('Customer delivery charge (ETB)').fill('250')
  await page.getByRole('button', { name: 'Save order' }).click()
  await expect(page.getByText('Customer total')).toBeVisible()
  await expect(page.getByText('ETB 11,250.00')).toBeVisible()

  // J4: send for payment, part payment, Mark as paid stays unavailable; full payment in pounds; then place.
  page.once('dialog', (dlg) => void dlg.accept())
  await page.getByRole('button', { name: 'Send to customer for payment' }).click()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Place with supplier' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Record customer payment' }).click()
  const payment = page.getByRole('group', { name: 'Record customer payment' })
  await payment.getByLabel('Amount (ETB)').fill('5000')
  await payment.getByLabel('Method').selectOption('telebirr')
  await payment.getByLabel('Reference').fill('TB-123')
  await payment.getByRole('button', { name: 'Record' }).click()
  await expect.poll(async () => (await d.from('supply_ledger_entries').select('id').eq('order_id', a.id).eq('entry_type', 'customer_payment')).data?.length).toBe(1)
  // Wait for the page to show the payment before opening the form again.
  await expect(page.getByRole('definition').filter({ hasText: 'ETB 5,000.00' }).first()).toBeVisible()
  await expect(page.getByText(/Customer payment · ETB 5,000\.00/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeDisabled()
  await page.getByRole('button', { name: 'Record customer payment' }).click()
  const rest = page.getByRole('group', { name: 'Record customer payment' })
  await expect(rest.getByLabel('Amount (ETB)')).toHaveValue('6250.00')
  await rest.getByLabel('Paid in another currency?').fill('GBP')
  await rest.getByLabel('Amount in GBP').fill('86.21')
  await rest.getByLabel('Rate used (ETB per unit)').fill('72.5')
  await rest.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText(/GBP 86\.21 at 72\.5/)).toBeVisible()
  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await page.getByRole('button', { name: 'Place with supplier' }).click()
  await page.getByRole('button', { name: 'Supplier confirmed' }).click()
  await page.getByRole('button', { name: 'Out for delivery' }).click()
  await page.getByRole('button', { name: 'Delivered', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Complete' })).toBeDisabled()

  // J6: delivery proof (and a wrong one removed), then completion.
  const proof = page.getByRole('group', { name: 'Add delivery proof' })
  await proof.getByLabel('Photo or signed delivery note').setInputFiles({ name: 'delivery.png', mimeType: 'image/png', buffer: PNG })
  await expect(proof.getByText('Uploaded: delivery.png')).toBeVisible()
  await proof.getByLabel('Received by').fill('Site foreman')
  await proof.getByLabel('Receiver’s phone').fill('0911 22 33 44')
  await proof.getByRole('button', { name: 'Save delivery proof' }).click()
  await expect(page.getByText('Received by Site foreman · +251 91 122 3344')).toBeVisible()
  await page.getByRole('group', { name: 'Add delivery proof' }).getByLabel('Photo or signed delivery note').setInputFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: PDF })
  await page.getByRole('group', { name: 'Add delivery proof' }).getByRole('button', { name: 'Save delivery proof' }).click()
  page.once('dialog', (dlg) => void dlg.accept('Wrong site'))
  await page.getByRole('button', { name: 'Remove' }).nth(1).click()
  await expect(page.getByText('Removed: Wrong site')).toBeVisible()
  await page.getByRole('button', { name: 'Complete' }).click()
  await expect(page.getByText('Completed').first()).toBeVisible()

  // J10: supplier payment and a service fee; the ledger works out what HagerLand earned.
  await page.getByRole('button', { name: 'Record payment to supplier' }).click()
  await page.getByRole('group', { name: 'Record payment to supplier' }).getByRole('button', { name: 'Record' }).click()
  await page.getByRole('button', { name: 'Record a service fee' }).click()
  const fee = page.getByRole('group', { name: 'Record a service fee' })
  await fee.getByLabel('Amount (ETB)').fill('500')
  await fee.getByRole('button', { name: 'Record' }).click()
  // Earned: customer 11,250 − supplier 10,200 + fee 500 = 1,550.
  await expect(page.getByText('ETB 1,550.00')).toBeVisible()
  const timeline = await page.locator('ol').filter({ hasText: 'Order created' }).innerText()
  for (const t of ['Order created', 'Draft → Waiting for customer payment', 'Paid by customer → Placed with supplier', 'Delivery proof added', 'Delivery proof removed', 'Delivered → Completed']) expect(timeline).toContain(t)

  await page.goto(`/roodber8/supply/ledger?order=${a.reference}`)
  await expect(page.getByRole('row', { name: new RegExp(a.reference) }).filter({ hasText: 'ETB 1,550.00' })).toBeVisible()
  const csv = await page.request.get(`/roodber8/supply/ledger/export?order=${a.reference}`)
  expect(csv.status()).toBe(200)
  expect(await csv.text()).toContain('customer_payment')
  // A correction is a reversal, never an edit.
  page.once('dialog', (dlg) => void dlg.accept('Fee entered by mistake'))
  await page.getByRole('row', { name: /Service fee/ }).getByRole('button', { name: 'Reverse entry' }).click()
  await expect(page.getByText('Fee entered by mistake')).toBeVisible()
  const actions = (await d.from('audit_log').select('action').in('entity_id', [a.id, orgs[0].id])).data!.map((x) => x.action)
  expect(actions).toEqual(expect.arrayContaining(['supply.agreement.create', 'supply.order.create', 'supply.order.status', 'supply.ledger.entry', 'supply.order.proof_add', 'supply.order.proof_remove']))
  expect((await d.from('audit_log').select('id').eq('action', 'supply.ledger.export')).data!.length).toBeGreaterThan(0)

  // J5 and J7: the model B order with a dispute, commission due and received, and completion.
  await page.goto(`/roodber8/supply/orders/${b.id}`)
  await page.getByRole('button', { name: 'Place with supplier' }).click()
  await page.getByRole('button', { name: 'Supplier confirmed' }).click()
  await page.getByRole('button', { name: 'Out for delivery' }).click()
  await page.getByRole('button', { name: 'Delivered', exact: true }).click()
  await expect(page.getByText('Commission due ETB 510.00')).toBeVisible()
  page.once('dialog', (dlg) => void dlg.accept('Two bags torn'))
  await page.getByRole('button', { name: 'Report a problem' }).click()
  await expect(page.getByText('Reason: Two bags torn')).toBeVisible()
  await page.getByRole('button', { name: 'Problem solved: delivered' }).click()
  await page.getByRole('button', { name: 'Record commission due' }).click()
  const due = page.getByRole('group', { name: 'Record commission due' })
  await expect(due.getByLabel('Amount (ETB)')).toHaveValue('510.00')
  await due.getByRole('button', { name: 'Record' }).click()
  await page.getByRole('button', { name: 'Record commission received' }).click()
  await page.getByRole('group', { name: 'Record commission received' }).getByRole('button', { name: 'Record' }).click()
  await page.getByRole('group', { name: 'Add delivery proof' }).getByLabel('Photo or signed delivery note').setInputFiles({ name: 'note.pdf', mimeType: 'application/pdf', buffer: PDF })
  await page.getByRole('group', { name: 'Add delivery proof' }).getByRole('button', { name: 'Save delivery proof' }).click()
  await page.getByRole('button', { name: 'Complete' }).click()
  await expect.poll(async () => (await d.from('supply_orders').select('status').eq('id', b.id).single()).data?.status).toBe('completed')
  expect((await d.from('supply_orders').select('status').eq('id', a.id).single()).data?.status).toBe('completed')
})

test('cancelling a paid model A order asks for a refund in the ledger', async ({ page }) => {
  const d = db()
  const { quote, orgs } = await setup(Date.now(), [{ name: 'Cancel Supplier', agreement: 'A' }])
  const { data: line } = await d.from('supply_quote_lines').select('id, quote_item_id').eq('quote_request_id', quote.id).single()
  const { data: created } = await d.rpc('supply_create_order', { p_quote: quote.id, p_org: orgs[0].id, p_model: 'A', p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: null as unknown as number, p_supplier_delivery_cents: 0, p_actor: 'test', p_lines: [{ supply_quote_line_id: line!.id, quote_item_id: line!.quote_item_id, item_name: 'Cement', quantity: 10, unit: 'bag', supplier_unit_price_cents: 100000, vat_flag: 'yes' }] }).single()
  const orderId = (created as { id: string }).id
  await d.from('supply_order_lines').update({ customer_unit_price_cents: 110000 }).eq('order_id', orderId)
  await d.from('supply_orders').update({ status: 'awaiting_payment' }).eq('id', orderId)
  await d.from('supply_ledger_entries').insert({ entry_type: 'customer_payment', direction: 'in', amount_cents: 1100000, occurred_on: new Date().toISOString().slice(0, 10), order_id: orderId })
  await d.from('supply_orders').update({ status: 'paid' }).eq('id', orderId)
  await adminSession(page)
  await page.goto(`/roodber8/supply/orders/${orderId}`)
  const dialogs: string[] = []
  page.on('dialog', (dlg) => {
    dialogs.push(dlg.message())
    void (dlg.type() === 'prompt' ? dlg.accept('Customer cancelled') : dlg.accept())
  })
  await page.getByRole('button', { name: 'Cancel order' }).click()
  await expect(page.getByText('The customer paid for this order: record a refund in the ledger.')).toBeVisible()
  expect(dialogs).toContain('The customer has paid for this order: record a refund in the ledger.')
  await page.getByRole('button', { name: 'Record a refund' }).click()
  const refund = page.getByRole('group', { name: 'Record a refund' })
  await refund.getByLabel('Amount (ETB)').fill('11000')
  await refund.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByText('Refund to customer · ETB 11,000.00')).toBeVisible()
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
  const email = uniqueEmail(`staff-orders-${role}`)
  const password = 'staff-correct-horse'
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await page.context().clearCookies()
  await page.goto('/roodber8-login')
  await page.getByText('Staff sign in').click()
  await page.fill('#stf-email', email)
  await page.fill('#stf-pass', password)
  await page.fill('#stf-code', authenticator.generate(secret))
  await page.getByRole('button', { name: 'Sign in as staff' }).click()
  await page.waitForURL('**/roodber8')
  return async () => {
    await db().from('staff_users').delete().eq('email', email)
    await db().auth.admin.deleteUser(data.user!.id)
  }
}

const MONEY_WORDS = /Money \(owner only\)|Customer price|Customer total|HagerLand earned|Commission due|Margin %|Record customer payment|Supply ledger|Agreement/

test('J9, J11, J12: operations moves orders and adds proof but never sees money or agreements; agent and content are kept out', async ({ page }) => {
  test.setTimeout(180_000)
  const seedOrder = '5eed0d00-0000-4000-8000-000000000004' // model A, placed
  const seedQuote = '5eed9000-0000-4000-8000-000000000002'
  const cleanups: (() => Promise<void>)[] = []
  try {
    cleanups.push(await staffSignIn(page, 'operations'))
    await page.goto('/roodber8/supply/orders')
    await expect(page.getByRole('link', { name: 'HLO-' }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Supply orders' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Supply ledger' })).toHaveCount(0)
    await page.goto('/roodber8/supply/orders?action=1')
    await expect(page.getByRole('region', { name: 'Supply orders' }).getByText('Delivered without delivery proof').first()).toBeVisible()
    await page.goto(`/roodber8/supply/orders/${seedOrder}`)
    expect(await page.content()).not.toMatch(MONEY_WORDS)
    await expect(page.getByRole('button', { name: 'Supplier confirmed' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel order' })).toHaveCount(0)
    // Operations takes the delivery steps and adds proof on a fresh model B order.
    const d = db()
    const { quote, orgs } = await setup(Date.now(), [{ name: 'Ops Supplier', agreement: 'B' }])
    const { data: line } = await d.from('supply_quote_lines').select('id, quote_item_id').eq('quote_request_id', quote.id).single()
    const { data: created } = await d.rpc('supply_create_order', { p_quote: quote.id, p_org: orgs[0].id, p_model: 'B', p_agreement: null as unknown as string, p_proceed: true, p_commission_bps: 500, p_supplier_delivery_cents: 0, p_actor: 'test', p_lines: [{ supply_quote_line_id: line!.id, quote_item_id: line!.quote_item_id, item_name: 'Cement', quantity: 10, unit: 'bag', supplier_unit_price_cents: 100000, vat_flag: 'yes' }] }).single()
    const fresh = (created as { id: string }).id
    await d.from('supply_orders').update({ status: 'placed' }).eq('id', fresh)
    await page.goto(`/roodber8/supply/orders/${fresh}`)
    await page.getByRole('button', { name: 'Supplier confirmed' }).click()
    await page.getByRole('button', { name: 'Out for delivery' }).click()
    await page.getByRole('button', { name: 'Delivered', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(0)
    await page.getByRole('group', { name: 'Add delivery proof' }).getByLabel('Photo or signed delivery note').setInputFiles({ name: 'site.png', mimeType: 'image/png', buffer: PNG })
    await page.getByRole('group', { name: 'Add delivery proof' }).getByRole('button', { name: 'Save delivery proof' }).click()
    await expect(page.getByRole('link', { name: /Proof 1 \(photo\)/ })).toBeVisible()
    expect((await d.from('supply_orders').select('status').eq('id', fresh).single()).data?.status).toBe('delivered')
    expect(await page.content()).not.toMatch(MONEY_WORDS)

    await page.goto(`/roodber8/quotes/${seedQuote}`)
    await expect(page.getByText(/Orders \(18\)/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Create order/ })).toHaveCount(0)
    await page.goto('/roodber8/organisations/5eed0000-0000-4000-8000-000000000001')
    await expect(page.getByRole('heading', { name: 'Agreement' })).toHaveCount(0)
    expect(await page.content()).not.toContain('Bank transfer within 7 days of delivery')
    await page.goto('/roodber8/supply/ledger')
    await expect(page).toHaveURL(/denied=1/)
    expect((await page.request.get('/roodber8/supply/ledger/export')).url()).toMatch(/denied=1|roodber8-login/)

    for (const role of ['agent', 'content'] as const) {
      cleanups.push(await staffSignIn(page, role))
      for (const path of ['/roodber8/supply/orders', `/roodber8/supply/orders/${seedOrder}`, '/roodber8/supply/ledger']) {
        await page.goto(path)
        await expect(page, `${role} ${path}`).toHaveURL(/denied=1/)
      }
      await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: /Supply orders|Supply ledger/ })).toHaveCount(0)
    }
  } finally {
    for (const c of cleanups) await c()
  }
})

test('nothing from orders or the ledger reaches public pages, the customer account, emails, the digest, sitemaps or exports', async ({ page, request }) => {
  const d = db()
  const refs = (await d.from('supply_orders').select('reference').limit(50)).data!.map((o) => o.reference)
  for (const path of ['/', '/supplies', '/supplies/materials-list', '/search?q=HLO', '/sitemap/companies.xml', '/sitemap/products.xml']) {
    const body = await (await request.get(path)).text()
    for (const r of refs) expect(body, `${path} shows ${r}`).not.toContain(r)
    expect(body).not.toMatch(/HagerLand earned|Supply ledger/)
  }
  const daily = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(daily.status()).toBe(200)
  const digest = await mailWithSubject(process.env.ADMIN_DIGEST_EMAIL ?? '', 'HagerLand').catch(() => null)
  if (digest) for (const r of refs) expect(digest.html).not.toContain(r)
  // A customer with an order behind their quote sees only their quote.
  const user = await createUser()
  await d.from('quote_requests').update({ requester_user_id: user.id }).eq('id', '5eed9000-0000-4000-8000-000000000002')
  try {
    await signIn(page, user.email, user.password)
    await page.goto('/account/quotes')
    await expect(page.getByText('HLQ-SEED-ORDERS')).toBeVisible()
    const body = await page.content()
    for (const r of refs) expect(body).not.toContain(r)
    expect(body).not.toMatch(/Abebe|Merkato|HagerLand earned|commission/i)
  } finally {
    await d.from('quote_requests').update({ requester_user_id: null }).eq('id', '5eed9000-0000-4000-8000-000000000002')
    await d.auth.admin.deleteUser(user.id)
  }
  await adminSession(page)
  for (const kind of ['quotes', 'organisations', 'products']) {
    const text = await (await page.request.get(`/roodber8/export/${kind}`)).text()
    for (const r of refs) expect(text, kind).not.toContain(r)
  }
  await page.goto('/roodber8/deals')
  await expect(page.getByRole('heading', { name: 'Deals and commissions' })).toBeVisible()
})
