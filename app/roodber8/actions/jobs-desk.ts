'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15): Owner and Operations. */
const AREA = '/roodber8/jobs/desk'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { phoneSchema } from '@/lib/validation/common'
import { CURRENCIES } from '@/lib/countries'
import { TRADE_VALUES, jobColumns, jobSchema, tradeLabel } from '@/lib/jobs'
import { shortId, slugify } from '@/lib/slug'
import { log } from '@/lib/log'
import { formatDate } from '@/lib/format'
import { parsePriceEtb } from '@/lib/supply/offers'
import { percentToBps } from '@/lib/supply/money'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { deskEvent, employerContact } from '@/lib/jobs-desk-data'
import { confirmAgreementUpload, createAgreementUpload } from '@/lib/jobs-desk-files'
import {
  ASSIGNMENT_STATUSES,
  CLOSED_ASSIGNMENT,
  CONSENT_METHOD_VALUES,
  DEFAULT_GUARANTEE_DAYS,
  canReverse,
  introductionBlocker,
  leftInsideGuarantee,
  profileRefRange,
  todayAddis,
  type RoleType,
} from '@/lib/jobs-desk'
import { sendEmail } from '@/lib/email/send'
import { placementConfirmedEmail, recruitmentIntroductionEmail } from '@/lib/email/templates'

type Msg = ActionResult<{ message: string }>
const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)
const uuid = z.uuid()

function refresh(assignmentId?: string) {
  revalidatePath('/roodber8/jobs/desk')
  if (assignmentId) revalidatePath(`/roodber8/jobs/desk/${assignmentId}`)
}

async function loadAssignment(id: string) {
  if (!uuid.safeParse(id).success) return null
  const { data } = await getAdminSupabase().from('recruitment_assignments').select('id, reference, status, employer_org_id, service_request_id').eq('id', id).maybeSingle()
  return data
}

async function loadCandidate(id: string) {
  if (!uuid.safeParse(id).success) return null
  const { data } = await getAdminSupabase().from('recruitment_candidates').select('*').eq('id', id).maybeSingle()
  return data
}

/** A shortlist row was touched: its 12-month clock restarts (never later than 12 months after the assignment closes). */
const touched = () => ({ last_activity_at: new Date().toISOString() })

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

const assignmentSchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES),
  employer_slug: z.preprocess(blank, z.string().trim().max(120).optional()),
  roles: z.preprocess(blank, z.string().trim().max(2000).optional()),
  headcount: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(v)), z.number().int('Enter a whole number of people').min(1).max(10000).optional()),
  pay_text: z.preprocess(blank, z.string().trim().max(200).optional()),
  start_date: z.preprocess(blank, z.iso.date().optional()),
  close_reason: z.preprocess(blank, z.string().trim().max(500).optional()),
  notes: z.preprocess(blank, z.string().trim().max(2000).optional()),
})

/** The assignment's details, employer business (blank: private client) and status. */
export async function updateAssignmentAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const a = await loadAssignment(id)
  if (!a) return fail('Not found.')
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  const db = getAdminSupabase()
  let orgId: string | null = null
  if (d.employer_slug) {
    const { data: org } = await db.from('organisations').select('id').eq('slug', d.employer_slug.replace(/^.*\/company\//, '').replace(/\/$/, '')).maybeSingle()
    if (!org) return fail('No business profile with that address. Leave it empty for a private client.')
    orgId = org.id
  }
  const closing = CLOSED_ASSIGNMENT.includes(d.status)
  const wasClosed = CLOSED_ASSIGNMENT.includes(a.status as (typeof CLOSED_ASSIGNMENT)[number])
  const { error } = await db
    .from('recruitment_assignments')
    .update({
      status: d.status,
      employer_org_id: orgId,
      private_client: orgId === null,
      roles: d.roles ?? null,
      headcount: d.headcount ?? null,
      pay_text: d.pay_text ?? null,
      start_date: d.start_date ?? null,
      notes: d.notes ?? null,
      close_reason: closing ? (d.close_reason ?? null) : null,
      closed_at: closing ? (wasClosed ? undefined : new Date().toISOString()) : null,
    })
    .eq('id', a.id)
  if (error) return fail('Could not save the assignment.')
  const actor = await adminActor()
  if (d.status !== a.status) await deskEvent(a.id, 'status_changed', actor, { detail: { from: a.status, to: d.status } })
  await audit('jobs.desk.assignment_update', { type: 'recruitment_assignment', id: a.id, label: a.reference }, { status: d.status, private_client: orgId === null })
  refresh(a.id)
  return ok({ message: 'Saved.' })
}

// ---------------------------------------------------------------------------
// Shortlist (added by staff only)
// ---------------------------------------------------------------------------

const addSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('application'), reference: z.string().trim().toUpperCase().regex(/^HLA-\d{4}-\d{6}$/, 'Application references look like HLA-2026-000001') }),
  z.object({ source: z.literal('profile'), reference: z.string().trim().toUpperCase().regex(/^C-[0-9A-F]{8}$/, 'Candidate references look like C-1A2B3C4D') }),
  z.object({ source: z.literal('register'), reference: z.string().trim().toUpperCase().regex(/^HLW-\d{4}-\d{6}$/, 'Register references look like HLW-2026-000001') }),
  z.object({
    source: z.literal('manual'),
    name: z.string().trim().min(2, 'Enter the name').max(120),
    phone: phoneSchema,
    trade: z.enum(TRADE_VALUES, { error: 'Choose the trade' }),
    area: z.string().trim().min(2, 'Enter the area').max(200),
  }),
])

/**
 * Adds one person to the shortlist from a job application, a visible candidate profile asking for placement help, the
 * worker register, or by hand after a call. An application to a different employer's job is added as reference and
 * trade only: its contact details are copied only once this person agrees to be introduced to this employer.
 */
