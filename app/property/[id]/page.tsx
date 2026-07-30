export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

type Props = { params: { id: string } }

function confidenceClasses(level: string | null | undefined) {
  if (level === 'high') return 'bg-green text-white'
  if (level === 'medium') return 'bg-gold-soft text-gold'
  if (level === 'low') return 'bg-red-100 text-red-600'
  return 'bg-white/10 border border-white/20 text-white/70'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabaseAdmin
    .from('properties')
    .select('company_name, city, country')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Agency not found' }
  const title = data.company_name
  const description = [data.city, data.country].filter(Boolean).join(', ')
  return { title, description, openGraph: { title: `${title} | HagerLand`, description } }
}

export default async function PropertyProfilePage({ params }: Props) {
  const { data: agency, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (error || !agency) notFound()

  const initial = (agency.company_name ?? '?').charAt(0).toUpperCase()
  const location = [agency.city, agency.country].filter(Boolean).join(', ')

  return (
    <main className="min-h-screen bg-section flex flex-col">
      <SiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'RealEstateAgent',
        name: agency.company_name,
        description: agency.ai_description || undefined,
        telephone: agency.phone || undefined,
        url: agency.website || undefined,
        address: (agency.city || agency.country) ? { '@type': 'PostalAddress', addressLocality: agency.city || undefined, addressCountry: agency.country || undefined } : undefined,
      }) }} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)' }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">
            ሃገር
            <span className="w-1 h-1 rounded-full bg-white/30" />
            Homeland
            <span className="w-1 h-1 rounded-full bg-white/30" />
            Property
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-7 mb-8">
            <div translate="no" className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white text-3xl sm:text-4xl shrink-0 mt-1">
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {agency.google_rating != null && (
                  <span className="inline-flex items-center justify-center gap-1.5 h-5 bg-gold-soft text-gold text-[11px] font-normal px-4 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    {agency.google_rating} Google rating{agency.google_review_count ? ` (${agency.google_review_count})` : ''}
                  </span>
                )}
                {agency.agent_confidence && (
                  <span className={`inline-flex items-center justify-center gap-1.5 h-5 text-[11px] font-normal px-4 rounded-full capitalize ${confidenceClasses(agency.agent_confidence)}`}>
                    {agency.agent_confidence} confidence
                  </span>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
                {agency.company_name}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 mb-8">
                {location && (
                  <span className="inline-flex items-center gap-2 text-white/65 text-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    {location}
                  </span>
                )}
                {agency.phone && (
                  <a href={`tel:${agency.phone}`} className="inline-flex items-center gap-2 text-white/65 hover:text-white text-sm transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                    {agency.phone}
                  </a>
                )}
                {agency.website && (
                  <a href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/65 hover:text-white text-sm transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                    {agency.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="grid lg:grid-cols-3 gap-8 items-start min-w-0">

          {/* LEFT 2/3 */}
          <div className="lg:col-span-2 space-y-5 min-w-0 overflow-hidden">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="font-bold text-ink text-base">About {agency.company_name}</h2>
                <p className="text-xs text-muted mt-0.5">Who they are &amp; what they do</p>
              </div>
              <div className="px-6 py-6">
                <p className="text-sm leading-relaxed text-ink/80">
                  {agency.ai_description || `${agency.company_name} is a real estate agency listed on HagerLand — Ethiopia's business and financial platform.`}
                </p>
              </div>
            </div>

            {agency.google_maps_url && (
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <h2 className="font-bold text-ink text-base">Find them</h2>
                  <p className="text-xs text-muted mt-0.5">View location on Google Maps</p>
                </div>
                <div className="px-6 py-6">
                  <a
                    href={agency.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white font-bold rounded-full px-6 py-2.5 text-sm transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    View on Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-5 min-w-0">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Contact</p>
              </div>
              <div className="divide-y divide-border">
                {agency.address && (
                  <div className="flex items-start gap-3 px-5 py-3.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span className="text-sm text-ink break-words">{agency.address}</span>
                  </div>
                )}
                {agency.phone && (
                  <a href={`tel:${agency.phone}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-section transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 012 1.18 2 2 0 014 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                    <span className="text-sm text-green font-medium hover:underline">{agency.phone}</span>
                  </a>
                )}
                {agency.website && (
                  <a href={agency.website.startsWith('http') ? agency.website : `https://${agency.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3.5 hover:bg-section transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                    <span className="text-sm text-green font-medium hover:underline truncate">{agency.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {agency.opening_hours && (
                  <div className="flex items-start gap-3 px-5 py-3.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <div className="flex flex-col gap-0.5">
                      {String(agency.opening_hours).split(/\|\||\n/).filter(Boolean).map((line: string, i: number) => (
                        <span key={i} className="text-sm text-ink">{line.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {agency.google_maps_url && (
                  <div className="px-5 py-4">
                    <a
                      href={agency.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green hover:bg-green-dark text-white font-bold rounded-full px-4 py-2.5 text-sm transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      View on Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Browse more</p>
              </div>
              <div className="divide-y divide-border">
                <Link href="/property" className="flex items-center justify-between px-5 py-3.5 hover:bg-section transition-colors group">
                  <div>
                    <p className="text-sm font-semibold text-ink group-hover:text-green transition-colors">All property agencies</p>
                    <p className="text-xs text-muted">Verified Ethiopian real estate</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-green transition-colors"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
