'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  addHoldAction,
  cancelOrderRequestAction,
  closeDisputeAction,
  createSupplierOrdersAction,
  disputeAction,
  markPartlyAvailableAction,
  markRefundedAction,
  markUnavailableAction,
  recordPaymentAction,
  releaseHoldAction,
  reserveAction,
  reversePaymentAction,
  saveLineStockAction,
  startStockCheckAction,
} from '@/app/roodber8/actions/order-requests'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { DEFAULT_RESERVATION_HOURS } from '@/lib/supply/order-requests'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) {
          after?.()
          router.refresh()
        }
      }),
  }
}

/** One button that runs one step. */
export function StepButton({ label, step, variant = 'secondary', confirm }: { label: string; step: () => Promise<Result>; variant?: 'primary' | 'secondary' | 'ghost'; confirm?: string }) {
  const { pending, run } = useRun()
  return (
    <Button size="sm" variant={variant} disabled={pending} onClick={() => (!confirm || window.confirm(confirm)) && run(step)}>
      {label}
    </Button>
  )
}

export function StartCheckButton({ id, reopen }: { id: string; reopen: boolean }) {
  return <StepButton label={reopen ? 'Reopen: check stock again' : 'Start stock check'} variant="primary" step={() => startStockCheckAction(id)} />
}

export function StockOutcomeButtons({ id, canPartial, canNone }: { id: string; canPartial: boolean; canNone: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {canPartial && <StepButton label="Part available: tell the customer" step={() => markPartlyAvailableAction(id)} />}
      {canNone && <StepButton label="Nothing available: tell the customer" step={() => markUnavailableAction(id)} confirm="Mark every item not available and tell the customer?" />}
    </div>
  )
}

/** What a partner can supply for one item. */
export function LineStockForm({ id, lineId, status, confirmedQty }: { id: string; lineId: string; status: string; confirmedQty: number | null }) {
  const [value, setValue] = useState(status)
  const [qty, setQty] = useState(confirmedQty === null ? '' : String(confirmedQty))
  const { pending, run } = useRun()
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Available" htmlFor={`ls-${lineId}`}>
        <Select id={`ls-${lineId}`} value={value} onChange={(e) => setValue(e.target.value)} className="h-10 w-44">
          <option value="requested">Not checked yet</option>
          <option value="confirmed">All of it</option>
          <option value="short">Part of it</option>
          <option value="unavailable">None</option>
        </Select>
      </Field>
      {value === 'short' && (
        <Field label="Quantity available" htmlFor={`lq-${lineId}`}>
          <Input id={`lq-${lineId}`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 w-28" />
        </Field>
      )}
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => saveLineStockAction(id, lineId, { status: value as 'requested', confirmedQty: qty }))}>
        Save
      </Button>
    </div>
  )
}

/** A partner's hold for one item (Addis Ababa time). */
export function HoldForm({ id, lineId, partners, quantity }: { id: string; lineId: string; partners: { orgId: string; name: string }[]; quantity: number }) {
  const [v, setV] = useState({ orgId: partners[0]?.orgId ?? '', qty: String(quantity), heldUntil: '', status: 'held' as 'held' | 'asked', partnerReference: '', note: '' })
  const { pending, run } = useRun()
  if (!partners.length) return <p className="text-small text-muted">No active partner supplies this product (Supply → Partner product drafts / product sources).</p>
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label="Partner" htmlFor={`hp-${lineId}`}>
        <Select id={`hp-${lineId}`} value={v.orgId} onChange={(e) => setV({ ...v, orgId: e.target.value })} className="h-10">
          {partners.map((p) => (
            <option key={p.orgId} value={p.orgId}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Quantity held" htmlFor={`hq-${lineId}`}>
        <Input id={`hq-${lineId}`} inputMode="decimal" value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value })} className="h-10" />
      </Field>
      <Field label="Held until (Addis Ababa time)" htmlFor={`hu-${lineId}`}>
        <Input id={`hu-${lineId}`} type="datetime-local" value={v.heldUntil} onChange={(e) => setV({ ...v, heldUntil: e.target.value })} className="h-10" />
      </Field>
      <Field label="Partner's reference" htmlFor={`hr-${lineId}`} optional>
        <Input id={`hr-${lineId}`} value={v.partnerReference} onChange={(e) => setV({ ...v, partnerReference: e.target.value })} className="h-10" />
      </Field>
      <Field label="Note" htmlFor={`hn-${lineId}`} optional>
        <Input id={`hn-${lineId}`} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} className="h-10" />
      </Field>
      <div className="flex items-end gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => addHoldAction(id, lineId, { ...v, status: 'held' }))}>
          Record hold
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => addHoldAction(id, lineId, { ...v, status: 'asked' }))}>
          Asked, no answer yet
        </Button>
      </div>
    </div>
  )
}

export function ReleaseHoldButton({ id, holdId }: { id: string; holdId: string }) {
  return <StepButton label="Release" variant="ghost" step={() => releaseHoldAction(id, holdId)} />
}

