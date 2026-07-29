export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { approveProperty, rejectProperty, deleteProperty } from '@/app/roodber8/review/actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444', blue: '#3b82f6',
}

function statusPillStyle(status: string) {
  if (status === 'active') return { color: C.green, background: 'rgba(28,124,76,0.12)' }
  if (status === 'pending') return { color: C.gold, background: C.goldSoft }
  return { color: C.danger, background: 'rgba(239,68,68,0.12)' }
}

function confidenceStyle(level: string | null | undefined) {
  if (level === 'high') return { background: C.green, color: '#ffffff' }
  if (level === 'medium') return { background: C.goldSoft, color: C.gold }
  if (level === 'low') return { background: 'rgba(239,68,68,0.15)', color: C.danger }
  return { background: 'rgba(255,255,255,0.04)', color: C.faint }
}

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' && (key.endsWith('_at') || key.endsWith('_run'))) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const HIDDEN_IN_GRID = new Set(['id', 'company_name', 'status', 'agent_notes'])

export default async function AdminPropertyDetailPage({ params }: { params: { id: string } }) {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: p, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !p) notFound()

  const { data: listingsRaw } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_id', params.id)
    .order('created_at', { ascending: false })
  const listings: Record<string, unknown>[] = listingsRaw ?? []
  const listingColumns = listings.length > 0 ? Object.keys(listings[0]).filter((k) => k !== 'property_id') : []

  const pill = statusPillStyle(p.status)
  const conf = confidenceStyle(p.agent_confidence)
  const fieldEntries = Object.entries(p).filter(([key]) => !HIDDEN_IN_GRID.has(key))

  const thStyle: React.CSSProperties = {
    textAlign: 'left', color: C.faint, fontWeight: 700, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 14px',
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`,
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <Link href='/roodber8/properties' style={{ color: C.faint, fontSize: 13, textDecoration: 'none' }}>← All Properties</Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>{p.company_name ?? 'Unnamed agency'}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, ...pill }}>{p.status}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, ...conf }}>
              {p.agent_confidence ?? 'unknown'} confidence
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {p.status !== 'active' && (
            <form action={approveProperty.bind(null, p.id)}>
              <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
            </form>
          )}
          {p.status !== 'rejected' && (
            <form action={rejectProperty.bind(null, p.id)}>
              <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✕ Reject</button>
            </form>
          )}
          <form action={deleteProperty.bind(null, p.id)}>
            <button type='submit' style={{ background: 'rgba(239,68,68,0.1)', color: C.danger, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </form>
          {p.google_maps_url && (
            <a href={p.google_maps_url} target='_blank' rel='noopener noreferrer'
              style={{ background: `${C.blue}15`, color: C.blue, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              View on Google Maps ↗
            </a>
          )}
        </div>
      </div>

      {/* Agent notes — prominent */}
      {p.agent_notes && (
        <div style={{ background: C.goldSoft, border: '1px solid rgba(184,138,46,0.3)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Discovery Agent Notes</h2>
          <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.agent_notes}</p>
        </div>
      )}

      {/* All fields */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Property Agency Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {fieldEntries.map(([key, value]) => (
            <div key={key} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{formatLabel(key)}</p>
              <p style={{ fontSize: 13, color: C.text, margin: 0, wordBreak: 'break-word' }}>{formatValue(key, value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Property listings */}
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
          Property Listings {listings.length > 0 ? `(${listings.length})` : ''}
        </h2>
        {listings.length === 0 ? (
          <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>No property listings found for this agency yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {listingColumns.map((col) => (
                    <th key={col} style={thStyle}>{formatLabel(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.map((row, i) => (
                  <tr key={String(row.id ?? i)}>
                    {listingColumns.map((col) => (
                      <td key={col} style={tdStyle}>{formatValue(col, row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
