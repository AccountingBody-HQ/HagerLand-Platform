'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

type ResultType = 'all' | 'business' | 'job' | 'housing' | 'money' | 'car' | 'tutor' | 'community' | 'event'

type SearchResult = {
  id: string
  type: Exclude<ResultType, 'all'>
  title: string
  subtitle: string
  url: string
}

const FILTERS: { id: ResultType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Directory' },
  { id: 'job', label: 'Jobs' },
  { id: 'housing', label: 'Housing' },
  { id: 'money', label: 'Money' },
  { id: 'car', label: 'Cars' },
  { id: 'tutor', label: 'Tutors' },
  { id: 'community', label: 'Community' },
  { id: 'event', label: 'Events' },
]

const POPULAR_SEARCHES = ['London', 'restaurant', 'accountant', 'Manchester', 'salon']

function badgeClass(type: string) {
  const map: Record<string, string> = {
    business: 'bg-green-soft text-green',
    job: 'bg-gold-soft text-gold',
    housing: 'bg-green-soft text-green',
    money: 'bg-gold-soft text-gold',
    car: 'bg-gold-soft text-gold',
    tutor: 'bg-green-soft text-green',
    community: 'bg-gold-soft text-gold',
    event: 'bg-green-soft text-green',
  }
  return map[type] ?? 'bg-section text-muted'
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    business: 'Directory',
    job: 'Job',
    housing: 'Housing',
    money: 'Money',
    car: 'Car/Taxi',
    tutor: 'Tutor',
    community: 'Community',
    event: 'Event',
  }
  return map[type] ?? type
}

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [activeType, setActiveType] = useState<ResultType>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      router.replace(`/search?q=${encodeURIComponent(query)}`, { scroll: false })
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
      } catch {
        setResults([])
      }
      setSearched(true)
      setLoading(false)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, router])

  const countFor = (type: ResultType) =>
    type === 'all' ? results.length : results.filter((r) => r.type === type).length

  const displayed = activeType === 'all' ? results : results.filter((r) => r.type === activeType)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      <section className="bg-section py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2">
            Search HagerLand
          </h1>
          <p className="text-muted text-sm sm:text-base mb-6">
            Search across businesses, jobs, housing, money, cars, tutors, community, and events.
          </p>
          <div className="relative max-w-lg mx-auto">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search HagerLand"
              className="w-full px-5 py-3.5 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green transition-shadow"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {searched && results.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveType(f.id)}
                className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                  activeType === f.id
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink border-border hover:border-ink'
                }`}
              >
                {f.label}
                <span
                  className={`text-xs px-1.5 rounded-full ${
                    activeType === f.id ? 'bg-white/20' : 'bg-section'
                  }`}
                >
                  {countFor(f.id)}
                </span>
              </button>
            ))}
          </div>
        )}

        {(!query || query.trim().length < 2) && (
          <div className="text-center py-16">
            <p className="text-muted text-sm mb-6">Start typing to search HagerLand.</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
              Popular searches
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-border hover:border-ink transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="grid gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-border bg-white rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-section rounded w-1/3 mb-3" />
                <div className="h-3 bg-section rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {searched && !loading && displayed.length === 0 && query.trim().length >= 2 && (
          <div className="text-center py-16">
            <p className="text-ink font-semibold mb-2">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-muted text-sm">Try a different word, or check your spelling.</p>
          </div>
        )}

        {searched && !loading && displayed.length > 0 && (
          <>
            <p className="text-sm text-muted mb-4">
              <span className="font-semibold text-ink">{displayed.length}</span> result
              {displayed.length !== 1 ? 's' : ''} for{' '}
              <span className="font-semibold text-ink">&ldquo;{query}&rdquo;</span>
            </p>
            <div className="grid gap-3">
              {displayed.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  className="border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-bold text-ink mb-1">{result.title}</p>
                    <p className="text-sm text-muted">{result.subtitle}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClass(result.type)}`}>
                    {typeLabel(result.type)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex flex-col" />}>
      <SearchInner />
    </Suspense>
  )
}
