'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { decimalFromForm, emailSchema, intFromForm, nameSchema, optionalText, optionalUuid, phoneSchema, textSchema } from '@/lib/validation/common'
import { COUNTRY_CODES } from '@/lib/countries'
import { isEthiopianLocation } from '@/lib/data/reference'
import { getVerticals } from '@/lib/data/verticals'
import { BUDGET_BANDS, BUDGET_VALUES, PROJECT_SERVICES, PROJECT_SERVICE_VALUES, TIMELINES, TIMELINE_VALUES, floorsLabel, labelOf } from '@/lib/build-projects'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail } from '@/lib/email/templates'
import { renderEmail } from '@/lib/email/layout'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { spamCheckDrop } from '@/lib/spam-check'
import { accountConsentRefusal } from '@/lib/data-transfer-server'

export type ProjectState = ActionResult<{ id: string; reference: string }> | null

const schema = z
  .object({
    title: textSchema(160, { min: 3, label: 'A short name for your project' }),
    location_id: optionalUuid,
    location_text: optionalText(200, 'Where the plot is'),
    plot_size_m2: decimalFromForm({ min: 1, max: 10_000_000 }),
    floors: intFromForm({ min: 0, max: 60 }),
    budget_band: z.enum(BUDGET_VALUES, { error: 'Choose a budget' }),
    timeline: z.enum(TIMELINE_VALUES, { error: 'Choose when you want to start' }),
    services: z.array(z.enum(PROJECT_SERVICE_VALUES)).min(1, 'Choose at least one thing you need help with'),
    details: optionalText(4000, 'Details'),
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    country_code: z.enum(COUNTRY_CODES, { error: 'Choose the country you live in' }),
    time_zone: optionalText(60),
    preferred_times: optionalText(300, 'Preferred times'),
  })
  .refine((d) => d.location_id || d.location_text, { message: 'Tell us where the plot is', path: ['location_id'] })

/**
 * "Start a building project" (spec 26.9): one project (HLP-…) and, for each service chosen, a linked request:
 * design, engineering and contractor requests in the service request engine, a materials quote for HagerLand
 * Supply, and construction finance (a request while Finance is live, otherwise interest registered with partners).
 * Needs an account, because a project runs over months and the customer follows it in one place.
 */
