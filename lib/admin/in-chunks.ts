import { must } from '@/lib/admin/must'

// Small parts: the database server repeats the address in its reply header, and a long one is refused by the gateway.
export const CHUNK = 50

type Rows<R> = PromiseLike<{ data: R[] | null; error: { message: string } | null }>

/** Runs an `.in(ids)` query in parts (long id lists do not fit in one request) and joins the rows. */
export async function inChunks<R>(ids: string[], run: (part: string[]) => Rows<R>): Promise<R[]> {
  const unique = Array.from(new Set(ids))
  const out: R[] = []
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data } = must(await run(unique.slice(i, i + CHUNK)))
    out.push(...(data ?? []))
  }
  return out
}
