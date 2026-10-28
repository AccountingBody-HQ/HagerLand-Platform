import Link from 'next/link'
import { Briefcase, Plus, Users } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getVertical } from '@/lib/data/verticals'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { EMPLOYMENT_TYPES, labelFor } from '@/lib/jobs'
import { formatNumber } from '@/lib/format'
import { getJobsI18n } from '@/lib/i18n/server'
import { fill } from '@/lib/i18n/translate'
import { formatDateFor } from '@/lib/i18n/dates'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Layout'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'

export async function generateMetadata() {
  const { t } = await getJobsI18n()
  return { title: t('Jobs') }
}

/** Employer dashboard: the organisation's jobs and their applications (spec 24.9). */
export default async function MyJobsPage() {
  const { locale, t, href } = await getJobsI18n()
  await requireUser(href('/account/jobs'))
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const active = await getActiveMembership()
  if (!active)
    return <EmptyState icon={<Briefcase />} title={t('Jobs are posted by organisations')} description={t('Create your business profile first. Once it is approved, you can post jobs.')} actions={<ButtonLink href={href('/onboarding?business=1')}>{t('Create a business profile')}</ButtonLink>} />
  const { data } = await getServerSupabase().from('job_posts').select('id, title, status, employment_type, applications_count, expires_at, updated_at').eq('employer_org_id', active.org.id).neq('status', 'archived').order('updated_at', { ascending: false })
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader
        title={t('Jobs')}
        description={fill(t('Vacancies posted by {organisation}. HagerLand reviews each job before it goes live.'), { organisation: active.org.name })}
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={href('/account/jobs/candidates')} variant="secondary" className="flex-1">
              <Users /> {t('Find candidates')}
            </ButtonLink>
            <ButtonLink href={href('/account/jobs/new')} className="flex-1">
              <Plus /> {t('Post a job')}
            </ButtonLink>
          </div>
        }
      />
      {active.org.status !== 'published' && <p className="mb-4 rounded-md bg-info/10 px-4 py-3 text-small">{t('Your jobs go live once your business profile has been approved.')}</p>}
      {rows.length === 0 ? (
        <EmptyState icon={<Briefcase />} title={t('No jobs yet')} description={t('Post your first vacancy, or tell us which roles you need to fill.')} actions={<ButtonLink href={href('/account/jobs/new')}>{t('Post a job')}</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {rows.map((j) => {
            const s = LISTING_STATUS_LABELS[j.status]
            return (
              <li key={j.id}>
                <Link href={href(`/account/jobs/${j.id}`)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 shadow-sm hover:border-green">
                  <div className="min-w-0">
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-small text-muted">
                      {t(labelFor(EMPLOYMENT_TYPES, j.employment_type))} · {j.applications_count === 1 ? t('1 application') : fill(t('{n} applications'), { n: formatNumber(j.applications_count) })}
                      {j.status === 'published' && j.expires_at ? ` · ${fill(t('open until {date}'), { date: formatDateFor(j.expires_at, locale) })}` : ''}
                    </p>
                  </div>
                  <Badge tone={s.tone}>{t(s.label)}</Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-6 text-small text-muted">
        {t('Need help hiring?')}{' '}
        <Link href={href('/request-service/staffing')} className="font-semibold text-green underline">
          {t('Submit a staffing requirement')}
        </Link>{' '}
        {t('and we will help you find people.')}
      </p>
    </div>
  )
}
