import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { formatDate, formatPhone } from '@/lib/format'
import { bpsToPercent, ENTRY_LABEL, MODEL_LABEL, ORDER_STATUS_LABEL } from '@/lib/supply/money'
import { orderDetail } from '@/lib/supply/orders-data'
import { formatEtbExact } from '@/lib/supply/shortlist'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { DeliveryProofs, DraftEditor, OrderEntryForm, OrderLinesTable, OrderStatusControls } from '@/components/admin/SupplyOrders'

export const metadata = { title: 'Supply order' }

const EVENT_TEXT: Record<string, string> = { created: 'Order created', status: 'Status changed', ledger_entry: 'Money recorded', proof_added: 'Delivery proof added', proof_removed: 'Delivery proof removed' }

export default async function SupplyOrderPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  // Customer prices, margins, commission and the ledger are loaded only for the owner (blueprint 13.3).
  const owner = await isOwnerSession()
  const o = await orderDetail(id, owner)
  if (!o) notFound()
  const live = o.proofs.filter((p) => !p.removedAt)
  const m = o.money
  const paidInFull = Boolean(m && m.customerTotalCents && m.paidCents >= m.customerTotalCents)

  return (
    <div className="space-y-5">
      <AdminHeader
        title={o.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} /> {ORDER_STATUS_LABEL[o.status]} · model {o.model} · {o.supplier} ·{' '}
            <Link href={`/roodber8/quotes/${o.quoteId}`} prefetch={false} className="font-semibold text-green underline">
              Quote {o.quoteReference}
            </Link>
          </span>
        }
      />
      {o.proceedWithoutAgreement && <p className="rounded-md bg-error/10 px-3 py-2 text-small font-semibold text-error">Made without a signed agreement with this supplier.</p>}
      {o.statusReason && ['cancelled', 'disputed'].includes(o.status) && <p className="rounded-md bg-gold-soft px-3 py-2 text-small">Reason: {o.statusReason}</p>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Lines">
            <OrderLinesTable lines={o.lines.map((l) => ({ ...l, customerUnitPriceCents: l.customerUnitPriceCents ?? null }))} supplierDeliveryCents={o.supplierDeliveryCents} supplierTotalCents={o.supplierTotalCents} showCustomer={owner && o.model === 'A'} />
          </Panel>
          {owner && m && o.status === 'draft' && (
            <Panel title="Before sending: prices and delivery">
              <DraftEditor
                orderId={o.id}
                model={o.model}
                lines={o.lines.map((l) => ({ id: l.id, itemName: l.itemName, quantity: l.quantity, unit: l.unit, supplierUnitPriceCents: l.supplierUnitPriceCents, customerUnitPriceCents: l.customerUnitPriceCents ?? null }))}
                supplierDeliveryCents={o.supplierDeliveryCents}
                customerDeliveryCents={m.customerDeliveryCents}
                commissionBps={m.commissionBps}
                agreementRate={Boolean(m.agreement?.commissionBps !== null && m.agreement)}
                updatedAt={o.updatedAt}
              />
            </Panel>
          )}
          <Panel title="Delivery proof">
            <DeliveryProofs orderId={o.id} proofs={o.proofs} canAdd={!['draft', 'cancelled'].includes(o.status) && (owner || o.status !== 'completed')} />
          </Panel>
          {owner && m && (
            <Panel title="Money (owner only)">
              <div className="space-y-3 text-small">
                <KeyValue
                  items={[
                    ['Money model', MODEL_LABEL[o.model]],
                    ['Agreement', m.agreement ? `${MODEL_LABEL[m.agreement.model as 'A' | 'B' | 'both']}${m.agreement.commissionBps !== null ? `, ${bpsToPercent(m.agreement.commissionBps)}` : ''}` : 'None'],
                    ['Supplier total', formatEtbExact(o.supplierTotalCents)],
                    ...(o.model === 'A'
                      ? ([
                          ['Customer total', m.customerTotalCents === null ? 'Customer prices not set yet' : formatEtbExact(m.customerTotalCents)],
                          ['Customer has paid', formatEtbExact(m.paidCents)],
                          ['Paid to supplier', formatEtbExact(m.ledger.supplierPaid)],
                        ] as [string, string][])
                      : ([
                          ['Commission rate', m.commissionBps === null ? 'Not set' : bpsToPercent(m.commissionBps)],
                          ['Commission due', m.commissionDueCents === null ? 'Not set' : formatEtbExact(m.commissionDueCents)],
                          ['Commission recorded as due', formatEtbExact(m.ledger.commissionDue)],
                          ['Commission received', formatEtbExact(m.ledger.commissionReceived)],
                        ] as [string, string][])),
                    ['Service fees', formatEtbExact(m.ledger.serviceFees)],
                    ['HagerLand earned', formatEtbExact(m.earnedCents)],
                  ]}
                />
                {o.status !== 'draft' && (
                  <div className="flex flex-wrap gap-2">
                    {o.model === 'A' ? (
                      <>
                        <OrderEntryForm orderId={o.id} model="A" initialType="customer_payment" initialAmountCents={m.customerTotalCents !== null ? Math.max(0, m.customerTotalCents - m.paidCents) || null : null} label="Record customer payment" />
                        <OrderEntryForm orderId={o.id} model="A" initialType="supplier_payment" initialAmountCents={o.supplierTotalCents} label="Record payment to supplier" />
                        {m.paidCents > 0 && <OrderEntryForm orderId={o.id} model="A" initialType="refund" label="Record a refund" />}
                      </>
                    ) : (
                      <>
                        {['delivered', 'completed'].includes(o.status) && m.commissionDueCents !== null && <p className="w-full font-semibold">Commission due {formatEtbExact(m.commissionDueCents)}</p>}
                        {['delivered', 'completed'].includes(o.status) && <OrderEntryForm orderId={o.id} model="B" initialType="commission_due" initialAmountCents={m.commissionDueCents} label="Record commission due" />}
                        <OrderEntryForm orderId={o.id} model="B" initialType="commission_received" initialAmountCents={m.commissionDueCents} label="Record commission received" />
                      </>
                    )}
                    <OrderEntryForm orderId={o.id} model={o.model} initialType="service_fee" label="Record a service fee" />
                  </div>
                )}
                {o.status === 'cancelled' && o.model === 'A' && m.paidCents > 0 && <p className="font-semibold text-error">The customer paid for this order: record a refund in the ledger.</p>}
                {m.entries.length > 0 && (
                  <ul className="space-y-1">
                    {m.entries.map((e) => (
                      <li key={e.id} className={e.reversed ? 'text-muted line-through' : ''}>
                        {formatDate(e.occurredOn)} · {ENTRY_LABEL[e.type] ?? e.type} · {formatEtbExact(e.amountCents)}
                        {e.currency ? ` (${e.currency} ${((e.originalAmountMinor ?? 0) / 100).toFixed(2)} at ${e.fxRate})` : ''}
                        {e.reference ? ` · ref ${e.reference}` : ''}
                        {e.reason ? ` · ${e.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-caption text-muted">To correct a mistake, reverse the entry on the Supply ledger page.</p>
              </div>
            </Panel>
          )}
        </div>
        <aside className="space-y-5">
          <Panel title="Next step">
            <OrderStatusControls orderId={o.id} model={o.model} status={o.status} updatedAt={o.updatedAt} isOwner={owner} hasProof={live.length > 0} paidInFull={paidInFull} paymentsReceived={Boolean(m && m.paidCents > 0)} />
            {o.model === 'A' && o.status === 'paid' && <p className="mt-2 text-caption text-muted">Paid in full: you may now place the order with the supplier.</p>}
            {o.model === 'A' && ['draft', 'awaiting_payment'].includes(o.status) && <p className="mt-2 text-caption text-muted">Never place an order before the customer has paid in full.</p>}
          </Panel>
          <Panel title="Supplier">
            <p className="font-semibold">{o.supplier}</p>
            {o.partnerStatus === 'terms_agreed' && <p className="text-small text-muted">Trial partner</p>}
            {o.contact ? (
              <p className="text-small">{[o.contact.name, o.contact.phone ? formatPhone(o.contact.phone) : null, o.contact.whatsapp ? `WhatsApp ${formatPhone(o.contact.whatsapp)}` : null].filter(Boolean).join(' · ')}</p>
            ) : (
              <p className="text-small text-muted">No contact recorded.</p>
            )}
            <Link href={`/roodber8/organisations/${o.orgId}#supply-partner`} prefetch={false} className="mt-1 inline-block text-small font-semibold text-green underline">
              Open the supplier
            </Link>
          </Panel>
          <Panel title="Timeline">
            <ol className="space-y-2 text-small">
              {o.events.map((e) => (
                <li key={e.id}>
                  <p className="font-semibold">
                    {e.type === 'status' && e.toStatus ? `${ORDER_STATUS_LABEL[e.fromStatus as keyof typeof ORDER_STATUS_LABEL] ?? e.fromStatus} → ${ORDER_STATUS_LABEL[e.toStatus as keyof typeof ORDER_STATUS_LABEL] ?? e.toStatus}` : (EVENT_TEXT[e.type] ?? e.type)}
                    {e.type === 'ledger_entry' && e.detail ? `: ${ENTRY_LABEL[String(e.detail.entry_type)] ?? ''} ${formatEtbExact(Number(e.detail.amount_cents ?? 0))}` : ''}
                  </p>
                  <p className="text-caption text-muted">
                    {formatDate(e.createdAt)}
                    {e.actor ? ` · ${e.actor}` : ''}
                    {e.reason ? ` · ${e.reason}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