export async function createBuildProjectAction(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  if (await spamCheckDrop(formData, 'create_build_project')) return ok({ id: '', reference: 'HLP-0' })
  const user = await getUser()
  if (!user) return fail('Please sign in first, so you can follow your project in your account.')
  // QC-2: signed-in forms rely on the account's data-transfer notice (confirmed at the top of the account pages).
  const consentRefusal = await accountConsentRefusal(user.id)
  if (consentRefusal) return fail(consentRefusal)
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), services: formData.getAll('services') })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.location_id && !(await isEthiopianLocation(d.location_id))) return fail('Building projects are for plots in Ethiopia.', { location_id: 'Choose a place in Ethiopia' })
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`project:${user.id}`, 5, 86_400)).allowed) return fail('You have started several projects today. Please contact us if you need more.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const db = getAdminSupabase()
  const services = Array.from(new Set(d.services))
  const { data: project, error } = await db
    .from('build_projects')
    .insert({ user_id: user.id, title: d.title, location_id: d.location_id ?? null, location_text: d.location_text ?? null, plot_size_m2: d.plot_size_m2 ?? null, floors: d.floors ?? null, budget_band: d.budget_band, timeline: d.timeline, services, details: d.details ?? null, name: d.name, phone: d.phone, email: d.email, country_code: d.country_code, time_zone: d.time_zone ?? null, preferred_times: d.preferred_times ?? null, ip_hash: ipHash })
    .select('id, reference')
    .single()
  if (error || !project) {
    log.error('build-project', 'insert failed', error)
    return fail('We could not start your project. Please try again.')
  }

  const brief = [
    `Building project ${project.reference}: ${d.title}`,
    d.plot_size_m2 ? `Plot: ${d.plot_size_m2} m²` : null,
    floorsLabel(d.floors ?? null) ? `Height: ${floorsLabel(d.floors ?? null)}` : null,
    `Budget: ${labelOf(BUDGET_BANDS, d.budget_band)}`,
    `Start: ${labelOf(TIMELINES, d.timeline)}`,
    d.details ?? null,
  ].filter(Boolean).join('\n')
  const verticals = await getVerticals()
  const live = (k: string) => verticals.some((v) => v.key === k && v.status === 'live')
  const created: string[] = []
  for (const s of services) {
    const def = PROJECT_SERVICES.find((x) => x.value === s)
    if (!def) continue
    if (s === 'materials') {
      if (!live('building-supplies')) continue
      const { data: q } = await db.from('quote_requests').insert({ requester_user_id: user.id, name: d.name, phone: d.phone, email: d.email, delivery_location_id: d.location_id ?? null, delivery_address: d.location_text ?? null, notes: `${brief}\nPlease quote materials for this project; we will send a bill of quantities when we have one.`.slice(0, 2000), source: 'materials_list', project_id: project.id }).select('reference').single()
      if (q) created.push(`Materials quote ${q.reference}`)
      continue
    }
    const { data: cat } = def.slug ? await db.from('service_categories').select('id, vertical_key').eq('slug', def.slug).maybeSingle() : { data: null }
    if (!cat?.vertical_key) continue
    if (live(cat.vertical_key)) {
      const { data: r } = await db
        .from('service_requests')
        .insert({ vertical_key: cat.vertical_key, service_category_id: cat.id, title: `${def.label}: ${d.title}`.slice(0, 160), details: brief.slice(0, 4000), answers: { project: project.reference, plot_size_m2: d.plot_size_m2 ?? null, floors: floorsLabel(d.floors ?? null) }, urgency: 'flexible', budget_band: labelOf(BUDGET_BANDS, d.budget_band), location_id: d.location_id ?? null, location_text: d.location_text ?? null, country_code: 'ET', requester_user_id: user.id, name: d.name, phone: d.phone, email: d.email, source: 'build_project', project_id: project.id, ip_hash: ipHash })
        .select('reference')
        .single()
      if (r) created.push(`${def.label} request ${r.reference}`)
    } else if (s === 'finance' && verticals.some((v) => v.key === 'finance')) {
      // Finance not live yet: the need is recorded as interest with licensed partners (spec 24.8, 26.3).
      const { data: i } = await db.from('interest_registrations').insert({ vertical_key: 'finance', pillar_key: 'finance', category: 'Construction finance', name: d.name, email: d.email, phone: d.phone, country_code: d.country_code, message: `From building project ${project.reference}`, user_id: user.id, ip_hash: ipHash }).select('reference').single()
      if (i) created.push(`Finance interest ${i.reference} (we will tell you when finance partners are available)`)
    }
  }

  await sendEmail({
    to: d.email,
    ...renderEmail({
      subject: `Your building project ${project.reference}`,
      preheader: 'Everything for your project in one place.',
      heading: 'Your building project has started',
      paragraphs: [`Hello ${d.name.split(' ')[0] || d.name},`, `Thank you. We have created your project and the requests below. Providers HagerLand matches to your project will contact you, and you can follow everything on your project page.`],
      details: [['Project', `${project.reference}: ${d.title}`], ...created.map((c) => ['Linked', c] as [string, string])],
      button: { label: 'Open your project', href: canonicalUrl(`/account/projects/${project.id}`) },
      reason: 'You are receiving this because you started a building project on HagerLand.',
    }),
  })
  const to = Array.from(new Set([await hagerlandInbox('general'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length) await sendEmail({ to, replyTo: d.email, ...adminNoticeEmail({ subject: `Building project ${project.reference}: ${d.title}`, heading: 'New building project', lines: [['Reference', project.reference], ['Customer', d.name], ['Needs', services.join(', ')], ['Linked', created.join('; ') || 'None']], adminUrl: canonicalUrl(`/roodber8/projects/${project.id}`) }) })
  return ok({ id: project.id, reference: project.reference })
}
