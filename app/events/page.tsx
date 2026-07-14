import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SectionHeader } from '@/components/SectionHeader'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Ethiopian community events',
  description: 'Cultural celebrations, religious events, and networking across the Ethiopian diaspora.',
}

const PAGE_SIZE = 20

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { category?: string; past?: string; page?: string }
}) {
  const category = searchParams.category
  const showPast = searchParams.past === '1'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('event_date', { ascending: true })
    .range(from, to)

  if (category) query = query.eq('category', category)
  if (!showPast) query = query.gte('event_date', today)

  const { data: events, count, error } = await query

  const { data: catRows } = await supabase
    .from('events')
    .select('category')
    .eq('status', 'active')
    .not('category', 'is', null)

  const categories = Array.from(
    new Set((catRows ?? []).map((r) => r.category).filter(Boolean) as string[])
  ).sort()

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
      <SectionHeader
        title="Community events"
        description="Cultural celebrations, religious events, and networking across the diaspora."
        actions={[{ href: '/events/post', label: 'Post an event' }]}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        <SubmissionBanner />
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/events"
            className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
              !showPast && !category ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
            }`}
          >
            Upcoming
          </Link>
          <Link
            href="/events?past=1"
            className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
              showPast ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
            }`}
          >
            All events
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/events?category=${encodeURIComponent(c)}`}
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                category === c ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 text-center mb-4">Error loading events.</p>}
        <div className="grid gap-4">
          {events && events.length > 0 ? (
            events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{event.title}</h3>
                  {event.category && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{event.category}</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">
                  {[
                    event.event_date ? new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
                    event.event_time ? `at ${event.event_time}` : null,
                    event.location,
                  ].filter(Boolean).join(' · ')}
                </p>
                {event.description && <p className="text-sm text-ink/80 line-clamp-2">{event.description}</p>}
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">
              {showPast ? 'No events found.' : 'No upcoming events. Check back soon.'}
            </p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Previous</Link>
            )}
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Next</Link>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
