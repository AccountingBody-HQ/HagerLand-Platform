'use server'

import { headers } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { getVertical } from '@/lib/data/verticals'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { JOBS_NOT_LIVE } from '@/lib/jobs'
import { PHONE_MESSAGES, highlightedFields, phoneApplicationSchema, workerRegisterSchema } from '@/lib/jobs-phone'
import { hagerlandInbox, orgManagerEmails } from '@/lib/enquiries'
import { brand } from '@/lib/brand'
import { sendEmail } from '@/lib/email/send'
import { newApplicationEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { getJobsI18n } from '@/lib/i18n/server'
import { translateResult } from '@/lib/i18n/translate'

export type PhoneFormState = ActionResult<{ reference: string }> | null

/** Rate limits (Q6). Keys hold hashes, never the phone number or address itself. */
const LIMITS = {
  applyPerVisitor: [5, 3600],
  applyPerPhone: [10, 86_400],
  registerPerVisitor: [5, 3600],
  registerPerPhone: [3, 86_400],
} as const

async function allowed(prefix: string, ip: string, phone: string, visitor: readonly [number, number], perPhone: readonly [number, number]): Promise<boolean> {
  const [byIp, byPhone] = await Promise.all([rateLimit(`${prefix}:ip:${hashIp(ip)}`, visitor[0], visitor[1]), rateLimit(`${prefix}:phone:${hashIp(phone)}`, perPhone[0], perPhone[1])])
  return byIp.allowed && byPhone.allowed
}

/**
 * Apply by phone (Jobs Phase 2): no account or email. Only while the owner's switch is on and Jobs is live, only to open
 * jobs, once per phone per job (database rule). The employer gets the usual email; the applicant gets nothing but the
 * reference on screen (no SMS or email).
 */
async function applyByPhoneActionImpl(_prev: PhoneFormState, formData: FormData): Promise<PhoneFormState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLA-0' })
  if (!(await readJobsSwitches()).phoneApply) return fail(PHONE_MESSAGES.unavailable)
  if ((await getVertical('jobs'))?.status !== 'live') return fail(JOBS_NOT_LIVE)
  const parsed = phoneApplicationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(PHONE_MESSAGES.check, highlightedFields(parsed.error))
  const d = parsed.data
  const ip = getClientIp(await headers())
  if (!(await allowed('job-phone', ip, d.phone, LIMITS.applyPerVisitor, LIMITS.applyPerPhone))) return fail(PHONE_MESSAGES.tooMany)
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail(PHONE_MESSAGES.security)

  const db = getAdminSupabase()
  const { data: job } = await db.from('jobs_public').select('id, title, employer_org_id, employer_name, posted_for').eq('id', d.job_id).maybeSingle()
  if (!job?.id || !job.employer_org_id) return fail(PHONE_MESSAGES.closed)
  const now = new Date().toISOString()
  const { data: row, error } = await db
    .from('job_applications')
    .insert({ job_id: job.id, applicant_user_id: null, channel: 'phone', name: d.name, phone: d.phone, email: null, trade: d.trade, area_text: d.area, preferred_contact: d.preferred_contact, language: d.language, adult_confirmed_at: now, consent_at: now })
    .select('id, reference')
    .single()
  if (error || !row) {
    if (error?.code === '23505') return fail(PHONE_MESSAGES.duplicate)
    log.error('jobs', 'phone application insert failed', error)
    return fail(PHONE_MESSAGES.unavailable)
  }
  const { count } = await db.from('job_applications').select('id', { count: 'exact', head: true }).eq('job_id', job.id)
  await db.from('job_posts').update({ applications_count: count ?? 0 }).eq('id', job.id)
  // Private-client jobs (Jobs Phase 4): the application goes to HagerLand's inbox only, never to the client.
  const privateClient = job.posted_for === 'private_client'
  const inbox = privateClient ? await hagerlandInbox('general') : null
  const managers = privateClient ? (inbox ? [inbox] : []) : await orgManagerEmails(job.employer_org_id)
  if (managers.length) await sendEmail({ to: managers, ...newApplicationEmail({ orgName: privateClient ? brand.name : (job.employer_name ?? 'there'), title: job.title ?? '', reference: row.reference, applicantName: d.name, url: canonicalUrl(privateClient ? `/roodber8/jobs/${job.id}` : `/account/jobs/${job.id}`), byPhone: true }) })
  return ok({ reference: row.reference })
}

/**
 * Join the worker register (Jobs Phase 2). Joining again with the same phone updates the entry, restarts its 12-month
 * clock and gets a new reference, so the answer is the same as for a new join (it never shows that a number is known).
 * Only HagerLand staff (Owner and Operations) see the register.
 */
async function joinWorkerRegisterActionImpl(_prev: PhoneFormState, formData: FormData): Promise<PhoneFormState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLW-0' })
  if (!(await readJobsSwitches()).workerRegister) return fail(PHONE_MESSAGES.unavailable)
  if ((await getVertical('jobs'))?.status !== 'live') return fail(JOBS_NOT_LIVE)
  const parsed = workerRegisterSchema.safeParse({ ...Object.fromEntries(formData), trades: formData.getAll('trades') })
  if (!parsed.success) return fail(PHONE_MESSAGES.check, highlightedFields(parsed.error))
  const d = parsed.data
  const ip = getClientIp(await headers())
  if (!(await allowed('worker-register', ip, d.phone, LIMITS.registerPerVisitor, LIMITS.registerPerPhone))) return fail(PHONE_MESSAGES.tooMany)
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail(PHONE_MESSAGES.security)

  const db = getAdminSupabase()
  const now = new Date().toISOString()
  const fields = { name: d.name, phone: d.phone, trades: Array.from(new Set(d.trades)), area_text: d.area, availability: d.availability, preferred_contact: d.preferred_contact, language: d.language, adult_confirmed_at: now, consent_at: now, last_updated_at: now }
  const save = async (): Promise<{ reference: string } | 'retry' | null> => {
    const { data: reference, error: refError } = await db.rpc('next_reference', { p_prefix: 'HLW' })
    if (refError || !reference) return null
    const { data: existing } = await db.from('worker_register').select('id').eq('phone', d.phone).is('personal_data_deleted_at', null).maybeSingle()
    const { data, error } = existing
      ? await db.from('worker_register').update({ ...fields, reference }).eq('id', existing.id).select('reference').single()
      : await db.from('worker_register').insert({ ...fields, reference }).select('reference').single()
    if (error?.code === '23505') return 'retry'
    if (error || !data) {
      log.error('jobs', 'worker register save failed', error)
      return null
    }
    return { reference: data.reference }
  }
  // Two joins with the same number at the same moment: the second one updates the first.
  const first = await save()
  const result = first === 'retry' ? await save() : first
  if (!result || result === 'retry') return fail(PHONE_MESSAGES.unavailable)
  return ok(result)
}

// Jobs Phase 5: the messages in the visitor's language (Amharic for Jobs: only native-reviewed text; English unchanged).
export async function applyByPhoneAction(_prev: PhoneFormState, formData: FormData): Promise<PhoneFormState> {
  return translateResult(await applyByPhoneActionImpl(_prev, formData), (await getJobsI18n()).t)
}

export async function joinWorkerRegisterAction(_prev: PhoneFormState, formData: FormData): Promise<PhoneFormState> {
  return translateResult(await joinWorkerRegisterActionImpl(_prev, formData), (await getJobsI18n()).t)
}
