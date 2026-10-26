'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { revokeBadgeAction } from '@/app/roodber8/actions/verification'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

/** Owner and Operations: takes the Verified badge away now, with a reason (audited). */
export function RevokeBadge({ orgId }: { orgId: string }) {
  const [reason, setReason] = useState('')
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <div className="space-y-2">
      <Field label="Why remove the badge?" htmlFor={`rv-${orgId}`}>
        <Input id={`rv-${orgId}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || reason.trim().length < 3}
        onClick={() =>
          start(async () => {
            const res = await revokeBadgeAction(orgId, reason)
            toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
            if (res.ok) router.refresh()
          })
        }
      >
        Revoke badge
      </Button>
    </div>
  )
}
