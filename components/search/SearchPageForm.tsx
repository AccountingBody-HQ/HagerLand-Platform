'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { track } from '@/lib/analytics'

export function SearchPageForm({ q, vertical }: { q: string; vertical: string }) {
  const router = useRouter()
  const [value, setValue] = useState(q)
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const t = value.trim()
        if (!t) return
        track('search_performed', { vertical, has_results: true })
        router.push(`/search?q=${encodeURIComponent(t)}${vertical !== 'all' ? `&vertical=${vertical}` : ''}`)
      }}
      className="flex gap-2"
    >
      <label htmlFor="search-page-q" className="sr-only">
        Search
      </label>
      <input id="search-page-q" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search property, supplies, professionals…" className="h-12 min-w-0 flex-1 rounded-md border border-border-strong px-4 text-body" />
      <Button type="submit" size="lg">
        <Search /> Search
      </Button>
    </form>
  )
}
