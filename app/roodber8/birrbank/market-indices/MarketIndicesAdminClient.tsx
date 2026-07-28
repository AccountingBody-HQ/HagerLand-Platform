"use client"
import { useState, useEffect, useCallback } from "react"
type Row = { id: string; [key: string]: string | number | null }
interface FieldConfig { label: string; key: string; type: string; placeholder: string }

const EMPTY_FORM = { index_code: "", index_name: "", index_date: "", close_value: "", change_pct: "", volume: "" }
function Msg({ text }: { text: string }) {
  if (!text) return null
  const isErr = text.startsWith("Error")
  return <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-4" style={{ background: isErr ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: isErr ? "#ef4444" : "#22c55e", border: "1px solid " + (isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)") }}>{text}</div>
}
function Loader() {
  return <div className="space-y-3 animate-pulse">{[...Array(5)].map((_,i) => <div key={i} className="h-12 rounded-xl" style={{ background: "#0d1424" }} />)}</div>
}
export default function MarketIndicesAdminClient() {
  const [indices, setIndices] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState("")
  const [saving, setSaving]   = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState<Record<string, string>>({ ...EMPTY_FORM })
  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/birrbank-market-indices")
    const d = await r.json()
    setIndices(d.indices ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  async function save() {
    setSaving(true); setMsg("")
    const r = await fetch("/api/birrbank-market-indices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upsert", ...form }) })
    const d = await r.json()
    if (d.ok) { setMsg("Index saved."); setShowAdd(false); setForm({ ...EMPTY_FORM }); load() }
    else setMsg("Error: " + d.error)
    setSaving(false)
  }
  async function del(id: string, code: string) {
    if (!confirm("Delete index entry " + code + "?")) return
    const r = await fetch("/api/birrbank-market-indices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) })
    const d = await r.json()
    if (d.ok) { setMsg("Deleted."); load() } else setMsg("Error: " + d.error)
  }
  const fmt = (v: string | number | null) => v == null ? "—" : Number(v).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = (d: string | number | null) => d == null ? "—" : new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#080d1a" }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#1D4ED8" }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: "28px", letterSpacing: "-0.5px" }}>Market Indices</h1>
        <p style={{ color: "#475569", fontSize: "14px" }}>Manage ESX market index levels. Upsert by index code and date. Existing rows are updated automatically.</p>
      </div>
      <Msg text={msg} />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total entries",  value: String(indices.length),                               color: "#1D4ED8" },
          { label: "Unique indices", value: String(new Set(indices.map(i => i.index_code)).size), color: "#22c55e" },
          { label: "Latest date",    value: indices[0]?.index_date ?? "—",                   color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl" style={{ background: "#0d1424", border: "1px solid #1a2238", padding: "20px 24px" }}>
            <p className="font-mono font-black mb-1" style={{ fontSize: "24px", color: s.color, letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</p>
            <p className="font-bold text-white" style={{ fontSize: "13px" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setShowAdd(!showAdd)} className="ml-auto rounded-xl text-sm font-bold px-4 py-2" style={{ background: showAdd ? "rgba(239,68,68,0.1)" : "#1D4ED8", color: showAdd ? "#ef4444" : "#fff", border: showAdd ? "1px solid rgba(239,68,68,0.2)" : "none" }}>
          {showAdd ? "Cancel" : "+ Add / update index"}
        </button>
      </div>
      {showAdd && (
        <div className="rounded-2xl mb-6" style={{ background: "#0d1424", border: "1px solid #1a2238", padding: "24px" }}>
          <p className="font-bold text-white mb-2" style={{ fontSize: "15px" }}>Add or update index entry</p>
          <p className="text-xs mb-5" style={{ color: "#475569" }}>If an entry already exists for this code and date it will be updated automatically.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { label: "Index code *",  key: "index_code",  type: "text",   placeholder: "e.g. ESX-ALL" },
              { label: "Index name *",  key: "index_name",  type: "text",   placeholder: "e.g. ESX All Share Index" },
              { label: "Date *",        key: "index_date",  type: "date",   placeholder: "" },
              { label: "Close value *", key: "close_value", type: "number", placeholder: "e.g. 1250.50" },
              { label: "Change %",      key: "change_pct",  type: "number", placeholder: "e.g. 0.45" },
              { label: "Volume",        key: "volume",      type: "number", placeholder: "e.g. 125000" },
            ] as FieldConfig[]).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold mb-1" style={{ color: "#475569" }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full rounded-xl text-sm px-3 py-2.5" style={{ background: "#080d1a", border: "1px solid #1a2238", color: "#e2e8f0" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="rounded-xl text-sm font-bold px-5 py-2.5" style={{ background: "#1D4ED8", color: "#fff", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save index entry"}</button>
            <button onClick={() => { setShowAdd(false); setForm({ ...EMPTY_FORM }) }} className="rounded-xl text-sm font-bold px-5 py-2.5" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid #1a2238" }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1424", border: "1px solid #1a2238" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg, #1D4ED8, #22c55e)" }} />
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#1a2238" }}>
          <p className="font-bold text-white" style={{ fontSize: "14px" }}>{indices.length} entries (last 100)</p>
          <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.2)" }}>Refresh</button>
        </div>
        {loading ? <div className="p-6"><Loader /></div> : indices.length === 0 ? (
          <div className="p-12 text-center"><p className="font-semibold" style={{ color: "#475569" }}>No index data yet. Add an entry above.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "700px" }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "#1a2238", background: "#080d1a" }}>
                  {["Code","Name","Date","Close value","Change %","Volume","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-bold uppercase tracking-wide px-4 py-3" style={{ color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {indices.map((idx) => {
                  const pos = Number(idx.change_pct ?? 0) >= 0
                  return (
                    <tr key={idx.id} className="border-b hover:bg-slate-900 transition-colors" style={{ borderColor: "#1a2238" }}>
                      <td className="px-4 py-3"><span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg" style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd" }}>{idx.index_code}</span></td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{idx.index_name}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>{fmtDate(idx.index_date)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{fmt(idx.close_value)}</td>
                      <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: idx.change_pct != null ? (pos ? "#22c55e" : "#ef4444") : "#334155" }}>{idx.change_pct != null ? (pos ? "+" : "") + Number(idx.change_pct).toFixed(2) + "%" : "—"}</td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: "#64748b" }}>{idx.volume != null ? Number(idx.volume).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => del(idx.id, String(idx.index_code))} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
