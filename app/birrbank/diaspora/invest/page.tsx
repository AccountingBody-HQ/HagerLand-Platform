import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Invest in Ethiopia from Abroad — Diaspora Guide | BirrBank',
  description: 'Ethiopian stocks, T-bills, IPOs and fixed deposits — all accessible to diaspora investors with Ethiopian nationality.',
}

const STEPS = [
  { step:'01', title:'Confirm your eligibility', body:'Ethiopian nationals living abroad can invest in ESX-listed shares, T-bills and bank fixed deposits. Foreign nationals of non-Ethiopian origin face restrictions on certain instruments. Confirm your status with an ECMA-licensed broker.' },
  { step:'02', title:'Open a CSD account for equities', body:'To hold ESX shares, you need a Central Securities Depository (CSD) account. This can be opened remotely through some licensed brokers using your Ethiopian passport and foreign bank account details.' },
  { step:'03', title:'Choose a licensed broker', body:'Only ECMA-licensed brokers can execute ESX trades and T-bill applications on your behalf. As of April 2026, CBE Capital and Wegagen Capital are the primary licensed brokers. Check ecma.gov.et for the current full list.' },
  { step:'04', title:'Fund your investment account', body:'Transfer funds via international wire to your broker designated correspondent bank account in Ethiopia. Ensure you use the correct transfer reference and currency. Diaspora transfers are governed by NBE foreign currency regulations.' },
  { step:'05', title:'Place your investment', body:'Once funded, instruct your broker to purchase shares, subscribe to a T-bill auction or apply for an IPO allocation. Get confirmation in writing for every transaction.' },
  { step:'06', title:'Monitor and repatriate returns', body:'Dividends and T-bill returns are credited to your broker account or designated Ethiopian bank account. Repatriation of investment returns by diaspora investors is permitted under NBE regulations with proper documentation.' },
]
const FAQS = [
  { q:'Can I invest in Ethiopia without visiting in person?', a:'For most instruments yes — account opening, funding and trading can be done remotely. Some brokers require an in-person visit for CSD account opening. Check with your chosen broker before starting the process.' },
  { q:'What taxes apply to diaspora investors?', a:'Dividend income is subject to 10% withholding tax in Ethiopia. Capital gains tax rules for ESX shares are still being finalised. T-bill interest may be subject to withholding tax. Consult a licensed Ethiopian tax adviser for your specific situation.' },
  { q:'Can I repatriate my investment returns?', a:'Yes. NBE regulations permit diaspora investors to repatriate dividends and capital gains with proper documentation. Your broker will guide you through the NBE repatriation process. Keep all transaction records for tax purposes in your country of residence.' },
  { q:'What is the minimum investment on the ESX?', a:'There is no official minimum on the ESX but brokers typically require ETB 5,000 to 10,000 as a practical minimum for equity investments. T-bills start at ETB 1,000 and fixed deposits at ETB 5,000 at most banks.' },
]
const RISK_COLORS: Record<string,{ background:string; color:string }> = {
  'Very Low':    { background:'#dcfce7', color:'#166534' },
  'Low':         { background:'#dcfce7', color:'#166534' },
  'Medium-High': { background:'#fef3c7', color:'#92400e' },
}

