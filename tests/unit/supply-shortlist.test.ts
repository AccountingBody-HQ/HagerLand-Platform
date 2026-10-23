import { describe, expect, it } from 'vitest'
import { basket, formatEtbExact, shortlist, todayInAddis, tokenSimilarity, type ShortlistInput, type ShortlistOffer, type ShortlistPartner } from '@/lib/supply/shortlist'
import { itemKey } from '@/lib/supply/offers'

const TODAY = '2026-10-23'
const BOLE = 'loc-bole'
const ADDIS = 'loc-addis'
const KIRKOS = 'loc-kirkos'
const CEMENT = 'cat-cement'

const partner = (orgId: string, name: string, status = 'active', doNotContact = false): ShortlistPartner => ({ orgId, name, status, doNotContact })
const offer = (o: Partial<ShortlistOffer> & { id: string; orgId: string }): ShortlistOffer => ({
  branchId: null,
  productId: null,
  categoryId: CEMENT,
  itemKey: itemKey('Dangote cement 50kg'),
  unit: 'bag',
  packSize: null,
  priceCents: 125000,
  priceDate: '2026-10-20',
  validUntil: '2026-10-27',
  minOrderQty: null,
  deliveryAreaIds: [BOLE],
  deliveryChargeCents: null,
  leadTimeDays: 2,
  vatIncluded: 'yes',
  fxLinked: false,
  status: 'current',
  ...o,
})

function input(offers: ShortlistOffer[], partners: ShortlistPartner[], overrides: Partial<ShortlistInput> = {}): ShortlistInput {
  return {
    items: [{ id: 'item-1', name: 'Dangote cement 50kg', itemKey: itemKey('Dangote cement 50kg'), productId: null, categoryId: CEMENT, quantity: 50, unit: 'bag' }],
    partners,
    offers,
    locationIds: [BOLE, ADDIS],
    locationNames: { [BOLE]: 'Bole', [ADDIS]: 'Addis Ababa', [KIRKOS]: 'Kirkos' },
    today: TODAY,
    neededBy: null,
    ...overrides,
  }
}

