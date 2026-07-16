import type { MetadataRoute } from 'next'

const BASE = 'https://hagerland.com'

const STATIC_PAGES = [
  { url: '/', priority: 1.0, changeFrequency: 'daily' as const },
  { url: '/business', priority: 0.9, changeFrequency: 'daily' as const },
  { url: '/jobs', priority: 0.9, changeFrequency: 'daily' as const },
  { url: '/housing', priority: 0.8, changeFrequency: 'weekly' as const },
  { url: '/money', priority: 0.8, changeFrequency: 'weekly' as const },
  { url: '/cars', priority: 0.7, changeFrequency: 'weekly' as const },
  { url: '/tutors', priority: 0.7, changeFrequency: 'weekly' as const },
  { url: '/community', priority: 0.8, changeFrequency: 'weekly' as const },
  { url: '/events', priority: 0.9, changeFrequency: 'daily' as const },
  { url: '/search', priority: 0.6, changeFrequency: 'weekly' as const },
  { url: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
  { url: '/how-it-works', priority: 0.5, changeFrequency: 'monthly' as const },
  { url: '/contact', priority: 0.4, changeFrequency: 'monthly' as const },
  { url: '/privacy', priority: 0.3, changeFrequency: 'monthly' as const },
  { url: '/terms', priority: 0.3, changeFrequency: 'monthly' as const },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls = STATIC_PAGES.map(({ url, priority, changeFrequency }) => ({
    url: `${BASE}${url}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))

  // Dynamic listing URLs — only run at request time, not build time
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return staticUrls

  try {
    const { supabase } = await import('@/lib/supabase')
    const TABLES = [
      { table: 'companies', segment: 'business', priority: 0.8 },
      { table: 'jobs', segment: 'jobs', priority: 0.8 },
      { table: 'housing', segment: 'housing', priority: 0.7 },
      { table: 'money', segment: 'money', priority: 0.7 },
      { table: 'cars', segment: 'cars', priority: 0.6 },
      { table: 'tutors', segment: 'tutors', priority: 0.7 },
      { table: 'community', segment: 'community', priority: 0.7 },
      { table: 'events', segment: 'events', priority: 0.8 },
    ] as const
    const listingUrls = (
      await Promise.all(
        TABLES.map(({ table, segment, priority }) =>
          supabase.from(table).select('id, created_at').eq('status', 'active')
            .then(({ data }) => (data ?? []).map((row) => ({
              url: `${BASE}/${segment}/${row.id}`,
              lastModified: new Date(row.created_at),
              changeFrequency: 'weekly' as const,
              priority,
            })))
        )
      )
    ).flat()
    return [...staticUrls, ...listingUrls]
  } catch {
    return staticUrls
  }
}