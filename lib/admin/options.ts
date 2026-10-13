import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { ORG_KIND_LABEL } from '@/lib/org-labels'

export async function listerOptions(): Promise<{ id: string; label: string }[]> {
  const { data } = await getAdminSupabase().from('organisations').select('id, name, kind').in('kind', ['hagerland', 'agency', 'developer']).neq('status', 'removed').order('is_hagerland', { ascending: false }).order('name').limit(2000)
  return (data ?? []).map((o) => ({ id: o.id, label: `${o.name} · ${ORG_KIND_LABEL[o.kind]}` }))
}

export async function developmentOptions(): Promise<{ id: string; name: string }[]> {
  const { data } = await getAdminSupabase().from('developments').select('id, name').neq('status', 'removed').order('name').limit(2000)
  return data ?? []
}

export async function notesFor(entity: string, id: string): Promise<{ note: string; created_at: string }[]> {
  const { data } = await getAdminSupabase().from('admin_notes').select('note, created_at').eq('entity_type', entity).eq('entity_id', id).order('created_at', { ascending: false })
  return data ?? []
}

export async function auditFor(id: string): Promise<{ id: string; action: string; created_at: string; diff: unknown }[]> {
  const { data } = await getAdminSupabase().from('audit_log').select('id, action, created_at, diff').eq('entity_id', id).order('created_at', { ascending: false }).limit(30)
  return data ?? []
}

/** "2026-10-13" style date for <input type=date>. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function developerOptions(): Promise<{ id: string; label: string }[]> {
  const { data } = await getAdminSupabase().from('organisations').select('id, name, kind').in('kind', ['hagerland', 'developer']).neq('status', 'removed').order('is_hagerland', { ascending: false }).order('name').limit(2000)
  return (data ?? []).map((o) => ({ id: o.id, label: o.kind === 'hagerland' ? `${o.name} (HagerLand)` : o.name }))
}
