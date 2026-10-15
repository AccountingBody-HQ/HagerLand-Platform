'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/agency'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { APPLICATION_STATUSES, TENANCY_STATUSES } from '@/lib/agency'
import { logActivity, upsertContact } from '@/lib/agency-server'
import { intFromForm, optionalText, checkbox } from '@/lib/validation/common'
import { CURRENCIES } from '@/lib/countries'
import { sendEmail } from '@/lib/email/send'
import { applicationDecisionEmail } from '@/lib/email/agency'

type Msg = ActionResult<{ message: string }>
const blank = (v: unknown) => (v === '' ? undefined : v)
const dateField = z.preprocess(blank, z.iso.date('Use a date').optional())

/** Referencing notes and the decision on an application to rent (spec 26.5). */
export async function saveApplicationAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = z.object({ status: z.enum(APPLICATION_STATUSES), referencing_notes: optionalText(4000, 'Referencing notes'), notify: checkbox }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: a } = await db.from('rental_applications').select('reference, status, referencing_notes, name, email, property:properties(title)').eq('id', id).maybeSingle()
  if (!a) return fail('Not found.')
  const next = { status: d.status, referencing_notes: d.referencing_notes ?? null, decided_at: ['approved', 'rejected'].includes(d.status) ? new Date().toISOString() : null }
  const { error } = await db.from('rental_applications').update(next).eq('id', id)
  if (error) return fail('Could not save.')
  const actor = await adminActor()
  if (a.status !== d.status) await logActivity('application', id, 'status', `Status: ${a.status} → ${d.status}`, actor)
  if (d.notify && a.email && a.status !== d.status && (d.status === 'approved' || d.status === 'rejected')) {
    const property = (Array.isArray(a.property) ? a.property[0] : a.property)?.title ?? 'the property'
    await sendEmail({ to: a.email, ...applicationDecisionEmail({ name: a.name.split(' ')[0] || a.name, reference: a.reference, property, approved: d.status === 'approved' }) })
    await logActivity('application', id, 'email', 'Decision emailed to the applicant.', actor)
  }
  await audit('agency.application.update', { type: 'agency_application', id, label: a.reference }, changedFields(a, next))
  revalidatePath(`/roodber8/agency/applications/${id}`)
  return ok({ message: 'Saved.' })
}

const tenancySchema = z
  .object({
    title: z.string().trim().min(2, 'Name the tenancy (e.g. the property)').max(160),
    tenant_names: z.string().trim().min(2, 'Enter the tenant names').max(300),
    start_date: z.iso.date('Choose the start date'),
    end_date: dateField,
    currency: z.enum(CURRENCIES),
    rent: z.coerce.number({ error: 'Enter the rent' }).min(0).max(1_000_000_000),
    rent_period: z.enum(['month', 'year']),
    advance_months: intFromForm({ min: 0, max: 24 }),
    deposit: z.preprocess(blank, z.coerce.number().min(0).max(1_000_000_000).optional()),
    renewal_date: dateField,
    notice_date: dateField,
    managed_property_ref: optionalText(40, 'Managed property'),
    status: z.enum(TENANCY_STATUSES).default('active'),
    notes: optionalText(4000, 'Notes'),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, { message: 'The end date must be after the start', path: ['end_date'] })

async function managedPropertyId(ref: string | undefined): Promise<string | null | false> {
  if (!ref) return null
  const { data } = await getAdminSupabase().from('managed_properties').select('id').eq('reference', ref.trim().toUpperCase()).maybeSingle()
  return data?.id ?? false
}

/** Creates a tenancy from an approved application (spec 26.5 "approve → create tenancy"). */
export async function createTenancyFromApplicationAction(applicationId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(applicationId).success) return fail('Not found.')
  const p = tenancySchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: a } = await db.from('rental_applications').select('id, reference, status, property_id, instruction_id, contact_id, user_id, name, email, phone').eq('id', applicationId).maybeSingle()
  if (!a) return fail('Not found.')
  if (a.status !== 'approved') return fail('Approve the application first.')
  const { count } = await db.from('tenancies').select('id', { count: 'exact', head: true }).eq('application_id', a.id)
  if (count) return fail('A tenancy already exists for this application.')
  const managed = await managedPropertyId(d.managed_property_ref)
  if (managed === false) return fail('No managed property has that reference (HLM-…).', { managed_property_ref: 'Not found' })
  const { data: ins } = a.instruction_id ? await db.from('agency_instructions').select('contact_id').eq('id', a.instruction_id).maybeSingle() : { data: null }
  const tenantContact = a.contact_id ?? (await upsertContact({ name: a.name, email: a.email, phone: a.phone, role: 'tenant', userId: a.user_id, consent: false, consentSource: 'tenancy' }))
  const { data: t, error } = await db
    .from('tenancies')
    .insert({
      property_id: a.property_id,
      instruction_id: a.instruction_id,
      application_id: a.id,
      managed_property_id: managed,
      landlord_contact_id: ins?.contact_id ?? null,
      tenant_contact_id: tenantContact,
      tenant_user_id: a.user_id,
      title: d.title,
      tenant_names: d.tenant_names,
      start_date: d.start_date,
      end_date: d.end_date ?? null,
      currency: d.currency,
      rent_minor: Math.round(d.rent * 100),
      rent_period: d.rent_period,
      advance_months: d.advance_months ?? null,
      deposit_minor: d.deposit !== undefined ? Math.round(d.deposit * 100) : null,
      renewal_date: d.renewal_date ?? null,
      notice_date: d.notice_date ?? null,
      status: d.status,
      notes: d.notes ?? null,
    })
    .select('id, reference')
    .single()
  if (error || !t) return fail('Could not create the tenancy.')
  const actor = await adminActor()
  await logActivity('tenancy', t.id, 'created', `Tenancy created from application ${a.reference}.`, actor)
  await logActivity('application', a.id, 'link', `Tenancy ${t.reference} created.`, actor)
  if (a.instruction_id) {
    const { data: i } = await db.from('agency_instructions').select('stage').eq('id', a.instruction_id).maybeSingle()
    if (i && i.stage === 'live') {
      const { error: stageError } = await db.from('agency_instructions').update({ stage: 'let_agreed' }).eq('id', a.instruction_id)
      if (!stageError) await logActivity('instruction', a.instruction_id, 'status', `Stage: Live → Let agreed (tenancy ${t.reference})`, actor)
    }
  }
  await audit('agency.tenancy.create', { type: 'tenancy', id: t.id, label: t.reference }, { application: a.reference })
  revalidatePath(`/roodber8/agency/applications/${applicationId}`)
  return ok({ message: `Tenancy ${t.reference} created.` })
}

