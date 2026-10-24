'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/imports'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT, isStaleEdit } from '@/lib/concurrency'
import { PlacesError, placeDetails } from '@/lib/admin/places'
import { placePhone, placeWebsite } from '@/lib/admin/place-mapping'
import { optionalPhoneSchema, optionalText, optionalUrl, optionalUuid } from '@/lib/validation/common'
import { revalidateEntity } from '@/lib/revalidate'
import { shortId, slugify } from '@/lib/slug'
import { CONFIRM_METHODS, type ConfirmMethod } from '@/lib/imports/compliance'
import type { TablesUpdate } from '@/lib/database.types'
import { clearGoogleFields, loadImported, MODE_KEY, recordFieldSources, runImportsCleanup, type CleanupSummary } from '@/lib/imports/compliance-data'
import { todayInAddis } from '@/lib/supply/shortlist'

type Msg = ActionResult<{ message: string }>

export interface GoogleDetails {
  name: string
  address: string
  phone: string | null
  website: string | null
  businessStatus: string | null
  mapsUrl: string | null
}

/**
 * Google's current details for an imported business, looked up by its place ID for staff to see. Shown, never saved
 * (Google's terms); the lookup is audited with the place ID only.
 */
export async function googleDetailsAction(orgId: string): Promise<ActionResult<GoogleDetails>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success) return fail('Business not found.')
  const { data: org } = await getAdminSupabase().from('organisations').select('google_place_id').eq('id', orgId).maybeSingle()
  if (!org?.google_place_id) return fail('This business has no Google place ID.')
  try {
    const d = await placeDetails(org.google_place_id)
    await audit('imports.google_view', { type: 'organisation', id: orgId }, { google_place_id: org.google_place_id })
    return ok({ name: d.name, address: d.address, phone: placePhone(d.internationalPhone, d.nationalPhone), website: placeWebsite(d.website), businessStatus: d.businessStatus ?? null, mapsUrl: d.googleMapsUri ?? null })
  } catch (err) {
    return fail(err instanceof PlacesError ? err.message : 'Google lookup failed. Try again later.')
  }
}

const confirmSchema = z.object({
  method: z.enum(CONFIRM_METHODS.map((m) => m.value) as [string, ...string[]], { error: 'Choose how you confirmed it' }),
  date: z.iso.date({ error: 'Enter the date you confirmed it' }),
  confirmedBy: z.string().trim().min(2, 'Say who confirmed it').max(120),
  note: optionalText(500, 'Note'),
  name: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(2, 'Enter at least 2 letters for the name').max(160).optional()),
  phone: optionalPhoneSchema,
  address_line: optionalText(200, 'Address'),
  website: optionalUrl,
  description: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(20, 'Write at least 20 characters for the description').max(5000).optional()),
  location_id: optionalUuid,
  clear: z.array(z.enum(['phone', 'address_line', 'website', 'description'])).max(4),
})
export type ConfirmInput = z.input<typeof confirmSchema>

/**
 * "Confirm with the business": the details the business itself gave (typed by staff, never copied from Google) become
 * HagerLand's own data. Fields left empty keep their current state (and timer); "has none" empties a field. Google's
 * map position is removed: once confirmed, the location is the area staff chose.
 */
export async function confirmWithBusinessAction(orgId: string, input: ConfirmInput, expectedUpdatedAt: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success) return fail('Business not found.')
  const parsed = confirmSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  if (d.date > todayInAddis()) return fail('The date cannot be in the future.')
  if (await isStaleEdit('organisations', orgId, expectedUpdatedAt)) return fail(STALE_EDIT)
  const db = getAdminSupabase()
  const { data: org } = await db.from('organisations').select('id, name, slug, status, published_at, source, google_place_id').eq('id', orgId).maybeSingle()
  if (!org || (org.source !== 'import' && !org.google_place_id)) return fail('Business not found.')
  const CONFIRMABLE = ['name', 'phone', 'address_line', 'website', 'description'] as const
  const typed: (typeof CONFIRMABLE)[number][] = CONFIRMABLE.filter((f) => d[f] !== undefined)
  const cleared = d.clear.filter((f) => !typed.includes(f))
  if (!typed.length && !cleared.length && d.location_id === undefined) return fail('Type at least one detail the business confirmed, or tick “The business has none”.')
  const patch: TablesUpdate<'organisations'> = {}
  for (const f of typed) patch[f] = d[f] as string
  for (const f of cleared) patch[f] = null
  if (d.location_id) patch.location_id = d.location_id
  // A business never published gets an address that matches its confirmed name.
  if (d.name && !org.published_at) patch.slug = `${slugify(d.name, 60) || 'business'}-${shortId(4)}`
  const { error } = await db.from('organisations').update(patch).eq('id', orgId)
  if (error) return fail('Could not save the details.')
  const actor = await adminActor()
  const confirmedAt = new Date(`${d.date}T12:00:00+03:00`).toISOString()
  await recordFieldSources(orgId, typed, { source: 'confirmed_with_business', actor: d.confirmedBy, method: d.method as ConfirmMethod, confirmedAt, note: d.note ?? null })
  await recordFieldSources(orgId, cleared, { source: 'edited_by_hagerland', actor: d.confirmedBy, method: d.method as ConfirmMethod, confirmedAt, note: `The business has none${d.note ? `: ${d.note}` : ''}` })
  const position = (await loadImported()).find((r) => r.id === orgId)?.c.googleFields.includes('lat_lng')
  if (position) await clearGoogleFields(orgId, ['lat_lng'], { privateOnly: false, actor, reason: 'confirmed with the business: location now from HagerLand' })
  await audit('imports.confirm', { type: 'organisation', id: orgId, label: d.name ?? org.name }, { method: d.method, date: d.date, confirmed_by: d.confirmedBy, confirmed: typed, has_none: cleared, location: Boolean(d.location_id), map_position_removed: Boolean(position) })
  revalidateEntity('organisation', orgId, [`/roodber8/organisations/${orgId}`, '/roodber8/imports/compliance', '/roodber8/import', ...(org.status === 'published' ? [`/company/${org.slug}`] : [])])
  return ok({ message: `Confirmed with the business: ${typed.length + cleared.length} ${typed.length + cleared.length === 1 ? 'detail' : 'details'} saved as HagerLand’s own.` })
}

