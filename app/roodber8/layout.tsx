import { headers } from 'next/headers'
import { AdminSidebar } from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers()
  const pathname = headersList.get('x-invoke-path') ?? '/roodber8'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080d1a', fontFamily: 'system-ui,sans-serif' }}>
      <AdminSidebar pathname={pathname} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', background: '#0d1424', borderBottom: '1px solid #1a2238', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>Live</span>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}