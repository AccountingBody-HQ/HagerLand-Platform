'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { controlClasses } from './Field'

export interface ComboOption {
  value: string
  label: string
  description?: string
}

/**
 * Searchable select. Give it static `options`, or an `endpoint` that returns
 * ComboOption[] for ?q= (debounced 250 ms). The chosen value is submitted as `name`.
 */
export function Combobox({
  id,
  name,
  options,
  endpoint,
  defaultValue,
  placeholder = 'Start typing…',
  emptyText = 'No matches',
  invalid,
  onChange,
  className,
  describedById,
}: {
  id: string
  name?: string
  options?: ComboOption[]
  endpoint?: string
  defaultValue?: ComboOption | null
  placeholder?: string
  emptyText?: string
  invalid?: boolean
  onChange?: (option: ComboOption | null) => void
  className?: string
  describedById?: string
}) {
  const listId = useId()
  const [selected, setSelected] = useState<ComboOption | null>(defaultValue ?? null)
  const [query, setQuery] = useState(defaultValue?.label ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [remote, setRemote] = useState<ComboOption[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (endpoint) return remote
    const q = query.trim().toLowerCase()
    const list = options ?? []
    if (!q || q === selected?.label.toLowerCase()) return list.slice(0, 50)
    return list.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)).slice(0, 50)
  }, [endpoint, remote, options, query, selected])

  useEffect(() => {
    if (!endpoint || !open) return
    const q = query.trim()
    if (q.length < 2 || q === selected?.label) {
      setRemote([])
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (res.ok) setRemote((await res.json()) as ComboOption[])
      } catch {
        // aborted or offline: keep the previous suggestions
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [endpoint, open, query, selected])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(selected?.label ?? '')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [selected])

  function choose(option: ComboOption | null) {
    setSelected(option)
    setQuery(option?.label ?? '')
    setOpen(false)
    onChange?.(option)
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {name && <input type="hidden" name={name} value={selected?.value ?? ''} />}
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
          if (!e.target.value) choose(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && open && filtered[active]) {
            e.preventDefault()
            choose(filtered[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className={cn(controlClasses, 'h-11 pr-16')}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-muted">
        {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {selected && (
          <button type="button" aria-label="Clear selection" className="rounded p-1 hover:bg-stone-100" onClick={() => choose(null)}>
            <X className="size-4" />
          </button>
        )}
        <ChevronDown className="size-5" aria-hidden />
      </div>
      {open && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-small text-muted">{endpoint && query.trim().length < 2 ? 'Type at least 2 letters' : emptyText}</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected?.value === o.value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(o)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2', i === active && 'bg-stone-100')}
              >
                <span>
                  <span className="block text-body text-ink">{o.label}</span>
                  {o.description && <span className="block text-caption text-muted">{o.description}</span>}
                </span>
                {selected?.value === o.value && <Check className="size-4 text-green" aria-hidden />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
