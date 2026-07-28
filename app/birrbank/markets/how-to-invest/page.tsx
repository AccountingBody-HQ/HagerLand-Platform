import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'How to Invest in Ethiopia — ESX Beginner Guide | BirrBank',
  description: 'Step-by-step guide to opening a brokerage account and buying ESX-listed shares in Ethiopia. For both residents and diaspora investors.',
}

const STEPS = [
  { step:'01', title:'Get an NBE-verified National ID', body:'You need a valid Ethiopian National ID or passport to open a brokerage account. Foreign nationals in the diaspora can use their passport. Make sure your name matches exactly across all documents.' },
  { step:'02', title:'Open a Central Securities Depository (CSD) account', body:'The CSD is the official registry of share ownership in Ethiopia. You must open a CSD account before you can hold any ESX-listed shares. This is done through a licensed broker or directly via the ESX portal at esx.et.' },
  { step:'03', title:'Choose a licensed broker', body:'Only ECMA-licensed brokers can execute trades on the ESX. As of April 2026, licensed brokers include CBE Capital, Wegagen Capital and others. Check ecma.gov.et for the current full list.' },
  { step:'04', title:'Fund your brokerage account', body:'Transfer funds from your Ethiopian bank account to your brokerage account. Diaspora investors can fund via international wire transfer to a designated correspondent bank account. Minimum amounts vary by broker.' },
  { step:'05', title:'Place a buy order', body:'Once funded, you can place a buy order through your broker platform or by contacting them directly. Specify the ticker, number of shares and the maximum price you are willing to pay. Orders are matched on the ESX trading system.' },
  { step:'06', title:'Monitor your portfolio', body:'After purchase, your shares are held in your CSD account. You can track prices on BirrBank or directly on esx.et. Dividends are paid directly to your registered bank account when declared by the company.' },
]
const FAQS = [
  { q:'Can diaspora Ethiopians buy ESX shares?', a:'Yes. Diaspora investors with Ethiopian nationality can open a CSD account and buy shares through a licensed broker. You will need a valid Ethiopian passport and a foreign currency account at an authorised bank to fund your account.' },
  { q:'What is the minimum amount to invest?', a:'There is no official minimum share purchase on the ESX, but brokers typically set their own minimums — often ETB 5,000 to ETB 10,000. For T-bills, the NBE minimum is ETB 1,000 for short tenors.' },
  { q:'Are there taxes on share gains in Ethiopia?', a:'Dividend income is subject to a 10% withholding tax in Ethiopia. Capital gains tax rules for ESX-listed shares are still being developed by the Ethiopian Revenue and Customs Authority. Consult a licensed tax adviser for your specific situation.' },
  { q:'How liquid is the ESX?', a:'As of April 2026, only a small number of companies are listed on the ESX and daily trading volumes are modest. You may not always be able to sell quickly at your desired price. The ESX is expected to become more liquid as the IPO pipeline converts to listings.' },
  { q:'What is the difference between an IPO and buying on the ESX?', a:'An IPO is when shares are offered to the public for the first time at a fixed price. After listing, shares trade on the ESX at market prices set by supply and demand. IPO allocations are often oversubscribed — you may receive fewer shares than you applied for.' },
]
const CONCEPTS = [
  { term:'ESX', def:'Ethiopian Securities Exchange — the official stock exchange of Ethiopia, launched in January 2025. Regulated by ECMA.' },
  { term:'ECMA', def:'Ethiopian Capital Markets Authority — the regulatory body overseeing the ESX, brokers, and IPO prospectuses.' },
  { term:'CSD', def:'Central Securities Depository — the official registry that records who owns which shares. You must have a CSD account to hold ESX shares.' },
  { term:'IPO', def:'Initial Public Offering — when a company offers shares to the public for the first time. The price is fixed during the IPO; after listing it floats freely.' },
  { term:'P/E ratio', def:'Price-to-Earnings ratio — share price divided by annual earnings per share. A lower P/E can indicate a cheaper stock relative to its earnings power.' },
  { term:'Dividend yield', def:'Annual dividend per share divided by share price, expressed as a percentage. How much income you receive per ETB invested.' },
]

export default function HowToInvestPage() {
  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Markets — Beginner Guide
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            How to invest in Ethiopia — the ESX beginner guide.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Step-by-step guide to opening a brokerage account and buying ESX-listed shares. Covers both Ethiopian residents and diaspora investors.
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
              { value:'6', label:'Steps to first investment' },
              { value:'5', label:'FAQs answered' },
              { value:'Free', label:'No broker fee to read' },
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
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Step by step</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Six steps to your first ESX investment.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Glossary</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Key concepts explained.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONCEPTS.map(c => (
              <div key={c.term} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-green/40 hover:shadow-md transition-all">
                <p className="font-mono font-black text-green mb-2" style={{ fontSize:'13px' }}>{c.term}</p>
                <p className="text-sm text-slate-600" style={{ lineHeight:1.75 }}>{c.def}</p>
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
            Frequently asked questions.
          </h2>
          <div className="space-y-4 max-w-3xl">
            {FAQS.map(f => (
              <div key={f.q} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-green/30 transition-all">
                <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'15px' }}>{f.q}</p>
                <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Ready to invest?</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              See what is currently trading on the ESX.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank tracks end-of-day prices, volumes and market cap for all ESX-listed companies — free, always.
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
              ESX and IPO alerts, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly markets digest for new and experienced investors. Know before the IPO opens.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
