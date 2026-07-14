import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShareButton } from '@/components/ShareButton'
import { EnquireButton } from '@/components/EnquireButton'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase
    .from('events')
    .select('title, category, location')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Event not found' }
  return {
    title: data.title,
    description: [data.category, data.location].filter(Boolean).join(' · '),
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !event) notFound()

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/events', label: 'Events' },
            { href: `/events/${params.id}`, label: event.title },
          ]}
        />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{event.title}</h1>
            <p className="text-muted text-base mt-1">
              {[formattedDate, event.event_time ? `at ${event.event_time}` : null, event.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ShareButton title={event.title} />
        </div>
        {event.category && (
          <span className="inline-block bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full mb-6">
            {event.category}
          </span>
        )}
        {event.description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">{event.description}</p>
        )}
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          {formattedDate && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Date</span>
              <span className="text-sm text-ink">{formattedDate}{event.event_time ? ` at ${event.event_time}` : ''}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
              <span className="text-sm text-ink">{event.location}</span>
            </div>
          )}
          {event.organiser_name && (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Organiser</span>
              <span className="text-sm text-ink">{event.organiser_name}</span>
            </div>
          )}
        </div>
        {event.contact_email && (
          <div className="bg-section rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">Contact the organiser</p>
            <p className="text-sm text-muted mb-4">Click to reveal the contact email.</p>
            <EnquireButton
              email={event.contact_email}
              label="Contact organiser"
              subject={`Enquiry via HagerLand — ${event.title}`}
            />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
