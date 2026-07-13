import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { addBusiness } from './actions'
import { login, logout } from './login-actions'

const COLORS = {
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#111827',
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: 12,
  color: COLORS.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  marginTop: 6,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: COLORS.muted,
  marginBottom: 4,
}

export default function AddBusinessPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const sessionToken = cookies().get(SESSION_COOKIE)?.value
  const isAuthenticated = verifySessionToken(sessionToken)

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ backgroundColor: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 48, width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>HagerLand</div>
            <div style={{ fontSize: 14, color: COLORS.muted }}>Admin Console</div>
          </div>
          <form action={login}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Username</label>
              <input name="username" required style={inputStyle} autoComplete="username" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Password</label>
              <input name="password" type="password" required style={inputStyle} autoComplete="current-password" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Verification Code</label>
              <input
                name="code"
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center' }}
              />
            </div>
            {searchParams.error && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: COLORS.danger }}>
                Invalid username, password, or verification code.
              </div>
            )}
            <button
              type="submit"
              style={{ width: '100%', backgroundColor: COLORS.green, color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Access Admin Console
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, fontFamily: 'system-ui, sans-serif', padding: '48px 24px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: COLORS.faint, marginBottom: 2 }}>HagerLand Admin</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>Add a Business</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
              <a
              href="/roodber8/review"
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 16px', color: COLORS.muted, fontSize: 13, textDecoration: 'none' }}
            >
              Review Queue
            </a>
            <form action={logout}>
              <button
                type="submit"
                style={{ background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 16px', color: COLORS.muted, fontSize: 13, cursor: 'pointer' }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div style={{ backgroundColor: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32 }}>
          {searchParams.success && (
            <div style={{ backgroundColor: COLORS.greenSoft, border: `1px solid ${COLORS.green}`, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: COLORS.green, fontWeight: 600 }}>
              Business added successfully!
            </div>
          )}
          <form action={addBusiness}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Business Name *</label>
              <input name="company_name" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>City</label>
              <input name="trading_address_city" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Phone</label>
              <input name="phone" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Website</label>
              <input name="website" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Category / Industry</label>
              <input name="sic_description" placeholder="e.g. Ethiopian Restaurant" style={inputStyle} />
            </div>
            <button
              type="submit"
              style={{ width: '100%', backgroundColor: COLORS.green, color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Save Business
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
