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
  const { data } = await supabase.from('housing')
    .select('title, category, city')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Listing not found' }
  const title = data.title
  const description = [data.category, data.city].filter(Boolean).join(' · ')
  return { title, description, openGraph: { title: `${title} | HagerLand`, description } }
}

export default async function HousingDetailPage({ params }: Props) {
  const { data: listing, error } = await supabase.from('housing').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !listing) notFound()

  const { data: related } = await supabase.from('housing')
    .select('id, title, category, city')
    .eq('status', 'active')
    .neq('id', params.id)
    .or(`category.eq.${listing.category},city.eq.${listing.city}`)
    .limit(3)

  const initial = listing.title.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  const enquiryEmail = listing.contact_email || null
  const promoActive = listing.promo_text && (!listing.promo_expires_at || (() => { const exp = new Date(listing.promo_expires_at); exp.setHours(23,59,59,999); return exp > new Date(); })())
  const description = listing.ai_description || `${listing.title} is a community listing${listing.city ? ` based in ${listing.city}` : ''}${listing.category ? `, specialising in ${listing.category}` : ''}. Listed on HagerLand — the free, verified community directory.`

  return (
    <main className='min-h-screen bg-section flex flex-col'>
      <SiteNav />
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'LocalBusiness',
        name: listing.title,
        description: listing.ai_description || listing.category || undefined,
        telephone: listing.phone || undefined,
        url: listing.website || undefined,
        address: listing.city ? { '@type': 'PostalAddress', addressLocality: listing.city, addressCountry: 'GB' } : undefined,
      }) }} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

          <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">
            ሃገር
            <span className="w-1 h-1 rounded-full bg-white/30" />
            Homeland
            <span className="w-1 h-1 rounded-full bg-white/30" />
            Housing directory
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-7 mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-3xl sm:text-4xl shrink-0 mt-1">
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center justify-center gap-1.5 h-5 bg-white/10 border border-white/20 text-white/70 text-[11px] font-normal px-4 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  Community listing
                </span>
                {listing.category && (
                  <span className="inline-flex items-center justify-center gap-1.5 h-5 bg-white/15 border border-white/20 text-white/90 text-[11px] font-normal px-4 rounded-full">
                    {listing.category}
                  </span>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 mb-8">
                {listing.city && (
                  <span className="inline-flex items-center gap-2 text-white/65 text-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {listing.city}
                  </span>
                )}
                {listing.phone && (
                  <a href={`tel:${listing.phone}`} className="inline-flex items-center gap-2 text-white/65 hover:text-white text-sm transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    {listing.phone}
                  </a>
                )}
                {listing.website && (
                  <a href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/65 hover:text-white text-sm transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    {listing.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
                <ShareButton title={listing.title} dark={true} className="w-full sm:w-40" />
                <Link href={listing.manage_token ? "/housing/edit-link" : `/housing/${listing.id}/claim`}
                  className="inline-flex items-center justify-center gap-2 border border-white/25 text-white/70 hover:border-white/60 hover:text-white text-sm font-semibold rounded-full w-full sm:w-40 py-2.5 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit listing
                </Link>
                <Link href={listing.manage_token ? "/housing/edit-link" : `/housing/${listing.id}/claim?from=promotion`}
                  className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold rounded-full w-full sm:w-40 py-2.5 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  Add promotion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATUS BAR */}
      <div className='bg-white border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap divide-x divide-border'>
            {[
              { label: 'Status', value: 'Active' },
              { label: 'Category', value: listing.category || 'Housing' },
              { label: 'Location', value: listing.city || 'United Kingdom' },
              { label: 'Listed on', value: 'HagerLand — Free & verified' },
            ].map((s) => (
              <div key={s.label} className='px-5 py-3.5 first:pl-0'>
                <p className='text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider'>{s.label}</p>
                <p className='text-sm font-bold text-ink mt-0.5'>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20'>
        <div className='grid lg:grid-cols-3 gap-8 items-start min-w-0'>

          {/* LEFT 2/3 */}
          <div className='lg:col-span-2 space-y-5 min-w-0 overflow-hidden'>

            {promoActive && (
              <div className='relative overflow-hidden rounded-2xl border border-green/20' style={{background: 'linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%)'}}>
                <div className='absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none' style={{background: 'radial-gradient(circle at top right, #1C7C4C 0%, transparent 70%)'}} />
                <div className='px-6 py-5 border-b border-green/10 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 rounded-lg bg-green flex items-center justify-center shrink-0'>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2'><path d='M3 11l19-9-9 19-2-8-8-2z'/></svg>
                    </div>
                    <div>
                      <h2 className='font-bold text-ink text-base'>What&apos;s on</h2>
                      <p className='text-xs text-muted'>Latest from {listing.title}</p>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1.5 bg-green text-white text-[11px] font-bold px-3 py-1 rounded-full'>
                    <span className='w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse' />
                    Live
                  </span>
                </div>
                <div className='px-6 py-6'>
                  <p className='text-sm leading-relaxed text-ink whitespace-pre-line font-medium'>{listing.promo_text}</p>
                </div>
                <div className='px-6 py-3.5 border-t border-green/10 flex items-center justify-between'>
                  <p className='text-xs text-muted'>Posted by the listing</p>
                  <a href='/housing/edit-link' className='text-xs text-green font-semibold hover:underline'>Update this →</a>
                </div>
              </div>
            )}

            {/* About */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-6 py-5 border-b border-border flex items-center justify-between'>
                <div>
                  <h2 className='font-bold text-ink text-base'>About {listing.title}</h2>
                  <p className='text-xs text-muted mt-0.5'>About this listing</p>
                </div>
              </div>
              <div className='px-6 py-6'>
                <p className='text-sm leading-relaxed text-ink/80'>{description}</p>
              </div>
              <div className='px-6 py-4 bg-section border-t border-border flex flex-wrap gap-4'>
                <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-green'>
                  <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3'><polyline points='20 6 9 17 4 12'/></svg>
                  Active listing
                </span>
                <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-green'>
                  <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3'><polyline points='20 6 9 17 4 12'/></svg>
                  Human-reviewed
                </span>
              </div>
            </div>

            {/* Get in touch */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-6 py-5 border-b border-border'>
                <h2 className='font-bold text-ink text-base'>Get in touch</h2>
                <p className='text-xs text-muted mt-0.5'>Contact {listing.title} directly</p>
              </div>
              <div className='p-6 grid sm:grid-cols-3 gap-3'>
                {enquiryEmail && (
                  <EnquireButton email={enquiryEmail} label='Send enquiry' subject={`Enquiry via HagerLand — ${listing.title}`} />
                )}
                {listing.phone && (
                  <a href={`tel:${listing.phone}`} className='flex items-center justify-center gap-2 bg-section hover:bg-border border border-border text-ink font-semibold rounded-xl px-4 py-3 text-sm transition-colors'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'/></svg>
                    Call now
                  </a>
                )}
                {listing.website && (
                  <a href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`} target='_blank' rel='noopener noreferrer' className='flex items-center justify-center gap-2 bg-section hover:bg-border border border-border text-ink font-semibold rounded-xl px-4 py-3 text-sm transition-colors'>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'/></svg>
                    Visit website
                  </a>
                )}
              </div>
            </div>

            {/* Own or manage */}
            {!listing.manage_token && (
              <div className='bg-white border border-border rounded-2xl overflow-hidden'>
                <div className='px-6 py-5 border-b border-border'>
                  <h2 className='font-bold text-ink text-base'>Own or manage this listing?</h2>
                  <p className='text-xs text-muted mt-0.5'>Take control of your listing</p>
                </div>
                <div className='px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                  <p className='text-sm text-muted leading-relaxed'>
                    Take control of your listing — update your details and add promotions.
                  </p>
                  <Link href={`/housing/${listing.id}/claim`} className='inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white font-bold rounded-full px-6 py-2.5 text-sm transition-colors shrink-0'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>
                    Request access
                  </Link>
                </div>
              </div>
            )}
            {/* Related */}
            {related && related.length > 0 && (
              <div className='bg-white border border-border rounded-2xl overflow-hidden'>
                <div className='px-6 py-5 border-b border-border'>
                  <h2 className='font-bold text-ink text-base'>More in the community</h2>
                  <p className='text-xs text-muted mt-0.5'>
                    {listing.category ? `More ${listing.category} listings` : `More listings in ${listing.city}`}
                  </p>
                </div>
                <div className='divide-y divide-border'>
                  {related.map((b) => {
                    const rel_initial = (b.title || '').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                    return (
                      <a key={b.id} href={`/housing/${b.id}`} className='flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors group'>
                        <div className='w-10 h-10 rounded-xl bg-green-soft flex items-center justify-center font-bold text-green text-sm shrink-0'>
                          {rel_initial}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-semibold text-ink group-hover:text-green transition-colors truncate'>{b.title}</p>
                          <p className='text-xs text-muted'>{b.category || b.city || 'Housing'}</p>
                        </div>
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-muted group-hover:text-green transition-colors shrink-0'><path d='M9 18l6-6-6-6'/></svg>
                      </a>
                    )
                  })}
                </div>
                <div className='px-6 py-4 border-t border-border'>
                  <a href='/housing' className='text-sm font-semibold text-green hover:underline'>View all housing listings →</a>
                </div>
              </div>
            )}

            {/* Promo CTA */}
            {!promoActive && (
              <div className='bg-white border border-border rounded-2xl overflow-hidden'>
                <div className='px-6 py-5 border-b border-border'>
                  <h2 className='font-bold text-ink text-base'>Got something to share?</h2>
                  <p className='text-xs text-muted mt-0.5'>Add a promotion to your listing</p>
                </div>
                <div className='px-6 py-8 text-center'>
                  <div className='w-10 h-10 rounded-xl bg-green-soft flex items-center justify-center mx-auto mb-3'>
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green'><path d='M3 11l19-9-9 19-2-8-8-2z'/></svg>
                  </div>
                  <p className='text-xs text-muted mb-4 max-w-xs mx-auto'>Post offers, events, or updates — your customers will see it here instantly.</p>
                  <a href={listing.manage_token ? '/housing/edit-link' : `/housing/${listing.id}/claim?from=promotion`} className='inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white text-xs font-bold rounded-full px-4 py-2 transition-colors'>
                    <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg>
                    Add a promotion
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className='space-y-5 min-w-0'>
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-5 py-4 border-b border-border'>
                <p className='text-xs font-bold text-muted uppercase tracking-wider'>Contact</p>
              </div>
              <div className='divide-y divide-border'>
                {(listing.city || listing.address || listing.country) && (
                  <div className='flex items-start gap-3 px-5 py-3.5'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0 mt-0.5'><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z'/><circle cx='12' cy='10' r='3'/></svg>
                    <div className='flex flex-col gap-0.5 min-w-0'>
                      {listing.address
                        ? <span className='text-sm text-ink break-words'>{listing.address}</span>
                        : <>
                            {listing.city && <span className='text-sm text-ink break-words'>{listing.city}</span>}
                            {listing.country && <span className='text-sm text-ink break-words'>{listing.country}</span>}
                          </>
                      }
                    </div>
                  </div>
                )}
                {listing.phone && (
                  <a href={`tel:${listing.phone}`} className='flex items-center gap-3 px-5 py-3.5 hover:bg-section transition-colors'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0'><path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'/></svg>
                    <span className='text-sm text-green font-medium hover:underline'>{listing.phone}</span>
                  </a>
                )}
                {listing.website && (
                  <a href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`} target='_blank' rel='noopener noreferrer' className='flex items-center gap-3 px-5 py-3.5 hover:bg-section transition-colors'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'/></svg>
                    <span className='text-sm text-green font-medium hover:underline truncate'>{listing.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {listing.opening_hours && (
                  <div className='flex items-start gap-3 px-5 py-3.5'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0 mt-0.5'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg>
                    <div className='flex flex-col gap-0.5'>
                      {listing.opening_hours.split(/\|\||\n/).filter(Boolean).map((line: string, i: number) => (
                        <span key={i} className='text-sm text-ink'>{line}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(listing.instagram || listing.facebook || listing.whatsapp) && (
                  <div className='flex items-center gap-3 px-5 py-3.5 flex-wrap'>
                    {listing.instagram && (
                      <a href={listing.instagram.startsWith('http') ? listing.instagram : `https://instagram.com/${listing.instagram.replace('@','')}`} target='_blank' rel='noopener noreferrer' className='text-xs font-semibold text-green hover:underline'>Instagram</a>
                    )}
                    {listing.facebook && (
                      <a href={listing.facebook.startsWith('http') ? listing.facebook : `https://${listing.facebook}`} target='_blank' rel='noopener noreferrer' className='text-xs font-semibold text-green hover:underline'>Facebook</a>
                    )}
                    {listing.whatsapp && (
                      <a href={`https://wa.me/${listing.whatsapp.replace(/[^0-9+]/g,'')}`} target='_blank' rel='noopener noreferrer' className='text-xs font-semibold text-green hover:underline'>WhatsApp</a>
                    )}
                  </div>
                )}
              </div>
              {enquiryEmail && (
                <div className='px-5 py-4 border-t border-border'>
                  <EnquireButton email={enquiryEmail} label='Send enquiry' subject={`Enquiry via HagerLand — ${listing.title}`} />
                </div>
              )}
            </div>

            {/* Browse more */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-5 py-4 border-b border-border'>
                <p className='text-xs font-bold text-muted uppercase tracking-wider'>Browse more</p>
              </div>
              <div className='divide-y divide-border'>
                {[
                  { href: '/housing', label: 'All housing', sub: 'Rooms and rentals' },
                  { href: '/business', label: 'Businesses', sub: 'Community directory' },
                  { href: '/jobs', label: 'Jobs', sub: 'Community employment' },
                  { href: '/housing', label: 'Housing', sub: 'Rooms and rentals' },
                  { href: '/events', label: 'Events', sub: 'Community events' },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className='flex items-center justify-between px-5 py-3.5 hover:bg-section transition-colors group'>
                    <div>
                      <p className='text-sm font-semibold text-ink group-hover:text-green transition-colors'>{l.label}</p>
                      <p className='text-xs text-muted'>{l.sub}</p>
                    </div>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-muted group-hover:text-green transition-colors'><path d='M9 18l6-6-6-6'/></svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className='bg-green rounded-2xl p-5'>
              <p className='text-xs font-bold text-white/60 uppercase tracking-wider mb-1'>Free listing</p>
              <p className='text-base font-bold text-white mb-3'>List a property</p>
              <p className='text-xs text-white/70 mb-4'>Reach the community — list your property for free.</p>
              <Link href='/housing/post' className='block text-center bg-white text-green font-bold text-sm rounded-full px-4 py-2.5 hover:bg-green-soft transition-colors'>
                Get listed — free
              </Link>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
