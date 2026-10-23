'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import { addProofAction, createOrdersAction, proofUploadAction, recordOrderEntryAction, removeProofAction, saveDraftOrderAction, setOrderStatusAction, type OrderGroupInput } from '@/app/roodber8/actions/supply-orders'
import { addManualEntryAction, reverseEntryAction } from '@/app/roodber8/actions/supply-ledger'
import { bpsToPercent, canTransition, ENTRY_LABEL, lineTotalCents, MODEL_LABEL, roundHalfUp, type MoneyModel, type OrderStatus } from '@/lib/supply/money'
import { formatEtbExact, todayInAddis } from '@/lib/supply/shortlist'
import { unitLabel } from '@/lib/units'
import { formatDate, formatPhone } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'
import { PrivateUpload } from './SupplyAgreements'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    error,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        setError('')
        const res = await fn()
        if (res.ok) {
          toast(res.data.message, 'success')
          after?.()
          router.refresh()
        } else setError(res.error)
      }),
  }
}

const cents = (c: number) => (c / 100).toFixed(2)
const today = () => todayInAddis()

/* ------------------------------------------------------------- Create orders -------------------------------------------------------------- */

export interface OrderGroupView {
  orgId: string
  name: string
  trial: boolean
  lines: number
  agreement: { model: string; commissionBps: number | null } | null
}

