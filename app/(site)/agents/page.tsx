import { buildMetadata } from '@/lib/seo'
import { DirectoryPage } from '@/components/company/DirectoryPage'
import type { RawParams } from '@/lib/directory-params'

export const revalidate = 300
export const metadata = buildMetadata({
  title: 'Estate agents and brokers in Ethiopia',
  description: 'Find estate agents and property brokers across Ethiopia. See their current listings, check verification and contact them directly on HagerLand.',
  path: '/agents',
})

export default function AgentsPage({ searchParams }: { searchParams: RawParams }) {
  return (
    <DirectoryPage
      path="/agents"
      crumb="Estate agents"
      title="Estate agents and brokers"
      intro="Agents who know the area and list their properties on HagerLand. Verified agents have had their trade licence checked."
      kinds={['agency']}
      searchParams={searchParams}
      defaultSort="listings"
      sorts={[
        { value: 'listings', label: 'Verified first, then most listings' },
        { value: 'newest', label: 'Newest' },
      ]}
      joinHref="/list-with-us#agents"
      joinLabel="List your agency"
      noun={['agency', 'agencies']}
    />
  )
}
