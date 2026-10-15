import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminRequest } from '@/lib/admin-auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getClientIp, hashIp } from '@/lib/security'
import { log } from '@/lib/log'
import type { Json } from '@/lib/database.types'

/** For admin pages: redirects to the login screen unless the admin session is valid. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdminRequest())) redirect('/roodber8-login')
}

/** For admin server actions and route handlers: throws unless the admin session is valid. */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdminRequest())) throw new Error('Unauthorized')
}

/** Records an admin action in audit_log (spec 18.2 #17). Never throws. */
export async function audit(action: string, entity: { type?: string; id?: string | null; label?: string | null }, diff?: Record<string, unknown> | null): Promise<void> {
  try {
    await getAdminSupabase()
      .from('audit_log')
      .insert({ actor: 'admin', action, entity_type: entity.type ?? null, entity_id: entity.id ?? null, entity_label: entity.label?.slice(0, 200) ?? null, diff: (diff ?? null) as Json, ip_hash: hashIp(getClientIp(await headers())) })
  } catch (err) {
    log.error('audit', 'audit write failed', err, { action })
  }
}

/** Old → new for the keys that changed (used in audit diffs and the review queue). */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {}
  for (const [k, v] of Object.entries(after)) {
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(v ?? null)) out[k] = { from: before[k] ?? null, to: v ?? null }
  }
  return out
}
