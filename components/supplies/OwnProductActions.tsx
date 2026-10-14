'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { ownProductStatusAction } from '@/app/(account)/account/products/actions'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

/** Submit, pause or archive one of the supplier's products. */
export function OwnProductActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (action: 'submit' | 'pause' | 'archive') =>
    start(async () => {
      const res = await ownProductStatusAction(id, action)
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {['draft', 'rejected', 'paused'].includes(status) && (
        <Button className="flex-1" disabled={pending} onClick={() => run('submit')}>
          Submit for review
        </Button>
      )}
      {status === 'published' && (
        <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => run('pause')}>
          Pause
        </Button>
      )}
      {!['archived', 'removed'].includes(status) && (
        <Button variant="ghost" className="flex-1" disabled={pending} onClick={() => run('archive')}>
          Archive
        </Button>
      )}
    </div>
  )
}
