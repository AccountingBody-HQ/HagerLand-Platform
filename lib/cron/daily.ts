import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PRIVATE_BUCKET } from '@/lib/media'
import { sendEmail } from '@/lib/email/send'
import { adminDigestEmail, listingExpiredEmail, listingExpiringEmail } from '@/lib/email/templates'
import { firstName, ownerEmails } from '@/lib/admin/notify'
import { purgeExpiredRateLimits } from '@/lib/rate-limit'
import { revalidateEntity } from '@/lib/revalidate'
import { QUOTE_VALID_DAYS } from '@/lib/listing-rules'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'

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

async function purgeReveals(now: number): Promise<number> {
  const { data } = await getAdminSupabase().from('contact_reveals').delete().lt('created_at', iso(now - 365 * DAY)).select('id')
  return data?.length ?? 0
}

/** Lines for the admin digest; empty when there is nothing to report. */
async function digestLines(now: number, s: Omit<DailySummary, 'digestSent'>): Promise<[string, string][]> {
  const db = getAdminSupabase()
  const head = { count: 'exact' as const, head: true }
  const since = iso(now - DAY)
  const [pProps, pDevs, pOrgs, pPortfolio, claims, verifs, reports, enq, enqUnanswered, quotes, quotesOpen, signups, expiring, errors] = await Promise.all([
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
  ])
  const n = (r: { count: number | null }) => r.count ?? 0
  const lines: [string, string][] = []
  const add = (label: string, value: number) => value > 0 && lines.push([label, String(value)])
  add('Properties waiting for review', n(pProps))
  add('Developments waiting for review', n(pDevs))
  add('Businesses waiting for review', n(pOrgs))
  add('Portfolio projects waiting for review', n(pPortfolio))
  add('Claims to decide', n(claims))
  add('Verification requests', n(verifs))
  add('Open reports', n(reports))
  add('New enquiries (24 h)', n(enq))
  add('Enquiries unopened over 48 h', n(enqUnanswered))
  add('New quote requests (24 h)', n(quotes))
  add('Quotes waiting for a price', n(quotesOpen))
  add('New sign-ups (24 h)', n(signups))
  add('Listings expiring within 7 days', n(expiring))
  add('Listings expired today', s.expired)
  add('Quotes expired today', s.quotesExpired)
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
  await step('featured', async () => void (await getAdminSupabase().rpc('refresh_all_featured')), undefined)
  const verificationDocsPurged = await step('verification purge', () => purgeVerificationDocs(now), 0)
  const revealsPurged = await step('reveals purge', () => purgeReveals(now), 0)
  // rate_limits is a pre-existing (legacy) table: expired counters are only deleted when AB switches this on.
  const rateLimitsPurged = process.env.CRON_PURGE_RATE_LIMITS === 'true' ? await step('rate limit purge', async () => (await purgeExpiredRateLimits(7), true), false) : false
  const summary = { expired, expiredEmailed: emailed, reminded, quotesExpired, verificationDocsPurged, revealsPurged, rateLimitsPurged }
  let digestSent = false
  const to = process.env.ADMIN_DIGEST_EMAIL
  if (to) {
    const lines = await step('digest', () => digestLines(now, summary), [] as [string, string][])
    if (lines.length) digestSent = await sendEmail({ to, ...adminDigestEmail({ lines, adminUrl: canonicalUrl('/roodber8') }) })
  }
  log.info('cron', 'daily done', { ...summary, digestSent })
  return { ...summary, digestSent }
}
