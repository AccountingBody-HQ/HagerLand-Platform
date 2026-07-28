"use client"
import { useState, useEffect, useCallback } from "react"
type Row = { id: string; [key: string]: string | number | null }


function Loader() {
  return <div className="space-y-3 animate-pulse">{[...Array(8)].map((_,i) => <div key={i} className="h-12 rounded-xl" style={{ background: "#0d1424" }} />)}</div>
}

function Msg({ text }: { text: string }) {
  if (!text) return null
  const isErr = text.startsWith("Error")
  return <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-4" style={{ background: isErr ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: isErr ? "#ef4444" : "#22c55e", border: "1px solid " + (isErr ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)") }}>{text}</div>
}

export default function SubscribersAdminClient() {
  const [subscribers, setSubscribers] = useState<Row[]>([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState("")
  const [filter, setFilter]           = useState("all")
  const [search, setSearch]           = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/birrbank-subscribers")
    const d = await r.json()
    if (d.error) setMsg("Error: " + d.error)
    else setSubscribers(d.subscribers ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActive(id: string, is_active: boolean) {
    const r = await fetch("/api/birrbank-subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id, is_active: !is_active }),
    })
    const d = await r.json()
    if (d.ok) load(); else setMsg("Error: " + d.error)
  }

  async function del(id: string, email: string) {
    if (!confirm("Delete subscriber " + email + "?")) return
    const r = await fetch("/api/birrbank-subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    })
    const d = await r.json()
    if (d.ok) { setMsg("Deleted."); load() } else setMsg("Error: " + d.error)
  }

  function fmtDate(d: string | number | null) {
    if (d == null) return "—"
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  const filtered = subscribers.filter(s => {
    const matchFilter = filter === "all" || (filter === "active" && s.is_active) || (filter === "inactive" && !s.is_active)
    const matchSearch = !search || String(s.email ?? '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#080d1a" }}>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#1D4ED8" }}>BirrBank Admin</p>
        <h1 className="font-bold text-white mb-1" style={{ fontSize: "28px", letterSpacing: "-0.5px" }}>Email Subscribers</h1>
        <p style={{ color: "#475569", fontSize: "14px" }}>Newsletter subscribers collected via the EmailCapture component across all public pages.</p>
      </div>

      <Msg text={msg} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total subscribers", value: String(subscribers.length),                          color: "#1D4ED8" },
          { label: "Active",            value: String(subscribers.filter(s => s.is_active).length), color: "#22c55e" },
          { label: "Inactive",          value: String(subscribers.filter(s => !s.is_active).length),color: "#ef4444" },
          { label: "This month",        value: String(subscribers.filter(s => {
            const d = new Date(s.subscribed_at ?? 0)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length), color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl" style={{ background: "#0d1424", border: "1px solid #1a2238", padding: "20px 24px" }}>
            <p className="font-mono font-black mb-1" style={{ fontSize: "28px", color: s.color, letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</p>
            <p className="font-bold text-white" style={{ fontSize: "13px" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input type="text" placeholder="Search by email..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-xl text-sm px-3 py-2 w-64"
          style={{ background: "#0d1424", border: "1px solid #1a2238", color: "#e2e8f0" }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-xl text-sm font-semibold px-3 py-2"
          style={{ background: "#0d1424", border: "1px solid #1a2238", color: "#94a3b8" }}>
          <option value="all">All subscribers</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <button onClick={load} className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(29,78,216,0.1)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.2)" }}>
          Refresh
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1424", border: "1px solid #1a2238" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg, #1D4ED8, #22c55e)" }} />
        <div className="px-6 py-4 border-b" style={{ borderColor: "#1a2238" }}>
          <p className="font-bold text-white" style={{ fontSize: "14px" }}>{filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {loading ? <div className="p-6"><Loader /></div> : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold" style={{ color: "#475569" }}>No subscribers yet.</p>
            <p className="text-sm mt-1" style={{ color: "#334155" }}>Subscribers appear here when users sign up via the EmailCapture component.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "600px" }}>
              <thead>
                <tr className="border-b" style={{ borderColor: "#1a2238", background: "#080d1a" }}>
                  {["Email","Subscribed","Country","Status","Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-bold uppercase tracking-wide px-4 py-3" style={{ color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-slate-900 transition-colors" style={{ borderColor: "#1a2238" }}>
                    <td className="px-4 py-3 font-mono text-sm text-white">{s.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>{fmtDate(s.subscribed_at)}</td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: "#64748b" }}>{s.country_code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: s.is_active ? "#22c55e" : "#ef4444", background: s.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                        {s.is_active ? "Active" : "Unsubscribed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(s.id, Boolean(s.is_active))}
                          className="text-xs font-bold px-2 py-1 rounded-lg"
                          style={{ background: s.is_active ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: s.is_active ? "#f59e0b" : "#22c55e", border: "1px solid " + (s.is_active ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)") }}>
                          {s.is_active ? "Unsubscribe" : "Reactivate"}
                        </button>
                        <button onClick={() => del(s.id, String(s.email))}
                          className="text-xs font-bold px-2 py-1 rounded-lg"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                          Delete
                        </button>
                      </div>
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