describe('shortlist filters and reasons', () => {
  it('keeps active and trial partners and explains every one left out', () => {
    const partners = [
      partner('a', 'Abebe Cement'),
      partner('b', 'Bole Trading', 'terms_agreed'),
      partner('c', 'Contacted Co', 'contacted'),
      partner('d', 'Declined Co', 'declined'),
      partner('e', 'Never Again', 'do_not_contact'),
    ]
    const r = shortlist(input([offer({ id: 'o-a', orgId: 'a' }), offer({ id: 'o-b', orgId: 'b' }), offer({ id: 'o-c', orgId: 'c' }), offer({ id: 'o-d', orgId: 'd' }), offer({ id: 'o-e', orgId: 'e' })], partners))[0]
    expect(r.candidates.map((c) => [c.partnerName, c.trial])).toEqual([['Abebe Cement', false], ['Bole Trading', true]])
    expect(r.candidates[1].reason).toMatch(/^Trial partner \(terms agreed\)\./)
    expect(r.excluded).toEqual([
      { orgId: 'c', partnerName: 'Contacted Co', reason: 'Contacted, not yet interested' },
      { orgId: 'd', partnerName: 'Declined Co', reason: 'Declined to work with us' },
      { orgId: 'e', partnerName: 'Never Again', reason: 'Asked not to be contacted' },
    ])
  })

  it('gives the AB-style reason for the best suggestion', () => {
    const r = shortlist(input([offer({ id: 'o', orgId: 'a' })], [partner('a', 'Abebe Cement')]))[0]
    expect(r.candidates[0].reason).toBe('Active partner. Delivers to Bole. Price checked 3 days ago. Cheapest delivered total. No delivery history yet.')
    expect(r.candidates[0].reliability).toBeNull()
  })

  it('uses reliability after price and freshness, and explains it in plain words', () => {
    const partners = [
      { ...partner('a', 'Alpha'), reliability: { score: 60, reason: 'Replied to 3 of 5 requests.' } },
      { ...partner('b', 'Beta'), reliability: { score: 95, reason: 'Replied to 5 of 6 requests; 4 of 4 deliveries on time.' } },
      partner('c', 'Gamma'),
      { ...partner('d', 'Delta'), reliability: { score: 100, reason: 'Replied to 3 of 3 requests.' } },
    ]
    const r = shortlist(input([offer({ id: '1', orgId: 'a' }), offer({ id: '2', orgId: 'b' }), offer({ id: '3', orgId: 'c' }), offer({ id: '4', orgId: 'd', priceCents: 126000 })], partners))[0]
    // Same price and date for a, b, c: more reliable first, no history last; d is dearer, so last despite 100.
    expect(r.candidates.map((c) => c.orgId)).toEqual(['b', 'a', 'c', 'd'])
    expect(r.candidates[0].reason).toBe('Active partner. Delivers to Bole. Price checked 3 days ago. Cheapest delivered total. Replied to 5 of 6 requests; 4 of 4 deliveries on time.')
    expect(r.candidates[2].reason).toContain('No delivery history yet.')
    expect(r.candidates[0].reliability).toBe(95)
  })

  it('leaves out withdrawn, replaced, expired, far-away and too-small orders, with reasons', () => {
    const partners = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => partner(id, `Partner ${id.toUpperCase()}`))
    const r = shortlist(
      input(
        [
          offer({ id: '1', orgId: 'a', status: 'withdrawn' }),
          offer({ id: '2', orgId: 'b', status: 'superseded' }),
          offer({ id: '3', orgId: 'c', validUntil: '2026-10-12', priceDate: '2026-10-05' }),
          offer({ id: '4', orgId: 'd', deliveryAreaIds: [KIRKOS] }),
          offer({ id: '5', orgId: 'e', minOrderQty: 200 }),
          offer({ id: '6', orgId: 'f', deliveryAreaIds: [] }),
        ],
        partners,
      ),
    )[0]
    expect(r.candidates).toEqual([])
    expect(Object.fromEntries(r.excluded.map((e) => [e.orgId, e.reason]))).toEqual({
      a: 'No longer sells this item',
      b: 'Only an older, replaced price',
      c: 'Price expired 12 Oct',
      d: 'Does not deliver to Bole',
      e: 'Minimum order 200 bags; quote asks for 50 bags',
      f: 'No delivery areas recorded',
    })
  })

  it('accepts delivery to the city when the quote is in one of its sub-cities', () => {
    const r = shortlist(input([offer({ id: 'o', orgId: 'a', deliveryAreaIds: [ADDIS] })], [partner('a', 'Citywide')]))[0]
    expect(r.candidates).toHaveLength(1)
    expect(r.candidates[0].reason).toContain('Delivers to Bole.')
  })

  it('matches the same product, or the same category with the same or a similar name (flagged)', () => {
    const items = [{ id: 'p', name: 'Cement', itemKey: 'cement', productId: 'prod-1', categoryId: CEMENT, quantity: 10, unit: 'bag' }]
    const byProduct = shortlist(input([offer({ id: 'o', orgId: 'a', productId: 'prod-1', itemKey: 'something else entirely' })], [partner('a', 'A')], { items }))[0]
    expect(byProduct.candidates).toHaveLength(1)
    expect(byProduct.candidates[0].similarName).toBe(false)

    const similar = shortlist(input([offer({ id: 'o', orgId: 'a', itemKey: itemKey('Dangote OPC cement 50kg bag') })], [partner('a', 'A')]))[0]
    expect(similar.candidates[0].similarName).toBe(true)
    expect(similar.candidates[0].flags).toContain('Similar name: check it is the same item')

    const otherCategory = shortlist(input([offer({ id: 'o', orgId: 'a', categoryId: 'cat-paint' })], [partner('a', 'A')]))[0]
    expect(otherCategory.excluded[0].reason).toBe('Different category')
  })

  it('uses the similarity threshold of 0.6', () => {
    expect(tokenSimilarity('dangote cement 50kg', 'dangote opc 42 5 cement 50kg')).toBe(1)
    expect(tokenSimilarity('a b c d e', 'a b c x y')).toBe(0.6)
    expect(tokenSimilarity('a b c d e', 'a b x y z')).toBe(0.4)
    const below = shortlist(input([offer({ id: 'o', orgId: 'a', itemKey: 'dangote x y z w' })], [partner('a', 'A')]))[0]
    expect(below.candidates).toEqual([])
    expect(below.excluded).toEqual([])
  })

  it('converts units only through a known pack size, rounding up to whole packs', () => {
    const items = [{ id: 'i', name: 'Dangote cement 50kg', itemKey: itemKey('Dangote cement 50kg'), productId: null, categoryId: CEMENT, quantity: 520, unit: 'kg' }]
    const packed = shortlist(input([offer({ id: 'o', orgId: 'a', packSize: 50 })], [partner('a', 'A')], { items }))[0]
    expect(packed.candidates[0].quantity).toBe(11)
    expect(packed.candidates[0].deliveredTotalCents).toBe(11 * 125000)
    expect(packed.candidates[0].flags).toContain('Converted to 11 bags (pack of 50)')
    const unpacked = shortlist(input([offer({ id: 'o', orgId: 'a' })], [partner('a', 'A')], { items }))[0]
    expect(unpacked.excluded[0].reason).toBe('Priced per bag, quote asks in kg; no pack size recorded')
  })

  it('flags VAT not known, foreign-currency prices, ageing prices and do-not-contact', () => {
    const r = shortlist(input([offer({ id: 'o', orgId: 'a', vatIncluded: 'unknown', fxLinked: true, priceDate: '2026-10-01', validUntil: '2026-10-30' })], [partner('a', 'A', 'active', true)]))[0]
    expect(r.candidates[0].flags).toEqual(['Price is ageing', 'VAT not known', 'Imported or foreign-currency price', 'Do not contact'])
    expect(r.candidates[0].doNotContact).toBe(true)
  })

  it('skips the delivery check when the quote has no place, and says so', () => {
    const r = shortlist(input([offer({ id: 'o', orgId: 'a', deliveryAreaIds: [] })], [partner('a', 'A')], { locationIds: [] }))[0]
    expect(r.candidates[0].flags).toContain('The quote has no delivery place: check delivery')
  })
})

