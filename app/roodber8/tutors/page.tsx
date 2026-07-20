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
  danger: '#ef4444',
}

const PAGE_SIZE = 50

export default async function AdminTutorsPage({ searchParams }: { searchParams: { page?: string } }) {
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
    .from('tutors')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const all = items ?? []
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const pending  = all.filter((i: { status: string }) => i.status === 'pending')
  const active   = all.filter((i: { status: string }) => i.status === 'active')
  const rejected = all.filter((i: { status: string }) => i.status === 'rejected')
  const unverified = all.filter((i: { status: string }) => i.status === 'pending_verification')

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href='/roodber8' style={{ color: C.faint, fontSize: 12, textDecoration: 'none' }}>← Command Centre</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '8px 0 4px' }}>Tutors</h1>
        <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>
          {count ?? 0} total · {active.length} active · {pending.length} pending · {unverified.length} unverified · {rejected.length} rejected — page {page} of {totalPages}
        </p>
      </div>

      {unverified.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6', marginBottom: 12 }}>Awaiting Email Verification ({unverified.length})</h2>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {unverified.map((item: Record<string, string>) => (
              <div key={item.id} style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={`/roodber8/tutors/${item.id}`} style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none' }}>{item.name}</a>
                  <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{item.city ?? '—'} · {item.contact_email ?? '—'} · Email not yet verified</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12 }}>Pending Review ({pending.length})</h2>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {pending.map((item: Record<string, string>) => (
              <div key={item.id} style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={`/roodber8/tutors/${item.id}`} style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none' }}>{item.name}</a>
                  <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{item.city ?? '—'} · {item.contact_email ?? '—'}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a href={`/roodber8/tutors/${item.id}`} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>View</a>
                  <form action={approveListing.bind(null, 'tutors', item.id)}>
                    <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                  </form>
                  <form action={rejectListing.bind(null, 'tutors', item.id)}>
                    <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>All Listings ({count ?? 0})</h2>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {all.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No listings yet.</div>
          ) : all.map((item: Record<string, string>) => (
            <div key={item.id} style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={`/roodber8/tutors/${item.id}`} style={{ fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none' }}>{item.name}</a>
                <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{item.city ?? '—'} · {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20,
                  color: item.status === 'active' ? '#1C7C4C' : item.status === 'pending' ? C.gold : C.danger,
                  background: item.status === 'active' ? 'rgba(28,124,76,0.12)' : item.status === 'pending' ? C.goldSoft : 'rgba(239,68,68,0.12)',
                }}>{item.status}</span>
                <a href={`/roodber8/tutors/${item.id}`} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>View</a>
                {item.status === 'active' && (
                  <form action={deactivateListing.bind(null, 'tutors', item.id)}>
                    <button type='submit' style={{ background: 'rgba(184,138,46,0.1)', color: C.gold, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Deactivate</button>
                  </form>
                )}
                {item.status === 'pending' && (
                  <form action={approveListing.bind(null, 'tutors', item.id)}>
                    <button type='submit' style={{ background: 'rgba(28,124,76,0.12)', color: C.green, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                  </form>
                )}
                <form action={deleteListing.bind(null, 'tutors', item.id)}>
                  <button type='submit' style={{ background: 'rgba(239,68,68,0.08)', color: C.danger, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          {page > 1 && (
            <a href={`/roodber8/tutors?page=${page - 1}`} style={{ background: C.panel, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>← Previous</a>
          )}
          <span style={{ fontSize: 13, color: C.faint }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/roodber8/tutors?page=${page + 1}`} style={{ background: C.panel, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>Next →</a>
          )}
        </div>
      )}
    </div>
  )
}
