import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Breadcrumb } from '@/components/Breadcrumb'
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

  const initials = business.company_name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0] ?? '')
    .join('')
    .toUpperCase()

  const enquiryEmail = business.contact_email || business.email || null

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: business.company_name,
            description: business.ai_description || business.sic_description || undefined,
            telephone: business.phone || undefined,
            url: business.website || undefined,
            address: business.trading_address_city
              ? { '@type': 'PostalAddress', addressLocality: business.trading_address_city, addressCountry: 'GB' }
              : undefined,
          }),
        }}
      />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/business', label: 'Business directory' },
            { href: `/business/${params.id}`, label: business.company_name },
          ]}
        />
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-green-soft flex items-center justify-center font-bold text-green text-xl shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {business.company_name}
              </h1>
              <p className="text-sm text-muted mt-0.5 truncate">
                {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <ShareButton title={business.company_name} />
        </div>
        {business.is_verified && (
          <div className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified Ethiopian-owned business
          </div>
        )}
        {business.ai_description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">{business.ai_description}</p>
        )}
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          {business.phone && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Phone</span>
              <a href={`tel:${business.phone}`} className="text-sm text-ink hover:text-green transition-colors">{business.phone}</a>
            </div>
          )}
          {business.website && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Website</span>
              <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green hover:underline truncate">
                {business.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {business.trading_address_city && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">City</span>
              <span className="text-sm text-ink">{business.trading_address_city}</span>
            </div>
          )}
          {business.sic_description && (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Category</span>
              <span className="text-sm text-ink">{business.sic_description}</span>
            </div>
          )}
        </div>
        {enquiryEmail && (
          <div className="bg-section rounded-xl p-6 mb-8">
            <p className="text-sm font-semibold text-ink mb-1">Interested in this business?</p>
            <p className="text-sm text-muted mb-4">Click to reveal the contact email address.</p>
            <EnquireButton
              email={enquiryEmail}
              label="Show contact email"
              subject={`Enquiry via HagerLand — ${business.company_name}`}
            />
          </div>
        )}
        {!business.is_verified && (
          <div className="border border-border rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">Is this your business?</p>
            <p className="text-sm text-muted mb-4">Claim this listing to update your details and receive a verified badge.</p>
            <Link href={`/business/${params.id}/claim`} className="inline-block border border-green text-green font-semibold rounded-full px-5 py-2 text-sm hover:bg-green-soft transition-colors">
              Claim this business
            </Link>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
