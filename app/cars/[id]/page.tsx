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
  const { data } = await supabase.from('cars').select('title, listing_type, location')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Listing not found' }
  return { title: data.title, description: [data.listing_type, data.location].filter(Boolean).join(' · ') }
}

export default async function CarDetailPage({ params }: Props) {
  const { data: listing, error } = await supabase.from('cars').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !listing) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/cars" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Cars & taxi
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-2">{listing.title}</h1>
              <p className="text-white/60 text-base">{[listing.listing_type, listing.location].filter(Boolean).join(' · ')}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {listing.listing_type && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{listing.listing_type}</span>}
                {listing.price && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{listing.price}</span>}
              </div>
            </div>
            <ShareButton title={listing.title} />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              {listing.description && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About this listing</p>
                  <p className="text-base leading-relaxed text-ink/80">{listing.description}</p>
                </div>
              )}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Listing details</p>
                </div>
                <div className="divide-y divide-border">
                  {listing.price && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Price</span>
                      <span className="text-sm font-bold text-green">{listing.price}</span>
                    </div>
                  )}
                  {listing.listing_type && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Type</span>
                      <span className="text-sm text-ink font-medium">{listing.listing_type}</span>
                    </div>
                  )}
                  {listing.location && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
                      <span className="text-sm text-ink font-medium">{listing.location}</span>
                    </div>
                  )}
                  {listing.contact_name && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Contact</span>
                      <span className="text-sm text-ink font-medium">{listing.contact_name}</span>
                    </div>
                  )}
                </div>
              </div>
              {listing.contact_email && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Contact</p>
                  <p className="text-base font-bold text-ink mb-1">Interested in this listing?</p>
                  <p className="text-sm text-muted mb-5">Click below to reveal the contact email and send an enquiry directly.</p>
                  <EnquireButton email={listing.contact_email} label="Reveal contact email" subject={`Enquiry via HagerLand — ${listing.title}`} />
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {listing.price && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      <span className="text-sm font-bold text-green">{listing.price}</span>
                    </div>
                  )}
                  {listing.location && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{listing.location}</span>
                    </div>
                  )}
                  {listing.listing_type && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/></svg>
                      <span className="text-sm text-ink">{listing.listing_type}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-green rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">Post a car or taxi listing</p>
                <p className="text-sm text-white/60 mb-4">Free to post — always.</p>
                <Link href="/cars/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  Post a listing — free
                </Link>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-1">
                  {[
                    { href: '/cars', label: 'All cars & taxi' },
                    { href: '/business', label: 'Businesses' },
                    { href: '/housing', label: 'Housing' },
                    { href: '/jobs', label: 'Jobs' },
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