describe('shortlist ranking', () => {
  it('ranks by delivered total, then newer price, then on time, then lead time, then name', () => {
    const partners = ['a', 'b', 'c', 'd', 'e'].map((id) => partner(id, `Partner ${id}`))
    const r = shortlist(
      input(
        [
          offer({ id: '1', orgId: 'a', priceCents: 120000, deliveryChargeCents: 500000 }),
          offer({ id: '2', orgId: 'b', priceCents: 125000 }),
          offer({ id: '3', orgId: 'c', priceCents: 125000, priceDate: '2026-10-22' }),
          offer({ id: '4', orgId: 'd', priceCents: 125000, priceDate: '2026-10-22', leadTimeDays: 1 }),
          offer({ id: '5', orgId: 'e', priceCents: 124000 }),
        ],
        partners,
      ),
    )[0]
    expect(r.candidates.map((c) => c.orgId)).toEqual(['e', 'd', 'c', 'b', 'a'])
    expect(r.candidates[4].deliveredTotalCents).toBe(50 * 120000 + 500000)
    expect(r.candidates.filter((c) => c.reason.includes('Cheapest delivered total.')).map((c) => c.orgId)).toEqual(['e'])
  })

  it('puts suppliers that cannot meet the needed-by date after those that can', () => {
    const r = shortlist(input([offer({ id: '1', orgId: 'slow', leadTimeDays: 10 }), offer({ id: '2', orgId: 'fast', leadTimeDays: 2 })], [partner('slow', 'Slow'), partner('fast', 'Fast')], { neededBy: '2026-10-28' }))[0]
    expect(r.candidates.map((c) => c.orgId)).toEqual(['fast', 'slow'])
  })

  it('breaks full ties by partner name, then id, and keeps each partner’s best offer only', () => {
    const r = shortlist(input([offer({ id: '1', orgId: 'z2' }), offer({ id: '2', orgId: 'z1' }), offer({ id: '3', orgId: 'z1', priceCents: 130000 })], [partner('z2', 'Same Name'), partner('z1', 'Same Name')]))[0]
    expect(r.candidates.map((c) => [c.orgId, c.offerId])).toEqual([['z1', '2'], ['z2', '1']])
  })

  it('is deterministic: the same input gives the same output, in any offer order', () => {
    const offers = ['a', 'b', 'c'].map((id, i) => offer({ id, orgId: id, priceCents: 125000 + (i % 2) * 100 }))
    const partners = ['a', 'b', 'c'].map((id) => partner(id, id.toUpperCase()))
    const first = shortlist(input(offers, partners))
    expect(shortlist(input([...offers].reverse(), [...partners].reverse()))).toEqual(first)
    expect(shortlist(input(offers, partners))).toEqual(first)
  })

  it('keeps cents exact', () => {
    const items = [{ id: 'i', name: 'Dangote cement 50kg', itemKey: itemKey('Dangote cement 50kg'), productId: null, categoryId: CEMENT, quantity: 3, unit: 'bag' }]
    const r = shortlist(input([offer({ id: 'o', orgId: 'a', priceCents: 3333, deliveryChargeCents: 1 })], [partner('a', 'A')], { items }))[0]
    expect(r.candidates[0].deliveredTotalCents).toBe(10000)
    expect(formatEtbExact(1250000)).toBe('ETB 12,500.00')
    expect(formatEtbExact(3850)).toBe('ETB 38.50')
    expect(formatEtbExact(5)).toBe('ETB 0.05')
  })

  it('uses Ethiopian dates', () => {
    expect(todayInAddis(new Date('2026-10-23T22:30:00Z'))).toBe('2026-10-24')
    expect(todayInAddis(new Date('2026-10-23T20:00:00Z'))).toBe('2026-10-23')
  })
})

