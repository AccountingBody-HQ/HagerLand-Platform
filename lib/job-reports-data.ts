import 'server-only'
// Jobs Phase 4: "Report this job" (database side). Reports are server only (migration 0042: no grants). A repeat
// report on the same job by the same connection or account is not stored again (the reporter sees the same thanks).
import { getAdminSupabase } from '@/lib/supabase/admin'
import { log } from '@/lib/log'
import { MANY_REPORTS, distinctReporters, type ReportReason } from '@/lib/job-reports'
import { asJobActor } from '@/lib/job-status-actor'

/** Stores a report unless the same connection or account already has an open report on this job. */
export async function storeJobReport(r: { jobId: string; reason: ReportReason; details: string | null; contact: string | null; userId: string | null; ipHash: string }): Promise<'stored' | 'repeat' | 'failed'> {
  const db = getAdminSupabase()
  const openBy = (col: 'ip_hash' | 'reporter_user_id', value: string) => db.from('job_reports').select('id').eq('job_post_id', r.jobId).eq('status', 'open').eq(col, value).limit(1)
  const checks = await Promise.all([openBy('ip_hash', r.ipHash), ...(r.userId ? [openBy('reporter_user_id', r.userId)] : [])])
  if (checks.some((c) => c.error)) {
    log.error('job-reports', 'repeat check failed', checks.find((c) => c.error)?.error)
    return 'failed'
  }
  if (checks.some((c) => (c.data ?? []).length)) return 'repeat'
  const { error } = await db.from('job_reports').insert({ job_post_id: r.jobId, reason: r.reason, details: r.details, contact: r.contact, reporter_user_id: r.userId, ip_hash: r.ipHash })
  if (error?.code === '23505') return 'repeat'
  if (error) {
    log.error('job-reports', 'insert failed', error)
    return 'failed'
  }
  return 'stored'
}

/** Digest counts (W22): open reports, and jobs with 3 or more different reporters in the last 7 days. */
export async function jobReportDigestCounts(now: number): Promise<[string, number][]> {
  const db = getAdminSupabase()
  const [{ count: open }, { data: week }] = await Promise.all([
    db.from('job_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('job_reports').select('id, job_post_id, reporter_user_id, ip_hash').gte('created_at', new Date(now - 7 * 86_400_000).toISOString()).limit(5000),
  ])
  const byJob = new Map<string, { id: string; reporter_user_id: string | null; ip_hash: string | null }[]>()
  for (const r of week ?? []) byJob.set(r.job_post_id, [...(byJob.get(r.job_post_id) ?? []), r])
  const many = Array.from(byJob.values()).filter((rows) => distinctReporters(rows) >= MANY_REPORTS).length
  return [
    ['Job reports to review', open ?? 0],
    ['Jobs with 3 or more reports this week', many],
  ]
}

/**
 * Puts a paused job back on the board without giving it a new closing date: publishing restarts the expiry clock
 * (0019 trigger), so the previous expiry is written back. A job whose expiry has passed becomes "expired" instead.
 */
export async function restorePausedJob(jobId: string): Promise<{ ok: true; status: 'published' | 'expired' } | { ok: false }> {
  const db = getAdminSupabase()
  const { data: job } = await db.from('job_posts').select('id, status, expires_at').eq('id', jobId).maybeSingle()
  if (!job || job.status !== 'paused') return { ok: false }
  if (job.expires_at && job.expires_at <= new Date().toISOString()) {
    const { error } = await asJobActor(db.from('job_posts').update({ status: 'expired' }).eq('id', jobId).eq('status', 'paused'), 'staff')
    return error ? { ok: false } : { ok: true, status: 'expired' }
  }
  const { error } = await asJobActor(db.from('job_posts').update({ status: 'published' }).eq('id', jobId).eq('status', 'paused'), 'staff')
  if (error) return { ok: false }
  if (job.expires_at) await db.from('job_posts').update({ expires_at: job.expires_at }).eq('id', jobId)
  return { ok: true, status: 'published' }
}

export interface ReportGroup {
  job: { id: string; title: string; status: string; posted_for: string; employerName: string; employerVerification: string | null }
  distinctReporters: number
  asksForMoney: boolean
  reports: { id: string; reason: string; details: string | null; contact: string | null; created_at: string; staff_note: string | null; reporterBusiness: string | null }[]
}

/** Open reports grouped by job, for admin (Owner and Operations). Reporter details never leave admin. */
export async function openReportGroups(): Promise<ReportGroup[]> {
  const db = getAdminSupabase()
  const { data: reports } = await db.from('job_reports').select('id, job_post_id, reason, details, contact, reporter_user_id, ip_hash, created_at, staff_note').eq('status', 'open').order('created_at').limit(500)
  const rows = reports ?? []
  if (!rows.length) return []
  const jobIds = Array.from(new Set(rows.map((r) => r.job_post_id)))
  const userIds = Array.from(new Set(rows.map((r) => r.reporter_user_id).filter((x): x is string => Boolean(x))))
  const [{ data: jobs }, { data: memberships }] = await Promise.all([
    db.from('job_posts').select('id, title, status, posted_for, employer:organisations(name, verification_level)').in('id', jobIds),
    userIds.length ? db.from('organisation_members').select('user_id, org:organisations(name)').in('user_id', userIds) : Promise.resolve({ data: [] }),
  ])
  const businessOf = new Map<string, string>()
  for (const m of memberships ?? []) {
    const name = (m.org as { name: string } | null)?.name
    if (name && !businessOf.has(m.user_id)) businessOf.set(m.user_id, name)
  }
  return jobIds.map((id) => {
    const j = (jobs ?? []).find((x) => x.id === id)
    const mine = rows.filter((r) => r.job_post_id === id)
    const employer = j?.employer as { name: string; verification_level: string } | null
    return {
      job: { id, title: j?.title ?? '', status: j?.status ?? '', posted_for: j?.posted_for ?? 'employer', employerName: j?.posted_for === 'private_client' ? 'Private client (HagerLand)' : (employer?.name ?? ''), employerVerification: j?.posted_for === 'private_client' ? null : (employer?.verification_level ?? null) },
      distinctReporters: distinctReporters(mine),
      asksForMoney: mine.some((r) => r.reason === 'asks_for_money'),
      reports: mine.map((r) => ({ id: r.id, reason: r.reason, details: r.details, contact: r.contact, created_at: r.created_at, staff_note: r.staff_note, reporterBusiness: r.reporter_user_id ? (businessOf.get(r.reporter_user_id) ?? null) : null })),
    }
  })
}
