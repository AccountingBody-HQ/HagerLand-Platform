import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ESX Listed Equities — Ethiopian Securities Exchange | BirrBank',
  description: 'Track all ESX-listed companies — prices, volumes, P/E ratios and dividends. Updated end-of-day from the Ethiopian Securities Exchange.',
}

function fmt(val: number | null | undefined, decimals = 2) { if (val == null) return '—'; return Number(val).toFixed(decimals) }
function fmtVol(val: number | null | undefined) { if (val == null) return '—'; return Number(val).toLocaleString('en-ET') }
function fmtCap(val: number | null | undefined) { if (val == null) return '—'; return (Number(val)/1e9).toFixed(1)+'B' }

interface EquityRow {
  ticker: string
  company_name: string
  sector: string | null
  last_price_etb: number | null
  price_change_pct: number | null
  volume_today: number | null
  market_cap_etb: number | null
  pe_ratio: number | null
}

export default async function EquitiesPage() {
  const supabase = createBirrBankAdminClient()
  const [securitiesRes] = await Promise.all([
    supabase.schema('birrbank').from('listed_securities').select('*').eq('security_type','equity').order('market_cap_etb',{ascending:false}),
    supabase.schema('birrbank').from('market_indices').select('*').order('index_date',{ascending:false}).limit(1),
  ])
  const securities: EquityRow[] = securitiesRes.data ?? []
  const totalCap = securities.reduce((s: number, e) => s + (Number(e.market_cap_etb) || 0), 0)
  const totalCapStr = totalCap > 0 ? 'ETB '+(totalCap/1e9).toFixed(1)+'B' : '—'

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Markets — ESX Equities
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            All ESX-listed equities — end-of-day prices.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Every company trading on the Ethiopian Securities Exchange — prices, volumes, market cap, P/E ratios and dividend yields. Updated end-of-day.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/markets/ipo-pipeline" className="hero-btn hero-btn-primary">
              IPO pipeline
            </Link>
            <Link href="/birrbank/markets/bonds" className="hero-btn hero-btn-secondary">
              Bonds & T-Bills
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(securities.length), label:'Listed companies' },
              { value:totalCapStr, label:'Total market cap' },
              { value:'ESX', label:'Exchange' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(18px, 2.5vw, 30px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{securities.length} equities · ESX listed</p>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
              Prices updated manually
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'80px 1fr 120px 120px 100px 110px 100px 100px', padding:'12px 24px', background:'#F4F5F3' }}>
              {['Ticker','Company','Sector','Price (ETB)','Change','Volume','Mkt Cap','P/E'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {securities.length > 0 ? securities.map((s) => {
              const changePos = Number(s.price_change_pct ?? 0) >= 0
              return (
                <Link key={s.ticker} href={`/birrbank/markets/${s.ticker?.toLowerCase()}`}
                  className="block border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns:'80px 1fr 120px 120px 100px 110px 100px 100px', padding:'16px 24px' }}>
                    <span className="font-mono font-black text-sm rounded-lg px-2 py-1 text-center" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>{s.ticker}</span>
                    <p className="font-bold text-slate-800" style={{ fontSize:'14px' }}>{s.company_name}</p>
                    <p className="text-sm text-slate-500">{s.sector ?? '—'}</p>
                    <p className="font-mono font-black text-slate-900" style={{ fontSize:'18px', letterSpacing:'-0.5px' }}>{fmt(s.last_price_etb)}</p>
                    <p className={'font-mono font-bold text-sm ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                      {changePos ? '+' : ''}{fmt(s.price_change_pct)}%
                    </p>
                    <p className="font-mono text-slate-600 text-sm">{fmtVol(s.volume_today)}</p>
                    <p className="text-slate-600 text-sm">ETB {fmtCap(s.market_cap_etb)}</p>
                    <p className="text-slate-600 text-sm">{s.pe_ratio ? fmt(s.pe_ratio, 1) : '—'}</p>
                  </div>
                  <div className="sm:hidden flex items-center gap-3" style={{ padding:'14px 16px' }}>
                    <span className="font-mono font-black text-xs rounded-lg px-2 py-1.5 shrink-0" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>{s.ticker}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{s.company_name}</p>
                      <p className="text-xs text-slate-400">{s.sector ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-slate-900" style={{ fontSize:'18px' }}>{fmt(s.last_price_etb)}</p>
                      <p className={'font-mono font-bold text-xs ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                        {changePos ? '+' : ''}{fmt(s.price_change_pct)}%
                      </p>
                    </div>
                  </div>
                </Link>
              )
            }) : (
              <div className="py-12 text-center"><p className="text-slate-500 text-sm">No equities data available. Check back after market hours.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: Ethiopian Securities Exchange (esx.et) · Prices sourced from ESX and updated manually</p>
              <Link href="/birrbank/markets/ipo-pipeline" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>IPO pipeline →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 text-center">Prices are for information only. BirrBank is not a licensed broker. Always trade through an ECMA-licensed broker.</p>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>New to investing?</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Learn how to buy ESX-listed shares.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              Step-by-step guide to opening a brokerage account and making your first investment on the Ethiopian Securities Exchange.
            </p>
          </div>
          <Link href="/birrbank/markets/how-to-invest" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            How to invest guide
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ESX price alerts, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly ESX price summary and dividend announcements for retail investors.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
