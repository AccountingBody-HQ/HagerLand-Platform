import type { ReactNode } from 'react'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export function PageHero({ crumb, eyebrow, title, intro, children, dark }: { crumb: string; eyebrow?: string; title: string; intro?: ReactNode; children?: ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? 'hl-blueprint bg-ink text-white' : 'border-b border-border bg-stone-50'}>
      <Container className="py-10 sm:py-16">
        <Breadcrumbs inverse={dark} items={[{ label: crumb }]} />
        {eyebrow && <p className={`hl-eyebrow mt-8 ${dark ? 'text-gold' : 'text-green'}`}>{eyebrow}</p>}
        <h1 className={`hl-h1 ${eyebrow ? 'mt-2' : 'mt-6'} max-w-3xl ${dark ? 'text-white' : ''}`}>{title}</h1>
        {intro && <div className={`mt-4 max-w-2xl text-[1.0625rem] ${dark ? 'text-white/80' : 'text-muted'}`}>{intro}</div>}
        {children}
      </Container>
    </section>
  )
}

/** A titled block of legal or help text with consistent spacing. */
export function TextSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="hl-h3 mb-3">{title}</h2>
      <div className="space-y-3 text-ink [&_a]:font-semibold [&_a]:text-green [&_a]:underline [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">{children}</div>
    </section>
  )
}
