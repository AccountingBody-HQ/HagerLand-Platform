import { expect, test } from '@playwright/test'

/** Health endpoints (spec 25.2n): public liveness, and a protected readiness report of true/false answers only. */

test('the public health check says ok, the version, and plainly what it does not check', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Object.keys(body).sort()).toEqual(['checks', 'fullCheck', 'notChecked', 'ok', 'version'])
  expect(body).toMatchObject({ ok: true, checks: ['website'], notChecked: ['database', 'migrations', 'storage', 'email', 'daily job'], fullCheck: '/api/health/full' })
  expect(typeof body.version).toBe('string')
})

test('the full health check needs the cron secret, reports true/false checks, the latest migration and what it does not check', async ({ request }) => {
  expect((await request.get('/api/health/full')).status()).toBe(401)
  expect((await request.get('/api/health/full', { headers: { authorization: 'Bearer wrong-secret-value' } })).status()).toBe(401)
  const res = await request.get('/api/health/full', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as Record<string, unknown> & { env: Record<string, unknown> }
  for (const v of [body.ok, body.database, body.migrations, body.storage, body.emailDomain, ...Object.values(body.env)]) expect(typeof v).toBe('boolean')
  expect(body).toMatchObject({ database: true, migrations: true, storage: true })
  // The latest migration as recorded in the database (read only), and what the report does not check.
  const { readdirSync } = await import('node:fs')
  expect(body.latestMigration).toBe(readdirSync('supabase/migrations').filter((f) => /^\d{4}_/.test(f)).sort().pop()?.slice(0, 4))
  expect(Array.isArray(body.notChecked) && (body.notChecked as string[]).includes('daily job runs')).toBe(true)
  expect(Object.keys(body).sort()).toEqual(['database', 'emailDomain', 'env', 'latestMigration', 'migrations', 'notChecked', 'ok', 'storage'])
  expect(body.env).toMatchObject({ NEXT_PUBLIC_SUPABASE_URL: true, SUPABASE_SECRET_KEY: true, CRON_SECRET: true })
  // Never values: no secret appears in the response.
  expect(JSON.stringify(body)).not.toContain(process.env.CRON_SECRET ?? '')
})
