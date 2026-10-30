import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { formatDate, formatETBCents } from '@/lib/format'
import { unitLabel } from '@/lib/units'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { FormAlert } from '@/components/forms/FormParts'
import {
  CloseDisputeButton,
  CreateSupplierOrdersButton,
  HoldForm,
  LineStockForm,
  PaymentForm,
  ReasonStep,
  ReleaseHoldButton,
  ReserveForm,
  ReceiptNumberButton,
  ReverseEntryButton,
  StartCheckButton,
  StockOutcomeButtons,
} from '@/components/admin/OrderRequestTools'
import { ADMIN_STATUS_LABEL, EDITABLE, addisDateTime } from '@/lib/supply/order-requests'
import { RULE_LABEL } from '@/lib/supply/trade-prices'
import { termsLabel } from '@/lib/supply/terms'
import { expireDueOrderRequests, loadAdminOrderRequest } from '@/lib/supply/order-requests-data'
import { activePaymentMethods } from '@/lib/supply/payment-methods-data'
import { todayInAddis } from '@/lib/supply/shortlist'
import { log } from '@/lib/log'

export const metadata = { title: 'Order request' }
export const dynamic = 'force-dynamic'

const ENTRY_LABEL: Record<string, string> = { customer_payment: 'Payment from the customer', refund: 'Refund to the customer', moved_to_order: 'Moved to a supplier order', reversal: 'Reversal' }