export async function addToShortlistAction(assignmentId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const a = await loadAssignment(assignmentId)
  if (!a) return fail('Not found.')
  if (CLOSED_ASSIGNMENT.includes(a.status as (typeof CLOSED_ASSIGNMENT)[number])) return fail('This assignment is closed.')
  const parsed = addSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  const db = getAdminSupabase()
  const actor = await adminActor()
  type Row = { source: string; application_id?: string; candidate_user_id?: string; register_id?: string; other_employer?: boolean; name?: string | null; phone?: string | null; email?: string | null; trade?: string | null; area_text?: string | null; role_text?: string | null; adult_confirmed_at?: string | null; adult_confirmed_by?: string | null; adult_confirmed_method?: string | null }
  let row: Row
  if (d.source === 'application') {
    const { data: app } = await db.from('job_applications').select('id, name, email, phone, trade, area_text, adult_confirmed_at, personal_data_deleted_at, job:job_posts(employer_org_id, title, trade, recruitment_assignment_id)').eq('reference', d.reference).maybeSingle()
    if (!app) return fail(`No application ${d.reference}.`)
    if (app.personal_data_deleted_at) return fail('This application’s personal details were deleted after 12 months.')
    const job = app.job as { employer_org_id: string; title: string; trade: string | null; recruitment_assignment_id: string | null } | null
    // An application to this assignment's own private-client job (Jobs Phase 4) belongs to HagerLand: contact shown.
    const ownJob = job?.recruitment_assignment_id === a.id || (Boolean(a.employer_org_id) && job?.employer_org_id === a.employer_org_id)
    const otherEmployer = !ownJob
    row = {
      source: 'application',
      application_id: app.id,
      other_employer: otherEmployer,
      trade: app.trade ?? job?.trade ?? null,
      role_text: job?.title?.slice(0, 120) ?? null,
      ...(otherEmployer ? {} : { name: app.name, phone: app.phone, email: app.email, area_text: app.area_text }),
      ...(app.adult_confirmed_at ? { adult_confirmed_at: app.adult_confirmed_at, adult_confirmed_by: 'source:phone_application', adult_confirmed_method: 'source_record' } : {}),
    }
  } else if (d.source === 'profile') {
    const range = profileRefRange(d.reference)
    if (!range) return fail('Candidate references look like C-1A2B3C4D')
    const { data: profiles } = await db.from('candidate_profiles').select('user_id, full_name, headline, visibility, placement_wanted, availability').gte('user_id', range.from).lte('user_id', range.to).limit(2)
    const p = profiles?.length === 1 ? profiles[0] : null
    if (!p) return fail(`No candidate ${d.reference}.`)
    if (p.visibility !== 'employers' || !p.placement_wanted || p.availability === 'not_looking') return fail('Only visible candidate profiles that ask for placement help can be added.')
    const [{ data: prof }, { data: user }] = await Promise.all([db.from('profiles').select('phone').eq('id', p.user_id).maybeSingle(), db.auth.admin.getUserById(p.user_id)])
    row = { source: 'profile', candidate_user_id: p.user_id, name: p.full_name, phone: prof?.phone ?? null, email: user.user?.email ?? null, role_text: p.headline?.slice(0, 120) ?? null }
  } else if (d.source === 'register') {
    const { data: w } = await db.from('worker_register').select('id, name, phone, trades, area_text, adult_confirmed_at, personal_data_deleted_at').eq('reference', d.reference).maybeSingle()
    if (!w) return fail(`No register entry ${d.reference}.`)
    if (w.personal_data_deleted_at) return fail('This entry’s personal details were deleted after 12 months.')
    row = {
      source: 'register',
      register_id: w.id,
      name: w.name,
      phone: w.phone,
      trade: w.trades[0] ?? null,
      area_text: w.area_text,
      ...(w.adult_confirmed_at ? { adult_confirmed_at: w.adult_confirmed_at, adult_confirmed_by: 'source:worker_register', adult_confirmed_method: 'source_record' } : {}),
    }
  } else {
    row = { source: 'manual', name: d.name, phone: d.phone, trade: d.trade, area_text: d.area }
  }
  const { data, error } = await db.from('recruitment_candidates').insert({ assignment_id: a.id, created_by: actor.slice(0, 120), ...row }).select('id, reference').single()
  if (error?.code === '23505') return fail('This person is already on the shortlist.')
  if (error || !data) return fail('Could not add this person.')
  if (a.status === 'open') await db.from('recruitment_assignments').update({ status: 'searching' }).eq('id', a.id).eq('status', 'open')
  await deskEvent(a.id, 'shortlisted', actor, { candidateId: data.id, detail: { source: row.source, other_employer: row.other_employer ?? false } })
  await audit('jobs.desk.shortlist_add', { type: 'recruitment_candidate', id: data.id, label: data.reference }, { assignment: a.reference, source: row.source })
  refresh(a.id)
  return ok({ message: row.other_employer ? `Added ${data.reference}. This person applied to another employer’s job: their contact details stay hidden until they agree to be introduced to this employer.` : `Added ${data.reference} to the shortlist.` })
}

// ---------------------------------------------------------------------------
// Asking, refusals, 18+ and consent
// ---------------------------------------------------------------------------

/** The person has been asked (by phone) whether they want to be introduced. */
export async function markAskedAction(candidateId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  if (c.status !== 'shortlisted') return fail('Only people on the shortlist can be marked as asked.')
  const { error } = await getAdminSupabase().from('recruitment_candidates').update({ status: 'asked', asked_at: new Date().toISOString(), ...touched() }).eq('id', c.id).eq('status', 'shortlisted')
  if (error) return fail('Could not save.')
  await deskEvent(c.assignment_id, 'asked', await adminActor(), { candidateId: c.id })
  await audit('jobs.desk.asked', { type: 'recruitment_candidate', id: c.id, label: c.reference })
  refresh(c.assignment_id)
  return ok({ message: 'Marked as asked.' })
}

