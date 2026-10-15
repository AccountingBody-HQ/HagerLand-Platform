import { requireVisiblePillar } from '@/lib/data/pillars'
import { listGuides } from '@/lib/data/guides'
import { pillarMetadata } from '@/lib/pillar-page'
import { PillarHub } from '@/components/pillars/PillarHub'
import { GuideList } from '@/components/guides/GuideList'
import { Section } from '@/components/ui/Layout'
import { NewsletterForm } from '@/components/advice/NewsletterForm'
import { NEWSLETTER_CONSENT } from '@/lib/newsletter'

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
      {pillar.status === 'live' && (
        <Section tone="stone" labelledBy="newsletter">
          <div className="grid gap-8 lg:grid-cols-[1fr_520px]">
            <div>
              <h2 id="newsletter" className="hl-h2">
                Get new guides by email
              </h2>
              <p className="mt-3 text-muted">Occasional emails with new guides, market insight and HagerLand news. Separate from anything else you ask us for, and you can unsubscribe in one click.</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <NewsletterForm source="advice" consentText={NEWSLETTER_CONSENT} />
            </div>
          </div>
        </Section>
      )}
    </PillarHub>
  )
}
