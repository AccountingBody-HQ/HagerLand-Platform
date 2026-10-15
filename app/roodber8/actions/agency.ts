'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { INSTRUCTION_STAGES, OFFER_STATUSES, STAGES_NEEDING_TERMS, STAGE_LABEL, VALUATION_OUTCOMES, VALUATION_STATUSES, VIEWING_STATUSES, CONTACT_ROLES, instructionFee, type InstructionStage } from '@/lib/agency'
import { logActivity, type AgencyEntity } from '@/lib/agency-server'
import { intFromForm, nameSchema, optionalEmailSchema, optionalPhoneSchema, optionalText, checkbox } from '@/lib/validation/common'
import { sendEmail } from '@/lib/email/send'
import { offerDecisionEmail, requirementMatchesEmail, viewingConfirmedEmail } from '@/lib/email/agency'
import { canonicalUrl } from '@/lib/site'
import { formatETB } from '@/lib/format'
import { revalidateEntity } from '@/lib/revalidate'
import { PROPERTY_TYPES, type PropertyType } from '@/lib/labels'

type Msg = ActionResult<{ message: string }>
const ENTITIES = ['contact', 'instruction', 'valuation', 'viewing', 'offer', 'application', 'tenancy'] as const
const blank = (v: unknown) => (v === '' ? undefined : v)
const dateField = z.preprocess(blank, z.iso.date('Use a date').optional())
const dateTimeField = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use a date and time').optional())
const httpsField = z.preprocess(blank, z.string().trim().max(500).regex(/^https:\/\/\S+$/, 'Use a full https:// link').optional())

/** "2026-10-20T14:30" typed in admin is Ethiopia time (UTC+3, no daylight saving); stored in UTC. */
function eatToIso(local: string): string {
  return new Date(`${local}:00+03:00`).toISOString()
}

function refresh(path: string) {
  revalidatePath('/roodber8/agency', 'layout')
  revalidatePath(path)
}

// ---------------------------------------------------------------------------
// Shared: notes, tasks and documents on any agency record
// ---------------------------------------------------------------------------

export async function addAgencyNoteAction(entity: string, id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const p = z.object({ entity: z.enum(ENTITIES), id: z.uuid(), text: z.string().trim().min(1, 'Write a note').max(2000) }).safeParse({ entity, id, text: formData.get('text') })
  if (!p.success) return invalid(p.error)
  await logActivity(p.data.entity, p.data.id, 'note', p.data.text, await adminActor())
  await audit('agency.note', { type: `agency_${p.data.entity}`, id: p.data.id })
  refresh(`/roodber8/agency`)
  return ok({ message: 'Note added.' })
}

export async function addAgencyTaskAction(entity: string, id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const p = z
    .object({ entity: z.enum(ENTITIES), id: z.uuid(), title: z.string().trim().min(2, 'Describe the task').max(200), due_on: dateField, assigned_to: optionalText(120, 'Assigned to') })
    .safeParse({ entity, id, ...Object.fromEntries(formData) })
  if (!p.success) return invalid(p.error)
  const actor = await adminActor()
  const { error } = await getAdminSupabase().from('agency_tasks').insert({ entity_type: p.data.entity, entity_id: p.data.id, title: p.data.title, due_on: p.data.due_on ?? null, assigned_to: p.data.assigned_to ?? null, created_by: actor })
  if (error) return fail('Could not add the task.')
  await logActivity(p.data.entity, p.data.id, 'task', `Task added: ${p.data.title}${p.data.due_on ? ` (due ${p.data.due_on})` : ''}`, actor)
  await audit('agency.task.add', { type: `agency_${p.data.entity}`, id: p.data.id, label: p.data.title })
  refresh('/roodber8/agency')
  return ok({ message: 'Task added.' })
}

export async function completeAgencyTaskAction(taskId: string): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(taskId).success) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: t } = await db.from('agency_tasks').select('entity_type, entity_id, title, done').eq('id', taskId).maybeSingle()
  if (!t) return fail('Not found.')
  if (t.done) return ok({ message: 'Already done.' })
  await db.from('agency_tasks').update({ done: true, done_at: new Date().toISOString() }).eq('id', taskId)
  await logActivity(t.entity_type as AgencyEntity, t.entity_id, 'task', `Task done: ${t.title}`, await adminActor())
  await audit('agency.task.done', { type: `agency_${t.entity_type}`, id: t.entity_id, label: t.title })
  refresh('/roodber8/agency')
  return ok({ message: 'Task done.' })
}

