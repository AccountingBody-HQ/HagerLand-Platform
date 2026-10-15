'use client'

import { useState } from 'react'
import { moderateReviewAction } from '@/app/roodber8/actions/reviews'
import { RunButton } from '@/components/admin/AgencyTools'
import { Input } from '@/components/ui/Field'

export function ReviewModeration({ id }: { id: string }) {
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <RunButton label="Publish" variant="primary" fn={() => moderateReviewAction(id, 'publish')} />
      <Input aria-label="Reason for rejecting (private)" placeholder="Reason for rejecting" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="h-9 text-small" />
      <RunButton label="Reject" fn={() => moderateReviewAction(id, 'reject', reason)} />
    </div>
  )
}
