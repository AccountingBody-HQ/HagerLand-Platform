import { resolveResults, resultsMetadata } from '@/lib/property-pages'
import { PropertyResults } from '@/components/property/PropertyResults'
import type { RawParams } from '@/lib/property-search'

export const revalidate = 120

export async function generateMetadata(props: { searchParams: Promise<RawParams> }) {
  const searchParams = await props.searchParams
  return resultsMetadata(await resolveResults('sale', undefined, searchParams))
}

export default async function Page(props: { searchParams: Promise<RawParams> }) {
  const searchParams = await props.searchParams
  return <PropertyResults ctx={await resolveResults('sale', undefined, searchParams)} />
}
