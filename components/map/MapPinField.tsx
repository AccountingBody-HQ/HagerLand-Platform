'use client'

import { useState } from 'react'
import { DynamicMap } from './DynamicMap'
import type { MapConfig } from '@/lib/map-config'

/** Optional pin for a listing's location (spec 7.4, 25.2b). Submits lat and lng; empty when no pin. */
export function MapPinField({ config, lat, lng }: { config: MapConfig; lat?: number | string | null; lng?: number | string | null }) {
  const initial = lat !== null && lat !== undefined && lng !== null && lng !== undefined ? { lat: Number(lat), lng: Number(lng) } : null
  const [pin, setPin] = useState(initial)
  const [cleared, setCleared] = useState(0)
  return (
    <div className="space-y-2">
      <p className="text-small font-semibold text-ink">
        Pin on the map <span className="font-normal text-muted">(optional)</span>
      </p>
      <p className="text-small text-muted">Tap the map where the property is. Unless you show the address publicly, visitors see only an approximate area (about 1 km).</p>
      <input type="hidden" name="lat" value={pin?.lat ?? ''} />
      <input type="hidden" name="lng" value={pin?.lng ?? ''} />
      <DynamicMap key={cleared} tileUrl={config.tileUrl} attribution={config.attribution} pick={pin} onPick={setPin} label="Map: tap to place the property" />
      {pin && (
        <button
          type="button"
          className="min-h-11 text-small font-semibold text-green underline"
          onClick={() => {
            setPin(null)
            setCleared((n) => n + 1)
          }}
        >
          Remove the pin
        </button>
      )}
    </div>
  )
}
