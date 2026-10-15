'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Clock, LoaderCircle, Search, X } from 'lucide-react'
import type { SuggestResponse } from '@/lib/suggest-types'
import { cn } from '@/lib/cn'

const RECENT_KEY = 'hl_recent_searches'

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}

function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable (private mode): recent searches are optional
  }
}

/** Command-palette style search with typeahead (full screen on mobile). */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [data, setData] = useState<SuggestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      setRecent(readRecent())
      window.setTimeout(() => inputRef.current?.focus(), 10)
    }
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setData(null)
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        if (res.ok) setData((await res.json()) as SuggestResponse)
      } catch {
        // aborted or offline
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [q])

  function go(term: string) {
    const t = term.trim()
    if (!t) return
    saveRecent(t)
    onClose()
    router.push(`/search?q=${encodeURIComponent(t)}`)
  }

  const groups = data?.groups.filter((g) => g.items.length > 0) ?? []

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-label="Search HagerLand"
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/50 open:flex sm:items-start sm:justify-center sm:pt-[10vh]"
    >
      <div className="flex h-full w-full animate-fade-in flex-col bg-white sm:h-auto sm:max-h-[75vh] sm:max-w-2xl sm:rounded-xl sm:shadow-lg">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            go(q)
          }}
          className="flex items-center gap-2 border-b border-border px-4"
        >
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <label htmlFor="global-search" className="sr-only">
            Search property, supplies and professionals
          </label>
          <input
            ref={inputRef}
            id="global-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search property, supplies, professionals…"
            autoComplete="off"
            className="h-16 flex-1 bg-transparent text-body outline-none placeholder:text-subtle"
          />
          {loading && <LoaderCircle className="size-5 animate-spin text-muted" aria-hidden />}
          <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-md hover:bg-stone-100" aria-label="Close search">
            <X className="size-5" />
          </button>
        </form>

        <div className="flex-1 overflow-y-auto p-2" aria-live="polite">
          {q.trim().length < 2 ? (
            recent.length > 0 ? (
              <div className="p-2">
                <p className="hl-eyebrow px-2 pb-2 text-muted">Recent searches</p>
                <ul>
                  {recent.map((r) => (
                    <li key={r}>
                      <button type="button" onClick={() => go(r)} className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-stone-100">
                        <Clock className="size-4 text-subtle" aria-hidden />
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="px-4 py-6 text-small text-muted">Try “apartment in Bole”, “cement”, “architect” or “Adama”.</p>
            )
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.id} className="p-2">
                  <p className="hl-eyebrow px-2 pb-1 text-muted">{g.label}</p>
                  <ul>
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} onClick={onClose} className="flex min-h-11 flex-col justify-center rounded-md px-2 py-1.5 hover:bg-stone-100">
                          <span className="line-clamp-1 font-medium text-ink">{item.label}</span>
                          {item.meta && <span className="line-clamp-1 text-small text-muted">{item.meta}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {!loading && data && groups.length === 0 && <p className="px-4 py-6 text-small text-muted">No quick matches. Press Enter to search everything.</p>}
              <button
                type="button"
                onClick={() => go(q)}
                className={cn('m-2 flex min-h-12 w-[calc(100%-1rem)] items-center justify-between rounded-md bg-stone-50 px-4 font-semibold text-green hover:bg-green-tint')}
              >
                See all results for “{q.trim()}”
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
