// S6-4 per-customer trade prices (migration 0051). The same rules as the SQL functions trade_effective_price_for and
// trade_price_agreements_guard; a unit test runs the precedence and rounding cases.
//   - Precedence: the customer's product agreement → a category agreement (the product's own category, then its parent)
//     → the existing general trade price (products.trade_price_etb_cents) → none.
//   - A category discount applies to the price the partner's terms suggest (S6-3), half up to the cent.
//   - No loss: a candidate below the most HagerLand pays any active partner for the product is skipped (and refused when
//     the agreement is saved).
//   - Overlap: one active agreement per customer and product (or category) on any day; both end dates count.
// Customer wording is AB's approved text (S6-4 brief, section 3).
import { z } from 'zod'
import { formatETBCents } from '@/lib/format'
import { roundDiv } from '@/lib/supply/terms'
import { optionalText } from '@/lib/validation/common'

export type TradePriceRule = 'product_price' | 'category_price' | 'category_discount' | 'general_trade_price'

export interface Agreement {
  productId: string | null
  categoryId: string | null
  priceCents: number | null
  discountBps: number | null
  validFrom: string
  validUntil: string | null
  status: 'active' | 'ended'
  createdAt: string
}

export interface ProductForPrice {
  id: string
  categoryId: string | null
  parentCategoryId: string | null
  generalTradeCents: number | null
  /** The suggested customer price of the primary active partner source (S6-3), null when there is none. */
  suggestedCents: number | null
  /** The most HagerLand pays any active partner per unit, null when no partner supplies it. */
  floorCents: number | null
}

/** Valid on that Addis Ababa date (YYYY-MM-DD), both ends included. */
export function agreementValidOn(a: Pick<Agreement, 'status' | 'validFrom' | 'validUntil'>, day: string): boolean {
  return a.status === 'active' && a.validFrom <= day && (a.validUntil === null || a.validUntil >= day)
}

/** One agreement's price for one product (a discount needs a suggested price). */
export function agreementPrice(a: Pick<Agreement, 'priceCents' | 'discountBps'>, suggestedCents: number | null): number | null {
  if (a.priceCents !== null) return a.priceCents
  if (a.discountBps === null || suggestedCents === null) return null
  return roundDiv(suggestedCents * (10000 - a.discountBps), 10000)
}

function ruleOf(a: Agreement): TradePriceRule {
  return a.productId !== null ? 'product_price' : a.priceCents !== null ? 'category_price' : 'category_discount'
}

/** The effective trade price for one product on one day (trade_effective_price_for in 0051). */
export function effectiveTradePrice(p: ProductForPrice, agreements: Agreement[], day: string): { priceCents: number; rule: TradePriceRule } | null {
  const fits = (cents: number | null): cents is number => cents !== null && (p.floorCents === null || cents >= p.floorCents)
  const rank = (a: Agreement) => (a.productId !== null ? 0 : a.categoryId === p.categoryId ? 1 : 2)
  const candidates = agreements
    .filter((a) => agreementValidOn(a, day) && (a.productId === p.id || (a.categoryId !== null && (a.categoryId === p.categoryId || a.categoryId === p.parentCategoryId))))
    .sort((x, y) => rank(x) - rank(y) || (y.createdAt > x.createdAt ? 1 : y.createdAt < x.createdAt ? -1 : 0))
  for (const a of candidates) {
    const cents = agreementPrice(a, p.suggestedCents)
    if (fits(cents)) return { priceCents: cents, rule: ruleOf(a) }
  }
  return fits(p.generalTradeCents) ? { priceCents: p.generalTradeCents, rule: 'general_trade_price' } : null
}

/** Two agreements for the same customer and item overlap when their dates share a day (end dates included). */
export function agreementsOverlap(a: Pick<Agreement, 'validFrom' | 'validUntil'>, b: Pick<Agreement, 'validFrom' | 'validUntil'>): boolean {
  return (a.validUntil === null || a.validUntil >= b.validFrom) && (b.validUntil === null || b.validUntil >= a.validFrom)
}

/** Below what HagerLand pays the partner (the S6-3 no-loss rule). */
export function belowPayable(priceCents: number | null, floorCents: number | null): boolean {
  return priceCents !== null && floorCents !== null && priceCents < floorCents
}

/** Both owner switches must be on for a trade customer to order from the basket (D4); trade prices need the first (D5). */
export function tradeOrderingOpen(s: { tradePricing: boolean; catalogueOrdering: boolean }): boolean {
  return s.tradePricing && s.catalogueOrdering
}

