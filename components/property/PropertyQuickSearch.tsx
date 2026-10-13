'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Combobox } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PROPERTY_TYPES } from '@/lib/labels'
import { PRICE_STEPS_RENT, PRICE_STEPS_SALE } from '@/lib/property-search'
import { formatETBCompact } from '@/lib/format'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/cn'

/** Buy/Rent search: location, type and maximum price. Goes to the results page. */
export function PropertyQuickSearch({ defaultPurpose = 'sale', showToggle = true, idPrefix = 'qs', compact }: { defaultPurpose?: 'sale' | 'rent'; showToggle?: boolean; idPrefix?: string; compact?: boolean }) {
  const router = useRouter()
  const [purpose, setPurpose] = useState<'sale' | 'rent'>(defaultPurpose)
  const [location, setLocation] = useState<string | null>(null)
  const [type, setType] = useState('')
  const [max, setMax] = useState('')
  const steps = purpose === 'sale' ? PRICE_STEPS_SALE : PRICE_STEPS_RENT

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (max) params.set('price_max', max)
    const qs = params.toString()
    track('search_performed', { vertical: 'property', has_results: true })
    router.push(`/property/${purpose === 'sale' ? 'for-sale' : 'to-rent'}${location ? `/${location}` : ''}${qs ? `?${qs}` : ''}`)
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Search property">
      {showToggle && (
        <div className="mb-3 inline-flex rounded-md bg-stone-100 p-1" role="radiogroup" aria-label="Buy or rent">
          {(['sale', 'rent'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={purpose === p}
              onClick={() => {
                setPurpose(p)
                setMax('')
              }}
              className={cn('min-h-10 rounded px-5 text-small font-semibold transition-colors', purpose === p ? 'bg-white text-ink shadow-xs' : 'text-muted')}
            >
              {p === 'sale' ? 'Buy' : 'Rent'}
            </button>
          ))}
        </div>
      )}
      <div className={cn('grid gap-2', compact ? 'sm:grid-cols-[1.6fr_1fr_1fr_auto]' : 'md:grid-cols-[1.6fr_1fr_1fr_auto]')}>
        <div>
          <label htmlFor={`${idPrefix}-loc`} className="sr-only">
            Location
          </label>
          <Combobox id={`${idPrefix}-loc`} endpoint="/api/locations?value=path" placeholder="City, sub-city or area" onChange={(o) => setLocation(o?.value ?? null)} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-type`} className="sr-only">
            Property type
          </label>
          <Select id={`${idPrefix}-type`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any type</option>
            {PROPERTY_TYPES.filter((t) => t.value !== 'other').map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
            <option value="commercial">Any commercial</option>
          </Select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-max`} className="sr-only">
            Maximum price
          </label>
          <Select id={`${idPrefix}-max`} value={max} onChange={(e) => setMax(e.target.value)}>
            <option value="">Max price</option>
            {steps.map((s) => (
              <option key={s} value={s}>
                {formatETBCompact(s)}
                {purpose === 'rent' ? '/mo' : ''}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="md" className="px-6">
          <Search /> Search
        </Button>
      </div>
    </form>
  )
}