/** The person said no to this employer. Cannot be undone; they are never introduced from this row. */
export async function recordDeclinedAction(candidateId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  if (c.consent_at) return fail('This person already agreed. If they changed their mind, record that consent was withdrawn.')
  if (c.declined_at) return fail('Already recorded.')
  const { error } = await getAdminSupabase().from('recruitment_candidates').update({ status: 'declined', declined_at: new Date().toISOString(), ...touched() }).eq('id', c.id).is('consent_at', null).is('declined_at', null)
  if (error) return fail('Could not save.')
  await deskEvent(c.assignment_id, 'declined', await adminActor(), { candidateId: c.id })
  await audit('jobs.desk.declined', { type: 'recruitment_candidate', id: c.id, label: c.reference })
  refresh(c.assignment_id)
  return ok({ message: 'Recorded: this person said no. They will not be introduced.' })
}

/** Staff confirmed on the call that the person is 18 or older (needed before any introduction). */
export async function confirmAdultAction(candidateId: string, method: string): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  const m = z.enum(CONSENT_METHOD_VALUES).safeParse(method)
  if (!m.success) return fail('Choose how you confirmed it.')
  if (c.adult_confirmed_at) return fail('Already confirmed.')
  const actor = await adminActor()
  const { error } = await getAdminSupabase().from('recruitment_candidates').update({ adult_confirmed_at: new Date().toISOString(), adult_confirmed_by: actor.slice(0, 120), adult_confirmed_method: m.data, ...touched() }).eq('id', c.id).is('adult_confirmed_at', null)
  if (error) return fail('Could not save.')
  await deskEvent(c.assignment_id, 'adult_confirmed', actor, { candidateId: c.id, detail: { method: m.data } })
  await audit('jobs.desk.adult_confirmed', { type: 'recruitment_candidate', id: c.id, label: c.reference }, { method: m.data })
  refresh(c.assignment_id)
  return ok({ message: 'Recorded: 18 or older.' })
}

const consentSchema = z.object({
  method: z.enum(CONSENT_METHOD_VALUES, { error: 'Choose how the person agreed' }),
  note: z.preprocess(blank, z.string().trim().max(500, 'Keep the note under 500 characters').optional()),
  share_phone: z.preprocess((v) => v === 'on', z.boolean()),
  share_whatsapp: z.preprocess((v) => v === 'on', z.boolean()),
  share_telegram: z.preprocess((v) => v === 'on', z.boolean()),
  share_sms: z.preprocess((v) => v === 'on', z.boolean()),
  share_email: z.preprocess((v) => v === 'on', z.boolean()),
})

/**
 * The person agreed to be introduced to this employer, for this request only. Recorded by staff after the call:
 * how, the optional note, which contact details may be shared; who recorded it comes from the admin session.
 */
export async function recordConsentAction(candidateId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  if (c.declined_at) return fail('This person said no. If they now agree, add them to the shortlist again.')
  if (c.consent_withdrawn_at) return fail('This person withdrew consent. If they agree again, add them to the shortlist again.')
  if (c.consent_at) return fail('Consent is already recorded.')
  const parsed = consentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the consent.')
  const d = parsed.data
  if (!(d.share_phone || d.share_whatsapp || d.share_telegram || d.share_sms || d.share_email)) return fail('Tick at least one way the employer may contact this person.')
  const db = getAdminSupabase()
  // Another employer's applicant: their contact details are copied only now, after they agreed to this employer.
  let contact: { name?: string | null; phone?: string | null; email?: string | null; area_text?: string | null } = {}
  if (c.other_employer && c.application_id) {
    const { data: app } = await db.from('job_applications').select('name, phone, email, area_text, personal_data_deleted_at').eq('id', c.application_id).maybeSingle()
    if (!app || app.personal_data_deleted_at) return fail('This application’s personal details were deleted after 12 months.')
    contact = { name: app.name, phone: app.phone, email: app.email, area_text: app.area_text }
  }
  const phone = contact.phone ?? c.phone
  const email = contact.email ?? c.email
  if ((d.share_phone || d.share_whatsapp || d.share_telegram || d.share_sms) && !phone) return fail('There is no phone number for this person: untick the phone options.')
  if (d.share_email && !email) return fail('There is no email address for this person: untick Email.')
  const actor = await adminActor()
  const { error } = await db
    .from('recruitment_candidates')
    .update({ ...contact, status: 'agreed', consent_at: new Date().toISOString(), consent_method: d.method, consent_recorded_by: actor.slice(0, 120), consent_note: d.note ?? null, share_phone: d.share_phone, share_whatsapp: d.share_whatsapp, share_telegram: d.share_telegram, share_sms: d.share_sms, share_email: d.share_email, ...touched() })
    .eq('id', c.id)
    .is('consent_at', null)
  if (error) return fail('Could not record the consent.')
  await deskEvent(c.assignment_id, 'consent_recorded', actor, { candidateId: c.id, detail: { method: d.method } })
  await audit('jobs.desk.consent', { type: 'recruitment_candidate', id: c.id, label: c.reference }, { method: d.method })
  refresh(c.assignment_id)
  return ok({ message: 'Consent recorded.' })
}

