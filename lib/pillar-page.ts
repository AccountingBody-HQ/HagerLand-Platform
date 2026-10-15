import 'server-only'
import type { Metadata } from 'next'
import { getPillar } from '@/lib/data/pillars'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { pillarHref, type PillarKey } from '@/lib/pillars'

/**
 * Metadata for a pillar hub. The hub is its own canonical; deeper pages keep their own canonicals because the hub only
 * summarises and links to them (spec 26.2). Coming-soon (interest-only) hubs are never indexed (spec 26.16).
 */
export async function pillarMetadata(key: PillarKey): Promise<Metadata> {
  const p = await getPillar(key)
  if (!p) return {}
  return buildMetadata({
    title: p.seoTitle ?? (p.status === 'coming_soon' ? `${p.name} — coming soon` : p.name),
    description: truncateDescription(p.seoDescription ?? p.description),
    path: pillarHref(p),
    noindex: p.status !== 'live',
  })
}