/** Owner: customer prices per available item, delivery charge and the reservation length. */
export function ReserveForm({ id, lines }: { id: string; lines: { id: string; name: string; qty: number; unit: string; price: string; cost: string | null; terms: string | null }[] }) {
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(lines.map((l) => [l.id, l.price])))
  const [delivery, setDelivery] = useState('0')
  const [hours, setHours] = useState(String(DEFAULT_RESERVATION_HOURS))
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l.id} className="grid gap-2 sm:grid-cols-[1fr_180px] sm:items-end">
            <p className="text-small">
              <span className="font-semibold">{l.name}</span> · {l.qty} {l.unit}
              {l.cost !== null && <span className="text-muted"> · HagerLand pays the partner {l.cost} per unit</span>}
              {l.terms && <span className="text-muted"> · {l.terms}</span>}
            </p>
            <Field label="Customer price per unit (ETB)" htmlFor={`rp-${l.id}`}>
              <Input id={`rp-${l.id}`} inputMode="decimal" value={prices[l.id] ?? ''} onChange={(e) => setPrices({ ...prices, [l.id]: e.target.value })} className="h-10" />
            </Field>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Delivery charge (ETB, 0 for none)" htmlFor={`rd-${id}`}>
          <Input id={`rd-${id}`} inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="h-10" />
        </Field>
        <Field label="Reserve for (hours, 1–168)" htmlFor={`rh-${id}`}>
          <Input id={`rh-${id}`} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} className="h-10" />
        </Field>
      </div>
      <Button disabled={pending} onClick={() => run(() => reserveAction(id, { hours, delivery, prices }))}>
        Reserve and email how to pay
      </Button>
    </div>
  )
}

/** Owner: a customer payment or a refund (offline: bank transfer, telebirr, CBE Birr, cash). */
export function PaymentForm({ id, today }: { id: string; today: string }) {
  type Method = 'bank_transfer' | 'telebirr' | 'cbe_birr' | 'cash' | 'card' | 'other'
  const [v, setV] = useState<{ type: 'customer_payment' | 'refund'; amount: string; date: string; method: Method; reference: string; note: string }>({ type: 'customer_payment', amount: '', date: today, method: 'bank_transfer', reference: '', note: '' })
  const { pending, run } = useRun()
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label="Entry" htmlFor={`pt-${id}`}>
        <Select id={`pt-${id}`} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value === 'refund' ? 'refund' : 'customer_payment' })} className="h-10">
          <option value="customer_payment">Payment from the customer</option>
          <option value="refund">Refund to the customer</option>
        </Select>
      </Field>
      <Field label="Amount (ETB)" htmlFor={`pa-${id}`}>
        <Input id={`pa-${id}`} inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} className="h-10" />
      </Field>
      <Field label="Date" htmlFor={`pd-${id}`}>
        <Input id={`pd-${id}`} type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className="h-10" />
      </Field>
      <Field label="Method" htmlFor={`pm-${id}`}>
        <Select id={`pm-${id}`} value={v.method} onChange={(e) => setV({ ...v, method: e.target.value as Method })} className="h-10">
          <option value="bank_transfer">Bank transfer</option>
          <option value="telebirr">telebirr</option>
          <option value="cbe_birr">CBE Birr</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Bank or transfer reference" htmlFor={`pr-${id}`} optional>
        <Input id={`pr-${id}`} value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} className="h-10" />
      </Field>
      <Field label="Note" htmlFor={`pn-${id}`} optional>
        <Input id={`pn-${id}`} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} className="h-10" />
      </Field>
      <div className="sm:col-span-3">
        <Button size="sm" disabled={pending} onClick={() => run(() => recordPaymentAction(id, v), () => setV({ ...v, amount: '', reference: '', note: '' }))}>
          Record
        </Button>
      </div>
    </div>
  )
}

export function ReverseEntryButton({ id, entryId }: { id: string; entryId: string }) {
  const { pending, run } = useRun()
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt('Why is this entry wrong? (it stays in the history, with a reversal)')
        if (reason) run(() => reversePaymentAction(id, entryId, reason))
      }}
    >
      Reverse
    </Button>
  )
}

/** A step that needs a reason (cancel, refunded, dispute). */
export function ReasonStep({ label, kind, id }: { label: string; kind: 'cancel' | 'refunded' | 'dispute'; id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { pending, run } = useRun()
  const step = kind === 'cancel' ? cancelOrderRequestAction : kind === 'refunded' ? markRefundedAction : disputeAction
  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
    )
  return (
    <div className="w-full space-y-2 rounded-md border border-border p-3">
      <Field label="Reason (kept in admin)" htmlFor={`rs-${kind}-${id}`}>
        <Textarea id={`rs-${kind}-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => step(id, reason), () => setOpen(false))}>
          {label}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Back
        </Button>
      </div>
    </div>
  )
}

export function CreateSupplierOrdersButton({ id }: { id: string }) {
  return <StepButton label="Create supplier orders" variant="primary" step={() => createSupplierOrdersAction(id)} confirm="Create one supplier order per partner and move the customer's payment onto them?" />
}

export function CloseDisputeButton({ id }: { id: string }) {
  return <StepButton label="Dispute settled: complete" step={() => closeDisputeAction(id)} />
}
