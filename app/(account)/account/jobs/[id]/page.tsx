import { notFound } from 'next/navigation'
import { FileText } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getVertical } from '@/lib/data/verticals'
import { getLocationById } from '@/lib/data/reference'
import { setJobStatusAction, updateApplicationAction } from '@/app/actions/job-actions'
import { APPLICATION_STATUSES, EMPLOYER_APPLICATION_STATUSES, labelFor, tradeLabel } from '@/lib/jobs'
import { LANGUAGES, contactLinks } from '@/lib/jobs-phone'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { formatDate, formatPhone } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { ActionButton } from '@/components/forms/ActionButton'
import { ActionForm } from '@/components/forms/ActionForm'
import { JobForm } from '@/components/jobs/JobForm'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'

export const metadata = { title: 'Job' }

export default async function EmployerJobPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; submitted?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireUser(`/account/jobs/${params.id}`)
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const supabase = getServerSupabase()
  const { data: job } = await supabase.from('job_posts').select('*').eq('id', params.id).maybeSingle()
  if (!job) notFound()
  const [{ data: apps }, loc] = await Promise.all([
    supabase.from('job_applications').select('id, reference, name, email, phone, cover_note, cv_path, status, employer_notes, created_at, channel, trade, area_text, preferred_contact, language').eq('job_id', job.id).order('created_at', { ascending: false }),
    getLocationById(job.location_id),
  ])
  const s = LISTING_STATUS_LABELS[job.status]
  const t = translator(await getLocale())
  const editable = !['published', 'removed'].includes(job.status)
  return (
    <div className="space-y-6">
      <AccountPageHeader
        title={job.title}
        description={<Badge tone={s.tone}>{s.label}</Badge>}
        action={job.status === 'published' ? <ButtonLink href={`/jobs/${job.slug}`} variant="secondary">View on the job board</ButtonLink> : undefined}
      />
      {searchParams.submitted && <FormAlert tone="success">Sent to HagerLand for review. We will email you when it is live.</FormAlert>}
      {searchParams.saved && <FormAlert tone="success">Saved as a draft.</FormAlert>}
      {job.status === 'rejected' && job.rejection_reason && <FormAlert>{job.rejection_reason}</FormAlert>}
      {job.status === 'published' && job.expires_at && <p className="text-muted">Open until {formatDate(job.expires_at)}.</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {job.status === 'published' && (
          <ActionButton variant="secondary" className="flex-1" action={setJobStatusAction.bind(null, job.id, 'paused')}>
            Pause to edit
          </ActionButton>
        )}
        {['paused', 'expired'].includes(job.status) && (
          <ActionButton className="flex-1" action={setJobStatusAction.bind(null, job.id, 'pending_review')}>
            Send for review again
          </ActionButton>
        )}
        {!['archived', 'removed'].includes(job.status) && (
          <ActionButton variant="ghost" className="flex-1" confirm="Close this job? It will be removed from the job board." action={setJobStatusAction.bind(null, job.id, 'archived')}>
            Close job
          </ActionButton>
        )}
      </div>

      <section aria-labelledby="apps-heading">
        <h2 id="apps-heading" className="hl-h3 mb-3">
          Applications ({apps?.length ?? 0})
        </h2>
        {!apps?.length ? (
          <p className="rounded-lg border border-dashed border-border-strong bg-white p-6 text-center text-muted">No applications yet.</p>
        ) : (
          <ul className="space-y-3">
            {apps.map((a) => (
              <li key={a.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {a.name}
                        {a.channel === 'phone' && <Badge tone="gold">{t('By phone')}</Badge>}
                      </p>
                      <p className="text-small text-muted">
                        {a.reference} · applied {formatDate(a.created_at)}
                      </p>
                    </div>
                    <Badge tone={a.status === 'withdrawn' || a.status === 'rejected' ? 'neutral' : a.status === 'hired' ? 'green' : 'info'}>{labelFor(APPLICATION_STATUSES, a.status)}</Badge>
                  </div>
                  {a.channel === 'phone' ? (
                    <>
                      <p className="text-small">
                        {[a.phone && formatPhone(a.phone), a.trade && t(tradeLabel(a.trade)), a.area_text, a.language && t(labelFor(LANGUAGES, a.language))].filter(Boolean).join(' · ')}
                      </p>
                      {a.phone && (
                        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {contactLinks(a.phone, a.preferred_contact).map((l) => (
                            <li key={l.method}>
                              <a href={l.href} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-strong px-3 text-small font-semibold hover:bg-stone-50" {...(l.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                                {t(l.label)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-small">
                      {a.email && (
                        <a href={`mailto:${a.email}`} className="text-green underline">
                          {a.email}
                        </a>
                      )}
                      {a.phone && <> · {formatPhone(a.phone)}</>}
                    </p>
                  )}
                  {a.cover_note && <p className="whitespace-pre-line rounded-md bg-stone-50 p-3 text-small">{a.cover_note}</p>}
                  {a.channel === 'phone' ? null : a.cv_path ? (
                    <a href={`/account/cv/${a.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-3 text-small font-semibold hover:bg-stone-50">
                      <FileText className="size-4" aria-hidden /> Download CV
                    </a>
                  ) : (
                    <p className="text-small text-muted">No CV attached.</p>
                  )}
                  {a.status !== 'withdrawn' && (
                    <ActionForm action={updateApplicationAction} submitLabel="Update" resetOnSuccess={false}>
                      <input type="hidden" name="id" value={a.id} />
                      <div>
                        <label htmlFor={`st-${a.id}`} className="mb-1 block text-small font-semibold">
                          Status
                        </label>
                        <Select id={`st-${a.id}`} name="status" defaultValue={a.status === 'submitted' ? 'viewed' : a.status}>
                          {EMPLOYER_APPLICATION_STATUSES.map((v) => (
                            <option key={v} value={v}>
                              {labelFor(APPLICATION_STATUSES, v)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label htmlFor={`nt-${a.id}`} className="mb-1 block text-small font-semibold">
                          Private notes
                        </label>
                        <Textarea id={`nt-${a.id}`} name="employer_notes" rows={2} maxLength={2000} defaultValue={a.employer_notes ?? ''} />
                      </div>
                    </ActionForm>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-small text-muted">Use applicants&apos; details only to recruit for this job. CVs are deleted 12 months after the application.</p>
      </section>

      {editable && (
        <Card className="p-5 sm:p-8">
          <h2 className="hl-h3 mb-4">Edit job</h2>
          <JobForm
            defaults={{
              id: job.id,
              title: job.title,
              category: job.category,
              employment_type: job.employment_type,
              trade: job.trade,
              location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null,
              salary_min: job.salary_min_minor === null ? null : job.salary_min_minor / 100,
              salary_max: job.salary_max_minor === null ? null : job.salary_max_minor / 100,
              salary_period: job.salary_period,
              currency: job.currency,
              description: job.description,
              requirements: job.requirements,
              closing_date: job.closing_date,
            }}
          />
        </Card>
      )}
    </div>
  )
}
