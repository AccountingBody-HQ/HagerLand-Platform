import { buildMetadata } from '@/lib/seo'
import { DirectoryPage } from '@/components/company/DirectoryPage'
import type { RawParams } from '@/lib/directory-params'

export const revalidate = 300
export const metadata = buildMetadata({
  title: 'Real-estate developers in Ethiopia',
  description: 'Browse real-estate developers building in Ethiopia. See their developments and track record, check verification and contact them directly.',
  path: '/developers',
})

export default function DevelopersPage({ searchParams }: { searchParams: RawParams }) {
  return (
    <DirectoryPage
      path="/developers"
      crumb="Developers"
      title="Real-estate developers"
      intro="Developers building homes and commercial projects across Ethiopia. Check the developer's licence and the project's permits before you buy off-plan."
      kinds={['developer']}
      searchParams={searchParams}
      defaultSort="listings"
      sorts={[
        { value: 'listings', label: 'Verified first, then most listings' },
        { value: 'newest', label: 'Newest' },
      ]}
      joinHref="/list-with-us#developers"
      joinLabel="List your company"
      noun={['developer', 'developers']}
    />
  )
}
