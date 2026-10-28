import 'server-only'
// Jobs Phase 6 (admin): loads the figures for Insights → Demand → Jobs (Owner and Operations) and the Jobs part of the
// owner's Jobs report, and hands them to the pure maths in lib/jobs-insights.ts. Counts, timings and lists of jobs only:
// it never selects a name, phone, email, note, free-text field or CV of a person, and it never reads money. The only
// fee information is "agreed in writing: yes/no" (lib/jobs-fee-agreed-data.ts). Every query follows the failure rule
// (must): on a database error the page shows an error, never zeros. Service role, server only.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { addDays, todayAddis } from '@/lib/jobs-desk'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { placementsWithFeeAgreed } from '@/lib/jobs-fee-agreed-data'
import {
  ASSIGNMENT_LABEL,
  CALLBACK_OUTCOME_LABEL,
  CHANNEL_LABEL,
  PLACEMENT_LABEL,
  REPORT_OUTCOME_LABEL,
  REPORT_STATUS_LABEL,
  cityOrSubCity,
  countBy,
  daysToFirstApplication,
  daysToFirstHire,
  deskFunnel,
  feeAgreedCounts,
  handlingHours,
  jobFlow,
  jobsReportedOften,
  jobsWithNoApplications,
  medianFigure,
  p90Figure,
  statusChanges,
  tradeName,
  tradeOf,
  unmetByArea,
  unmetByTrade,
  type Count,
  type DeskCandidate,
  type DeskFunnel,
  type DeskPlacement,
  type Figure,
  type OpenJob,
  type PlaceRow,
  type QuietJob,
  type StatusChangeRow,
  type StatusEvent,
  type TradeDemandRow,
  type AreaDemandRow,
} from '@/lib/jobs-insights'
import { REPORT_REASON_LABEL } from '@/lib/job-reports'

const OPEN_REQUEST = ['submitted', 'triaged', 'matched', 'quoted']
const OPEN_ASSIGNMENT = ['open', 'searching', 'introducing']
const RUNNING_PLACEMENT = ['hired', 'guarantee_running']
const CHUNK = 200

type Rows<R> = PromiseLike<{ data: R[] | null; error: { message: string } | null }>

/** Runs an `.in(ids)` query in parts (long id lists do not fit in one request) and joins the rows. */
async function inChunks<R>(ids: string[], run: (part: string[]) => Rows<R>): Promise<R[]> {
  const unique = Array.from(new Set(ids))
  const out: R[] = []
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data } = must(await run(unique.slice(i, i + CHUNK)))
    out.push(...(data ?? []))
  }
  return out
}

/** The places with the places above them (an area's sub-city and city), for rolling up to city or sub-city. */
export async function placesFor(ids: (string | null)[]): Promise<Map<string, PlaceRow>> {
  const db = getAdminSupabase()
  const places = new Map<string, PlaceRow>()
  let todo = Array.from(new Set(ids.filter((x): x is string => Boolean(x))))
  for (let depth = 0; todo.length && depth < 4; depth++) {
    const rows = await inChunks(todo, (part) => db.from('locations').select('id, name, display_name, level, parent_id').in('id', part))
    for (const p of rows) places.set(p.id, p)
    todo = rows.filter((p) => p.level === 'area' && p.parent_id && !places.has(p.parent_id)).map((p) => p.parent_id as string)
  }
  return places
}

export interface JobsInsights {
  statusChanges: StatusChangeRow[]
  flow: { posted: number; resubmitted: number; approved: number; sentBack: number; removed: number; expired: number }
  timeToApproval: { median: Figure; p90: Figure }
  applications: { total: number; byChannel: Count[]; byTrade: Count[]; byArea: Count[] }
  daysToFirstApplication: Figure
  quietJobs: QuietJob[]
  unmetTrade: TradeDemandRow[]
  unmetArea: AreaDemandRow[]
  callbacks: { received: number; byOutcome: Count[]; hoursToClose: Figure }
  reports: { received: number; byReason: Count[]; byStatus: Count[]; byOutcome: Count[]; hoursToHandle: Figure; jobsReportedOften: number }
  desk: {
    funnel: DeskFunnel
    assignmentsByStatus: Count[]
    placementsByStatus: Count[]
    freeReplacements: number
    guaranteesEndingSoon: number
    daysToFirstHire: Figure
    feeAgreed: { yes: number; no: number }
  }
  switches: { callbacks: boolean; phoneApply: boolean; workerRegister: boolean; recruitmentDesk: boolean }
}

