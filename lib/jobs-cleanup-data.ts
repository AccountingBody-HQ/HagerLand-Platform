import 'server-only'
// The 12-month deletion of Jobs personal details: database adapter for lib/jobs-cleanup.ts, the run log and the mode.
// Dry run (the default until the owner switches it) only counts. Live keeps every row and clears the personal details
// (lib/jobs-privacy.ts and lib/jobs-desk.ts say exactly which). Candidate profiles are never touched. People hired
// through HagerLand (a placement that is not cancelled) keep their name, contact and consent record on the shortlist
// row and their name and contact on the application while the fee records need them (lib/jobs-desk.ts retainUntil).
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Json } from '@/lib/database.types'
import { PRIVATE_BUCKET } from '@/lib/media'
import { log } from '@/lib/log'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { CLEARED_EMAIL, clearedApplication, clearedRegisterEntry, deletionCutoff } from '@/lib/jobs-privacy'
import { runCleanupCore, type CleanupAdapter, type CleanupKind, type CleanupResult } from '@/lib/jobs-cleanup'
import { clearedReport, reportClockFrom } from '@/lib/job-reports'
import { clearedCallback } from '@/lib/callbacks'
import { LISTING_REPORT_DECISIONS, clearedListingReport, listingReportClockFrom } from '@/lib/listing-reports'
import { inChunks } from '@/lib/admin/in-chunks'
import { HIRED_APPLICATION_CLEAR, HIRED_SHORTLIST_CLEAR, clearedShortlistRow, placementHold, retainUntil, shortlistDueForDeletion, todayAddis, type HoldState } from '@/lib/jobs-desk'

interface Holds {
  /** Shortlist rows held by a placement, and why. */
  candidates: Map<string, Exclude<HoldState, 'none'>>
  /** Applications those rows came from. */
  applications: Map<string, Exclude<HoldState, 'none'>>
}

/** Which shortlist rows and applications a placement holds today (the hired-through-HagerLand exception). */
async function loadHolds(months: number | null, now: Date): Promise<Holds> {
  const db = getAdminSupabase()
  const today = todayAddis(now)
  const { data: placements, error } = await db.from('recruitment_placements').select('id, candidate_id, status, start_date, guarantee_ends_on').neq('status', 'cancelled')
  if (error) throw new Error(error.message)
  const ids = (placements ?? []).map((p) => p.id)
  const { data: terms } = ids.length ? await db.from('recruitment_fee_terms').select('id, placement_id').in('placement_id', ids) : { data: [] }
  const termIds = (terms ?? []).map((t) => t.id)
  const { data: entries } = termIds.length ? await db.from('recruitment_fee_entries').select('fee_terms_id, occurred_on').in('fee_terms_id', termIds) : { data: [] }
  const lastEntry = new Map<string, string>()
  for (const t of terms ?? []) {
    for (const e of (entries ?? []).filter((x) => x.fee_terms_id === t.id)) {
      if (!lastEntry.has(t.placement_id) || (lastEntry.get(t.placement_id) as string) < e.occurred_on) lastEntry.set(t.placement_id, e.occurred_on)
    }
  }
  const candidates = new Map<string, Exclude<HoldState, 'none'>>()
  for (const p of placements ?? []) {
    const hold = placementHold(p, retainUntil(p.guarantee_ends_on ?? p.start_date, lastEntry.get(p.id) ?? null, months), months, today)
    if (hold !== 'none' && candidates.get(p.candidate_id) !== 'hired') candidates.set(p.candidate_id, hold)
  }
  const applications = new Map<string, Exclude<HoldState, 'none'>>()
  const held = Array.from(candidates.keys())
  if (held.length) {
    const { data: rows } = await db.from('recruitment_candidates').select('id, application_id').in('id', held).not('application_id', 'is', null)
    for (const r of rows ?? []) {
      const hold = candidates.get(r.id)
      if (hold && r.application_id && applications.get(r.application_id) !== 'hired') applications.set(r.application_id, hold)
    }
  }
  return { candidates, applications }
}

/** Shortlist rows whose 12 months have run (from the last activity, never later than the assignment closing). */
async function dueShortlistIds(now: Date, cutoff: string): Promise<string[]> {
  const db = getAdminSupabase()
  const [{ data: byActivity, error: e1 }, { data: closed, error: e2 }] = await Promise.all([
    db.from('recruitment_candidates').select('id').is('personal_data_deleted_at', null).lt('last_activity_at', cutoff).order('id').limit(5000),
    db.from('recruitment_assignments').select('id, closed_at').not('closed_at', 'is', null).lt('closed_at', cutoff).limit(5000),
  ])
  if (e1 || e2) throw new Error((e1 ?? e2)?.message)
  const out = new Set((byActivity ?? []).map((r) => r.id))
  const closedIds = (closed ?? []).map((a) => a.id)
  if (closedIds.length) {
    const closedAt = new Map((closed ?? []).map((a) => [a.id, a.closed_at as string]))
    const { data: rows, error } = await db.from('recruitment_candidates').select('id, assignment_id, last_activity_at').is('personal_data_deleted_at', null).in('assignment_id', closedIds).limit(5000)
    if (error) throw new Error(error.message)
    for (const r of rows ?? []) if (shortlistDueForDeletion(r.last_activity_at, closedAt.get(r.assignment_id) ?? null, now)) out.add(r.id)
  }
  return Array.from(out).sort()
}

