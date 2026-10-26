import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'

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

const c = (r: { count: number | null }) => r.count ?? 0

/** Items waiting for a decision in each review tab. */
export async function queueCounts(): Promise<QueueCounts> {
  const db = getAdminSupabase()
  const head = { count: 'exact' as const, head: true }
  const [p, d, o, pf, m, pc, dc, oc, cl, v, r, j, u, pr, prc, jr] = await Promise.all([
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
  ])
  return { properties: c(p), developments: c(d), organisations: c(o), portfolio: c(pf), products: c(pr), media: c(m), changes: c(pc) + c(dc) + c(oc) + c(prc), claims: c(cl), verification: c(v), reports: c(r), jobs: c(j), updates: c(u), jobReports: c(jr) }
}

export function totalQueue(q: QueueCounts): number {
  return q.properties + q.developments + q.organisations + q.portfolio + q.products + q.media + q.changes + q.claims + q.verification + q.reports + q.jobs + q.updates + q.jobReports
}
