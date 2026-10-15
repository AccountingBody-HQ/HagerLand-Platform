import { afterEach, describe, expect, it, vi } from 'vitest'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'

describe('bot protection (spec 25.4 forms)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  it('refuses a missing token and a failed Cloudflare check, and accepts a passed one', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    expect(await verifyTurnstileToken(null)).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }))))
    expect(await verifyTurnstileToken('bad-token', '1.2.3.4')).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }))))
    expect(await verifyTurnstileToken('good-token')).toBe(true)
  })
  it('treats an unreachable Cloudflare as a failure, not a pass', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    expect(await verifyTurnstileToken('token')).toBe(false)
  })
  it('spots a filled honeypot', () => {
    const f = new FormData()
    expect(isHoneypotFilled(f)).toBe(false)
    f.set('hl_extra_field', 'http://spam')
    expect(isHoneypotFilled(f)).toBe(true)
  })
})
