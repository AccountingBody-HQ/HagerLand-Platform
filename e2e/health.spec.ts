import { expect, test } from '@playwright/test'

/** Health endpoints (spec 25.2n): public liveness, and a protected readiness report of true/false answers only. */

test('the public health check says only ok and version', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  expect(Object.keys(await res.json()).sort()).toEqual(['ok', 'version'])
})

test('the full health check needs the cron secret and reports booleans only', async ({ request }) => {
  expect((await request.get('/api/health/full')).status()).toBe(401)
  expect((await request.get('/api/health/full', { headers: { authorization: 'Bearer wrong-secret-value' } })).status()).toBe(401)
  const res = await request.get('/api/health/full', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as Record<string, unknown> & { env: Record<string, unknown> }
  for (const v of [body.ok, body.database, body.migrations, body.storage, body.emailDomain, ...Object.values(body.env)]) expect(typeof v).toBe('boolean')
  expect(body).toMatchObject({ database: true, migrations: true, storage: true })
  expect(body.env).toMatchObject({ NEXT_PUBLIC_SUPABASE_URL: true, SUPABASE_SECRET_KEY: true, CRON_SECRET: true })
  // Never values: no secret appears in the response.
  expect(JSON.stringify(body)).not.toContain(process.env.CRON_SECRET ?? '')
})
