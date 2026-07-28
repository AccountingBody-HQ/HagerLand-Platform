import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Open an Ethiopian Bank Account from Abroad | BirrBank',
  description: 'Step-by-step guide to opening a diaspora savings or foreign currency account at Ethiopian commercial banks.',
}

interface BankRow {
  slug: string
  name: string
  swift_code: string | null
  founded_year: number | null
}

export default async function BankAccountPage() {
  const supabase = createBirrBankAdminClient()
  const { data: banksData } = await supabase.schema('birrbank').from('institutions').select('slug, name, swift_code, website_url, founded_year').eq('type','bank').eq('is_active',true).not('swift_code','is',null).order('name')
  const banks: BankRow[] = banksData ?? []

  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden" style={{ background:'#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background:'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} /><Link href="/birrbank/diaspora" className="hover:text-slate-300 transition-colors">Diaspora</Link>
            <ChevronRight size={12} /><span className="text-slate-400">Open a Bank Account</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background:'rgba(29,78,216,0.15)', color:'#93c5fd', border:'1px solid rgba(29,78,216,0.3)' }}>
            Diaspora — Bank Account
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Open an Ethiopian bank account from anywhere in the world.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Step-by-step guide to opening a diaspora savings or foreign currency account at Ethiopian commercial banks — requirements, documents and process explained.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/savings-rates" className="hero-btn hero-btn-primary">
              Compare savings rates
            </Link>
            <Link href="/birrbank/diaspora/invest" className="hero-btn hero-btn-secondary">
              Invest from abroad
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value:'4', label:'Steps to open an account' },
              { value:String(banks.length), label:'Banks with SWIFT capability' },
              { value:'Remote', label:'Account opening available' },
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
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Step by step</p>
          <h2 className="font-serif font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            How to open a diaspora account.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              { step:'01', title:'Choose your bank', body:'Select a commercial bank with SWIFT capability. Awash Bank, CBE and Dashen Bank all offer diaspora accounts with competitive USD and ETB rates.' },
              { step:'02', title:'Gather your documents', body:'You will need a valid passport, proof of address abroad, Ethiopian origin documentation (if applicable) and a minimum initial deposit amount.' },
              { step:'03', title:'Apply in person or remotely', body:'Most banks require an in-person visit or a visit by a designated representative in Ethiopia. Some banks accept notarised documents sent from abroad.' },
              { step:'04', title:'Fund and activate', body:'Transfer your initial deposit via SWIFT. Once received, your account is activated and you can manage it online or through the bank mobile app.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
                <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div style={{ padding:'24px' }}>
                  <p className="font-mono font-black mb-3" style={{ fontSize:'32px', color:'#e2e8f0', lineHeight:1 }}>{s.step}</p>
                  <p className="font-bold text-slate-900 mb-2" style={{ fontSize:'14px' }}>{s.title}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>NBE registry</p>
          <h2 className="font-serif font-bold text-slate-950 mb-8"
            style={{ fontSize:'clamp(22px, 2.8vw, 32px)', letterSpacing:'-0.5px' }}>
            Banks that accept international transfers
          </h2>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ height:4, background:'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
            <div className="hidden sm:grid border-b border-slate-200"
              style={{ gridTemplateColumns:'1fr 160px 120px', padding:'13px 24px', background:'#f8fafc' }}>
              {['Bank','SWIFT code','Founded'].map(h => (
                <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
              ))}
            </div>
            {banks.map((b, i) => (
              <Link key={b.slug} href={'/birrbank/institutions/'+b.slug}
                className={'block border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-slate-50')}>
                <div className="hidden sm:grid items-center" style={{ gridTemplateColumns:'1fr 160px 120px', padding:'13px 24px' }}>
                  <p className={'font-bold ' + (i===0 ? 'text-blue-900' : 'text-slate-800')} style={{ fontSize:'14px' }}>{b.name}</p>
                  <p className="font-mono text-slate-600 text-sm">{b.swift_code}</p>
                  <p className="text-sm text-slate-500">{b.founded_year ?? '—'}</p>
                </div>
                <div className="sm:hidden flex items-center justify-between gap-3" style={{ padding:'13px 16px' }}>
                  <p className="font-bold text-slate-800 text-sm">{b.name}</p>
                  <p className="font-mono text-slate-500 text-xs">{b.swift_code}</p>
                </div>
              </Link>
            ))}
            <div className="border-t border-slate-200" style={{ background:'#f8fafc', padding:'14px 24px' }}>
              <p className="text-xs text-slate-400">Banks with active SWIFT codes · Source: NBE registry · Click any bank for full profile</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background:'#0f172a', padding:'72px 0', borderTop:'1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#93c5fd' }}>Next step</p>
            <h3 className="font-serif font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Compare savings rates before opening.
            </h3>
            <p style={{ color:'#94a3b8', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              Fixed deposit rates vary significantly between banks. Check which bank offers the best rate before choosing where to open your diaspora account.
            </p>
          </div>
          <Link href="/birrbank/banking/savings-rates" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1D4ED8', color:'#fff', whiteSpace:'nowrap' }}>
            Compare savings rates
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color:'#1D4ED8' }}>Stay connected</p>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Stay informed, wherever you are.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly updates on diaspora account rates, FX changes and new banking services for Ethiopians abroad.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
