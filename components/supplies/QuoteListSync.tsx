'use client'

import { useEffect, useRef } from 'react'
import { loadQuoteListAction, saveQuoteListAction } from '@/app/actions/quote-list-actions'
import { mergeQuoteLists, quoteListSchema } from '@/lib/quote-list'
import { QUOTE_KEY } from './quoteStore'

function readLocal() {
  try {
    const parsed = quoteListSchema.safeParse(JSON.parse(window.localStorage.getItem(QUOTE_KEY) ?? '[]'))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

/** Keeps a signed-in user's quote list in step between this browser and their account (spec 25.2a). */
export function QuoteListSync() {
  const signedIn = useRef(false)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    let cancelled = false
    loadQuoteListAction()
      .then((remote) => {
        if (cancelled || remote === null) return
        signedIn.current = true
        const merged = mergeQuoteLists(readLocal(), remote)
        try {
          window.localStorage.setItem(QUOTE_KEY, JSON.stringify(merged))
        } catch {
          // storage unavailable
        }
        window.dispatchEvent(new Event('hl-quote-change'))
        void saveQuoteListAction(merged)
      })
      .catch(() => undefined)
    const onChange = () => {
      if (!signedIn.current) return
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void saveQuoteListAction(readLocal()), 800)
    }
    window.addEventListener('hl-quote-change', onChange)
    return () => {
      cancelled = true
      window.removeEventListener('hl-quote-change', onChange)
    }
  }, [])
  return null
}
