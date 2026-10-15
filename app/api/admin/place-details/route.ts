import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import { PlacesError, placeDetails } from '@/lib/admin/places'
import { placePhone, placeWebsite } from '@/lib/admin/place-mapping'

export const dynamic = 'force-dynamic'

/** Admin: contact details for one place (Places API New). */
export async function GET(request: NextRequest) {
  if (!verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const placeId = new URL(request.url).searchParams.get('place_id') ?? ''
  try {
    const d = await placeDetails(placeId)
    return NextResponse.json({ name: d.name, address: d.address, phone: placePhone(d.internationalPhone, d.nationalPhone), website: placeWebsite(d.website), business_status: d.businessStatus ?? null })
  } catch (err) {
    return NextResponse.json({ error: err instanceof PlacesError ? err.message : 'Lookup failed.' }, { status: 502 })
  }
}
