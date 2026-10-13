import type { MetadataRoute } from 'next'
import { IS_PRODUCTION, CANONICAL_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/roodber8', '/roodber8-login', '/api/', '/account', '/onboarding', '/auth', '/search', '/supplies/quote', '/dev/'] },
    host: CANONICAL_URL,
  }
}
