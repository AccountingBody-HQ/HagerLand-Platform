'use client'
import { useState } from 'react'
import Link from 'next/link'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  regular_savings:   'Regular savings',
  fixed_deposit_3m:  'Fixed 3M',
  fixed_deposit_6m:  'Fixed 6M',
  fixed_deposit_12m: 'Fixed 12M',
  fixed_deposit_24m: 'Fixed 24M',
  current:           'Current',
  diaspora:          'Diaspora',
  youth:             'Youth savings',
  women:             'Women savings',
}

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

export type SavingsRate = {
  rank: number; bank: string; slug: string; type: string; typeKey: string
  rate: string; min: string; sharia: boolean
  verified: string; freshness: 'fresh' | 'warn' | 'stale'; badge: string | null
}

export default function SavingsRatesTable({ rates, totalBanks, totalInstitutions }: { rates: SavingsRate[]; totalBanks: number; totalInstitutions: number }) {
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [shariaFilter, setShariaFilter] = useState(false)
  const [search,       setSearch]       = useState('')

  const filtered = rates.filter(r => {
    const matchType   = typeFilter === 'all' || r.typeKey === typeFilter
    const matchSharia = !shariaFilter || r.sharia
    const matchSearch = !search || r.bank.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSharia && matchSearch
  })

  const ranked = filtered.map((r, i) => ({ ...r, rank: i + 1 }))
  const typeKeys = Object.keys(ACCOUNT_TYPE_LABELS).filter(k => rates.some(r => r.typeKey === k))

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTypeFilter('all')}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
            style={{ background: typeFilter === 'all' ? '#1D4ED8' : '#f1f5f9', color: typeFilter === 'all' ? '#fff' : '#64748b' }}>
            All types
          </button>
          {typeKeys.map(k => (
            <button key={k} onClick={() => setTypeFilter(typeFilter === k ? 'all' : k)}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{ background: typeFilter === k ? '#1D4ED8' : '#f1f5f9', color: typeFilter === k ? '#fff' : '#64748b' }}>
              {ACCOUNT_TYPE_LABELS[k]}
            </button>
          ))}
          <button onClick={() => setShariaFilter(v => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
            style={{ background: shariaFilter ? '#92400e' : '#f1f5f9', color: shariaFilter ? '#fff' : '#64748b' }}>
            Sharia only
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input placeholder="Search bank..." value={search} onChange={e => setSearch(e.target.value)}
            className="rounded-xl text-sm text-slate-800 border border-slate-200 focus:border-blue-300 focus:outline-none"
            style={{ padding: '7px 14px', background: '#f9fafb', width: '160px' }} />
          <span className="text-xs text-slate-400 whitespace-nowrap">{ranked.length} products</span>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
        <div className="hidden sm:grid border-b border-slate-200"
          style={{ gridTemplateColumns: '44px 1fr 140px 120px 120px 110px', padding: '13px 24px', background: '#f9fafb' }}>
          {['#', 'Bank', 'Account type', 'Min. balance', 'Annual rate', 'Last verified'].map(h => (
            <p key={h} className="text-xs font-black text-slate-400 uppercase tracking-widest">{h}</p>
          ))}
        </div>

        {ranked.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">No rates match your filters.</p>
            <button onClick={() => { setTypeFilter('all'); setShariaFilter(false); setSearch('') }}
              className="mt-3 text-xs font-bold" style={{ color: '#1D4ED8' }}>
              Clear all filters
            </button>
          </div>
        ) : ranked.map(r => (
          <div key={r.rank + r.bank + r.type}
            className={'border-b border-slate-100 transition-colors ' + (r.rank === 1 ? 'bg-blue-50' : 'bg-white hover:bg-slate-50')}>
            <div className="hidden sm:grid items-center"
              style={{ gridTemplateColumns: '44px 1fr 140px 120px 120px 110px', padding: r.rank === 1 ? '18px 24px' : '14px 24px' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                style={r.rank === 1 ? { background: '#1D4ED8', color: '#fff' } : { background: '#f1f5f9', color: '#94a3b8' }}>
                {r.rank === 1 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : r.rank}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/institutions/${r.slug}`} className={'font-bold hover:underline ' + (r.rank === 1 ? 'text-blue-900' : 'text-slate-800')} style={{ fontSize: r.rank === 1 ? '15px' : '14px' }}>{r.bank}</Link>
                {r.badge && (
                  <span className="text-xs font-bold rounded-full px-2 py-0.5"
                    style={r.badge === 'Sharia' ? { background: '#fef3c7', color: '#92400e' } : r.badge === 'Best rate' ? { background: '#dbeafe', color: '#1D4ED8' } : { background: '#f0fdf4', color: '#166534' }}>
                    {r.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{r.type}</p>
              <p className="text-sm font-mono text-slate-600">ETB {r.min}</p>
              <p className={'font-mono font-black ' + (r.rank === 1 ? 'text-blue-700' : 'text-slate-800')} style={{ fontSize: r.rank === 1 ? '26px' : '20px', letterSpacing: '-1px' }}>{r.rate}%</p>
              <div className="flex items-center gap-1.5">
                <span style={{ color: r.freshness === 'fresh' ? '#1D4ED8' : r.freshness === 'warn' ? '#d97706' : '#ef4444' }}><ClockIcon /></span>
                <p className="text-xs font-medium" style={{ color: r.freshness === 'fresh' ? '#475569' : r.freshness === 'warn' ? '#d97706' : '#ef4444' }}>{r.verified}</p>
              </div>
            </div>
            <div className="sm:hidden flex items-center gap-3" style={{ padding: '14px 16px' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                style={r.rank === 1 ? { background: '#1D4ED8', color: '#fff' } : { background: '#f1f5f9', color: '#94a3b8' }}>{r.rank}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/institutions/${r.slug}`} className="font-bold text-slate-800 text-sm truncate hover:underline">{r.bank}</Link>
                  {r.badge && <span className="text-xs font-bold rounded-full px-2 py-0.5 shrink-0" style={r.badge === 'Sharia' ? { background: '#fef3c7', color: '#92400e' } : { background: '#dbeafe', color: '#1D4ED8' }}>{r.badge}</span>}
                </div>
                <p className="text-xs text-slate-400">{r.type} · ETB {r.min} min · {r.verified}</p>
              </div>
              <p className="font-mono font-black text-slate-800 shrink-0" style={{ fontSize: '20px', letterSpacing: '-1px' }}>{r.rate}%</p>
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200" style={{ background: '#f9fafb', padding: '14px 24px' }}>
          <p className="text-xs text-slate-400">Showing {ranked.length} of {rates.length} products from {totalBanks} banks · Sorted by rate (high to low)</p>
          <Link href="/institutions" className="text-xs font-bold hover:underline shrink-0" style={{ color: '#1D4ED8' }}>View all {totalInstitutions} institutions →</Link>
        </div>
      </div>
    </div>
  )
}
