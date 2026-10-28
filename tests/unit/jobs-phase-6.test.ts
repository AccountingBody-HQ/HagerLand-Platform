import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { MIN_SAMPLE } from '@/lib/supply/insights'
import {
  FEW_CANDIDATES,
  JOBS_MIN_SAMPLE,
  NO_APPLICATION_DAYS,
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
  median,
  medianFigure,
  monthRange,
  p90Figure,
  percentile,
  periodDays,
  periodSince,
  statusChanges,
  tradeOf,
  unmetByArea,
  unmetByTrade,
  type DeskCandidate,
  type DeskPlacement,
  type PlaceRow,
  type StatusEvent,
} from '@/lib/jobs-insights'
import { ageingBucket, feeAgeing, owedLongerThan, reconcileFees, recordTotals, totalsByCurrency, type FeeEntryRow, type FeeTermsRow } from '@/lib/jobs-fee-report'
import { JOBS_CSV_TABLES, figureCell, jobsInsightsCsv } from '@/lib/jobs-insights-csv'
import { FEE_CSV_TABLES, feeCsv } from '@/lib/jobs-fee-csv'
import { JOB_ACTOR_HEADER, asJobActor } from '@/lib/job-status-actor'
import { clearedApplication } from '@/lib/jobs-privacy'
import { clearedCallback } from '@/lib/callbacks'
import { clearedReport } from '@/lib/job-reports'
import { clearedShortlistRow } from '@/lib/jobs-desk'
import { roleCanAccess } from '@/lib/admin/roles'
import { ADMIN_NAV } from '@/components/admin/admin-nav-items'
import type { JobsInsights } from '@/lib/jobs-insights-data'
import type { FeeReport } from '@/lib/jobs-fee-report-data'
import { EXPECTED_MIGRATIONS } from '@/lib/health'

vi.mock('server-only', () => ({}))

const read = (p: string) => readFileSync(p, 'utf8')
const H = 3_600_000
const D = 86_400_000

describe('periods in Addis Ababa time (Africa/Addis_Ababa, UTC+3)', () => {
  it('uses the same 3-point rule as Supplies', () => {
    expect(JOBS_MIN_SAMPLE).toBe(MIN_SAMPLE)
    expect(NO_APPLICATION_DAYS).toBe(14)
    expect(FEW_CANDIDATES).toBe(3)
  })
  it('reads the period from the address: 30, 90, 365 or a custom 1–1825, else 90', () => {
    expect(periodDays('30')).toBe(30)
    expect(periodDays('365')).toBe(365)
    expect(periodDays('7')).toBe(7)
    expect(periodDays('0')).toBe(90)
    expect(periodDays('1826')).toBe(90)
    expect(periodDays('abc')).toBe(90)
    expect(periodDays(undefined)).toBe(90)
  })
  it('starts the period at midnight in Addis Ababa, not UTC', () => {
    // 00:30 in Addis on 28 Oct is still 27 Oct in UTC: the Addis day counts.
    expect(periodSince(30, new Date('2026-10-27T21:30:00Z'))).toBe('2026-09-27T21:00:00.000Z')
    // 23:30 in Addis on 27 Oct.
    expect(periodSince(30, new Date('2026-10-27T20:30:00Z'))).toBe('2026-09-26T21:00:00.000Z')
  })
  it('gives calendar months in Addis time, with the month end or today as the "as of" date', () => {
    const now = new Date('2026-10-28T09:00:00Z')
    const oct = monthRange('2026-10', now)
    expect(oct).toEqual({ month: '2026-10', startTs: '2026-09-30T21:00:00.000Z', nextTs: '2026-10-31T21:00:00.000Z', monthEnd: '2026-10-31', asOf: '2026-10-28' })
    expect(monthRange('2026-02', now)).toMatchObject({ monthEnd: '2026-02-28', asOf: '2026-02-28' })
    expect(monthRange('2025-12', now)).toMatchObject({ nextTs: '2025-12-31T21:00:00.000Z', monthEnd: '2025-12-31' })
    expect(monthRange('2026-13', now).month).toBe('2026-10')
    expect(monthRange(null, new Date('2026-10-31T21:30:00Z')).month).toBe('2026-11')
  })
})

describe('medians, the 90th percentile and the 3-point rule', () => {
  it('works out medians and nearest-rank percentiles', () => {
    expect(median([])).toBeNull()
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9)
    expect(percentile([7], 90)).toBe(7)
  })
  it('shows a figure only from 3 data points (W11)', () => {
    expect(medianFigure([1, 2])).toEqual({ value: 1.5, n: 2, enough: false })
    expect(medianFigure([1, 2, 4])).toEqual({ value: 2, n: 3, enough: true })
    expect(p90Figure([1, 2, 3])).toMatchObject({ value: 3, enough: true })
    expect(figureCell({ value: 1.5, n: 2, enough: false })).toBe('not enough data yet (2); shown from 3')
    expect(figureCell({ value: 2, n: 3, enough: true })).toBe('2')
  })
})

