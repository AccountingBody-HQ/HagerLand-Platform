'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { BellPlus } from 'lucide-react'
import { saveSearchAction } from '@/app/actions/saved-search-actions'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { track } from '@/lib/analytics'
import { hasSessionCookie } from '@/lib/session-cookie'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** "Save this search" on property results (spec 8.2, 25.2a). */
export function SaveSearchButton({ signedIn: known, purpose, location, query, defaultName, returnTo, label = 'Save this search' }: { signedIn?: boolean; purpose: 'sale' | 'rent'; location: string | null; query: string; defaultName: string; returnTo: string; label?: string }) {
  const [open, setOpen] = useState(false)
  // On cached pages the server does not know who is signed in: the browser checks the session cookie.
  const [cookieSignedIn, setCookieSignedIn] = useState(false)
  useEffect(() => {
    if (known === undefined) setCookieSignedIn(hasSessionCookie())
  }, [known])
  const signedIn = known ?? cookieSignedIn
  const [state, action] = useActionState(saveSearchAction, null)
  useEffect(() => {
    if (state?.ok) track('search_saved')
  }, [state])
  const btn = 'inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-white px-4 text-small font-semibold text-ink hover:bg-stone-100'
  if (!signedIn)
    return (
      <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={btn}>
        <BellPlus className="size-4" aria-hidden /> {label}
      </Link>
    )
  if (state?.ok) return <FormAlert tone="success">{state.data.message}</FormAlert>
  if (!open)
    return (
      <button type="button" className={btn} onClick={() => setOpen(true)}>
        <BellPlus className="size-4" aria-hidden /> {label}
      </button>
    )
  return (
    <NoResetForm action={action} className="grid w-full gap-3 rounded-lg border border-border bg-stone-50 p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="location" value={location ?? ''} />
      <input type="hidden" name="query" value={query} />
      {state && !state.ok && <FormAlert className="sm:col-span-3">{state.error}</FormAlert>}
      <Field label="Name this search" htmlFor="ss-name">
        <Input id="ss-name" name="name" defaultValue={defaultName.slice(0, 120)} maxLength={120} />
      </Field>
      <Field label="Email me" htmlFor="ss-freq">
        <Select id="ss-freq" name="alert_frequency" defaultValue="daily">
          <option value="instant">As soon as there is a match</option>
          <option value="daily">Once a day</option>
          <option value="weekly">Once a week</option>
          <option value="off">Never (just save it)</option>
        </Select>
      </Field>
      <SubmitButton pendingText="Saving…">Save search</SubmitButton>
    </NoResetForm>
  )
}
