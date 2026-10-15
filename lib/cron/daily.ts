import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PRIVATE_BUCKET } from '@/lib/media'
import { sendEmail } from '@/lib/email/send'
import { retryOutbox } from '@/lib/email/outbox'
import { adminDigestEmail, listingExpiredEmail, listingExpiringEmail, providerReminderEmail } from '@/lib/email/templates'
import { orgManagerEmails } from '@/lib/enquiries'
import { MATCH_REMINDER_HOURS } from '@/lib/service-requests/labels'
import { runScheduledAlerts } from '@/lib/alerts'
import { firstName, ownerEmails } from '@/lib/admin/notify'
import { purgeExpiredRateLimits } from '@/lib/rate-limit'
import { revalidateEntity } from '@/lib/revalidate'
import { QUOTE_VALID_DAYS } from '@/lib/listing-rules'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { tenancyReminderEmail, viewingConfirmedEmail } from '@/lib/email/agency'
import { hagerlandInbox } from '@/lib/enquiries'
import { formatDate } from '@/lib/format'

const DAY = 86_400_000
const BATCH = 500
const iso = (ms: number) => new Date(ms).toISOString()

export interface DailySummary {
  expired: number
  expiredEmailed: number
  reminded: number
  quotesExpired: number
  verificationDocsPurged: number
  revealsPurged: number
  rateLimitsPurged: boolean
  matchReminders: number
  searchAlerts: number
  jobsExpired: number
  cvsPurged: number
  emailsRetried: number
  interestPurged: number
  viewingReminders: number
  tenancyReminders: number
  digestSent: boolean
}

/** Published properties past their expiry date become expired; owners are emailed once. */
async function expireListings(now: number): Promise<{ expired: number; emailed: number }> {
  const db = getAdminSupabase()
  const { data } = await db.from('properties').update({ status: 'expired' }).eq('status', 'published').lt('expires_at', iso(now)).select('id, title, lister_org_id, lister_user_id').limit(BATCH)
  let emailed = 0
  for (const p of data ?? []) {
    revalidateEntity('property', p.id)
    const to = await ownerEmails(p.lister_org_id, p.lister_user_id)
    if (to.length && (await sendEmail({ to, ...listingExpiredEmail({ name: await firstName(p.lister_user_id), title: p.title }) }))) emailed++
  }
  return { expired: data?.length ?? 0, emailed }
}

/** One reminder, 7 days before expiry. */
async function remindExpiring(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('properties')
    .select('id, title, expires_at, lister_org_id, lister_user_id')
    .eq('status', 'published')
    .is('expiry_reminder_sent_at', null)
    .gte('expires_at', iso(now))
    .lte('expires_at', iso(now + 7 * DAY))
    .limit(BATCH)
  let sent = 0
  for (const p of data ?? []) {
    const to = await ownerEmails(p.lister_org_id, p.lister_user_id)
    if (to.length) await sendEmail({ to, ...listingExpiringEmail({ name: await firstName(p.lister_user_id), title: p.title, expiresAt: p.expires_at as string }) })
    // Marked even without an address, so nobody is reminded twice.
    await db.from('properties').update({ expiry_reminder_sent_at: iso(now) }).eq('id', p.id)
    sent++
  }
  return sent
}

/** Providers who have not answered a matched request within 48 hours get one reminder (spec 25.4). */
async function remindUnansweredMatches(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('service_request_matches')
    .select('id, org_id, request_id')
    .eq('status', 'offered')
    .is('reminder_sent_at', null)
    .lt('offered_at', iso(now - MATCH_REMINDER_HOURS * 3_600_000))
    .limit(BATCH)
  let sent = 0
  for (const m of data ?? []) {
    const [{ data: r }, { data: org }] = await Promise.all([
      db.from('service_requests').select('reference, title, status').eq('id', m.request_id).maybeSingle(),
      db.from('organisations').select('name').eq('id', m.org_id).maybeSingle(),
    ])
    if (r && !['won', 'lost', 'cancelled'].includes(r.status)) {
      const to = await orgManagerEmails(m.org_id)
      if (to.length && (await sendEmail({ to, ...providerReminderEmail({ orgName: org?.name ?? 'your business', reference: r.reference, title: r.title, url: canonicalUrl(`/account/requests/${m.id}`) }) }))) sent++
    }
    // Marked even when nothing was sent, so no provider is reminded twice.
    await db.from('service_request_matches').update({ reminder_sent_at: iso(now) }).eq('id', m.id)
  }
  return sent
}

async function expireQuotes(now: number): Promise<number> {
  const { data } = await getAdminSupabase().from('quote_requests').update({ status: 'expired' }).eq('status', 'quoted').lt('quoted_at', iso(now - QUOTE_VALID_DAYS * DAY)).select('id')
  return data?.length ?? 0
}

