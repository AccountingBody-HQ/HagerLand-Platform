'use client'

import { useState } from 'react'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238', text: '#ffffff',
  muted: '#94a3b8', faint: '#475569', green: '#1C7C4C', gold: '#B8862E',
  goldSoft: 'rgba(184,138,46,0.12)', danger: '#ef4444', blue: '#3b82f6',
}

const SECTIONS = [
  { value: 'companies', label: 'Businesses' },
  { value: 'housing', label: 'Property' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'money', label: 'Money' },
  { value: 'cars', label: 'Cars' },
  { value: 'tutors', label: 'Tutors' },
  { value: 'community', label: 'Diaspora Network' },
  { value: 'events', label: 'Events' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'made_in_ethiopia', label: 'Made in Ethiopia' },
]

interface ImportResult {
  name: string
  status: string
  error?: string
  id?: string
}

interface RunResult {
  total_found: number
  skipped_duplicates: number
  processed: number
  results: ImportResult[]
}

export default function AutoImportPage() {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('companies')
  const [max, setMax] = useState(20)
  const [page, setPage] = useState(1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState('')

  async function handleRun() {
    if (!query.trim() || running) return
    setRunning(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/admin/auto-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), section, max, page }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch {
      setError('Pipeline failed. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  const imported = result?.results.filter(r => r.status === 'imported').length ?? 0
  const failed = result?.results.filter(r => r.status === 'failed').length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: C.muted, fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Admin · Import Tool
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Auto Import</h1>
          <p style={{ color: C.muted, fontSize: '0.9rem', maxWidth: '520px' }}>
            Search Google Places, scrape business websites, and generate AI-enhanced profiles automatically. All results land in the review queue as pending.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/roodber8/import" style={{ color: C.muted, fontSize: '0.85rem', border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.5rem 1rem', textDecoration: 'none' }}>
            Manual import
          </a>
          <a href="/roodber8/import/history" style={{ color: C.muted, fontSize: '0.85rem', border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.5rem 1rem', textDecoration: 'none' }}>
            View history
          </a>
        </div>
      </div>

      {/* Section selector */}
      <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: C.muted, fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Step 1 — Choose section
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
          {SECTIONS.map(s => (
            <button key={s.value} onClick={() => setSection(s.value)} style={{
              background: section === s.value ? C.green : C.bg,
              border: '1px solid ' + (section === s.value ? C.green : C.border),
              borderRadius: '8px', padding: '0.6rem 0.5rem',
              color: section === s.value ? '#fff' : C.muted,
              fontWeight: section === s.value ? 700 : 400,
              fontSize: '0.85rem', cursor: 'pointer',
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query + max */}
      <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: C.muted, fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Step 2 — Set search query and limit
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRun()}
            placeholder="e.g. real estate agency Addis Ababa"
            style={{ flex: 1, background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.75rem 1rem', color: C.text, fontSize: '0.95rem', outline: 'none' }}
          />
          <select
            value={max}
            onChange={e => setMax(parseInt(e.target.value))}
            style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.75rem 1rem', color: C.text, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
          >
            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} results</option>)}
          </select>
          <select
            value={page}
            onChange={e => { setPage(parseInt(e.target.value)); setResult(null); }}
            style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.75rem 1rem', color: C.text, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value={1}>Page 1 (1–20)</option>
            <option value={2}>Page 2 (21–40)</option>
            <option value={3}>Page 3 (41–60)</option>
          </select>
        </div>
        <div style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <p style={{ color: C.muted, fontSize: '0.82rem', margin: 0 }}>
            The pipeline will search Google Places, visit each business website, and use Claude AI to write professional profiles. This may take 1–3 minutes depending on the number of businesses.
          </p>
        </div>
        {error && <p style={{ color: C.danger, fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <button
          onClick={handleRun}
          disabled={running || !query.trim()}
          style={{
            background: running ? C.faint : C.green,
            color: '#fff', border: 'none', borderRadius: '8px',
            padding: '0.75rem 2rem', fontWeight: 700, fontSize: '0.95rem',
            cursor: running || !query.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Running pipeline — please wait...' : 'Run auto import'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Found</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{result.total_found}</p>
            </div>
            <div>
              <p style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Imported</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: C.green }}>{imported}</p>
            </div>
            <div>
              <p style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Duplicates skipped</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: C.gold }}>{result.skipped_duplicates}</p>
            </div>
            {failed > 0 && (
              <div>
                <p style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Failed</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: C.danger }}>{failed}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {result.results.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <span style={{ color: C.text, fontSize: '0.9rem', fontWeight: 600 }}>{r.name}</span>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '999px',
                  background: r.status === 'imported' ? 'rgba(28,124,76,0.15)' : r.status === 'failed' ? 'rgba(239,68,68,0.12)' : C.goldSoft,
                  color: r.status === 'imported' ? C.green : r.status === 'failed' ? C.danger : C.gold,
                }}>
                  {r.status === 'imported' ? '✓ Imported' : r.status === 'failed' ? '✗ Failed' : 'Skipped'}
                </span>
              </div>
            ))}
          </div>

          {imported > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href="/roodber8/review"
                style={{ background: C.green, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}
              >
                Review imported listings →
              </a>
              <button
                onClick={() => { setResult(null); setQuery('') }}
                style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Run another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
