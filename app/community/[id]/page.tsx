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
  const { data } = await supabase.from('community').select('name, category, location')
    .eq('id', params.id).eq('status', 'active').single()
  if (!data) return { title: 'Organisation not found' }
  return { title: data.name, description: [data.category, data.location].filter(Boolean).join(' · ') }
}

export default async function CommunityDetailPage({ params }: Props) {
  const { data: org, error } = await supabase.from('community').select('*')
    .eq('id', params.id).eq('status', 'active').single()
  if (error || !org) notFound()

  const initial = org.name.charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/community" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Community
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white text-2xl shrink-0 border border-white/20">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-2">{org.name}</h1>
                  <p className="text-white/60 text-base">{[org.category, org.location].filter(Boolean).join(' · ')}</p>
                </div>
                <ShareButton title={org.name} />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {org.category && <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">{org.category}</span>}
                {org.is_verified && (
                  <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-3 py-1.5 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified organisation
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
              {org.description && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">About</p>
                  <p className="text-base leading-relaxed text-ink/80">{org.description}</p>
                </div>
              )}
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">Organisation details</p>
                </div>
                <div className="divide-y divide-border">
                  {org.category && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Category</span>
                      <span className="text-sm text-ink font-medium">{org.category}</span>
                    </div>
                  )}
                  {org.location && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
                      <span className="text-sm text-ink font-medium">{org.location}</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Website</span>
                      <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate font-medium">
                        {org.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {org.contact_name && (
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Contact</span>
                      <span className="text-sm text-ink font-medium">{org.contact_name}</span>
                    </div>
                  )}
                </div>
              </div>
              {org.contact_email && (
                <div className="bg-white border border-border rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Get in touch</p>
                  <p className="text-base font-bold text-ink mb-1">Contact {org.name}</p>
                  <p className="text-sm text-muted mb-5">Click below to reveal the contact email and get in touch directly.</p>
                  <EnquireButton email={org.contact_email} label="Reveal contact email" subject={`Enquiry via HagerLand — ${org.name}`} />
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-green">At a glance</p>
                </div>
                <div className="divide-y divide-border">
                  {org.category && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      <span className="text-sm text-ink">{org.category}</span>
                    </div>
                  )}
                  {org.location && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-ink">{org.location}</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-3 px-5 py-3.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate">
                        {org.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-green rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Free listing</p>
                <p className="text-base font-bold text-white mb-1">List your organisation</p>
                <p className="text-sm text-white/60 mb-4">Churches, associations, groups — free to list.</p>
                <Link href="/community/post" className="flex items-center justify-center w-full bg-white text-green font-bold rounded-full py-2.5 text-sm hover:bg-green-soft transition-colors">
                  List an organisation — free
                </Link>
              </div>
              <div className="bg-white border border-border rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Browse more</p>
                <div className="space-y-1">
                  {[
                    { href: '/community', label: 'All organisations' },
                    { href: '/events', label: 'Events' },
                    { href: '/business', label: 'Businesses' },
                    { href: '/jobs', label: 'Jobs' },
                    { href: '/housing', label: 'Housing' },
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