'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { Database } from '@/lib/database.types'
import { getServerSupabase } from '@/lib/supabase/server'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { developmentSchema, developmentUpdateSchema, type DevelopmentInput } from '@/lib/validation/development'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { revalidateEntity } from '@/lib/revalidate'
import { log } from '@/lib/log'
import { isEthiopianLocation, NOT_IN_ETHIOPIA } from '@/lib/data/reference'

type DevUpdate = Database['public']['Tables']['developments']['Update']

function columns(d: DevelopmentInput): DevUpdate {
  return {
    name: d.name,
    kind: d.kind,
    summary: d.summary ?? null,
    description: d.description ?? null,
    location_id: d.location_id,
    address_line: d.address_line ?? null,
    completion_status: d.completion_status ?? null,
    expected_completion: d.expected_completion ?? null,
    completed_year: d.completed_year ?? null,
    total_units: d.total_units ?? null,
    floors_label: d.floors_label?.toUpperCase() ?? null,
    price_from_etb: d.price_from_etb ?? null,
    price_to_etb: d.price_to_etb ?? null,
    payment_plan: d.payment_plan ?? null,
    amenities: d.amenities,
    finishing_status: d.finishing_status ?? null,
    tenure: d.tenure ?? null,
    video_url: d.video_url ?? null,
    unit_types: d.unit_types as DevUpdate['unit_types'],
  }
}

export type DevelopmentState = ActionResult<{ id: string }> | null

export async function saveDevelopmentAction(_prev: DevelopmentState, formData: FormData): Promise<DevelopmentState> {
  const user = await requireUser('/account/developments')
  const active = await getActiveMembership()
  if (!active || active.org.kind !== 'developer') return fail('Only developer accounts can add developments.')
  const parsed = developmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (!(await isEthiopianLocation(parsed.data.location_id))) return fail(NOT_IN_ETHIOPIA, { location_id: 'Choose a place in Ethiopia' })
  const d = parsed.data
  if (d.brochure_path && !d.brochure_path.startsWith(`docs/brochure/`)) return fail('Please upload the brochure again.')
  const supabase = getServerSupabase()

  if (!d.id) {
    const { data, error } = await supabase
      .from('developments')
      .insert({ ...columns(d), name: d.name, slug: `${slugify(d.name, 60)}-${shortId(4)}`, developer_org_id: active.org.id, created_by: user.id, status: 'draft' })
      .select('id')
      .single()
    if (error || !data) {
      log.error('development', 'create failed', error)
      return fail('We could not save the development. Please try again.')
    }
    redirect(`/account/developments/${data.id}?created=1`)
  }

  const { data: row } = await supabase.from('developments').select('id, status, pending_changes').eq('id', d.id).maybeSingle()
  if (!row) return fail('Development not found.')
  const changes = columns(d)
  if (row.status === 'published' || row.status === 'paused') {
    const { error } = await supabase.from('developments').update({ pending_changes: { ...((row.pending_changes as Record<string, unknown>) ?? {}), ...changes } as DevUpdate['pending_changes'] }).eq('id', d.id)
    if (error) return fail('We could not save your changes.')
    revalidatePath(`/account/developments/${d.id}`)
    return ok({ id: d.id }, 'Thanks. Your changes will appear once reviewed.')
  }
  const { error } = await supabase.from('developments').update(changes).eq('id', d.id)
  if (error) return fail('We could not save your changes.')
  revalidatePath(`/account/developments/${d.id}`)
  return ok({ id: d.id }, 'Saved.')
}

export async function submitDevelopmentAction(id: string): Promise<ActionResult> {
  await requireUser()
  if (!z.uuid().safeParse(id).success) return fail('Invalid development.')
  const { error } = await getServerSupabase().from('developments').update({ status: 'pending_review' }).eq('id', id).in('status', ['draft', 'rejected'])
  if (error) return fail('Please try again.')
  revalidateEntity('development', id)
  revalidatePath(`/account/developments/${id}`)
  return ok(undefined, 'Submitted for review.')
}

/** A developer posts a construction-progress update; HagerLand reviews it before it appears (spec 25.2j). */
export async function postDevelopmentUpdateAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser('/account/developments')
  const parsed = developmentUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const { error } = await getServerSupabase().from('development_updates').insert({ development_id: d.development_id, title: d.title, body: d.body, happened_on: d.happened_on, photo_paths: d.photo_paths, status: 'pending_review' })
  if (error) {
    log.error('development', 'update post failed', error)
    return fail('We could not post the update. Please try again.')
  }
  revalidatePath(`/account/developments/${d.development_id}`)
  return ok(undefined, 'Thanks. Your update will appear on the development page once HagerLand has reviewed it.')
}
