import 'server-only'
import { supplyDigestLines } from '@/lib/supply/digest'
import { must } from '@/lib/admin/must'
import { deletionRequests, unansweredEnquiriesCount } from '@/lib/admin/counts'
import { COULD_NOT_READ, DAILY_RUN_ACTION, deletionRequestsLine, failedStepsLine, fallbackLine, runLine } from '@/lib/cron/digest-text'
import type { RenderedEmail } from '@/lib/email/layout'
import { importsDigestCounts, runImportsCleanup, type CleanupSummary } from '@/lib/imports/compliance-data'
import { runJobsDataCleanup } from '@/lib/jobs-cleanup-data'
import { cleanupDigestCounts, cleanupUnreadable, type CleanupResult } from '@/lib/jobs-cleanup'
import { runAlwaysOnCleanup, type AlwaysOnResult } from '@/lib/retention-data'
import { alwaysOnDigestCounts } from '@/lib/retention'
import { supplyDigestCounts } from '@/lib/supply/insights-data'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PRIVATE_BUCKET } from '@/lib/media'
import { sendEmail } from '@/lib/email/send'
import { retryOutbox } from '@/lib/email/outbox'
import { adminDigestEmail, adminDigestFallbackEmail, listingExpiredEmail, listingExpiringEmail, providerReminderEmail } from '@/lib/email/templates'
import { orgManagerEmails } from '@/lib/enquiries'
import { MATCH_REMINDER_HOURS } from '@/lib/service-requests/labels'
import { runScheduledAlerts } from '@/lib/alerts'
import { firstName, ownerEmails } from '@/lib/admin/notify'
import { purgeExpiredRateLimits } from '@/lib/rate-limit'
import { revalidateEntity } from '@/lib/revalidate'
import { QUOTE_VALID_DAYS } from '@/lib/listing-rules'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { backupReminderLine } from '@/lib/backup-reminder'
import { tenancyReminderEmail, viewingConfirmedEmail } from '@/lib/email/agency'
import { hagerlandInbox } from '@/lib/enquiries'
import { demandDigestLine } from '@/lib/admin/demand'
import { formatDate } from '@/lib/format'
import { isStaffingRequest } from '@/lib/jobs-desk-data'
import { deskDigestCounts, runDeskDaily } from '@/lib/jobs-desk-cron'
import { runVerificationDaily, verificationDigestCounts, type VerificationDailyCounts } from '@/lib/verification-data'
import { jobReportDigestCounts } from '@/lib/job-reports-data'
import { purgeExpiredCallbackBlocks, waitingCallbacks } from '@/lib/callbacks-data'
import { asJobActor } from '@/lib/job-status-actor'
import { quietJobCount } from '@/lib/jobs-insights-data'
import { feesOwedOver30Days } from '@/lib/jobs-fee-report-data'
import { REGISTRATION_WAITING } from '@/lib/supply/partner-rules'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { expireDueOrderRequests } from '@/lib/supply/order-requests-data'
import { SPAM_DROP_ROUTE, spamDropsSince } from '@/lib/spam-check'

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
  /** Imports compliance clean-up (dry run unless the owner switched it to live); null if the step failed. */
  importsCleanup: CleanupSummary | null
  /** Jobs personal details older than 12 months (dry run unless the owner switched it to live); null if the step failed. */
  jobsDataCleanup: CleanupResult | null
  /** F-5: error records and expired invitations cleared (always, whatever the deletion mode); null if the step failed. */
  housekeeping: AlwaysOnResult | null
  /** Recruitment desk placements moved to "guarantee running" or "completed" (Jobs Phase 3). */
  placementsMoved: number
  /** Verified badges: reminders sent and badges ended (Jobs Phase 4); null if the step failed. */
  verification: VerificationDailyCounts | null
  /** Expired wrong-number blocks removed (Jobs Phase 5, always, whatever the deletion mode); null if the step failed. */
  callbackBlocksRemoved: number | null
  /** Fix F-2: steps that worked, and the names of those that failed (also in the digest's first lines and the run record). */
  stepsOk: number
  failedSteps: string[]
  digestSent: boolean
}