/** Links an uploaded private document (agency area) to a record. */
export async function attachAgencyDocumentAction(entity: string, id: string, path: string, label: string): Promise<Msg> {
  await assertAdmin()
  const p = z.object({ entity: z.enum(ENTITIES), id: z.uuid(), path: z.string().regex(/^docs\/agency\/[0-9a-f-]{36}\/[\w.-]+$/), label: z.string().trim().min(2).max(160) }).safeParse({ entity, id, path, label })
  if (!p.success) return fail('Upload the file again.')
  const actor = await adminActor()
  const { error } = await getAdminSupabase().from('agency_documents').insert({ entity_type: p.data.entity, entity_id: p.data.id, label: p.data.label, storage_path: p.data.path, uploaded_by: actor })
  if (error) return fail('Could not save the document.')
  await logActivity(p.data.entity, p.data.id, 'document', `Document added: ${p.data.label}`, actor)
  await audit('agency.document', { type: `agency_${p.data.entity}`, id: p.data.id, label: p.data.label })
  refresh('/roodber8/agency')
  return ok({ message: 'Document saved.' })
}

// ---------------------------------------------------------------------------
// Contacts and applicant requirements
// ---------------------------------------------------------------------------

const contactSchema = z
  .object({
    name: nameSchema,
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    roles: z.array(z.enum(CONTACT_ROLES)).min(1, 'Choose at least one role'),
    assigned_agent: optionalText(120, 'Agent'),
    notes: optionalText(4000, 'Notes'),
    marketing_consent: checkbox,
    consent_source: optionalText(120, 'How consent was given'),
  })
  .refine((d) => d.email || d.phone, { message: 'Add an email or a phone number', path: ['email'] })
  .refine((d) => !d.marketing_consent || d.consent_source, { message: 'Record how the contact agreed (e.g. "by phone, 15 Oct")', path: ['consent_source'] })

/** Creates (no id) or updates a contact. Consent is recorded with its time and source (spec 26.5). */
export async function saveAgencyContactAction(id: string | null, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const p = contactSchema.safeParse({ ...Object.fromEntries(formData), roles: formData.getAll('roles') })
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const base = { name: d.name, email: d.email ?? null, phone: d.phone ?? null, roles: Array.from(new Set(d.roles)), assigned_agent: d.assigned_agent ?? null, notes: d.notes ?? null }
  if (!id) {
    const { data, error } = await db
      .from('agency_contacts')
      .insert({ ...base, marketing_consent: d.marketing_consent, consent_at: d.marketing_consent ? new Date().toISOString() : null, consent_source: d.marketing_consent ? (d.consent_source ?? null) : null })
      .select('id')
      .single()
    if (error || !data) return fail('Could not save the contact.')
    await logActivity('contact', data.id, 'created', 'Contact added in admin.', await adminActor())
    await audit('agency.contact.create', { type: 'agency_contact', id: data.id, label: d.name })
    refresh('/roodber8/agency/contacts')
    return ok({ message: 'Contact added.' })
  }
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const { data: before } = await db.from('agency_contacts').select('name, email, phone, roles, assigned_agent, notes, marketing_consent, consent_source').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const consentChanged = before.marketing_consent !== d.marketing_consent
  const next = { ...base, ...(consentChanged ? { marketing_consent: d.marketing_consent, consent_at: d.marketing_consent ? new Date().toISOString() : null, consent_source: d.marketing_consent ? (d.consent_source ?? null) : `withdrawn: ${d.consent_source ?? 'recorded in admin'}`.slice(0, 120) } : {}) }
  const { error } = await db.from('agency_contacts').update(next).eq('id', id)
  if (error) return fail('Could not save the contact.')
  if (consentChanged) await logActivity('contact', id, 'status', d.marketing_consent ? `Marketing consent given (${d.consent_source}).` : 'Marketing consent withdrawn.', await adminActor())
  await audit('agency.contact.update', { type: 'agency_contact', id, label: d.name }, changedFields(before, next))
  refresh(`/roodber8/agency/contacts/${id}`)
  return ok({ message: 'Saved.' })
}

