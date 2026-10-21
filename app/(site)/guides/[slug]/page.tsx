import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getGuide } from '@/lib/data/guides'
import { asFaq } from '@/lib/guides'
import { buildMetadata, faqJsonLd, truncateDescription } from '@/lib/seo'
import { canonicalUrl } from '@/lib/site'
import { brand } from '@/lib/brand'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { GuideArticle } from '@/components/guides/GuideArticle'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 600

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const g = await getGuide(params.slug)
  if (!g) return { title: 'Guide not found' }
  return buildMetadata({ title: g.seo_title || g.title || '', description: truncateDescription(g.seo_description || g.summary || ''), path: `/guides/${g.slug}`, type: 'article' })
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const g = await getGuide(params.slug)
  if (!g || !g.slug) notFound()
  const faq = asFaq(g.faq)
  return (
    <Container className="max-w-3xl py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Guides', href: '/guides' }, { label: g.title ?? '' }]} />
      <GuideArticle guide={g} faq={faq} />
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.summary, datePublished: g.published_at, dateModified: g.updated_at, url: canonicalUrl(`/guides/${g.slug}`), publisher: { '@type': 'Organization', name: brand.name } },
          ...(faq.length ? [faqJsonLd(faq)] : []),
        ]}
      />
    </Container>
  )
}