/** The person changed their mind. Cannot be undone: their contact details leave the employer's page at once. */
export async function withdrawConsentAction(candidateId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  if (!c.consent_at) return fail('There is no consent to withdraw.')
  if (c.consent_withdrawn_at) return fail('Already withdrawn.')
  const actor = await adminActor()
  const { error } = await getAdminSupabase()
    .from('recruitment_candidates')
    .update({ status: 'withdrawn', consent_withdrawn_at: new Date().toISOString(), consent_withdrawn_by: actor.slice(0, 120), ...touched() })
    .eq('id', c.id)
    .is('consent_withdrawn_at', null)
  if (error) return fail('Could not save.')
  await deskEvent(c.assignment_id, 'consent_withdrawn', actor, { candidateId: c.id })
  await audit('jobs.desk.consent_withdrawn', { type: 'recruitment_candidate', id: c.id, label: c.reference })
  refresh(c.assignment_id)
  revalidatePath('/account/service-requests', 'layout')
  revalidatePath('/requests', 'layout')
  return ok({ message: c.introduced_at ? 'Consent withdrawn. Their details are no longer shown to the employer. Tell the employer by phone that this person is no longer available.' : 'Consent withdrawn. This person will not be introduced.' })
}

// ---------------------------------------------------------------------------
// Introductions
// ---------------------------------------------------------------------------

/**
 * Introduces the chosen people (each needs live consent and 18+; the database refuses otherwise). With the recruitment
 * desk switch on, the employer sees them on their request page and gets one email without any contact details. With
 * it off, the introduction is only recorded on the desk: nothing is shown or emailed to the employer.
 */
export async function introduceAction(assignmentId: string, candidateIds: string[]): Promise<Msg> {
  await assertAdmin(AREA)
  const a = await loadAssignment(assignmentId)
  if (!a) return fail('Not found.')
  if (CLOSED_ASSIGNMENT.includes(a.status as (typeof CLOSED_ASSIGNMENT)[number])) return fail('This assignment is closed.')
  const ids = z.array(uuid).min(1, 'Choose who to introduce.').max(50).safeParse(Array.from(new Set(candidateIds)))
  if (!ids.success) return fail(ids.error.issues[0]?.message ?? 'Choose who to introduce.')
  const db = getAdminSupabase()
  const { data: rows } = await db.from('recruitment_candidates').select('*').eq('assignment_id', a.id).in('id', ids.data)
  if ((rows ?? []).length !== ids.data.length) return fail('Choose people from this shortlist.')
  for (const c of rows ?? []) {
    const blocker = introductionBlocker(c)
    if (blocker) return fail(`${c.reference}: ${blocker}`)
  }
  const actor = await adminActor()
  const now = new Date().toISOString()
  let introduced = 0
  for (const c of rows ?? []) {
    const { data, error } = await db
      .from('recruitment_candidates')
      .update({ status: 'introduced', introduced_at: now, introduced_by: actor.slice(0, 120), ...touched() })
      .eq('id', c.id)
      .is('introduced_at', null)
      .is('consent_withdrawn_at', null)
      .select('id')
      .maybeSingle()
    if (error || !data) return fail(`${c.reference} could not be introduced${introduced ? ` (${introduced} already were)` : ''}.`)
    introduced++
    await deskEvent(a.id, 'introduced', actor, { candidateId: c.id })
  }
  if (['open', 'searching'].includes(a.status)) await db.from('recruitment_assignments').update({ status: 'introducing' }).eq('id', a.id).in('status', ['open', 'searching'])
  const on = (await readJobsSwitches()).recruitmentDesk
  let emailed = false
  if (on) {
    const to = await employerContact(a.service_request_id)
    if (to) emailed = await sendEmail({ to: to.to, ...recruitmentIntroductionEmail({ reference: to.reference, count: introduced, link: to.link }) })
  }
  await audit('jobs.desk.introduce', { type: 'recruitment_assignment', id: a.id, label: a.reference }, { count: introduced, shown_to_employer: on, emailed })
  refresh(a.id)
  revalidatePath('/account/service-requests', 'layout')
  return ok({
    message: on
      ? `${introduced} introduced. ${emailed ? 'The employer was emailed (no contact details in the email).' : 'The email could not be sent: tell the employer by phone.'}`
      : `${introduced} introduced on the desk only. The recruitment desk switch is off, so nothing is shown or emailed to the employer.`,
  })
}

/** After an introduction: interviewed, or not hired. */
export async function setCandidateOutcomeAction(candidateId: string, outcome: string): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  const o = z.enum(['interviewed', 'not_hired']).safeParse(outcome)
  if (!o.success) return fail('Choose the outcome.')
  if (!c.introduced_at || !['introduced', 'interviewed'].includes(c.status)) return fail('Only introduced people can have an outcome.')
  const { error } = await getAdminSupabase().from('recruitment_candidates').update({ status: o.data, outcome_at: new Date().toISOString(), ...touched() }).eq('id', c.id)
  if (error) return fail('Could not save.')
  await deskEvent(c.assignment_id, o.data, await adminActor(), { candidateId: c.id })
  await audit(`jobs.desk.${o.data}`, { type: 'recruitment_candidate', id: c.id, label: c.reference })
  refresh(c.assignment_id)
  return ok({ message: 'Saved.' })
}

/** Private notes on a shortlist row (never shown to employers; deleted after 12 months). */
export async function saveCandidateNotesAction(candidateId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  const notes = z.string().trim().max(1000, 'Keep notes under 1,000 characters').safeParse(formData.get('notes') ?? '')
  if (!notes.success) return fail(notes.error.issues[0]?.message ?? 'Check the notes.')
  const { error } = await getAdminSupabase().from('recruitment_candidates').update({ notes: notes.data || null, ...touched() }).eq('id', c.id)
  if (error) return fail('Could not save.')
  await audit('jobs.desk.notes', { type: 'recruitment_candidate', id: c.id, label: c.reference }, { notes_changed: true })
  refresh(c.assignment_id)
  return ok({ message: 'Saved.' })
}

