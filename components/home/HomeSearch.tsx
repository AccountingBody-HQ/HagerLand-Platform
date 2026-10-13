'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { PropertyQuickSearch } from '@/components/property/PropertyQuickSearch'
import { ProfessionalSearch } from '@/components/company/ProfessionalSearch'
import { Button } from '@/components/ui/Button'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/cn'

type Tab = 'buy' | 'rent' | 'supplies' | 'professionals'
const TABS: { id: Tab; label: string }[] = [
  { id: 'buy', label: 'Buy' },
  { id: 'rent', label: 'Rent' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'professionals', label: 'Professionals' },
]

/** The unified homepage search card (spec 13, 14.3). */
export function HomeSearch({ services }: { services: { name: string; children: { name: string; slug: string }[] }[] }) {
  const [tab, setTab] = useState<Tab>('buy')
  const [q, setQ] = useState('')
  const router = useRouter()
  return (
    <div className="rounded-xl bg-white p-4 text-ink shadow-lg sm:p-5">
      <div role="tablist" aria-label="What are you looking for?" className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn('min-h-11 whitespace-nowrap rounded-md px-4 font-semibold transition-colors', tab === t.id ? 'bg-ink text-white' : 'text-muted hover:bg-stone-100 hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {(tab === 'buy' || tab === 'rent') && <PropertyQuickSearch key={tab} defaultPurpose={tab === 'buy' ? 'sale' : 'rent'} showToggle={false} idPrefix={`home-${tab}`} />}
        {tab === 'supplies' && (
          <form
            role="search"
            aria-label="Search supplies"
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              const t = q.trim()
              track('search_performed', { vertical: 'supplies', has_results: true })
              router.push(t ? `/search?q=${encodeURIComponent(t)}&vertical=supplies` : '/supplies')
            }}
          >
            <label htmlFor="home-supplies-q" className="sr-only">
              Product
            </label>
            <input id="home-supplies-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cement, rebar, roofing sheets, tiles…" className="h-11 min-w-0 flex-1 rounded-sm border border-border-strong px-3.5 text-body" />
            <Button type="submit" className="px-6">
              <Search /> Search
            </Button>
          </form>
        )}
        {tab === 'professionals' && <ProfessionalSearch services={services} idPrefix="home-pro" />}
      </div>
    </div>
  )
}
