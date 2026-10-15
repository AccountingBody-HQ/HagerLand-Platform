import { AgencyListingFormPage, agencyFormMetadata } from '@/components/agency/AgencyListingFormPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return agencyFormMetadata((await props.params).slug, 'offer')
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  return <AgencyListingFormPage slug={(await props.params).slug} kind="offer" />
}
