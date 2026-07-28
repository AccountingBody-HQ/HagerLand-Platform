import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ethiopian Bonds & T-Bills — NBE Auction Yields | BirrBank',
  description: 'NBE Treasury bill auction results — yields, tenors and minimum investments. Plus government and corporate bonds.',
}

function fmtDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
function fmtMin(val: number | null | undefined) { if (val == null) return '—'; return 'ETB '+Number(val).toLocaleString('en-ET') }

interface DebtInstrumentRow {
  id: string
  instrument_type: string
  issuer: string | null
  yield_pct: number | null
  minimum_investment: number | null
  auction_date: string | null
  maturity_date: string | null
  // name/coupon_rate are referenced in the original BirrBank JSX below but are
  // not actual columns on debt_instruments (schema has coupon_rate_pct, no
  // "name") — kept optional here to match the pre-existing behavior (renders
  // the '—' fallback) rather than silently changing what's displayed.
  name?: string
  coupon_rate?: number
}

export default async function BondsPage() {
  const supabase = createBirrBankAdminClient()
  const [tbillRes, bondRes] = await Promise.all([
    supabase.schema('birrbank').from('debt_instruments').select('*').like('instrument_type','tbill%').eq('is_current',true).order('yield_pct',{ascending:false}),
    supabase.schema('birrbank').from('debt_instruments').select('*').not('instrument_type','like','tbill%').eq('is_current',true).order('yield_pct',{ascending:false}),
  ])
  const tbills: DebtInstrumentRow[] = tbillRes.data ?? []
  const bonds: DebtInstrumentRow[] = bondRes.data ?? []
  const bestYield = tbills[0] ? Number(tbills[0].yield_pct).toFixed(2)+'%' : '—'

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Markets — Bonds & T-Bills
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Ethiopian bonds & T-bills — NBE auction yields.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Treasury bill auction results from the National Bank of Ethiopia — yields, tenors and minimum investments. Updated after each NBE auction.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/markets/equities" className="hero-btn hero-btn-primary">
              View ESX equities
            </Link>
            <Link href="/birrbank/markets/how-to-invest" className="hero-btn hero-btn-secondary">
              How to invest
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(tbills.length), label:'T-bill tenors' },
              { value:bestYield, label:'Best current yield' },
              { value:'NBE', label:'Auction authority' },
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
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
            NBE Treasury bill yields
          </h2>
          {tbills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {tbills.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-md transition-all">
                  <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                  <div style={{ padding:'24px' }}>
                    <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>
                      {t.instrument_type.replace('tbill_','').replace('d','-day')} T-Bill
                    </p>
                    <p className="font-mono font-black text-slate-950 mb-1" style={{ fontSize:'32px', letterSpacing:'-1px', lineHeight:1 }}>
                      {t.yield_pct ? Number(t.yield_pct).toFixed(2)+'%' : '—'}
                    </p>
                    <p className="text-xs text-slate-400 mb-4">Annual yield</p>
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Min. investment</span>
                        <span className="font-semibold text-slate-700">{fmtMin(t.minimum_investment)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Auction date</span>
                        <span className="font-semibold text-slate-700">{fmtDate(t.auction_date)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Issuer</span>
                        <span className="font-semibold text-slate-700">{t.issuer ?? 'NBE'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 text-center py-12 mb-12">
              <p className="text-slate-500 text-sm">T-bill data is being updated. Check back soon.</p>
            </div>
          )}

          {bonds.length > 0 && (
            <>
              <h2 className="font-bold text-slate-950 mb-8"
                style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
                Government & corporate bonds
              </h2>
              <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div className="hidden sm:grid border-b border-slate-200"
                  style={{ gridTemplateColumns:'1fr 120px 100px 130px 120px 110px', padding:'13px 24px', background:'#F4F5F3' }}>
                  {['Bond','Issuer','Yield','Coupon rate','Maturity','Min. invest'].map(h => (
                    <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
                  ))}
                </div>
                {bonds.map((b, i) => (
                  <div key={b.id} className={'border-b border-slate-100 transition-colors ' + (i===0?'bg-green-soft':'bg-white hover:bg-slate-50')}>
                    <div className="hidden sm:grid items-center"
                      style={{ gridTemplateColumns:'1fr 120px 100px 130px 120px 110px', padding:'14px 24px' }}>
                      <p className={'font-bold ' + (i===0?'text-green-dark':'text-slate-800')} style={{ fontSize:'14px' }}>{b.name ?? b.instrument_type}</p>
                      <p className="text-sm text-slate-500">{b.issuer ?? '—'}</p>
                      <p className={'font-mono font-black ' + (i===0?'text-green-dark':'text-slate-800')} style={{ fontSize:i===0?'20px':'16px' }}>
                        {b.yield_pct ? Number(b.yield_pct).toFixed(2)+'%' : '—'}
                      </p>
                      <p className="font-mono text-slate-600 text-sm">{b.coupon_rate ? Number(b.coupon_rate).toFixed(2)+'%' : '—'}</p>
                      <p className="text-sm text-slate-500">{fmtDate(b.maturity_date)}</p>
                      <p className="font-mono text-slate-600 text-sm">{fmtMin(b.minimum_investment)}</p>
                    </div>
                    <div className="sm:hidden flex items-center justify-between gap-3" style={{ padding:'14px 16px' }}>
                      <p className="font-bold text-slate-800 text-sm">{b.name ?? b.instrument_type}</p>
                      <p className="font-mono font-bold text-slate-800">{b.yield_pct ? Number(b.yield_pct).toFixed(2)+'%' : '—'}</p>
                    </div>
                  </div>
                ))}
                <div className="border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
                  <p className="text-xs text-slate-400">Source: NBE auction results · nbe.gov.et · For comparison only</p>
                </div>
              </div>
            </>
          )}
          <p className="text-xs text-slate-400 mt-5 text-center">T-bill yields from NBE auction results · For comparison only. Always verify with the NBE before investing.</p>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Fixed income</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              T-bills offer a guaranteed government-backed return.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              Ethiopian Treasury bills are issued by the NBE and backed by the government. They are considered the lowest-risk investment available in Ethiopia.
            </p>
          </div>
          <Link href="/birrbank/markets/how-to-invest" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background: '#ffffff', color: '#1C7C4C', whiteSpace:'nowrap' }}>
            How to invest guide
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              T-bill auction results, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get NBE auction results and yield changes the moment they are published.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
