'use client'
import { useState, useEffect, useCallback } from 'react'
type Row = { id: string; [key: string]: string | number | null }


const TABS = ['All Institutions', 'Add Institution', 'AI Populate']

const INSTITUTION_TYPES: Record<string, string> = {
  bank:             'Bank',
  insurer:          'Insurer',
  microfinance:     'Microfinance',
  payment_operator: 'Payment Operator',
  money_transfer:   'Money Transfer',
  fx_bureau:        'FX Bureau',
  capital_goods_finance:    'Capital Goods Finance',
  reinsurer:        'Reinsurer',
}

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  bank:             { color: '#1D4ED8', bg: 'rgba(29,78,216,0.1)'   },
  insurer:          { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  microfinance:     { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
  payment_operator: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  money_transfer:   { color: '#ec4899', bg: 'rgba(236,72,153,0.1)'  },
  fx_bureau:        { color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  capital_goods_finance:    { color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  reinsurer:        { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg }}>
      {INSTITUTION_TYPES[type] ?? type}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: active ? '#22c55e' : '#475569', background: active ? 'rgba(34,197,94,0.1)' : 'rgba(71,85,105,0.1)' }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function Loader() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-14 rounded-xl" style={{ background: '#0d1424' }} />
      ))}
    </div>
  )
}

// ── ALL INSTITUTIONS TAB ─────────────────────────────────────────────────────
interface InstitutionsListData {
  institutions: Row[]
  activeCount: number
}
interface PopulateResult {
  institution?: Record<string, string | number | null>
  savings_rates?: Row[]
  loan_rates?: Row[]
  digital_services?: { has_mobile_app?: boolean; has_internet_banking?: boolean; has_ussd?: boolean; has_swift?: boolean }
  guide?: { title?: string; body?: string }
}