/** S6-2: one order request. Operations: stock checks and holds (partner names, no money). Owner: prices, payments, orders. */
export default async function OrderRequestPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireAdminPage()
  if (!z.uuid().safeParse(id).success) notFound()
  try {
    await expireDueOrderRequests('admin page')
  } catch (err) {
    log.error('order-requests', 'expiry on page load failed', err)
  }
  const owner = await isOwnerSession()
  const r = await loadAdminOrderRequest(id, owner)
  if (!r) notFound()
  const editable = EDITABLE.includes(r.status)
  const checking = r.status === 'checking_stock'
  const decided = r.lines.every((l) => l.status !== 'requested')
  const someAvailable = r.lines.some((l) => l.status === 'confirmed' || l.status === 'short')
  const someMissing = r.lines.some((l) => l.status === 'unavailable' || l.status === 'short')
  const methodCount = owner ? (await activePaymentMethods()).length : 0
  const reservable = owner && (r.status === 'partially_reserved' || (checking && decided && someAvailable && !someMissing))
  return (
    <div className="max-w-5xl space-y-5">
      <AdminHeader
        title={r.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} /> {ADMIN_STATUS_LABEL[r.status]}
            {r.status === 'reserved' && r.reservedUntil ? ` until ${addisDateTime(r.reservedUntil)} (Addis Ababa time)` : ''} · sent {addisDateTime(r.createdAt)}
          </span>
        }
      />
      {r.statusReason && <FormAlert tone="info">Reason: {r.statusReason}</FormAlert>}
      {r.personalDataDeletedAt && <FormAlert tone="info">Personal details were cleared on {formatDate(r.personalDataDeletedAt)} (keeping period).</FormAlert>}
      <Panel title="Customer">
        <KeyValue
          items={[
            ['Name', r.name],
            ['Phone', r.phone],
            ['Email', r.email ?? 'None: phone the customer'],
            ['Delivery area', r.deliveryArea],
            ['Delivery address', r.deliveryAddress ?? ''],
            ['Needed by', r.neededBy ? formatDate(r.neededBy) : ''],
            ['Message', r.note ?? ''],
          ]}
        />
        <p className="mt-3 text-small text-muted">Never give the customer&rsquo;s name, phone or address to a partner.</p>
      </Panel>

      <Panel title="Items and stock">
        <ul className="space-y-5">
          {r.lines.map((l) => (
            <li key={l.id} className="space-y-3 border-b border-border pb-4 last:border-0">
              <p>
                <span className="font-semibold">{l.itemName}</span> · {l.quantity} {unitLabel(l.unit, l.quantity)} asked ·{' '}
                <span className="text-muted">
                  {l.status === 'requested' ? 'not checked yet' : l.status === 'confirmed' ? 'all available' : l.status === 'short' ? `${l.confirmedQty} available` : 'not available'}
                </span>
                {l.money && (
                  <span className="text-muted">
                    {' '}
                    · customer price {l.money.unitPriceCents === null ? '—' : formatETBCents(l.money.unitPriceCents)} · partner cost {l.money.costCents === null ? '—' : formatETBCents(l.money.costCents)}
                    {l.money.termsModel ? ` · ${termsLabel({ model: l.money.termsModel as 'markup', bps: l.money.termsBps })} · HagerLand pays the partner ${formatETBCents(l.money.payableUnitCents)}` : ''}
                  </span>
                )}
              </p>
              {l.holds.length > 0 && (
                <ul className="space-y-1 text-small">
                  {l.holds.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2">
                      <span>
                        {h.partner} · {h.qty} {unitLabel(l.unit, h.qty)} · {h.status}
                        {h.heldUntil ? ` until ${addisDateTime(h.heldUntil)}` : ''}
                        {h.partnerReference ? ` · ref ${h.partnerReference}` : ''}
                        {h.note ? ` · ${h.note}` : ''}
                      </span>
                      {editable && (h.status === 'held' || h.status === 'asked') && <ReleaseHoldButton id={r.id} holdId={h.id} />}
                    </li>
                  ))}
                </ul>
              )}
              {editable && r.status !== 'submitted' && r.status !== 'expired' && (
                <>
                  <LineStockForm id={r.id} lineId={l.id} status={l.status} confirmedQty={l.confirmedQty} />
                  {l.status !== 'unavailable' && !l.holds.some((h) => h.status === 'held') && <HoldForm id={r.id} lineId={l.id} partners={l.partners} quantity={l.confirmedQty ?? l.quantity} />}
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {(r.status === 'submitted' || (r.status === 'expired' && owner)) && <StartCheckButton id={r.id} reopen={r.status === 'expired'} />}
          {(r.status === 'submitted' || checking) && <StockOutcomeButtons id={r.id} canPartial={checking && decided && someAvailable && someMissing} canNone={r.status === 'submitted' || r.lines.every((l) => l.status === 'unavailable' || l.status === 'requested')} />}
        </div>
      </Panel>

      {reservable && (
        <Panel title="Reserve (owner)">
          {methodCount === 0 && <FormAlert>Add an active payment method in Supplies → Payment methods first: the customer needs it to pay.</FormAlert>}
          <p className="mb-3 text-small text-muted">Each available item needs a partner hold that lasts until the reservation ends. The customer is emailed the amount, the end time and how to pay.</p>
          <ReserveForm
            id={r.id}
            lines={r.lines
              .filter((l) => l.status === 'confirmed' || l.status === 'short')
              .map((l) => {
                // S6-3: pre-filled with the price suggested by the partner's terms (the owner may change it; a change is kept in the history).
                const suggested = l.money?.suggested ?? null
                // S6-4: a trade customer's own price comes first (only while trade pricing is on).
                const trade = l.money?.trade ?? null
                const price = l.money?.unitPriceCents ?? trade?.priceCents ?? suggested?.customerUnitCents ?? null
                return {
                  id: l.id,
                  name: l.itemName,
                  qty: l.confirmedQty ?? l.quantity,
                  unit: unitLabel(l.unit, l.confirmedQty ?? l.quantity),
                  price: price !== null ? (price / 100).toFixed(2) : '',
                  cost: suggested?.payableUnitCents != null ? formatETBCents(suggested.payableUnitCents) : l.money?.costCents != null ? formatETBCents(l.money.costCents) : null,
                  terms: suggested ? `${termsLabel(suggested)}${suggested.customerUnitCents !== null ? ` · suggested ${formatETBCents(suggested.customerUnitCents)}` : ''}${trade ? ` · trade price ${formatETBCents(trade.priceCents)} (${RULE_LABEL[trade.rule].toLowerCase()})` : ''}` : null,
                }
              })}
          />
        </Panel>
      )}

      {r.money && (
        <Panel title="Money (owner only)">
          <KeyValue
            items={[
              ['Items', r.money.linesTotalCents === null ? '' : formatETBCents(r.money.linesTotalCents)],
              ['Delivery', r.money.deliveryCents === null ? '' : formatETBCents(r.money.deliveryCents)],
              ['Customer total', r.money.totalCents === null ? '' : formatETBCents(r.money.totalCents)],
              ['Received', formatETBCents(r.money.receivedCents)],
              ['Held on this request', formatETBCents(r.money.netCents)],
              ['Held in total (incl. supplier orders)', formatETBCents(r.money.heldCents)],
            ]}
          />
          {r.money.entries.length > 0 && (
            <ul className="mt-4 space-y-1 text-small">
              {r.money.entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2">
                  <span>
                    {formatDate(e.occurredOn)} · {ENTRY_LABEL[e.type] ?? e.type} · {formatETBCents(e.amountCents)}
                    {e.method ? ` · ${e.method.replace('_', ' ')}` : ''}
                    {e.reference ? ` · ${e.reference}` : ''}
                    {e.receiptNumber ? ` · receipt ${e.receiptNumber}` : ''}
                    {e.reason ? ` · ${e.reason}` : ''}
                    {e.note ? ` · ${e.note}` : ''}
                    {e.reversed ? ' · reversed' : ''}
                  </span>
                  {!e.reversed && e.type === 'customer_payment' && <ReceiptNumberButton id={r.id} entryId={e.id} current={e.receiptNumber} />}
                  {!e.reversed && (e.type === 'customer_payment' || e.type === 'refund') && <ReverseEntryButton id={r.id} entryId={e.id} />}
                </li>
              ))}
            </ul>
          )}
          {!['unavailable', 'cancelled', 'submitted'].includes(r.status) && (
            <div className="mt-4">
              <PaymentForm id={r.id} today={todayInAddis()} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {r.status === 'paid' && <CreateSupplierOrdersButton id={r.id} />}
            {['submitted', 'checking_stock', 'partially_reserved', 'reserved', 'expired'].includes(r.status) && r.money.receivedCents === 0 && <ReasonStep id={r.id} kind="cancel" label="Cancel (nothing was paid)" />}
            {['reserved', 'expired', 'paid', 'fulfilling', 'disputed'].includes(r.status) && r.money.receivedCents > 0 && <ReasonStep id={r.id} kind="refunded" label="Close as refunded" />}
            {r.status === 'disputed' && <CloseDisputeButton id={r.id} />}
          </div>
          {['reserved', 'expired', 'paid', 'fulfilling', 'disputed'].includes(r.status) && r.money.receivedCents > 0 && (
            <p className="mt-2 text-small text-muted">To close as refunded: cancel any supplier orders and record their refunds there, record any other refund here, then close.</p>
          )}
        </Panel>
      )}

      {r.status === 'delivered' && (
        <Panel title="Problem with the delivery?">
          <ReasonStep id={r.id} kind="dispute" label="Mark disputed" />
        </Panel>
      )}

      {r.orders.length > 0 && (
        <Panel title="Supplier orders">
          <ul className="space-y-1">
            {r.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/roodber8/supply/orders/${o.id}`} prefetch={false} className="font-mono underline">
                  {o.reference}
                </Link>{' '}
                · {o.supplier} · {o.status.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="History">
        <ul className="space-y-1 text-small">
          {r.events.map((e, i) => (
            <li key={i}>
              {addisDateTime(e.at)} · {e.type === 'status' ? `${e.from ? ADMIN_STATUS_LABEL[e.from as keyof typeof ADMIN_STATUS_LABEL] ?? e.from : ''} → ${ADMIN_STATUS_LABEL[e.to as keyof typeof ADMIN_STATUS_LABEL] ?? e.to}` : e.type === 'created' ? 'Sent by the customer' : owner ? e.type.replace('_', ' ') : 'Money entry'}
              {e.reason ? ` · ${e.reason}` : ''}
              {e.actor ? ` · ${e.actor}` : ''}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
