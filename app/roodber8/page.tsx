import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { addBusiness } from './actions'
import { login, logout } from './login-actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a',
  panel: '#0d1424',
  border: '#1a2238',
  text: '#ffffff',
  muted: '#94a3b8',
  faint: '#475569',
  green: '#1C7C4C',
  greenSoft: 'rgba(28,124,76,0.12)',
  gold: '#B8862E',
  danger: '#ef4444',
}

const inp: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#111827',
  border: '1px solid #1a2238',
  borderRadius: 8,
  padding: 12,
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  marginTop: 6,
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#94a3b8',
  marginBottom: 4,
}

const SECTIONS = [
  { table: 'companies', label: 'Business' },
  { table: 'jobs', label: 'Jobs' },
  { table: 'housing', label: 'Housing' },
  { table: 'cars', label: 'Cars' },
  { table: 'tutors', label: 'Tutors' },
  { table: 'community', label: 'Community' },
  { table: 'events', label: 'Events' },
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
        <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>HagerLand</div>
            <div style={{ fontSize: 14, color: C.muted }}>Admin Console</div>
          </div>
          <form action={login}>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Username</label>
              <input name="username" required style={inp} autoComplete="username" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Password</label>
              <input name="password" type="password" required style={inp} autoComplete="current-password" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Verification code</label>
              <input name="code" required maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                style={{ ...inp, letterSpacing: '0.3em', textAlign: 'center' }} />
            </div>
            {searchParams.error && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.danger, fontSize: 13 }}>
                Invalid username, password, or verification code.
              </div>
            )}
            <button type="submit"
              style={{ width: '100%', backgroundColor: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Access Admin Console
            </button>
          </form>
        </div>
      </div>
    )
  }

  const [pendingResults, activeResults] = await Promise.all([
    Promise.all(SECTIONS.map((s) =>
      supabaseAdmin.from(s.table).select('id', { count: 'exact', head: true }).eq('status', 'pending')
    )),
    Promise.all(SECTIONS.map((s) =>
      supabaseAdmin.from(s.table).select('id', { count: 'exact', head: true }).eq('status', 'active')
    )),
  ])

  const stats = SECTIONS.map((s, i) => ({
    label: s.label,
    pending: pendingResults[i].count ?? 0,
    active: activeResults[i].count ?? 0,
  }))

  const totalPending = stats.reduce((sum, s) => sum + s.pending, 0)
  const totalActive = stats.reduce((sum, s) => sum + s.active, 0)

  const { data: recentSubmissions } = await supabaseAdmin
    .from('companies')
    .select('id, company_name, trading_address_city, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: 'system-ui,sans-serif', color: C.text, padding: '24px 16px' }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: C.faint, marginBottom: 4 }}>HagerLand</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Admin Console</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/roodber8/review"
              style={{ border: `1px solid ${totalPending > 0 ? C.gold : C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, color: totalPending > 0 ? C.gold : C.muted, textDecoration: 'none', fontWeight: 600 }}>
              Review Queue{totalPending > 0 ? ` (${totalPending})` : ''}
            </Link>
            <form action={logout}>
              <button type="submit"
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, color: C.muted, cursor: 'pointer' }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { value: totalActive, label: 'Active listings' },
            { value: totalPending, label: 'Pending review', highlight: totalPending > 0 },
            { value: totalActive + totalPending, label: 'Total submissions' },
          ].map((card) => (
            <div key={card.label}
              style={{ backgroundColor: C.panel, border: `1px solid ${card.highlight ? C.gold : C.border}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.highlight ? C.gold : C.text }}>{card.value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{card.label}</div>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.muted }}>
            Breakdown by section
          </div>
          {stats.map((s, i) => (
            <div key={s.label}
              style={{ padding: '12px 20px', borderBottom: i < stats.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.text }}>{s.label}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{s.active} active</span>
                {s.pending > 0 && <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{s.pending} pending</span>}
              </div>
            </div>
          ))}
        </div>
        {recentSubmissions && recentSubmissions.length > 0 && (
          <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 24 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.muted }}>
              Recent business submissions
            </div>
            {recentSubmissions.map((b, i) => (
              <div key={b.id}
                style={{ padding: '12px 20px', borderBottom: i < recentSubmissions.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{b.company_name}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{b.trading_address_city}</p>
                </div>
                <span style={{ fontSize: 11, color: b.status === 'active' ? C.green : C.gold, fontWeight: 600, textTransform: 'uppercase' }}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 20px' }}>Add a business</h2>
          {searchParams.success && (
            <div style={{ backgroundColor: C.greenSoft, border: `1px solid rgba(28,124,76,0.3)`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.green, fontSize: 13 }}>
              Business added successfully.
            </div>
          )}
          <form action={addBusiness}>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Business name</label><input name="company_name" required style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>City</label><input name="trading_address_city" style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Phone</label><input name="phone" style={inp} /></div>
            <div style={{ marginBottom: 16 }}><label style={lbl}>Website</label><input name="website" style={inp} /></div>
            <div style={{ marginBottom: 24 }}><label style={lbl}>Category / industry</label><input name="sic_description" style={inp} /></div>
            <button type="submit"
              style={{ width: '100%', backgroundColor: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Save Business
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