function AllInstitutionsTab() {
  const [data, setData]         = useState<InstitutionsListData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [filter, setFilter]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-institutions')
    setData(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActive(slug: string) {
    setSaving(true)
    const res = await fetch('/api/birrbank-institutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_active', slug }),
    })
    const d = await res.json()
    setMsg(d.ok ? 'Status updated.' : 'Error: ' + d.error)
    setSaving(false)
    load()
  }

  if (loading) return <Loader />

  const institutions = data?.institutions ?? []
  const filtered = institutions.filter((i: Row) => {
    const matchName = !filter || String(i.name ?? '').toLowerCase().includes(filter.toLowerCase())
    const matchType = typeFilter === 'all' || i.type === typeFilter
    return matchName && matchType
  })

  const counts: Record<string, number> = {}
  for (const i of institutions) counts[String(i.type)] = (counts[String(i.type)] ?? 0) + 1

  return (
    <div className="space-y-5">
      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', border: '1px solid ' + (msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>
          {msg}
        </div>
      )}

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTypeFilter('all')}
          className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          style={{ background: typeFilter === 'all' ? '#1D4ED8' : '#0d1424', color: typeFilter === 'all' ? '#fff' : '#475569', border: '1px solid ' + (typeFilter === 'all' ? '#1D4ED8' : '#1a2238') }}>
          All ({institutions.length})
        </button>
        {Object.entries(INSTITUTION_TYPES).map(([type, label]) => {
          const c = counts[type] ?? 0
          if (c === 0) return null
          const active = typeFilter === type
          const col = TYPE_COLORS[type]?.color ?? '#64748b'
          return (
            <button key={type} onClick={() => setTypeFilter(type)}
              className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{ background: active ? col : '#0d1424', color: active ? '#fff' : col, border: '1px solid ' + col + (active ? '' : '44') }}>
              {label} ({c})
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>
              {filtered.length} institution{filtered.length !== 1 ? 's' : ''}
            </p>
            <p style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>
              {data?.activeCount ?? 0} active · Toggle to enable on public pages
            </p>
          </div>
          <input placeholder="Search institutions..." value={filter} onChange={e => setFilter(e.target.value)}
            className="rounded-xl text-sm text-white"
            style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '8px 14px', outline: 'none', width: '200px' }} />
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a2238' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#080d1a' }}>
                {['Institution', 'Type', 'SWIFT', 'Website', 'Coverage', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: '#334155' }}>
                    No institutions found.
                  </td>
                </tr>
              )}
              {filtered.map((inst) => (
                <tr key={inst.slug} style={{ borderTop: '1px solid #1a2238' }}>
                  <td className="px-3 py-2.5">
                    <p className="font-bold text-white" style={{ fontSize: '12px' }}>{inst.name}</p>
                    <p style={{ color: '#334155', fontSize: '10px' }}>{inst.slug}</p>
                  </td>
                  <td className="px-3 py-2.5"><TypeBadge type={String(inst.type)} /></td>
                  <td className="px-3 py-2.5 font-mono" style={{ color: '#64748b', fontSize: '11px' }}>{inst.swift_code ?? '—'}</td>
                  <td className="px-3 py-2.5" style={{ maxWidth: '140px' }}>
                    {inst.website_url ? (
                      <a href={String(inst.website_url)} target="_blank" rel="noopener noreferrer"
                        className="hover:underline" style={{ color: '#1D4ED8', fontSize: '11px' }}>
                        {String(inst.website_url).replace('https://', '').replace('http://', '').split('/')[0]}
                      </a>
                    ) : <span style={{ color: '#334155' }}>—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                      style={{
                        color: inst.coverage_level === 'full' ? '#22c55e' : inst.coverage_level === 'standard' ? '#f59e0b' : '#475569',
                        background: inst.coverage_level === 'full' ? 'rgba(34,197,94,0.1)' : inst.coverage_level === 'standard' ? 'rgba(245,158,11,0.1)' : 'rgba(71,85,105,0.1)',
                      }}>
                      {inst.coverage_level ?? 'basic'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge active={Boolean(inst.is_active)} /></td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleActive(String(inst.slug))} disabled={saving}
                      className="text-xs font-bold px-2 py-1 rounded-lg transition-all"
                      style={{
                        background: inst.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: inst.is_active ? '#ef4444' : '#22c55e',
                        border: '1px solid ' + (inst.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'),
                      }}>
                      {inst.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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

// ── ADD INSTITUTION TAB ──────────────────────────────────────────────────────
function AddInstitutionTab() {
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [form, setForm]     = useState({
    slug: '', name: '', type: 'bank',
    swift_code: '', website_url: '', nbe_licence_date: '',
  })

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function submit() {
    if (!form.slug || !form.name || !form.type) {
      setMsg('Slug, name and type are required.')
      return
    }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-institutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_institution', ...form }),
    })
    const d = await res.json()
    setMsg(d.ok ? 'Institution added. Go to AI Populate to fill its data.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) setForm({ slug: '', name: '', type: 'bank', swift_code: '', website_url: '', nbe_licence_date: '' })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', border: '1px solid ' + (msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>
          {msg}
        </div>
      )}

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <p className="font-bold text-white mb-1" style={{ fontSize: '15px' }}>Add New Institution</p>
        <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
          Add an NBE-regulated institution to the registry. Use AI Populate after adding to fill its data.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Institution Name *</p>
              <input value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))}
                placeholder="e.g. Awash Bank"
                className="w-full rounded-xl text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Slug * (auto-generated)</p>
              <input value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. awash-bank"
                className="w-full rounded-xl text-sm font-mono text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Institution Type *</p>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full rounded-xl text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }}>
                {Object.entries(INSTITUTION_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>SWIFT Code</p>
              <input value={form.swift_code}
                onChange={e => setForm(p => ({ ...p, swift_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. AWINETAA"
                className="w-full rounded-xl text-sm font-mono text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Website URL</p>
              <input value={form.website_url}
                onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
                placeholder="https://awashbank.com"
                className="w-full rounded-xl text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>NBE Licence Date</p>
              <input type="date" value={form.nbe_licence_date}
                onChange={e => setForm(p => ({ ...p, nbe_licence_date: e.target.value }))}
                className="w-full rounded-xl text-sm text-white"
                style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }} />
            </div>
          </div>

          <div className="pt-2">
            <button onClick={submit} disabled={saving}
              className="font-bold rounded-xl text-sm transition-all"
              style={{ background: '#1D4ED8', color: '#fff', padding: '10px 24px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Adding...' : 'Add Institution'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '20px 24px' }}>
        <p className="font-bold text-white mb-2" style={{ fontSize: '13px' }}>After adding an institution</p>
        <div className="space-y-1.5">
          {[
            '1. Institution is added as inactive — it will not appear on public pages yet.',
            '2. Go to the AI Populate tab and run AI Populate to fill savings rates, loan rates and digital services.',
            '3. Verify the populated data is accurate against the institution website.',
            '4. Return here and activate the institution to make it live on public pages.',
          ].map(s => (
            <p key={s} style={{ color: '#475569', fontSize: '12px' }}>{s}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── AI POPULATE TAB ──────────────────────────────────────────────────────────
function AiPopulateTab() {
  const [institutions, setInstitutions] = useState<Row[]>([])
  const [selected, setSelected]         = useState('')
  const [running, setRunning]           = useState(false)
  const [result, setResult]             = useState<PopulateResult | null>(null)
  const [msg, setMsg]                   = useState('')
  const [saving, setSaving]             = useState(false)
  const [filter, setFilter]             = useState('')

  useEffect(() => {
    fetch('/api/birrbank-institutions')
      .then(r => r.json())
      .then(d => setInstitutions(d.institutions ?? []))
  }, [])

  async function runPopulate() {
    const inst = institutions.find((i: Row) => i.slug === selected)
    if (!inst) return
    setRunning(true); setResult(null); setMsg('')
    const res = await fetch('/api/populate-institution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionSlug: inst.slug,
        institutionName: inst.name,
        institutionType: inst.type,
      }),
    })
    const d = await res.json()
    setRunning(false)
    if (d.ok) { setResult(d.data); setMsg('') }
    else setMsg('Error: ' + d.error)
  }

  async function saveResult() {
    if (!result || !selected) return
    setSaving(true); setMsg('')

    // Save savings rates
    for (const r of (result.savings_rates ?? [])) {
      await fetch('/api/birrbank-savings-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_rate', institution_slug: selected, ...r }),
      })
    }

    // Save loan rates
    for (const r of (result.loan_rates ?? [])) {
      await fetch('/api/birrbank-loan-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_rate', institution_slug: selected, ...r }),
      })
    }

    // Update institution profile
    if (result.institution) {
      await fetch('/api/birrbank-institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_institution',
          slug: selected,
          website_url: result.institution.website_url,
          swift_code: result.institution.swift_code,
          nbe_licence_date: result.institution.nbe_licence_date,
          phone: result.institution.phone,
          email: result.institution.email,
          description: result.institution.description,
          headquarters: result.institution.headquarters_city,
          hq_region: result.institution.headquarters_city,
          founded_year: result.institution.founded_year,
          nbe_licence_number: result.institution.nbe_licence_number,
          ceo_name: result.institution.ceo_name,
          branches_count: result.institution.branches_count,
          coverage_level: 'standard',
        }),
      })
    }

    // Save digital services
    if (result.digital_services) {
      await fetch('/api/birrbank-digital-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_digital_services',
          institution_slug: selected,
          ...result.digital_services,
        }),
      })
    }

    setSaving(false)
    setMsg('All data saved to Supabase. Activate the institution from the All Institutions tab when verified.')
  }

  const filtered = institutions.filter((i: Row) =>
    !filter || String(i.name ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: msg.startsWith('Error') ? '#ef4444' : '#22c55e', border: '1px solid ' + (msg.startsWith('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)') }}>
          {msg}
        </div>
      )}

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <p className="font-bold text-white mb-1" style={{ fontSize: '15px' }}>AI Populate Institution</p>
        <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
          Select an institution and run AI to populate its savings rates, loan rates, digital services and description.
          Review the result before saving to Supabase.
        </p>

        <div className="flex items-end gap-3 mb-5">
          <div className="flex-1">
            <p style={{ color: '#475569', fontSize: '11px', marginBottom: '4px' }}>Select Institution</p>
            <input placeholder="Search institutions..." value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full rounded-xl text-sm text-white mb-2"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '9px 14px', outline: 'none' }} />
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="w-full rounded-xl text-sm text-white"
              style={{ background: '#080d1a', border: '1px solid #1a2238', padding: '10px 14px', outline: 'none' }}>
              <option value="">Select institution...</option>
              {filtered.map((i) => (
                <option key={String(i.slug)} value={String(i.slug)}>{i.name} ({INSTITUTION_TYPES[String(i.type)] ?? i.type})</option>
              ))}
            </select>
          </div>
          <button onClick={runPopulate} disabled={running || !selected}
            className="font-bold rounded-xl text-sm transition-all shrink-0"
            style={{ background: selected ? '#1D4ED8' : '#1a2238', color: selected ? '#fff' : '#334155', padding: '10px 22px', opacity: running ? 0.7 : 1 }}>
            {running ? 'Running AI...' : 'Run AI Populate'}
          </button>
        </div>

        {running && (
          <div className="rounded-xl p-5 text-center" style={{ background: '#080d1a', border: '1px solid #1a2238' }}>
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin" style={{ borderColor: '#1D4ED8', borderTopColor: 'transparent' }} />
            <p style={{ color: '#475569', fontSize: '13px' }}>AI is researching {institutions.find((i: Row) => i.slug === selected)?.name}...</p>
            <p style={{ color: '#334155', fontSize: '11px', marginTop: '4px' }}>This may take 30-60 seconds</p>
          </div>
        )}

        {result && !running && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: '#080d1a', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="font-bold mb-3" style={{ color: '#22c55e', fontSize: '13px' }}>
                AI populated {institutions.find((i: Row) => i.slug === selected)?.name} — review before saving
              </p>

              {/* Savings rates preview */}
              {result.savings_rates && result.savings_rates.length > 0 && (
                <div className="mb-4">
                  <p style={{ color: '#475569', fontSize: '11px', marginBottom: '6px' }}>SAVINGS RATES ({result.savings_rates.length})</p>
                  <div className="space-y-1.5">
                    {result.savings_rates.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#0d1424' }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{r.account_type}</span>
                        <span className="font-mono font-black" style={{ color: '#1D4ED8', fontSize: '15px' }}>{Number(r.annual_rate).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loan rates preview */}
              {result.loan_rates && result.loan_rates.length > 0 && (
                <div className="mb-4">
                  <p style={{ color: '#475569', fontSize: '11px', marginBottom: '6px' }}>LOAN RATES ({result.loan_rates.length})</p>
                  <div className="space-y-1.5">
                    {result.loan_rates.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#0d1424' }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{r.loan_type}</span>
                        <span className="font-mono font-black" style={{ color: '#f59e0b', fontSize: '14px' }}>
                          {Number(r.min_rate).toFixed(2)}{r.max_rate ? '–' + Number(r.max_rate).toFixed(2) : ''}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital services preview */}
              {result.digital_services && (
                <div className="mb-4">
                  <p style={{ color: '#475569', fontSize: '11px', marginBottom: '6px' }}>DIGITAL SERVICES</p>
                  <div className="flex flex-wrap gap-2">
                    {result.digital_services.has_mobile_app && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>Mobile App</span>}
                    {result.digital_services.has_internet_banking && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>Internet Banking</span>}
                    {result.digital_services.has_ussd && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>USSD</span>}
                    {result.digital_services.has_swift && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(29,78,216,0.1)', color: '#1D4ED8' }}>SWIFT</span>}
                  </div>
                </div>
              )}

              {/* Guide preview */}
              {result.guide?.body && (
                <div>
                  <p style={{ color: '#475569', fontSize: '11px', marginBottom: '6px' }}>GUIDE PREVIEW</p>
                  <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.7 }}>
                    {result.guide.body.slice(0, 300)}...
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveResult} disabled={saving}
                className="font-bold rounded-xl text-sm"
                style={{ background: '#22c55e', color: '#fff', padding: '10px 24px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving to Supabase...' : 'Save All to Supabase'}
              </button>
              <button onClick={() => setResult(null)}
                className="font-bold rounded-xl text-sm"
                style={{ background: '#1a2238', color: '#64748b', padding: '10px 20px' }}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function InstitutionsAdminClient() {
  const [tab, setTab] = useState(0)

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#080d1a' }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#1D4ED8' }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>Institution Manager</h1>
        <p style={{ color: '#475569', fontSize: '14px' }}>Add and manage all NBE-regulated institutions. AI Populate fills rates and descriptions automatically.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#0d1424', border: '1px solid #1a2238', width: 'fit-content' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className="font-bold rounded-lg text-sm transition-all"
            style={{ padding: '8px 20px', background: tab === i ? '#1D4ED8' : 'transparent', color: tab === i ? '#fff' : '#475569' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <AllInstitutionsTab />}
      {tab === 1 && <AddInstitutionTab />}
      {tab === 2 && <AiPopulateTab />}
    </div>
  )
}
