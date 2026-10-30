'use client'

import type { ReactNode } from 'react'
import { useFormPending } from '@/components/forms/NoResetForm'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { HONEYPOT_FIELD } from '@/lib/honeypot'

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
