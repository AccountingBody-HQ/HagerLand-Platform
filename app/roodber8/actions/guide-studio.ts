'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/guides'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Json } from '@/lib/database.types'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { checkGuideJson, uniqueSlug, type GuideJsonCheck } from '@/lib/guides/studio-import'

const rawSchema = z.string().max(200_000, 'The pasted text is too long.')

async function existingGuides(): Promise<{ slugs: string[]; titles: string[] }> {
  const { data } = await getAdminSupabase().from('guides').select('slug, title')
  return { slugs: (data ?? []).map((g) => g.slug), titles: (data ?? []).map((g) => g.title) }
}

/** Guide studio: checks pasted JSON and returns errors, notes, CHECK markers and the cleaned guide for the preview. */
export async function checkGuideJsonAction(raw: string): Promise<ActionResult<GuideJsonCheck>> {
  await assertAdmin(AREA)
  const parsed = rawSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.')
  return ok(checkGuideJson(parsed.data, await existingGuides()))
}

/** Imports the checked JSON as a draft marked "Needs AB review". Never publishes. */
export async function importGuideJsonAction(raw: string, importAnyway: boolean): Promise<ActionResult<{ id: string }>> {
  await assertAdmin(AREA)
  const parsed = rawSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.')
  const existing = await existingGuides()
  const check = checkGuideJson(parsed.data, existing)
  if (!check.ok || !check.guide) return fail(check.errors.map((e) => e.message).join(' ') || 'The JSON could not be imported.')
  if (check.duplicateTitle && importAnyway !== true) return fail(`A guide called “${check.duplicateTitle}” already exists. Tick “Import anyway” to import it as well.`)
  const g = check.guide
  const db = getAdminSupabase()
  const values = { ...g, faq: g.faq as unknown as NonNullable<Json>, status: 'draft', needs_review: true, published_at: null }
  let res = await db.from('guides').insert(values).select('id').single()
  if (res.error?.code === '23505') {
    // Another guide took the address between the check and the import: take the next free one.
    const { slugs } = await existingGuides()
    res = await db.from('guides').insert({ ...values, slug: uniqueSlug(g.slug, slugs) }).select('id').single()
  }
  if (res.error || !res.data) return fail('Could not import the guide.')
  await audit('guide.import', { type: 'guide', id: res.data.id, label: g.title }, { source: 'Guide studio import', status: 'draft', check_notes: check.markers.length })
  revalidatePath('/roodber8/guides')
  return ok({ id: res.data.id }, 'Imported as a draft marked “Needs AB review”.')
}
