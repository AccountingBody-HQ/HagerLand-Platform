import { readdirSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))


describe('health report (spec 25.2n)', () => {
  it('expects exactly the migrations in supabase/migrations', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    const files = readdirSync('supabase/migrations').filter((f) => /^\d{4}_.*\.sql$/.test(f)).map((f) => f.slice(0, 4)).sort()
    expect([...EXPECTED_MIGRATIONS]).toEqual(files)
  })
})

describe('honest health answers (tidy T-1)', () => {
  it('the public check says it only checks the website', async () => {
    const { PUBLIC_HEALTH_SCOPE, NOT_CHECKED } = await import('@/lib/health')
    expect(PUBLIC_HEALTH_SCOPE).toEqual({ checks: ['website'], notChecked: ['database', 'migrations', 'storage', 'email', 'daily job'], fullCheck: '/api/health/full' })
    expect(NOT_CHECKED).toContain('daily job runs')
    expect(NOT_CHECKED).toContain('emails actually delivered')
  })
})
