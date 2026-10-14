'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { Map as LMap, Marker } from 'leaflet'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
  href?: string
  sub?: string
}

const ADDIS: [number, number] = [9.005, 38.763]

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

/**
 * Leaflet map (loaded only in the browser). Shows points with links, or, with `onPick`, lets the user
 * place one pin (the listing wizard).
 */
export default function LeafletMap({ tileUrl, attribution, points = [], pick, onPick, label }: { tileUrl: string; attribution: string; points?: MapPoint[]; pick?: { lat: number; lng: number } | null; onPick?: (p: { lat: number; lng: number }) => void; label: string }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<LMap | null>(null)
  const pin = useRef<Marker | null>(null)
  // Read once when the map is created.
  const initial = useRef({ points, pick, onPick })

  useEffect(() => {
    let cancelled = false
    const { points, pick, onPick } = initial.current
    void import('leaflet').then((L) => {
      if (cancelled || !el.current || map.current) return
      const m = L.map(el.current, { scrollWheelZoom: false }).setView(pick ? [pick.lat, pick.lng] : ADDIS, pick ? 15 : 12)
      L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(m)
      const icon = L.divIcon({ className: '', html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#1C7C4C;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
      const bounds: [number, number][] = []
      for (const p of points) {
        const marker = L.marker([p.lat, p.lng], { icon, title: p.label, keyboard: true }).addTo(m)
        marker.bindPopup(`${p.href ? `<a href="${escape(p.href)}"><strong>${escape(p.label)}</strong></a>` : `<strong>${escape(p.label)}</strong>`}${p.sub ? `<br>${escape(p.sub)}` : ''}`)
        bounds.push([p.lat, p.lng])
      }
      if (bounds.length > 1) m.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
      else if (bounds.length === 1) m.setView(bounds[0], 14)
      if (onPick) {
        if (pick) pin.current = L.marker([pick.lat, pick.lng], { icon }).addTo(m)
        m.on('click', (e) => {
          const p = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) }
          if (pin.current) pin.current.setLatLng([p.lat, p.lng])
          else pin.current = L.marker([p.lat, p.lng], { icon }).addTo(m)
          onPick(p)
        })
      }
      map.current = m
    })
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      pin.current = null
    }
  }, [tileUrl, attribution])

  return <div ref={el} role="application" aria-label={label} className="z-0 h-[420px] w-full rounded-lg border border-border bg-stone-100 lg:h-[560px]" />
}