/** Every Jobs figure for a period: from `sinceTs` up to `untilTs` (now when null). */
export async function jobsInsights(sinceTs: string, untilTs: string | null, now: Date = new Date()): Promise<JobsInsights> {
  const db = getAdminSupabase()
  const today = todayAddis(now)
  const range = <Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q }>(q: Q, col: string): Q => (untilTs ? q.gte(col, sinceTs).lt(col, untilTs) : q.gte(col, sinceTs))
  const head = { count: 'exact' as const, head: true }

  const [
    { data: periodEvents },
    { data: applications },
    { data: approvedJobs },
    { data: openJobs },
    { data: register },
    { data: staffingCategory },
    { data: callbacks },
    { data: reports },
    { data: assignments },
    endingSoon,
    { data: openAssignments },
  ] = must(
    await Promise.all([
      range(db.from('job_status_events').select('job_post_id'), 'created_at').limit(50000),
      range(db.from('job_applications').select('id, job_id, channel, trade, created_at'), 'created_at').limit(50000),
      range(db.from('job_posts').select('id, published_at'), 'published_at').limit(20000),
      db.from('jobs_public').select('id, title, employer_name, posted_for, trade, location_id, published_at').limit(5000),
      db.from('worker_register').select('trades').is('personal_data_deleted_at', null).limit(50000),
      db.from('service_categories').select('id').eq('slug', STAFFING_SLUG).maybeSingle(),
      range(db.from('callback_requests').select('status, outcome, created_at, handled_at'), 'created_at').limit(50000),
      range(db.from('job_reports').select('job_post_id, reason, status, outcome, created_at, handled_at'), 'created_at').limit(50000),
      range(db.from('recruitment_assignments').select('id, status, created_at'), 'created_at').limit(20000),
      db.from('recruitment_placements').select('id', head).in('status', RUNNING_PLACEMENT).gte('guarantee_ends_on', today).lte('guarantee_ends_on', addDays(today, 30)),
      db.from('recruitment_assignments').select('id').in('status', OPEN_ASSIGNMENT).limit(20000),
    ]),
  )

  const eventJobIds = (periodEvents ?? []).map((e) => e.job_post_id)
  const appJobIds = (applications ?? []).map((a) => a.job_id)
  const open = (openJobs ?? []) as OpenJob[]
  const assignmentIds = (assignments ?? []).map((a) => a.id)
  const [events, appJobs, firstApps, openApps, staffing, candidates, placements, shortlistTrades, switches] = await Promise.all([
    inChunks<StatusEvent>(eventJobIds, (part) => db.from('job_status_events').select('job_post_id, from_status, to_status, actor_kind, created_at').in('job_post_id', part).limit(50000)),
    inChunks(appJobIds, (part) => db.from('job_posts').select('id, trade, location_id').in('id', part)),
    inChunks((approvedJobs ?? []).map((j) => j.id), (part) => db.from('job_applications').select('job_id, created_at').in('job_id', part).limit(50000)),
    inChunks(open.map((j) => j.id), (part) => db.from('job_applications').select('job_id').in('job_id', part).limit(50000)),
    staffingCategory
      ? db
          .from('service_requests')
          .select('location_id')
          .eq('service_category_id', staffingCategory.id)
          .in('status', OPEN_REQUEST)
          .limit(20000)
          .then((r) => must(r).data ?? [])
      : Promise.resolve([] as { location_id: string | null }[]),
    inChunks<DeskCandidate>(assignmentIds, (part) => db.from('recruitment_candidates').select('id, assignment_id, status, consent_at, declined_at, introduced_at, consent_withdrawn_at').in('assignment_id', part).limit(50000)),
    inChunks<DeskPlacement>(assignmentIds, (part) => db.from('recruitment_placements').select('id, assignment_id, candidate_id, status, is_free_replacement, created_at').in('assignment_id', part).limit(50000)),
    inChunks((openAssignments ?? []).map((a) => a.id), (part) => db.from('recruitment_candidates').select('trade').in('assignment_id', part).limit(50000)),
    readJobsSwitches(),
  ])

  const jobById = new Map(appJobs.map((j) => [j.id, j]))
  const places = await placesFor([...appJobs.map((j) => j.location_id), ...open.map((j) => j.location_id), ...staffing.map((s) => s.location_id)])
  const agreed = await placementsWithFeeAgreed(placements.map((p) => p.id))

  const perOpenJob = new Map<string, number>()
  for (const a of openApps) perOpenJob.set(a.job_id, (perOpenJob.get(a.job_id) ?? 0) + 1)
  const apps = applications ?? []
  const flow = jobFlow(events, sinceTs, untilTs)

  return {
    statusChanges: statusChanges(events, sinceTs, untilTs),
    flow: { posted: flow.posted, resubmitted: flow.resubmitted, approved: flow.approved, sentBack: flow.sentBack, removed: flow.removed, expired: flow.expired },
    timeToApproval: { median: medianFigure(flow.hoursToApproval), p90: p90Figure(flow.hoursToApproval) },
    applications: {
      total: apps.length,
      byChannel: countBy(apps, (a) => a.channel, (k) => CHANNEL_LABEL[k] ?? k),
      byTrade: countBy(apps, (a) => tradeOf(jobById.get(a.job_id)?.trade, a.trade), tradeName),
      byArea: countBy(apps, (a) => cityOrSubCity(jobById.get(a.job_id)?.location_id, places)),
    },
    daysToFirstApplication: medianFigure(daysToFirstApplication(approvedJobs ?? [], firstApps)),
    quietJobs: jobsWithNoApplications(open, perOpenJob, places, now),
    unmetTrade: unmetByTrade({ openJobs: open, applicationsPerJob: perOpenJob, registerTrades: (register ?? []).map((r) => r.trades), shortlistTrades: shortlistTrades.map((c) => c.trade) }),
    unmetArea: unmetByArea({ openJobs: open.map((j) => ({ id: j.id, area: cityOrSubCity(j.location_id, places) })), applicationsPerJob: perOpenJob, staffingAreas: staffing.map((s) => cityOrSubCity(s.location_id, places)) }),
    callbacks: {
      received: (callbacks ?? []).length,
      byOutcome: countBy(callbacks ?? [], (c) => c.outcome ?? 'open', (k) => CALLBACK_OUTCOME_LABEL[k] ?? k),
      hoursToClose: medianFigure(handlingHours((callbacks ?? []).filter((c) => c.status === 'closed'))),
    },
    reports: {
      received: (reports ?? []).length,
      byReason: countBy(reports ?? [], (r) => r.reason, (k) => REPORT_REASON_LABEL[k] ?? k),
      byStatus: countBy(reports ?? [], (r) => r.status, (k) => REPORT_STATUS_LABEL[k] ?? k),
      byOutcome: countBy((reports ?? []).filter((r) => r.outcome), (r) => r.outcome as string, (k) => REPORT_OUTCOME_LABEL[k] ?? k),
      hoursToHandle: medianFigure(handlingHours(reports ?? [])),
      jobsReportedOften: jobsReportedOften(reports ?? []),
    },
    desk: {
      funnel: deskFunnel(assignmentIds.length, candidates, placements),
      assignmentsByStatus: countBy(assignments ?? [], (a) => a.status, (k) => ASSIGNMENT_LABEL[k] ?? k),
      placementsByStatus: countBy(placements, (p) => p.status, (k) => PLACEMENT_LABEL[k] ?? k),
      freeReplacements: placements.filter((p) => p.is_free_replacement).length,
      guaranteesEndingSoon: endingSoon.count ?? 0,
      daysToFirstHire: medianFigure(daysToFirstHire(assignments ?? [], placements)),
      feeAgreed: feeAgreedCounts(placements, agreed),
    },
    switches: { callbacks: switches.callbacks, phoneApply: switches.phoneApply, workerRegister: switches.workerRegister, recruitmentDesk: switches.recruitmentDesk },
  }
}

/** For the digest and the Jobs tab (L22): open jobs live 14 days or more with no applications. */
export async function quietJobCount(now: Date = new Date()): Promise<number> {
  const db = getAdminSupabase()
  const { data: open } = must(await db.from('jobs_public').select('id, title, employer_name, posted_for, trade, location_id, published_at').limit(5000))
  const jobs = (open ?? []) as OpenJob[]
  const apps = await inChunks(jobs.map((j) => j.id), (part) => db.from('job_applications').select('job_id').in('job_id', part).limit(50000))
  const per = new Map<string, number>()
  for (const a of apps) per.set(a.job_id, (per.get(a.job_id) ?? 0) + 1)
  return jobsWithNoApplications(jobs, per, new Map(), now).length
}

