/** Parses the UTM JSON a form sends (from sessionStorage hl_utm); keeps only utm_* string values. */
export function parseUtm(raw: string | null | undefined): Record<string, string> | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const entries = Object.entries(v as Record<string, unknown>)
        .filter(([k, x]) => k.startsWith('utm_') && typeof x === 'string')
        .map(([k, x]) => [k.slice(0, 40), String(x).slice(0, 100)])
      return entries.length ? Object.fromEntries(entries) : null
    }
  } catch {
    return null
  }
  return null
}
