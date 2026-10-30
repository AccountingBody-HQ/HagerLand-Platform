'use client'

import { TimeZoneFields } from '@/components/forms/TimeZoneFields'
import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { submitEnquiryAction } from '@/app/actions/enquiry-actions'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { readUtm } from './UtmCapture'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'

export interface EnquiryTarget {
  type: 'property' | 'development' | 'organisation' | 'product' | 'hagerland_development' | 'general'
  id?: string
  recipientLabel: string
}

export interface IntentOption {
  value: 'viewing' | 'more_info' | 'price' | 'offer' | 'register_interest' | 'quote' | 'other'
  label: string
  message: string
}

/** The one enquiry form used across HagerLand, configured by its target (spec 12). */
export function EnquiryForm({
  target,
  intents,
  defaultIntent,
  extraFields,
  submitLabel = 'Send enquiry',
  topic,
  topicOptions,
  askCallTimes,
  idPrefix = 'enq',
}: {
  target: EnquiryTarget
  intents: IntentOption[]
  defaultIntent?: IntentOption['value']
  extraFields?: 'register_interest'
  submitLabel?: string
  topic?: string
  /** Shows a "What is it about?" dropdown instead of a fixed topic. */
  topicOptions?: { value: string; label: string }[]
  /** Shows the visitor's time zone and asks for good times to call (spec 26.11), for HagerLand's own forms. */
  askCallTimes?: boolean
  idPrefix?: string
}) {
  const [state, action] = useActionState(submitEnquiryAction, null)
  const initial = intents.find((i) => i.value === defaultIntent) ?? intents[0]
  const [intent, setIntent] = useState(initial)
  const [message, setMessage] = useState(initial?.message ?? '')
  const [utm, setUtm] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const tracked = useRef(false)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const id = (n: string) => `${idPrefix}-${n}`

  useEffect(() => {
    setUtm(readUtm())
    setSourceUrl(window.location.href.slice(0, 500))
  }, [])

  useEffect(() => {
    if (state?.ok && !tracked.current) {
      tracked.current = true
      track(intent?.value === 'register_interest' ? 'register_interest_submitted' : 'enquiry_submitted', { target_type: target.type, intent: intent?.value ?? 'more_info' })
    }
  }, [state, intent, target.type])

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <h3 className="hl-h3 mt-3">{intent?.value === 'register_interest' ? 'Thanks, your interest is registered' : 'Your enquiry has been sent'}</h3>
        <p className="mt-2 text-muted">
          {target.recipientLabel} will contact you directly. Your reference is <strong className="text-ink">{state.data.reference}</strong>.
        </p>
        <p className="mt-3 text-small text-muted">Stay safe: never pay a deposit before viewing a property and checking the ownership documents.</p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="target_type" value={target.type} />
      <input type="hidden" name="target_id" value={target.id ?? ''} />
      <input type="hidden" name="utm" value={utm} />
      <input type="hidden" name="source_url" value={sourceUrl} />
      {topic && !topicOptions && <input type="hidden" name="topic" value={topic} />}
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      {intents.length > 1 ? (
        <fieldset>
          <legend className="mb-2 text-small font-semibold text-ink">I&apos;d like to</legend>
          <div className="flex flex-wrap gap-2">
            {intents.map((i) => (
              <label key={i.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="intent"
                  value={i.value}
                  checked={intent?.value === i.value}
                  onChange={() => {
                    setIntent(i)
                    setMessage(i.message)
                  }}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-3.5 text-small font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">
                  {i.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="intent" value={intent?.value ?? 'more_info'} />
      )}

      {topicOptions && (
        <Field label="What is it about?" htmlFor={id('topic')}>
          <Select id={id('topic')} name="topic" defaultValue={topicOptions.find((o) => o.value === topic)?.label ?? topicOptions[0]?.label}>
            {topicOptions.map((o) => (
              <option key={o.value} value={o.label}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Your name" htmlFor={id('name')} error={errors.name} required>
        <Input id={id('name')} name="name" autoComplete="name" invalid={Boolean(errors.name)} aria-describedby={describedBy(id('name'), errors.name)} />
      </Field>
      <Field label="Phone" htmlFor={id('phone')} error={errors.phone} required>
        <PhoneInput id={id('phone')} name="phone" invalid={Boolean(errors.phone)} describedById={describedBy(id('phone'), errors.phone)} />
      </Field>
      <Field label="Email" htmlFor={id('email')} error={errors.email} optional>
        <Input id={id('email')} name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy(id('email'), errors.email)} />
      </Field>

      {extraFields === 'register_interest' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget" htmlFor={id('budget')} optional>
            <Select id={id('budget')} name="budget_band" defaultValue="">
              <option value="">Choose</option>
              {['Under ETB 3M', 'ETB 3M – 6M', 'ETB 6M – 10M', 'ETB 10M – 20M', 'Over ETB 20M'].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </Field>
          <Field label="When are you looking to buy?" htmlFor={id('timeframe')} optional>
            <Select id={id('timeframe')} name="timeframe" defaultValue="">
              <option value="">Choose</option>
              {['Now', 'Within 6 months', '6–12 months', 'Just exploring'].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred area" htmlFor={id('area')} optional className="sm:col-span-2">
            <Input id={id('area')} name="preferred_area" placeholder="e.g. Bole, CMC, Ayat" />
          </Field>
        </div>
      )}

      <Field label="Message" htmlFor={id('message')} error={errors.message} required>
        <Textarea id={id('message')} name="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} invalid={Boolean(errors.message)} aria-describedby={describedBy(id('message'), errors.message)} />
      </Field>
      <Field label="Preferred way to reply" htmlFor={id('pref')}>
        <Select id={id('pref')} name="preferred_contact" defaultValue="">
          <option value="">No preference</option>
          <option value="phone">Phone call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
          <option value="email">Email</option>
        </Select>
      </Field>
      {askCallTimes && <TimeZoneFields idPrefix={idPrefix} />}
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="enquiry" />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        {submitLabel}
      </SubmitButton>
      <p className="text-caption text-muted">
        By sending, you agree to share your details with {target.recipientLabel} and accept our{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </NoResetForm>
  )
}
