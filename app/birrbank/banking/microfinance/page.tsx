import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Microfinance Institutions in Ethiopia — All NBE-Licensed MFIs | BirrBank',
  description: 'Every NBE-licensed microfinance institution in Ethiopia — micro-loans, rural finance, agricultural credit and SME lending.',
}

interface MfiRow {
  slug: string
  name: string
  ceo_name: string | null
  address: string | null
  hq_region: string | null
  nbe_licence_number: string | null
  nbe_licence_date: string | null
}

export default async function MicrofinancePage() {
  const supabase = createBirrBankAdminClient()
  const [mfiRes, countRes] = await Promise.all([
    supabase.schema('birrbank').from('institutions').select('*').eq('type','microfinance').eq('is_active',true).order('name'),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','microfinance'),
  ])
  const mfis: MfiRow[] = mfiRes.data ?? []
  const mfiCount = countRes.count ?? 0

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background:'#1C7C4C' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#ffffff', border:'1px solid rgba(29,78,216,0.3)' }}>
            Banking — Microfinance
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Microfinance institutions in Ethiopia — all {mfiCount} NBE-licensed MFIs.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Every NBE-licensed microfinance institution in Ethiopia — micro-loans, rural finance, agricultural credit and SME lending for underserved communities.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/savings-rates"
              className="hero-btn hero-btn-primary">
              Compare savings rates
            </Link>
            <Link href="/birrbank/institutions?type=microfinance"
              className="hero-btn hero-btn-secondary">
              View all MFI profiles
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:String(mfiCount), label:'NBE-licensed MFIs' },
              { value:'NBE', label:'Regulatory authority' },
              { value:'ETB 1K+', label:'Typical minimum loan' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MFI TABLE */}
      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>NBE registry</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-0.5px' }}>
            All {mfiCount} licensed microfinance institutions.
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 180px 140px 130px', padding:'13px 24px', background:'#F4F5F3' }}>
              {['Institution','Address','NBE Licence No','Established'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {mfis.length > 0 ? mfis.map((m, i) => (
              <Link key={m.slug} href={`/birrbank/institutions/${m.slug}`}
                className={'block border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-center" style={{ gridTemplateColumns:'1fr 180px 140px 130px', padding:'14px 24px' }}>
                  <div>
                    <p className={'font-bold ' + (i===0 ? 'text-blue-900' : 'text-slate-800')} style={{ fontSize:'14px' }}>{m.name}</p>
                    {m.ceo_name && <p className="text-xs text-slate-400 mt-0.5">CEO: {m.ceo_name}</p>}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{m.address ?? m.hq_region ?? '—'}</p>
                  <p className="text-sm font-mono text-slate-500">{m.nbe_licence_number ?? '—'}</p>
                  <p className="text-sm text-slate-500">{m.nbe_licence_date ? new Date(m.nbe_licence_date).getFullYear() : '—'}</p>
                </div>
                <div className="sm:hidden" style={{ padding:'13px 16px' }}>
                  <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.nbe_licence_number ?? '—'} · {m.nbe_licence_date ? new Date(m.nbe_licence_date).getFullYear() : '—'}</p>
                </div>
              </Link>
            )) : (
              <div className="py-10 text-center"><p className="text-slate-500 text-sm">MFI directory is being populated. Check back soon.</p></div>
            )}
            <div className="border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Source: NBE registry · nbe.gov.et · {mfiCount} licensed microfinance institutions</p>
            </div>
          </div>
        </div>
      </section>

      {/* GUIDE */}
      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>MFI guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            What microfinance institutions offer.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Who MFIs serve', body:'Microfinance institutions serve individuals and small businesses that cannot access commercial bank credit — smallholder farmers, rural entrepreneurs, women-led businesses and low-income urban households. Loan sizes are typically ETB 1,000 to ETB 500,000.' },
              { step:'02', title:'Loan products available', body:'MFIs offer micro-loans for working capital, agricultural inputs, equipment purchase and housing improvement. Group lending models allow members without traditional collateral to access credit using social guarantee mechanisms.' },
              { step:'03', title:'Savings products', body:'Most NBE-licensed MFIs also offer savings accounts with competitive rates — often higher than commercial banks for small balances. Compulsory savings linked to loans help members build financial discipline and credit history.' },
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
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>NBE licensed only</p>
            <h3 className="font-bold mb-2"
              style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Every MFI verified against the NBE registry.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank only lists microfinance institutions holding a valid licence from the National Bank of Ethiopia. No unlicensed lenders appear on this platform.
            </p>
          </div>
          <Link href="/birrbank/institutions?type=microfinance"
            className="font-bold rounded-full transition-all shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            View all MFI profiles
          </Link>
        </div>
      </section>

      {/* EMAIL */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Microfinance news, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly updates on microfinance rates, new MFI products and NBE regulatory changes affecting the sector.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>

    </main>
  )
}
