export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { login } from './login-actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', greenSoft: 'rgba(28,124,76,0.12)',
  gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444',
}

const inp: React.CSSProperties = {
  width: '100%', backgroundColor: '#111827', border: '1px solid #1a2238',
  borderRadius: 8, padding: 12, color: '#ffffff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginTop: 6,
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4,
}

const SECTIONS = [
  { table: 'companies', label: 'Businesses', color: '#1C7C4C', href: '/roodber8/review' },
  { table: 'jobs',      label: 'Jobs',       color: '#3b82f6', href: '/roodber8/review' },
  { table: 'housing',   label: 'Housing',    color: '#8b5cf6', href: '/roodber8/review' },
  { table: 'money',     label: 'Money',      color: '#f59e0b', href: '/roodber8/review' },
  { table: 'cars',      label: 'Cars',       color: '#ec4899', href: '/roodber8/review' },
  { table: 'tutors',    label: 'Tutors',     color: '#14b8a6', href: '/roodber8/review' },
  { table: 'community', label: 'Community',  color: '#f97316', href: '/roodber8/review' },
  { table: 'events',    label: 'Events',     color: '#a855f7', href: '/roodber8/review' },
] as const

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const token = cookies().get(SESSION_COOKIE)?.value
  const isAuth = verifySessionToken(token)

  if (!isAuth) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1C7C4C,#155c38)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/><circle cx='12' cy='9' r='2.5'/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>HagerLand</div>
            <div style={{ fontSize: 13, color: C.muted }}>Admin Console — Sign in to continue</div>
          </div>
          <form action={login}>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Username</label>
              <input name='username' required style={inp} autoComplete='username' />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Password</label>
              <input name='password' type='password' required style={inp} autoComplete='current-password' />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Verification code</label>
              <input name='code' required maxLength={6} inputMode='numeric' autoComplete='one-time-code'
                style={{ ...inp, letterSpacing: '0.3em', textAlign: 'center' }} />
            </div>
            {searchParams.error && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.danger, fontSize: 13 }}>
                Invalid credentials. Please try again.
              </div>
            )}
            <button type='submit'
              style={{ width: '100%', backgroundColor: C.green, color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Access Admin Console
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Fetch all stats in parallel
  const [pendingResults, activeResults] = await Promise.all([
    Promise.all(SECTIONS.map(s => supabaseAdmin.from(s.table).select('id', { count: 'exact', head: true }).eq('status', 'pending'))),
    Promise.all(SECTIONS.map(s => supabaseAdmin.from(s.table).select('id', { count: 'exact', head: true }).eq('status', 'active'))),
  ])

  const sectionStats = SECTIONS.map((s, i) => ({
    ...s,
    pending: pendingResults[i].count ?? 0,
    active: activeResults[i].count ?? 0,
  }))

  const totalPending = sectionStats.reduce((sum, s) => sum + s.pending, 0)
  const totalActive  = sectionStats.reduce((sum, s) => sum + s.active, 0)
  const totalAll     = totalPending + totalActive

  // Recent submissions across all sections
  const { data: recentBusinesses } = await supabaseAdmin
    .from('companies').select('id, company_name, trading_address_city, status, created_at')
    .order('created_at', { ascending: false }).limit(4)

  const { data: recentJobs } = await supabaseAdmin
    .from('jobs').select('id, title, location, status, created_at')
    .order('created_at', { ascending: false }).limit(3)

  const { data: pendingClaims } = await supabaseAdmin
    .from('business_claims')
    .select('id, claimant_name, claimant_email, created_at, companies(company_name)')
    .eq('status', 'verified')
    .order('created_at', { ascending: false }).limit(5)

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>Command Centre</h1>
        <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>
          {totalActive} active listings · {totalPending} pending review · {totalAll} total
        </p>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Active Listings',   value: totalActive,  color: '#1C7C4C', bg: 'rgba(28,124,76,0.08)',   border: 'rgba(28,124,76,0.25)',   href: '/roodber8/review' },
          { label: 'Pending Review',    value: totalPending, color: '#B8862E', bg: 'rgba(184,138,46,0.08)', border: 'rgba(184,138,46,0.3)',  href: '/roodber8/review' },
          { label: 'Total Submissions', value: totalAll,     color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)',  href: '/roodber8/review' },
        ].map(card => (
          <Link key={card.label} href={card.href} style={{ textDecoration: 'none', borderRadius: 16, padding: '20px 24px', border: `1px solid ${card.border}`, background: card.bg, display: 'block' }}>
            <p style={{ fontSize: 36, fontWeight: 900, color: card.color, margin: '0 0 4px' }}>{card.value}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: card.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Section breakdown cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {sectionStats.map(s => (
          <Link key={s.table} href={s.href} style={{ textDecoration: 'none', borderRadius: 14, padding: '16px 18px', border: '1px solid #1a2238', background: '#0d1424', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{s.label}</p>
              {s.pending > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: C.goldSoft, padding: '2px 7px', borderRadius: 20 }}>{s.pending} pending</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.active}</p>
                <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>active</p>
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.pending > 0 ? C.gold : C.faint, margin: 0 }}>{s.pending}</p>
                <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>pending</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom grid: recent submissions + claims */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Recent business submissions */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Recent Business Submissions</h2>
            <Link href='/roodber8/review' style={{ fontSize: 11, color: C.faint, textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {(recentBusinesses ?? []).length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No submissions yet.</div>
          ) : (recentBusinesses ?? []).map((b, i, arr) => (
            <div key={b.id} style={{ padding: '13px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{b.company_name}</p>
                <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{b.trading_address_city ?? '—'}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: b.status === 'active' ? '#1C7C4C' : C.gold, background: b.status === 'active' ? 'rgba(28,124,76,0.12)' : C.goldSoft, padding: '3px 8px', borderRadius: 20 }}>{b.status}</span>
            </div>
          ))}
        </div>

        {/* Pending claims */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
              Business Claims {pendingClaims && pendingClaims.length > 0 && <span style={{ color: C.gold }}>({pendingClaims.length})</span>}
            </h2>
            <Link href='/roodber8/review' style={{ fontSize: 11, color: C.faint, textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {(pendingClaims ?? []).length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No pending claims.</div>
          ) : (pendingClaims ?? []).map((c, i, arr) => (
            <div key={c.id} style={{ padding: '13px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                  {(Array.isArray(c.companies) ? c.companies[0]?.company_name : (c.companies as { company_name: string } | null)?.company_name) ?? 'Unknown'}
                </p>
                <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{c.claimant_name} · {c.claimant_email}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, background: C.goldSoft, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>awaiting</span>
            </div>
          ))}
        </div>

        {/* Recent jobs */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Recent Job Submissions</h2>
            <Link href='/roodber8/review' style={{ fontSize: 11, color: C.faint, textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {(recentJobs ?? []).length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No job submissions yet.</div>
          ) : (recentJobs ?? []).map((j, i, arr) => (
            <div key={j.id} style={{ padding: '13px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{j.title}</p>
                <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{j.location ?? '—'}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: j.status === 'active' ? '#1C7C4C' : C.gold, background: j.status === 'active' ? 'rgba(28,124,76,0.12)' : C.goldSoft, padding: '3px 8px', borderRadius: 20 }}>{j.status}</span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Quick Actions</h2>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Review all pending listings', sub: `${totalPending} awaiting approval`, href: '/roodber8/review', color: C.gold },
              { label: 'View live business directory', sub: 'Open public site', href: '/business', color: '#1C7C4C' },
              { label: 'View live jobs board', sub: 'Open public site', href: '/jobs', color: '#3b82f6' },
              { label: 'View live events', sub: 'Open public site', href: '/events', color: '#a855f7' },
            ].map(action => (
              <Link key={action.label} href={action.href}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid #1a2238', textDecoration: 'none' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{action.label}</p>
                  <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{action.sub}</p>
                </div>
                <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={action.color} strokeWidth='2'><path d='M9 18l6-6-6-6'/></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}