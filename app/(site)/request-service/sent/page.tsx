import { CircleCheck } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getUser } from '@/lib/auth'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Request sent', description: 'Your service request has been sent to HagerLand.', path: '/request-service/sent', noindex: true })

export default async function RequestSentPage(props: { searchParams: Promise<{ ref?: string }> }) {
  const searchParams = await props.searchParams
  const ref = /^HLS-\d{4}-\d{6}$/.test(searchParams.ref ?? '') ? searchParams.ref : null
  const user = await getUser()
  return (
    <Container className="max-w-2xl py-12 text-center lg:py-20">
      <CircleCheck className="mx-auto size-14 text-green" aria-hidden />
      <h1 className="hl-h1 mt-4">Your request is on its way</h1>
      {ref && (
        <p className="mt-3 text-muted">
          Your reference is <strong className="text-ink">{ref}</strong>.
        </p>
      )}
      <ol className="mx-auto mt-8 max-w-md space-y-3 text-left">
        <li>1. We check your request and match it with up to three suitable providers.</li>
        <li>2. Providers who accept it contact you directly and send a quote.</li>
        <li>3. {user ? 'Quotes appear in your account.' : 'We have emailed you a private link where your quotes will appear.'} Choose the one you want.</li>
      </ol>
      <p className="mt-6 text-small text-muted">Never pay a deposit before you have agreed the work, price and timing in writing.</p>
      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row [&>*]:flex-1">
        {user ? <ButtonLink href="/account/service-requests">My service requests</ButtonLink> : <ButtonLink href="/">Back to HagerLand</ButtonLink>}
        <ButtonLink href="/request-service" variant="secondary">
          Request another service
        </ButtonLink>
      </div>
    </Container>
  )
}
