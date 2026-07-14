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
  return {
    title,
    description,
    openGraph: { title: `${title} | HagerLand`, description },
  }
}

export default async function BusinessProfilePage({ params }: Props) {
  const { data: business, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !business) notFound()

  const initial = business.company_name.charAt(0).toUpperCase()
  const enquiryEmail = business.contact_email || business.email || null

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: business.company_name,
        description: business.ai_description || business.sic_description || undefined,
        telephone: business.phone || undefined,
        url: business.website || undefined,
        address: business.trading_address_city ? { '@type': 'PostalAddress', addressLocality: business.trading_address_city, addressCountry: 'GB' } : undefined,
      }) }} />

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/business" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Business directory
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-2xl shrink-0">
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
              {business.is_verified && (
                <div className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-3 py-1.5 rounded-full mt-4">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified Ethiopian-owned business
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT — two-column layout */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* MAIN — 2/3 */}
            <div className="lg:col-span-2 space-y-5">

              {/* AI description */}
              {business.ai_description && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About</p>
                  <p className="text-base leading-relaxed text-ink/80">{business.ai_description}</p>
                </div>
              )}

              {/* DETAILS CARD */}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Business details</p>
                </div>
                <div className="divide-y divide-border">
                  {business.phone && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Phone</span>
                      <a href={`tel:${business.phone}`} className="text-sm text-ink hover:text-green transition-colors font-medium">{business.phone}</a>
                    </div>
                  )}
                  {business.website && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Website</span>
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate font-medium">
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {business.trading_address_city && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">City</span>
                      <span className="text-sm text-ink font-medium">{business.trading_address_city}</span>
                    </div>
                  )}
                  {business.sic_description && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Category</span>
                      <span className="text-sm text-ink font-medium">{business.sic_description}</span>
                    </div>
                  )}
                  {business.company_number && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-28 shrink-0">Reg. number</span>
                      <span className="text-sm text-ink font-mono">{business.company_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ENQUIRE CARD */}
              {enquiryEmail && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Get in touch</p>
                  <p className="text-sm font-bold text-ink mb-1">Interested in this business?</p>
                  <p className="text-sm text-muted mb-5">Click to reveal the contact email address and send an enquiry directly.</p>
                  <EnquireButton email={enquiryEmail} label="Show contact email" subject={`Enquiry via HagerLand — ${business.company_name}`} />
                </div>
              )}
            </div>

            {/* SIDEBAR — 1/3 */}
            <div className="space-y-5">

              {/* Quick facts */}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {business.trading_address_city && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{business.trading_address_city}</span>
                    </div>
                  )}
                  {business.sic_description && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>
                      <span className="text-sm text-ink">{business.sic_description}</span>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      <a href={`tel:${business.phone}`} className="text-sm text-ink hover:text-green transition-colors">{business.phone}</a>
                    </div>
                  )}
                  {business.website && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate">
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* CLAIM CARD */}
              {!business.is_verified && (
                <div className="bg-white border border-border rounded-2xl p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Own this business?</p>
                  <p className="text-sm font-bold text-ink mb-1">Claim this listing</p>
                  <p className="text-sm text-muted mb-4">Verify ownership to update your details and receive a gold verified badge.</p>
                  <Link href={`/business/${params.id}/claim`} className="flex items-center justify-center gap-2 w-full border border-green text-green font-semibold rounded-full px-5 py-2.5 text-sm hover:bg-green-soft transition-colors">
                    Claim this business
                  </Link>
                </div>
              )}

              {/* BROWSE MORE */}
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-2">
                  {[
                    { href: '/business', label: 'All businesses', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>' },
                    { href: '/jobs', label: 'Jobs', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>' },
                    { href: '/events', label: 'Events', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
                    { href: '/community', label: 'Community', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' },
                  ].map((item) => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-section border border-transparent hover:border-border transition-all group">
                      <div className="w-7 h-7 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0"
                        dangerouslySetInnerHTML={{ __html: item.icon }} />
                      <span className="text-sm font-semibold text-ink group-hover:text-green transition-colors">{item.label}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-muted"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  ))}
                </div>
              </div>

              {/* LIST YOUR BUSINESS */}
              <div className="bg-green border border-green/20 rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">List your business</p>
                <p className="text-sm text-white/60 mb-4">Join the directory — free for everyone, always.</p>
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