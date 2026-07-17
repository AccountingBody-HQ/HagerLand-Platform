'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  { href: '/roodber8',        exact: true,  label: 'Command Centre', sub: 'Overview & live stats',      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/roodber8/review', exact: false, label: 'Review Queue',   sub: 'Approve & reject listings', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { href: '/roodber8/businesses', exact: false, label: 'Businesses', sub: 'All business listings',     icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { href: '/roodber8/jobs',       exact: false, label: 'Jobs',       sub: 'Job listings',              icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { href: '/roodber8/housing',    exact: false, label: 'Housing',    sub: 'Housing listings',          icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { href: '/roodber8/money',      exact: false, label: 'Money',      sub: 'Financial services',        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/roodber8/cars',       exact: false, label: 'Cars',       sub: 'Car listings',              icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5 1M13 6l7 4v6h-2' },
  { href: '/roodber8/tutors',     exact: false, label: 'Tutors',     sub: 'Tutor listings',            icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { href: '/roodber8/community',  exact: false, label: 'Community',  sub: 'Community organisations',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/roodber8/events',     exact: false, label: 'Events',     sub: 'Event listings',            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/roodber8/claims',     exact: false, label: 'Claims',     sub: 'Business claim requests',   icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
]

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/roodber8-logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/roodber8'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080d1a', fontFamily: 'system-ui,sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#0d1424', borderRight: '1px solid #1a2238', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>

        {/* Brand */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1a2238' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1C7C4C,#155c38)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/><circle cx='12' cy='9' r='2.5'/></svg>
            </div>
            <div>
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: 14, margin: 0 }}>HagerLand</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                <p style={{ color: '#34d399', fontSize: 11, fontWeight: 600, margin: 0 }}>Admin Console</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = isActive(pathname, item.href, item.exact)
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10,
                  background: active ? 'rgba(28,124,76,0.12)' : 'transparent',
                  borderLeft: active ? '2px solid #1C7C4C' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: active ? '#1C7C4C' : 'rgba(255,255,255,0.04)' }}>
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={active ? '#fff' : '#475569'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d={item.icon}/></svg>
                </div>
                <div>
                  <p style={{ color: active ? '#ffffff' : '#64748b', fontSize: 13, fontWeight: 600, margin: 0 }}>{item.label}</p>
                  <p style={{ color: active ? 'rgba(255,255,255,0.4)' : '#334155', fontSize: 11, margin: 0 }}>{item.sub}</p>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #1a2238', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a href='/' target='_blank' rel='noopener noreferrer'
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
              <span style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>View Live Site</span>
            </div>
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#1e293b' strokeWidth='2'><path d='M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3'/></svg>
          </a>
          <button onClick={handleLogout} disabled={loggingOut}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%' }}>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2'><path d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'/></svg>
            <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{loggingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', background: '#0d1424', borderBottom: '1px solid #1a2238', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: '#334155', fontWeight: 600 }}>HagerLand Admin</span>
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#1e293b' strokeWidth='2'><path d='M9 18l6-6-6-6'/></svg>
            <span style={{ color: '#64748b', fontWeight: 600 }}>
              {NAV.find(n => isActive(pathname, n.href, n.exact))?.label ?? 'Admin'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>Live</span>
          </div>
        </header>
        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}