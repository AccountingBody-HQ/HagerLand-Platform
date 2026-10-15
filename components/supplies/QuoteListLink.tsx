'use client'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { useQuoteList } from './quoteStore'

export function QuoteListLink() {
  const { items, ready } = useQuoteList()
  return (
    <Link href="/supplies/quote" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-white px-4 font-semibold hover:bg-stone-50">
      <ClipboardList className="size-5 text-green" aria-hidden />
      Quote list
      {ready && items.length > 0 && <span className="rounded-full bg-green px-2 py-0.5 text-caption font-bold text-white">{items.length}</span>}
    </Link>
  )
}
