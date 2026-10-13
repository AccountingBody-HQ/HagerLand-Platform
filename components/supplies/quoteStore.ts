'use client'

import { useCallback, useEffect, useState } from 'react'

export const QUOTE_KEY = 'hl_quote_v1'

export interface QuoteItem {
  key: string
  productId?: string
  slug?: string
  name: string
  unit: string
  quantity: number
  notes?: string
  imagePath?: string | null
}

function read(): QuoteItem[] {
  try {
    const raw = window.localStorage.getItem(QUOTE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as QuoteItem[]).filter((i) => i && typeof i.name === 'string' && typeof i.quantity === 'number').slice(0, 100) : []
  } catch {
    return []
  }
}

function write(items: QuoteItem[]) {
  try {
    window.localStorage.setItem(QUOTE_KEY, JSON.stringify(items))
  } catch {
    // storage unavailable: the list lasts until the page closes
  }
  window.dispatchEvent(new Event('hl-quote-change'))
}

/** The quote list lives in this browser (spec 10.5): no account needed. */
export function useQuoteList() {
  const [items, setItems] = useState<QuoteItem[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setItems(read())
    setReady(true)
    const sync = () => setItems(read())
    window.addEventListener('hl-quote-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('hl-quote-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const save = useCallback((next: QuoteItem[]) => {
    setItems(next)
    write(next)
  }, [])

  const add = useCallback(
    (item: Omit<QuoteItem, 'key'>) => {
      const current = read()
      const existing = item.productId ? current.find((i) => i.productId === item.productId) : undefined
      const next = existing
        ? current.map((i) => (i === existing ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...current, { ...item, key: `${item.productId ?? 'custom'}-${Date.now()}` }]
      save(next)
    },
    [save],
  )

  return {
    items,
    ready,
    add,
    update: (key: string, patch: Partial<QuoteItem>) => save(read().map((i) => (i.key === key ? { ...i, ...patch } : i))),
    remove: (key: string) => save(read().filter((i) => i.key !== key)),
    clear: () => save([]),
  }
}
