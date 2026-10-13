import { NextResponse, type NextRequest } from 'next/server'
import { getPublicSupabase } from '@/lib/supabase/public'
import { safeQuery } from '@/lib/data/safe'
import type { ComboOption } from '@/components/ui/Combobox'

interface LocationHit {
  id: string
  path: string
  name: string
  display_name: string
  level: string
}

/** Location typeahead for forms and filters: GET /api/locations?q=bol */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 60)
  const valueField = request.nextUrl.searchParams.get('value') === 'path' ? 'path' : 'id'
  if (q.length < 2) return NextResponse.json([])
  const hits = await safeQuery<LocationHit[]>('location search', [], async () => {
    const { data, error } = await getPublicSupabase({ tags: ['reference'], revalidate: 3600 }).rpc('search_locations', { p_q: q, p_limit: 10 })
    if (error) throw error
    return (data as unknown as LocationHit[]) ?? []
  })
  const options: ComboOption[] = hits.map((h) => ({
    value: valueField === 'path' ? h.path : h.id,
    label: h.name,
    description: h.display_name !== h.name ? h.display_name.split(', ').slice(1).join(', ') : h.level === 'region' ? 'Region' : undefined,
  }))
  return NextResponse.json(options, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
