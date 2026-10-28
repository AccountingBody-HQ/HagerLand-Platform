import Link from 'next/link'
import type { JobsInsights } from '@/lib/jobs-insights-data'
import { ACTOR_LABEL, JOBS_MIN_SAMPLE, type Count, type Figure } from '@/lib/jobs-insights'
import type { JobsCsvTable } from '@/lib/jobs-insights-csv'
import { DataTable, KeyValue, Panel } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

/** W11: a median or rate that rests on fewer than 3 data points. */
export function FigureText({ figure, unit }: { figure: Figure; unit: string }) {
  if (!figure.enough || figure.value === null) return <span className="text-muted">Not enough data yet ({figure.n}). Shown from {JOBS_MIN_SAMPLE}.</span>
  return (
    <span className="tabular-nums">
      {figure.value} {unit}
    </span>
  )
}

function CountList({ label, rows, empty }: { label: string; rows: Count[]; empty: string }) {
  return (
    <DataTable
      label={label}
      rows={rows}
      rowKey={(r) => r.key}
      empty={empty}
      columns={[
        { key: 'k', label, render: (r) => r.label },
        { key: 'c', label: 'Count', render: (r) => r.count, className: 'tabular-nums text-right' },
      ]}
    />
  )
}

function Off({ text }: { text: string }) {
  return <p className="mb-3 rounded-md bg-stone-100 px-3 py-2 text-small font-semibold text-ink">{text}</p>
}

/**
 * Jobs Phase 6: the Jobs figures, shared by Insights → Demand → Jobs (Owner and Operations) and the owner's Jobs report.
 * Counts and timings only: no names, contact details or money (the fee line is "agreed in writing: yes/no").
 */
