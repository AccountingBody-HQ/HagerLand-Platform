import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { cleanupRunText, type CleanupCounts } from '@/lib/jobs-cleanup'
import { legacyCleanupStartedOn } from '@/lib/verification-data'
import { legacyEndsOn } from '@/lib/verification'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { JobsCleanupModeControl, JobsDryRunButton, JobsSwitchControl, RetentionMonthsControl } from '@/components/admin/JobsPhase2Controls'

export const metadata = { title: 'Jobs: switches and data deletion' }

/**
 * Owner only: the website switches (all start off: Apply by phone, the worker register, the recruitment desk), the
 * keeping period for hired people (empty until the lawyer confirms) and the 12-month deletion (starts on dry run).
 */
export default async function JobsDataPage() {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const [switches, { data: runs }, startedOn] = await Promise.all([
    readJobsSwitches(),
    getAdminSupabase().from('job_data_cleanup_runs').select('id, mode, started_at, finished_at, counts, failures, run_by').order('started_at', { ascending: false }).limit(20),
    legacyCleanupStartedOn(),
  ])
  const verificationExpiry = { on: startedOn !== null, startedOn }
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Jobs: switches and data deletion"
        description="Only you (the owner) can change these. Keep the switches off until the lawyer has confirmed the points below. Personal details must be deleted 12 months after an application: switch deletion to Live before 15 October 2027."
      />
      <Panel title="Website switches">
        <div className="grid gap-3 md:grid-cols-2">
          <JobsSwitchControl which="phone_apply" on={switches.phoneApply} label="Apply by phone" />
          <JobsSwitchControl which="worker_register" on={switches.workerRegister} label="Worker register" />
        </div>
        <p className="mt-3 text-small text-muted">Off means: no button or form on the website, the form address shows “not found”, and the server refuses anything sent to it.</p>
      </Panel>
      <Panel title="Trust: reports, private-client jobs, Verified badges">
        <div className="grid gap-3 md:grid-cols-3">
          <JobsSwitchControl which="reports" on={switches.reportsEnabled} label="Report this job" />
          <JobsSwitchControl which="private_client" on={switches.privateClientPosts} label="Private-client jobs" />
          <JobsSwitchControl which="verification_expiry" on={verificationExpiry.on} label="Legacy badge clean-up" />
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-small text-muted">
          <li>“Report this job” is on by default: off removes the button and the server refuses reports.</li>
          <li>Private-client jobs start off: off hides the desk button, refuses creating and approving them, hides any such job from every public page, search and the sitemap, and hides the Terms sentence about them.</li>
          <li>
            Badges with a recorded check end on their own date whatever this says. The clean-up only affects legacy badges (verified before the recorded check existed){verificationExpiry.startedOn ? `: switched on ${formatDate(verificationExpiry.startedOn)}, they end on ${formatDate(legacyEndsOn(verificationExpiry.startedOn))} unless a check is recorded.` : ': while off, they are left as they are.'}
          </li>
        </ul>
      </Panel>
      <Panel title="Amharic for Jobs and call-back requests">
        <div className="grid gap-3 md:grid-cols-2">
          <JobsSwitchControl which="jobs_amharic" on={switches.jobsAmharic} label="Amharic for Jobs" />
          <JobsSwitchControl which="callbacks" on={switches.callbacks} label="Call-back requests" />
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-small text-muted">
          <li>Amharic for Jobs starts off. On: the Jobs pages, the staffing request pages and the Jobs account pages have an Amharic version at /am/… with the language switch, and the jobs sitemap lists them. Only text marked as native-reviewed is shown in Amharic; everything else stays in English with a short note. Links to other sections stay English. Off: /am/jobs answers “page not found”, as it does today. The website takes up to a minute to notice a change.</li>
          <li>Call-back requests start off. On: “Prefer to talk? Ask us to call you” appears on /jobs and the staffing request page, with the form at /jobs/call-back, and requests arrive under Jobs → Call-back requests. Off: no box, the form address shows “not found”, and the server refuses anything sent to it. No email or text message is ever sent.</li>
        </ul>
      </Panel>
      <Panel title="Recruitment desk">
        <div className="grid gap-3 md:grid-cols-2">
          <JobsSwitchControl which="recruitment_desk" on={switches.recruitmentDesk} label="Recruitment desk" />
          <div className="space-y-2 text-small">
            <p>
              <strong>Off</strong> (the start): you and Operations can use the desk inside admin (shortlists, consent, introductions, placements, fees), but nothing reaches employers: no “People introduced to you” on their request page, no introduction or placement emails, and the fee line in the Terms is not shown.
            </p>
            <p>
              <strong>On</strong>: introduced people appear on the employer’s request page (only with their recorded consent and 18+), employers get the introduction and placement emails, and the Terms show the fee line. People already introduced while it was off then appear on the employer’s page, without an email.
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <RetentionMonthsControl months={switches.retentionMonths} />
        </div>
      </Panel>
      <Panel title="Deleting personal details after 12 months" actions={<JobsDryRunButton />}>
        <p className="mb-3 text-small">
          Mode: <strong>{switches.cleanupMode === 'live' ? 'Live — deletes personal details' : 'Dry run — report only'}</strong>. Every day the job looks at job applications (by phone and by email), worker register entries and old queued emails. It keeps each row, its reference, status and dates, and clears names, phone numbers, emails, cover notes, notes and CV files. Recruitment desk shortlist rows are cleared 12 months after their last activity (never later than 12 months after the assignment closes). People hired through HagerLand keep their name, contact details and consent record while the fee records need them; their notes, cover notes and CVs still go. Candidate profiles are never touched.
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
