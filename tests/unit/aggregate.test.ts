import { describe, expect, it } from 'vitest'
import { countBy, lastMonths, monthlyReport, sumBy, weekStart, weeklySeries } from '@/lib/admin/aggregate'

describe('report aggregation', () => {
  it('counts and sorts', () => {
    expect(countBy([{ s: 'a' }, { s: 'b' }, { s: 'a' }, { s: null }], (r) => r.s)).toEqual([
      { key: 'a', count: 2 },
      { key: 'b', count: 1 },
    ])
  })

  it('finds the Monday of a week', () => {
    expect(weekStart(new Date('2026-10-13T10:00:00Z'))).toBe('2026-10-12')
    expect(weekStart(new Date('2026-10-18T23:00:00Z'))).toBe('2026-10-12')
    expect(weekStart(new Date('2026-10-12T00:00:00Z'))).toBe('2026-10-12')
  })

  it('builds a weekly series with empty weeks', () => {
    const s = weeklySeries(['2026-10-13T09:00:00Z', '2026-10-01T09:00:00Z', '2026-10-02T09:00:00Z', '2025-01-01T00:00:00Z'], 3, new Date('2026-10-14T00:00:00Z'))
    expect(s).toEqual([
      { week: '2026-09-28', count: 2 },
      { week: '2026-10-05', count: 0 },
      { week: '2026-10-12', count: 1 },
    ])
  })

  it('sums by key, skipping nulls', () => {
    expect(sumBy([{ k: 'x', v: 5 }, { k: 'x', v: null }, { k: 'y', v: 2 }], (r) => r.k, (r) => r.v)).toEqual([
      { key: 'x', total: 5, count: 1 },
      { key: 'y', total: 2, count: 1 },
    ])
  })
})

describe('monthly revenue and lead report', () => {
  it('lists the last months oldest first', () => {
    expect(lastMonths(3, new Date('2026-02-15T00:00:00Z'))).toEqual(['2025-12', '2026-01', '2026-02'])
  })
  it('counts leads and sums won deals by currency, ignoring open and lost deals', () => {
    const months = ['2026-09', '2026-10']
    const rows = monthlyReport(months, {
      requests: ['2026-09-03T10:00:00Z', '2026-10-01T10:00:00Z', '2026-10-02T10:00:00Z'],
      enquiries: ['2026-10-05T10:00:00Z'],
      quoteRequests: ['2025-01-01T00:00:00Z'],
      deals: [
        { closed_at: '2026-10-10T00:00:00Z', created_at: '2026-10-01T00:00:00Z', status: 'won', currency: 'ETB', value_minor: 1_000_000, commission_minor: 50_000, lead_fee_minor: 10_000 },
        { closed_at: null, created_at: '2026-10-11T00:00:00Z', status: 'paid', currency: 'GBP', value_minor: 20_000, commission_minor: 2_000, lead_fee_minor: null },
        { closed_at: '2026-10-12T00:00:00Z', created_at: '2026-10-01T00:00:00Z', status: 'lost', currency: 'ETB', value_minor: 999, commission_minor: 999, lead_fee_minor: 999 },
        { closed_at: null, created_at: '2026-10-01T00:00:00Z', status: 'open', currency: 'ETB', value_minor: 5, commission_minor: 5, lead_fee_minor: 5 },
      ],
    })
    expect(rows[0]).toMatchObject({ month: '2026-09', requests: 1, enquiries: 0, dealsWon: 0 })
    expect(rows[1]).toMatchObject({ month: '2026-10', requests: 2, enquiries: 1, quoteRequests: 0, dealsWon: 2 })
    expect(rows[1].money).toEqual({ ETB: { value: 1_000_000, commission: 50_000, leadFees: 10_000 }, GBP: { value: 20_000, commission: 2_000, leadFees: 0 } })
  })
})
