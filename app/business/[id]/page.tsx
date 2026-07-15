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

      {/* ══ HERO — full-width brand header */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pb-20">
          {/* Breadcrumb nav */}
          <Link href="/business" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-xs font-semibold tracking-wide uppercase mb-10 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Business directory
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="flex items-start gap-6">
              {/* Logo avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center font-black text-white text-3xl sm:text-4xl shrink-0 shadow-xl">
                {initial}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                {/* Status badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {business.is_verified && (
                    <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-bold px-3 py-1 rounded-full">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Verified Ethiopian-owned business
                    </span>
                  )}
                  {business.sic_description && (
                    <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full">{business.sic_description}</span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight mb-2">
                  {business.company_name}
                </h1>
                {/* Key info strip */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
                  {business.trading_address_city && (
                    <span className="inline-flex items-center gap-1.5 text-white/60 text-sm">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {business.trading_address_city}
                    </span>
                  )}
                  {business.phone && (
                    <a href={`tel:${business.phone}`} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      {business.phone}
                    </a>
                  )}
                  {business.website && (
                    <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      {business.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
            </div>
            {/* CTA buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <ShareButton title={business.company_name} />
              {enquiryEmail && (
                <EnquireButton email={enquiryEmail} label="Contact business" subject={`Enquiry via HagerLand — ${business.company_name}`} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUICK STATS BAR */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-0 divide-x divide-border">
            {[
              { label: 'Listed on', value: 'HagerLand Directory' },
              { label: 'Status', value: business.is_verified ? 'Verified & Active' : 'Active listing' },
              { label: 'Category', value: business.sic_description || 'Ethiopian business' },
              { label: 'Location', value: business.trading_address_city || 'United Kingdom' },
            ].map((stat) => (
              <div key={stat.label} className="px-6 py-4 first:pl-0">
                <p className="text-xs text-muted uppercase tracking-wider font-semibold">{stat.label}</p>
                <p className="text-sm font-bold text-ink mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* ── LEFT — main content 2/3 */}
            <div className="lg:col-span-2 space-y-6">

              {/* About section */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <h2 className="font-bold text-ink">About {business.company_name}</h2>
                </div>
                <div className="px-6 py-6">
                  {business.ai_description ? (
                    <p className="text-base leading-relaxed text-ink/80">{business.ai_description}</p>
                  ) : (
                    <p className="text-base leading-relaxed text-ink/70">
                      {business.company_name} is an Ethiopian-owned business
                      {business.trading_address_city ? ` based in ${business.trading_address_city}` : ''}
                      {business.sic_description ? `, specialising in ${business.sic_description}` : ''}
                      . This listing is part of HagerLand — the free, verified directory of Ethiopian-owned businesses across the UK and worldwide.
                    </p>
                  )}
                </div>
              </div>

              {/* Business information */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20"/></svg>
                    </div>
                    <h2 className="font-bold text-ink">Business information</h2>
                  </div>
                  {business.is_verified && (
                    <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Verified
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {business.sic_description && (
                    <div className="grid grid-cols-3 gap-4 px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20"/></svg>
                        Category
                      </span>
                      <span className="col-span-2 text-sm font-semibold text-ink">{business.sic_description}</span>
                    </div>
                  )}
                  {business.trading_address_city && (
                    <div className="grid grid-cols-3 gap-4 px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Location
                      </span>
                      <span className="col-span-2 text-sm font-semibold text-ink">{business.trading_address_city}</span>
                    </div>
                  )}
                  {business.phone && (
                    <div className="grid grid-cols-3 gap-4 px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        Phone
                      </span>
                      <a href={`tel:${business.phone}`} className="col-span-2 text-sm font-semibold text-green hover:underline">{business.phone}</a>
                    </div>
                  )}
                  {business.website && (
                    <div className="grid grid-cols-3 gap-4 px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        Website
                      </span>
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="col-span-2 text-sm font-semibold text-green hover:underline truncate">
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {business.company_number && (
                    <div className="grid grid-cols-3 gap-4 px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Reg. number
                      </span>
                      <span className="col-span-2 text-sm font-mono font-semibold text-ink">{business.company_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact section */}
              {enquiryEmail && (
                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                  <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-soft flex items-center justify-center">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </div>
                    <h2 className="font-bold text-ink">Contact this business</h2>
                  </div>
                  <div className="px-6 py-6">
                    <p className="text-sm text-muted mb-5 leading-relaxed">
                      Get in touch with {business.company_name} directly. Click below to reveal the contact email — no middleman, no sign-up, no fees.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <EnquireButton email={enquiryEmail} label="Reveal contact email" subject={`Enquiry via HagerLand — ${business.company_name}`} />
                      {business.phone && (
                        <a href={`tel:${business.phone}`}
                          className="inline-flex items-center justify-center gap-2 border border-border text-ink font-semibold rounded-full px-6 py-2.5 text-sm hover:border-green hover:text-green transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                          Call now
                        </a>
                      )}
                      {business.website && (
                        <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 border border-border text-ink font-semibold rounded-full px-6 py-2.5 text-sm hover:border-green hover:text-green transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                          Visit website
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Claim section */}
              {!business.is_verified && (
                <div className="bg-green-soft border border-green/20 rounded-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-green/20 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green flex items-center justify-center">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <h2 className="font-bold text-ink">Is this your business?</h2>
                  </div>
                  <div className="px-6 py-6">
                    <p className="text-sm text-muted mb-5 leading-relaxed">
                      Claim this listing to verify your ownership, update your contact details, and receive a gold Verified badge that builds trust with customers.
                    </p>
                    <Link href={`/business/${params.id}/claim`}
                      className="inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white font-bold rounded-full px-6 py-2.5 text-sm transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Claim this business
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT — sidebar 1/3 */}
            <div className="space-y-5">

              {/* Contact card */}
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="bg-green px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Get in touch</p>
                  <p className="text-base font-bold text-white">{business.company_name}</p>
                </div>
                <div className="p-5 space-y-3">
                  {business.trading_address_city && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-section flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <span className="text-sm text-ink font-medium">{business.trading_address_city}</span>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-section flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      </div>
                      <a href={`tel:${business.phone}`} className="text-sm text-green hover:underline font-medium">{business.phone}</a>
                    </div>
                  )}
                  {business.website && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-section flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      </div>
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline font-medium truncate">
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {enquiryEmail && (
                    <div className="pt-2">
                      <EnquireButton email={enquiryEmail} label="Send enquiry" subject={`Enquiry via HagerLand — ${business.company_name}`} />
                    </div>
                  )}
                </div>
              </div>

              {/* Trust badge */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Listing status</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-soft flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-xs text-ink font-semibold">Active listing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-soft flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-xs text-ink font-semibold">Human-reviewed</span>
                  </div>
                  {business.is_verified && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gold-soft flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gold"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <span className="text-xs text-gold font-bold">Ownership verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Browse more */}
              <div className="bg-white rounded-2xl border border-border p-5">
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

              {/* List your business CTA */}
              <div className="bg-green rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">List your business</p>
                <p className="text-sm text-white/60 mb-4">Join the Ethiopian business directory — free for everyone, always.</p>
                <Link href="/business/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  Get listed — free
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}