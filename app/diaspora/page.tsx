import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SearchBox } from '@/components/SearchBox'

export const revalidate = 60

export const metadata = {
  title: 'Diaspora Businesses | HagerLand',
  description: 'Businesses, jobs, housing, money, cars, tutors, and delivery — everything the Ethiopian diaspora needs, in one place.',
}

const SECTIONS = [
  { href: '/business', label: 'Businesses', description: 'Shops, restaurants, and verified community businesses', table: 'companies',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>` },
  { href: '/jobs', label: 'Jobs', description: 'Employment and opportunities within the community', table: 'jobs',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>` },
  { href: '/housing', label: 'Housing', description: 'Rooms, rentals, and properties', table: 'housing',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
  { href: '/money', label: 'Money', description: 'Transfers, exchange, and financial services', table: 'money',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>` },
  { href: '/cars', label: 'Cars & taxi', description: 'Buy, sell, or find a trusted driver', table: 'cars',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>` },
  { href: '/tutors', label: 'Tutors', description: 'Expert teaching and mentoring', table: 'tutors',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>` },
  { href: '/delivery', label: 'Delivery', description: 'Courier, freight, and cargo services', table: 'delivery',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
] as const

export default async function DiasporaPage() {
  const [b, j, h, c, t, m, d] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('housing').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tutors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('money').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('delivery').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  const counts: Record<string, number> = {
    companies: b.count ?? 0, jobs: j.count ?? 0, housing: h.count ?? 0,
    cars: c.count ?? 0, tutors: t.count ?? 0, money: m.count ?? 0, delivery: d.count ?? 0,
  }
  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" translate="no" /> Homeland <span className="w-1 h-1 rounded-full bg-white/30" translate="no" /> Diaspora Businesses</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">Everything the<br /><span className="text-white/60">diaspora</span><br /><span className="text-white/60">needs.</span></h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">Businesses, jobs, housing, money, cars, tutors, and delivery — verified listings for Ethiopians and Eritreans wherever in the world you are.</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-10">
              <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white" translate="no">{totalListings.toLocaleString()}</span><span className="text-white/40 text-sm">listings</span></div>
              <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white" translate="no">7</span><span className="text-white/40 text-sm">sections</span></div>
              <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white" translate="no">Free</span><span className="text-white/40 text-sm">to list</span></div>
            </div>
            <div className="max-w-xl">
              <SearchBox className="shadow-xl shadow-black/10" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION CARDS */}
      <section className="bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Browse diaspora sections</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-ink">Pick a section to get started</h2>
            </div>
            <Link href="/business/post" className="hidden sm:inline-flex items-center gap-2 border border-border text-ink text-sm font-semibold rounded-full px-5 py-2.5 hover:border-ink hover:bg-section transition-all shrink-0">
              List your business →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SECTIONS.map((section) => (
              <Link key={section.href} href={section.href}
                className="group bg-white border border-border rounded-2xl p-6 hover:border-green/50 hover:shadow-lg transition-all duration-200 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-green-soft text-green flex items-center justify-center mb-5 shrink-0"
                  dangerouslySetInnerHTML={{ __html: section.icon }} />
                <h3 className="font-bold text-ink text-base mb-1.5 group-hover:text-green transition-colors">{section.label}</h3>
                <p className="text-sm text-muted leading-relaxed flex-1">{section.description}</p>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/60">
                  {counts[section.table] > 0 ? (
                    <p className="text-xs font-bold text-green" translate="no">{counts[section.table].toLocaleString()} listings</p>
                  ) : <span />}
                  <span className="w-7 h-7 rounded-full bg-green-soft flex items-center justify-center transition-all duration-300 group-hover:bg-green">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green group-hover:text-white transition-colors"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-green/20 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-ink mb-1">Looking for Ethiopian-made products?</h3>
              <p className="text-muted text-sm">Visit Made in Ethiopia — authentic products, straight from origin.</p>
            </div>
            <Link href="/made-in-ethiopia" className="w-48 text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 px-4 transition-colors text-sm whitespace-nowrap shrink-0">
              Made in Ethiopia →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
