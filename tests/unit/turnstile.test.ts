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
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, hostname: 'localhost' }))))
    expect(await verifyTurnstileToken('good-token')).toBe(true)
  })
  it('outside production: accepts HagerLand, localhost and the deployment\'s own host; refuses another or a missing site', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    vi.stubEnv('VERCEL_URL', 'hagerland-git-fix-abc.vercel.app')
    const answer = (hostname?: string) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, ...(hostname ? { hostname } : {}) }))))
    for (const ok of ['www.hagerland.com', 'hagerland.com', 'localhost', '127.0.0.1', 'hagerland-git-fix-abc.vercel.app']) {
      answer(ok)
      expect(await verifyTurnstileToken('token'), ok).toBe(true)
    }
    for (const bad of ['evil.example', 'hagerland.com.evil.example', 'another-app.vercel.app', undefined]) {
      answer(bad)
      expect(await verifyTurnstileToken('token'), String(bad)).toBe(false)
    }
  })
  it('in production: only www.hagerland.com and hagerland.com, never a preview host or localhost', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production')
    vi.stubEnv('VERCEL_URL', 'hagerland-abc.vercel.app')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    vi.resetModules()
    const prod = await import('@/lib/turnstile')
    expect(prod.allowedTurnstileHosts()).toEqual(['www.hagerland.com', 'hagerland.com'])
    const answer = (hostname?: string) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, ...(hostname ? { hostname } : {}) }))))
    for (const ok of ['www.hagerland.com', 'hagerland.com']) {
      answer(ok)
      expect(await prod.verifyTurnstileToken('token'), ok).toBe(true)
    }
    for (const bad of ['hagerland-abc.vercel.app', 'localhost', '127.0.0.1', 'evil.example', undefined]) {
      answer(bad)
      expect(await prod.verifyTurnstileToken('token'), String(bad)).toBe(false)
    }
    vi.unstubAllEnvs()
    vi.resetModules()
  })
  it('without a secret: previews pass as before, production refuses', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    expect(await verifyTurnstileToken(null)).toBe(true)
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production')
    vi.resetModules()
    const prod = await import('@/lib/turnstile')
    expect(await prod.verifyTurnstileToken('token')).toBe(false)
    vi.unstubAllEnvs()
    vi.resetModules()
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
