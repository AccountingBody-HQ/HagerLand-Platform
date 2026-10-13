'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

/** Records one view of a listing/profile (server de-duplicates per session). */
export function ViewTracker({ entityType, id, label }: { entityType: 'property' | 'development' | 'product' | 'organisation'; id: string; label: string }) {
  useEffect(() => {
    void fetch('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity_type: entityType, id }), keepalive: true })
    track('listing_viewed', { type: label })
  }, [entityType, id, label])
  return null
}
