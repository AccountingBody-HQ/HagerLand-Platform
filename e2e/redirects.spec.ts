import { expect, test } from '@playwright/test'
import { LEGACY_REDIRECTS } from './legacy-redirects'


for (const [from, to] of LEGACY_REDIRECTS) {
  test(`${from} redirects permanently to ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 })
    expect([301, 308]).toContain(res.status())
    expect(new URL(res.headers().location ?? '', 'http://localhost:3100').pathname).toBe(to)
  })
}

test('admin pages require a session', async ({ request }) => {
  const res = await request.get('/roodber8', { maxRedirects: 0 })
  expect([302, 307]).toContain(res.status())
  expect(res.headers().location).toContain('/roodber8-login')
  const api = await request.get('/api/admin/places-search?query=x', { maxRedirects: 0 })
  expect(api.status()).toBe(401)
})

test('security headers are set', async ({ request }) => {
  const res = await request.get('/')
  const h = res.headers()
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(h['x-frame-options']).toBe('DENY')
})
