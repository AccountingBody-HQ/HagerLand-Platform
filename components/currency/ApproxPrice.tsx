'use client'

import { convertFromEtb, formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useCurrency } from './CurrencyProvider'

/**
 * "≈ £1,250 approx." beside an ETB price, in the visitor's chosen currency (spec 25.2f).
 * ETB stays the price of record; nothing renders until the visitor picks a currency.
 */
export function ApproxPrice({ etb, className, suffix }: { etb: number | null | undefined; className?: string; suffix?: string }) {
  const { selected } = useCurrency()
  if (!selected || etb === null || etb === undefined) return null
  const v = convertFromEtb(etb, selected.etbPerUnit)
  if (v === null) return null
  return (
    <span className={cn('font-sans text-small font-medium text-muted', className)} title={`Approximate, at the rate HagerLand set on ${formatDate(selected.updatedAt)}. The price is in Ethiopian birr (ETB).`}>
      ≈ {formatMoney(v, selected.currency)}
      {suffix} <abbr title="approximately">approx.</abbr>
    </span>
  )
}
