import 'server-only'
// Jobs Phase 3: the recruitment desk's database side. Opening an assignment from a staffing request, the timeline,
// what the employer sees on their request page (introduced people only, contact details only while consent stands)
// and the link employer emails carry. Server only: the desk tables have no grants (migration 0041).
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Json } from '@/lib/database.types'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { readEmployerAbroad } from '@/lib/service-requests/employer-abroad'
import { newRequestToken } from '@/lib/service-requests/token'
import { tradeLabel } from '@/lib/jobs'
import { employerContactButtons, employerSeesContact, firstNameOf, type Shares } from '@/lib/jobs-desk'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'

/** The service a request was sent for (its category slug), or null. */
export async function requestServiceSlug(requestId: string): Promise<string | null> {
  const { data } = await getAdminSupabase().from('service_requests').select('category:service_categories(slug)').eq('id', requestId).maybeSingle()
  return (data?.category as { slug: string } | null)?.slug ?? null
}

/** Staffing requests are HagerLand's own recruitment service: never sent to providers, never quoted. */
export async function isStaffingRequest(requestId: string): Promise<boolean> {
  return (await requestServiceSlug(requestId)) === STAFFING_SLUG
}

/** One line on the desk timeline: references and the step only, never names or phone numbers. Never throws. */
export async function deskEvent(assignmentId: string, step: string, actor: string, refs: { candidateId?: string | null; placementId?: string | null; detail?: Record<string, unknown> } = {}): Promise<void> {
  const { error } = await getAdminSupabase()
    .from('recruitment_events')
    .insert({ assignment_id: assignmentId, step, actor: actor.slice(0, 120), candidate_id: refs.candidateId ?? null, placement_id: refs.placementId ?? null, detail: (refs.detail ?? {}) as NonNullable<Json> })
  if (error) log.error('jobs-desk', 'timeline write failed', error, { step })
}

const PAY_LINE = /\n\nPay offered: (.+)$/

/**
 * Opens the desk assignment for a staffing request (one per request: calling again returns the same one). The roles,
 * headcount, start date, pay and the "based outside Ethiopia" answer are copied from the request. The employer
 * business is filled in when the person who sent it belongs to exactly one business; otherwise it starts as a private
 * client and the desk can change it.
 */
export async function openAssignmentForRequest(requestId: string, actor: string): Promise<{ ok: true; id: string; reference: string; created: boolean } | { ok: false; error: string }> {
  const db = getAdminSupabase()
  const { data: existing } = await db.from('recruitment_assignments').select('id, reference').eq('service_request_id', requestId).maybeSingle()
  if (existing) return { ok: true, ...existing, created: false }
  const { data: r } = await db.from('service_requests').select('id, reference, country_code, answers, details, requester_user_id, category:service_categories(slug)').eq('id', requestId).maybeSingle()
  if (!r) return { ok: false, error: 'Not found.' }
  if ((r.category as { slug: string } | null)?.slug !== STAFFING_SLUG) return { ok: false, error: 'Only staffing requests go to the recruitment desk.' }
  if (r.country_code !== 'ET') return { ok: false, error: 'The recruitment desk only handles work in Ethiopia. Placements abroad are not offered.' }
  let orgId: string | null = null
  if (r.requester_user_id) {
    const { data: orgs } = await db.from('organisation_members').select('org_id').eq('user_id', r.requester_user_id).limit(2)
    if ((orgs ?? []).length === 1) orgId = orgs![0].org_id
  }
  const a = (r.answers ?? {}) as Record<string, unknown>
  const abroad = readEmployerAbroad(r.answers)
  const headcount = typeof a.headcount === 'number' && Number.isInteger(a.headcount) && a.headcount >= 1 && a.headcount <= 10000 ? a.headcount : null
  const { data, error } = await db
    .from('recruitment_assignments')
    .insert({
      service_request_id: r.id,
      employer_org_id: orgId,
      private_client: orgId === null,
      employer_based_abroad: abroad?.abroad ?? null,
      employer_country: abroad?.abroad && abroad.country && /^[A-Z]{2}$/.test(abroad.country) ? abroad.country : null,
      roles: typeof a.roles === 'string' ? a.roles.slice(0, 2000) : null,
      headcount,
      pay_text: PAY_LINE.exec(r.details ?? '')?.[1]?.slice(0, 200) ?? null,
      start_date: typeof a.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.start) ? a.start : null,
      created_by: actor.slice(0, 120),
    })
    .select('id, reference')
    .single()
  if (error?.code === '23505') {
    const { data: again } = await db.from('recruitment_assignments').select('id, reference').eq('service_request_id', requestId).maybeSingle()
    if (again) return { ok: true, ...again, created: false }
  }
  if (error || !data) {
    log.error('jobs-desk', 'assignment insert failed', error)
    return { ok: false, error: 'Could not open the assignment.' }
  }
  await deskEvent(data.id, 'assignment_opened', actor, { detail: { request: r.reference } })
  return { ok: true, ...data, created: true }
}

