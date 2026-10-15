'use client'

import { createContext, useContext, useState, useTransition, type FormHTMLAttributes, type Ref, type SubmitEvent } from 'react'
import { useFormStatus } from 'react-dom'

const PendingContext = createContext<boolean | null>(null)

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, 'action'> & { action: (data: FormData) => void | Promise<void>; ref?: Ref<HTMLFormElement> }

/**
 * A form that runs its action without React 19's automatic form reset, so everything the visitor typed stays in the
 * fields when the server answers with an error. Before the page's JavaScript loads it still submits normally.
 */
export function NoResetForm({ action, onSubmit, children, ...props }: Props) {
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    onSubmit?.(e)
    if (e.defaultPrevented) return
    e.preventDefault()
    // A file still uploading has no hidden field yet: sending now would leave it out.
    const busy = Boolean(e.currentTarget.querySelector('[data-uploading="true"]'))
    setUploading(busy)
    if (busy) return
    const data = new FormData(e.currentTarget, e.submitter)
    start(() => action(data))
  }
  return (
    <PendingContext.Provider value={pending}>
      <form {...props} action={action} onSubmit={submit}>
        {children}
        {uploading && (
          <p role="alert" className="text-small font-semibold text-error">
            Please wait until your files have finished uploading, then send again.
          </p>
        )}
      </form>
    </PendingContext.Provider>
  )
}

/** True while the surrounding form is being sent (NoResetForm or a plain form action). */
export function useFormPending(): boolean {
  const own = useContext(PendingContext)
  const { pending } = useFormStatus()
  return own ?? pending
}