const ev = (job: string, from: string | null, to: string, actor: string, at: string): StatusEvent => ({ job_post_id: job, from_status: from, to_status: to, actor_kind: actor, created_at: at })

describe('job status history', () => {
  const events = [
    ev('a', null, 'pending_review', 'employer', '2026-10-01T06:00:00Z'),
    ev('a', 'pending_review', 'rejected', 'staff', '2026-10-01T08:00:00Z'),
    ev('a', 'rejected', 'pending_review', 'employer', '2026-10-02T06:00:00Z'),
    ev('a', 'pending_review', 'published', 'staff', '2026-10-03T06:00:00Z'),
    ev('a', 'published', 'paused', 'staff', '2026-10-04T06:00:00Z'),
    ev('a', 'paused', 'published', 'staff', '2026-10-05T06:00:00Z'),
    ev('b', null, 'draft', 'employer', '2026-09-20T06:00:00Z'),
    ev('b', 'draft', 'pending_review', 'employer', '2026-09-28T06:00:00Z'),
    ev('b', 'pending_review', 'rejected', 'staff', '2026-10-01T06:00:00Z'),
    ev('b', 'rejected', 'pending_review', 'employer', '2026-10-01T07:00:00Z'),
    ev('b', 'pending_review', 'rejected', 'staff', '2026-10-01T09:00:00Z'),
    ev('c', 'published', 'expired', 'system', '2026-10-10T21:00:00Z'),
    ev('d', 'published', 'removed', 'staff', '2026-10-11T21:00:00Z'),
    ev('e', 'pending_review', 'published', 'server', '2026-10-12T21:00:00Z'),
  ]
  const since = '2026-09-30T21:00:00.000Z'
  it('counts first submissions, resubmissions, first approvals and every send-back in the period', () => {
    const f = jobFlow(events, since, null)
    expect(f.posted).toBe(1) // job a (job b was first submitted before the period)
    expect(f.resubmitted).toBe(2) // a once, b once
    expect(f.sentBack).toBe(3) // a once, b twice
    expect(f.approved).toBe(2) // a, and e (no submission recorded: no time to approval)
    expect(f.removed).toBe(1)
    expect(f.expired).toBe(1)
    // Restoring a paused job is not an approval; the time runs from the FIRST submission to the FIRST approval.
    expect(f.hoursToApproval).toEqual([48])
  })
  it('keeps to the period', () => {
    const f = jobFlow(events, since, '2026-10-02T00:00:00.000Z')
    expect(f).toMatchObject({ posted: 1, resubmitted: 1, approved: 0, sentBack: 3 })
  })
  it('tables every status change by who made it', () => {
    const rows = statusChanges(events, since, null)
    const pending = rows.find((r) => r.status === 'pending_review')
    expect(pending).toMatchObject({ total: 3, byActor: { employer: 3, staff: 0, system: 0, server: 0 } })
    expect(rows.find((r) => r.status === 'expired')?.byActor.system).toBe(1)
    expect(rows.find((r) => r.status === 'published')?.byActor).toEqual({ employer: 0, staff: 2, system: 0, server: 1 })
    expect(rows.map((r) => r.status)).toEqual(['pending_review', 'published', 'rejected', 'paused', 'expired', 'removed'])
  })
})

