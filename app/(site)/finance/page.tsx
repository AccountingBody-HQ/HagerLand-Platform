import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getVertical } from '@/lib/data/verticals'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { PartnerVerticalPage } from '@/components/verticals/PartnerVerticalPage'

export const revalidate = 300

export function generateMetadata() {
  return verticalLandingMetadata('finance', () =>
    buildMetadata({
      title: 'Property and construction finance',
      description: 'Ask approved, licensed partners about mortgages, construction and development finance, diaspora mortgages and more. HagerLand does not give financial advice.',
      path: '/finance',
    }),
  )
}

/** Live finance page (spec 24.8). While the vertical is coming soon, the layout shows the coming-soon landing instead. */
export default async function Page() {
  const v = await getVertical('finance')
  if (!v || v.status !== 'live') notFound()
  return <PartnerVerticalPage vertical={v} />
}
