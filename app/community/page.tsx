export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SubmissionBanner } from '@/components/SubmissionBanner'
import { FilterDropdown } from '@/components/FilterDropdown' // eslint-disable-line

export const metadata = {
  title: 'Community organisations | HagerLand',
  description: 'Churches, associations, and support networks for the diaspora community.',
}

const PAGE_SIZE = 20

export default async function CommunityPage({ searchParams }: { searchParams: { category?: string; page?: string } }) {
  const category = searchParams.category
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase.from('community').select('*', { count: 'exact' })
    .eq('status', 'active').order('created_at', { ascending: false }).range(from, to)
  if (category) query = query.eq('category', category)
  const { data: orgs, count, error } = await query

  const { data: catRows } = await supabase.from('community').select('category')
    .eq('status', 'active').not('category', 'is', null)
  const categories = Array.from(new Set((catRows ?? []).map((r) => r.category).filter(Boolean) as string[])).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    params.set('page', String(p))
    return `/community?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" translate="no" /> Homeland <span className="w-1 h-1 rounded-full bg-white/30" translate="no" /> Community</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">Community<br /><span className="text-white/60">organisations,</span><br /><span className="text-white/60">worldwide.</span></h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">Churches, associations, and support networks across the diaspora.</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-10">
              {count != null && count > 0 && <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white" translate="no">{count.toLocaleString()}</span><span className="text-white/40 text-sm">organisations</span></div>}
              <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white" translate="no">Free</span><span className="text-white/40 text-sm">to list</span></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
                <form action="/search" method="get" className="flex items-center gap-2">
                  <input name="q" type="text" placeholder="Search organisations..." className="w-full pl-10 pr-4 py-3.5 rounded-full border-0 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl shadow-black/10" />
                  <button type="submit" className="shrink-0 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-full px-4 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap">Search</button>
                </form>
              </div>
              <Link href="/community/post" className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold rounded-full px-6 py-3.5 text-sm transition-colors whitespace-nowrap">List an organisation →</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
          <SubmissionBanner />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              {categories.length > 0 && <FilterDropdown options={categories} value={category} basePath="/community" paramName="category" allLabel="All categories" />}
              {category && <Link href="/community" className="text-xs font-semibold text-green hover:underline">Clear</Link>}
            </div>
            {count != null && <p className="text-sm text-muted ml-auto">{count.toLocaleString()} {count === 1 ? 'organisation' : 'organisations'}</p>}
          </div>
          {error && <p className="text-sm text-red-600 mb-4">Error loading organisations.</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs && orgs.length > 0 ? orgs.map((org) => (
              <Link key={org.id} href={`/community/${org.id}`}
                className="group flex flex-col bg-white border border-border rounded-2xl overflow-hidden hover:border-l-4 hover:border-l-green hover:border-green/30 hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4 p-5 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center font-black text-green text-lg shrink-0">
                    {org.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm leading-snug truncate group-hover:text-green transition-colors">{org.name}</h3>
                    <p className="text-xs text-muted mt-0.5 truncate">{[org.category, org.city].filter(Boolean).join(' · ') || 'Community organisation'}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-green shrink-0 mt-0.5 transition-colors"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div className="flex items-center gap-2 px-5 pb-4">
                  {org.city && <span className="text-xs font-semibold text-muted bg-section border border-border px-2.5 py-1 rounded-full">{org.city}</span>}
                  {org.category && <span className="text-xs font-semibold text-green bg-green-soft px-2.5 py-1 rounded-full">{org.category}</span>}
                  {org.is_verified && <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full ml-auto"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>}
                </div>
                <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-white mt-auto">
                  {org.category && <span className="flex items-center gap-1.5 text-xs text-muted"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>{org.category}</span>}
                  {org.website && <span className="flex items-center gap-1.5 text-xs font-semibold text-green ml-auto truncate max-w-[120px]">{org.website.replace(/^https?:\/\//, '')}</span>}
                </div>
              </Link>
            )) : <p className="text-muted col-span-full text-center py-16">No organisations listed yet.</p>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {page > 1 && <Link href={pageUrl(page - 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Previous</Link>}
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              {page < totalPages && <Link href={pageUrl(page + 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Next</Link>}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}