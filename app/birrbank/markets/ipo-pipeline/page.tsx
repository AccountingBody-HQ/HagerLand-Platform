import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ethiopian IPO Pipeline — All ECMA Prospectuses Tracked | BirrBank',
  description: 'Track every IPO prospectus under ECMA review in Ethiopia — from announcement to ESX listing.',
}

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  announced:  { bg:'#f1f5f9', color:'#475569', dot:'#94a3b8' },
  review:     { bg:'#fef3c7', color:'#92400e', dot:'#f59e0b' },
  approved:   { bg:'#dbeafe', color:'#1D4ED8', dot:'#1D4ED8' },
  open:       { bg:'#dcfce7', color:'#166534', dot:'#22c55e' },
  priced:     { bg:'#ede9fe', color:'#5b21b6', dot:'#7c3aed' },
  listed:     { bg:'#d1fae5', color:'#065f46', dot:'#10b981' },
  withdrawn:  { bg:'#fee2e2', color:'#991b1b', dot:'#ef4444' },
}
const STATUS_LABELS: Record<string, string> = {
  announced:'Announced', review:'Under review', approved:'Approved',
  open:'Subscription open', priced:'Priced', listed:'Listed', withdrawn:'Withdrawn',
}

function fmtDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
function fmtAmount(val: number | null | undefined) {
  if (val == null) return '—'
  const b = Number(val)/1e9
  return b >= 1 ? 'ETB '+b.toFixed(1)+'B' : 'ETB '+(Number(val)/1e6).toFixed(0)+'M'
}

interface IpoPipelineRow {
  id: string
  company_name: string
  sector: string | null
  total_raise_etb: number | null
  lead_manager: string | null
  status: string
  // description/expected_listing_date are referenced in the original BirrBank
  // JSX below but aren't actual columns (schema has "notes" and
  // "expected_listing", not these names) — kept optional to match existing
  // behavior (renders the fallback) rather than silently changing the query.
  description?: string
  expected_listing_date?: string
}

export default async function IpoPipelinePage() {
  const supabase = createBirrBankAdminClient()
  const [ipoRes, countRes] = await Promise.all([
    supabase.schema('birrbank').from('ipo_pipeline').select('*').neq('status','withdrawn').order('status').order('company_name'),
    supabase.schema('birrbank').from('ipo_pipeline').select('count',{count:'exact',head:true}).neq('status','listed').neq('status','withdrawn'),
  ])
  const ipos: IpoPipelineRow[] = ipoRes.data ?? []
  const pipelineCount = countRes.count ?? 0
  const activeCount = ipos.filter((i) => i.status === 'open' || i.status === 'approved').length

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden" style={{ background:'#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/birrbank/markets" className="hover:text-slate-300 transition-colors">Markets</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">IPO Pipeline</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#93c5fd', border:'1px solid rgba(29,78,216,0.3)' }}>
            Markets — IPO Pipeline
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Ethiopian IPO pipeline — every ECMA prospectus tracked.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Every company that has filed a prospectus with the Ethiopian Capital Markets Authority — from initial announcement through to ESX listing.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/markets/equities" className="hero-btn hero-btn-primary">
              View listed equities
            </Link>
            <Link href="/birrbank/markets/how-to-invest" className="hero-btn hero-btn-secondary">
              How to invest
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:String(pipelineCount)+'+', label:'In pipeline' },
              { value:String(activeCount), label:'Active subscriptions' },
              { value:'ECMA', label:'Regulatory authority' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-6" style={{ color:'#1D4ED8' }}>ECMA filings</p>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 160px 130px 150px 120px 150px', padding:'13px 24px', background:'#f8fafc' }}>
              {['Company','Sector','Total raise','Lead manager','Expected date','Status'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {ipos.length > 0 ? ipos.map((ipo) => {
              const ss = STATUS_STYLES[ipo.status] ?? STATUS_STYLES['announced']
              return (
                <div key={ipo.id} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <div className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns:'1fr 160px 130px 150px 120px 150px', padding:'14px 24px' }}>
                    <div>
                      <p className="font-bold text-slate-800" style={{ fontSize:'14px' }}>{ipo.company_name}</p>
                      {ipo.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ipo.description}</p>}
                    </div>
                    <p className="text-sm text-slate-500">{ipo.sector ?? '—'}</p>
                    <p className="font-mono text-sm text-slate-600">{fmtAmount(ipo.total_raise_etb)}</p>
                    <p className="text-sm text-slate-500">{ipo.lead_manager ?? '—'}</p>
                    <p className="text-sm text-slate-500">{fmtDate(ipo.expected_listing_date)}</p>
                    <span className="text-xs font-bold rounded-full px-3 py-1 inline-flex w-fit items-center gap-1.5"
                      style={{ background:ss.bg, color:ss.color }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:ss.dot }} />
                      {STATUS_LABELS[ipo.status] ?? ipo.status}
                    </span>
                  </div>
                  <div className="sm:hidden" style={{ padding:'14px 16px' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-800 text-sm">{ipo.company_name}</p>
                      <span className="text-xs font-bold rounded-full px-2 py-0.5"
                        style={{ background:ss.bg, color:ss.color }}>
                        {STATUS_LABELS[ipo.status] ?? ipo.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{ipo.sector ?? '—'} · {fmtAmount(ipo.total_raise_etb)} · {ipo.lead_manager ?? '—'}</p>
                  </div>
                </div>
              )
            }) : (
              <div className="py-12 text-center"><p className="text-slate-500 text-sm">IPO pipeline data is being updated. Check back soon.</p></div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: ECMA (Ethiopian Capital Markets Authority) · Updated monthly</p>
              <Link href="/birrbank/markets/how-to-invest" className="text-xs font-bold" style={{ color:'#1D4ED8' }}>How to invest in IPOs →</Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background:'#0f172a', padding:'72px 0', borderTop:'1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#93c5fd' }}>Never miss an IPO</p>
            <h3 className="font-serif font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Get IPO alerts before subscriptions open.
            </h3>
            <p style={{ color:'#94a3b8', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank monitors every ECMA filing and alerts subscribers the moment a subscription period opens.
            </p>
          </div>
          <Link href="/birrbank/markets/equities" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1D4ED8', color:'#fff', whiteSpace:'nowrap' }}>
            View listed equities
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Stay ahead</p>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              IPO alerts, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              New prospectus filings, subscription opening dates and pricing announcements — weekly.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
