import { notFound } from 'next/navigation'
import { getJobBySlug } from '@/lib/data/jobs'
import { getVertical } from '@/lib/data/verticals'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { buildMetadata } from '@/lib/seo'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { PhoneApplyForm } from '@/components/jobs/PhoneApplyForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  return buildMetadata({ title: 'Apply by phone', description: 'Apply for a job on HagerLand.', path: `/jobs/${params.slug}/apply-by-phone`, noindex: true })
}

/** Apply by phone without an account (Jobs Phase 2). Not found while the owner's switch is off. */
export default async function ApplyByPhonePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const [v, switches] = await Promise.all([getVertical('jobs'), readJobsSwitches()])
  if (!v || v.status !== 'live' || !switches.phoneApply) notFound()
  const job = await getJobBySlug(params.slug)
  if (!job?.id) notFound()
  const t = translator(await getLocale())
  return (
    <Container className="max-w-2xl py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Jobs', href: '/jobs' }, { label: job.title ?? '', href: `/jobs/${job.slug}` }, { label: t('Apply by phone') }]} />
      <h1 className="hl-h1 mt-6">{t('Apply by phone')}</h1>
      <p className="mt-2 text-muted">
        {job.title} · {job.employer_name} · {job.location_display}
      </p>
      <p className="mt-3">{t('No account or email needed. If the employer wants to talk, they will contact you on this number.')}</p>
      <div className="mt-8 rounded-lg border border-border bg-white p-5 sm:p-8">
        <PhoneApplyForm jobId={job.id} />
      </div>
    </Container>
  )
}
