import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'


describe('health report (spec 25.2n)', () => {
  it('expects exactly the migrations in supabase/migrations', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    const files = readdirSync('supabase/migrations').filter((f) => /^\d{4}_.*\.sql$/.test(f)).map((f) => f.slice(0, 4)).sort()
    expect([...EXPECTED_MIGRATIONS]).toEqual(files)
  })
})
