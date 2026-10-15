import { requireUser } from '@/lib/auth'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { DevelopmentForm } from '@/components/account/DevelopmentForm'
import { Card } from '@/components/ui/Layout'

export const metadata = { title: 'Add a development' }

export default async function NewDevelopmentPage() {
  await requireUser('/account/developments/new')
  return (
    <div>
      <AccountPageHeader title="Add a development" description="Save it first, then add photos, floor plans and a brochure." />
      <Card className="p-5 sm:p-8">
        <DevelopmentForm defaults={{}} />
      </Card>
    </div>
  )
}
