import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Property Insurance in Ethiopia — All Providers Compared | BirrBank',
  description: 'Compare fire, allied perils and homeowners insurance from every NBE-licensed insurer in Ethiopia.',
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

export default async function PropertyInsurancePage() {
  const supabase = createBirrBankAdminClient()
  const [productsRes, countRes, insurerCountRes] = await Promise.all([
    supabase.schema('birrbank').from('insurance_products').select('*, institutions(name, slug)').eq('product_type','property').eq('is_current',true).order('annual_premium_pct',{ascending:true}),
    supabase.schema('birrbank').from('insurance_products').select('count',{count:'exact',head:true}).eq('product_type','property').eq('is_current',true),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','insurer').eq('is_active',true),
  ])
  const products: InsuranceProductRow[] = productsRes.data ?? []
  const totalCount = countRes.count ?? 0
  const insurerCount = insurerCountRes.count ?? 18

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Insurance — Property
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Property insurance in Ethiopia — fire, allied perils and homeowners cover.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Residential and commercial property insurance from every NBE-licensed insurer — coverage limits, premiums and key features compared free.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/insurance/motor" className="hero-btn hero-btn-primary">
              Motor insurance
            </Link>
            <Link href="/birrbank/insurance/health" className="hero-btn hero-btn-secondary">
              Health insurance
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(totalCount || insurerCount), label:'Products compared' },
              { value:String(insurerCount), label:'Licensed insurers' },
              { value:'Free', label:'No broker fees' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Live data</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
            Property insurance - premium comparison.
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 160px 160px 160px 120px', padding:'13px 24px', background:'#F4F5F3' }}>
              {['Insurer','Annual premium','Coverage from','Coverage to','Verified'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {products.length > 0 ? products.map((p, i) => (
              <div key={p.id} className={'border-b border-slate-100 transition-colors ' + (i===0?'bg-green-soft':'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-start"
                  style={{ gridTemplateColumns:'1fr 160px 160px 160px 120px', padding:i===0?'18px 24px':'14px 24px' }}>
                  <div>
                    <p className={'font-bold ' + (i===0?'text-green-dark':'text-slate-800')} style={{ fontSize:i===0?'15px':'14px' }}>{p.institutions?.[0]?.name ?? p.institution_slug}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.product_name}</p>
                  </div>
                  <p className={'font-mono font-black ' + (i===0?'text-green-dark':'text-slate-800')} style={{ fontSize:i===0?'22px':'16px', letterSpacing:'-0.5px' }}>
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
              <div className="py-12 text-center"><p className="text-slate-500 text-sm">Property insurance data is being verified. Check back soon.</p></div>
            )}
            <div className="border-t border-slate-200 flex items-center justify-between" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Sourced from official insurer websites · For comparison only</p>
              <Link href="/birrbank/insurance" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>All insurance →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 text-center">Always get a formal quote directly from the insurer. BirrBank is not an insurance broker.</p>
        </div>
      </section>

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Buying guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Understanding property insurance in Ethiopia.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Fire and allied perils', body:'The standard property policy in Ethiopia covers fire, lightning and explosion. Allied perils — flood, storm, earthquake and riot — are added as extensions. Always check which perils are included and which require a separate endorsement.' },
              { step:'02', title:'Residential vs commercial', body:'Residential policies cover the building structure and contents. Commercial policies cover the building, business contents, stock and business interruption. Premium rates differ significantly between residential and commercial use.' },
              { step:'03', title:'How the sum insured is set', body:'The sum insured should reflect the full reinstatement cost of the property — not the market value. Underinsurance is a major risk: if your property is insured for 50% of its value, your claim will be settled at 50% regardless of the loss amount.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'28px 24px' }}>
                  <p className="font-mono font-black mb-3" style={{ fontSize:'32px', color:'#E4E6E3', lineHeight:1 }}>{s.step}</p>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'15px' }}>{s.title}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>NBE verified</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Every insurer verified against the NBE registry.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank only lists insurers holding a valid NBE licence. Premium data is sourced from official insurer websites.
            </p>
          </div>
          <Link href="/birrbank/insurance" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background: '#ffffff', color: '#1C7C4C', whiteSpace:'nowrap' }}>
            All insurance types
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Property insurance updates, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get notified when insurers update their property insurance premiums or launch new products.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
