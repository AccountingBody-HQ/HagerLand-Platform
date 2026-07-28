import type { Metadata } from 'next'
import Link from 'next/link'
import SavingsRatesTable from '@/components/SavingsRatesTable'
import EmailCapture from '@/components/EmailCapture'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Best Savings Rates in Ethiopia — All Banks Compared | BirrBank',
  description: 'Compare savings and fixed deposit rates across all NBE-licensed commercial banks in Ethiopia. Updated weekly from official sources.',
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  regular_savings:'Regular savings', fixed_deposit_3m:'Fixed 3M',
  fixed_deposit_6m:'Fixed 6M', fixed_deposit_12m:'Fixed 12M',
  fixed_deposit_24m:'Fixed 24M', current:'Current',
  diaspora:'Diaspora', youth:'Youth savings', women:'Women savings',
}

function staleness(dateStr: string): 'fresh' | 'warn' | 'stale' {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days <= 7) return 'fresh'
  if (days <= 14) return 'warn'
  return 'stale'
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
function formatMin(val: number) { return val.toLocaleString('en-ET') }

interface SavingsRateRow {
  annual_rate: number
  account_type: string
  minimum_balance_etb: number | null
  is_sharia_compliant: boolean
  last_verified_date: string
  institution_slug: string
  institutions: { name: string; is_listed_on_esx: boolean }[] | null
}

