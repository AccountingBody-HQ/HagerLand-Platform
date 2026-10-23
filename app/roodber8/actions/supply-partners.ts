'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/supply/partners'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT } from '@/lib/concurrency'
import { normaliseSupplyPhone } from '@/lib/supply/phone'
import { CONFIDENCE_LEVELS, CONSENT_BASES, CONTACT_CHANNELS, defaultReverifyBy, PARTNER_SOURCES, RELATIONSHIP_STATUSES, SUPPLY_ROLES, type SupplyContactInput, type SupplyProfileInput } from '@/lib/supply/partners'

type Msg = ActionResult<{ message: string }>

const values = <T extends readonly { value: string }[]>(list: T) => list.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]]
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)
const optionalText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional())
const optionalDate = z.preprocess(blank, z.iso.date().optional())
const optionalEnum = <T extends [string, ...string[]]>(list: T) => z.preprocess(blank, z.enum(list).optional())

const profileSchema = z.object({
  roles: z.array(z.enum(values(SUPPLY_ROLES))).max(SUPPLY_ROLES.length),
  aka: z.array(z.string().trim().min(1).max(160)).max(20),
  source: optionalEnum(values(PARTNER_SOURCES)),
  source_note: optionalText(500),
  captured_at: optionalDate,
  captured_by: optionalText(120),
  confidence: optionalEnum(values(CONFIDENCE_LEVELS)),
  licence_seen_at: optionalDate,
  tin_checked_at: optionalDate,
  site_visit_at: optionalDate,
  verified_by: optionalText(120),
  reverify_by: optionalDate,
  notes: optionalText(4000),
})

const contactSchema = z
  .object({
    id: z.preprocess(blank, z.uuid().optional()),
    name: z.string().trim().min(1, 'Enter a name').max(120),
    role: optionalText(80),
    phone: optionalText(32),
    whatsapp: optionalText(32),
    telegram: optionalText(64),
    preferred_channel: optionalEnum(values(CONTACT_CHANNELS)),
    email: z.preprocess(blank, z.email('Enter a valid email').max(254).optional()),
    consent_basis: optionalEnum(values(CONSENT_BASES)),
    consent_note: optionalText(500),
    do_not_contact: z.boolean(),
    last_contacted_at: optionalDate,
  })
  .refine((c) => !c.phone || normaliseSupplyPhone(c.phone), { message: 'Enter an Ethiopian phone number (09…, 011… or +251…) or an international number starting with +', path: ['phone'] })
  .refine((c) => !c.whatsapp || normaliseSupplyPhone(c.whatsapp), { message: 'Enter the WhatsApp number like a phone number', path: ['whatsapp'] })

const dateOrNull = (d: string | undefined) => (d ? new Date(`${d}T00:00:00Z`).toISOString() : null)

function refresh(orgId: string) {
  revalidatePath(`/roodber8/organisations/${orgId}`)
  revalidatePath('/roodber8/supply/partners')
}

async function orgName(orgId: string): Promise<string | null> {
  const { data } = await getAdminSupabase().from('organisations').select('name').eq('id', orgId).maybeSingle()
  return data?.name ?? null
}