const requirementSchema = z
  .object({
    contact_id: z.uuid(),
    purpose: z.enum(['sale', 'rent']),
    budget_min_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }),
    budget_max_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }),
    location_ids: z.array(z.uuid()).max(20),
    property_types: z.array(z.enum(PROPERTY_TYPES.map((t) => t.value) as [PropertyType, ...PropertyType[]])).max(20),
    beds_min: intFromForm({ min: 0, max: 20 }),
    notes: optionalText(2000, 'Notes'),
  })
  .refine((d) => d.budget_min_etb === undefined || d.budget_max_etb === undefined || d.budget_max_etb >= d.budget_min_etb, { message: 'The maximum must be at least the minimum', path: ['budget_max_etb'] })

export async function addRequirementAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const p = requirementSchema.safeParse({ ...Object.fromEntries(formData), location_ids: formData.getAll('location_ids').filter(Boolean), property_types: formData.getAll('property_types') })
  if (!p.success) return invalid(p.error)
  const d = p.data
  const { error } = await getAdminSupabase()
    .from('applicant_requirements')
    .insert({ contact_id: d.contact_id, purpose: d.purpose, budget_min_etb: d.budget_min_etb ?? null, budget_max_etb: d.budget_max_etb ?? null, location_ids: d.location_ids, property_types: d.property_types, beds_min: d.beds_min ?? null, notes: d.notes ?? null })
  if (error) return fail('Could not save the requirements.')
  await logActivity('contact', d.contact_id, 'note', `Requirements added: ${d.purpose === 'sale' ? 'to buy' : 'to rent'}${d.budget_max_etb ? `, up to ${formatETB(d.budget_max_etb)}` : ''}.`, await adminActor())
  await audit('agency.requirement.add', { type: 'agency_contact', id: d.contact_id })
  refresh(`/roodber8/agency/contacts/${d.contact_id}`)
  return ok({ message: 'Requirements saved. Matching listings appear below.' })
}

export async function setRequirementActiveAction(id: string, active: boolean): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('applicant_requirements').select('contact_id').eq('id', id).maybeSingle()
  if (!r) return fail('Not found.')
  await db.from('applicant_requirements').update({ is_active: active }).eq('id', id)
  await audit('agency.requirement.active', { type: 'agency_contact', id: r.contact_id }, { requirement: id, active })
  refresh(`/roodber8/agency/contacts/${r.contact_id}`)
  return ok({ message: active ? 'Requirements switched on.' : 'Requirements paused.' })
}

/** Agent-triggered match email (spec 26.5): only to contacts who agreed to hear about matching properties. */
export async function emailMatchesAction(requirementId: string): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(requirementId).success) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('applicant_requirements').select('id, contact_id, contact:agency_contacts(name, email, marketing_consent)').eq('id', requirementId).maybeSingle()
  const contact = Array.isArray(r?.contact) ? r?.contact[0] : r?.contact
  if (!r || !contact) return fail('Not found.')
  if (!contact.email) return fail('This contact has no email address.')
  if (!contact.marketing_consent) return fail('This contact has not agreed to receive property emails. Record their consent first.')
  const { data: matches } = await db.rpc('agency_requirement_matches', { p_requirement: r.id, p_limit: 10 })
  const items = (matches ?? []).map((m) => ({ title: m.title, price: m.price_etb ? formatETB(m.price_etb) : 'Price on request', url: canonicalUrl(`/property/${m.slug}`) }))
  if (items.length === 0) return fail('No live listings match these requirements right now.')
  await sendEmail({ to: contact.email, ...requirementMatchesEmail({ name: contact.name.split(' ')[0] || contact.name, items }) })
  await db.from('applicant_requirements').update({ last_emailed_at: new Date().toISOString() }).eq('id', r.id)
  await logActivity('contact', r.contact_id, 'email', `Emailed ${items.length} matching ${items.length === 1 ? 'listing' : 'listings'}.`, await adminActor())
  await audit('agency.matches.email', { type: 'agency_contact', id: r.contact_id, label: contact.name }, { count: items.length })
  refresh(`/roodber8/agency/contacts/${r.contact_id}`)
  return ok({ message: `Sent ${items.length} ${items.length === 1 ? 'match' : 'matches'} to ${contact.email}.` })
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

