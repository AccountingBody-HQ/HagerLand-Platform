'use server'

/** The admin area that manages each kind of record (staff roles are checked against it, spec 26.15). */
function entityArea(entity: string): string {
  return entity === 'property' ? '/roodber8/properties' : entity === 'development' ? '/roodber8/developments' : entity === 'product' ? '/roodber8/products' : '/roodber8/organisations'
}

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase, getAdminSupabaseDynamic } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { revalidateEntity } from '@/lib/revalidate'

const entitySchema = z.enum(['property', 'development', 'organisation', 'product'])
type Entity = z.infer<typeof entitySchema>
const TABLE: Record<Entity, string> = { property: 'properties', development: 'developments', organisation: 'organisations', product: 'products' }

/** Feature until a date (creates a promotion; the database keeps is_featured in step), or stop featuring. */
export async function setFeaturedAction(entity: string, id: string, until: string | null): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(entityArea(entity))
  const parsed = z.object({ entity: entitySchema, id: z.uuid(), until: z.iso.date().nullable() }).safeParse({ entity, id, until })
  if (!parsed.success) return fail('Choose an end date.')
  const db = getAdminSupabase()
  const now = new Date()
  if (parsed.data.until) {
    const ends = new Date(`${parsed.data.until}T23:59:59Z`)
    if (ends <= now) return fail('The end date must be in the future.')
    const { error } = await db.from('promotions').insert({ entity_type: parsed.data.entity, entity_id: id, kind: 'featured', starts_at: now.toISOString(), ends_at: ends.toISOString(), notes: 'Set from admin' })
    if (error) return fail('Could not feature it. Please try again.')
  } else {
    await db.from('promotions').update({ ends_at: new Date(now.getTime() + 1000).toISOString() }).eq('entity_type', parsed.data.entity).eq('entity_id', id).gt('ends_at', now.toISOString())
    await db.rpc('refresh_featured', { p_entity_type: parsed.data.entity, p_entity_id: id })
  }
  await audit(parsed.data.until ? `${entity}.feature` : `${entity}.unfeature`, { type: entity, id }, parsed.data.until ? { until: parsed.data.until } : null)
  revalidateEntity(parsed.data.entity, id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: parsed.data.until ? `Featured until ${parsed.data.until}.` : 'No longer featured.' })
}

/** Admin-only internal note on any record. */
export async function addNoteAction(entity: string, id: string, note: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(entityArea(entity))
  const parsed = z.object({ entity: z.string().max(40), id: z.uuid(), note: z.string().trim().min(1).max(4000) }).safeParse({ entity, id, note })
  if (!parsed.success) return fail('Write a note first.')
  const { error } = await getAdminSupabase().from('admin_notes').insert({ entity_type: parsed.data.entity, entity_id: id, note: parsed.data.note })
  if (error) return fail('Could not save the note.')
  await audit(`${entity}.note`, { type: entity, id })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: 'Note saved.' })
}

const STATUSES = ['draft', 'pending_review', 'published', 'paused', 'expired', 'rejected', 'archived'] as const

/** Direct status change by HagerLand (removal with a reason goes through moderation). */
export async function setStatusAction(entity: string, id: string, status: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(entityArea(entity))
  const parsed = z.object({ entity: entitySchema, id: z.uuid(), status: z.enum(STATUSES) }).safeParse({ entity, id, status })
  if (!parsed.success) return fail('Invalid status.')
  const dyn = getAdminSupabaseDynamic()
  const { data: before } = await dyn.from(TABLE[parsed.data.entity]).select('status').eq('id', id).maybeSingle()
  const { error } = await dyn.from(TABLE[parsed.data.entity]).update({ status: parsed.data.status }).eq('id', id)
  if (error) return fail('Could not change the status.')
  await audit(`${entity}.status`, { type: entity, id }, { status: { from: (before as { status?: string } | null)?.status ?? null, to: parsed.data.status } })
  revalidateEntity(parsed.data.entity, id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: `Status set to ${parsed.data.status.replace('_', ' ')}.` })
}
