import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Banking in Ethiopia — Compare All Banks | BirrBank',
  description: 'Compare savings rates, loan rates, FX rates and digital services across all NBE-licensed commercial banks in Ethiopia.',
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  regular_savings:'Regular savings', fixed_deposit_3m:'3-month fixed deposit',
  fixed_deposit_6m:'6-month fixed deposit', fixed_deposit_12m:'12-month fixed deposit',
  fixed_deposit_24m:'24-month fixed deposit', current:'Current account',
  diaspora:'Diaspora account', youth:'Youth savings', women:'Women savings',
}
const CURRENCY_NAMES: Record<string, string> = {
  USD:'US Dollar', GBP:'British Pound', EUR:'Euro',
}

interface SavingsRateRow {
  annual_rate: number
  account_type: string
  institution_slug: string
  institutions: { name: string }[] | null
}
interface FxRow {
  currency_code: string
  buying_rate: number
  selling_rate: number
}

export default async function BankingHubPage() {
  const supabase = createBirrBankAdminClient()

  const { data: latestFxDateRow } = await supabase
    .schema('birrbank')
    .from('exchange_rates')
    .select('rate_date')
    .eq('institution_slug', 'nbe')
    .order('rate_date', { ascending: false })
    .limit(1)
    .single()
  const latestFxDate = latestFxDateRow?.rate_date ?? null

  const [ratesRes, fxRes, bankCountRes, mfiCountRes, paymentCountRes, transferCountRes, fxCurrenciesRes] = await Promise.all([
    supabase.schema('birrbank').from('savings_rates').select('annual_rate, account_type, institution_slug, institutions(name)').eq('is_current', true).order('annual_rate', { ascending: false }).limit(5),
    latestFxDate
      ? supabase.schema('birrbank').from('exchange_rates').select('currency_code, buying_rate, selling_rate').eq('institution_slug', 'nbe').eq('rate_date', latestFxDate).in('currency_code', ['USD','GBP','EUR'])
      : supabase.schema('birrbank').from('exchange_rates').select('currency_code, buying_rate, selling_rate').eq('institution_slug', 'nbe').order('rate_date', { ascending: false }).in('currency_code', ['USD','GBP','EUR']).limit(3),
    supabase.schema('birrbank').from('institutions').select('count', { count:'exact', head:true }).eq('type','bank').eq('is_active', true),
    supabase.schema('birrbank').from('institutions').select('count', { count:'exact', head:true }).eq('type','microfinance').eq('is_active', true),
    supabase.schema('birrbank').from('institutions').select('count', { count:'exact', head:true }).eq('type','payment_operator').eq('is_active', true),
    supabase.schema('birrbank').from('institutions').select('count', { count:'exact', head:true }).eq('type','money_transfer').eq('is_active', true),
    supabase.schema('birrbank').from('exchange_rates').select('currency_code').eq('institution_slug', 'nbe'),
  ])

  const savingsRows: SavingsRateRow[] = ratesRes.data ?? []
  const fxRows: FxRow[] = fxRes.data ?? []
  const fxCurrencyRows: { currency_code: string }[] = fxCurrenciesRes.data ?? []

  const TOP_SAVINGS = savingsRows.map((r, i) => ({
    rank: i + 1, bank: r.institutions?.[0]?.name ?? r.institution_slug,
    product: ACCOUNT_TYPE_LABELS[r.account_type] ?? r.account_type,
    rate: Number(r.annual_rate).toFixed(2), badge: i === 0 ? 'Best rate' : null,
  }))
  const FX_PREVIEW = fxRows.map((r) => ({
    currency: r.currency_code, name: CURRENCY_NAMES[r.currency_code] ?? r.currency_code,
    buy: Number(r.buying_rate).toFixed(2), sell: Number(r.selling_rate).toFixed(2),
  }))

  const bankCount     = bankCountRes.count ?? 32
  const mfiCount      = mfiCountRes.count ?? 0
  const paymentCount  = paymentCountRes.count ?? 0
  const transferCount = transferCountRes.count ?? 0
  const fxCurrencyCount = new Set(fxCurrencyRows.map((r) => r.currency_code)).size
  const bestRate      = TOP_SAVINGS[0]?.rate ?? '—'

  const SUB_PAGES = [
    { label:'Savings Rates',   href:'/birrbank/banking/savings-rates',  desc:'Compare savings and fixed deposit rates across all commercial banks.', stat:'Updated daily',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label:'Loan Comparison',  href:'/birrbank/banking/loans',          desc:'Personal, car, home and business loan rates with EMI calculator.',   stat:'All loan types',
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
    { label:'FX Rates',         href:'/birrbank/banking/fx-rates',       desc:'Official NBE indicative rates vs per-bank buying and selling rates.', stat:`${fxCurrencyCount} currencies`,
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
    { label:'Mobile Money',     href:'/birrbank/banking/mobile-money',   desc:'TeleBirr, HelloCash, Amole and CBEBirr — compare all payment operators.', stat:`${paymentCount} operators`,
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
    { label:'Microfinance',     href:'/birrbank/banking/microfinance',   desc:'Micro-loans, rural finance and SME credit from licensed MFIs.',     stat:`${mfiCount} MFIs`,
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label:'Money Transfer',   href:'/birrbank/banking/money-transfer', desc:'Compare diaspora remittance fees and transfer speed across agencies.', stat:`${transferCount} agencies`,
      icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  ]

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background: '#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">Banking</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#93c5fd', border: '1px solid rgba(29,78,216,0.3)' }}>
            Banking Pillar
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
            Compare every bank<br />in Ethiopia.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '520px' }}>
            Savings rates, loans, FX and digital services across all {bankCount} commercial banks — verified from official sources and updated weekly.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/savings-rates" className="hero-btn hero-btn-primary">
              Compare savings rates
            </Link>
            <Link href="/birrbank/banking/fx-rates" className="hero-btn hero-btn-secondary">
              Check FX rates
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value: String(bankCount),  label: 'Commercial banks' },
              { value: bestRate !== '—' ? bestRate + '%' : '—', label: 'Best savings rate' },
              { value: String(mfiCount),   label: 'Microfinance institutions' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUB-PAGE CARDS */}
      <section style={{ background: '#f8fafc', padding: '96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>Explore</p>
          <h2 className="font-serif font-bold text-slate-950 mb-10"
            style={{ fontSize: 'clamp(22px, 3vw, 40px)', letterSpacing: '-0.5px' }}>
            The complete Ethiopian banking picture.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SUB_PAGES.map(cat => (
              <Link key={cat.label} href={cat.href}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="flex flex-col flex-1 p-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
                    {cat.icon}
                  </div>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize: '16px' }}>{cat.label}</p>
                  <p className="text-slate-500 text-sm leading-relaxed flex-1">{cat.desc}</p>
                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold group-hover:gap-2.5 transition-all" style={{ color: '#1D4ED8' }}>
                    {cat.stat} <ChevronRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SAVINGS RATES PREVIEW */}
      <section style={{ background: '#ffffff', padding: '96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>Live data</p>
              <h2 className="font-serif font-bold text-slate-950"
                style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
                Best savings rates today
              </h2>
            </div>
            <Link href="/birrbank/banking/savings-rates" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color: '#1D4ED8' }}>
              See all {bankCount} banks <ChevronRight size={13} />
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
            <div className="hidden sm:grid grid-cols-12 border-b border-slate-100" style={{ padding: '12px 24px', background: '#f8fafc' }}>
              {['#','Bank','Product','Rate'].map((h, i) => (
                <div key={h} className={i===0?'col-span-1':i===1?'col-span-5':i===2?'col-span-4':'col-span-2 text-right'}>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
                </div>
              ))}
            </div>
            {TOP_SAVINGS.length > 0 ? TOP_SAVINGS.map(r => (
              <div key={r.rank}
                className={'grid grid-cols-12 items-center border-b border-slate-100 transition-colors ' + (r.rank===1 ? 'bg-blue-50' : 'bg-white hover:bg-slate-50')}
                style={{ padding: r.rank===1 ? '18px 24px' : '14px 24px' }}>
                <div className="col-span-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                    style={r.rank===1 ? { background:'#1D4ED8', color:'#fff' } : { background:'#f1f5f9', color:'#94a3b8' }}>
                    {r.rank===1 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : r.rank}
                  </div>
                </div>
                <div className="col-span-5">
                  <p className={'font-bold ' + (r.rank===1 ? 'text-blue-900' : 'text-slate-800')} style={{ fontSize: r.rank===1 ? '15px' : '14px' }}>{r.bank}</p>
                  {r.badge && <span className="text-xs font-bold uppercase tracking-wide" style={{ color:'#1D4ED8' }}>{r.badge}</span>}
                </div>
                <div className="col-span-4">
                  <p className="text-slate-500 text-sm">{r.product}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className={'font-mono font-black ' + (r.rank===1 ? 'text-blue-700' : 'text-slate-800')}
                    style={{ fontSize: r.rank===1 ? '24px' : '18px', letterSpacing: '-1px' }}>{r.rate}%</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center">
                <p className="text-slate-500 text-sm">Savings rate data is being populated. Check back shortly.</p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Official bank sources · NBE registry · Rates updated weekly</p>
              <Link href="/birrbank/banking/savings-rates" className="text-xs font-bold" style={{ color:'#1D4ED8' }}>Full comparison →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Rates are for comparison purposes only. Always verify directly with the institution.</p>
        </div>
      </section>

      {/* FX PREVIEW */}
      <section style={{ background: '#f8fafc', padding: '96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>Live data</p>
              <h2 className="font-serif font-bold text-slate-950"
                style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-0.5px' }}>
                FX rates — NBE official snapshot
              </h2>
            </div>
            <Link href="/birrbank/banking/fx-rates" className="flex items-center gap-1 text-sm font-bold shrink-0" style={{ color:'#1D4ED8' }}>
              Full FX dashboard <ChevronRight size={13} />
            </Link>
          </div>
          {FX_PREVIEW.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {FX_PREVIEW.map(fx => (
                <div key={fx.currency} className="bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all overflow-hidden">
                  <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                  <div style={{ padding: '28px 24px' }}>
                    <div className="flex items-center justify-between mb-5">
                      <span className="inline-flex items-center rounded-lg font-black text-white"
                        style={{ background:'#1D4ED8', padding:'5px 14px', fontSize:13, letterSpacing:1 }}>{fx.currency}</span>
                      <p className="text-sm text-slate-500 font-medium">{fx.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mb-1">ETB per 1 {fx.currency}</p>
                    <p className="font-mono font-black text-slate-950 mb-3" style={{ fontSize:'32px', letterSpacing:'-1px', lineHeight:1 }}>{fx.sell}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">Buy rate</span>
                      <span className="font-mono font-semibold text-slate-600" style={{ fontSize:'14px' }}>{fx.buy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white text-center py-10">
              <p className="text-slate-500 text-sm">NBE rates are published at 09:30 EAT each business day.</p>
            </div>
          )}
        </div>
      </section>

      {/* TRUST */}
      <section style={{ background: '#0f172a', padding: '96px 0', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest text-center mb-4" style={{ color: '#93c5fd' }}>Why BirrBank</p>
          <h2 className="font-serif font-bold text-white text-center mb-12"
            style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', letterSpacing: '-0.5px' }}>
            The only platform covering all {bankCount} banks.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { tag:'Complete coverage', headline:`All ${bankCount} NBE-licensed banks. No gaps.`, body:'From CBE with 60% market share to every new private entrant — BirrBank is the only platform covering the complete commercial banking landscape of Ethiopia.' },
              { tag:'Verified weekly', headline:'Every rate has a verified date.', body:'Rates older than 7 days are flagged automatically. You see exactly how fresh the data is before making any comparison decision.' },
              { tag:'No affiliate fees', headline:'Rankings are never for sale.', body:'BirrBank earns nothing from the banks it ranks. The best savings rate is always first — regardless of which institution offers it.' },
            ].map(({ tag, headline, body }) => (
              <div key={tag} className="rounded-2xl flex flex-col overflow-hidden"
                style={{ background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 4px 24px rgba(0,0,0,0.04)' }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div style={{ padding:'36px 32px' }} className="flex flex-col flex-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background:'linear-gradient(135deg, #eff6ff, #dbeafe)', border:'1px solid #bfdbfe' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
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

      {/* EMAIL CAPTURE */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#1D4ED8' }}>Stay informed</p>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(32px, 4vw, 46px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Rate changes, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get notified the moment a bank changes its savings rate or FX margin. Once a week. No noise.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                `Savings and fixed deposit rate changes across all ${bankCount} banks`,
                'FX rate movements — USD, GBP, EUR, SAR, AED vs ETB',
                'New bank products, promotions and account launches',
                'NBE directives affecting deposit and lending rates',
              ].map(item => (
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
