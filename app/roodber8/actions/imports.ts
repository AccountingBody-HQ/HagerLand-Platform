'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/import'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { shortId } from '@/lib/slug'
import { PlacesError, placeBusinessStatus } from '@/lib/admin/places'
import { importSection } from '@/lib/admin/place-mapping'
import { revalidateEntity } from '@/lib/revalidate'
import { log } from '@/lib/log'
import { UNCONFIRMED_NAME } from '@/lib/imports/compliance'
import { importPublishBlock, recordFieldSources } from '@/lib/imports/compliance-data'

const KINDS = ['agency', 'developer', 'supplier', 'manufacturer', 'contractor', 'professional_firm', 'sole_trader'] as const

const importSchema = z.object({
  google_place_id: z.string().regex(/^[A-Za-z0-9_-]{10,300}$/),
  kind: z.enum(KINDS),
  service_ids: z.array(z.uuid()).max(20),
  fallback_location_id: z.uuid().nullable(),
})

export type ImportOutcome = 'imported' | 'duplicate' | 'closed' | 'failed'

/**
 * Imports one Google place as a private lead (status draft, verification 'listed', source 'import'). Google's terms
 * allow keeping only the place ID: the lead is named "Unconfirmed lead — refetch from Google", in the area and
 * services staff chose for the search; staff see Google's details live on its page and confirm them with the business.
 * Dedupes against import_log (section org_<kind>) and organisations.google_place_id.
 */
export async function importPlaceAction(input: z.input<typeof importSchema>): Promise<ActionResult<{ outcome: ImportOutcome; name: string; orgId?: string }>> {
  await assertAdmin(AREA)
  const parsed = importSchema.safeParse(input)
  if (!parsed.success) return fail('Invalid import request.')
  const d = parsed.data
  const db = getAdminSupabase()
  const section = importSection(d.kind)
  const [{ data: logged }, { data: existing }] = await Promise.all([
    db.from('import_log').select('status').eq('google_place_id', d.google_place_id).eq('section', section).maybeSingle(),
    db.from('organisations').select('id, name').eq('google_place_id', d.google_place_id).maybeSingle(),
  ])
  if (existing) return ok({ outcome: 'duplicate', name: existing.name, orgId: existing.id })
  if (logged?.status === 'imported') return ok({ outcome: 'duplicate', name: '' })

  // The import history never stores the business's name from Google (only the place ID and the outcome).
  const record = async (status: string, orgId: string | null, error: string | null) => {
    await db.from('import_log').upsert({ google_place_id: d.google_place_id, section, status, listing_id: orgId, listing_name: '', error, entity_type: 'organisation', imported_at: new Date().toISOString() })
  }

  let businessStatus: string | null
  try {
    businessStatus = await placeBusinessStatus(d.google_place_id)
  } catch (err) {
    const msg = err instanceof PlacesError ? err.message : 'Google lookup failed.'
    await record('failed', null, msg)
    return ok({ outcome: 'failed', name: msg })
  }
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    await record('skipped', null, 'Permanently closed')
    return ok({ outcome: 'closed', name: '' })
  }

  const { data: org, error } = await db
    .from('organisations')
    .insert({
      kind: d.kind,
      name: UNCONFIRMED_NAME,
      slug: `unconfirmed-lead-${shortId(6)}`,
      location_id: d.fallback_location_id,
      google_place_id: d.google_place_id,
      source: 'import',
      status: 'draft',
      verification_level: 'listed',
    })
    .select('id')
    .single()
  if (error || !org) {
    log.error('import', 'organisation insert failed', error)
    await record('failed', null, error?.message.slice(0, 300) ?? 'insert failed')
    return ok({ outcome: 'failed', name: '' })
  }
  if (d.service_ids.length) await db.from('organisation_services').insert(d.service_ids.map((service_id) => ({ org_id: org.id, service_id })))
  await record('imported', org.id, null)
  await audit('organisation.import', { type: 'organisation', id: org.id, label: 'Imported lead' }, { google_place_id: d.google_place_id, kind: d.kind, stored: 'place ID only' })
  revalidatePath('/roodber8/import')
  return ok({ outcome: 'imported', name: UNCONFIRMED_NAME, orgId: org.id })
}

/**
 * Publishes reviewed imports (status published, verification stays 'listed' until claimed/verified). Only once their
 * details are confirmed with the business and they have a description written by HagerLand.
 */
export async function publishImportsAction(ids: string[]): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = z.array(z.uuid()).min(1).max(200).safeParse(ids)
  if (!parsed.success) return fail('Select at least one business.')
  const db = getAdminSupabase()
  const { data: rows } = await db.from('organisations').select('id, name, description').in('id', parsed.data).eq('source', 'import').in('status', ['draft', 'pending_review'])
  const blocked = await importPublishBlock((rows ?? []).map((r) => r.id))
  const confirmed = (rows ?? []).filter((r) => !blocked.has(r.id))
  if (!confirmed.length) return fail(blocked.size === 1 ? Array.from(blocked.values())[0] : 'None of these is confirmed with the business yet. Open each one and use “Confirm with the business” first.')
  const ready = confirmed.filter((r) => r.description && r.description.trim().length >= 20)
  if (!ready.length) return fail('Each business needs a description (at least 20 characters) before it is published.')
  const { error } = await db.from('organisations').update({ status: 'published' }).in('id', ready.map((r) => r.id))
  if (error) return fail('Could not publish.')
  for (const r of ready) {
    await audit('organisation.import_publish', { type: 'organisation', id: r.id, label: r.name })
    revalidateEntity('organisation', r.id)
  }
  revalidatePath('/roodber8', 'layout')
  const noDescription = confirmed.length - ready.length
  return ok({ message: `Published ${ready.length}.${blocked.size ? ` ${blocked.size} skipped: not confirmed with the business yet.` : ''}${noDescription ? ` ${noDescription} skipped: add a description first.` : ''}` })
}

export async function discardImportsAction(ids: string[]): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = z.array(z.uuid()).min(1).max(200).safeParse(ids)
  if (!parsed.success) return fail('Select at least one business.')
  const db = getAdminSupabase()
  const { data, error } = await db.from('organisations').update({ status: 'rejected', rejection_reason: 'Not suitable (import review)' }).in('id', parsed.data).eq('source', 'import').in('status', ['draft', 'pending_review']).select('id, name')
  if (error) return fail('Could not update.')
  for (const r of data ?? []) await audit('organisation.import_discard', { type: 'organisation', id: r.id, label: r.name })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: `Discarded ${data?.length ?? 0}. They stay in the import history so they are not imported again.` })
}

export async function saveImportDescriptionAction(id: string, description: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = z.object({ id: z.uuid(), description: z.string().trim().min(20, 'Write at least 20 characters.').max(5000) }).safeParse({ id, description })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid description.')
  const { data: saved, error } = await getAdminSupabase().from('organisations').update({ description: parsed.data.description }).eq('id', id).eq('source', 'import').select('id')
  if (error || !saved?.length) return fail('Could not save.')
  // Written by HagerLand: no longer Google-derived (replaces an old AI description from Google data).
  await recordFieldSources(id, ['description'], { source: 'edited_by_hagerland', actor: await adminActor(), note: 'Written in import review' })
  await audit('organisation.edit', { type: 'organisation', id }, { description: 'edited in import review' })
  return ok({ message: 'Description saved.' })
}
