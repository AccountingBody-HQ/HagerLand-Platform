'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/area-guides'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { checkbox } from '@/lib/validation/common'
import { ADVICE_TAG } from '@/lib/data/advice'
import type { Json } from '@/lib/database.types'
import { parseFaqText } from '@/lib/advice'

type Msg = ActionResult<{ message: string }>

/** Area guide notes and FAQs for a place (spec 26.10). Shown on its property pages with the live market figures. */
export async function saveAreaGuideAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const p = z.object({ location_id: z.uuid({ error: 'Choose a place' }), notes: z.string().trim().max(4000), faqs: z.string().max(14000).default(''), is_published: checkbox }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const faqs = parseFaqText(d.faqs)
  if (d.is_published && !d.notes && faqs.length === 0) return fail('Write some notes or FAQs before publishing.')
  const db = getAdminSupabase()
  const { data: loc } = await db.from('locations').select('display_name, country_code').eq('id', d.location_id).maybeSingle()
  if (!loc || loc.country_code !== 'ET') return fail('Choose a place in Ethiopia.', { location_id: 'Choose a place in Ethiopia' })
  const { data: before } = await db.from('area_guides').select('notes, faqs, is_published').eq('location_id', d.location_id).maybeSingle()
  const next = { notes: d.notes, faqs: faqs as unknown as NonNullable<Json>, is_published: d.is_published }
  const { error } = await db.from('area_guides').upsert({ location_id: d.location_id, ...next })
  if (error) return fail('Could not save.')
  await audit('area_guide.save', { type: 'area_guide', id: d.location_id, label: loc.display_name }, changedFields(before ?? {}, next))
  revalidateTag(ADVICE_TAG)
  revalidatePath('/roodber8/area-guides')
  return ok({ message: `Saved the area guide for ${loc.display_name}.` })
}
