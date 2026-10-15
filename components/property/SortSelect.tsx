'use client'

import { useRouter } from 'next/navigation'
import { SORTS, toQuery, type PropertyFilters } from '@/lib/property-search'

export function SortSelect({ basePath, filters }: { basePath: string; filters: PropertyFilters }) {
  const router = useRouter()
  const options = SORTS.filter((s) => s.value !== 'relevance' || filters.q)
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="whitespace-nowrap text-small text-muted">
        Sort by
      </label>
      <select
        id="sort"
        value={filters.sort}
        onChange={(e) => router.push(`${basePath}${toQuery(filters, { sort: e.target.value as PropertyFilters['sort'], page: 1 })}`, { scroll: false })}
        className="h-11 rounded-sm border border-border-strong bg-white px-3 text-small font-medium"
      >
        {options.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