const instructionSchema = z.object({
  title: z.string().trim().min(3, 'Give the instruction a short title').max(160),
  purpose: z.enum(['sale', 'rent']),
  contact_id: z.preprocess(blank, z.uuid().optional()),
  property_type: z.preprocess(blank, z.enum(PROPERTY_TYPES.map((t) => t.value) as [PropertyType, ...PropertyType[]]).optional()),
  address_line: optionalText(300, 'Address'),
  assigned_agent: optionalText(120, 'Agent'),
})

export async function createInstructionAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const p = instructionSchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const { data, error } = await getAdminSupabase()
    .from('agency_instructions')
    .insert({ title: d.title, purpose: d.purpose, contact_id: d.contact_id ?? null, property_type: d.property_type ?? null, address_line: d.address_line ?? null, assigned_agent: d.assigned_agent ?? null, source: 'manual' })
    .select('id, reference')
    .single()
  if (error || !data) return fail('Could not create the instruction.')
  await logActivity('instruction', data.id, 'created', 'Instruction created in admin.', await adminActor())
  await audit('agency.instruction.create', { type: 'agency_instruction', id: data.id, label: `${data.reference} ${d.title}` })
  refresh('/roodber8/agency/instructions')
  return ok({ message: `Instruction ${data.reference} created.` })
}

const termsSchema = z
  .object({
    fee_type: z.preprocess(blank, z.enum(['percent', 'fixed']).optional()),
    fee_percent: z.preprocess(blank, z.coerce.number().min(0).max(100).optional()),
    fee_amount_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }),
    agency_type: z.preprocess(blank, z.enum(['sole', 'multi']).optional()),
    term_start: dateField,
    term_end: dateField,
    asking_price_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }),
    assigned_agent: optionalText(120, 'Agent'),
    notes: optionalText(4000, 'Notes'),
  })
  .refine((d) => d.fee_type !== 'percent' || d.fee_percent !== undefined, { message: 'Enter the fee percentage', path: ['fee_percent'] })
  .refine((d) => d.fee_type !== 'fixed' || d.fee_amount_etb !== undefined, { message: 'Enter the fixed fee', path: ['fee_amount_etb'] })
  .refine((d) => !d.term_end || !d.term_start || d.term_end >= d.term_start, { message: 'The end must be after the start', path: ['term_end'] })

/** Instruction terms (spec 26.5): fee type and amount, sole or multi agency, term dates, asking price. */
export async function saveInstructionTermsAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = termsSchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('agency_instructions').select('reference, fee_type, fee_percent, fee_amount_etb, agency_type, term_start, term_end, asking_price_etb, assigned_agent, notes').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const next = {
    fee_type: d.fee_type ?? null,
    fee_percent: d.fee_type === 'percent' ? (d.fee_percent ?? null) : null,
    fee_amount_etb: d.fee_type === 'fixed' ? (d.fee_amount_etb ?? null) : null,
    agency_type: d.agency_type ?? null,
    term_start: d.term_start ?? null,
    term_end: d.term_end ?? null,
    asking_price_etb: d.asking_price_etb ?? null,
    assigned_agent: d.assigned_agent ?? null,
    notes: d.notes ?? null,
  }
  const { error } = await db.from('agency_instructions').update(next).eq('id', id)
  if (error) return fail(error.code === '23514' ? 'Instructed and later stages need a fee, sole or multi agency, and a start date.' : 'Could not save the terms.')
  const diff = changedFields(before, next)
  if (Object.keys(diff).length) await logActivity('instruction', id, 'note', `Terms updated: ${Object.keys(diff).join(', ').replace(/_/g, ' ')}.`, await adminActor())
  await audit('agency.instruction.terms', { type: 'agency_instruction', id, label: before.reference }, diff)
  refresh(`/roodber8/agency/instructions/${id}`)
  return ok({ message: 'Terms saved.' })
}

