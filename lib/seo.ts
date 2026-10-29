import type { Metadata } from 'next'
import { brand } from '@/lib/brand'
import { CANONICAL_URL, IS_PRODUCTION, canonicalUrl } from '@/lib/site'
import { localizeHref, type Locale } from '@/lib/i18n/config'

export interface MetadataInput {
  title: string
  description: string
  path: string
  noindex?: boolean
  /** Share image path, e.g. /og/property/<slug>. Defaults to the branded /og/default. */
  image?: string
  absoluteTitle?: boolean
  type?: 'website' | 'article'
  /**
   * The page's language when it is known at request time (Jobs Phase 5): an Amharic page's canonical is its own "/am"
   * address and its share data says am_ET. Omitted (or "en"): exactly as before.
   */
  locale?: Locale
}

/** Page metadata with an absolute canonical URL on www.hagerland.com. Previews are never indexed. */
export function buildMetadata({ title, description, path, noindex, image, absoluteTitle, type = 'website', locale = 'en' }: MetadataInput): Metadata {
  const url = canonicalUrl(locale === 'am' ? localizeHref(path, 'am') : path)
  const index = IS_PRODUCTION && !noindex
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: brand.name,
      type,
      locale: locale === 'am' ? 'am_ET' : 'en_US',
      images: [{ url: image ?? '/og/default', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image ?? '/og/default'] },
  }
}

export function breadcrumbJsonLd(items: { label: string; href?: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: canonicalUrl(c.href) } : {}),
    })),
  }
}

export function organizationJsonLd(sameAs: string[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    description: brand.descriptor,
    url: CANONICAL_URL,
    logo: `${CANONICAL_URL}/logo.png`,
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.name,
    url: CANONICAL_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${CANONICAL_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function faqJsonLd(items: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.question, acceptedAnswer: { '@type': 'Answer', text: i.answer } })),
  }
}

export function postalAddress(locality?: string | null, region?: string | null, street?: string | null, country = 'ET'): Record<string, unknown> {
  return {
    '@type': 'PostalAddress',
    ...(street ? { streetAddress: street } : {}),
    ...(locality ? { addressLocality: locality } : {}),
    ...(region ? { addressRegion: region } : {}),
    addressCountry: country,
  }
}

/** Trim to a meta-description-friendly length on a word boundary. */
export function truncateDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}
