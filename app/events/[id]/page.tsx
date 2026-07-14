import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !event) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight">{event.title}</h1>
          {event.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">Verified</span>
          )}
        </div>
        <p className="text-muted text-base mb-8">
          {event.event_date && new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          {event.event_time && ` at ${event.event_time}`}
          {event.location && ` · ${event.location}`}
        </p>
        {event.description && <p className="text-base leading-relaxed text-ink/80 mb-8">{event.description}</p>}
        <div className="border-t border-border pt-6 space-y-3">
          {event.organiser_name && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Organiser</span>
              <span>{event.organiser_name}</span>
            </div>
          )}
          {event.contact_email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Contact</span>
              <span>{event.contact_email}</span>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
