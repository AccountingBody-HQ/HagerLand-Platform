import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** S6-4 per-customer trade prices and multi-item trade order requests (migration 0051). */

const sql = readFileSync('supabase/migrations/0051_trade_price_agreements.sql', 'utf8')
const code = sql.replace(/--.*$/gm, '')
const read = (p: string) => readFileSync(p, 'utf8')

type A = import('@/lib/supply/trade-prices').Agreement
const agreement = (over: Partial<A>): A => ({ productId: null, categoryId: null, priceCents: null, discountBps: null, validFrom: '2026-10-01', validUntil: null, status: 'active', createdAt: '2026-10-01T08:00:00Z', ...over })
// Cement: category "cement" (parent "building"), the partner's terms suggest 770.00 and HagerLand pays 700.00.
const cement = { id: 'p1', categoryId: 'cement', parentCategoryId: 'building', generalTradeCents: 74000, suggestedCents: 77000, floorCents: 70000 }
const DAY = '2026-10-29'

describe('effective trade price (the same precedence as trade_effective_price_for)', () => {
  it('a product agreement wins over a category agreement and the general trade price', async () => {
    const { effectiveTradePrice } = await import('@/lib/supply/trade-prices')
    const list = [agreement({ categoryId: 'cement', discountBps: 500 }), agreement({ productId: 'p1', priceCents: 72000 })]
    expect(effectiveTradePrice(cement, list, DAY)).toEqual({ priceCents: 72000, rule: 'product_price' })
  })
  it('then the product’s own category, then its parent category', async () => {
    const { effectiveTradePrice } = await import('@/lib/supply/trade-prices')
    const own = agreement({ categoryId: 'cement', discountBps: 500 })
    const parent = agreement({ categoryId: 'building', priceCents: 75000 })
    expect(effectiveTradePrice(cement, [parent, own], DAY)).toEqual({ priceCents: 73150, rule: 'category_discount' })
    expect(effectiveTradePrice(cement, [parent], DAY)).toEqual({ priceCents: 75000, rule: 'category_price' })
  })
  it('then the existing general trade price, then nothing', async () => {
    const { effectiveTradePrice } = await import('@/lib/supply/trade-prices')
    expect(effectiveTradePrice(cement, [], DAY)).toEqual({ priceCents: 74000, rule: 'general_trade_price' })
    expect(effectiveTradePrice({ ...cement, generalTradeCents: null }, [], DAY)).toBeNull()
  })
  it('only active agreements valid that day count (both end dates included); another product’s agreement never applies', async () => {
    const { effectiveTradePrice } = await import('@/lib/supply/trade-prices')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p1', priceCents: 72000, validUntil: DAY })], DAY)?.rule).toBe('product_price')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p1', priceCents: 72000, validFrom: DAY })], DAY)?.rule).toBe('product_price')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p1', priceCents: 72000, validUntil: '2026-10-28' })], DAY)?.rule).toBe('general_trade_price')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p1', priceCents: 72000, validFrom: '2026-10-30' })], DAY)?.rule).toBe('general_trade_price')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p1', priceCents: 72000, status: 'ended' })], DAY)?.rule).toBe('general_trade_price')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p2', priceCents: 72000 })], DAY)?.rule).toBe('general_trade_price')
    expect(effectiveTradePrice(cement, [agreement({ categoryId: 'paint', discountBps: 100 })], DAY)?.rule).toBe('general_trade_price')
  })
  it('no loss: a candidate below what HagerLand pays the partner is skipped for the next rule', async () => {
    const { effectiveTradePrice } = await import('@/lib/supply/trade-prices')
    expect(effectiveTradePrice(cement, [agreement({ productId: 'p1', priceCents: 69999 })], DAY)).toEqual({ priceCents: 74000, rule: 'general_trade_price' })
    expect(effectiveTradePrice({ ...cement, generalTradeCents: 60000 }, [], DAY)).toBeNull()
    // No partner supplies it: nothing to compare with.
    expect(effectiveTradePrice({ ...cement, floorCents: null }, [agreement({ productId: 'p1', priceCents: 100 })], DAY)?.priceCents).toBe(100)
  })
  it('a discount needs a suggested price; a category discount without one falls through', async () => {
    const { effectiveTradePrice } = await import('@/lib/supply/trade-prices')
    expect(effectiveTradePrice({ ...cement, suggestedCents: null }, [agreement({ categoryId: 'cement', discountBps: 500 })], DAY)?.rule).toBe('general_trade_price')
  })
})

