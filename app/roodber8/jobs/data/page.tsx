import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { cleanupRunText, type CleanupCounts } from '@/lib/jobs-cleanup'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { JobsCleanupModeControl, JobsDryRunButton, JobsSwitchControl } from '@/components/admin/JobsPhase2Controls'

export const metadata = { title: 'Jobs: switches and data deletion' }

/** Owner only: the two website switches (start off) and the 12-month deletion of personal details (starts on dry run). */
export default async function JobsDataPage() {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const [switches, { data: runs }] = await Promise.all([
    readJobsSwitches(),
    getAdminSupabase().from('job_data_cleanup_runs').select('id, mode, started_at, finished_at, counts, failures, run_by').order('started_at', { ascending: false }).limit(20),
  ])
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Jobs: switches and data deletion"
        description="Only you (the owner) can change these. Keep both switches off until the lawyer has confirmed the points below. Personal details must be deleted 12 months after an application: switch deletion to Live before 15 October 2027."
      />
      <Panel title="Website switches">
        <div className="grid gap-3 md:grid-cols-2">
          <JobsSwitchControl which="phone_apply" on={switches.phoneApply} label="Apply by phone" />
          <JobsSwitchControl which="worker_register" on={switches.workerRegister} label="Worker register" />
        </div>
        <p className="mt-3 text-small text-muted">Off means: no button or form on the website, the form address shows “not found”, and the server refuses anything sent to it.</p>
      </Panel>
      <Panel title="Deleting personal details after 12 months" actions={<JobsDryRunButton />}>
        <p className="mb-3 text-small">
          Mode: <strong>{switches.cleanupMode === 'live' ? 'Live — deletes personal details' : 'Dry run — report only'}</strong>. Every day the job looks at job applications (by phone and by email), worker register entries and old queued emails. It keeps each row, its reference, status and dates, and clears names, phone numbers, emails, cover notes, notes and CV files. Candidate profiles are never touched.
        </p>
        <JobsCleanupModeControl mode={switches.cleanupMode} />
        <div className="mt-4">
          <DataTable
            label="Deletion runs"
            rows={runs ?? []}
            rowKey={(r) => r.id}
            empty="No runs yet. The daily job runs once a day; you can also run a dry run now."
            columns={[
              { key: 'when', label: 'When', render: (r) => `${formatDate(r.started_at)} ${new Date(r.started_at).toLocaleTimeString('en-GB', { timeZone: 'Africa/Addis_Ababa', hour: '2-digit', minute: '2-digit' })}` },
              { key: 'mode', label: 'Mode', render: (r) => (r.mode === 'live' ? 'Live' : 'Dry run') },
              { key: 'result', label: 'Result', render: (r) => cleanupRunText(r.mode, r.counts as unknown as CleanupCounts) },
              { key: 'failed', label: 'Failed', render: (r) => String(Array.isArray(r.failures) ? r.failures.length : 0) },
              { key: 'by', label: 'Run by', render: (r) => r.run_by },
            ]}
          />
        </div>
      </Panel>
    </div>
  )
}
