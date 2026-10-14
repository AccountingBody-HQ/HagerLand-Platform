import Link from 'next/link'
import { FileText, Send } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getVertical } from '@/lib/data/verticals'
import { withdrawApplicationAction } from '@/app/actions/job-actions'
import { APPLICATION_STATUSES, labelFor } from '@/lib/jobs'
import { formatDate } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { ActionButton } from '@/components/forms/ActionButton'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'

export const metadata = { title: 'My job applications' }

export default async function MyApplicationsPage({ searchParams }: { searchParams: { applied?: string } }) {
  const user = await requireUser('/account/applications')
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const supabase = getServerSupabase()
  const { data: apps } = await supabase.from('job_applications').select('id, reference, job_id, status, cv_path, created_at').eq('applicant_user_id', user.id).order('created_at', { ascending: false })
  const jobIds = Array.from(new Set((apps ?? []).map((a) => a.job_id)))
  const { data: jobs } = jobIds.length ? await supabase.from('jobs_public').select('id, slug, title, employer_name').in('id', jobIds) : { data: [] }
  const applied = searchParams.applied && /^HLA-[0-9A-Z-]{1,20}$/.test(searchParams.applied) ? searchParams.applied : null
  return (
    <div className="space-y-5">
      <AccountPageHeader title="My job applications" action={<ButtonLink href="/jobs" variant="secondary">Search jobs</ButtonLink>} />
      {applied && <FormAlert tone="success">Your application has been sent (reference {applied}). We have emailed you a copy.</FormAlert>}
      {!apps?.length ? (
        <EmptyState icon={<Send />} title="No applications yet" description="When you apply for a job, you can follow it here." actions={<ButtonLink href="/jobs">Search jobs</ButtonLink>} />
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
                        <Link href={`/jobs/${job.slug}`} className="hover:underline">
                          {job.title}
                        </Link>
                      ) : (
                        'This job has closed'
                      )}
                    </p>
                    <p className="text-small text-muted">
                      {job?.employer_name ? `${job.employer_name} · ` : ''}
                      {a.reference} · sent {formatDate(a.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.status === 'hired' ? 'green' : a.status === 'shortlisted' ? 'gold' : 'neutral'}>{labelFor(APPLICATION_STATUSES, a.status)}</Badge>
                    {a.cv_path && (
                      <a href={`/account/cv/${a.id}`} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-small font-semibold text-green">
                        <FileText className="size-4" aria-hidden /> CV sent
                      </a>
                    )}
                    {!['withdrawn', 'hired'].includes(a.status) && (
                      <ActionButton size="sm" variant="ghost" confirm="Withdraw this application?" action={withdrawApplicationAction.bind(null, a.id)}>
                        Withdraw
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
        Want employers to find you? <Link href="/account/candidate" className="font-semibold text-green underline">Set up your candidate profile</Link>.
      </p>
    </div>
  )
}
