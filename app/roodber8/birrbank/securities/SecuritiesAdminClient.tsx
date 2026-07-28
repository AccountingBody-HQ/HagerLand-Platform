'use client'
import { useState, useEffect, useCallback } from 'react'
type Row = { id: string; [key: string]: string | number | null }


const TABS = ['Listed Companies', 'Price Import', 'IPO Pipeline', 'Debt Instruments']

const IPO_STATUSES = ['announced', 'review', 'approved', 'open', 'priced', 'listed', 'withdrawn']

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  announced: { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  review:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  approved:  { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
  open:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  priced:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  listed:    { color: '#1D4ED8', bg: 'rgba(29,78,216,0.1)'   },
  withdrawn: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.announced
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ color: c.color, background: c.bg }}>{status}</span>
  )
}

function Msg({ text }: { text: string }) {
  if (!text) return null
  const isErr = text.startsWith('Error')
  return (
    <div className="rounded-xl px-4 py-3 text-sm font-semibold"
      style={{ background: isErr ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: isErr ? '#ef4444' : '#22c55e', border: '1px solid ' + (isErr ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>
      {text}
    </div>
  )
}

function Loader() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_,i) => <div key={i} className="h-12 rounded-xl" style={{ background: '#0d1424' }} />)}
    </div>
  )
}

