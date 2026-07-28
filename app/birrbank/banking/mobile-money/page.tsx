import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { Globe } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mobile Money in Ethiopia — All Payment Operators | BirrBank',
  description: 'Compare all NBE-licensed mobile money and payment operators in Ethiopia — TeleBirr, CBEBirr, Amole, M-PESA and more.',
}

interface OperatorRow {
  slug: string
  name: string
  service_type: string | null
  description: string | null
  nbe_licence_number: string | null
  operational_status: string | null
  website_url: string | null
}

export default async function MobileMoneyPage() {
  const supabase = createBirrBankAdminClient()
  const [operatorsRes, countRes] = await Promise.all([
    supabase.schema('birrbank').from('institutions').select('*').eq('type','payment_operator').eq('is_active',true).order('name'),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','payment_operator').eq('is_active',true),
  ])
  const operators: OperatorRow[] = operatorsRes.data ?? []
  const operatorCount = countRes.count ?? 0

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Banking — Mobile Money
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Mobile money in Ethiopia — TeleBirr, CBEBirr, Amole and more.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            All {operatorCount} NBE-licensed payment operators in Ethiopia — compare mobile money platforms, USSD services and digital payment solutions.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/savings-rates"
              className="hero-btn hero-btn-primary">
              Compare savings rates
            </Link>
            <Link href="/birrbank/institutions?type=payment_operator"
              className="hero-btn hero-btn-secondary">
              View all profiles
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(operatorCount), label:'Licensed payment operators' },
              { value:'NBE', label:'Regulatory authority' },
              { value:'2021', label:'First licence issued' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPERATORS GRID */}
      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>NBE registry</p>
          <h2 className="font-bold text-slate-950 mb-8"
            style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-0.5px' }}>
            All {operatorCount} licensed payment operators
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {operators.length > 0 ? operators.map((op, i) => (
              <div key={op.slug} className="relative bg-white rounded-2xl border border-slate-200 hover:border-green/40 hover:shadow-lg transition-all overflow-hidden">
                <Link href={`/birrbank/institutions/${op.slug}`} className="absolute inset-0 z-0" aria-label={op.name} />
                <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                <div style={{ padding:'24px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-slate-900" style={{ fontSize:'15px' }}>{op.name}</p>
                    {i === 0 && <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background:'#E9F5EE', color:'#1C7C4C' }}>Largest</span>}
                  </div>
                  {op.service_type && <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:'#1C7C4C' }}>{op.service_type}</p>}
                  {op.description && <p className="text-sm text-slate-500 mb-4" style={{ lineHeight:1.75 }}>{op.description}</p>}
                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    {op.nbe_licence_number && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Licence</span>
                        <span className="font-mono font-semibold text-slate-700">{op.nbe_licence_number}</span>
                      </div>
                    )}
                    {op.operational_status && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Status</span>
                        <span className="font-semibold text-slate-700">{op.operational_status}</span>
                      </div>
                    )}
                    {op.website_url && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Website</span>
                        <a href={op.website_url} target="_blank" rel="noopener noreferrer"
                          className="relative z-10 font-semibold hover:underline flex items-center gap-1" style={{ color:'#1C7C4C' }}>
                          <Globe size={10} />{op.website_url.replace('https://','').replace('http://','').replace('www.','').split('/')[0]}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-3 py-10 text-center"><p className="text-slate-500 text-sm">Payment operator data is being populated.</p></div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-6 text-center">Source: NBE registry · nbe.gov.et · {operatorCount} licensed payment instrument issuers</p>
        </div>
      </section>

      {/* GUIDE */}
      <section style={{ background:'#F4F5F3', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Platform guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            Ethiopian mobile money explained.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'TeleBirr — the dominant platform', body:'TeleBirr is Ethiopia largest mobile money platform with over 40 million registered users. Operated by Ethio Telecom, it supports payments, transfers, bill payments and merchant QR codes. Available on all networks via USSD and smartphone app.' },
              { step:'02', title:'Interoperability — the future', body:'The NBE Mobile Money Interoperability Directive requires all operators to enable transfers between platforms. TeleBirr users can send to CBEBirr users and vice versa — making the ecosystem more useful for everyone.' },
              { step:'03', title:'Bank-linked vs standalone wallets', body:'CBEBirr and Amole are bank-linked platforms — directly connected to your bank account. TeleBirr and HelloCash operate as standalone wallets you load with cash. Bank-linked wallets offer higher limits and easier fund management.' },
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

      {/* DARK TRUST */}
      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>NBE licensed only</p>
            <h3 className="font-bold mb-2"
              style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Every operator verified against the NBE registry.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank only lists payment operators holding a valid National Payment System licence from the National Bank of Ethiopia.
            </p>
          </div>
          <Link href="/birrbank/institutions?type=payment_operator"
            className="font-bold rounded-full transition-all shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            View all operator profiles
          </Link>
        </div>
      </section>

      {/* EMAIL */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Digital payments news, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly updates on mobile money fee changes, new features and NBE payment policy updates.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>

    </main>
  )
}
