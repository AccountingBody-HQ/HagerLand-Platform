export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { login } from '@/app/roodber8/login-actions'

const inp: React.CSSProperties = {
  width: '100%', backgroundColor: '#111827', border: '1px solid #1a2238',
  borderRadius: 8, padding: 12, color: '#ffffff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginTop: 6,
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4,
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const token = cookies().get(SESSION_COOKIE)?.value
  const isAuth = verifySessionToken(token)
  if (isAuth) redirect('/roodber8')

  const isRateLimited = searchParams.error === 'rate_limited'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ backgroundColor: '#0d1424', border: '1px solid #1a2238', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1C7C4C,#155c38)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/><circle cx='12' cy='9' r='2.5'/></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>HagerLand</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Admin Console — Sign in to continue</div>
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
          {searchParams.error && !isRateLimited && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              Invalid credentials. Please try again.
            </div>
          )}
          {isRateLimited && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              Too many failed attempts. Please wait 15 minutes before trying again.
            </div>
          )}
          <button type='submit'
            style={{ width: '100%', backgroundColor: '#1C7C4C', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Access Admin Console
          </button>
        </form>
      </div>
    </div>
  )
}
