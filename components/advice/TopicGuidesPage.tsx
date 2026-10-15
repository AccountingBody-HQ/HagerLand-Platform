import { notFound } from 'next/navigation'
import { getPillar } from '@/lib/data/pillars'
import { listGuides } from '@/lib/data/guides'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { GuideList } from '@/components/guides/GuideList'

/**
 * Checklists and the glossary (spec 26.10): published guides of one topic. Starter drafts wait for AB's review in
 * admin → Guides, so until one is published the page says so honestly and is not indexed.
 */
export async function TopicGuidesPage({ topic, title, intro, empty }: { topic: string; title: string; intro: string; empty: string }) {
  const pillar = await getPillar('advice')
  if (!pillar || pillar.status !== 'live') notFound()
  const guides = await listGuides({ topic })
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: 'Knowledge & Advice', href: '/advice' }, { label: title }]} />
      <h1 className="hl-h1 mt-6">{title}</h1>
      <p className="mt-3 max-w-3xl text-muted">{intro}</p>
      <div className="mt-8">{guides.length ? <GuideList guides={guides} /> : <EmptyState
            title="On its way"
            description={empty}
            actions={
              <>
                <ButtonLink href="/help">Help & FAQs</ButtonLink>
                <ButtonLink href="/contact" variant="secondary">
                  Ask our team
                </ButtonLink>
              </>
            }
          />}</div>
      <p className="mt-8 text-small text-muted">General information, not legal or financial advice. Rules can change: check with a lawyer or the relevant office before you act.</p>
    </Container>
  )
}

export async function topicGuidesNoindex(topic: string): Promise<boolean> {
  return (await listGuides({ topic, limit: 1 })).length === 0
}
