import { describe, expect, it } from 'vitest'
import { decideRateLimit } from '@/lib/rate-limit'

const now = new Date('2026-10-13T12:00:00Z')

describe('rate limit decisions', () => {
  it('starts a new window for a first hit', () => {
    const d = decideRateLimit(null, now, 5, 60)
    expect(d.action).toBe('reset')
    expect(d.result).toEqual({ allowed: true, remaining: 4 })
  })
  it('counts hits inside the window', () => {
    const d = decideRateLimit({ count: 2, reset_at: '2026-10-13T12:01:00Z' }, now, 5, 60)
    expect(d).toMatchObject({ action: 'increment', count: 3, result: { allowed: true, remaining: 2 } })
  })
  it('blocks at the limit', () => {
    expect(decideRateLimit({ count: 5, reset_at: '2026-10-13T12:01:00Z' }, now, 5, 60).result.allowed).toBe(false)
  })
  it('resets after the window ends', () => {
    expect(decideRateLimit({ count: 5, reset_at: '2026-10-13T11:59:00Z' }, now, 5, 60).action).toBe('reset')
  })
})
