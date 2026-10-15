import { resolveResults, resultsMetadata } from '@/lib/property-pages'
import { PropertyResults } from '@/components/property/PropertyResults'
import type { RawParams } from '@/lib/property-search'

export const revalidate = 120

export async function generateMetadata(
  props: { params: Promise<{ location: string[] }>; searchParams: Promise<RawParams> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  return resultsMetadata(await resolveResults('rent', params.location, searchParams))
}

export default async function Page(
  props: { params: Promise<{ location: string[] }>; searchParams: Promise<RawParams> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  return <PropertyResults ctx={await resolveResults('rent', params.location, searchParams)} />
}
