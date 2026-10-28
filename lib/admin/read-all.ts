import { must } from '@/lib/admin/must'
import { CHUNK } from '@/lib/admin/in-chunks'

/**
 * Supabase returns at most this many rows per request (Settings → API → Max rows; supabase/config.toml), with no error.
 * Every complete list is therefore read in pages of this size.
 */
export const PAGE_ROWS = 1000

/** Ceiling for admin reports, insights, exports and the daily job's row reads (more means: narrow the period). */
export const REPORT_MAX_ROWS = 200_000

type Result<R> = { data: R[] | null; error: { message: string } | null }

/** The parts of a Supabase select that paging needs: a fresh one is built for every page. */
export interface Pageable<R> {
  order(column: string, options?: { ascending?: boolean }): Pageable<R>
  range(from: number, to: number): PromiseLike<Result<R>>
}

export interface ReadAllOptions {
  /** Refuse (throw) beyond this many rows instead of returning part of the list. */
  maxRows: number
  /**
   * Unique, stable column(s) added as the last sort keys, so pages never skip or repeat a row. Default: `id`.
   * Any order the query already has comes first and is kept.
   */
  key?: string | readonly string[]
}

function tooMany(maxRows: number): Error {
  return new Error(`More than ${maxRows.toLocaleString('en')} rows: narrow the period or the filter.`)
}

/**
 * Reads every row of a query, page by page (the failure rule applies: an error on any page throws, never part of a
 * list). Returns the same `{ data, error }` shape as a single query, so callers keep their destructuring.
 */
export async function readAll<R>(build: () => Pageable<R>, opts: ReadAllOptions): Promise<{ data: R[]; error: null }> {
  const keys = opts.key === undefined ? ['id'] : typeof opts.key === 'string' ? [opts.key] : opts.key
  if (keys.length === 0) throw new Error('readAll needs a unique sort key.')
  const rows: R[] = []
  for (let from = 0; ; from += PAGE_ROWS) {
    let q = build()
    for (const k of keys) q = q.order(k, { ascending: true })
    const { data } = must(await q.range(from, from + PAGE_ROWS - 1))
    const page = data ?? []
    rows.push(...page)
    if (rows.length > opts.maxRows) throw tooMany(opts.maxRows)
    if (page.length < PAGE_ROWS) return { data: rows, error: null }
  }
}

/** readAll for a query with a long `.in()` list: the ids go in parts (lib/admin/in-chunks.ts), each part paged. */
export async function readAllIn<R>(ids: readonly string[], build: (part: string[]) => Pageable<R>, opts: ReadAllOptions): Promise<{ data: R[]; error: null }> {
  const unique = Array.from(new Set(ids))
  const rows: R[] = []
  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK)
    const { data } = await readAll(() => build(part), opts)
    rows.push(...data)
    if (rows.length > opts.maxRows) throw tooMany(opts.maxRows)
  }
  return { data: rows, error: null }
}
