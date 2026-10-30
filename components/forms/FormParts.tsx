'use client'

import { useId, type ReactNode } from 'react'
import { useFormPending } from '@/components/forms/NoResetForm'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { HONEYPOT_FIELD } from '@/lib/honeypot'
import { Checkbox } from '@/components/ui/Field'
import { TRANSFER_CONSENT_FIELD, TRANSFER_CONSENT_TEXT } from '@/lib/data-transfer'

/** Submit button that shows a spinner and blocks double-submits while the action runs. */
export function SubmitButton({ children, pendingText, ...rest }: ButtonProps & { pendingText?: string }) {
  const pending = useFormPending()
  return (
    <Button type="submit" loading={pending} {...rest}>
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}

export function FormAlert({ tone = 'error', children, className }: { tone?: 'error' | 'success' | 'info'; children: ReactNode; className?: string }) {
  if (!children) return null
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-md px-4 py-3 text-small',
        tone === 'error' && 'bg-error/10 text-error',
        tone === 'success' && 'bg-green-soft text-green-darker',
        tone === 'info' && 'bg-info/10 text-ink',
        className,
      )}
    >
      {tone === 'error' ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : tone === 'info' ? <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

/** Invisible field that only bots fill in. */
export function Honeypot() {
  // QC-1a: hidden off-screen (not display:none, which some bots skip). The name and the hints keep browsers and
  // password managers (1Password, LastPass, Bitwarden, Dashlane) from filling it in for real people.
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor={HONEYPOT_FIELD}>Leave this empty</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
        spellCheck={false}
        defaultValue=""
      />
    </div>
  )
}

/**
 * QC-2 (W17): the shared, required data-transfer tick, built once for every public form. The server checks it again
 * (lib/data-transfer.ts). `label` lets a form pass the same text through its translation function.
 */
export function TransferConsent({ error, label }: { error?: string; label?: string }) {
  const id = useId()
  return (
    <div className={error ? 'rounded-md ring-2 ring-error' : undefined}>
      <Checkbox id={`tc-${id}`} name={TRANSFER_CONSENT_FIELD} label={label ?? TRANSFER_CONSENT_TEXT} required aria-invalid={error ? true : undefined} />
      {error && <p className="mt-1 text-small text-error">{error}</p>}
    </div>
  )
}
