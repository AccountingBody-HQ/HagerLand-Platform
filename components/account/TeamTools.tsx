'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { changeRoleAction, removeMemberAction, transferOwnershipAction } from '@/app/actions/team-actions'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

/** Role, ownership and removal controls for one team member. */
export function MemberTools({ userId, name, role, myRole, isMe }: { userId: string; name: string; role: string; myRole: string; isMe: boolean }) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }>, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  }
  const canEditRole = !isMe && (myRole === 'owner' || (myRole === 'admin' && role === 'member'))
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEditRole && myRole === 'owner' && (
        <>
          <label className="sr-only" htmlFor={`role-${userId}`}>
            Role for {name}
          </label>
          <Select id={`role-${userId}`} defaultValue={role} disabled={pending} className="w-auto" onChange={(e) => run(() => changeRoleAction(userId, e.target.value as 'owner' | 'admin' | 'member'))}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </Select>
        </>
      )}
      {!isMe && myRole === 'owner' && role !== 'owner' && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => transferOwnershipAction(userId), `Make ${name} the owner? You will become an admin.`)}>
          Make owner
        </Button>
      )}
      {(isMe || canEditRole) && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removeMemberAction(userId), isMe ? 'Leave this organisation?' : `Remove ${name} from the team?`)}>
          {isMe ? 'Leave' : 'Remove'}
        </Button>
      )}
    </div>
  )
}
