'use client'

import { useFormState } from 'react-dom'
import { updateEnquiryAction } from '@/app/(account)/account/enquiries/actions'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { ENQUIRY_STATUS } from '@/lib/enquiry-labels'

export function EnquiryStatusForm({ id, status, notes }: { id: string; status: string; notes: string | null }) {
  const [state, action] = useFormState(updateEnquiryAction, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Status" htmlFor="enq-status">
        <Select id="enq-status" name="status" defaultValue={status}>
          {Object.entries(ENQUIRY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Private notes" htmlFor="enq-notes" hint="Only you and your team can see these.">
        <Textarea id="enq-notes" name="recipient_notes" defaultValue={notes ?? ''} rows={4} maxLength={4000} />
      </Field>
      <SubmitButton pendingText="Saving…">Save</SubmitButton>
    </form>
  )
}