// ---------------------------------------------------------------------------
// Placements (no money)
// ---------------------------------------------------------------------------

const placementSchema = z.object({
  role_type: z.enum(['trade', 'professional'], { error: 'Choose trade or professional' }),
  trade: z.preprocess(blank, z.enum(TRADE_VALUES).optional()),
  role_text: z.preprocess(blank, z.string().trim().max(120).optional()),
  start_date: z.iso.date({ error: 'Enter the start date' }),
  guarantee_days: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(v)), z.number().int('Enter whole days').min(0).max(365).optional()),
})

async function placementEmail(requestId: string, name: string, role: string, startDate: string): Promise<boolean> {
  if (!(await readJobsSwitches()).recruitmentDesk) return false
  const to = await employerContact(requestId)
  return to ? sendEmail({ to: to.to, ...placementConfirmedEmail({ name, role, date: formatDate(startDate) }) }) : false
}

/** An introduced person was hired: start date and replacement guarantee (30 days trades, 90 professionals by default). */
export async function recordPlacementAction(candidateId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const c = await loadCandidate(candidateId)
  if (!c || c.personal_data_deleted_at) return fail('Not found.')
  if (!c.introduced_at) return fail('Only a person who was introduced can be placed.')
  const parsed = placementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the placement.')
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: a } = await db.from('recruitment_assignments').select('id, reference, service_request_id').eq('id', c.assignment_id).single()
  if (!a) return fail('Not found.')
  const actor = await adminActor()
  const days = d.guarantee_days ?? DEFAULT_GUARANTEE_DAYS[d.role_type as RoleType]
  const { data, error } = await db
    .from('recruitment_placements')
    .insert({ candidate_id: c.id, assignment_id: c.assignment_id, role_type: d.role_type, trade: d.trade ?? c.trade ?? null, role_text: d.role_text ?? c.role_text ?? null, start_date: d.start_date, guarantee_days: days, created_by: actor.slice(0, 120) })
    .select('id, reference, guarantee_ends_on')
    .single()
  if (error?.code === '23505') return fail('This person already has a placement.')
  if (error || !data) return fail('Could not record the placement.')
  await db.from('recruitment_candidates').update({ status: 'hired', outcome_at: new Date().toISOString(), ...touched() }).eq('id', c.id)
  await deskEvent(c.assignment_id, 'placed', actor, { candidateId: c.id, placementId: data.id, detail: { start_date: d.start_date, guarantee_days: days } })
  const role = d.role_text ?? c.role_text ?? tradeLabel(d.trade ?? c.trade) ?? ''
  const emailed = await placementEmail(a.service_request_id, c.name ?? '', role, d.start_date)
  await audit('jobs.desk.placement', { type: 'recruitment_placement', id: data.id, label: data.reference }, { assignment: a.reference, start_date: d.start_date, guarantee_days: days, emailed })
  refresh(c.assignment_id)
  return ok({ message: `Placement ${data.reference} recorded. Guarantee ends ${formatDate(data.guarantee_ends_on)}.${emailed ? ' The employer was emailed.' : ''}` })
}

const endSchema = z.object({
  ended_on: z.iso.date({ error: 'Enter the last day' }),
  end_reason: z.enum(['left_by_worker', 'dismissed', 'role_ended', 'other'], { error: 'Choose why' }),
  end_note: z.preprocess(blank, z.string().trim().max(500).optional()),
})

/** The person stopped working. Inside the guarantee: a free replacement is owed. After it: the placement is closed. */
export async function endPlacementAction(placementId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!uuid.safeParse(placementId).success) return fail('Not found.')
  const parsed = endSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: p } = await db.from('recruitment_placements').select('id, reference, assignment_id, status, start_date, guarantee_ends_on').eq('id', placementId).maybeSingle()
  if (!p || !['hired', 'guarantee_running', 'completed'].includes(p.status)) return fail('This placement is not running.')
  if (d.ended_on < p.start_date) return fail('The last day cannot be before the start date.')
  if (d.ended_on > todayAddis()) return fail('The last day cannot be in the future.')
  const inside = leftInsideGuarantee({ guarantee_ends_on: p.guarantee_ends_on ?? p.start_date }, d.ended_on)
  const { error } = await db.from('recruitment_placements').update({ status: inside ? 'replaced' : 'left_after_guarantee', ended_on: d.ended_on, end_reason: d.end_reason, end_note: d.end_note ?? null }).eq('id', p.id)
  if (error) return fail('Could not save.')
  await deskEvent(p.assignment_id, inside ? 'left_inside_guarantee' : 'left_after_guarantee', await adminActor(), { placementId: p.id, detail: { ended_on: d.ended_on } })
  await audit('jobs.desk.placement_end', { type: 'recruitment_placement', id: p.id, label: p.reference }, { inside_guarantee: inside, ended_on: d.ended_on })
  refresh(p.assignment_id)
  return ok({ message: inside ? 'Recorded. They left inside the guarantee: add a free replacement when you have found someone.' : 'Recorded. They left after the guarantee.' })
}

const replaceSchema = z.object({
  candidate_id: z.uuid({ error: 'Choose the replacement' }),
  start_date: z.iso.date({ error: 'Enter the start date' }),
  guarantee_days: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(v)), z.number().int('Enter whole days').min(0).max(365).optional()),
})

