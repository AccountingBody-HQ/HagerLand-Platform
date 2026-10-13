import { notFound } from 'next/navigation'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'

export const revalidate = 300

export function generateMetadata() {
  return verticalLandingMetadata('jobs', () => ({}))
}

/** The live jobs pages arrive with their work package; until then the layout shows the coming-soon landing. */
export default function Page() {
  notFound()
}
