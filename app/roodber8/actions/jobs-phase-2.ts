'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/jobs'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { CLEANUP_MODE_KEY, PHONE_APPLY_KEY, WORKER_REGISTER_KEY } from '@/lib/jobs-switches'
import { runJobsDataCleanup } from '@/lib/jobs-cleanup-data'
import { cleanupRunText } from '@/lib/jobs-cleanup'

type Msg = ActionResult<{ message: string }>

const SWITCH_KEYS = { phone_apply: PHONE_APPLY_KEY, worker_register: WORKER_REGISTER_KEY } as const

/** Owner only: "Apply by phone" or the worker register on or off (both start off until the lawyer confirms). */
export async function setJobsSwitchAction(which: string, on: boolean, lawyerConfirmed: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.object({ which: z.enum(['phone_apply', 'worker_register']), on: z.boolean() }).safeParse({ which, on })
  if (!parsed.success) return fail('Choose a switch.')
  if (parsed.data.on && !lawyerConfirmed) return fail('Tick that the lawyer has confirmed the points listed before switching this on.')
  const key = SWITCH_KEYS[parsed.data.which]
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', key).maybeSingle()
  const { error } = await db.from('site_settings').upsert({ key, value: parsed.data.on, updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  await audit('jobs.switch', { type: 'setting', label: key }, { from: before?.value ?? false, to: parsed.data.on })
  revalidatePath('/jobs', 'layout')
  revalidatePath('/roodber8/jobs', 'layout')
  const name = parsed.data.which === 'phone_apply' ? 'Apply by phone' : 'The worker register'
  return ok({ message: `${name} is now ${parsed.data.on ? 'on' : 'off'} on the website.` })
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
