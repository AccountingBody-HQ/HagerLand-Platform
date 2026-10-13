'use server'


import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { basicsSchema, contactSchema, detailsSchema, formToObject, locationSchema } from '@/lib/validation/property'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { listingSlug, shortId } from '@/lib/slug'
import { getLocationChain, isEthiopianLocation, NOT_IN_ETHIOPIA } from '@/lib/data/reference'
import { propertyHeadline } from '@/lib/labels'
import { revalidateEntity } from '@/lib/revalidate'
import type { Database } from '@/lib/database.types'

type Insert = Database['public']['Tables']['properties']['Insert']

const listerSchema = z.object({
  id: z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional()),
  lister: z.string().min(1, 'Choose who is listing this property'),
})

async function slugFor(purpose: string, type: string, beds: number | null | undefined, locationId: string, sid: string) {
  const chain = await getLocationChain(locationId)
  return listingSlug(`${propertyHeadline(type, beds ?? null)} ${purpose === 'rent' ? 'to rent' : 'for sale'} ${chain.slice(-2).reverse().map((l) => l.name).join(' ')}`, sid)
}

export type AdminPropertyState = ActionResult<{ id: string }> | null

/** Create or edit any property as HagerLand. Changes apply immediately (no owner review). */
export async function saveAdminPropertyAction(_prev: AdminPropertyState, formData: FormData): Promise<AdminPropertyState> {
  assertAdmin()
  const raw = formToObject(formData, ['features'])
  const l = listerSchema.safeParse(raw)
  const b = basicsSchema.safeParse(raw)
  const loc = locationSchema.safeParse(raw)
  const d = detailsSchema.safeParse(raw)
  const c = contactSchema.safeParse(raw)
  for (const r of [l, b, loc, d, c]) if (!r.success) return invalid(r.error)
  if (!l.success || !b.success || !loc.success || !d.success || !c.success) return fail('Please check the form.')
  if (!(await isEthiopianLocation(loc.data.location_id))) return fail(NOT_IN_ETHIOPIA, { location_id: 'Choose a place in Ethiopia' })
  const db = getAdminSupabase()

  let listerOrgId: string | null = null
  let listerType: 'owner' | 'agent' | 'developer' | 'hagerland' = 'owner'
  if (l.data.lister === 'keep') {
    listerType = 'owner'
  } else {
    const { data: org } = await db.from('organisations').select('id, kind').eq('id', l.data.lister).maybeSingle()
    if (!org) return fail('Choose a valid lister.', { lister: 'Choose a valid lister' })
    listerOrgId = org.id
    listerType = org.kind === 'hagerland' ? 'hagerland' : org.kind === 'developer' ? 'developer' : 'agent'
  }
  const dd = d.data
  const values: Insert = {
    ...b.data,
    slug: '',
    location_id: loc.data.location_id,
    address_line: loc.data.address_line ?? null,
    show_exact_location: loc.data.show_exact_location,
    development_id: loc.data.development_id ?? null,
    price_on_request: dd.price_on_request,
    price_etb: dd.price_on_request ? null : dd.price_etb ?? null,
    price_period: b.data.purpose === 'rent' && !dd.price_on_request ? 'month' : null,
    price_negotiable: dd.price_negotiable,
    advance_months: b.data.purpose === 'rent' ? dd.advance_months ?? null : null,
    service_charge_etb: dd.service_charge_etb ?? null,
    bedrooms: dd.bedrooms ?? null,
    bathrooms: dd.bathrooms ?? null,
    area_m2: dd.area_m2 ?? null,
    plot_area_m2: dd.plot_area_m2 ?? null,
    floors_label: dd.floors_label?.toUpperCase() ?? null,
    floor_number: dd.floor_number ?? null,
    year_built: dd.year_built ?? null,
    finishing_status: dd.finishing_status ?? null,
    furnishing: dd.furnishing ?? null,
    tenure: dd.tenure ?? null,
    has_title_deed: dd.has_title_deed ?? null,
    completion_status: dd.completion_status ?? null,
    parking_spaces: dd.parking_spaces ?? null,
    features: dd.features,
    video_url: dd.video_url ?? null,
    contact_phone: c.data.contact_phone ?? null,
    contact_whatsapp: c.data.contact_whatsapp ?? null,
    contact_telegram: c.data.contact_telegram ?? null,
    contact_email: c.data.contact_email ?? null,
    preferred_contact: c.data.preferred_contact ?? null,
  }

  if (!l.data.id) {
    if (l.data.lister === 'keep') return fail('Choose who is listing this property.', { lister: 'Choose who is listing this property' })
    const sid = shortId()
    const { data, error } = await db
      .from('properties')
      .insert({ ...values, short_id: sid, slug: await slugFor(b.data.purpose, b.data.property_type, dd.bedrooms, loc.data.location_id, sid), lister_org_id: listerOrgId, lister_type: listerType, is_hagerland: listerType === 'hagerland', status: 'draft' })
      .select('id')
      .single()
    if (error || !data) return fail('Could not create the listing.')
    await audit('property.create', { type: 'property', id: data.id, label: b.data.title })
    redirect(`/roodber8/properties/${data.id}?created=1`)
  }

  const { data: before } = await db.from('properties').select('*').eq('id', l.data.id).maybeSingle()
  if (!before) return fail('Listing not found.')
  const update = {
    ...values,
    slug: await slugFor(b.data.purpose, b.data.property_type, dd.bedrooms, loc.data.location_id, before.short_id),
    ...(l.data.lister === 'keep' ? {} : { lister_org_id: listerOrgId, lister_type: listerType, is_hagerland: listerType === 'hagerland' }),
  }
  const { error } = await db.from('properties').update(update).eq('id', l.data.id)
  if (error) return fail('Could not save the listing.')
  await audit('property.edit', { type: 'property', id: l.data.id, label: b.data.title }, changedFields(before as Record<string, unknown>, update as Record<string, unknown>))
  revalidateEntity('property', l.data.id)
  revalidatePath(`/roodber8/properties/${l.data.id}`)
  return ok({ id: l.data.id }, 'Saved. Changes are live now.')
}
