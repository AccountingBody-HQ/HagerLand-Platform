'use client'

import { useEffect, useState } from 'react'
import { BadgePercent } from 'lucide-react'
import { formatETBCents } from '@/lib/format'
import { TRADE_TEXT } from '@/lib/supply/trade-prices'

/**
 * The trade price, shown only when the signed-in user has an approved trade account (spec 25.2e). With `unit` (only
 * while trade pricing is on, S6-4) it is the customer's own effective price: their agreements first, then the general one.
 */
export function TradePrice({ productId, unit }: { productId: string; unit?: string }) {
  const [cents, setCents] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/trade-prices?ids=${productId}${unit ? '&effective=1' : ''}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { prices: {} }))
      .then((b: { prices?: Record<string, number> }) => {
        if (live) setCents(b.prices?.[productId] ?? null)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [productId, unit])
  if (cents === null) return null
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gold-soft px-2.5 py-1 text-small font-semibold text-ink">
      <BadgePercent className="size-4 text-gold" aria-hidden /> {unit ? TRADE_TEXT.productPrice(cents, unit) : `Your trade price: ${formatETBCents(cents)}`}
    </p>
  )
}
