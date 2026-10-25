import 'server-only'
// The 12-month deletion of Jobs personal details: database adapter for lib/jobs-cleanup.ts, the run log and the mode.
// Dry run (the default until the owner switches it) only counts. Live keeps every row and clears the personal details
// (lib/jobs-privacy.ts says exactly which). Candidate profiles are never touched.
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Json } from '@/lib/database.types'
import { PRIVATE_BUCKET } from '@/lib/media'
import { log } from '@/lib/log'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { CLEARED_EMAIL, clearedApplication, clearedRegisterEntry, deletionCutoff } from '@/lib/jobs-privacy'
import { runCleanupCore, type CleanupAdapter, type CleanupKind, type CleanupResult } from '@/lib/jobs-cleanup'

function adapter(cutoff: string, now: string): CleanupAdapter {
  const db = getAdminSupabase()
  const due = (kind: CleanupKind) => {
    if (kind === 'applications') return db.from('job_applications').select('id', { count: 'exact' }).is('personal_data_deleted_at', null).lt('created_at', cutoff)
    if (kind === 'register') return db.from('worker_register').select('id', { count: 'exact' }).is('personal_data_deleted_at', null).lt('last_updated_at', cutoff)
    return db.from('email_outbox').select('id', { count: 'exact' }).lt('created_at', cutoff).neq('subject', CLEARED_EMAIL.subject)
  }
  const must = <T extends { error: { message: string } | null }>(r: T): T => {
    if (r.error) throw new Error(r.error.message)
    return r
  }
  return {
    countDue: async (kind) => must(await due(kind).limit(1)).count ?? 0,
    listDue: async (kind, limit) => (must(await due(kind).order('id').limit(limit)).data ?? []).map((r) => r.id),
    clear: async (kind, id) => {
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
  const mode = opts.forceDryRun ? 'dry_run' : (await readJobsSwitches()).cleanupMode
  const result = await runCleanupCore(adapter(deletionCutoff(at), at.toISOString()), mode, {
    onError: (kind, id, err) => log.error('jobs-cleanup', `could not clear ${kind}`, err, { id }),
  })
  const { error } = await getAdminSupabase().from('job_data_cleanup_runs').insert({ mode, started_at: started, counts: result.counts as unknown as NonNullable<Json>, failures: result.failures as unknown as NonNullable<Json>, run_by: opts.runBy.slice(0, 120) })
  if (error) log.error('jobs-cleanup', 'run log failed', error)
  return result
}