/** A free replacement for a person who left inside the guarantee. It gets its own guarantee (same length by default). */
export async function addFreeReplacementAction(placementId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!uuid.safeParse(placementId).success) return fail('Not found.')
  const parsed = replaceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: old } = await db.from('recruitment_placements').select('*').eq('id', placementId).maybeSingle()
  if (!old || old.status !== 'replaced') return fail('Only a placement that ended inside its guarantee can be replaced for free.')
  const { data: taken } = await db.from('recruitment_placements').select('id').eq('replaces_placement_id', old.id).maybeSingle()
  if (taken) return fail('This placement already has a replacement.')
  const c = await loadCandidate(d.candidate_id)
  if (!c || c.assignment_id !== old.assignment_id) return fail('Choose someone from this assignment’s shortlist.')
  if (!c.introduced_at) return fail('Only a person who was introduced can be placed.')
  const actor = await adminActor()
  const { data, error } = await db
    .from('recruitment_placements')
    .insert({ candidate_id: c.id, assignment_id: old.assignment_id, role_type: old.role_type, trade: old.trade, role_text: old.role_text, start_date: d.start_date, guarantee_days: d.guarantee_days ?? old.guarantee_days, replaces_placement_id: old.id, created_by: actor.slice(0, 120) })
    .select('id, reference, is_free_replacement, guarantee_ends_on')
    .single()
  if (error?.code === '23505') return fail('This person already has a placement.')
  if (error || !data) return fail('Could not record the replacement.')
  await db.from('recruitment_candidates').update({ status: 'hired', outcome_at: new Date().toISOString(), ...touched() }).eq('id', c.id)
  await deskEvent(old.assignment_id, 'free_replacement', actor, { candidateId: c.id, placementId: data.id, detail: { replaces: old.reference } })
  const { data: a } = await db.from('recruitment_assignments').select('service_request_id').eq('id', old.assignment_id).single()
  const emailed = a ? await placementEmail(a.service_request_id, c.name ?? '', old.role_text ?? tradeLabel(old.trade) ?? '', d.start_date) : false
  await audit('jobs.desk.free_replacement', { type: 'recruitment_placement', id: data.id, label: data.reference }, { replaces: old.reference, free: data.is_free_replacement, emailed })
  refresh(old.assignment_id)
  return ok({ message: `Free replacement ${data.reference} recorded. Its guarantee ends ${formatDate(data.guarantee_ends_on)}.` })
}

/** The person did not start (or the placement was recorded by mistake). */
export async function cancelPlacementAction(placementId: string, reason: string, note?: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!uuid.safeParse(placementId).success) return fail('Not found.')
  const r = z.object({ reason: z.enum(['did_not_start', 'other']), note: z.string().trim().max(500).optional() }).safeParse({ reason, note: note || undefined })
  if (!r.success) return fail('Choose why.')
  if (r.data.reason === 'other' && !r.data.note) return fail('Say why it is cancelled.')
  const db = getAdminSupabase()
  const { data: p } = await db.from('recruitment_placements').select('id, reference, assignment_id, status').eq('id', placementId).maybeSingle()
  if (!p || !['hired', 'guarantee_running'].includes(p.status)) return fail('Only a running placement can be cancelled.')
  const { data: replacement } = await db.from('recruitment_placements').select('id').eq('replaces_placement_id', p.id).maybeSingle()
  if (replacement) return fail('This placement has a replacement.')
  const { error } = await db.from('recruitment_placements').update({ status: 'cancelled', end_reason: r.data.reason, end_note: r.data.note ?? null }).eq('id', p.id)
  if (error) return fail('Could not cancel.')
  await deskEvent(p.assignment_id, 'placement_cancelled', await adminActor(), { placementId: p.id, detail: { reason: r.data.reason } })
  await audit('jobs.desk.placement_cancel', { type: 'recruitment_placement', id: p.id, label: p.reference }, { reason: r.data.reason })
  refresh(p.assignment_id)
  return ok({ message: 'Placement cancelled.' })
}

// ---------------------------------------------------------------------------
// Fees: OWNER ONLY (Jobs decision 10). Operations never reaches these.
// ---------------------------------------------------------------------------

/** Call only after assertAdmin(AREA) and assertOwner(). */
async function ownerPlacement(placementId: string) {
  if (!uuid.safeParse(placementId).success) return null
  const { data } = await getAdminSupabase().from('recruitment_placements').select('id, reference, assignment_id, is_free_replacement').eq('id', placementId).maybeSingle()
  return data
}

/** Owner only: a one-time link to upload the signed fee agreement (photo or PDF, 10 MB, private bucket). */
export async function feeAgreementUploadAction(placementId: string, contentType: string, size: number): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  await assertAdmin(AREA)
  await assertOwner()
  const p = await ownerPlacement(placementId)
  if (!p) return fail('Not found.')
  const upload = await createAgreementUpload(p.id, contentType, size)
  if (!upload.ok) return fail(upload.error)
  await audit('jobs.desk.fee_upload_link', { type: 'recruitment_placement', id: p.id, label: p.reference })
  return ok({ path: upload.path, signedUrl: upload.signedUrl })
}

const feeSchema = z
  .object({
    fee_type: z.enum(['fixed', 'percentage'], { error: 'Choose a fixed amount or a percentage' }),
    currency: z.enum(CURRENCIES),
    amount: z.preprocess(blank, z.string().max(30).optional()),
    percent: z.preprocess(blank, z.string().max(10).optional()),
    basis: z.preprocess(blank, z.enum(['first_year_salary', 'first_month_pay', 'other']).optional()),
    basis_note: z.preprocess(blank, z.string().trim().max(300).optional()),
    basis_amount: z.preprocess(blank, z.string().max(30).optional()),
    agreed_in_writing_on: z.preprocess(blank, z.iso.date().optional()),
    document_path: z.preprocess(blank, z.string().max(300).optional()),
    notes: z.preprocess(blank, z.string().trim().max(1000).optional()),
  })
  .refine((d) => d.basis !== 'other' || Boolean(d.basis_note), { message: 'Say what the percentage is based on.', path: ['basis_note'] })
