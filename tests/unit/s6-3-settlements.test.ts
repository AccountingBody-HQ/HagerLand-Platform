import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** S6-3 partner terms → prices, settlements after delivery, reconciliation (migration 0050). */

const sql = readFileSync('supabase/migrations/0050_partner_settlements.sql', 'utf8')
const code = sql.replace(/--.*$/gm, '')

describe('terms → prices (the same rules as the database)', () => {
  it('markup: cost × (1 + markup), half up to the cent; HagerLand pays the cost', async () => {
    const { suggestedTerms } = await import('@/lib/supply/terms')
    expect(suggestedTerms(61337, 1250, null)).toEqual({ model: 'markup', bps: 1250, customerUnitCents: 69004, payableUnitCents: 61337 })
    expect(suggestedTerms(70000, 1000, null)).toEqual({ model: 'markup', bps: 1000, customerUnitCents: 77000, payableUnitCents: 70000 })
    // 1 × 1.005 = 1.005 → 1 cent; 3 × 1.5 = 4.5 → 5 cents (half up).
    expect(suggestedTerms(1, 50, null).customerUnitCents).toBe(1)
    expect(suggestedTerms(3, 5000, null).customerUnitCents).toBe(5)
  })
  it('commission: the agreed price is the customer price; HagerLand pays price × (1 − commission)', async () => {
    const { suggestedTerms } = await import('@/lib/supply/terms')
    expect(suggestedTerms(100000, null, 500)).toEqual({ model: 'commission', bps: 500, customerUnitCents: 100000, payableUnitCents: 95000 })
    expect(suggestedTerms(99999, null, 250).payableUnitCents).toBe(97499) // 97,499.025 → 97,499
    expect(suggestedTerms(10, null, 2500).payableUnitCents).toBe(8) // 7.5 → 8 (half up)
  })
  it('precedence: the source first, then the agreement (markup, then commission), else manual', async () => {
    const { resolveTerms } = await import('@/lib/supply/terms')
    const src = (markupBps: number | null, commissionBps: number | null) => ({ costCents: 50000, markupBps, commissionBps })
    expect(resolveTerms(src(1000, null), { defaultMarkupBps: 2000, commissionBps: 500 }).model).toBe('markup')
    expect(resolveTerms(src(1000, null), { defaultMarkupBps: 2000, commissionBps: 500 }).bps).toBe(1000)
    expect(resolveTerms(src(null, 300), { defaultMarkupBps: 2000, commissionBps: 500 })).toMatchObject({ model: 'commission', bps: 300 })
    expect(resolveTerms(src(null, null), { defaultMarkupBps: 2000, commissionBps: 500 })).toMatchObject({ model: 'markup', bps: 2000, customerUnitCents: 60000 })
    expect(resolveTerms(src(null, null), { defaultMarkupBps: null, commissionBps: 500 })).toMatchObject({ model: 'commission', bps: 500, payableUnitCents: 47500 })
    expect(resolveTerms(src(null, null), null)).toEqual({ model: 'manual', bps: null, customerUnitCents: null, payableUnitCents: 50000 })
    expect(resolveTerms(null, null)).toEqual({ model: null, bps: null, customerUnitCents: null, payableUnitCents: null })
  })
  it('the database has the same function shapes, one model per source, and refuses a loss on a line', () => {
    expect(code).toContain('select floor((2 * p_n + p_d) / (2 * p_d))::bigint')
    expect(code).toMatch(/when p_markup_bps is not null then public\.supply_round_div\(p_cost::numeric \* \(10000 \+ p_markup_bps\), 10000\)/)
    expect(code).toMatch(/when p_markup_bps is null and p_commission_bps is not null then public\.supply_round_div\(p_cost::numeric \* \(10000 - p_commission_bps\), 10000\)/)
    expect(code).toContain('add constraint product_sources_one_model check (markup_bps is null or commission_bps is null)')
    expect(code).toContain('customer_unit_price_cents is null or partner_payable_unit_cents is null or customer_unit_price_cents >= partner_payable_unit_cents')
    expect(code).toContain("raise exception 'A customer price is below what HagerLand pays the partner for that item'")
    // An owner override of the suggested price is kept in the history with both values.
    expect(code).toMatch(/'price_override', jsonb_build_object\('line', v_line\.id, 'suggested_cents', v_line\.customer_unit_cents, 'price_cents', v_price/)
  })
})

describe('delivery is HagerLand income, never a partner payable', () => {
  it('flagged on the first order; the payable is the partner lines (+ the partner\'s own delivery) only', () => {
    expect(code).toMatch(/case when v_first then r\.delivery_charge_cents else 0 end, case when v_first then r\.delivery_charge_cents else 0 end/)
    const payable = /function public\.supply_order_payable_cents[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? ''
    expect(payable).toContain('supplier_unit_price_cents')
    expect(payable).not.toMatch(/customer_delivery|hagerland_delivery/)
    expect(code).toContain('coalesce(l.partner_payable_unit_cents, l.cost_price_cents)')
  })
})

describe('settlement rules in the database', () => {
  it('after delivery with proof, or up front with a reason; one payable per order; paid once', () => {
    expect(code).toMatch(/if not \(o\.status in \('delivered', 'completed'\) and exists \(select 1 from public\.supply_delivery_proofs p where p\.order_id = o\.id and p\.removed_at is null\)\) then\s+if not public\.supply_order_upfront\(o\.id\) or coalesce\(btrim\(new\.upfront_reason\), ''\) = '' then/)
    expect(code).toContain("create unique index if not exists partner_settlement_items_one_payable_key on public.partner_settlement_items (supply_order_id) where kind = 'payable' and not settlement_void;")
    expect(code).toMatch(/\(\('draft', 'approved'\), \('draft', 'void'\), \('approved', 'paid'\), \('approved', 'void'\)\)/)
    expect(code).toContain("raise exception 'A % settlement is final', old.status")
    expect(code).toContain("if s.id is null or s.status <> 'approved' then\n    raise exception 'Only an approved settlement can be paid, once'")
    expect(code).toContain("raise exception 'The settlement total must equal its items'")
    expect(code).toContain("raise exception 'The amount due must equal what HagerLand owes for the order'")
    expect(code).toContain("raise exception 'A settlement is paid only together with its ledger entries'")
  })
  it('paying writes existing ledger types only; the ledger itself is not altered', () => {
    expect(code).toMatch(/values \('supplier_payment', 'out', i\.amount_cents, p_paid_on, p_method, s\.reference, i\.supply_order_id, s\.org_id/)
    expect(code).toMatch(/values \('adjustment', case when i\.amount_cents < 0 then 'in' else 'out' end, abs\(i\.amount_cents\)/)
    expect(code).not.toMatch(/alter table public\.supply_ledger_entries/)
    expect(code).not.toMatch(/(drop|alter) constraint/i)
  })
  it('a refund on a settled order makes an adjustment for the partner\'s next settlement', () => {
    expect(code).toMatch(/values \(null, v_item\.org_id, new\.order_id, 'adjustment', -least\(new\.amount_cents, v_item\.amount_cents\), 'Customer refund after settlement ' \|\| v_ref/)
  })
})

describe('the partner statement (section 3, verbatim)', () => {
  it('title, partner, period, headings, rows, adjustments, total, paid line and footer', async () => {
    const { buildStatement, statementHtml } = await import('@/lib/supply/settlements')
    const st = buildStatement({
      reference: 'HLG-2026-000001',
      business: 'Kaliti Cement',
      from: '1 Oct 2026',
      to: '31 Oct 2026',
      rows: [{ order: 'HLO-2026-000001', deliveredOn: '20 Oct 2026', item: 'Portland cement', quantity: '30 bags', amountCents: 1840110 }],
      adjustments: [{ reason: 'Customer refund after settlement HLG-2026-000000', amountCents: -50000 }],
      totalCents: 1790110,
      paid: { on: '31 Oct 2026', method: 'bank_transfer', reference: 'CBE-778' },
    })
    expect(st.title).toBe('HagerLand Supply — statement HLG-2026-000001')
    expect(st.lines).toEqual(['Partner: Kaliti Cement', 'Period: 1 Oct 2026 to 31 Oct 2026'])
    expect(st.headings).toEqual(['Order', 'Delivered on', 'Item', 'Quantity', 'Amount due (ETB)'])
    expect(st.rows[0]).toEqual(['HLO-2026-000001', '20 Oct 2026', 'Portland cement', '30 bags', '18,401.10'])
    expect(st.rows[1][0]).toBe('Adjustment: Customer refund after settlement HLG-2026-000000')
    expect(st.rows[2][0]).toBe('Total due: ETB 17,901.10')
    expect(st.rows[3][0]).toBe('Paid on 31 Oct 2026 (bank transfer, reference CBE-778)')
    expect(st.footer).toBe('Questions? Contact HagerLand Supply.')
    const html = statementHtml(st)
    expect(html).toContain('<title>HagerLand Supply — statement HLG-2026-000001</title>')
    expect(html).toContain('noindex')
  })
  it('the statement reads no customer, customer price, margin, delivery income or other partner', () => {
    const data = readFileSync('lib/supply/settlements-data.ts', 'utf8')
    const fn = data.split('export async function statementData')[1].split('\nexport ')[0]
    expect(fn).not.toMatch(/customer|order_requests|hagerland_delivery|margin|phone|address|email/)
    expect(fn).toContain("select('id, order_id, item_name, quantity, unit, supplier_unit_price_cents, created_at')")
    const route = readFileSync('app/roodber8/supply/settlements/[id]/statement/route.ts', 'utf8')
    expect(route).toMatch(/if \(!\(await isAdminRequest\(\)\) \|\| !\(await isOwnerSession\(\)\)\) return new NextResponse\('Unauthorized', \{ status: 401 \}\)/)
  })
})

describe('the reconciliation', () => {
  const base = (): { payments: import('@/lib/supply/settlements').RecPayment[]; orders: import('@/lib/supply/settlements').RecOrder[]; ledger: import('@/lib/supply/settlements').RecLedger[]; settlements: import('@/lib/supply/settlements').RecSettlement[]; pending: import('@/lib/supply/settlements').RecPending[] } => ({
    payments: [
      { requestId: 'r1', type: 'customer_payment', amountCents: 2460000, occurredOn: '2026-10-05', reversedType: null },
      { requestId: 'r1', type: 'moved_to_order', amountCents: 2460000, occurredOn: '2026-10-06', reversedType: null },
    ],
    orders: [
      {
        id: 'o1', reference: 'HLO-1', requestId: 'r1', requestReference: 'HLR-1', orgId: 'p1', status: 'completed', deliveredAt: '2026-10-10T09:00:00Z', deliveryIncomeCents: 150000, payableCents: 2100000,
        lines: [{ customerCents: 2310000, payableUnitCents: 70000, customerUnitCents: 77000, reference: 'HLO-1' }],
      },
    ],
    ledger: [
      { orderId: 'o1', type: 'customer_payment', direction: 'in', amountCents: 2460000, occurredOn: '2026-10-06', reference: 'HLR-1', reversedType: null, reversedReference: null },
      { orderId: 'o1', type: 'supplier_payment', direction: 'out', amountCents: 2100000, occurredOn: '2026-11-02', reference: 'HLG-1', reversedType: null, reversedReference: null },
    ],
    settlements: [{ id: 's1', reference: 'HLG-1', status: 'paid', totalCents: 2100000, items: [{ kind: 'payable', orderId: 'o1', amountCents: 2100000, void: false, createdAt: '2026-11-01T08:00:00Z' }] }],
    pending: [],
  })
  it('figures by Addis month and to date, to the cent, and "yes"', async () => {
    const { reconcile, reconcilesText } = await import('@/lib/supply/settlements')
    const r = reconcile(base())
    expect(r.toDate).toEqual({ moneyIn: 2460000, refunds: 0, deliveryIncome: 150000, payablesEarned: 2100000, adjustments: 0, paidToPartners: 2100000, dueToPartners: 0, margin: 210000 })
    expect(r.months.map((m) => [m.month, m.figures.dueToPartners])).toEqual([['2026-10', 2100000], ['2026-11', 0]])
    expect(reconcilesText(r)).toBe('yes')
  })
  it('each check says "no" with the right reference', async () => {
    const { reconcile, reconcilesText, CHECK_LABEL } = await import('@/lib/supply/settlements')
    const twice = base()
    twice.ledger.push({ orderId: 'o1', type: 'supplier_payment', direction: 'out', amountCents: 2100000, occurredOn: '2026-11-03', reference: 'manual', reversedType: null, reversedReference: null })
    expect(reconcilesText(reconcile(twice))).toBe(`no (${CHECK_LABEL.twice}: HLO-1)`)
    const mismatch = base()
    mismatch.ledger[1].amountCents = 2000000
    expect(reconcile(mismatch).checks.find((c) => c.label === CHECK_LABEL.settlements)?.references).toEqual(['HLG-1'])
    const moved = base()
    moved.payments[1].amountCents = 2400000
    expect(reconcile(moved).checks.find((c) => c.label === CHECK_LABEL.moved)?.references).toEqual(['HLR-1'])
    const loss = base()
    loss.orders[0].lines[0].customerUnitCents = 60000
    expect(reconcile(loss).checks.find((c) => c.label === CHECK_LABEL.margin)?.references).toEqual(['HLO-1'])
    const totals = base()
    totals.settlements[0].totalCents = 1
    expect(reconcile(totals).checks.find((c) => c.label === CHECK_LABEL.totals)?.references).toEqual(['HLG-1'])
  })
  it('a refund on a delivered order lowers the margin; a partner repayment raises it', async () => {
    const { reconcile } = await import('@/lib/supply/settlements')
    const b = base()
    b.ledger.push({ orderId: 'o1', type: 'refund', direction: 'out', amountCents: 50000, occurredOn: '2026-11-04', reference: null, reversedType: null, reversedReference: null })
    b.pending.push({ amountCents: -50000, createdAt: '2026-11-04T10:00:00Z' })
    const r = reconcile(b)
    expect(r.toDate).toMatchObject({ refunds: 50000, adjustments: -50000, margin: 210000, dueToPartners: -50000 })
  })
})

describe('owner only, and the tidy-ups', () => {
  it('every settlement action and page is the owner\'s; no staff role has the areas', async () => {
    const actions = readFileSync('app/roodber8/actions/settlements.ts', 'utf8')
    const fns = actions.split('export async function ').slice(1)
    expect(fns.length).toBe(7)
    for (const f of fns) expect(f).toMatch(/^\w+\([^)]*\): Promise<Msg> \{\s+await assertAdmin\(AREA\)\s+await assertOwner\(\)/)
    for (const p of ['app/roodber8/supply/settlements/page.tsx', 'app/roodber8/supply/settlements/[id]/page.tsx', 'app/roodber8/reports/supply-settlements/page.tsx']) expect(readFileSync(p, 'utf8')).toContain("if (!(await isOwnerSession())) redirect('/roodber8?denied=1')")
    for (const p of ['app/roodber8/supply/settlements/export/route.ts', 'app/roodber8/reports/supply-settlements/export/route.ts']) expect(readFileSync(p, 'utf8')).toContain('!(await isOwnerSession())')
    const { roleCanAccess } = await import('@/lib/admin/roles')
    for (const role of ['operations', 'agent', 'content'] as const) for (const path of ['/roodber8/supply/settlements', '/roodber8/reports/supply-settlements', '/roodber8/supply/settlements/export']) expect(roleCanAccess(role, path), `${role} ${path}`).toBe(false)
  })
  it('the dashboard leaves out the hourly runs (the Audit log keeps them)', () => {
    expect(readFileSync('app/roodber8/page.tsx', 'utf8')).toContain(".neq('action', HOURLY_RUN_ACTION)")
    expect(readFileSync('app/roodber8/audit/page.tsx', 'utf8')).not.toContain('HOURLY_RUN_ACTION')
  })
  it('draft approval is one database step, with the same checks and messages', () => {
    const a = readFileSync('app/roodber8/actions/partner-drafts.ts', 'utf8').split('export async function approveDraftAction')[1]
    expect(a).toContain(".rpc('partner_draft_approve', {")
    expect(a).not.toMatch(/from\('products'\)\s*\.insert|from\('product_sources'\)\s*\.insert|from\('partner_product_drafts'\)\s*\.update|from\('brands'\)\.insert/)
    for (const m of ['This draft is not waiting for review.', 'No product with this ID.', 'Only a HagerLand Supply product can be linked.', 'Choose a category', 'This partner is already a source of that product.', 'Could not create the product.'])
      expect(a + code).toContain(m)
    expect(a).toContain('p_product_slug: `${slugify(d.name, 70)}-${shortId(4)}`')
    expect(a).toContain('p_brand_slug: d.brand_name ? slugify(d.brand_name, 60) : null')
    for (const audit of ["audit('product.create'", "audit('supply.source.create'", "audit('supply.draft.approve'"]) expect(a).toContain(audit)
  })
  it('settlement records are kept 6 years in the audit log', async () => {
    const { auditKeep } = await import('@/lib/retention')
    expect(auditKeep('supply.settlement.pay')).toBe('six_years')
    expect(auditKeep('supply.settlement.adjustment')).toBe('six_years')
  })
})

describe('migration 0050', () => {
  it('settlement references have a prefix of their own (HLG): no other table or code uses it', () => {
    expect(code).toContain("default public.next_reference('HLG')")
    const others = readdirSync('supabase/migrations').filter((f) => f !== '0050_partner_settlements.sql').map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
    expect(others.some((t) => /next_reference\('HLG'\)/.test(t))).toBe(false)
    expect(code.match(/next_reference\('HL[A-Z]+'\)/g)).toEqual(["next_reference('HLG')"])
  })
  it('additive: no drop of any kind, no deletion, no change to the ledger; records itself', () => {
    expect(code).not.toMatch(/\bdrop\b/i)
    expect(code).not.toMatch(/delete\s+from|^\s*truncate\b|\brename\b/im)
    expect(code).toMatch(/^begin;[\s\S]*commit;\s*$/m)
    expect(code).toContain("values ('0050', 'partner_settlements')")
    for (const t of ['partner_settlements', 'partner_settlement_items']) expect(code).toContain(`alter table public.${t} enable row level security;`)
    expect(code).not.toMatch(/grant [^;]* to (anon|authenticated)/i)
  })
  it('the health check expects 0050', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS).toContain('0050')
  })
})
