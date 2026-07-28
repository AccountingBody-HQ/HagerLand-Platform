'use client'
import { useState, useEffect, useCallback } from 'react'
type Row = { id: string; [key: string]: string | number | null }


const TABS = ['Current Prices', 'Price Import', 'Add Price']

const COMMODITY_TYPES: Record<string, { label: string; color: string }> = {
  coffee:   { label: 'Coffee',   color: '#92400e' },
  sesame:   { label: 'Sesame',   color: '#f59e0b' },
  bean:     { label: 'Beans',    color: '#10b981' },
  grain:    { label: 'Grains',   color: '#f97316' },
  chickpea: { label: 'Chickpea', color: '#8b5cf6' },
  soybean:  { label: 'Soybean',  color: '#06b6d4' },
  other:    { label: 'Other',    color: '#64748b' },
}

function TypeBadge({ type }: { type: string }) {
  const c = COMMODITY_TYPES[type] ?? COMMODITY_TYPES.other
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.color + '18' }}>{c.label}</span>
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
      {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl" style={{ background: '#0d1424' }} />)}
    </div>
  )
}

// ── CURRENT PRICES TAB ───────────────────────────────────────────────────────
interface PricesData {
  today_prices: Row[]
  all_prices: Row[]
  today: string
}

function CurrentPricesTab() {
  const [data, setData]         = useState<PricesData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-commodities')
    setData(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today_prices = data?.today_prices ?? []
  const all_prices   = data?.all_prices   ?? []
  const display      = today_prices.length > 0 ? today_prices : all_prices

  const filtered = display.filter((p: Row) =>
    typeFilter === 'all' || p.commodity_type === typeFilter
  )

  const counts: Record<string, number> = {}
  for (const p of display) counts[String(p.commodity_type)] = (counts[String(p.commodity_type)] ?? 0) + 1

  return (
    <div className="space-y-5">
      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTypeFilter('all')}
          className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: typeFilter === 'all' ? '#1D4ED8' : '#0d1424', color: typeFilter === 'all' ? '#fff' : '#475569', border: '1px solid ' + (typeFilter === 'all' ? '#1D4ED8' : '#1a2238') }}>
          All ({display.length})
        </button>
        {Object.entries(COMMODITY_TYPES).map(([type, val]) => {
          const c = counts[type] ?? 0
          if (c === 0) return null
          const active = typeFilter === type
          return (
            <button key={type} onClick={() => setTypeFilter(type)}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{ background: active ? val.color : '#0d1424', color: active ? '#fff' : val.color, border: '1px solid ' + val.color + (active ? '' : '44') }}>
              {val.label} ({c})
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>
              {today_prices.length > 0 ? "Today's ECX Prices" : "Latest ECX Prices"}
            </p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>
              {today_prices.length > 0 ? data?.today + ' · ' + filtered.length + ' commodities' : 'No prices for today yet — showing most recent data'}
            </p>
          </div>
          <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ background: '#1a2238', color: '#475569', border: '1px solid #1a2238' }}>
            Refresh
          </button>
        </div>

        {loading ? <Loader /> : filtered.length === 0 ? (
          <div className="text-center py-10" style={{ color: '#334155' }}>
            No commodity prices found. Use Price Import or Add Price tab to add data.
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ background: '#080d1a' }}>
                {['Code', 'Commodity', 'Type', 'Grade', 'Origin', 'Price (ETB/quintal)', 'Change', 'Volume (kg)', 'Date'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid #1a2238' }}>
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>{p.commodity_code}</span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-white">{p.commodity_name}</td>
                    <td className="px-3 py-2.5"><TypeBadge type={String(p.commodity_type)} /></td>
                    <td className="px-3 py-2.5" style={{ color: '#64748b' }}>{p.grade ?? '—'}</td>
                    <td className="px-3 py-2.5" style={{ color: '#64748b' }}>{p.region_of_origin ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono font-black" style={{ color: '#f59e0b', fontSize: '14px' }}>
                      {Number(p.price_etb).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-mono"
                      style={{ color: Number(p.price_change_pct ?? 0) > 0 ? '#22c55e' : Number(p.price_change_pct ?? 0) < 0 ? '#ef4444' : '#64748b' }}>
                      {p.price_change_pct != null ? (Number(p.price_change_pct) > 0 ? '+' : '') + Number(p.price_change_pct).toFixed(2) + '%' : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: '#64748b' }}>
                      {p.volume_kg ? Number(p.volume_kg).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: '#475569' }}>{p.trade_date}</td>
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
  const [raw, setRaw]       = useState('')
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [parsed, setParsed] = useState<Record<string, string>[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')

  function parseInput() {
    const lines = raw.trim().split('\n').filter(Boolean)
    const rows: Record<string, string>[] = []
    for (const line of lines) {
      const parts = line.split(/[\t,|]+/).map((s: string) => s.trim())
      if (parts.length >= 3) {
        rows.push({
          commodity_code: parts[0].toUpperCase(),
          commodity_name: parts[1],
          commodity_type: parts[2].toLowerCase(),
          price_etb: parts[3] ?? '',
          price_change_pct: parts[4] ?? '',
          grade: parts[5] ?? '',
          volume_kg: parts[6] ?? '',
          trade_date: tradeDate,
        })
      }
    }
    setParsed(rows)
    setMsg(rows.length > 0 ? '' : 'Could not parse rows. Format: CODE  NAME  TYPE  PRICE  CHANGE%  GRADE  VOLUME')
  }

  async function importPrices() {
    if (parsed.length === 0) return
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-commodities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import_ecx_prices', prices: parsed }),
    })
    const d = await res.json()
    setMsg(d.ok ? 'Imported ' + d.saved + ' commodity prices. History updated.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setRaw(''); setParsed([]) }
  }

  return (
    <div className="space-y-5">
      <Msg text={msg} />
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <p className="font-bold text-white mb-1" style={{ fontSize: '15px' }}>ECX Daily Price Import</p>
        <p style={{ color: '#475569', fontSize: '12px', marginBottom: '16px' }}>
          Paste ECX daily price data. Format per line:
          <span className="font-mono ml-1" style={{ color: '#1D4ED8' }}>CODE  NAME  TYPE  PRICE  CHANGE%  GRADE  VOLUME_KG</span>
        </p>
        <p style={{ color: '#334155', fontSize: '11px', marginBottom: '16px' }}>
          Types: coffee | sesame | bean | grain | chickpea | soybean | other
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Trade Date</p>
            <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)}
              className="w-full rounded-xl text-sm text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '9px 14px', outline: 'none' }} />
          </div>
        </div>

        <div className="mb-3">
          <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>ECX Price Data</p>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={8}
            placeholder={'LUBPAA2\tWashed Coffee Grade 2\tcoffee\t18500\t+2.5\tGrade 2\t45000\nWHGS2\tSesame White Humera\tsesame\t9200\t-1.2\tGrade 2\t32000'}
            className="w-full rounded-xl text-sm font-mono text-white"
            style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '12px 14px', outline: 'none', resize: 'vertical' }} />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={parseInput}
            className="font-bold rounded-xl text-sm"
            style={{ background: '#1a2238', color: '#94a3b8', padding: '9px 18px', border: '1px solid #1a2238' }}>
            Parse
          </button>
          {parsed.length > 0 && (
            <button onClick={importPrices} disabled={saving}
              className="font-bold rounded-xl text-sm"
              style={{ background: '#f59e0b', color: '#000', padding: '9px 20px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Importing...' : 'Import ' + parsed.length + ' prices'}
            </button>
          )}
        </div>

        {parsed.length > 0 && (
          <div className="mt-5 rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
            <table className="w-full text-xs">
              <thead><tr style={{ background: '#080d1a' }}>
                {['Code', 'Name', 'Type', 'Price (ETB)', 'Change %', 'Grade', 'Volume'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {parsed.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #1a2238' }}>
                    <td className="px-3 py-2"><span className="font-mono font-black text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>{r.commodity_code}</span></td>
                    <td className="px-3 py-2 text-white">{r.commodity_name}</td>
                    <td className="px-3 py-2"><TypeBadge type={String(r.commodity_type)} /></td>
                    <td className="px-3 py-2 font-mono font-bold" style={{ color: '#f59e0b' }}>{Number(r.price_etb).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: String(r.price_change_pct ?? '').startsWith('-') ? '#ef4444' : '#22c55e' }}>{r.price_change_pct || '—'}</td>
                    <td className="px-3 py-2" style={{ color: '#64748b' }}>{r.grade || '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: '#64748b' }}>{r.volume_kg || '—'}</td>
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

// ── ADD PRICE TAB ────────────────────────────────────────────────────────────
function AddPriceTab() {
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [form, setForm]     = useState<Record<string, string>>({
    commodity_code: '', commodity_name: '', commodity_type: 'coffee',
    grade: '', region_of_origin: '', price_etb: '',
    price_change: '', price_change_pct: '', volume_kg: '',
    trade_date: new Date().toISOString().split('T')[0],
  })

  async function save() {
    if (!form.commodity_code || !form.commodity_name || !form.price_etb) {
      setMsg('Code, name and price are required.')
      return
    }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-commodities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_price', ...form }),
    })
    const d = await res.json()
    setMsg(d.ok ? 'Price saved. History updated.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) setForm(p => ({ ...p, commodity_code: '', commodity_name: '', price_etb: '', price_change: '', price_change_pct: '', volume_kg: '' }))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Msg text={msg} />
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <p className="font-bold text-white mb-1" style={{ fontSize: '15px' }}>Add Single Commodity Price</p>
        <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
          Add or update a single commodity price. Saves to commodity_prices and commodity_history tables.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'ECX Code *', key: 'commodity_code', placeholder: 'e.g. LUBPAA2' },
            { label: 'Commodity Name *', key: 'commodity_name', placeholder: 'e.g. Washed Coffee Grade 2' },
            { label: 'Grade', key: 'grade', placeholder: 'e.g. Grade 2' },
            { label: 'Region of Origin', key: 'region_of_origin', placeholder: 'e.g. Yirgacheffe' },
            { label: 'Price (ETB/quintal) *', key: 'price_etb', placeholder: '18500', type: 'number' },
            { label: 'Price Change (ETB)', key: 'price_change', placeholder: '450', type: 'number' },
            { label: 'Change %', key: 'price_change_pct', placeholder: '2.50', type: 'number' },
            { label: 'Volume (kg)', key: 'volume_kg', placeholder: '45000', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>{f.label}</p>
              <input type={f.type ?? 'text'} placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full rounded-xl text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
          ))}

          <div>
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Commodity Type</p>
            <select value={form.commodity_type} onChange={e => setForm(p => ({ ...p, commodity_type: e.target.value }))}
              className="w-full rounded-xl text-sm text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }}>
              {Object.entries(COMMODITY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Trade Date</p>
            <input type="date" value={form.trade_date}
              onChange={e => setForm(p => ({ ...p, trade_date: e.target.value }))}
              className="w-full rounded-xl text-sm text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
          </div>
        </div>

        <div className="mt-5">
          <button onClick={save} disabled={saving}
            className="font-bold rounded-xl text-sm transition-all"
            style={{ background: '#f59e0b', color: '#000', padding: '10px 24px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Price'}
          </button>
        </div>
      </div>

      {/* ECX commodity codes reference */}
      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '20px 24px' }}>
        <p className="font-bold text-white mb-3" style={{ fontSize: '13px' }}>Common ECX Commodity Codes</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['LUBPAA2', 'Washed Coffee Grade 2'],
            ['LUBPAA3', 'Washed Coffee Grade 3'],
            ['LUBPAA5', 'Washed Coffee Grade 5'],
            ['LUBPDD5', 'Unwashed Coffee Grade 5'],
            ['WHGS2',   'Sesame White Humera Grade 2'],
            ['BRDC3',   'Red Kidney Beans Grade 3'],
            ['RWPA3',   'White Pea Beans Grade 3'],
            ['WWSS4',   'Chickpeas Grade 4'],
            ['SBWO2',   'Soybeans Grade 2'],
            ['LWBP2',   'White Wheat Grade 2'],
          ].map(([code, name]) => (
            <div key={code} className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold" style={{ color: '#1D4ED8', minWidth: '80px' }}>{code}</span>
              <span style={{ color: '#475569', fontSize: '11px' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CommoditiesAdminClient() {
  const [tab, setTab] = useState(0)
  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#080d1a' }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1D4ED8' }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>Commodities Manager</h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>
          Manage ECX daily commodity prices for coffee, sesame, grains and beans. Saves to commodity_prices and commodity_history tables.
        </p>
      </div>
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#0d1424', border: '1px solid #1a2238', width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="font-bold rounded-lg text-sm transition-all"
            style={{ padding: '8px 20px', background: tab === i ? '#f59e0b' : 'transparent', color: tab === i ? '#000' : '#475569' }}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <CurrentPricesTab />}
      {tab === 1 && <PriceImportTab />}
      {tab === 2 && <AddPriceTab />}
    </div>
  )
}
