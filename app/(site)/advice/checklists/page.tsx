import { buildMetadata } from '@/lib/seo'
import { TopicGuidesPage, topicGuidesNoindex } from '@/components/advice/TopicGuidesPage'

export const revalidate = 600

export async function generateMetadata() {
  return buildMetadata({ title: 'Property process checklists', description: 'Step-by-step checklists for buying, renting, building and selling property in Ethiopia, from HagerLand.', path: '/advice/checklists', noindex: await topicGuidesNoindex('checklists') })
}

export default function Page() {
  return <TopicGuidesPage topic="checklists" title="Process checklists" intro="Buying, renting, building and selling, step by step: what to do and in what order." empty="Our checklists for buying, renting, building and selling are being reviewed and will appear here." />
}