/** Verification documents are deleted 90 days after the decision (privacy policy). The decision itself is kept. */
async function purgeVerificationDocs(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = await db.from('verification_requests').select('id, documents').neq('status', 'pending').is('documents_purged_at', null).lt('decided_at', iso(now - 90 * DAY)).limit(BATCH)
  let purged = 0
  for (const r of data ?? []) {
    const paths = Object.values((r.documents as Record<string, unknown>) ?? {}).filter((p): p is string => typeof p === 'string' && p.startsWith('docs/verification/'))
    if (paths.length) {
      const { error } = await db.storage.from(PRIVATE_BUCKET).remove(paths)
      if (error) {
        log.error('cron', 'verification purge failed', error, { request: r.id })
        continue
      }
    }
    await db.from('verification_requests').update({ documents: {}, documents_purged_at: iso(now) }).eq('id', r.id)
    purged++
  }
  return purged
}

/** Open jobs close on their closing date (or 60 days after approval). */
async function expireJobs(now: number): Promise<number> {
  const { data } = await getAdminSupabase().from('job_posts').update({ status: 'expired' }).eq('status', 'published').lt('expires_at', iso(now)).select('id').limit(BATCH)
  for (const j of data ?? []) revalidateEntity('job', j.id)
  return data?.length ?? 0
}

/** CVs sent with applications are deleted 12 months after the application (privacy policy). The application record is kept. */
async function purgeApplicationCvs(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = await db.from('job_applications').select('id, cv_path').not('cv_path', 'is', null).lt('created_at', iso(now - 365 * DAY)).limit(BATCH)
  let purged = 0
  for (const a of data ?? []) {
    const path = a.cv_path as string
    // A CV still attached to the candidate's profile, or to a newer application, is kept.
    const [{ count: inProfile }, { count: newer }] = await Promise.all([
      db.from('candidate_profiles').select('user_id', { count: 'exact', head: true }).eq('cv_path', path),
      db.from('job_applications').select('id', { count: 'exact', head: true }).eq('cv_path', path).gte('created_at', iso(now - 365 * DAY)),
    ])
    if (!inProfile && !newer && path.startsWith('docs/cv/')) {
      const { error } = await db.storage.from(PRIVATE_BUCKET).remove([path])
      if (error) {
        log.error('cron', 'cv purge failed', error, { application: a.id })
        continue
      }
    }
    await db.from('job_applications').update({ cv_path: null, cv_purged_at: iso(now) }).eq('id', a.id)
    purged++
  }
  return purged
}

/** Interest registrations are kept 24 months (privacy policy), then deleted. */
async function purgeInterest(now: number): Promise<number> {
  const { data } = await getAdminSupabase().from('interest_registrations').delete().lt('created_at', iso(now - 730 * DAY)).select('id')
  return data?.length ?? 0
}

async function purgeReveals(now: number): Promise<number> {
  const { data } = await getAdminSupabase().from('contact_reveals').delete().lt('created_at', iso(now - 365 * DAY)).select('id')
  return data?.length ?? 0
}

/** Confirmed viewings in the next 36 hours get one reminder email (spec 26.5). */
async function remindViewings(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('agency_viewings')
    .select('id, reference, name, email, mode, scheduled_at, video_link, property:properties(title)')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gt('scheduled_at', iso(now))
    .lte('scheduled_at', iso(now + 36 * 3_600_000))
    .limit(BATCH)
  let sent = 0
  for (const v of data ?? []) {
    const property = (Array.isArray(v.property) ? v.property[0] : v.property)?.title ?? 'the property'
    if (v.email && v.scheduled_at) {
      await sendEmail({ to: v.email, ...viewingConfirmedEmail({ name: v.name.split(' ')[0] || v.name, reference: v.reference, property, when: v.scheduled_at, mode: v.mode, videoLink: v.video_link, reminder: true }) })
      sent++
    }
    await db.from('agency_viewings').update({ reminder_sent_at: iso(now) }).eq('id', v.id)
    await db.from('agency_activity').insert({ entity_type: 'viewing', entity_id: v.id, kind: 'email', text: v.email ? 'Reminder emailed to the visitor.' : 'No email address: call the visitor to remind them.', actor: 'daily job' })
  }
  return sent
}