describe('discount on the suggested price', () => {
  it('suggested × (1 − discount), half up to the cent', async () => {
    const { agreementPrice } = await import('@/lib/supply/trade-prices')
    expect(agreementPrice({ priceCents: null, discountBps: 500 }, 88000)).toBe(83600)
    expect(agreementPrice({ priceCents: null, discountBps: 1250 }, 77000)).toBe(67375)
    expect(agreementPrice({ priceCents: null, discountBps: 333 }, 99999)).toBe(96669) // 96,669.0333 → 96,669
    expect(agreementPrice({ priceCents: null, discountBps: 5000 }, 3)).toBe(2) // 1.5 → 2 (half up)
    expect(agreementPrice({ priceCents: null, discountBps: 9000 }, 1)).toBe(0) // 0.1 → 0
    expect(agreementPrice({ priceCents: 12345, discountBps: null }, 99999)).toBe(12345)
    expect(agreementPrice({ priceCents: null, discountBps: 500 }, null)).toBeNull()
  })
  it('the database rounds the same way (supply_round_div)', () => {
    expect(code).toContain('public.supply_round_div(sp::numeric * (10000 - p_agreement.discount_bps), 10000)')
  })
})

describe('overlap and no-loss rules', () => {
  it('dates overlap when they share a day; both end dates count; no end means open', async () => {
    const { agreementsOverlap } = await import('@/lib/supply/trade-prices')
    const d = (validFrom: string, validUntil: string | null) => ({ validFrom, validUntil })
    expect(agreementsOverlap(d('2026-10-01', '2026-10-31'), d('2026-10-31', null))).toBe(true)
    expect(agreementsOverlap(d('2026-10-01', '2026-10-30'), d('2026-10-31', null))).toBe(false)
    expect(agreementsOverlap(d('2026-10-01', null), d('2027-01-01', '2027-02-01'))).toBe(true)
    expect(agreementsOverlap(d('2026-11-01', '2026-11-30'), d('2026-10-01', '2026-10-31'))).toBe(false)
  })
  it('the database refuses overlaps for the same customer and item (inclusive ranges), and only for active agreements', () => {
    expect(code).toContain("daterange(x.valid_from, x.valid_until, '[]') && daterange(new.valid_from, new.valid_until, '[]')")
    expect(code).toContain('x.product_id is not distinct from new.product_id and x.category_id is not distinct from new.category_id')
    expect(code).toContain("x.trade_account_id = new.trade_account_id and x.status = 'active' and x.id <> new.id")
    expect(code).toMatch(/perform 1 from public\.trade_accounts t where t\.id = new\.trade_account_id for update/)
  })
  it('below the partner payable is refused (product, and every product a category covers)', async () => {
    const { belowPayable } = await import('@/lib/supply/trade-prices')
    expect(belowPayable(69999, 70000)).toBe(true)
    expect(belowPayable(70000, 70000)).toBe(false)
    expect(belowPayable(100, null)).toBe(false)
    expect(code).toContain('public.trade_agreement_price(new, pr.id) < public.supply_product_payable_floor(pr.id)')
    expect(code).toMatch(/pr\.category_id = new\.category_id or c\.parent_id = new\.category_id/)
    // The reservation keeps the S6-3 check, with the trade price as the suggestion.
    expect(code).toContain("raise exception 'A customer price is below what HagerLand pays the partner for that item'")
  })
  it('the agreement table: one target, one price, discount 1–9000, dates in order, an end needs a reason', () => {
    expect(code).toContain('constraint trade_price_agreements_one_target check ((product_id is null) <> (category_id is null))')
    expect(code).toContain('constraint trade_price_agreements_one_price check ((price_cents is null) <> (discount_bps is null))')
    expect(code).toContain('discount_bps int check (discount_bps between 1 and 9000)')
    expect(code).toContain('constraint trade_price_agreements_dates check (valid_until is null or valid_until >= valid_from)')
    expect(code).toContain("valid_from date not null default ((now() at time zone 'Africa/Addis_Ababa')::date)")
  })
  it('admin input: price for a product, price or discount for a category, 0.01–90%, whole cents and basis points', async () => {
    const { agreementInputSchema, agreementRow } = await import('@/lib/supply/trade-prices')
    const base = { target: 'product', product_id: '00000000-0000-4000-8000-000000000001', kind: 'price', price_etb: '1,250.505', valid_from: '2026-10-29' }
    const ok = agreementInputSchema.parse(base)
    expect(agreementRow(ok)).toMatchObject({ product_id: base.product_id, category_id: null, price_cents: 125051, discount_bps: null, valid_until: null })
    expect(agreementInputSchema.safeParse({ ...base, kind: 'discount', discount_percent: '5' }).success).toBe(false)
    const cat = { target: 'category', category_id: '00000000-0000-4000-8000-000000000002', kind: 'discount', discount_percent: '12.5%', valid_from: '2026-10-29' }
    expect(agreementRow(agreementInputSchema.parse(cat))).toMatchObject({ category_id: cat.category_id, product_id: null, discount_bps: 1250, price_cents: null })
    expect(agreementInputSchema.safeParse({ ...cat, discount_percent: '90.5' }).success).toBe(false)
    expect(agreementInputSchema.safeParse({ ...cat, discount_percent: '0' }).success).toBe(false)
    expect(agreementInputSchema.safeParse({ ...cat, valid_until: '2026-10-28' }).success).toBe(false)
  })
  it('database refusals become plain admin messages', async () => {
    const { agreementError } = await import('@/lib/supply/trade-prices')
    expect(agreementError('Below what HagerLand pays the partner for: Portland cement')).toBe('Below what HagerLand pays the partner for: Portland cement. Choose a higher price or a smaller discount.')
    expect(agreementError('This customer already has a price for that item in those dates')).toMatch(/^This customer already has a price/)
    expect(agreementError(undefined)).toBe('The trade price could not be saved. Please try again.')
  })
})

