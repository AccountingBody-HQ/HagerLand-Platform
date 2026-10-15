'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { FINISHES, type Finish } from '@/lib/estimator'

type Done = { ok: true; data: { message: string } } | { ok: false; error: string; fieldErrors?: Record<string, string> }

const schema = z.object({
  location_id: z.preprocess((v) => (v === '' || v === null ? null : v), z.uuid().nullable()),
  finish: z.enum(FINISHES.map((f) => f.value) as [Finish, ...Finish[]]),
  rate: z.preprocess((v) => (v === '' || v === null ? undefined : Number(String(v).replace(/,/g, ''))), z.number({ error: 'Enter the rate' }).int('Whole birr only').min(1).max(10_000_000)),
  notes: z.string().trim().max(300).optional(),
})

/** Add or replace the rate for a place (or nationwide) and finish level (spec 25.2h). */
export async function saveBuildRateAction(_prev: Done | null, formData: FormData): Promise<Done> {
  await assertAdmin()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the rate.' }
  const d = parsed.data
  const db = getAdminSupabase()
  if (d.location_id) {
    const { data: loc } = await db.from('locations').select('country_code').eq('id', d.location_id).maybeSingle()
    if (loc?.country_code !== 'ET') return { ok: false, error: 'Choose a place in Ethiopia, or leave it empty for the nationwide rate.' }
  }
  const { error } = await db.from('build_cost_rates').upsert({ location_id: d.location_id, finish: d.finish, rate_etb_per_m2: d.rate, notes: d.notes || null }, { onConflict: 'location_id,finish' })
  if (error) return { ok: false, error: 'Could not save the rate.' }
  await audit('build_rate.save', { type: 'build_rate', label: `${d.finish} ${d.location_id ?? 'nationwide'}` }, { rate: d.rate })
  revalidateTag('build-rates')
  revalidatePath('/roodber8/build-costs')
  return { ok: true, data: { message: 'Rate saved. The estimator uses it straight away.' } }
}

export async function deleteBuildRateAction(id: string): Promise<Done> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Invalid rate.' }
  const { error } = await getAdminSupabase().from('build_cost_rates').delete().eq('id', id)
  if (error) return { ok: false, error: 'Could not delete the rate.' }
  await audit('build_rate.delete', { type: 'build_rate', id })
  revalidateTag('build-rates')
  revalidatePath('/roodber8/build-costs')
  return { ok: true, data: { message: 'Rate deleted.' } }
}