/** Moves an instruction through the pipeline. "Completed" records the final price and creates a deal (spec 26.5). */
export async function setInstructionStageAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const p = z.object({ id: z.uuid(), stage: z.enum(INSTRUCTION_STAGES), final_price_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }) }).safeParse({ id, ...Object.fromEntries(formData) })
  if (!p.success) return invalid(p.error)
  const { stage } = p.data
  const db = getAdminSupabase()
  const { data: ins } = await db.from('agency_instructions').select('reference, title, stage, purpose, fee_type, fee_percent, fee_amount_etb, agency_type, term_start, property_id, asking_price_etb, deal_id').eq('id', id).maybeSingle()
  if (!ins) return fail('Not found.')
  if (ins.stage === stage) return ok({ message: 'No change.' })
  if (STAGES_NEEDING_TERMS.includes(stage as InstructionStage) && (!ins.fee_type || !ins.agency_type || !ins.term_start)) return fail('Save the written terms first (fee, sole or multi agency, start date). Upload the signed agreement in Documents.')
  if (stage === 'live' && !ins.property_id) return fail('Link the listing first, so it can be marked “Marketed by HagerLand”.')
  if (stage === 'under_offer' && ins.purpose !== 'sale') return fail('“Under offer” is for sales. Use “Let agreed” for lettings.')
  if (stage === 'let_agreed' && ins.purpose !== 'rent') return fail('“Let agreed” is for lettings. Use “Under offer” for sales.')
  const finalPrice = stage === 'completed' ? (p.data.final_price_etb ?? ins.asking_price_etb ?? null) : null
  if (stage === 'completed' && !finalPrice) return fail('Enter the final price (or monthly rent) to complete the instruction.', { final_price_etb: 'Enter the final price' })
  const patch: { stage: InstructionStage; final_price_etb?: number | null } = { stage }
  if (stage === 'completed') patch.final_price_etb = finalPrice
  const { error } = await db.from('agency_instructions').update(patch).eq('id', id)
  if (error) return fail(error.code === '23514' ? 'This stage needs the written terms first.' : 'Could not change the stage.')
  const actor = await adminActor()
  await logActivity('instruction', id, 'status', `Stage: ${STAGE_LABEL[ins.stage as InstructionStage]} → ${STAGE_LABEL[stage]}`, actor)
  // Completion creates the deal in the existing ledger: commission on a sale, letting fee on a let.
  if (stage === 'completed' && !ins.deal_id) {
    const fee = instructionFee(ins, finalPrice)
    const { data: deal } = await db
      .from('deals')
      .insert({ source_type: 'agency_instruction', source_id: id, title: `${ins.purpose === 'sale' ? 'Sale' : 'Letting'}: ${ins.title}`.slice(0, 200), value_minor: finalPrice ? finalPrice * 100 : null, commission_minor: fee !== null ? fee * 100 : null, status: 'won', closed_at: new Date().toISOString(), pillar_key: ins.purpose === 'sale' ? 'buy' : 'rent', notes: `${ins.purpose === 'sale' ? 'Commission' : 'Letting fee'} for ${ins.reference}` })
      .select('id, reference')
      .single()
    if (deal) {
      await db.from('agency_instructions').update({ deal_id: deal.id }).eq('id', id)
      await logActivity('instruction', id, 'link', `Deal ${deal.reference} created${fee !== null ? ` (${ins.purpose === 'sale' ? 'commission' : 'letting fee'} ${formatETB(fee)})` : ''}.`, actor)
    }
  }
  if (ins.property_id) revalidateEntity('property', ins.property_id)
  await audit('agency.instruction.stage', { type: 'agency_instruction', id, label: ins.reference }, { stage: { from: ins.stage, to: stage }, final_price_etb: finalPrice })
  refresh(`/roodber8/agency/instructions/${id}`)
  return ok({ message: `Stage changed to ${STAGE_LABEL[stage]}.` })
}

/** Links a listing (by its 8-character reference) to an instruction. Live instructions mark it "Marketed by HagerLand". */
export async function linkInstructionListingAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const ref = String(formData.get('listing') ?? '').trim().match(/([0-9a-z]{8})$/i)?.[1]?.toLowerCase()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  if (!ref) return fail('Enter the listing’s 8-character reference or its link.', { listing: 'Enter a reference' })
  const db = getAdminSupabase()
  const [{ data: ins }, { data: prop }] = await Promise.all([db.from('agency_instructions').select('reference, purpose').eq('id', id).maybeSingle(), db.from('properties').select('id, title, purpose').eq('short_id', ref).maybeSingle()])
  if (!ins) return fail('Not found.')
  if (!prop) return fail('No listing has that reference.', { listing: 'Not found' })
  if (prop.purpose !== ins.purpose) return fail(`That listing is ${prop.purpose === 'sale' ? 'for sale' : 'to rent'}, but this instruction is ${ins.purpose === 'sale' ? 'a sale' : 'a letting'}.`)
  const { error } = await db.from('agency_instructions').update({ property_id: prop.id }).eq('id', id)
  if (error) return fail('Could not link the listing.')
  await logActivity('instruction', id, 'link', `Listing linked: ${prop.title}`, await adminActor())
  await audit('agency.instruction.listing', { type: 'agency_instruction', id, label: ins.reference }, { property_id: prop.id })
  revalidateEntity('property', prop.id)
  refresh(`/roodber8/agency/instructions/${id}`)
  return ok({ message: 'Listing linked.' })
}

