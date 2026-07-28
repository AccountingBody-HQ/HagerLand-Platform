'use client'
import { useState, useEffect } from 'react'

function fmt(n: number) {
  return n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function EmiCalculator() {
  const [principal, setPrincipal] = useState('500000')
  const [rate,      setRate]      = useState('13.00')
  const [months,    setMonths]    = useState('60')
  const [emi,       setEmi]       = useState<number | null>(null)
  const [total,     setTotal]     = useState<number | null>(null)
  const [interest,  setInterest]  = useState<number | null>(null)

  useEffect(() => {
    const P = parseFloat(principal)
    const r = parseFloat(rate) / 100 / 12
    const n = parseInt(months)
    if (!P || !r || !n || isNaN(P) || isNaN(r) || isNaN(n)) {
      setEmi(null); setTotal(null); setInterest(null)
      return
    }
    const emiVal   = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const totalVal = emiVal * n
    setEmi(emiVal)
    setTotal(totalVal)
    setInterest(totalVal - P)
  }, [principal, rate, months])

  const pct = emi && total && parseFloat(principal)
    ? Math.round((parseFloat(principal) / total) * 100)
    : 50

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #1D4ED8, #1E40AF)' }} />
      <div style={{ padding: '32px' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(29,78,216,0.08)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900" style={{ fontSize: '16px' }}>EMI Calculator</p>
            <p className="text-xs text-slate-400">Equated Monthly Instalment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Loan Amount (ETB)</label>
            <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)}
              className="w-full rounded-xl font-mono font-bold text-slate-900 border border-slate-200 focus:border-blue-400 focus:outline-none transition-colors"
              style={{ fontSize: '18px', padding: '12px 16px', background: '#f9fafb' }} />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {['100000','250000','500000','1000000'].map(v => (
                <button key={v} onClick={() => setPrincipal(v)}
                  className="text-xs font-bold px-2 py-0.5 rounded-full transition-all"
                  style={{ background: principal === v ? '#1D4ED8' : '#f1f5f9', color: principal === v ? '#fff' : '#64748b' }}>
                  {Number(v).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Annual Rate (%)</label>
            <input type="number" step="0.25" value={rate} onChange={e => setRate(e.target.value)}
              className="w-full rounded-xl font-mono font-bold text-slate-900 border border-slate-200 focus:border-blue-400 focus:outline-none transition-colors"
              style={{ fontSize: '18px', padding: '12px 16px', background: '#f9fafb' }} />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {['12.00','13.00','14.00','15.00'].map(v => (
                <button key={v} onClick={() => setRate(v)}
                  className="text-xs font-bold px-2 py-0.5 rounded-full transition-all"
                  style={{ background: rate === v ? '#1D4ED8' : '#f1f5f9', color: rate === v ? '#fff' : '#64748b' }}>
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Loan Term (months)</label>
            <input type="number" value={months} onChange={e => setMonths(e.target.value)}
              className="w-full rounded-xl font-mono font-bold text-slate-900 border border-slate-200 focus:border-blue-400 focus:outline-none transition-colors"
              style={{ fontSize: '18px', padding: '12px 16px', background: '#f9fafb' }} />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {[{l:'1yr',v:'12'},{l:'3yr',v:'36'},{l:'5yr',v:'60'},{l:'10yr',v:'120'}].map(o => (
                <button key={o.v} onClick={() => setMonths(o.v)}
                  className="text-xs font-bold px-2 py-0.5 rounded-full transition-all"
                  style={{ background: months === o.v ? '#1D4ED8' : '#f1f5f9', color: months === o.v ? '#fff' : '#64748b' }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {emi !== null && (
          <>
            <div className="rounded-2xl p-6 mb-5" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#1D4ED8' }}>Monthly EMI</p>
              <p className="font-mono font-black" style={{ fontSize: 'clamp(32px, 5vw, 48px)', color: '#1D4ED8', letterSpacing: '-2px', lineHeight: 1 }}>
                ETB {fmt(emi)}
              </p>
              <p className="text-xs text-blue-400 mt-1">Per month for {months} months</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Principal',      value: 'ETB ' + fmt(parseFloat(principal)), color: '#1D4ED8' },
                { label: 'Total Interest', value: 'ETB ' + fmt(interest!),             color: '#ef4444' },
                { label: 'Total Payment',  value: 'ETB ' + fmt(total!),                color: '#0f172a' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center border border-slate-100" style={{ background: '#f9fafb' }}>
                  <p className="font-mono font-black" style={{ fontSize: '14px', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Principal {pct}%</span>
                <span>Interest {100 - pct}%</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#fee2e2' }}>
                <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: '#1D4ED8' }} />
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-slate-400 mt-5 leading-relaxed">
          For comparison purposes only. Actual EMI may vary based on processing fees and insurance requirements.
          Always confirm with the bank before applying.
        </p>
      </div>
    </div>
  )
}
