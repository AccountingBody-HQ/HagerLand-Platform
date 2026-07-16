export const dynamic = 'force-dynamic'

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
  const { data } = await supabase.from('money').select('title, service_type, location')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Service not found' }
  return { title: data.title, description: [data.service_type, data.location].filter(Boolean).join(' · ') }
}

export default async function MoneyDetailPage({ params }: Props) {
  const { data: listing, error } = await supabase.from('money').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !listing) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative bg-ink overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
        <div className="absolute inset-0" style={{background: 'radial-gradient(ellipse at 70% 50%, rgba(28,124,76,0.15) 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/money" className="hover:text-white/60 transition-colors">Money</Link>
            <span>/</span>
            <span className="text-white/50">{listing.title}</span>
          </nav>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {listing.is_verified && (
                      <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Verified listing
                      </span>
                    )}
                    {listing.service_type && <span className="bg-white/10 text-white/70 text-xs font-medium px-2.5 py-1 rounded-full">{listing.service_type}</span>}
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">{listing.title}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {listing.location && <span className="flex items-center gap-1.5 text-white/50 text-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{listing.location}</span>}
                    {listing.coverage && <span className="flex items-center gap-1.5 text-white/50 text-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>{listing.coverage}</span>}
                  </div>
                </div>
                <ShareButton title={listing.title} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATUS BAR */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap divide-x divide-border">
            {[
              { label: 'Status', value: listing.is_verified ? 'Verified & Active' : 'Active' },
              { label: 'Service type', value: listing.service_type || 'Financial service' },
              { label: 'Location', value: listing.location || 'United Kingdom' },
              { label: 'Coverage', value: listing.coverage || 'See listing' },
            ].map((s) => (
              <div key={s.label} className="px-5 py-3.5 first:pl-0">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-bold text-ink mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="font-bold text-ink text-base">About {listing.title}</h2>
                <p className="text-xs text-muted mt-0.5">Service overview</p>
              </div>
              <div className="px-6 py-6">
                {listing.description ? (
                  <p className="text-sm leading-relaxed text-ink/80">{listing.description}</p>
                ) : (
                  <p className="text-sm leading-relaxed text-muted">{listing.title} is a financial service listed on HagerLand — the free, verified community directory.</p>
                )}
              </div>
            </div>
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="font-bold text-ink text-base">Service details</h2>
                <p className="text-xs text-muted mt-0.5">Contact and service information</p>
              </div>
              <div className="divide-y divide-border">
                {listing.service_type && (
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
                    <div className="flex-1"><p className="text-xs font-bold text-muted uppercase tracking-wider">Service type</p><p className="text-sm font-semibold text-ink mt-0.5">{listing.service_type}</p></div>
                  </div>
                )}
                {listing.location && (
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                    <div className="flex-1"><p className="text-xs font-bold text-muted uppercase tracking-wider">Location</p><p className="text-sm font-semibold text-ink mt-0.5">{listing.location}</p></div>
                  </div>
                )}
                {listing.coverage && (
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
                    <div className="flex-1"><p className="text-xs font-bold text-muted uppercase tracking-wider">Coverage</p><p className="text-sm font-semibold text-ink mt-0.5">{listing.coverage}</p></div>
                  </div>
                )}
                {listing.website && (
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-muted uppercase tracking-wider">Website</p><a href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-green hover:underline mt-0.5 block truncate">{listing.website.replace(/^https?:\/\//, '')}</a></div>
                  </div>
                )}
              </div>
            </div>
            {listing.contact_email && (
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <h2 className="font-bold text-ink text-base">Contact this service</h2>
                  <p className="text-xs text-muted mt-0.5">Reach {listing.title} directly — no middleman</p>
                </div>
                <div className="px-6 py-6">
                  <div className="flex flex-wrap gap-3">
                    <EnquireButton email={listing.contact_email} label="Reveal contact email" subject={`Enquiry via HagerLand — ${listing.title}`} />
                    {listing.contact_phone && <a href={`tel:${listing.contact_phone}`} className="inline-flex items-center gap-2 border border-border text-ink font-semibold rounded-full px-5 py-2.5 text-sm hover:border-green hover:text-green transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>Call now</a>}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Quick contact</p>
                {listing.is_verified && <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2 py-0.5 rounded-full"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>}
              </div>
              <div className="divide-y divide-border">
                {listing.location && <div className="flex items-center gap-3 px-5 py-3.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><span className="text-sm text-ink">{listing.location}</span></div>}
                {listing.contact_phone && <div className="flex items-center gap-3 px-5 py-3.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg><a href={`tel:${listing.contact_phone}`} className="text-sm text-green hover:underline">{listing.contact_phone}</a></div>}
                {listing.website && <div className="flex items-center gap-3 px-5 py-3.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg><a href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate">{listing.website.replace(/^https?:\/\//, '')}</a></div>}
              </div>
              {listing.contact_email && <div className="px-5 py-4 border-t border-border"><EnquireButton email={listing.contact_email} label="Send enquiry" subject={`Enquiry via HagerLand — ${listing.title}`} /></div>}
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Browse more</p>
              <div className="space-y-0.5">
                {[
                  { href: '/money', label: 'All money services', sub: 'Transfers and finance' },
                  { href: '/business', label: 'Businesses', sub: 'Community directory' },
                  { href: '/jobs', label: 'Jobs', sub: 'Community employment' },
                  { href: '/housing', label: 'Housing', sub: 'Rooms and rentals' },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-section border border-transparent hover:border-border transition-all group">
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-ink group-hover:text-green transition-colors">{item.label}</p><p className="text-xs text-muted truncate">{item.sub}</p></div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </Link>
                ))}
              </div>
            </div>
            <div className="bg-green rounded-2xl p-5">
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Free listing</p>
              <p className="text-base font-bold text-white mb-1">List your service</p>
              <p className="text-xs text-white/60 mb-4 leading-relaxed">Add your money transfer or financial service — free for everyone.</p>
              <Link href="/money/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">List a service — free</Link>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}