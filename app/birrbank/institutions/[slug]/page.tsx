import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight, Globe, Phone, Mail, MapPin, Calendar, Building2, CreditCard, Wifi, Smartphone } from 'lucide-react'
export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string,string> = {
  bank:'Commercial Bank', insurer:'Insurance Company', microfinance:'Microfinance Institute',
  payment_operator:'Payment Operator', money_transfer:'Money Transfer Agency',
  fx_bureau:'FX Bureau', capital_goods_finance:'Capital Goods Finance',
  reinsurer:'Reinsurance Company', investment_bank:'Investment Bank',
}
const ACCOUNT_TYPE_LABELS: Record<string,string> = {
  regular_savings:'Regular Savings', fixed_deposit_3m:'3-Month Fixed Deposit',
  fixed_deposit_6m:'6-Month Fixed Deposit', fixed_deposit_12m:'12-Month Fixed Deposit',
  fixed_deposit_24m:'24-Month Fixed Deposit', current:'Current Account',
  diaspora:'Diaspora Account', youth:'Youth Savings', women:'Women Savings',
}
const LOAN_TYPE_LABELS: Record<string,string> = {
  personal:'Personal Loan', home_mortgage:'Home Mortgage', car:'Car Loan',
  business:'Business Loan', agricultural:'Agricultural Loan',
  education:'Education Loan', emergency:'Emergency Loan', microfinance:'Microfinance Loan',
}