export function JobsInsightsPanels({ d, csv }: { d: JobsInsights; csv: (table: JobsCsvTable) => string | null }) {
  const Csv = ({ table }: { table: JobsCsvTable }) => {
    const href = csv(table)
    return href ? (
      <ButtonLink href={href} variant="secondary" size="sm" prefetch={false} className="hl-no-print">
        CSV
      </ButtonLink>
    ) : null
  }
  const f = d.desk.funnel
  const funnel: [string, number][] = [
    ['Shortlisted', f.shortlisted],
    ['Asked', f.asked],
    ['Agreed to be introduced', f.agreed],
    ['Introduced', f.introduced],
    ['Interviewed', f.interviewed],
    ['Hired', f.hired],
  ]
  return (
    <>
      <Panel title="Jobs from posting to closing" actions={<Csv table="flow" />}>
        <KeyValue
          items={[
            ['Sent for review (first time)', d.flow.posted],
            ['Sent for review again', d.flow.resubmitted],
            ['Approved (first time)', d.flow.approved],
            ['Sent back', d.flow.sentBack],
            ['Removed', d.flow.removed],
            ['Closed on the closing date', d.flow.expired],
            ['Time to approval (median)', <FigureText key="m" figure={d.timeToApproval.median} unit="hours" />],
            ['Time to approval (90% within)', <FigureText key="p" figure={d.timeToApproval.p90} unit="hours" />],
          ]}
        />
        <p className="mt-2 text-caption text-muted">Time to approval runs from a job’s first submission to its first approval.</p>
      </Panel>
      <Panel title="Every status change, and who made it" actions={<Csv table="status" />}>
        <DataTable
          label="Status changes"
          rows={d.statusChanges}
          rowKey={(r) => r.status}
          empty="No job changed status in this period."
          columns={[
            { key: 's', label: 'New status', render: (r) => r.label },
            { key: 'e', label: ACTOR_LABEL.employer, render: (r) => r.byActor.employer, className: 'tabular-nums text-right' },
            { key: 'st', label: ACTOR_LABEL.staff, render: (r) => r.byActor.staff, className: 'tabular-nums text-right' },
            { key: 'sy', label: ACTOR_LABEL.system, render: (r) => r.byActor.system, className: 'tabular-nums text-right' },
            { key: 'o', label: ACTOR_LABEL.server, render: (r) => r.byActor.server, className: 'tabular-nums text-right' },
            { key: 't', label: 'Total', render: (r) => <strong>{r.total}</strong>, className: 'tabular-nums text-right' },
          ]}
        />
      </Panel>
      <Panel title={`Applications (${d.applications.total})`} actions={<Csv table="applications" />}>
        {!d.switches.phoneApply && <Off text="Apply by phone is switched off." />}
        <div className="grid gap-4 lg:grid-cols-3">
          <CountList label="Channel" rows={d.applications.byChannel} empty="No applications in this period." />
          <CountList label="Trade" rows={d.applications.byTrade} empty="No applications in this period." />
          <CountList label="Place of the job" rows={d.applications.byArea} empty="No applications in this period." />
        </div>
        <p className="mt-3 text-small">
          Days from approval to the first application (median): <FigureText figure={d.daysToFirstApplication} unit="days" />
        </p>
      </Panel>
      <Panel title={`Jobs with no applications after 14 days (${d.quietJobs.length})`}>
        <DataTable
          label="Jobs with no applications"
          rows={d.quietJobs}
          rowKey={(j) => j.id}
          empty="Every job live for 14 days or more has at least one application."
          columns={[
            {
              key: 't',
              label: 'Job',
              render: (j) => (
                <Link href={`/roodber8/jobs/${j.id}`} prefetch={false} className="font-semibold text-green underline">
                  {j.title}
                </Link>
              ),
            },
            { key: 'e', label: 'Employer', render: (j) => j.employer },
            { key: 'tr', label: 'Trade', render: (j) => j.trade },
            { key: 'p', label: 'Place', render: (j) => j.place },
            { key: 'd', label: 'Days live', render: (j) => j.daysLive, className: 'tabular-nums text-right' },
          ]}
        />
      </Panel>
      <Panel title="Few candidates yet">
        <p className="mb-3 text-small text-muted">Trades and areas with open jobs or staffing requests but fewer than 3 applications per job and fewer than 3 workers on the register. Call-back requests are counted, but not by trade or area.</p>
        {!d.switches.workerRegister && <Off text="The worker register is switched off." />}
        <div className="mb-2 flex justify-end">
          <Csv table="unmet-trades" />
        </div>
        <DataTable
          label="By trade"
          rows={d.unmetTrade}
          rowKey={(r) => r.trade}
          empty="No open jobs."
          columns={[
            { key: 't', label: 'Trade', render: (r) => r.label },
            { key: 'j', label: 'Open jobs', render: (r) => r.openJobs, className: 'tabular-nums text-right' },
            { key: 'a', label: 'Applications', render: (r) => r.applications, className: 'tabular-nums text-right' },
            { key: 'p', label: 'Per job', render: (r) => r.perJob, className: 'tabular-nums text-right' },
            { key: 'r', label: 'On the register', render: (r) => r.register, className: 'tabular-nums text-right' },
            { key: 's', label: 'On desk shortlists', render: (r) => r.onShortlists, className: 'tabular-nums text-right' },
            { key: 'f', label: 'Few candidates', render: (r) => (r.few ? <strong>Yes</strong> : 'No') },
          ]}
        />
        <div className="mb-2 mt-5 flex justify-end">
          <Csv table="unmet-areas" />
        </div>
        <DataTable
          label="By area"
          rows={d.unmetArea}
          rowKey={(r) => r.area}
          empty="No open jobs or staffing requests."
          columns={[
            { key: 'ar', label: 'Area (city or sub-city)', render: (r) => r.area },
            { key: 'j', label: 'Open jobs', render: (r) => r.openJobs, className: 'tabular-nums text-right' },
            { key: 's', label: 'Open staffing requests', render: (r) => r.staffingRequests, className: 'tabular-nums text-right' },
            { key: 'a', label: 'Applications', render: (r) => r.applications, className: 'tabular-nums text-right' },
            { key: 'p', label: 'Per job', render: (r) => r.perJob, className: 'tabular-nums text-right' },
            { key: 'f', label: 'Few candidates', render: (r) => (r.few ? <strong>Yes</strong> : 'No') },
          ]}
        />
        <p className="mt-2 text-caption text-muted">The register keeps areas as the workers wrote them, so it is matched by trade only.</p>
      </Panel>
      <Panel title={`Reports about jobs (${d.reports.received})`} actions={<Csv table="reports" />}>
        <KeyValue
          items={[
            ['Jobs reported 3 or more times', d.reports.jobsReportedOften],
            ['Hours to handle a report (median)', <FigureText key="h" figure={d.reports.hoursToHandle} unit="hours" />],
          ]}
        />
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <CountList label="Reason" rows={d.reports.byReason} empty="No reports in this period." />
          <CountList label="Status" rows={d.reports.byStatus} empty="No reports in this period." />
          <CountList label="Outcome" rows={d.reports.byOutcome} empty="No reports handled in this period." />
        </div>
      </Panel>
      <Panel title={`Call-back requests (${d.callbacks.received})`} actions={<Csv table="callbacks" />}>
        {!d.switches.callbacks && <Off text="Call-back requests are switched off." />}
        <CountList label="Outcome" rows={d.callbacks.byOutcome} empty="No call-back requests in this period." />
        <p className="mt-3 text-small">
          Hours from request to closing (median): <FigureText figure={d.callbacks.hoursToClose} unit="hours" />
        </p>
      </Panel>
      <Panel title={`Recruitment desk (${f.assignments} assignment${f.assignments === 1 ? '' : 's'} opened)`} actions={<Csv table="desk" />}>
        {!d.switches.recruitmentDesk && <Off text="The recruitment desk is switched off." />}
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {funnel.map(([label, n]) => (
            <li key={label} className="rounded-md bg-stone-50 p-3">
              <p className="text-caption text-muted">{label}</p>
              <p className="font-display text-h3 font-bold tabular-nums">{n}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-small">
          Also: {f.declined} declined, {f.withdrew} withdrew, {f.notHired} not hired.
        </p>
        <p className="mt-2 text-small font-semibold">
          Fee agreed in writing: {d.desk.feeAgreed.yes} yes, {d.desk.feeAgreed.no} no
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <CountList label="Assignment status" rows={d.desk.assignmentsByStatus} empty="No assignments opened in this period." />
          <CountList label="Placement status" rows={d.desk.placementsByStatus} empty="No placements yet." />
        </div>
        <div className="mt-3">
          <KeyValue
            items={[
              ['Free replacements given', d.desk.freeReplacements],
              ['Guarantees ending within 30 days', d.desk.guaranteesEndingSoon],
              ['Days from assignment to first hire (median)', <FigureText key="h" figure={d.desk.daysToFirstHire} unit="days" />],
            ]}
          />
        </div>
      </Panel>
    </>
  )
}