describe('applications, places and unmet demand', () => {
  const places = new Map<string, PlaceRow>([
    ['aa', { id: 'aa', name: 'Addis Ababa', display_name: 'Addis Ababa', level: 'city', parent_id: null }],
    ['bole', { id: 'bole', name: 'Bole', display_name: 'Bole, Addis Ababa', level: 'sub_city', parent_id: 'aa' }],
    ['cmc', { id: 'cmc', name: 'CMC', display_name: 'CMC, Bole, Addis Ababa', level: 'area', parent_id: 'bole' }],
  ])
  it('rolls an area up to its sub-city, never shows the area itself', () => {
    expect(cityOrSubCity('cmc', places)).toBe('Bole, Addis Ababa')
    expect(cityOrSubCity('bole', places)).toBe('Bole, Addis Ababa')
    expect(cityOrSubCity(null, places)).toBe('No place given')
  })
  it("takes the job's trade first, then the application's", () => {
    expect(tradeOf('mason', 'carpenter')).toBe('mason')
    expect(tradeOf(null, 'carpenter')).toBe('carpenter')
    expect(tradeOf(null, null)).toBe('none')
  })
  it('works out days to the first application per job', () => {
    expect(daysToFirstApplication([{ id: 'j', published_at: '2026-10-01T00:00:00Z' }, { id: 'k', published_at: '2026-10-01T00:00:00Z' }], [{ job_id: 'j', created_at: '2026-10-04T00:00:00Z' }, { job_id: 'j', created_at: '2026-10-03T00:00:00Z' }])).toEqual([2])
  })
  it('lists open jobs live 14 days or more with no applications', () => {
    const now = new Date('2026-10-28T12:00:00Z')
    const open = [
      { id: '1', title: 'Mason', employer_name: 'Abebe Builders', posted_for: 'employer', trade: 'mason', location_id: 'cmc', published_at: new Date(now.getTime() - 14 * D).toISOString() },
      { id: '2', title: 'Painter', employer_name: 'Abebe Builders', posted_for: 'employer', trade: 'painter', location_id: 'bole', published_at: new Date(now.getTime() - 13 * D - 23 * H).toISOString() },
      { id: '3', title: 'Carpenter', employer_name: 'Posted by HagerLand for a private client', posted_for: 'private_client', trade: 'carpenter', location_id: 'bole', published_at: new Date(now.getTime() - 30 * D).toISOString() },
    ]
    const quiet = jobsWithNoApplications(open, new Map([['3', 1]]), places, now)
    expect(quiet).toEqual([{ id: '1', title: 'Mason', employer: 'Abebe Builders', trade: 'Mason', place: 'Bole, Addis Ababa', daysLive: 14 }])
  })
  it('flags "few candidates" by trade: under 3 applications per job AND under 3 register entries (C2-12)', () => {
    const rows = unmetByTrade({
      openJobs: [{ id: 'm1', trade: 'mason' }, { id: 'm2', trade: 'mason' }, { id: 'p1', trade: 'painter' }, { id: 'w1', trade: 'welder' }],
      applicationsPerJob: new Map([['m1', 2], ['m2', 1], ['p1', 5], ['w1', 0]]),
      registerTrades: [['welder'], ['welder', 'mason'], ['welder']],
      shortlistTrades: ['mason', null],
    })
    expect(rows.find((r) => r.trade === 'mason')).toMatchObject({ openJobs: 2, applications: 3, perJob: 1.5, register: 1, onShortlists: 1, few: true })
    expect(rows.find((r) => r.trade === 'painter')?.few).toBe(false)
    expect(rows.find((r) => r.trade === 'welder')).toMatchObject({ register: 3, few: false })
    expect(rows[0].few).toBe(true)
  })
  it('counts areas from open jobs and open staffing requests', () => {
    const rows = unmetByArea({ openJobs: [{ id: 'a', area: 'Bole' }, { id: 'b', area: 'Kirkos' }], applicationsPerJob: new Map([['b', 4]]), staffingAreas: ['Bole', 'Adama'] })
    expect(rows).toEqual([
      { area: 'Bole', openJobs: 1, staffingRequests: 1, applications: 0, perJob: 0, few: true },
      { area: 'Adama', openJobs: 0, staffingRequests: 1, applications: 0, perJob: 0, few: true },
      { area: 'Kirkos', openJobs: 1, staffingRequests: 0, applications: 4, perJob: 4, few: false },
    ])
  })
})

