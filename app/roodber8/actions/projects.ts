'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/projects'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { optionalText } from '@/lib/validation/common'

type Msg = ActionResult<{ message: string }>

/** Project status and private notes (spec 26.9). */
export async function saveProjectAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = z.object({ status: z.enum(['submitted', 'in_progress', 'on_hold', 'closed']), admin_notes: optionalText(4000, 'Notes') }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const db = getAdminSupabase()
  const { data: before } = await db.from('build_projects').select('reference, status, admin_notes').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const next = { status: p.data.status, admin_notes: p.data.admin_notes ?? null }
  const { error } = await db.from('build_projects').update(next).eq('id', id)
  if (error) return fail('Could not save.')
  await audit('build_project.update', { type: 'build_project', id, label: before.reference }, changedFields(before, next))
  revalidatePath(`/roodber8/projects/${id}`)
  return ok({ message: 'Saved.' })
}
