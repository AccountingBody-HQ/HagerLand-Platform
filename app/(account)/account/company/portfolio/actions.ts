'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerSupabase } from '@/lib/supabase/server'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { intFromForm, optionalText, optionalUuid, textSchema } from '@/lib/validation/common'
import { revalidateEntity } from '@/lib/revalidate'

const schema = z.object({
  id: optionalUuid,
  title: textSchema(160, { min: 2, label: 'Project name' }),
  description: optionalText(4000, 'Description'),
  location_id: optionalUuid,
  year: intFromForm({ min: 1950, max: 2100 }),
  project_value_band: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['Under ETB 1M', 'ETB 1M – 5M', 'ETB 5M – 20M', 'ETB 20M – 100M', 'Over ETB 100M']).optional()),
})

export type PortfolioState = ActionResult<{ id: string }> | null

export async function savePortfolioAction(_prev: PortfolioState, formData: FormData): Promise<PortfolioState> {
  await requireUser('/account/company/portfolio')
  const active = await getActiveMembership()
  if (!active) return fail('Create a business profile first.')
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, ...d } = parsed.data
  const values = { title: d.title, description: d.description ?? null, location_id: d.location_id ?? null, year: d.year ?? null, project_value_band: d.project_value_band ?? null }

  if (!id) {
    const { data, error } = await getServerSupabase().from('portfolio_projects').insert({ ...values, org_id: active.org.id, status: 'draft' }).select('id').single()
    if (error || !data) return fail('We could not save the project. Please try again.')
    redirect(`/account/company/portfolio/${data.id}?created=1`)
  }

  const { data: row } = await getServerSupabase().from('portfolio_projects').select('id, org_id, status').eq('id', id).maybeSingle()
  if (!row || row.org_id !== active.org.id) return fail('Project not found.')
  // Edits to a published project go back for a quick review.
  const status = row.status === 'published' || row.status === 'rejected' ? 'pending_review' : row.status
  const { error } = await getAdminSupabase().from('portfolio_projects').update({ ...values, status }).eq('id', id)
  if (error) return fail('We could not save the project. Please try again.')
  revalidateEntity('portfolio', id)
  revalidatePath('/account/company/portfolio')
  return ok({ id }, status === 'pending_review' && row.status !== 'pending_review' ? 'Saved and sent for review.' : 'Saved.')
}

export async function submitPortfolioAction(id: string): Promise<ActionResult> {
  await requireUser()
  if (!z.uuid().safeParse(id).success) return fail('Invalid project.')
  const { count } = await getAdminSupabase().from('media').select('id', { count: 'exact', head: true }).eq('entity_type', 'portfolio').eq('entity_id', id).eq('kind', 'image')
  if ((count ?? 0) < 1) return fail('Add at least one photo first.')
  const { error } = await getServerSupabase().from('portfolio_projects').update({ status: 'pending_review' }).eq('id', id).in('status', ['draft', 'rejected'])
  if (error) return fail('Please try again.')
  revalidatePath('/account/company/portfolio')
  return ok(undefined, 'Sent for review.')
}

export async function archivePortfolioAction(id: string): Promise<ActionResult> {
  await requireUser()
  if (!z.uuid().safeParse(id).success) return fail('Invalid project.')
  const { error } = await getServerSupabase().from('portfolio_projects').update({ status: 'archived' }).eq('id', id)
  if (error) return fail('Please try again.')
  revalidateEntity('portfolio', id)
  revalidatePath('/account/company/portfolio')
  return ok(undefined, 'Removed from your profile.')
}