export interface IntroducedPerson {
  id: string
  name: string
  firstName: string
  role: string
  introducedAt: string
  /** false once consent is withdrawn: no contact details, only "{First name} is no longer available". */
  available: boolean
  buttons: { label: string; href: string }[]
}

/**
 * What the employer sees on their staffing request page. Call only after checking the viewer owns the request (signed
 * in as the requester, or holding a valid guest link). Nothing while the recruitment desk switch is off.
 */
export async function loadEmployerDesk(requestId: string): Promise<{ count: number; people: IntroducedPerson[] } | null> {
  if (!(await readJobsSwitches()).recruitmentDesk) return null
  const db = getAdminSupabase()
  const { data: a } = await db.from('recruitment_assignments').select('id').eq('service_request_id', requestId).maybeSingle()
  if (!a) return null
  const { data: rows } = await db
    .from('recruitment_candidates')
    .select('id, name, phone, email, trade, role_text, introduced_at, consent_at, consent_withdrawn_at, declined_at, adult_confirmed_at, personal_data_deleted_at, share_phone, share_whatsapp, share_telegram, share_sms, share_email')
    .eq('assignment_id', a.id)
    .not('introduced_at', 'is', null)
    .order('introduced_at')
  const introduced = rows ?? []
  const people = introduced
    .filter((c) => !c.personal_data_deleted_at && c.name)
    .map((c): IntroducedPerson => {
      const available = employerSeesContact(c)
      const shares: Shares = { share_phone: c.share_phone, share_whatsapp: c.share_whatsapp, share_telegram: c.share_telegram, share_sms: c.share_sms, share_email: c.share_email }
      return {
        id: c.id,
        name: available ? (c.name ?? '') : firstNameOf(c.name),
        firstName: firstNameOf(c.name),
        role: c.role_text || tradeLabel(c.trade) || '',
        introducedAt: c.introduced_at as string,
        available,
        buttons: available ? employerContactButtons(shares, c.phone, c.email) : [],
      }
    })
  return { count: introduced.length, people }
}

/**
 * Who to email about a request and the button link: the account page for signed-in employers; for guests a fresh
 * private link (only its hash is stored, so older links stop working, as with quote emails).
 */
export async function employerContact(requestId: string): Promise<{ to: string; reference: string; link: string } | null> {
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('id, reference, email, requester_user_id').eq('id', requestId).maybeSingle()
  if (!r?.email) return null
  if (r.requester_user_id) return { to: r.email, reference: r.reference, link: canonicalUrl(`/account/service-requests/${r.id}`) }
  const t = newRequestToken()
  const { error } = await db.from('service_requests').update({ access_token_hash: t.hash, access_token_expires_at: t.expiresAt }).eq('id', r.id)
  if (error) return null
  return { to: r.email, reference: r.reference, link: canonicalUrl(`/requests/${t.token}`) }
}
