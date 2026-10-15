import { searchDevelopments } from '@/lib/data/developments'
import { ButtonLink } from '@/components/ui/Button'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { DevelopmentCard } from './DevelopmentCard'

/** Up to 4 newest third-party and HagerLand developments. Hidden when there are fewer than `min`. */
export async function DevelopmentsStrip({ title, min = 1, tone = 'white' }: { title: string; min?: number; tone?: 'white' | 'stone' }) {
  const { items } = await searchDevelopments({ pageSize: 4 })
  if (items.length < min) return null
  return (
    <Section tone={tone} compact>
      <SectionHeader title={title} action={<ButtonLink href="/developments" variant="secondary">All developments</ButtonLink>} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((d) => (
          <li key={d.id}>
            <DevelopmentCard development={d} />
          </li>
        ))}
      </ul>
    </Section>
  )
}
