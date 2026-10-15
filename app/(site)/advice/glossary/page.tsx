import { buildMetadata } from '@/lib/seo'
import { TopicGuidesPage, topicGuidesNoindex } from '@/components/advice/TopicGuidesPage'

export const revalidate = 600

export async function generateMetadata() {
  return buildMetadata({ title: 'Glossary of property terms', description: 'Plain-English explanations of carta, lease, G+X, condominium, finishing levels and other Ethiopian property terms.', path: '/advice/glossary', noindex: await topicGuidesNoindex('glossary') })
}

export default function Page() {
  return <TopicGuidesPage topic="glossary" title="Glossary" intro="Carta, lease, G+X, condominium, finishing levels and other words you will meet, explained in plain English." empty="Our glossary is being reviewed and will appear here." />
}
