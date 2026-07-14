import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShareButton } from '@/components/ShareButton'
import { EnquireButton } from '@/components/EnquireButton'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase
    .from('cars')
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

export default async function CarDetailPage({ params }: Props) {
  const { data: listing, error } = await supabase
    .from('cars')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !listing) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/cars', label: 'Cars & taxi' },
            { href: `/cars/${params.id}`, label: listing.title },
          ]}
        />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{listing.title}</h1>
            <p className="text-muted text-base mt-1">
              {[listing.listing_type, listing.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ShareButton title={listing.title} />
        </div>
        {listing.description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">{listing.description}</p>
        )}
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          {listing.price && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Price</span>
              <span className="text-sm font-semibold text-ink">{listing.price}</span>
            </div>
          )}
          {listing.listing_type && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Type</span>
              <span className="text-sm text-ink">{listing.listing_type}</span>
            </div>
          )}
          {listing.location && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
              <span className="text-sm text-ink">{listing.location}</span>
            </div>
          )}
          {listing.contact_name && (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Contact</span>
              <span className="text-sm text-ink">{listing.contact_name}</span>
            </div>
          )}
        </div>
        {listing.contact_email && (
          <div className="bg-section rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">Interested in this listing?</p>
            <p className="text-sm text-muted mb-4">Click to reveal the contact email.</p>
            <EnquireButton
              email={listing.contact_email}
              label="Show contact email"
              subject={`Enquiry via HagerLand — ${listing.title}`}
            />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
