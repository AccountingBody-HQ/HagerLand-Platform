import { notFound } from 'next/navigation'
import { requestIdForToken } from '@/lib/data/service-requests'
import { loadRequestView } from '@/lib/data/request-view'
import { loadEmployerDesk } from '@/lib/jobs-desk-data'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { getAmScope, getJobsI18n, getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { RequestView } from '@/components/service-requests/RequestView'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'
const robots = { index: false, follow: false }

/** In Amharic for Jobs, a staffing request's tab title goes through the Jobs translator; everything else is unchanged. */
export async function generateMetadata(props: { params: Promise<{ token: string }> }) {
  const base = { title: 'Your service request', robots, referrer: 'no-referrer' as const }
  if ((await getLocale()) !== 'am' || (await getAmScope()) !== 'jobs') return base
  const found = await requestIdForToken((await props.params).token)
  const view = found && !found.expired ? await loadRequestView(found.id) : null
  if (view?.serviceSlug !== STAFFING_SLUG) return base
  const { t } = await getJobsI18n()
  return { ...base, title: t(base.title) }
}

/** A guest's private page for their request, opened from the emailed link (spec 24.5). */
export default async function GuestRequestPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params
  const found = await requestIdForToken(params.token)
  if (!found) notFound()
  if (found.expired)
    return (
      <Container className="max-w-2xl py-12">
        <EmptyState icon={<Clock />} title="This link has expired" description="For your privacy, request links stop working after a while. Ask for a new one and we will email it to you." actions={<ButtonLink href="/requests/resend">Email me a new link</ButtonLink>} />
      </Container>
    )
  const view = await loadRequestView(found.id)
  if (!view) notFound()
  // Staffing: the people HagerLand introduced (only when the recruitment desk switch is on; the link was checked above).
  const desk = view.serviceSlug === STAFFING_SLUG ? await loadEmployerDesk(view.id) : null
  // Staffing requests are Jobs pages (Jobs Phase 5): the Jobs translator. Other services keep the site translator.
  const jobs = view.serviceSlug === STAFFING_SLUG ? await getJobsI18n() : null
  const locale = jobs ? jobs.locale : 'en'
  const t = jobs ? jobs.t : translator(await getLocale())
  const pt = jobs ? jobs.t : (s: string) => s
  return (
    <Container className="max-w-3xl py-8 lg:py-12">
      <RequestView r={view} token={params.token} desk={desk} t={t} locale={locale} />
      <p className="mt-10 text-small text-muted">{pt("This page is private: anyone with the link can see it, so don't share it.")}</p>
    </Container>
  )
}
