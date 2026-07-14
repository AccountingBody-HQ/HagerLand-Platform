'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SearchBox({ className = '' }: { className?: string }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center ${className}`}>
      <div className="relative flex-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses, jobs, housing..."
          className="w-full pl-11 pr-32 py-3.5 rounded-full border border-border bg-white text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green transition-all"
        />
        <button type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition-colors shrink-0">
          Search
        </button>
      </div>
    </form>
  )
}
