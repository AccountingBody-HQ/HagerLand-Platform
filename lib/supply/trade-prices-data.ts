import 'server-only'
// S6-4 per-customer trade prices: database reads for the customer (their own trade account and orders, never a partner,
// cost or terms) and for the owner's admin pages (agreements, previews, the CSV). Logs carry ids and counts only.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { tradeOrderingOpen, type TradePriceRule } from '@/lib/supply/trade-prices'
import type { OrderRequestStatus } from '@/lib/supply/order-requests'

/** The user's approved trade account (null for everyone else, including a suspended profile). */
export async function approvedTradeAccount(userId: string): Promise<{ id: string; reference: string } | null> {
  const db = getAdminSupabase()
  const [{ data: t }, { data: p }] = await Promise.all([
    db.from('trade_accounts').select('id, reference, status').eq('user_id', userId).maybeSingle(),
    db.from('profiles').select('is_suspended').eq('id', userId).maybeSingle(),
  ])
  return t && t.status === 'approved' && p && !p.is_suspended ? { id: t.id, reference: t.reference } : null
}

/**
 * Every basket item can be ordered by this trade customer now (D4): both switches on, an approved account, 1–50
 * catalogue items, each a published HagerLand Supply product with an active partner source.
 */
export async function tradeBasketOpen(userId: string, productIds: string[]): Promise<boolean> {
  const ids = Array.from(new Set(productIds))
  if (ids.length === 0 || ids.length > 50) return false
  if (!tradeOrderingOpen(await readSupplySwitches())) return false
  if (!(await approvedTradeAccount(userId))) return false
  const db = getAdminSupabase()
  const [{ data: products }, { data: sources }] = await Promise.all([
    db.from('products').select('id, status, seller:organisations(is_hagerland)').in('id', ids),
    db.from('product_sources').select('product_id').in('product_id', ids).eq('status', 'active'),
  ])
  const sourced = new Set((sources ?? []).map((s) => s.product_id))
  const fine = (products ?? []).filter((p) => p.status === 'published' && (p.seller as { is_hagerland: boolean } | null)?.is_hagerland && sourced.has(p.id))
  return fine.length === ids.length
}

// ---------------------------------------------------------------------------------------------------------------
// The customer's trade orders (their own order requests; amounts only)
// ---------------------------------------------------------------------------------------------------------------
export interface PaymentEntry {
  id: string
  entryType: string
  amountCents: number
  reversesEntryId: string | null
}

/** Money received from the customer: payments less reversed payments (0049 order_request_received_cents). */
export function receivedFrom(entries: PaymentEntry[]): number {
  const byId = new Map(entries.map((e) => [e.id, e]))
  return entries.reduce((sum, e) => {
    if (e.entryType === 'customer_payment') return sum + e.amountCents
    if (e.entryType === 'reversal' && e.reversesEntryId && byId.get(e.reversesEntryId)?.entryType === 'customer_payment') return sum - e.amountCents
    return sum
  }, 0)
}

/** What the customer still has to pay for a reserved request (nothing in any other state). */
export function waitingCents(status: OrderRequestStatus, totalCents: number | null, paidCents: number): number {
  return status === 'reserved' && totalCents !== null ? Math.max(totalCents - paidCents, 0) : 0
}

export interface TradeOrderRow {
  id: string
  reference: string
  createdAt: string
  status: OrderRequestStatus
  reservedUntil: string | null
  totalCents: number | null
  paidCents: number
  waitingCents: number
}

