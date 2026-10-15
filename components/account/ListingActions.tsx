'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { listingStatusAction } from '@/app/(account)/account/listings/actions'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export function ListingActions({ id, status, canRenew }: { id: string; status: string; canRenew: boolean }) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (action: 'pause' | 'resume' | 'renew' | 'archive') =>
    start(async () => {
      const res = await listingStatusAction(id, action)
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      router.refresh()
    })
  return (
    <div className="flex flex-wrap gap-2">
      {!['archived', 'removed'].includes(status) && (
        <ButtonLink href={`/account/listings/${id}/edit`} size="sm" variant="secondary">
          {status === 'draft' ? 'Continue' : 'Edit'}
        </ButtonLink>
      )}
      {status === 'published' && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('pause')}>
          Pause
        </Button>
      )}
      {status === 'paused' && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('resume')}>
          Resume
        </Button>
      )}
      {canRenew && (
        <Button size="sm" disabled={pending} onClick={() => run('renew')}>
          Renew
        </Button>
      )}
      {!['archived', 'removed'].includes(status) && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('archive')} className="text-muted">
          Archive
        </Button>
      )}
    </div>
  )
}
