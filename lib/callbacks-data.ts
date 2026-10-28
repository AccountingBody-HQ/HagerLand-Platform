import 'server-only'
// Jobs Phase 5: call-back requests in the database (server only; the tables have no grants). The public form adds
// requests; Owner and Operations handle them in admin; the daily job clears them after 12 months (with the other Jobs
// data, dry run until the owner switches it) and always removes expired wrong-number blocks.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hashIp } from '@/lib/security'
import { log } from '@/lib/log'
import { CALLBACK_LIMITS, applyOutcome, blockedUntil, clearedCallback, type CallbackInput, type CallbackOutcome } from '@/lib/callbacks'

/** The coded phone number kept by the block list (never the number itself). */
export function phoneHash(phone: string): string {
  return hashIp(`callback-phone:${phone}`)
}

export type SubmitOutcome = 'created' | 'repeat' | 'blocked' | 'error'

/**
 * Adds a request unless the number is blocked, already has an open request (database rule) or has asked twice this
 * week. Blocked and repeat numbers get the same thank-you as a new request and no new row (W13).
 */
export async function submitCallback(d: CallbackInput, ipHash: string, now: Date = new Date()): Promise<SubmitOutcome> {
  const db = getAdminSupabase()
  const { data: block, error: blockError } = await db.from('callback_blocked_phones').select('blocked_until').eq('phone_hash', phoneHash(d.phone)).gt('blocked_until', now.toISOString()).maybeSingle()
  if (blockError) {
    log.error('callbacks', 'block check failed', blockError)
    return 'error'
  }
  if (block) return 'blocked'
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const { count, error: countError } = await db.from('callback_requests').select('id', { count: 'exact', head: true }).eq('phone', d.phone).gte('created_at', weekAgo)
  if (countError) {
    log.error('callbacks', 'weekly count failed', countError)
    return 'error'
  }
  if ((count ?? 0) >= CALLBACK_LIMITS.perPhoneWeek) return 'repeat'
  const { error } = await db.from('callback_requests').insert({
    name: d.name,
    phone: d.phone,
    need: d.need,
    area_text: d.area,
    language: d.language,
    time_of_day: d.time_of_day,
    based_abroad: d.based_abroad,
    country_code: d.country_code,
    consent_at: now.toISOString(),
    ip_hash: ipHash,
  })
  if (error) {
    if (error.code === '23505') return 'repeat'
    log.error('callbacks', 'insert failed', error)
    return 'error'
  }
  return 'created'
}

export interface CallbackRow {
  id: string
  reference: string
  name: string | null
  phone: string | null
  need: string | null
  area_text: string | null
  language: string | null
  time_of_day: string | null
  based_abroad: boolean
  country_code: string | null
  status: string
  outcome: string | null
  tries: number
  service_request_id: string | null
  handled_by: string | null
  handled_at: string | null
  staff_note: string | null
  personal_data_deleted_at: string | null
  created_at: string
}

const COLUMNS = 'id, reference, name, phone, need, area_text, language, time_of_day, based_abroad, country_code, status, outcome, tries, service_request_id, handled_by, handled_at, staff_note, personal_data_deleted_at, created_at'

/** The staff queue: open requests (oldest first) and the 50 most recently closed. */
export async function callbackQueue(): Promise<{ open: CallbackRow[]; closed: CallbackRow[] }> {
  const db = getAdminSupabase()
  const [open, closed] = await Promise.all([
    db.from('callback_requests').select(COLUMNS).eq('status', 'open').order('created_at', { ascending: true }).limit(200),
    db.from('callback_requests').select(COLUMNS).eq('status', 'closed').order('handled_at', { ascending: false }).limit(50),
  ])
  if (open.error || closed.error) throw new Error((open.error ?? closed.error)?.message)
  return { open: open.data ?? [], closed: closed.data ?? [] }
}

/** One open request, for the staffing form pre-fill (staff only). */
export async function openCallback(id: string): Promise<CallbackRow | null> {
  const { data } = await getAdminSupabase().from('callback_requests').select(COLUMNS).eq('id', id).eq('status', 'open').is('personal_data_deleted_at', null).maybeSingle()
  return data ?? null
}

/**
 * Records what happened on a call. "No answer" counts the try and closes the request on the third. "Wrong number /
 * did not ask" clears the details at once and blocks the coded number for 30 days.
 */
export async function recordCallbackOutcome(id: string, outcome: CallbackOutcome, note: string | null, actor: string, now: Date = new Date()): Promise<{ ok: true; closed: boolean } | { ok: false }> {
  const db = getAdminSupabase()
  const { data: row } = await db.from('callback_requests').select('id, phone, tries, status').eq('id', id).maybeSingle()
  if (!row || row.status !== 'open') return { ok: false }
  const next = applyOutcome(outcome, row.tries)
  const at = now.toISOString()
  if (next.block && row.phone) {
    const { error } = await db.from('callback_blocked_phones').upsert({ phone_hash: phoneHash(row.phone), blocked_until: blockedUntil(now), created_at: at })
    if (error) {
      log.error('callbacks', 'block failed', error)
      return { ok: false }
    }
  }
  const update = {
    status: next.status,
    outcome: next.outcome,
    tries: next.tries,
    handled_by: actor.slice(0, 120),
    handled_at: at,
    ...(note ? { staff_note: note.slice(0, 1000) } : {}),
    ...(next.clearNow ? clearedCallback(at) : {}),
  }
  const { error } = await db.from('callback_requests').update(update).eq('id', id).eq('status', 'open')
  if (error) {
    log.error('callbacks', 'outcome failed', error)
    return { ok: false }
  }
  return { ok: true, closed: next.status === 'closed' }
}

/** "Called — turned into a staffing request": links the request staff sent through the staffing form and closes the call-back. */
export async function linkCallbackToRequest(id: string, serviceRequestReference: string, actor: string, now: Date = new Date()): Promise<boolean> {
  const db = getAdminSupabase()
  const { data: sr } = await db.from('service_requests').select('id').eq('reference', serviceRequestReference).maybeSingle()
  if (!sr) return false
  const { data, error } = await db
    .from('callback_requests')
    .update({ status: 'closed', outcome: 'staffing_request', service_request_id: sr.id, handled_by: actor.slice(0, 120), handled_at: now.toISOString() })
    .eq('id', id)
    .eq('status', 'open')
    .select('id')
  if (error) log.error('callbacks', 'link to staffing request failed', error)
  return !error && (data ?? []).length > 0
}

/** Daily (F3): removes expired wrong-number blocks, whatever the deletion mode. Returns how many were removed. */
export async function purgeExpiredCallbackBlocks(now: Date = new Date()): Promise<number> {
  const { data, error } = await getAdminSupabase().from('callback_blocked_phones').delete().lte('blocked_until', now.toISOString()).select('phone_hash')
  if (error) throw new Error(error.message)
  return (data ?? []).length
}

/** For the admin digest: requests waiting for a call. */
export async function waitingCallbacks(): Promise<number> {
  const { count, error } = await getAdminSupabase().from('callback_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')
  if (error) throw new Error(error.message)
  return count ?? 0
}
