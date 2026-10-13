import { notFound } from 'next/navigation'
import { requestIdForToken } from '@/lib/data/service-requests'
import { loadRequestView } from '@/lib/data/request-view'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { RequestView } from '@/components/service-requests/RequestView'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Your service request', robots: { index: false, follow: false }, referrer: 'no-referrer' as const }

/** A guest's private page for their request, opened from the emailed link (spec 24.5). */
export default async function GuestRequestPage({ params }: { params: { token: string } }) {
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
  return (
    <Container className="max-w-3xl py-8 lg:py-12">
      <RequestView r={view} token={params.token} />
      <p className="mt-10 text-small text-muted">This page is private: anyone with the link can see it, so don&apos;t share it.</p>
    </Container>
  )
}
