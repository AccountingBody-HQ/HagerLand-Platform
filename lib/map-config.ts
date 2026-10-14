/**
 * Map tiles (spec 25.2b). Maps appear only when a tile provider is configured with
 * NEXT_PUBLIC_MAP_TILE_URL (e.g. a MapTiler or Stadia URL with its key) and NEXT_PUBLIC_MAP_ATTRIBUTION.
 * Without it, no map is shown anywhere (no broken map).
 */
export interface MapConfig {
  tileUrl: string
  attribution: string
}

export function mapConfigFrom(env: { url?: string; attribution?: string }): MapConfig | null {
  const url = env.url?.trim()
  if (!url || !/^(https:\/\/|http:\/\/localhost:\d+\/)/.test(url) || !url.includes('{z}') || !url.includes('{x}') || !url.includes('{y}')) return null
  return { tileUrl: url, attribution: env.attribution?.trim() || '© map data providers' }
}

export function getMapConfig(): MapConfig | null {
  return mapConfigFrom({ url: process.env.NEXT_PUBLIC_MAP_TILE_URL, attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION })
}

/** Origin of the tile server, for the Content-Security-Policy. */
export function mapTileOrigin(): string {
  const c = getMapConfig()
  if (!c) return ''
  try {
    return new URL(c.tileUrl.replace(/\{[a-z]\}/g, '0')).origin
  } catch {
    return ''
  }
}