function adapter(cutoff: string, now: string, holds: Holds, at: Date): CleanupAdapter {
  const db = getAdminSupabase()
  // Held applications never appear in the due lists (ids are database uuids, never user input).
  const heldApps = Array.from(holds.applications.keys())
  const due = (kind: Exclude<CleanupKind, 'shortlist' | 'reports' | 'callbacks' | 'listing_reports'>) => {
    if (kind === 'applications') {
      const q = db.from('job_applications').select('id', { count: 'exact' }).is('personal_data_deleted_at', null).lt('created_at', cutoff)
      return heldApps.length ? q.not('id', 'in', `(${heldApps.join(',')})`) : q
    }
    if (kind === 'register') return db.from('worker_register').select('id', { count: 'exact' }).is('personal_data_deleted_at', null).lt('last_updated_at', cutoff)
    return db.from('email_outbox').select('id', { count: 'exact' }).lt('created_at', cutoff).neq('subject', CLEARED_EMAIL.subject)
  }
  // Job reports (Jobs Phase 4): 12 months after the later of the report and its handling.
  let reports: string[] | null = null
  const dueReports = async () => {
    if (reports) return reports
    const { data, error } = await db.from('job_reports').select('id, created_at, handled_at').is('personal_data_deleted_at', null).lt('created_at', cutoff).order('id').limit(5000)
    if (error) throw new Error(error.message)
    reports = (data ?? []).filter((r) => reportClockFrom(r.created_at, r.handled_at) < cutoff).map((r) => r.id)
    return reports
  }
  // Call-back requests (Jobs Phase 5): 12 months after the later of the request and the last handling.
  let callbacks: string[] | null = null
  const dueCallbacks = async () => {
    if (callbacks) return callbacks
    const { data, error } = await db.from('callback_requests').select('id, created_at, handled_at').is('personal_data_deleted_at', null).lt('created_at', cutoff).order('id').limit(5000)
    if (error) throw new Error(error.message)
    callbacks = (data ?? []).filter((r) => reportClockFrom(r.created_at, r.handled_at) < cutoff).map((r) => r.id)
    return callbacks
  }
  // Listing reports (Tidy T-2): 12 months after the later of the report and the decision. Decisions made before 0045
  // have no handled_at: their time comes from the audit log (read only; those rows are never filled in).
  let listingReports: string[] | null = null
  const dueListingReports = async () => {
    if (listingReports) return listingReports
    const { data, error } = await db.from('reports').select('id, created_at, handled_at, status').is('personal_data_deleted_at', null).lt('created_at', cutoff).order('id').limit(5000)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    const undated = rows.filter((r) => r.status !== 'open' && !r.handled_at).map((r) => r.id)
    const decided = new Map<string, string>()
    for (const a of await inChunks(undated, (part) => db.from('audit_log').select('entity_id, created_at').eq('entity_type', 'report').in('action', [...LISTING_REPORT_DECISIONS]).in('entity_id', part).limit(5000))) {
      if (a.entity_id && (!decided.has(a.entity_id) || (decided.get(a.entity_id) as string) < a.created_at)) decided.set(a.entity_id, a.created_at)
    }
    listingReports = rows.filter((r) => listingReportClockFrom(r.created_at, r.handled_at, decided.get(r.id) ?? null) < cutoff).map((r) => r.id)
    return listingReports
  }
  let shortlist: string[] | null = null
  const dueShortlist = async () => (shortlist ??= (await dueShortlistIds(at, cutoff)).filter((id) => !holds.candidates.has(id)))
  const heldShortlistAged = async () => {
    const ids = Array.from(holds.candidates.keys())
    if (!ids.length) return []
    const all = await dueShortlistIds(at, cutoff)
    return all.filter((id) => holds.candidates.has(id))
  }
  const heldAppsAged = async () => {
    if (!heldApps.length) return []
    const { data, error } = await db.from('job_applications').select('id').in('id', heldApps).is('personal_data_deleted_at', null).lt('created_at', cutoff)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => r.id)
  }
  const must = <T extends { error: { message: string } | null }>(r: T): T => {
    if (r.error) throw new Error(r.error.message)
    return r
  }
  return {
    countDue: async (kind) => (kind === 'shortlist' ? (await dueShortlist()).length : kind === 'reports' ? (await dueReports()).length : kind === 'callbacks' ? (await dueCallbacks()).length : kind === 'listing_reports' ? (await dueListingReports()).length : (must(await due(kind).limit(1)).count ?? 0)),
    listDue: async (kind, limit) => (kind === 'shortlist' ? (await dueShortlist()).slice(0, limit) : kind === 'reports' ? (await dueReports()).slice(0, limit) : kind === 'callbacks' ? (await dueCallbacks()).slice(0, limit) : kind === 'listing_reports' ? (await dueListingReports()).slice(0, limit) : (must(await due(kind).order('id').limit(limit)).data ?? []).map((r) => r.id)),
    countKept: async () => {
      const kept = { hired: 0, periodNotSet: 0 }
      for (const id of await heldAppsAged()) kept[holds.applications.get(id) === 'hired' ? 'hired' : 'periodNotSet']++
      for (const id of await heldShortlistAged()) kept[holds.candidates.get(id) === 'hired' ? 'hired' : 'periodNotSet']++
      return kept
    },
    trimHeld: async () => {
      let trimmed = 0
      for (const id of await heldAppsAged()) {
        must(await db.from('job_applications').update(HIRED_APPLICATION_CLEAR).eq('id', id).is('personal_data_deleted_at', null))
        trimmed++
      }
      for (const id of await heldShortlistAged()) {
        must(await db.from('recruitment_candidates').update(HIRED_SHORTLIST_CLEAR).eq('id', id).is('personal_data_deleted_at', null))
        trimmed++
      }
      return trimmed
    },
    clear: async (kind, id) => {
      if (kind === 'listing_reports') {
        must(await db.from('reports').update(clearedListingReport(now)).eq('id', id).is('personal_data_deleted_at', null))
        return {}
      }
      if (kind === 'callbacks') {
        must(await db.from('callback_requests').update(clearedCallback(now)).eq('id', id).is('personal_data_deleted_at', null))
        return {}
      }
      if (kind === 'reports') {
        must(await db.from('job_reports').update(clearedReport(now)).eq('id', id).is('personal_data_deleted_at', null))
        return {}
      }
      if (kind === 'shortlist') {
        must(await db.from('recruitment_candidates').update(clearedShortlistRow(now)).eq('id', id).is('personal_data_deleted_at', null))
        return {}
      }
      if (kind === 'register') {
        must(await db.from('worker_register').update(clearedRegisterEntry(now)).eq('id', id).is('personal_data_deleted_at', null))
        return {}
      }
      if (kind === 'emails') {
        must(await db.from('email_outbox').update(CLEARED_EMAIL).eq('id', id))
        return {}
      }
      const { data: a } = must(await db.from('job_applications').select('id, cv_path, cv_purged_at').eq('id', id).is('personal_data_deleted_at', null).maybeSingle())
      if (!a) return {}
      let cvFileDeleted = false
      if (a.cv_path) {
        // The same file may still be on the candidate's profile or on a newer application: then only the link goes.
        const [profile, newer] = await Promise.all([
          db.from('candidate_profiles').select('user_id', { count: 'exact', head: true }).eq('cv_path', a.cv_path),
          db.from('job_applications').select('id', { count: 'exact', head: true }).eq('cv_path', a.cv_path).neq('id', a.id).is('personal_data_deleted_at', null).gte('created_at', cutoff),
        ])
        must(profile)
        must(newer)
        if (!profile.count && !newer.count && a.cv_path.startsWith('docs/cv/')) {
          const { error } = await db.storage.from(PRIVATE_BUCKET).remove([a.cv_path])
          if (error) throw new Error(`CV file: ${error.message}`)
          cvFileDeleted = true
        }
      }
      must(await db.from('job_applications').update({ ...clearedApplication(now), ...(a.cv_path && !a.cv_purged_at ? { cv_purged_at: now } : {}) }).eq('id', a.id).is('personal_data_deleted_at', null))
      return { cvFileDeleted }
    },
  }
}

/**
 * The daily deletion (and the owner's "Run a dry run now"). Mode: the owner's switch, unless `forceDryRun`. Every run
 * is written to job_data_cleanup_runs with counts and the ids that failed.
 */
export async function runJobsDataCleanup(opts: { runBy: string; now?: number; forceDryRun?: boolean }): Promise<CleanupResult> {
  const at = new Date(opts.now ?? Date.now())
  const started = new Date().toISOString()
  const switches = await readJobsSwitches()
  const mode = opts.forceDryRun ? 'dry_run' : switches.cleanupMode
  const holds = await loadHolds(switches.retentionMonths, at)
  const result = await runCleanupCore(adapter(deletionCutoff(at), at.toISOString(), holds, at), mode, {
    onError: (kind, id, err) => log.error('jobs-cleanup', `could not clear ${kind}`, err, { id }),
  })
  const { error } = await getAdminSupabase().from('job_data_cleanup_runs').insert({ mode, started_at: started, counts: result.counts as unknown as NonNullable<Json>, failures: result.failures as unknown as NonNullable<Json>, run_by: opts.runBy.slice(0, 120) })
  if (error) log.error('jobs-cleanup', 'run log failed', error)
  return result
}
