import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from '@/lib/supply/money'
import { listOrders } from '@/lib/supply/orders-data'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'

export const metadata = { title: 'Supply orders' }

export default async function SupplyOrdersPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  const status = ORDER_STATUSES.find((s) => s === sp.status)
  const model = sp.model === 'A' || sp.model === 'B' ? sp.model : undefined
  const orgId = sp.supplier && /^[0-9a-f-]{36}$/.test(sp.supplier) ? sp.supplier : undefined
  const action = sp.action === '1'
  const [rows, { data: suppliers }] = await Promise.all([
    listOrders({ status, model, orgId, action }),
    getAdminSupabase().from('supply_orders').select('org_id, org:organisations(name)').limit(2000),
  ])
  const supplierOptions = Array.from(new Map((suppliers ?? []).map((s) => [s.org_id, (s.org as { name: string } | null)?.name ?? ''])).entries()).sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <div>
      <AdminHeader title="Supply orders" description="Orders to suppliers, made from customer quotes. Nothing is sent automatically." />
      <FilterBar action="/roodber8/supply/orders">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Money model">
          <select name="model" defaultValue={model ?? ''} className={filterInput}>
            <option value="">Both</option>
            <option value="A">A (margin)</option>
            <option value="B">B (commission)</option>
          </select>
        </FilterField>
        <FilterField label="Supplier">
          <select name="supplier" defaultValue={orgId ?? ''} className={filterInput}>
            <option value="">All</option>
            {supplierOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Needs action">
          <select name="action" defaultValue={action ? '1' : ''} className={filterInput}>
            <option value="">Any</option>
            <option value="1">Needs action</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Supply orders"
        rows={rows}
        rowKey={(r) => r.id}
        empty={status || model || orgId || action ? 'No orders match these filters.' : 'No orders yet. Open a quote, choose suppliers, then click “Create order”.'}
        columns={[
          {
            key: 'ref',
            label: 'Order',
            render: (r) => (
              <Link href={`/roodber8/supply/orders/${r.id}`} prefetch={false} className="font-mono font-semibold hover:underline">
                {r.reference}
              </Link>
            ),
          },
          {
            key: 'quote',
            label: 'Quote',
            render: (r) => (
              <Link href={`/roodber8/quotes/${r.quoteId}`} prefetch={false} className="font-mono text-caption hover:underline">
                {r.quoteReference}
              </Link>
            ),
          },
          { key: 'supplier', label: 'Supplier', render: (r) => r.supplier },
          { key: 'model', label: 'Model', render: (r) => r.model },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (
              <div>
                <StatusBadge status={r.status} />
                {r.needsAction && <p className="text-caption font-semibold text-error">{r.needsAction}</p>}
              </div>
            ),
          },
          { key: 'created', label: 'Created', render: (r) => formatDate(r.createdAt) },
          { key: 'updated', label: 'Last update', render: (r) => formatDate(r.updatedAt) },
        ]}
      />
    </div>
  )
}
