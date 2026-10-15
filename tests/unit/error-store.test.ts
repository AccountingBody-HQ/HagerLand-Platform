import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('error grouping', async () => {
  const { normaliseErrorMessage } = await import('@/lib/error-store')
  it('groups messages that differ only by ids, numbers or values', () => {
    const a = normaliseErrorMessage('insert failed: duplicate key "abc" for 3f2b1c4d-1111-2222-3333-444455556666 (row 12)')
    const b = normaliseErrorMessage('insert failed: duplicate key "xyz" for 9a8b7c6d-1111-2222-3333-444455556666 (row 99)')
    expect(a).toBe(b)
    expect(a).toBe('insert failed: duplicate key <value> for <id> (row <n>)')
  })

  it('caps the length', () => {
    expect(normaliseErrorMessage('x'.repeat(1000))).toHaveLength(300)
  })
})
