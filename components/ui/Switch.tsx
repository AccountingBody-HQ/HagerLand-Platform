'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

export function Switch({ id, name, label, defaultChecked, onChange }: { id: string; name?: string; label: string; defaultChecked?: boolean; onChange?: (checked: boolean) => void }) {
  const [on, setOn] = useState(Boolean(defaultChecked))
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="text-body text-ink">
        {label}
      </label>
      {name && <input type="hidden" name={name} value={on ? 'true' : 'false'} />}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => {
          setOn(!on)
          onChange?.(!on)
        }}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-green' : 'bg-stone-300')}
      >
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}
