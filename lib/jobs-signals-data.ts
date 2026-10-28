import 'server-only'
// Jobs Phase 6 (admin only): signals between Jobs and Supplies, counts and business names only (blueprint section 10).
// It reads open jobs (through jobs_public, the same "open" rule as the public board), desk assignments and staffing
// requests, and, for "no supply activity yet", only whether a business has any supply quote or order (ids, never a
// price, margin, agreement or ledger row). It never reads candidates, applications or the worker register.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { countBy, tradeName, NO_TRADE, type Count } from '@/lib/jobs-insights'
import { inChunks } from '@/lib/admin/in-chunks'

const OPEN_REQUEST = ['submitted', 'triaged', 'matched', 'quoted']
const OPEN_ASSIGNMENT = ['open', 'searching', 'introducing']

async function staffingCategoryId(): Promise<string | null> {
  const { data } = must(await getAdminSupabase().from('service_categories').select('id').eq('slug', STAFFING_SLUG).maybeSingle())
  return data?.id ?? null
}

/** Demand → Supplies: open jobs by trade (W22) and open staffing requests with HagerLand. */
export async function hiringSignals(): Promise<{ trades: Count[]; openStaffingRequests: number }> {
  const db = getAdminSupabase()
  const category = await staffingCategoryId()
  const [{ data: jobs }, requests] = must(
    await Promise.all([
      db.from('jobs_public').select('trade').limit(5000),
      category ? db.from('service_requests').select('id', { count: 'exact', head: true }).eq('service_category_id', category).in('status', OPEN_REQUEST) : Promise.resolve({ count: 0, error: null }),
    ]),
  )
  return { trades: countBy(jobs ?? [], (j) => j.trade || NO_TRADE, tradeName), openStaffingRequests: requests.count ?? 0 }
}

export interface HiringBusiness {
  orgId: string
  name: string
  openJobs: number
  activeAssignments: number
}

/**
 * W23: businesses with open jobs (their own, not private-client jobs) or an active desk assignment that have no supply
 * quote (asked by their members) and no supply order. HagerLand's own businesses are left out.
 */
export async function hiringWithoutSupplyActivity(): Promise<HiringBusiness[]> {
  const db = getAdminSupabase()
  const [{ data: jobs }, { data: assignments }] = must(
    await Promise.all([
      db.from('jobs_public').select('employer_org_id').eq('posted_for', 'employer').limit(5000),
      db.from('recruitment_assignments').select('employer_org_id').in('status', OPEN_ASSIGNMENT).eq('private_client', false).not('employer_org_id', 'is', null).limit(5000),
    ]),
  )
  const counts = new Map<string, { openJobs: number; activeAssignments: number }>()
  const tally = (orgId: string | null, field: 'openJobs' | 'activeAssignments') => {
    if (!orgId) return
    const c = counts.get(orgId) ?? { openJobs: 0, activeAssignments: 0 }
    c[field]++
    counts.set(orgId, c)
  }
  for (const j of jobs ?? []) tally(j.employer_org_id, 'openJobs')
  for (const a of assignments ?? []) tally(a.employer_org_id, 'activeAssignments')
  const orgIds = Array.from(counts.keys())
  if (!orgIds.length) return []
  const [orgs, orders, members] = await Promise.all([
    inChunks(orgIds, (part) => db.from('organisations').select('id, name, is_hagerland').in('id', part)),
    inChunks(orgIds, (part) => db.from('supply_orders').select('org_id').in('org_id', part).limit(20000)),
    inChunks(orgIds, (part) => db.from('organisation_members').select('org_id, user_id').in('org_id', part).limit(20000)),
  ])
  const userIds = Array.from(new Set(members.map((m) => m.user_id)))
  const quotes = await inChunks(userIds, (part) => db.from('quote_requests').select('requester_user_id').in('requester_user_id', part).limit(20000))
  const quoting = new Set(quotes.map((q) => q.requester_user_id))
  const withOrders = new Set(orders.map((o) => o.org_id))
  const withQuotes = new Set(members.filter((m) => quoting.has(m.user_id)).map((m) => m.org_id))
  return orgs
    .filter((o) => !o.is_hagerland && !withOrders.has(o.id) && !withQuotes.has(o.id))
    .map((o) => ({ orgId: o.id, name: o.name, ...(counts.get(o.id) as { openJobs: number; activeAssignments: number }) }))
    .sort((a, b) => b.openJobs + b.activeAssignments - (a.openJobs + a.activeAssignments) || a.name.localeCompare(b.name))
}

export interface OrgHiring {
  openJobs: number
  trades: string[]
  /** An open staffing request with HagerLand: the desk assignment, or the request before it reached the desk. */
  staffing: { href: string; reference: string } | null
}

/** W21, for the organisation box: the business's open jobs and trades, and any open staffing request with HagerLand. */
export async function organisationHiring(orgId: string): Promise<OrgHiring> {
  const db = getAdminSupabase()
  const category = await staffingCategoryId()
  const [{ data: jobs }, { data: assignment }, { data: members }] = must(
    await Promise.all([
      db.from('jobs_public').select('trade').eq('employer_org_id', orgId).eq('posted_for', 'employer').limit(5000),
      db.from('recruitment_assignments').select('id, reference').eq('employer_org_id', orgId).in('status', OPEN_ASSIGNMENT).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('organisation_members').select('user_id').eq('org_id', orgId).limit(500),
    ]),
  )
  let staffing: OrgHiring['staffing'] = assignment ? { href: `/roodber8/jobs/desk/${assignment.id}`, reference: assignment.reference } : null
  const userIds = (members ?? []).map((m) => m.user_id)
  if (!staffing && category && userIds.length) {
    const { data: request } = must(await db.from('service_requests').select('id, reference').eq('service_category_id', category).in('status', OPEN_REQUEST).in('requester_user_id', userIds).order('created_at', { ascending: false }).limit(1).maybeSingle())
    if (request) staffing = { href: `/roodber8/service-requests/${request.id}`, reference: request.reference }
  }
  const trades = Array.from(new Set((jobs ?? []).map((j) => tradeName(j.trade || NO_TRADE))))
  return { openJobs: (jobs ?? []).length, trades, staffing }
}

/** W27, for the admin building project page: the customer's latest staffing request with HagerLand. */
export async function staffingRequestOf(userId: string | null): Promise<{ id: string; reference: string } | null> {
  if (!userId) return null
  const category = await staffingCategoryId()
  if (!category) return null
  const { data } = must(await getAdminSupabase().from('service_requests').select('id, reference').eq('service_category_id', category).eq('requester_user_id', userId).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(1).maybeSingle())
  return data ?? null
}
