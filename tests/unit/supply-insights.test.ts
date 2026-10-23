import { describe, expect, it } from 'vitest'
import {
  ageingBucket,
  changePercent,
  commissionOutstanding,
  demandByArea,
  demandFunnel,
  groupDemand,
  median,
  metric,
  partnerPerformance,
  priceTrends,
  ratio,
  reconcile,
  reliability,
  unmetDemand,
  type DemandItem,
  type TrendOffer,
} from '@/lib/supply/insights'
import type { MoneyModel } from '@/lib/supply/money'

const TODAY = '2026-10-23'
const bole = { id: 'bole', name: 'Bole' }
const yeka = { id: 'yeka', name: 'Yeka' }
const addis = { id: 'addis', name: 'Addis Ababa' }
const item = (o: Partial<DemandItem> & { quoteId: string; itemId: string }): DemandItem => ({ categoryId: 'cement', categoryName: 'Cement', name: 'Dangote cement 50kg', itemKey: 'dangote cement 50kg', unit: 'bag', quantity: 10, places: [bole, addis], ...o })

describe('basic maths', () => {
  it('median handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })
  it('change % and ratios never divide by zero', () => {
    expect(changePercent(100, 110)).toBe(10)
    expect(changePercent(120000, 125000)).toBe(4.2)
    expect(changePercent(0, 10)).toBeNull()
    expect(changePercent(null, 10)).toBeNull()
    expect(ratio(1, 0)).toBeNull()
  })
  it('a figure needs at least 3 data points', () => {
    expect(metric(0.5, 2)).toEqual({ value: 0.5, n: 2, enough: false })
    expect(metric(0.5, 3)).toEqual({ value: 0.5, n: 3, enough: true })
    expect(metric(null, 0)).toEqual({ value: null, n: 0, enough: false })
  })
})

describe('demand', () => {
  const items = [
    item({ quoteId: 'q1', itemId: 'i1' }),
    item({ quoteId: 'q2', itemId: 'i2', quantity: 40, places: [yeka, addis] }),
    item({ quoteId: 'q2', itemId: 'i3', name: 'Rebar 12mm', itemKey: 'rebar 12mm', categoryId: 'steel', categoryName: 'Steel', unit: 'piece', quantity: 100, places: [yeka, addis] }),
    item({ quoteId: 'q3', itemId: 'i4', unit: 'quintal', quantity: 2, places: [] }),
  ]
  it('groups the same item by category, name and unit, with quantity totals and quote counts', () => {
    const g = groupDemand(items)
    expect(g.map((x) => [x.name, x.unit, x.quantity, x.requests])).toEqual([
      ['Dangote cement 50kg', 'bag', 50, 2],
      ['Rebar 12mm', 'piece', 100, 1],
      ['Dangote cement 50kg', 'quintal', 2, 1],
    ])
  })
  it('counts requests by area, with “No delivery place given” for quotes without one', () => {
    expect(demandByArea(items)).toEqual([
      { area: 'Yeka', requests: 1, items: 2 },
      { area: 'Bole', requests: 1, items: 1 },
      { area: 'No delivery place given', requests: 1, items: 1 },
    ])
  })
  it('follows items from request to completed order', () => {
    const f = demandFunnel(
      ['i1', 'i2', 'i3', 'i4'],
      [
        { itemId: 'i1', status: 'chosen', askedAt: 'x', receivedAt: 'y' },
        { itemId: 'i1', status: 'received', askedAt: 'x', receivedAt: 'y' },
        { itemId: 'i2', status: 'received', askedAt: 'x', receivedAt: 'y' },
        { itemId: 'i3', status: 'asked', askedAt: 'x', receivedAt: null },
        { itemId: 'other', status: 'chosen', askedAt: 'x', receivedAt: 'y' },
      ],
      new Set(['i1']),
      new Set(),
    )
    expect(f).toEqual({ requested: 4, asked: 3, replied: 2, chosen: 1, ordered: 1, completed: 0 })
  })
  it('explains unmet demand: no price at all, only expired prices, or nobody delivering to the area', () => {
    const groups = groupDemand(items)
    const offers = [
      { categoryId: 'cement', itemKey: 'dangote cement 50kg', status: 'current', validUntil: '2026-10-30', deliveryAreaIds: ['bole'] },
      { categoryId: 'steel', itemKey: 'rebar 12mm', status: 'current', validUntil: '2026-10-01', deliveryAreaIds: ['addis'] },
    ]
    expect(unmetDemand(groups, offers, TODAY).map((u) => [u.group.name, u.group.unit, u.reason])).toEqual([
      ['Dangote cement 50kg', 'bag', 'No partner with a current price delivers to Yeka'],
      ['Rebar 12mm', 'piece', 'Only expired prices: no partner has a current price'],
    ])
    expect(unmetDemand(groupDemand([item({ quoteId: 'q', itemId: 'i', name: 'Gypsum', itemKey: 'gypsum board', categoryId: 'interior' })]), offers, TODAY)[0].reason).toBe('No partner has a price for this item')
  })
})

describe('price trends', () => {
  const o = (orgId: string, priceCents: number, priceDate: string, status = 'superseded', extra: Partial<TrendOffer> = {}): TrendOffer => ({ orgId, categoryName: 'Cement', name: 'Dangote cement 50kg', itemKey: 'dangote cement 50kg', unit: 'bag', priceCents, priceDate, validUntil: '2026-10-30', status, capturedAt: `${priceDate}T08:00:00Z`, fxLinked: false, vatIncluded: 'yes', ...extra })
  const offers = [
    o('a', 115000, '2026-07-01'),
    o('a', 120000, '2026-09-10'),
    o('a', 125000, '2026-10-20', 'current'),
    o('b', 118000, '2026-07-05'),
    o('b', 130000, '2026-10-21', 'current', { fxLinked: true }),
    o('c', 140000, '2026-10-22', 'withdrawn'),
  ]
  it('shows current lowest, median and highest, partner count and flags, without withdrawn prices', () => {
    const [t] = priceTrends(offers, TODAY)
    expect(t).toMatchObject({ partners: 2, lowestCents: 125000, medianCents: 127500, highestCents: 130000, fxLinked: true, vatUnknown: false, expired: 0 })
  })
  it('compares with the prices in force 30 and 90 days ago', () => {
    const [t] = priceTrends(offers, TODAY)
    // 30 days ago (23 Sep): a 120,000, b 118,000 → median 119,000; 90 days ago (25 Jul): a 115,000, b 118,000 → 116,500.
    expect(t.change30).toBe(changePercent(119000, 127500))
    expect(t.change90).toBe(changePercent(116500, 127500))
    expect(t.monthly.map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    expect(t.monthly[0].medianCents).toBeNull()
    expect(t.monthly[5].medianCents).toBe(127500)
  })
})

describe('partner performance and reliability', () => {
  const lines = [
    { quoteItemId: 'i1', status: 'chosen', askedAt: '2026-10-01T08:00:00Z', receivedAt: '2026-10-01T12:00:00Z', totalCents: 100000 },
    { quoteItemId: 'i2', status: 'received', askedAt: '2026-10-02T08:00:00Z', receivedAt: '2026-10-02T10:00:00Z', totalCents: 110000 },
    { quoteItemId: 'i3', status: 'asked', askedAt: '2026-10-03T08:00:00Z', receivedAt: null, totalCents: null },
    { quoteItemId: 'i4', status: 'shortlisted', askedAt: null, receivedAt: null, totalCents: null },
  ]
  const cheapest = new Map([['i1', [100000, 120000]], ['i2', [100000, 110000]]])
  const orders = [
    { status: 'completed', placedAt: '2026-10-05T08:00:00Z', confirmedAt: '2026-10-05T20:00:00Z', deliveredAt: '2026-10-08T09:00:00Z', promisedOn: '2026-10-08', everDisputed: false, hasProof: true },
    { status: 'delivered', placedAt: '2026-10-06T08:00:00Z', confirmedAt: null, deliveredAt: '2026-10-12T09:00:00Z', promisedOn: '2026-10-10', everDisputed: true, hasProof: false },
    { status: 'placed', placedAt: '2026-10-20T08:00:00Z', confirmedAt: null, deliveredAt: null, promisedOn: null, everDisputed: false, hasProof: false },
  ]
  const perf = partnerPerformance({
    lines,
    cheapest,
    orders,
    offers: [
      { priceDate: '2026-10-20', validUntil: '2026-10-30', status: 'current' },
      { priceDate: '2026-09-01', validUntil: '2026-10-01', status: 'current' },
      { priceDate: '2026-08-01', validUntil: '2026-09-01', status: 'superseded' },
    ],
    contacts: [
      { lastContactedAt: '2026-01-10', createdAt: '2025-12-01', doNotContact: false },
      { lastContactedAt: null, createdAt: '2026-09-01', doNotContact: false },
      { lastContactedAt: '2025-01-01', createdAt: '2025-01-01', doNotContact: true },
    ],
    reverifyBy: '2026-10-01',
    today: TODAY,
  })
  it('counts requests, replies, reply times and price comparisons with their sample sizes', () => {
    expect(perf.asked).toBe(3)
    expect(perf.replyRate).toEqual({ value: 2 / 3, n: 3, enough: true })
    expect(perf.medianReplyHours).toEqual({ value: 3, n: 2, enough: false })
    expect(perf.cheapestRate).toEqual({ value: 0.5, n: 2, enough: false })
    expect(perf.averageAboveCheapestPercent.value).toBe(5)
    expect(perf.chosen).toBe(1)
  })
  it('measures delivery, problems, missing proof, price freshness and what is due', () => {
    expect(perf.orders).toBe(3)
    expect(perf.onTimeRate).toEqual({ value: 0.5, n: 2, enough: false })
    expect(perf.medianConfirmHours).toEqual({ value: 12, n: 1, enough: false })
    expect(perf.disputes).toBe(1)
    expect(perf.completedWithoutProof).toBe(0)
    expect(perf.prices).toEqual({ current: 2, fresh: 1, ageing: 0, expired: 1 })
    expect(perf.contactsDue).toBe(1)
    expect(perf.reverifyDue).toBe(true)
  })
  it('reliability: a weighted score from 3 data points, explained in plain words', () => {
    const r = reliability(perf)
    // reply 2/3 × 0.4 + on time 1/2 × 0.4 + no problem 2/3 × 0.2, over weight 1.0
    expect(r).toEqual({ score: Math.round(((2 / 3) * 0.4 + 0.5 * 0.4 + (2 / 3) * 0.2) * 100), reason: 'Replied to 2 of 3 requests; 1 of 2 deliveries on time; 1 problem reported.' })
    expect(reliability({ asked: 2, replied: 2, deliveredWithPromise: 0, onTime: 0, placedOrders: 0, disputes: 0 })).toBeNull()
    expect(reliability({ asked: 2, replied: 2, deliveredWithPromise: 1, onTime: 1, placedOrders: 1, disputes: 0 })).toEqual({ score: 100, reason: 'Replied to 2 of 2 requests; 1 of 1 deliveries on time.' })
    expect(reliability({ asked: 3, replied: 0, deliveredWithPromise: 0, onTime: 0, placedOrders: 0, disputes: 0 })).toEqual({ score: 0, reason: 'Replied to 0 of 3 requests.' })
  })
})

describe('commission ageing and reconciliation', () => {
  it('puts the edges in the right bucket', () => {
    expect([0, 30, 31, 60, 61, 90, 91, 400].map(ageingBucket)).toEqual(['0–30 days', '0–30 days', '31–60 days', '31–60 days', '61–90 days', '61–90 days', 'Over 90 days', 'Over 90 days'])
  })
  it('works out commission still owed, aged from the first due date', () => {
    const e = (id: string, entry_type: string, direction: string, amount_cents: number, occurred_on: string, reverses_entry_id: string | null = null) => ({ id, entry_type, direction, amount_cents, occurred_on, reverses_entry_id })
    const out = commissionOutstanding(
      [
        { orderId: 'o1', model: 'B', entries: [e('d1', 'commission_due', 'receivable', 50000, '2026-08-20'), e('r1', 'commission_received', 'in', 20000, '2026-09-01')] },
        { orderId: 'o2', model: 'B', entries: [e('d2', 'commission_due', 'receivable', 30000, '2026-10-20'), e('r2', 'commission_received', 'in', 30000, '2026-10-21')] },
        { orderId: 'o3', model: 'B', entries: [e('d3', 'commission_due', 'receivable', 10000, '2026-07-01')] },
      ],
      TODAY,
    )
    expect(out).toEqual([
      { orderId: 'o3', outstandingCents: 10000, dueOn: '2026-07-01', days: 114, bucket: 'Over 90 days' },
      { orderId: 'o1', outstandingCents: 30000, dueOn: '2026-08-20', days: 64, bucket: '61–90 days' },
    ])
  })
  it('reconciles HagerLand earned with money in minus money out', () => {
    const e = (id: string, entry_type: string, direction: string, amount_cents: number, order_id: string | null, reverses_entry_id: string | null = null) => ({ id, entry_type, direction, amount_cents, order_id, reverses_entry_id })
    const models = new Map<string, MoneyModel>([['a', 'A'], ['b', 'B']])
    const rows = [
      e('1', 'customer_payment', 'in', 1100000, 'a'),
      e('2', 'supplier_payment', 'out', 1000000, 'a'),
      e('3', 'supplier_payment', 'out', 1000000, 'a'),
      e('4', 'reversal', 'in', 1000000, 'a', '3'),
      e('5', 'commission_due', 'receivable', 50000, 'b'),
      e('6', 'commission_received', 'in', 50000, 'b'),
      e('7', 'service_fee', 'in', 20000, null),
      e('8', 'adjustment', 'out', 5000, null),
      e('9', 'reversal', 'out', 99999, 'a', 'not-in-this-period'),
    ]
    expect(reconcile(rows, models)).toEqual({ earnedCents: 100000 + 50000 + 20000 - 5000, ledgerNetCents: 165000, reconciles: true })
  })
})

describe('digest: supplies section', () => {
  it('lists counts only, skipping zeros', async () => {
    const { supplyDigestLines } = await import('@/lib/supply/digest')
    expect(await supplyDigestLines(async () => [['Supplies: orders needing action', 2], ['Supplies: deliveries past the promised date', 0]])).toEqual([['Supplies: orders needing action', '2']])
  })
  it('never stops the digest: a failure gives no lines', async () => {
    const { supplyDigestLines } = await import('@/lib/supply/digest')
    expect(await supplyDigestLines(async () => Promise.reject(new Error('database down')))).toEqual([])
  })
})
