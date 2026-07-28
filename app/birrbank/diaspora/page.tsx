import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ethiopian Diaspora Hub — Send Money, Invest & Bank | BirrBank',
  description: 'Send money home cheaply, invest in Ethiopian stocks from abroad, open a diaspora bank account and track ETB exchange rates.',
}

const SUB_CATEGORIES = [
  { label:'Send Money Home',    href:'/birrbank/banking/money-transfer', desc:'Compare remittance fees and exchange rates across all major transfer services.', stat:'Cheapest routes' },
  { label:'Invest from Abroad', href:'/birrbank/diaspora/invest',        desc:'Buy Ethiopian stocks on the ESX and participate in IPOs from anywhere in the world.', stat:'ESX investing' },
  { label:'Open a Bank Account',href:'/birrbank/diaspora/bank-account',  desc:'How to open a diaspora account at Ethiopian banks — requirements and process.', stat:'Step-by-step guide' },
  { label:'Track ETB Rates',    href:'/birrbank/banking/fx-rates',       desc:'Live NBE indicative rates and per-bank buying and selling rates for USD, GBP, EUR.', stat:'Updated daily' },
]
const CURRENCY_NAMES: Record<string,string> = { USD:'US Dollar', GBP:'British Pound', EUR:'Euro', SAR:'Saudi Riyal' }

interface FxRow {
  currency_code: string
  buying_rate: number
  selling_rate: number
}
interface DiasporaIpoRow {
  company_name: string
  status: string
}

export default async function DiasporaPage() {
  const supabase = createBirrBankAdminClient()
  const [fxRes, ipoRes, ipoCountRes] = await Promise.all([
    supabase.schema('birrbank').from('exchange_rates').select('currency_code, buying_rate, selling_rate').eq('institution_slug','nbe').order('rate_date',{ascending:false}).in('currency_code',['USD','GBP','EUR','SAR']).limit(8),
    supabase.schema('birrbank').from('ipo_pipeline').select('company_name, status').neq('status','listed').neq('status','withdrawn').limit(3),
    supabase.schema('birrbank').from('ipo_pipeline').select('count',{count:'exact',head:true}).neq('status','listed').neq('status','withdrawn'),
  ])
  const fxMap: Record<string, FxRow> = {}
  for (const r of (fxRes.data ?? []) as FxRow[]) { if (!fxMap[r.currency_code]) fxMap[r.currency_code] = r }
  const ipos: DiasporaIpoRow[] = ipoRes.data ?? []
  const ipoCount = ipoCountRes.count ?? 0

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Diaspora Hub
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Ethiopian financial services for the global diaspora.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Send money home cheaply, invest in Ethiopian stocks from abroad, open a diaspora bank account and track ETB exchange rates — all in one place.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/money-transfer" className="hero-btn hero-btn-primary">
              Compare remittance fees
            </Link>
            <Link href="/birrbank/banking/fx-rates" className="hero-btn hero-btn-secondary">
              Check ETB rates
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 pt-8 border-t border-white/20 pb-8">
            {(['USD','GBP','EUR','SAR'] as const).map(ccy => {
              const r = fxMap[ccy]
              return (
                <div key={ccy} className="text-center py-4">
                  <div className="inline-flex items-center rounded-lg mb-2" style={{ background:'#1C7C4C', padding:'3px 10px' }}>
                    <span style={{ fontSize:'11px', fontWeight:800, color:'#fff', letterSpacing:'1px' }}>{ccy}</span>
                  </div>
                  <p className="font-mono font-black text-white" style={{ fontSize:'clamp(18px, 2.5vw, 26px)', letterSpacing:'-1px', lineHeight:1 }}>
                    {r ? Number(r.selling_rate).toFixed(2) : '—'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">ETB sell · {CURRENCY_NAMES[ccy]}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Diaspora services</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(22px, 3vw, 40px)', letterSpacing:'-0.5px' }}>
            Everything the Ethiopian diaspora needs.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SUB_CATEGORIES.map(cat => (
              <Link key={cat.label} href={cat.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-green/40 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div className="flex flex-col flex-1 p-6">
                  <p className="font-bold text-slate-900 mb-2" style={{ fontSize:'15px' }}>{cat.label}</p>
                  <p className="text-slate-500 text-xs mb-4 flex-1" style={{ lineHeight:'1.7' }}>{cat.desc}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400">{cat.stat}</span>
                    <span className="flex items-center gap-1 text-xs font-bold group-hover:gap-2 transition-all" style={{ color:'#1C7C4C' }}>
                      Go <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {ipos.length > 0 && (
        <section style={{ background:'#ffffff', padding:'96px 0' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#1C7C4C' }}>IPO pipeline</p>
              <h2 className="font-bold text-slate-950"
                style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
                {ipoCount}+ upcoming ESX listings
              </h2>
              </div>
              <Link href="/birrbank/markets/ipo-pipeline" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color:'#1C7C4C' }}>
                Full pipeline <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {ipos.map((ipo) => (
                <div key={ipo.company_name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-md transition-all">
                  <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                  <div style={{ padding:'24px' }}>
                    <p className="font-bold text-slate-900 mb-2" style={{ fontSize:'15px' }}>{ipo.company_name}</p>
                    <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background:'#fef3c7', color:'#92400e' }}>
                      {ipo.status === 'review' ? 'Under review' : ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Built for the diaspora</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Every tool you need to stay connected to Ethiopia financially.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              From sending ETB 1,000 home to investing in an Ethiopian IPO — BirrBank covers every financial touchpoint for the Ethiopian diaspora.
            </p>
          </div>
          <Link href="/birrbank/diaspora/invest" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            Invest from abroad
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Stay connected</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ETB rate and remittance updates, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly digest for the Ethiopian diaspora — FX rates, remittance fees, IPO alerts and investment opportunities.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
