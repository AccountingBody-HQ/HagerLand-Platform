import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { QuoteBasket } from '@/components/supplies/QuoteBasket'

export const metadata = buildMetadata({ title: 'Your quote list', description: 'Review the construction materials on your quote list and send it to HagerLand Supply for one clear price, including delivery to your site in Addis Ababa.', path: '/supplies/quote', noindex: true })

export default function QuotePage() {
  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Supplies', href: '/supplies' }, { label: 'Quote list' }]} />
      <h1 className="hl-h1 mb-8 mt-4">Your quote list</h1>
      <QuoteBasket />
    </Container>
  )
}
