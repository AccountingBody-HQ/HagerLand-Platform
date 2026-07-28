import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Travel Insurance in Ethiopia — All Providers Compared | BirrBank',
  description: 'Compare travel insurance products from every NBE-licensed insurer in Ethiopia. Medical, trip cancellation and baggage cover compared free.',
}

function fmtETB(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return 'ETB ' + Number(val).toLocaleString('en-ET')
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface InsuranceProductRow {
  id: string
  institution_slug: string
  institutions: { name: string; slug: string }[] | null
  product_name: string
  annual_premium_pct: number | null
  premium_from_etb: number | null
  coverage_from_etb: number | null
  coverage_to_etb: number | null
  last_verified_date: string | null
  is_sharia_compliant: boolean
}

export default async function TravelInsurancePage() {
  const supabase = createBirrBankAdminClient()

  const [productsRes, insurerCountRes] = await Promise.all([
    supabase.schema('birrbank').from('insurance_products')
      .select('*, institutions(name, slug)')
      .eq('product_type', 'travel')
      .eq('is_current', true)
      .order('premium_from_etb', { ascending: true }),
    supabase.schema('birrbank').from('institutions')
      .select('count', { count: 'exact', head: true })
      .eq('type', 'insurer')
      .eq('is_active', true),
  ])

  const products: InsuranceProductRow[] = productsRes.data ?? []
  const insurerCount = insurerCountRes.count ?? 18

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Insurance - Travel
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
            Travel insurance in Ethiopia - all {insurerCount} insurers compared.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '520px' }}>
            Compare travel insurance products from every NBE-licensed insurer in Ethiopia. Essential for Ethiopians travelling abroad and diaspora visiting home.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/insurance/motor" className="hero-btn hero-btn-primary">
              Compare motor insurance
            </Link>
            <Link href="/birrbank/insurance" className="hero-btn hero-btn-secondary">
              All insurance types
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value: String(insurerCount), label: 'Licensed insurers' },
              { value: products.length > 0 ? String(products.length) : 'Pending', label: 'Travel products' },
              { value: 'Free', label: 'No broker fees' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS TABLE */}
      <section style={{ background: '#ffffff', padding: '64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Live data</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
            Travel insurance - premium comparison.
          </h2>

          {products.length > 0 ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
              <div className="hidden sm:grid border-b border-slate-200"
                style={{ gridTemplateColumns: '1fr 160px 140px 140px 110px', padding: '13px 24px', background: '#F4F5F3' }}>
                {['Insurer', 'Product', 'Premium from', 'Coverage from', 'Verified'].map(h => (
                  <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
                ))}
              </div>
              {products.map((p, i) => (
                <Link key={p.id} href={`/birrbank/institutions/${p.institutions?.[0]?.slug ?? p.institution_slug}`}
                  className={'block border-b border-slate-100 transition-colors ' + (i === 0 ? 'bg-green-soft hover:bg-green-soft' : 'bg-white hover:bg-slate-50')}>
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns: '1fr 160px 140px 140px 110px', padding: i === 0 ? '18px 24px' : '14px 24px' }}>
                    <div>
                      <p className={'font-bold ' + (i === 0 ? 'text-green-dark' : 'text-slate-800')} style={{ fontSize: i === 0 ? '15px' : '14px' }}>
                        {p.institutions?.[0]?.name ?? p.institution_slug}
                      </p>
                      {p.is_sharia_compliant && (
                        <span className="text-xs font-bold rounded-full px-2 py-0.5 mt-1 inline-block" style={{ background: '#fef3c7', color: '#92400e' }}>Sharia</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{p.product_name ?? '\u2014'}</p>
                    <p className={'font-mono font-black ' + (i === 0 ? 'text-green-dark' : 'text-slate-800')}
                      style={{ fontSize: i === 0 ? '18px' : '15px', letterSpacing: '-0.5px' }}>
                      {fmtETB(p.premium_from_etb)}
                    </p>
                    <p className="font-mono text-sm text-slate-600">{fmtETB(p.coverage_from_etb)}</p>
                    <p className="text-xs text-slate-400">{fmtDate(p.last_verified_date)}</p>
                  </div>
                  <div className="sm:hidden flex items-center justify-between gap-3" style={{ padding: '14px 16px' }}>
                    <p className="font-bold text-slate-800 text-sm">{p.institutions?.[0]?.name ?? p.institution_slug}</p>
                    <p className="font-mono font-black text-slate-800 shrink-0" style={{ fontSize: '15px' }}>{fmtETB(p.premium_from_etb)}</p>
                  </div>
                </Link>
              ))}
              <div className="flex items-center justify-between border-t border-slate-200" style={{ background: '#F4F5F3', padding: '14px 24px' }}>
                <p className="text-xs text-slate-400">Premiums sourced from official insurer websites - For comparison only - Sorted by lowest premium</p>
                <Link href="/birrbank/insurance" className="text-xs font-bold" style={{ color: '#1C7C4C' }}>All insurance types</Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
              <div className="py-16 text-center px-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#E9F5EE' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <p className="font-bold text-slate-800 mb-2">Travel insurance data being verified</p>
                <p className="text-slate-500 text-sm mb-6" style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
                  We are verifying travel insurance products from all {insurerCount} NBE-licensed insurers. Data will be published shortly.
                </p>
                <Link href="/birrbank/insurance" className="hero-btn hero-btn-primary inline-flex">
                  View other insurance types
                </Link>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-5 text-center leading-relaxed">
            Premiums are indicative and for comparison only. Always confirm with the insurer before purchasing. BirrBank is not an insurance broker or adviser.
          </p>
        </div>
      </section>

      {/* GUIDE */}
      <section style={{ background: '#F4F5F3', padding: '96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Coverage guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)', letterSpacing: '-0.5px' }}>
            What Ethiopian travel insurance covers.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Medical emergencies abroad', body: 'The most critical cover. Ethiopian travel insurance typically covers emergency medical treatment, hospitalisation and medical evacuation. Coverage amounts vary significantly - compare the maximum coverage limit before selecting a policy.' },
              { step: '02', title: 'Trip cancellation and delays', body: 'Covers non-refundable costs if your trip is cancelled due to illness, family emergency or flight cancellation. Check whether the policy covers both pre-departure cancellation and mid-trip curtailment separately.' },
              { step: '03', title: 'Baggage and personal effects', body: 'Covers loss, theft or damage to luggage and personal items. Ethiopian insurers typically cover up to ETB 50,000 in personal effects. High-value items such as cameras or laptops often require separate declaration.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-lg transition-all">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding: '28px 24px' }}>
                  <p className="font-mono font-black mb-3" style={{ fontSize: '32px', color: '#E4E6E3', lineHeight: 1 }}>{s.step}</p>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize: '15px' }}>{s.title}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight: 1.75 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DARK TRUST */}
      <section style={{ background: '#1C7C4C', padding: '72px 0', borderTop: '1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#ffffff' }}>Source integrity</p>
            <h3 className="font-bold mb-2"
              style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Only NBE-licensed insurers. No unverified operators.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: 1.75, maxWidth: 480 }}>
              Every insurer on BirrBank is verified against the NBE registry. BirrBank earns nothing from the insurers it compares.
            </p>
          </div>
          <Link href="/birrbank/institutions?type=insurer" className="font-bold rounded-full transition-all shrink-0"
            style={{ fontSize: 14, padding: '14px 28px', background: '#ffffff', color: '#1C7C4C', whiteSpace: 'nowrap' }}>
            View all insurers
          </Link>
        </div>
      </section>

      {/* EMAIL */}
      <section style={{ background: '#ffffff', padding: '96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Travel insurance alerts</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize: 'clamp(30px, 3.5vw, 42px)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              New products and rate changes, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize: '15px', lineHeight: 1.85 }}>
              Get notified when new travel insurance products launch or existing premiums change across all {insurerCount} NBE-licensed insurers.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever - No credit card - Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>

    </main>
  )
}
