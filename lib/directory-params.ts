export type RawParams = Record<string, string | string[] | undefined>

export interface DirectoryFilters {
  q?: string
  loc?: string
  verified: boolean
  portfolio: boolean
  grade?: string
  category?: string
  sort: 'verified' | 'projects' | 'newest' | 'relevance' | 'listings'
  page: number
}

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() || undefined
}

export function parseDirectoryParams(raw: RawParams, defaultSort: DirectoryFilters['sort'] = 'verified'): DirectoryFilters {
  const q = first(raw.q)?.slice(0, 100)
  const sort = first(raw.sort)
  const page = Number(first(raw.page) ?? '1')
  const loc = first(raw.loc)
  return {
    q,
    loc: loc && /^[a-z0-9/-]{2,120}$/.test(loc) ? loc : undefined,
    verified: first(raw.verified) === '1',
    portfolio: first(raw.portfolio) === '1',
    grade: first(raw.grade)?.slice(0, 20),
    category: first(raw.category)?.slice(0, 80),
    sort: (['verified', 'projects', 'newest', 'relevance', 'listings'] as const).find((s) => s === sort) ?? (q ? 'relevance' : defaultSort),
    page: Number.isFinite(page) && page >= 1 && page <= 500 ? Math.floor(page) : 1,
  }
}

export function directoryQuery(f: DirectoryFilters, overrides: Partial<DirectoryFilters> = {}, defaultSort: DirectoryFilters['sort'] = 'verified'): string {
  const v = { ...f, ...overrides }
  const p = new URLSearchParams()
  if (v.q) p.set('q', v.q)
  if (v.loc) p.set('loc', v.loc)
  if (v.verified) p.set('verified', '1')
  if (v.portfolio) p.set('portfolio', '1')
  if (v.grade) p.set('grade', v.grade)
  if (v.category) p.set('category', v.category)
  if (v.sort !== (v.q ? 'relevance' : defaultSort)) p.set('sort', v.sort)
  if (v.page > 1) p.set('page', String(v.page))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function hasDirectoryFilters(f: DirectoryFilters, defaultSort: DirectoryFilters['sort'] = 'verified'): boolean {
  return directoryQuery({ ...f, page: 1 }, {}, defaultSort) !== ''
}
