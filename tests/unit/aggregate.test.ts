import { describe, expect, it } from 'vitest'
import { countBy, sumBy, weekStart, weeklySeries } from '@/lib/admin/aggregate'

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
