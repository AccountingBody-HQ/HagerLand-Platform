import 'server-only'
// Jobs Phase 4: the recorded verification check (database side). Recording a check gives the "Verified" badge;
// revoking or the end date takes it away (the business keeps "Claimed" if someone manages it, else "Listed").
// The daily job sends one reminder 30 days before a badge ends, ends badges on time, ends "needs re-check" records
// after 30 days and, only while the owner's legacy clean-up switch is on, gives legacy badges 90 days (F3).
import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { log } from '@/lib/log'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { badgeEndingEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatDate } from '@/lib/format'
import { todayAddis } from '@/lib/jobs-desk'
import { VERIFICATION_EXPIRY_KEY, VERIFICATION_EXPIRY_STARTED_KEY, hasEnded, inReminderWindow, isLiveRecord, legacyEndsOn, levelAfterBadge, recordEndsOn, reminderDay, validUntil, type CheckMethod } from '@/lib/verification'

export interface LiveRecord {
  id: string
  verified_at: string
  valid_until: string
  ends_on: string
  status: string
}

const RECORD_COLUMNS = 'id, organisation_id, status, verified_at, valid_until, needs_recheck_since'

/** Live (badge-carrying) new-standard records for these businesses, keyed by business id. */
export async function liveRecords(orgIds: string[]): Promise<Map<string, LiveRecord>> {
  const out = new Map<string, LiveRecord>()
  const ids = Array.from(new Set(orgIds.filter(Boolean)))
  if (!ids.length) return out
  const { data } = await readAllIn(ids, (part) => getAdminSupabase().from('employer_verifications').select(RECORD_COLUMNS).in('organisation_id', part).in('status', ['active', 'needs_recheck']), { maxRows: REPORT_MAX_ROWS })
  const today = todayAddis()
  for (const r of data ?? []) if (isLiveRecord(r, today)) out.set(r.organisation_id, { id: r.id, verified_at: r.verified_at, valid_until: r.valid_until, ends_on: recordEndsOn(r), status: r.status })
  return out
}

export async function liveRecord(orgId: string): Promise<LiveRecord | null> {
  return (await liveRecords([orgId])).get(orgId) ?? null
}

/** The owner's legacy clean-up: null while off, else the Addis date it was switched on. */
export async function legacyCleanupStartedOn(): Promise<string | null> {
  const { data } = await getAdminSupabase().from('site_settings').select('key, value').in('key', [VERIFICATION_EXPIRY_KEY, VERIFICATION_EXPIRY_STARTED_KEY])
  const on = (data ?? []).find((r) => r.key === VERIFICATION_EXPIRY_KEY)?.value === true
  const started = (data ?? []).find((r) => r.key === VERIFICATION_EXPIRY_STARTED_KEY)?.value
  return on && typeof started === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(started) ? started : null
}

export interface CheckInput {
  licence_number: string
  licence_expires_on: string | null
  licence_checked_at: string
  licence_check_method: CheckMethod
  tin_checked_at: string
  phone_checked_at: string
  phone_check_note: string | null
  site_visit_at: string | null
}

/**
 * Records a check and gives the badge. Any earlier live record ends (the new one replaces it). A pending verification
 * request for the business is marked approved. Returns the new end date.
 */
