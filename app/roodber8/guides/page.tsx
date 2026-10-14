import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { GUIDE_TOPICS } from '@/lib/guides'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Guides' }

export default async function AdminGuidesPage() {
  requireAdminPage()
  const { data } = await getAdminSupabase().from('guides').select('id, title, slug, topic, status, needs_review, updated_at').order('updated_at', { ascending: false })
  return (
    <div>
      <AdminHeader title="Guides" description="The /guides content hub. Drafts are not public. Starter drafts are marked “Needs AB review” and cannot be published until you tick “Content checked”." actions={<ButtonLink href="/roodber8/guides/new" size="sm">New guide</ButtonLink>} />
      <DataTable
        label="Guides"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No guides yet."
        columns={[
          { key: 't', label: 'Guide', render: (r) => (<Link href={`/roodber8/guides/${r.id}`} className="font-semibold text-green hover:underline">{r.title}</Link>) },
          { key: 'topic', label: 'Topic', render: (r) => GUIDE_TOPICS.find((t) => t.value === r.topic)?.label ?? r.topic },
          { key: 'rev', label: 'Review', render: (r) => (r.needs_review ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-caption font-semibold text-warning">Needs AB review</span> : 'Checked') },
          { key: 'u', label: 'Updated', render: (r) => formatDate(r.updated_at) },
          { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  )
}
