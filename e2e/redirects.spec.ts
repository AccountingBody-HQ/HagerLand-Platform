import { expect, test } from '@playwright/test'

const REDIRECTS: [string, string][] = [
  ['/housing', '/property'],
  ['/housing/abc', '/property'],
  ['/business', '/professionals'],
  ['/business/123', '/professionals'],
  ['/delivery', '/professionals'],
  ['/made-in-ethiopia', '/supplies'],
  ['/money', '/'],
  ['/birrbank/rates', '/'],
  ['/jobs/2b4c1d2e-1111-2222-3333-444455556666', '/jobs'],
  ['/jobs/post', '/jobs'],
  ['/cars/1', '/'],
  ['/tutors', '/'],
  ['/community', '/'],
  ['/events', '/'],
  ['/edit-link', '/login'],
  ['/property/post', '/list-with-us'],
  ['/property/2b4c1d2e-1111-2222-3333-444455556666', '/property/for-sale'],
]

for (const [from, to] of REDIRECTS) {
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
