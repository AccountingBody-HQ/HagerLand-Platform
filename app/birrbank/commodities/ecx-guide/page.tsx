import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'How the Ethiopian Commodity Exchange Works | BirrBank',
  description: 'Complete guide to the ECX — grading, trading, settlement and price discovery. From farm to export, explained.',
}

const HOW_IT_WORKS = [
  { step:'01', title:'Farmers and cooperatives deliver to ECX warehouses', body:'Producers bring their commodity to one of the ECX warehouse locations across Ethiopia. The commodity is weighed, sampled and graded by ECX-certified graders. A warehouse receipt is issued confirming the quantity and grade.' },
  { step:'02', title:'Grading determines the price tier', body:'Each commodity has a strict grading standard — moisture content, foreign matter, defects and physical characteristics. Grade 1 commands the highest price. Lower grades trade at defined discounts. Grading is done independently of buyers and sellers.' },
  { step:'03', title:'Trading happens on the ECX floor and electronic system', body:'Licensed buyers and sellers submit bids and offers through the ECX trading system. Prices are discovered through an open outcry and electronic matching process. All transactions are anonymous.' },
  { step:'04', title:'Settlement is guaranteed by ECX', body:'ECX acts as the central counterparty for every transaction. Payment is guaranteed to the seller and delivery is guaranteed to the buyer. This eliminates counterparty risk — a major problem in pre-ECX Ethiopian commodity trade.' },
  { step:'05', title:'Export licences are required for international buyers', body:'Foreign buyers must work through an ECX-licensed export firm. Direct purchases by international buyers are not permitted. Export firms aggregate ECX purchases and handle export documentation, quality certification and shipment.' },
  { step:'06', title:'Daily settlement prices are published', body:'At the end of each trading day, ECX publishes official settlement prices for every commodity code. These are the prices BirrBank displays — the volume-weighted average of all transactions for that commodity and grade on that day.' },
]
const COMMODITIES_TRADED = [
  { name:'Coffee',  codes:'20+ grade codes', origins:'Limu, Djimma, Yirgacheffe, Harrar, Kaffa, Gedeo', href:'/commodities/coffee' },
  { name:'Sesame',  codes:'6+ grade codes',  origins:'Humera, Wollega, Gondar',                          href:'/commodities/sesame' },
  { name:'Grains',  codes:'10+ grade codes', origins:'Arsi, Bale, Oromia, SNNPR',                        href:'/commodities/grains' },
  { name:'Beans',   codes:'8+ grade codes',  origins:'Oromia, SNNPR',                                    href:'/commodities/grains' },
]
const KEY_TERMS = [
  { term:'Settlement price',  def:'The official closing price published by ECX at the end of each trading day. Calculated as the volume-weighted average of all transactions for a given commodity code. This is the price BirrBank displays.' },
  { term:'Warehouse receipt', def:'A document issued by an ECX warehouse confirming that a specific quantity and grade of commodity has been deposited. Warehouse receipts can be traded on the ECX floor like a financial instrument.' },
  { term:'Basis',             def:'The difference between the ECX settlement price and the farm-gate price paid to the farmer. A wide basis indicates high trader margins or transport costs. A narrow basis indicates a more efficient market.' },
  { term:'ECX membership',    def:'Buyers and sellers must be licensed ECX members to trade directly. There are different membership categories for exporters, domestic traders and cooperatives. Individual farmers typically access ECX through cooperatives.' },
  { term:'Cupping',           def:'The quality assessment process for coffee. ECX-certified cuppers taste and score coffee samples to verify grade claims. Cupping scores influence which grade a lot receives and therefore its settlement price.' },
  { term:'LOT',               def:'The minimum tradeable unit on the ECX. One LOT is typically 60kg (one bag) for coffee and larger quantities for grains and sesame. Sellers must meet minimum lot sizes to list on the exchange.' },
]
const FAQS = [
  { q:'Can individual farmers sell directly on the ECX?', a:'Small farmers typically sell to cooperatives or licensed traders who then sell on the ECX. To sell directly, you need an ECX membership and must meet minimum lot sizes. Cooperatives are the most common route for smallholder farmers to access ECX prices.' },
  { q:'How are ECX prices different from farm-gate prices?', a:'ECX prices are wholesale prices at the warehouse level. Farm-gate prices paid to farmers are lower — they reflect transport costs, cooperative margins and trader fees. The difference between farm-gate and ECX prices is a key indicator of market efficiency.' },
  { q:'Who regulates the ECX?', a:'The Ethiopian Commodity Exchange operates under a proclamation passed by the Ethiopian parliament. It is overseen by the Ministry of Trade and the Ethiopian Capital Markets Authority (ECMA), which also regulates the securities exchange (ESX).' },
  { q:'Where are ECX warehouses located?', a:'ECX has warehouses in Addis Ababa and in major commodity-producing regions including Jimma, Dire Dawa, Hawassa, Bahir Dar and Mekele. Warehouse locations are matched to the primary growing regions of each commodity.' },
  { q:'How can I access ECX data directly?', a:'ECX publishes daily settlement prices on its official website at ecx.com.et. BirrBank aggregates and displays this data in a more accessible format. For bulk historical data or API access, contact ECX directly through their website.' },
]

