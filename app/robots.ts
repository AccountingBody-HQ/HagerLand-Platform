import type { MetadataRoute } from 'next'
import { IS_PRODUCTION, CANONICAL_URL } from '@/lib/site'
import { SITEMAP_IDS } from '@/lib/sitemap-rules'

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/roodber8', '/roodber8-login', '/api/', '/account', '/onboarding', '/auth', '/search', '/supplies/quote', '/dev/'] },
    sitemap: SITEMAP_IDS.map((id) => `${CANONICAL_URL}/sitemap/${id}.xml`),
    host: CANONICAL_URL,
  }
}
