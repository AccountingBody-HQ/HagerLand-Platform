// Jobs Phase 6: the CSV tables of the Jobs insights (Insights → Demand → Jobs and the Jobs part of the owner's report).
// The same columns as the screen: counts, timings, trades and places. No names, contact details, free text or money.
// There is deliberately no table listing jobs (C2-8).
import type { JobsInsights } from '@/lib/jobs-insights-data'
import { ACTOR_LABEL, JOBS_MIN_SAMPLE, type Count, type Figure } from '@/lib/jobs-insights'

export const JOBS_CSV_TABLES = ['flow', 'status', 'applications', 'unmet-trades', 'unmet-areas', 'reports', 'callbacks', 'desk'] as const
export type JobsCsvTable = (typeof JOBS_CSV_TABLES)[number]

export function isJobsCsvTable(v: string | null): v is JobsCsvTable {
  return (JOBS_CSV_TABLES as readonly string[]).includes(v ?? '')
}

/** A figure as CSV text: the value, or a note when it rests on fewer than 3 data points. */
export function figureCell(f: Figure): string {
  return f.enough && f.value !== null ? String(f.value) : `not enough data yet (${f.n}); shown from ${JOBS_MIN_SAMPLE}`
}

const counts = (group: string, rows: Count[]) => rows.map((r) => ({ group, item: r.label, count: r.count }))

export function jobsInsightsCsv(table: JobsCsvTable, d: JobsInsights): Record<string, unknown>[] {
  switch (table) {
    case 'flow':
      return [
        { figure: 'Sent for review (first time)', value: d.flow.posted },
        { figure: 'Sent for review again', value: d.flow.resubmitted },
        { figure: 'Approved (first time)', value: d.flow.approved },
        { figure: 'Sent back', value: d.flow.sentBack },
        { figure: 'Removed', value: d.flow.removed },
        { figure: 'Closed on the closing date', value: d.flow.expired },
        { figure: 'Time to approval, median (hours)', value: figureCell(d.timeToApproval.median) },
        { figure: 'Time to approval, 90% within (hours)', value: figureCell(d.timeToApproval.p90) },
      ]
    case 'status':
      return d.statusChanges.map((r) => ({
        status: r.label,
        [ACTOR_LABEL.employer.toLowerCase()]: r.byActor.employer,
        [ACTOR_LABEL.staff.toLowerCase()]: r.byActor.staff,
        [ACTOR_LABEL.system.toLowerCase()]: r.byActor.system,
        other: r.byActor.server,
        total: r.total,
      }))
    case 'applications':
      return [
        { group: 'All', item: 'Applications', count: d.applications.total },
        ...counts('By channel', d.applications.byChannel),
        ...counts('By trade', d.applications.byTrade),
        ...counts('By place of the job', d.applications.byArea),
        { group: 'Timing', item: 'Days from approval to the first application, median', count: figureCell(d.daysToFirstApplication) },
      ]
    case 'unmet-trades':
      return d.unmetTrade.map((r) => ({ trade: r.label, open_jobs: r.openJobs, applications: r.applications, applications_per_job: r.perJob, on_register: r.register, on_desk_shortlists: r.onShortlists, few_candidates: r.few ? 'yes' : 'no' }))
    case 'unmet-areas':
      return d.unmetArea.map((r) => ({ area: r.area, open_jobs: r.openJobs, open_staffing_requests: r.staffingRequests, applications: r.applications, applications_per_job: r.perJob, few_candidates: r.few ? 'yes' : 'no' }))
    case 'reports':
      return [
        { group: 'All', item: 'Reports received', count: d.reports.received },
        { group: 'All', item: 'Jobs reported 3 or more times', count: d.reports.jobsReportedOften },
        { group: 'Timing', item: 'Hours to handle, median', count: figureCell(d.reports.hoursToHandle) },
        ...counts('By reason', d.reports.byReason),
        ...counts('By status', d.reports.byStatus),
        ...counts('By outcome', d.reports.byOutcome),
      ]
    case 'callbacks':
      return [
        { group: 'All', item: 'Call-back requests received', count: d.callbacks.received },
        { group: 'Timing', item: 'Hours from request to closing, median', count: figureCell(d.callbacks.hoursToClose) },
        ...counts('By outcome', d.callbacks.byOutcome),
      ]
    case 'desk': {
      const f = d.desk.funnel
      return [
        { group: 'Funnel', item: 'Assignments opened', count: f.assignments },
        { group: 'Funnel', item: 'People shortlisted', count: f.shortlisted },
        { group: 'Funnel', item: 'Asked', count: f.asked },
        { group: 'Funnel', item: 'Agreed to be introduced', count: f.agreed },
        { group: 'Funnel', item: 'Introduced', count: f.introduced },
        { group: 'Funnel', item: 'Interviewed', count: f.interviewed },
        { group: 'Funnel', item: 'Hired', count: f.hired },
        { group: 'Funnel', item: 'Declined', count: f.declined },
        { group: 'Funnel', item: 'Withdrew', count: f.withdrew },
        { group: 'Funnel', item: 'Not hired', count: f.notHired },
        ...counts('Assignments by status', d.desk.assignmentsByStatus),
        ...counts('Placements by status', d.desk.placementsByStatus),
        { group: 'Placements', item: 'Free replacements given', count: d.desk.freeReplacements },
        { group: 'Placements', item: 'Guarantees ending within 30 days', count: d.desk.guaranteesEndingSoon },
        { group: 'Placements', item: 'Fee agreed in writing: yes', count: d.desk.feeAgreed.yes },
        { group: 'Placements', item: 'Fee agreed in writing: no', count: d.desk.feeAgreed.no },
        { group: 'Timing', item: 'Days from assignment to first hire, median', count: figureCell(d.desk.daysToFirstHire) },
      ]
    }
  }
}