export async function recordCheck(orgId: string, input: CheckInput, actor: string): Promise<{ ok: true; validUntil: string; requestId: string | null } | { ok: false; error: string }> {
  const db = getAdminSupabase()
  const now = new Date()
  const until = validUntil(now, input.licence_expires_on)
  if (until < todayAddis(now)) return { ok: false, error: 'The licence has already expired: the badge cannot be given.' }
  await db.from('employer_verifications').update({ status: 'expired' }).eq('organisation_id', orgId).in('status', ['active', 'needs_recheck'])
  const { data: rec, error } = await db
    .from('employer_verifications')
    .insert({ organisation_id: orgId, ...input, verified_by: actor.slice(0, 120), verified_at: now.toISOString(), valid_until: until })
    .select('id')
    .single()
  if (error || !rec) {
    log.error('verification', 'record insert failed', error)
    return { ok: false, error: 'Could not record the check.' }
  }
  const { error: orgError } = await db.from('organisations').update({ verification_level: 'verified', verified_at: now.toISOString(), trade_licence_number: input.licence_number }).eq('id', orgId)
  if (orgError) {
    log.error('verification', 'badge update failed', orgError)
    return { ok: false, error: 'The check was recorded but the badge could not be given. Try again.' }
  }
  // The licence number written above can flag the record for re-check (name or licence change): this is the check.
  await db.from('employer_verifications').update({ status: 'active', needs_recheck_since: null }).eq('id', rec.id)
  const { data: pending } = await db.from('verification_requests').update({ status: 'approved', decided_at: now.toISOString() }).eq('org_id', orgId).eq('status', 'pending').select('id').maybeSingle()
  return { ok: true, validUntil: until, requestId: pending?.id ?? null }
}

async function lowerBadge(orgId: string): Promise<void> {
  const db = getAdminSupabase()
  const { count } = await db.from('organisation_members').select('user_id', { count: 'exact', head: true }).eq('org_id', orgId)
  const { error } = await db.from('organisations').update({ verification_level: levelAfterBadge((count ?? 0) > 0), verified_at: null }).eq('id', orgId).eq('verification_level', 'verified')
  if (error) throw new Error(error.message)
}

/** Takes the badge away now, with a reason. Works for new-standard and legacy badges. */
export async function revokeBadge(orgId: string, reason: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminSupabase()
  const { error } = await db.from('employer_verifications').update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: actor.slice(0, 120), revoked_reason: reason.slice(0, 500) }).eq('organisation_id', orgId).in('status', ['active', 'needs_recheck'])
  if (error) return { ok: false, error: 'Could not revoke the badge.' }
  try {
    await lowerBadge(orgId)
  } catch (err) {
    log.error('verification', 'lowering the badge failed', err)
    return { ok: false, error: 'Could not remove the badge. Try again.' }
  }
  return { ok: true }
}

/** Sends one reminder (unique per business, kind and end date). Returns whether this call sent it. */
async function notifyOnce(orgId: string, kind: 'ending_reminder' | 'ended', forDate: string, verificationId: string | null): Promise<boolean> {
  const { error } = await getAdminSupabase().from('org_verification_notices').insert({ organisation_id: orgId, kind, for_date: forDate, verification_id: verificationId })
  if (error) return false
  if (kind === 'ending_reminder') {
    const to = await orgManagerEmails(orgId)
    if (to.length) await sendEmail({ to, ...badgeEndingEmail({ date: formatDate(forDate), link: canonicalUrl('/account/company/verification') }) })
  }
  return true
}

export interface VerificationDailyCounts {
  reminders: number
  ended: number
  legacyReminders: number
  legacyEnded: number
}

/** The daily step: reminders 30 days before, endings on time, and the legacy clean-up only when switched on. */
export async function runVerificationDaily(now: number): Promise<VerificationDailyCounts> {
  const db = getAdminSupabase()
  const today = todayAddis(new Date(now))
  const counts: VerificationDailyCounts = { reminders: 0, ended: 0, legacyReminders: 0, legacyEnded: 0 }
  const { data: live } = await readAll(() => db.from('employer_verifications').select(RECORD_COLUMNS).in('status', ['active', 'needs_recheck']), { maxRows: REPORT_MAX_ROWS })
  for (const r of live ?? []) {
    const ends = recordEndsOn(r)
    try {
      if (hasEnded(ends, today)) {
        const { error: e } = await db.from('employer_verifications').update({ status: 'expired' }).eq('id', r.id).in('status', ['active', 'needs_recheck'])
        if (e) throw new Error(e.message)
        await lowerBadge(r.organisation_id)
        await notifyOnce(r.organisation_id, 'ended', ends, r.id)
        counts.ended++
      } else if (inReminderWindow(ends, today) && (await notifyOnce(r.organisation_id, 'ending_reminder', ends, r.id))) {
        counts.reminders++
      }
    } catch (err) {
      log.error('verification', 'daily step failed for a record', err, { record: r.id })
    }
  }
  const started = await legacyCleanupStartedOn()
  if (started) {
    const ends = legacyEndsOn(started)
    const { data: verified } = await readAll(() => db.from('organisations').select('id').eq('verification_level', 'verified').eq('is_hagerland', false), { maxRows: REPORT_MAX_ROWS })
    const ids = (verified ?? []).map((o) => o.id)
    const { data: withRecord } = await readAllIn(ids, (part) => db.from('employer_verifications').select('organisation_id').in('organisation_id', part), { maxRows: REPORT_MAX_ROWS })
    const hasRecord = new Set((withRecord ?? []).map((r) => r.organisation_id))
    for (const id of ids.filter((x) => !hasRecord.has(x))) {
      try {
        if (hasEnded(ends, today)) {
          await lowerBadge(id)
          await notifyOnce(id, 'ended', ends, null)
          counts.legacyEnded++
        } else if (today >= reminderDay(ends) && (await notifyOnce(id, 'ending_reminder', ends, null))) {
          counts.legacyReminders++
        }
      } catch (err) {
        log.error('verification', 'legacy clean-up failed for a business', err, { org: id })
      }
    }
  }
  return counts
}

