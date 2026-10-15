'use client'

import { useCallback, useEffect, useState } from 'react'
import { COMPARE_KEY, parseCompare, toggleCompare, type CompareItem } from '@/lib/compare'

const EVENT = 'hl-compare-change'

function read(): CompareItem[] {
  try {
    return parseCompare(window.localStorage.getItem(COMPARE_KEY))
  } catch {
    return []
  }
}

/** The compare list in this browser, shared by every component on the page. */
export function useCompare() {
  const [list, setList] = useState<CompareItem[]>([])
  useEffect(() => {
    setList(read())
    const sync = () => setList(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const save = useCallback((next: CompareItem[]) => {
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable: the list lasts for this page only
    }
    setList(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])
  const toggle = useCallback((item: CompareItem) => {
    const r = toggleCompare(read(), item)
    if (!r.full) save(r.list)
    return r.full
  }, [save])
  const remove = useCallback((id: string) => save(read().filter((x) => x.id !== id)), [save])
  return { list, toggle, remove, clear: () => save([]) }
}
