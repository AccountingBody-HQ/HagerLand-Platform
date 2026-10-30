// Supply Phase 3 (admin): which partners could supply each item of a customer's quote, cheapest delivered first, with
// a plain-English reason for every suggestion and every partner left out. Pure and deterministic: no database calls,
// so the same input always gives the same output (unit-tested). Money is in whole ETB cents throughout.
import { daysBetween, freshness, normaliseUnit, type Freshness } from './offers'
import { unitLabel } from '@/lib/units'

export interface ShortlistItem {
  id: string
  name: string
  itemKey: string
  productId: string | null
  categoryId: string | null
  quantity: number
  unit: string
}

export interface ShortlistPartner {
  orgId: string
  name: string
  status: string
  /** Every contact recorded for the partner asked not to be contacted. */
  doNotContact: boolean
  /** From partner performance (lib/supply/insights.ts reliability()); null with fewer than 3 data points. */
  reliability?: { score: number; reason: string } | null
}

export interface ShortlistOffer {
  id: string
  orgId: string
  branchId: string | null
  productId: string | null
  categoryId: string | null
  itemKey: string
  unit: string
  packSize: number | null
  priceCents: number
  priceDate: string
  validUntil: string
  minOrderQty: number | null
  deliveryAreaIds: string[]
  deliveryChargeCents: number | null
  leadTimeDays: number | null
  vatIncluded: string
  fxLinked: boolean
  status: string
}

export interface ShortlistInput {
  items: ShortlistItem[]
  partners: ShortlistPartner[]
  offers: ShortlistOffer[]
  /** The quote's delivery place and every place above it (sub-city, city, region…); empty when the quote has none. */
  locationIds: string[]
  /** Names for the places above, to say "Delivers to Bole". */
  locationNames: Record<string, string>
  today: string
  neededBy: string | null
}

export interface Candidate {
  orgId: string
  partnerName: string
  offerId: string
  branchId: string | null
  trial: boolean
  similarName: boolean
  unit: string
  unitPriceCents: number
  quantity: number
  deliveryChargeCents: number
  deliveredTotalCents: number
  priceDate: string
  validUntil: string
  freshness: Freshness
  leadTimeDays: number | null
  /** Reliability 0–100 (lib/supply/insights.ts); null until the partner has at least 3 data points. */
  reliability: number | null
  reliabilityReason: string | null
  doNotContact: boolean
  flags: string[]
  reason: string
}

export interface Excluded {
  orgId: string
  partnerName: string
  reason: string
}

export interface ItemShortlist {
  itemId: string
  candidates: Candidate[]
  excluded: Excluded[]
}

const STATUS_WORDS: Record<string, string> = {
  discovered: 'Not contacted yet',
  contacted: 'Contacted, not yet interested',
  interested: 'Interested, terms not agreed yet',
  inactive: 'Inactive partner',
  declined: 'Declined to work with us',
  do_not_contact: 'Asked not to be contacted',
  needs_reverification: 'Details need checking again',
}

export const SIMILARITY_THRESHOLD = 0.6

/** Share of the shorter name's words that the other name also has (0 to 1). */
export function tokenSimilarity(a: string, b: string): number {
  const x = new Set(a.split(' ').filter(Boolean))
  const y = new Set(b.split(' ').filter(Boolean))
  if (!x.size || !y.size) return 0
  let shared = 0
  for (const t of Array.from(x)) if (y.has(t)) shared++
  return shared / Math.min(x.size, y.size)
}

