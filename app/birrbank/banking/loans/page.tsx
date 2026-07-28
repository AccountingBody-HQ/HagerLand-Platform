import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import EmiCalculator from '@/components/EmiCalculator'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Best Loan Rates in Ethiopia — All Banks Compared | BirrBank',
  description: 'Compare personal, home mortgage, car and business loan rates from all NBE-licensed commercial banks in Ethiopia. Sorted by lowest rate.',
}

function fmt(val: number | null | undefined) {
  if (val == null) return '—'
  return Number(val).toFixed(2)
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function fmtETB(val: number | null | undefined) {
  if (val == null) return '—'
  return 'ETB ' + Number(val).toLocaleString('en-ET')
}

interface LoanRow {
  id: string
  min_rate: number
  max_rate: number | null
  max_tenure_months: number | null
  max_amount_etb: number | null
  last_verified_date: string | null
  institution_slug: string
  institutions: { name: string; slug: string }[] | null
}

function LoanTable({ loans, title }: { loans: LoanRow[]; title: string }) {
  return (
    <div className="mb-12">
      <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Live data</p>
      <h3 className="font-bold text-slate-950 mb-6"
        style={{ fontSize:'clamp(20px, 2.5vw, 26px)', letterSpacing:'-0.5px' }}>{title}</h3>
      <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
        <div className="hidden sm:grid border-b border-slate-200"
          style={{ gridTemplateColumns:'44px 1fr 130px 130px 120px 130px 110px', padding:'13px 24px', background:'#F4F5F3' }}>
          {['#','Bank','Min rate','Max rate','Max term','Max amount','Verified'].map(h => (
            <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
          ))}
        </div>
        {loans.length > 0 ? loans.map((r, i) => (
          <div key={r.id} className={'border-b border-slate-100 transition-colors ' + (i===0 ? 'bg-green-soft' : 'bg-white hover:bg-slate-50')}>
            <div className="hidden sm:grid items-center"
              style={{ gridTemplateColumns:'44px 1fr 130px 130px 120px 130px 110px', padding:i===0?'18px 24px':'13px 24px' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                style={i===0 ? { background:'#1C7C4C', color:'#fff' } : { background:'#F4F5F3', color:'#5B6472' }}>
                {i===0 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : i+1}
              </div>
              <Link href={`/birrbank/institutions/${r.institutions?.[0]?.slug ?? r.institution_slug}`}
                className={'font-bold hover:underline ' + (i===0 ? 'text-green-dark' : 'text-slate-800')} style={{ fontSize:i===0?'15px':'14px' }}>
                {r.institutions?.[0]?.name ?? r.institution_slug}
              </Link>
              <p className={'font-mono font-black ' + (i===0 ? 'text-green-dark' : 'text-slate-800')} style={{ fontSize:i===0?'22px':'16px', letterSpacing:'-0.5px' }}>
                {fmt(r.min_rate)}%
              </p>
              <p className="font-mono text-slate-500 text-sm">{r.max_rate ? fmt(r.max_rate)+'%' : '—'}</p>
              <p className="text-sm text-slate-500">{r.max_tenure_months ? r.max_tenure_months+' months' : '—'}</p>
              <p className="font-mono text-slate-600 text-sm">{fmtETB(r.max_amount_etb)}</p>
              <p className="text-xs text-slate-400">{fmtDate(r.last_verified_date)}</p>
            </div>
            <div className="sm:hidden flex items-center gap-3" style={{ padding:'13px 16px' }}>
              <div className="flex-1 min-w-0">
                <Link href={`/birrbank/institutions/${r.institutions?.[0]?.slug ?? r.institution_slug}`} className="font-bold text-slate-800 text-sm hover:underline">{r.institutions?.[0]?.name ?? r.institution_slug}</Link>
                <p className="text-xs text-slate-400">{r.max_tenure_months ? r.max_tenure_months+' months max' : '—'} · {fmtETB(r.max_amount_etb)}</p>
              </div>
              <p className="font-mono font-black text-slate-800 shrink-0" style={{ fontSize:'18px' }}>{fmt(r.min_rate)}%</p>
            </div>
          </div>
        )) : (
          <div className="py-10 text-center"><p className="text-slate-500 text-sm">Loan rate data is being verified. Check back soon.</p></div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200" style={{ background:'#F4F5F3', padding:'14px 24px' }}>
          <p className="text-xs text-slate-400">Rates sourced from official bank websites · For comparison only · Sorted by minimum rate</p>
          <Link href="/birrbank/banking/savings-rates" className="text-xs font-bold" style={{ color:'#1C7C4C' }}>Compare savings rates →</Link>
        </div>
      </div>
    </div>
  )
}

export default async function LoansPage() {
  const supabase = createBirrBankAdminClient()

  const [personalRes, homeRes, businessRes, bankCountRes] = await Promise.all([
    supabase.schema('birrbank').from('loan_rates').select('*, institution_slug, institutions(name, slug)').eq('loan_type','personal').eq('is_current',true).order('min_rate',{ascending:true}),
    supabase.schema('birrbank').from('loan_rates').select('*, institution_slug, institutions(name, slug)').eq('loan_type','home_mortgage').eq('is_current',true).order('min_rate',{ascending:true}),
    supabase.schema('birrbank').from('loan_rates').select('*, institution_slug, institutions(name, slug)').eq('loan_type','business').eq('is_current',true).order('min_rate',{ascending:true}),
    supabase.schema('birrbank').from('institutions').select('count',{count:'exact',head:true}).eq('type','bank').eq('is_active',true),
  ])

  const personal = personalRes.data ?? []
  const home = homeRes.data ?? []
  const business = businessRes.data ?? []
  const bankCount = bankCountRes.count ?? 32
  const totalRates = personal.length + home.length + business.length
  const lowestRate = [...personal, ...home, ...business].sort((a,b) => Number(a.min_rate)-Number(b.min_rate))[0]

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Banking — Loans
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            Best loan rates in Ethiopia — all {bankCount} banks compared.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Personal, home mortgage, car and business loan rates from every commercial bank — verified from official sources and sorted by lowest rate.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/savings-rates"
              className="hero-btn hero-btn-primary">
              Compare savings rates
            </Link>
            <Link href="/birrbank/banking/fx-rates"
              className="hero-btn hero-btn-secondary">
              Check FX rates
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:String(bankCount), label:'Banks compared' },
              { value:lowestRate ? fmt(lowestRate.min_rate)+'%' : '—', label:'Lowest rate today' },
              { value:String(totalRates), label:'Loan rates tracked' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOAN TABLES */}
      <section style={{ background:'#ffffff', padding:'64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoanTable loans={personal} title="Personal loans" />
          <LoanTable loans={home} title="Home mortgage loans" />
          <LoanTable loans={business} title="Business loans" />
          <p className="text-xs text-slate-400 mt-4 text-center leading-relaxed">
            Rates are for comparison purposes only and may change without notice. Always verify directly with the institution before applying. BirrBank is not a bank or financial adviser.
          </p>
        </div>
      </section>

      {/* EMI CALCULATOR */}
      <section style={{ background:'#F4F5F3', padding:'0 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3 pt-16" style={{ color: '#1C7C4C' }}>EMI calculator</p>
          <h2 className="font-bold text-slate-950 mb-4"
            style={{ fontSize:'clamp(26px, 3vw, 36px)', letterSpacing:'-0.5px' }}>
            Calculate your monthly repayment.
          </h2>
          <p className="text-slate-500 mb-8" style={{ fontSize:'15px', maxWidth:'480px' }}>
            Enter your loan amount, the bank rate from the table above, and your preferred term to see your monthly EMI instantly.
          </p>
          <EmiCalculator />
        </div>
      </section>

      {/* GUIDE */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Borrowing guide</p>
          <h2 className="font-bold text-slate-950 mb-10"
            style={{ fontSize:'clamp(26px, 3vw, 38px)', letterSpacing:'-0.5px' }}>
            How to choose the best loan in Ethiopia.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Compare the minimum rate, not the maximum', body:'Banks quote a rate range. The minimum rate applies to their best customers — strong credit history, high income, good collateral. Always ask which rate you personally qualify for.' },
              { step:'02', title:'Factor in the total cost, not just the rate', body:'Processing fees, insurance requirements and collateral valuation costs add to the effective cost of a loan. A bank with a 13% rate and ETB 5,000 in fees may cost more than a 13.5% rate with no fees.' },
              { step:'03', title:'Collateral requirements vary significantly', body:'Most Ethiopian banks require collateral for personal loans above ETB 50,000. CBE accepts vehicle logbooks and land title deeds. Some private banks offer unsecured personal loans at higher rates.' },
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
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Data integrity</p>
            <h3 className="font-bold mb-2"
              style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Every rate has a verified date. Always.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              Loan rates are sourced from official bank websites and verified weekly. Any rate older than 7 days is flagged automatically.
            </p>
          </div>
          <Link href="/birrbank/banking/savings-rates"
            className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            Compare savings rates
          </Link>
        </div>
      </section>

      {/* EMAIL */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Loan rate changes, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get notified when banks change their loan rates — weekly digest across all {bankCount} commercial banks.
            </p>
            <ul className="space-y-3 mb-8">
              {['Personal, home and business loan rate changes','New loan products and promotional rates','NBE lending rate directive changes','Collateral requirement updates'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
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