/** Published properties past their expiry date become expired; owners are emailed once. */
async function expireListings(now: number): Promise<{ expired: number; emailed: number }> {
  const db = getAdminSupabase()
  const { data } = must(await db.from('properties').update({ status: 'expired' }).eq('status', 'published').lt('expires_at', iso(now)).select('id, title, lister_org_id, lister_user_id').limit(BATCH))
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
  const { data } = must(await db
    .from('properties')
    .select('id, title, expires_at, lister_org_id, lister_user_id')
    .eq('status', 'published')
    .is('expiry_reminder_sent_at', null)
    .gte('expires_at', iso(now))
    .lte('expires_at', iso(now + 7 * DAY))
    .limit(BATCH))
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
  const { data } = must(await db
    .from('service_request_matches')
    .select('id, org_id, request_id')
    .eq('status', 'offered')
    .is('reminder_sent_at', null)
    .lt('offered_at', iso(now - MATCH_REMINDER_HOURS * 3_600_000))
    .limit(BATCH))
  let sent = 0
  for (const m of data ?? []) {
    const [{ data: r }, { data: org }] = await Promise.all([
      db.from('service_requests').select('reference, title, status').eq('id', m.request_id).maybeSingle(),
      db.from('organisations').select('name').eq('id', m.org_id).maybeSingle(),
    ])
    // Staffing requests are never handled by providers (Jobs Phase 3): no reminder.
    if (r && !['won', 'lost', 'cancelled'].includes(r.status) && !(await isStaffingRequest(m.request_id))) {
      const to = await orgManagerEmails(m.org_id)
      if (to.length && (await sendEmail({ to, ...providerReminderEmail({ orgName: org?.name ?? 'your business', reference: r.reference, title: r.title, url: canonicalUrl(`/account/requests/${m.id}`) }) }))) sent++
    }
    // Marked even when nothing was sent, so no provider is reminded twice.
    await db.from('service_request_matches').update({ reminder_sent_at: iso(now) }).eq('id', m.id)
  }
  return sent
}

async function expireQuotes(now: number): Promise<number> {
  const { data } = must(await getAdminSupabase().from('quote_requests').update({ status: 'expired' }).eq('status', 'quoted').lt('quoted_at', iso(now - QUOTE_VALID_DAYS * DAY)).select('id'))
  return data?.length ?? 0
}

/** Verification documents are deleted 90 days after the decision (privacy policy). The decision itself is kept. */
async function purgeVerificationDocs(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = must(await db.from('verification_requests').select('id, documents').neq('status', 'pending').is('documents_purged_at', null).lt('decided_at', iso(now - 90 * DAY)).limit(BATCH))
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
  const { data } = must(await asJobActor(getAdminSupabase().from('job_posts').update({ status: 'expired' }).eq('status', 'published').lt('expires_at', iso(now)).select('id').limit(BATCH), 'system'))
  for (const j of data ?? []) revalidateEntity('job', j.id)
  return data?.length ?? 0
}

/** CVs sent with applications are deleted 12 months after the application (privacy policy). The application record is kept. */
async function purgeApplicationCvs(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = must(await db.from('job_applications').select('id, cv_path').not('cv_path', 'is', null).lt('created_at', iso(now - 365 * DAY)).limit(BATCH))
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
  const { data } = must(await getAdminSupabase().from('interest_registrations').delete().lt('created_at', iso(now - 730 * DAY)).select('id'))
  return data?.length ?? 0
}

async function purgeReveals(now: number): Promise<number> {
  const { data } = must(await getAdminSupabase().from('contact_reveals').delete().lt('created_at', iso(now - 365 * DAY)).select('id'))
  return data?.length ?? 0
}

/** Closed viewings, offers and applications are deleted after 24 months (privacy policy, spec 26.16). */
async function purgeAgencyRecords(now: number): Promise<number> {
  const db = getAdminSupabase()
  const cutoff = iso(now - 730 * DAY)
  const [v, o, a] = must(await Promise.all([
    db.from('agency_viewings').delete().in('status', ['completed', 'cancelled', 'no_show']).lt('updated_at', cutoff).select('id'),
    db.from('agency_offers').delete().in('status', ['rejected', 'withdrawn']).lt('updated_at', cutoff).select('id'),
    db.from('rental_applications').delete().in('status', ['rejected', 'withdrawn']).lt('updated_at', cutoff).select('id'),
  ]))
  return (v.data?.length ?? 0) + (o.data?.length ?? 0) + (a.data?.length ?? 0)
}

