/** Property comparison list (spec 24.7): up to four, kept in the browser so guests can use it. */

export const COMPARE_KEY = 'hl_compare_v1'
export const COMPARE_MAX = 4

export interface CompareItem {
  id: string
  slug: string
  title: string
}

export function parseCompare(raw: string | null): CompareItem[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v
      .filter((x): x is CompareItem => Boolean(x) && typeof x === 'object' && typeof (x as CompareItem).id === 'string' && /^[0-9a-f-]{36}$/.test((x as CompareItem).id) && typeof (x as CompareItem).slug === 'string')
      .map((x) => ({ id: x.id, slug: String(x.slug).slice(0, 200), title: String(x.title ?? '').slice(0, 120) }))
      .slice(0, COMPARE_MAX)
  } catch {
    return []
  }
}

/** Adds or removes an item. Adding a fifth is refused (returns the list unchanged and full = true). */
export function toggleCompare(list: CompareItem[], item: CompareItem): { list: CompareItem[]; full: boolean } {
  if (list.some((x) => x.id === item.id)) return { list: list.filter((x) => x.id !== item.id), full: false }
  if (list.length >= COMPARE_MAX) return { list, full: true }
  return { list: [...list, item], full: false }
}