/** Renewal dates within 30 days and notice dates within 14 days remind the agency team once (spec 26.6). */
async function remindTenancies(now: number): Promise<number> {
  const db = getAdminSupabase()
  const to = Array.from(new Set([await hagerlandInbox('sales'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  const day = (ms: number) => iso(ms).slice(0, 10)
  const [renewals, notices] = await Promise.all([
    db.from('tenancies').select('id, reference, title, tenant_names, renewal_date').eq('status', 'active').is('renewal_reminded_at', null).not('renewal_date', 'is', null).lte('renewal_date', day(now + 30 * DAY)).limit(BATCH),
    db.from('tenancies').select('id, reference, title, tenant_names, notice_date').eq('status', 'active').is('notice_reminded_at', null).not('notice_date', 'is', null).lte('notice_date', day(now + 14 * DAY)).limit(BATCH),
  ])
  let sent = 0
  for (const [kind, rows] of [['renewal', renewals.data ?? []], ['notice', notices.data ?? []]] as const) {
    for (const t of rows) {
      const date = 'renewal_date' in t ? t.renewal_date : (t as { notice_date: string | null }).notice_date
      if (to.length && date) await sendEmail({ to, ...tenancyReminderEmail({ kind, title: t.title, reference: t.reference, date: formatDate(date), tenant: t.tenant_names }) })
      await db.from('tenancies').update(kind === 'renewal' ? { renewal_reminded_at: iso(now) } : { notice_reminded_at: iso(now) }).eq('id', t.id)
      await db.from('agency_activity').insert({ entity_type: 'tenancy', entity_id: t.id, kind: 'email', text: `${kind === 'renewal' ? 'Renewal' : 'Notice'} reminder sent to the team (${date ? formatDate(date) : ''}).`, actor: 'daily job' })
      sent++
    }
  }
  return sent
}

/** Lines for the admin digest; empty when there is nothing to report. */
async function digestLines(now: number, s: Omit<DailySummary, 'digestSent'>): Promise<[string, string][]> {
  const db = getAdminSupabase()
  const head = { count: 'exact' as const, head: true }
  const since = iso(now - DAY)
  const [pProps, pDevs, pOrgs, pPortfolio, claims, verifs, reports, enq, enqUnanswered, quotes, quotesOpen, signups, expiring, errors, interest, partners, srNew, srEmergency, srToMatch, srUnanswered, srAllDeclined, careNew, pJobs, pUpdates, applications, tradePending, emailProblems] = await Promise.all([
    db.from('properties').select('id', head).eq('status', 'pending_review'),
    db.from('developments').select('id', head).eq('status', 'pending_review'),
    db.from('organisations').select('id', head).eq('status', 'pending_review'),
    db.from('portfolio_projects').select('id', head).eq('status', 'pending_review'),
    db.from('claims').select('id', head).eq('status', 'pending'),
    db.from('verification_requests').select('id', head).eq('status', 'pending'),
    db.from('reports').select('id', head).eq('status', 'open'),
    db.from('enquiries').select('id', head).gte('created_at', since),
    db.from('enquiries').select('id', head).is('first_viewed_at', null).lt('created_at', iso(now - 2 * DAY)).not('target_type', 'in', '("general","hagerland_development")'),
    db.from('quote_requests').select('id', head).gte('created_at', since),
    db.from('quote_requests').select('id', head).in('status', ['submitted', 'in_review']),
    db.from('profiles').select('id', head).gte('created_at', since),
    db.from('properties').select('id', head).eq('status', 'published').lte('expires_at', iso(now + 7 * DAY)),
    db.from('errors').select('route, message, count').gte('last_seen_at', since).order('count', { ascending: false }).limit(5),
    db.from('interest_registrations').select('id', head).gte('created_at', since),
    db.from('partner_applications').select('id', head).eq('status', 'new'),
    db.from('service_requests').select('id', head).gte('created_at', since),
    db.from('service_requests').select('id', head).eq('urgency', 'emergency').in('status', ['submitted', 'triaged', 'matched']),
    db.from('service_requests').select('id', head).in('status', ['submitted', 'triaged']),
    db.from('service_request_matches').select('id', head).eq('status', 'offered').lt('offered_at', iso(now - MATCH_REMINDER_HOURS * 3_600_000)),
    db.from('service_requests').select('id', head).eq('status', 'triaged').not('admin_alerted_at', 'is', null),
    db.from('property_care_requests').select('id', head).eq('status', 'new'),
    db.from('job_posts').select('id', head).eq('status', 'pending_review'),
    db.from('development_updates').select('id', head).eq('status', 'pending_review'),
    db.from('job_applications').select('id', head).gte('created_at', since),
    db.from('trade_accounts').select('id', head).eq('status', 'pending'),
    db.from('email_outbox').select('id', head).in('status', ['failed', 'gave_up']),
  ])
  const [agValuations, agViewings, agOffers, agApplications] = await Promise.all([
    db.from('agency_valuations').select('id', head).eq('status', 'requested'),
    db.from('agency_viewings').select('id', head).eq('status', 'requested'),
    db.from('agency_offers').select('id', head).eq('status', 'submitted'),
    db.from('rental_applications').select('id', head).in('status', ['submitted', 'referencing']),
  ])
  const n = (r: { count: number | null }) => r.count ?? 0
  const lines: [string, string][] = []
  const add = (label: string, value: number) => value > 0 && lines.push([label, String(value)])
  add('Properties waiting for review', n(pProps))
  add('Developments waiting for review', n(pDevs))
  add('Businesses waiting for review', n(pOrgs))
  add('Portfolio projects waiting for review', n(pPortfolio))
  add('Jobs waiting for review', n(pJobs))
  add('Development progress updates waiting for review', n(pUpdates))
  add('Claims to decide', n(claims))
  add('Verification requests', n(verifs))
  add('Open reports', n(reports))
  add('New enquiries (24 h)', n(enq))
  add('Enquiries unopened over 48 h', n(enqUnanswered))
  add('New quote requests (24 h)', n(quotes))
  add('Quotes waiting for a price', n(quotesOpen))
  add('New sign-ups (24 h)', n(signups))
  add('EMERGENCY service requests still open', n(srEmergency))
  add('New service requests (24 h)', n(srNew))
  add('Service requests waiting to be matched', n(srToMatch))
  add('Requests every provider declined', n(srAllDeclined))
  add('Provider answers overdue (48 h)', n(srUnanswered))
  add('Property Care leads to contact', n(careNew))
  add('Agency: valuations to book', n(agValuations))
  add('Agency: viewings to confirm', n(agViewings))
  add('Agency: offers waiting for the owner', n(agOffers))
  add('Agency: applications to decide', n(agApplications))
  add('Viewing reminders sent today', s.viewingReminders)
  add('Tenancy renewal or notice reminders today', s.tenancyReminders)
  add('New interest registrations (24 h)', n(interest))
  add('Partner applications to review', n(partners))
  add('New job applications (24 h)', n(applications))
  add('Trade account applications to decide', n(tradePending))
  add('Emails not yet delivered (see admin → Email problems)', n(emailProblems))
  add('Listings expiring within 7 days', n(expiring))
  add('Listings expired today', s.expired)
  add('Quotes expired today', s.quotesExpired)
  add('Jobs closed today', s.jobsExpired)
  for (const e of errors.data ?? []) lines.push([`Error ×${e.count}`, `${e.route}: ${e.message}`.slice(0, 160)])
  return lines
}

/** Everything the daily cron does (spec 18.3). Each step is independent: one failing does not stop the others. */
export async function runDaily(now = Date.now()): Promise<DailySummary> {
  const step = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn()
    } catch (err) {
      log.error('cron', `${name} failed`, err)
      return fallback
    }
  }
  const { expired, emailed } = await step('expire listings', () => expireListings(now), { expired: 0, emailed: 0 })
  const reminded = await step('reminders', () => remindExpiring(now), 0)
  const quotesExpired = await step('expire quotes', () => expireQuotes(now), 0)
  const matchReminders = await step('match reminders', () => remindUnansweredMatches(now), 0)
  const searchAlerts = await step('search alerts', () => runScheduledAlerts(now), 0)
  await step('featured', async () => void (await getAdminSupabase().rpc('refresh_all_featured')), undefined)
  const verificationDocsPurged = await step('verification purge', () => purgeVerificationDocs(now), 0)
  const revealsPurged = await step('reveals purge', () => purgeReveals(now), 0)
  const jobsExpired = await step('expire jobs', () => expireJobs(now), 0)
  const cvsPurged = await step('cv purge', () => purgeApplicationCvs(now), 0)
  const interestPurged = await step('interest purge', () => purgeInterest(now), 0)
  // Market insight (spec 26.10): asking-price figures rebuilt from live listings once a day.
  await step('market insight', async () => void (await getAdminSupabase().rpc('refresh_market_insight')), undefined)
  const viewingReminders = await step('viewing reminders', () => remindViewings(now), 0)
  const tenancyReminders = await step('tenancy reminders', () => remindTenancies(now), 0)
  const emailsRetried = await step('email retries', async () => (await retryOutbox(now)).sent, 0)
  // rate_limits is a pre-existing (legacy) table: expired counters are only deleted when AB switches this on.
  const rateLimitsPurged = process.env.CRON_PURGE_RATE_LIMITS === 'true' ? await step('rate limit purge', async () => (await purgeExpiredRateLimits(7), true), false) : false
  const summary = { expired, expiredEmailed: emailed, reminded, quotesExpired, verificationDocsPurged, revealsPurged, rateLimitsPurged, matchReminders, searchAlerts, jobsExpired, cvsPurged, emailsRetried, interestPurged, viewingReminders, tenancyReminders }
  let digestSent = false
  const to = process.env.ADMIN_DIGEST_EMAIL
  if (to) {
    const lines = await step('digest', () => digestLines(now, summary), [] as [string, string][])
    if (lines.length) digestSent = await sendEmail({ to, ...adminDigestEmail({ lines, adminUrl: canonicalUrl('/roodber8') }) })
  }
  log.info('cron', 'daily done', { ...summary, digestSent })
  return { ...summary, digestSent }
}