/** Confirmed viewings in the next 36 hours get one reminder email (spec 26.5). */
async function remindViewings(now: number): Promise<number> {
  const db = getAdminSupabase()
  const { data } = must(await db
    .from('agency_viewings')
    .select('id, reference, name, email, mode, scheduled_at, video_link, property:properties(title)')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gt('scheduled_at', iso(now))
    .lte('scheduled_at', iso(now + 36 * 3_600_000))
    .limit(BATCH))
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
  const [renewals, notices] = must(await Promise.all([
    db.from('tenancies').select('id, reference, title, tenant_names, renewal_date').eq('status', 'active').is('renewal_reminded_at', null).not('renewal_date', 'is', null).lte('renewal_date', day(now + 30 * DAY)).limit(BATCH),
    db.from('tenancies').select('id, reference, title, tenant_names, notice_date').eq('status', 'active').is('notice_reminded_at', null).not('notice_date', 'is', null).lte('notice_date', day(now + 14 * DAY)).limit(BATCH),
  ]))
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

type HeadCount = PromiseLike<{ count: number | null; error: { message: string } | null }>

/**
 * Lines for the admin digest; empty when there is nothing to report. The failure rule applies (Fix F-2): a count or
 * section that cannot be read becomes a "Could not read: <what>" line at the top, never a missing line or a 0.
 */
async function digestLines(now: number, s: Omit<DailySummary, 'digestSent' | 'stepsOk' | 'failedSteps'>): Promise<[string, string][]> {
  const db = getAdminSupabase()
  const head = { count: 'exact' as const, head: true }
  const since = iso(now - DAY)
  const unread: string[] = []
  const lines: [string, string][] = []
  const urgent: [string, string][] = []
  // Each count is its own query, in the digest's order; numbers are today's results from the steps above.
  const counts: [string, HeadCount | number][] = [
    ['Properties waiting for review', db.from('properties').select('id', head).eq('status', 'pending_review')],
    ['Developments waiting for review', db.from('developments').select('id', head).eq('status', 'pending_review')],
    ['Businesses waiting for review', db.from('organisations').select('id', head).eq('status', 'pending_review')],
    ['Portfolio projects waiting for review', db.from('portfolio_projects').select('id', head).eq('status', 'pending_review')],
    ['Jobs waiting for review', db.from('job_posts').select('id', head).eq('status', 'pending_review')],
    ['Development progress updates waiting for review', db.from('development_updates').select('id', head).eq('status', 'pending_review')],
    ['Claims to decide', db.from('claims').select('id', head).eq('status', 'pending')],
    ['Verification requests', db.from('verification_requests').select('id', head).eq('status', 'pending')],
    ['Open reports', db.from('reports').select('id', head).eq('status', 'open')],
    ['New enquiries (24 h)', db.from('enquiries').select('id', head).gte('created_at', since)],
    ['Enquiries unopened over 48 h', unansweredEnquiriesCount(now)],
    ['New quote requests (24 h)', db.from('quote_requests').select('id', head).gte('created_at', since)],
    ['Quotes waiting for a price', db.from('quote_requests').select('id', head).in('status', ['submitted', 'in_review'])],
    ['New sign-ups (24 h)', db.from('profiles').select('id', head).gte('created_at', since)],
    ['EMERGENCY service requests still open', db.from('service_requests').select('id', head).eq('urgency', 'emergency').in('status', ['submitted', 'triaged', 'matched'])],
    ['New service requests (24 h)', db.from('service_requests').select('id', head).gte('created_at', since)],
    ['Service requests waiting to be matched', db.from('service_requests').select('id', head).in('status', ['submitted', 'triaged'])],
    ['Requests every provider declined', db.from('service_requests').select('id', head).eq('status', 'triaged').not('admin_alerted_at', 'is', null)],
    ['Provider answers overdue (48 h)', db.from('service_request_matches').select('id', head).eq('status', 'offered').lt('offered_at', iso(now - MATCH_REMINDER_HOURS * 3_600_000))],
    ['Property Care leads to contact', db.from('property_care_requests').select('id', head).eq('status', 'new')],
    ['Agency: valuations to book', db.from('agency_valuations').select('id', head).eq('status', 'requested')],
    ['Agency: viewings to confirm', db.from('agency_viewings').select('id', head).eq('status', 'requested')],
    ['Agency: offers waiting for the owner', db.from('agency_offers').select('id', head).eq('status', 'submitted')],
    ['Agency: applications to decide', db.from('rental_applications').select('id', head).in('status', ['submitted', 'referencing'])],
    ['Reviews to moderate', db.from('reviews').select('id', head).eq('status', 'pending')],
    ['Viewing reminders sent today', s.viewingReminders],
    ['Tenancy renewal or notice reminders today', s.tenancyReminders],
    ['New interest registrations (24 h)', db.from('interest_registrations').select('id', head).gte('created_at', since)],
    ['Partner applications to review', db.from('partner_applications').select('id', head).eq('status', 'new')],
    ['New job applications (24 h)', db.from('job_applications').select('id', head).gte('created_at', since)],
    ['Of which by phone (24 h)', db.from('job_applications').select('id', head).eq('channel', 'phone').gte('created_at', since)],
    ['Worker register: joined or updated (24 h)', db.from('worker_register').select('id', head).gte('last_updated_at', since)],
    ['Trade account applications to decide', db.from('trade_accounts').select('id', head).eq('status', 'pending')],
    ['Partner registrations waiting', db.from('partner_registrations').select('id', head).in('status', REGISTRATION_WAITING)],
    ['Partner product drafts waiting', db.from('partner_product_drafts').select('id', head).eq('status', 'submitted')],
    ['Order requests waiting for a stock check', db.from('order_requests').select('id', head).eq('status', 'submitted')],
    ['Reservations ending in the next 12 hours', db.from('order_requests').select('id', head).eq('status', 'reserved').lte('reserved_until', iso(now + 12 * 3_600_000))],
    ['Paid order requests without supplier orders', db.from('order_requests').select('id', head).eq('status', 'paid')],
    ['Order requests disputed', db.from('order_requests').select('id', head).eq('status', 'disputed')],
    ['Emails not yet delivered (see admin → Email problems)', db.from('email_outbox').select('id', head).in('status', ['failed', 'gave_up'])],
    ['Listings expiring within 7 days', db.from('properties').select('id', head).eq('status', 'published').lte('expires_at', iso(now + 7 * DAY))],
    ['Listings expired today', s.expired],
    ['Quotes expired today', s.quotesExpired],
    ['Jobs closed today', s.jobsExpired],
    // QC-1a: forms the spam check stopped (counts only; shown only when above 0).
    ['Messages stopped by the spam check in the last 24 hours', spamDropsSince(since)],
  ]
  const [values, errors] = await Promise.all([
    Promise.all(counts.map(([, v]) => v)),
    db.from('errors').select('route, message, count').gte('last_seen_at', since).neq('route', SPAM_DROP_ROUTE).order('count', { ascending: false }).limit(5),
  ])
  counts.forEach(([label], i) => {
    const v = values[i]
    const n = typeof v === 'number' ? v : v.error ? null : (v.count ?? 0)
    if (n === null) unread.push(label)
    else if (n > 0) lines.push([label, String(n)])
  })
  // Fix F-2 (M-03): account deletion requests, promised within 30 days; urgent ones go to the top.
  try {
    const { count, oldestAt } = await deletionRequests()
    const deletion = deletionRequestsLine(count, oldestAt, now)
    if (deletion) (deletion.urgent ? urgent : lines).push(deletion.line)
  } catch (err) {
    log.error('cron', 'deletion requests digest failed', err)
    unread.push('Account deletion requests waiting')
  }
  // Each section below is failure-isolated: a failure is logged and named as "Could not read", the rest carries on.
  const section = async (what: string, load: () => Promise<[string, string][]>) => {
    try {
      lines.push(...(await load()))
    } catch (err) {
      log.error('cron', `${what} digest failed`, err)
      unread.push(what)
    }
  }
  const positive = (rows: [string, number][]): [string, string][] => rows.filter(([, count]) => count > 0).map(([label, count]) => [label, String(count)])
  await section('Demand (24 h)', async () => {
    const demand = await demandDigestLine(now)
    return demand ? [demand] : []
  })
  lines.push(...(await supplyDigestLines(() => supplyDigestCounts(now))))
  lines.push(...positive(importsDigestCounts(s.importsCleanup)))
  lines.push(...positive(cleanupDigestCounts(s.jobsDataCleanup)))
  unread.push(...cleanupUnreadable(s.jobsDataCleanup))
  lines.push(...positive(alwaysOnDigestCounts(s.housekeeping)))
  await section('Recruitment desk figures', async () => positive(await deskDigestCounts(now)))
  // Jobs Phase 4 (W22): job reports and Verified badges.
  await section('Job reports figures', async () => positive(await jobReportDigestCounts(now)))
  await section('Verified badges figures', async () => positive(await verificationDigestCounts(now)))
  // Jobs Phase 5: call-back requests waiting for a call.
  await section('Call-back requests waiting', async () => positive([['Call-back requests waiting', await waitingCallbacks()]]))
  // Jobs Phase 6 (W24, W25): counts only, shown only when above 0.
  await section('Jobs: open 14 days or more with no applications', async () => positive([['Jobs: open 14 days or more with no applications', await quietJobCount(new Date(now))]]))
  await section('Recruitment fees owed for over 30 days', async () => positive([['Recruitment fees owed for over 30 days', await feesOwedOver30Days(new Date(now))]]))
  if (errors.error) unread.push('Recent errors')
  for (const e of errors.data ?? []) lines.push([`Error ×${e.count}`, `${e.route}: ${e.message}`.slice(0, 160)])
  // Fix F-6: every Monday (Addis Ababa date) a reminder to run the backup; it also makes sure a Monday digest is sent.
  try {
    const reminder = backupReminderLine(new Date(now))
    if (reminder) lines.push(reminder)
  } catch (err) {
    log.error('cron', 'backup reminder failed', err)
  }
  return [...unread.map((what): [string, string] => [COULD_NOT_READ, what]), ...urgent, ...lines]
}

/** Fix F-2: one audit_log row per run, read by the admin home ("Last daily run"). Never stops the job. */
async function recordRun(startedAt: number, stepsOk: number, failedSteps: string[], digestSent: boolean): Promise<void> {
  const { error } = await getAdminSupabase()
    .from('audit_log')
    .insert({ actor: 'daily job', action: DAILY_RUN_ACTION, entity_type: 'cron', entity_label: `${stepsOk} steps OK, ${failedSteps.length} failed`, diff: { started_at: iso(startedAt), finished_at: iso(Date.now()), steps_ok: stepsOk, steps_failed: failedSteps.length, failed_steps: failedSteps, digest_sent: digestSent } })
  if (error) log.error('cron', 'daily run record failed', error)
}

/**
 * Everything the daily cron does (spec 18.3). Each step is independent: one failing does not stop the others.
 * Fix F-2: the digest is sent every day (first line: when the job ran and how many steps failed), with a minimal
 * fallback if the summary cannot be built, and each run is recorded in audit_log. Only a failed send means no email.
 * `failDigestForTest` forces the fallback; the cron route passes it only in the local test environment.
 */
export async function runDaily(now = Date.now(), opts: { failDigestForTest?: boolean } = {}): Promise<DailySummary> {
  let stepsOk = 0
  const failedSteps: string[] = []
  const step = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      const result = await fn()
      stepsOk++
      return result
    } catch (err) {
      log.error('cron', `${name} failed`, err)
      failedSteps.push(name)
      return fallback
    }
  }
  const { expired, emailed } = await step('expire listings', () => expireListings(now), { expired: 0, emailed: 0 })
  const reminded = await step('reminders', () => remindExpiring(now), 0)
  const quotesExpired = await step('expire quotes', () => expireQuotes(now), 0)
  const matchReminders = await step('match reminders', () => remindUnansweredMatches(now), 0)
  const searchAlerts = await step('search alerts', () => runScheduledAlerts(now), 0)
  await step('featured', async () => void must(await getAdminSupabase().rpc('refresh_all_featured')), undefined)
  const verificationDocsPurged = await step('verification purge', () => purgeVerificationDocs(now), 0)
  const revealsPurged = await step('reveals purge', () => purgeReveals(now), 0)
  const jobsExpired = await step('expire jobs', () => expireJobs(now), 0)
  const cvsPurged = await step('cv purge', () => purgeApplicationCvs(now), 0)
  const interestPurged = await step('interest purge', () => purgeInterest(now), 0)
  // Market insight (spec 26.10): asking-price figures rebuilt from live listings once a day.
  await step('market insight', async () => void must(await getAdminSupabase().rpc('refresh_market_insight')), undefined)
  await step('agency purge', () => purgeAgencyRecords(now), 0)
  const viewingReminders = await step('viewing reminders', () => remindViewings(now), 0)
  const tenancyReminders = await step('tenancy reminders', () => remindTenancies(now), 0)
  const emailsRetried = await step('email retries', async () => (await retryOutbox(now)).sent, 0)
  // rate_limits is a pre-existing (legacy) table: expired counters are only deleted when AB switches this on.
  const rateLimitsPurged = process.env.CRON_PURGE_RATE_LIMITS === 'true' ? await step('rate limit purge', async () => (await purgeExpiredRateLimits(7), true), false) : false
  // Google data from the Imports tool: reports only, unless the owner switched the clean-up to live (lib/imports).
  const importsCleanup = await step('imports clean-up', () => runImportsCleanup({ runBy: 'daily job', now }), null)
  // Jobs personal details after 12 months (lib/jobs-cleanup): reports only, unless the owner switched it to live.
  const jobsDataCleanup = await step('jobs data clean-up', () => runJobsDataCleanup({ runBy: 'daily job', now }), null)
  // Recruitment desk: placement statuses follow the start date and the replacement guarantee (Addis Ababa dates).
  const placementsMoved = await step('recruitment desk', async () => (await runDeskDaily(now)).moved, 0)
  // Verified badges: one reminder 30 days before, endings on time; legacy badges only if the owner switched it on.
  const verification = await step('verified badges', () => runVerificationDaily(now), null)
  // Call-back requests (F3): expired wrong-number blocks are always removed, in dry run and live alike.
  const callbackBlocksRemoved = await step('call-back blocks', () => purgeExpiredCallbackBlocks(new Date(now)), null)
  // F-5: old error records and expired invitations are always cleared, in dry run and live alike (lib/retention-data).
  const housekeeping = await step('data housekeeping', () => runAlwaysOnCleanup(new Date(now)), null)
  // S6-2: a backstop for the hourly job, while catalogue ordering is on: reservations whose time has passed end.
  await step('order request expiry', async () => ((await readSupplySwitches()).catalogueOrdering ? await expireDueOrderRequests('daily job') : 0), 0)
  const summary = { expired, expiredEmailed: emailed, reminded, quotesExpired, verificationDocsPurged, revealsPurged, rateLimitsPurged, matchReminders, searchAlerts, jobsExpired, cvsPurged, emailsRetried, interestPurged, viewingReminders, tenancyReminders, importsCleanup, jobsDataCleanup, placementsMoved, verification, callbackBlocksRemoved, housekeeping }
  let digestSent = false
  const to = process.env.ADMIN_DIGEST_EMAIL
  if (to) {
    const run = runLine(new Date(now), stepsOk, failedSteps.length)
    const adminUrl = canonicalUrl('/roodber8')
    let email: RenderedEmail
    try {
      if (opts.failDigestForTest) throw new TypeError('digest failure forced by the local test')
      email = adminDigestEmail({ run, failed: failedStepsLine(failedSteps), lines: await digestLines(now, summary), adminUrl })
    } catch (err) {
      log.error('cron', 'digest failed', err)
      email = adminDigestFallbackEmail({ problem: fallbackLine(err), run, adminUrl })
    }
    digestSent = await sendEmail({ to, ...email })
  } else {
    log.error('cron', 'ADMIN_DIGEST_EMAIL is not set: no daily digest was sent')
  }
  await recordRun(now, stepsOk, failedSteps, digestSent)
  log.info('cron', 'daily done', { ...summary, stepsOk, failedSteps, digestSent })
  return { ...summary, stepsOk, failedSteps, digestSent }
}
