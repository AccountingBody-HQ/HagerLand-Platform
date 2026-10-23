// Supply Phase 5 (admin): demand, price trends, partner performance and report maths. Pure and deterministic (no
// database calls), unit-tested. Money is whole ETB cents and comes from lib/supply/money.ts; dates are YYYY-MM-DD in
// Ethiopian time (todayInAddis). A figure needs at least 3 data points before it is shown as a number.
import { addDays, daysBetween, freshness } from './offers'
import { hagerlandEarned, roundHalfUp, summariseLedger, type LedgerRow, type MoneyModel } from './money'
import { addisDate, tokenSimilarity } from './shortlist'

export const MIN_SAMPLE = 3
export const NOT_ENOUGH = 'Not enough history yet'

export interface Metric {
  value: number | null
  /** How many data points the figure is based on. */
  n: number
  enough: boolean
}

export function metric(value: number | null, n: number): Metric {
  return { value: n > 0 ? value : null, n, enough: n >= MIN_SAMPLE && value !== null }
}

/** Middle value; with an even count, the average of the two middle values. */
export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Change from one value to another in percent, one decimal; null when there is nothing to compare with. */
export function changePercent(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null
  return Math.round(((to - from) / from) * 1000) / 10
}

export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null
}

/* ------------------------------------------------------------------ Demand ------------------------------------------------------------------ */

export interface DemandItem {
  quoteId: string
  itemId: string
  categoryId: string | null
  categoryName: string | null
  name: string
  itemKey: string
  unit: string
  quantity: number
  /** The quote's delivery place, nearest first (Bole, Addis Ababa, …); empty when not given. */
  places: { id: string; name: string }[]
}

export interface DemandGroup {
  key: string
  categoryName: string | null
  name: string
  itemKey: string
  unit: string
  categoryId: string | null
  quantity: number
  requests: number
  items: DemandItem[]
}

/** The same item (category, normalised name and unit) across quotes: total quantity and how many quotes asked. */
export function groupDemand(items: DemandItem[]): DemandGroup[] {
  const groups = new Map<string, DemandGroup>()
  for (const it of items) {
    const key = `${it.categoryId ?? ''}|${it.itemKey}|${it.unit}`
    const g = groups.get(key) ?? { key, categoryName: it.categoryName, name: it.name, itemKey: it.itemKey, unit: it.unit, categoryId: it.categoryId, quantity: 0, requests: 0, items: [] }
    g.quantity += it.quantity
    g.items.push(it)
    groups.set(key, g)
  }
  return Array.from(groups.values())
    .map((g) => ({ ...g, requests: new Set(g.items.map((i) => i.quoteId)).size }))
    .sort((a, b) => b.requests - a.requests || b.quantity - a.quantity || a.name.localeCompare(b.name) || a.key.localeCompare(b.key))
}

/** Requests by delivery area (the quote's own place: a sub-city in Addis Ababa, or a town). */
export function demandByArea(items: DemandItem[]): { area: string; requests: number; items: number }[] {
  const areas = new Map<string, { quotes: Set<string>; items: number }>()
  for (const it of items) {
    const area = it.places[0]?.name ?? 'No delivery place given'
    const a = areas.get(area) ?? { quotes: new Set<string>(), items: 0 }
    a.quotes.add(it.quoteId)
    a.items++
    areas.set(area, a)
  }
  return Array.from(areas.entries())
    .map(([area, a]) => ({ area, requests: a.quotes.size, items: a.items }))
    .sort((a, b) => b.requests - a.requests || b.items - a.items || a.area.localeCompare(b.area))
}

export interface FunnelLine {
  itemId: string
  status: string
  askedAt: string | null
  receivedAt: string | null
}

export interface Funnel {
  requested: number
  asked: number
  replied: number
  chosen: number
  ordered: number
  completed: number
}

/** How far each requested item got: asked a supplier → a reply → a supplier chosen → in an order → order completed. */
export function demandFunnel(itemIds: string[], lines: FunnelLine[], orderedItemIds: Set<string>, completedItemIds: Set<string>): Funnel {
  const ids = new Set(itemIds)
  const with_ = (test: (l: FunnelLine) => boolean) => new Set(lines.filter((l) => ids.has(l.itemId) && test(l)).map((l) => l.itemId)).size
  return {
    requested: ids.size,
    asked: with_((l) => l.askedAt !== null),
    replied: with_((l) => l.receivedAt !== null),
    chosen: with_((l) => l.status === 'chosen'),
    ordered: Array.from(ids).filter((id) => orderedItemIds.has(id)).length,
    completed: Array.from(ids).filter((id) => completedItemIds.has(id)).length,
  }
}

