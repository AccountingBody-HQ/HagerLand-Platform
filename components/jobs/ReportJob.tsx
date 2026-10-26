'use client'

import { useActionState, useState } from 'react'
import { Flag } from 'lucide-react'
import { submitJobReportAction } from '@/app/actions/job-report-actions'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** Text for the report sheet, translated on the server through t() (AB's approved wording W12–W16). */
export interface ReportJobText {
  button: string
  title: string
  legend: string
  reasons: { value: string; label: string }[]
  details: string
  contact: string
  contactHint: string
  send: string
}

function ReportJobForm({ jobId, text }: { jobId: string; text: ReportJobText }) {
  const [state, action] = useActionState(submitJobReportAction, null)
  if (state?.ok) return <FormAlert tone="success">{state.message}</FormAlert>
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="job_id" value={jobId} />
      <Honeypot />
      {state && !state.ok && !errors.reason && <FormAlert>{state.error}</FormAlert>}
      <fieldset>
        <legend className="mb-2 text-small font-semibold">{text.legend}</legend>
        {errors.reason && <p className="mb-2 text-small text-error">{errors.reason}</p>}
        <ul className="space-y-1">
          {text.reasons.map((r) => (
            <li key={r.value} className="flex min-h-11 items-center gap-2.5">
              <input id={`jrep-${r.value}`} type="radio" name="reason" value={r.value} className="size-5 shrink-0 accent-green" />
              <label htmlFor={`jrep-${r.value}`}>{r.label}</label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Field label={text.details} htmlFor="jrep-details" optional>
        <Textarea id="jrep-details" name="details" rows={3} maxLength={1000} />
      </Field>
      <Field label={text.contact} htmlFor="jrep-contact" optional hint={text.contactHint}>
        <Input id="jrep-contact" name="contact" maxLength={254} />
      </Field>
      <Turnstile action="job_report" />
      <SubmitButton fullWidth pendingText="Sending…">
        {text.send}
      </SubmitButton>
    </NoResetForm>
  )
}

/** "Report this job": a button under the safety line that opens the report sheet. */
export function ReportJob({ jobId, text }: { jobId: string; text: ReportJobText }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-muted hover:text-ink">
        <Flag className="size-4" aria-hidden /> {text.button}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={text.title} variant="sheet">
        <ReportJobForm jobId={jobId} text={text} />
      </Dialog>
    </>
  )
}
