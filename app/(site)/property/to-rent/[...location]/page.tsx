import { resolveResults, resultsMetadata } from '@/lib/property-pages'
import { PropertyResults } from '@/components/property/PropertyResults'
import type { RawParams } from '@/lib/property-search'

export const revalidate = 120

export async function generateMetadata({ params, searchParams }: { params: { location: string[] }; searchParams: RawParams }) {
  return resultsMetadata(await resolveResults('rent', params.location, searchParams))
}

export default async function Page({ params, searchParams }: { params: { location: string[] }; searchParams: RawParams }) {
  return <PropertyResults ctx={await resolveResults('rent', params.location, searchParams)} />
}
