import 'server-only'
// QC-2: proof that a person ticked the data-transfer box (W17). One row per saved form or account, with NO personal
// data: the form, the table and id or reference of the saved record, the version and the time. Writing it never
// fails the visitor's submission; a failed write is counted (errors table, form and hour only) and shown in the
// daily digest, so it is never silent (L54).
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { spamDropKey } from '@/lib/spam-check'
import { log } from '@/lib/log'
import { ACCOUNT_CONSENT_TEXT, TRANSFER_CONSENT_VERSION } from '@/lib/data-transfer'

export const CONSENT_FAILED_ROUTE = 'transfer_consent_failed'

export interface ConsentSubject {
  form: string
  subjectTable: string
  subjectId?: string | null
  subjectReference?: string | null
}

/** Adds one to the failure counter for this form and hour. Never throws. */
async function countFailure(form: string, at = new Date()): Promise<void> {
  try {
    const db = getAdminSupabase()
    const key = { route: CONSENT_FAILED_ROUTE, message: spamDropKey(form, at) }
    const { data, error } = await db.from('errors').select('id, count').eq('route', key.route).eq('message', key.message).maybeSingle()
    if (error) throw new Error(error.message)
    const now = at.toISOString()
    const write = data ? await db.from('errors').update({ count: data.count + 1, last_seen_at: now }).eq('id', data.id) : await db.from('errors').insert({ ...key, first_seen_at: now, last_seen_at: now })
    if (write.error) throw new Error(write.error.message)
  } catch (err) {
    log.error('data-transfer', 'consent failure not counted', { form, error: err instanceof Error ? err.message : 'unknown' })
  }
}

/** Writes the consent row right after a successful save. Never throws. */
export async function recordTransferConsent(s: ConsentSubject): Promise<void> {
  try {
    const { error } = await getAdminSupabase()
      .from('data_transfer_consents')
      .insert({ form: s.form.slice(0, 60), subject_table: s.subjectTable.slice(0, 60), subject_id: s.subjectId ?? null, subject_reference: s.subjectReference ? s.subjectReference.slice(0, 60) : null, consent_version: TRANSFER_CONSENT_VERSION })
    if (error) throw new Error(error.message)
  } catch (err) {
    log.error('data-transfer', 'consent record not saved', { form: s.form, error: err instanceof Error ? err.message : 'unknown' })
    await countFailure(s.form)
  }
}

/** Failed consent records since a moment (the digest's last 24 hours), as a head-count-like result. */
export async function consentFailuresSince(since: string): Promise<{ count: number | null; error: { message: string } | null }> {
  try {
    const { data } = await readAll(() => getAdminSupabase().from('errors').select('id, count').eq('route', CONSENT_FAILED_ROUTE).gte('last_seen_at', since), { maxRows: REPORT_MAX_ROWS })
    return { count: data.reduce((sum, r) => sum + r.count, 0), error: null }
  } catch (err) {
    return { count: null, error: { message: err instanceof Error ? err.message : 'unknown' } }
  }
}

/**
 * Has this account confirmed the data-transfer notice? A read that fails counts as confirmed (logged), so an outage
 * never locks people out of their account.
 */
export async function accountConsented(userId: string): Promise<boolean> {
  const { data, error } = await getAdminSupabase().from('data_transfer_consents').select('id').eq('subject_table', 'profiles').eq('subject_id', userId).limit(1)
  if (error) {
    log.error('data-transfer', 'account consent could not be read', error)
    return true
  }
  return (data ?? []).length > 0
}

/** For signed-in-only form actions: the approved refusal while the account notice is not confirmed, otherwise null. */
export async function accountConsentRefusal(userId: string): Promise<string | null> {
  return (await accountConsented(userId)) ? null : ACCOUNT_CONSENT_TEXT.refusal
}
