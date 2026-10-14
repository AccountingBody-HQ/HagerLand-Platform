import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getVertical } from '@/lib/data/verticals'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { PartnerVerticalPage } from '@/components/verticals/PartnerVerticalPage'

export const revalidate = 300

export function generateMetadata() {
  return verticalLandingMetadata('insurance', () =>
    buildMetadata({
      title: 'Property and construction insurance',
      description: 'Request quotes from approved, licensed insurers and brokers for homes, buildings, landlords, construction and contractors. HagerLand does not give insurance advice.',
      path: '/insurance',
    }),
  )
}

/** Live insurance page (spec 24.8). While the vertical is coming soon, the layout shows the coming-soon landing instead. */
export default async function Page() {
  const v = await getVertical('insurance')
  if (!v || v.status !== 'live') notFound()
  return <PartnerVerticalPage vertical={v} />
}
