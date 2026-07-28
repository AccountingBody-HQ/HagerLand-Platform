import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ECX Commodity Prices — Coffee, Sesame & Grains | BirrBank',
  description: 'Daily prices from the Ethiopian Commodity Exchange across all grades and origins. Coffee, sesame, grains and more.',
}

const SUB_CATEGORIES = [
  { label:'Coffee Prices', href:'/birrbank/commodities/coffee', desc:"Multiple grade and origin prices from Ethiopia's largest export commodity.", stat:'World 5th largest producer',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12M12 12C12 6 7 4 7 4s5 2 5 8z"/><path d="M12 12C12 6 17 4 17 4s-5 2-5 8z"/><line x1="8" y1="22" x2="16" y2="22"/></svg> },
  { label:'Sesame Prices', href:'/birrbank/commodities/sesame', desc:'White and mixed sesame grade prices — Ethiopia is a top global exporter.', stat:'Major export crop',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="4" ry="8"/><path d="M12 4C8 4 4 8 4 12s4 8 8 8"/><path d="M12 4c4 0 8 4 8 8s-4 8-8 8"/></svg> },
  { label:'Grain Prices', href:'/birrbank/commodities/grains', desc:'Wheat, beans and soybean prices from the ECX daily ticker.', stat:'Food security data',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2z"/><line x1="12" y1="12" x2="12" y2="22"/><path d="M8 16s1-1 4-1 4 1 4 1"/></svg> },
  { label:'How ECX Works', href:'/birrbank/commodities/ecx-guide', desc:'Guide to the Ethiopian Commodity Exchange — trading, grading and price discovery.', stat:'Beginner guide',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
]

function fmt(val: number | null | undefined) { if (val == null) return '—'; return Number(val).toLocaleString('en-ET', { minimumFractionDigits:2, maximumFractionDigits:2 }) }
function fmtVol(val: number | null | undefined) { if (val == null) return '—'; return (Number(val)/1000).toFixed(1)+'t' }

interface CommodityRow {
  id: string
  commodity_code: string
  commodity_name: string
  commodity_type: string
  region_of_origin: string | null
  grade: string | null
  price_etb: number
  price_change: number | null
  price_change_pct: number | null
  volume_kg: number | null
}

export default async function CommoditiesPage() {
  const supabase = createBirrBankAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const displayDate = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })

  const [coffeeRes, otherRes, totalRes] = await Promise.all([
    supabase.schema('birrbank').from('commodity_prices').select('*').eq('commodity_type','coffee').eq('trade_date',today).order('price_etb',{ascending:false}).limit(4),
    supabase.schema('birrbank').from('commodity_prices').select('*').in('commodity_type',['sesame','bean','grain','soybean','chickpea']).eq('trade_date',today).order('price_etb',{ascending:false}).limit(4),
    supabase.schema('birrbank').from('commodity_prices').select('count',{count:'exact',head:true}).eq('trade_date',today),
  ])
  const coffees: CommodityRow[] = coffeeRes.data ?? []
  const others: CommodityRow[] = otherRes.data ?? []
  const totalCodes = totalRes.count ?? 0

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden" style={{ background:'#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">Commodities</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#93c5fd', border:'1px solid rgba(29,78,216,0.3)' }}>
            Commodities Pillar
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            ECX commodity prices — coffee, sesame, grains.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Daily prices from the Ethiopian Commodity Exchange across all grades and origins. The only financial platform integrating commodity data with banking and investment intelligence.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/commodities/coffee" className="hero-btn hero-btn-primary">
              Coffee prices
            </Link>
            <Link href="/birrbank/commodities/sesame" className="hero-btn hero-btn-secondary">
              Sesame prices
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:'Daily', label:'ECX price updates' },
              { value:'5th', label:'Ethiopia globally for coffee' },
              { value:String(totalCodes), label:'Codes tracked today' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#f8fafc', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>ECX coverage</p>
          <h2 className="font-serif font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(22px, 3vw, 40px)', letterSpacing:'-0.5px' }}>
            Every ECX commodity, tracked.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SUB_CATEGORIES.map(cat => (
              <Link key={cat.label} href={cat.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
                <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="flex flex-col flex-1 p-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #fffbeb, #fef3c7)', border:'1px solid #fde68a' }}>
                    {cat.icon}
                  </div>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'16px' }}>{cat.label}</p>
                  <p className="text-slate-500 text-sm leading-relaxed flex-1">{cat.desc}</p>
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold group-hover:gap-2.5 transition-all" style={{ color:'#1D4ED8' }}>
                    {cat.stat} <ChevronRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#1D4ED8' }}>Coffee</p>
            <h2 className="font-serif font-bold text-slate-950"
              style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
              Coffee grade prices today
            </h2>
            <div className="flex items-center gap-3 shrink-0">
              <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
              <span className="text-xs font-bold rounded-full px-3 py-1.5 border" style={{ color:'#166534', background:'#dcfce7', borderColor:'#bbf7d0' }}>
                ECX · {displayDate}
              </span>
              <Link href="/birrbank/commodities/coffee" className="flex items-center gap-1 text-sm font-bold" style={{ color:'#1D4ED8' }}>
                All grades <ChevronRight size={13} />
              </Link>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #f59e0b)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'120px 1fr 120px 140px 110px 100px', padding:'12px 24px', background:'#f8fafc' }}>
              {['ECX Code','Grade & Origin','Region','Price (ETB/kg)','Change','Volume'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {coffees.length > 0 ? coffees.map((c, i) => {
              const changePos = Number(c.price_change ?? 0) >= 0
              return (
                <div key={c.id} className={'border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-amber-50' : 'bg-white hover:bg-slate-50')}>
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns:'120px 1fr 120px 140px 110px 100px', padding:i===0?'18px 24px':'14px 24px' }}>
                    <span className="font-mono font-bold text-xs rounded-lg px-2 py-1 w-fit" style={{ background:'#eff6ff', color:'#1D4ED8' }}>{c.commodity_code}</span>
                    <p className="font-bold text-slate-800" style={{ fontSize:i===0?'15px':'14px' }}>{c.commodity_name}</p>
                    <p className="text-sm text-slate-500">{c.region_of_origin ?? '—'}</p>
                    <p className="font-mono font-black text-slate-900" style={{ fontSize:i===0?'22px':'18px', letterSpacing:'-0.5px' }}>{fmt(c.price_etb)}</p>
                    <p className={'font-mono font-bold text-sm ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                      {changePos ? '+' : ''}{fmt(c.price_change)} ({changePos ? '+' : ''}{Number(c.price_change_pct ?? 0).toFixed(2)}%)
                    </p>
                    <p className="font-mono text-slate-500 text-sm">{fmtVol(c.volume_kg)}</p>
                  </div>
                  <div className="sm:hidden flex items-center gap-3" style={{ padding:'14px 16px' }}>
                    <span className="font-mono font-bold text-xs rounded-lg px-2 py-1 shrink-0" style={{ background:'#eff6ff', color:'#1D4ED8' }}>{c.commodity_code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{c.commodity_name}</p>
                      <p className="text-xs text-slate-400">{c.region_of_origin ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-slate-900" style={{ fontSize:'16px' }}>{fmt(c.price_etb)}</p>
                      <p className={'font-mono font-bold text-xs ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                        {changePos ? '+' : ''}{Number(c.price_change_pct ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="py-10 text-center"><p className="text-slate-500 text-sm">Coffee prices for today are not yet available.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: Ethiopian Commodity Exchange (ecx.com.et) · ETB per kg</p>
              <Link href="/birrbank/commodities/coffee" className="text-xs font-bold" style={{ color:'#1D4ED8' }}>All coffee grades →</Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background:'#f8fafc', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#1D4ED8' }}>Sesame and grains</p>
            <h2 className="font-serif font-bold text-slate-950"
              style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
              Other ECX commodities today
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
              <span className="text-xs font-bold rounded-full px-3 py-1.5 border" style={{ color:'#166534', background:'#dcfce7', borderColor:'#bbf7d0' }}>
                ECX · {displayDate}
              </span>
            </div>
          </div>
          {others.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {others.map((c) => {
                const changePos = Number(c.price_change ?? 0) >= 0
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
                    <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                    <div style={{ padding:'24px' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-bold text-xs rounded-lg px-2 py-1" style={{ background:'#eff6ff', color:'#1D4ED8' }}>{c.commodity_code}</span>
                        <span className="text-xs font-bold text-slate-400 rounded-full px-2 py-0.5 bg-slate-100 capitalize">{c.commodity_type}</span>
                      </div>
                      <p className="font-bold text-slate-800 mb-3" style={{ fontSize:'14px' }}>{c.commodity_name}</p>
                      <p className="font-mono font-black text-slate-950 mb-1" style={{ fontSize:'24px', letterSpacing:'-0.5px', lineHeight:1 }}>{fmt(c.price_etb)}</p>
                      <p className="text-xs text-slate-400 mb-3">ETB per kg</p>
                      <div className={'inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-1 ' + (changePos ? 'text-blue-700 bg-blue-50' : 'text-red-600 bg-red-50')}>
                        {changePos ? '+' : ''}{fmt(c.price_change)} ({changePos ? '+' : ''}{Number(c.price_change_pct ?? 0).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white text-center py-10">
              <p className="text-slate-500 text-sm">Commodity prices for today are not yet available.</p>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-5 text-center">Prices in ETB per kg · Source: ecx.com.et · Updated every ECX market day · For reference only</p>
        </div>
      </section>

      <section style={{ background:'#0f172a', padding:'96px 0', borderTop:'1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3 text-center" style={{ color:'#93c5fd' }}>Why BirrBank</p>
          <h2 className="font-serif font-bold text-white text-center mb-12"
            style={{ fontSize:'clamp(26px, 3.5vw, 40px)', letterSpacing:'-0.5px' }}>
            No other financial platform covers ECX.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { tag:'Coffee exporters', headline:"Ethiopia's most valuable export, priced daily.", body:"Coffee is Ethiopia's largest export commodity. Exporters, cooperatives and financiers need grade-level price data every trading day. BirrBank surfaces it in one place." },
              { tag:'Agricultural SMEs', headline:'Benchmark prices for lending decisions.', body:'Banks and MFIs lending to agricultural businesses need commodity price benchmarks. BirrBank integrates ECX prices with the banking pillar to serve both sides.' },
              { tag:'Diaspora & investors', headline:"Ethiopia's commodity story for global audiences.", body:"International investors and diaspora watching Ethiopia's agricultural sector need accessible price data in English. BirrBank is the only platform providing it free." },
            ].map(({ tag, headline, body }) => (
              <div key={tag} className="rounded-2xl flex flex-col overflow-hidden"
                style={{ background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 4px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div style={{ padding:'36px 32px' }} className="flex flex-col flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #fffbeb, #fef3c7)', border:'1px solid #fde68a' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12M12 12C12 6 7 4 7 4s5 2 5 8z"/><path d="M12 12C12 6 17 4 17 4s-5 2-5 8z"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>{tag}</p>
                  <h3 className="font-bold text-slate-900 mb-4" style={{ fontSize:'17px', lineHeight:1.4 }}>{headline}</h3>
                  <p className="text-sm text-slate-500 flex-1" style={{ lineHeight:'1.85' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Stay informed</p>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ECX prices, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly commodity price digest for exporters, lenders and investors.
            </p>
            <ul className="space-y-3 mb-8">
              {['Coffee grade prices — all origins and grades','Sesame, kidney bean and chickpea weekly movements','Wheat and grain price trends for food sector planning','ECX market news and new commodity listings'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
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
