import { Briefcase } from 'lucide-react'
import { EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { getJobsI18n } from '@/lib/i18n/server'

/** Shown in account job pages while the jobs vertical is not live (spec 24.2). */
export async function JobsNotLive() {
  const { t, href } = await getJobsI18n()
  return (
    <EmptyState
      icon={<Briefcase />}
      title={t('Jobs on HagerLand open soon')}
      description={t('We are getting the job board ready. Register your interest and we will email you when you can post jobs and apply.')}
      actions={<ButtonLink href={`${href('/jobs')}#register`}>{t('Register your interest')}</ButtonLink>}
    />
  )
}
