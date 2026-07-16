import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SubmissionBanner } from '@/components/SubmissionBanner'
import { FilterDropdown } from '@/components/FilterDropdown' // eslint-disable-line

export const metadata = {
  title: 'Community events | HagerLand',
  description: 'Cultural celebrations, religious events, and networking across the diaspora.',
}

const PAGE_SIZE = 20

export default async function EventsPage({ searchParams }: { searchParams: { category?: string; past?: string; page?: string } }) {
  const category = searchParams.category
  const showPast = searchParams.past === '1'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const today = new Date().toISOString().split('T')[0]

  let query = supabase.from('events').select('*', { count: 'exact' })
    .eq('status', 'active').order('event_date', { ascending: true }).range(from, to)
  if (category) query = query.eq('category', category)
  if (!showPast) query = query.gte('event_date', today)
  const { data: events, count, error } = await query

  const { data: catRows } = await supabase.from('events').select('category')
    .eq('status', 'active').not('category', 'is', null)
  const categories = Array.from(new Set((catRows ?? []).map((r) => r.category).filter(Boolean) as string[])).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (showPast) params.set('past', '1')
    params.set('page', String(p))
    return `/events?${params.toString()}`
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
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" /> Homeland <span className="w-1 h-1 rounded-full bg-white/30" /> Events</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">Community events<br /><span className="text-white/60">and celebrations,</span><br /><span className="text-white/60">worldwide.</span></h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">Cultural celebrations, religious events, and networking across the diaspora.</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-10">
              {count != null && count > 0 && <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white">{count.toLocaleString()}</span><span className="text-white/40 text-sm">events</span></div>}
              <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white">Free</span><span className="text-white/40 text-sm">to post</span></div>
            </div>
            <Link href="/events/post" className="inline-flex items-center gap-2 bg-white text-green font-bold rounded-full px-7 py-3.5 text-sm hover:bg-green-soft transition-colors">Post an event — free →</Link>
          </div>
        </div>
      </section>
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
          <SubmissionBanner />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Link href="/events" className={`text-sm px-4 py-2 rounded-full border transition-colors ${!showPast && !category ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}>Upcoming</Link>
              <Link href="/events?past=1" className={`text-sm px-4 py-2 rounded-full border transition-colors ${showPast ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}>All events</Link>
              {categories.length > 0 && <FilterDropdown options={categories} value={category} basePath={showPast ? '/events?past=1' : '/events'} paramName="category" allLabel="All categories" />}
              {category && <Link href="/events" className="text-xs font-semibold text-green hover:underline">Clear</Link>}
            </div>
            {count != null && <p className="text-sm text-muted ml-auto">{count.toLocaleString()} {count === 1 ? 'event' : 'events'}</p>}
          </div>
          {error && <p className="text-sm text-red-600 mb-4">Error loading events.</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events && events.length > 0 ? events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}
                className="group flex flex-col bg-white border border-border rounded-2xl overflow-hidden hover:border-l-4 hover:border-l-green hover:border-green/30 hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4 p-5 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-green"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm leading-snug truncate group-hover:text-green transition-colors">{event.title}</h3>
                    <p className="text-xs text-muted mt-0.5 truncate">{event.organiser_name || 'Community event'}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-green shrink-0 mt-0.5 transition-colors"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div className="flex items-center gap-2 px-5 pb-4">
                  {event.location && <span className="text-xs font-semibold text-muted bg-section border border-border px-2.5 py-1 rounded-full">{event.location}</span>}
                  {event.category && <span className="text-xs font-semibold text-green bg-green-soft px-2.5 py-1 rounded-full">{event.category}</span>}
                </div>
                <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-white mt-auto">
                  {event.event_date && <span className="flex items-center gap-1.5 text-xs text-muted"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  {event.event_time && <span className="text-xs text-muted ml-auto">{event.event_time}</span>}
                </div>
              </Link>
            )) : <p className="text-muted col-span-full text-center py-16">{showPast ? 'No events found.' : 'No upcoming events. Check back soon.'}</p>}
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