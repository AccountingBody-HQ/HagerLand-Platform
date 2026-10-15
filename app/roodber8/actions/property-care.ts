'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { CARE_STATUSES, MANAGED_STATUSES } from '@/lib/property-care'
import { CURRENCIES } from '@/lib/countries'
import { optionalText, optionalUuid } from '@/lib/validation/common'

type Msg = ActionResult<{ message: string }>

export async function updateCareRequestAction(id: string, input: { status: string; admin_notes: string }): Promise<Msg> {
  await assertAdmin()
  const parsed = z.object({ id: z.uuid(), status: z.enum(CARE_STATUSES), admin_notes: z.string().trim().max(4000) }).safeParse({ id, ...input })
  if (!parsed.success) return fail('Check the fields.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('property_care_requests').select('reference, status, admin_notes').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const update = { status: parsed.data.status, admin_notes: parsed.data.admin_notes || null }
  const { error } = await db.from('property_care_requests').update(update).eq('id', id)
  if (error) return fail('Could not save.')
  await audit('property_care.update', { type: 'property_care_request', id, label: before.reference }, changedFields(before, update))
  revalidatePath('/roodber8/property-care', 'layout')
  return ok({ message: 'Saved.' })
}

/** Turns a won consultation into a managed-property record, copying the owner's details. */
export async function createManagedFromRequestAction(requestId: string): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(requestId).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('property_care_requests').select('*').eq('id', requestId).maybeSingle()
  if (!r) return fail('Not found.')
  const { data: existing } = await db.from('managed_properties').select('id').eq('care_request_id', requestId).maybeSingle()
  if (existing) redirect(`/roodber8/managed-properties/${existing.id}`)
  const { data: mp, error } = await db
    .from('managed_properties')
    .insert({ care_request_id: r.id, owner_user_id: r.user_id, owner_name: r.name, owner_email: r.email, owner_phone: r.phone, owner_country_code: r.country_code, title: `${r.name}: ${r.property_type.replace('_', ' ')}`.slice(0, 160), location_id: r.property_location_id, property_type: r.property_type, services: r.services })
    .select('id, reference')
    .single()
  if (error || !mp) return fail('Could not create the record.')
  await db.from('property_care_requests').update({ status: 'won' }).eq('id', r.id)
  await audit('managed_property.create', { type: 'managed_property', id: mp.id, label: mp.reference }, { from: r.reference })
  redirect(`/roodber8/managed-properties/${mp.id}`)
}

const money = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(/[,\s]/g, ''))), z.number().min(0).max(1e12).nullable())
const minor = (n: number | null) => (n === null ? null : Math.round(n * 100))

const managedSchema = z.object({
  id: optionalUuid,
  owner_name: z.string().trim().min(2, 'Enter the owner name').max(120),
  owner_email: optionalText(254),
  owner_phone: optionalText(32),
  owner_country_code: z.preprocess((v) => (v === '' ? undefined : v), z.string().regex(/^[A-Z]{2}$/).optional()),
  title: z.string().trim().min(2, 'Give the property a name').max(160),
  location_id: optionalUuid,
  address_line: optionalText(300),
  property_type: z.enum(['house', 'apartment', 'villa', 'g_plus_building', 'land', 'commercial', 'other']),
  status: z.enum(MANAGED_STATUSES),
  currency: z.enum(CURRENCIES),
  monthly_fee: money,
  start_date: z.preprocess((v) => (v === '' ? undefined : v), z.iso.date().optional()),
  notes: optionalText(4000),
})