describe('switch gating', () => {
  it('basket ordering needs both switches; trade prices need trade pricing', async () => {
    const { tradeOrderingOpen } = await import('@/lib/supply/trade-prices')
    expect(tradeOrderingOpen({ tradePricing: true, catalogueOrdering: true })).toBe(true)
    expect(tradeOrderingOpen({ tradePricing: true, catalogueOrdering: false })).toBe(false)
    expect(tradeOrderingOpen({ tradePricing: false, catalogueOrdering: true })).toBe(false)
    expect(tradeOrderingOpen({ tradePricing: false, catalogueOrdering: false })).toBe(false)
  })
  it('the switch stays locked off, needs catalogue ordering first, and shows AB’s note', async () => {
    const { NOT_YET_USED } = await import('@/lib/supply/partner-rules')
    expect(NOT_YET_USED).toContain('tradePricing')
    const action = read('app/roodber8/actions/supply-switches.ts')
    expect(action).toContain("parsed.data.which === 'tradePricing' && !(await readSupplySwitches()).catalogueOrdering) return fail('Switch on catalogue ordering first.')")
    expect(read('app/roodber8/supply/switches/page.tsx')).toContain('Waits for HagerLand Ltd (Ethiopia), a bank account and VAT registration.')
  })
  it('my_trade_prices and the reservation read the switch in the database; the API and pages read it too', () => {
    expect(code).toMatch(/my_trade_prices[\s\S]*st\.key = 'supply_trade_pricing' and st\.value = 'true'::jsonb/)
    expect(code).toMatch(/v_trade := r\.requester_user_id is not null\s+and exists \(select 1 from public\.site_settings st where st\.key = 'supply_trade_pricing'/)
    expect(read('app/api/trade-prices/route.ts')).toContain("if (!(await readSupplySwitches()).tradePricing) return NextResponse.json({ prices: {} }, { headers })")
    expect(read('app/(site)/supplies/product/[slug]/page.tsx')).toContain('{tradePricing ? <TradePrice productId={p.id} unit={unitLabel(p.unit, 1)} /> : <TradePrice productId={p.id} />}')
    expect(read('app/(account)/account/trade-orders/page.tsx')).toContain('if (!(await readSupplySwitches()).tradePricing || !(await approvedTradeAccount(user.id))) notFound()')
    expect(read('lib/supply/trade-prices-data.ts')).toContain('if (!tradeOrderingOpen(await readSupplySwitches())) return false')
  })
  it('switch Off: the general trade price path is exactly as before (product_trade_prices, same text)', () => {
    const route = read('app/api/trade-prices/route.ts')
    expect(route).toContain("const { data } = await getServerSupabase().rpc('product_trade_prices', { p_ids: ids.data })")
    expect(read('components/supplies/TradePrice.tsx')).toContain('`Your trade price: ${formatETBCents(cents)}`')
    expect(code).not.toContain('product_trade_prices')
  })
})

describe('approved customer text (S6-4 brief, section 3, verbatim)', () => {
  it('product page, basket and account page', async () => {
    const { TRADE_TEXT } = await import('@/lib/supply/trade-prices')
    expect(TRADE_TEXT.productPrice(75000, 'bag')).toBe('Your trade price: ETB 750 per bag')
    expect(TRADE_TEXT.productPrice(83650, 'bag')).toBe('Your trade price: ETB 836.50 per bag')
    expect(TRADE_TEXT.basketButton).toBe('Request to order these items')
    expect(TRADE_TEXT.basketNote).toBe('No payment now. We check stock first, then reserve it for you.')
    expect(TRADE_TEXT.ordersHeading).toBe('Your trade orders')
    expect(TRADE_TEXT.ordersColumns).toEqual(['Reference', 'Date', 'Status', 'Total (ETB)', 'Paid (ETB)'])
    expect(TRADE_TEXT.ordersEmpty).toBe('No trade orders yet.')
    expect(TRADE_TEXT.waiting(125000)).toBe('Waiting for payment: ETB 1,250')
  })
  it('the order request form, status labels and emails are the S6-2 ones (no new email)', () => {
    expect(read('components/supplies/QuoteBasket.tsx')).toContain('<TradeOrderPanel items={items} onSent={clear} />')
    const panel = read('components/supplies/TradeOrderPanel.tsx')
    expect(panel).toContain('{CUSTOMER_TEXT.submit}')
    expect(panel).toContain('<OrderRequestFields errors={errors} />')
    expect(read('app/(account)/account/trade-orders/page.tsx')).toContain('customerStatusLabel({ status: r.status')
    const actions = read('app/actions/trade-order-actions.ts')
    expect(actions).toContain("await sendCustomerEmail(row.id, 'received', { link: canonicalUrl(path) })")
    expect(actions).not.toMatch(/templates'[\s\S]*tradeOrder/)
  })
})

describe('the customer’s trade orders', () => {
  it('received = payments less reversed payments (as order_request_received_cents)', async () => {
    const { receivedFrom } = await import('@/lib/supply/trade-prices-data')
    expect(
      receivedFrom([
        { id: 'a', entryType: 'customer_payment', amountCents: 50000, reversesEntryId: null },
        { id: 'b', entryType: 'customer_payment', amountCents: 20000, reversesEntryId: null },
        { id: 'c', entryType: 'reversal', amountCents: 20000, reversesEntryId: 'b' },
        { id: 'd', entryType: 'refund', amountCents: 5000, reversesEntryId: null },
        { id: 'e', entryType: 'moved_to_order', amountCents: 50000, reversesEntryId: null },
        { id: 'f', entryType: 'reversal', amountCents: 5000, reversesEntryId: 'd' },
      ]),
    ).toBe(50000)
  })
  it('waiting for payment: only a reserved request, never below zero', async () => {
    const { waitingCents, tradeOrderTotals } = await import('@/lib/supply/trade-prices-data')
    expect(waitingCents('reserved', 100000, 30000)).toBe(70000)
    expect(waitingCents('reserved', 100000, 120000)).toBe(0)
    expect(waitingCents('paid', 100000, 100000)).toBe(0)
    expect(waitingCents('checking_stock', null, 0)).toBe(0)
    const row = (status: 'reserved' | 'paid', paid: number, waiting: number) => ({ id: status, reference: '', createdAt: '', status, reservedUntil: null, totalCents: 0, paidCents: paid, waitingCents: waiting })
    expect(tradeOrderTotals([row('reserved', 30000, 70000), row('paid', 100000, 0)])).toEqual({ paidCents: 130000, waitingCents: 70000 })
  })
})

describe('owner only (admin)', () => {
  it('every trade price action checks the area and the owner', () => {
    const actions = read('app/roodber8/actions/trade-prices.ts')
    for (const fn of ['addTradePriceAction', 'endTradePriceAction']) {
      const body = actions.slice(actions.indexOf(`export async function ${fn}`))
      expect(body.slice(0, 400)).toMatch(/await assertAdmin\(AREA\)\s+await assertOwner\(\)/)
    }
  })
  it('the account page, the CSV and the list link are for the owner only', () => {
    expect(read('app/roodber8/trade-accounts/[id]/page.tsx')).toContain("if (!(await isOwnerSession())) redirect('/roodber8?denied=1')")
    const csv = read('app/roodber8/trade-accounts/prices/export/route.ts')
    expect(csv).toContain("if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })")
    // The account's reference and business name only: no phone, TIN, partner, cost or terms.
    expect(csv).toContain(".from('trade_accounts').select('id, reference, business_name')")
    expect(csv.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/phone|\btin\b|cost|payable|floor|terms_/i)
    expect(read('app/roodber8/trade-accounts/page.tsx')).toContain('owner ? (')
  })
  it('no new keeping period: trade price audit entries follow the general rule', async () => {
    const { auditKeep } = await import('@/lib/retention')
    expect(auditKeep('trade_price.add')).toBeNull()
    expect(auditKeep('trade_price.export')).toBeNull()
  })
})

describe('migration 0051', () => {
  it('additive: no drop of any kind, no deletion, no change to existing rows; records itself', () => {
    expect(code).not.toMatch(/\bdrop\b/i)
    expect(code).not.toMatch(/delete\s+from|^\s*truncate\b|\brename\b/im)
    // Outside function bodies (they run later, on new rows only): no update and no change to any other table.
    const outside = code.replace(/\$\$[\s\S]*?\$\$/g, '')
    expect(outside).not.toMatch(/^\s*update\s/im)
    expect(outside).not.toMatch(/alter table (?!public\.trade_price_agreements)/i)
    expect(code).toMatch(/^begin;[\s\S]*commit;\s*$/m)
    expect(code).toContain("values ('0051', 'trade_price_agreements')")
  })
  it('row level security on, no table grants; only my_trade_prices is for signed-in users (not visitors)', () => {
    expect(code).toContain('alter table public.trade_price_agreements enable row level security;')
    expect(code).toContain('revoke all on table public.trade_price_agreements from public, anon, authenticated;')
    expect(code).not.toMatch(/grant [^;]* on (table )?public\.trade_price_agreements/i)
    expect(code.match(/grant [^;]* to authenticated/gi)).toEqual(['grant execute on function public.my_trade_prices(uuid[]) to authenticated'])
    expect(code).not.toMatch(/grant [^;]* to anon/i)
    expect(code).toMatch(/create or replace function public\.my_trade_prices\(p_product_ids uuid\[\]\)[\s\S]*?security definer/)
  })
  it('my_trade_prices returns only the caller’s prices and never partners, costs or terms', () => {
    expect(code).toContain('returns table (product_id uuid, price_cents bigint, rule text)')
    expect(code).toContain('cross join lateral public.trade_effective_price_for((select auth.uid()), ids.id) t')
    expect(code).toContain("where t.user_id = p_user and t.status = 'approved' and not pr.is_suspended")
  })
  it('the reservation resets the trade price for every line and records an override with the trade flag', () => {
    expect(code).toMatch(/v_suggested := v_line\.customer_unit_cents;\s+v_trade_price := null;/)
    expect(code).toContain("'trade', v_trade_price is not null")
  })
  it('the health check expects 0051', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS[EXPECTED_MIGRATIONS.length - 1]).toBe('0051')
  })
})
