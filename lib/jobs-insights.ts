// Jobs Phase 6 (admin): the maths behind Insights → Demand → Jobs and the owner's Jobs report. Pure and deterministic
// (no database calls), unit-tested. Counts and timings only: no names, no contact details, no free text and no money.
// Dates are Ethiopian (Africa/Addis_Ababa, UTC+3 all year). A median, percentile or rate needs at least 3 data points.
import { addDays, todayAddis } from '@/lib/jobs-desk'
import { tradeLabel } from '@/lib/jobs'

/** The same rule as Supplies (lib/supply/insights.ts MIN_SAMPLE); a unit test keeps the two equal. */
export const JOBS_MIN_SAMPLE = 3
/** A live job with no applications after this many days is listed (C2-11). */
export const NO_APPLICATION_DAYS = 14
/** "Few candidates": fewer than this many applications per open job and register entries (C2-12). */
export const FEW_CANDIDATES = 3
export const PERIOD_CHOICES = [30, 90, 365] as const
export const DEFAULT_PERIOD = 90

const HOUR = 3_600_000
const DAY = 86_400_000

/* ------------------------------------------------------------------ Periods ------------------------------------------------------------------ */

/** The period in days from the page address: 30, 90 or 365, or a custom 1–1825; otherwise 90 (as Demand → Supplies). */
export function periodDays(param: string | undefined): number {
  const n = Number(param)
  if (PERIOD_CHOICES.some((d) => String(d) === param)) return n
  return Number.isInteger(n) && n >= 1 && n <= 1825 ? n : DEFAULT_PERIOD
}

/** The start of the period: the start of that day in Addis Ababa, `days` days before today (as Demand → Supplies). */
export function periodSince(days: number, now: Date = new Date()): string {
  return new Date(`${addDays(todayAddis(now), -days)}T00:00:00+03:00`).toISOString()
}

export interface MonthRange {
  month: string
  /** First moment of the month in Addis Ababa, as UTC ISO. */
  startTs: string
  /** First moment of the next month in Addis Ababa, as UTC ISO. */
  nextTs: string
  /** Last day of the month (YYYY-MM-DD). */
  monthEnd: string
  /** The month end, or today when the month is not over. */
  asOf: string
}

export function isMonth(v: string | null | undefined): v is string {
  return Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v))
}

