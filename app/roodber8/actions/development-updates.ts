'use server'

/**
 * Admin area these actions belong to (staff roles are checked against it, spec 26.15). No staff role has it, so only
 * the owner and the master login publish developers' progress updates (kept apart from Jobs, which Operations may use).
 */
const AREA = '/roodber8/development-updates'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { developmentUpdateSchema } from '@/lib/validation/development'
import { revalidateEntity } from '@/lib/revalidate'

type Done = ActionResult<{ message: string }>

/** Publish or send back a developer's construction-progress update (spec 25.2j). */
export async function developmentUpdateDecisionAction(id: string, approve: boolean, note?: string): Promise<Done> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Invalid update.')
  const db = getAdminSupabase()
  const { data, error } = await db
    .from('development_updates')
    .update(approve ? { status: 'published', rejection_reason: null } : { status: 'rejected', rejection_reason: note?.trim().slice(0, 2000) || null })
    .eq('id', id)
    .select('development_id, title')
    .single()
  if (error || !data) return fail('Please try again.')
  await audit(approve ? 'development_update.approve' : 'development_update.reject', { type: 'development', id: data.development_id, label: data.title }, { update: id })
  revalidateEntity('development', data.development_id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? 'Update published.' : 'Update not published.' })
}

/** Take a published progress update down. */
export async function removeDevelopmentUpdateAction(id: string): Promise<Done> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Invalid update.')
  const { data, error } = await getAdminSupabase().from('development_updates').update({ status: 'removed' }).eq('id', id).select('development_id, title').single()
  if (error || !data) return fail('Please try again.')
  await audit('development_update.remove', { type: 'development', id: data.development_id, label: data.title }, { update: id })
  revalidateEntity('development', data.development_id)
  return ok({ message: 'Update removed.' })
}

/** HagerLand posts a progress update itself (published straight away). */
export async function adminPostDevelopmentUpdateAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await assertAdmin(AREA)
  const parsed = developmentUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const { data, error } = await getAdminSupabase()
    .from('development_updates')
    .insert({ development_id: d.development_id, title: d.title, body: d.body, happened_on: d.happened_on, photo_paths: d.photo_paths, status: 'published', created_by: null })
    .select('id')
    .single()
  if (error || !data) return fail('We could not post the update. Please try again.')
  await audit('development_update.create', { type: 'development', id: d.development_id, label: d.title }, { update: data.id })
  revalidateEntity('development', d.development_id)
  return ok(undefined, 'Update published.')
}
