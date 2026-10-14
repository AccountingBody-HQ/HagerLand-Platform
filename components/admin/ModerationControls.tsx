'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { moderateAction } from '@/app/roodber8/actions/moderation'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const TEMPLATES = [
  ['Incomplete information', 'Some important details are missing. Please add them and submit again.'],
  ['Poor photos', 'The photos are too dark, blurry or do not show the property clearly. Please add clear, bright photos of each room.'],
  ['Duplicate', 'This appears to duplicate an existing listing. Please update the existing listing instead.'],
  ['Suspected fraud', 'We could not confirm this listing is genuine.'],
  ['Wrong category', 'This is in the wrong category. Please choose the correct type and submit again.'],
  ['Prohibited content', 'This breaks our listing rules (see our Terms).'],
] as const

type Op = 'approve' | 'reject' | 'changes' | 'remove' | 'approve_changes' | 'reject_changes'

export function ModerationControls({ entity, id, mode = 'review', size = 'sm' }: { entity: 'property' | 'development' | 'organisation' | 'portfolio' | 'product'; id: string; mode?: 'review' | 'changes' | 'live'; size?: 'sm' | 'md' }) {
  const [pending, start] = useTransition()
  const [dialog, setDialog] = useState<Op | null>(null)
  const [reason, setReason] = useState('')
  const toast = useToast()
  const router = useRouter()

  const run = (op: Op, why?: string) =>
    start(async () => {
      const res = await moderateAction({ entity, id, op, reason: why })
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) {
        setDialog(null)
        setReason('')
        router.refresh()
      }
    })

  const title = dialog === 'changes' ? 'Request changes' : dialog === 'remove' ? 'Remove from the site' : dialog === 'reject_changes' ? 'Decline these changes' : 'Reject'

  return (
    <div className="flex flex-wrap gap-2">
      {mode === 'review' && (
        <>
          <Button size={size} disabled={pending} onClick={() => run('approve')}>
            <Check /> Approve
          </Button>
          <Button size={size} variant="secondary" disabled={pending} onClick={() => setDialog('changes')}>
            <Pencil /> Request changes
          </Button>
          <Button size={size} variant="ghost" disabled={pending} onClick={() => setDialog('reject')}>
            <X /> Reject
          </Button>
        </>
      )}
      {mode === 'changes' && (
        <>
          <Button size={size} disabled={pending} onClick={() => run('approve_changes')}>
            <Check /> Apply changes
          </Button>
          <Button size={size} variant="ghost" disabled={pending} onClick={() => setDialog('reject_changes')}>
            <X /> Decline changes
          </Button>
        </>
      )}
      {mode === 'live' && (
        <Button size={size} variant="ghost" className="text-error" disabled={pending} onClick={() => setDialog('remove')}>
          <Trash2 /> Remove
        </Button>
      )}
      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={title}
        footer={
          <Button fullWidth variant={dialog === 'remove' ? 'danger' : 'primary'} loading={pending} disabled={!reason.trim()} onClick={() => dialog && run(dialog, reason)}>
            {title}
          </Button>
        }
      >
        <p className="mb-3 text-small text-muted">The owner receives this reason by email.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {TEMPLATES.map(([label, text]) => (
            <button key={label} type="button" onClick={() => setReason(text)} className="rounded-full border border-border-strong px-3 py-1 text-caption font-semibold hover:border-ink">
              {label}
            </button>
          ))}
        </div>
        <label htmlFor={`reason-${id}`} className="sr-only">
          Reason
        </label>
        <Textarea id={`reason-${id}`} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
      </Dialog>
    </div>
  )
}

/** Approve/decline buttons for claims, verification, media and reports. */
export function DecisionButtons({ onApprove, onReject, approveLabel = 'Approve', rejectLabel = 'Reject', askNote }: { onApprove: (note?: string) => Promise<{ ok: boolean; error?: string; data?: { message: string } }>; onReject: (note?: string) => Promise<{ ok: boolean; error?: string; data?: { message: string } }>; approveLabel?: string; rejectLabel?: string; askNote?: boolean }) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState('')
  const toast = useToast()
  const router = useRouter()
  const run = (fn: (n?: string) => Promise<{ ok: boolean; error?: string; data?: { message: string } }>) =>
    start(async () => {
      const res = await fn(note || undefined)
      toast(res.ok ? res.data?.message ?? 'Done.' : res.error ?? 'Please try again.', res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  return (
    <div className="space-y-2">
      {askNote && <Textarea aria-label="Note to the applicant (optional)" placeholder="Note (sent to the applicant if rejected)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(onApprove)}>
          <Check /> {approveLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(onReject)}>
          <X /> {rejectLabel}
        </Button>
      </div>
    </div>
  )
}
