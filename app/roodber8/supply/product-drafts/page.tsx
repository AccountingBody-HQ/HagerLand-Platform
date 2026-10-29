import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { must } from '@/lib/admin/must'
import { DRAFT_STATUSES, DRAFT_STATUS_LABEL } from '@/lib/supply/partner-rules'

export const metadata = { title: 'Partner product drafts' }

/** S6-1: products partners propose. Operations may ask for changes; the owner approves or declines. */
export default async function PartnerDraftsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const status = searchParams.status === 'all' ? undefined : (DRAFT_STATUSES as readonly string[]).includes(searchParams.status ?? '') ? searchParams.status : 'submitted'
  const db = getAdminSupabase()
  // Name, partner and status only: prices and product codes are shown to the owner on the draft itself.
  let q = db.from('partner_product_drafts').select('id, name, brand_name, status, submitted_at, updated_at, org_id').order('updated_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const { data } = must(await q)
  const orgIds = Array.from(new Set((data ?? []).map((d) => d.org_id)))
  const { data: regs } = orgIds.length ? must(await db.from('partner_registrations').select('org_id, business_name').in('org_id', orgIds)) : { data: [] }
  const partner = new Map((regs ?? []).map((r) => [r.org_id, r.business_name]))
  return (
    <div>
      <AdminHeader title="Partner product drafts" description="Products partners would like HagerLand Supply to offer. An approved draft becomes a HagerLand Supply product draft; customers never see the partner." />
      <FilterBar action="/roodber8/supply/product-drafts">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? 'all'} className={filterInput}>
            <option value="all">All</option>
            {DRAFT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {DRAFT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Partner product drafts"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="Nothing waiting."
        columns={[
          { key: 'name', label: 'Product', render: (r) => (<div><Link href={`/roodber8/supply/product-drafts/${r.id}`} prefetch={false} className="font-semibold underline">{r.name}</Link>{r.brand_name && <p>{r.brand_name}</p>}</div>) },
          { key: 'partner', label: 'Partner', render: (r) => partner.get(r.org_id) ?? '' },
          { key: 'sent', label: 'Sent', render: (r) => formatDate(r.submitted_at) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  )
}
