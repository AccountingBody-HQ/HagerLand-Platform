import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { ENTRY_LABEL, hagerlandEarned, summariseLedger } from '@/lib/supply/money'
import { LEDGER_TYPES as TYPES, ledgerEntries, ledgerFilters, orderSummaries } from '@/lib/supply/orders-data'
import { formatEtbExact } from '@/lib/supply/shortlist'
import { AdminHeader, DataTable, FilterBar, FilterField, KeyValue, Panel, filterInput } from '@/components/admin/AdminUi'
import { ManualEntryForm, ReverseEntryButton } from '@/components/admin/SupplyOrders'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Supply ledger' }

/** Every money entry for supply orders, owner only. Append-only: corrections are reversals. */
export default async function SupplyLedgerPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const f = ledgerFilters(sp)
  const [entries, { data: suppliers }] = await Promise.all([ledgerEntries(f), getAdminSupabase().from('supply_ledger_entries').select('org_id, org:organisations(name)').not('org_id', 'is', null).limit(5000)])
  const supplierOptions = Array.from(new Map((suppliers ?? []).map((s) => [s.org_id as string, (s.org as { name: string } | null)?.name ?? ''])).entries()).sort((a, b) => a[1].localeCompare(b[1]))
  const totals = entries.reduce(
    (t, e) => {
      const sign = e.type === 'reversal' ? -1 : 1
      const dir = e.type === 'reversal' ? (e.direction === 'in' ? 'out' : e.direction === 'out' ? 'in' : 'receivable') : e.direction
      if (dir === 'in') t.in += sign * e.amountCents
      else if (dir === 'out') t.out += sign * e.amountCents
      else t.receivable += sign * e.amountCents
      return t
    },
    { in: 0, out: 0, receivable: 0 },
  )
  const orders = await orderSummaries(Array.from(new Set(entries.map((e) => e.orderId).filter((x): x is string => Boolean(x)))))
  const unlinked = summariseLedger(entries.filter((e) => !e.orderId).map((e) => ({ id: e.id, entry_type: e.type, direction: e.direction, amount_cents: e.amountCents, reverses_entry_id: e.reversesEntryId })))
  const query = new URLSearchParams(Object.entries(sp).filter((x): x is [string, string] => typeof x[1] === 'string' && x[1] !== '')).toString()

  return (
    <div className="space-y-5">
      <AdminHeader
        title="Supply ledger"
        description="Money in, out and owed for supply orders. Owner only. Nothing is ever changed or deleted: correct a mistake with “Reverse entry”."
        actions={
          <ButtonLink href={`/roodber8/supply/ledger/export${query ? `?${query}` : ''}`} variant="secondary" size="sm" prefetch={false}>
            Download CSV
          </ButtonLink>
        }
      />
      <FilterBar action="/roodber8/supply/ledger">
        <FilterField label="From">
          <input type="date" name="from" defaultValue={f.from} className={filterInput} />
        </FilterField>
        <FilterField label="To">
          <input type="date" name="to" defaultValue={f.to} className={filterInput} />
        </FilterField>
        <FilterField label="Supplier">
          <select name="supplier" defaultValue={f.orgId ?? ''} className={filterInput}>
            <option value="">All</option>
            {supplierOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Order">
          <input name="order" defaultValue={f.orderReference} placeholder="HLO-2026-000001" className={`${filterInput} w-40`} />
        </FilterField>
        <FilterField label="Kind">
          <select name="type" defaultValue={f.type ?? ''} className={filterInput}>
            <option value="">All</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTRY_LABEL[t]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <Panel title="Totals for these entries">
        <KeyValue items={[['Money in', formatEtbExact(totals.in)], ['Money out', formatEtbExact(totals.out)], ['Owed to HagerLand (commission due)', formatEtbExact(totals.receivable)], ['In minus out', formatEtbExact(totals.in - totals.out)]]} />
      </Panel>
      <Panel title="Entries">
        <DataTable
          label="Ledger entries"
          rows={entries}
          rowKey={(e) => e.id}
          empty="No ledger entries yet."
          columns={[
            { key: 'date', label: 'Date', render: (e) => formatDate(e.occurredOn) },
            {
              key: 'kind',
              label: 'Kind',
              render: (e) => (
                <div className={e.reversed ? 'text-muted line-through' : ''}>
                  <p className="font-semibold">{ENTRY_LABEL[e.type] ?? e.type}</p>
                  {e.reason && <p className="text-caption">{e.reason}</p>}
                </div>
              ),
            },
            { key: 'amount', label: 'Amount', render: (e) => <span className="tabular-nums">{e.direction === 'out' ? '−' : ''}{formatEtbExact(e.amountCents)}{e.direction === 'receivable' ? ' (owed)' : ''}</span> },
            { key: 'fx', label: 'Paid as', render: (e) => (e.currency ? `${e.currency} ${((e.originalAmountMinor ?? 0) / 100).toFixed(2)} at ${e.fxRate}` : '') },
            { key: 'order', label: 'Order', render: (e) => (e.orderId ? <Link href={`/roodber8/supply/orders/${e.orderId}`} prefetch={false} className="font-mono text-caption hover:underline">{e.orderReference}</Link> : '') },
            { key: 'supplier', label: 'Supplier', render: (e) => e.supplier ?? '' },
            { key: 'ref', label: 'Reference', render: (e) => [e.method?.replace('_', ' '), e.reference].filter(Boolean).join(' · ') },
            { key: 'act', label: '', render: (e) => (e.type !== 'reversal' && !e.reversed ? <ReverseEntryButton entryId={e.id} /> : e.reversed ? <span className="text-caption text-muted">Reversed</span> : '') },
          ]}
        />
      </Panel>
      <Panel title="By order">
        <DataTable
          label="Money by order"
          rows={orders}
          rowKey={(o) => o.id}
          empty="No order has money recorded yet."
          columns={[
            { key: 'ref', label: 'Order', render: (o) => <Link href={`/roodber8/supply/orders/${o.id}`} prefetch={false} className="font-mono font-semibold hover:underline">{o.reference}</Link> },
            { key: 'supplier', label: 'Supplier', render: (o) => `${o.supplier} (model ${o.model})` },
            { key: 'cust', label: 'Customer paid', render: (o) => formatEtbExact(o.summary.customerPaid - o.summary.refunds) },
            { key: 'supp', label: 'Supplier paid', render: (o) => formatEtbExact(o.summary.supplierPaid) },
            { key: 'comm', label: 'Commission due / received', render: (o) => `${formatEtbExact(o.summary.commissionDue)} / ${formatEtbExact(o.summary.commissionReceived)}` },
            { key: 'fees', label: 'Service fees', render: (o) => formatEtbExact(o.summary.serviceFees) },
            { key: 'refunds', label: 'Refunds', render: (o) => formatEtbExact(o.summary.refunds) },
            { key: 'earned', label: 'HagerLand earned', render: (o) => <strong className="tabular-nums">{formatEtbExact(o.earnedCents)}</strong> },
          ]}
        />
        {(unlinked.serviceFees || unlinked.adjustmentsIn || unlinked.adjustmentsOut) > 0 && <p className="mt-2 text-small">Not linked to an order: {formatEtbExact(hagerlandEarned('B', unlinked))} (service fees and adjustments).</p>}
      </Panel>
      <Panel title="Add a service fee or adjustment">
        <ManualEntryForm />
      </Panel>
    </div>
  )
}
