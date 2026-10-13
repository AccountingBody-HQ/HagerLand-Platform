'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteUserAction, sendPasswordResetAction, setSuspendedAction } from '@/app/roodber8/actions/users'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

export function UserTools({ userId, suspended, deletionRequested }: { userId: string; suspended: boolean; deletionRequested: boolean }) {
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState('')
  const [showDelete, setShowDelete] = useState(deletionRequested)
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (!res.ok) return
      if (after) after()
      else router.refresh()
    })
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Button variant={suspended ? 'secondary' : 'danger'} disabled={pending} onClick={() => run(() => setSuspendedAction(userId, !suspended))}>
          {suspended ? 'Lift suspension' : 'Suspend user'}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => run(() => sendPasswordResetAction(userId))}>
          Send password reset email
        </Button>
        {!showDelete && (
          <Button variant="ghost" disabled={pending} onClick={() => setShowDelete(true)}>
            Delete account…
          </Button>
        )}
      </div>
      {showDelete && (
        <div className="rounded-md border border-error/40 bg-error/5 p-3">
          <p className="text-small font-semibold text-ink">Delete this account permanently</p>
          <p className="mt-1 text-caption text-muted">Their private listings are taken down and their login, profile and saved items are deleted. This cannot be undone.</p>
          <Field label="Type their email address to confirm" htmlFor="del-confirm" className="mt-3">
            <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </Field>
          <Button variant="danger" className="mt-2" fullWidth disabled={pending || !confirm} onClick={() => run(() => deleteUserAction(userId, confirm), () => router.push('/roodber8/users?deleted=1'))}>
            Delete account
          </Button>
        </div>
      )}
    </div>
  )
}
