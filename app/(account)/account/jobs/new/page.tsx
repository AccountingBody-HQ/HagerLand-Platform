import { Briefcase } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getVertical } from '@/lib/data/verticals'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { JobForm } from '@/components/jobs/JobForm'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'

export const metadata = { title: 'Post a job' }

export default async function NewJobPage() {
  await requireUser('/account/jobs/new')
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const active = await getActiveMembership()
  if (!active)
    return <EmptyState icon={<Briefcase />} title="Jobs are posted by organisations" description="Create your business profile first. Once it is approved, you can post jobs." actions={<ButtonLink href="/onboarding?business=1">Create a business profile</ButtonLink>} />
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Post a job" description={`For ${active.org.name}. Save a draft at any time; HagerLand reviews the job when you submit it.`} />
      <Card className="p-5 sm:p-8">
        <JobForm defaults={{}} />
      </Card>
    </div>
  )
}
