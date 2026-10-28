import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate } from '@/lib/format'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Organisations' }
const PAGE = 50

export default async function AdminOrgsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = getAdminSupabase().from('organisations').select('id, name, kind, status, verification_level, source, claimed_at, is_featured, phone, updated_at, location:locations(display_name), members:organisation_members(count)', { count: 'exact' })
  if (searchParams.q) {
    const term = escapeLikePattern(searchParams.q.slice(0, 80))
    q = q.ilike('name', `%${term}%`)
  }
  if (searchParams.kind) q = q.eq('kind', searchParams.kind as 'agency')
  if (searchParams.status) q = q.eq('status', searchParams.status as 'published')
  if (searchParams.verification) q = q.eq('verification_level', searchParams.verification as 'listed')
  if (searchParams.source) q = q.eq('source', searchParams.source)
  const { data, count } = must(await q.order('updated_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1))
  return (
    <div>
      <AdminHeader
        title="Organisations"
        description={`${count ?? 0} businesses`}
        actions={
          <>
            <ButtonLink href="/roodber8/export/organisations" variant="secondary" size="sm">
              Export CSV
            </ButtonLink>
            <ButtonLink href="/roodber8/organisations/new" size="sm">
              <Plus /> New organisation
            </ButtonLink>
          </>
        }
      />
      <FilterBar action="/roodber8/organisations">
        <FilterField label="Search">
          <input name="q" defaultValue={searchParams.q} className={filterInput} />
        </FilterField>
        <FilterField label="Kind">
          <select name="kind" defaultValue={searchParams.kind ?? ''} className={filterInput}>
            <option value="">Any</option>
            {Object.entries(ORG_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="draft">private (not public)</option>
            {['pending_review', 'published', 'rejected', 'archived', 'removed'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Verification">
          <select name="verification" defaultValue={searchParams.verification ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="listed">Listed</option>
            <option value="claimed">Claimed</option>
            <option value="verified">Verified</option>
          </select>
        </FilterField>
        <FilterField label="Source">
          <select name="source" defaultValue={searchParams.source ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="self_signup">Sign-up</option>
            <option value="import">Import</option>
            <option value="admin">Admin</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <Link href={`/roodber8/organisations/${r.id}`} className="font-semibold hover:underline">{r.name}</Link> },
          { key: 'kind', label: 'Kind', render: (r) => ORG_KIND_LABEL[r.kind] },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status === 'draft' ? 'private' : r.status} /> },
          { key: 'ver', label: 'Verification', render: (r) => <StatusBadge status={r.verification_level} /> },
          { key: 'src', label: 'Source', render: (r) => r.source },
          { key: 'members', label: 'Members', render: (r) => String((r.members as { count: number }[] | null)?.[0]?.count ?? 0) },
          { key: 'loc', label: 'Location', render: (r) => (r.location as { display_name: string } | null)?.display_name ?? '' },
          { key: 'updated', label: 'Updated', render: (r) => formatDate(r.updated_at) },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `/roodber8/organisations?page=${p}`} />
    </div>
  )
}