export async function toggleProgressItemAction(itemId: string, done: boolean): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(itemId).success) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: item } = await db.from('sale_progress_items').select('instruction_id, label').eq('id', itemId).maybeSingle()
  if (!item) return fail('Not found.')
  await db.from('sale_progress_items').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', itemId)
  await logActivity('instruction', item.instruction_id, 'status', `${done ? 'Done' : 'Not done'}: ${item.label}`, await adminActor())
  await audit('agency.progress', { type: 'agency_instruction', id: item.instruction_id, label: item.label }, { done })
  refresh(`/roodber8/agency/instructions/${item.instruction_id}`)
  return ok({ message: 'Updated.' })
}

// ---------------------------------------------------------------------------
// Valuations
// ---------------------------------------------------------------------------

const valuationSchema = z
  .object({
    status: z.enum(VALUATION_STATUSES),
    appointment_at: dateTimeField,
    assigned_agent: optionalText(120, 'Agent'),
    value_low_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }),
    value_high_etb: intFromForm({ min: 0, max: 1_000_000_000_000 }),
    notes: optionalText(4000, 'Notes'),
    outcome: z.enum(VALUATION_OUTCOMES),
  })
  .refine((d) => d.status !== 'booked' || d.appointment_at, { message: 'Choose the appointment date and time', path: ['appointment_at'] })
  .refine((d) => d.value_low_etb === undefined || d.value_high_etb === undefined || d.value_high_etb >= d.value_low_etb, { message: 'The top of the range must be at least the bottom', path: ['value_high_etb'] })

/** Books, records and closes a valuation; keeps its instruction's stage in step (spec 26.5). */
export async function saveValuationAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = valuationSchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('agency_valuations').select('reference, status, appointment_at, assigned_agent, value_low_etb, value_high_etb, notes, outcome, instruction_id').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const next = { status: d.status, appointment_at: d.appointment_at ? eatToIso(d.appointment_at) : null, assigned_agent: d.assigned_agent ?? null, value_low_etb: d.value_low_etb ?? null, value_high_etb: d.value_high_etb ?? null, notes: d.notes ?? null, outcome: d.outcome }
  const { error } = await db.from('agency_valuations').update(next).eq('id', id)
  if (error) return fail('Could not save the valuation.')
  const actor = await adminActor()
  if (before.status !== d.status) await logActivity('valuation', id, 'status', `Status: ${before.status} → ${d.status}`, actor)
  if (before.instruction_id) {
    const stage = d.outcome === 'instructed' ? 'instructed' : d.status === 'completed' ? 'valued' : d.status === 'booked' ? 'valuation_booked' : null
    if (stage && stage !== 'instructed') {
      const { data: ins } = await db.from('agency_instructions').select('stage').eq('id', before.instruction_id).maybeSingle()
      const order = ['lead', 'valuation_booked', 'valued']
      if (ins && order.indexOf(ins.stage) >= 0 && order.indexOf(ins.stage) < order.indexOf(stage)) {
        await db.from('agency_instructions').update({ stage }).eq('id', before.instruction_id)
        await logActivity('instruction', before.instruction_id, 'status', `Stage: ${STAGE_LABEL[ins.stage as InstructionStage]} → ${STAGE_LABEL[stage as InstructionStage]} (valuation ${before.reference})`, actor)
      }
    }
  }
  await audit('agency.valuation.update', { type: 'agency_valuation', id, label: before.reference }, changedFields(before, next))
  refresh(`/roodber8/agency/valuations/${id}`)
  return ok({ message: 'Valuation saved.' })
}