function fmtDate(d: string|null|undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function fmtMin(v: number|null|undefined) {
  if (v == null) return '0'
  return Number(v).toLocaleString('en-ET')
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params
  const supabase = createBirrBankAdminClient()
  const { data: inst } = await supabase.schema('birrbank').from('institutions').select('name, type').eq('slug', slug).single()
  if (!inst) return { title: 'Institution Not Found | BirrBank' }
  return {
    title: `${inst.name} — Rates, Profile and Review | BirrBank`,
    description: `Full profile for ${inst.name}: savings rates, loan rates, digital services and regulatory details. Verified against NBE registry.`,
  }
}

interface InstSavingsRow {
  id: string
  account_type: string
  is_sharia_compliant: boolean
  minimum_balance_etb: number | null
  minimum_tenure_days: number | null
  last_verified_date: string
  annual_rate: number
}
interface InstLoanRow {
  id: string
  loan_type: string
  min_rate: number
  max_rate: number | null
  max_tenure_months: number | null
  last_verified_date: string
}
interface RelatedInstRow {
  slug: string
  name: string
  nbe_licence_date: string | null
}

export default async function InstitutionPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const supabase = createBirrBankAdminClient()

  const { data: inst } = await supabase.schema('birrbank').from('institutions').select('*').eq('slug', slug).eq('is_active', true).single()
  if (!inst) notFound()

  const [savingsRes, loanRes, digitalRes, fxRes, secRes, relatedRes] = await Promise.all([
    supabase.schema('birrbank').from('savings_rates').select('*').eq('institution_slug', slug).eq('is_current', true).order('annual_rate', { ascending: false }),
    supabase.schema('birrbank').from('loan_rates').select('*').eq('institution_slug', slug).eq('is_current', true).order('min_rate', { ascending: true }),
    supabase.schema('birrbank').from('digital_services').select('*').eq('institution_slug', slug).single(),
    supabase.schema('birrbank').from('exchange_rates').select('*').eq('institution_slug', slug).in('currency_code', ['USD','EUR','GBP']).order('rate_date', { ascending: false }).limit(12),
    inst.is_listed_on_esx ? supabase.schema('birrbank').from('listed_securities').select('*').eq('institution_slug', slug).single() : Promise.resolve({ data: null }),
    supabase.schema('birrbank').from('institutions').select('slug, name, type, coverage_level, nbe_licence_date, branches_count').eq('type', inst.type).eq('is_active', true).neq('slug', slug).limit(4),
  ])

  const savings: InstSavingsRow[] = savingsRes.data ?? []
  const loans: InstLoanRow[] = loanRes.data ?? []
  const digital = digitalRes.data
  // Build fxMap: { USD: { cash: {...}, transactional: {...} }, ... }
  const fxMap: Record<string, { cash?: Record<string, string | number | null>; transactional?: Record<string, string | number | null> }> = {}
  for (const r of (fxRes.data ?? [])) {
    if (!fxMap[r.currency_code]) fxMap[r.currency_code] = {}
    const rtype = r.rate_type ?? 'transactional'
    if (!fxMap[r.currency_code][rtype as 'cash' | 'transactional']) {
      fxMap[r.currency_code][rtype as 'cash' | 'transactional'] = r
    }
  }
  const security = secRes.data
  const related: RelatedInstRow[] = relatedRes.data ?? []
  const bestRate = savings[0] ? Number(savings[0].annual_rate).toFixed(2) + '%' : null
  const typeLabel = TYPE_LABELS[inst.type] ?? inst.type.replace(/_/g,' ')

  // Hero stat bar — adapts by type
  const heroStats = inst.type === 'bank' ? [
    { value: bestRate ?? '—', label: 'Best savings rate' },
    { value: inst.branches_count ? String(inst.branches_count) : '—', label: 'Branches' },
    { value: inst.swift_code ?? '—', label: 'SWIFT code' },
    { value: inst.founded_year ? String(inst.founded_year) : inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear().toString() : '—', label: 'Founded' },
  ] : inst.type === 'insurer' ? [
    { value: inst.nbe_licence_number ?? '—', label: 'Licence number' },
    { value: inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear().toString() : '—', label: 'Established' },
    { value: 'NBE', label: 'Regulator' },
    { value: 'Insurance', label: 'Pillar' },
  ] : inst.type === 'fx_bureau' ? [
    { value: inst.nbe_licence_number ?? '—', label: 'Licence number' },
    { value: inst.operational_status ?? '—', label: 'Status' },
    { value: inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear().toString() : '—', label: 'Licensed' },
    { value: 'NBE', label: 'Regulator' },
  ] : inst.type === 'payment_operator' ? [
    { value: inst.nbe_licence_number ?? '—', label: 'Licence number' },
    { value: inst.service_type ? inst.service_type.split(' ')[0] : '—', label: 'Service type' },
    { value: inst.operational_status ?? '—', label: 'Status' },
    { value: inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear().toString() : '—', label: 'Licensed' },
  ] : [
    { value: inst.nbe_licence_number ?? '—', label: 'Licence number' },
    { value: inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear().toString() : '—', label: 'Established' },
    { value: inst.hq_region ?? 'Ethiopia', label: 'HQ region' },
    { value: 'NBE', label: 'Regulator' },
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
            <Link href="/birrbank/institutions" className="hover:text-slate-300 transition-colors">Institutions</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">{inst.name}</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-5"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#93c5fd', border: '1px solid rgba(29,78,216,0.3)' }}>
            {typeLabel}
          </div>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-10">
            <div className="flex-1">
              <h1 className="font-serif font-bold text-white mb-4"
                style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
                {inst.name}
              </h1>
              {inst.description && (
                <p className="text-slate-400 mb-6" style={{ fontSize: '15px', lineHeight: 1.8, maxWidth: '540px' }}>{inst.description}</p>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/birrbank/banking/savings-rates" className="hero-btn hero-btn-primary">
                  Compare all rates
                </Link>
                <Link href="/birrbank/institutions" className="hero-btn hero-btn-secondary">
                  All institutions
                </Link>
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
                  { label: 'Type', value: typeLabel },
                  { label: 'Licence date', value: fmtDate(inst.nbe_licence_date) },
                  { label: 'SWIFT', value: inst.swift_code ?? '—' },
                  { label: 'Coverage', value: inst.coverage_level === 'full' ? 'Verified' : inst.coverage_level === 'standard' ? 'Standard' : 'Profiled' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs" style={{ color: '#475569' }}>{row.label}</span>
                    <span className="text-sm font-bold text-white font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
              {inst.website_url && (
                <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <a href={inst.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full font-bold rounded-xl text-xs transition-all"
                    style={{ background: '#1D4ED8', color: '#fff', padding: '10px 16px' }}>
                    <Globe size={13} /> Visit website
                  </a>
                </div>
              )}
            </div>
          </div>
          {/* Stat bar */}
          <div className="grid mt-2 pt-8 border-t border-slate-800" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }} >
            {heroStats.map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize: 'clamp(16px, 2vw, 24px)', letterSpacing: '-0.5px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT — 2/3 */}
          <div className="lg:col-span-2 space-y-8">

            {/* SAVINGS RATES */}
            {(inst.type === 'bank' || inst.type === 'microfinance') && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900" style={{ fontSize: '17px' }}>Savings Rates</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Current deposit rates — verified</p>
                  </div>
                  <Link href="/birrbank/banking/savings-rates" className="flex items-center gap-1 text-xs font-bold transition-colors" style={{ color: '#1D4ED8' }}>
                    Compare all <ChevronRight size={12} />
                  </Link>
                </div>
                {savings.length > 0 ? (
                  <>
                    {/* Mobile: card list */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {savings.map((s, i) => (
                        <div key={s.id} className={'flex items-center justify-between px-6 py-4 ' + (i === 0 ? 'bg-blue-50' : '')}>
                          <div>
                            <p className={'font-bold text-sm ' + (i === 0 ? 'text-blue-900' : 'text-slate-800')}>{ACCOUNT_TYPE_LABELS[s.account_type] ?? s.account_type}</p>
                            {s.is_sharia_compliant && <span className="text-xs font-bold rounded-full px-2 py-0.5 mt-1 inline-block" style={{ background: '#fef3c7', color: '#92400e' }}>Sharia</span>}
                            <p className="text-xs text-slate-400 mt-0.5">Min ETB {fmtMin(s.minimum_balance_etb)}</p>
                          </div>
                          <span className="font-mono font-black shrink-0 ml-4" style={{ fontSize: i === 0 ? '22px' : '18px', color: '#1D4ED8' }}>{Number(s.annual_rate).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                    {/* Desktop: full table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            {['Product','Annual Rate','Min. Balance','Term','Last Verified'].map(h => (
                              <th key={h} className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {savings.map((s, i) => (
                            <tr key={s.id} className={i === 0 ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                              <td className="px-6 py-4">
                                <p className={'font-bold text-sm ' + (i === 0 ? 'text-blue-900' : 'text-slate-800')}>{ACCOUNT_TYPE_LABELS[s.account_type] ?? s.account_type}</p>
                                {s.is_sharia_compliant && <span className="text-xs font-bold rounded-full px-2 py-0.5 mt-1 inline-block" style={{ background: '#fef3c7', color: '#92400e' }}>Sharia</span>}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-mono font-black" style={{ fontSize: i === 0 ? '22px' : '17px', color: '#1D4ED8' }}>{Number(s.annual_rate).toFixed(2)}%</span>
                              </td>
                              <td className="px-6 py-4 font-mono text-sm text-slate-600">ETB {fmtMin(s.minimum_balance_etb)}</td>
                              <td className="px-6 py-4 text-sm text-slate-500">{s.minimum_tenure_days ? Math.round(s.minimum_tenure_days/30) + ' mo' : 'Flexible'}</td>
                              <td className="px-6 py-4 text-xs text-slate-400">{fmtDate(s.last_verified_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-slate-400 text-sm">Savings rate data is being verified for {inst.name}.</p>
                  </div>
                )}
              </div>
            )}

            {/* LOAN RATES */}
            {(inst.type === 'bank' || inst.type === 'microfinance' || inst.type === 'capital_goods_finance') && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900" style={{ fontSize: '17px' }}>Loan Rates</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Current lending rates — verified</p>
                  </div>
                  <Link href="/birrbank/banking/loans" className="flex items-center gap-1 text-xs font-bold transition-colors" style={{ color: '#1D4ED8' }}>
                    Compare all <ChevronRight size={12} />
                  </Link>
                </div>
                {loans.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
                    {loans.map((l) => (
                      <div key={l.id} className="rounded-xl border border-slate-100 p-4 hover:border-blue-200 transition-colors">
                        <p className="font-bold text-slate-800 text-sm mb-2">{LOAN_TYPE_LABELS[l.loan_type] ?? l.loan_type}</p>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="font-mono font-black text-slate-950" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>{Number(l.min_rate).toFixed(2)}%</span>
                          {l.max_rate && <span className="text-sm text-slate-400">– {Number(l.max_rate).toFixed(2)}%</span>}
                        </div>
                        <p className="text-xs text-slate-400">{l.max_tenure_months ? `Max ${l.max_tenure_months} months` : '—'} · Verified {fmtDate(l.last_verified_date)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-slate-400 text-sm">Loan rate data is being verified for {inst.name}.</p>
                  </div>
                )}
              </div>
            )}

            {/* FX RATES — banks only */}
            {inst.type === 'bank' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900" style={{ fontSize: '17px' }}>FX Rates</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Most recent available rates</p>
                  </div>
                  <Link href="/birrbank/banking/fx-rates" className="flex items-center gap-1 text-xs font-bold" style={{ color: '#1D4ED8' }}>
                    Compare all <ChevronRight size={12} />
                  </Link>
                </div>
                {Object.keys(fxMap).length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {['USD','EUR','GBP'].filter(c => fxMap[c]).map(ccy => {
                      const cash = fxMap[ccy].cash
                      const trans = fxMap[ccy].transactional
                      const dateRow = cash ?? trans
                      return (
                        <div key={ccy} className="px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-mono font-bold text-slate-700">{ccy} / ETB</span>
                              {dateRow?.rate_date && (
                                <p className="text-xs text-slate-400 mt-0.5">{new Date(dateRow.rate_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                              <span className="w-16 text-center">Buy</span>
                              <span className="w-16 text-center">Sell</span>
                            </div>
                          </div>
                          {trans && (
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-slate-500 font-medium">Transactional</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-slate-900 w-16 text-center" style={{fontSize:'13px'}}>{Number(trans.buying_rate).toFixed(4)}</span>
                                <span className="font-mono font-black text-slate-900 w-16 text-center" style={{fontSize:'13px'}}>{Number(trans.selling_rate).toFixed(4)}</span>
                              </div>
                            </div>
                          )}
                          {cash && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500 font-medium">Cash</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-600 w-16 text-center" style={{fontSize:'13px'}}>{Number(cash.buying_rate).toFixed(4)}</span>
                                <span className="font-mono text-slate-600 w-16 text-center" style={{fontSize:'13px'}}>{Number(cash.selling_rate).toFixed(4)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-slate-400 text-sm">FX rates for this institution are not yet available.</p>
                  </div>
                )}
              </div>
            )}

            {/* INSTITUTION DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-900" style={{ fontSize: '17px' }}>Institution Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">Contact and regulatory information</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {[
                  { icon: Building2, label: 'Full name', value: inst.name },
                  { icon: CreditCard, label: 'NBE licence', value: inst.nbe_licence_number ?? '—' },
                  { icon: Calendar, label: 'Licence date', value: fmtDate(inst.nbe_licence_date) },
                  { icon: MapPin, label: 'HQ region', value: inst.hq_region ?? '—' },
                  { icon: Phone, label: 'Phone', value: inst.phone ?? '—' },
                  { icon: Mail, label: 'Email', value: inst.email ?? '—' },
                ].map(item => (
                  <div key={item.label} className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eff6ff' }}>
                      <item.icon size={15} style={{ color: '#1D4ED8' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5 break-all">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {inst.website_url && (
                <div className="px-6 py-4 border-t border-slate-100">
                  <a href={inst.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold transition-colors hover:underline" style={{ color: '#1D4ED8' }}>
                    <Globe size={14} /> {inst.website_url.replace('https://','').replace('http://','').replace('www.','')}
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT — 1/3 */}
          <div className="space-y-6">

            {/* DIGITAL SERVICES — banks */}
            {digital && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Digital Services</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { icon: Smartphone, label: 'Mobile banking app', value: digital.has_mobile_app },
                    { icon: Wifi, label: 'Internet banking', value: digital.has_internet_banking },
                    { icon: CreditCard, label: 'USSD (*) banking', value: digital.has_ussd },
                    { icon: Globe, label: 'SWIFT transfers', value: digital.has_swift },
                  ].map(d => (
                    <div key={d.label} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <d.icon size={13} className="text-slate-400" />
                        <span className="text-sm text-slate-600">{d.label}</span>
                      </div>
                      <span className="text-xs font-bold rounded-full px-2 py-0.5"
                        style={d.value ? { background:'#dcfce7', color:'#16a34a' } : { background:'#f1f5f9', color:'#64748b' }}>
                        {d.value ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))}
                  {digital.app_store_rating && (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-600">App store rating</span>
                      <span className="font-bold text-slate-700 text-sm">{Number(digital.app_store_rating).toFixed(1)} / 5.0</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ESX CARD */}
            {security && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">ESX Listed Security</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {[
                    { label: 'Ticker', value: security.ticker ?? '—' },
                    { label: 'Last price', value: security.last_price_etb ? 'ETB ' + Number(security.last_price_etb).toFixed(2) : '—' },
                    { label: 'P/E ratio', value: security.pe_ratio ? Number(security.pe_ratio).toFixed(1) : '—' },
                    { label: 'Dividend yield', value: security.dividend_yield_pct ? Number(security.dividend_yield_pct).toFixed(2) + '%' : '—' },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{s.label}</span>
                      <span className="font-mono font-bold text-slate-800">{s.value}</span>
                    </div>
                  ))}
                  <Link href={`/birrbank/markets/${security.ticker?.toLowerCase()}`}
                    className="flex items-center justify-center gap-2 w-full font-bold rounded-xl text-xs mt-2 transition-all"
                    style={{ background: '#1D4ED8', color: '#fff', padding: '10px 16px' }}>
                    View on ESX <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            )}

            {/* DISCLAIMER */}
            <div className="rounded-2xl p-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p className="text-xs font-bold text-amber-800 mb-1">Data disclaimer</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                All data is sourced from official NBE publications and institution websites. For comparison purposes only. Always verify directly with the institution.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* RELATED INSTITUTIONS */}
      {related.length > 0 && (
        <section style={{ background: '#f8fafc', padding: '80px 0', borderTop: '1px solid #e2e8f0' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1D4ED8' }}>More like this</p>
                <h2 className="font-serif font-bold text-slate-950"
                  style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', letterSpacing: '-0.5px' }}>
                  Related institutions
                </h2>
              </div>
              <Link href={`/birrbank/institutions?type=${inst.type}`} className="flex items-center gap-1 text-sm font-bold transition-colors" style={{ color: '#1D4ED8' }}>
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <Link key={r.slug} href={`/birrbank/institutions/${r.slug}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden">
                  <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                  <div className="p-5">
                    <p className="font-bold text-slate-900 text-sm mb-2 group-hover:text-blue-700 transition-colors leading-snug">{r.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{r.nbe_licence_date ? new Date(r.nbe_licence_date).getFullYear() : '—'}</span>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DARK CTA */}
      <section style={{ background: '#0f172a', padding: '72px 0', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#93c5fd' }}>Compare further</p>
            <h3 className="font-serif font-bold mb-2"
              style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: '#ffffff', letterSpacing: '-0.5px' }}>
              See how {inst.name} compares.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.75, maxWidth: 440 }}>
              BirrBank ranks every institution by rates, digital services and regulatory standing — all on one comparison page.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/birrbank/banking/savings-rates"
              className="font-bold rounded-full text-center transition-all"
              style={{ fontSize: 14, padding: '14px 28px', background: '#1D4ED8', color: '#fff' }}>
              Compare savings rates
            </Link>
            <Link href="/birrbank/institutions"
              className="font-bold rounded-full text-center transition-all"
              style={{ fontSize: 14, padding: '14px 28px', border: '1.5px solid #334155', color: '#94a3b8' }}>
              All institutions
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
