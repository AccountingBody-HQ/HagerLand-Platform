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

const SECTIONS = [
  { value: 'companies', label: 'Businesses', adminPath: '/roodber8/businesses/' },
  { value: 'jobs',      label: 'Jobs',       adminPath: '/roodber8/jobs/' },
  { value: 'housing',   label: 'Housing',    adminPath: '/roodber8/housing/' },
  { value: 'money',     label: 'Money',      adminPath: '/roodber8/money/' },
  { value: 'cars',      label: 'Cars',       adminPath: '/roodber8/cars/' },
  { value: 'tutors',    label: 'Tutors',     adminPath: '/roodber8/tutors/' },
  { value: 'community', label: 'Community',  adminPath: '/roodber8/community/' },
  { value: 'events',    label: 'Events',     adminPath: '/roodber8/events/' },
]

interface PlaceResult {
  google_place_id: string
  name: string
  address: string
  city: string
  country: string
  types: string[]
  already_imported?: boolean
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
  const [section, setSection] = useState('companies')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<PlaceResult | null>(null)
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ name: string; status: string }[]>([])
  const [imported, setImported] = useState<ImportedResult | null>(null)

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    setSelected(null)
    setImported(null)
    try {
      const res = await fetch('/api/admin/places-search?query=' + encodeURIComponent(query) + '&section=' + section)
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


  async function handleSelect(place: PlaceResult) {
    setSelected(place)
    setPhone('')
    setWebsite('')
    setImported(null)
    setImportError('')
    try {
      const res = await fetch('/api/admin/place-details?place_id=' + place.google_place_id)
      const data = await res.json()
      if (!data.error) {
        if (data.city) place.city = data.city
        if (data.country) place.country = data.country
        if (data.phone) setPhone(data.phone)
        if (data.website) setWebsite(data.website)
        setSelected({ ...place })
      }
    } catch {
      // fallback to regex-extracted city already in place.city
    }
  }

  function toggleBulk(id: string) {
    setBulkSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function handleBulkImport() {
    const chosen = results.filter(r => bulkSelected.has(r.google_place_id) && !r.already_imported)
    if (chosen.length === 0 || bulkRunning) return
    setBulkRunning(true)
    setSelected(null)
    setBulkProgress(chosen.map(c => ({ name: c.name, status: 'waiting' })))
    const succeeded = new Set<string>()
    for (let i = 0; i < chosen.length; i++) {
      const place = chosen[i]
      setBulkProgress(prev => prev.map((p, idx) => (idx === i ? { ...p, status: 'importing' } : p)))
      let status = 'failed'
      try {
        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section,
            name: place.name,
            address: place.address,
            city: place.city,
            country: place.country,
            phone: null,
            website: null,
            google_place_id: place.google_place_id,
            types: place.types,
          }),
        })
        const data = await res.json()
        if (data.error === 'already_imported') { status = 'duplicate'; succeeded.add(place.google_place_id) }
        else if (data.error) { status = 'failed' }
        else { status = 'imported'; succeeded.add(place.google_place_id) }
      } catch {
        status = 'failed'
      }
      setBulkProgress(prev => prev.map((p, idx) => (idx === i ? { ...p, status } : p)))
    }
    setResults(prev => prev.map(r => (succeeded.has(r.google_place_id) ? { ...r, already_imported: true } : r)))
    setBulkSelected(new Set())
    setBulkRunning(false)
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
          section,
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
      if (data.error === 'already_imported') {
        const when = data.imported_at ? new Date(data.imported_at).toLocaleDateString('en-GB') : ''
        setImportError(
          "This place is already on HagerLand as '" + (data.listing_name || selected.name) + "'" +
          (when ? ', imported on ' + when : '') + '. No duplicate was created.'
        )
        return
      }
      if (data.error) { setImportError(data.error); return }
      setImported(data)
    } catch {
      setImportError('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const selectedSection = SECTIONS.find(s => s.value === section) || SECTIONS[0]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '2rem' }}>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Admin · Import Tool
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Google Places Import
          </h1>
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>
            Search Google Places, preview AI-enhanced data, and import listings directly into HagerLand.
          </p>
        </div>
        <a href="/roodber8/import/history" style={{ flexShrink: 0, color: C.muted, fontSize: '0.85rem', border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.5rem 1rem', textDecoration: 'none' }}>
          View history
        </a>
      </div>

      {/* Step 1 — Choose section */}
      <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: C.muted, fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Step 1 — Which section does this listing belong to?
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {SECTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => { setSection(s.value); setSelected(null); setImported(null); setResults([]); }}
              style={{
                background: section === s.value ? C.green : C.bg,
                border: '1px solid ' + (section === s.value ? C.green : C.border),
                borderRadius: '8px',
                padding: '0.6rem 0.5rem',
                color: section === s.value ? '#fff' : C.muted,
                fontWeight: section === s.value ? 700 : 400,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — Search */}
      <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: C.muted, fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Step 2 — Search Google Places
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
            {results.length} result{results.length !== 1 ? 's' : ''} — Click to select
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {results.map(place => (
              <div key={place.google_place_id} style={{ display: 'flex', alignItems: 'stretch', gap: '0.6rem' }}>
                {!place.already_imported && (
                  <label style={{ display: 'flex', alignItems: 'center', cursor: bulkRunning ? 'default' : 'pointer', paddingLeft: '0.25rem' }}>
                    <input
                      type="checkbox"
                      checked={bulkSelected.has(place.google_place_id)}
                      onChange={() => toggleBulk(place.google_place_id)}
                      disabled={bulkRunning}
                      style={{ width: '16px', height: '16px', accentColor: C.green, cursor: 'inherit' }}
                    />
                  </label>
                )}
                <button
                  onClick={() => { if (!place.already_imported) handleSelect(place) }}
                  disabled={place.already_imported || bulkRunning}
                  style={{
                    flex: 1, minWidth: 0,
                    background: selected?.google_place_id === place.google_place_id ? 'rgba(28,124,76,0.15)' : C.bg,
                    border: '1px solid ' + (selected?.google_place_id === place.google_place_id ? C.green : C.border),
                    borderRadius: '8px', padding: '0.875rem 1rem', textAlign: 'left',
                    cursor: place.already_imported || bulkRunning ? 'default' : 'pointer',
                    opacity: place.already_imported ? 0.55 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: C.text, fontWeight: 600, marginBottom: '0.25rem' }}>{place.name}</p>
                      <p style={{ color: C.muted, fontSize: '0.82rem' }}>{place.address}</p>
                    </div>
                    {place.already_imported && (
                      <span style={{
                        flexShrink: 0, background: C.goldSoft, color: C.gold,
                        fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem',
                        borderRadius: '999px', whiteSpace: 'nowrap'
                      }}>
                        ✓ Imported
                      </span>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>

          {bulkSelected.size > 0 && !bulkRunning && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={handleBulkImport}
                style={{ background: C.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Import {bulkSelected.size} selected into {selectedSection.label}
              </button>
              <button
                onClick={() => setBulkSelected(new Set())}
                style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.65rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Clear selection
              </button>
            </div>
          )}

          {bulkProgress.length > 0 && (
            <div style={{ marginTop: '1rem', background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '1rem' }}>
              <p style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                Bulk import {bulkRunning ? 'in progress…' : 'complete'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {bulkProgress.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <span style={{ color: C.text, fontSize: '0.85rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{
                      flexShrink: 0, fontSize: '0.78rem', fontWeight: 600,
                      color: p.status === 'imported' ? C.green : p.status === 'failed' ? C.danger : p.status === 'duplicate' ? C.gold : C.muted
                    }}>
                      {p.status === 'waiting' ? 'Waiting' : p.status === 'importing' ? 'Importing…' : p.status === 'imported' ? '✓ Imported' : p.status === 'duplicate' ? 'Already imported' : '✗ Failed'}
                    </span>
                  </div>
                ))}
              </div>
              {!bulkRunning && (
                <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: '0.75rem', marginBottom: 0 }}>
                  All imported listings are now in the review queue as pending.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {selected && !imported && (
        <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ color: C.muted, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            Step 3 — Confirm & Import into {selectedSection.label}
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
          <div style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
            <p style={{ color: C.muted, fontSize: '0.82rem', margin: 0 }}>
              Importing into: <strong style={{ color: C.text }}>{selectedSection.label}</strong> · Claude will write the description and assign the category automatically.
            </p>
          </div>
          {importError && <p style={{ color: C.danger, fontSize: '0.85rem', marginBottom: '1rem' }}>{importError}</p>}
          <button
            onClick={handleImport}
            disabled={importing}
            style={{ background: C.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '0.95rem', cursor: importing ? 'wait' : 'pointer' }}
          >
            {importing ? 'Importing & enhancing with AI...' : `Import into ${selectedSection.label}`}
          </button>
        </div>
      )}

      {imported && (
        <div style={{ background: 'rgba(28,124,76,0.1)', border: '1px solid ' + C.green, borderRadius: '12px', padding: '1.5rem' }}>
          <p style={{ color: C.green, fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>✓ Imported successfully into {selectedSection.label}</p>
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
              onClick={() => router.push(selectedSection.adminPath + imported.id)}
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