// ---------------------------------------------------------------------------------------------------------------
// Customer wording (approved text, verbatim)
// ---------------------------------------------------------------------------------------------------------------
export const TRADE_TEXT = {
  productPrice: (cents: number, unit: string) => `Your trade price: ${formatETBCents(cents)} per ${unit} (including VAT)`,
  basketButton: 'Request to order these items',
  basketNote: 'No payment now. We check stock first, then reserve it for you.',
  ordersHeading: 'Your trade orders',
  ordersColumns: ['Reference', 'Date', 'Status', 'Total (ETB)', 'Paid (ETB)'],
  ordersEmpty: 'No trade orders yet.',
  waiting: (cents: number) => `Waiting for payment: ${formatETBCents(cents)}`,
} as const

/** An amount under an "(ETB)" heading: "1,250.00". */
const plainCents = new Intl.NumberFormat('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function amountPlain(cents: number | null): string {
  return cents === null ? '' : plainCents.format(cents / 100)
}

/** Admin names for the rule that applied (house style). */
export const RULE_LABEL: Record<TradePriceRule, string> = {
  product_price: 'Agreed product price',
  category_price: 'Agreed category price',
  category_discount: 'Category discount',
  general_trade_price: 'General trade price',
}

// ---------------------------------------------------------------------------------------------------------------
// Admin input (owner only)
// ---------------------------------------------------------------------------------------------------------------
const blank = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v)
const money = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))),
  z.number({ error: 'Enter an amount' }).positive('Enter an amount').max(100_000_000).optional(),
)
const percent = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[%\s]/g, ''))),
  z.number({ error: 'Enter a percentage' }).min(0.01, 'Between 0.01% and 90%').max(90, 'Between 0.01% and 90%').optional(),
)

export const agreementInputSchema = z
  .object({
    target: z.enum(['product', 'category']),
    product_id: z.preprocess(blank, z.uuid().optional()),
    category_id: z.preprocess(blank, z.uuid().optional()),
    kind: z.enum(['price', 'discount']),
    price_etb: money,
    discount_percent: percent,
    valid_from: z.iso.date({ error: 'Choose a date' }),
    valid_until: z.preprocess(blank, z.iso.date().optional()),
    note: optionalText(500, 'Note'),
  })
  .superRefine((v, ctx) => {
    if (v.target === 'product' && !v.product_id) ctx.addIssue({ code: 'custom', path: ['product_id'], message: 'Choose the product' })
    if (v.target === 'category' && !v.category_id) ctx.addIssue({ code: 'custom', path: ['category_id'], message: 'Choose the category' })
    if (v.target === 'product' && v.kind === 'discount') ctx.addIssue({ code: 'custom', path: ['kind'], message: 'A product has an agreed price; discounts are for categories' })
    if (v.kind === 'price' && v.price_etb === undefined) ctx.addIssue({ code: 'custom', path: ['price_etb'], message: 'Enter an amount' })
    if (v.kind === 'discount' && v.discount_percent === undefined) ctx.addIssue({ code: 'custom', path: ['discount_percent'], message: 'Between 0.01% and 90%' })
    if (v.valid_until && v.valid_until < v.valid_from) ctx.addIssue({ code: 'custom', path: ['valid_until'], message: 'The end is before the start' })
  })
export type AgreementInput = z.infer<typeof agreementInputSchema>

/** The database row for a valid input (prices in cents, discounts in basis points; whole numbers only). */
export function agreementRow(v: AgreementInput) {
  return {
    product_id: v.target === 'product' ? (v.product_id ?? null) : null,
    category_id: v.target === 'category' ? (v.category_id ?? null) : null,
    price_cents: v.kind === 'price' && v.price_etb !== undefined ? Math.round(v.price_etb * 100) : null,
    discount_bps: v.kind === 'discount' && v.discount_percent !== undefined ? Math.round(v.discount_percent * 100) : null,
    valid_from: v.valid_from,
    valid_until: v.valid_until ?? null,
    note: v.note ?? null,
  }
}

/** Plain admin messages for the database refusals (0051 guard and checks). */
export function agreementError(message: string | undefined): string {
  const m = message ?? ''
  if (m.startsWith('Below what HagerLand pays the partner')) return `${m}. Choose a higher price or a smaller discount.`
  if (m.includes('already has a price for that item in those dates')) return 'This customer already has a price for that item in those dates. End it first, or choose other dates.'
  if (m.includes('approved trade accounts only')) return 'Trade prices are for approved trade accounts only.'
  return 'The trade price could not be saved. Please try again.'
}

export function discountLabel(bps: number): string {
  return `${(bps / 100).toString()}% off the suggested price`
}
