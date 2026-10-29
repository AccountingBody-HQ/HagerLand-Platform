import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { roleCanAccess, type StaffRole } from '@/lib/admin/roles'
import { ADMIN_NAV } from '@/components/admin/admin-nav-items'
import { waitingCallbacks } from '@/lib/callbacks-data'
import { log } from '@/lib/log'
import { REGISTRATION_WAITING } from '@/lib/supply/partner-rules'

export interface QueueCounts {
  properties: number
  developments: number
  organisations: number
  portfolio: number
  products: number
  media: number
  changes: number
  claims: number
  verification: number
  reports: number
  jobs: number
  updates: number
  /** Open "Report this job" reports (Jobs Phase 4). */
  jobReports: number
}

const head = { count: 'exact' as const, head: true }
const c = (r: { count: number | null }) => r.count ?? 0

/** Items waiting for a decision in each review tab. The failure rule applies (Fix F-2): a failed count throws, never 0. */
export async function queueCounts(): Promise<QueueCounts> {
  const db = getAdminSupabase()
  const [p, d, o, pf, m, pc, dc, oc, cl, v, r, j, u, pr, prc, jr] = must(await Promise.all([
    db.from('properties').select('id', head).eq('status', 'pending_review'),
    db.from('developments').select('id', head).eq('status', 'pending_review'),
    db.from('organisations').select('id', head).eq('status', 'pending_review'),
    db.from('portfolio_projects').select('id', head).eq('status', 'pending_review'),
    db.from('media').select('id', head).eq('status', 'pending'),
    db.from('properties').select('id', head).not('pending_changes', 'is', null).in('status', ['published', 'paused']),
    db.from('developments').select('id', head).not('pending_changes', 'is', null).in('status', ['published', 'paused']),
    db.from('organisations').select('id', head).not('pending_changes', 'is', null).eq('status', 'published'),
    db.from('claims').select('id', head).eq('status', 'pending'),
    db.from('verification_requests').select('id', head).eq('status', 'pending'),
    db.from('reports').select('id', head).eq('status', 'open'),
    db.from('job_posts').select('id', head).eq('status', 'pending_review'),
    db.from('development_updates').select('id', head).eq('status', 'pending_review'),
    db.from('products').select('id', head).eq('status', 'pending_review'),
    db.from('products').select('id', head).not('pending_changes', 'is', null).in('status', ['published', 'paused']),
    db.from('job_reports').select('id', head).eq('status', 'open'),
  ]))
  return { properties: c(p), developments: c(d), organisations: c(o), portfolio: c(pf), products: c(pr), media: c(m), changes: c(pc) + c(dc) + c(oc) + c(prc), claims: c(cl), verification: c(v), reports: c(r), jobs: c(j), updates: c(u), jobReports: c(jr) }
}

export function totalQueue(q: QueueCounts): number {
  return q.properties + q.developments + q.organisations + q.portfolio + q.products + q.media + q.changes + q.claims + q.verification + q.reports + q.jobs + q.updates + q.jobReports
}

/** Enquiries to a business or person not opened within 48 hours (the dashboard, the digest and the menu count the same). */
export function unansweredEnquiriesCount(now: number) {
  return getAdminSupabase().from('enquiries').select('id', head).is('first_viewed_at', null).lt('created_at', new Date(now - 48 * 3_600_000).toISOString()).not('target_type', 'in', '("general","hagerland_development")')
}

/** Account deletion requests not carried out yet (Delete account removes the profile), and when the oldest was made. */
export async function deletionRequests(): Promise<{ count: number; oldestAt: string | null }> {
  const db = getAdminSupabase()
  const [{ count }, { data }] = must(await Promise.all([
    db.from('profiles').select('id', head).not('deletion_requested_at', 'is', null),
    db.from('profiles').select('deletion_requested_at').not('deletion_requested_at', 'is', null).order('deletion_requested_at').limit(1),
  ]))
  return { count: count ?? 0, oldestAt: data?.[0]?.deletion_requested_at ?? null }
}

/** Menu counts: a number, or null when it could not be counted (the menu then shows "!"). */
export type MenuBadges = Record<string, number | null>

type HeadCount = PromiseLike<{ count: number | null; error: { message: string } | null }>
const counted = async (q: HeadCount) => must(await q).count ?? 0

const BADGE_COUNTS: Record<string, (now: number) => Promise<number>> = {
  review: async () => totalQueue(await queueCounts()),
  quotes: () => counted(getAdminSupabase().from('quote_requests').select('id', head).eq('status', 'submitted')),
  interest: () => counted(getAdminSupabase().from('interest_registrations').select('id', head).eq('status', 'new')),
  requests: () => counted(getAdminSupabase().from('service_requests').select('id', head).in('status', ['submitted', 'triaged'])),
  care: () => counted(getAdminSupabase().from('property_care_requests').select('id', head).eq('status', 'new')),
  trade: () => counted(getAdminSupabase().from('trade_accounts').select('id', head).eq('status', 'pending')),
  email: () => counted(getAdminSupabase().from('email_outbox').select('id', head).eq('status', 'failed')),
  agency: () => counted(getAdminSupabase().from('agency_viewings').select('id', head).eq('status', 'requested')),
  reviews: () => counted(getAdminSupabase().from('reviews').select('id', head).eq('status', 'pending')),
  // Fix F-2 (K-02, M-03): the same queries as the daily digest.
  enquiries: (now) => counted(unansweredEnquiriesCount(now)),
  callbacks: () => waitingCallbacks(),
  partners: () => counted(getAdminSupabase().from('partner_applications').select('id', head).eq('status', 'new')),
  // S6-1: the same queries as the daily digest.
  partnerRegistrations: () => counted(getAdminSupabase().from('partner_registrations').select('id', head).in('status', REGISTRATION_WAITING)),
  partnerDrafts: () => counted(getAdminSupabase().from('partner_product_drafts').select('id', head).eq('status', 'submitted')),
  // S6-2: order requests waiting for a stock check (the same query as the daily digest).
  orderRequests: () => counted(getAdminSupabase().from('order_requests').select('id', head).eq('status', 'submitted')),
  users: async () => (await deletionRequests()).count,
}

/** Menu keys this role may see: only items whose area the role may open are counted at all (no count reaches the page otherwise). */
export function badgeKeysFor(role: StaffRole | null): string[] {
  return ADMIN_NAV.filter((i) => i.badgeKey && (!role || roleCanAccess(role, i.href))).map((i) => i.badgeKey as string)
}

/** The menu counts for this role. Each is counted on its own: one failing shows "!" there and never stops the page. */
export async function menuBadges(role: StaffRole | null, now = Date.now()): Promise<MenuBadges> {
  const entries = await Promise.all(
    badgeKeysFor(role).map(async (key): Promise<[string, number | null]> => {
      try {
        return [key, await BADGE_COUNTS[key](now)]
      } catch (err) {
        log.error('admin', `menu count failed: ${key}`, err)
        return [key, null]
      }
    }),
  )
  return Object.fromEntries(entries)
}