export interface CoverOffer {
  categoryId: string | null
  itemKey: string
  status: string
  validUntil: string
  deliveryAreaIds: string[]
}

export interface Unmet {
  group: DemandGroup
  reason: string
}

function matches(offer: CoverOffer, g: DemandGroup): boolean {
  if (g.categoryId && offer.categoryId && offer.categoryId !== g.categoryId) return false
  return offer.itemKey === g.itemKey || tokenSimilarity(offer.itemKey, g.itemKey) >= 0.6
}

/**
 * Requested items nobody can supply yet: no current (unexpired) price from any partner, or no partner with a price
 * delivers to where it was asked for. The reason says which, in plain words.
 */
export function unmetDemand(groups: DemandGroup[], offers: CoverOffer[], today: string): Unmet[] {
  const out: Unmet[] = []
  for (const g of groups) {
    const live = offers.filter((o) => o.status === 'current' && o.validUntil >= today && matches(o, g))
    if (!live.length) {
      out.push({ group: g, reason: offers.some((o) => o.status === 'current' && matches(o, g)) ? 'Only expired prices: no partner has a current price' : 'No partner has a price for this item' })
      continue
    }
    const missed = Array.from(new Set(g.items.filter((it) => it.places.length && !live.some((o) => it.places.some((p) => o.deliveryAreaIds.includes(p.id)))).map((it) => it.places[0].name))).sort()
    if (missed.length) out.push({ group: g, reason: `No partner with a current price delivers to ${missed.join(', ')}` })
  }
  return out
}

/* --------------------------------------------------------------- Price trends --------------------------------------------------------------- */

export interface TrendOffer {
  orgId: string
  categoryName: string | null
  name: string
  itemKey: string
  unit: string
  priceCents: number
  priceDate: string
  validUntil: string
  status: string
  capturedAt: string
  fxLinked: boolean
  vatIncluded: string
}

export interface PriceTrend {
  key: string
  name: string
  categoryName: string | null
  unit: string
  partners: number
  lowestCents: number | null
  medianCents: number | null
  highestCents: number | null
  change30: number | null
  change90: number | null
  expired: number
  fxLinked: boolean
  vatUnknown: boolean
  /** Median price in force at the end of each of the last 6 months (oldest first). */
  monthly: { month: string; medianCents: number | null }[]
}

/** The price each partner had in force on a date: their latest price dated on or before it (withdrawn prices excluded). */
function medianInForce(offers: TrendOffer[], date: string): number | null {
  const latest = new Map<string, TrendOffer>()
  for (const o of offers) {
    if (o.priceDate > date) continue
    const prev = latest.get(o.orgId)
    if (!prev || o.priceDate > prev.priceDate || (o.priceDate === prev.priceDate && o.capturedAt > prev.capturedAt)) latest.set(o.orgId, o)
  }
  const m = median(Array.from(latest.values()).map((o) => o.priceCents))
  return m === null ? null : roundHalfUp(m)
}

function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

export function priceTrends(all: TrendOffer[], today: string): PriceTrend[] {
  const offers = all.filter((o) => o.status !== 'withdrawn')
  const groups = new Map<string, TrendOffer[]>()
  for (const o of offers) groups.set(`${o.itemKey}|${o.unit}`, [...(groups.get(`${o.itemKey}|${o.unit}`) ?? []), o])
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - (5 - i))
    return d.toISOString().slice(0, 7)
  })
  return Array.from(groups.entries())
    .map(([key, list]) => {
      const current = list.filter((o) => o.status === 'current')
      const prices = current.map((o) => o.priceCents)
      const now = median(prices)
      const first = current[0] ?? list[0]
      return {
        key,
        name: first.name,
        categoryName: first.categoryName,
        unit: first.unit,
        partners: new Set(current.map((o) => o.orgId)).size,
        lowestCents: prices.length ? Math.min(...prices) : null,
        medianCents: now === null ? null : roundHalfUp(now),
        highestCents: prices.length ? Math.max(...prices) : null,
        change30: changePercent(medianInForce(list, addDays(today, -30)), now === null ? null : roundHalfUp(now)),
        change90: changePercent(medianInForce(list, addDays(today, -90)), now === null ? null : roundHalfUp(now)),
        expired: current.filter((o) => o.validUntil < today).length,
        fxLinked: current.some((o) => o.fxLinked),
        vatUnknown: current.some((o) => o.vatIncluded === 'unknown'),
        monthly: months.map((month) => ({ month, medianCents: medianInForce(list, month === today.slice(0, 7) ? today : monthEnd(month)) })),
      }
    })
    .filter((t) => t.partners > 0)
    .sort((a, b) => b.partners - a.partners || a.name.localeCompare(b.name) || a.key.localeCompare(b.key))
}

