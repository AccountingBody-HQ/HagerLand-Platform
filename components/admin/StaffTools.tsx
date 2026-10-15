'use client'

import { resendStaffInviteAction, setStaffDisabledAction, setStaffRoleAction } from '@/app/roodber8/actions/staff'
import { RunButton } from '@/components/admin/AgencyTools'
import { Select } from '@/components/ui/Field'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useToast } from '@/components/ui/Toast'
import { STAFF_ROLES } from '@/lib/admin/roles'

export function StaffRow({ id, role, status, name }: { id: string; role: string; status: string; name: string }) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={`Role of ${name}`}
        defaultValue={role}
        disabled={pending}
        className="h-10 w-40 text-small"
        onChange={(e) =>
          start(async () => {
            const r = await setStaffRoleAction(id, e.target.value)
            toast(r.ok ? r.data.message : r.error, r.ok ? 'success' : 'error')
            router.refresh()
          })
        }
      >
        {STAFF_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
      {status === 'disabled' ? <RunButton label="Enable" fn={() => setStaffDisabledAction(id, false)} /> : <RunButton label="Disable" fn={() => setStaffDisabledAction(id, true)} />}
      {status === 'invited' && <RunButton label="Send invitation again" fn={() => resendStaffInviteAction(id)} variant="ghost" />}
    </div>
  )
}
