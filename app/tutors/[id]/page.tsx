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
  const { data } = await supabase.from('tutors').select('name, subject, location')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Tutor not found' }
  return { title: data.name, description: [data.subject, data.location].filter(Boolean).join(' · ') }
}

export default async function TutorDetailPage({ params }: Props) {
  const { data: tutor, error } = await supabase.from('tutors').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !tutor) notFound()

  const initial = tutor.name.charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/tutors" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Tutors
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white text-2xl shrink-0 border border-white/20">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-2">{tutor.name}</h1>
                  <p className="text-white/60 text-base">{[tutor.subject, tutor.location].filter(Boolean).join(' · ')}</p>
                </div>
                <ShareButton title={tutor.name} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {tutor.delivery_mode && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{tutor.delivery_mode}</span>}
                {tutor.rate && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{tutor.rate}</span>}
                {tutor.is_verified && (
                  <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-3 py-1.5 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified tutor
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              {tutor.description && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About</p>
                  <p className="text-base leading-relaxed text-ink/80">{tutor.description}</p>
                </div>
              )}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Tutor details</p>
                </div>
                <div className="divide-y divide-border">
                  {tutor.subject && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Subject</span>
                      <span className="text-sm text-ink font-medium">{tutor.subject}</span>
                    </div>
                  )}
                  {tutor.rate && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Rate</span>
                      <span className="text-sm font-bold text-green">{tutor.rate}</span>
                    </div>
                  )}
                  {tutor.delivery_mode && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Delivery</span>
                      <span className="text-sm text-ink font-medium">{tutor.delivery_mode}</span>
                    </div>
                  )}
                  {tutor.location && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
                      <span className="text-sm text-ink font-medium">{tutor.location}</span>
                    </div>
                  )}
                </div>
              </div>
              {tutor.contact_email && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Book a session</p>
                  <p className="text-base font-bold text-ink mb-1">Get in touch with {tutor.name}</p>
                  <p className="text-sm text-muted mb-5">Click below to reveal the contact email and arrange a tutoring session directly.</p>
                  <EnquireButton email={tutor.contact_email} label="Reveal contact email" subject={`Tutoring enquiry via HagerLand — ${tutor.name}`} />
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {tutor.subject && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
                      <span className="text-sm text-ink">{tutor.subject}</span>
                    </div>
                  )}
                  {tutor.rate && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      <span className="text-sm font-bold text-green">{tutor.rate}</span>
                    </div>
                  )}
                  {tutor.delivery_mode && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
                      <span className="text-sm text-ink">{tutor.delivery_mode}</span>
                    </div>
                  )}
                  {tutor.location && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{tutor.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-green rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">Offer tutoring</p>
                <p className="text-sm text-white/60 mb-4">List your tutoring services — free to post.</p>
                <Link href="/tutors/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  List your services — free
                </Link>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-1">
                  {[
                    { href: '/tutors', label: 'All tutors' },
                    { href: '/jobs', label: 'Jobs' },
                    { href: '/business', label: 'Businesses' },
                    { href: '/events', label: 'Events' },
                    { href: '/community', label: 'Community' },
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