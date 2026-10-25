import 'server-only'
import { cache } from 'react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { log } from '@/lib/log'

/**
 * Jobs Phase 2 owner switches (site_settings, never public; migration 0040 adds them off / dry run). "Apply by phone"
 * and the worker register stay off until AB's lawyer confirms consent, 18+, sharing phones with employers, data held
 * outside Ethiopia and re-contacting workers. Always read fresh (pages, actions and the cron alike), so switching off
 * takes effect on the next request; if the setting cannot be read, both count as off.
 */
export const PHONE_APPLY_KEY = 'jobs_phone_apply'
export const WORKER_REGISTER_KEY = 'jobs_worker_register'
export const CLEANUP_MODE_KEY = 'jobs_data_cleanup_mode'
export type JobsCleanupMode = 'dry_run' | 'live'

export interface JobsSwitches {
  phoneApply: boolean
  workerRegister: boolean
  cleanupMode: JobsCleanupMode
}

export const readJobsSwitches = cache(async (): Promise<JobsSwitches> => {
  const { data, error } = await getAdminSupabase().from('site_settings').select('key, value').in('key', [PHONE_APPLY_KEY, WORKER_REGISTER_KEY, CLEANUP_MODE_KEY])
  if (error) log.error('jobs', 'switches could not be read', error)
  const value = (key: string) => (error ? undefined : (data ?? []).find((r) => r.key === key)?.value)
  return { phoneApply: value(PHONE_APPLY_KEY) === true, workerRegister: value(WORKER_REGISTER_KEY) === true, cleanupMode: value(CLEANUP_MODE_KEY) === 'live' ? 'live' : 'dry_run' }
})
