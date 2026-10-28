'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/jobs'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { CALLBACKS_SWITCH_KEY, CLEANUP_MODE_KEY, JOBS_AMHARIC_KEY, PHONE_APPLY_KEY, WORKER_REGISTER_KEY } from '@/lib/jobs-switches'
import { runJobsDataCleanup } from '@/lib/jobs-cleanup-data'
import { cleanupRunText } from '@/lib/jobs-cleanup'
import { DESK_SWITCH_KEY, RETENTION_MONTHS_KEY, todayAddis } from '@/lib/jobs-desk'
import { PRIVATE_CLIENT_SWITCH_KEY, REPORTS_SWITCH_KEY } from '@/lib/job-reports'
import { VERIFICATION_EXPIRY_KEY, VERIFICATION_EXPIRY_STARTED_KEY } from '@/lib/verification'

type Msg = ActionResult<{ message: string }>

const SWITCH_KEYS = {
  phone_apply: PHONE_APPLY_KEY,
  worker_register: WORKER_REGISTER_KEY,
  recruitment_desk: DESK_SWITCH_KEY,
  reports: REPORTS_SWITCH_KEY,
  private_client: PRIVATE_CLIENT_SWITCH_KEY,
  verification_expiry: VERIFICATION_EXPIRY_KEY,
  jobs_amharic: JOBS_AMHARIC_KEY,
  callbacks: CALLBACKS_SWITCH_KEY,
} as const
const SWITCH_NAMES = {
  phone_apply: 'Apply by phone',
  worker_register: 'The worker register',
  recruitment_desk: 'The recruitment desk',
  reports: '“Report this job”',
  private_client: 'Private-client jobs',
  verification_expiry: 'The legacy badge clean-up',
  jobs_amharic: 'Amharic for Jobs',
  callbacks: 'Call-back requests',
} as const
/** "Report this job" is not lawyer-gated (AB's fix F8); every other switch needs its confirmation tick to go on. */
const NO_TICK = new Set(['reports'])

/**
 * Owner only: "Apply by phone", the worker register or the recruitment desk (Jobs Phase 3) on or off. All start off
 * until the lawyer confirms; switching on needs the "lawyer has confirmed" tick.
 */
