import { brand } from '@/lib/brand'
import { Container } from '@/components/ui/Layout'

export default function HomePage() {
  return (
    <section className="hl-blueprint bg-ink py-20 text-white">
      <Container>
        <p className="hl-eyebrow text-gold">{brand.descriptor}</p>
        <h1 className="hl-display mt-4 max-w-3xl text-white">{brand.heroHeadline}</h1>
        <p className="mt-5 max-w-2xl text-white/80">{brand.heroSupport}</p>
      </Container>
    </section>
  )
}
