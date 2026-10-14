import { listGuides } from '@/lib/data/guides'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { GuideList } from './GuideList'

/** Latest guides on hub pages and the homepage; renders nothing until a guide is published (spec 25.2g, 14.13). */
export async function GuidesTeaser({ topic, title = 'Guides', tone }: { topic?: string; title?: string; tone?: 'white' | 'stone' }) {
  const guides = await listGuides({ topic, limit: 3 })
  if (guides.length === 0) return null
  return (
    <Section tone={tone}>
      <SectionHeader title={title} action={<ButtonLink href="/guides" variant="ghost" size="sm">All guides</ButtonLink>} />
      <GuideList guides={guides} />
    </Section>
  )
}
