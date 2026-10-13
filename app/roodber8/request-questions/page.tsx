import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { parseQuestions } from '@/lib/service-requests/questions'
import { AdminHeader, DataTable } from '@/components/admin/AdminUi'
import { Badge } from '@/components/ui/Badge'

export const metadata = { title: 'Request questions' }

/** Services customers can request, and the questions each one asks (spec 24.12). */
export default async function RequestQuestionsPage() {
  requireAdminPage()
  const db = getAdminSupabase()
  const [{ data: cats }, { data: verticals }] = await Promise.all([
    db.from('service_categories').select('id, parent_id, name, slug, is_active, vertical_key, question_schema, allows_emergency, sort').order('sort'),
    db.from('verticals').select('key, name, status'),
  ])
  const all = cats ?? []
  const groups = new Map(all.filter((c) => !c.parent_id).map((c) => [c.id, c.name]))
  const vName = new Map((verticals ?? []).map((v) => [v.key, `${v.name}${v.status === 'live' ? '' : ` (${v.status.replace('_', ' ')})`}`]))
  const rows = all.filter((c) => c.parent_id).sort((a, b) => (groups.get(a.parent_id ?? '') ?? '').localeCompare(groups.get(b.parent_id ?? '') ?? '') || a.sort - b.sort)
  return (
    <div>
      <AdminHeader title="Request questions" description="Every service customers can request through “Request a service”, with the questions it asks. Add or rename services in Categories." />
      <DataTable
        label="Request questions"
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', label: 'Service', render: (r) => <Link href={`/roodber8/request-questions/${r.id}`} className="font-semibold text-green hover:underline">{r.name}</Link> },
          { key: 'group', label: 'Group', render: (r) => groups.get(r.parent_id ?? '') ?? '' },
          { key: 'vertical', label: 'Vertical', render: (r) => vName.get(r.vertical_key ?? '') ?? 'None' },
          { key: 'q', label: 'Questions', render: (r) => parseQuestions(r.question_schema).length },
          { key: 'em', label: 'Emergency', render: (r) => (r.allows_emergency ? <Badge tone="danger">Allowed</Badge> : 'No') },
          { key: 'active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
        ]}
      />
    </div>
  )
}
