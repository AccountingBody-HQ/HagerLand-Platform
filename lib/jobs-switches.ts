import 'server-only'
import { cache } from 'react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { log } from '@/lib/log'
import { DESK_SWITCH_KEY, RETENTION_MONTHS_KEY } from '@/lib/jobs-desk'

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

export interface JobsSwitches {
  phoneApply: boolean
  workerRegister: boolean
  cleanupMode: JobsCleanupMode
  /** Jobs Phase 3 (0041): the recruitment desk shows and emails employers only when on (starts off). */
  recruitmentDesk: boolean
  /** Months hired people's details are kept after the guarantee or last fee entry; null until the lawyer confirms. */
  retentionMonths: number | null
}

export const readJobsSwitches = cache(async (): Promise<JobsSwitches> => {
  const { data, error } = await getAdminSupabase().from('site_settings').select('key, value').in('key', [PHONE_APPLY_KEY, WORKER_REGISTER_KEY, CLEANUP_MODE_KEY, DESK_SWITCH_KEY, RETENTION_MONTHS_KEY])
  if (error) log.error('jobs', 'switches could not be read', error)
  const value = (key: string) => (error ? undefined : (data ?? []).find((r) => r.key === key)?.value)
  const months = value(RETENTION_MONTHS_KEY)
  return {
    phoneApply: value(PHONE_APPLY_KEY) === true,
    workerRegister: value(WORKER_REGISTER_KEY) === true,
    cleanupMode: value(CLEANUP_MODE_KEY) === 'live' ? 'live' : 'dry_run',
    recruitmentDesk: value(DESK_SWITCH_KEY) === true,
    retentionMonths: typeof months === 'number' && Number.isInteger(months) && months > 0 ? months : null,
  }
})
