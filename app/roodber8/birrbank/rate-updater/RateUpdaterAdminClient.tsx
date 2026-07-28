'use client'
import { useState, useEffect, useCallback } from 'react'
type Row = { id: string; [key: string]: string | number | null }
function instName(row: Row): string {
  const joined = row.institutions as unknown as { name?: string }[] | undefined
  return joined?.[0]?.name ?? String(row.institution_slug ?? '')
}


const TABS = ['FX Rates', 'Savings Rates', 'Loan Rates', 'Securities Prices']

const CURRENCIES = ['USD', 'GBP', 'EUR', 'SAR', 'AED', 'CNY', 'CHF']

const ACCOUNT_TYPES: Record<string, string> = {
  regular_savings:   'Regular Savings',
  fixed_deposit_3m:  '3-Month Fixed',
  fixed_deposit_6m:  '6-Month Fixed',
  fixed_deposit_12m: '12-Month Fixed',
  fixed_deposit_24m: '24-Month Fixed',
  current:           'Current Account',
  diaspora:          'Diaspora Account',
  youth:             'Youth Savings',
  women:             'Women Savings',
}

const LOAN_TYPES: Record<string, string> = {
  personal:    'Personal Loan',
  home:        'Home Loan',
  business:    'Business Loan',
  car:         'Car Loan',
  agriculture: 'Agricultural Loan',
}

