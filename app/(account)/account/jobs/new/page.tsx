import { Briefcase } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getVertical } from '@/lib/data/verticals'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { JobForm } from '@/components/jobs/JobForm'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'
import { getJobsI18n } from '@/lib/i18n/server'
import { fill } from '@/lib/i18n/translate'

export async function generateMetadata() {
  const { t } = await getJobsI18n()
  return { title: t('Post a job') }
}

export default async function NewJobPage() {
  const { t, href } = await getJobsI18n()
  await requireUser(href('/account/jobs/new'))
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const active = await getActiveMembership()
  if (!active)
    return <EmptyState icon={<Briefcase />} title={t('Jobs are posted by organisations')} description={t('Create your business profile first. Once it is approved, you can post jobs.')} actions={<ButtonLink href={href('/onboarding?business=1')}>{t('Create a business profile')}</ButtonLink>} />
  return (
    <div className="space-y-6">
      <AccountPageHeader title={t('Post a job')} description={fill(t('For {organisation}. Save a draft at any time; HagerLand reviews the job when you submit it.'), { organisation: active.org.name })} />
      <Card className="p-5 sm:p-8">
        <JobForm defaults={{}} />
      </Card>
    </div>
  )
}
