import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FileText } from 'lucide-react'
import { adminActor, isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor } from '@/lib/admin/options'
import { signedDocumentUrl } from '@/lib/storage'
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, categoryLabel, formatSalary, labelFor, tradeLabel } from '@/lib/jobs'
import { advertWarnings, privateClientWarnings } from '@/lib/jobs-privacy'
import { FormAlert } from '@/components/forms/FormParts'
import { RunButton } from '@/components/admin/AgencyTools'
import { restoreJobAction } from '../../actions/job-reports'
import { formatDate, formatPhone } from '@/lib/format'
import { adminJobStatusAction, jobDecisionAction } from '../../actions/jobs'
import { AdminHeader, DataTable, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { DecisionButtons } from '@/components/admin/ModerationControls'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { ActionButton } from '@/components/forms/ActionButton'
import { AdvertWarnings } from '@/components/admin/AdvertWarnings'
import { CopyForTelegram } from '@/components/admin/CopyForTelegram'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Job' }

export default async function AdminJobPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const { data: job } = must(await db.from('job_posts').select('*').eq('id', params.id).maybeSingle())
  if (!job) notFound()
  const [{ data: org }, { data: loc }, { data: apps }, trail] = must(await Promise.all([
    db.from('organisations').select('id, name, status').eq('id', job.employer_org_id).maybeSingle(),
    job.location_id ? db.from('locations').select('display_name').eq('id', job.location_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('job_applications').select('id, reference, name, email, phone, channel, trade, area_text, status, cv_path, cv_purged_at, personal_data_deleted_at, created_at').eq('job_id', job.id).order('created_at', { ascending: false }),
    auditFor(job.id),
  ]))
  const rows = await Promise.all((apps ?? []).map(async (a) => ({ ...a, cvUrl: a.cv_path ? await signedDocumentUrl(a.cv_path) : null })))
  // Jobs Phase 4: private-client details, the four-eyes rule and open reports.
  const privateClient = job.posted_for === 'private_client'
  const [actor, owner, { data: openReports }] = must(await Promise.all([adminActor(), isOwnerSession(), db.from('job_reports').select('id, reason').eq('job_post_id', job.id).eq('status', 'open')]))
  const createdByMe = privateClient && job.created_by_staff === actor.slice(0, 120)
  const warnings = [...advertWarnings(job.title, job.description, job.requirements), ...(privateClient ? privateClientWarnings(job.title, job.description, job.requirements) : [])]
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
            <div className="flex flex-col items-end gap-2">
              <Link href={`/jobs/${job.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
                View live <ExternalLink className="size-4" aria-hidden />
              </Link>
              <CopyForTelegram jobId={job.id} />
            </div>
          ) : undefined
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {warnings.length > 0 && <AdvertWarnings warnings={warnings} />}
          {(openReports ?? []).length > 0 && (
            <FormAlert tone={(openReports ?? []).some((r) => r.reason === 'asks_for_money') ? 'error' : 'info'}>
              {(openReports ?? []).length} open report{(openReports ?? []).length === 1 ? '' : 's'} on this job{(openReports ?? []).some((r) => r.reason === 'asks_for_money') ? ', including “asks candidates for money”' : ''}.{' '}
              <Link href="/roodber8/jobs/reports" prefetch={false} className="font-semibold underline">
                Open job reports
              </Link>
            </FormAlert>
          )}
          {job.status === 'pending_review' && (
            <Panel title="Waiting for review">
              {createdByMe && <p className="mb-3 text-small font-semibold">Created by you: another person must approve.{owner ? ' As the owner you may approve it yourself only by writing the reason in the note.' : ''}</p>}
              <DecisionButtons askNote onApprove={jobDecisionAction.bind(null, job.id, true)} onReject={jobDecisionAction.bind(null, job.id, false)} />
            </Panel>
          )}
          <Panel title="Job">
            <KeyValue
              items={[
                ['Employer', org ? <Link href={`/roodber8/organisations/${org.id}`} className="text-green underline">{org.name}</Link> : ''],
                ...(privateClient
                  ? ([
                      ['Posted for', job.recruitment_assignment_id ? <Link href={`/roodber8/jobs/desk/${job.recruitment_assignment_id}`} className="text-green underline">a private client (desk assignment)</Link> : 'a private client'],
                      ['Created by', job.created_by_staff ?? ''],
                      ['Approved by', job.approved_by ? `${job.approved_by}${job.self_approval_reason ? ` (own job: “${job.self_approval_reason}”)` : ''}` : 'Not yet'],
                    ] as [string, React.ReactNode][])
                  : []),
                ['Category', categoryLabel(job.category)],
                ['Type', labelFor(EMPLOYMENT_TYPES, job.employment_type)],
                ['Trade', job.trade ? tradeLabel(job.trade) : 'None'],
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
                {
                  key: 'n',
                  label: 'Applicant',
                  render: (r) =>
                    r.personal_data_deleted_at ? (
                      <span className="text-muted">Details deleted {formatDate(r.personal_data_deleted_at)}</span>
                    ) : (
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p>{r.channel === 'phone' ? `By phone · ${formatPhone(r.phone)}${r.trade ? ` · ${tradeLabel(r.trade)}` : ''}${r.area_text ? ` · ${r.area_text}` : ''}` : r.email}</p>
                      </div>
                    ),
                },
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
              {job.status === 'paused' && <RunButton label="Restore" fn={restoreJobAction.bind(null, job.id)} />}
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
