import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'BirrBank® Intelligence — Coming Soon',
  description: 'Market intelligence for the Ethiopian economy — coming soon on BirrBank®.',
}

export default function IntelligencePage() {
  return (
    <main className="bg-white flex-1 flex items-center justify-center" style={{ minHeight: '70vh' }}>
      <div className="max-w-xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
          style={{ background: '#E9F5EE', color: '#1C7C4C', border: '1px solid rgba(28,124,76,0.2)' }}>
          Coming soon
        </div>
        <h1 className="font-bold text-ink mb-4" style={{ fontSize: 'clamp(30px, 4vw, 44px)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          BirrBank<span style={{ fontSize: '0.55em', position: 'relative', top: '-0.6em', marginLeft: 2, fontWeight: 400 }}>®</span> Intelligence
        </h1>
        <p className="text-muted mb-10" style={{ fontSize: '16px', lineHeight: 1.75 }}>
          Market intelligence for the Ethiopian economy — coming soon. Sign up to be notified when it launches.
        </p>
        <Link href="/birrbank/banking"
          className="inline-flex items-center gap-2 font-bold rounded-full px-6 py-3 text-sm transition-colors"
          style={{ background: '#1C7C4C', color: '#fff' }}>
          ← Back to Banking
        </Link>
      </div>
    </main>
  )
}