// ── LISTED COMPANIES TAB ─────────────────────────────────────────────────────
function ListedCompaniesTab() {
  const [data, setData]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState<Record<string, string>>({ ticker: '', company_name: '', sector: '', security_type: 'equity', listing_date: '', last_price_etb: '', institution_slug: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-securities?tab=securities')
    const d = await r.json()
    setData(d.securities ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addSecurity() {
    if (!form.ticker || !form.company_name) { setMsg('Ticker and company name required.'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-securities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_security', ...form }) })
    const d = await res.json()
    setMsg(d.ok ? 'Security added.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setShowAdd(false); setForm({ ticker: '', company_name: '', sector: '', security_type: 'equity', listing_date: '', last_price_etb: '', institution_slug: '' }); load() }
  }

  return (
    <div className="space-y-5">
      <Msg text={msg} />
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>ESX Listed Securities</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{data.length} securities tracked</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)} className="font-bold rounded-xl text-sm" style={{ background: '#1D4ED8', color: '#fff', padding: '8px 16px' }}>+ Add Security</button>
        </div>

        {showAdd && (
          <div className="rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: '#080d1a', border: '1px solid #1D4ED8' }}>
            {[
              { label: 'Ticker *', key: 'ticker', placeholder: 'e.g. WEGB' },
              { label: 'Company Name *', key: 'company_name', placeholder: 'e.g. Wegagen Bank' },
              { label: 'Sector', key: 'sector', placeholder: 'e.g. Banking' },
              { label: 'Listing Date', key: 'listing_date', placeholder: 'YYYY-MM-DD', type: 'date' },
              { label: 'Last Price (ETB)', key: 'last_price_etb', placeholder: '0.00', type: 'number' },
              { label: 'Institution Slug', key: 'institution_slug', placeholder: 'e.g. wegagen-bank' },
            ].map(f => (
              <div key={f.key}>
                <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>{f.label}</p>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-lg text-sm text-white"
                  style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
              </div>
            ))}
            <div className="flex items-end gap-2 col-span-2 sm:col-span-3">
              <button onClick={addSecurity} disabled={saving} className="font-bold rounded-lg text-sm" style={{ background: '#22c55e', color: '#fff', padding: '8px 16px' }}>Save</button>
              <button onClick={() => setShowAdd(false)} className="font-bold rounded-lg text-sm" style={{ background: '#1a2238', color: '#64748b', padding: '8px 16px' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <Loader /> : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ background: '#080d1a' }}>
                {['Ticker', 'Company', 'Sector', 'Type', 'Last Price', 'Change %', 'Last Updated'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#334155' }}>No securities. Add one above.</td></tr>}
                {data.map((s) => (
                  <tr key={s.ticker} style={{ borderTop: '1px solid #1a2238' }}>
                    <td className="px-3 py-2.5"><span className="font-mono font-black text-xs px-2 py-0.5 rounded" style={{ background: '#1D4ED8', color: '#fff' }}>{s.ticker}</span></td>
                    <td className="px-3 py-2.5 font-semibold text-white">{s.company_name}</td>
                    <td className="px-3 py-2.5" style={{ color: '#64748b' }}>{s.sector ?? '—'}</td>
                    <td className="px-3 py-2.5 capitalize" style={{ color: '#64748b' }}>{s.security_type}</td>
                    <td className="px-3 py-2.5 font-mono font-bold" style={{ color: '#22c55e' }}>{s.last_price_etb ? Number(s.last_price_etb).toFixed(2) + ' ETB' : '—'}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: Number(s.price_change_pct ?? 0) > 0 ? '#22c55e' : Number(s.price_change_pct ?? 0) < 0 ? '#ef4444' : '#64748b' }}>
                      {s.price_change_pct != null ? (Number(s.price_change_pct) > 0 ? '+' : '') + Number(s.price_change_pct).toFixed(2) + '%' : '—'}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#475569' }}>{s.last_updated ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PRICE IMPORT TAB ─────────────────────────────────────────────────────────
function PriceImportTab() {
  const [raw, setRaw]         = useState('')
  const [parsed, setParsed]   = useState<Record<string, string>[]>([])
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  function parseInput() {
    const lines = raw.trim().split('\n').filter(Boolean)
    const rows: Record<string, string>[] = []
    for (const line of lines) {
      const parts = line.split(/[\t,|]+/).map(s => s.trim())
      if (parts.length >= 2) {
        rows.push({ ticker: parts[0].toUpperCase(), price: parts[1], change: parts[2] ?? '', volume: parts[3] ?? '' })
      }
    }
    setParsed(rows)
    setMsg(rows.length > 0 ? '' : 'Could not parse any rows. Use format: TICKER  PRICE  CHANGE%  VOLUME')
  }

  async function importPrices() {
    if (parsed.length === 0) return
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-securities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'import_esx_prices', prices: parsed }) })
    const d = await res.json()
    setMsg(d.ok ? 'Imported ' + d.saved + ' price updates. Price history updated.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setRaw(''); setParsed([]) }
  }

  return (
    <div className="space-y-5">
      <Msg text={msg} />
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <p className="font-bold text-white mb-1" style={{ fontSize: '15px' }}>ESX End-of-Day Price Import</p>
        <p style={{ color: '#475569', fontSize: '12px', marginBottom: '16px' }}>
          Paste the ESX daily summary below. Accepted format: <span className="font-mono" style={{ color: '#1D4ED8' }}>TICKER  PRICE  CHANGE%  VOLUME</span> — one row per line.
          Tab, comma or pipe separated.
        </p>

        <div className="mb-3">
          <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>ESX Daily Data</p>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={8}
            placeholder={'WEGB\t95.50\t+2.15\t12000\nGADB\t42.00\t-0.50\t8500'}
            className="w-full rounded-xl text-sm font-mono text-white"
            style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '12px 14px', outline: 'none', resize: 'vertical' }} />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={parseInput} className="font-bold rounded-xl text-sm" style={{ background: '#1a2238', color: '#94a3b8', padding: '9px 18px', border: '1px solid #1a2238' }}>
            Parse
          </button>
          {parsed.length > 0 && (
            <button onClick={importPrices} disabled={saving} className="font-bold rounded-xl text-sm" style={{ background: '#1D4ED8', color: '#fff', padding: '9px 20px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Importing...' : 'Import ' + parsed.length + ' prices'}
            </button>
          )}
        </div>

        {parsed.length > 0 && (
          <div className="mt-5 rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ background: '#080d1a' }}>
                {['Ticker', 'Price (ETB)', 'Change %', 'Volume'].map(h => <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: '#475569' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1a2238' }}>
                    <td className="px-3 py-2"><span className="font-mono font-black px-1.5 py-0.5 rounded text-xs" style={{ background: '#1D4ED8', color: '#fff' }}>{r.ticker}</span></td>
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: '#22c55e' }}>{r.price}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: String(r.change ?? '').startsWith('-') ? '#ef4444' : '#22c55e' }}>{r.change}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#64748b' }}>{r.volume || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── IPO PIPELINE TAB ─────────────────────────────────────────────────────────
function IpoPipelineTab() {
  const [data, setData]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState<Record<string, string>>({ company_name: '', sector: '', offer_price_etb: '', shares_offered: '', subscription_open: '', subscription_close: '', expected_listing: '', status: 'announced', lead_manager: '', prospectus_url: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-securities?tab=ipo')
    const d = await r.json()
    setData(d.ipos ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addIpo() {
    if (!form.company_name) { setMsg('Company name required.'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-securities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_ipo', ...form }) })
    const d = await res.json()
    setMsg(d.ok ? 'IPO added.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setShowAdd(false); load() }
  }

  async function updateStatus(id: string, status: string) {
    setSaving(true)
    await fetch('/api/birrbank-securities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_ipo_status', id, status }) })
    setSaving(false); load()
  }

  const counts = IPO_STATUSES.reduce((acc, s) => ({ ...acc, [s]: data.filter((i: Row) => i.status === s).length }), {} as Record<string, number>)

  return (
    <div className="space-y-5">
      <Msg text={msg} />

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {IPO_STATUSES.map(s => {
          const c = STATUS_COLORS[s]
          return (
            <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ color: c.color, background: c.bg, border: '1px solid ' + c.color + '33' }}>
              <span className="capitalize">{s}</span>
              <span className="font-mono">({counts[s] ?? 0})</span>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>IPO Pipeline</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{data.length} companies tracked</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)} className="font-bold rounded-xl text-sm" style={{ background: '#1D4ED8', color: '#fff', padding: '8px 16px' }}>+ Add IPO</button>
        </div>

        {showAdd && (
          <div className="rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: '#080d1a', border: '1px solid #1D4ED8' }}>
            {[
              { label: 'Company Name *', key: 'company_name', placeholder: 'e.g. Ethio Telecom' },
              { label: 'Sector', key: 'sector', placeholder: 'e.g. Telecoms' },
              { label: 'Offer Price (ETB)', key: 'offer_price_etb', placeholder: '0.00', type: 'number' },
              { label: 'Shares Offered', key: 'shares_offered', placeholder: '1000000', type: 'number' },
              { label: 'Sub. Open', key: 'subscription_open', type: 'date', placeholder: '' },
              { label: 'Sub. Close', key: 'subscription_close', type: 'date', placeholder: '' },
              { label: 'Expected Listing', key: 'expected_listing', type: 'date', placeholder: '' },
              { label: 'Lead Manager', key: 'lead_manager', placeholder: 'e.g. CBE Capital' },
              { label: 'Prospectus URL', key: 'prospectus_url', placeholder: 'https://...' },
            ].map(f => (
              <div key={f.key}>
                <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>{f.label}</p>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-lg text-sm text-white"
                  style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
              </div>
            ))}
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Status</p>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full rounded-lg text-sm text-white capitalize"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }}>
                {IPO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2 col-span-2 sm:col-span-3">
              <button onClick={addIpo} disabled={saving} className="font-bold rounded-lg text-sm" style={{ background: '#22c55e', color: '#fff', padding: '8px 16px' }}>Save</button>
              <button onClick={() => setShowAdd(false)} className="font-bold rounded-lg text-sm" style={{ background: '#1a2238', color: '#64748b', padding: '8px 16px' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <Loader /> : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ background: '#080d1a' }}>
                {['Company', 'Sector', 'Offer Price', 'Expected Listing', 'Status', 'Update Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#334155' }}>No IPOs. Add one above.</td></tr>}
                {data.map((ipo) => (
                  <tr key={ipo.id} style={{ borderTop: '1px solid #1a2238' }}>
                    <td className="px-3 py-2.5 font-semibold text-white">{ipo.company_name}</td>
                    <td className="px-3 py-2.5" style={{ color: '#64748b' }}>{ipo.sector ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#f59e0b' }}>{ipo.offer_price_etb ? Number(ipo.offer_price_etb).toFixed(2) + ' ETB' : '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: '#64748b' }}>{ipo.expected_listing ?? '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={String(ipo.status)} /></td>
                    <td className="px-3 py-2.5">
                      <select value={String(ipo.status)} onChange={e => updateStatus(ipo.id, e.target.value)} disabled={saving}
                        className="rounded-lg text-xs text-white capitalize"
                        style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '4px 8px', outline: 'none' }}>
                        {IPO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── DEBT INSTRUMENTS TAB ─────────────────────────────────────────────────────
function DebtInstrumentsTab() {
  const [data, setData]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState<Record<string, string>>({ instrument_type: 'tbill', issuer: 'NBE', issue_date: '', maturity_date: '', face_value_etb: '', coupon_rate_pct: '', yield_pct: '', auction_date: '', minimum_investment: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-securities?tab=debt')
    const d = await r.json()
    setData(d.instruments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addInstrument() {
    if (!form.yield_pct) { setMsg('Yield % is required.'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-securities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_debt_instrument', ...form }) })
    const d = await res.json()
    setMsg(d.ok ? 'Instrument added.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setShowAdd(false); load() }
  }

  return (
    <div className="space-y-5">
      <Msg text={msg} />
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>T-Bills & Bonds</p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>{data.length} instruments · NBE auction results</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)} className="font-bold rounded-xl text-sm" style={{ background: '#1D4ED8', color: '#fff', padding: '8px 16px' }}>+ Add Instrument</button>
        </div>

        {showAdd && (
          <div className="rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ background: '#080d1a', border: '1px solid #1D4ED8' }}>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Type</p>
              <select value={form.instrument_type} onChange={e => setForm(p => ({ ...p, instrument_type: e.target.value }))}
                className="w-full rounded-lg text-sm text-white"
                style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }}>
                <option value="tbill">T-Bill</option>
                <option value="bond">Bond</option>
                <option value="corporate_bond">Corporate Bond</option>
              </select>
            </div>
            {[
              { label: 'Issuer', key: 'issuer', placeholder: 'NBE' },
              { label: 'Yield % *', key: 'yield_pct', placeholder: 'e.g. 8.50', type: 'number' },
              { label: 'Coupon Rate %', key: 'coupon_rate_pct', placeholder: 'e.g. 8.00', type: 'number' },
              { label: 'Face Value (ETB)', key: 'face_value_etb', placeholder: '100000', type: 'number' },
              { label: 'Min Investment (ETB)', key: 'minimum_investment', placeholder: '100000', type: 'number' },
              { label: 'Auction Date', key: 'auction_date', type: 'date', placeholder: '' },
              { label: 'Issue Date', key: 'issue_date', type: 'date', placeholder: '' },
              { label: 'Maturity Date', key: 'maturity_date', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key}>
                <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>{f.label}</p>
                <input type={f.type ?? 'text'} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-lg text-sm text-white"
                  style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '8px 12px', outline: 'none' }} />
              </div>
            ))}
            <div className="flex items-end gap-2 col-span-2 sm:col-span-3">
              <button onClick={addInstrument} disabled={saving} className="font-bold rounded-lg text-sm" style={{ background: '#22c55e', color: '#fff', padding: '8px 16px' }}>Save</button>
              <button onClick={() => setShowAdd(false)} className="font-bold rounded-lg text-sm" style={{ background: '#1a2238', color: '#64748b', padding: '8px 16px' }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <Loader /> : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ background: '#080d1a' }}>
                {['Type', 'Issuer', 'Yield %', 'Coupon %', 'Maturity', 'Min Investment', 'Auction Date'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#334155' }}>No instruments. Add one above.</td></tr>}
                {data.map((d) => (
                  <tr key={d.id} style={{ borderTop: '1px solid #1a2238' }}>
                    <td className="px-3 py-2.5"><span className="font-bold text-xs px-2 py-0.5 rounded uppercase" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>{d.instrument_type}</span></td>
                    <td className="px-3 py-2.5 font-semibold text-white">{d.issuer}</td>
                    <td className="px-3 py-2.5 font-mono font-black" style={{ color: '#22c55e', fontSize: '14px' }}>{d.yield_pct ? Number(d.yield_pct).toFixed(2) + '%' : '—'}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#64748b' }}>{d.coupon_rate_pct ? Number(d.coupon_rate_pct).toFixed(2) + '%' : '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: '#64748b' }}>{d.maturity_date ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#64748b' }}>{d.minimum_investment ? Number(d.minimum_investment).toLocaleString() + ' ETB' : '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: '#475569' }}>{d.auction_date ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SecuritiesAdminClient() {
  const [tab, setTab] = useState(0)
  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#080d1a' }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1D4ED8' }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>Securities Manager</h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>Manage ESX listings, daily price imports, IPO pipeline statuses and NBE T-bill auction results.</p>
      </div>
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#0d1424', border: '1px solid #1a2238', width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="font-bold rounded-lg text-sm transition-all"
            style={{ padding: '8px 20px', background: tab === i ? '#1D4ED8' : 'transparent', color: tab === i ? '#fff' : '#475569' }}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <ListedCompaniesTab />}
      {tab === 1 && <PriceImportTab />}
      {tab === 2 && <IpoPipelineTab />}
      {tab === 3 && <DebtInstrumentsTab />}
    </div>
  )
}