describe('reports, call-backs and the desk', () => {
  it('counts jobs reported 3 or more times by report (stable after deletion)', () => {
    expect(jobsReportedOften([{ job_post_id: 'a' }, { job_post_id: 'a' }, { job_post_id: 'a' }, { job_post_id: 'b' }])).toBe(1)
    expect(handlingHours([{ created_at: '2026-10-01T00:00:00Z', handled_at: '2026-10-01T05:00:00Z' }, { created_at: '2026-10-01T00:00:00Z', handled_at: null }])).toEqual([5])
  })
  const cands: DeskCandidate[] = [
    { id: 'c1', assignment_id: 'a1', status: 'shortlisted', consent_at: null, declined_at: null, introduced_at: null, consent_withdrawn_at: null },
    { id: 'c2', assignment_id: 'a1', status: 'declined', consent_at: null, declined_at: '2026-10-02T00:00:00Z', introduced_at: null, consent_withdrawn_at: null },
    { id: 'c3', assignment_id: 'a1', status: 'introduced', consent_at: '2026-10-02T00:00:00Z', declined_at: null, introduced_at: '2026-10-03T00:00:00Z', consent_withdrawn_at: null },
    { id: 'c4', assignment_id: 'a1', status: 'hired', consent_at: '2026-10-02T00:00:00Z', declined_at: null, introduced_at: '2026-10-03T00:00:00Z', consent_withdrawn_at: null },
    { id: 'c5', assignment_id: 'a1', status: 'withdrawn', consent_at: '2026-10-02T00:00:00Z', declined_at: null, introduced_at: null, consent_withdrawn_at: '2026-10-04T00:00:00Z' },
  ]
  const places: DeskPlacement[] = [
    { id: 'p1', assignment_id: 'a1', candidate_id: 'c4', status: 'guarantee_running', is_free_replacement: false, created_at: '2026-10-06T00:00:00Z' },
    { id: 'p2', assignment_id: 'a1', candidate_id: 'c3', status: 'cancelled', is_free_replacement: false, created_at: '2026-10-05T00:00:00Z' },
    { id: 'p3', assignment_id: 'a1', candidate_id: 'c3', status: 'hired', is_free_replacement: true, created_at: '2026-10-07T00:00:00Z' },
  ]
  it('builds the funnel shortlisted → asked → agreed → introduced → hired', () => {
    expect(deskFunnel(1, cands, places)).toEqual({ assignments: 1, shortlisted: 5, asked: 4, agreed: 3, introduced: 2, interviewed: 1, hired: 2, declined: 1, withdrew: 1, notHired: 0 })
    expect(daysToFirstHire([{ id: 'a1', created_at: '2026-10-01T00:00:00Z' }], places)).toEqual([5])
  })
  it('counts "fee agreed in writing" without free replacements or cancelled placements (W15)', () => {
    expect(feeAgreedCounts(places, new Set(['p1']))).toEqual({ yes: 1, no: 0 })
    expect(feeAgreedCounts(places, new Set())).toEqual({ yes: 0, no: 1 })
  })
})

describe('the same figures after the 12-month deletion clears personal details', () => {
  it('keeps channel, trade, status, outcome and dates, so counts do not change', () => {
    const at = '2027-11-01T00:00:00Z'
    const apps = [
      { id: '1', job_id: 'j', channel: 'phone', trade: 'mason', created_at: '2026-10-01T00:00:00Z', name: 'Abebe Kebede', phone: '+251911000001', email: null },
      { id: '2', job_id: 'j', channel: 'account', trade: null, created_at: '2026-10-02T00:00:00Z', name: 'Sara Tesfaye', phone: null, email: 'sara@example.com' },
    ]
    const cleared = apps.map((a) => ({ ...a, ...clearedApplication(at) }))
    const figures = (rows: { channel: string; trade: string | null }[]) => [countBy(rows, (a) => a.channel), countBy(rows, (a) => tradeOf(null, a.trade))]
    expect(figures(cleared)).toEqual(figures(apps))
    const calls = [{ status: 'closed', outcome: 'no_answer', created_at: '2026-10-01T00:00:00Z', handled_at: '2026-10-01T05:00:00Z', name: 'X', phone: '+251911000002', need: 'Masons', area_text: 'Bole' }]
    const clearedCalls = calls.map((c) => ({ ...c, ...clearedCallback(at) }))
    expect(countBy(clearedCalls, (c) => c.outcome)).toEqual(countBy(calls, (c) => c.outcome))
    expect(handlingHours(clearedCalls)).toEqual(handlingHours(calls))
    const reports = [{ job_post_id: 'j', reason: 'fake_or_scam', status: 'dismissed', created_at: '2026-10-01T00:00:00Z', handled_at: '2026-10-02T00:00:00Z', details: 'x', contact: 'y', reporter_user_id: 'u', ip_hash: 'h' }]
    const clearedReports = reports.map((r) => ({ ...r, ...clearedReport(at) }))
    expect([jobsReportedOften(clearedReports), countBy(clearedReports, (r) => r.reason)]).toEqual([jobsReportedOften(reports), countBy(reports, (r) => r.reason)])
    const shortlist = [{ id: 'c', assignment_id: 'a', status: 'hired', consent_at: '2026-10-02T00:00:00Z', declined_at: null, introduced_at: '2026-10-03T00:00:00Z', consent_withdrawn_at: null, name: 'Abebe', phone: '+251911000003' }]
    const clearedShortlist = shortlist.map((c) => ({ ...c, ...clearedShortlistRow(at) }))
    expect(deskFunnel(1, clearedShortlist, [])).toEqual(deskFunnel(1, shortlist, []))
  })
})

const terms = (id: string, currency: string, status: string): FeeTermsRow => ({ id, reference: `HLP-${id}`, currency, status })
let seq = 0
const entry = (fee: string, type: string, amount: number, currency: string, on: string, reverses: string | null = null, id = `e${++seq}`): FeeEntryRow => ({ id, fee_terms_id: fee, entry_type: type, amount_minor: amount, currency, occurred_on: on, reverses_entry_id: reverses })