export default async function DiasporaInvestPage() {
  const supabase = createBirrBankAdminClient()
  const [tbillRes, savingsRes, ipoCountRes, equitiesRes] = await Promise.all([
    supabase.schema('birrbank').from('debt_instruments').select('yield_pct').like('instrument_type','tbill%').eq('is_current',true).order('yield_pct',{ascending:false}).limit(1),
    supabase.schema('birrbank').from('savings_rates').select('annual_rate').eq('is_current',true).order('annual_rate',{ascending:false}).limit(1),
    supabase.schema('birrbank').from('ipo_pipeline').select('count',{count:'exact',head:true}).neq('status','listed').neq('status','withdrawn'),
    supabase.schema('birrbank').from('listed_securities').select('count',{count:'exact',head:true}).eq('security_type','equity'),
  ])
  const bestTbill   = tbillRes.data?.[0]?.yield_pct ? Number(tbillRes.data[0].yield_pct).toFixed(2)+'% p.a.' : 'Competitive yield'
  const bestSavings = savingsRes.data?.[0]?.annual_rate ? Number(savingsRes.data[0].annual_rate).toFixed(2)+'% p.a.' : 'Up to 9.50% p.a.'
  const ipoCount    = ipoCountRes.count ?? 0
  const equityCount = equitiesRes.count ?? 0

  const INVESTMENT_OPTIONS = [
    { title:'ESX Listed Equities', href:'/birrbank/markets/equities', risk:'Medium-High', minInvest:'ETB 5,000', returns:'Market-driven', liquidity:'Daily trading', desc:`Buy shares in ${equityCount} companies currently trading on the Ethiopian Securities Exchange. Diaspora with Ethiopian nationality can open a CSD account and trade through a licensed broker.`, badge:`${equityCount} listed` },
    { title:'IPO Subscriptions', href:'/birrbank/markets/ipo-pipeline', risk:'Medium-High', minInvest:'Varies by IPO', returns:'Listing price gain', liquidity:'Post-listing only', desc:`Subscribe to shares in upcoming IPOs before they list on the ESX. Apply through a licensed ECMA broker during the subscription window. ${ipoCount}+ prospectuses currently in the pipeline.`, badge:`${ipoCount}+ in pipeline` },
    { title:'NBE Treasury Bills', href:'/birrbank/markets/bonds', risk:'Low', minInvest:'ETB 1,000', returns:bestTbill, liquidity:'Held to maturity', desc:'Invest in Ethiopian government T-bills with tenors from 28 days to 364 days. Sovereign risk only — the lowest risk investment in Ethiopia. Purchase through a licensed broker or CBE branch.', badge:'Lowest risk' },
    { title:'Fixed Deposit Accounts', href:'/birrbank/banking/savings-rates', risk:'Very Low', minInvest:'ETB 5,000', returns:bestSavings, liquidity:'Fixed term', desc:'Open a fixed deposit account at an Ethiopian commercial bank. Requires a diaspora bank account — 12 Ethiopian banks now accept remote account opening for diaspora. Covered by NBE depositor protection.', badge:`Best rate ${bestSavings}` },
  ]

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Diaspora — Investing
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Invest in Ethiopia from anywhere in the world.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Ethiopian stocks, T-bills, IPOs and fixed deposits — all accessible to diaspora investors with Ethiopian nationality. Here is exactly how to get started.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/markets/equities" className="hero-btn hero-btn-primary">
              View ESX equities
            </Link>
            <Link href="/birrbank/markets/ipo-pipeline" className="hero-btn hero-btn-secondary">
              IPO pipeline
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(equityCount), label:'ESX-listed companies' },
              { value:'ETB 1K', label:'Minimum T-bill investment' },
              { value:'ECMA', label:'Licensed broker required' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Investment options</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            What diaspora investors can access.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {INVESTMENT_OPTIONS.map(opt => (
              <Link key={opt.title} href={opt.href}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'28px 24px' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-bold text-slate-900" style={{ fontSize:'16px' }}>{opt.title}</p>
                    <span className="text-xs font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>{opt.badge}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-5" style={{ lineHeight:1.75 }}>{opt.desc}</p>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Risk level</p>
                      <span className="text-xs font-bold rounded-full px-2 py-0.5" style={RISK_COLORS[opt.risk] ?? { background:'#F4F5F3', color:'#5B6472' }}>{opt.risk}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Min. investment</p>
                      <p className="font-mono font-bold text-slate-800 text-sm">{opt.minInvest}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Expected returns</p>
                      <p className="font-bold text-slate-800 text-sm">{opt.returns}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Liquidity</p>
                      <p className="font-bold text-slate-800 text-sm">{opt.liquidity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold mt-4 group-hover:gap-2 transition-all" style={{ color:'#1C7C4C' }}>
                    Learn more <ChevronRight size={11} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Step by step</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            How to start investing in Ethiopia from abroad.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {STEPS.map(s => (
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

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Investor FAQ</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Common questions from diaspora investors.
          </h2>
          <div className="space-y-4 max-w-3xl">
            {FAQS.map(faq => (
              <div key={faq.q} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/30 transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'24px 28px' }}>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'15px' }}>{faq.q}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.8 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/birrbank/markets/how-to-invest" className="flex items-center gap-1 text-sm font-bold" style={{ color:'#1C7C4C' }}>
              Full investing guide <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Important</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Information only — not investment advice.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank is not licensed to give investment advice, execute trades or manage portfolios. Always use an ECMA-licensed broker and consult a qualified financial adviser before investing.
            </p>
          </div>
          <Link href="/birrbank/markets/equities" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            View ESX equities
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Stay ahead</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ESX and IPO updates, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly digest for diaspora investors — ESX price movements, new IPO announcements, T-bill yields and NBE regulatory updates.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