/** Creates or updates the private supply partner record of an organisation (one per organisation). */
export async function saveSupplyPartnerAction(orgId: string, input: SupplyProfileInput, expectedUpdatedAt: string | null): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = profileSchema.safeParse(input)
  if (!z.uuid().safeParse(orgId).success) return fail('Organisation not found.')
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const name = await orgName(orgId)
  if (!name) return fail('Organisation not found.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('supply_partners').select('*').eq('org_id', orgId).maybeSingle()
  if (before && expectedUpdatedAt && new Date(before.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  const d = parsed.data
  const verification = [d.licence_seen_at, d.tin_checked_at, d.site_visit_at]
  const actor = await adminActor()
  const row = {
    roles: Array.from(new Set(d.roles)),
    aka: Array.from(new Set(d.aka)),
    source: d.source ?? null,
    source_note: d.source_note ?? null,
    captured_at: dateOrNull(d.captured_at),
    captured_by: d.captured_by ?? null,
    confidence: d.confidence ?? null,
    licence_seen_at: dateOrNull(d.licence_seen_at),
    tin_checked_at: dateOrNull(d.tin_checked_at),
    site_visit_at: dateOrNull(d.site_visit_at),
    verified_by: d.verified_by ?? (verification.some(Boolean) ? actor.slice(0, 120) : null),
    reverify_by: d.reverify_by ?? defaultReverifyBy(verification),
    notes: d.notes ?? null,
  }
  if (before) {
    const { error } = await db.from('supply_partners').update(row).eq('org_id', orgId)
    if (error) return fail('Could not save the supply partner record.')
    await audit('supply.partner.update', { type: 'organisation', id: orgId, label: name }, changedFields(before as Record<string, unknown>, row))
  } else {
    const { error } = await db.from('supply_partners').insert({ org_id: orgId, ...row, status_changed_at: new Date().toISOString() })
    if (error) return fail('Could not create the supply partner record.')
    await audit('supply.partner.create', { type: 'organisation', id: orgId, label: name }, { roles: row.roles, source: row.source })
  }
  refresh(orgId)
  return ok({ message: before ? 'Supply partner record saved.' : 'Supply partner record created.' })
}

export async function setSupplyPartnerStatusAction(orgId: string, status: string): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = z.object({ orgId: z.uuid(), status: z.enum(values(RELATIONSHIP_STATUSES)) }).safeParse({ orgId, status })
  if (!parsed.success) return fail('Choose a status.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('supply_partners').select('relationship_status').eq('org_id', orgId).maybeSingle()
  if (!before) return fail('Create the supply partner record first.')
  if (before.relationship_status === parsed.data.status) return ok({ message: 'No change.' })
  const { error } = await db.from('supply_partners').update({ relationship_status: parsed.data.status, status_changed_at: new Date().toISOString() }).eq('org_id', orgId)
  if (error) return fail('Could not change the status.')
  await audit('supply.partner.status', { type: 'organisation', id: orgId, label: await orgName(orgId) }, { relationship_status: { from: before.relationship_status, to: parsed.data.status } })
  refresh(orgId)
  return ok({ message: `Status: ${RELATIONSHIP_STATUSES.find((s) => s.value === parsed.data.status)?.label}.` })
}

/** Adds a photo or PDF already uploaded to the private documents area (FileDrop, area "supply"). */
export async function addSupplyEvidenceAction(orgId: string, path: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.string().max(300).regex(new RegExp(`^docs/supply/${orgId}/[0-9a-f-]{36}\\.[a-z0-9]{2,5}$`)).safeParse(path).success) return fail('Invalid file.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('supply_partners').select('evidence_paths').eq('org_id', orgId).maybeSingle()
  if (!before) return fail('Create the supply partner record first.')
  if (before.evidence_paths.length >= 20) return fail('Keep up to 20 evidence files. Remove one first.')
  const { error } = await db.from('supply_partners').update({ evidence_paths: [...before.evidence_paths, path] }).eq('org_id', orgId)
  if (error) return fail('Could not add the file.')
  await audit('supply.partner.evidence_add', { type: 'organisation', id: orgId, label: await orgName(orgId) }, { path })
  refresh(orgId)
  return ok({ message: 'Evidence added.' })
}

export async function removeSupplyEvidenceAction(orgId: string, path: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.string().max(300).safeParse(path).success) return fail('Invalid file.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('supply_partners').select('evidence_paths').eq('org_id', orgId).maybeSingle()
  if (!before?.evidence_paths.includes(path)) return fail('File not found.')
  const { error } = await db.from('supply_partners').update({ evidence_paths: before.evidence_paths.filter((p) => p !== path) }).eq('org_id', orgId)
  if (error) return fail('Could not remove the file.')
  await audit('supply.partner.evidence_remove', { type: 'organisation', id: orgId, label: await orgName(orgId) }, { path })
  refresh(orgId)
  return ok({ message: 'Evidence removed from the record.' })
}

/** Adds or edits a contact person. Phones are stored as typed; the normalised form is used for matching and search. */
export async function saveSupplyContactAction(orgId: string, input: SupplyContactInput): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = contactSchema.safeParse(input)
  if (!z.uuid().safeParse(orgId).success) return fail('Organisation not found.')
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the contact details.')
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: partner } = await db.from('supply_partners').select('org_id').eq('org_id', orgId).maybeSingle()
  if (!partner) return fail('Create the supply partner record first.')
  const row = {
    name: d.name,
    role: d.role ?? null,
    phone: d.phone ?? null,
    phone_normalised: d.phone ? normaliseSupplyPhone(d.phone) : null,
    whatsapp: d.whatsapp ? normaliseSupplyPhone(d.whatsapp) : null,
    telegram: d.telegram ?? null,
    preferred_channel: d.preferred_channel ?? null,
    email: d.email?.toLowerCase() ?? null,
    consent_basis: d.consent_basis ?? null,
    consent_note: d.consent_note ?? null,
    do_not_contact: d.do_not_contact,
    last_contacted_at: dateOrNull(d.last_contacted_at),
  }
  const label = await orgName(orgId)
  if (d.id) {
    const { data: before } = await db.from('supply_contacts').select('*').eq('id', d.id).eq('org_id', orgId).maybeSingle()
    if (!before) return fail('Contact not found.')
    const { error } = await db.from('supply_contacts').update(row).eq('id', d.id)
    if (error) return fail('Could not save the contact.')
    await audit('supply.contact.update', { type: 'organisation', id: orgId, label }, { contact: d.id, ...changedFields(before as Record<string, unknown>, row) })
  } else {
    const { data, error } = await db.from('supply_contacts').insert({ org_id: orgId, ...row }).select('id').single()
    if (error || !data) return fail('Could not add the contact.')
    await audit('supply.contact.create', { type: 'organisation', id: orgId, label }, { contact: data.id, name: row.name, do_not_contact: row.do_not_contact })
  }
  refresh(orgId)
  return ok({ message: d.id ? 'Contact saved.' : 'Contact added.' })
}

export async function removeSupplyContactAction(orgId: string, contactId: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.uuid().safeParse(contactId).success) return fail('Contact not found.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('supply_contacts').select('name').eq('id', contactId).eq('org_id', orgId).maybeSingle()
  if (!before) return fail('Contact not found.')
  const { error } = await db.from('supply_contacts').delete().eq('id', contactId)
  if (error) return fail('Could not remove the contact.')
  await audit('supply.contact.remove', { type: 'organisation', id: orgId, label: await orgName(orgId) }, { contact: contactId, name: before.name })
  refresh(orgId)
  return ok({ message: 'Contact removed.' })
}
