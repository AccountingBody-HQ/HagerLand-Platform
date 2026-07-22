import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
const SESSION_COOKIE = 'hl_admin_session'

export async function GET(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('place_id')
  if (!placeId) {
    return NextResponse.json({ error: 'place_id required' }, { status: 400 })
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }
  const fields = 'address_components,formatted_phone_number,website'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK') {
    return NextResponse.json({ error: data.status }, { status: 500 })
  }
  const components: { long_name: string; short_name: string; types: string[] }[] = data.result?.address_components || []
  function getComponent(type: string): string {
    return components.find(c => c.types.includes(type))?.long_name || ''
  }
  const city =
    getComponent('locality') ||
    getComponent('postal_town') ||
    getComponent('administrative_area_level_2') ||
    getComponent('administrative_area_level_1') ||
    ''
  const country = getComponent('country')
  const phone = data.result?.formatted_phone_number || ''
  const website = data.result?.website || ''
  return NextResponse.json({ city, country, phone, website })
}