/** Attaches the valuation report (a private PDF uploaded to the agency area). */
export async function setValuationReportAction(id: string, path: string): Promise<Msg> {
  await assertAdmin()
  const p = z.object({ id: z.uuid(), path: z.string().regex(/^docs\/agency\/[0-9a-f-]{36}\/[\w.-]+$/) }).safeParse({ id, path })
  if (!p.success) return fail('Upload the report again.')
  const db = getAdminSupabase()
  const { data: v } = await db.from('agency_valuations').select('reference').eq('id', id).maybeSingle()
  if (!v) return fail('Not found.')
  await db.from('agency_valuations').update({ report_path: p.data.path }).eq('id', id)
  await logActivity('valuation', id, 'document', 'Valuation report uploaded.', await adminActor())
  await audit('agency.valuation.report', { type: 'agency_valuation', id, label: v.reference })
  refresh(`/roodber8/agency/valuations/${id}`)
  return ok({ message: 'Report saved.' })
}

// ---------------------------------------------------------------------------
// Viewings
// ---------------------------------------------------------------------------

const viewingSchema = z
  .object({
    status: z.enum(VIEWING_STATUSES),
    scheduled_at: dateTimeField,
    assigned_agent: optionalText(120, 'Agent'),
    video_link: httpsField,
    feedback: optionalText(2000, 'Feedback'),
    send_confirmation: checkbox,
  })
  .refine((d) => d.status !== 'confirmed' || d.scheduled_at, { message: 'Choose the date and time', path: ['scheduled_at'] })

/** Schedules a viewing (with a confirmation email), records feedback and the outcome (spec 26.5). */
export async function saveViewingAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = viewingSchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('agency_viewings').select('reference, status, scheduled_at, assigned_agent, video_link, feedback, name, email, mode, property:properties(title)').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  if (d.status === 'confirmed' && before.mode === 'video' && !d.video_link) return fail('Add the video-call link for a video viewing.', { video_link: 'Add the link' })
  const scheduled = d.scheduled_at ? eatToIso(d.scheduled_at) : null
  const rescheduled = scheduled !== before.scheduled_at
  const next = { status: d.status, scheduled_at: scheduled, assigned_agent: d.assigned_agent ?? null, video_link: d.video_link ?? null, feedback: d.feedback ?? null, ...(d.status === 'confirmed' && (before.status !== 'confirmed' || rescheduled) ? { confirmed_at: new Date().toISOString(), reminder_sent_at: null } : {}) }
  const { error } = await db.from('agency_viewings').update(next).eq('id', id)
  if (error) return fail('Could not save the viewing.')
  const actor = await adminActor()
  if (before.status !== d.status || rescheduled) await logActivity('viewing', id, 'status', `${d.status === 'confirmed' ? 'Confirmed for' : 'Status'} ${d.status === 'confirmed' && scheduled ? scheduled : d.status}`, actor)
  const property = (Array.isArray(before.property) ? before.property[0] : before.property)?.title ?? 'the property'
  let emailed = false
  if (d.status === 'confirmed' && scheduled && before.email && (d.send_confirmation || before.status !== 'confirmed')) {
    await sendEmail({ to: before.email, ...viewingConfirmedEmail({ name: before.name.split(' ')[0] || before.name, reference: before.reference, property, when: scheduled, mode: before.mode, videoLink: d.video_link ?? null }) })
    await logActivity('viewing', id, 'email', 'Confirmation emailed to the applicant.', actor)
    emailed = true
  }
  await audit('agency.viewing.update', { type: 'agency_viewing', id, label: before.reference }, changedFields(before, next))
  refresh(`/roodber8/agency/viewings/${id}`)
  return ok({ message: emailed ? 'Viewing saved and confirmation emailed.' : 'Viewing saved.' })
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

const offerSchema = z
  .object({ status: z.enum(OFFER_STATUSES), counter_amount_etb: intFromForm({ min: 1, max: 1_000_000_000_000 }), vendor_decision: optionalText(2000, 'Decision'), notify: checkbox })
  .refine((d) => d.status !== 'countered' || d.counter_amount_etb !== undefined, { message: 'Enter the owner’s counter-offer', path: ['counter_amount_etb'] })
  .refine((d) => !['accepted', 'rejected', 'countered'].includes(d.status) || d.vendor_decision, { message: 'Record what the owner decided and when', path: ['vendor_decision'] })

