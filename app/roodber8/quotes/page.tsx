import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatETBCents, formatPhone } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Quotes' }
const PAGE = 50
const STAGES = ['submitted', 'in_review', 'quoted', 'accepted', 'declined', 'expired', 'cancelled'] as const

export default async function AdminQuotesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const db = getAdminSupabase()
  let q = db.from('quote_requests').select('id, reference, created_at, status, source, name, phone, company_name, needed_by, quoted_total_etb_cents, assigned_to, items:quote_request_items(count)', { count: 'exact' })
  if (searchParams.status) q = q.eq('status', searchParams.status as 'submitted')
  if (searchParams.q) {
    const term = searchParams.q.trim().slice(0, 40).toUpperCase()
    if (/^HLQ-/.test(term)) q = q.eq('reference', term)
  }
  const [{ data, count }, ...stageCounts] = await Promise.all([
    q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    ...STAGES.map((s) => db.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', s)),
  ])
  return (
    <div>
      <AdminHeader
        title="Quotes"
        description="HagerLand Supply quote requests, from submitted to accepted."
        actions={
          <ButtonLink href="/roodber8/export/quotes" variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <nav aria-label="Pipeline" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href="/roodber8/quotes" className={cn('shrink-0 rounded-md border px-3 py-2 text-small font-semibold', !searchParams.status ? 'border-ink bg-ink text-white' : 'border-border bg-white')}>
          All
        </Link>
        {STAGES.map((s, i) => (
          <Link key={s} href={`/roodber8/quotes?status=${s}`} aria-current={searchParams.status === s ? 'page' : undefined} className={cn('shrink-0 rounded-md border px-3 py-2 text-small font-semibold', searchParams.status === s ? 'border-ink bg-ink text-white' : 'border-border bg-white')}>
            {s.replace('_', ' ')} <span className="tabular-nums opacity-70">{stageCounts[i].count ?? 0}</span>
          </Link>
        ))}
      </nav>
      <FilterBar action="/roodber8/quotes">
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        <FilterField label="Reference">
          <input name="q" defaultValue={searchParams.q} placeholder="HLQ-2026-000001" className={filterInput} />
        </FilterField>
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No quote requests here."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/quotes/${r.id}`} className="font-semibold tabular-nums hover:underline">{r.reference}</Link> },
          { key: 'date', label: 'Received', render: (r) => formatDate(r.created_at) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'who', label: 'Customer', render: (r) => <>{r.company_name ?? r.name}<br /><span className="text-caption text-muted">{formatPhone(r.phone)}</span></> },
          { key: 'src', label: 'Source', render: (r) => (r.source === 'materials_list' ? 'Materials list' : r.source === 'product_page' ? 'Product page' : 'Quote list') },
          { key: 'items', label: 'Items', render: (r) => (r.items as unknown as { count: number }[])[0]?.count ?? 0, className: 'tabular-nums' },
          { key: 'need', label: 'Needed by', render: (r) => (r.needed_by ? formatDate(r.needed_by) : '') },
          { key: 'total', label: 'Quoted', render: (r) => (r.quoted_total_etb_cents !== null ? formatETBCents(r.quoted_total_etb_cents) : ''), className: 'tabular-nums' },
          { key: 'who2', label: 'Assigned', render: (r) => r.assigned_to ?? '' },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `/roodber8/quotes?${searchParams.status ? `status=${searchParams.status}&` : ''}page=${p}`} />
    </div>
  )
}
