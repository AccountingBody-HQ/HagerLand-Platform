import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { ShareButton } from '@/components/ShareButton'
import { EnquireButton } from '@/components/EnquireButton'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase.from('events').select('title, category, location')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Event not found' }
  return { title: data.title, description: [data.category, data.location].filter(Boolean).join(' · ') }
}

export default async function EventDetailPage({ params }: Props) {
  const { data: event, error } = await supabase.from('events').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !event) notFound()

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/events" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Events
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-2">{event.title}</h1>
              <p className="text-white/60 text-base">
                {[formattedDate, event.event_time ? `at ${event.event_time}` : null, event.location].filter(Boolean).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {event.category && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{event.category}</span>}
                {formattedDate && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{formattedDate}</span>}
              </div>
            </div>
            <ShareButton title={event.title} />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              {event.description && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About this event</p>
                  <p className="text-base leading-relaxed text-ink/80">{event.description}</p>
                </div>
              )}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Event details</p>
                </div>
                <div className="divide-y divide-border">
                  {formattedDate && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Date</span>
                      <span className="text-sm text-ink font-medium">{formattedDate}{event.event_time ? ` at ${event.event_time}` : ''}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
                      <span className="text-sm text-ink font-medium">{event.location}</span>
                    </div>
                  )}
                  {event.category && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Category</span>
                      <span className="text-sm text-ink font-medium">{event.category}</span>
                    </div>
                  )}
                  {event.organiser_name && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Organiser</span>
                      <span className="text-sm text-ink font-medium">{event.organiser_name}</span>
                    </div>
                  )}
                </div>
              </div>
              {event.contact_email && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Contact the organiser</p>
                  <p className="text-base font-bold text-ink mb-1">Interested in attending?</p>
                  <p className="text-sm text-muted mb-5">Click below to reveal the organiser&apos;s contact email and get in touch directly.</p>
                  <EnquireButton email={event.contact_email} label="Reveal contact email" subject={`Enquiry via HagerLand — ${event.title}`} />
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {formattedDate && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span className="text-sm text-ink">{formattedDate}</span>
                    </div>
                  )}
                  {event.event_time && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span className="text-sm text-ink">{event.event_time}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{event.location}</span>
                    </div>
                  )}
                  {event.category && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      <span className="text-sm text-ink">{event.category}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-green rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">Post an event</p>
                <p className="text-sm text-white/60 mb-4">Share your event with the community — free to post.</p>
                <Link href="/events/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  Post an event — free
                </Link>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-1">
                  {[
                    { href: '/events', label: 'All events' },
                    { href: '/community', label: 'Community' },
                    { href: '/business', label: 'Businesses' },
                    { href: '/jobs', label: 'Jobs' },
                    { href: '/housing', label: 'Housing' },
                  ].map((item) => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-section border border-transparent hover:border-border transition-all group">
                      <span className="text-sm font-medium text-ink group-hover:text-green transition-colors">{item.label}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}