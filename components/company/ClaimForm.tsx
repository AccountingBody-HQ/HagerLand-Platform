'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { FileCheck2 } from 'lucide-react'
import { submitClaimAction } from '@/app/actions/claim-actions'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { track } from '@/lib/analytics'

export function ClaimForm({ orgId, defaults }: { orgId: string; defaults: { phone: string | null; email: string } }) {
  const [state, action] = useFormState(async (prev: Awaited<ReturnType<typeof submitClaimAction>> | null, fd: FormData) => {
    const res = await submitClaimAction(prev, fd)
    if (res.ok) track('claim_submitted', {})
    return res
  }, null)
  const [docs, setDocs] = useState<UploadedDoc[]>([])
  if (state?.ok) return <FormAlert tone="success">{state.message}</FormAlert>
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="org_id" value={orgId} />
      {docs.map((d) => (
        <input key={d.path} type="hidden" name="evidence_paths" value={d.path} />
      ))}
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Your role" htmlFor="cl-rel" error={errors.relationship} required>
        <Select id="cl-rel" name="relationship" defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </Select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Business phone" htmlFor="cl-phone" error={errors.claimant_phone} required hint="We may call to confirm.">
          <PhoneInput id="cl-phone" name="claimant_phone" defaultValue={defaults.phone} invalid={Boolean(errors.claimant_phone)} />
        </Field>
        <Field label="Email" htmlFor="cl-email" error={errors.claimant_email} required>
          <Input id="cl-email" name="claimant_email" type="email" defaultValue={defaults.email} invalid={Boolean(errors.claimant_email)} />
        </Field>
      </div>
      <Field label="Evidence" htmlFor="cl-evidence" optional hint="A photo of your trade licence speeds things up.">
        <FileDrop
          target={{ purpose: 'private', area: 'claim', id: orgId }}
          accept="application/pdf,image/jpeg,image/png"
          maxFiles={5}
          label="Upload a document"
          hint="PDF, JPEG or PNG, up to 15 MB"
          onDocUploaded={(d) => setDocs((all) => [...all, d])}
        />
        {docs.length > 0 && (
          <ul className="mt-2 space-y-1 text-small">
            {docs.map((d) => (
              <li key={d.path} className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-green" aria-hidden /> {d.name}
              </li>
            ))}
          </ul>
        )}
      </Field>
      <Field label="Anything else we should know?" htmlFor="cl-msg" optional>
        <Textarea id="cl-msg" name="message" rows={3} maxLength={2000} />
      </Field>
      <Turnstile action="claim" />
      <SubmitButton size="lg" pendingText="Sending…">
        Submit claim
      </SubmitButton>
    </form>
  )
}
