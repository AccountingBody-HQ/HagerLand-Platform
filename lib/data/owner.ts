import 'server-only'
import type { User } from '@supabase/supabase-js'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signedDocumentUrl } from '@/lib/storage'

/** Managed properties linked to this account as their owner (spec 26.7). Linking is done by HagerLand in admin. */
export async function getOwnedProperties(user: User) {
  const { data } = await getAdminSupabase().from('managed_properties').select('id, reference, title, status, address_line, location:locations(display_name)').eq('owner_user_id', user.id).neq('status', 'ended').order('created_at')
  return data ?? []
}

/**
 * One managed property for its linked owner: inspections with photos (10-minute links), rent statements, the
 * maintenance log, shared documents and the message thread. Returns null for anyone else.
 */
export async function getOwnedProperty(user: User, id: string) {
  const db = getAdminSupabase()
  const { data: p } = await db.from('managed_properties').select('id, reference, title, status, address_line, currency, start_date, services, location:locations(display_name)').eq('id', id).eq('owner_user_id', user.id).maybeSingle()
  if (!p || p.status === 'ended') return null
  const [inspections, statements, maintenance, documents, messages] = await Promise.all([
    db.from('property_inspections').select('id, inspected_on, inspector, condition, notes, photo_paths').eq('managed_property_id', id).order('inspected_on', { ascending: false }).limit(12),
    db.from('rent_statements').select('id, period_start, period_end, currency, rent_due_minor, rent_received_minor, expenses_minor, fees_minor, notes').eq('managed_property_id', id).order('period_start', { ascending: false }).limit(24),
    db.from('maintenance_log').select('id, logged_on, title, description, status, currency, cost_minor').eq('managed_property_id', id).order('logged_on', { ascending: false }).limit(50),
    db.from('managed_property_documents').select('id, label, storage_path, created_at').eq('managed_property_id', id).eq('visible_to_owner', true).order('created_at', { ascending: false }),
    db.from('owner_messages').select('id, sender, sender_name, body, created_at').eq('managed_property_id', id).order('created_at').limit(200),
  ])
  // Messages from HagerLand count as read once the owner opens the page.
  await db.from('owner_messages').update({ read_by_owner_at: new Date().toISOString() }).eq('managed_property_id', id).eq('sender', 'hagerland').is('read_by_owner_at', null)
  const withPhotos = await Promise.all((inspections.data ?? []).map(async (i) => ({ ...i, photos: (await Promise.all(i.photo_paths.map((path) => signedDocumentUrl(path)))).filter((u): u is string => Boolean(u)) })))
  // F-5: a document whose file was deleted under the keeping period has no path and no link.
  const docs = await Promise.all((documents.data ?? []).map(async (d) => ({ ...d, url: d.storage_path ? await signedDocumentUrl(d.storage_path, d.label) : null })))
  return { property: p, inspections: withPhotos, statements: statements.data ?? [], maintenance: maintenance.data ?? [], documents: docs, messages: messages.data ?? [] }
}
