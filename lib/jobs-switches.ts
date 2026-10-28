import 'server-only'
import { cache } from 'react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { log } from '@/lib/log'
import { DESK_SWITCH_KEY, RETENTION_MONTHS_KEY } from '@/lib/jobs-desk'
import { PRIVATE_CLIENT_SWITCH_KEY, REPORTS_SWITCH_KEY } from '@/lib/job-reports'

/**
 * Jobs Phase 2 owner switches (site_settings, never public; migration 0040 adds them off / dry run). "Apply by phone"
 * and the worker register stay off until AB's lawyer confirms consent, 18+, sharing phones with employers, data held
 * outside Ethiopia and re-contacting workers. Always read fresh (pages, actions and the cron alike), so switching off
 * takes effect on the next request; if the setting cannot be read, every switch counts as off and the keeping period
 * as not set.
 */
export const PHONE_APPLY_KEY = 'jobs_phone_apply'
export const WORKER_REGISTER_KEY = 'jobs_worker_register'
export const CLEANUP_MODE_KEY = 'jobs_data_cleanup_mode'
export type JobsCleanupMode = 'dry_run' | 'live'
/** Jobs Phase 5 (0043): Amharic for Jobs pages (the middleware reads it through site_settings_public) and call-backs. */
export const JOBS_AMHARIC_KEY = 'jobs_amharic'
export const CALLBACKS_SWITCH_KEY = 'jobs_callbacks'

export interface JobsSwitches {
  phoneApply: boolean
  workerRegister: boolean
  cleanupMode: JobsCleanupMode
  /** Jobs Phase 3 (0041): the recruitment desk shows and emails employers only when on (starts off). */
  recruitmentDesk: boolean
  /** Months hired people's details are kept after the guarantee or last fee entry; null until the lawyer confirms. */
  retentionMonths: number | null
  /** Jobs Phase 4 (0042): "Report this job" (on by default; off if the setting cannot be read). */
  reportsEnabled: boolean
  /** Jobs Phase 4 (0042): jobs HagerLand posts for a private client (starts off until the lawyer confirms). */
  privateClientPosts: boolean
  /** Jobs Phase 5 (0043): Amharic for Jobs (starts off until the native-speaker review is done). */
  jobsAmharic: boolean
  /** Jobs Phase 5 (0043): call-back requests from people hiring (starts off until the lawyer confirms). */
  callbacks: boolean
}

export const readJobsSwitches = cache(async (): Promise<JobsSwitches> => {
  const { data, error } = await getAdminSupabase().from('site_settings').select('key, value').in('key', [PHONE_APPLY_KEY, WORKER_REGISTER_KEY, CLEANUP_MODE_KEY, DESK_SWITCH_KEY, RETENTION_MONTHS_KEY, REPORTS_SWITCH_KEY, PRIVATE_CLIENT_SWITCH_KEY, JOBS_AMHARIC_KEY, CALLBACKS_SWITCH_KEY])
  if (error) log.error('jobs', 'switches could not be read', error)
  const value = (key: string) => (error ? undefined : (data ?? []).find((r) => r.key === key)?.value)
  const months = value(RETENTION_MONTHS_KEY)
  return {
    phoneApply: value(PHONE_APPLY_KEY) === true,
    workerRegister: value(WORKER_REGISTER_KEY) === true,
    cleanupMode: value(CLEANUP_MODE_KEY) === 'live' ? 'live' : 'dry_run',
    recruitmentDesk: value(DESK_SWITCH_KEY) === true,
    retentionMonths: typeof months === 'number' && Number.isInteger(months) && months > 0 ? months : null,
    reportsEnabled: value(REPORTS_SWITCH_KEY) === true,
    privateClientPosts: value(PRIVATE_CLIENT_SWITCH_KEY) === true,
    jobsAmharic: value(JOBS_AMHARIC_KEY) === true,
    callbacks: value(CALLBACKS_SWITCH_KEY) === true,
  }
})
