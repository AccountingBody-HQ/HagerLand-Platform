import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PlacesError, searchPlaces } from '@/lib/admin/places'
import { importSection } from '@/lib/admin/place-mapping'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ORG_KINDS = ['agency', 'developer', 'supplier', 'manufacturer', 'contractor', 'professional_firm', 'sole_trader'] as const

/** Admin: search Google Places and flag places already imported (by import log or an existing organisation). */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(request.url).searchParams
  const parsed = z.object({ query: z.string().trim().min(2).max(200), kind: z.enum(ORG_KINDS) }).safeParse({ query: sp.get('query'), kind: sp.get('kind') })
  if (!parsed.success) return NextResponse.json({ error: 'Enter a search and choose a business type.' }, { status: 400 })
  try {
    const places = await searchPlaces(parsed.data.query)
    const ids = places.map((p) => p.google_place_id)
    const db = getAdminSupabase()
    const [{ data: logged }, { data: orgs }] = ids.length
      ? await Promise.all([
          db.from('import_log').select('google_place_id').eq('section', importSection(parsed.data.kind)).eq('status', 'imported').in('google_place_id', ids),
          db.from('organisations').select('google_place_id').in('google_place_id', ids),
        ])
      : [{ data: [] }, { data: [] }]
    const done = new Set([...(logged ?? []).map((l) => l.google_place_id), ...(orgs ?? []).map((o) => o.google_place_id as string)])
    return NextResponse.json({
      results: places.map((p) => ({ google_place_id: p.google_place_id, name: p.name, address: p.address, types: p.types, already_imported: done.has(p.google_place_id) })),
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof PlacesError ? err.message : 'Search failed. Try again.' }, { status: 502 })
  }
}
