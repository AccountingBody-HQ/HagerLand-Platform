import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getDevelopmentBySlug } from '@/lib/data/developments'
import { buildMetadata, truncateDescription, postalAddress } from '@/lib/seo'
import { publicMediaUrl } from '@/lib/media'
import { canonicalUrl } from '@/lib/site'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DevelopmentDetail } from '@/components/development/DevelopmentDetail'
import { ViewTracker } from '@/components/analytics/ViewTracker'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 600

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const d = await getDevelopmentBySlug(params.slug)
  if (!d) return { title: 'Development not found' }
  return buildMetadata({
    title: `${d.name} — ${d.location_display?.split(', ').slice(0, 2).join(', ')}`,
    description: truncateDescription(d.summary ?? d.description ?? `${d.name}: new development in ${d.location_display}. Unit types, prices and payment plan on HagerLand.`),
    path: `/developments/${d.slug}`,
    image: `/og/development/${d.slug}`,
  })
}

export default async function DevelopmentPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const d = await getDevelopmentBySlug(params.slug)
  if (!d || !d.id) notFound()
  if (d.is_hagerland) permanentRedirect(`/our-developments/${d.slug}`)
  return (
    <Container className="py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Developments', href: '/developments' }, { label: d.name ?? '' }]} />
      <DevelopmentDetail d={d} />
      <ViewTracker entityType="development" id={d.id} label={d.kind ?? 'development'} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Residence',
          name: d.name,
          url: canonicalUrl(`/developments/${d.slug}`),
          ...(d.description ? { description: d.description.slice(0, 500) } : {}),
          address: postalAddress(d.location_display?.split(', ')[0], d.location_display?.split(', ').slice(-1)[0], d.address_line),
          ...(publicMediaUrl(d.cover_path) ? { image: publicMediaUrl(d.cover_path) } : {}),
        }}
      />
    </Container>
  )
}
