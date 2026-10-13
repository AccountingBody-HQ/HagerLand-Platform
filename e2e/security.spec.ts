import { expect, test } from '@playwright/test'
import { seedPublishedProperty, db } from './helpers'

/** WP-17: headers, upload abuse and rate limits. Each test uses its own fake client IP so limits never leak between tests. */
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`

test.describe('security', () => {
  test('every response carries the security headers', async ({ request }) => {
    for (const path of ['/', '/property/for-sale', '/login', '/api/search?q=bole']) {
      const h = (await request.get(path)).headers()
      expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'")
      expect(h['content-security-policy'], path).toContain("object-src 'none'")
      expect(h['strict-transport-security'], path).toContain('max-age=63072000')
      expect(h['x-content-type-options'], path).toBe('nosniff')
      expect(h['x-frame-options'], path).toBe('DENY')
      expect(h['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
      expect(h['permissions-policy'], path).toContain('camera=()')
      expect(h['x-powered-by'], path).toBeUndefined()
    }
  })

  test('upload signing refuses bad types, oversize files and areas the visitor cannot use', async ({ request }) => {
    const headers = { 'x-forwarded-for': ip() }
    const id = crypto.randomUUID()
    const bad = await request.post('/api/uploads/sign', { headers, data: { purpose: 'private', area: 'materials', id, content_type: 'application/x-msdownload', size: 1000 } })
    expect(bad.status()).toBe(400)
    const huge = await request.post('/api/uploads/sign', { headers, data: { purpose: 'private', area: 'materials', id, content_type: 'application/pdf', size: 50 * 1024 * 1024 } })
    expect(huge.status()).toBe(400)
    for (const area of ['verification', 'claim', 'quote', 'brochure']) {
      const res = await request.post('/api/uploads/sign', { headers, data: { purpose: 'private', area, id, content_type: 'application/pdf', size: 1000 } })
      expect(res.status(), area).toBe(403)
    }
    const media = await request.post('/api/uploads/sign', { headers, data: { purpose: 'media', entity_type: 'property', entity_id: id, kind: 'image', content_type: 'image/jpeg', size: 1000 } })
    expect(media.status()).toBe(403)
    const garbage = await request.post('/api/uploads/sign', { headers, data: { purpose: 'x' } })
    expect(garbage.status()).toBe(400)
    const ok = await request.post('/api/uploads/sign', { headers, data: { purpose: 'private', area: 'materials', id, content_type: 'application/pdf', size: 1000 } })
    expect(ok.status()).toBe(200)
  })

  test('contact reveals are rate limited per visitor', async ({ request }) => {
    const p = await seedPublishedProperty()
    await db().from('properties').update({ contact_phone: '+251911000111' }).eq('id', p.id)
    const headers = { 'x-forwarded-for': ip() }
    const statuses: number[] = []
    for (let i = 0; i < 32; i++) {
      const res = await request.post('/api/contact-reveal', { headers, data: { target_type: 'property', target_id: p.id, channel: 'phone' } })
      statuses.push(res.status())
    }
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true)
    expect(statuses.slice(30)).toEqual([429, 429])
    const other = await request.post('/api/contact-reveal', { headers: { 'x-forwarded-for': ip() }, data: { target_type: 'property', target_id: p.id, channel: 'phone' } })
    expect(other.status()).toBe(200)
    await db().from('properties').delete().eq('id', p.id)
  })

  test('admin login is locked after five failed attempts', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ip() })
    for (let i = 0; i < 6; i++) {
      await page.goto('/roodber8-login')
      await page.fill('#adm-user', 'nobody')
      await page.fill('#adm-pass', 'wrong-password')
      await page.fill('#adm-code', '123456')
      await page.getByRole('button', { name: /sign in/i }).click()
      await page.waitForURL(/error=/)
    }
    await expect(page.getByText('Too many attempts')).toBeVisible()
  })

  test('the service key never reaches the browser', async ({ page }) => {
    const bodies: string[] = []
    page.on('response', async (r) => {
      if (/\.js(\?|$)/.test(r.url())) bodies.push(await r.text().catch(() => ''))
    })
    await page.goto('/')
    await page.goto('/property/for-sale')
    await page.goto('/signup')
    const secret = process.env.SUPABASE_SECRET_KEY ?? ''
    expect(secret.length).toBeGreaterThan(10)
    for (const b of bodies) {
      expect(b.includes(secret)).toBe(false)
      expect(b).not.toMatch(/service_role/)
    }
  })
})
