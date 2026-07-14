import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {
  const { data: org, error } = await supabase
    .from('community')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !org) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight">{org.name}</h1>
          {org.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">Verified</span>
          )}
        </div>
        <p className="text-muted text-base mb-8">{org.category} &middot; {org.location}</p>
        {org.description && <p className="text-base leading-relaxed text-ink/80 mb-8">{org.description}</p>}
        <div className="border-t border-border pt-6 space-y-3">
          {org.contact_name && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Contact</span>
              <span>{org.contact_name}</span>
            </div>
          )}
          {org.contact_email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Email</span>
              <span>{org.contact_email}</span>
            </div>
          )}
          {org.website && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Website</span>
              <span>{org.website}</span>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