function staleness(dateStr: string | number | null): { label: string; color: string; bg: string } {
  if (!dateStr) return { label: 'No date', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days <= 7)  return { label: days === 0 ? 'Today' : days + 'd ago', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' }
  if (days <= 14) return { label: days + 'd ago', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
  return { label: days + 'd ago', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
}

function Badge({ date }: { date: string | number | null }) {
  const s = staleness(date)
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

// ── FX TAB ─────────────────────────────────────────────────────────────────
interface FxData {
  nbeRates: Row[]
  bankRates: Row[]
  banks: Row[]
}
interface RatesData {
  rates: Row[]
  institutions: Row[]
}

function FxTab() {
  const [data, setData]         = useState<FxData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [nbeEdit, setNbeEdit]   = useState<Record<string, { buy: string; sell: string }>>({})
  const [bankEdit, setBankEdit] = useState<Record<string, Record<string, { buy: string; sell: string }>>>({})
  const [selBank, setSelBank]   = useState('')
  const [selCur, setSelCur]     = useState('USD')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-fx-rates')
    const d = await r.json()
    setData(d)
    const init: Record<string, { buy: string; sell: string }> = {}
    for (const c of CURRENCIES) {
      const row = d.nbeRates?.find((x: Row) => x.currency_code === c)
      init[c] = { buy: row?.buying_rate ?? '', sell: row?.selling_rate ?? '' }
    }
    setNbeEdit(init)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveNbe() {
    setSaving(true); setMsg('')
    const rates = CURRENCIES.map(c => ({ currency_code: c, buying_rate: nbeEdit[c]?.buy, selling_rate: nbeEdit[c]?.sell }))
      .filter(r => r.buying_rate && r.selling_rate)
    const res = await fetch('/api/birrbank-fx-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_nbe_rates', rates }) })
    const d = await res.json()
    setMsg(d.ok ? 'NBE rates saved — ' + (d.saved ?? 0) + ' currencies updated.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) load()
  }

  async function saveBankRate() {
    if (!selBank || !selCur) return
    const vals = bankEdit[selBank]?.[selCur]
    if (!vals?.buy || !vals?.sell) { setMsg('Enter both buy and sell rates.'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-fx-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_bank_rate', institution_slug: selBank, currency_code: selCur, buying_rate: vals.buy, selling_rate: vals.sell }) })
    const d = await res.json()
    setMsg(d.ok ? 'Bank rate saved.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) load()
  }

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {msg && <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', border: '1px solid ' + (msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>{msg}</div>}

      {/* NBE Official Rates */}
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>NBE Official Rates</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>Updated daily at 09:30 EAT · institution_slug = nbe</p>
          </div>
          <button onClick={saveNbe} disabled={saving}
            className="flex items-center gap-2 font-bold rounded-xl transition-all"
            style={{ background: '#1D4ED8', color: '#fff', fontSize: '13px', padding: '8px 18px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save NBE Rates'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CURRENCIES.map(c => {
            const existing = data?.nbeRates?.find((x: Row) => x.currency_code === c)
            return (
              <div key={c} className="rounded-xl p-3" style={{ background: '#080d1a', border: '1px solid #1a2238' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded" style={{ background: '#1D4ED8', color: '#fff' }}>{c}</span>
                  <Badge date={existing?.last_verified_date ?? null} />
                </div>
                <div className="space-y-1.5">
                  <div>
                    <p style={{ color: '#475569', fontSize: '10px', marginBottom: '2px' }}>Buy (ETB)</p>
                    <input type="number" step="0.01" value={nbeEdit[c]?.buy ?? ''} onChange={e => setNbeEdit(p => ({ ...p, [c]: { ...p[c], buy: e.target.value } }))}
                      className="w-full rounded-lg font-mono text-sm font-bold text-white"
                      style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '6px 10px', outline: 'none' }} />
                  </div>
                  <div>
                    <p style={{ color: '#475569', fontSize: '10px', marginBottom: '2px' }}>Sell (ETB)</p>
                    <input type="number" step="0.01" value={nbeEdit[c]?.sell ?? ''} onChange={e => setNbeEdit(p => ({ ...p, [c]: { ...p[c], sell: e.target.value } }))}
                      className="w-full rounded-lg font-mono text-sm font-bold text-white"
                      style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '6px 10px', outline: 'none' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-bank rate entry */}
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <p className="font-bold text-white mb-1" style={{ fontSize: '15px' }}>Per-Bank Rate Entry</p>
        <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>Update individual bank FX rates sourced from bank websites.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Bank</p>
            <select value={selBank} onChange={e => setSelBank(e.target.value)}
              className="w-full rounded-xl text-sm font-semibold text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }}>
              <option value="">Select bank...</option>
              {data?.banks?.map((b) => <option key={String(b.slug)} value={String(b.slug)}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Currency</p>
            <select value={selCur} onChange={e => setSelCur(e.target.value)}
              className="w-full rounded-xl text-sm font-semibold text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Buy (ETB)</p>
              <input type="number" step="0.01" placeholder="0.00"
                value={bankEdit[selBank]?.[selCur]?.buy ?? ''}
                onChange={e => setBankEdit(p => ({ ...p, [selBank]: { ...p[selBank], [selCur]: { ...p[selBank]?.[selCur], buy: e.target.value } } }))}
                className="w-full rounded-xl font-mono text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Sell (ETB)</p>
              <input type="number" step="0.01" placeholder="0.00"
                value={bankEdit[selBank]?.[selCur]?.sell ?? ''}
                onChange={e => setBankEdit(p => ({ ...p, [selBank]: { ...p[selBank], [selCur]: { ...p[selBank]?.[selCur], sell: e.target.value } } }))}
                className="w-full rounded-xl font-mono text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
          </div>
        </div>
        <button onClick={saveBankRate} disabled={saving || !selBank}
          className="font-bold rounded-xl transition-all"
          style={{ background: selBank ? '#1D4ED8' : '#1a2238', color: selBank ? '#fff' : '#334155', fontSize: '13px', padding: '9px 20px' }}>
          {saving ? 'Saving...' : 'Save Bank Rate'}
        </button>

        {/* Today bank rates table */}
        {data?.bankRates && data.bankRates.length > 0 && (
          <div className="mt-5">
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '10px' }}>Rates entered today</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: '#080d1a' }}>
                  {['Bank','Currency','Buy','Sell','Verified'].map(h => <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: '#475569' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.bankRates.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1a2238' }}>
                      <td className="px-3 py-2 font-semibold text-white">{instName(r)}</td>
                      <td className="px-3 py-2"><span className="font-mono font-black px-1.5 py-0.5 rounded text-xs" style={{ background: '#1D4ED8', color: '#fff' }}>{r.currency_code}</span></td>
                      <td className="px-3 py-2 font-mono text-white">{Number(r.buying_rate).toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono text-white">{Number(r.selling_rate).toFixed(2)}</td>
                      <td className="px-3 py-2"><Badge date={r.last_verified_date} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SAVINGS TAB ─────────────────────────────────────────────────────────────
function SavingsTab() {
  const [data, setData]       = useState<RatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [editId, setEditId]   = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newRow, setNewRow]   = useState({ institution_slug: '', account_type: 'regular_savings', annual_rate: '', minimum_balance_etb: '', is_sharia_compliant: false })
  const [filter, setFilter]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-savings-rates')
    setData(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveEdit(id: string) {
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-savings-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_rate', id, annual_rate: editVal }) })
    const d = await res.json()
    setMsg(d.ok ? 'Rate updated.' : 'Error: ' + d.error)
    setSaving(false); setEditId(null)
    if (d.ok) load()
  }

  async function verify(id: string) {
    setSaving(true)
    await fetch('/api/birrbank-savings-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify_rate', id }) })
    setSaving(false); load()
  }

  async function addRate() {
    if (!newRow.institution_slug || !newRow.annual_rate) { setMsg('Institution and rate are required.'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-savings-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_rate', ...newRow }) })
    const d = await res.json()
    setMsg(d.ok ? 'Rate added.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setShowAdd(false); setNewRow({ institution_slug: '', account_type: 'regular_savings', annual_rate: '', minimum_balance_etb: '', is_sharia_compliant: false }); load() }
  }

  if (loading) return <Loader />

  const filtered = (data?.rates ?? []).filter((r: Row) =>
    !filter || instName(r).toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {msg && <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', border: '1px solid ' + (msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>{msg}</div>}

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>Savings Rates</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{data?.rates?.length ?? 0} current rates · Click rate to edit inline</p>
          </div>
          <div className="flex items-center gap-3">
            <input placeholder="Filter by bank..." value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-xl text-sm text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '8px 14px', outline: 'none', width: '180px', color: '#fff' }} />
            <button onClick={() => setShowAdd(v => !v)}
              className="font-bold rounded-xl text-sm"
              style={{ background: '#1D4ED8', color: '#fff', padding: '8px 16px' }}>
              + Add Rate
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: '#080d1a', border: '1px solid #1D4ED8' }}>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Institution</p>
              <select value={newRow.institution_slug} onChange={e => setNewRow(p => ({ ...p, institution_slug: e.target.value }))}
                className="w-full rounded-lg text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }}>
                <option value="">Select...</option>
                {data?.institutions?.map((i) => <option key={String(i.slug)} value={String(i.slug)}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Account Type</p>
              <select value={newRow.account_type} onChange={e => setNewRow(p => ({ ...p, account_type: e.target.value }))}
                className="w-full rounded-lg text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }}>
                {Object.entries(ACCOUNT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Annual Rate (%)</p>
              <input type="number" step="0.01" placeholder="e.g. 9.50" value={newRow.annual_rate} onChange={e => setNewRow(p => ({ ...p, annual_rate: e.target.value }))}
                className="w-full rounded-lg font-mono text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Min Balance (ETB)</p>
              <input type="number" placeholder="Optional" value={newRow.minimum_balance_etb} onChange={e => setNewRow(p => ({ ...p, minimum_balance_etb: e.target.value }))}
                className="w-full rounded-lg font-mono text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newRow.is_sharia_compliant} onChange={e => setNewRow(p => ({ ...p, is_sharia_compliant: e.target.checked }))} />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sharia compliant</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={addRate} disabled={saving} className="font-bold rounded-lg text-sm" style={{ background: '#22c55e', color: '#fff', padding: '8px 16px' }}>Save</button>
              <button onClick={() => setShowAdd(false)} className="font-bold rounded-lg text-sm" style={{ background: '#1a2238', color: '#64748b', padding: '8px 16px' }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: '#080d1a' }}>
              {['Institution','Product','Rate %','Min Balance','Flags','Last Verified','Actions'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#334155' }}>No rates found. Add one above.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #1a2238' }}>
                  <td className="px-3 py-2.5 font-semibold text-white" style={{ fontSize: '12px' }}>{instName(r)}</td>
                  <td className="px-3 py-2.5" style={{ color: '#94a3b8' }}>{ACCOUNT_TYPES[String(r.account_type)] ?? r.account_type}</td>
                  <td className="px-3 py-2.5">
                    {editId === r.id ? (
                      <input type="number" step="0.01" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                        className="font-mono font-black rounded-lg w-20"
                        style={{ background: '#080d1a', border: '1px solid #1D4ED8', padding: '4px 8px', color: '#1D4ED8', outline: 'none', fontSize: '13px' }} />
                    ) : (
                      <button onClick={() => { setEditId(r.id); setEditVal(String(r.annual_rate)) }}
                        className="font-mono font-black hover:underline"
                        style={{ color: '#1D4ED8', fontSize: '15px' }}>
                        {Number(r.annual_rate).toFixed(2)}%
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono" style={{ color: '#64748b' }}>{r.minimum_balance_etb ? Number(r.minimum_balance_etb).toLocaleString() + ' ETB' : '—'}</td>
                  <td className="px-3 py-2.5">{r.is_sharia_compliant && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Sharia</span>}</td>
                  <td className="px-3 py-2.5"><Badge date={r.last_verified_date} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {editId === r.id ? (
                        <>
                          <button onClick={() => saveEdit(r.id)} disabled={saving} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#22c55e', color: '#fff' }}>Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#1a2238', color: '#64748b' }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => verify(r.id)} disabled={saving} className="text-xs font-bold px-2 py-1 rounded-lg transition-all" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8', border: '1px solid rgba(29,78,216,0.2)' }}>Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── LOANS TAB ────────────────────────────────────────────────────────────────
function LoansTab() {
  const [data, setData]       = useState<RatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [editId, setEditId]   = useState<string | null>(null)
  const [editMin, setEditMin] = useState('')
  const [editMax, setEditMax] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newRow, setNewRow]   = useState({ institution_slug: '', loan_type: 'personal', min_rate: '', max_rate: '', max_tenure_months: '', min_amount_etb: '', collateral_required: false })
  const [filter, setFilter]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-loan-rates')
    setData(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveEdit(id: string) {
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-loan-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_rate', id, min_rate: editMin, max_rate: editMax }) })
    const d = await res.json()
    setMsg(d.ok ? 'Rate updated.' : 'Error: ' + d.error)
    setSaving(false); setEditId(null)
    if (d.ok) load()
  }

  async function verify(id: string) {
    setSaving(true)
    await fetch('/api/birrbank-loan-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify_rate', id }) })
    setSaving(false); load()
  }

  async function addRate() {
    if (!newRow.institution_slug || !newRow.min_rate) { setMsg('Institution and min rate are required.'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-loan-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_rate', ...newRow }) })
    const d = await res.json()
    setMsg(d.ok ? 'Rate added.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setShowAdd(false); setNewRow({ institution_slug: '', loan_type: 'personal', min_rate: '', max_rate: '', max_tenure_months: '', min_amount_etb: '', collateral_required: false }); load() }
  }

  if (loading) return <Loader />

  const filtered = (data?.rates ?? []).filter((r: Row) =>
    !filter || instName(r).toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {msg && <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', border: '1px solid ' + (msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>{msg}</div>}

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>Loan Rates</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{data?.rates?.length ?? 0} current rates · Click rate to edit inline</p>
          </div>
          <div className="flex items-center gap-3">
            <input placeholder="Filter by bank..." value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-xl text-sm"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '8px 14px', outline: 'none', width: '180px', color: '#fff' }} />
            <button onClick={() => setShowAdd(v => !v)}
              className="font-bold rounded-xl text-sm"
              style={{ background: '#1D4ED8', color: '#fff', padding: '8px 16px' }}>
              + Add Rate
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: '#080d1a', border: '1px solid #1D4ED8' }}>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Institution</p>
              <select value={newRow.institution_slug} onChange={e => setNewRow(p => ({ ...p, institution_slug: e.target.value }))}
                className="w-full rounded-lg text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }}>
                <option value="">Select...</option>
                {data?.institutions?.map((i) => <option key={String(i.slug)} value={String(i.slug)}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Loan Type</p>
              <select value={newRow.loan_type} onChange={e => setNewRow(p => ({ ...p, loan_type: e.target.value }))}
                className="w-full rounded-lg text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }}>
                {Object.entries(LOAN_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Min Rate (%)</p>
              <input type="number" step="0.01" placeholder="e.g. 12.00" value={newRow.min_rate} onChange={e => setNewRow(p => ({ ...p, min_rate: e.target.value }))}
                className="w-full rounded-lg font-mono text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Max Rate (%)</p>
              <input type="number" step="0.01" placeholder="Optional" value={newRow.max_rate} onChange={e => setNewRow(p => ({ ...p, max_rate: e.target.value }))}
                className="w-full rounded-lg font-mono text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Max Tenure (months)</p>
              <input type="number" placeholder="e.g. 60" value={newRow.max_tenure_months} onChange={e => setNewRow(p => ({ ...p, max_tenure_months: e.target.value }))}
                className="w-full rounded-lg font-mono text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newRow.collateral_required} onChange={e => setNewRow(p => ({ ...p, collateral_required: e.target.checked }))} />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Collateral required</span>
              </label>
            </div>
            <div className="flex items-end gap-2 col-span-2 sm:col-span-3">
              <button onClick={addRate} disabled={saving} className="font-bold rounded-lg text-sm" style={{ background: '#22c55e', color: '#fff', padding: '8px 16px' }}>Save</button>
              <button onClick={() => setShowAdd(false)} className="font-bold rounded-lg text-sm" style={{ background: '#1a2238', color: '#64748b', padding: '8px 16px' }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: '#080d1a' }}>
              {['Institution','Loan Type','Min %','Max %','Tenure','Collateral','Last Verified','Actions'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: '#334155' }}>No rates found. Add one above.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #1a2238' }}>
                  <td className="px-3 py-2.5 font-semibold text-white">{instName(r)}</td>
                  <td className="px-3 py-2.5" style={{ color: '#94a3b8' }}>{LOAN_TYPES[String(r.loan_type)] ?? r.loan_type}</td>
                  <td className="px-3 py-2.5">
                    {editId === r.id ? (
                      <input type="number" step="0.01" value={editMin} onChange={e => setEditMin(e.target.value)} autoFocus
                        className="font-mono font-black rounded-lg w-20"
                        style={{ background: '#080d1a', border: '1px solid #1D4ED8', padding: '4px 8px', color: '#1D4ED8', outline: 'none', fontSize: '13px' }} />
                    ) : (
                      <button onClick={() => { setEditId(r.id); setEditMin(String(r.min_rate)); setEditMax(String(r.max_rate ?? '')) }}
                        className="font-mono font-black hover:underline" style={{ color: '#f59e0b', fontSize: '14px' }}>
                        {Number(r.min_rate).toFixed(2)}%
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {editId === r.id ? (
                      <input type="number" step="0.01" value={editMax} onChange={e => setEditMax(e.target.value)}
                        className="font-mono font-black rounded-lg w-20"
                        style={{ background: '#080d1a', border: '1px solid #475569', padding: '4px 8px', color: '#fff', outline: 'none', fontSize: '13px' }} />
                    ) : (
                      <span className="font-mono" style={{ color: '#64748b' }}>{r.max_rate ? Number(r.max_rate).toFixed(2) + '%' : '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono" style={{ color: '#64748b' }}>{r.max_tenure_months ? r.max_tenure_months + ' mo' : '—'}</td>
                  <td className="px-3 py-2.5">{r.collateral_required ? <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Yes</span> : <span style={{ color: '#334155' }}>No</span>}</td>
                  <td className="px-3 py-2.5"><Badge date={r.last_verified_date} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {editId === r.id ? (
                        <>
                          <button onClick={() => saveEdit(r.id)} disabled={saving} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#22c55e', color: '#fff' }}>Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#1a2238', color: '#64748b' }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => verify(r.id)} disabled={saving} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8', border: '1px solid rgba(29,78,216,0.2)' }}>Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── SECURITIES TAB ───────────────────────────────────────────────────────────
function SecuritiesTab() {
  return (
    <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #f59e0b33', padding: '32px' }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <p className="font-bold mb-2" style={{ fontSize: '15px', color: '#f59e0b' }}>Built in Securities Manager</p>
          <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.7 }}>
            Daily ESX price imports and securities data are managed in the dedicated Securities Manager tab.
            Navigate there to import end-of-day ESX prices, manage IPO pipeline statuses, and update T-bill auction results.
          </p>
          <a href="/roodber8/securities" className="inline-flex items-center gap-2 mt-4 font-bold text-sm rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '8px 16px', border: '1px solid rgba(245,158,11,0.2)' }}>
            Go to Securities Manager →
          </a>
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl" style={{ background: '#0d1424' }} />
      ))}
    </div>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function RateUpdaterAdminClient() {
  const [tab, setTab] = useState(0)

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#080d1a' }}>

      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1D4ED8' }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>Rate Updater</h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>Update FX, savings and loan rates across all institutions. Green = verified within 7 days. Amber = 7–14 days. Red = overdue.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#0d1424', border: '1px solid #1a2238', width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="font-bold rounded-lg text-sm transition-all"
            style={{
              padding: '8px 20px',
              background: tab === i ? '#1D4ED8' : 'transparent',
              color: tab === i ? '#fff' : '#475569',
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <FxTab />}
      {tab === 1 && <SavingsTab />}
      {tab === 2 && <LoansTab />}
      {tab === 3 && <SecuritiesTab />}
    </div>
  )
}
