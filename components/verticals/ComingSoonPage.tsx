import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { COMING_SOON } from '@/lib/content/verticals'
import { getVerticals } from '@/lib/data/verticals'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { verticalForPath, verticalHref, type Vertical } from '@/lib/verticals'
import { Container, Section } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from './SoonBadge'
import { InterestForm } from './InterestForm'
import { PartnerForm } from './PartnerForm'

/** Coming-soon pages are never indexed while the vertical is not live (spec 24.2). */
export function comingSoonMetadata(v: Vertical): Metadata {
  return buildMetadata({
    title: `${v.name} — coming soon`,
    description: truncateDescription(v.seoDescription ?? `${v.shortDescription ?? v.name} Coming soon to HagerLand: register your interest and we will tell you when it opens.`),
    path: verticalHref(v),
    noindex: true,
  })
}

/** Designed "Coming soon" landing for a vertical: what, who for, how, register interest, become a partner. */
export async function ComingSoonPage({ vertical }: { vertical: Vertical }) {
  const c = COMING_SOON[vertical.key]
  const all = await getVerticals()
  const related = c.related.filter((r) => {
    const key = verticalForPath(r.value)
    return !key || all.find((v) => v.key === key)?.status === 'live'
  })
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-10 sm:py-16">
          <Breadcrumbs inverse items={[{ label: vertical.name }]} />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-white/10 text-gold">
              <DynamicIcon name={vertical.icon} className="size-6" />
            </span>
            <SoonBadge long className="text-small" />
          </div>
          <p className="hl-eyebrow mt-6 text-gold">{vertical.name}</p>
          <h1 className="hl-h1 mt-2 max-w-3xl text-white">{c.headline}</h1>
          {vertical.intro && <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">{vertical.intro}</p>}
          {c.notice && <p className="mt-4 max-w-2xl rounded-md border border-white/15 bg-white/5 px-4 py-3 text-small text-white/85">{c.notice}</p>}
          {vertical.interestEnabled && (
            <a href="#register" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-gold px-5 font-semibold text-ink hover:bg-gold/90">
              Register your interest <ArrowRight className="size-4" aria-hidden />
            </a>
          )}
        </Container>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_440px]">
          <div className="space-y-12">
            <div>
              <h2 className="hl-h2">What it will be</h2>
              <div className="mt-4 space-y-3 text-body text-ink">
                {c.what.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
            <div>
              <h2 className="hl-h2">Who it is for</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {c.whoFor.map((w) => (
                  <li key={w} className="flex gap-3 rounded-lg border border-border bg-white p-4">
                    <Check className="mt-0.5 size-5 shrink-0 text-green" aria-hidden />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="hl-h2">How it will work</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {c.how.map((s, i) => (
                  <li key={s.title} className="rounded-lg border border-border bg-stone-50 p-4">
                    <span className="font-display text-h3 font-extrabold text-green">{i + 1}</span>
                    <p className="mt-1 font-semibold text-ink">{s.title}</p>
                    <p className="text-small text-muted">{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
            {related.length > 0 && (
              <div>
                <h2 className="hl-h3">Available on HagerLand today</h2>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {related.map((r) => (
                    <li key={r.value}>
                      <Link href={r.value} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border-strong px-4 font-semibold text-ink hover:border-green">
                        {r.label} <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-6">
            {vertical.interestEnabled && (
              <div id="register" className="scroll-mt-24 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
                <h2 className="hl-h3">Register your interest</h2>
                <p className="mb-4 mt-1 text-small text-muted">We&apos;ll email you when {vertical.name} opens. No obligation.</p>
                <InterestForm verticalKey={vertical.key} verticalName={vertical.name} categories={c.categories} categoryLabel={c.categoryLabel} audiences={c.audiences} />
              </div>
            )}
          </div>
        </div>
      </Section>

      {vertical.partnerSignupEnabled && c.partner && (
        <Section tone="stone" id="partner">
          <div className="grid gap-10 lg:grid-cols-[1fr_560px]">
            <div>
              <p className="hl-eyebrow text-green">Partners</p>
              <h2 className="hl-h2 mt-2">Become a partner</h2>
              <p className="mt-3 text-muted">{c.partner.intro}</p>
              <p className="mt-3 text-small text-muted">Partners must hold the licences and approvals required where they operate. We check these before any partnership starts.</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <PartnerForm verticalKey={vertical.key} types={c.partner.types} />
            </div>
          </div>
        </Section>
      )}
    </>
  )
}

/** Metadata for a page that is a vertical's landing: honest coming-soon metadata until the vertical is live. */
export async function verticalLandingMetadata(key: Vertical['key'], live: () => Metadata): Promise<Metadata> {
  const v = (await getVerticals()).find((x) => x.key === key)
  return v && v.status === 'live' ? live() : v ? comingSoonMetadata(v) : {}
}