/** Digest counts (W22): badges ending within 30 days, and badges ended today. */
export async function verificationDigestCounts(now: number): Promise<[string, number][]> {
  const db = getAdminSupabase()
  const today = todayAddis(new Date(now))
  const { data: live } = await readAll(() => db.from('employer_verifications').select(RECORD_COLUMNS).in('status', ['active', 'needs_recheck']), { maxRows: REPORT_MAX_ROWS })
  let ending = (live ?? []).filter((r) => isLiveRecord(r, today) && inReminderWindow(recordEndsOn(r), today)).length
  const started = await legacyCleanupStartedOn()
  if (started && inReminderWindow(legacyEndsOn(started), today)) {
    const { data: verified } = await readAll(() => db.from('organisations').select('id').eq('verification_level', 'verified').eq('is_hagerland', false), { maxRows: REPORT_MAX_ROWS })
    const ids = (verified ?? []).map((o) => o.id)
    const { data: withRecord } = await readAllIn(ids, (part) => db.from('employer_verifications').select('organisation_id').in('organisation_id', part), { maxRows: REPORT_MAX_ROWS })
    const hasRecord = new Set((withRecord ?? []).map((r) => r.organisation_id))
    ending += ids.filter((x) => !hasRecord.has(x)).length
  }
  const { count: endedToday } = await db.from('org_verification_notices').select('id', { count: 'exact', head: true }).eq('kind', 'ended').gte('sent_at', new Date(`${today}T00:00:00+03:00`).toISOString())
  return [
    ['Verified badges ending within 30 days', ending],
    ['Verified badges ended today', endedToday ?? 0],
  ]
}

export type AccountBadgeState =
  | { kind: 'live'; endsOn: string; dueSoon: boolean }
  | { kind: 'legacy'; endsOn: string | null; dueSoon: boolean }
  | { kind: 'ended' }
  | { kind: 'none' }

/** What the business's own "Get Verified" page says (W9–W11; legacy badges keep the original wording). */
export async function accountBadgeState(orgId: string, level: string): Promise<AccountBadgeState> {
  const today = todayAddis()
  if (level === 'verified') {
    const live = await liveRecord(orgId)
    if (live) return { kind: 'live', endsOn: live.ends_on, dueSoon: inReminderWindow(live.ends_on, today) }
    const started = await legacyCleanupStartedOn()
    const endsOn = started ? legacyEndsOn(started) : null
    return { kind: 'legacy', endsOn, dueSoon: Boolean(endsOn && inReminderWindow(endsOn, today)) }
  }
  const db = getAdminSupabase()
  const [{ count: records }, { count: notices }] = await Promise.all([
    db.from('employer_verifications').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).in('status', ['expired', 'revoked']),
    db.from('org_verification_notices').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('kind', 'ended'),
  ])
  return (records ?? 0) + (notices ?? 0) > 0 ? { kind: 'ended' } : { kind: 'none' }
}
