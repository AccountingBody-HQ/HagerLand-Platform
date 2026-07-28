import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cheapest Way to Send Money to Ethiopia — All Services Compared | BirrBank',
  description: 'Compare remittance fees, exchange rate margins and transfer speeds across all major diaspora corridors to Ethiopia.',
}

function fmtDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
function fmtETB(val: number | null | undefined) { if (val == null) return '—'; return 'ETB ' + Number(val).toLocaleString('en-ET') }

interface RemittanceTransferRow {
  id: string
  institution_slug: string
  notes: string | null
  destination_countries: string[] | null
  fee_percentage: number | null
  min_amount_etb: number | null
  max_amount_etb: number | null
  processing_hours: number | null
  last_verified_date: string | null
}
interface RemittanceAgencyRow {
  slug: string
  name: string
  headquarters: string | null
}

export default async function RemittancePage() {
  const supabase = createBirrBankAdminClient()
  const [transferRes, agencyCountRes, agenciesRes, instRes] = await Promise.all([
    supabase.schema('birrbank').from('transfer_services').select('*').eq('is_current',true).order('fee_percentage',{ascending:true}),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','money_transfer'),
    supabase.schema('birrbank').from('institutions').select('slug,name,headquarters').eq('type','money_transfer').eq('is_active',true).order('name'),
    supabase.schema('birrbank').from('institutions').select('slug, name').eq('is_active',true),
  ])
  const transfers: RemittanceTransferRow[] = transferRes.data ?? []
  const agencyCount = agencyCountRes.count ?? 0
  const agencies: RemittanceAgencyRow[] = agenciesRes.data ?? []
  const instNames: Record<string, string> = {}
  for (const inst of (instRes.data ?? []) as { slug: string; name: string }[]) { instNames[inst.slug] = inst.name }
  const feeTableSlugs = new Set(transfers.map((t) => t.institution_slug))
  const transferDateMap: Record<string, string> = {}
  for (const t of transfers) {
    if (t.institution_slug && t.last_verified_date && !transferDateMap[t.institution_slug]) {
      transferDateMap[t.institution_slug] = new Date(t.last_verified_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    }
  }

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Diaspora — Remittance
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Cheapest way to send money to Ethiopia — all services compared.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Compare fees, exchange rates and transfer speeds across Western Union, MoneyGram, Wise, Dahabshiil and direct bank SWIFT transfers for all major diaspora corridors.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/fx-rates" className="hero-btn hero-btn-primary">Check ETB rates</Link>
            <Link href="/birrbank/diaspora/bank-account" className="hero-btn hero-btn-secondary">Open a bank account</Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(transfers.length), label:'Services compared' },
              { value:String(agencyCount), label:'Registered agencies' },
              { value:'Free', label:'No referral fees' },
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
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Fee comparison</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-0.5px' }}>
            Remittance services — sorted by fee.
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
              <div key={t.id} className={'border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-green-soft' : 'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-start"
                  style={{ gridTemplateColumns:'1fr 110px 130px 110px 130px 110px', padding:i===0?'18px 24px':'14px 24px' }}>
                  <div>
                    <Link href={`/birrbank/institutions/${t.institution_slug}`} className={'font-bold hover:underline ' + (i===0 ? 'text-green-dark' : 'text-slate-800')} style={{ fontSize:i===0?'15px':'14px' }}>
                      {instNames[t.institution_slug] ?? t.institution_slug}
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
                  <p className={'font-mono font-black ' + (i===0 ? 'text-green-dark' : 'text-slate-800')} style={{ fontSize:i===0?'22px':'16px', letterSpacing:'-0.5px' }}>
                    {t.fee_percentage ? Number(t.fee_percentage).toFixed(2)+'%' : '—'}
                  </p>
                  <p className="font-mono text-slate-600 text-sm">{fmtETB(t.min_amount_etb)}</p>
                  <p className="font-mono text-slate-600 text-sm">{fmtETB(t.max_amount_etb)}</p>
                  <p className="text-sm text-slate-500">{t.processing_hours ? t.processing_hours+(t.processing_hours===1?' hour':' hours') : '—'}</p>
                  <p className="text-xs text-slate-400">{fmtDate(t.last_verified_date)}</p>
                </div>
                <div className="sm:hidden" style={{ padding:'14px 16px' }}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <Link href={`/birrbank/institutions/${t.institution_slug}`} className="font-bold text-slate-800 text-sm hover:underline">{instNames[t.institution_slug] ?? t.institution_slug}</Link>
                    <p className="font-mono font-bold text-slate-800 shrink-0">{t.fee_percentage ? Number(t.fee_percentage).toFixed(2)+'%' : '—'}</p>
                  </div>
                  <p className="text-xs text-slate-400">{t.processing_hours ? t.processing_hours+'h processing' : '—'} · {fmtETB(t.min_amount_etb)} min</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center"><p className="text-slate-500 text-sm">Remittance data is being verified. Check back soon.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Fees sourced from official service websites · For comparison only · Sorted by fee (low to high)</p>
              <Link href="/birrbank/banking/money-transfer" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>Full transfer comparison &#x2192;</Link>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-5 text-center">Transfer fees and exchange rates may vary. Always check the actual cost at the point of transfer. BirrBank is not a money transfer service.</p>

          {agencies.length > 0 && (
            <div className="mt-12">
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#1C7C4C' }}>NBE registry</p>
              <h3 className="font-bold text-slate-950 mb-2" style={{ fontSize:'clamp(18px, 2vw, 24px)', letterSpacing:'-0.5px' }}>
                All {agencyCount} NBE-licensed money transfer agencies
              </h3>
              <p className="text-slate-500 mb-6" style={{ fontSize:'13px' }}>Click any agency to view their full profile.</p>
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
                        <span className="text-xs font-semibold" style={{ color:'#1C7C4C' }}>Rates compared above</span>
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
          )}
        </div>
      </section>

      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Sending guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            How to find the cheapest remittance route.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Compare total cost, not just the fee', body:'The fee percentage is only part of the cost. The exchange rate margin is often the larger cost, especially on large transfers. Always calculate the total ETB your recipient will receive.' },
              { step:'02', title:'Processing speed vs cost tradeoff', body:'Instant transfers cost more. Bank SWIFT transfers take 24-48 hours but are cheaper for large amounts. Wise offers near-mid-market rates with 24-hour delivery. Match the service to your urgency.' },
              { step:'03', title:'Corridor differences matter', body:'Fees and rates vary significantly by sending country. The US corridor is highly competitive. UK and Scandinavia are best served by Dahabshiil. Gulf corridors favour Western Union and MoneyGram.' },
            ].map(s => (
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

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Also track</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Compare the live NBE ETB exchange rate.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              The fee is only part of the cost. The exchange rate margin is often larger. Compare the total ETB received.
            </p>
          </div>
          <Link href="/birrbank/banking/fx-rates" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background: '#ffffff', color: '#1C7C4C', whiteSpace:'nowrap' }}>
            Check ETB rates
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Fee changes, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly digest of remittance fee changes and ETB rate movements for diaspora senders.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
