import { NextResponse, type NextRequest } from 'next/server'
import { parsePropertyParams } from '@/lib/property-search'
import { searchProperties } from '@/lib/data/properties'
import { getLocationByPath } from '@/lib/data/reference'

/** Live result count for the mobile filter sheet ("Show N results"). */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const raw: Record<string, string> = Object.fromEntries(sp)
  const purpose = sp.get('purpose') === 'rent' ? 'rent' : 'sale'
  const location = sp.get('location') ? await getLocationByPath(sp.get('location') ?? '') : null
  const result = await searchProperties({ purpose, locationId: location?.id, filters: { ...parsePropertyParams(raw), page: 1 }, pageSize: 1 })
  return NextResponse.json({ total: result.total }, { headers: { 'Cache-Control': 'public, s-maxage=60' } })
}
