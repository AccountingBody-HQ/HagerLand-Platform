'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { FileCheck2 } from 'lucide-react'
import { respondToMatchAction, submitMatchQuoteAction } from '@/app/(account)/account/requests/actions'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { useToast } from '@/components/ui/Toast'
import { CURRENCIES } from '@/lib/countries'
import { track } from '@/lib/analytics'

/** Accept or decline a matched request (spec 24.5). */
export function MatchResponse({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const toast = useToast()
  const router = useRouter()
  const run = (decision: 'accept' | 'decline') =>
    start(async () => {
      const res = await respondToMatchAction(matchId, decision, reason)
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  if (declining)
    return (
      <div className="space-y-3 rounded-lg border border-border bg-stone-50 p-4">
        <Field label="Why can't you take it on?" htmlFor="decline-reason" optional hint="Helps us send better requests.">
          <Input id="decline-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex gap-2 [&>*]:flex-1">
          <Button variant="danger" disabled={pending} onClick={() => run('decline')}>
            Decline request
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setDeclining(false)}>
            Back
          </Button>
        </div>
      </div>
    )
  return (
    <div className="flex flex-col gap-2 sm:flex-row [&>*]:sm:flex-1">
      <Button disabled={pending} onClick={() => run('accept')}>
        Accept and see contact details
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => setDeclining(true)}>
        I can&apos;t take this on
      </Button>
    </div>
  )
}

/** The provider's quote for a request they accepted. */
export function MatchQuoteForm({ matchId, defaults }: { matchId: string; defaults: { amount: string; currency: string; message: string; validUntil: string; hasDocument: boolean } }) {
  const [state, action] = useFormState(submitMatchQuoteAction, null)
  const [doc, setDoc] = useState<UploadedDoc | null>(null)
  const router = useRouter()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  useEffect(() => {
    if (state?.ok) {
      track('service_quote_submitted')
      router.refresh()
    }
  }, [state, router])
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="match_id" value={matchId} />
      {doc && <input type="hidden" name="document_path" value={doc.path} />}
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.data.message}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Total price" htmlFor="mq-amount" error={errors.amount} required>
          <Input id="mq-amount" name="amount" inputMode="decimal" defaultValue={defaults.amount} invalid={Boolean(errors.amount)} aria-describedby={describedBy('mq-amount', errors.amount)} />
        </Field>
        <Field label="Currency" htmlFor="mq-currency">
          <Select id="mq-currency" name="currency" defaultValue={defaults.currency}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="What the price includes" htmlFor="mq-message" optional error={errors.message}>
        <Textarea id="mq-message" name="message" rows={4} maxLength={2000} defaultValue={defaults.message} />
      </Field>
      <Field label="Valid until" htmlFor="mq-valid" optional error={errors.valid_until}>
        <Input id="mq-valid" name="valid_until" type="date" defaultValue={defaults.validUntil} invalid={Boolean(errors.valid_until)} />
      </Field>
      <div>
        <p className="mb-2 text-small font-semibold text-ink">Quote document {defaults.hasDocument && !doc ? '(one is attached; upload to replace it)' : '(optional)'}</p>
        {doc ? (
          <p className="flex min-h-11 items-center gap-2 rounded-md bg-green-tint px-3 text-small">
            <FileCheck2 className="size-4 text-green" aria-hidden /> {doc.name}
          </p>
        ) : (
          <FileDrop target={{ purpose: 'private', area: 'match', id: matchId }} accept="application/pdf" maxFiles={1} label="Upload a PDF" hint="PDF, up to 15 MB." onDocUploaded={setDoc} />
        )}
      </div>
      <SubmitButton fullWidth pendingText="Sending…">
        Send quote
      </SubmitButton>
    </form>
  )
}
