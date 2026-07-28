import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import RateTypeToggle from '@/components/RateTypeToggle'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ethiopian FX Rates — NBE Official vs All Banks | BirrBank',
  description: 'Compare official NBE indicative FX rates against per-bank buying and selling rates for USD, EUR, GBP, SAR and AED vs ETB.',
}

const CURRENCY_NAMES: Record<string, string> = {
  USD:'US Dollar', GBP:'Pound Sterling', EUR:'Euro', SAR:'Saudi Riyal',
  AED:'UAE Dirham', CNY:'Chinese Yuan', INR:'Indian Rupee', CHF:'Swiss Franc',
  JPY:'Japanese Yen', CAD:'Canadian Dollar', AUD:'Australian Dollar',
  KES:'Kenyan Shilling', DJF:'Djibouti Franc', DKK:'Danish Krone',
  NOK:'Norwegian Krone', SEK:'Swedish Krona', KWD:'Kuwaiti Dinar',
  ZAR:'South African Rand',
}

function fmt(val: number | null) {
  if (val == null) return '\u2014'
  return Number(val).toFixed(4)
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

interface NbeRow {
  currency_code: string
  buying_rate: number
  selling_rate: number
  weighted_average: number
  rate_date: string
}
interface BankMapRow {
  bank: string
  slug: string
  verified: string
  [key: string]: string
}

export default async function FxRatesPage({ searchParams }: { searchParams: { type?: string } }) {
  const { type } = searchParams
  const rateType = type === 'cash' ? 'cash' : 'transactional'
  const supabase = createBirrBankAdminClient()

  const [nbeRes, bankRatesRes, instRes] = await Promise.all([
    supabase.schema('birrbank').from('exchange_rates')
      .select('currency_code, buying_rate, selling_rate, weighted_average, rate_date')
      .eq('institution_slug', 'nbe')
      .order('rate_date', { ascending: false })
      .order('currency_code')
      .limit(40),
    supabase.schema('birrbank').from('exchange_rates')
      .select('institution_slug, currency_code, buying_rate, selling_rate, rate_date, rate_type')
      .neq('institution_slug', 'nbe')
      .order('rate_date', { ascending: false })
      .in('currency_code', ['USD','EUR','GBP'])
      .limit(400),
    supabase.schema('birrbank').from('institutions')
      .select('slug, name')
      .eq('is_active', true),
  ])

  // Build slug -> name lookup
  const instNames: Record<string, string> = {}
  for (const inst of (instRes.data ?? [])) {
    instNames[inst.slug] = inst.name
  }

  // Dedupe NBE — one per currency (most recent)
  const nbeMap: Record<string, NbeRow> = {}
  const nbeRows: NbeRow[] = nbeRes.data ?? []
  for (const r of nbeRows) {
    if (!nbeMap[r.currency_code]) nbeMap[r.currency_code] = r
  }
  const CURRENCY_ORDER = ['USD','EUR','GBP','SAR','AED','CAD','AUD','CHF','CNY','KWD','NOK','SEK','DKK','KES','DJF','INR','ZAR','JPY']
  const NBE_RATES = Object.values(nbeMap).sort((a, b) => {
    const ai = CURRENCY_ORDER.indexOf(a.currency_code)
    const bi = CURRENCY_ORDER.indexOf(b.currency_code)
    if (ai === -1 && bi === -1) return a.currency_code.localeCompare(b.currency_code)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  const nbeDate = NBE_RATES[0]?.rate_date ?? null

  // Dedupe bank rates — filter by selected rateType, fallback to other type
  const bankMap: Record<string, BankMapRow> = {}
  for (const r of (bankRatesRes.data ?? []) as (NbeRow & { institution_slug: string; rate_type?: string })[]) {
    if ((r.rate_type ?? 'transactional') !== rateType) continue
    const slug = r.institution_slug
    if (!bankMap[slug]) bankMap[slug] = { bank: instNames[slug] ?? slug, slug, verified: formatDate(r.rate_date) }
    const prefix = r.currency_code.toLowerCase()
    if (!bankMap[slug][prefix + '_buy']) {
      bankMap[slug][prefix + '_buy'] = fmt(r.buying_rate)
      bankMap[slug][prefix + '_sell'] = fmt(r.selling_rate)
    }
  }
  // Fill gaps with the other rate type
  const fallbackType = rateType === 'transactional' ? 'cash' : 'transactional'
  for (const r of (bankRatesRes.data ?? []) as (NbeRow & { institution_slug: string; rate_type?: string })[]) {
    if ((r.rate_type ?? 'transactional') !== fallbackType) continue
    const slug = r.institution_slug
    if (!bankMap[slug]) bankMap[slug] = { bank: instNames[slug] ?? slug, slug, verified: formatDate(r.rate_date) }
    const prefix = r.currency_code.toLowerCase()
    if (!bankMap[slug][prefix + '_buy']) {
      bankMap[slug][prefix + '_buy'] = fmt(r.buying_rate)
      bankMap[slug][prefix + '_sell'] = fmt(r.selling_rate)
    }
  }
  const BANK_RATES = Object.values(bankMap)

  // Compute best rates per column (best buy = highest, best sell = lowest)
  const parseNum = (v: string | undefined) => v && v !== '\u2014' ? parseFloat(v) : null
  const bestUsdBuy  = Math.max(...BANK_RATES.map((r) => parseNum(r.usd_buy)  ?? -Infinity))
  const bestUsdSell = Math.min(...BANK_RATES.map((r) => parseNum(r.usd_sell) ?? Infinity))
  const bestEurBuy  = Math.max(...BANK_RATES.map((r) => parseNum(r.eur_buy)  ?? -Infinity))
  const bestEurSell = Math.min(...BANK_RATES.map((r) => parseNum(r.eur_sell) ?? Infinity))
  const bestGbpBuy  = Math.max(...BANK_RATES.map((r) => parseNum(r.gbp_buy)  ?? -Infinity))
  const bestGbpSell = Math.min(...BANK_RATES.map((r) => parseNum(r.gbp_sell) ?? Infinity))

  // Most recent bank scraper date for display
  const bankRows = (bankRatesRes.data ?? []) as (NbeRow & { institution_slug: string; rate_type?: string })[]
  const bankDate = bankRows.length > 0
    ? formatDate(bankRows.reduce((latest, r) =>
        r.rate_date > latest.rate_date ? r : latest
      ).rate_date)
    : null

  const nbeUSD = nbeMap['USD'], nbeEUR = nbeMap['EUR'], nbeGBP = nbeMap['GBP']
  const nbeRow = [
    fmt(nbeUSD?.buying_rate ?? null), fmt(nbeUSD?.selling_rate ?? null),
    fmt(nbeEUR?.buying_rate ?? null), fmt(nbeEUR?.selling_rate ?? null),
    fmt(nbeGBP?.buying_rate ?? null), fmt(nbeGBP?.selling_rate ?? null),
  ]

  const displayDate = nbeDate
    ? new Date(nbeDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Banking &#8212; FX Rates
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
            Ethiopian FX rates &#8212; NBE official &amp; all banks.
          </h1>
          <p className="text-white/65 mb-10" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '520px' }}>
            The National Bank of Ethiopia publishes indicative rates daily at 09:30 EAT. All rates are ETB per 1 foreign currency unit.
          </p>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value: String(NBE_RATES.length), label: 'Currencies tracked' },
              { value: 'Daily', label: 'NBE update frequency' },
              { value: String(BANK_RATES.length || 0), label: 'Banks with FX data' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN RATES TABLE */}
      <section style={{ background: '#ffffff', padding: '64px 0 80px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* NBE TABLE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1C7C4C' }}>Live data</p>
              <h2 className="font-bold text-slate-950" style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', letterSpacing: '-0.5px' }}>
                NBE indicative rates
              </h2>
              <p className="text-slate-500 mt-1" style={{ fontSize: '13px' }}>Official weighted average published by the National Bank of Ethiopia</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs font-bold text-slate-600 bg-slate-100 rounded-full px-3 py-1.5">
                {displayDate}
              </span>
            </div>
          </div>

          {NBE_RATES.length > 0 ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
              <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#F4F5F3', borderBottom: '1px solid #E4E6E3' }}>
                    <th className="text-left text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 20px' }}>Currency</th>
                    <th className="text-left text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell" style={{ padding: '12px 16px' }}>Code</th>
                    <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 20px' }}>Buying (ETB)</th>
                    <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 20px' }}>Selling (ETB)</th>
                    <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest hidden md:table-cell" style={{ padding: '12px 20px' }}>Weighted Avg</th>
                    <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest hidden md:table-cell" style={{ padding: '12px 20px' }}>Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {NBE_RATES.map((r, i) => {
                    const spread = r.buying_rate && r.selling_rate
                      ? (Number(r.selling_rate) - Number(r.buying_rate)).toFixed(4)
                      : '\u2014'
                    return (
                      <tr key={r.currency_code}
                        style={{ borderBottom: i < NBE_RATES.length - 1 ? '1px solid #F4F5F3' : 'none', background: i % 2 === 0 ? '#ffffff' : '#F4F5F3' }}>
                        <td style={{ padding: '13px 20px' }}>
                          <span className="font-semibold text-slate-800" style={{ fontSize: '14px' }}>
                            {CURRENCY_NAMES[r.currency_code] ?? r.currency_code}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell" style={{ padding: '13px 16px' }}>
                          <span className="font-mono font-black text-xs rounded px-2 py-0.5" style={{ background: '#1C7C4C', color: '#fff' }}>
                            {r.currency_code}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 20px' }}>
                          <span className="font-mono font-bold text-slate-700" style={{ fontSize: '14px' }}>{fmt(r.buying_rate)}</span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 20px' }}>
                          <span className="font-mono font-black text-slate-950" style={{ fontSize: '15px' }}>{fmt(r.selling_rate)}</span>
                        </td>
                        <td className="text-right hidden md:table-cell" style={{ padding: '13px 20px' }}>
                          <span className="font-mono font-semibold text-slate-600" style={{ fontSize: '13px' }}>{fmt(r.weighted_average)}</span>
                        </td>
                        <td className="text-right hidden md:table-cell" style={{ padding: '13px 20px' }}>
                          <span className="font-mono text-slate-400" style={{ fontSize: '13px' }}>{spread}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100" style={{ background: '#F4F5F3', padding: '12px 20px' }}>
                <p className="text-xs text-slate-400">Source: National Bank of Ethiopia &#8212; nbe.gov.et</p>
                <p className="text-xs text-slate-400">All rates ETB per 1 foreign unit</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 text-center py-12">
              <p className="text-slate-500 text-sm">NBE rates are published at 09:30 EAT each business day.</p>
            </div>
          )}

          {/* BANK COMPARISON TABLE */}
          <div className="mt-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1C7C4C' }}>Compare banks</p>
                <h2 className="font-bold text-slate-950" style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', letterSpacing: '-0.5px' }}>
                  USD, EUR &amp; GBP &#8212; all banks compared
                </h2>
                <p className="text-slate-500 mt-1" style={{ fontSize: '13px' }}>Sell rate is what you pay when buying foreign currency. Buy rate is what you receive when selling.</p>
                <RateTypeToggle rateType={rateType} />
              </div>
              {bankDate && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 rounded-full px-3 py-1.5">
                    {bankDate}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: '#F4F5F3', borderBottom: '1px solid #E4E6E3' }}>
                      <th className="text-left text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 20px', minWidth: 180 }}>Bank</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>USD Buy</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>USD Sell</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>EUR Buy</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>EUR Sell</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>GBP Buy</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>GBP Sell</th>
                      <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest" style={{ padding: '12px 16px' }}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* NBE reference row */}
                    <tr style={{ background: '#E9F5EE', borderBottom: '2px solid #BFE3CC' }}>
                      <td style={{ padding: '13px 20px' }}>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs rounded-full px-2 py-0.5" style={{ background: '#1C7C4C', color: '#fff' }}>NBE</span>
                          <span className="font-bold text-green-dark" style={{ fontSize: '13px' }}>Official NBE Indicative</span>
                        </div>
                      </td>
                      {nbeRow.map((v, i) => (
                        <td key={i} className="text-right" style={{ padding: '13px 16px' }}>
                          <span className="font-mono font-bold text-green-dark" style={{ fontSize: '14px' }}>{v}</span>
                        </td>
                      ))}
                      <td className="text-right" style={{ padding: '13px 16px' }}>
                        <span className="text-xs font-bold text-green">Daily</span>
                      </td>
                    </tr>
                    {BANK_RATES.length > 0 ? BANK_RATES.map((r, i) => {
                      const isBestUsdBuy  = parseNum(r.usd_buy)  === bestUsdBuy
                      const isBestUsdSell = parseNum(r.usd_sell) === bestUsdSell
                      const isBestEurBuy  = parseNum(r.eur_buy)  === bestEurBuy
                      const isBestEurSell = parseNum(r.eur_sell) === bestEurSell
                      const isBestGbpBuy  = parseNum(r.gbp_buy)  === bestGbpBuy
                      const isBestGbpSell = parseNum(r.gbp_sell) === bestGbpSell
                      const bestCell = { background: '#f0fdf4', color: '#15803d', fontWeight: 800 }
                      const normalBuyCell  = { color: '#5B6472', fontWeight: 400 }
                      const normalSellCell = { color: '#1C7C4C', fontWeight: 700 }
                      return (
                      <tr key={r.slug} style={{ borderBottom: '1px solid #F4F5F3', background: i % 2 === 0 ? '#ffffff' : '#F4F5F3' }}>
                        <td style={{ padding: '13px 20px' }}>
                          <Link href={`/birrbank/institutions/${r.slug}`} className="font-semibold text-slate-800 hover:text-green-dark transition-colors" style={{ fontSize: '14px' }}>
                            {r.bank}
                          </Link>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px', ...(isBestUsdBuy ? { background: '#f0fdf4' } : {}) }}>
                          <span className="font-mono" style={{ fontSize: '13px', ...(isBestUsdBuy ? bestCell : normalBuyCell) }}>
                            {r.usd_buy ?? '\u2014'}{isBestUsdBuy && <span className="ml-1 text-xs" style={{ color: '#16a34a' }}>&#9650;</span>}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px', ...(isBestUsdSell ? { background: '#f0fdf4' } : {}) }}>
                          <span className="font-mono" style={{ fontSize: '14px', ...(isBestUsdSell ? bestCell : normalSellCell) }}>
                            {r.usd_sell ?? '\u2014'}{isBestUsdSell && <span className="ml-1 text-xs" style={{ color: '#16a34a' }}>&#9660;</span>}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px', ...(isBestEurBuy ? { background: '#f0fdf4' } : {}) }}>
                          <span className="font-mono" style={{ fontSize: '13px', ...(isBestEurBuy ? bestCell : normalBuyCell) }}>
                            {r.eur_buy ?? '\u2014'}{isBestEurBuy && <span className="ml-1 text-xs" style={{ color: '#16a34a' }}>&#9650;</span>}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px', ...(isBestEurSell ? { background: '#f0fdf4' } : {}) }}>
                          <span className="font-mono" style={{ fontSize: '14px', ...(isBestEurSell ? bestCell : normalSellCell) }}>
                            {r.eur_sell ?? '\u2014'}{isBestEurSell && <span className="ml-1 text-xs" style={{ color: '#16a34a' }}>&#9660;</span>}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px', ...(isBestGbpBuy ? { background: '#f0fdf4' } : {}) }}>
                          <span className="font-mono" style={{ fontSize: '13px', ...(isBestGbpBuy ? bestCell : normalBuyCell) }}>
                            {r.gbp_buy ?? '\u2014'}{isBestGbpBuy && <span className="ml-1 text-xs" style={{ color: '#16a34a' }}>&#9650;</span>}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px', ...(isBestGbpSell ? { background: '#f0fdf4' } : {}) }}>
                          <span className="font-mono" style={{ fontSize: '14px', ...(isBestGbpSell ? bestCell : normalSellCell) }}>
                            {r.gbp_sell ?? '\u2014'}{isBestGbpSell && <span className="ml-1 text-xs" style={{ color: '#16a34a' }}>&#9660;</span>}
                          </span>
                        </td>
                        <td className="text-right" style={{ padding: '13px 16px' }}><span className="text-xs text-slate-400">{r.verified}</span></td>
                      </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan={8} className="text-center py-10">
                          <p className="text-sm text-slate-400">Per-bank rates are updated daily. Check back soon.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100" style={{ background: '#F4F5F3', padding: '12px 20px' }}>
                <p className="text-xs text-slate-400">Showing {rateType} rates &#8212; NBE rate from nbe.gov.et &#8212; All rates ETB per 1 foreign unit</p>
                <Link href="/birrbank/institutions?type=bank" className="text-xs font-bold shrink-0" style={{ color: '#1C7C4C' }}>View all bank profiles &#8594;</Link>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">FX rates for comparison only. Confirm with the institution before any currency exchange.</p>
          </div>
        </div>
      </section>

      {/* EMAIL CAPTURE */}
      <section style={{ background:'#F4F5F3', padding:'96px 0', borderTop: '1px solid #E4E6E3' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(28px, 3vw, 40px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Track ETB exchange rates from anywhere in the world.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly FX digest for diaspora and businesses. Know when the rate moves before you transfer.
            </p>
          </div>
          <EmailCapture />
        </div>
      </section>

    </main>
  )
}
