import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ethiopian Sesame Prices — All Grades Daily | BirrBank',
  description: 'ECX daily settlement prices for Ethiopian sesame — Humera white sesame, Wollega mixed sesame and more. ETB per kilogram.',
}

function fmt(val: number | null | undefined) { if (val == null) return '—'; return Number(val).toLocaleString('en-ET', { minimumFractionDigits:2, maximumFractionDigits:2 }) }
function fmtVol(val: number | null | undefined) { if (val == null) return '—'; return (Number(val)/1000).toFixed(1)+'t' }

interface CommodityRow {
  id: string
  commodity_code: string
  commodity_name: string
  region_of_origin: string | null
  grade: string | null
  price_etb: number
  price_change: number | null
  price_change_pct: number | null
  volume_kg: number | null
}

export default async function SesamePricesPage() {
  const supabase = createBirrBankAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const displayDate = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
  const [dataRes, countRes] = await Promise.all([
    supabase.schema('birrbank').from('commodity_prices').select('*').eq('commodity_type','sesame').eq('trade_date',today).order('price_etb',{ascending:false}),
    supabase.schema('birrbank').from('commodity_prices').select('count',{count:'exact',head:true}).eq('commodity_type','sesame').eq('trade_date',today),
  ])
  const items: CommodityRow[] = dataRes.data ?? []
  const totalGrades = countRes.count ?? 0

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Commodities — Sesame
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Ethiopian sesame prices — all grades and origins, daily.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            ECX daily settlement prices for every Ethiopian sesame grade — Humera white sesame, Wollega mixed sesame and more. Prices in ETB per kilogram.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/commodities/coffee" className="hero-btn hero-btn-primary">Coffee prices</Link>
            <Link href="/birrbank/commodities/grains" className="hero-btn hero-btn-secondary">Grain prices</Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(totalGrades), label:'Grades tracked today' },
              { value:'ECX', label:'Official source' },
              { value:'Daily', label:'Update frequency' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'64px 0 80px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Today ECX settlement prices</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full animate-pulse bg-green" />
              <span className="text-xs font-bold rounded-full px-3 py-1.5 border" style={{ color:'#166534', background:'#dcfce7', borderColor:'#bbf7d0' }}>ECX · {displayDate}</span>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #f59e0b)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'130px 1fr 140px 100px 160px 140px 100px', padding:'13px 24px', background:'#F4F5F3' }}>
              {['ECX Code','Grade & name','Region','Grade','Price (ETB/kg)','Change','Volume'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {items.length > 0 ? items.map((c, i) => {
              const changePos = Number(c.price_change ?? 0) >= 0
              return (
                <div key={c.id} className={'border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-amber-50' : 'bg-white hover:bg-slate-50')}>
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns:'130px 1fr 140px 100px 160px 140px 100px', padding:i===0?'18px 24px':'14px 24px' }}>
                    <Link href={`/birrbank/commodities/${c.commodity_code.toLowerCase()}`} className="font-mono font-bold text-xs rounded-lg px-2 py-1 w-fit hover:bg-green-soft transition-colors" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>{c.commodity_code}</Link>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800" style={{ fontSize:i===0?'15px':'14px' }}>{c.commodity_name}</p>
                      {i===0 && <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background:'#fef3c7', color:'#92400e' }}>Top price</span>}
                    </div>
                    <p className="text-sm text-slate-500">{c.region_of_origin ?? '—'}</p>
                    <span className="text-xs font-bold rounded-full px-2 py-1 w-fit" style={{ background:'#F4F5F3', color:'#5B6472' }}>{c.grade ?? '—'}</span>
                    <p className="font-mono font-black text-slate-900" style={{ fontSize:i===0?'22px':'18px', letterSpacing:'-0.5px' }}>{fmt(c.price_etb)}</p>
                    <p className={'font-mono font-bold text-sm ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                      {changePos ? '+' : ''}{fmt(c.price_change)} ({changePos ? '+' : ''}{Number(c.price_change_pct ?? 0).toFixed(2)}%)
                    </p>
                    <p className="font-mono text-slate-500 text-sm">{fmtVol(c.volume_kg)}</p>
                  </div>
                  <div className="sm:hidden flex items-center gap-3" style={{ padding:'14px 16px' }}>
                    <Link href={`/birrbank/commodities/${c.commodity_code.toLowerCase()}`} className="font-mono font-bold text-xs rounded-lg px-2 py-1 shrink-0 hover:bg-green-soft transition-colors" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>{c.commodity_code}</Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{c.commodity_name}</p>
                      <p className="text-xs text-slate-400">{c.region_of_origin ?? '—'} · {fmtVol(c.volume_kg)}</p>
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
              <div className="py-12 text-center"><p className="text-slate-500 text-sm">Sesame prices for today are not yet available. ECX publishes prices each trading day.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: Ethiopian Commodity Exchange (ecx.com.et) · ETB per kg</p>
              <Link href="/birrbank/commodities" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>All commodities →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 text-center">Prices are ECX daily settlement prices for reference only. BirrBank is not a commodity broker.</p>
        </div>
      </section>

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Origins guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Ethiopian sesame origins explained.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { origin:'Humera', region:'Tigray', notes:"Ethiopia's primary sesame-growing region. Humera white sesame commands premium prices globally for its high oil content, bright white colour and low free fatty acid levels. Grade 1 is the export benchmark." },
              { origin:'Wollega', region:'Oromia', notes:'Mixed sesame from western Oromia. Lower price point than Humera but significant volume traded on the ECX. Grades 1-3 cover a wide range of export markets including Asia and the Middle East.' },
              { origin:'Gondar', region:'Amhara', notes:'White sesame from Gondar zone. Quality profile close to Humera with competitive pricing. Growing share of ECX trading volume as production in the region expands.' },
            ].map(o => (
              <div key={o.origin} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'24px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-slate-900" style={{ fontSize:'15px' }}>{o.origin}</p>
                    <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>{o.region}</span>
                  </div>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{o.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Data integrity</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>ECX official prices. Updated daily.</h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              All sesame prices are ECX daily settlement prices sourced from ecx.com.et. BirrBank does not estimate or interpolate prices.
            </p>
          </div>
          <Link href="/birrbank/commodities" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>All commodities</Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ECX sesame prices, weekly to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly summary of ECX sesame price movements across all grades and origins — for exporters, traders and agribusinesses.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