export async function setJobsSwitchAction(which: string, on: boolean, lawyerConfirmed: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.object({ which: z.enum(['phone_apply', 'worker_register', 'recruitment_desk', 'reports', 'private_client', 'verification_expiry', 'jobs_amharic', 'callbacks']), on: z.boolean() }).safeParse({ which, on })
  if (!parsed.success) return fail('Choose a switch.')
  if (parsed.data.on && !lawyerConfirmed && !NO_TICK.has(parsed.data.which)) return fail(parsed.data.which === 'verification_expiry' ? 'Tick that you understand what happens before switching this on.' : parsed.data.which === 'jobs_amharic' ? 'Tick that the native-speaker review is done before switching this on.' : 'Tick that the lawyer has confirmed the points listed before switching this on.')
  const key = SWITCH_KEYS[parsed.data.which]
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', key).maybeSingle()
  const { error } = await db.from('site_settings').upsert({ key, value: parsed.data.on, updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  // Legacy badges get 90 days from the day the clean-up is switched on (F3); switching it on again starts a new 90 days.
  if (parsed.data.which === 'verification_expiry') await db.from('site_settings').upsert({ key: VERIFICATION_EXPIRY_STARTED_KEY, value: parsed.data.on ? todayAddis() : 'off', updated_at: new Date().toISOString() })
  await audit('jobs.switch', { type: 'setting', label: key }, { from: before?.value ?? false, to: parsed.data.on })
  revalidatePath('/jobs', 'layout')
  revalidatePath('/roodber8/jobs', 'layout')
  if (parsed.data.which === 'private_client') {
    revalidatePath('/terms')
    revalidatePath('/sitemap/jobs.xml')
  }
  // Jobs Phase 5: Amharic for Jobs changes the Amharic pages, the language switch, the jobs sitemap and the legal notes (W19,
  // W20); call-backs add or remove the box on /jobs and the staffing page. The middleware re-reads the switch within a minute.
  if (parsed.data.which === 'jobs_amharic' || parsed.data.which === 'callbacks') {
    revalidateTag('settings')
    revalidatePath('/request-service/staffing')
    revalidatePath('/privacy')
    revalidatePath('/terms')
    revalidatePath('/sitemap/jobs.xml')
  }
  if (parsed.data.which === 'recruitment_desk') {
    revalidatePath('/terms')
    revalidatePath('/account/service-requests', 'layout')
  }
  return ok({ message: `${SWITCH_NAMES[parsed.data.which]} is now ${parsed.data.on ? 'on' : 'off'} on the website.` })
}

/** Owner only: dry run (report only) or live (the daily job deletes personal details older than 12 months). */
export async function setJobsCleanupModeAction(mode: string, readDryRun: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.enum(['dry_run', 'live']).safeParse(mode)
  if (!parsed.success) return fail('Choose a mode.')
  if (parsed.data === 'live' && !readDryRun) return fail('Tick that you have read the latest dry run before switching on live deletion.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', CLEANUP_MODE_KEY).maybeSingle()
  const { error } = await db.from('site_settings').upsert({ key: CLEANUP_MODE_KEY, value: parsed.data, updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  await audit('jobs.cleanup_mode', { type: 'setting', label: CLEANUP_MODE_KEY }, { from: before?.value ?? 'dry_run', to: parsed.data })
  revalidatePath('/roodber8/jobs', 'layout')
  return ok({ message: parsed.data === 'live' ? 'Live: the next daily run deletes personal details older than 12 months.' : 'Dry run: the daily run only counts.' })
}

/** Owner only: work out now what the deletion would clear (changes nothing). */
export async function runJobsDryRunAction(): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const result = await runJobsDataCleanup({ runBy: await adminActor(), forceDryRun: true })
  await audit('jobs.cleanup_dry_run', { type: 'jobs' }, { due: result.counts.due })
  revalidatePath('/roodber8/jobs/data')
  return ok({ message: `Dry run done: ${cleanupRunText('dry_run', result.counts)}. Nothing was changed.` })
}

/**
 * Owner only: how many months hired people's details are kept after the guarantee or the last fee entry (Jobs Phase 3).
 * Empty until the lawyer confirms the period: then nothing held for a placement is deleted.
 */
export async function setRetentionMonthsAction(months: string, lawyerConfirmed: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const text = months.trim()
  const parsed = text === '' ? { success: true as const, data: null } : z.coerce.number().int().min(1).max(240).safeParse(text)
  if (!parsed.success) return fail('Enter whole months (1 to 240), or leave it empty.')
  if (parsed.data !== null && !lawyerConfirmed) return fail('Tick that the lawyer has confirmed the period before saving it.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', RETENTION_MONTHS_KEY).maybeSingle()
  // An empty period is stored as the text "not_set" (the database column cannot hold an empty value); it reads as empty.
  const { error } = await db.from('site_settings').upsert({ key: RETENTION_MONTHS_KEY, value: parsed.data ?? 'not_set', updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  await audit('jobs.retention_months', { type: 'setting', label: RETENTION_MONTHS_KEY }, { from: before?.value ?? null, to: parsed.data })
  revalidatePath('/roodber8/jobs/data')
  return ok({ message: parsed.data === null ? 'Keeping period cleared: hired people’s details are kept until it is set.' : `Keeping period saved: ${parsed.data} months.` })
}

/** Owner and Operations: follow up a worker register entry (status and private notes; never shown to employers). */
export async function updateWorkerRegisterAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(['new', 'contacted', 'closed']), admin_notes: z.string().max(2000).transform((v) => v.trim() || null) })
    .safeParse({ id: formData.get('id'), status: formData.get('status'), admin_notes: formData.get('admin_notes') ?? '' })
  if (!parsed.success) return fail('Please check the status and notes.')
  const { data, error } = await getAdminSupabase()
    .from('worker_register')
    .update({ status: parsed.data.status, admin_notes: parsed.data.admin_notes })
    .eq('id', parsed.data.id)
    .is('personal_data_deleted_at', null)
    .select('reference')
    .maybeSingle()
  if (error || !data) return fail('Could not save. The entry may have been deleted after 12 months.')
  // The audit entry names the reference only, never the worker's details.
  await audit('jobs.register.update', { type: 'worker_register', id: parsed.data.id, label: data.reference }, { status: parsed.data.status, notes_changed: true })
  revalidatePath('/roodber8/jobs/register')
  return ok({ message: 'Saved.' })
}
