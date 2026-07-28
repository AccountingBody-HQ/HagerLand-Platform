"use client"
import { useState, useEffect, useCallback } from "react"
type Row = { id: string; [key: string]: string | number | null }
function instName(row: Row): string {
  const joined = row.institutions as unknown as { name?: string }[] | undefined
  return joined?.[0]?.name ?? String(row.institution_slug ?? '')
}
interface FieldConfig { label: string; key: string; type: string; placeholder?: string; options?: { value: string | number | null; label: string | number | null }[] }

const TRANSFER_TYPES = ["swift","western_union","moneygram","local_transfer","mobile_money","diaspora_special"]
const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  swift:            { color: "#1D4ED8", bg: "rgba(29,78,216,0.1)"  },
  western_union:    { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  moneygram:        { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  local_transfer:   { color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  mobile_money:     { color: "#06b6d4", bg: "rgba(6,182,212,0.1)"  },
  diaspora_special: { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
}
const EMPTY_FORM = { institution_slug: "", transfer_type: "swift", destination_countries: "", fee_percentage: "", flat_fee_etb: "", min_amount_etb: "", max_amount_etb: "", processing_hours: "", notes: "" }
function Msg({ text }: { text: string }) {
  if (!text) return null
  const isErr = text.startsWith("Error")
  return <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-4" style={{ background: isErr ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: isErr ? "#ef4444" : "#22c55e", border: "1px solid " + (isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)") }}>{text}</div>
}
function Loader() {
  return <div className="space-y-3 animate-pulse">{[...Array(5)].map((_,i) => <div key={i} className="h-12 rounded-xl" style={{ background: "#0d1424" }} />)}</div>
}
export default function TransferServicesAdminClient() {
  const [services, setServices]         = useState<Row[]>([])
  const [institutions, setInstitutions] = useState<Row[]>([])
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState("")
  const [saving, setSaving]     = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState<Record<string, string>>({ ...EMPTY_FORM })
  const [editId, setEditId]     = useState<string | null>(null)
  const [filterType, setFilterType] = useState("all")
  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/birrbank-transfer-services")
    const d = await r.json()
    setServices(d.services ?? [])
    setInstitutions(d.institutions ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  async function save() {
    setSaving(true); setMsg("")
    const action = editId ? "update" : "add"
    const body = editId ? { action, id: editId, ...form } : { action, ...form }
    const r = await fetch("/api/birrbank-transfer-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const d = await r.json()
    if (d.ok) { setMsg(editId ? "Updated." : "Added."); setShowAdd(false); setForm({ ...EMPTY_FORM }); setEditId(null); load() }
    else setMsg("Error: " + d.error)
    setSaving(false)
  }
  async function toggle(id: string, is_current: boolean) {
    const r = await fetch("/api/birrbank-transfer-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id, is_current: !is_current }) })
    const d = await r.json()
    if (d.ok) load(); else setMsg("Error: " + d.error)
  }
  async function verify(id: string) {
    const r = await fetch("/api/birrbank-transfer-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", id }) })
    const d = await r.json()
    if (d.ok) { setMsg("Verified."); load() } else setMsg("Error: " + d.error)
  }
  async function del(id: string) {
    if (!confirm("Delete this transfer service?")) return
    const r = await fetch("/api/birrbank-transfer-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) })
    const d = await r.json()
    if (d.ok) { setMsg("Deleted."); load() } else setMsg("Error: " + d.error)
  }
  function startEdit(s: Row) {
    setForm({ institution_slug: String(s.institution_slug ?? ""), transfer_type: String(s.transfer_type ?? ""), destination_countries: ((s.destination_countries as unknown as string[]) ?? []).join(", "), fee_percentage: String(s.fee_percentage ?? ""), flat_fee_etb: String(s.flat_fee_etb ?? ""), min_amount_etb: String(s.min_amount_etb ?? ""), max_amount_etb: String(s.max_amount_etb ?? ""), processing_hours: String(s.processing_hours ?? ""), notes: String(s.notes ?? "") })
    setEditId(s.id); setShowAdd(true); setMsg("")
  }
  function cancelEdit() { setShowAdd(false); setForm({ ...EMPTY_FORM }); setEditId(null); setMsg("") }
  const filtered = services.filter(s => filterType === "all" || s.transfer_type === filterType)
  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#080d1a" }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#1D4ED8" }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: "28px", letterSpacing: "-0.5px" }}>Transfer Services</h1>
        <p style={{ color: "#475569", fontSize: "14px" }}>Manage transfer and remittance services. Feeds the /banking/money-transfer fee comparison table.</p>
      </div>
      <Msg text={msg} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total services",  value: String(services.length),                                     color: "#1D4ED8" },
          { label: "Active services", value: String(services.filter(s => s.is_current).length),           color: "#22c55e" },
          { label: "Institutions",    value: String(new Set(services.map(s => s.institution_slug)).size), color: "#f59e0b" },
          { label: "Transfer types",  value: String(new Set(services.map(s => s.transfer_type)).size),    color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl" style={{ background: "#0d1424", border: "1px solid #1a2238", padding: "20px 24px" }}>
            <p className="font-mono font-black mb-1" style={{ fontSize: "28px", color: s.color, letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</p>
            <p className="font-bold text-white" style={{ fontSize: "13px" }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-xl text-sm font-semibold px-3 py-2" style={{ background: "#0d1424", border: "1px solid #1a2238", color: "#94a3b8" }}>
          <option value="all">All types</option>
          {TRANSFER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => { setShowAdd(!showAdd); if (showAdd) cancelEdit() }} className="ml-auto rounded-xl text-sm font-bold px-4 py-2" style={{ background: showAdd ? "rgba(239,68,68,0.1)" : "#1D4ED8", color: showAdd ? "#ef4444" : "#fff", border: showAdd ? "1px solid rgba(239,68,68,0.2)" : "none" }}>
          {showAdd ? "Cancel" : "+ Add service"}
        </button>
      </div>
      {showAdd && (
        <div className="rounded-2xl mb-6" style={{ background: "#0d1424", border: "1px solid #1a2238", padding: "24px" }}>
          <p className="font-bold text-white mb-5" style={{ fontSize: "15px" }}>{editId ? "Edit service" : "Add transfer service"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { label: "Institution *",         key: "institution_slug",      type: "select", options: institutions.map((i) => ({ value: i.slug, label: i.name })) },
              { label: "Transfer type *",       key: "transfer_type",         type: "select", options: TRANSFER_TYPES.map(t => ({ value: t, label: t })) },
              { label: "Fee % of amount",       key: "fee_percentage",        type: "number", placeholder: "e.g. 2.5" },
              { label: "Flat fee (ETB)",        key: "flat_fee_etb",          type: "number", placeholder: "e.g. 100" },
              { label: "Min amount (ETB)",      key: "min_amount_etb",        type: "number", placeholder: "e.g. 500" },
              { label: "Max amount (ETB)",      key: "max_amount_etb",        type: "number", placeholder: "e.g. 1000000" },
              { label: "Processing hours",      key: "processing_hours",      type: "number", placeholder: "e.g. 24" },
              { label: "Destination countries", key: "destination_countries", type: "text",   placeholder: "US, GB, AE (comma separated)" },
              { label: "Notes",                 key: "notes",                 type: "text",   placeholder: "Optional notes" },
            ] as FieldConfig[]).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold mb-1" style={{ color: "#475569" }}>{f.label}</label>
                {f.type === "select" ? (
                  <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full rounded-xl text-sm px-3 py-2.5" style={{ background: "#080d1a", border: "1px solid #1a2238", color: "#e2e8f0" }}>
                    <option value="">Select...</option>
                    {f.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full rounded-xl text-sm px-3 py-2.5" style={{ background: "#080d1a", border: "1px solid #1a2238", color: "#e2e8f0" }} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="rounded-xl text-sm font-bold px-5 py-2.5" style={{ background: "#1D4ED8", color: "#fff", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : editId ? "Update" : "Save service"}</button>
            <button onClick={cancelEdit} className="rounded-xl text-sm font-bold px-5 py-2.5" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid #1a2238" }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1424", border: "1px solid #1a2238" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg, #1D4ED8, #06b6d4)" }} />
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#1a2238" }}>
          <p className="font-bold text-white" style={{ fontSize: "14px" }}>{filtered.length} service{filtered.length !== 1 ? "s" : ""}</p>
          <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.2)" }}>Refresh</button>
        </div>
        {loading ? <div className="p-6"><Loader /></div> : filtered.length === 0 ? (
          <div className="p-12 text-center"><p className="font-semibold" style={{ color: "#475569" }}>No transfer services found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "860px" }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "#1a2238", background: "#080d1a" }}>
                  {["Type","Institution","Fee %","Flat fee","Min","Max","Hours","Status","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-bold uppercase tracking-wide px-4 py-3" style={{ color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const tc = TYPE_COLORS[String(s.transfer_type)] ?? TYPE_COLORS.swift
                  return (
                    <tr key={s.id} className="border-b hover:bg-slate-900 transition-colors" style={{ borderColor: "#1a2238" }}>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ color: tc.color, background: tc.bg }}>{s.transfer_type}</span></td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#94a3b8" }}>{instName(s)}</td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: "#22c55e" }}>{s.fee_percentage != null ? Number(s.fee_percentage).toFixed(2) + "%" : "—"}</td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: "#94a3b8" }}>{s.flat_fee_etb != null ? "ETB " + Number(s.flat_fee_etb).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{s.min_amount_etb != null ? "ETB " + Number(s.min_amount_etb).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{s.max_amount_etb != null ? "ETB " + Number(s.max_amount_etb).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{s.processing_hours != null ? s.processing_hours + "h" : "—"}</td>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: s.is_current ? "#22c55e" : "#ef4444", background: s.is_current ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>{s.is_current ? "Active" : "Inactive"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(s)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.2)" }}>Edit</button>
                          <button onClick={() => verify(s.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>Verify</button>
                          <button onClick={() => toggle(s.id, Boolean(s.is_current))} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: s.is_current ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: s.is_current ? "#f59e0b" : "#22c55e", border: "1px solid " + (s.is_current ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)") }}>{s.is_current ? "Deactivate" : "Activate"}</button>
                          <button onClick={() => del(s.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Delete</button>
                        </div>
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
