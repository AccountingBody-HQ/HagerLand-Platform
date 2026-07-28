import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Life Insurance in Ethiopia — All Providers Compared | BirrBank',
  description: 'Compare term life, whole life and endowment policies from every NBE-licensed insurer in Ethiopia.',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function fmtETB(val: number | null | undefined) {
  if (val == null) return '—'
  return 'ETB ' + Number(val).toLocaleString('en-ET')
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
}

export default async function LifeInsurancePage() {
  const supabase = createBirrBankAdminClient()
  const [productsRes, countRes, insurerCountRes] = await Promise.all([
    supabase.schema('birrbank').from('insurance_products').select('*, institutions(name, slug)').eq('product_type','life').eq('is_current',true).order('annual_premium_pct',{ascending:true}),
    supabase.schema('birrbank').from('insurance_products').select('count',{count:'exact',head:true}).eq('product_type','life').eq('is_current',true),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','insurer').eq('is_active',true),
  ])
  const products: InsuranceProductRow[] = productsRes.data ?? []
  const totalCount = countRes.count ?? 0
  const insurerCount = insurerCountRes.count ?? 18

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden" style={{ background:'#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/birrbank/insurance" className="hover:text-slate-300 transition-colors">Insurance</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">Life Insurance</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#93c5fd', border:'1px solid rgba(29,78,216,0.3)' }}>
            Insurance — Life
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Life insurance in Ethiopia — all {insurerCount} providers compared.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Term life, whole life and endowment policies from every NBE-licensed insurer — coverage limits, premiums and key features compared free.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/insurance/motor" className="hero-btn hero-btn-primary">
              Motor insurance
            </Link>
            <Link href="/birrbank/insurance/health" className="hero-btn hero-btn-secondary">
              Health insurance
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:String(totalCount || insurerCount), label:'Products compared' },
              { value:String(insurerCount), label:'Licensed insurers' },
              { value:'Free', label:'No broker fees' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>Live data</p>
          <h2 className="font-serif font-bold text-slate-950 mb-8"
            style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
            Life insurance - premium comparison.
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 160px 160px 160px 120px', padding:'13px 24px', background:'#f8fafc' }}>
              {['Insurer','Annual premium','Coverage from','Coverage to','Verified'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {products.length > 0 ? products.map((p, i) => (
              <div key={p.id} className={'border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-blue-50' : 'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-start"
                  style={{ gridTemplateColumns:'1fr 160px 160px 160px 120px', padding:i===0?'18px 24px':'14px 24px' }}>
                  <div>
                    <p className={'font-bold ' + (i===0?'text-blue-900':'text-slate-800')} style={{ fontSize:i===0?'15px':'14px' }}>{p.institutions?.[0]?.name ?? p.institution_slug}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.product_name}</p>
                  </div>
                  <p className={'font-mono font-black ' + (i===0?'text-blue-700':'text-slate-800')} style={{ fontSize:i===0?'22px':'16px', letterSpacing:'-0.5px' }}>
                    {p.annual_premium_pct ? Number(p.annual_premium_pct).toFixed(2)+'%' : fmtETB(p.premium_from_etb)}
                  </p>
                  <p className="font-mono text-slate-600 text-sm">{fmtETB(p.coverage_from_etb)}</p>
                  <p className="font-mono text-slate-600 text-sm">{fmtETB(p.coverage_to_etb)}</p>
                  <p className="text-xs text-slate-400">{fmtDate(p.last_verified_date)}</p>
                </div>
                <div className="sm:hidden flex items-start justify-between gap-3" style={{ padding:'14px 16px' }}>
                  <p className="font-bold text-slate-800 text-sm">{p.institutions?.[0]?.name ?? p.institution_slug}</p>
                  <p className="font-mono font-bold text-slate-800 shrink-0">{p.annual_premium_pct ? Number(p.annual_premium_pct).toFixed(2)+'%' : fmtETB(p.premium_from_etb)}</p>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center"><p className="text-slate-500 text-sm">Life insurance data is being verified. Check back soon.</p></div>
            )}
            <div className="border-t border-slate-200 flex items-center justify-between" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Sourced from official insurer websites · For comparison only</p>
              <Link href="/birrbank/insurance" className="text-xs font-bold" style={{ color:'#1D4ED8' }}>All insurance →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 text-center">Always get a formal quote directly from the insurer. BirrBank is not an insurance broker.</p>
        </div>
      </section>

      <section style={{ background:'#f8fafc', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>Buying guide</p>
          <h2 className="font-serif font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Understanding life insurance in Ethiopia.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Term vs whole life', body:'Term life pays out only if you die within the policy term — it is pure protection and the cheapest option. Whole life builds a cash value over time and pays regardless of when you die. Endowment policies combine protection with a savings element.' },
              { step:'02', title:'How premiums are calculated', body:'Life insurance premiums in Ethiopia are based on age, health, sum assured and policy term. Younger policyholders pay significantly lower premiums. Most insurers require a medical questionnaire and some require a physical examination for large sums assured.' },
              { step:'03', title:'What to check before buying', body:'Confirm the exclusions — most Ethiopian life policies exclude suicide in the first two years, war and pre-existing conditions. Check whether the policy is participating (with-profits) or non-participating. Understand the surrender value if you cancel early.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div style={{ padding:'28px 24px' }}>
                  <p className="font-mono font-black mb-3" style={{ fontSize:'32px', color:'#e2e8f0', lineHeight:1 }}>{s.step}</p>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'15px' }}>{s.title}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#0f172a', padding:'72px 0', borderTop:'1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#93c5fd' }}>NBE verified</p>
            <h3 className="font-serif font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Every insurer verified against the NBE registry.
            </h3>
            <p style={{ color:'#94a3b8', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank only lists insurers holding a valid NBE licence. Premium data is sourced from official insurer websites.
            </p>
          </div>
          <Link href="/birrbank/insurance" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1D4ED8', color:'#fff', whiteSpace:'nowrap' }}>
            All insurance types
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>Stay informed</p>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Life insurance updates, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get notified when insurers update their life insurance premiums or launch new products.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