describe('owner fee totals (per currency, never mixed)', () => {
  it('keeps ETB and USD apart, ETB first, reversals applied', () => {
    const due = entry('t1', 'fee_due', 1_000_000, 'ETB', '2026-10-05', null, 'd1')
    const es = [due, entry('t1', 'fee_received', 400_000, 'ETB', '2026-10-20'), entry('t2', 'fee_due', 50_000, 'USD', '2026-10-06'), entry('t2', 'waived', 10_000, 'USD', '2026-10-07'), entry('t3', 'fee_due', 200_000, 'ETB', '2026-10-08', null, 'd3'), entry('t3', 'reversal', 200_000, 'ETB', '2026-11-02', 'd3')]
    expect(totalsByCurrency(es, '2026-10-01', '2026-10-31')).toEqual([
      { currency: 'ETB', due: 1_200_000, received: 400_000, waived: 0, outstanding: 800_000 },
      { currency: 'USD', due: 50_000, received: 0, waived: 10_000, outstanding: 40_000 },
    ])
    // November shows the reversal in the month it was made.
    expect(totalsByCurrency(es, '2026-11-01', '2026-11-30')).toEqual([{ currency: 'ETB', due: -200_000, received: 0, waived: 0, outstanding: -200_000 }])
    expect(totalsByCurrency(es, null, '2026-11-30')[0]).toMatchObject({ currency: 'ETB', due: 1_000_000, outstanding: 600_000 })
  })
  it('never clamps an over-payment to 0 (F-3)', () => {
    expect(recordTotals([entry('t', 'fee_due', 100, 'ETB', '2026-10-01'), entry('t', 'fee_received', 150, 'ETB', '2026-10-02')]).outstanding).toBe(-50)
  })
})

describe('ageing from the first fee-due date', () => {
  it('puts 30/31, 60/61 and 90/91 days in the right bucket', () => {
    expect([0, 30, 31, 60, 61, 90, 91].map(ageingBucket)).toEqual(['0–30 days', '0–30 days', '31–60 days', '31–60 days', '61–90 days', '61–90 days', 'Over 90 days'])
  })
  it('ages outstanding fees per currency, as of a date, from the first due entry that was not reversed', () => {
    const t = [terms('a', 'ETB', 'invoiced'), terms('b', 'ETB', 'invoiced'), terms('c', 'USD', 'invoiced'), terms('d', 'ETB', 'paid')]
    const es = [
      entry('a', 'fee_due', 100, 'ETB', '2026-09-28', null, 'a1'),
      entry('a', 'reversal', 100, 'ETB', '2026-09-29', 'a1'),
      entry('a', 'fee_due', 100, 'ETB', '2026-10-01'),
      entry('b', 'fee_due', 300, 'ETB', '2026-07-30'),
      entry('b', 'fee_received', 100, 'ETB', '2026-08-01'),
      entry('c', 'fee_due', 50, 'USD', '2026-08-29'),
      entry('d', 'fee_due', 70, 'ETB', '2026-01-01'),
      entry('d', 'fee_received', 70, 'ETB', '2026-01-10'),
    ]
    expect(feeAgeing(t, es, '2026-10-31')).toEqual([
      { bucket: '0–30 days', currency: 'ETB', placements: 1, amount: 100 },
      { bucket: '61–90 days', currency: 'USD', placements: 1, amount: 50 },
      { bucket: 'Over 90 days', currency: 'ETB', placements: 1, amount: 200 },
    ])
    expect(owedLongerThan(t, es, '2026-10-31', 30)).toBe(2)
    expect(owedLongerThan(t, es, '2026-10-30', 30)).toBe(2)
    expect(owedLongerThan([t[0]], es, '2026-10-31', 30)).toBe(0)
    expect(owedLongerThan([t[0]], es, '2026-11-01', 30)).toBe(1)
  })
})