/** An Addis Ababa calendar month; an invalid month gives the current one. */
export function monthRange(param: string | null | undefined, now: Date = new Date()): MonthRange {
  const today = todayAddis(now)
  const month = isMonth(param) ? param : today.slice(0, 7)
  const start = `${month}-01`
  const d = new Date(`${start}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + 1)
  const next = d.toISOString().slice(0, 10)
  const monthEnd = addDays(next, -1)
  return {
    month,
    startTs: new Date(`${start}T00:00:00+03:00`).toISOString(),
    nextTs: new Date(`${next}T00:00:00+03:00`).toISOString(),
    monthEnd,
    asOf: monthEnd < today ? monthEnd : today,
  }
}

export function inRange(ts: string | null | undefined, sinceTs: string, untilTs: string | null): boolean {
  if (!ts) return false
  const t = new Date(ts).getTime()
  return t >= new Date(sinceTs).getTime() && (untilTs === null || t < new Date(untilTs).getTime())
}

/** Whole days between two Addis dates (YYYY-MM-DD). */
export function daysBetweenDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY)
}

/* ---------------------------------------------------------------- Statistics ---------------------------------------------------------------- */

export interface Figure {
  value: number | null
  n: number
  enough: boolean
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Nearest-rank percentile (p between 0 and 100). */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  return s[Math.min(s.length, Math.max(1, Math.ceil((p / 100) * s.length))) - 1]
}

const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10)

/** A median of the values, shown only from 3 data points. */
export function medianFigure(values: number[]): Figure {
  return { value: round1(median(values)), n: values.length, enough: values.length >= JOBS_MIN_SAMPLE }
}

export function p90Figure(values: number[]): Figure {
  return { value: round1(percentile(values, 90)), n: values.length, enough: values.length >= JOBS_MIN_SAMPLE }
}

export function hoursBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / HOUR
}

export function daysBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / DAY
}

export interface Count {
  key: string
  label: string
  count: number
}

/** Counts per key, biggest first, then by label. */
export function countBy<T>(items: T[], key: (x: T) => string, label: (k: string) => string = (k) => k): Count[] {
  const m = new Map<string, number>()
  for (const x of items) m.set(key(x), (m.get(key(x)) ?? 0) + 1)
  return Array.from(m.entries())
    .map(([k, count]) => ({ key: k, label: label(k), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/* ---------------------------------------------------------------- Status history ---------------------------------------------------------------- */

export interface StatusEvent {
  job_post_id: string
  from_status: string | null
  to_status: string
  actor_kind: string
  created_at: string
}

export const ACTOR_KINDS = ['employer', 'staff', 'system', 'server'] as const
export type ActorKind = (typeof ACTOR_KINDS)[number]
export const ACTOR_LABEL: Record<ActorKind, string> = { employer: 'By the employer', staff: 'By HagerLand staff', system: 'By the daily job', server: 'Other' }

export const STATUS_CHANGE_LABEL: Record<string, string> = {
  pending_review: 'Sent for review',
  published: 'Approved or back on the board',
  rejected: 'Sent back',
  paused: 'Paused',
  archived: 'Closed',
  expired: 'Closed on the closing date',
  removed: 'Removed',
  draft: 'Saved as a draft',
}
const STATUS_ORDER = ['pending_review', 'published', 'rejected', 'paused', 'archived', 'expired', 'removed', 'draft']

export interface StatusChangeRow {
  status: string
  label: string
  byActor: Record<ActorKind, number>
  total: number
}

/** Every status change in the period, by the new status and who made it. */
export function statusChanges(events: StatusEvent[], sinceTs: string, untilTs: string | null): StatusChangeRow[] {
  const rows = new Map<string, StatusChangeRow>()
  for (const e of events) {
    if (!inRange(e.created_at, sinceTs, untilTs)) continue
    const row = rows.get(e.to_status) ?? { status: e.to_status, label: STATUS_CHANGE_LABEL[e.to_status] ?? e.to_status, byActor: { employer: 0, staff: 0, system: 0, server: 0 }, total: 0 }
    const actor = (ACTOR_KINDS as readonly string[]).includes(e.actor_kind) ? (e.actor_kind as ActorKind) : 'server'
    row.byActor[actor]++
    row.total++
    rows.set(e.to_status, row)
  }
  return Array.from(rows.values()).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
}

export interface JobFlow {
  /** Jobs sent for review for the first time in the period. */
  posted: number
  /** Sent for review again (after being sent back, paused or closed). */
  resubmitted: number
  /** Jobs approved for the first time in the period. */
  approved: number
  /** Every send-back in the period (a job sent back twice counts 2). */
  sentBack: number
  removed: number
  expired: number
  /** Hours from the first submission to the first approval, for jobs first approved in the period. */
  hoursToApproval: number[]
}

function byTime(a: StatusEvent, b: StatusEvent): number {
  return a.created_at.localeCompare(b.created_at)
}

/** Posted, approved, sent back, removed and expired in the period, and the time to approval. `events` holds every event of the jobs involved. */
export function jobFlow(events: StatusEvent[], sinceTs: string, untilTs: string | null): JobFlow {
  const byJob = new Map<string, StatusEvent[]>()
  for (const e of events) byJob.set(e.job_post_id, [...(byJob.get(e.job_post_id) ?? []), e])
  const flow: JobFlow = { posted: 0, resubmitted: 0, approved: 0, sentBack: 0, removed: 0, expired: 0, hoursToApproval: [] }
  for (const list of Array.from(byJob.values())) {
    const sorted = [...list].sort(byTime)
    const firstSubmit = sorted.find((e) => e.to_status === 'pending_review')
    const firstApproval = sorted.find((e) => e.to_status === 'published' && e.from_status === 'pending_review')
    for (const e of sorted) {
      if (!inRange(e.created_at, sinceTs, untilTs)) continue
      if (e.to_status === 'pending_review') {
        if (e === firstSubmit) flow.posted++
        else flow.resubmitted++
      }
      if (e === firstApproval) {
        flow.approved++
        if (firstSubmit && firstSubmit.created_at <= e.created_at) flow.hoursToApproval.push(hoursBetween(firstSubmit.created_at, e.created_at))
      }
      if (e.to_status === 'rejected') flow.sentBack++
      if (e.to_status === 'removed') flow.removed++
      if (e.to_status === 'expired') flow.expired++
    }
  }
  return flow
}

/* ------------------------------------------------------------------ Places ------------------------------------------------------------------ */

export interface PlaceRow {
  id: string
  name: string
  display_name: string | null
  level: string
  parent_id: string | null
}

/** A place rolled up to city or sub-city level: an area becomes the sub-city (or city) above it. */
export function cityOrSubCity(id: string | null | undefined, places: Map<string, PlaceRow>): string {
  let p = id ? places.get(id) : undefined
  for (let i = 0; p && p.level === 'area' && i < 6; i++) p = p.parent_id ? places.get(p.parent_id) : undefined
  if (!p) return 'No place given'
  return p.display_name ?? p.name
}

/* --------------------------------------------------------------- Applications --------------------------------------------------------------- */

export const CHANNEL_LABEL: Record<string, string> = { account: 'Online, with an account', phone: 'By phone' }
export const NO_TRADE = 'none'

export function tradeOf(jobTrade: string | null | undefined, applicationTrade: string | null | undefined): string {
  return jobTrade || applicationTrade || NO_TRADE
}

export function tradeName(key: string): string {
  return key === NO_TRADE ? 'No trade given' : tradeLabel(key)
}

/** Days from approval to the first application, for each job that got one. */
export function daysToFirstApplication(jobs: { id: string; published_at: string | null }[], applications: { job_id: string; created_at: string }[]): number[] {
  const first = new Map<string, string>()
  for (const a of applications) if (!first.has(a.job_id) || (first.get(a.job_id) as string) > a.created_at) first.set(a.job_id, a.created_at)
  const out: number[] = []
  for (const j of jobs) {
    const f = first.get(j.id)
    if (j.published_at && f && f >= j.published_at) out.push(daysBetween(j.published_at, f))
  }
  return out
}

export interface OpenJob {
  id: string
  title: string
  employer_name: string | null
  posted_for: string | null
  trade: string | null
  location_id: string | null
  published_at: string | null
}

export interface QuietJob {
  id: string
  title: string
  employer: string
  trade: string
  place: string
  daysLive: number
}

/** Open jobs live for 14 days or more with no applications (oldest first). */
export function jobsWithNoApplications(open: OpenJob[], applicationsPerJob: Map<string, number>, places: Map<string, PlaceRow>, now: Date): QuietJob[] {
  return open
    .filter((j) => j.published_at && daysBetween(j.published_at, now.toISOString()) >= NO_APPLICATION_DAYS && !(applicationsPerJob.get(j.id) ?? 0))
    .map((j) => ({
      id: j.id,
      title: j.title,
      // jobs_public already shows the private-client label instead of the business.
      employer: j.employer_name ?? '',
      trade: tradeName(j.trade ?? NO_TRADE),
      place: cityOrSubCity(j.location_id, places),
      daysLive: Math.floor(daysBetween(j.published_at as string, now.toISOString())),
    }))
    .sort((a, b) => b.daysLive - a.daysLive || a.title.localeCompare(b.title))
}

/* --------------------------------------------------------------- Unmet demand --------------------------------------------------------------- */

export interface TradeDemandRow {
  trade: string
  label: string
  openJobs: number
  applications: number
  perJob: number
  register: number
  onShortlists: number
  few: boolean
}

/**
 * Trades with open jobs against the people available: applications to those jobs, worker-register entries listing the
 * trade and desk shortlist rows with it. "Few candidates" (C2-12): fewer than 3 applications per open job AND fewer
 * than 3 register entries.
 */
export function unmetByTrade(input: { openJobs: { id: string; trade: string | null }[]; applicationsPerJob: Map<string, number>; registerTrades: string[][]; shortlistTrades: (string | null)[] }): TradeDemandRow[] {
  const rows = new Map<string, TradeDemandRow>()
  for (const j of input.openJobs) {
    const key = j.trade || NO_TRADE
    const r = rows.get(key) ?? { trade: key, label: tradeName(key), openJobs: 0, applications: 0, perJob: 0, register: 0, onShortlists: 0, few: false }
    r.openJobs++
    r.applications += input.applicationsPerJob.get(j.id) ?? 0
    rows.set(key, r)
  }
  for (const r of Array.from(rows.values())) {
    r.register = input.registerTrades.filter((ts) => ts.includes(r.trade)).length
    r.onShortlists = input.shortlistTrades.filter((t) => t === r.trade).length
    r.perJob = r.openJobs ? Math.round((r.applications / r.openJobs) * 10) / 10 : 0
    r.few = r.perJob < FEW_CANDIDATES && r.register < FEW_CANDIDATES
  }
  return Array.from(rows.values()).sort((a, b) => Number(b.few) - Number(a.few) || b.openJobs - a.openJobs || a.label.localeCompare(b.label))
}

export interface AreaDemandRow {
  area: string
  openJobs: number
  staffingRequests: number
  applications: number
  perJob: number
  few: boolean
}

/**
 * Areas (city or sub-city) with open jobs or open staffing requests against applications to the jobs there. The worker
 * register keeps the area only as free text, so it cannot be matched to an area (always counted as 0 here).
 */
export function unmetByArea(input: { openJobs: { id: string; area: string }[]; applicationsPerJob: Map<string, number>; staffingAreas: string[] }): AreaDemandRow[] {
  const rows = new Map<string, AreaDemandRow>()
  const row = (area: string) => rows.get(area) ?? { area, openJobs: 0, staffingRequests: 0, applications: 0, perJob: 0, few: false }
  for (const j of input.openJobs) {
    const r = row(j.area)
    r.openJobs++
    r.applications += input.applicationsPerJob.get(j.id) ?? 0
    rows.set(j.area, r)
  }
  for (const a of input.staffingAreas) {
    const r = row(a)
    r.staffingRequests++
    rows.set(a, r)
  }
  for (const r of Array.from(rows.values())) {
    r.perJob = r.openJobs ? Math.round((r.applications / r.openJobs) * 10) / 10 : 0
    r.few = r.perJob < FEW_CANDIDATES
  }
  return Array.from(rows.values()).sort((a, b) => Number(b.few) - Number(a.few) || b.openJobs + b.staffingRequests - (a.openJobs + a.staffingRequests) || a.area.localeCompare(b.area))
}

/* --------------------------------------------------------------- Reports and call-backs --------------------------------------------------------------- */

export const REPORT_STATUS_LABEL: Record<string, string> = { open: 'Still open', dismissed: 'Dismissed', actioned: 'Acted on' }
export const REPORT_OUTCOME_LABEL: Record<string, string> = { no_action: 'No action', paused: 'Job paused', removed: 'Job removed', employer_contacted: 'Employer contacted' }
export const CALLBACK_OUTCOME_LABEL: Record<string, string> = {
  staffing_request: 'Became a staffing request',
  no_action: 'No further action',
  no_answer: 'No answer after 3 tries',
  wrong_number: 'Wrong number or did not ask',
  spam: 'Spam',
  open: 'Still open',
}

/** Jobs reported 3 or more times in the period (counted by report, so the figure stays the same after deletion). */
export function jobsReportedOften(reports: { job_post_id: string }[], threshold = 3): number {
  const m = new Map<string, number>()
  for (const r of reports) m.set(r.job_post_id, (m.get(r.job_post_id) ?? 0) + 1)
  return Array.from(m.values()).filter((n) => n >= threshold).length
}

/** Hours from creation to handling, for the handled rows. */
export function handlingHours(rows: { created_at: string; handled_at: string | null }[]): number[] {
  return rows.filter((r) => r.handled_at && r.handled_at >= r.created_at).map((r) => hoursBetween(r.created_at, r.handled_at as string))
}

/* --------------------------------------------------------------- Recruitment desk --------------------------------------------------------------- */

export interface DeskCandidate {
  id: string
  assignment_id: string
  status: string
  consent_at: string | null
  declined_at: string | null
  introduced_at: string | null
  consent_withdrawn_at: string | null
}

export interface DeskPlacement {
  id: string
  assignment_id: string
  candidate_id: string
  status: string
  is_free_replacement: boolean
  created_at: string
}

export interface DeskFunnel {
  assignments: number
  shortlisted: number
  asked: number
  agreed: number
  introduced: number
  interviewed: number
  hired: number
  declined: number
  withdrew: number
  notHired: number
}

/**
 * From shortlist to hire, from the dates and statuses that stay after the 12-month deletion. Anyone past "shortlisted"
 * was asked; "agreed" means consent was recorded; "hired" means a placement that was not cancelled.
 */
export function deskFunnel(assignments: number, candidates: DeskCandidate[], placements: DeskPlacement[]): DeskFunnel {
  const hiredIds = new Set(placements.filter((p) => p.status !== 'cancelled').map((p) => p.candidate_id))
  return {
    assignments,
    shortlisted: candidates.length,
    asked: candidates.filter((c) => c.status !== 'shortlisted').length,
    agreed: candidates.filter((c) => c.consent_at).length,
    introduced: candidates.filter((c) => c.introduced_at).length,
    interviewed: candidates.filter((c) => c.status === 'interviewed' || c.status === 'hired').length,
    hired: candidates.filter((c) => hiredIds.has(c.id)).length,
    declined: candidates.filter((c) => c.declined_at).length,
    withdrew: candidates.filter((c) => c.consent_withdrawn_at || c.status === 'withdrawn').length,
    notHired: candidates.filter((c) => c.status === 'not_hired').length,
  }
}

export const PLACEMENT_LABEL: Record<string, string> = {
  hired: 'Hired, not started yet',
  guarantee_running: 'Started, guarantee running',
  completed: 'Guarantee completed',
  replaced: 'Left inside the guarantee (replaced)',
  left_after_guarantee: 'Left after the guarantee',
  cancelled: 'Cancelled',
}

export const ASSIGNMENT_LABEL: Record<string, string> = { open: 'Open', searching: 'Searching', introducing: 'Introducing', filled: 'Filled', closed: 'Closed', cancelled: 'Cancelled' }

/** Days from opening an assignment to its first hire (a placement that was not cancelled). */
export function daysToFirstHire(assignments: { id: string; created_at: string }[], placements: DeskPlacement[]): number[] {
  const out: number[] = []
  for (const a of assignments) {
    const first = placements.filter((p) => p.assignment_id === a.id && p.status !== 'cancelled').sort((x, y) => x.created_at.localeCompare(y.created_at))[0]
    if (first && first.created_at >= a.created_at) out.push(daysBetween(a.created_at, first.created_at))
  }
  return out
}

/** "Fee agreed in writing" for Operations and the owner: counts only (free replacements have no fee). */
export function feeAgreedCounts(placements: { id: string; is_free_replacement: boolean; status: string }[], agreed: Set<string>): { yes: number; no: number } {
  const paid = placements.filter((p) => !p.is_free_replacement && p.status !== 'cancelled')
  const yes = paid.filter((p) => agreed.has(p.id)).length
  return { yes, no: paid.length - yes }
}
