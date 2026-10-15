import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate, formatETB } from '@/lib/format'
import { COMPLETION_LABEL, DEVELOPMENT_KIND_LABEL } from '@/lib/development-labels'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Developments' }
const PAGE = 50

export default async function AdminDevelopmentsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = getAdminSupabase().from('developments').select('id, name, kind, status, is_hagerland, completion_status, total_units, price_from_etb, updated_at, developer:organisations(name), location:locations(display_name)', { count: 'exact' })
  if (searchParams.q) q = q.ilike('name', `%${escapeLikePattern(searchParams.q.slice(0, 80))}%`)
  if (searchParams.status) q = q.eq('status', searchParams.status as 'published')
  if (searchParams.own === '1') q = q.eq('is_hagerland', true)
  const { data, count } = await q.order('updated_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
  return (
    <div>
      <AdminHeader
        title="Developments"
        description={`${count ?? 0} developments and buildings`}
        actions={
          <>
            <ButtonLink href="/roodber8/export/developments" variant="secondary" size="sm">
              Export CSV
            </ButtonLink>
            <ButtonLink href="/roodber8/developments/import" variant="secondary" size="sm">
              <Upload /> Import CSV
            </ButtonLink>
            <ButtonLink href="/roodber8/developments/new" size="sm">
              <Plus /> New development
            </ButtonLink>
          </>
        }
      />
      <FilterBar action="/roodber8/developments">
        <FilterField label="Search">
          <input name="q" defaultValue={searchParams.q} className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ''} className={filterInput}>
            <option value="">Any</option>
            {['draft', 'pending_review', 'published', 'rejected', 'archived', 'removed'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Owner">
          <select name="own" defaultValue={searchParams.own ?? ''} className={filterInput}>
            <option value="">Anyone</option>
            <option value="1">HagerLand Developments</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <Link href={`/roodber8/developments/${r.id}`} className="font-semibold hover:underline">{r.name}</Link> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'kind', label: 'Kind', render: (r) => `${DEVELOPMENT_KIND_LABEL[r.kind]}${r.is_hagerland ? ' · HL' : ''}` },
          { key: 'dev', label: 'Developer', render: (r) => (r.developer as { name: string } | null)?.name ?? '—' },
          { key: 'loc', label: 'Location', render: (r) => (r.location as { display_name: string } | null)?.display_name ?? '' },
          { key: 'stage', label: 'Stage', render: (r) => (r.completion_status ? COMPLETION_LABEL[r.completion_status] : '—') },
          { key: 'price', label: 'From', render: (r) => (r.price_from_etb ? formatETB(r.price_from_etb) : '—'), className: 'tabular-nums' },
          { key: 'updated', label: 'Updated', render: (r) => formatDate(r.updated_at) },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `/roodber8/developments?page=${p}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`} />
    </div>
  )
}
