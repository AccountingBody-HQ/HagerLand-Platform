import { resolveResults, resultsMetadata } from '@/lib/property-pages'
import { PropertyResults } from '@/components/property/PropertyResults'
import type { RawParams } from '@/lib/property-search'

export const revalidate = 120

export async function generateMetadata({ searchParams }: { searchParams: RawParams }) {
  return resultsMetadata(await resolveResults('rent', undefined, searchParams))
}

export default async function Page({ searchParams }: { searchParams: RawParams }) {
  return <PropertyResults ctx={await resolveResults('rent', undefined, searchParams)} />
}
