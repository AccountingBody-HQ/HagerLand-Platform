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
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-green pointer-events-none"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search businesses, jobs, housing, and more"
        className="w-full pl-11 pr-5 py-3.5 rounded-full border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green transition-shadow"
      />
    </form>
  )
}