export async function loadTradeOrders(userId: string): Promise<TradeOrderRow[]> {
  const db = getAdminSupabase()
  const { data: requests } = await readAll(
    () => db.from('order_requests').select('id, reference, created_at, status, reserved_until, customer_total_cents').eq('requester_user_id', userId),
    { maxRows: REPORT_MAX_ROWS },
  )
  const { data: payments } = await readAllIn(
    requests.map((r) => r.id),
    (part) => db.from('order_request_payments').select('id, order_request_id, entry_type, amount_cents, reverses_entry_id').in('order_request_id', part),
    { maxRows: REPORT_MAX_ROWS },
  )
  return requests
    .map((r) => {
      const entries = payments.filter((p) => p.order_request_id === r.id).map((p) => ({ id: p.id, entryType: p.entry_type, amountCents: Number(p.amount_cents), reversesEntryId: p.reverses_entry_id }))
      const status = r.status as OrderRequestStatus
      const total = r.customer_total_cents === null ? null : Number(r.customer_total_cents)
      const paid = receivedFrom(entries)
      return { id: r.id, reference: r.reference, createdAt: r.created_at, status, reservedUntil: r.reserved_until, totalCents: total, paidCents: paid, waitingCents: waitingCents(status, total, paid) }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** Totals for the page: everything received, and the reserved requests' balance still to pay. */
export function tradeOrderTotals(rows: TradeOrderRow[]): { paidCents: number; waitingCents: number } {
  return { paidCents: rows.reduce((s, r) => s + r.paidCents, 0), waitingCents: rows.reduce((s, r) => s + r.waitingCents, 0) }
}

// ---------------------------------------------------------------------------------------------------------------
// Owner admin: agreements, the effective price preview and the CSV
// ---------------------------------------------------------------------------------------------------------------
export interface AgreementRow {
  id: string
  tradeAccountId: string
  productId: string | null
  productName: string | null
  categoryId: string | null
  categoryName: string | null
  priceCents: number | null
  discountBps: number | null
  validFrom: string
  validUntil: string | null
  status: 'active' | 'ended'
  note: string | null
  endReason: string | null
  endedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

const AGREEMENT_COLUMNS =
  'id, trade_account_id, product_id, category_id, price_cents, discount_bps, valid_from, valid_until, status, note, end_reason, ended_at, created_by, created_at, updated_at, product:products(name), category:product_categories(name)'

type AgreementDbRow = {
  id: string
  trade_account_id: string
  product_id: string | null
  category_id: string | null
  price_cents: number | null
  discount_bps: number | null
  valid_from: string
  valid_until: string | null
  status: string
  note: string | null
  end_reason: string | null
  ended_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  product: { name: string } | null
  category: { name: string } | null
}

function toAgreement(r: AgreementDbRow): AgreementRow {
  return {
    id: r.id,
    tradeAccountId: r.trade_account_id,
    productId: r.product_id,
    productName: r.product?.name ?? null,
    categoryId: r.category_id,
    categoryName: r.category?.name ?? null,
    priceCents: r.price_cents === null ? null : Number(r.price_cents),
    discountBps: r.discount_bps,
    validFrom: r.valid_from,
    validUntil: r.valid_until,
    status: r.status === 'ended' ? 'ended' : 'active',
    note: r.note,
    endReason: r.end_reason,
    endedAt: r.ended_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function loadAgreements(tradeAccountId?: string): Promise<AgreementRow[]> {
  const db = getAdminSupabase()
  const { data } = await readAll(
    () => {
      const q = db.from('trade_price_agreements').select(AGREEMENT_COLUMNS)
      return tradeAccountId ? q.eq('trade_account_id', tradeAccountId) : q
    },
    { maxRows: REPORT_MAX_ROWS },
  )
  return (data as unknown as AgreementDbRow[]).map(toAgreement).sort((a, b) => (a.status === b.status ? (a.createdAt < b.createdAt ? 1 : -1) : a.status === 'active' ? -1 : 1))
}

export interface PricePreview {
  productId: string
  productName: string
  priceCents: number | null
  rule: TradePriceRule | null
  suggestedCents: number | null
  floorCents: number | null
}

/**
 * The effective price today for the products an account's agreements cover (the same database step the customer and
 * the reservation use), with the partner payable it must stay above. Owner only: it shows what HagerLand pays.
 */
export async function previewPrices(userId: string, agreements: AgreementRow[]): Promise<PricePreview[]> {
  const db = getAdminSupabase()
  const active = agreements.filter((a) => a.status === 'active')
  const categoryIds = Array.from(new Set(active.map((a) => a.categoryId).filter((v): v is string => Boolean(v))))
  const productIds = new Set(active.map((a) => a.productId).filter((v): v is string => Boolean(v)))
  if (categoryIds.length) {
    const { data: children } = must(await db.from('product_categories').select('id').in('parent_id', categoryIds))
    const cats = categoryIds.concat((children ?? []).map((c) => c.id))
    const { data: inCats } = await readAllIn(cats, (part) => db.from('products').select('id').eq('status', 'published').in('category_id', part), { maxRows: REPORT_MAX_ROWS })
    const { data: sourced } = await readAllIn(inCats.map((p) => p.id), (part) => db.from('product_sources').select('id, product_id').eq('status', 'active').in('product_id', part), { maxRows: REPORT_MAX_ROWS })
    for (const s of sourced) productIds.add(s.product_id)
  }
  const ids = Array.from(productIds).slice(0, 100)
  const { data: products } = must(await db.from('products').select('id, name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']))
  const rows = await Promise.all(
    (products ?? []).map(async (p) => {
      const [eff, sug, floor] = await Promise.all([
        db.rpc('trade_effective_price_for', { p_user: userId, p_product: p.id }),
        db.rpc('supply_product_suggested_price', { p_product: p.id }),
        db.rpc('supply_product_payable_floor', { p_product: p.id }),
      ])
      for (const r of [eff, sug, floor]) if (r.error) throw new Error(r.error.message)
      const e = (eff.data ?? [])[0] as { price_cents: number; rule: string } | undefined
      return {
        productId: p.id,
        productName: p.name,
        priceCents: e ? Number(e.price_cents) : null,
        rule: (e?.rule as TradePriceRule | undefined) ?? null,
        suggestedCents: sug.data === null ? null : Number(sug.data),
        floorCents: floor.data === null ? null : Number(floor.data),
      }
    }),
  )
  return rows.sort((a, b) => a.productName.localeCompare(b.productName))
}

/** The partner payable for one product (the no-loss check shown before saving). */
export async function payableFloor(productId: string): Promise<number | null> {
  const { data, error } = await getAdminSupabase().rpc('supply_product_payable_floor', { p_product: productId })
  if (error) throw new Error(error.message)
  return data === null ? null : Number(data)
}