export default function EcxGuidePage() {
  return (
    <main className="bg-white flex-1">

      <section className="relative overflow-hidden" style={{ background:'#1C7C4C' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#ffffff', border:'1px solid rgba(29,78,216,0.3)' }}>
            Commodities — ECX Guide
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            How the Ethiopian Commodity Exchange works — explained.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            The ECX is the official marketplace for Ethiopian agricultural commodities. Here is exactly how grading, trading, settlement and price discovery work — from farm to export.
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
              { value:'6', label:'Steps explained' },
              { value:'4', label:'Commodities covered' },
              { value:'ECX', label:'Official source' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
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
            From farm to settlement — how ECX works.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'28px 24px' }}>
                  <p className="font-mono font-black mb-3" style={{ fontSize:'36px', color:'#E4E6E3', lineHeight:1 }}>{s.step}</p>
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
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>ECX coverage</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Commodities and origins on the ECX.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {COMMODITIES_TRADED.map(c => (
              <Link key={c.name} href={c.href}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'24px' }}>
                  <p className="font-bold text-slate-900 mb-2" style={{ fontSize:'16px' }}>{c.name}</p>
                  <p className="text-xs font-bold mb-1" style={{ color:'#1C7C4C' }}>{c.codes}</p>
                  <p className="text-xs text-slate-400 mb-4" style={{ lineHeight:1.6 }}>{c.origins}</p>
                  <div className="flex items-center gap-1 text-xs font-bold group-hover:gap-2 transition-all" style={{ color:'#1C7C4C' }}>
                    View prices <ChevronRight size={11} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Glossary</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            ECX terminology explained.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {KEY_TERMS.map(t => (
              <div key={t.term} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'24px' }}>
                  <p className="font-mono font-black mb-2" style={{ fontSize:'16px', color:'#1C7C4C' }}>{t.term}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{t.def}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>FAQ</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Common questions about the ECX.
          </h2>
          <div className="space-y-4 max-w-3xl">
            {FAQS.map(faq => (
              <div key={faq.q} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-200 transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'24px 28px' }}>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'15px' }}>{faq.q}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.8 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>About this guide</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Based on official ECX documentation.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              This guide is based on official ECX trading rules, grading standards and public documentation. For the most current rules, always refer directly to ecx.com.et.
            </p>
          </div>
          <Link href="/birrbank/commodities" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            View commodity prices
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              ECX prices and market news, weekly to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly digest of ECX price movements, grading updates and commodity market news for exporters, lenders and agri-investors.
            </p>
            <ul className="space-y-3 mb-8">
              {['Weekly ECX settlement price summary — all commodities','Coffee, sesame and grain market movements','ECX rule changes and new commodity listings','Ethiopian agricultural export policy updates'].map(item => (
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
