import { requireVisiblePillar } from '@/lib/data/pillars'
import { listGuides } from '@/lib/data/guides'
import { pillarMetadata } from '@/lib/pillar-page'
import { PillarHub } from '@/components/pillars/PillarHub'
import { GuideList } from '@/components/guides/GuideList'
import { Section } from '@/components/ui/Layout'

export const revalidate = 300

export function generateMetadata() {
  return pillarMetadata('advice')
}

/** Knowledge & Advice hub (spec 26.10). Guides appear here once AB publishes them. */
export default async function Page() {
  const pillar = await requireVisiblePillar('advice')
  const guides = pillar.status === 'live' ? await listGuides({ limit: 6 }) : []
  return (
    <PillarHub pillar={pillar}>
      {guides.length > 0 && (
        <Section labelledBy="latest-guides">
          <h2 id="latest-guides" className="hl-h2">
            Latest guides
          </h2>
          <div className="mt-6">
            <GuideList guides={guides} />
          </div>
        </Section>
      )}
    </PillarHub>
  )
}
