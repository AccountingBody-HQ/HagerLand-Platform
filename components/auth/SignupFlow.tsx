'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { ArrowLeft, Briefcase, Building2, HardHat, House, KeyRound, MailCheck, Search } from 'lucide-react'
import { signUpAction } from '@/app/(account)/auth-actions'
import { SIGNUP_INTENTS, type SignupIntent } from '@/lib/validation/auth'
import { Field, Input, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'

const CARDS: Record<SignupIntent, { title: string; description: string; icon: React.ReactNode }> = {
  looking: { title: 'Looking for property or materials', description: 'Save time, enquire and request quotes', icon: <Search /> },
  owner: { title: 'Selling or letting my own property', description: 'List a home, plot or commercial space', icon: <House /> },
  agent: { title: "I'm an estate agent or broker", description: 'List properties for your clients', icon: <KeyRound /> },
  developer: { title: "I'm a developer", description: 'Showcase developments and sell units', icon: <Building2 /> },
  professional: { title: "I'm a contractor, tradesperson or professional", description: 'Get found and receive enquiries', icon: <HardHat /> },
  supplier: { title: "I'm a supplier, merchant or manufacturer", description: 'Reach builders and buyers', icon: <Briefcase /> },
}

export function SignupFlow({ initialIntent, next }: { initialIntent: SignupIntent | null; next?: string }) {
  const [intent, setIntent] = useState<SignupIntent | null>(initialIntent)
  const [state, action] = useActionState(signUpAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const ok = Boolean(state?.ok)
  useEffect(() => {
    if (ok) track('signup_completed', { intent: intent ?? 'unknown' })
  }, [ok, intent])
  const choose = (key: SignupIntent) => {
    track('signup_started', { intent: key })
    setIntent(key)
  }

  if (state?.ok) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-soft text-green">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <h2 className="hl-h3 mt-5">Check your email</h2>
        <p className="mt-2 text-muted">
          We&apos;ve sent a confirmation link to <strong className="text-ink">{state.data.email}</strong>. Open it on this device to finish setting up your account.
        </p>
        <p className="mt-4 text-small text-muted">Can&apos;t find it? Check your spam folder, or wait a minute and try signing up again.</p>
      </div>
    )
  }

  if (!intent) {
    return (
      <div>
        <h2 className="hl-h3">What brings you to HagerLand?</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {SIGNUP_INTENTS.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => choose(key)}
                className="flex h-full w-full items-start gap-4 rounded-lg border border-border bg-white p-4 text-left transition-colors hover:border-green hover:bg-green-tint"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-green-soft text-green [&_svg]:size-5">{CARDS[key].icon}</span>
                <span>
                  <span className="block font-semibold text-ink">{CARDS[key].title}</span>
                  <span className="mt-0.5 block text-small text-muted">{CARDS[key].description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <button type="button" onClick={() => setIntent(null)} className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-green">
        <ArrowLeft className="size-4" aria-hidden /> {CARDS[intent].title}
      </button>
      <input type="hidden" name="intent" value={intent} />
      {next && <input type="hidden" name="next" value={next} />}
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Full name" htmlFor="su-name" error={errors.full_name} required>
        <Input id="su-name" name="full_name" autoComplete="name" invalid={Boolean(errors.full_name)} aria-describedby={describedBy('su-name', errors.full_name)} />
      </Field>
      <Field label="Email" htmlFor="su-email" error={errors.email} required>
        <Input id="su-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy('su-email', errors.email)} />
      </Field>
      <Field label="Phone" htmlFor="su-phone" error={errors.phone} required hint="So buyers and HagerLand can reach you.">
        <PhoneInput id="su-phone" name="phone" invalid={Boolean(errors.phone)} describedById={describedBy('su-phone', errors.phone, 'hint')} />
      </Field>
      <Field label="Password" htmlFor="su-password" error={errors.password} required hint="At least 10 characters.">
        <Input id="su-password" name="password" type="password" autoComplete="new-password" invalid={Boolean(errors.password)} aria-describedby={describedBy('su-password', errors.password, 'hint')} />
      </Field>
      <div className={cn('flex items-start gap-3', errors.terms && 'text-error')}>
        <input id="su-terms" name="terms" type="checkbox" className="mt-1 size-5 shrink-0 accent-green" aria-invalid={Boolean(errors.terms) || undefined} />
        <label htmlFor="su-terms" className="text-small">
          I am 18 or older and I agree to the{' '}
          <Link href="/terms" className="font-semibold text-green underline" target="_blank">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-semibold text-green underline" target="_blank">
            Privacy Policy
          </Link>
          .{errors.terms && <span className="block">{errors.terms}</span>}
        </label>
      </div>
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="signup" />
      <SubmitButton fullWidth pendingText="Creating your account…">
        Create account
      </SubmitButton>
    </NoResetForm>
  )
}