export type FeeInput = z.input<typeof feeSchema>

/** Owner only: the fee terms for one placement (fixed amount OR percentage). Editable while still a draft. */
export async function saveFeeTermsAction(placementId: string, input: FeeInput): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const p = await ownerPlacement(placementId)
  if (!p) return fail('Not found.')
  if (p.is_free_replacement) return fail('A free replacement has no fee.')
  const parsed = feeSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fee.')
  const d = parsed.data
  let amount: number | null = null
  let bps: number | null = null
  let basisAmount: number | null = null
  if (d.fee_type === 'fixed') {
    amount = d.amount ? parsePriceEtb(d.amount) : null
    if (amount === null) return fail('Enter the fixed fee, like 3000 or 3,000.50.')
  } else {
    bps = d.percent ? percentToBps(d.percent) : null
    if (bps === null || bps === 0) return fail('Enter the percentage, like 10 or 12.5.')
    if (!d.basis) return fail('Choose what the percentage is based on.')
    if (d.basis_amount) {
      basisAmount = parsePriceEtb(d.basis_amount)
      if (basisAmount === null) return fail('Enter the pay the percentage is based on, like 30000.')
    }
  }
  if (d.document_path) {
    const file = await confirmAgreementUpload(p.id, d.document_path)
    if (!file.ok) return fail(file.error)
  }
  const db = getAdminSupabase()
  const { data: existing } = await db.from('recruitment_fee_terms').select('id, status, document_path').eq('placement_id', p.id).maybeSingle()
  if (existing && existing.status !== 'draft') return fail('These terms are agreed: they can no longer be edited. Record entries below instead.')
  const values = {
    fee_type: d.fee_type,
    currency: d.currency,
    amount_minor: amount,
    percent_bps: bps,
    basis: d.fee_type === 'percentage' ? (d.basis ?? null) : null,
    basis_note: d.fee_type === 'percentage' ? (d.basis_note ?? null) : null,
    basis_amount_minor: d.fee_type === 'percentage' ? basisAmount : null,
    agreed_in_writing_on: d.agreed_in_writing_on ?? null,
    document_path: d.document_path ?? existing?.document_path ?? null,
    notes: d.notes ?? null,
  }
  const actor = await adminActor()
  const { error } = existing
    ? await db.from('recruitment_fee_terms').update(values).eq('id', existing.id)
    : await db.from('recruitment_fee_terms').insert({ placement_id: p.id, created_by: actor.slice(0, 120), ...values })
  if (error) return fail('Could not save the fee terms.')
  await deskEvent(p.assignment_id, 'fee_terms_saved', actor, { placementId: p.id })
  await audit('jobs.desk.fee_terms', { type: 'recruitment_placement', id: p.id, label: p.reference }, { fee_type: d.fee_type, amount_minor: amount, percent_bps: bps, currency: d.currency })
  refresh(p.assignment_id)
  return ok({ message: 'Fee terms saved as a draft.' })
}

const FEE_NEXT: Record<string, string[]> = { draft: ['agreed', 'waived'], agreed: ['invoiced', 'waived'], invoiced: ['paid', 'waived'] }

/** Owner only: draft → agreed (needs the date agreed in writing) → invoiced → paid, or waived with a reason. */
export async function setFeeStatusAction(placementId: string, status: string, reason?: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const p = await ownerPlacement(placementId)
  if (!p) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: t } = await db.from('recruitment_fee_terms').select('id, status, agreed_in_writing_on').eq('placement_id', p.id).maybeSingle()
  if (!t) return fail('Save the fee terms first.')
  if (!(FEE_NEXT[t.status] ?? []).includes(status)) return fail('That change is not possible from here.')
  if (status === 'agreed' && !t.agreed_in_writing_on) return fail('Enter the date the fee was agreed in writing first.')
  const why = (reason ?? '').trim()
  if (status === 'waived' && why.length < 3) return fail('Say why the fee is waived.')
  const { error } = await db.from('recruitment_fee_terms').update({ status, waived_reason: status === 'waived' ? why.slice(0, 500) : null }).eq('id', t.id).eq('status', t.status)
  if (error) return fail('Could not save.')
  await deskEvent(p.assignment_id, 'fee_status', await adminActor(), { placementId: p.id, detail: { to: status } })
  await audit('jobs.desk.fee_status', { type: 'recruitment_placement', id: p.id, label: p.reference }, { from: t.status, to: status })
  refresh(p.assignment_id)
  return ok({ message: 'Saved.' })
}

