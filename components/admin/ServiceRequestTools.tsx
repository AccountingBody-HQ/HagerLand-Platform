'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { matchProvidersAction, noProviderAction, saveMatchCommercialAction, saveRequestNotesAction, setRequestStatusAction, withdrawMatchAction } from '@/app/roodber8/actions/service-requests'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { CLOSED_REASON_LABEL, MAX_MATCHES } from '@/lib/service-requests/labels'

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

export function RequestStatusTool({ id, status }: { id: string; status: string }) {
  const { pending, run } = useRun()
  const [s, setS] = useState(status)
  const [reason, setReason] = useState('')
  const closing = ['lost', 'cancelled'].includes(s)
  return (
    <div className="space-y-2">
      <Field label="Status" htmlFor="sr-status">
        <Select id="sr-status" value={s} onChange={(e) => setS(e.target.value)} className="h-10">
          {['submitted', 'triaged', 'matched', 'quoted', 'won', 'lost', 'cancelled'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </Field>
      {closing && (
        <Field label="Reason" htmlFor="sr-reason">
          <Select id="sr-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-10">
            <option value="">Choose</option>
            {Object.entries(CLOSED_REASON_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button size="sm" disabled={pending || s === status} onClick={() => run(() => setRequestStatusAction(id, s, reason))}>
        Change status
      </Button>
    </div>
  )
}

export function RequestNotesTool({ id, notes }: { id: string; notes: string | null }) {
  const { pending, run } = useRun()
  const [n, setN] = useState(notes ?? '')
  return (
    <div className="space-y-2">
      <Field label="Private notes" htmlFor="sr-notes">
        <Textarea id="sr-notes" rows={3} value={n} maxLength={4000} onChange={(e) => setN(e.target.value)} />
      </Field>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => saveRequestNotesAction(id, n))}>
        Save notes
      </Button>
    </div>
  )
}

export function NoProviderTool({ id }: { id: string }) {
  const { pending, run } = useRun()
  const [confirm, setConfirm] = useState(false)
  if (!confirm)
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
        No suitable provider…
      </Button>
    )
  return (
    <div className="space-y-2 rounded-md border border-border bg-stone-50 p-3 text-small">
      <p>Close the request and email the customer that we could not find a provider this time?</p>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => noProviderAction(id))}>
          Close and tell them
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>
          Back
        </Button>
      </div>
    </div>
  )
}

export interface Suggestion {
  id: string
  name: string
  meta: string
}

/** Pick up to three providers and send them the request (spec 24.5). */
export function MatchBoard({ id, suggestions, slots }: { id: string; suggestions: Suggestion[]; slots: number }) {
  const { pending, run } = useRun()
  const [picked, setPicked] = useState<string[]>([])
  if (suggestions.length === 0) return <p className="text-small text-muted">No suitable published businesses found. Search by name below, or use “No suitable provider”.</p>
  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {suggestions.map((s) => (
          <li key={s.id}>
            <Checkbox
              id={`pick-${s.id}`}
              label={s.name}
              description={s.meta}
              checked={picked.includes(s.id)}
              disabled={!picked.includes(s.id) && picked.length >= slots}
              onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))}
            />
          </li>
        ))}
      </ul>
      <Button disabled={pending || picked.length === 0} onClick={() => run(() => matchProvidersAction(id, picked), () => setPicked([]))}>
        Send to {picked.length || ''} selected provider{picked.length === 1 ? '' : 's'}
      </Button>
      <p className="text-caption text-muted">Up to {MAX_MATCHES} providers at a time ({slots} place{slots === 1 ? '' : 's'} left).</p>
    </div>
  )
}

export function WithdrawMatchTool({ matchId }: { matchId: string }) {
  const { pending, run } = useRun()
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => withdrawMatchAction(matchId))}>
      Withdraw
    </Button>
  )
}

export function MatchCommercialTool({ matchId, leadFee, rate, commission, invoiced, currency }: { matchId: string; leadFee: string; rate: string; commission: string; invoiced: boolean; currency: string }) {
  const { pending, run } = useRun()
  const [v, setV] = useState({ lead_fee: leadFee, commission_rate: rate, commission, invoiced })
  const id = (n: string) => `mc-${matchId}-${n}`
  return (
    <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
      <Field label={`Lead fee (${currency})`} htmlFor={id('fee')}>
        <Input id={id('fee')} inputMode="decimal" className="h-10" value={v.lead_fee} onChange={(e) => setV({ ...v, lead_fee: e.target.value })} />
      </Field>
      <Field label="Commission %" htmlFor={id('rate')}>
        <Input id={id('rate')} inputMode="decimal" className="h-10" value={v.commission_rate} onChange={(e) => setV({ ...v, commission_rate: e.target.value })} />
      </Field>
      <Field label={`Commission (${currency})`} htmlFor={id('com')} hint="Empty: worked out from the %.">
        <Input id={id('com')} inputMode="decimal" className="h-10" value={v.commission} onChange={(e) => setV({ ...v, commission: e.target.value })} />
      </Field>
      <div className="space-y-1">
        <Checkbox id={id('inv')} label="Invoiced" checked={v.invoiced} onChange={(e) => setV({ ...v, invoiced: e.target.checked })} />
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => saveMatchCommercialAction(matchId, v))}>
          Save
        </Button>
      </div>
    </div>
  )
}
