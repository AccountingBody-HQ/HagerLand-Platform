import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getVertical } from '@/lib/data/verticals'
import type { VerticalKey } from '@/lib/verticals'
import { ComingSoonPage } from './ComingSoonPage'

/**
 * Wraps every page a vertical owns (used in its layout): hidden → 404, coming soon → the designed
 * coming-soon landing, live → the page itself (spec 24.2).
 */
export async function VerticalGate({ verticalKey, children }: { verticalKey: VerticalKey; children: ReactNode }) {
  const v = await getVertical(verticalKey)
  if (!v) notFound()
  if (v.status === 'coming_soon') return <ComingSoonPage vertical={v} />
  return <>{children}</>
}
