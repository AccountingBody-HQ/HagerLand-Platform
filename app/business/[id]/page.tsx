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
  const { data } = await supabase.from('companies')
    .select('company_name, sic_description, trading_address_city')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Business not found' }
  const title = data.company_name
  const description = [data.sic_description, data.trading_address_city].filter(Boolean).join(' · ')
  return { title, description, openGraph: { title: `${title} | HagerLand`, description } }
}

export default async function BusinessProfilePage({ params }: Props) {
  const { data: business, error } = await supabase.from('companies').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !business) notFound()

  const initial = business.company_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  const enquiryEmail = business.contact_email || business.email || null
  const description = business.ai_description || business.sic_description
    ? `${business.company_name} is a verified community business${business.trading_address_city ? ` based in ${business.trading_address_city}` : ''}${business.sic_description ? `, specialising in ${business.sic_description}` : ''}. Listed on HagerLand — the free, verified community directory.`
    : null

  return (
    <main className='min-h-screen bg-section flex flex-col'>
      <SiteNav />
      <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'LocalBusiness',
        name: business.company_name,
        description: business.ai_description || business.sic_description || undefined,
        telephone: business.phone || undefined,
        url: business.website || undefined,
        address: business.trading_address_city ? { '@type': 'PostalAddress', addressLocality: business.trading_address_city, addressCountry: 'GB' } : undefined,
      }) }} />

      {/* ══ HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)' }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

          {/* Eyebrow */}
          <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">
            ሃገር
            <span className="w-1 h-1 rounded-full bg-white/30" />
            Homeland
            <span className="w-1 h-1 rounded-full bg-white/30" />
            Business directory
          </p>

          {/* Main layout — avatar left, content right */}
          <div className="flex items-start gap-7 mb-8">

            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-3xl sm:text-4xl shrink-0">
              {initial}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 pt-1">

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {business.is_verified && (
                  <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified community business
                  </span>
                )}
                {business.sic_description && (
                  <span className="bg-white/15 text-white/90 text-xs font-medium px-2.5 py-1 rounded-full">{business.sic_description}</span>
                )}
              </div>

              {/* Name */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                {business.company_name}
              </h1>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8">
                {business.trading_address_city && (
                  <span className="flex items-center gap-1.5 text-white/65 text-sm">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {business.trading_address_city}
                  </span>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 text-white/65 hover:text-white text-sm transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    {business.phone}
                  </a>
                )}
                {business.website && (
                  <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/65 hover:text-white text-sm transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    {business.website.replace(/^https?:\/\//,'')}
                  </a>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <ShareButton title={business.company_name} dark={true} />
                <Link href="/business/edit-link"
                  className="inline-flex items-center gap-2 border border-white/25 text-white/70 hover:border-white/60 hover:text-white text-sm font-semibold rounded-full px-4 py-2 transition-colors whitespace-nowrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit listing
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ══ STATUS BAR */}
      <div className='bg-white border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-wrap divide-x divide-border'>
            {[
              { label: 'Status', value: business.is_verified ? 'Verified & Active' : 'Active' },
              { label: 'Category', value: business.sic_description || 'Community business' },
              { label: 'Location', value: business.trading_address_city || 'United Kingdom' },
              { label: 'Directory', value: 'HagerLand' },
            ].map((s) => (
              <div key={s.label} className='px-5 py-3.5 first:pl-0'>
                <p className='text-xs font-bold text-muted uppercase tracking-wider'>{s.label}</p>
                <p className='text-sm font-bold text-ink mt-0.5'>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20'>
        <div className='grid lg:grid-cols-3 gap-8 items-start'>

          {/* ── LEFT 2/3 */}
          <div className='lg:col-span-2 space-y-5'>

            {/* About */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-6 py-5 border-b border-border flex items-center justify-between'>
                <div>
                  <h2 className='font-bold text-ink text-base'>About {business.company_name}</h2>
                  <p className='text-xs text-muted mt-0.5'>Business overview</p>
                </div>
                {business.is_verified && (
                  <span className='inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full shrink-0'>
                    <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3.5'><polyline points='20 6 9 17 4 12'/></svg>
                    Verified
                  </span>
                )}
              </div>
              <div className='px-6 py-6'>
                <p className='text-sm leading-relaxed text-ink/80'>
                  {business.ai_description || description || `${business.company_name} is listed on HagerLand — the free, verified community directory.`}
                </p>
              </div>
            </div>

            {/* Business information */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-6 py-5 border-b border-border'>
                <h2 className='font-bold text-ink text-base'>Business information</h2>
                <p className='text-xs text-muted mt-0.5'>Contact details and registration</p>
              </div>
              <div className='divide-y divide-border'>
                {business.sic_description && (
                  <div className='flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors'>
                    <div className='w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0'>
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green'><rect x='2' y='3' width='20' height='18' rx='2'/><path d='M8 3v18M2 9h20'/></svg>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-bold text-muted uppercase tracking-wider'>Category</p>
                      <p className='text-sm font-semibold text-ink mt-0.5'>{business.sic_description}</p>
                    </div>
                  </div>
                )}
                {business.trading_address_city && (
                  <div className='flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors'>
                    <div className='w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0'>
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green'><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z'/><circle cx='12' cy='10' r='3'/></svg>
                    </div>
                    <div className='flex-1'>
                      <p className='text-xs font-bold text-muted uppercase tracking-wider'>Location</p>
                      <p className='text-sm font-semibold text-ink mt-0.5'>{business.trading_address_city}</p>
                    </div>
                  </div>
                )}
                {business.phone && (
                  <div className='flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors'>
                    <div className='w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0'>
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green'><path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'/></svg>
                    </div>
                    <div className='flex-1'>
                      <p className='text-xs font-bold text-muted uppercase tracking-wider'>Phone</p>
                      <a href={`tel:${business.phone}`} className='text-sm font-semibold text-green hover:underline mt-0.5 block'>{business.phone}</a>
                    </div>
                  </div>
                )}
                {business.website && (
                  <div className='flex items-center gap-4 px-6 py-4 hover:bg-section transition-colors'>
                    <div className='w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center shrink-0'>
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'/></svg>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-bold text-muted uppercase tracking-wider'>Website</p>
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target='_blank' rel='noopener noreferrer' className='text-sm font-semibold text-green hover:underline mt-0.5 block truncate'>
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            {enquiryEmail && (
              <div className='bg-white border border-border rounded-2xl overflow-hidden'>
                <div className='px-6 py-5 border-b border-border'>
                  <h2 className='font-bold text-ink text-base'>Contact this business</h2>
                  <p className='text-xs text-muted mt-0.5'>Reach {business.company_name} directly</p>
                </div>
                <div className='px-6 py-6'>
                  <div className='flex flex-wrap gap-3'>
                    <EnquireButton email={enquiryEmail} label='Reveal contact email' subject={`Enquiry via HagerLand — ${business.company_name}`} />
                    {business.phone && (
                      <a href={`tel:${business.phone}`} className='inline-flex items-center gap-2 border border-border text-ink font-semibold rounded-full px-5 py-2.5 text-sm hover:border-green hover:text-green transition-colors'>
                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'/></svg>
                        Call now
                      </a>
                    )}
                    {business.website && (
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-2 border border-border text-ink font-semibold rounded-full px-5 py-2.5 text-sm hover:border-green hover:text-green transition-colors'>
                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'/></svg>
                        Visit website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Claim */}
            {!business.is_verified && (
              <div className='bg-white border border-border rounded-2xl overflow-hidden'>
                <div className='px-6 py-5 border-b border-border'>
                  <h2 className='font-bold text-ink text-base'>Is this your business?</h2>
                  <p className='text-xs text-muted mt-0.5'>Claim this listing to verify and manage your details</p>
                </div>
                <div className='px-6 py-6'>
                  <p className='text-sm text-muted mb-5 leading-relaxed'>
                    Verify your ownership to update contact details and receive a gold Verified badge.
                  </p>
                  <Link href={`/business/${params.id}/claim`} className='inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white font-bold rounded-full px-6 py-2.5 text-sm transition-colors'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>
                    Claim this business
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR */}
          <div className='space-y-5'>
            {/* Quick contact */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-5 py-4 border-b border-border flex items-center justify-between'>
                <p className='text-xs font-bold text-muted uppercase tracking-wider'>Quick contact</p>
                {business.is_verified && (
                  <span className='inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2 py-0.5 rounded-full'>
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3.5'><polyline points='20 6 9 17 4 12'/></svg>
                    Verified
                  </span>
                )}
              </div>
              <div className='divide-y divide-border'>
                {business.trading_address_city && (
                  <div className='flex items-center gap-3 px-5 py-3.5'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0'><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z'/><circle cx='12' cy='10' r='3'/></svg>
                    <span className='text-sm text-ink'>{business.trading_address_city}</span>
                  </div>
                )}
                {business.phone && (
                  <div className='flex items-center gap-3 px-5 py-3.5'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0'><path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'/></svg>
                    <a href={`tel:${business.phone}`} className='text-sm text-green hover:underline'>{business.phone}</a>
                  </div>
                )}
                {business.website && (
                  <div className='flex items-center gap-3 px-5 py-3.5'>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-green shrink-0'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'/></svg>
                    <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target='_blank' rel='noopener noreferrer' className='text-sm text-green hover:underline truncate'>
                      {business.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
              {enquiryEmail && (
                <div className='px-5 py-4 border-t border-border'>
                  <EnquireButton email={enquiryEmail} label='Send enquiry' subject={`Enquiry via HagerLand — ${business.company_name}`} />
                </div>
              )}
            </div>

            {/* Listing status */}
            <div className='bg-white border border-border rounded-2xl p-5'>
              <p className='text-xs font-bold text-muted uppercase tracking-wider mb-4'>Listing status</p>
              <div className='space-y-2.5'>
                {[
                  { label: 'Active listing', ok: true },
                  { label: 'Human-reviewed', ok: true },
                  { label: 'Ownership verified', ok: business.is_verified },
                ].map((item) => (
                  <div key={item.label} className='flex items-center gap-2.5'>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.ok ? 'bg-green-soft' : 'bg-border'}`}>
                      {item.ok ? (
                        <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='text-green'><polyline points='20 6 9 17 4 12'/></svg>
                      ) : (
                        <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='text-muted'><line x1='5' y1='12' x2='19' y2='12'/></svg>
                      )}
                    </div>
                    <span className={`text-xs font-semibold ${item.ok ? 'text-ink' : 'text-muted'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Browse more */}
            <div className='bg-white border border-border rounded-2xl overflow-hidden'>
              <div className='px-5 py-4 border-b border-border'>
                <p className='text-xs font-bold text-muted uppercase tracking-wider'>Browse more</p>
              </div>
              <div className='divide-y divide-border'>
                {[
                  { href: '/business', label: 'All businesses', sub: 'Community directory' },
                  { href: '/jobs', label: 'Jobs', sub: 'Community employment' },
                  { href: '/housing', label: 'Housing', sub: 'Rooms and rentals' },
                  { href: '/events', label: 'Events', sub: 'Community events' },
                  { href: '/community', label: 'Community', sub: 'Organisations and groups' },
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
              <p className='text-base font-bold text-white mb-3'>List your business</p>
              <p className='text-xs text-white/70 mb-4'>Join the Ethiopian business directory — free for everyone, always.</p>
              <Link href='/business/post' className='block text-center bg-white text-green font-bold text-sm rounded-full px-4 py-2.5 hover:bg-green-soft transition-colors'>
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