'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { slugify, shortId } from '@/lib/slug'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { PlacesError, placeDetails } from '@/lib/admin/places'
import { importSection, matchLocation, placePhone, placeWebsite } from '@/lib/admin/place-mapping'
import { draftDescription } from '@/lib/admin/ai-description'
import { revalidateEntity } from '@/lib/revalidate'
import { log } from '@/lib/log'

const KINDS = ['agency', 'developer', 'supplier', 'manufacturer', 'contractor', 'professional_firm', 'sole_trader'] as const

const importSchema = z.object({
  google_place_id: z.string().regex(/^[A-Za-z0-9_-]{10,300}$/),
  kind: z.enum(KINDS),
  service_ids: z.array(z.uuid()).max(20),
  fallback_location_id: z.uuid().nullable(),
})

export type ImportOutcome = 'imported' | 'duplicate' | 'closed' | 'failed'

/**
 * Imports one Google place as an organisation awaiting review: status pending_review, verification
 * 'listed', source 'import'. Dedupes against import_log (section org_<kind>) and organisations.google_place_id.
 * Stores only discovery data (name, address, phone, website, location), never reviews, ratings or photos.
 */
export async function importPlaceAction(input: z.input<typeof importSchema>): Promise<ActionResult<{ outcome: ImportOutcome; name: string; orgId?: string }>> {
  await assertAdmin()
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

  const record = async (status: string, name: string, orgId: string | null, error: string | null) => {
    await db.from('import_log').upsert({ google_place_id: d.google_place_id, section, status, listing_id: orgId, listing_name: name.slice(0, 200), error, entity_type: 'organisation', imported_at: new Date().toISOString() })
  }

  let place
  try {
    place = await placeDetails(d.google_place_id)
  } catch (err) {
    const msg = err instanceof PlacesError ? err.message : 'Google lookup failed.'
    await record('failed', '', null, msg)
    return ok({ outcome: 'failed', name: msg })
  }
  if (place.businessStatus === 'CLOSED_PERMANENTLY') {
    await record('skipped', place.name, null, 'Permanently closed')
    return ok({ outcome: 'closed', name: place.name })
  }
  const name = place.name.trim().slice(0, 160)
  if (name.length < 2) {
    await record('failed', name, null, 'No name')
    return ok({ outcome: 'failed', name: 'No name' })
  }

  const [{ data: locations }, { data: services }] = await Promise.all([
    db.from('locations').select('id, name, level, parent_id').eq('is_active', true),
    d.service_ids.length ? db.from('service_categories').select('id, name').in('id', d.service_ids) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const locationId = matchLocation(place.addressComponents, place.address, locations ?? [], d.fallback_location_id)
  const website = placeWebsite(place.website)
  const description = await draftDescription({ name, kindLabel: ORG_KIND_LABEL[d.kind] ?? d.kind, services: (services ?? []).map((s) => s.name), address: place.address, types: place.types, website })

  const { data: org, error } = await db
    .from('organisations')
    .insert({
      kind: d.kind,
      name,
      slug: `${slugify(name, 60) || 'business'}-${shortId(4)}`,
      description,
      phone: placePhone(place.internationalPhone, place.nationalPhone),
      website,
      address_line: place.address.slice(0, 300) || null,
      location_id: locationId,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      google_place_id: d.google_place_id,
      source: 'import',
      status: 'pending_review',
      verification_level: 'listed',
    })
    .select('id')
    .single()
  if (error || !org) {
    log.error('import', 'organisation insert failed', error)
    await record('failed', name, null, error?.message.slice(0, 300) ?? 'insert failed')
    return ok({ outcome: 'failed', name })
  }
  if (d.service_ids.length) await db.from('organisation_services').insert(d.service_ids.map((service_id) => ({ org_id: org.id, service_id })))
  await record('imported', name, org.id, null)
  await audit('organisation.import', { type: 'organisation', id: org.id, label: name }, { google_place_id: d.google_place_id, kind: d.kind, ai_description: Boolean(description) })
  revalidatePath('/roodber8/import')
  return ok({ outcome: 'imported', name, orgId: org.id })
}

/** Publishes reviewed imports (status published, verification stays 'listed' until claimed/verified). */
export async function publishImportsAction(ids: string[]): Promise<ActionResult<{ message: string }>> {
  await assertAdmin()
  const parsed = z.array(z.uuid()).min(1).max(200).safeParse(ids)
  if (!parsed.success) return fail('Select at least one business.')
  const db = getAdminSupabase()
  const { data: rows } = await db.from('organisations').select('id, name, description').in('id', parsed.data).eq('source', 'import').eq('status', 'pending_review')
  const ready = (rows ?? []).filter((r) => r.description && r.description.trim().length >= 20)
  if (!ready.length) return fail('Each business needs a description (at least 20 characters) before it is published.')
  const { error } = await db.from('organisations').update({ status: 'published' }).in('id', ready.map((r) => r.id))
  if (error) return fail('Could not publish.')
  for (const r of ready) {
    await audit('organisation.import_publish', { type: 'organisation', id: r.id, label: r.name })
    revalidateEntity('organisation', r.id)
  }
  revalidatePath('/roodber8', 'layout')
  const skipped = (rows?.length ?? 0) - ready.length
  return ok({ message: `Published ${ready.length}.${skipped ? ` ${skipped} skipped: add a description first.` : ''}` })
}

export async function discardImportsAction(ids: string[]): Promise<ActionResult<{ message: string }>> {
  await assertAdmin()
  const parsed = z.array(z.uuid()).min(1).max(200).safeParse(ids)
  if (!parsed.success) return fail('Select at least one business.')
  const db = getAdminSupabase()
  const { data, error } = await db.from('organisations').update({ status: 'rejected', rejection_reason: 'Not suitable (import review)' }).in('id', parsed.data).eq('source', 'import').eq('status', 'pending_review').select('id, name')
  if (error) return fail('Could not update.')
  for (const r of data ?? []) await audit('organisation.import_discard', { type: 'organisation', id: r.id, label: r.name })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: `Discarded ${data?.length ?? 0}. They stay in the import history so they are not imported again.` })
}

export async function saveImportDescriptionAction(id: string, description: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin()
  const parsed = z.object({ id: z.uuid(), description: z.string().trim().min(20, 'Write at least 20 characters.').max(5000) }).safeParse({ id, description })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid description.')
  const { error } = await getAdminSupabase().from('organisations').update({ description: parsed.data.description }).eq('id', id).eq('source', 'import')
  if (error) return fail('Could not save.')
  await audit('organisation.edit', { type: 'organisation', id }, { description: 'edited in import review' })
  return ok({ message: 'Description saved.' })
}
