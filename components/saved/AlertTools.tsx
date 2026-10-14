'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deleteSearchAction, updateSearchAction } from '@/app/actions/saved-search-actions'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

export function AlertTools({ id, frequency, name }: { id: string; frequency: string; name: string }) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => ReturnType<typeof deleteSearchAction>) =>
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`freq-${id}`}>
        Emails for {name}
      </label>
      <Select id={`freq-${id}`} defaultValue={frequency} disabled={pending} onChange={(e) => run(() => updateSearchAction(id, e.target.value))} className="h-11 w-56">
        <option value="instant">As soon as there is a match</option>
        <option value="daily">Once a day</option>
        <option value="weekly">Once a week</option>
        <option value="off">No emails</option>
      </Select>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deleteSearchAction(id))} aria-label={`Delete ${name}`}>
        Delete
      </Button>
    </div>
  )
}