/** "ETB 12,500.00". */
export function formatEtbExact(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}ETB ${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`
}

/** Today's date in Ethiopia (YYYY-MM-DD). */
export function todayInAddis(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** The moment (UTC ISO) an Ethiopian calendar day begins: midnight in Addis Ababa (UTC+3, no daylight saving). */
export function addisDayStart(day: string): string {
  return new Date(`${day}T00:00:00+03:00`).toISOString()
}

/** The Ethiopian calendar date (YYYY-MM-DD) of a moment, e.g. 2026-10-10T21:01Z is already 11 October in Addis Ababa. */
export function addisDate(moment: string | Date): string {
  return todayInAddis(typeof moment === 'string' ? new Date(moment) : moment)
}

/** True when a moment falls in a month (YYYY-MM) of the Ethiopian calendar date. */
export function inAddisMonth(moment: string | null, month: string): boolean {
  return Boolean(moment) && addisDate(moment as string).slice(0, 7) === month
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function ago(priceDate: string, today: string): string {
  const days = daysBetween(priceDate, today)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

function plural(qty: number, unit: string): string {
  return `${Number.isInteger(qty) ? qty : qty.toFixed(2)} ${unitLabel(unit, qty)}`
}

type Step = { ok: true; candidate: Omit<Candidate, 'reason'> & { place: string | null } } | { ok: false; stage: number; reason: string }

/** Runs one offer through the checks, in order; the first that fails gives the reason it is left out. */
function check(item: ShortlistItem, partner: ShortlistPartner, offer: ShortlistOffer, input: ShortlistInput): Step {
  const trial = partner.status === 'terms_agreed'
  if (partner.status !== 'active' && !trial) return { ok: false, stage: 0, reason: STATUS_WORDS[partner.status] ?? `Status: ${partner.status.replace(/_/g, ' ')}` }
  if (offer.status !== 'current') return { ok: false, stage: 1, reason: offer.status === 'withdrawn' ? 'No longer sells this item' : 'Only an older, replaced price' }

  let similarName = false
  if (!(item.productId && offer.productId && item.productId === offer.productId)) {
    if (item.categoryId && offer.categoryId !== item.categoryId) return { ok: false, stage: 2, reason: 'Different category' }
    if (offer.itemKey !== item.itemKey) {
      if (tokenSimilarity(offer.itemKey, item.itemKey) < SIMILARITY_THRESHOLD) return { ok: false, stage: 2, reason: 'Different item' }
      similarName = true
    }
  }

  const itemUnit = normaliseUnit(item.unit) ?? item.unit
  let quantity = item.quantity
  if (offer.unit !== itemUnit) {
    if (!offer.packSize) return { ok: false, stage: 3, reason: `Priced per ${unitLabel(offer.unit)}, quote asks in ${unitLabel(itemUnit, 2)}; no pack size recorded` }
    // One offer unit holds `packSize` of the quote's unit; part packs cannot be bought.
    quantity = Math.ceil(item.quantity / offer.packSize)
  }

  let place: string | null = null
  if (input.locationIds.length) {
    if (!offer.deliveryAreaIds.length) return { ok: false, stage: 4, reason: 'No delivery areas recorded' }
    const area = input.locationIds.find((id) => offer.deliveryAreaIds.includes(id))
    if (!area) return { ok: false, stage: 4, reason: `Does not deliver to ${input.locationNames[input.locationIds[0]] ?? 'the delivery place'}` }
    place = input.locationNames[input.locationIds[0]] ?? input.locationNames[area] ?? null
  }

  if (offer.minOrderQty !== null && quantity < offer.minOrderQty) return { ok: false, stage: 5, reason: `Minimum order ${plural(offer.minOrderQty, offer.unit)}; quote asks for ${plural(quantity, offer.unit)}` }
  if (offer.validUntil < input.today) return { ok: false, stage: 6, reason: `Price expired ${shortDate(offer.validUntil)}` }

  const deliveryChargeCents = offer.deliveryChargeCents ?? 0
  const fresh = freshness(offer.priceDate, offer.validUntil, input.today)
  const flags: string[] = []
  if (similarName) flags.push('Similar name: check it is the same item')
  if (offer.unit !== itemUnit) flags.push(`Converted to ${plural(quantity, offer.unit)} (pack of ${offer.packSize})`)
  if (fresh === 'ageing') flags.push('Price is ageing')
  if (offer.vatIncluded === 'unknown') flags.push('VAT not known')
  if (offer.vatIncluded === 'no') flags.push('VAT on top')
  if (offer.fxLinked) flags.push('Imported or foreign-currency price')
  if (!input.locationIds.length) flags.push('The quote has no delivery place: check delivery')
  if (partner.doNotContact) flags.push('Do not contact')
  return {
    ok: true,
    candidate: {
      orgId: partner.orgId,
      partnerName: partner.name,
      offerId: offer.id,
      branchId: offer.branchId,
      trial,
      similarName,
      unit: offer.unit,
      unitPriceCents: offer.priceCents,
      quantity,
      deliveryChargeCents,
      deliveredTotalCents: Math.round(offer.priceCents * quantity) + deliveryChargeCents,
      priceDate: offer.priceDate,
      validUntil: offer.validUntil,
      freshness: fresh,
      leadTimeDays: offer.leadTimeDays,
      reliability: partner.reliability?.score ?? null,
      reliabilityReason: partner.reliability?.reason ?? null,
      doNotContact: partner.doNotContact,
      flags,
      place,
    },
  }
}

function lateFor(c: { leadTimeDays: number | null }, input: ShortlistInput): number {
  if (!input.neededBy || c.leadTimeDays === null) return 0
  return daysBetween(input.today, input.neededBy) < c.leadTimeDays ? 1 : 0
}

/** Cheapest delivered total, then newer price, then more reliable (no history counts last), then on time and shorter lead time, then name. */
function compare(a: Omit<Candidate, 'reason'>, b: Omit<Candidate, 'reason'>, input: ShortlistInput): number {
  return (
    a.deliveredTotalCents - b.deliveredTotalCents ||
    b.priceDate.localeCompare(a.priceDate) ||
    (b.reliability ?? -1) - (a.reliability ?? -1) ||
    lateFor(a, input) - lateFor(b, input) ||
    (a.leadTimeDays ?? Number.MAX_SAFE_INTEGER) - (b.leadTimeDays ?? Number.MAX_SAFE_INTEGER) ||
    a.partnerName.localeCompare(b.partnerName) ||
    a.orgId.localeCompare(b.orgId) ||
    a.offerId.localeCompare(b.offerId)
  )
}

export function shortlist(input: ShortlistInput): ItemShortlist[] {
  const partners = new Map(input.partners.map((p) => [p.orgId, p]))
  return input.items.map((item) => {
    const best = new Map<string, Omit<Candidate, 'reason'> & { place: string | null }>()
    const failed = new Map<string, { stage: number; reason: string }>()
    for (const offer of input.offers) {
      const partner = partners.get(offer.orgId)
      if (!partner) continue
      // Only offers for the same item (or a similar name) say anything about this item.
      const related = (item.productId && offer.productId === item.productId) || offer.itemKey === item.itemKey || tokenSimilarity(offer.itemKey, item.itemKey) >= SIMILARITY_THRESHOLD
      if (!related) continue
      const step = check(item, partner, offer, input)
      if (step.ok) {
        const current = best.get(partner.orgId)
        if (!current || compare(step.candidate, current, input) < 0) best.set(partner.orgId, step.candidate)
      } else {
        const prev = failed.get(partner.orgId)
        // Keep the reason from the offer that got furthest through the checks (then the alphabetically first reason).
        if (!prev || step.stage > prev.stage || (step.stage === prev.stage && step.reason.localeCompare(prev.reason) < 0)) failed.set(partner.orgId, step)
      }
    }
    const ranked = Array.from(best.values()).sort((a, b) => compare(a, b, input))
    const candidates: Candidate[] = ranked.map(({ place, ...c }, i) => ({
      ...c,
      reason: [
        c.trial ? 'Trial partner (terms agreed).' : 'Active partner.',
        place ? `Delivers to ${place}.` : null,
        `Price checked ${ago(c.priceDate, input.today)}.`,
        i === 0 ? 'Cheapest delivered total.' : null,
        c.reliabilityReason ?? 'No delivery history yet.',
      ]
        .filter(Boolean)
        .join(' '),
    }))
    const excluded: Excluded[] = Array.from(failed.entries())
      .filter(([orgId]) => !best.has(orgId))
      .map(([orgId, f]) => ({ orgId, partnerName: partners.get(orgId)?.name ?? '', reason: f.reason }))
      .sort((a, b) => a.partnerName.localeCompare(b.partnerName) || a.orgId.localeCompare(b.orgId))
    return { itemId: item.id, candidates, excluded }
  })
}

export interface BasketOption {
  orgId: string
  partnerName: string
  /** Price × quantity plus this item's delivery charge. */
  totalCents: number
  /** The delivery charge included in totalCents. */
  deliveryCents: number
}

export interface Basket {
  /** totalCents counts one delivery per partner (their highest charge); separateTotalCents counts every item's delivery. */
  partners: { orgId: string; partnerName: string; itemsCovered: number; totalCents: number; separateTotalCents: number; coversAll: boolean }[]
  split: { totalCents: number; picks: { itemId: string; orgId: string; partnerName: string }[]; itemsWithoutPrice: string[] }
  recommendation: { kind: 'single'; orgId: string; partnerName: string; totalCents: number } | { kind: 'split' } | { kind: 'none' }
  explanation: string
}

export const SINGLE_PARTNER_TOLERANCE_PERCENT = 3
export const ONE_DELIVERY_NOTE = 'Estimated as one delivery — confirm with the supplier'

/** Goods for every option plus one delivery: the highest charge among them (one truck per supplier). */
function oneDelivery(options: BasketOption[]): number {
  return options.reduce((sum, o) => sum + o.totalCents - o.deliveryCents, 0) + options.reduce((max, o) => Math.max(max, o.deliveryCents), 0)
}

/**
 * One partner for everything if it covers every item and costs at most 3% more than buying each item from whoever is
 * cheapest (one truck, one invoice); otherwise the cheapest split. Each partner's delivery is counted once, at its
 * highest charge, in both totals (estimated: confirm with the supplier).
 */
export function basket(items: { itemId: string; options: BasketOption[] }[]): Basket {
  const byPartner = new Map<string, { orgId: string; partnerName: string; chosen: BasketOption[] }>()
  const picks: Basket['split']['picks'] = []
  const pickedOptions = new Map<string, BasketOption[]>()
  const itemsWithoutPrice: string[] = []
  for (const item of items) {
    const sorted = [...item.options].sort((a, b) => a.totalCents - b.totalCents || a.partnerName.localeCompare(b.partnerName) || a.orgId.localeCompare(b.orgId))
    if (!sorted.length) itemsWithoutPrice.push(item.itemId)
    else {
      picks.push({ itemId: item.itemId, orgId: sorted[0].orgId, partnerName: sorted[0].partnerName })
      pickedOptions.set(sorted[0].orgId, [...(pickedOptions.get(sorted[0].orgId) ?? []), sorted[0]])
    }
    const seen = new Set<string>()
    for (const o of sorted) {
      if (seen.has(o.orgId)) continue
      seen.add(o.orgId)
      const p = byPartner.get(o.orgId) ?? { orgId: o.orgId, partnerName: o.partnerName, chosen: [] }
      p.chosen.push(o)
      byPartner.set(o.orgId, p)
    }
  }
  const splitTotal = Array.from(pickedOptions.values()).reduce((sum, opts) => sum + oneDelivery(opts), 0)
  const partners = Array.from(byPartner.values())
    .map((p) => ({ orgId: p.orgId, partnerName: p.partnerName, itemsCovered: p.chosen.length, totalCents: oneDelivery(p.chosen), separateTotalCents: p.chosen.reduce((sum, o) => sum + o.totalCents, 0), coversAll: items.length > 0 && p.chosen.length === items.length }))
    .sort((a, b) => b.itemsCovered - a.itemsCovered || a.totalCents - b.totalCents || a.partnerName.localeCompare(b.partnerName) || a.orgId.localeCompare(b.orgId))
  const split = { totalCents: splitTotal, picks, itemsWithoutPrice }
  if (!picks.length) return { partners, split, recommendation: { kind: 'none' }, explanation: 'No prices yet for these items.' }
  const single = partners.filter((p) => p.coversAll && p.totalCents * 100 <= splitTotal * (100 + SINGLE_PARTNER_TOLERANCE_PERCENT)).sort((a, b) => a.totalCents - b.totalCents || a.partnerName.localeCompare(b.partnerName) || a.orgId.localeCompare(b.orgId))[0]
  if (single) {
    const extra = single.totalCents - splitTotal
    return {
      partners,
      split,
      recommendation: { kind: 'single', orgId: single.orgId, partnerName: single.partnerName, totalCents: single.totalCents },
      explanation:
        extra <= 0
          ? `${single.partnerName} can supply every item and is also the cheapest overall (${formatEtbExact(single.totalCents)}). One supplier means one delivery and one invoice.`
          : `${single.partnerName} can supply every item for ${formatEtbExact(single.totalCents)}, only ${formatEtbExact(extra)} more than splitting the order (${formatEtbExact(splitTotal)}). Within ${SINGLE_PARTNER_TOLERANCE_PERCENT}%, one supplier is simpler: one delivery and one invoice.`,
    }
  }
  const coverAll = partners.filter((p) => p.coversAll).sort((a, b) => a.totalCents - b.totalCents)
  return {
    partners,
    split,
    recommendation: { kind: 'split' },
    explanation: [
      `Buying each item from the cheapest supplier costs ${formatEtbExact(splitTotal)}.`,
      coverAll.length ? `No single supplier is within ${SINGLE_PARTNER_TOLERANCE_PERCENT}% of that (the closest, ${coverAll[0].partnerName}, costs ${formatEtbExact(coverAll[0].totalCents)}).` : 'No single supplier has a price for every item.',
      itemsWithoutPrice.length ? `${itemsWithoutPrice.length === 1 ? '1 item has' : `${itemsWithoutPrice.length} items have`} no price yet.` : null,
    ]
      .filter(Boolean)
      .join(' '),
  }
}
