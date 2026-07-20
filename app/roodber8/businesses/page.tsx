export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { approveListing, rejectListing, deleteListing, deactivateListing } from '@/app/roodber8/review/actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  blue: '#3b82f6', blueSoft: 'rgba(59,130,246,0.12)',
  danger: '#ef4444',
}

const PAGE_SIZE = 50

export default async function AdminBusinessesPage({ searchParams }: { searchParams: { page?: string } }) {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: items, count } = await supabase
    .from('companies')
    .select('id, company_name, trading_address_city, sic_description, contact_email, submitter_name, status, email_verified_at, first_seen_at, is_verified, phone, website', { count: 'exact' })
    .order('first_seen_at', { ascending: false })
    .range(from, to)

  const all = items ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const unverified = all.filter(i => i.status === 'pending_verification')
  const pending    = all.filter(i => i.status === 'pending')
  const active     = all.filter(i => i.status === 'active')
  const rejected   = all.filter(i => i.status === 'rejected')

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { color: string; bg: string; label: string }> = {
      active:               { color: '#1C7C4C', bg: 'rgba(28,124,76,0.12)',    label: 'Active' },
      pending:              { color: C.gold,    bg: C.goldSoft,                label: 'Pending' },
      pending_verification: { color: C.blue,    bg: C.blueSoft,                label: 'Unverified' },
      rejected:             { color: C.danger,  bg: 'rgba(239,68,68,0.12)',    label: 'Rejected' },
    }
    const s = map[status] ?? { color: C.faint, bg: 'transparent', label: status }
    return <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, color: s.color, background: s.bg }}>{s.label}</span>
  }

  function Row({ item, showActions }: { item: typeof all[0]; showActions: boolean }) {
    return (
      <div style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={`/roodber8/businesses/${item.id}`} style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, textDecoration: 'none' }}>{item.company_name}</a>
          <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>
            {item.trading_address_city ?? '—'} · {item.sic_description ?? '—'} · {item.contact_email ?? '—'}
          </p>
          <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>
            {item.first_seen_at ? new Date(item.first_seen_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            {item.status === 'pending_verification' && ' · Email not yet verified'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={item.status} />
          {showActions && item.status === 'pending' && (
            <>
              <form action={approveListing.bind(null, 'companies', item.id)}>
                <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              </form>
              <form action={rejectListing.bind(null, 'companies', item.id)}>
                <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
              </form>
            </>
          )}
          {item.status === 'active' && (
            <form action={deactivateListing.bind(null, 'companies', item.id)}>
              <button type='submit' style={{ background: 'rgba(184,138,46,0.1)', color: C.gold, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Deactivate</button>
            </form>
          )}
          <form action={deleteListing.bind(null, 'companies', item.id)}>
            <button type='submit' style={{ background: 'rgba(239,68,68,0.08)', color: C.danger, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href='/roodber8' style={{ color: C.faint, fontSize: 12, textDecoration: 'none' }}>← Command Centre</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '8px 0 4px' }}>Businesses</h1>
        <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>
          {count ?? 0} total · {active.length} active · {pending.length} pending · {unverified.length} unverified · {rejected.length} rejected — page {page} of {totalPages}
        </p>
      </div>

      {unverified.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.blue, marginBottom: 12 }}>Awaiting Email Verification ({unverified.length})</h2>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {unverified.map(item => <Row key={item.id} item={item} showActions={false} />)}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12 }}>Pending Review ({pending.length})</h2>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {pending.map(item => <Row key={item.id} item={item} showActions={true} />)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>All Businesses ({count ?? 0})</h2>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {all.length === 0
            ? <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No businesses yet.</div>
            : all.map(item => <Row key={item.id} item={item} showActions={true} />)
          }
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          {page > 1 && (
            <a href={`/roodber8/businesses?page=${page - 1}`} style={{ background: C.panel, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>← Previous</a>
          )}
          <span style={{ fontSize: 13, color: C.faint }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/roodber8/businesses?page=${page + 1}`} style={{ background: C.panel, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>Next →</a>
          )}
        </div>
      )}
    </div>
  )
}
