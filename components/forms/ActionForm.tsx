'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { useFormState } from 'react-dom'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string; fieldErrors?: Record<string, string> }

/** A plain form bound to a server action: shows the result, refreshes the page, and resets after success. */
export function ActionForm({ action, submitLabel, children, className, resetOnSuccess = true }: { action: (prev: Result | null, formData: FormData) => Promise<Result>; submitLabel: string; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction] = useFormState(action, null)
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset()
      router.refresh()
    }
  }, [state, router, resetOnSuccess])
  const fieldErrors = state && !state.ok ? Object.values(state.fieldErrors ?? {}) : []
  return (
    <form ref={ref} action={formAction} className={className ?? 'grid gap-3 sm:grid-cols-2'} noValidate>
      {state && !state.ok && <FormAlert className="sm:col-span-2">{[state.error, ...fieldErrors].join(' ')}</FormAlert>}
      {state?.ok && <FormAlert tone="success" className="sm:col-span-2">{state.data.message}</FormAlert>}
      {children}
      <div className="sm:col-span-2">
        <SubmitButton size="sm" pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  )
}
