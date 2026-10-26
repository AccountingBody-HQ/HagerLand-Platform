import Link from 'next/link'
import { formatDate } from '@/lib/format'
import { REPORT_REASON_LABEL } from '@/lib/job-reports'
import type { ReportGroup } from '@/lib/job-reports-data'
import { Panel, StatusBadge } from '@/components/admin/AdminUi'
import { Badge } from '@/components/ui/Badge'
import { RunButton } from '@/components/admin/AgencyTools'
import { JobReportNote } from '@/components/admin/JobReportNote'
import { dismissJobReportsAction, markEmployerContactedAction, pauseJobFromReportAction, removeJobFromReportAction, restoreJobAction } from '@/app/roodber8/actions/job-reports'

/** Open "Report this job" reports, grouped by job (Owner and Operations; employers never see them). */
export function JobReports({ groups }: { groups: ReportGroup[] }) {
  if (!groups.length) return <p className="text-small text-muted">No open job reports.</p>
  return (
    <ul className="space-y-3">
      {groups.map((g) => {
        const first = g.reports[0].id
        return (
          <li key={g.job.id}>
            <Panel
              title={g.job.title}
              actions={
                <Link href={`/roodber8/jobs/${g.job.id}`} prefetch={false} className="text-small font-semibold text-green">
                  Open job
                </Link>
              }
            >
              <div className="flex flex-wrap items-center gap-2 text-small">
                <StatusBadge status={g.job.status} />
                <span>{g.job.employerName}</span>
                {g.job.employerVerification && <span className="text-muted">({g.job.employerVerification})</span>}
                <span>
                  · {g.distinctReporters} {g.distinctReporters === 1 ? 'reporter' : 'different reporters'}
                </span>
                {g.asksForMoney && <Badge tone="danger">Reported for asking candidates for money</Badge>}
              </div>
              <ul className="mt-3 space-y-2 text-small">
                {g.reports.map((r) => (
                  <li key={r.id} className="rounded-md border border-border p-2 [overflow-wrap:anywhere]">
                    <strong>{REPORT_REASON_LABEL[r.reason] ?? r.reason}</strong> · {formatDate(r.created_at)}
                    {r.details && <p className="mt-1 whitespace-pre-line">{r.details}</p>}
                    {r.contact && <p className="mt-1 text-muted">Contact (never share with the employer): {r.contact}</p>}
                    {r.reporterBusiness && <p className="mt-1 text-warning">The reporter manages a business: {r.reporterBusiness}. Check it is not a competitor.</p>}
                    <div className="mt-2">
                      <JobReportNote reportId={r.id} note={r.staff_note} />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {g.job.status === 'published' && <RunButton label="Pause while we check" fn={pauseJobFromReportAction.bind(null, first)} variant="primary" />}
                {g.job.status === 'paused' && <RunButton label="Restore" fn={restoreJobAction.bind(null, g.job.id)} />}
                <RunButton label="Dismiss" fn={dismissJobReportsAction.bind(null, first)} />
                <RunButton label="Employer contacted" fn={markEmployerContactedAction.bind(null, first)} />
                {g.job.status !== 'removed' && <RunButton label="Remove the job" fn={removeJobFromReportAction.bind(null, first)} variant="ghost" />}
              </div>
            </Panel>
          </li>
        )
      })}
    </ul>
  )
}
