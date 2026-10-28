import { requireAdminPage } from '@/lib/admin/guard'
import { openReportGroups } from '@/lib/job-reports-data'
import { AdminHeader } from '@/components/admin/AdminUi'
import { JobReports } from '@/components/admin/JobReports'

export const metadata = { title: 'Job reports' }

/**
 * Owner and Operations (the role map and the middleware refuse Agent and Content). "Report this job" reports. A job
 * stays live until a person decides: there is no automatic pause.
 */
export default async function JobReportsPage() {
  await requireAdminPage()
  const groups = await openReportGroups()
  return (
    <div className="space-y-5">
      <AdminHeader title="Job reports" description="Reports from “Report this job”. Jobs stay live until you decide. Employers never see reports or who sent them; reporters get no reply unless you contact them yourself." />
      <JobReports groups={groups} />
    </div>
  )
}