export default async function SavingsRatesPage() {
  const supabase = createBirrBankAdminClient()

  const [ratesRes, bankCountRes, totalInstitutionsRes] = await Promise.all([
    supabase.schema('birrbank').from('savings_rates')
      .select('annual_rate, account_type, minimum_balance_etb, is_sharia_compliant, last_verified_date, institution_slug, institutions(name, is_listed_on_esx)')
      .eq('is_current', true).order('annual_rate', { ascending: false }),
    supabase.schema('birrbank').from('institutions')
      .select('count', { count:'exact', head:true }).eq('type','bank').eq('is_active', true),
    supabase.schema('birrbank').from('institutions')
      .select('count', { count:'exact', head:true }).eq('is_active', true),
  ])

  const totalBanks = bankCountRes.count ?? 32
  const totalInstitutions = totalInstitutionsRes.count ?? 225
  const savingsRows: SavingsRateRow[] = ratesRes.data ?? []
  const SAVINGS_RATES = savingsRows.map((r, i) => {
    const isESX = r.institutions?.[0]?.is_listed_on_esx ?? false
    const isSharia = r.is_sharia_compliant
    return {
      rank: i + 1,
      bank: r.institutions?.[0]?.name ?? r.institution_slug,
      type: ACCOUNT_TYPE_LABELS[r.account_type] ?? r.account_type,
      typeKey: r.account_type,
      rate: Number(r.annual_rate).toFixed(2),
      min: formatMin(Number(r.minimum_balance_etb ?? 0)),
      sharia: isSharia,
      slug: r.institution_slug ?? '',
      verified: formatDate(r.last_verified_date),
      freshness: staleness(r.last_verified_date),
      badge: i === 0 ? 'Best rate' : isSharia ? 'Sharia' : isESX ? 'ESX listed' : null,
    }
  })
  const bestRate = SAVINGS_RATES[0]?.rate ?? '—'
  const rateCount = SAVINGS_RATES.length

  return (
    <main className="bg-white flex-1">

      {/* DARK HERO */}
      <section className="relative overflow-hidden" style={{ background: '#0f172a' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(29,78,216,0.18) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(14,30,80,0.4) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/birrbank/banking" className="hover:text-slate-300 transition-colors">Banking</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">Savings Rates</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(29,78,216,0.15)', color: '#93c5fd', border: '1px solid rgba(29,78,216,0.3)' }}>
            Banking — Savings Rates
          </div>
          <h1 className="font-serif font-bold text-white mb-4"
            style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', letterSpacing: '-0.025em', lineHeight: 1.08 }}>
            Best savings rates in Ethiopia — all {totalBanks} banks.
          </h1>
          <p className="text-slate-400 mb-8" style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '520px' }}>
            Every commercial bank savings and fixed deposit rate, verified from official sources and updated weekly. Filter by account type or Sharia compliance.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/banking/fx-rates"
              className="hero-btn hero-btn-primary">
              Check FX rates
            </Link>
            <Link href="/birrbank/banking/loans"
              className="hero-btn hero-btn-secondary">
              Compare loan rates
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-slate-800">
            {[
              { value: String(totalBanks), label: 'Banks compared' },
              { value: bestRate !== '—' ? bestRate + '%' : '—', label: 'Best rate today' },
              { value: String(rateCount), label: 'Rates tracked' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-slate-800 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize: 'clamp(22px, 3vw, 36px)', letterSpacing: '-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ background: '#ffffff', padding: '64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SavingsRatesTable rates={SAVINGS_RATES} totalBanks={totalBanks} totalInstitutions={totalInstitutions} />
          <p className="text-xs text-slate-400 mt-5 text-center leading-relaxed">
            Rates are for comparison purposes only and may change without notice. Always verify directly with the institution before opening an account. BirrBank is not a bank or financial adviser.
          </p>
        </div>
      </section>

      {/* HOW TO CHOOSE */}
      <section style={{ background: '#f8fafc', padding: '96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-bold text-slate-950 mb-10"
            style={{ fontSize: 'clamp(26px, 3vw, 38px)', letterSpacing: '-0.5px' }}>
            How to choose the best savings account.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step:'01', title:'Compare the annual rate', body:'The annual percentage rate is the core metric. A difference of 1% on ETB 100,000 is ETB 1,000 per year — meaningful over a 12-month fixed deposit term.' },
              { step:'02', title:'Check the minimum balance', body:'Some banks require ETB 10,000+ to access their best rates. CBE requires as little as ETB 50. Match your available capital to the right product tier.' },
              { step:'03', title:'Consider Sharia compliance', body:'Hijra Bank and ZamZam Bank offer Mudarabah accounts — profit-sharing products that are fully Sharia-compliant and competitively priced against conventional savings.' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
                <div style={{ padding: '28px 24px' }}>
                  <p className="font-mono font-black mb-3" style={{ fontSize: '32px', color: '#e2e8f0', lineHeight: 1 }}>{s.step}</p>
                  <p className="font-bold text-slate-900 mb-3" style={{ fontSize: '15px' }}>{s.title}</p>
                  <p className="text-sm text-slate-500" style={{ lineHeight: 1.75 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DARK TRUST */}
      <section style={{ background: '#0f172a', padding: '72px 0', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#93c5fd' }}>Data integrity</p>
            <h3 className="font-serif font-bold mb-2"
              style={{ fontSize: 'clamp(22px, 2.5vw, 30px)', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Every rate has a verified date. Always.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: 1.75, maxWidth: 480 }}>
              Any rate older than 7 days is automatically flagged. You see exactly how fresh the data is before making any comparison decision.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            {[
              { color:'#22c55e', label:'Verified within 7 days', status:'Live' },
              { color:'#f59e0b', label:'7–14 days old', status:'Check recommended' },
              { color:'#ef4444', label:'14+ days old', status:'Being updated' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl"
                style={{ background:'#1e293b', border:'1px solid #334155', padding:'14px 20px' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-sm font-semibold" style={{ color:'#94a3b8' }}>
                  {s.label} — <span style={{ color: s.color }}>{s.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMAIL CAPTURE */}
      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-serif font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Get notified when savings rates change.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Weekly digest of every savings rate change across all {totalBanks} banks. Be the first to know when a bank raises — or cuts — its rate.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                `Rate changes across all ${totalBanks} commercial banks`,
                'New fixed deposit products and limited-time offers',
                'Sharia-compliant product updates',
                'NBE minimum rate directive changes',
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
