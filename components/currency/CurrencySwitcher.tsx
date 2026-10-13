'use client'

import { useId } from 'react'
import { formatDate } from '@/lib/format'
import { useCurrency } from './CurrencyProvider'

/** Lets a visitor show approximate prices in their own currency. Hidden until AB sets rates. */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { rates, selected, choose } = useCurrency()
  const id = useId()
  if (rates.length === 0) return null
  const latest = rates.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), rates[0].updatedAt)
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-small font-semibold text-white">
        Show approximate prices in
      </label>
      <select
        id={id}
        value={selected?.currency ?? ''}
        onChange={(e) => choose(e.target.value || null)}
        className="mt-2 h-11 w-full max-w-xs rounded-md border border-white/20 bg-ink-2 px-3 text-body text-white"
      >
        <option value="">ETB only</option>
        {rates.map((r) => (
          <option key={r.currency} value={r.currency}>
            {r.currency}
          </option>
        ))}
      </select>
      <p className="mt-1 text-caption text-white/60">Prices are in ETB. Conversions are approximate (rates updated {formatDate(latest)}).</p>
    </div>
  )
}
