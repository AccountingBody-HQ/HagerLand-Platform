import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { PAGE_ROWS, readAll, readAllIn } from '@/lib/admin/read-all'

// Fix F-1. A fake Supabase select over an in-memory table: it sorts by the requested columns, returns at most
// PAGE_ROWS rows per request (like Supabase's "Max rows"), and can fail one page.
type Row = { id: string; n: number; org: string }
function table(rows: Row[], opts: { failPage?: number } = {}) {
  const requests: { orders: string[]; from: number; to: number; inIds?: string[] }[] = []
  const build = () => {
    const orders: string[] = []
    let inIds: string[] | undefined
    const q = {
      in(_column: string, ids: string[]) {
        inIds = ids
        return q
      },
      order(column: string) {
        orders.push(column)
        return q
      },
      range(from: number, to: number) {
        requests.push({ orders: [...orders], from, to, inIds })
        const page = Math.floor(from / PAGE_ROWS) + 1
        if (opts.failPage === page) return Promise.resolve({ data: null, error: { message: 'boom' } })
        const sorted = rows
          .filter((r) => !inIds || inIds.includes(r.org))
          .slice()
          .sort((a, b) => {
            for (const c of orders) {
              const x = a[c as keyof Row]
              const y = b[c as keyof Row]
              if (x !== y) return x < y ? -1 : 1
            }
            return 0
          })
        // The server's own cap: never more than PAGE_ROWS, whatever was asked for.
        return Promise.resolve({ data: sorted.slice(from, Math.min(to + 1, from + PAGE_ROWS)), error: null })
      },
    }
    return q
  }
  return { build, requests }
}
const rows = (n: number, groups = 1): Row[] => Array.from({ length: n }, (_, i) => ({ id: `r${String(i).padStart(6, '0')}`, n: i % 7, org: `o${i % groups}` }))

describe('readAll: every row, page by page (Fix F-1)', () => {
  for (const n of [0, 999, 1000, 1001, 2500]) {
    it(`${n} rows come back complete, each exactly once`, async () => {
      const t = table(rows(n))
      const { data, error } = await readAll(t.build, { maxRows: 200_000 })
      expect(error).toBeNull()
      expect(data).toHaveLength(n)
      expect(new Set(data.map((r) => r.id)).size).toBe(n)
      // Pages until one comes back short: 0 → 1 request, 1000 → 2, 1001 → 2, 2500 → 3.
      expect(t.requests).toHaveLength(Math.floor(n / PAGE_ROWS) + 1)
      for (const [i, r] of t.requests.entries()) expect([r.from, r.to]).toEqual([i * PAGE_ROWS, i * PAGE_ROWS + PAGE_ROWS - 1])
    })
  }

  it('adds the unique key last, after the order the caller chose, so pages never skip or repeat a row', async () => {
    const t = table(rows(2500))
    const { data } = await readAll(() => t.build().order('n'), { maxRows: 200_000 })
    expect(t.requests.every((r) => r.orders.join(',') === 'n,id')).toBe(true)
    expect(new Set(data.map((r) => r.id)).size).toBe(2500)
    // Still in the caller's order (n), ties broken by id.
    const keys = data.map((r) => `${r.n}|${r.id}`)
    expect(keys).toEqual(keys.slice().sort())
  })

  it('uses the given key(s) when the table has no id column', async () => {
    const t = table(rows(10))
    await readAll(t.build, { maxRows: 100, key: ['org', 'n'] })
    expect(t.requests[0].orders).toEqual(['org', 'n'])
    await expect(readAll(t.build, { maxRows: 100, key: [] })).rejects.toThrow('unique sort key')
  })

  it('an error on page 2 throws: never part of a list', async () => {
    const t = table(rows(2500), { failPage: 2 })
    await expect(readAll(t.build, { maxRows: 200_000 })).rejects.toThrow('Could not read from the database: boom')
  })

  it('more rows than the ceiling throws a clear error instead of cutting the list', async () => {
    const t = table(rows(2500))
    await expect(readAll(t.build, { maxRows: 2000 })).rejects.toThrow('More than 2,000 rows: narrow the period or the filter.')
    await expect(readAll(t.build, { maxRows: 2500 })).resolves.toMatchObject({ data: expect.any(Array) })
  })
})

