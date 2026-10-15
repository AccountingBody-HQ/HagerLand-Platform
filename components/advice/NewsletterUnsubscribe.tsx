'use client'

import { useState, useTransition } from 'react'
import { unsubscribeNewsletterAction } from '@/app/actions/newsletter-actions'
import { Button } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'

export function NewsletterUnsubscribe({ token }: { token: string }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (msg) return <FormAlert tone={msg.ok ? 'success' : undefined}>{msg.text}</FormAlert>
  return (
    <Button type="button" disabled={pending} onClick={() => start(async () => {
      const r = await unsubscribeNewsletterAction(token)
      setMsg({ ok: r.ok, text: r.ok ? r.data.message : r.error })
    })}>
      Unsubscribe
    </Button>
  )
}
