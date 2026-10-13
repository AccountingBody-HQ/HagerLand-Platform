import { CircleCheck } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = buildMetadata({ title: 'Quote request sent', description: 'Your quote request has been sent to HagerLand Supply.', path: '/supplies/quote/sent', noindex: true })

export default function QuoteSentPage({ searchParams }: { searchParams: { ref?: string } }) {
  const ref = /^HLQ-\d{4}-\d{6}$/.test(searchParams.ref ?? '') ? searchParams.ref : null
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-white p-8 text-center shadow-sm">
        <CircleCheck className="mx-auto size-12 text-green" aria-hidden />
        <h1 className="hl-h2 mt-4">Your quote request has been sent</h1>
        {ref && (
          <p className="mt-3">
            Your reference is <strong className="tabular-nums">{ref}</strong>.
          </p>
        )}
        <ol className="mt-6 space-y-2 text-left text-muted">
          <li>1. {brand.divisions.supply} checks prices and availability for every item.</li>
          <li>2. We contact you with one clear quote, including delivery.</li>
          <li>3. You confirm, and we arrange payment and delivery with you directly.</li>
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:flex-1">
          <ButtonLink href="/supplies">Back to supplies</ButtonLink>
          <ButtonLink href="/account/quotes" variant="secondary">
            My quotes
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