describe('"Reconciles with fee ledger" (all five checks)', () => {
  const clean = () => {
    const t = [terms('a', 'ETB', 'paid'), terms('b', 'USD', 'invoiced'), terms('c', 'ETB', 'waived')]
    const d = entry('a', 'fee_due', 100, 'ETB', '2026-10-01', null, 'ad')
    const wrong = entry('b', 'fee_received', 5, 'USD', '2026-10-02', null, 'bw')
    const es = [d, entry('a', 'fee_received', 100, 'ETB', '2026-10-02'), entry('b', 'fee_due', 50, 'USD', '2026-10-01'), wrong, entry('b', 'reversal', 5, 'USD', '2026-10-03', 'bw'), entry('c', 'fee_due', 30, 'ETB', '2026-10-01'), entry('c', 'waived', 30, 'ETB', '2026-10-05')]
    return { t, es }
  }
  it('says yes for a clean ledger', () => {
    const { t, es } = clean()
    expect(reconcileFees(t, es)).toEqual({ reconciles: true, problems: [], references: [] })
  })
  it('1: an entry in another currency than its record', () => {
    const { t, es } = clean()
    const r = reconcileFees(t, [...es, entry('a', 'fee_due', 10, 'USD', '2026-10-09')])
    expect(r.reconciles).toBe(false)
    expect(r.problems.map((p) => p.check)).toContain(1)
    expect(r.references).toContain('HLP-a')
  })
  it('2: flags an over-payment (never hidden)', () => {
    const { t, es } = clean()
    const r = reconcileFees(t, [...es, entry('b', 'fee_received', 60, 'USD', '2026-10-09')])
    expect(r).toMatchObject({ reconciles: false, references: ['HLP-b'] })
    expect(r.problems[0].check).toBe(2)
  })
  it('3: "paid" with money still owed', () => {
    const { t, es } = clean()
    const r = reconcileFees(t, [...es, entry('a', 'fee_due', 20, 'ETB', '2026-10-09')])
    expect(r.problems).toEqual([{ reference: 'HLP-a', check: 3, problem: 'Marked paid, but the amounts do not add up to nothing outstanding' }])
  })
  it('4: "waived" without a waived entry', () => {
    const { t, es } = clean()
    const r = reconcileFees([...t, terms('w', 'ETB', 'waived')], es)
    expect(r.problems).toEqual([{ reference: 'HLP-w', check: 4, problem: 'Marked waived, but there is no waived entry' }])
  })
  it('5: a reversal that does not mirror its entry', () => {
    const { t, es } = clean()
    const r = reconcileFees(t, [...es, entry('a', 'reversal', 99, 'ETB', '2026-10-09', 'ad')])
    expect(r.problems.some((p) => p.check === 5 && p.reference === 'HLP-a')).toBe(true)
    expect(r.reconciles).toBe(false)
  })
})

/* ------------------------------------------------------------------ CSVs ------------------------------------------------------------------ */

const figure = { value: 1, n: 3, enough: true }
const sample: JobsInsights = {
  statusChanges: [{ status: 'published', label: 'Approved or back on the board', byActor: { employer: 0, staff: 2, system: 0, server: 0 }, total: 2 }],
  flow: { posted: 1, resubmitted: 0, approved: 1, sentBack: 0, removed: 0, expired: 0 },
  timeToApproval: { median: figure, p90: figure },
  applications: { total: 1, byChannel: [{ key: 'phone', label: 'By phone', count: 1 }], byTrade: [], byArea: [] },
  daysToFirstApplication: figure,
  quietJobs: [{ id: 'x', title: 'Mason', employer: 'Abebe Builders', trade: 'Mason', place: 'Bole', daysLive: 20 }],
  unmetTrade: [],
  unmetArea: [],
  callbacks: { received: 0, byOutcome: [], hoursToClose: figure },
  reports: { received: 0, byReason: [], byStatus: [], byOutcome: [], hoursToHandle: figure, jobsReportedOften: 0 },
  desk: { funnel: deskFunnel(0, [], []), assignmentsByStatus: [], placementsByStatus: [], freeReplacements: 0, guaranteesEndingSoon: 0, daysToFirstHire: figure, feeAgreed: { yes: 1, no: 2 } },
  switches: { callbacks: false, phoneApply: false, workerRegister: false, recruitmentDesk: false },
}