/* ----------------------------------------------------------- Partner performance ----------------------------------------------------------- */

export interface PerfLine {
  quoteItemId: string | null
  status: string
  askedAt: string | null
  receivedAt: string | null
  totalCents: number | null
}

export interface PerfOrder {
  status: string
  placedAt: string | null
  confirmedAt: string | null
  deliveredAt: string | null
  promisedOn: string | null
  everDisputed: boolean
  hasProof: boolean
}

export interface PartnerPerformance {
  asked: number
  replyRate: Metric
  medianReplyHours: Metric
  cheapestRate: Metric
  averageAboveCheapestPercent: Metric
  chosen: number
  orders: number
  onTimeRate: Metric
  medianConfirmHours: Metric
  disputes: number
  completedWithoutProof: number
  prices: { current: number; fresh: number; ageing: number; expired: number }
  contactsDue: number
  reverifyDue: boolean
  /** Counts behind the reliability score. */
  replied: number
  deliveredWithPromise: number
  onTime: number
  placedOrders: number
}

const HOUR = 3_600_000
const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / HOUR

/**
 * A partner's track record. `cheapest` maps each quote item to every partner's reply totals for it, so this partner's
 * reply can be compared with the cheapest. Contacts are due for re-confirmation 6 months after they were last contacted.
 */
export function partnerPerformance(p: {
  lines: PerfLine[]
  cheapest: Map<string, number[]>
  orders: PerfOrder[]
  offers: { priceDate: string; validUntil: string; status: string }[]
  contacts: { lastContactedAt: string | null; createdAt: string; doNotContact: boolean }[]
  reverifyBy: string | null
  today: string
}): PartnerPerformance {
  const asked = p.lines.filter((l) => l.askedAt)
  const replied = asked.filter((l) => l.receivedAt)
  const compared = replied.filter((l) => l.quoteItemId && l.totalCents !== null && (p.cheapest.get(l.quoteItemId)?.length ?? 0) >= 2)
  const above = compared.map((l) => {
    const min = Math.min(...(p.cheapest.get(l.quoteItemId as string) ?? []))
    return min > 0 ? (((l.totalCents as number) - min) / min) * 100 : 0
  })
  const delivered = p.orders.filter((o) => o.deliveredAt && o.promisedOn)
  // Delivered on or before the promised day, by the date in Addis Ababa (a delivery at 23:30 there is still that day).
  const onTime = delivered.filter((o) => addisDate(o.deliveredAt as string) <= (o.promisedOn as string))
  const confirmed = p.orders.filter((o) => o.placedAt && o.confirmedAt)
  const placed = p.orders.filter((o) => o.placedAt)
  const current = p.offers.filter((o) => o.status === 'current')
  const fresh = current.map((o) => freshness(o.priceDate, o.validUntil, p.today))
  const sixMonthsAgo = addDays(p.today, -182)
  return {
    asked: asked.length,
    replyRate: metric(ratio(replied.length, asked.length), asked.length),
    medianReplyHours: metric(median(replied.map((l) => hoursBetween(l.askedAt as string, l.receivedAt as string))), replied.length),
    cheapestRate: metric(ratio(compared.filter((_, i) => above[i] <= 0).length, compared.length), compared.length),
    averageAboveCheapestPercent: metric(above.length ? Math.round((above.reduce((s, x) => s + x, 0) / above.length) * 10) / 10 : null, above.length),
    chosen: p.lines.filter((l) => l.status === 'chosen').length,
    orders: p.orders.length,
    onTimeRate: metric(ratio(onTime.length, delivered.length), delivered.length),
    medianConfirmHours: metric(median(confirmed.map((o) => hoursBetween(o.placedAt as string, o.confirmedAt as string))), confirmed.length),
    disputes: p.orders.filter((o) => o.everDisputed).length,
    completedWithoutProof: p.orders.filter((o) => o.status === 'completed' && !o.hasProof).length,
    prices: { current: current.length, fresh: fresh.filter((f) => f === 'fresh').length, ageing: fresh.filter((f) => f === 'ageing').length, expired: fresh.filter((f) => f === 'expired').length },
    contactsDue: p.contacts.filter((c) => !c.doNotContact && addisDate(c.lastContactedAt ?? c.createdAt) < sixMonthsAgo).length,
    reverifyDue: Boolean(p.reverifyBy && p.reverifyBy <= p.today),
    replied: replied.length,
    deliveredWithPromise: delivered.length,
    onTime: onTime.length,
    placedOrders: placed.length,
  }
}

/** Weights of the reliability score: replying to requests, delivering on time, and orders without problems. */
export const RELIABILITY_WEIGHTS = { reply: 0.4, onTime: 0.4, noDispute: 0.2 } as const

