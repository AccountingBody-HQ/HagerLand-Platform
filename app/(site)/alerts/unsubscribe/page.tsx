import { Container } from '@/components/ui/Layout'
import { UnsubscribeForm } from '@/components/saved/UnsubscribeForm'

export const metadata = { title: 'Stop alert emails', robots: { index: false, follow: false } }

/** One-click unsubscribe from a search alert. A button (not the link itself) confirms, so link scanners cannot unsubscribe people. */
export default async function UnsubscribePage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = await props.searchParams
  return (
    <Container className="max-w-xl py-12 lg:py-20">
      <h1 className="hl-h1">Stop alert emails</h1>
      <p className="mt-3 text-muted">Press the button to stop emails for this saved search. You can turn them back on in your account at any time.</p>
      <div className="mt-8">
        <UnsubscribeForm token={(searchParams.token ?? '').slice(0, 64)} />
      </div>
    </Container>
  )
}
