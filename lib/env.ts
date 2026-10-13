import 'server-only'
import { z } from 'zod'

const optional = z.string().trim().min(1).optional()

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ADMIN_USERNAME: optional,
  ADMIN_PASSWORD: optional,
  ADMIN_SESSION_SECRET: z.string().min(32).optional(),
  ADMIN_TOTP_SECRET: optional,
  ADMIN_DIGEST_EMAIL: z.email().optional(),
  TURNSTILE_SECRET_KEY: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  EMAIL_FROM_SUPPLY: optional,
  EMAIL_REPLY_TO: z.email().optional(),
  HAGERLAND_INBOX_EMAIL: z.email().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
  GOOGLE_PLACES_API_KEY: optional,
  ANTHROPIC_API_KEY: optional,
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