describe('readAllIn: long id lists in parts of 50, each part paged', () => {
  it('no part has more than 50 ids, and a part with more than 1,000 rows is paged', async () => {
    // 120 groups; group o0 alone has 1,100 rows (more than one page).
    const data = [...rows(1100, 1), ...rows(119, 119).map((r, i) => ({ ...r, id: `x${i}`, org: `o${i + 1}` }))]
    const t = table(data)
    const ids = Array.from({ length: 120 }, (_, i) => `o${i}`)
    const { data: out } = await readAllIn(ids, (part) => t.build().in('org', part), { maxRows: 200_000 })
    expect(out).toHaveLength(1219)
    expect(Math.max(...t.requests.map((r) => r.inIds?.length ?? 0))).toBe(50)
    // Part 1 (o0–o49) needs 2 pages; parts 2 and 3 one each.
    expect(t.requests).toHaveLength(4)
  })
  it('no ids: no request at all', async () => {
    const t = table(rows(5))
    expect((await readAllIn([], (part) => t.build().in('org', part), { maxRows: 10 })).data).toEqual([])
    expect(t.requests).toHaveLength(0)
  })
  it('the ceiling counts every part together', async () => {
    const t = table(rows(300, 100))
    const ids = Array.from({ length: 100 }, (_, i) => `o${i}`)
    await expect(readAllIn(ids, (part) => t.build().in('org', part), { maxRows: 200 })).rejects.toThrow('More than 200 rows')
  })
})

// S6: nothing may ask Supabase for more than 1,000 rows in one request. Complete lists use readAll()/readAllIn().
// Exceptions must be listed here with a reason; there are none.
const EXCEPTIONS: Record<string, string> = {}

describe('guard: no query reads more than 1,000 rows at once', () => {
  const files = execSync("git ls-files app lib components middleware.ts | grep -E '\\.(ts|tsx)$'", { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((f) => f !== 'lib/admin/read-all.ts')
  const num = (s: string, consts: Map<string, number>): number | null => {
    const t = s.trim()
    if (/^[\d_]+$/.test(t)) return Number(t.replace(/_/g, ''))
    return consts.get(t) ?? null
  }
  it('every .limit(n) and .range(a, b) stays within one page', () => {
    const problems: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      const consts = new Map(Array.from(src.matchAll(/const ([A-Z][A-Z0-9_]*) = ([\d_]+)\b/g)).map((m) => [m[1], Number(m[2].replace(/_/g, ''))]))
      for (const m of src.matchAll(/\.limit\(([^()]+)\)/g)) {
        const n = num(m[1], consts)
        if (n !== null && n > PAGE_ROWS) problems.push(`${f}: .limit(${m[1]})`)
      }
      for (const m of src.matchAll(/\.range\(([^,()]+),\s*([^,()]+)\)/g)) {
        const a = num(m[1], consts)
        const b = num(m[2], consts)
        if (a !== null && b !== null && b - a + 1 > PAGE_ROWS) problems.push(`${f}: .range(${m[1]}, ${m[2]})`)
      }
    }
    expect(problems.filter((p) => !EXCEPTIONS[p.split(':')[0]])).toEqual([])
  })
  it('the guard itself catches a large limit, a large constant and a wide range', () => {
    const sample = "const BIG = 50_000\nq.limit(5000)\nq.limit(BIG)\nq.range(0, 1999)\nq.limit(1000)\nq.range(0, 999)"
    const consts = new Map(Array.from(sample.matchAll(/const ([A-Z][A-Z0-9_]*) = ([\d_]+)\b/g)).map((m) => [m[1], Number(m[2].replace(/_/g, ''))]))
    const found = [
      ...Array.from(sample.matchAll(/\.limit\(([^()]+)\)/g)).filter((m) => (num(m[1], consts) ?? 0) > PAGE_ROWS),
      ...Array.from(sample.matchAll(/\.range\(([^,()]+),\s*([^,()]+)\)/g)).filter((m) => (num(m[2], consts) ?? 0) - (num(m[1], consts) ?? 0) + 1 > PAGE_ROWS),
    ]
    expect(found).toHaveLength(3)
  })
})
