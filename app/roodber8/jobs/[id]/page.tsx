import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FileText } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor } from '@/lib/admin/options'
import { signedDocumentUrl } from '@/lib/storage'
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, categoryLabel, formatSalary, labelFor } from '@/lib/jobs'
import { formatDate } from '@/lib/format'
import { adminJobStatusAction, jobDecisionAction } from '../../actions/jobs'
import { AdminHeader, DataTable, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { DecisionButtons } from '@/components/admin/ModerationControls'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { ActionButton } from '@/components/forms/ActionButton'

export const metadata = { title: 'Job' }

export default async function AdminJobPage({ params }: { params: { id: string } }) {
  requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const { data: job } = await db.from('jobs').select('*').eq('id', params.id).maybeSingle()
  if (!job) notFound()
  const [{ data: org }, { data: loc }, { data: apps }, trail] = await Promise.all([
    db.from('organisations').select('id, name, status').eq('id', job.employer_org_id).maybeSingle(),
    job.location_id ? db.from('locations').select('display_name').eq('id', job.location_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('job_applications').select('id, reference, name, email, status, cv_path, cv_purged_at, created_at').eq('job_id', job.id).order('created_at', { ascending: false }),
    auditFor(job.id),
  ])
  const rows = await Promise.all((apps ?? []).map(async (a) => ({ ...a, cvUrl: a.cv_path ? await signedDocumentUrl(a.cv_path) : null })))
  return (
    <div className="space-y-5">
      <AdminHeader
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} /> {org?.name} · updated {formatDate(job.updated_at)}
          </span>
        }
        actions={
          job.status === 'published' ? (
            <Link href={`/jobs/${job.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
              View live <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {job.status === 'pending_review' && (
            <Panel title="Waiting for review">
              <DecisionButtons askNote onApprove={jobDecisionAction.bind(null, job.id, true)} onReject={jobDecisionAction.bind(null, job.id, false)} />
            </Panel>
          )}
          <Panel title="Job">
            <KeyValue
              items={[
                ['Employer', org ? <Link href={`/roodber8/organisations/${org.id}`} className="text-green underline">{org.name}</Link> : ''],
                ['Category', categoryLabel(job.category)],
                ['Type', labelFor(EMPLOYMENT_TYPES, job.employment_type)],
                ['Location', loc?.display_name ?? ''],
                ['Salary', formatSalary(job.salary_min_minor, job.salary_max_minor, job.currency, job.salary_period) ?? 'Not given'],
                ['Closing date', job.closing_date ? formatDate(job.closing_date) : 'None (60 days after approval)'],
                ['Open until', job.expires_at ? formatDate(job.expires_at) : ''],
              ]}
            />
            <p className="mt-4 whitespace-pre-line text-small">{job.description}</p>
            {job.requirements && <p className="mt-3 whitespace-pre-line text-small text-muted">{job.requirements}</p>}
          </Panel>
          <Panel title={`Applications (${rows.length})`}>
            <DataTable
              label="Applications"
              rows={rows}
              rowKey={(r) => r.id}
              empty="No applications yet."
              columns={[
                { key: 'r', label: 'Reference', render: (r) => <span className="font-mono text-caption">{r.reference}</span> },
                { key: 'n', label: 'Applicant', render: (r) => (<div><p className="font-semibold">{r.name}</p><p>{r.email}</p></div>) },
                { key: 'd', label: 'Sent', render: (r) => formatDate(r.created_at) },
                { key: 's', label: 'Status', render: (r) => labelFor(APPLICATION_STATUSES, r.status) },
                {
                  key: 'cv',
                  label: 'CV',
                  render: (r) =>
                    r.cvUrl ? (
                      <a href={r.cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-green">
                        <FileText className="size-4" aria-hidden /> Open
                      </a>
                    ) : r.cv_purged_at ? (
                      `Deleted ${formatDate(r.cv_purged_at)}`
                    ) : (
                      'None'
                    ),
                },
              ]}
            />
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Status">
            <div className="flex flex-wrap gap-2">
              {job.status === 'published' && (
                <ActionButton size="sm" variant="secondary" action={adminJobStatusAction.bind(null, job.id, 'paused')}>
                  Pause
                </ActionButton>
              )}
              {!['archived', 'removed'].includes(job.status) && (
                <ActionButton size="sm" variant="secondary" action={adminJobStatusAction.bind(null, job.id, 'archived')}>
                  Close
                </ActionButton>
              )}
              {job.status !== 'removed' && (
                <ActionButton size="sm" variant="ghost" className="text-error" confirm="Remove this job? The employer cannot change it afterwards." action={adminJobStatusAction.bind(null, job.id, 'removed')}>
                  Remove
                </ActionButton>
              )}
            </div>
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
