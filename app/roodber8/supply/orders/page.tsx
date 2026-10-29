import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import Link from 'next/link'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { supplyActionItems } from '@/lib/supply/insights-data'
import { MarkExpiredButton } from '@/components/admin/SupplyInsights'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from '@/lib/supply/money'
import { listOrders } from '@/lib/supply/orders-data'
import { AdminHeader, DataTable, FilterBar, FilterField, Panel, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Supply orders' }

export default async function SupplyOrdersPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  const status = ORDER_STATUSES.find((s) => s === sp.status)
  const model = sp.model === 'A' || sp.model === 'B' ? sp.model : undefined
  const orgId = sp.supplier && /^[0-9a-f-]{36}$/.test(sp.supplier) ? sp.supplier : undefined
  const action = sp.action === '1'
  const owner = await isOwnerSession()
  const [rows, { data: suppliers }, extra] = must(await Promise.all([
    listOrders({ status, model, orgId, action }),
    readAll(() => getAdminSupabase().from('supply_orders').select('org_id, org:organisations(name)'), { maxRows: REPORT_MAX_ROWS }),
    // Agreement and commission items only for the owner (decided here, on the server).
    action ? supplyActionItems(owner) : Promise.resolve([]),
  ]))
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
      {action && (
        <Panel title={`Also needs action (${extra.length})`}>
          {extra.length === 0 ? (
            <p className="text-small text-muted">Nothing else needs action: contacts, re-verification, prices on open quotes and promised deliveries are all up to date.</p>
          ) : (
            <ul className="space-y-1 text-small">
              {extra.map((a, i) => (
                <li key={`${a.kind}-${i}`} className="flex flex-wrap items-center gap-2">
                  <Link href={a.href} prefetch={false} className="text-green underline">
                    {a.text}
                  </Link>
                  {a.kind === 'agreement_overdue' && a.agreementId && a.orgId && <MarkExpiredButton orgId={a.orgId} agreementId={a.agreementId} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      {/* Phones: one card per order instead of a table that needs sideways swiping. */}
      <ul aria-label="Supply orders" className="space-y-2 sm:hidden">
        {rows.length === 0 && <li className="rounded-lg border border-border bg-white p-4 text-small text-muted">{status || model || orgId || action ? 'No orders match these filters.' : 'No orders yet. Open a quote, choose suppliers, then click “Create order”.'}</li>}
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-white p-4 text-small">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/roodber8/supply/orders/${r.id}`} prefetch={false} className="inline-flex min-h-11 items-center font-mono font-semibold text-green underline">
                {r.reference}
              </Link>
              <StatusBadge status={r.status} />
            </div>
            <p className="font-semibold">{r.supplier}</p>
            <p className="text-muted">
              Model {r.model} · last update {formatDate(r.updatedAt)}
            </p>
            {r.needsAction && <p className="mt-1 font-semibold text-error">Needs action: {r.needsAction}</p>}
          </li>
        ))}
      </ul>
      <div className="hidden sm:block">
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
              label: 'Quote or request',
              // S6-2: an order comes from a quote or from an order request (exactly one).
              render: (r) => (
                <Link href={r.quoteId ? `/roodber8/quotes/${r.quoteId}` : `/roodber8/supply/order-requests/${r.orderRequestId}`} prefetch={false} className="font-mono text-caption hover:underline">
                  {r.quoteId ? r.quoteReference : r.orderRequestReference}
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
    </div>
  )
}
