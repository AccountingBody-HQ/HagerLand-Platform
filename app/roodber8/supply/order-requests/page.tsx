import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { FormAlert } from '@/components/forms/FormParts'
import { must } from '@/lib/admin/must'
import { ADMIN_STATUS_LABEL, ORDER_REQUEST_STATUSES, addisDateTime, type OrderRequestStatus } from '@/lib/supply/order-requests'
import { expireDueOrderRequests } from '@/lib/supply/order-requests-data'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { log } from '@/lib/log'

export const metadata = { title: 'Order requests' }
export const dynamic = 'force-dynamic'

/** S6-2: customers' order requests (HagerLand as the seller). Names and phones only; money is on each request, for the owner. */
export default async function OrderRequestsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  // Never show a stale "reserved": reservations whose time has passed end now.
  try {
    await expireDueOrderRequests('admin page')
  } catch (err) {
    log.error('order-requests', 'expiry on page load failed', err)
  }
  const status = (ORDER_REQUEST_STATUSES as readonly string[]).includes(searchParams.status ?? '') ? searchParams.status : undefined
  let q = getAdminSupabase().from('order_requests').select('id, reference, created_at, name, phone, status, reserved_until').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const [{ data }, switches] = await Promise.all([q.then(must), readSupplySwitches()])
  return (
    <div>
      <AdminHeader
        title="Order requests"
        description="Customers asking to order HagerLand Supply products. Nothing is paid until you reserve stock; customers never see the partner, and partners never see the customer."
      />
      {!switches.catalogueOrdering && <FormAlert tone="info">Catalogue ordering is off: customers cannot send order requests.</FormAlert>}
      <FilterBar action="/roodber8/supply/order-requests">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {ORDER_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ADMIN_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Order requests"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No order requests yet."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/supply/order-requests/${r.id}`} prefetch={false} className="font-mono text-caption underline">{r.reference}</Link> },
          { key: 'date', label: 'Sent', render: (r) => addisDateTime(r.created_at) },
          { key: 'who', label: 'Customer', render: (r) => (<div><p>{r.name}</p><p>{r.phone}</p></div>) },
          { key: 'status', label: 'Status', render: (r) => (<div><StatusBadge status={r.status} /><p className="mt-1 text-caption text-muted">{ADMIN_STATUS_LABEL[r.status as OrderRequestStatus]}{r.status === 'reserved' && r.reserved_until ? ` until ${addisDateTime(r.reserved_until)}` : ''}</p></div>) },
        ]}
      />
    </div>
  )
}