/** Works out now what the clean-up would clear (never clears anything). */
export async function runDryRunAction(): Promise<ActionResult<{ message: string; summary: CleanupSummary }>> {
  await assertAdmin(AREA)
  const summary = await runImportsCleanup({ runBy: await adminActor(), forceDryRun: true })
  await audit('imports.cleanup_dry_run', { type: 'imports' }, { ...summary })
  revalidatePath('/roodber8/imports/compliance')
  return ok({ message: `Dry run done: ${summary.orgsToClear} ${summary.orgsToClear === 1 ? 'business' : 'businesses'} would be cleared, ${summary.publicDecisions} need your decision. Nothing was changed.`, summary })
}

/** Owner only: dry run (report only) or live (the daily job clears expired Google data of private businesses). */
export async function setCleanupModeAction(mode: string, readDryRun: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.enum(['dry_run', 'live']).safeParse(mode)
  if (!parsed.success) return fail('Choose a mode.')
  if (parsed.data === 'live' && !readDryRun) return fail('Tick that you have read the dry-run list before switching on live clean-up.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', MODE_KEY).maybeSingle()
  const { error } = await db.from('site_settings').upsert({ key: MODE_KEY, value: parsed.data, updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  await audit('imports.cleanup_mode', { type: 'setting', label: MODE_KEY }, { from: before?.value ?? 'dry_run', to: parsed.data })
  revalidatePath('/roodber8/imports/compliance')
  return ok({ message: parsed.data === 'live' ? 'Live clean-up is on: the next daily run clears expired Google data of private businesses.' : 'Dry run: the daily run only reports.' })
}

/** Owner only, for a public (or claimed) business with Google data: make it private and clear all of its Google data. */
export async function makePrivateAndClearAction(orgId: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!z.uuid().safeParse(orgId).success) return fail('Business not found.')
  const row = (await loadImported()).find((r) => r.id === orgId)
  if (!row) return fail('Business not found.')
  if (!row.c.googleFields.length) return fail('This business has no Google data left to clear.')
  const db = getAdminSupabase()
  const { data: org } = await db.from('organisations').select('slug, status, is_hagerland').eq('id', orgId).maybeSingle()
  if (!org) return fail('Business not found.')
  if (org.is_hagerland) return fail('HagerLand’s own organisations always stay on the public site.')
  if (org.status === 'published') {
    const { error } = await db.from('organisations').update({ status: 'draft' }).eq('id', orgId)
    if (error) return fail('Could not make it private.')
    await audit('organisation.unpublish', { type: 'organisation', id: orgId, label: 'Imported business' }, { status: { from: 'published', to: 'draft' }, reason: 'Imports compliance: Google data' })
  }
  await clearGoogleFields(orgId, row.c.googleFields, { privateOnly: false, actor: await adminActor(), reason: 'owner decision: make private and clear' })
  await audit('imports.make_private_and_clear', { type: 'organisation', id: orgId, label: 'Imported business' }, { fields: row.c.googleFields })
  revalidateEntity('organisation', orgId, [`/company/${org.slug}`, `/roodber8/organisations/${orgId}`, '/roodber8/imports/compliance'])
  return ok({ message: 'Made private and cleared its Google data. It is no longer on the public site.' })
}