/** Edits a tenancy (dates, rent, renewal and notice dates, managed-property link, status). */
export async function saveTenancyAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = tenancySchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('tenancies').select('reference, title, tenant_names, start_date, end_date, currency, rent_minor, rent_period, advance_months, deposit_minor, renewal_date, notice_date, managed_property_id, status, notes').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const managed = await managedPropertyId(d.managed_property_ref)
  if (managed === false) return fail('No managed property has that reference (HLM-…).', { managed_property_ref: 'Not found' })
  const next = {
    title: d.title,
    tenant_names: d.tenant_names,
    start_date: d.start_date,
    end_date: d.end_date ?? null,
    currency: d.currency,
    rent_minor: Math.round(d.rent * 100),
    rent_period: d.rent_period,
    advance_months: d.advance_months ?? null,
    deposit_minor: d.deposit !== undefined ? Math.round(d.deposit * 100) : null,
    renewal_date: d.renewal_date ?? null,
    notice_date: d.notice_date ?? null,
    managed_property_id: managed,
    status: d.status,
    notes: d.notes ?? null,
    // A changed date needs a fresh reminder.
    ...(d.renewal_date !== (before.renewal_date ?? undefined) ? { renewal_reminded_at: null } : {}),
    ...(d.notice_date !== (before.notice_date ?? undefined) ? { notice_reminded_at: null } : {}),
  }
  const { error } = await db.from('tenancies').update(next).eq('id', id)
  if (error) return fail('Could not save the tenancy.')
  const diff = changedFields(before, next)
  if (Object.keys(diff).length) await logActivity('tenancy', id, 'note', `Updated: ${Object.keys(diff).join(', ').replace(/_/g, ' ')}.`, await adminActor())
  await audit('agency.tenancy.update', { type: 'tenancy', id, label: before.reference }, diff)
  revalidatePath(`/roodber8/agency/tenancies/${id}`)
  return ok({ message: 'Tenancy saved.' })
}

/** A tenancy entered directly (for example an existing tenancy HagerLand starts to manage). */
export async function createTenancyAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const p = tenancySchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const contact = z.object({ tenant_email: z.preprocess(blank, z.email('Enter a valid email').optional()), tenant_phone: optionalText(32, 'Phone') }).safeParse(Object.fromEntries(formData))
  if (!contact.success) return invalid(contact.error)
  const managed = await managedPropertyId(d.managed_property_ref)
  if (managed === false) return fail('No managed property has that reference (HLM-…).', { managed_property_ref: 'Not found' })
  const { tenant_email: email, tenant_phone: phone } = contact.data
  const tenantContact = email || phone ? await upsertContact({ name: d.tenant_names.split(',')[0].trim(), email: email ?? null, phone: phone ?? null, role: 'tenant', userId: null, consent: false, consentSource: 'tenancy' }) : null
  const db = getAdminSupabase()
  const { data: t, error } = await db
    .from('tenancies')
    .insert({
      managed_property_id: managed,
      tenant_contact_id: tenantContact,
      title: d.title,
      tenant_names: d.tenant_names,
      start_date: d.start_date,
      end_date: d.end_date ?? null,
      currency: d.currency,
      rent_minor: Math.round(d.rent * 100),
      rent_period: d.rent_period,
      advance_months: d.advance_months ?? null,
      deposit_minor: d.deposit !== undefined ? Math.round(d.deposit * 100) : null,
      renewal_date: d.renewal_date ?? null,
      notice_date: d.notice_date ?? null,
      status: d.status,
      notes: d.notes ?? null,
    })
    .select('id, reference')
    .single()
  if (error || !t) return fail('Could not create the tenancy.')
  await logActivity('tenancy', t.id, 'created', 'Tenancy entered in admin.', await adminActor())
  await audit('agency.tenancy.create', { type: 'tenancy', id: t.id, label: t.reference })
  revalidatePath('/roodber8/agency/tenancies')
  return ok({ message: `Tenancy ${t.reference} created.` })
}
