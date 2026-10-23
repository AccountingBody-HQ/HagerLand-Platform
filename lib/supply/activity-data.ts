import 'server-only'
// Supply Phase 5 (admin): an organisation's activity across services in one place (blueprint Phase 5: "link
// contractor organisations and Jobs", read-only): its job posts, building projects it was matched to, quotes its
// people asked for, and its supplier orders and requests. Service role, server only.
import { getAdminSupabase } from '@/lib/supabase/admin'

export interface OrganisationActivity {
  jobs: { id: string; title: string; category: string; status: string }[]
  projects: { id: string; reference: string; title: string; status: string }[]
  quotes: { id: string; reference: string; status: string }[]
  orders: { id: string; reference: string; status: string }[]
  timesAsked: number
}

export async function organisationActivity(orgId: string): Promise<OrganisationActivity> {
  const db = getAdminSupabase()
  const [{ data: jobs }, { data: matches }, { data: members }, { data: orders }, { count: asked }] = await Promise.all([
    db.from('job_posts').select('id, title, category, status').eq('employer_org_id', orgId).order('created_at', { ascending: false }).limit(50),
    db.from('service_request_matches').select('request:service_requests!inner(project_id)').eq('org_id', orgId).not('request.project_id', 'is', null).limit(500),
    db.from('organisation_members').select('user_id').eq('org_id', orgId),
    db.from('supply_orders').select('id, reference, status').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50),
    db.from('supply_quote_lines').select('id', { count: 'exact', head: true }).eq('org_id', orgId).not('asked_at', 'is', null),
  ])
  const projectIds = Array.from(new Set((matches ?? []).map((m) => (m.request as { project_id: string | null } | null)?.project_id).filter((x): x is string => Boolean(x))))
  const userIds = (members ?? []).map((m) => m.user_id)
  const [{ data: projects }, { data: quotes }] = await Promise.all([
    projectIds.length ? db.from('build_projects').select('id, reference, title, status').in('id', projectIds).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
    userIds.length ? db.from('quote_requests').select('id, reference, status').in('requester_user_id', userIds).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
  ])
  return { jobs: jobs ?? [], projects: projects ?? [], quotes: quotes ?? [], orders: orders ?? [], timesAsked: asked ?? 0 }
}
