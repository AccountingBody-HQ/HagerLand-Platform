import type { MetadataRoute } from 'next'
import { IS_PRODUCTION, CANONICAL_URL } from '@/lib/site'
import { ROBOTS_DISALLOW, sitemapUrls } from '@/lib/sitemap-rules'

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) return { rules: { userAgent: '*', disallow: '/' } }
  const maps = sitemapUrls()
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...ROBOTS_DISALLOW] },
    sitemap: [maps.index, ...maps.children],
    host: CANONICAL_URL,
  }
}
