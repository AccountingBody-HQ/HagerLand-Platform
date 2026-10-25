import { notFound } from 'next/navigation'
import { requestIdForToken } from '@/lib/data/service-requests'
import { loadRequestView } from '@/lib/data/request-view'
import { loadEmployerDesk } from '@/lib/jobs-desk-data'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { RequestView } from '@/components/service-requests/RequestView'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your service request', robots: { index: false, follow: false }, referrer: 'no-referrer' as const }

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
  const t = translator(await getLocale())
  return (
    <Container className="max-w-3xl py-8 lg:py-12">
      <RequestView r={view} token={params.token} desk={desk} t={t} />
      <p className="mt-10 text-small text-muted">This page is private: anyone with the link can see it, so don&apos;t share it.</p>
    </Container>
  )
}
