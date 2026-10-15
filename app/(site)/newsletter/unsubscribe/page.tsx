import { Container } from '@/components/ui/Layout'
import { NewsletterUnsubscribe } from '@/components/advice/NewsletterUnsubscribe'

export const metadata = { title: 'Unsubscribe from HagerLand news', robots: { index: false, follow: false } }

export default async function Page(props: { searchParams: Promise<{ token?: string }> }) {
  const sp = await props.searchParams
  return (
    <Container className="max-w-xl py-12 lg:py-20">
      <h1 className="hl-h1">Unsubscribe from HagerLand news</h1>
      <p className="mt-3 text-muted">Press the button to stop the newsletter.</p>
      <div className="mt-8">
        <NewsletterUnsubscribe token={(sp.token ?? '').slice(0, 64)} />
      </div>
    </Container>
  )
}
