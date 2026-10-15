'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { Json } from '@/lib/database.types'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { guideSchema, parseFaqText } from '@/lib/guides'
import { GUIDES_TAG } from '@/lib/data/guides'

/** Create or edit a guide (spec 25.2g). Publishing needs "Content checked": starter drafts are never published unseen. */
export async function saveGuideAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  await assertAdmin()
  const parsed = guideSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: before } = d.id ? await db.from('guides').select('status, published_at').eq('id', d.id).maybeSingle() : { data: null }
  const values = {
    title: d.title,
    slug: d.slug,
    topic: d.topic,
    summary: d.summary,
    body: d.body,
    faq: parseFaqText(d.faq_text) as unknown as NonNullable<Json>,
    seo_title: d.seo_title ?? null,
    seo_description: d.seo_description ?? null,
    status: d.status,
    needs_review: !d.reviewed,
    published_at: d.status === 'published' ? before?.published_at ?? new Date().toISOString() : before?.published_at ?? null,
  }
  const res = d.id ? await db.from('guides').update(values).eq('id', d.id).select('id').single() : await db.from('guides').insert(values).select('id').single()
  if (res.error || !res.data) return fail(res.error?.code === '23505' ? 'Another guide already uses this web address.' : 'Could not save the guide.', res.error?.code === '23505' ? { slug: 'Choose a different address' } : undefined)
  await audit(d.id ? 'guide.edit' : 'guide.create', { type: 'guide', id: res.data.id, label: d.title }, { status: d.status })
  revalidateTag(GUIDES_TAG)
  revalidatePath('/roodber8/guides')
  if (!d.id) redirect(`/roodber8/guides/${res.data.id}?created=1`)
  return ok({ id: res.data.id }, d.status === 'published' ? 'Saved and published.' : 'Saved.')
}

export async function deleteGuideAction(id: string): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Invalid guide.' }
  const { data, error } = await getAdminSupabase().from('guides').delete().eq('id', id).select('title').single()
  if (error || !data) return { ok: false, error: 'Could not delete the guide.' }
  await audit('guide.delete', { type: 'guide', id, label: data.title })
  revalidateTag(GUIDES_TAG)
  redirect('/roodber8/guides')
}
