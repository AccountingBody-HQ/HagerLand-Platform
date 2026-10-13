import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { ResendLinkForm } from '@/components/service-requests/ResendLinkForm'

export const metadata = buildMetadata({ title: 'Get a new link to your request', description: 'Email yourself a new private link to a HagerLand service request.', path: '/requests/resend', noindex: true })

export default function ResendPage() {
  return (
    <Container className="max-w-xl py-10 lg:py-16">
      <h1 className="hl-h1">Get a new link to your request</h1>
      <p className="mt-3 text-muted">Enter the email you used and the reference from our email (it starts with HLS). If they match, we email you a new private link.</p>
      <div className="mt-8">
        <ResendLinkForm />
      </div>
    </Container>
  )
}
