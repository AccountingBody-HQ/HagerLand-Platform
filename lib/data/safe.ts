import 'server-only'
import { isSupabaseConfigured } from '@/lib/env'
import { log } from '@/lib/log'

/**
 * Runs a public data query and returns `fallback` if Supabase is not configured or the query fails,
 * so pages render honest empty states instead of crashing (e.g. on a preview before migrations run).
 */
export async function safeQuery<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!isSupabaseConfigured()) return fallback
  try {
    return await fn()
  } catch (err) {
    log.error('data', `${label} failed`, err)
    return fallback
  }
}

/** Throws the Supabase error (caught by safeQuery) or returns the data. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data as T
}
