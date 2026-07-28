import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Send Money to Ethiopia — Cheapest Remittance Routes Compared | BirrBank',
  description: 'Compare fees, exchange rates and transfer speeds for sending money to Ethiopia across all major diaspora corridors.',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function fmtETB(val: number | null | undefined) {
  if (val == null) return '—'
  return 'ETB ' + Number(val).toLocaleString('en-ET')
}

interface TransferRow {
  id: string
  institution_slug: string
  institutions: { name: string }[] | null
  notes: string | null
  destination_countries: string[] | null
  fee_percentage: number | null
  min_amount_etb: number | null
  max_amount_etb: number | null
  processing_hours: number | null
  last_verified_date: string | null
}
interface AgencyRow {
  slug: string
  name: string
  headquarters: string | null
}

export default async function MoneyTransferPage() {
  const supabase = createBirrBankAdminClient()
  const [transferRes, agencyCountRes, agenciesRes] = await Promise.all([
    supabase.schema('birrbank').from('transfer_services').select('*, institutions(name)').eq('is_current',true).order('fee_percentage',{ascending:true}),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','money_transfer'),
    supabase.schema('birrbank').from('institutions').select('slug,name,headquarters').eq('type','money_transfer').eq('is_active',true).order('name'),

  ])
  const transfers: TransferRow[] = transferRes.data ?? []
  const agencyCount = agencyCountRes.count ?? 0
  const agencies: AgencyRow[] = agenciesRes.data ?? []
  // Build slug->verified date map from fee table
  const transferDateMap: Record<string, string> = {}
  // Slugs already shown in fee table — exclude from agencies list
  const feeTableSlugs = new Set(transfers.map((t) => t.institution_slug))
  // Normalised names from fee table — catches slug mismatches (e.g. western-union vs western-union-ethiopia)
  // feeTableSlugs used for badge display in agencies list
  for (const t of transfers) {
    if (t.institution_slug && t.last_verified_date && !transferDateMap[t.institution_slug]) {
      transferDateMap[t.institution_slug] = new Date(t.last_verified_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    }
  }

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background:'#1C7C4C' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#ffffff', border:'1px solid rgba(29,78,216,0.3)' }}>
            Banking — Money Transfer
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Send money to Ethiopia — cheapest remittance routes compared.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Compare fees, exchange rates and transfer speeds from Western Union, MoneyGram, Wise, Dahabshiil and direct bank transfers across all major diaspora corridors.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/fx-rates"
              className="hero-btn hero-btn-primary">
              Check FX rates
            </Link>
            <Link href="/birrbank/diaspora/remittance"
              className="hero-btn hero-btn-secondary">
              Diaspora hub
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:String(transfers.length || agencyCount), label:'Transfer services tracked' },
              { value:String(agencyCount), label:'Registered agencies' },
              { value:'NBE', label:'Regulatory authority' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSFER TABLE */}
      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Live data</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-0.5px' }}>
            Remittance services — fee comparison.
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 110px 130px 110px 130px 110px', padding:'13px 24px', background:'#F4F5F3' }}>
              {['Service','Fee %','Min amount','Max amount','Processing','Verified'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {transfers.length > 0 ? transfers.map((t, i) => (
              <div key={t.id} className={'border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-blue-50' : 'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-start"
                  style={{ gridTemplateColumns:'1fr 110px 130px 110px 130px 110px', padding:i===0?'18px 24px':'14px 24px' }}>
                  <div>
                    <Link href={`/birrbank/institutions/${t.institution_slug}`} className={'font-bold hover:underline ' + (i===0 ? 'text-blue-900' : 'text-slate-800')} style={{ fontSize:i===0?'15px':'14px' }}>
                      {t.institutions?.[0]?.name ?? t.institution_slug}
                    </Link>
                    {t.notes && <p className="text-xs text-slate-400 mt-0.5">{t.notes}</p>}
                    {t.destination_countries && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.destination_countries.slice(0,5).map((c: string) => (
                          <span key={c} className="text-xs rounded px-1.5 py-0.5" style={{ background:'#F4F5F3', color:'#5B6472' }}>{c}</span>
                        ))}
                        {t.destination_countries.length > 5 && <span className="text-xs text-slate-400">+{t.destination_countries.length-5} more</span>}
                      </div>
                    )}
                  </div>
                  <p className={'font-mono font-black ' + (i===0 ? 'text-blue-700' : 'text-slate-800')} style={{ fontSize:i===0?'22px':'16px', letterSpacing:'-0.5px' }}>
                    {t.fee_percentage ? Number(t.fee_percentage).toFixed(2)+'%' : '—'}
                  </p>
                  <p className="font-mono text-slate-600 text-sm">{fmtETB(t.min_amount_etb)}</p>
                  <p className="font-mono text-slate-600 text-sm">{fmtETB(t.max_amount_etb)}</p>
                  <p className="text-sm text-slate-500">{t.processing_hours ? t.processing_hours+(t.processing_hours===1?' hour':' hours') : '—'}</p>
                  <p className="text-xs text-slate-400">{fmtDate(t.last_verified_date)}</p>
                </div>
                <div className="sm:hidden" style={{ padding:'14px 16px' }}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <Link href={`/birrbank/institutions/${t.institution_slug}`} className="font-bold text-slate-800 text-sm hover:underline">{t.institutions?.[0]?.name ?? t.institution_slug}</Link>
                    <p className="font-mono font-bold text-slate-800 shrink-0">{t.fee_percentage ? Number(t.fee_percentage).toFixed(2)+'%' : '—'}</p>
                  </div>
                  <p className="text-xs text-slate-400">{t.processing_hours ? t.processing_hours+'h processing' : '—'} · {fmtETB(t.min_amount_etb)} min</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center"><p className="text-slate-500 text-sm">Transfer service data is being verified. Check back soon.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Fees sourced from official service websites · For comparison only · Sorted by fee (low to high)</p>
              <Link href="/birrbank/diaspora/remittance" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>Full remittance comparison →</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 text-center leading-relaxed">
            Transfer fees and exchange rates may vary. Always check the actual cost at the point of transfer. BirrBank is not a money transfer service.
          </p>

          {/* Remaining agencies without fee data */}
          {agencies.length > 0 && (() => {
            if (agencies.length === 0) return null
            return (
              <div className="mt-12">
                <h3 className="font-bold text-slate-950 mb-2" style={{ fontSize:'clamp(18px, 2vw, 24px)', letterSpacing:'-0.5px' }}>
                  All {agencies.length} NBE-licensed money transfer agencies
                </h3>
                <p className="text-slate-500 mb-6" style={{ fontSize:'13px' }}>Click any agency to view their full profile. Fee comparison data above covers international remittance services.</p>
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                  {agencies.map((ag, i) => (
                    <Link key={ag.slug} href={`/birrbank/institutions/${ag.slug}`}
                      className="flex items-center justify-between hover:bg-slate-50 transition-colors"
                      style={{ padding:'12px 24px', borderBottom: i < agencies.length - 1 ? '1px solid #F4F5F3' : 'none' }}>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800" style={{ fontSize:'14px' }}>{ag.name}</span>
                        {ag.headquarters && <span className="text-xs text-slate-400 hidden sm:inline">{ag.headquarters}</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {feeTableSlugs.has(ag.slug) ? (
                          <span className="text-xs font-semibold" style={{ color: '#1C7C4C' }}>Rates compared above</span>
                        ) : transferDateMap[ag.slug] ? (
                          <span className="text-xs font-semibold text-emerald-600">Verified {transferDateMap[ag.slug]}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Rate not yet available</span>
                        )}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B6472" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </section>



      {/* GUIDE */}
      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Sending guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            How to find the cheapest remittance route.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Compare total cost, not just the fee', body:'The fee percentage is only part of the cost. The exchange rate margin — the difference between the mid-market rate and the rate you receive — is often the larger cost, especially on large transfers. Always calculate the total ETB received.' },
              { step:'02', title:'Processing speed vs cost tradeoff', body:'Instant transfers cost more. Bank SWIFT transfers take 24-48 hours but are cheaper for large amounts. Wise offers near-mid-market rates with 24-hour delivery. Match the service to your urgency.' },
              { step:'03', title:'Corridor differences matter', body:'Fees and rates vary significantly by sending country. The US-to-Ethiopia corridor is highly competitive. The UK and Scandinavia corridors are best served by Dahabshiil. Gulf corridors favour Western Union and MoneyGram.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
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

      {/* DARK TRUST */}
      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Source transparency</p>
            <h3 className="font-bold mb-2"
              style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Fee data sourced directly from official service websites.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank does not receive referral fees from any money transfer operator. Every ranking is based solely on the fee percentage and exchange rate margin.
            </p>
          </div>
          <Link href="/birrbank/diaspora/remittance"
            className="font-bold rounded-full transition-all shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            Full diaspora hub
          </Link>
        </div>
      </section>

      {/* EMAIL */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Fee changes, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly digest of remittance fee changes and ETB exchange rate movements for diaspora senders.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>

    </main>
  )
}
