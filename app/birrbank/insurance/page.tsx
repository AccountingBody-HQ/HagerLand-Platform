import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Insurance in Ethiopia — Compare All Providers | BirrBank',
  description: 'Motor, life, health and property insurance from every NBE-licensed insurer in Ethiopia — premiums, coverage limits and key features compared free.',
}

const PRODUCT_TYPES = [
  { label:'Motor Insurance', href:'/birrbank/insurance/motor', desc:'Third-party and comprehensive cover for cars, trucks and motorcycles.', required:true,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { label:'Life Insurance', href:'/birrbank/insurance/life', desc:'Term life, whole life and endowment policies from all licensed providers.', required:false,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { label:'Health Insurance', href:'/birrbank/insurance/health', desc:'Individual and group health plans covering hospitalisation and outpatient care.', required:false,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { label:'Property Insurance', href:'/birrbank/insurance/property', desc:'Fire, allied perils and homeowners cover for residential and commercial property.', required:false,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { label:'Travel Insurance', href:'/birrbank/insurance/travel', desc:'Single-trip and annual cover for international and domestic travel.', required:false,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { label:'Claims Guide', href:'/birrbank/insurance/claims-guide', desc:'Step-by-step guide to filing and following up on insurance claims in Ethiopia.', required:false,
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
]

interface InsurerRow {
  slug: string
  name: string
  nbe_licence_date: string | null
  nbe_licence_number?: string | null
  birrbank_score: number | null
}

export default async function InsurancePage() {
  const supabase = createBirrBankAdminClient()

  const [insurersRes, insurerCountRes, motorCountRes] = await Promise.all([
    supabase.schema('birrbank').from('institutions').select('slug, name, type, nbe_licence_date, birrbank_score, website_url').eq('type','insurer').eq('is_active',true).order('name'),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','insurer').eq('is_active',true),
    supabase.schema('birrbank').from('insurance_products').select('count',{count:'exact',head:true}).eq('product_type','motor').eq('is_current',true),
  ])

  const insurers: InsurerRow[] = insurersRes.data ?? []
  const insurerCount = insurerCountRes.count ?? 18
  const motorCount = motorCountRes.count ?? 0

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Insurance Pillar
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Compare insurance across all {insurerCount} providers.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Motor, life, health and property insurance from every NBE-licensed insurer in Ethiopia — premiums, coverage limits and key features compared free.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/insurance/motor"
              className="hero-btn hero-btn-primary">
              Compare motor insurance
            </Link>
            <Link href="/birrbank/insurance/life"
              className="hero-btn hero-btn-secondary">
              Life insurance
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(insurerCount), label:'Licensed insurers' },
              { value:String(motorCount || '—'), label:'Motor products compared' },
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

      {/* PRODUCT TYPE CARDS */}
      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Coverage types</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(22px, 3vw, 40px)', letterSpacing:'-0.5px' }}>
            Every insurance product type, compared.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRODUCT_TYPES.map(cat => (
              <Link key={cat.label} href={cat.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-green/40 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div className="flex flex-col flex-1 p-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #E9F5EE, #E9F5EE)', border:'1px solid #BFE3CC' }}>
                    {cat.icon}
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <p className="font-bold text-slate-900" style={{ fontSize:'16px' }}>{cat.label}</p>
                    {cat.required && <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background:'#fee2e2', color:'#991b1b' }}>Required by law</span>}
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed flex-1">{cat.desc}</p>
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold group-hover:gap-2.5 transition-all" style={{ color:'#1C7C4C' }}>
                    Compare <ChevronRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ALL INSURERS TABLE */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>NBE registry</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h2 className="font-bold text-slate-950"
              style={{ fontSize:'clamp(22px, 2.8vw, 34px)', letterSpacing:'-0.5px' }}>
              All {insurerCount} NBE-licensed insurers
            </h2>
            <Link href="/birrbank/institutions?type=insurer" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color:'#1C7C4C' }}>
              View all profiles <ChevronRight size={13} />
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 160px 100px 80px', padding:'12px 24px', background:'#F4F5F3' }}>
              {['Insurer','Established','Licence','Score'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {insurers.map((ins, i) => (
              <Link key={ins.slug} href={`/birrbank/institutions/${ins.slug}`}
                className={'block border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-green-soft hover:bg-green-soft' : 'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-center"
                  style={{ gridTemplateColumns:'1fr 160px 100px 80px', padding:i===0?'18px 24px':'13px 24px' }}>
                  <div>
                    <p className={'font-bold ' + (i===0 ? 'text-green-dark' : 'text-slate-800')} style={{ fontSize:i===0?'15px':'14px' }}>{ins.name}</p>
                    {i===0 && <span className="text-xs font-bold" style={{ color:'#1C7C4C' }}>Largest insurer</span>}
                  </div>
                  <p className="text-sm text-slate-500">{ins.nbe_licence_date ? new Date(ins.nbe_licence_date).getFullYear() : '—'}</p>
                  <p className="text-xs font-mono text-slate-400 truncate">{ins.nbe_licence_number ?? 'NBE'}</p>
                  <p className="text-sm font-bold text-slate-600">{ins.birrbank_score ? Number(ins.birrbank_score).toFixed(1) : '—'}</p>
                </div>
                <div className="sm:hidden flex items-center justify-between gap-3" style={{ padding:'13px 16px' }}>
                  <p className="font-bold text-slate-800 text-sm">{ins.name}</p>
                  <p className="text-xs text-slate-400 shrink-0">{ins.nbe_licence_date ? new Date(ins.nbe_licence_date).getFullYear() : '—'}</p>
                </div>
              </Link>
            ))}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: NBE registry · nbe.gov.et/financial-institutions</p>
              <Link href="/birrbank/insurance/motor" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>Compare products →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Data for comparison purposes only. Always verify directly with the insurer. BirrBank is not an insurance broker or financial adviser.</p>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ background:'#1C7C4C', padding:'96px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-bold text-white text-center mb-12"
            style={{ fontSize:'clamp(26px, 3.5vw, 40px)', letterSpacing:'-0.5px' }}>
            First insurance comparison platform in Ethiopia.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { tag:'NBE verified', headline:'Only licensed insurers. No unlicensed operators.', body:'Every insurer on BirrBank is verified against the NBE registry. If it is not NBE-licensed, it does not appear.' },
              { tag:'No broker fees', headline:'Free comparison. No commissions paid to us.', body:'BirrBank earns nothing from the insurers it compares. Rankings are based purely on price and coverage — never on commercial arrangements.' },
              { tag:'Verified data', headline:'Premiums verified from official insurer sources.', body:'All premium data is sourced from insurer websites and NBE-published minimum schedules. Every figure is timestamped with its verification date.' },
            ].map(({ tag, headline, body }) => (
              <div key={tag} className="rounded-2xl flex flex-col overflow-hidden"
                style={{ background:'#ffffff', border:'1px solid #E4E6E3', boxShadow:'0 4px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'36px 32px' }} className="flex flex-col flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #E9F5EE, #E9F5EE)', border:'1px solid #BFE3CC' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>{tag}</p>
                  <h3 className="font-bold text-slate-900 mb-4" style={{ fontSize:'17px', lineHeight:1.4 }}>{headline}</h3>
                  <p className="text-sm text-slate-500 flex-1" style={{ lineHeight:'1.85' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMAIL */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              New products and rate changes, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get notified when insurers update their premiums or launch new products — before renewal season.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                `Motor insurance premium changes across all ${insurerCount} providers`,
                'New life and health insurance product launches',
                'NBE minimum premium schedule updates',
                'Claims guide updates and insurer service changes',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>

    </main>
  )
}
