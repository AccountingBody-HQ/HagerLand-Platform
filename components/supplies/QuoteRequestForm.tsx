'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { FileCheck2, X } from 'lucide-react'
import { submitQuoteAction } from '@/app/actions/quote-actions'
import { Field, Input, Textarea, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Combobox } from '@/components/ui/Combobox'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { readUtm } from '@/components/enquiry/UtmCapture'
import { track } from '@/lib/analytics'
import type { QuoteItem } from './quoteStore'
import { NoResetForm } from '@/components/forms/NoResetForm'

export function QuoteRequestForm({ source, items, withFiles, onSent }: { source: 'basket' | 'materials_list'; items: QuoteItem[]; withFiles?: boolean; onSent?: () => void }) {
  const [state, action] = useActionState(submitQuoteAction, null)
  const [uploadId] = useState(() => crypto.randomUUID())
  const [files, setFiles] = useState<UploadedDoc[]>([])
  const [utm, setUtm] = useState('')
  const router = useRouter()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}

  useEffect(() => setUtm(readUtm()), [])
  useEffect(() => {
    if (state?.ok) {
      track(source === 'materials_list' ? 'materials_list_uploaded' : 'quote_submitted', { source, items_count: items.length })
      onSent?.()
      router.push(`/supplies/quote/sent?ref=${encodeURIComponent(state.data.reference)}`)
    }
  }, [state, router, source, items.length, onSent])

  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity, unit: i.unit, notes: i.notes })))} />
      <input type="hidden" name="upload_id" value={uploadId} />
      <input type="hidden" name="utm" value={utm} />
      {files.map((f) => (
        <input key={f.path} type="hidden" name="files" value={f.path} />
      ))}
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      {withFiles && (
        <div>
          <p className="mb-2 font-semibold">Upload your list or bill of quantities</p>
          {files.length < 5 && (
            <FileDrop
              target={{ purpose: 'private', area: 'materials', id: uploadId }}
              accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              maxFiles={5 - files.length}
              label="Upload files"
              hint="PDF, photo, Excel or Word. Up to 5 files, 15 MB each."
              onDocUploaded={(d) => setFiles((all) => [...all, d])}
            />
          )}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f) => (
                <li key={f.path} className="flex min-h-10 items-center gap-2 rounded-md bg-green-tint px-3 text-small">
                  <FileCheck2 className="size-4 text-green" aria-hidden /> <span className="flex-1 truncate">{f.name}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((all) => all.filter((x) => x.path !== f.path))}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Field label={withFiles ? 'Or type what you need' : 'Anything else?'} htmlFor="q-notes" optional hint={withFiles ? 'One item per line, with quantity, e.g. "50 bags cement 42.5R".' : undefined}>
        <Textarea id="q-notes" name="notes" rows={withFiles ? 6 : 3} maxLength={4000} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="q-name" error={errors.name} required>
          <Input id="q-name" name="name" autoComplete="name" invalid={Boolean(errors.name)} aria-describedby={describedBy('q-name', errors.name)} />
        </Field>
        <Field label="Phone" htmlFor="q-phone" error={errors.phone} required>
          <PhoneInput id="q-phone" name="phone" invalid={Boolean(errors.phone)} />
        </Field>
        <Field label="Email" htmlFor="q-email" optional error={errors.email} hint="For a copy of your request and the quote.">
          <Input id="q-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Company" htmlFor="q-company" optional>
          <Input id="q-company" name="company_name" autoComplete="organization" />
        </Field>
        <Field label="Delivery area" htmlFor="q-loc" optional>
          <Combobox id="q-loc" name="delivery_location_id" endpoint="/api/locations" placeholder="City, sub-city or area" />
        </Field>
        <Field label="Needed by" htmlFor="q-date" optional error={errors.needed_by}>
          <Input id="q-date" name="needed_by" type="date" />
        </Field>
        <Field label="Delivery address or site" htmlFor="q-addr" optional className="sm:col-span-2">
          <Input id="q-addr" name="delivery_address" maxLength={300} />
        </Field>
      </div>
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="quote" />
      <SubmitButton size="lg" fullWidth pendingText="Sending…">
        Request my quote
      </SubmitButton>
      <p className="text-caption text-muted">We use your details only to prepare and send your quote. See our Privacy Policy.</p>
    </NoResetForm>
  )
}
