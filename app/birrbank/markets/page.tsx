import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ethiopian Capital Markets — ESX Equities, IPO Pipeline & T-Bills | BirrBank',
  description: 'Track ESX-listed equities, the full IPO pipeline and Treasury bill yields — the complete intelligence layer for Ethiopian capital markets.',
}

const STATUS_LABELS: Record<string, string> = {
  announced:'Announced', review:'Under review', approved:'Approved',
  open:'Subscription open', priced:'Priced', listed:'Listed',
}
const SUB_PAGES = [
  { label:'Listed Equities', href:'/birrbank/markets/equities', desc:'Track all ESX-listed companies — prices, volumes, P/E ratios and dividends.', stat:'Live prices',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { label:'IPO Pipeline', href:'/birrbank/markets/ipo-pipeline', desc:'Prospectuses under ECMA review. Track upcoming listings before they open.', stat:'ECMA filings',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg> },
  { label:'Bonds & T-Bills', href:'/birrbank/markets/bonds', desc:'NBE Treasury bill auction results — yields, tenors and minimum investments.', stat:'NBE auctions',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  { label:'How to Invest', href:'/birrbank/markets/how-to-invest', desc:'Step-by-step guide to opening a brokerage account and buying ESX-listed shares.', stat:'Beginner guide',
    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
]

function fmt(val: number | null | undefined) { if (val == null) return '—'; return Number(val).toFixed(2) }
function fmtVol(val: number | null | undefined) { if (val == null) return '—'; return Number(val).toLocaleString('en-ET') }
function fmtCap(val: number | null | undefined) { if (val == null) return '—'; return (Number(val)/1e9).toFixed(1)+'B' }
function fmtDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
function fmtAmount(val: number | null | undefined) {
  if (val == null) return '—'
  const b = Number(val)/1e9
  return b >= 1 ? 'ETB '+b.toFixed(1)+'B' : 'ETB '+(Number(val)/1e6).toFixed(0)+'M'
}

interface SecurityRow {
  ticker: string
  company_name: string
  sector: string | null
  last_price_etb: number | null
  price_change_pct: number | null
  volume_today: number | null
  market_cap_etb: number | null
}
interface IpoRow {
  id: string
  company_name: string
  sector: string | null
  total_raise_etb: number | null
  lead_manager: string | null
  status: string
}
interface TbillRow {
  id: string
  instrument_type: string
  yield_pct: number | null
  minimum_investment: number | null
  auction_date: string | null
}

export default async function MarketsPage() {
  const supabase = createBirrBankAdminClient()
  const today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })

  const [securitiesRes, ipoRes, tbillRes, ipoCountRes] = await Promise.all([
    supabase.schema('birrbank').from('listed_securities').select('*').eq('security_type','equity').order('market_cap_etb',{ascending:false}),
    supabase.schema('birrbank').from('ipo_pipeline').select('*').neq('status','listed').neq('status','withdrawn').order('status').limit(5),
    supabase.schema('birrbank').from('debt_instruments').select('*').like('instrument_type','tbill%').eq('is_current',true).order('yield_pct',{ascending:false}),
    supabase.schema('birrbank').from('ipo_pipeline').select('count',{count:'exact',head:true}).neq('status','listed').neq('status','withdrawn'),
  ])

  const securities: SecurityRow[] = securitiesRes.data ?? []
  const ipos: IpoRow[] = ipoRes.data ?? []
  const tbills: TbillRow[] = tbillRes.data ?? []
  const ipoCount = ipoCountRes.count ?? 0
  const bestTbillYield = tbills[0] ? Number(tbills[0].yield_pct).toFixed(2)+'%' : '—'

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background:'#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">Markets</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#93c5fd', border:'1px solid rgba(29,78,216,0.3)' }}>
            Markets Pillar
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Ethiopia capital markets, tracked.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            ESX-listed equities, the full IPO pipeline and Treasury bill yields — the complete intelligence layer for Ethiopian capital markets.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/markets/equities" className="hero-btn hero-btn-primary">
              View listed equities
            </Link>
            <Link href="/birrbank/markets/ipo-pipeline" className="hero-btn hero-btn-secondary">
              IPO pipeline
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:String(securities.length), label:'ESX-listed companies' },
              { value:String(ipoCount)+'+', label:'IPOs tracked' },
              { value:bestTbillYield, label:'Best T-bill yield' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUB-PAGE CARDS */}
      <section style={{ background:'#f8fafc', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Capital markets</p>
          <h2 className="font-serif font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(22px, 3vw, 40px)', letterSpacing:'-0.5px' }}>
            The full Ethiopian capital markets picture.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SUB_PAGES.map(cat => (
              <Link key={cat.label} href={cat.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
                <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="flex flex-col flex-1 p-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #eff6ff, #dbeafe)', border:'1px solid #bfdbfe' }}>
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

      {/* LISTED SECURITIES */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Listed equities</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h2 className="font-serif font-bold text-slate-950"
              style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
              Currently trading on the ESX
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5">
                End-of-day · {today}
              </span>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'80px 1fr 120px 110px 110px 110px 110px', padding:'12px 24px', background:'#f8fafc' }}>
              {['Ticker','Company','Sector','Price (ETB)','Change','Volume','Mkt Cap'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {securities.length > 0 ? securities.map((s) => {
              const changePos = Number(s.price_change_pct ?? 0) >= 0
              return (
                <div key={s.ticker} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns:'80px 1fr 120px 110px 110px 110px 110px', padding:'16px 24px' }}>
                    <span className="font-mono font-black text-sm rounded-lg px-2 py-1 text-center" style={{ background:'#eff6ff', color:'#1D4ED8' }}>{s.ticker}</span>
                    <p className="font-bold text-slate-800" style={{ fontSize:'14px' }}>{s.company_name}</p>
                    <p className="text-sm text-slate-500">{s.sector ?? '—'}</p>
                    <p className="font-mono font-black text-slate-900" style={{ fontSize:'18px', letterSpacing:'-0.5px' }}>{fmt(s.last_price_etb)}</p>
                    <p className={'font-mono font-bold text-sm ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                      {changePos ? '+' : ''}{fmt(s.price_change_pct)}%
                    </p>
                    <p className="font-mono text-slate-600 text-sm">{fmtVol(s.volume_today)}</p>
                    <p className="text-slate-600 text-sm">ETB {fmtCap(s.market_cap_etb)}</p>
                  </div>
                  <div className="sm:hidden flex items-center gap-3" style={{ padding:'14px 16px' }}>
                    <span className="font-mono font-black text-xs rounded-lg px-2 py-1.5 shrink-0" style={{ background:'#eff6ff', color:'#1D4ED8' }}>{s.ticker}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{s.company_name}</p>
                      <p className="text-xs text-slate-400">{s.sector ?? '—'} · Vol {fmtVol(s.volume_today)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-slate-900" style={{ fontSize:'18px' }}>{fmt(s.last_price_etb)}</p>
                      <p className={'font-mono font-bold text-xs ' + (changePos ? 'text-green-600' : 'text-red-500')}>
                        {changePos ? '+' : ''}{fmt(s.price_change_pct)}%
                      </p>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="py-10 text-center"><p className="text-slate-500 text-sm">No equities data available. Check back after market hours.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: Ethiopian Securities Exchange (esx.et) · End-of-day prices</p>
              <Link href="/birrbank/markets/equities" className="text-xs font-bold" style={{ color:'#1D4ED8' }}>Full equities view →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* IPO PIPELINE */}
      <section style={{ background:'#f8fafc', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>IPO pipeline</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h2 className="font-serif font-bold text-slate-950"
              style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
              {ipoCount}+ prospectuses under ECMA review
            </h2>
            <Link href="/birrbank/markets/ipo-pipeline" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color:'#1D4ED8' }}>
              Full pipeline <ChevronRight size={13} />
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 120px 120px 120px 160px', padding:'12px 24px', background:'#f8fafc' }}>
              {['Company','Sector','Total raise','Lead manager','Status'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {ipos.map((ipo) => {
              const isReview = ipo.status === 'review'
              return (
                <div key={ipo.id}>
                  <div className="hidden sm:grid items-center border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                    style={{ gridTemplateColumns:'1fr 120px 120px 120px 160px', padding:'14px 24px' }}>
                    <p className="font-bold text-slate-800" style={{ fontSize:'14px' }}>{ipo.company_name}</p>
                    <p className="text-sm text-slate-500">{ipo.sector ?? '—'}</p>
                    <p className="font-mono text-sm text-slate-600">{fmtAmount(ipo.total_raise_etb)}</p>
                    <p className="text-sm text-slate-500">{ipo.lead_manager ?? '—'}</p>
                    <span className="text-xs font-bold rounded-full px-3 py-1 inline-flex w-fit items-center gap-1.5"
                      style={isReview ? { background:'#fef3c7', color:'#92400e' } : { background:'#f1f5f9', color:'#475569' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isReview ? '#f59e0b' : '#94a3b8' }} />
                      {STATUS_LABELS[ipo.status] ?? ipo.status}
                    </span>
                  </div>
                  <div className="sm:hidden border-b border-slate-100 bg-white" style={{ padding:'14px 16px' }}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800 text-sm">{ipo.company_name}</p>
                      <span className="text-xs font-bold rounded-full px-2 py-0.5"
                        style={isReview ? { background:'#fef3c7', color:'#92400e' } : { background:'#f1f5f9', color:'#475569' }}>
                        {STATUS_LABELS[ipo.status] ?? ipo.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{ipo.sector ?? '—'} · {fmtAmount(ipo.total_raise_etb)}</p>
                  </div>
                </div>
              )
            })}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: ECMA (Ethiopian Capital Markets Authority) · Updated monthly</p>
              <Link href="/birrbank/markets/ipo-pipeline" className="text-xs font-bold" style={{ color:'#1D4ED8' }}>See all {ipoCount}+ IPOs →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* T-BILLS */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Fixed income</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <h2 className="font-serif font-bold text-slate-950"
              style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
              NBE T-bill auction yields
            </h2>
            <Link href="/birrbank/markets/bonds" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color:'#1D4ED8' }}>
              Full bonds & T-bills <ChevronRight size={13} />
            </Link>
          </div>
          {tbills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {tbills.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
                  <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                  <div style={{ padding:'24px' }}>
                    <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>
                      {t.instrument_type.replace('tbill_','').replace('d','-day')} T-Bill
                    </p>
                    <p className="font-mono font-black text-slate-950 mb-1" style={{ fontSize:'32px', letterSpacing:'-1px', lineHeight:1 }}>
                      {t.yield_pct ? Number(t.yield_pct).toFixed(2)+'%' : '—'}
                    </p>
                    <p className="text-xs text-slate-400 mb-4">Annual yield</p>
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Min. investment</span>
                        <span className="font-semibold text-slate-700">{t.minimum_investment ? 'ETB '+Number(t.minimum_investment).toLocaleString('en-ET') : '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Auction date</span>
                        <span className="font-semibold text-slate-700">{fmtDate(t.auction_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 text-center py-12">
              <p className="text-slate-500 text-sm">T-bill data is being updated. Check back soon.</p>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-5 text-center">T-bill yields from NBE auction results · nbe.gov.et · For comparison only</p>
        </div>
      </section>

      {/* TRUST */}
      <section style={{ background:'#0f172a', padding:'96px 0', borderTop:'1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3 text-center" style={{ color:'#93c5fd' }}>Data integrity</p>
          <h2 className="font-serif font-bold text-white text-center mb-12"
            style={{ fontSize:'clamp(26px, 3.5vw, 40px)', letterSpacing:'-0.5px' }}>
            The only platform with the full picture.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { tag:'ESX coverage', headline:'Every listed security tracked daily.', body:'End-of-day prices, volumes and indices sourced from the Ethiopian Securities Exchange. Updated every market day.' },
              { tag:'IPO intelligence', headline:`${ipoCount}+ prospectuses. Updated monthly.`, body:'The most comprehensive IPO pipeline tracker in Ethiopia. Every ECMA-filed prospectus monitored from announcement to listing.' },
              { tag:'Dual-view innovation', headline:'Savings rate and stock price. One page.', body:'When a bank lists on the ESX, BirrBank shows its deposit rates alongside its share price — the only platform that holds both datasets simultaneously.' },
            ].map(({ tag, headline, body }) => (
              <div key={tag} className="rounded-2xl flex flex-col overflow-hidden"
                style={{ background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 4px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div style={{ padding:'36px 32px' }} className="flex flex-col flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #eff6ff, #dbeafe)', border:'1px solid #bfdbfe' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
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

      {/* EMAIL */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Market intelligence</p>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ESX updates and IPO alerts, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly markets digest for retail investors and diaspora. Know before the IPO opens.
            </p>
            <ul className="space-y-3 mb-8">
              {['ESX weekly price summary and index movement','New IPO announcements and prospectus filings','T-bill auction results and yield changes','NBE and ECMA regulatory updates affecting investors'].map(item => (
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
