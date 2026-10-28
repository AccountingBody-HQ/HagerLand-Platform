import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { ASSIGNMENT_STATUSES, ASSIGNMENT_STATUS_LABEL } from '@/lib/jobs-desk'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Recruitment desk' }

/**
 * Owner and Operations (the role map and the middleware refuse Agent and Content). Every staffing request assigned to
 * HagerLand's own team becomes an assignment here. No money on this page.
 */
export default async function RecruitmentDeskPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  const status = ASSIGNMENT_STATUSES.find((s) => s === sp.status)
  const db = getAdminSupabase()
  let q = db
    .from('recruitment_assignments')
    .select('id, reference, status, roles, headcount, pay_text, start_date, private_client, employer_based_abroad, created_at, request:service_requests(reference, title), org:organisations(name)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (status) q = q.eq('status', status)
  else q = q.in('status', ['open', 'searching', 'introducing'])
  const [{ data }, switches] = must(await Promise.all([q, readJobsSwitches()]))
  const rows = data ?? []
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Recruitment desk"
        description={`Staffing requests assigned to HagerLand’s own team. Add people to each shortlist, record their consent and 18+, introduce them, and record who was hired. The recruitment desk switch is ${switches.recruitmentDesk ? 'on: introduced people appear on the employer’s request page and employers get emails' : 'off: everything is recorded here only, nothing is shown or emailed to employers'}.`}
      />
      <FilterBar action="/roodber8/jobs/desk">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">Open (all open statuses)</option>
            {ASSIGNMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ASSIGNMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Assignments"
        rows={rows}
        rowKey={(r) => r.id}
        empty="No assignments. On a staffing request, press “Assign HagerLand’s own team” to open one."
        columns={[
          {
            key: 'ref',
            label: 'Assignment',
            render: (r) => (
              <Link href={`/roodber8/jobs/desk/${r.id}`} prefetch={false} className="font-semibold text-green underline">
                {r.reference}
              </Link>
            ),
          },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'employer', label: 'Employer', render: (r) => (r.private_client ? 'Private client' : ((r.org as { name: string } | null)?.name ?? '')) + (r.employer_based_abroad ? ' · based outside Ethiopia' : '') },
          { key: 'roles', label: 'Roles', render: (r) => <span className="line-clamp-2 max-w-xs">{r.roles ?? (r.request as { title: string } | null)?.title ?? ''}</span> },
          { key: 'people', label: 'People', render: (r) => (r.headcount ? String(r.headcount) : '') },
          { key: 'pay', label: 'Pay', render: (r) => r.pay_text ?? '' },
          { key: 'start', label: 'Start', render: (r) => formatDate(r.start_date) },
        ]}
      />
    </div>
  )
}
