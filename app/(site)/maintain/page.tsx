import { requireVisiblePillar } from '@/lib/data/pillars'
import { pillarMetadata } from '@/lib/pillar-page'
import { PillarHub } from '@/components/pillars/PillarHub'

export const revalidate = 300

export function generateMetadata() {
  return pillarMetadata('maintain')
}

/** Pillar hub (spec 26.2, 26.4). */
export default async function Page() {
  return <PillarHub pillar={await requireVisiblePillar('maintain')} />
}
