import { notFound } from 'next/navigation'
import { getJobBySlug } from '@/lib/data/jobs'
import { getVertical } from '@/lib/data/verticals'
import { getProfile, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ApplyForm } from '@/components/jobs/ApplyForm'
import { getJobsI18n } from '@/lib/i18n/server'
import { fill } from '@/lib/i18n/translate'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const [params, { locale, t }] = await Promise.all([props.params, getJobsI18n()])
  return buildMetadata({ title: t('Apply for a job'), description: t('Apply for a job on HagerLand.'), path: `/jobs/${params.slug}/apply`, noindex: true, locale })
}

/** Applying needs an account, so candidates can follow and withdraw their applications (spec 24.9). */
export default async function ApplyPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const v = await getVertical('jobs')
  if (!v || v.status !== 'live') notFound()
  const job = await getJobBySlug(params.slug)
  if (!job?.id) notFound()
  const { t, href } = await getJobsI18n()
  const user = await requireUser(href(`/jobs/${params.slug}/apply`))
  const [profile, { data: candidate }] = await Promise.all([getProfile(), getServerSupabase().from('candidate_profiles').select('full_name, cv_path').eq('user_id', user.id).maybeSingle()])
  return (
    <Container className="max-w-2xl py-6 lg:py-10">
      <Breadcrumbs items={[{ label: t('Jobs'), href: href('/jobs') }, { label: job.title ?? '', href: href(`/jobs/${job.slug}`) }, { label: t('Apply') }]} />
      <h1 className="hl-h1 mt-6">{fill(t('Apply: {title}'), { title: job.title ?? '' })}</h1>
      <p className="mt-2 text-muted">
        {job.employer_name} · {job.location_display}
      </p>
      <div className="mt-8 rounded-lg border border-border bg-white p-5 sm:p-8">
        <ApplyForm jobId={job.id} userId={user.id} defaults={{ name: candidate?.full_name ?? profile?.full_name ?? '', email: user.email ?? '', phone: profile?.phone ?? '', profileCv: candidate?.cv_path ?? null }} />
      </div>
    </Container>
  )
}
