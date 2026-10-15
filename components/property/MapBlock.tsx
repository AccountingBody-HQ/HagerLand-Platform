'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { publicEnv } from '@/lib/env-public'
import { Button } from '@/components/ui/Button'

/** Map loads only when asked for (saves mobile data). Approximate locations use a wider zoom. */
export function MapBlock({ lat, lng, exact, label }: { lat: number; lng: number; exact: boolean; label: string }) {
  const [show, setShow] = useState(false)
  const key = publicEnv.googleMapsEmbedKey
  const zoom = exact ? 16 : 14
  const external = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  if (!key) {
    return (
      <a href={external} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-green hover:underline">
        <MapPin className="size-5" aria-hidden /> Open in Google Maps
      </a>
    )
  }
  return show ? (
    <div className="overflow-hidden rounded-lg border border-border">
      <iframe
        title={`Map of ${label}`}
        src={`https://www.google.com/maps/embed/v1/${exact ? 'place' : 'view'}?key=${encodeURIComponent(key)}&${exact ? `q=${lat},${lng}` : `center=${lat},${lng}`}&zoom=${zoom}`}
        className="aspect-[16/9] w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {!exact && <p className="bg-stone-50 px-3 py-2 text-caption text-muted">The exact address is shared by the lister when you get in touch.</p>}
    </div>
  ) : (
    <Button variant="secondary" onClick={() => setShow(true)}>
      <MapPin /> Show map
    </Button>
  )
}
