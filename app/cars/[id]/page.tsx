import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'

export default async function CarDetailPage({ params }: { params: { id: string } }) {
  const { data: listing, error } = await supabase
    .from('cars')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !listing) notFound()

  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight">{listing.title}</h1>
          {listing.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">Verified</span>
          )}
        </div>
        <p className="text-muted text-base mb-8">{listing.listing_type} &middot; {listing.location}</p>
        {listing.description && <p className="text-base leading-relaxed text-ink/80 mb-8">{listing.description}</p>}
        <div className="border-t border-border pt-6 space-y-3">
          {listing.price && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Price</span>
              <span className="font-semibold">{listing.price}</span>
            </div>
          )}
          {listing.contact_name && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Contact</span>
              <span>{listing.contact_name}</span>
            </div>
          )}
          {listing.contact_email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Email</span>
              <span>{listing.contact_email}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
