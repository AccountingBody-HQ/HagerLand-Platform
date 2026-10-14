import { BookOpen } from 'lucide-react'
import { listGuides } from '@/lib/data/guides'
import { GUIDE_TOPICS } from '@/lib/guides'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { GuideList } from '@/components/guides/GuideList'

export const revalidate = 600

export async function generateMetadata() {
  const guides = await listGuides({ limit: 1 })
  return buildMetadata({
    title: 'Guides to property, building and supplies in Ethiopia',
    description: 'Practical guides from HagerLand on buying, renting, building, choosing contractors and ordering materials.',
    path: '/guides',
    noindex: guides.length === 0,
  })
}

/** Guides content hub (spec 25.2g). */
export default async function GuidesPage() {
  const guides = await listGuides()
  const topics = GUIDE_TOPICS.map((t) => ({ ...t, guides: guides.filter((g) => g.topic === t.value) })).filter((t) => t.guides.length > 0)
  return (
    <>
      <Container className="pt-6 lg:pt-10">
        <Breadcrumbs items={[{ label: 'Guides' }]} />
        <h1 className="hl-h1 mt-6">Guides</h1>
        <p className="mt-2 max-w-2xl text-muted">Practical, plain-English guides on property, building and materials in Ethiopia.</p>
      </Container>
      {topics.length === 0 ? (
        <Container className="py-10">
          <div className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center">
            <BookOpen className="mx-auto size-8 text-green" aria-hidden />
            <h2 className="hl-h3 mt-3">Our first guides are being written</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">Check back soon.</p>
          </div>
        </Container>
      ) : (
        topics.map((t) => (
          <Section key={t.value}>
            <SectionHeader title={t.label} />
            <GuideList guides={t.guides} />
          </Section>
        ))
      )}
    </>
  )
}
