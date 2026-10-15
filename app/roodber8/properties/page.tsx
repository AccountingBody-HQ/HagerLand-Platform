import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate, formatETB } from '@/lib/format'
import { PROPERTY_TYPES, propertyTypeLabel } from '@/lib/labels'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Properties' }
const PAGE = 50
type Raw = Record<string, string | undefined>

export default async function AdminPropertiesPage(props: { searchParams: Promise<Raw> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const db = getAdminSupabase()
  let q = db.from('properties').select('id, short_id, title, status, purpose, property_type, price_etb, price_on_request, lister_type, is_featured, is_hagerland, views_count, enquiries_count, expires_at, updated_at, location:locations(display_name)', { count: 'exact' })
  if (searchParams.q) {
    const term = searchParams.q.trim().slice(0, 80)
    q = /^[0-9a-z]{8}$/i.test(term) ? q.eq('short_id', term.toLowerCase()) : q.ilike('title', `%${escapeLikePattern(term)}%`)
  }
  if (searchParams.status) q = q.eq('status', searchParams.status as 'published')
  if (searchParams.purpose) q = q.eq('purpose', searchParams.purpose as 'sale')
  if (searchParams.type) q = q.eq('property_type', searchParams.type as 'house')
  if (searchParams.lister) q = q.eq('lister_type', searchParams.lister)
  if (searchParams.featured === '1') q = q.eq('is_featured', true)
  if (searchParams.expiring === '1') q = q.eq('status', 'published').lt('expires_at', new Date(Date.now() + 7 * 86_400_000).toISOString())
  const { data, count } = await q.order('updated_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
  const rows = data ?? []
  const qs = (p: number) => {
    const s = new URLSearchParams(Object.entries(searchParams).filter((e): e is [string, string] => Boolean(e[1]) && e[0] !== 'page'))
    if (p > 1) s.set('page', String(p))
    return `/roodber8/properties${s.toString() ? `?${s}` : ''}`
  }

  return (
    <div>
      <AdminHeader
        title="Properties"
        description={`${count ?? 0} listings`}
        actions={
          <>
            <ButtonLink href="/roodber8/export/properties" variant="secondary" size="sm">
              Export CSV
            </ButtonLink>
            <ButtonLink href="/roodber8/properties/new" size="sm">
              <Plus /> New listing
            </ButtonLink>
          </>
        }
      />
      <FilterBar action="/roodber8/properties">
        <FilterField label="Search">
          <input name="q" defaultValue={searchParams.q} placeholder="Title or reference" className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ''} className={filterInput}>
            <option value="">Any</option>
            {['draft', 'pending_review', 'published', 'paused', 'expired', 'rejected', 'archived', 'removed'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Purpose">
          <select name="purpose" defaultValue={searchParams.purpose ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="sale">For sale</option>
            <option value="rent">To rent</option>
          </select>
        </FilterField>
        <FilterField label="Type">
          <select name="type" defaultValue={searchParams.type ?? ''} className={filterInput}>
            <option value="">Any</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Lister">
          <select name="lister" defaultValue={searchParams.lister ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="owner">Owner</option>
            <option value="agent">Agent</option>
            <option value="developer">Developer</option>
            <option value="hagerland">HagerLand</option>
          </select>
        </FilterField>
        <FilterField label="Featured">
          <select name="featured" defaultValue={searchParams.featured ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="1">Featured</option>
          </select>
        </FilterField>
        <FilterField label="Expiring">
          <select name="expiring" defaultValue={searchParams.expiring ?? ''} className={filterInput}>
            <option value="">Any</option>
            <option value="1">In 7 days</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { key: 'title', label: 'Listing', render: (r) => <Link href={`/roodber8/properties/${r.id}`} className="font-semibold text-ink hover:underline">{r.title}</Link> },
          { key: 'ref', label: 'Ref', render: (r) => <span className="font-mono text-caption">{r.short_id}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'type', label: 'Type', render: (r) => `${propertyTypeLabel(r.property_type)} · ${r.purpose}` },
          { key: 'price', label: 'Price', render: (r) => (r.price_on_request ? 'On request' : formatETB(r.price_etb)), className: 'tabular-nums' },
          { key: 'loc', label: 'Location', render: (r) => (r.location as { display_name: string } | null)?.display_name ?? '' },
          { key: 'lister', label: 'Lister', render: (r) => `${r.lister_type}${r.is_hagerland ? ' · HL' : ''}${r.is_featured ? ' · ★' : ''}` },
          { key: 'stats', label: 'Views / enq.', render: (r) => `${r.views_count} / ${r.enquiries_count}`, className: 'tabular-nums' },
          { key: 'expires', label: 'Expires', render: (r) => (r.expires_at ? formatDate(r.expires_at) : '—') },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={qs} />
    </div>
  )
}
