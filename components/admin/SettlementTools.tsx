'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addAdjustmentAction, approveSettlementAction, createSettlementAction, paySettlementAction, removeAdjustmentAction, updateAdjustmentAction, voidSettlementAction } from '@/app/roodber8/actions/settlements'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

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

export interface DueOrderView {
  id: string
  reference: string
  delivered: string
  amount: string
  eligible: boolean
  upfront: boolean
}

/** Owner: choose a partner's orders (delivered with proof, or up front with a reason) for a new draft settlement. */
export function CreateSettlementForm({ orgId, orders, from, to }: { orgId: string; orders: DueOrderView[]; from: string; to: string }) {
  const [chosen, setChosen] = useState<Record<string, boolean>>(Object.fromEntries(orders.filter((o) => o.eligible).map((o) => [o.id, true])))
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [period, setPeriod] = useState({ from, to })
  const { pending, run } = useRun()
  const ids = Object.keys(chosen).filter((id) => chosen[id])
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.id} className="space-y-1">
            <Checkbox
              id={`so-${o.id}`}
              checked={Boolean(chosen[o.id])}
              disabled={!o.eligible && !o.upfront}
              onChange={(e) => setChosen({ ...chosen, [o.id]: e.target.checked })}
              label={`${o.reference} · ${o.delivered} · ${o.amount}`}
              description={o.eligible ? undefined : o.upfront ? 'Not delivered yet: up-front terms. Paying now needs your reason.' : 'Not delivered with proof yet.'}
            />
            {o.upfront && chosen[o.id] && (
              <Field label="Reason for paying before delivery" htmlFor={`ur-${o.id}`}>
                <Input id={`ur-${o.id}`} value={reasons[o.id] ?? ''} onChange={(e) => setReasons({ ...reasons, [o.id]: e.target.value })} className="h-10" />
              </Field>
            )}
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Period from" htmlFor={`sf-${orgId}`}>
          <Input id={`sf-${orgId}`} type="date" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} className="h-10" />
        </Field>
        <Field label="Period to" htmlFor={`st-${orgId}`}>
          <Input id={`st-${orgId}`} type="date" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} className="h-10" />
        </Field>
      </div>
      <Button size="sm" disabled={pending || !ids.length} onClick={() => run(() => createSettlementAction(orgId, { from: period.from, to: period.to, orderIds: ids, upfrontReasons: Object.fromEntries(ids.filter((id) => reasons[id]).map((id) => [id, reasons[id]])) }))}>
        Create draft settlement
      </Button>
    </div>
  )
}

export function ApproveSettlementButton({ id, updatedAt }: { id: string; updatedAt: string }) {
  const { pending, run } = useRun()
  return (
    <Button size="sm" disabled={pending} onClick={() => window.confirm('Approve this settlement? Its orders and total are then fixed.') && run(() => approveSettlementAction(id, updatedAt))}>
      Approve
    </Button>
  )
}

/** Owner: the partner was paid (offline). */
export function PaySettlementForm({ id, today }: { id: string; today: string }) {
  const [v, setV] = useState({ date: today, method: 'bank_transfer', reference: '' })
  const { pending, run } = useRun()
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label="Paid on" htmlFor={`pp-d-${id}`}>
        <Input id={`pp-d-${id}`} type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} className="h-10" />
      </Field>
      <Field label="Method" htmlFor={`pp-m-${id}`}>
        <Select id={`pp-m-${id}`} value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })} className="h-10">
          <option value="bank_transfer">Bank transfer</option>
          <option value="telebirr">telebirr</option>
          <option value="cbe_birr">CBE Birr</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Bank or transfer reference" htmlFor={`pp-r-${id}`}>
        <Input id={`pp-r-${id}`} value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} className="h-10" />
      </Field>
      <div className="sm:col-span-3">
        <Button size="sm" disabled={pending} onClick={() => run(() => paySettlementAction(id, { date: v.date, method: v.method as 'bank_transfer', reference: v.reference }))}>
          Record payment to the partner
        </Button>
      </div>
    </div>
  )
}

export function VoidSettlementStep({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { pending, run } = useRun()
  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Void
      </Button>
    )
  return (
    <div className="w-full space-y-2 rounded-md border border-border p-3">
      <Field label="Reason (kept in admin)" htmlFor={`sv-${id}`}>
        <Textarea id={`sv-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => voidSettlementAction(id, reason), () => setOpen(false))}>
          Void
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Back
        </Button>
      </div>
    </div>
  )
}

/** Owner: add (or change) an adjustment waiting for the partner's next settlement. */
export function AdjustmentForm({ orgId, item }: { orgId: string; item?: { id: string; amount: string; owed: 'partner_owes' | 'hagerland_owes'; reason: string } }) {
  const [v, setV] = useState({ amount: item?.amount ?? '', owed: item?.owed ?? 'partner_owes', reason: item?.reason ?? '', orderReference: '' })
  const { pending, run } = useRun()
  const key = item?.id ?? orgId
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <Field label="Amount (ETB)" htmlFor={`aa-${key}`}>
        <Input id={`aa-${key}`} inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} className="h-10" />
      </Field>
      <Field label="Who owes" htmlFor={`ao-${key}`}>
        <Select id={`ao-${key}`} value={v.owed} onChange={(e) => setV({ ...v, owed: e.target.value === 'hagerland_owes' ? 'hagerland_owes' : 'partner_owes' })} className="h-10">
          <option value="partner_owes">The partner repays HagerLand</option>
          <option value="hagerland_owes">HagerLand owes the partner more</option>
        </Select>
      </Field>
      <Field label="Reason (shown on the statement)" htmlFor={`ar-${key}`}>
        <Input id={`ar-${key}`} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} className="h-10" />
      </Field>
      {!item && (
        <Field label="Supply order (optional)" htmlFor={`an-${key}`}>
          <Input id={`an-${key}`} value={v.orderReference} onChange={(e) => setV({ ...v, orderReference: e.target.value })} placeholder="HLO-…" className="h-10" />
        </Field>
      )}
      <div className="flex items-end gap-2 sm:col-span-4">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => (item ? updateAdjustmentAction(item.id, v) : addAdjustmentAction(orgId, v)), () => !item && setV({ amount: '', owed: 'partner_owes', reason: '', orderReference: '' }))}>
          {item ? 'Save adjustment' : 'Add adjustment'}
        </Button>
        {item && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              const why = window.prompt('Why does the partner not owe this after all?')
              if (why) run(() => removeAdjustmentAction(item.id, why))
            }}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}
