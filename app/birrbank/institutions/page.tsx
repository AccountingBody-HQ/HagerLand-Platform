import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { Suspense } from 'react'
import InstitutionsClient from '@/components/institutions/InstitutionsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'All NBE-Regulated Institutions | BirrBank',
  description: 'Every bank, insurer, microfinance institute, payment operator, money transfer agency and FX bureau licensed by the National Bank of Ethiopia — verified, profiled and compared free.',
}

export default async function InstitutionsPage() {
  const supabase = createBirrBankAdminClient()

  const { data: institutions } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug, name, type, swift_code, website_url, coverage_level, nbe_licence_date, nbe_licence_number, branches_count, operational_status, hq_region, service_type, phone, email, is_active, description, founded_year')
    .order('name')

  const all = institutions ?? []
  const totalCount = all.length
  const activeCount = all.filter(i => i.is_active).length

  const typeCounts: Record<string, number> = {}
  for (const inst of all) {
    typeCounts[inst.type] = (typeCounts[inst.type] ?? 0) + 1
  }

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background: '#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">Institutions</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#93c5fd', border: '1px solid rgba(29,78,216,0.3)' }}>
            NBE-Regulated Registry
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
            Ethiopia&apos;s complete<br />financial institution registry.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '560px' }}>
            Every bank, insurer, microfinance institute, payment operator, money transfer agency and FX bureau licensed by the National Bank of Ethiopia. Verified, profiled and compared free.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/savings-rates"
              className="hero-btn hero-btn-primary">
              Compare savings rates
            </Link>
            <Link href="/birrbank/banking/fx-rates"
              className="hero-btn hero-btn-secondary">
              View FX rates
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value: String(totalCount), label: 'NBE-licensed institutions' },
              { value: String(activeCount), label: 'Active institutions' },
              { value: String(Object.keys(typeCounts).length), label: 'Institution categories' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1"
                  style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE SECTION */}
      <section id="registry" style={{ padding: '64px 0 96px', background: '#ffffff', scrollMarginTop: '64px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>NBE registry</p>
          <h2 className="font-serif font-bold text-slate-950 mb-8"
            style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
            Browse and filter all licensed institutions.
          </h2>
          <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">Loading...</div>}>
            <InstitutionsClient institutions={all} />
          </Suspense>
        </div>
      </section>

      {/* DARK TRUST */}
      <section style={{ background: '#0f172a', padding: '72px 0', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#93c5fd' }}>Source integrity</p>
            <h3 className="font-serif font-bold mb-2"
              style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Every institution verified against the NBE registry.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.75, maxWidth: 520 }}>
              If it is not licensed by the National Bank of Ethiopia, it does not appear on BirrBank. No grey-market operators. No unverified listings.
            </p>
          </div>
          <Link href="/birrbank/banking/savings-rates"
            className="font-bold rounded-full transition-all shrink-0"
            style={{ fontSize: 14, padding: '14px 28px', background: '#1D4ED8', color: '#fff', whiteSpace: 'nowrap' }}>
            Compare savings rates
          </Link>
        </div>
      </section>

    </main>
  )
}
