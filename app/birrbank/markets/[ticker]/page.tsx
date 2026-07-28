import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'

function fmt(val: number | null | undefined, decimals = 2) {
  if (val == null) return '\u2014'
  return Number(val).toFixed(decimals)
}
function fmtETB(val: number | null | undefined) {
  if (val == null) return '\u2014'
  return 'ETB ' + Number(val).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtBig(val: number | null | undefined) {
  if (val == null) return '\u2014'
  if (val >= 1_000_000_000) return 'ETB ' + (val / 1_000_000_000).toFixed(2) + 'B'
  if (val >= 1_000_000) return 'ETB ' + (val / 1_000_000).toFixed(2) + 'M'
  return 'ETB ' + Number(val).toLocaleString('en-ET')
}

export async function generateMetadata({ params }: { params: { ticker: string } }): Promise<Metadata> {
  const { ticker } = params
  const supabase = createBirrBankAdminClient()
  const { data: s } = await supabase.schema('birrbank').from('listed_securities').select('company_name, sector').eq('ticker', ticker.toUpperCase()).single()
  if (!s) return { title: 'Security Not Found | BirrBank' }
  return {
    title: `${ticker.toUpperCase()} — ${s.company_name} Share Price & Profile | BirrBank`,
    description: `Live ESX data for ${s.company_name} (${ticker.toUpperCase()}). Price history, key stats and institution profile on BirrBank.`,
  }
}

export default async function TickerPage({ params }: { params: { ticker: string } }) {
  const { ticker } = params
  const supabase = createBirrBankAdminClient()

  const { data: security } = await supabase
    .schema('birrbank')
    .from('listed_securities')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .single()

  if (!security) notFound()

  let institution: { name: string; slug: string } | null = null
  if (security.institution_slug) {
    const { data: instData } = await supabase.schema('birrbank').from('institutions').select('name, slug').eq('slug', security.institution_slug).single()
    institution = instData
  }

  const { data: history } = await supabase
    .schema('birrbank')
    .from('price_history')
    .select('trade_date, close_price, volume')
    .eq('ticker', ticker.toUpperCase())
    .order('trade_date', { ascending: false })
    .limit(30)

  const priceHistory = (history ?? []).reverse()
  const isPositive = Number(security.price_change_pct ?? 0) >= 0

  const heroStats = [
    { value: security.last_price_etb ? fmtETB(security.last_price_etb) : '\u2014', label: 'Last price' },
    { value: security.price_change_pct != null ? (isPositive ? '+' : '') + fmt(security.price_change_pct) + '%' : '\u2014', label: 'Change', color: security.price_change_pct != null ? (isPositive ? '#4ade80' : '#f87171') : '#94a3b8' },
    { value: security.market_cap_etb ? fmtBig(security.market_cap_etb) : '\u2014', label: 'Market cap' },
    { value: fmtDate(security.listing_date), label: 'Listed' },
  ]

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background: '#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/birrbank/markets" className="hover:text-slate-300 transition-colors">Markets</Link>
            <ChevronRight size={12} />
            <Link href="/birrbank/markets/equities" className="hover:text-slate-300 transition-colors">Equities</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">{security.ticker}</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-5"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#93c5fd', border: '1px solid rgba(29,78,216,0.3)' }}>
            {security.security_type ?? 'Equity'} &mdash; ESX Listed
          </div>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono font-black text-sm px-3 py-1.5 rounded-lg" style={{ background: '#1D4ED8', color: '#fff' }}>
                  {security.ticker}
                </span>
                {security.sector && (
                  <span className="text-xs font-semibold text-slate-400">{security.sector}</span>
                )}
              </div>
              <h1 className="font-serif font-bold text-white mb-4"
                style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
                {security.company_name}
              </h1>
              <p className="text-slate-400 mb-6" style={{ fontSize: '15px', lineHeight: 1.8, maxWidth: '480px' }}>
                Listed on the Ethiopian Securities Exchange. Prices updated manually from ESX published data.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/birrbank/markets/equities" className="hero-btn hero-btn-primary">All ESX equities</Link>
                {institution && (
                  <Link href={'/birrbank/institutions/' + institution.slug} className="hero-btn hero-btn-secondary">View institution</Link>
                )}
              </div>
            </div>

            {/* At a glance card */}
            <div className="hidden lg:block shrink-0 w-72 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#475569' }}>At a glance</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Ticker', value: security.ticker },
                  { label: 'Last price', value: security.last_price_etb ? fmtETB(security.last_price_etb) : 'Not yet available' },
                  { label: 'P/E ratio', value: security.pe_ratio ? fmt(security.pe_ratio) + 'x' : '\u2014' },
                  { label: 'Last updated', value: fmtDate(security.last_updated) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs" style={{ color: '#475569' }}>{row.label}</span>
                    <span className="text-sm font-bold text-white font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stat bar */}
          <div className="grid mt-2 pt-8 border-t border-slate-800" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {heroStats.map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black mb-1" style={{ fontSize: 'clamp(14px, 2vw, 22px)', letterSpacing: '-0.5px', color: s.color ?? '#ffffff' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT — price history */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900" style={{ fontSize: '17px' }}>Price History</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Last 30 trading days</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                  Prices updated manually
                </div>
              </div>
              {priceHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ minWidth: 400 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        {['Date', 'Close Price (ETB)', 'Volume'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {priceHistory.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-sm text-slate-600">{fmtDate(p.trade_date)}</td>
                          <td className="px-6 py-3 font-mono font-bold text-slate-800">{p.close_price ? Number(p.close_price).toLocaleString('en-ET', { minimumFractionDigits: 2 }) : '\u2014'}</td>
                          <td className="px-6 py-3 font-mono text-slate-400 text-sm">{p.volume ? Number(p.volume).toLocaleString() : '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-slate-400 text-sm">Price history will appear after the first manual price entry via the admin Securities tab.</p>
                </div>
              )}
            </div>

            {/* Key stats */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mt-6">
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-900" style={{ fontSize: '17px' }}>Key Statistics</h2>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {[
                  { label: 'Volume today', value: security.volume_today != null ? Number(security.volume_today).toLocaleString() : '\u2014' },
                  { label: 'P/E ratio', value: security.pe_ratio != null ? fmt(security.pe_ratio) + 'x' : '\u2014' },
                  { label: 'Dividend yield', value: security.dividend_yield_pct != null ? fmt(security.dividend_yield_pct) + '%' : '\u2014' },
                ].map(s => (
                  <div key={s.label} className="px-6 py-5 text-center">
                    <p className="font-mono font-black text-slate-950 mb-1" style={{ fontSize: '22px', letterSpacing: '-0.5px' }}>{s.value}</p>
                    <p className="text-xs font-semibold text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">

            {/* Institution card */}
            {institution && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Institution Profile</p>
                </div>
                <div className="p-5">
                  <p className="font-bold text-slate-900 mb-2">{institution.name}</p>
                  <p className="text-xs text-slate-500 mb-4" style={{ lineHeight: 1.6 }}>
                    View savings rates, loan rates, FX services and full regulatory profile on BirrBank.
                  </p>
                  <Link href={'/birrbank/institutions/' + institution.slug}
                    className="flex items-center justify-center gap-2 w-full font-bold rounded-full text-sm transition-all"
                    style={{ background: '#1D4ED8', color: '#fff', padding: '10px 16px' }}>
                    View institution profile <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            {/* How to buy */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">How to buy {security.ticker}</p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  'Open a brokerage account at CBE Capital or Wegagen Capital',
                  'Complete KYC verification with your national ID',
                  'Deposit ETB funds to your brokerage account',
                  'Place a buy order for ' + security.ticker + ' on the ESX',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
                      style={{ background: '#dbeafe', color: '#1D4ED8' }}>{i + 1}</span>
                    <p className="text-xs text-slate-600" style={{ lineHeight: 1.7 }}>{step}</p>
                  </div>
                ))}
                <Link href="/birrbank/markets/how-to-invest"
                  className="flex items-center gap-1 text-xs font-bold mt-2" style={{ color: '#1D4ED8' }}>
                  Full investing guide <ChevronRight size={11} />
                </Link>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-2xl p-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p className="text-xs font-bold text-amber-800 mb-1">Data disclaimer</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                ESX does not publish prices publicly. Prices are entered manually by BirrBank from official ESX summaries. Always verify with your broker before trading.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* DARK CTA */}
      <section style={{ background: '#0f172a', padding: '72px 0', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#93c5fd' }}>ESX Markets</p>
            <h3 className="font-serif font-bold mb-2"
              style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Track all ESX-listed securities on BirrBank.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.75, maxWidth: 440 }}>
              The Ethiopian Securities Exchange launched in 2025. BirrBank covers every listed equity, IPO pipeline and government debt instrument.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/birrbank/markets/equities"
              className="font-bold rounded-full text-center transition-all"
              style={{ fontSize: 14, padding: '14px 28px', background: '#1D4ED8', color: '#fff' }}>
              All ESX equities
            </Link>
            <Link href="/birrbank/markets/ipo-pipeline"
              className="font-bold rounded-full text-center transition-all"
              style={{ fontSize: 14, padding: '14px 28px', border: '1.5px solid #334155', color: '#94a3b8' }}>
              IPO pipeline
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