/**
 * Reliability 0–100: the weighted average of reply rate (40%), on-time delivery rate (40%) and share of placed orders
 * without a problem (20%), using only the parts that have data. Shown only with at least 3 data points (requests asked
 * plus deliveries with a promised date); otherwise null ("No delivery history yet").
 */
export function reliability(p: Pick<PartnerPerformance, 'asked' | 'replied' | 'deliveredWithPromise' | 'onTime' | 'placedOrders' | 'disputes'>): { score: number; reason: string } | null {
  if (p.asked + p.deliveredWithPromise < MIN_SAMPLE) return null
  const parts: [number, number][] = []
  if (p.asked) parts.push([p.replied / p.asked, RELIABILITY_WEIGHTS.reply])
  if (p.deliveredWithPromise) parts.push([p.onTime / p.deliveredWithPromise, RELIABILITY_WEIGHTS.onTime])
  if (p.placedOrders) parts.push([1 - Math.min(p.disputes, p.placedOrders) / p.placedOrders, RELIABILITY_WEIGHTS.noDispute])
  const weight = parts.reduce((s, [, w]) => s + w, 0)
  const score = Math.round((parts.reduce((s, [v, w]) => s + v * w, 0) / weight) * 100)
  const reason = [
    p.asked ? `Replied to ${p.replied} of ${p.asked} request${p.asked === 1 ? '' : 's'}` : null,
    p.deliveredWithPromise ? `${p.onTime} of ${p.deliveredWithPromise} deliveries on time` : null,
    p.disputes ? `${p.disputes} problem${p.disputes === 1 ? '' : 's'} reported` : null,
  ]
    .filter(Boolean)
    .join('; ')
  return { score, reason: `${reason}.` }
}

/* ------------------------------------------------------------- Commission ageing ------------------------------------------------------------- */

export const AGEING_BUCKETS = ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days'] as const
export type AgeingBucket = (typeof AGEING_BUCKETS)[number]

export function ageingBucket(days: number): AgeingBucket {
  if (days <= 30) return '0–30 days'
  if (days <= 60) return '31–60 days'
  if (days <= 90) return '61–90 days'
  return 'Over 90 days'
}

export interface OrderLedger {
  orderId: string
  model: MoneyModel
  entries: (LedgerRow & { occurred_on: string })[]
}

/** Commission still owed per order (recorded due minus received, reversals applied), aged from the first due date. */
export function commissionOutstanding(orders: OrderLedger[], today: string): { orderId: string; outstandingCents: number; dueOn: string; days: number; bucket: AgeingBucket }[] {
  const out: { orderId: string; outstandingCents: number; dueOn: string; days: number; bucket: AgeingBucket }[] = []
  for (const o of orders) {
    const s = summariseLedger(o.entries)
    const outstanding = s.commissionDue - s.commissionReceived
    const dues = o.entries.filter((e) => e.entry_type === 'commission_due').map((e) => e.occurred_on).sort()
    if (outstanding > 0 && dues.length) {
      const days = daysBetween(dues[0], today)
      out.push({ orderId: o.orderId, outstandingCents: outstanding, dueOn: dues[0], days, bucket: ageingBucket(days) })
    }
  }
  return out.sort((a, b) => b.days - a.days || a.orderId.localeCompare(b.orderId))
}

/**
 * Two independent ways to the same total for a period: HagerLand earned per order (money.ts rules) plus unlinked
 * fees and adjustments, against the plain sum of money in minus money out in the ledger. They must be equal.
 */
export function reconcile(entries: (LedgerRow & { order_id: string | null })[], models: Map<string, MoneyModel>): { earnedCents: number; ledgerNetCents: number; reconciles: boolean } {
  const byOrder = new Map<string, LedgerRow[]>()
  const unlinked: LedgerRow[] = []
  for (const e of entries) {
    if (e.order_id) byOrder.set(e.order_id, [...(byOrder.get(e.order_id) ?? []), e])
    else unlinked.push(e)
  }
  let earned = hagerlandEarned('B', summariseLedger(unlinked))
  for (const [orderId, rows] of Array.from(byOrder.entries())) earned += hagerlandEarned(models.get(orderId) ?? 'A', summariseLedger(rows))
  const byId = new Map(entries.map((e) => [e.id, e]))
  let net = 0
  for (const e of entries) {
    // A reversal of an entry from an earlier period is left out of both totals (summariseLedger cannot see its original).
    if (e.entry_type === 'reversal' && !byId.get(e.reverses_entry_id ?? '')) continue
    if (e.direction === 'in') net += e.amount_cents
    else if (e.direction === 'out') net -= e.amount_cents
  }
  return { earnedCents: earned, ledgerNetCents: net, reconciles: earned === net }
}
