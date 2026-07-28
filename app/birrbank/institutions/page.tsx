import type { Metadata } from 'next'
import Link from 'next/link'
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
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            NBE-Regulated Registry
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
            Ethiopia&apos;s complete<br />financial institution registry.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '560px' }}>
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
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value: String(totalCount), label: 'NBE-licensed institutions' },
              { value: String(activeCount), label: 'Active institutions' },
              { value: String(Object.keys(typeCounts).length), label: 'Institution categories' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1"
                  style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE SECTION */}
      <section id="registry" style={{ padding: '64px 0 96px', background: '#ffffff', scrollMarginTop: '64px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>NBE registry</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
            Browse and filter all licensed institutions.
          </h2>
          <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">Loading...</div>}>
            <InstitutionsClient institutions={all} />
          </Suspense>
        </div>
      </section>

      {/* DARK TRUST */}
      <section style={{ background: '#1C7C4C', padding: '72px 0', borderTop: '1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#ffffff' }}>Source integrity</p>
            <h3 className="font-bold mb-2"
              style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Every institution verified against the NBE registry.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: 1.75, maxWidth: 520 }}>
              If it is not licensed by the National Bank of Ethiopia, it does not appear on BirrBank. No grey-market operators. No unverified listings.
            </p>
          </div>
          <Link href="/birrbank/banking/savings-rates"
            className="font-bold rounded-full transition-all shrink-0"
            style={{ fontSize: 14, padding: '14px 28px', background: '#ffffff', color: '#1C7C4C', whiteSpace: 'nowrap' }}>
            Compare savings rates
          </Link>
        </div>
      </section>

    </main>
  )
}
