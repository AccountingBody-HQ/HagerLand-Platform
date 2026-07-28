"use client"
import { useState, useEffect, useCallback } from "react"
type Row = { id: string; [key: string]: string | number | null }
interface FieldConfig { label: string; key: string; type: string; placeholder?: string; options?: { value: string | number | null; label: string | number | null }[] }


const PRODUCT_TYPES = ["motor","life","health","property","travel","agriculture","liability","micro_insurance"]
const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  motor:           { color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  life:            { color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  health:          { color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  property:        { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  travel:          { color: "#06b6d4", bg: "rgba(6,182,212,0.1)"   },
  agriculture:     { color: "#84cc16", bg: "rgba(132,204,22,0.1)"  },
  liability:       { color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  micro_insurance: { color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
}
const EMPTY_FORM = {
  institution_slug: "", product_type: "motor", product_name: "",
  premium_from_etb: "", premium_to_etb: "", annual_premium_pct: "",
  coverage_from_etb: "", coverage_to_etb: "",
  is_sharia_compliant: false, source_url: "", notes: "",
}
function Msg({ text }: { text: string }) {
  if (!text) return null
  const isErr = text.startsWith("Error")
  return (
    <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-4"
      style={{ background: isErr ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: isErr ? "#ef4444" : "#22c55e", border: "1px solid " + (isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)") }}>
      {text}
    </div>
  )
}
function Loader() {
  return <div className="space-y-3 animate-pulse">{[...Array(5)].map((_,i) => <div key={i} className="h-12 rounded-xl" style={{ background: "#0d1424" }} />)}</div>
}
export default function InsuranceAdminClient() {
  const [products, setProducts] = useState<Row[]>([])
  const [insurers, setInsurers] = useState<Row[]>([])
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState("")
  const [saving, setSaving]     = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState<Record<string, string | boolean>>({ ...EMPTY_FORM })
  const [editId, setEditId]     = useState<string | null>(null)
  const [filterType, setFilterType]       = useState("all")
  const [filterInsurer, setFilterInsurer] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/birrbank-insurance")
    const d = await r.json()
    setProducts(d.products ?? [])
    setInsurers(d.insurers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true); setMsg("")
    const action = editId ? "update" : "add"
    const body = editId ? { action, id: editId, ...form } : { action, ...form }
    const r = await fetch("/api/birrbank-insurance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const d = await r.json()
    if (d.ok) { setMsg(editId ? "Product updated." : "Product added."); setShowAdd(false); setForm({ ...EMPTY_FORM }); setEditId(null); load() }
    else setMsg("Error: " + d.error)
    setSaving(false)
  }

  async function toggle(id: string, is_current: boolean) {
    const r = await fetch("/api/birrbank-insurance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id, is_current: !is_current }) })
    const d = await r.json()
    if (d.ok) load(); else setMsg("Error: " + d.error)
  }

  async function verify(id: string) {
    const r = await fetch("/api/birrbank-insurance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", id }) })
    const d = await r.json()
    if (d.ok) { setMsg("Verified."); load() } else setMsg("Error: " + d.error)
  }

  async function del(id: string, name: string) {
    if (!confirm("Delete " + name + "?")) return
    const r = await fetch("/api/birrbank-insurance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) })
    const d = await r.json()
    if (d.ok) { setMsg("Deleted."); load() } else setMsg("Error: " + d.error)
  }

  function startEdit(p: Row) {
    setForm({
      institution_slug: String(p.institution_slug ?? ""), product_type: String(p.product_type ?? ""), product_name: String(p.product_name ?? ""),
      premium_from_etb: String(p.premium_from_etb ?? ""), premium_to_etb: String(p.premium_to_etb ?? ""),
      annual_premium_pct: String(p.annual_premium_pct ?? ""), coverage_from_etb: String(p.coverage_from_etb ?? ""),
      coverage_to_etb: String(p.coverage_to_etb ?? ""), is_sharia_compliant: Boolean(p.is_sharia_compliant ?? false),
      source_url: String(p.source_url ?? ""), notes: String(p.notes ?? ""),
    })
    setEditId(p.id); setShowAdd(true); setMsg("")
  }

  function cancelEdit() { setShowAdd(false); setForm({ ...EMPTY_FORM }); setEditId(null); setMsg("") }

  const fmt = (v: string | number | null) => v == null ? "—" : "ETB " + Number(v).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const filtered = products.filter(p => (filterType === "all" || p.product_type === filterType) && (filterInsurer === "all" || p.institution_slug === filterInsurer))

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#080d1a" }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#1D4ED8" }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: "28px", letterSpacing: "-0.5px" }}>Insurance Products</h1>
        <p style={{ color: "#475569", fontSize: "14px" }}>Manage insurance products across all NBE-licensed insurers. Feeds all /insurance/* public pages.</p>
      </div>
      <Msg text={msg} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total products",   value: String(products.length),                                              color: "#1D4ED8" },
          { label: "Active products",  value: String(products.filter(p => p.is_current).length),                   color: "#22c55e" },
          { label: "Insurers covered", value: String(new Set(products.map(p => p.institution_slug)).size),          color: "#f59e0b" },
          { label: "Product types",    value: String(new Set(products.map(p => p.product_type)).size),              color: "#8b5cf6" },
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
          {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterInsurer} onChange={e => setFilterInsurer(e.target.value)} className="rounded-xl text-sm font-semibold px-3 py-2" style={{ background: "#0d1424", border: "1px solid #1a2238", color: "#94a3b8" }}>
          <option value="all">All insurers</option>
          {insurers.map((i) => <option key={String(i.slug)} value={String(i.slug)}>{i.name}</option>)}
        </select>
        <button onClick={() => { setShowAdd(!showAdd); if (showAdd) cancelEdit() }} className="ml-auto rounded-xl text-sm font-bold px-4 py-2"
          style={{ background: showAdd ? "rgba(239,68,68,0.1)" : "#1D4ED8", color: showAdd ? "#ef4444" : "#fff", border: showAdd ? "1px solid rgba(239,68,68,0.2)" : "none" }}>
          {showAdd ? "Cancel" : "+ Add product"}
        </button>
      </div>
      {showAdd && (
        <div className="rounded-2xl mb-6" style={{ background: "#0d1424", border: "1px solid #1a2238", padding: "24px" }}>
          <p className="font-bold text-white mb-5" style={{ fontSize: "15px" }}>{editId ? "Edit product" : "Add insurance product"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { label: "Insurer *",                    key: "institution_slug",  type: "select", options: insurers.map((i) => ({ value: i.slug, label: i.name })) },
              { label: "Product type *",               key: "product_type",      type: "select", options: PRODUCT_TYPES.map(t => ({ value: t, label: t })) },
              { label: "Product name *",               key: "product_name",      type: "text",   placeholder: "e.g. Third-Party Motor" },
              { label: "Annual premium % of value",    key: "annual_premium_pct",type: "number", placeholder: "e.g. 3.5" },
              { label: "Premium from (ETB)",           key: "premium_from_etb",  type: "number", placeholder: "e.g. 500" },
              { label: "Premium to (ETB)",             key: "premium_to_etb",    type: "number", placeholder: "e.g. 50000" },
              { label: "Coverage from (ETB)",          key: "coverage_from_etb", type: "number", placeholder: "e.g. 100000" },
              { label: "Coverage to (ETB)",            key: "coverage_to_etb",   type: "number", placeholder: "e.g. 5000000" },
              { label: "Source URL",                   key: "source_url",        type: "text",   placeholder: "https://insurer.com/products" },
              { label: "Notes",                        key: "notes",             type: "text",   placeholder: "Optional notes" },
            ] as FieldConfig[]).map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold mb-1" style={{ color: "#475569" }}>{f.label}</label>
                {f.type === "select" ? (
                  <select value={form[f.key] as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full rounded-xl text-sm px-3 py-2.5" style={{ background: "#080d1a", border: "1px solid #1a2238", color: "#e2e8f0" }}>
                    <option value="">Select...</option>
                    {f.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={form[f.key] as string} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full rounded-xl text-sm px-3 py-2.5" style={{ background: "#080d1a", border: "1px solid #1a2238", color: "#e2e8f0" }} />
                )}
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="sharia" checked={form.is_sharia_compliant as boolean}
                onChange={e => setForm(p => ({ ...p, is_sharia_compliant: e.target.checked }))} />
              <label htmlFor="sharia" className="text-sm font-semibold" style={{ color: "#94a3b8" }}>Sharia compliant</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="rounded-xl text-sm font-bold px-5 py-2.5"
              style={{ background: "#1D4ED8", color: "#fff", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : editId ? "Update product" : "Save product"}
            </button>
            <button onClick={cancelEdit} className="rounded-xl text-sm font-bold px-5 py-2.5"
              style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid #1a2238" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1424", border: "1px solid #1a2238" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg, #1D4ED8, #8b5cf6)" }} />
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#1a2238" }}>
          <p className="font-bold text-white" style={{ fontSize: "14px" }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
          <button onClick={load} className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.2)" }}>Refresh</button>
        </div>
        {loading ? <div className="p-6"><Loader /></div> : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold" style={{ color: "#475569" }}>No products found.</p>
            <p className="text-sm mt-1" style={{ color: "#334155" }}>Add a product using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "900px" }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "#1a2238", background: "#080d1a" }}>
                  {["Type","Insurer","Product","Premium %","Premium range","Coverage range","Sharia","Status","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-bold uppercase tracking-wide px-4 py-3" style={{ color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const tc = TYPE_COLORS[String(p.product_type)] ?? TYPE_COLORS.motor
                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-900 transition-colors" style={{ borderColor: "#1a2238" }}>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ color: tc.color, background: tc.bg }}>{p.product_type}</span></td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#94a3b8" }}>{(p.institutions as unknown as { name?: string }[] | undefined)?.[0]?.name ?? p.institution_slug}</td>
                      <td className="px-4 py-3 text-sm font-bold text-white">{p.product_name}</td>
                      <td className="px-4 py-3 font-mono text-sm" style={{ color: "#22c55e" }}>{p.annual_premium_pct != null ? Number(p.annual_premium_pct).toFixed(2) + "%" : "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{p.premium_from_etb != null || p.premium_to_etb != null ? fmt(p.premium_from_etb) + " – " + fmt(p.premium_to_etb) : "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{p.coverage_from_etb != null || p.coverage_to_etb != null ? fmt(p.coverage_from_etb) + " – " + fmt(p.coverage_to_etb) : "—"}</td>
                      <td className="px-4 py-3"><span className="text-xs font-bold" style={{ color: p.is_sharia_compliant ? "#22c55e" : "#334155" }}>{p.is_sharia_compliant ? "Yes" : "No"}</span></td>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: p.is_current ? "#22c55e" : "#ef4444", background: p.is_current ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>{p.is_current ? "Active" : "Inactive"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(p)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.2)" }}>Edit</button>
                          <button onClick={() => verify(p.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>Verify</button>
                          <button onClick={() => toggle(p.id, Boolean(p.is_current))} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: p.is_current ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: p.is_current ? "#f59e0b" : "#22c55e", border: "1px solid " + (p.is_current ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)") }}>{p.is_current ? "Deactivate" : "Activate"}</button>
                          <button onClick={() => del(p.id, String(p.product_name))} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Delete</button>
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
