import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { isVerticalKey } from '@/lib/verticals'
import { AdminHeader, DataTable, FilterBar, FilterField, SimplePager, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { LeadTool } from '@/components/admin/VerticalTools'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Interest registrations' }

const PAGE = 50

export default async function InterestPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const db = getAdminSupabase()
  const vertical = isVerticalKey(searchParams.vertical) ? searchParams.vertical : undefined
  const status = ['new', 'contacted', 'closed'].includes(searchParams.status ?? '') ? searchParams.status : undefined
  const category = searchParams.category?.slice(0, 80) || undefined
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = db.from('interest_registrations').select('*').order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE)
  if (vertical) q = q.eq('vertical_key', vertical)
  if (status) q = q.eq('status', status)
  if (category) q = q.eq('category', category)
  const [{ data }, { data: verticals }, { data: cats }] = await Promise.all([
    q,
    db.from('verticals').select('key, name').order('sort'),
    readAll(() => db.from('interest_registrations').select('category').not('category', 'is', null), { maxRows: REPORT_MAX_ROWS }),
  ])
  const rows = (data ?? []).slice(0, PAGE)
  const names = new Map((verticals ?? []).map((v) => [v.key, v.name]))
  const categories = Array.from(new Set((cats ?? []).map((c) => c.category).filter((c): c is string => Boolean(c)))).sort()
  const qs = new URLSearchParams(Object.entries({ vertical, status, category }).filter((e): e is [string, string] => Boolean(e[1])))
  return (
    <div>
      <AdminHeader
        title="Interest registrations"
        description="People who registered interest in a service. They were promised an email when it opens, and other news only if they ticked the box."
        actions={
          <ButtonLink href={`/roodber8/export/interest?${qs.toString()}`} variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <FilterBar action="/roodber8/interest">
        <FilterField label="Vertical">
          <select name="vertical" defaultValue={vertical ?? ''} className={filterInput}>
            <option value="">All</option>
            {(verticals ?? []).map((v) => (
              <option key={v.key} value={v.key}>
                {v.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select name="category" defaultValue={category ?? ''} className={filterInput}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Interest registrations"
        rows={rows}
        rowKey={(r) => r.id}
        empty="No registrations match."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <span className="font-mono text-caption">{r.reference}</span> },
          { key: 'date', label: 'Date', render: (r) => formatDate(r.created_at) },
          { key: 'v', label: 'Vertical', render: (r) => names.get(r.vertical_key) ?? r.vertical_key },
          { key: 'cat', label: 'Interest', render: (r) => [r.audience, r.category].filter(Boolean).join(' · ') },
          { key: 'who', label: 'Contact', render: (r) => (<div><p className="font-semibold">{r.name}</p><p>{r.email}</p>{r.phone && <p>{r.phone}</p>}</div>) },
          { key: 'where', label: 'Where', render: (r) => [r.city, countryName(r.country_code)].filter(Boolean).join(', ') },
          { key: 'msg', label: 'Message', render: (r) => <span className="line-clamp-3 max-w-xs">{r.message ?? ''}</span> },
          { key: 'news', label: 'News', render: (r) => (r.marketing_consent ? 'Yes' : 'No') },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'act', label: '', render: (r) => <LeadTool kind="interest" id={r.id} status={r.status} notes={r.admin_notes} statuses={['new', 'contacted', 'closed']} /> },
        ]}
      />
      <SimplePager page={page} hasMore={(data ?? []).length > PAGE} hrefFor={(p) => `/roodber8/interest?${qs.toString()}&page=${p}`} />
    </div>
  )
}
