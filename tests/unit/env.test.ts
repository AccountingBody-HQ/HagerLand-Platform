import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const BASE = { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', SUPABASE_SECRET_KEY: 'secret' }

describe('environment validation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('accepts a minimal setup and treats empty values as not set', async () => {
    for (const [k, v] of Object.entries({ ...BASE, ADMIN_DIGEST_EMAIL: '', CRON_SECRET: '' })) vi.stubEnv(k, v)
    const { serverEnv } = await import('@/lib/env')
    expect(serverEnv().ADMIN_DIGEST_EMAIL).toBeUndefined()
  })

  it('names every malformed variable', async () => {
    for (const [k, v] of Object.entries({ ...BASE, ADMIN_DIGEST_EMAIL: 'not-an-email', CRON_SECRET: 'short' })) vi.stubEnv(k, v)
    const { serverEnv } = await import('@/lib/env')
    expect(() => serverEnv()).toThrow(/ADMIN_DIGEST_EMAIL.*CRON_SECRET|CRON_SECRET.*ADMIN_DIGEST_EMAIL/)
  })
})
