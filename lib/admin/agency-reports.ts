import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { daysBetween, OPEN_STAGES } from '@/lib/agency'

export interface AgencyKpis {
  openInstructions: number
  byStage: Record<string, number>
  valuations: number
  valuationsBooked: number
  viewings: number
  viewingsUpcoming: number
  offers: number
  offersAccepted: number
  applications: number
  completions: number
  avgDaysOnMarket: number | null
  feeIncomeEtb: number
  tenanciesActive: number
}

/** Agency reports (spec 26.5, 26.14) over a period: instructions, valuations, viewings, offers, completions, days on market, fees. */
export async function agencyKpis(since: Date): Promise<AgencyKpis> {
  const db = getAdminSupabase()
  const iso = since.toISOString()
  const [ins, val, vw, off, app, done, deals, ten] = await Promise.all([
    db.from('agency_instructions').select('stage').in('stage', OPEN_STAGES).limit(10000),
    db.from('agency_valuations').select('status').gte('created_at', iso).limit(10000),
    db.from('agency_viewings').select('status, scheduled_at').gte('created_at', iso).limit(10000),
    db.from('agency_offers').select('status').gte('created_at', iso).limit(10000),
    db.from('rental_applications').select('id', { count: 'exact', head: true }).gte('created_at', iso),
    db.from('agency_instructions').select('live_at, completed_at').eq('stage', 'completed').gte('completed_at', iso).limit(10000),
    db.from('deals').select('commission_minor').in('source_type', ['agency_instruction', 'tenancy']).gte('created_at', iso).limit(10000),
    db.from('tenancies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  const byStage: Record<string, number> = {}
  for (const r of ins.data ?? []) byStage[r.stage] = (byStage[r.stage] ?? 0) + 1
  const marketed = (done.data ?? []).filter((r) => r.live_at && r.completed_at)
  const now = Date.now()
  return {
    openInstructions: (ins.data ?? []).length,
    byStage,
    valuations: (val.data ?? []).length,
    valuationsBooked: (val.data ?? []).filter((v) => v.status === 'booked' || v.status === 'completed').length,
    viewings: (vw.data ?? []).length,
    viewingsUpcoming: (vw.data ?? []).filter((v) => v.status === 'confirmed' && v.scheduled_at && new Date(v.scheduled_at).getTime() > now).length,
    offers: (off.data ?? []).length,
    offersAccepted: (off.data ?? []).filter((o) => o.status === 'accepted').length,
    applications: app.count ?? 0,
    completions: (done.data ?? []).length,
    avgDaysOnMarket: marketed.length ? Math.round(marketed.reduce((n, r) => n + daysBetween(r.live_at as string, r.completed_at as string), 0) / marketed.length) : null,
    feeIncomeEtb: Math.round((deals.data ?? []).reduce((n, d) => n + (d.commission_minor ?? 0), 0) / 100),
    tenanciesActive: ten.count ?? 0,
  }
}
