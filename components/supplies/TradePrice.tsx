'use client'

import { useEffect, useState } from 'react'
import { BadgePercent } from 'lucide-react'
import { formatETBCents } from '@/lib/format'

/** The trade price, shown only when the signed-in user has an approved trade account (spec 25.2e). */
export function TradePrice({ productId }: { productId: string }) {
  const [cents, setCents] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/trade-prices?ids=${productId}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { prices: {} }))
      .then((b: { prices?: Record<string, number> }) => {
        if (live) setCents(b.prices?.[productId] ?? null)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [productId])
  if (cents === null) return null
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold-soft px-2.5 py-1 text-small font-semibold text-ink">
      <BadgePercent className="size-4 text-gold" aria-hidden /> Your trade price: {formatETBCents(cents)}
    </p>
  )
}
