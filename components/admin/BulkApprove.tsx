'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type ReactNode } from 'react'
import { CheckCheck } from 'lucide-react'
import { bulkApproveAction } from '@/app/roodber8/actions/moderation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

/** Wraps a list of review items with checkboxes and a "Approve selected" button. */
export function BulkApprove({ entity, items }: { entity: 'property' | 'development' | 'organisation' | 'portfolio'; items: { id: string; node: ReactNode }[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-10 items-center gap-2 text-small">
          <input type="checkbox" className="size-4 accent-green" checked={selected.length === items.length && items.length > 0} onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])} />
          Select all
        </label>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || selected.length === 0}
          onClick={() =>
            start(async () => {
              const res = await bulkApproveAction(entity, selected)
              toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
              setSelected([])
              router.refresh()
            })
          }
        >
          <CheckCheck /> Approve selected ({selected.length})
        </Button>
      </div>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.id} className="flex gap-3">
            <input type="checkbox" aria-label="Select for bulk approval" className="mt-5 size-4 shrink-0 accent-green" checked={selected.includes(i.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))} />
            <div className="min-w-0 flex-1">{i.node}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
