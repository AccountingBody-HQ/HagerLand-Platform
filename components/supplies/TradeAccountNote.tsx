import Link from 'next/link'
import { BadgePercent } from 'lucide-react'

/** Points businesses to trade accounts (spec 25.2e). */
export function TradeAccountNote() {
  return (
    <p className="flex items-start gap-2 text-small text-muted">
      <BadgePercent className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
      <span>
        Buying for a business?{' '}
        <Link href="/supplies/trade" className="font-semibold text-green underline">
          Apply for a trade account
        </Link>{' '}
        to see trade prices.
      </span>
    </p>
  )
}
