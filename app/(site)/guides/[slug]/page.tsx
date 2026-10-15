import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getGuide } from '@/lib/data/guides'
import { GUIDE_TOPICS, asFaq, parseGuideBody } from '@/lib/guides'
import { buildMetadata, faqJsonLd, truncateDescription } from '@/lib/seo'
import { canonicalUrl } from '@/lib/site'
import { formatDate } from '@/lib/format'
import { brand } from '@/lib/brand'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { Accordion } from '@/components/ui/Accordion'
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
  const blocks = parseGuideBody(g.body ?? '')
  const faq = asFaq(g.faq)
  return (
    <Container className="max-w-3xl py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Guides', href: '/guides' }, { label: g.title ?? '' }]} />
      <article className="mt-6">
        <p className="text-small font-semibold text-green">{GUIDE_TOPICS.find((t) => t.value === g.topic)?.label}</p>
        <h1 className="hl-h1 mt-1">{g.title}</h1>
        <p className="mt-3 text-[1.0625rem] text-muted">{g.summary}</p>
        <p className="mt-3 text-small text-muted">Updated {formatDate(g.updated_at)}</p>
        <div className="mt-8 space-y-4 text-[1.0625rem] leading-relaxed">
          {blocks.map((b, i) =>
            b.type === 'h2' ? (
              <h2 key={i} className="hl-h3 pt-4">
                {b.text}
              </h2>
            ) : b.type === 'ul' ? (
              <ul key={i} className="list-disc space-y-1 pl-6">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
        </div>
        {faq.length > 0 && (
          <section aria-labelledby="faq-heading" className="mt-12">
            <h2 id="faq-heading" className="hl-h2 mb-4">
              Questions
            </h2>
            <Accordion items={faq.map((f, i) => ({ id: `faq-${i}`, title: f.question, content: f.answer }))} />
          </section>
        )}
        <p className="mt-12 rounded-md bg-stone-50 p-4 text-small text-muted">This guide is general information, not legal, financial or professional advice. Check anything important with a qualified professional.</p>
      </article>
      <JsonLd
        data={[
          { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.summary, datePublished: g.published_at, dateModified: g.updated_at, url: canonicalUrl(`/guides/${g.slug}`), publisher: { '@type': 'Organization', name: brand.name } },
          ...(faq.length ? [faqJsonLd(faq)] : []),
        ]}
      />
    </Container>
  )
}
