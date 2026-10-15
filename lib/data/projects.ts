import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'

/** A building project with its linked service requests (and their quotes) and materials quotes (spec 26.9). */
export async function getProjectWithLinks(id: string, userId?: string) {
  const db = getAdminSupabase()
  let q = db.from('build_projects').select('*, location:locations(display_name)').eq('id', id)
  if (userId) q = q.eq('user_id', userId)
  const { data: project } = await q.maybeSingle()
  if (!project) return null
  const [{ data: requests }, { data: quotes }] = await Promise.all([
    db.from('service_requests').select('id, reference, title, status, vertical_key, created_at, matches:service_request_matches(status, quote_amount_minor, quote_currency, org:organisations(name))').eq('project_id', id).order('created_at'),
    db.from('quote_requests').select('id, reference, status, quoted_total_etb_cents, created_at').eq('project_id', id).order('created_at'),
  ])
  return { project, requests: requests ?? [], quotes: quotes ?? [] }
}
