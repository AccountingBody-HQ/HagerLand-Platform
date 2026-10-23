import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminSession, isAdminRequest } from '@/lib/admin-auth'
import { roleCanAccess } from '@/lib/admin/roles'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getClientIp, hashIp } from '@/lib/security'
import { log } from '@/lib/log'
import type { Json } from '@/lib/database.types'

/** For admin pages: redirects to the login screen unless the admin session is valid. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdminRequest())) redirect('/roodber8-login')
}

/**
 * For admin server actions and route handlers: throws unless the admin session is valid and may use `area` (the admin
 * path the action belongs to). A server action can be called from any page, so each action file names its own area
 * and staff roles are checked against it as well as against the page (spec 26.15).
 */
export async function assertAdmin(area?: string): Promise<void> {
  if (!(await isAdminRequest())) throw new Error('Unauthorized')
  if (area) {
    const s = await getAdminSession()
    if (!s || (s.kind === 'staff' && !roleCanAccess(s.role, area))) throw new Error('Unauthorized')
  }
}

/** The master login or a staff member with the owner role: the only people who see margins and commission. */
export async function isOwnerSession(): Promise<boolean> {
  const s = await getAdminSession()
  return s?.kind === 'master' || (s?.kind === 'staff' && s.role === 'owner')
}

/** For owner-only actions (agreements, money, the ledger): throws for anyone but the master login or an owner. */
export async function assertOwner(): Promise<void> {
  if (!(await isOwnerSession())) throw new Error('Unauthorized')
}

/** Who is acting in admin, for audit entries (spec 26.15): 'admin' for the master login, else the staff member. */
export async function adminActor(): Promise<string> {
  const s = await getAdminSession()
  return s?.kind === 'staff' ? `staff:${s.email}`.slice(0, 80) : 'admin'
}

/** Records an admin action in audit_log (spec 18.2 #17). Never throws. */
export async function audit(action: string, entity: { type?: string; id?: string | null; label?: string | null }, diff?: Record<string, unknown> | null): Promise<void> {
  try {
    await getAdminSupabase()
      .from('audit_log')
      .insert({ actor: await adminActor(), action, entity_type: entity.type ?? null, entity_id: entity.id ?? null, entity_label: entity.label?.slice(0, 200) ?? null, diff: (diff ?? null) as Json, ip_hash: hashIp(getClientIp(await headers())) })
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
