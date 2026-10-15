const PRODUCTION_URL = 'https://www.hagerland.com'

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV
  if (vercelEnv === 'production') return PRODUCTION_URL
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  return 'http://localhost:3000'
}

/** Absolute origin of the running site: www.hagerland.com in production, the deployment URL on previews, localhost in dev. */
export const SITE_URL = resolveSiteUrl()

/** The canonical production host, used for canonical URLs and structured data. */
export const CANONICAL_URL = PRODUCTION_URL

/** True only on the production deployment. Previews and dev are never indexed. */
export const IS_PRODUCTION = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV) === 'production'

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function canonicalUrl(path = '/'): string {
  return `${CANONICAL_URL}${path.startsWith('/') ? path : `/${path}`}`
}
