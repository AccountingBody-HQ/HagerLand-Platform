import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PRIVATE_BUCKET, PUBLIC_BUCKET } from '@/lib/media'
import { log } from '@/lib/log'

/** Every migration the code expects to be applied (kept in step with supabase/migrations by a unit test). */
export const EXPECTED_MIGRATIONS = ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012', '0013', '0014', '0015', '0016', '0017', '0018', '0019', '0020', '0021', '0022', '0023', '0024', '0025', '0026', '0027', '0028', '0029', '0030', '0031', '0032', '0033', '0034'] as const

/** Variables production needs. Only their presence is reported, never their values. */
export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'ADMIN_TOTP_SECRET',
  'ADMIN_DIGEST_EMAIL',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'HAGERLAND_INBOX_EMAIL',
  'TURNSTILE_SECRET_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'CRON_SECRET',
  'IP_HASH_SALT',
] as const

export interface HealthReport {
  ok: boolean
  env: Record<(typeof REQUIRED_ENV)[number], boolean>
  database: boolean
  migrations: boolean
  storage: boolean
  emailDomain: boolean
}

const present = (name: string) => Boolean(process.env[name]?.trim())

async function check(label: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await fn()
  } catch (err) {
    log.error('health', `${label} check failed`, err)
    return false
  }
}

/** The sending domain of EMAIL_FROM is verified in Resend. */
async function emailDomainVerified(): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const domain = /@([^>\s]+)>?\s*$/.exec(process.env.EMAIL_FROM ?? '')?.[1]?.toLowerCase()
  if (!key || !domain) return false
  const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!res.ok) return false
  const body = (await res.json()) as { data?: { name?: string; status?: string }[] }
  return (body.data ?? []).some((d) => d.name?.toLowerCase() === domain && d.status === 'verified')
}

/** Go-live readiness as true/false answers only (spec 25.2n). */
export async function healthReport(): Promise<HealthReport> {
  const env = Object.fromEntries(REQUIRED_ENV.map((n) => [n, present(n)])) as HealthReport['env']
  const supabaseReady = env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY
  const [database, migrations, storage, emailDomain] = await Promise.all([
    check('database', async () => (supabaseReady ? !(await getAdminSupabase().from('schema_migrations').select('version', { head: true, count: 'exact' })).error : false)),
    check('migrations', async () => {
      if (!supabaseReady) return false
      const { data, error } = await getAdminSupabase().from('schema_migrations').select('version')
      if (error) return false
      const applied = new Set((data ?? []).map((r) => r.version))
      return EXPECTED_MIGRATIONS.every((v) => applied.has(v))
    }),
    check('storage', async () => {
      if (!supabaseReady) return false
      const [a, b] = await Promise.all([getAdminSupabase().storage.getBucket(PUBLIC_BUCKET), getAdminSupabase().storage.getBucket(PRIVATE_BUCKET)])
      return !a.error && !b.error && a.data?.public === true && b.data?.public === false
    }),
    check('email domain', emailDomainVerified),
  ])
  const ok = Object.values(env).every(Boolean) && database && migrations && storage && emailDomain
  return { ok, env, database, migrations, storage, emailDomain }
}
