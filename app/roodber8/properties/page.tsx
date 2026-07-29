export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { approveProperty, rejectProperty } from '@/app/roodber8/review/actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444',
}

const PAGE_SIZE = 50

const STATUS_FILTERS: [string, string][] = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['active', 'Active'],
  ['rejected', 'Rejected'],
]

// Properties are ranked pending-first, then active, then rejected — a plain
// created_at ordering can't express that, so each status bucket is counted
// and fetched separately, and the 50-per-page window is sliced across them.
const BUCKET_ORDER = ['pending', 'active', 'rejected'] as const

type PropertyRow = {
  id: string
  company_name?: string | null
  city?: string | null
  country?: string | null
  quality_score?: number | string | null
  agent_confidence?: string | null
  google_rating?: number | string | null
  source?: string | null
  agent_last_run?: string | null
  status: string
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

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminPropertiesPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const statusFilter = searchParams.status ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const globalFrom = (page - 1) * PAGE_SIZE
  const globalTo = globalFrom + PAGE_SIZE - 1

  const buckets = statusFilter ? [statusFilter] : [...BUCKET_ORDER]

  const bucketCounts = await Promise.all(
    buckets.map(async (status) => {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
      return count ?? 0
    })
  )

  const totalCount = bucketCounts.reduce((a, b) => a + b, 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const rows: PropertyRow[] = []
  let cursor = 0
  for (let i = 0; i < buckets.length; i++) {
    const bucketCount = bucketCounts[i]
    if (bucketCount === 0) continue
    const bucketStart = cursor
    const bucketEnd = cursor + bucketCount - 1
    cursor += bucketCount

    const from = Math.max(globalFrom, bucketStart)
    const to = Math.min(globalTo, bucketEnd)
    if (from > to) continue

    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('status', buckets[i])
      .order('created_at', { ascending: false })
      .range(from - bucketStart, to - bucketStart)
    rows.push(...(data ?? []))
  }

  const pendingOnPage = rows.filter(r => r.status === 'pending').length
  const activeOnPage = rows.filter(r => r.status === 'active').length
  const rejectedOnPage = rows.filter(r => r.status === 'rejected').length

  const qs = (p: number) => {
    const parts = ['page=' + p]
    if (statusFilter) parts.push('status=' + statusFilter)
    return parts.join('&')
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left', color: C.faint, fontWeight: 700, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 14px',
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle',
  }

  return (
    <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href='/roodber8' style={{ color: C.faint, fontSize: 12, textDecoration: 'none' }}>← Command Centre</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '8px 0 4px' }}>Properties</h1>
        <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>
          {totalCount} total · {pendingOnPage} pending · {activeOnPage} active · {rejectedOnPage} rejected on this page — page {page} of {totalPages}
        </p>
        <p style={{ fontSize: 11, color: C.faint, margin: '4px 0 0' }}>Property agency listings submitted by the discovery agent</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(([val, label]) => (
          <a
            key={label}
            href={'/roodber8/properties?page=1' + (val ? '&status=' + val : '')}
            style={{
              fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, textDecoration: 'none',
              color: statusFilter === val ? '#fff' : C.muted,
              background: statusFilter === val ? C.green : 'transparent',
              border: '1px solid ' + (statusFilter === val ? C.green : C.border),
            }}
          >
            {label}
          </a>
        ))}
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No property agencies match this filter.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Quality Score</th>
                  <th style={thStyle}>Agent Confidence</th>
                  <th style={thStyle}>Google Rating</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Agent Last Run</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const pill = statusPillStyle(item.status)
                  const conf = confidenceStyle(item.agent_confidence)
                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        <a href={`/roodber8/properties/${item.id}`} style={{ color: C.text, fontWeight: 600, textDecoration: 'none' }}>
                          {item.company_name ?? '—'}
                        </a>
                      </td>
                      <td style={{ ...tdStyle, color: C.muted }}>{[item.city, item.country].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ ...tdStyle, color: C.muted }}>{item.quality_score ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, ...conf }}>
                          {item.agent_confidence ?? 'unknown'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: C.muted }}>{item.google_rating ?? '—'}</td>
                      <td style={{ ...tdStyle, color: C.muted }}>{item.source ?? '—'}</td>
                      <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>{formatDate(item.agent_last_run)}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, ...pill }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <a href={`/roodber8/properties/${item.id}`} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>View</a>
                          {item.status !== 'active' && (
                            <form action={approveProperty.bind(null, item.id)}>
                              <button type='submit' style={{ background: 'rgba(28,124,76,0.12)', color: C.green, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                            </form>
                          )}
                          {item.status !== 'rejected' && (
                            <form action={rejectProperty.bind(null, item.id)}>
                              <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          {page > 1 && (
            <a href={'/roodber8/properties?' + qs(page - 1)} style={{ background: C.panel, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>← Previous</a>
          )}
          <span style={{ fontSize: 13, color: C.faint }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={'/roodber8/properties?' + qs(page + 1)} style={{ background: C.panel, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>Next →</a>
          )}
        </div>
      )}
    </div>
  )
}