/** On the quote page: one draft order per supplier from the chosen lines. Owner only (decided on the server). */
export function CreateOrders({ quoteId, groups }: { quoteId: string; groups: OrderGroupView[] }) {
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState<Record<string, OrderGroupInput>>(() => Object.fromEntries(groups.map((g) => [g.orgId, { orgId: g.orgId, model: g.agreement && g.agreement.model !== 'both' ? (g.agreement.model as 'A' | 'B') : '', proceedWithoutAgreement: false, commission: '' }])))
  const { pending, error, run } = useRun()
  if (!groups.length) return null
  const set = (orgId: string, patch: Partial<OrderGroupInput>) => setChoices({ ...choices, [orgId]: { ...choices[orgId], ...patch } })
  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        Create order{groups.length > 1 ? 's' : ''}
      </Button>
    )
  return (
    <div role="group" aria-label="Create orders" className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-small">One draft order per supplier, from the chosen lines. Nothing is sent to anyone.</p>
      {error && <FormAlert>{error}</FormAlert>}
      {groups.map((g) => {
        const c = choices[g.orgId]
        const fixed = g.agreement && g.agreement.model !== 'both'
        return (
          <div key={g.orgId} className="space-y-2 rounded-md bg-stone-50 p-3 text-small">
            <p className="font-semibold">
              {g.name} {g.trial && <span className="font-normal text-muted">(trial partner)</span>} · {g.lines === 1 ? '1 line' : `${g.lines} lines`}
            </p>
            {g.agreement ? (
              <p>
                Agreement: {MODEL_LABEL[g.agreement.model as 'A' | 'B' | 'both']}
                {g.agreement.commissionBps !== null ? `, commission ${bpsToPercent(g.agreement.commissionBps)}` : ''}
              </p>
            ) : (
              <p className="font-semibold text-error">No signed agreement</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Money model for ${g.name}`} htmlFor={`co-model-${g.orgId}`}>
                <Select id={`co-model-${g.orgId}`} value={c.model} disabled={Boolean(fixed)} onChange={(e) => set(g.orgId, { model: e.target.value as 'A' | 'B' | '' })}>
                  <option value="">Choose…</option>
                  <option value="A">{MODEL_LABEL.A}</option>
                  <option value="B">{MODEL_LABEL.B}</option>
                </Select>
              </Field>
              {c.model === 'B' && g.agreement?.commissionBps == null && (
                <Field label={`Commission % for ${g.name}`} htmlFor={`co-comm-${g.orgId}`}>
                  <Input id={`co-comm-${g.orgId}`} value={c.commission} onChange={(e) => set(g.orgId, { commission: e.target.value })} inputMode="decimal" placeholder="e.g. 5" />
                </Field>
              )}
            </div>
            {!g.agreement && <Checkbox id={`co-proceed-${g.orgId}`} label={`Proceed without an agreement for ${g.name}`} checked={c.proceedWithoutAgreement} onChange={(e) => set(g.orgId, { proceedWithoutAgreement: e.target.checked })} />}
          </div>
        )
      })}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending} onClick={() => run(() => createOrdersAction(quoteId, Object.values(choices)), () => setOpen(false))}>
          Create draft order{groups.length > 1 ? 's' : ''}
        </Button>
        <Button className="flex-1" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Status steps ---------------------------------------------------------------- */

const STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  awaiting_payment: 'Send to customer for payment',
  paid: 'Mark as paid',
  placed: 'Place with supplier',
  confirmed: 'Supplier confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Complete',
  disputed: 'Report a problem',
  cancelled: 'Cancel order',
}
const OPERATIONS_STEPS: Partial<Record<OrderStatus, OrderStatus[]>> = { placed: ['confirmed'], confirmed: ['out_for_delivery'], out_for_delivery: ['delivered', 'disputed'], delivered: ['disputed'] }

export function OrderStatusControls({ orderId, model, status, updatedAt, isOwner, hasProof, paidInFull, paymentsReceived }: { orderId: string; model: MoneyModel; status: OrderStatus; updatedAt: string; isOwner: boolean; hasProof: boolean; paidInFull: boolean; paymentsReceived: boolean }) {
  const { pending, error, run } = useRun()
  const next = (['awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'disputed', 'cancelled'] as OrderStatus[]).filter((to) => canTransition(model, status, to) && (isOwner || (OPERATIONS_STEPS[status] ?? []).includes(to)))
  if (!next.length) return <p className="text-small text-muted">No further steps.</p>
  const blocked = (to: OrderStatus): string | null => {
    if (to === 'paid' && !paidInFull) return 'Record the customer’s payment in full first.'
    if (to === 'completed' && !hasProof) return 'Add delivery proof first.'
    return null
  }
  const go = (to: OrderStatus) => {
    let reason = ''
    if (to === 'cancelled' || to === 'disputed') {
      reason = window.prompt(to === 'cancelled' ? 'Why is the order being cancelled?' : 'What is the problem?') ?? ''
      if (!reason) return
      if (to === 'cancelled' && paymentsReceived) window.alert('The customer has paid for this order: record a refund in the ledger.')
    } else if (to === 'awaiting_payment' && !window.confirm('Nothing is sent automatically: tell the customer the total yourself. Continue?')) return
    run(() => setOrderStatusAction(orderId, to, reason, updatedAt))
  }
  return (
    <div className="space-y-2">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        {next.map((to) => {
          const why = blocked(to)
          return (
            <Button key={to} size="sm" variant={to === 'cancelled' || to === 'disputed' ? 'secondary' : 'primary'} disabled={pending || Boolean(why)} title={why ?? undefined} onClick={() => go(to)}>
              {status === 'disputed' && to === 'delivered' ? 'Problem solved: delivered' : STEP_LABEL[to]}
            </Button>
          )
        })}
      </div>
      {next.map(blocked).filter(Boolean).map((why) => (
        <p key={why} className="text-caption text-muted">
          {why}
        </p>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- Draft editor ---------------------------------------------------------------- */

export interface DraftLine {
  id: string
  itemName: string
  quantity: number
  unit: string
  supplierUnitPriceCents: number
  customerUnitPriceCents: number | null
}

/** Owner: customer prices (model A, with a margin helper) or the commission rate (model B) while the order is a draft. */
export function DraftEditor({ orderId, model, lines, supplierDeliveryCents, customerDeliveryCents, commissionBps, agreementRate, updatedAt }: { orderId: string; model: MoneyModel; lines: DraftLine[]; supplierDeliveryCents: number | null; customerDeliveryCents: number | null; commissionBps: number | null; agreementRate: boolean; updatedAt: string }) {
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.id, l.customerUnitPriceCents === null ? '' : cents(l.customerUnitPriceCents)])))
  const [customerDelivery, setCustomerDelivery] = useState(customerDeliveryCents === null ? (supplierDeliveryCents === null ? '' : cents(supplierDeliveryCents)) : cents(customerDeliveryCents))
  const [supplierDelivery, setSupplierDelivery] = useState(supplierDeliveryCents === null ? '' : cents(supplierDeliveryCents))
  const [commission, setCommission] = useState(commissionBps === null ? '' : String(commissionBps / 100))
  const [margin, setMargin] = useState('')
  const { pending, error, run } = useRun()
  const applyMargin = () => {
    const m = Number(margin)
    if (!Number.isFinite(m) || m < 0) return
    setPrices(Object.fromEntries(lines.map((l) => [l.id, cents(roundHalfUp(l.supplierUnitPriceCents * (1 + m / 100)))])))
  }
  return (
    <div role="group" aria-label="Edit draft order" className="space-y-3">
      {error && <FormAlert>{error}</FormAlert>}
      {model === 'A' && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Margin % helper" htmlFor="de-margin" className="flex-1" hint="Fills every customer price as supplier price + this margin. You can still change each one.">
              <Input id="de-margin" value={margin} onChange={(e) => setMargin(e.target.value)} inputMode="decimal" placeholder="e.g. 8" />
            </Field>
            <Button variant="secondary" onClick={applyMargin} disabled={!margin}>
              Fill customer prices
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-small">
              <thead className="text-caption uppercase text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-3">Item</th>
                  <th scope="col" className="py-2 pr-3">Supplier price</th>
                  <th scope="col" className="py-2">Customer price (ETB per unit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 pr-3">
                      {l.itemName} · {l.quantity} {unitLabel(l.unit, l.quantity)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{formatEtbExact(l.supplierUnitPriceCents)}</td>
                    <td className="py-2">
                      <Input aria-label={`Customer price for ${l.itemName}`} value={prices[l.id] ?? ''} onChange={(e) => setPrices({ ...prices, [l.id]: e.target.value })} inputMode="decimal" className="h-10 w-40" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Field label="Customer delivery charge (ETB)" htmlFor="de-cdel" hint="What the customer pays for delivery (0 if free).">
            <Input id="de-cdel" value={customerDelivery} onChange={(e) => setCustomerDelivery(e.target.value)} inputMode="decimal" />
          </Field>
        </>
      )}
      <Field label="Supplier delivery charge (ETB)" htmlFor="de-sdel" hint="One delivery, as the supplier quoted it (0 if free).">
        <Input id="de-sdel" value={supplierDelivery} onChange={(e) => setSupplierDelivery(e.target.value)} inputMode="decimal" />
      </Field>
      {model === 'B' && !agreementRate && (
        <Field label="Commission %" htmlFor="de-comm" hint="No agreement rate: type the rate agreed with the supplier.">
          <Input id="de-comm" value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" />
        </Field>
      )}
      <Button disabled={pending} onClick={() => run(() => saveDraftOrderAction(orderId, { lines: lines.map((l) => ({ id: l.id, customerPrice: prices[l.id] ?? '' })), customerDelivery, supplierDelivery, commission, expectedUpdatedAt: updatedAt }))}>
        Save order
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ Payments ------------------------------------------------------------------ */

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'telebirr', label: 'telebirr' },
  { value: 'cbe_birr', label: 'CBE Birr' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

/** Owner: record money for this order. Opens on a given kind of entry with a suggested amount. */
export function OrderEntryForm({ orderId, model, initialType, initialAmountCents, label }: { orderId: string; model: MoneyModel; initialType: string; initialAmountCents?: number | null; label: string }) {
  const fresh = () => ({ type: initialType, amount: initialAmountCents ? cents(initialAmountCents) : '', date: today(), method: '', reference: '', currency: '', originalAmount: '', rate: '', note: '' })
  const [open, setOpen] = useState(false)
  const [v, setV] = useState(fresh)
  const { pending, error, run } = useRun()
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  const types = model === 'A' ? ['customer_payment', 'supplier_payment', 'refund', 'service_fee'] : ['commission_due', 'commission_received', 'service_fee']
  if (!open)
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          // Start from the current suggestion (for example what is still to pay), not the last entry.
          setV(fresh())
          setOpen(true)
        }}
      >
        {label}
      </Button>
    )
  const id = (k: string) => `oe-${initialType}-${k}`
  return (
    <div role="group" aria-label={label} className="space-y-3 rounded-md border border-border p-3">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kind" htmlFor={id('type')}>
          <Select id={id('type')} value={v.type} onChange={set('type')}>
            {types.map((t) => (
              <option key={t} value={t}>
                {ENTRY_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (ETB)" htmlFor={id('amount')}>
          <Input id={id('amount')} value={v.amount} onChange={set('amount')} inputMode="decimal" />
        </Field>
        <Field label="Date" htmlFor={id('date')}>
          <Input id={id('date')} type="date" value={v.date} onChange={set('date')} />
        </Field>
        {v.type !== 'commission_due' && (
          <Field label="Method" htmlFor={id('method')}>
            <Select id={id('method')} value={v.method} onChange={set('method')}>
              <option value="">Not recorded</option>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Reference" htmlFor={id('ref')} hint="Bank or telebirr transaction number">
          <Input id={id('ref')} value={v.reference} onChange={set('reference')} maxLength={120} />
        </Field>
        <Field label="Paid in another currency?" htmlFor={id('cur')} hint="e.g. GBP for a payment from abroad">
          <Input id={id('cur')} value={v.currency} onChange={set('currency')} maxLength={3} placeholder="ETB" />
        </Field>
        {v.currency && v.currency.toUpperCase() !== 'ETB' && (
          <>
            <Field label={`Amount in ${v.currency.toUpperCase()}`} htmlFor={id('orig')}>
              <Input id={id('orig')} value={v.originalAmount} onChange={set('originalAmount')} inputMode="decimal" />
            </Field>
            <Field label="Rate used (ETB per unit)" htmlFor={id('rate')}>
              <Input id={id('rate')} value={v.rate} onChange={set('rate')} inputMode="decimal" />
            </Field>
          </>
        )}
        <Field label="Note" htmlFor={id('note')} className="sm:col-span-3">
          <Input id={id('note')} value={v.note} onChange={set('note')} maxLength={1000} />
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending || !v.amount} onClick={() => run(() => recordOrderEntryAction(orderId, { ...v, type: v.type as 'customer_payment' }), () => setOpen(false))}>
          Record
        </Button>
        <Button className="flex-1" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Delivery proof --------------------------------------------------------------- */

export interface ProofView {
  id: string
  url: string | null
  type: string
  takenAt: string | null
  receivedBy: string | null
  phone: string | null
  note: string | null
  uploadedBy: string | null
  createdAt: string
  removedAt: string | null
  removedReason: string | null
}

/** Owner and operations: photos or a signed delivery note, works with a phone camera. */
export function DeliveryProofs({ orderId, proofs, canAdd }: { orderId: string; proofs: ProofView[]; canAdd: boolean }) {
  const [file, setFile] = useState<{ path: string; name: string } | null>(null)
  const [v, setV] = useState({ takenAt: '', receivedBy: '', phone: '', note: '' })
  const [key, setKey] = useState(0)
  const { pending, error, run } = useRun()
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  return (
    <div className="space-y-3">
      {error && <FormAlert>{error}</FormAlert>}
      {proofs.length === 0 && <p className="text-small text-muted">No delivery proof yet.</p>}
      <ul className="space-y-2">
        {proofs.map((p, i) => (
          <li key={p.id} className={`rounded-md border p-3 text-small ${p.removedAt ? 'border-border text-muted line-through decoration-1' : 'border-border'}`}>
            {p.url ? (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 font-semibold text-green underline">
                <FileText className="size-4" aria-hidden /> Proof {i + 1} ({p.type === 'application/pdf' ? 'PDF' : 'photo'})
              </a>
            ) : (
              <span className="font-semibold">Proof {i + 1}</span>
            )}
            <p>{[p.receivedBy && `Received by ${p.receivedBy}`, p.phone && formatPhone(p.phone), p.takenAt && `taken ${formatDate(p.takenAt)}`].filter(Boolean).join(' · ')}</p>
            {p.note && <p>{p.note}</p>}
            {p.removedAt ? (
              <p className="no-underline">Removed: {p.removedReason}</p>
            ) : (
              canAdd && (
                <button
                  type="button"
                  className="min-h-9 font-semibold text-error"
                  disabled={pending}
                  onClick={() => {
                    const reason = window.prompt('Why remove this proof? (It stays in the history.)')
                    if (reason) run(() => removeProofAction(orderId, p.id, reason))
                  }}
                >
                  Remove
                </button>
              )
            )}
          </li>
        ))}
      </ul>
      {canAdd && (
        <div role="group" aria-label="Add delivery proof" className="space-y-3 rounded-md border border-border p-3">
          <p className="text-small font-semibold">Add delivery proof</p>
          <PrivateUpload key={key} label="Photo or signed delivery note" hint="JPEG, PNG, WebP, HEIC or PDF, up to 10 MB. On a phone you can take the photo now." requestUpload={(type, size) => proofUploadAction(orderId, type, size)} onUploaded={setFile} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Taken on" htmlFor="dp-taken">
              <Input id="dp-taken" type="datetime-local" value={v.takenAt} onChange={set('takenAt')} />
            </Field>
            <Field label="Received by" htmlFor="dp-by">
              <Input id="dp-by" value={v.receivedBy} onChange={set('receivedBy')} maxLength={120} />
            </Field>
            <Field label="Receiver’s phone" htmlFor="dp-phone" hint="09…, 011… or +251…">
              <Input id="dp-phone" type="tel" value={v.phone} onChange={set('phone')} maxLength={32} />
            </Field>
            <Field label="Note" htmlFor="dp-note">
              <Input id="dp-note" value={v.note} onChange={set('note')} maxLength={1000} />
            </Field>
          </div>
          <Button
            disabled={pending || !file}
            onClick={() =>
              run(
                () => addProofAction(orderId, { path: file?.path ?? '', ...v }),
                () => {
                  setFile(null)
                  setV({ takenAt: '', receivedBy: '', phone: '', note: '' })
                  setKey((k) => k + 1)
                },
              )
            }
          >
            Save delivery proof
          </Button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- Ledger ------------------------------------------------------------------- */

export function ManualEntryForm() {
  const [v, setV] = useState({ type: 'service_fee', direction: 'in', amount: '', date: today(), method: '', reference: '', orderReference: '', reason: '', note: '' })
  const { pending, error, run } = useRun()
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  return (
    <div role="group" aria-label="Add a ledger entry" className="space-y-3">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kind" htmlFor="me-type">
          <Select id="me-type" value={v.type} onChange={set('type')}>
            <option value="service_fee">Service fee</option>
            <option value="adjustment">Adjustment</option>
          </Select>
        </Field>
        {v.type === 'adjustment' && (
          <Field label="Direction" htmlFor="me-dir">
            <Select id="me-dir" value={v.direction} onChange={set('direction')}>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </Select>
          </Field>
        )}
        <Field label="Amount (ETB)" htmlFor="me-amount">
          <Input id="me-amount" value={v.amount} onChange={set('amount')} inputMode="decimal" />
        </Field>
        <Field label="Date" htmlFor="me-date">
          <Input id="me-date" type="date" value={v.date} onChange={set('date')} />
        </Field>
        <Field label="Order (optional)" htmlFor="me-order" hint="e.g. HLO-2026-000001">
          <Input id="me-order" value={v.orderReference} onChange={set('orderReference')} maxLength={20} />
        </Field>
        <Field label="Reference" htmlFor="me-ref">
          <Input id="me-ref" value={v.reference} onChange={set('reference')} maxLength={120} />
        </Field>
        <Field label={v.type === 'adjustment' ? 'Reason (required)' : 'Reason'} htmlFor="me-reason" className="sm:col-span-3">
          <Input id="me-reason" value={v.reason} onChange={set('reason')} maxLength={500} />
        </Field>
      </div>
      <Button disabled={pending || !v.amount} onClick={() => run(() => addManualEntryAction({ ...v, type: v.type as 'service_fee', direction: v.direction as 'in' }), () => setV({ ...v, amount: '', reference: '', reason: '', note: '' }))}>
        Add entry
      </Button>
    </div>
  )
}

export function ReverseEntryButton({ entryId }: { entryId: string }) {
  const { pending, error, run } = useRun()
  return (
    <>
      <button
        type="button"
        className="min-h-9 font-semibold text-error"
        disabled={pending}
        onClick={() => {
          const reason = window.prompt('Why reverse this entry? A matching opposite entry is added; nothing is deleted.')
          if (reason) run(() => reverseEntryAction(entryId, reason))
        }}
      >
        Reverse entry
      </button>
      {error && <span className="block text-caption text-error">{error}</span>}
    </>
  )
}

/** Order lines for anyone allowed to see the order: supplier prices only (customer prices are the owner’s). */
export function OrderLinesTable({ lines, supplierDeliveryCents, supplierTotalCents, showCustomer }: { lines: (DraftLine & { vatFlag: string })[]; supplierDeliveryCents: number | null; supplierTotalCents: number; showCustomer: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-small">
        <thead className="text-caption uppercase text-muted">
          <tr>
            <th scope="col" className="py-2 pr-3">Item</th>
            <th scope="col" className="py-2 pr-3">Quantity</th>
            <th scope="col" className="py-2 pr-3">Supplier price</th>
            <th scope="col" className="py-2 pr-3">VAT</th>
            {showCustomer && <th scope="col" className="py-2">Customer price</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="py-2 pr-3">{l.itemName}</td>
              <td className="py-2 pr-3 tabular-nums">
                {l.quantity} {unitLabel(l.unit, l.quantity)}
              </td>
              <td className="py-2 pr-3 tabular-nums">
                {formatEtbExact(l.supplierUnitPriceCents)} <span className="text-muted">= {formatEtbExact(lineTotalCents(l.supplierUnitPriceCents, l.quantity))}</span>
              </td>
              <td className="py-2 pr-3">{l.vatFlag === 'yes' ? 'Included' : l.vatFlag === 'no' ? 'On top' : 'Not known'}</td>
              {showCustomer && <td className="py-2 tabular-nums">{l.customerUnitPriceCents === null ? 'Not set' : `${formatEtbExact(l.customerUnitPriceCents)} = ${formatEtbExact(lineTotalCents(l.customerUnitPriceCents, l.quantity))}`}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-small">
        Supplier delivery: {supplierDeliveryCents === null ? 'not recorded' : formatEtbExact(supplierDeliveryCents)} · Supplier total: <strong>{formatEtbExact(supplierTotalCents)}</strong>
      </p>
    </div>
  )
}