describe('CSV downloads', () => {
  it('the Jobs tables hold counts only: no person, contact, money or list of jobs (C2-8)', () => {
    for (const table of JOBS_CSV_TABLES) {
      const rows = jobsInsightsCsv(table, sample)
      for (const k of rows.flatMap((r) => Object.keys(r))) expect(k, `${table}.${k}`).not.toMatch(/name|phone|email|amount|fee_|title|^employer$/i)
      expect(JSON.stringify(rows), table).not.toMatch(/ETB|USD|Abebe Builders/)
    }
    expect(JSON.stringify(jobsInsightsCsv('desk', sample))).toContain('Fee agreed in writing: yes')
  })
  it('the owner fee tables hold references, currency, amounts, status and dates only', () => {
    const r: FeeReport = {
      month: [{ currency: 'ETB', due: 100, received: 0, waived: 0, outstanding: 100 }],
      toDate: [],
      ageing: [{ bucket: '0–30 days', currency: 'ETB', placements: 1, amount: 100 }],
      reconciliation: { reconciles: false, problems: [{ reference: 'HLP-1', check: 2, problem: 'More received or waived than was due' }], references: ['HLP-1'] },
      records: [{ reference: 'HLP-1', currency: 'ETB', status: 'paid', due: 100, received: 150, waived: 0, outstanding: -50 }],
    }
    const allowed = new Set(['currency', 'fee_due', 'received', 'waived', 'outstanding', 'as_of', 'owed_for', 'placements', 'amount', 'placement', 'status', 'reconciles_with_fee_ledger', 'check', 'problem'])
    for (const table of FEE_CSV_TABLES) for (const row of feeCsv(table, r, '2026-10-28')) for (const k of Object.keys(row)) expect(allowed.has(k), `${table}.${k}`).toBe(true)
    expect(feeCsv('fee-records', r, '2026-10-28')[0]).toMatchObject({ outstanding: '-0.50' })
  })
})

/* ------------------------------------------------------------------ Guards ------------------------------------------------------------------ */

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
  })
}

