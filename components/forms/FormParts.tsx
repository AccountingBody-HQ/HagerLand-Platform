'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/** Submit button that shows a spinner and blocks double-submits while the action runs. */
export function SubmitButton({ children, pendingText, ...rest }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus()
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
        tone === 'info' && 'bg-info/10 text-info',
        className,
      )}
    >
      {tone === 'error' ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

/** Invisible field that only bots fill in. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="hl_extra_field">Leave this empty</label>
      <input id="hl_extra_field" name="hl_extra_field" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  )
}
