'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setPromisedDateAction } from '@/app/roodber8/actions/supply-orders'
import { setAgreementStatusAction } from '@/app/roodber8/actions/supply-agreements'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'
import { rememberVersion, useLatestVersion } from '@/lib/admin/latest-version'

type Result = { ok: true; data: { message: string; updatedAt?: string } } | { ok: false; error: string }

/** Runs a save; `versionKey` remembers the record's new updated_at for the page's other buttons (lib/admin/latest-version). */
function useRun(versionKey?: string) {
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
          if (versionKey) rememberVersion(versionKey, res.data.updatedAt)
          toast(res.data.message, 'success')
          after?.()
          router.refresh()
        } else setError(res.error)
      }),
  }
}

/** The delivery date the supplier promised; every change is written to the order's timeline. */
export function PromisedDateControl({ orderId, value, updatedAt, editable }: { orderId: string; value: string | null; updatedAt: string; editable: boolean }) {
  const [date, setDate] = useState(value ?? '')
  const [reason, setReason] = useState('')
  const { pending, error, run } = useRun(`order:${orderId}`)
  const version = useLatestVersion(`order:${orderId}`, updatedAt)
  if (!editable) return <p className="text-small">{value ? `Promised for ${value}` : 'No promised date was recorded.'}</p>
  return (
    <div role="group" aria-label="Promised delivery date" className="space-y-2">
      {error && <FormAlert>{error}</FormAlert>}
      <Field label="Promised delivery date" htmlFor="pd-date" hint="The date the supplier said they will deliver.">
        <Input id="pd-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {value && (
        <Field label="Why it changed (optional)" htmlFor="pd-reason">
          <Input id="pd-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      )}
      <Button size="sm" variant="secondary" disabled={pending || date === (value ?? '')} onClick={() => run(() => setPromisedDateAction(orderId, date, reason, version), () => setReason(''))}>
        Save date
      </Button>
    </div>
  )
}

/** Owner: an agreement past its end date that is still marked active. */
export function MarkExpiredButton({ orgId, agreementId }: { orgId: string; agreementId: string }) {
  const { pending, error, run } = useRun()
  return (
    <>
      <button type="button" className="min-h-9 font-semibold text-green" disabled={pending} onClick={() => run(() => setAgreementStatusAction(orgId, agreementId, 'expired'))}>
        Mark expired
      </button>
      {error && <span className="block text-caption text-error">{error}</span>}
    </>
  )
}
