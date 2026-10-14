import 'server-only'
import { z } from 'zod'

/** Optional variable: an empty value counts as not set. */
const opt = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional())
const optional = opt(z.string().trim().min(1))

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ADMIN_USERNAME: optional,
  ADMIN_PASSWORD: optional,
  ADMIN_SESSION_SECRET: opt(z.string().min(32)),
  ADMIN_TOTP_SECRET: optional,
  ADMIN_DIGEST_EMAIL: opt(z.email()),
  TURNSTILE_SECRET_KEY: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  EMAIL_FROM_SUPPLY: optional,
  EMAIL_REPLY_TO: opt(z.email()),
  HAGERLAND_INBOX_EMAIL: opt(z.email()),
  CRON_SECRET: opt(z.string().min(16)),
  IP_HASH_SALT: opt(z.string().min(16)),
  GOOGLE_PLACES_API_KEY: optional,
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: optional,
  CRON_PURGE_RATE_LIMITS: opt(z.enum(['true', 'false'])),
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: opt(z.enum(['true', 'false'])),
  NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: optional,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optional,
  NEXT_PUBLIC_SITE_URL: opt(z.url()),
  NEXT_PUBLIC_MAP_TILE_URL: optional,
  NEXT_PUBLIC_MAP_ATTRIBUTION: optional,
  EMAIL_TEST_MAILPIT_URL: opt(z.string().regex(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/, 'must be a localhost URL')),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

/**
 * Validated server environment. Throws a readable error naming every
 * missing or malformed variable the first time it is used.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment configuration. ${problems}. See .env.example.`)
  }
  cached = parsed.data
  return cached
}

/** True when the Supabase variables are present (lets builds without secrets degrade gracefully). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SECRET_KEY,
  )
}
