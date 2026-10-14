'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Columns3, X } from 'lucide-react'
import { useCompare } from './useCompare'

/** Floating "Compare (n)" bar while properties are in the compare list (spec 24.7). */
export function CompareBar() {
  const { list, clear } = useCompare()
  const pathname = usePathname()
  if (list.length === 0 || pathname === '/property/compare') return null
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
      <div className="flex items-center gap-2 rounded-full bg-ink px-2 py-1.5 text-white shadow-lg">
        <Link href={`/property/compare?ids=${list.map((x) => x.id).join(',')}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold hover:bg-white/10">
          <Columns3 className="size-5" aria-hidden /> Compare ({list.length})
        </Link>
        <button type="button" onClick={clear} aria-label="Clear the compare list" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-white/10">
          <X className="size-5" />
        </button>
      </div>
    </div>
  )
}
