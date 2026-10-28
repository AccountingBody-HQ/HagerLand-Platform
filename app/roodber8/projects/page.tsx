import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { BUDGET_BANDS, PROJECT_SERVICES, PROJECT_STATUS_LABEL, labelOf } from '@/lib/build-projects'
import { AdminHeader, DataTable } from '@/components/admin/AdminUi'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Building projects' }

/** Building projects (spec 26.9): each with its linked requests. */
export default async function ProjectsAdminPage() {
  await requireAdminPage()
  const { data } = must(await getAdminSupabase().from('build_projects').select('id, reference, title, name, status, budget_band, services, created_at, requests:service_requests(count)').order('created_at', { ascending: false }).limit(300))
  return (
    <div className="space-y-5">
      <AdminHeader title="Building projects" description="Started from “Start a building project”. Each links the design, engineering, contractor, materials and finance requests it created; match those in Service requests and Quotes as usual." />
      <DataTable
        label="Building projects"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No building projects yet."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/projects/${r.id}`} prefetch={false} className="font-semibold text-green hover:underline">{r.reference}</Link> },
          { key: 'title', label: 'Project', render: (r) => r.title },
          { key: 'who', label: 'Customer', render: (r) => r.name },
          { key: 'needs', label: 'Needs', render: (r) => r.services.map((s) => PROJECT_SERVICES.find((x) => x.value === s)?.label ?? s).join(', ') },
          { key: 'budget', label: 'Budget', render: (r) => labelOf(BUDGET_BANDS, r.budget_band) },
          { key: 'linked', label: 'Requests', render: (r) => String((Array.isArray(r.requests) ? r.requests[0]?.count : 0) ?? 0) },
          { key: 'status', label: 'Status', render: (r) => PROJECT_STATUS_LABEL[r.status] },
          { key: 'added', label: 'Started', render: (r) => formatDate(r.created_at) },
        ]}
      />
    </div>
  )
}
