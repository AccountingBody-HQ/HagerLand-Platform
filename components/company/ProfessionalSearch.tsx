'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Combobox } from '@/components/ui/Combobox'
import { Button } from '@/components/ui/Button'
import { track } from '@/lib/analytics'

/** Service + location search for professionals. */
export function ProfessionalSearch({ services, idPrefix = 'ps' }: { services: { name: string; children: { name: string; slug: string }[] }[]; idPrefix?: string }) {
  const router = useRouter()
  const [service, setService] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const options = services.flatMap((g) => g.children.map((c) => ({ value: c.slug, label: c.name, description: g.name })))
  return (
    <form
      role="search"
      aria-label="Find a professional"
      onSubmit={(e) => {
        e.preventDefault()
        track('search_performed', { vertical: 'professionals', has_results: true })
        router.push(service ? `/professionals/${service}${location ? `/${location}` : ''}` : `/professionals${location ? `?loc=${encodeURIComponent(location)}` : ''}`)
      }}
      className="grid gap-2 md:grid-cols-[1.4fr_1.4fr_auto]"
    >
      <div>
        <label htmlFor={`${idPrefix}-svc`} className="sr-only">
          Service
        </label>
        <Combobox id={`${idPrefix}-svc`} options={options} placeholder="What do you need? e.g. Architect" onChange={(o) => setService(o?.value ?? null)} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-loc`} className="sr-only">
          Location
        </label>
        <Combobox id={`${idPrefix}-loc`} endpoint="/api/locations?value=path&scope=all" placeholder="Where? City or sub-city" onChange={(o) => setLocation(o?.value ?? null)} />
      </div>
      <Button type="submit" className="px-6">
        <Search /> Find
      </Button>
    </form>
  )
}
