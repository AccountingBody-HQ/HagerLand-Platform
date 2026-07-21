'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#080d1a',
  panel: '#0d1424',
  border: '#1a2238',
  text: '#ffffff',
  muted: '#94a3b8',
  faint: '#475569',
  green: '#1C7C4C',
  gold: '#B8862E',
  goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444',
  blue: '#3b82f6',
  blueSoft: 'rgba(59,130,246,0.12)',
}

interface PlaceResult {
  google_place_id: string
  name: string
  address: string
  city: string
  country: string
  types: string[]
}

interface ImportedResult {
  id: string
  ai_description: string
  sic_description: string
  community_relevant: boolean
}

export default function ImportPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<PlaceResult | null>(null)
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [imported, setImported] = useState<ImportedResult | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    setSelected(null)
    setImported(null)
    try {
      const res = await fetch('/api/admin/places-search?query=' + encodeURIComponent(query))
      const data = await res.json()
      if (data.error) { setSearchError(data.error); return }
      setResults(data.results || [])
      if ((data.results || []).length === 0) setSearchError('No results found. Try a different search term.')
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function handleImport() {
    if (!selected) return
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selected.name,
          address: selected.address,
          city: selected.city,
          country: selected.country,
          phone: phone || null,
          website: website || null,
          google_place_id: selected.google_place_id,
          types: selected.types,
        }),
      })
      const data = await res.json()
      if (data.error) { setImportError(data.error); return }
      setImported(data)
    } catch {
      setImportError('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '2rem' }}>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Admin · Import Tool
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Google Places Import
        </h1>
        <p style={{ color: C.muted, fontSize: '0.9rem' }}>
          Search Google Places, preview AI-enhanced data, and import businesses directly into HagerLand.
        </p>
      </div>

      <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: C.muted, fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Search Google Places
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Ethiopian restaurant London"
            style={{ flex: 1, background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.75rem 1rem', color: C.text, fontSize: '0.95rem', outline: 'none' }}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            style={{ background: C.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: searching ? 'wait' : 'pointer', opacity: (!query.trim()) ? 0.5 : 1 }}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchError && <p style={{ color: C.danger, fontSize: '0.85rem', marginTop: '0.75rem' }}>{searchError}</p>}
      </div>

      {results.length > 0 && !imported && (
        <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ color: C.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            {results.length} Results — Click to select
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {results.map(place => (
              <button
                key={place.google_place_id}
                onClick={() => { setSelected(place); setPhone(''); setWebsite(''); setImported(null); setImportError('') }}
                style={{
                  background: selected?.google_place_id === place.google_place_id ? 'rgba(28,124,76,0.15)' : C.bg,
                  border: '1px solid ' + (selected?.google_place_id === place.google_place_id ? C.green : C.border),
                  borderRadius: '8px', padding: '0.875rem 1rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <p style={{ color: C.text, fontWeight: 600, marginBottom: '0.25rem' }}>{place.name}</p>
                <p style={{ color: C.muted, fontSize: '0.82rem' }}>{place.address}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && !imported && (
        <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ color: C.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            Selected — Add Optional Details
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: C.text, fontWeight: 700, fontSize: '1.1rem' }}>{selected.name}</p>
            <p style={{ color: C.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>{selected.address}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phone (optional)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+44..."
                style={{ width: '100%', background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.65rem 0.875rem', color: C.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Website (optional)</label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://..."
                style={{ width: '100%', background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.65rem 0.875rem', color: C.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <p style={{ color: C.muted, fontSize: '0.82rem', marginBottom: '1.25rem' }}>
            Claude will write the business description and assign the correct HagerLand category automatically.
          </p>
          {importError && <p style={{ color: C.danger, fontSize: '0.85rem', marginBottom: '1rem' }}>{importError}</p>}
          <button
            onClick={handleImport}
            disabled={importing}
            style={{ background: C.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '0.95rem', cursor: importing ? 'wait' : 'pointer' }}
          >
            {importing ? 'Importing & enhancing with AI...' : 'Import Business'}
          </button>
        </div>
      )}

      {imported && (
        <div style={{ background: 'rgba(28,124,76,0.1)', border: '1px solid ' + C.green, borderRadius: '12px', padding: '1.5rem' }}>
          <p style={{ color: C.green, fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>✓ Business imported successfully</p>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Category assigned</p>
              <p style={{ color: C.text }}>{imported.sic_description}</p>
            </div>
            <div>
              <p style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>AI-generated description</p>
              <p style={{ color: C.text, lineHeight: 1.6 }}>{imported.ai_description}</p>
            </div>
            <div>
              <p style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Community relevant</p>
              <p style={{ color: imported.community_relevant ? C.green : C.muted }}>{imported.community_relevant ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => router.push('/roodber8/businesses/' + imported.id)}
              style={{ background: C.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Review in admin
            </button>
            <button
              onClick={() => { setSelected(null); setImported(null); setResults([]); setQuery('') }}
              style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Import another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