/**
 * Records the owner's decision on an offer (spec 26.5). Accepting puts the instruction under offer and starts the
 * sale progression checklist from the defaults in Settings.
 */
export async function decideOfferAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = offerSchema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const d = p.data
  const db = getAdminSupabase()
  const { data: o } = await db.from('agency_offers').select('reference, status, amount_etb, counter_amount_etb, vendor_decision, instruction_id, name, email, property:properties(title)').eq('id', id).maybeSingle()
  if (!o) return fail('Not found.')
  const next = { status: d.status, counter_amount_etb: d.status === 'countered' ? (d.counter_amount_etb ?? null) : o.counter_amount_etb, vendor_decision: d.vendor_decision ?? null, decided_at: ['accepted', 'rejected', 'countered'].includes(d.status) ? new Date().toISOString() : null }
  const { error } = await db.from('agency_offers').update(next).eq('id', id)
  if (error) return fail('Could not save the decision.')
  const actor = await adminActor()
  await logActivity('offer', id, 'status', `Status: ${o.status} → ${d.status}${d.vendor_decision ? `. ${d.vendor_decision}` : ''}`, actor)
  if (d.status === 'accepted' && o.status !== 'accepted' && o.instruction_id) {
    const { data: ins } = await db.from('agency_instructions').select('stage, fee_type, agency_type, term_start').eq('id', o.instruction_id).maybeSingle()
    if (ins && ins.stage === 'live') {
      const { error: stageError } = await db.from('agency_instructions').update({ stage: 'under_offer' }).eq('id', o.instruction_id)
      if (!stageError) await logActivity('instruction', o.instruction_id, 'status', `Stage: Live → Under offer (offer ${o.reference} accepted)`, actor)
    }
    const { count } = await db.from('sale_progress_items').select('id', { count: 'exact', head: true }).eq('instruction_id', o.instruction_id)
    if (!count) {
      const { data: s } = await db.from('site_settings').select('value').eq('key', 'sale_progression_defaults').maybeSingle()
      const labels = Array.isArray(s?.value) ? s.value.filter((x): x is string => typeof x === 'string').slice(0, 30) : []
      if (labels.length) await db.from('sale_progress_items').insert(labels.map((label, i) => ({ instruction_id: o.instruction_id as string, offer_id: id, label, sort: i })))
      await logActivity('instruction', o.instruction_id, 'status', 'Sale progression checklist started.', actor)
    }
  }
  if (d.notify && o.email && ['accepted', 'rejected', 'countered'].includes(d.status)) {
    const property = (Array.isArray(o.property) ? o.property[0] : o.property)?.title ?? 'the property'
    await sendEmail({ to: o.email, ...offerDecisionEmail({ name: o.name.split(' ')[0] || o.name, reference: o.reference, property, status: d.status, counterAmount: next.counter_amount_etb }) })
    await logActivity('offer', id, 'email', 'Decision emailed to the buyer.', actor)
  }
  await audit('agency.offer.decision', { type: 'agency_offer', id, label: o.reference }, changedFields(o, next))
  refresh(`/roodber8/agency/offers/${id}`)
  return ok({ message: 'Decision recorded.' })
}

/** Default sale-progression items and the rent-ready checklist (admin → Agency → Settings). One item per line. */
export async function saveAgencyListsAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  const lines = (k: string) =>
    String(formData.get(k) ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  const p = z.object({ sale: z.array(z.string().max(200)).min(1, 'Add at least one step').max(30), rent: z.array(z.string().max(200)).min(1, 'Add at least one item').max(30) }).safeParse({ sale: lines('sale_progression_defaults'), rent: lines('rent_ready_checklist') })
  if (!p.success) return invalid(p.error)
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('key, value').in('key', ['sale_progression_defaults', 'rent_ready_checklist'])
  const { error } = await db.from('site_settings').upsert([
    { key: 'sale_progression_defaults', value: p.data.sale },
    { key: 'rent_ready_checklist', value: p.data.rent },
  ])
  if (error) return fail('Could not save.')
  await audit('settings.update', { type: 'settings', label: 'agency lists' }, changedFields(Object.fromEntries((before ?? []).map((r) => [r.key, r.value])), { sale_progression_defaults: p.data.sale, rent_ready_checklist: p.data.rent }))
  revalidatePath('/', 'layout')
  return ok({ message: 'Saved.' })
}