describe('basket', () => {
  const opts = (single: number) => [
    { itemId: 'cement', options: [{ orgId: 'one', partnerName: 'One Stop', totalCents: single - 4000, deliveryCents: 0 }, { orgId: 'x', partnerName: 'Cheap Cement', totalCents: 6000, deliveryCents: 0 }] },
    { itemId: 'steel', options: [{ orgId: 'one', partnerName: 'One Stop', totalCents: 4000, deliveryCents: 0 }, { orgId: 'y', partnerName: 'Cheap Steel', totalCents: 4000, deliveryCents: 0 }] },
  ]
  // The cheapest split is 6,000 + 4,000 = 10,000 cents.
  it('recommends one partner at 2.9% and 3.0% dearer, and the split at 3.1%', () => {
    expect(basket(opts(10290)).recommendation).toMatchObject({ kind: 'single', orgId: 'one', totalCents: 10290 })
    expect(basket(opts(10300)).recommendation).toMatchObject({ kind: 'single', orgId: 'one' })
    const over = basket(opts(10310))
    expect(over.recommendation).toEqual({ kind: 'split' })
    expect(over.split.totalCents).toBe(10000)
    expect(over.explanation).toBe('Buying each item from the cheapest supplier costs ETB 100.00. No single supplier is within 3% of that (the closest, One Stop, costs ETB 103.10).')
  })
  it('explains a single-partner recommendation in plain English', () => {
    expect(basket(opts(10290)).explanation).toBe('One Stop can supply every item for ETB 102.90, only ETB 2.90 more than splitting the order (ETB 100.00). Within 3%, one supplier is simpler: one delivery and one invoice.')
  })
  it('counts one delivery per supplier (their highest charge), and shows the separate-delivery total', () => {
    const b = basket([
      { itemId: 'cement', options: [{ orgId: 'one', partnerName: 'One Stop', totalCents: 10000 + 3000, deliveryCents: 3000 }] },
      { itemId: 'steel', options: [{ orgId: 'one', partnerName: 'One Stop', totalCents: 8000 + 2000, deliveryCents: 2000 }] },
    ])
    expect(b.partners[0]).toMatchObject({ totalCents: 21000, separateTotalCents: 23000, coversAll: true })
    expect(b.split.totalCents).toBe(21000)
  })
  it('uses the one-delivery totals for the 3% rule: 2.9% and 3.0% pick one supplier, 3.1% the split', () => {
    // Split: Cheap Cement 5,000 + 1,000 delivery, Cheap Steel 3,000 + 1,000 delivery = 10,000 (different suppliers).
    // One Stop: cement goods (c) + 600 delivery, steel 3,700 + 400 delivery; one delivery counted at 600: c + 4,300.
    const opts = (c: number) => [
      { itemId: 'cement', options: [{ orgId: 'one', partnerName: 'One Stop', totalCents: c + 600, deliveryCents: 600 }, { orgId: 'x', partnerName: 'Cheap Cement', totalCents: 6000, deliveryCents: 1000 }] },
      { itemId: 'steel', options: [{ orgId: 'one', partnerName: 'One Stop', totalCents: 4100, deliveryCents: 400 }, { orgId: 'y', partnerName: 'Cheap Steel', totalCents: 4000, deliveryCents: 1000 }] },
    ]
    expect(basket(opts(5990)).split.totalCents).toBe(10000)
    expect(basket(opts(5990)).recommendation).toMatchObject({ kind: 'single', totalCents: 10290 })
    expect(basket(opts(6000)).recommendation).toMatchObject({ kind: 'single', totalCents: 10300 })
    expect(basket(opts(6010)).recommendation).toEqual({ kind: 'split' })
    // Counting every delivery would have made One Stop look 400 cents dearer.
    expect(basket(opts(5990)).partners[0].separateTotalCents).toBe(10690)
  })
  it('never recommends a partner that cannot cover every item, and reports items without a price', () => {
    const b = basket([{ itemId: 'a', options: [{ orgId: 'p', partnerName: 'P', totalCents: 100, deliveryCents: 0 }] }, { itemId: 'b', options: [] }])
    expect(b.recommendation).toEqual({ kind: 'split' })
    expect(b.split.itemsWithoutPrice).toEqual(['b'])
    expect(b.explanation).toContain('No single supplier has a price for every item.')
    expect(basket([]).recommendation).toEqual({ kind: 'none' })
  })
})
