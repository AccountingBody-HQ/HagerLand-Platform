import { sitemapIndexXml, sitemapUrls } from '@/lib/sitemap-rules'

export const dynamic = 'force-static'

/** Sitemap index (the URL given to search engines). app/sitemap.ts uses generateSitemaps, so Next serves only /sitemap/[id].xml. */
export function GET() {
  return new Response(sitemapIndexXml(sitemapUrls().children), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
