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
  const { data } = await supabase
    .from('housing')
    .select('title, listing_type, location')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Listing not found' }
  return {
    title: data.title,
    description: [data.listing_type, data.location].filter(Boolean).join(' · '),
  }
}

export default async function HousingDetailPage({ params }: Props) {
  const { data: listing, error } = await supabase
    .from('housing')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !listing) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/housing" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Housing
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-2">
                {listing.title}
              </h1>
              <p className="text-white/60 text-base">
                {[listing.listing_type, listing.location, listing.bedrooms ? `${listing.bedrooms} bed` : null].filter(Boolean).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {listing.listing_type && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">{listing.listing_type}</span>
                )}
                {listing.is_verified && (
                  <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-3 py-1 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified listing
                  </span>
                )}
              </div>
            </div>
            <ShareButton title={listing.title} />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* MAIN */}
            <div className="lg:col-span-2 space-y-5">
              {listing.description && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About this listing</p>
                  <p className="text-base leading-relaxed text-ink/80">{listing.description}</p>
                </div>
              )}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Listing details</p>
                </div>
                <div className="divide-y divide-border">
                  {listing.price && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Price</span>
                      <span className="text-sm font-bold text-green">{listing.price}</span>
                    </div>
                  )}
                  {listing.listing_type && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Type</span>
                      <span className="text-sm text-ink font-medium">{listing.listing_type}</span>
                    </div>
                  )}
                  {listing.bedrooms && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Bedrooms</span>
                      <span className="text-sm text-ink font-medium">{listing.bedrooms}</span>
                    </div>
                  )}
                  {listing.location && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Location</span>
                      <span className="text-sm text-ink font-medium">{listing.location}</span>
                    </div>
                  )}
                  {listing.contact_name && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Contact</span>
                      <span className="text-sm text-ink font-medium">{listing.contact_name}</span>
                    </div>
                  )}
                </div>
              </div>
              {listing.contact_email && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Get in touch</p>
                  <p className="text-sm font-bold text-ink mb-1">Interested in this listing?</p>
                  <p className="text-sm text-muted mb-5">Click to reveal the contact email and send an enquiry directly.</p>
                  <EnquireButton email={listing.contact_email} label="Show contact email" subject={`Enquiry via HagerLand — ${listing.title}`} />
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="space-y-5">
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {listing.price && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      <span className="text-sm font-bold text-green">{listing.price}</span>
                    </div>
                  )}
                  {listing.location && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{listing.location}</span>
                    </div>
                  )}
                  {listing.bedrooms && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      <span className="text-sm text-ink">{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-green border border-green/20 rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">Post a housing listing</p>
                <p className="text-sm text-white/60 mb-4">Rooms, rentals, or properties — free to post.</p>
                <Link href="/housing/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  Post a listing — free
                </Link>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-2">
                  {[
                    { href: '/housing', label: 'All housing' },
                    { href: '/jobs', label: 'Jobs' },
                    { href: '/business', label: 'Businesses' },
                    { href: '/community', label: 'Community' },
                  ].map((item) => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-section border border-transparent hover:border-border transition-all group">
                      <span className="text-sm font-semibold text-ink group-hover:text-green transition-colors">{item.label}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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