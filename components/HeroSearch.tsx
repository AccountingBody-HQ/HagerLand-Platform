'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PLACEHOLDERS = [
  'Search savings rates across 32 banks...',
  'Check USD to ETB exchange rate...',
  'Compare motor insurance providers...',
  'Track ESX listed equities...',
  'Find cheapest way to send money home...',
  'Compare CBE vs Awash Bank...',
]

export default function HeroSearch() {
  const router = useRouter()
  const [query, setQuery]       = useState('')
  const [current, setCurrent]   = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting]   = useState(false)
  const [paused, setPaused]       = useState(false)

  useEffect(() => {
    if (paused) return
    const target = PLACEHOLDERS[current]
    if (!deleting && displayed.length < target.length) {
      const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 45)
      return () => clearTimeout(t)
    }
    if (!deleting && displayed.length === target.length) {
      const t = setTimeout(() => setDeleting(true), 2200)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 22)
      return () => clearTimeout(t)
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false)
      setCurrent((c) => (c + 1) % PLACEHOLDERS.length)
    }
  }, [displayed, deleting, current, paused])

  function handleFocus() { setPaused(true) }
  function handleBlur()  { if (!query) setPaused(false) }

  function handleSearch() {
    // BirrBank's own /search is deferred (decision #8) — HagerLand's /search
    // indexes directory listings, not banks/rates, so route into the
    // Institutions pillar page instead, which has its own client-side filter.
    if (query.trim()) router.push('/birrbank/institutions?q=' + encodeURIComponent(query.trim()))
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div style={{ maxWidth: 480, width: "100%" }}>
      <div
        className="flex items-center gap-3 bg-white rounded-2xl"
        style={{ border: '2px solid #1D4ED8', boxShadow: '0 4px 24px rgba(29,78,216,0.12)', padding: '6px 6px 6px 18px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKey}
          placeholder={displayed}
          className="flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400"
          style={{ fontSize: 14, fontWeight: 500 }}
        />
        <button
          onClick={handleSearch}
          className="font-bold rounded-xl text-white shrink-0 transition-opacity hover:opacity-90 flex items-center gap-2"
          style={{ background: '#1D4ED8', fontSize: 14, padding: '10px 14px' }}
        >
          <span className="hidden sm:inline">Search</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2 ml-1">
        Try: <span className="text-slate-500 font-medium">best savings rate</span> · <span className="text-slate-500 font-medium">USD to ETB</span> · <span className="text-slate-500 font-medium">CBE mortgage</span>
      </p>
    </div>
  )
}