export async function saveManagedPropertyAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const parsed = managedSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, monthly_fee, ...d } = parsed.data
  const values = { ...d, owner_email: d.owner_email ?? null, owner_phone: d.owner_phone ?? null, owner_country_code: d.owner_country_code ?? null, location_id: d.location_id ?? null, address_line: d.address_line ?? null, start_date: d.start_date ?? null, notes: d.notes ?? null, monthly_fee_minor: minor(monthly_fee), services: formData.getAll('services').map(String).slice(0, 12) }
  const db = getAdminSupabase()
  if (!id) {
    const { data, error } = await db.from('managed_properties').insert(values).select('id, reference').single()
    if (error || !data) return fail('Could not save.')
    await audit('managed_property.create', { type: 'managed_property', id: data.id, label: data.reference })
    redirect(`/roodber8/managed-properties/${data.id}`)
  }
  const { data: before } = await db.from('managed_properties').select('*').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from('managed_properties').update(values).eq('id', id)
  if (error) return fail('Could not save.')
  await audit('managed_property.update', { type: 'managed_property', id, label: before.reference }, changedFields(before as Record<string, unknown>, values))
  revalidatePath(`/roodber8/managed-properties/${id}`)
  return ok({ message: 'Saved.' })
}

export async function addInspectionAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const parsed = z
    .object({
      managed_property_id: z.uuid(),
      inspected_on: z.iso.date({ error: 'Choose the date' }),
      inspector: optionalText(120),
      condition: z.enum(['good', 'fair', 'needs_attention', 'urgent']),
      notes: optionalText(4000),
      photos: z.array(z.string().max(300)).max(40),
    })
    .safeParse({ ...Object.fromEntries(formData), photos: formData.getAll('photos') })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.photos.some((p) => !p.startsWith(`docs/inspection/${d.managed_property_id}/`))) return fail('Please upload the photos again.')
  const { data, error } = await getAdminSupabase().from('property_inspections').insert({ managed_property_id: d.managed_property_id, inspected_on: d.inspected_on, inspector: d.inspector ?? null, condition: d.condition, notes: d.notes ?? null, photo_paths: d.photos }).select('id').single()
  if (error || !data) return fail('Could not save the inspection.')
  await audit('managed_property.inspection', { type: 'managed_property', id: d.managed_property_id }, { inspection: data.id, condition: d.condition, photos: d.photos.length })
  revalidatePath(`/roodber8/managed-properties/${d.managed_property_id}`)
  return ok({ message: 'Inspection added.' })
}

export async function addStatementAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const parsed = z
    .object({
      managed_property_id: z.uuid(),
      period_start: z.iso.date({ error: 'Choose the start date' }),
      period_end: z.iso.date({ error: 'Choose the end date' }),
      currency: z.enum(CURRENCIES),
      rent_due: money,
      rent_received: money,
      expenses: money,
      fees: money,
      notes: optionalText(2000),
    })
    .refine((d) => d.period_end >= d.period_start, { message: 'The end date is before the start date', path: ['period_end'] })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const { error } = await getAdminSupabase().from('rent_statements').insert({ managed_property_id: d.managed_property_id, period_start: d.period_start, period_end: d.period_end, currency: d.currency, rent_due_minor: minor(d.rent_due) ?? 0, rent_received_minor: minor(d.rent_received) ?? 0, expenses_minor: minor(d.expenses) ?? 0, fees_minor: minor(d.fees) ?? 0, notes: d.notes ?? null })
  if (error) return fail('Could not save the statement.')
  await audit('managed_property.statement', { type: 'managed_property', id: d.managed_property_id }, { period: `${d.period_start} – ${d.period_end}` })
  revalidatePath(`/roodber8/managed-properties/${d.managed_property_id}`)
  return ok({ message: 'Statement added.' })
}

export async function addMaintenanceAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const parsed = z
    .object({
      managed_property_id: z.uuid(),
      logged_on: z.iso.date({ error: 'Choose the date' }),
      title: z.string().trim().min(2, 'Say what was done').max(160),
      description: optionalText(2000),
      status: z.enum(['planned', 'in_progress', 'done']),
      currency: z.enum(CURRENCIES),
      cost: money,
    })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const { error } = await getAdminSupabase().from('maintenance_log').insert({ managed_property_id: d.managed_property_id, logged_on: d.logged_on, title: d.title, description: d.description ?? null, status: d.status, currency: d.currency, cost_minor: minor(d.cost) })
  if (error) return fail('Could not save the entry.')
  await audit('managed_property.maintenance', { type: 'managed_property', id: d.managed_property_id }, { title: d.title })
  revalidatePath(`/roodber8/managed-properties/${d.managed_property_id}`)
  return ok({ message: 'Maintenance entry added.' })
}
