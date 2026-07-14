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
    .from('companies')
    .select('company_name, sic_description, trading_address_city')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Business not found' }
  const title = data.company_name
  const description = [data.sic_description, data.trading_address_city].filter(Boolean).join(' · ')
  return { title, description, openGraph: { title: `${title} | HagerLand`, description } }
}

export default async function BusinessProfilePage({ params }: Props) {
  const { data: business, error } = await supabase
    .from('companies').select('*')
    .eq('id', params.id).eq('status', 'active').single()

  if (error || !business) notFound()

  const initial = business.company_name.charAt(0).toUpperCase()
  const enquiryEmail = business.contact_email || business.email || null

  const details = [
    { label: 'Category', value: business.sic_description, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20"/></svg>' },
    { label: 'City', value: business.trading_address_city, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
    { label: 'Phone', value: business.phone, href: business.phone ? `tel:${business.phone}` : null, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>' },
    { label: 'Website', value: business.website ? business.website.replace(/^https?:\/\//, '') : null, href: business.website ? (business.website.startsWith('http') ? business.website : `https://${business.website}`) : null, external: true, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>' },
    { label: 'Reg. number', value: business.company_number, mono: true, icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
  ].filter((d) => d.value)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'LocalBusiness',
        name: business.company_name,
        description: business.ai_description || business.sic_description || undefined,
        telephone: business.phone || undefined,
        url: business.website || undefined,
        address: business.trading_address_city ? { '@type': 'PostalAddress', addressLocality: business.trading_address_city, addressCountry: 'GB' } : undefined,
      }) }} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/business" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Business directory
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white text-2xl shrink-0 border border-white/20">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-1">
                    {business.company_name}
                  </h1>
                  <p className="text-white/60 text-base">
                    {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <ShareButton title={business.company_name} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {business.is_verified && (
                  <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-3 py-1.5 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified Ethiopian-owned business
                  </span>
                )}
                {business.sic_description && (
                  <span className="bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full">{business.sic_description}</span>
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

            {/* MAIN — 2/3 */}
            <div className="lg:col-span-2 space-y-6">

              {/* About */}
              <div className="bg-white border border-border rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About</p>
                {business.ai_description ? (
                  <p className="text-base leading-relaxed text-ink/80">{business.ai_description}</p>
                ) : (
                  <p className="text-sm leading-relaxed text-muted">
                    {business.company_name} is an Ethiopian-owned business
                    {business.trading_address_city ? ` based in ${business.trading_address_city}` : ''}
                    {business.sic_description ? `, operating in ${business.sic_description}` : ''}
                    . Listed on HagerLand — the free verified directory of Ethiopian-owned businesses.
                  </p>
                )}
              </div>

              {/* Details */}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Business details</p>
                  {business.is_verified && (
                    <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Verified
                    </span>
                  )}
                </div>
                {details.length > 0 ? (
                  <div className="divide-y divide-border">
                    {details.map((d) => (
                      <div key={d.label} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0"
                          dangerouslySetInnerHTML={{ __html: d.icon }} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">{d.label}</span>
                        {d.href ? (
                          <a href={d.href} target={d.external ? '_blank' : undefined} rel={d.external ? 'noopener noreferrer' : undefined}
                            className="text-sm text-green hover:underline truncate font-medium">{d.value}</a>
                        ) : (
                          <span className={`text-sm text-ink font-medium ${d.mono ? 'font-mono' : ''}`}>{d.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-6 py-8 text-sm text-muted text-center">No additional details available.</p>
                )}
              </div>

              {/* Enquire */}
              {enquiryEmail && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Contact</p>
                  <p className="text-base font-bold text-ink mb-1">Get in touch with {business.company_name}</p>
                  <p className="text-sm text-muted mb-5">Click below to reveal the contact email address and send an enquiry directly — no middleman, no fees.</p>
                  <EnquireButton email={enquiryEmail} label="Reveal contact email" subject={`Enquiry via HagerLand — ${business.company_name}`} />
                </div>
              )}

              {/* Claim */}
              {!business.is_verified && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Ownership</p>
                  <p className="text-base font-bold text-ink mb-1">Is this your business?</p>
                  <p className="text-sm text-muted mb-5">Claim this listing to verify ownership, update your details, and receive a gold verified badge visible to everyone.</p>
                  <Link href={`/business/${params.id}/claim`}
                    className="inline-flex items-center gap-2 border border-green text-green font-semibold rounded-full px-6 py-2.5 text-sm hover:bg-green-soft transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Claim this business
                  </Link>
                </div>
              )}
            </div>

            {/* SIDEBAR — 1/3 */}
            <div className="space-y-5">

              {/* At a glance */}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {business.trading_address_city && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{business.trading_address_city}</span>
                    </div>
                  )}
                  {business.sic_description && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20"/></svg>
                      <span className="text-sm text-ink">{business.sic_description}</span>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      <a href={`tel:${business.phone}`} className="text-sm text-ink hover:text-green transition-colors">{business.phone}</a>
                    </div>
                  )}
                  {business.website && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate">
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-green rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">List your business</p>
                <p className="text-sm text-white/60 mb-4">Join the Ethiopian business directory — free for everyone, always.</p>
                <Link href="/business/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  Get listed — free
                </Link>
              </div>

              {/* Browse more */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-1">
                  {[
                    { href: '/business', label: 'All businesses' },
                    { href: '/jobs', label: 'Jobs' },
                    { href: '/housing', label: 'Housing' },
                    { href: '/events', label: 'Events' },
                    { href: '/community', label: 'Community' },
                    { href: '/tutors', label: 'Tutors' },
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