describe('import and data guards', () => {
  const JOBS_SIDE = [
    'lib/jobs-insights.ts',
    'lib/jobs-insights-data.ts',
    'lib/jobs-insights-csv.ts',
    'lib/jobs-fee-agreed-data.ts',
    'lib/jobs-signals-data.ts',
    'lib/jobs-fee-report.ts',
    'lib/jobs-fee-report-data.ts',
    'lib/jobs-fee-csv.ts',
    'lib/data/jobs.ts',
    'components/jobs/CompanyJobs.tsx',
    'components/jobs/ProjectHiringHelp.tsx',
    'components/admin/JobsInsightsPanels.tsx',
    'app/roodber8/demand/jobs/page.tsx',
    'app/roodber8/demand/jobs/export/route.ts',
    'app/roodber8/reports/jobs/page.tsx',
    'app/roodber8/reports/jobs/export/route.ts',
  ]
  it('Jobs insights, company jobs and the Jobs tab never import Supplies modules (money, offers, agreements, ledger, insights)', () => {
    for (const f of JOBS_SIDE) expect(read(f), f).not.toMatch(/from '@\/lib\/supply\/|from '\.\/(money|offers|agreements-data|offers-data|insights)'/)
  })
  it('the Jobs tab (data, page, panels, CSV) never mentions the fee tables; only the owner modules read amounts', () => {
    for (const f of ['lib/jobs-insights.ts', 'lib/jobs-insights-data.ts', 'lib/jobs-insights-csv.ts', 'components/admin/JobsInsightsPanels.tsx', 'app/roodber8/demand/jobs/page.tsx', 'app/roodber8/demand/jobs/export/route.ts']) expect(read(f), f).not.toContain('recruitment_fee_')
    // "Fee agreed in writing" reads only the placement and the status.
    const agreed = read('lib/jobs-fee-agreed-data.ts')
    expect(agreed.match(/\.select\('([^']+)'\)/g)).toEqual([".select('placement_id, status')"])
    // Every file that reads fee amounts (recruitment_fee_entries) is owner-only.
    const readers = files('app').concat(files('lib')).filter((f) => read(f).includes("from('recruitment_fee_entries')"))
    expect(readers.sort()).toEqual(['app/roodber8/actions/jobs-desk.ts', 'app/roodber8/jobs/desk/[id]/page.tsx', 'lib/jobs-cleanup-data.ts', 'lib/jobs-desk-cron.ts', 'lib/jobs-fee-report-data.ts'].sort())
    expect(read('lib/jobs-fee-report-data.ts')).toMatch(/if \(!\(await isOwnerSession\(\)\)\) throw new Error\('Owner only'\)/)
  })
  it('Supplies code never reads candidates, applications or the worker register', () => {
    for (const f of files('lib/supply').concat(['app/roodber8/demand/supplies/page.tsx'])) expect(read(f), f).not.toMatch(/job_applications|recruitment_candidates|worker_register|candidate_profiles/)
  })
  it('the Jobs insights never select a person or free-text column', () => {
    // Place names (locations) and business names (organisations) are not personal data.
    const selects = ((read('lib/jobs-insights-data.ts') + read('lib/jobs-signals-data.ts')).match(/\.select\('([^']+)'/g) ?? []).filter((x) => !x.includes('display_name') && !x.includes('is_hagerland'))
    expect(selects.length).toBeGreaterThan(20)
    for (const s of selects) expect(s, s).not.toMatch(/\b(name|phone|email|cover_note|notes|staff_note|need|area_text|details|contact|cv_path|ip_hash)\b/)
  })
  it('the company page and /jobs?company= use the two locks', () => {
    const data = read('lib/data/jobs.ts')
    expect(data).toMatch(/if \(!org\.id \|\| org\.is_hagerland !== false \|\| org\.kind === 'hagerland'\) return EMPTY/)
    expect(data).toMatch(/employerOrgId: org\.id, employerOnly: true/)
    expect(data).toMatch(/if \(query\.employerOnly\) req = req\.eq\('posted_for', 'employer'\)/)
    const board = read('app/(site)/jobs/page.tsx')
    expect(board).toMatch(/org\?\.id && org\.is_hagerland === false && org\.kind !== 'hagerland'/)
    expect(board).toMatch(/noindex: filtered \|\| searchParams\.company !== undefined/)
    expect(read('app/(site)/company/[slug]/page.tsx')).toMatch(/companyJobs\(o, \{ pageSize: COMPANY_JOBS_SHOWN \}\)/)
  })
})

describe('roles and the menu', () => {
  it('Operations may open the Jobs tab; the Jobs report, Reports and Performance are owner only', () => {
    expect(roleCanAccess('operations', '/roodber8/demand/jobs')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/demand/jobs/export')).toBe(true)
    for (const role of ['agent', 'content'] as const) expect(roleCanAccess(role, '/roodber8/demand/jobs')).toBe(false)
    for (const role of ['operations', 'agent', 'content'] as const) for (const p of ['/roodber8/reports/jobs', '/roodber8/reports/jobs/export', '/roodber8/reports', '/roodber8/performance', '/roodber8/demand']) expect(roleCanAccess(role, p), `${role} ${p}`).toBe(false)
    expect(ADMIN_NAV.find((i) => i.href === '/roodber8/reports/jobs')?.label).toBe('Jobs report')
    const route = read('app/roodber8/reports/jobs/export/route.ts')
    expect(route).toContain('!(await isOwnerSession())')
    expect(read('app/roodber8/reports/jobs/page.tsx')).toContain("if (!(await isOwnerSession())) redirect('/roodber8?denied=1')")
  })
})

describe('who changed a job status (fix 3)', () => {
  it('marks a service-role query with the actor header', () => {
    const calls: [string, string][] = []
    const q = { setHeader(n: string, v: string) { calls.push([n, v]); return q } }
    expect(asJobActor(q, 'staff')).toBe(q)
    expect(calls).toEqual([[JOB_ACTOR_HEADER, 'staff']])
    expect(JOB_ACTOR_HEADER).toBe('x-hl-job-actor')
  })
  it('every service-role status change says who it is; employers write with their own session', () => {
    const staff = ['app/roodber8/actions/jobs.ts', 'app/roodber8/actions/job-reports.ts', 'lib/job-reports-data.ts', 'app/roodber8/actions/jobs-desk.ts']
    for (const f of staff) {
      const src = read(f)
      const writes = src.match(/from\('job_posts'\)\s*\.(update|insert)\(\{[^}]*status/g) ?? []
      const marked = src.match(/asJobActor\(/g) ?? []
      expect(marked.length, f).toBeGreaterThanOrEqual(writes.length)
      expect(src).not.toContain("asJobActor(db.from('job_posts').update({ applications_count")
    }
    expect(read('lib/cron/daily.ts')).toMatch(/asJobActor\(getAdminSupabase\(\)\.from\('job_posts'\)\.update\(\{ status: 'expired' \}\)[^\n]*'system'\)/)
    expect(read('app/actions/job-actions.ts')).toMatch(/getServerSupabase\(\)\.from\('job_posts'\)\.update\(\{ status: parsed\.data\.status \}\)/)
  })
})

describe('the health check', () => {
  it('expects migration 0044 last', () => {
    expect(EXPECTED_MIGRATIONS[EXPECTED_MIGRATIONS.length - 1]).toBe('0044')
  })
})

describe('long id lists are read in small parts', () => {
  it('asks for at most 50 ids at a time, joins the rows, and stops on a failed read', async () => {
    const { inChunks } = await import('@/lib/admin/in-chunks')
    const ids = Array.from({ length: 123 }, (_, i) => `id-${i}`)
    const sizes: number[] = []
    const rows = await inChunks([...ids, 'id-0'], async (part) => {
      sizes.push(part.length)
      return { data: part.map((id) => ({ id })), error: null }
    })
    expect(sizes).toEqual([50, 50, 23])
    expect(rows).toHaveLength(123)
    await expect(inChunks(ids, async () => ({ data: null, error: { message: 'too big header' } }))).rejects.toThrow('Could not read from the database: too big header')
  })
})
