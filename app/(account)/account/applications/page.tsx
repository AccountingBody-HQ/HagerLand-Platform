import Link from 'next/link'
import { FileText, Send } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getVertical } from '@/lib/data/verticals'
import { withdrawApplicationAction } from '@/app/actions/job-actions'
import { APPLICATION_STATUSES, labelFor } from '@/lib/jobs'
import { getJobsI18n } from '@/lib/i18n/server'
import { fill } from '@/lib/i18n/translate'
import { formatDateFor } from '@/lib/i18n/dates'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { ActionButton } from '@/components/forms/ActionButton'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export async function generateMetadata() {
  const { t } = await getJobsI18n()
  return { title: t('My job applications') }
}

export default async function MyApplicationsPage(props: { searchParams: Promise<{ applied?: string }> }) {
  const searchParams = await props.searchParams
  const { locale, t, href } = await getJobsI18n()
  const user = await requireUser(href('/account/applications'))
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const supabase = getServerSupabase()
  const { data: apps, error } = await supabase.from('job_applications').select('id, reference, job_id, status, cv_path, created_at').eq('applicant_user_id', user.id).order('created_at', { ascending: false })
  const jobIds = Array.from(new Set((apps ?? []).map((a) => a.job_id)))
  const { data: jobs, error: jobsError } = jobIds.length ? await supabase.from('jobs_public').select('id, slug, title, employer_name').in('id', jobIds) : { data: [], error: null }
  const failed = error ?? jobsError
  if (failed) log.error('account', 'job applications failed to load', failed)
  const applied = searchParams.applied && /^HLA-[0-9A-Z-]{1,20}$/.test(searchParams.applied) ? searchParams.applied : null
  return (
    <div className="space-y-5">
      <AccountPageHeader title={t('My job applications')} action={<ButtonLink href={href('/jobs')} variant="secondary">{t('Search jobs')}</ButtonLink>} />
      {applied && <FormAlert tone="success">{fill(t('Your application has been sent (reference {reference}). We have emailed you a copy.'), { reference: applied })}</FormAlert>}
      {failed ? (
        <LoadFailed what="your job applications" />
      ) : !apps?.length ? (
        <EmptyState icon={<Send />} title={t('No applications yet')} description={t('When you apply for a job, you can follow it here.')} actions={<ButtonLink href={href('/jobs')}>{t('Search jobs')}</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {apps.map((a) => {
            const job = (jobs ?? []).find((j) => j.id === a.job_id)
            return (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {job?.slug ? (
                        <Link href={href(`/jobs/${job.slug}`)} className="hover:underline">
                          {job.title}
                        </Link>
                      ) : (
                        t('This job has closed')
                      )}
                    </p>
                    <p className="text-small text-muted">
                      {job?.employer_name ? `${job.employer_name} · ` : ''}
                      {a.reference} · {fill(t('sent {date}'), { date: formatDateFor(a.created_at, locale) })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.status === 'hired' ? 'green' : a.status === 'shortlisted' ? 'gold' : 'neutral'}>{t(labelFor(APPLICATION_STATUSES, a.status))}</Badge>
                    {a.cv_path && (
                      <a href={`/account/cv/${a.id}`} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-small font-semibold text-green">
                        <FileText className="size-4" aria-hidden /> {t('CV sent')}
                      </a>
                    )}
                    {!['withdrawn', 'hired'].includes(a.status) && (
                      <ActionButton size="sm" variant="ghost" confirm={t('Withdraw this application?')} action={withdrawApplicationAction.bind(null, a.id)}>
                        {t('Withdraw')}
                      </ActionButton>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-small text-muted">
        {t('Want employers to find you?')}{' '}
        <Link href={href('/account/candidate')} className="font-semibold text-green underline">
          {t('Set up your candidate profile')}
        </Link>
        .
      </p>
    </div>
  )
}
