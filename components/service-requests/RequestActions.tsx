'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cancelServiceRequestAction, chooseQuoteAction } from '@/app/actions/service-request-actions'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { track } from '@/lib/analytics'

/** "Choose this quote" for one quote (spec 24.5). */
export function ChooseQuoteButton({ requestId, matchId, token, orgName }: { requestId: string; matchId: string; token?: string; orgName: string }) {
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const toast = useToast()
  const router = useRouter()
  if (!confirming)
    return (
      <Button size="sm" onClick={() => setConfirming(true)}>
        Choose this quote
      </Button>
    )
  return (
    <div className="flex flex-col gap-2 rounded-md bg-green-tint p-3 sm:flex-row sm:items-center">
      <p className="flex-1 text-small">Choose {orgName}? We will tell them, and close the other quotes.</p>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await chooseQuoteAction({ request_id: requestId, match_id: matchId, token })
              toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
              if (res.ok) {
                track('service_quote_chosen')
                router.refresh()
              }
            })
          }
        >
          Yes, choose
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Not yet
        </Button>
      </div>
    </div>
  )
}

export function CancelRequestButton({ requestId, token }: { requestId: string; token?: string }) {
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const toast = useToast()
  const router = useRouter()
  if (!confirming)
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancel this request
      </Button>
    )
  return (
    <div className="flex flex-col gap-2 rounded-md bg-stone-100 p-3 sm:flex-row sm:items-center">
      <p className="flex-1 text-small">Cancel the request? Providers will no longer see it.</p>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelServiceRequestAction({ request_id: requestId, token })
              toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
              if (res.ok) router.refresh()
            })
          }
        >
          Yes, cancel
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </div>
    </div>
  )
}
