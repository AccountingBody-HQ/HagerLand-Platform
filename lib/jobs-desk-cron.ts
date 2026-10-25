import 'server-only'
// Jobs Phase 3: the recruitment desk's part of the daily job. Placements move from "hired" to "guarantee running" on the
// start date and to "completed" the day after the guarantee ends (Addis Ababa dates); the keeping date of each placement
// is refreshed once the owner has set the keeping period; the digest gets three counts (no names, no money).
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { addDays, nextPlacementStatus, retainUntil, todayAddis } from '@/lib/jobs-desk'
import { log } from '@/lib/log'

export async function runDeskDaily(now: number): Promise<{ moved: number }> {
  const db = getAdminSupabase()
  const today = todayAddis(new Date(now))
  const { data: running, error } = await db.from('recruitment_placements').select('id, status, start_date, guarantee_ends_on, retain_until').neq('status', 'cancelled').limit(5000)
  if (error) throw new Error(error.message)
  let moved = 0
  for (const p of running ?? []) {
    const next = nextPlacementStatus({ status: p.status, start_date: p.start_date, guarantee_ends_on: p.guarantee_ends_on ?? p.start_date }, today)
    if (!next) continue
    const { error: e } = await db.from('recruitment_placements').update({ status: next }).eq('id', p.id).eq('status', p.status)
    if (e) log.error('jobs-desk', 'placement status move failed', e, { placement: p.id })
    else moved++
  }
  const months = (await readJobsSwitches()).retentionMonths
  if (months !== null && (running ?? []).length) {
    const ids = (running ?? []).map((p) => p.id)
    const { data: terms } = await db.from('recruitment_fee_terms').select('id, placement_id').in('placement_id', ids)
    const termIds = (terms ?? []).map((t) => t.id)
    const { data: entries } = termIds.length ? await db.from('recruitment_fee_entries').select('fee_terms_id, occurred_on').in('fee_terms_id', termIds) : { data: [] }
    for (const p of running ?? []) {
      const mine = new Set((terms ?? []).filter((t) => t.placement_id === p.id).map((t) => t.id))
      const last = (entries ?? []).filter((e) => mine.has(e.fee_terms_id)).reduce<string | null>((m, e) => (!m || e.occurred_on > m ? e.occurred_on : m), null)
      const until = retainUntil(p.guarantee_ends_on ?? p.start_date, last, months)
      if (until !== p.retain_until) await db.from('recruitment_placements').update({ retain_until: until }).eq('id', p.id)
    }
  }
  return { moved }
}

/** Digest counts (failure-isolated by the caller): open assignments, consents waiting, guarantees ending within 7 days. */
export async function deskDigestCounts(now: number): Promise<[string, number][]> {
  const db = getAdminSupabase()
  const head = { count: 'exact' as const, head: true }
  const today = todayAddis(new Date(now))
  const [open, waiting, ending] = await Promise.all([
    db.from('recruitment_assignments').select('id', head).in('status', ['open', 'searching', 'introducing']),
    db.from('recruitment_candidates').select('id', head).eq('status', 'asked').is('personal_data_deleted_at', null),
    db.from('recruitment_placements').select('id', head).in('status', ['hired', 'guarantee_running']).gte('guarantee_ends_on', today).lte('guarantee_ends_on', addDays(today, 7)),
  ])
  return [
    ['Recruitment desk: open assignments', open.count ?? 0],
    ['Recruitment desk: people asked, answer not recorded yet', waiting.count ?? 0],
    ['Recruitment desk: replacement guarantees ending within 7 days', ending.count ?? 0],
  ]
}
