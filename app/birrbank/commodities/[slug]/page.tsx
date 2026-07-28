import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createBirrBankAdminClient } from "@/lib/supabase-birrbank"
import EmailCapture from "@/components/EmailCapture"

export const dynamic = "force-dynamic"

function fmt(val: number | null | undefined) {
  if (val == null) return "\u2014"
  return Number(val).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtVol(val: number | null | undefined) {
  if (val == null) return "\u2014"
  return (Number(val) / 1000).toFixed(1) + "t"
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function parentLink(type: string | null): { href: string; label: string } {
  if (type === "coffee") return { href: "/birrbank/commodities/coffee", label: "Coffee Prices" }
  if (type === "sesame") return { href: "/birrbank/commodities/sesame", label: "Sesame Prices" }
  return { href: "/birrbank/commodities/grains", label: "Grain Prices" }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const { slug } = params
  const supabase = createBirrBankAdminClient()
  const code = slug.toUpperCase()
  const { data } = await supabase
    .schema("birrbank")
    .from("commodity_prices")
    .select("commodity_name, commodity_code, commodity_type, grade, region_of_origin")
    .eq("commodity_code", code)
    .order("trade_date", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return { title: "Commodity | BirrBank" }
  return {
    title: `${data.commodity_name} (${data.commodity_code}) ECX Price History | BirrBank`,
    description: `Daily ECX settlement price history for ${data.commodity_name} (${data.commodity_code}). Grade: ${data.grade ?? "\u2014"}. Origin: ${data.region_of_origin ?? "\u2014"}. Prices in ETB per kilogram.`,
  }
}

export default async function CommoditySlugPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params
  const supabase = createBirrBankAdminClient()
  const code = slug.toUpperCase()

  const [latestRes, historyRes] = await Promise.all([
    supabase
      .schema("birrbank")
      .from("commodity_prices")
      .select("*")
      .eq("commodity_code", code)
      .order("trade_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .schema("birrbank")
      .from("commodity_history")
      .select("trade_date, price_etb, volume_kg")
      .eq("commodity_code", code)
      .order("trade_date", { ascending: false })
      .limit(30),
  ])

  if (!latestRes.data) notFound()

  const c = latestRes.data
  const history = historyRes.data ?? []
  const parent = parentLink(c.commodity_type)

  const changePositive = (c.price_change ?? 0) >= 0
  const changeColour = changePositive ? "#22c55e" : "#ef4444"

  // Calculate day-over-day change for history rows
  type HistoryRow = { trade_date: string; price_etb: number | null; volume_kg: number | null }
  const historyWithChange = history.map((row: HistoryRow, i: number) => {
    const prev = history[i + 1]
    const change = prev && prev.price_etb && row.price_etb
      ? row.price_etb - prev.price_etb
      : null
    const changePct = prev && prev.price_etb && row.price_etb && change !== null
      ? (change / prev.price_etb) * 100
      : null
    return { ...row, change, changePct }
  })

  return (
    <main className="bg-white flex-1">
      {/* Dark hero */}
      <section className="relative overflow-hidden bg-green">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right, #fff 0%, transparent 60%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
          {/* Breadcrumb */}

          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            ECX Settlement Price
          </div>

          {/* Heading */}
          <div className="flex items-start gap-4 mb-3 flex-wrap">
            <span
              className="font-mono font-black text-white rounded-xl px-3 py-1.5 shrink-0"
              style={{ background: "#1C7C4C", fontSize: "14px", letterSpacing: "0.05em" }}
            >
              {c.commodity_code}
            </span>
          </div>
          <h1
            className="font-bold text-white mb-4"
            style={{ fontSize: "clamp(30px, 4vw, 52px)", letterSpacing: "-0.025em", lineHeight: 1.08 }}
          >
            {c.commodity_name}
          </h1>
          <p className="text-white/65 mb-10" style={{ fontSize: "16px", lineHeight: 1.8, maxWidth: "520px" }}>
            {c.grade ? `Grade ${c.grade}` : ""}{c.grade && c.region_of_origin ? " \u00b7 " : ""}{c.region_of_origin ?? ""} ECX daily settlement price in ETB per kilogram.
          </p>

          {/* Stat bar */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 mt-2 pt-8 border-t border-white/20"
          >
            {[
              { value: `ETB ${fmt(c.price_etb)}`, label: "Latest price (per kg)" },
              {
                value: c.price_change != null
                  ? `${changePositive ? "+" : ""}${fmt(c.price_change)}`
                  : "\u2014",
                label: "Day change (ETB)",
                colour: c.price_change != null ? changeColour : undefined,
              },
              {
                value: c.price_change_pct != null
                  ? `${changePositive ? "+" : ""}${Number(c.price_change_pct).toFixed(2)}%`
                  : "\u2014",
                label: "Day change (%)",
                colour: c.price_change != null ? changeColour : undefined,
              },
              { value: fmtVol(c.volume_kg), label: "Volume today" },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center py-6 border-r border-white/20 last:border-r-0"
              >
                <div
                  className="font-mono font-black text-white mb-1"
                  style={{ fontSize: "clamp(16px, 2.5vw, 28px)", letterSpacing: "-1px", color: s.colour ?? "#ffffff" }}
                >
                  {s.value}
                </div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grade info strip */}
      <section style={{ background: "#F4F5F3", borderBottom: "1px solid #E4E6E3", padding: "24px 0" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Commodity type", value: c.commodity_type ?? "\u2014" },
              { label: "Grade", value: c.grade ?? "\u2014" },
              { label: "Region of origin", value: c.region_of_origin ?? "\u2014" },
              { label: "Last trade date", value: c.trade_date ? fmtDate(c.trade_date) : "\u2014" },
              { label: "Price unit", value: "ETB per kg (ECX quintal \u00f7 100)" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                <span className="font-semibold text-slate-800 capitalize" style={{ fontSize: "14px" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price history table */}
      <section style={{ background: "#ffffff", padding: "64px 0 80px" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#1C7C4C" }}>
                Price history
              </p>
              <h2
                className="font-bold text-slate-950"
                style={{ fontSize: "clamp(22px, 3vw, 36px)", letterSpacing: "-0.5px" }}
              >
                30-day settlement prices.
              </h2>
            </div>
            <span
              className="text-xs font-bold rounded-full px-3 py-1.5 border shrink-0"
              style={{ color: "#166534", background: "#dcfce7", borderColor: "#bbf7d0" }}
            >
              ECX Source
            </span>
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-400 font-semibold">No historical data available yet for {c.commodity_code}.</p>
              <p className="text-slate-400 text-sm mt-2">History is recorded daily after ECX market close.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
              <div style={{ height: 4, background: "linear-gradient(90deg, #1C7C4C, #f59e0b)" }} />
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: "480px" }}>
                  <thead>
                    <tr className="border-b border-slate-200" style={{ background: "#F4F5F3" }}>
                      {["Trade date", "Price (ETB/kg)", "Day change", "Change %", "Volume"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide"
                          style={{ padding: "13px 20px" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyWithChange.map((row, i) => {
                      const pos = (row.change ?? 0) >= 0
                      const rowChangeColour = row.change === null ? "#5B6472" : pos ? "#16a34a" : "#dc2626"
                      return (
                        <tr
                          key={row.trade_date}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                        >
                          <td className="font-semibold text-slate-700" style={{ padding: "14px 20px", fontSize: "14px" }}>
                            {fmtDate(row.trade_date)}
                            {i === 0 && (
                              <span
                                className="ml-2 text-xs font-bold rounded-full px-2 py-0.5"
                                style={{ background: "#E9F5EE", color: "#1C7C4C" }}
                              >
                                Latest
                              </span>
                            )}
                          </td>
                          <td className="font-mono font-bold text-slate-900" style={{ padding: "14px 20px", fontSize: "14px" }}>
                            {fmt(row.price_etb)}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            {row.change !== null ? (
                              <span
                                className="font-mono font-bold text-xs rounded-full px-2 py-1"
                                style={{ color: rowChangeColour, background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)" }}
                              >
                                {pos ? "+" : ""}{fmt(row.change)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">\u2014</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            {row.changePct !== null ? (
                              <span style={{ color: rowChangeColour, fontSize: "13px", fontWeight: 700 }}>
                                {pos ? "+" : ""}{Number(row.changePct).toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">\u2014</span>
                            )}
                          </td>
                          <td className="text-slate-500 font-mono" style={{ padding: "14px 20px", fontSize: "13px" }}>
                            {fmtVol(row.volume_kg)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4">
            Prices are ECX daily settlement prices in ETB per kilogram. ECX publishes prices in ETB per quintal (100kg) - BirrBank divides by 100.
          </p>
        </div>
      </section>

      {/* About ECX section */}
      <section style={{ background: "#F4F5F3", padding: "64px 0 80px", borderTop: "1px solid #E4E6E3" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#1C7C4C" }}>
            About ECX grades
          </p>
          <h2
            className="font-bold text-slate-950 mb-6"
            style={{ fontSize: "clamp(22px, 3vw, 36px)", letterSpacing: "-0.5px", maxWidth: "560px" }}
          >
            How ECX commodity codes work.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "ECX commodity codes",
                body: "Each ECX code identifies a specific commodity, grade, and origin combination. For example, LWGJ3 means Limu Washed Grade 3 coffee from the Jimma region.",
              },
              {
                title: "Settlement prices",
                body: "Prices are daily settlement prices determined by ECX trading at the end of each market session. They reflect actual traded prices, not indicative quotes.",
              },
              {
                title: "Price units",
                body: "ECX publishes prices in ETB per quintal (100kg). BirrBank converts all prices to ETB per kilogram for easy comparison with international markets.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-slate-200 p-6"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div style={{ height: 4, background: "linear-gradient(90deg, #1C7C4C, #155F3A)", borderRadius: "9999px", marginBottom: "20px" }} />
                <h3 className="font-bold text-slate-900 mb-3" style={{ fontSize: "17px" }}>{card.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section style={{ background: "#1C7C4C", padding: "72px 0", borderTop: "1px solid #155F3A" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#ffffff" }}>
            ECX commodities
          </p>
          <h2
            className="font-bold text-white mb-4"
            style={{ fontSize: "clamp(24px, 3.5vw, 42px)", letterSpacing: "-0.5px" }}
          >
            Track all Ethiopian commodity prices.
          </h2>
          <p className="text-slate-400 mb-10" style={{ fontSize: "16px", maxWidth: "480px", margin: "0 auto 40px" }}>
            Coffee, sesame, grains and more - daily ECX settlement prices across all grades and origins.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={parent.href} className="hero-btn hero-btn-primary">
              Back to {parent.label}
            </Link>
            <Link href="/birrbank/commodities" className="hero-btn hero-btn-secondary">
              All commodities
            </Link>
          </div>
        </div>
      </section>

      <EmailCapture />
    </main>
  )
}
