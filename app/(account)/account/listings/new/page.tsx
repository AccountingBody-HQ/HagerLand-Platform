import { requireUser } from '@/lib/auth'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ListingWizard } from '@/components/account/ListingWizard'

export const metadata = { title: 'List a property' }

export default async function NewListingPage() {
  await requireUser('/account/listings/new')
  return (
    <div>
      <AccountPageHeader title="List a property" description="It takes about 10 minutes. Your progress is saved after each step." />
      <ListingWizard id={null} step="basics" values={{}} media={[]} isLive={false} />
    </div>
  )
}
