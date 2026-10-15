import { describe, expect, it } from 'vitest'
import { withUniqueRetry } from '@/lib/unique-retry'

describe('duplicate short id or slug (spec 25.4)', () => {
  it('tries again with a fresh value after a unique violation, and stops on other errors', async () => {
    let calls = 0
    const ok = await withUniqueRetry(async () => (++calls < 3 ? { error: { code: '23505' } } : { error: null }))
    expect(ok.error).toBeNull()
    expect(calls).toBe(3)
    calls = 0
    const other = await withUniqueRetry(async () => (++calls, { error: { code: '42501' } }))
    expect(other.error?.code).toBe('42501')
    expect(calls).toBe(1)
    calls = 0
    const gaveUp = await withUniqueRetry(async () => (++calls, { error: { code: '23505' } }))
    expect(gaveUp.error?.code).toBe('23505')
    expect(calls).toBe(3)
  })
})