const entrySchema = z
  .object({
    type: z.enum(['fee_due', 'fee_received', 'waived']),
    amount: z.string().max(30),
    date: z.iso.date({ error: 'Enter the date' }),
    method: z.preprocess(blank, z.enum(['bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'other']).optional()),
    reference: z.preprocess(blank, z.string().trim().max(120).optional()),
    reason: z.preprocess(blank, z.string().trim().max(500).optional()),
    note: z.preprocess(blank, z.string().trim().max(1000).optional()),
  })
  .refine((d) => d.type !== 'fee_received' || Boolean(d.method), { message: 'Choose how the fee was paid.', path: ['method'] })
  .refine((d) => d.type !== 'waived' || (d.reason?.length ?? 0) >= 3, { message: 'Say why it is waived.', path: ['reason'] })
export type FeeEntryInput = z.input<typeof entrySchema>

/** Owner only: fee due (created by the owner, never automatically), fee received, or waived. Cannot be edited later. */
export async function addFeeEntryAction(placementId: string, input: FeeEntryInput): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const p = await ownerPlacement(placementId)
  if (!p) return fail('Not found.')
  const parsed = entrySchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the entry.')
  const d = parsed.data
  const amount = parsePriceEtb(d.amount)
  if (amount === null) return fail('Enter the amount, like 2500 or 2,500.50.')
  if (d.date > todayAddis()) return fail('The date cannot be in the future.')
  const db = getAdminSupabase()
  const { data: t } = await db.from('recruitment_fee_terms').select('id, currency').eq('placement_id', p.id).maybeSingle()
  if (!t) return fail('Save the fee terms first.')
  const { data, error } = await db
    .from('recruitment_fee_entries')
    .insert({ fee_terms_id: t.id, entry_type: d.type, amount_minor: amount, currency: t.currency, occurred_on: d.date, method: d.type === 'fee_received' ? (d.method ?? null) : null, reference: d.reference ?? null, reason: d.reason ?? null, note: d.note ?? null, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return fail('Could not record the entry.')
  await deskEvent(p.assignment_id, 'fee_entry', await adminActor(), { placementId: p.id, detail: { type: d.type } })
  await audit('jobs.desk.fee_entry', { type: 'recruitment_placement', id: p.id, label: p.reference }, { entry: data.id, entry_type: d.type, amount_minor: amount })
  refresh(p.assignment_id)
  return ok({ message: 'Recorded.' })
}

/** Owner only: corrects a mistaken entry with one reversal (entries are never changed or deleted). */
export async function reverseFeeEntryAction(entryId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!uuid.safeParse(entryId).success) return fail('Not found.')
  const why = (reason ?? '').trim()
  if (why.length < 3) return fail('Say why the entry is reversed.')
  const db = getAdminSupabase()
  const { data: e } = await db.from('recruitment_fee_entries').select('id, fee_terms_id, entry_type, amount_minor, currency, reverses_entry_id').eq('id', entryId).maybeSingle()
  if (!e) return fail('Not found.')
  const { data: all } = await db.from('recruitment_fee_entries').select('id, entry_type, amount_minor, reverses_entry_id').eq('fee_terms_id', e.fee_terms_id)
  if (!canReverse(e, all ?? [])) return fail('This entry cannot be reversed (already reversed, or it is a reversal).')
  const { data: t } = await db.from('recruitment_fee_terms').select('placement:recruitment_placements(id, reference, assignment_id)').eq('id', e.fee_terms_id).single()
  const placement = t?.placement as { id: string; reference: string; assignment_id: string } | null
  const { error } = await db
    .from('recruitment_fee_entries')
    .insert({ fee_terms_id: e.fee_terms_id, entry_type: 'reversal', amount_minor: e.amount_minor, currency: e.currency, occurred_on: todayAddis(), reverses_entry_id: e.id, reason: why.slice(0, 500), created_by: (await adminActor()).slice(0, 120) })
  if (error?.code === '23505') return fail('This entry is already reversed.')
  if (error) return fail('Could not reverse the entry.')
  if (placement) await deskEvent(placement.assignment_id, 'fee_reversal', await adminActor(), { placementId: placement.id })
  await audit('jobs.desk.fee_reversal', { type: 'recruitment_placement', id: placement?.id ?? null, label: placement?.reference ?? null }, { reverses: e.id })
  if (placement) refresh(placement.assignment_id)
  return ok({ message: 'Reversed.' })
}

// ---------------------------------------------------------------------------
// Private-client jobs (Jobs Phase 4; switch "Private-client jobs" starts off)
// ---------------------------------------------------------------------------

/**
 * Owner and Operations: posts a job for a private-client assignment. The job belongs to HagerLand Services, never
 * names the client, and waits for the normal review; whoever created it cannot approve it (F1).
 */
export async function createPrivateClientJobAction(assignmentId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!(await readJobsSwitches()).privateClientPosts) return fail('Private-client jobs are switched off.')
  const a = await loadAssignment(assignmentId)
  if (!a) return fail('Not found.')
  if (CLOSED_ASSIGNMENT.includes(a.status as (typeof CLOSED_ASSIGNMENT)[number])) return fail('This assignment is closed.')
  const db = getAdminSupabase()
  const { data: full } = await db.from('recruitment_assignments').select('private_client').eq('id', a.id).single()
  if (!full?.private_client) return fail('Only private-client assignments get a job posted by HagerLand.')
  const parsed = jobSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the job.')
  const d = parsed.data
  const [{ data: team }, { data: loc }] = await Promise.all([
    db.from('organisations').select('id').eq('slug', 'hagerland-services').eq('is_hagerland', true).maybeSingle(),
    db.from('locations').select('level, country_code').eq('id', d.location_id).maybeSingle(),
  ])
  if (!team) return fail('The HagerLand Services organisation is missing (migration 0029).')
  if (!loc) return fail('Choose where the job is.')
  if (loc.country_code !== 'ET') return fail('Only work in Ethiopia. Placements abroad are not offered.')
  if (loc.level === 'area') return fail('Choose the city or sub-city only, so the client cannot be identified.')
  const actor = await adminActor()
  const { data, error } = await db
    .from('job_posts')
    .insert({ ...jobColumns(d), slug: `${slugify(d.title, 60)}-${shortId(4)}`, employer_org_id: team.id, status: 'pending_review', posted_for: 'private_client', recruitment_assignment_id: a.id, created_by_staff: actor.slice(0, 120) })
    .select('id, title')
    .single()
  if (error || !data) {
    log.error('jobs-desk', 'private-client job insert failed', error)
    return fail('Could not create the job.')
  }
  await deskEvent(a.id, 'job_posted', actor, { detail: { job: data.id } })
  await audit('jobs.desk.private_client_job', { type: 'job', id: data.id, label: data.title }, { assignment: a.reference })
  refresh(a.id)
  revalidatePath('/roodber8/review')
  return ok({ message: 'Job created and waiting for review. Another person must approve it.' })
}
