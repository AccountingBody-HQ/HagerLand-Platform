'use client'

import { useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, Search } from 'lucide-react'
import { importPlaceAction, type ImportOutcome } from '../actions/imports'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { Badge } from '@/components/ui/Badge'
import { ORG_KIND_LABEL } from '@/lib/org-labels'

interface Result {
  google_place_id: string
  name: string
  address: string
  types: string[]
  already_imported: boolean
}

type Progress = Record<string, { state: 'working' | ImportOutcome; note?: string }>

const KINDS = ['supplier', 'manufacturer', 'contractor', 'professional_firm', 'sole_trader', 'agency', 'developer'] as const

export function ImportSearch({ services, locations, configured, aiEnabled }: { services: { id: string; label: string }[]; locations: { id: string; label: string }[]; configured: boolean; aiEnabled: boolean }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('supplier')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState('')
  const [fallback, setFallback] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<Progress>({})
  const [error, setError] = useState<string | null>(null)
  const visibleServices = useMemo(() => {
    const t = serviceFilter.trim().toLowerCase()
    return t ? services.filter((s) => s.label.toLowerCase().includes(t)) : services
  }, [services, serviceFilter])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setSearching(true)
    setError(null)
    setProgress({})
    try {
      const res = await fetch(`/api/admin/places-search?${new URLSearchParams({ query, kind })}`)
      const data = (await res.json()) as { results?: Result[]; error?: string }
      if (!res.ok || !data.results) throw new Error(data.error ?? 'Search failed.')
      setResults(data.results)
      setSelected(data.results.filter((r) => !r.already_imported).map((r) => r.google_place_id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function runImport() {
    setRunning(true)
    for (const id of selected) {
      setProgress((p) => ({ ...p, [id]: { state: 'working' } }))
      const res = await importPlaceAction({ google_place_id: id, kind, service_ids: serviceIds, fallback_location_id: fallback || null }).catch(() => null)
      setProgress((p) => ({ ...p, [id]: res?.ok ? { state: res.data.outcome, note: res.data.outcome === 'failed' ? res.data.name : undefined } : { state: 'failed', note: res && !res.ok ? res.error : 'Network error' } }))
    }
    setSelected([])
    setRunning(false)
  }

  const counts = Object.values(progress).reduce<Record<string, number>>((acc, p) => ((acc[p.state] = (acc[p.state] ?? 0) + 1), acc), {})

  if (!configured) return <FormAlert tone="info">Google Places is not set up. Add GOOGLE_PLACES_API_KEY in Vercel to use imports.</FormAlert>
  return (
    <div className="space-y-5">
      <form onSubmit={search} className="grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2">
        <Field label="Search Google" htmlFor="im-q" hint="For example: cement supplier Bole Addis Ababa" className="sm:col-span-2">
          <Input id="im-q" value={query} onChange={(e) => setQuery(e.target.value)} required minLength={2} />
        </Field>
        <Field label="Import as" htmlFor="im-kind">
          <Select id="im-kind" value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {ORG_KIND_LABEL[k] ?? k}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location if the address doesn't say" htmlFor="im-loc" optional>
          <Select id="im-loc" value={fallback} onChange={(e) => setFallback(e.target.value)}>
            <option value="">Leave empty</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-small font-semibold text-ink">Services to tag ({serviceIds.length} chosen)</legend>
          <Input aria-label="Filter services" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} placeholder="Filter services" className="mb-2 h-10 max-w-xs" />
          <div className="grid max-h-48 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
            {visibleServices.map((s) => (
              <label key={s.id} className="flex min-h-9 items-center gap-2 text-small">
                <input type="checkbox" className="size-4 accent-green" checked={serviceIds.includes(s.id)} onChange={(e) => setServiceIds(e.target.checked ? [...serviceIds, s.id] : serviceIds.filter((x) => x !== s.id))} />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={searching || running}>
            {searching ? <LoaderCircle className="animate-spin" /> : <Search />} Search
          </Button>
          {!aiEnabled && <p className="mt-2 text-caption text-muted">AI drafting is off (no ANTHROPIC_API_KEY): write each description during review.</p>}
        </div>
      </form>
      {error && <FormAlert>{error}</FormAlert>}
      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <p className="text-small">
              {results.length} results · {selected.length} selected
              {Object.keys(progress).length > 0 && ` · imported ${counts.imported ?? 0}, duplicates ${counts.duplicate ?? 0}, closed ${counts.closed ?? 0}, failed ${counts.failed ?? 0}`}
            </p>
            <Button size="sm" disabled={running || selected.length === 0} onClick={runImport}>
              {running ? 'Importing…' : `Import ${selected.length} selected`}
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {results.map((r) => {
              const p = progress[r.google_place_id]
              return (
                <li key={r.google_place_id} className="flex items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    className="mt-1 size-5 accent-green"
                    disabled={running || r.already_imported || Boolean(p && p.state !== 'working' && p.state !== 'failed')}
                    checked={selected.includes(r.google_place_id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, r.google_place_id] : selected.filter((x) => x !== r.google_place_id))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.name} {r.already_imported && <Badge tone="neutral">already imported</Badge>}
                    </p>
                    <p className="text-caption text-muted">{r.address}</p>
                  </div>
                  {p && (
                    <span className="flex shrink-0 items-center gap-1 text-caption">
                      {p.state === 'working' && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                      {p.state === 'imported' && <CircleCheck className="size-4 text-green" aria-hidden />}
                      {(p.state === 'failed' || p.state === 'closed') && <CircleAlert className="size-4 text-error" aria-hidden />}
                      {p.state === 'working' ? 'Importing' : p.state === 'duplicate' ? 'Already on HagerLand' : p.state === 'closed' ? 'Permanently closed' : p.state === 'failed' ? `Failed${p.note ? `: ${p.note}` : ''}` : 'Imported'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
