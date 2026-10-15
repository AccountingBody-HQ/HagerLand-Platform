'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem {
  id: string
  label: ReactNode
  content: ReactNode
}

/** Keyboard-accessible tabs (arrow keys move between tabs). */
export function Tabs({ items, defaultId, className, listClassName, inverse }: { items: TabItem[]; defaultId?: string; className?: string; listClassName?: string; inverse?: boolean }) {
  const [active, setActive] = useState(defaultId ?? items[0]?.id)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (index + dir + items.length) % items.length
    setActive(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className={className}>
      <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b', inverse ? 'border-white/15' : 'border-border', listClassName)}>
        {items.map((item, i) => {
          const selected = item.id === active
          return (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                '-mb-px min-h-11 whitespace-nowrap border-b-2 px-4 text-small font-semibold transition-colors',
                selected
                  ? inverse
                    ? 'border-gold text-white'
                    : 'border-green text-ink'
                  : inverse
                    ? 'border-transparent text-white/70 hover:text-white'
                    : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          hidden={item.id !== active}
          className="pt-5"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
