import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { formatDate, formatETBCents } from '@/lib/format'
import { AdminHeader, DataTable, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'
import { AdjustmentForm, CreateSettlementForm } from '@/components/admin/SettlementTools'
import { dueToPartners, listSettlements } from '@/lib/supply/settlements-data'
import { SETTLEMENT_STATUS_LABEL, type SettlementStatus } from '@/lib/supply/settlements'
import { todayInAddis } from '@/lib/supply/shortlist'

export const metadata = { title: 'Settlements' }
export const dynamic = 'force-dynamic'

/** S6-3 (owner only): what HagerLand owes each partner for delivered orders, and the settlements that pay it. */
export default async function SettlementsPage() {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const [due, settlements] = await Promise.all([dueToPartners(), listSettlements()])
  const today = todayInAddis()
  return (
    <div className="max-w-5xl space-y-5">
      <AdminHeader
        title="Settlements"
        description="Owner only. Partners are paid for order-request supplier orders after delivery with proof (or up front, when their terms say so, with your reason). Customers' delivery charges are HagerLand's and never paid to partners."
        actions={
          <ButtonLink href="/roodber8/supply/settlements/export" variant="secondary" size="sm" prefetch={false}>
            Export CSV
          </ButtonLink>
        }
      />
      <Panel title="Due to partners">
        {due.length === 0 ? (
          <p className="text-small text-muted">Nothing is due to partners.</p>
        ) : (
          <ul className="space-y-6">
            {due.map((p) => (
              <li key={p.orgId} className="space-y-3 border-b border-border pb-5 last:border-0">
                <p>
                  <span className="font-semibold">{p.name}</span> · due now {formatETBCents(p.dueCents)}
                </p>
                {p.pending.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-small font-semibold">Adjustments waiting for the next settlement</p>
                    {p.pending.map((a) => (
                      <div key={a.id} className="rounded-md border border-border p-3">
                        <p className="mb-2 text-small">
                          {formatETBCents(a.amountCents)} · {a.reason}
                          {a.order ? ` · ${a.order}` : ''}
                        </p>
                        <AdjustmentForm orgId={p.orgId} item={{ id: a.id, amount: (Math.abs(a.amountCents) / 100).toFixed(2), owed: a.amountCents < 0 ? 'partner_owes' : 'hagerland_owes', reason: a.reason }} />
                      </div>
                    ))}
                  </div>
                )}
                {p.orders.length > 0 && (
                  <CreateSettlementForm
                    orgId={p.orgId}
                    from={`${today.slice(0, 7)}-01`}
                    to={today}
                    orders={p.orders.map((o) => ({ id: o.id, reference: o.reference, delivered: o.deliveredAt ? `delivered ${formatDate(o.deliveredAt)}` : o.status.replace(/_/g, ' '), amount: formatETBCents(o.payableCents), eligible: o.eligible, upfront: o.upfront }))}
                  />
                )}
                <details>
                  <summary className="cursor-pointer text-small font-semibold text-green">Add an adjustment</summary>
                  <div className="mt-2">
                    <AdjustmentForm orgId={p.orgId} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <DataTable
        label="Settlements"
        rows={settlements}
        rowKey={(r) => r.id}
        empty="No settlements yet."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/supply/settlements/${r.id}`} prefetch={false} className="font-mono text-caption underline">{r.reference}</Link> },
          { key: 'partner', label: 'Partner', render: (r) => r.partner },
          { key: 'period', label: 'Period', render: (r) => `${formatDate(r.from)} – ${formatDate(r.to)}` },
          { key: 'total', label: 'Total', render: (r) => formatETBCents(r.totalCents) },
          { key: 'status', label: 'Status', render: (r) => (<div><StatusBadge status={r.status} /><p className="text-caption text-muted">{SETTLEMENT_STATUS_LABEL[r.status as SettlementStatus]}{r.paidOn ? ` ${formatDate(r.paidOn)}` : ''}</p></div>) },
        ]}
      />
    </div>
  )
}
