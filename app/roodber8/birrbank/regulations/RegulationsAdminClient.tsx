'use client'
import { useState, useEffect, useCallback } from 'react'
type Row = { id: string; [key: string]: string | number | null }


const REGULATORS = ['NBE', 'ECMA', 'ECX', 'MOF', 'other']
const CATEGORIES = ['Directive', 'Proclamation', 'Circular', 'Policy', 'Guideline', 'Amendment', 'Other']

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

const EMPTY = { title: '', summary: '', regulator: 'NBE', category: 'Directive', published_date: '', full_text_url: '' }

export default function RegulationsAdminClient() {
  const [data, setData]       = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState('')
  const [saving, setSaving]   = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ ...EMPTY })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/birrbank-regulations')
    const d = await r.json()
    setData(d.regulations ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!form.title || !form.regulator) { setMsg('Error: title and regulator required'); return }
    setSaving(true); setMsg('')
    const res = await fetch('/api/birrbank-regulations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', ...form }) })
    const d = await res.json()
    setMsg(d.ok ? 'Regulation added.' : 'Error: ' + d.error)
    setSaving(false)
    if (d.ok) { setShowAdd(false); setForm({ ...EMPTY }); load() }
  }

  async function toggle(id: string, current: boolean) {
    await fetch('/api/birrbank-regulations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', id, is_current: !current }) })
    load()
  }

  async function del(id: string, title: string) {
    if (!confirm('Delete: ' + title + '?')) return
    await fetch('/api/birrbank-regulations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    load()
  }

  const REG_COLORS: Record<string, string> = { NBE: '#1D4ED8', ECMA: '#5b21b6', ECX: '#92400e', MOF: '#166534', other: '#475569' }

  return (
    <div className="space-y-6">
      <Msg text={msg} />

      <div className="rounded-2xl" style={{ background: '#0d1424', border: '1px solid #1a2238', padding: '24px' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-white" style={{ fontSize: '15px' }}>Regulations & Directives</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{data.length} directives · NBE, ECMA, ECX</p>
          </div>
          <button onClick={() => setShowAdd(s => !s)}
            className="text-xs font-bold rounded-xl px-4 py-2" style={{ background: '#1D4ED8', color: '#fff' }}>
            {showAdd ? 'Cancel' : '+ Add directive'}
          </button>
        </div>

        {showAdd && (
          <div className="rounded-xl mb-5 space-y-3" style={{ background: '#111827', border: '1px solid #1e2d45', padding: '20px' }}>
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">New Directive</p>
            <input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white" style={{ background: '#0d1424', border: '1px solid #1e2d45' }} />
            <textarea placeholder="Summary (optional)" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              rows={3} className="w-full rounded-lg px-3 py-2.5 text-sm text-white resize-none" style={{ background: '#0d1424', border: '1px solid #1e2d45' }} />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.regulator} onChange={e => setForm(f => ({ ...f, regulator: e.target.value }))}
                className="rounded-lg px-3 py-2.5 text-sm text-white" style={{ background: '#0d1424', border: '1px solid #1e2d45' }}>
                {REGULATORS.map(r => <option key={r}>{r}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="rounded-lg px-3 py-2.5 text-sm text-white" style={{ background: '#0d1424', border: '1px solid #1e2d45' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Published date</label>
                <input type="date" value={form.published_date} onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white" style={{ background: '#0d1424', border: '1px solid #1e2d45' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full text URL</label>
                <input type="url" placeholder="https://nbe.gov.et/..." value={form.full_text_url} onChange={e => setForm(f => ({ ...f, full_text_url: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white" style={{ background: '#0d1424', border: '1px solid #1e2d45' }} />
              </div>
            </div>
            <button onClick={add} disabled={saving}
              className="text-xs font-bold rounded-xl px-5 py-2.5 disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
              {saving ? 'Saving...' : 'Save directive'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 animate-pulse">{[...Array(3)].map((_,i) => <div key={i} className="h-12 rounded-xl" style={{ background: '#111827' }} />)}</div>
        ) : data.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#64748b' }}>No regulations yet. Add the first directive above.</p>
        ) : (
          <div className="space-y-2">
            {data.map((r) => (
              <div key={r.id} className="rounded-xl" style={{ background: '#111827', border: '1px solid #1e2d45', padding: '14px 16px' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-black rounded-full px-2 py-0.5" style={{ background: 'rgba(29,78,216,0.15)', color: REG_COLORS[String(r.regulator)] ?? '#fff' }}>{r.regulator}</span>
                      {r.category && <span className="text-xs text-slate-400">{r.category}</span>}
                      {r.published_date && <span className="text-xs text-slate-500">{new Date(r.published_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>}
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${r.is_current ? 'text-green-400' : 'text-slate-500'}`}
                        style={{ background: r.is_current ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)' }}>
                        {r.is_current ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="font-semibold text-white text-sm">{r.title}</p>
                    {r.summary && <p className="text-xs mt-1 line-clamp-2" style={{ color: '#64748b' }}>{r.summary}</p>}
                    {r.full_text_url && (
                      <a href={String(r.full_text_url)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold mt-1 inline-block hover:underline" style={{ color: '#1D4ED8' }}>
                        Full text →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggle(r.id, Boolean(r.is_current))}
                      className="text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: r.is_current ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: r.is_current ? '#ef4444' : '#22c55e' }}>
                      {r.is_current ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => del(r.id, String(r.title))}
                      className="text-xs font-bold rounded-lg px-3 py-1.5" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
