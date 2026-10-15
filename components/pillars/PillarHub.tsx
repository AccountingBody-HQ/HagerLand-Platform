import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Globe } from 'lucide-react'
import { PILLAR_CONTENT, type HubLink } from '@/lib/content/pillars'
import { getAgencyAvailability, getPillars } from '@/lib/data/pillars'
import { getVerticals } from '@/lib/data/verticals'
import { getBusinessDetails } from '@/lib/data/business'
import { MODE_LABELS, PILLAR_INTEREST_VERTICAL, activeModes, pillarHref, type Pillar, type PillarKey } from '@/lib/pillars'
import type { LicenceKind } from '@/lib/validation/settings'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { LicenceNote } from '@/components/content/LicenceNote'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { InterestForm } from '@/components/verticals/InterestForm'
import { cn } from '@/lib/cn'

export const PILLAR_LICENCE: Partial<Record<PillarKey, LicenceKind>> = {
  buy: 'estate_agency',
  rent: 'estate_agency',
  manage: 'property_management',
  jobs: 'recruitment',
  finance: 'finance',
  insurance: 'insurance',
}

/** Customer-facing mode labels for a pillar (spec 26.3): never D/A/I. */
export function ModeBadges({ pillar, inverse, className }: { pillar: Pick<Pillar, 'direct' | 'aggregate' | 'interest'>; inverse?: boolean; className?: string }) {
  const modes = activeModes(pillar)
  if (modes.length === 1 && modes[0] === 'interest') return <SoonBadge long className={className} />
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="How this is provided">
      {modes.map((m) => (
        <li key={m} className={cn('rounded-full px-3 py-1 text-small font-semibold', inverse ? (m === 'direct' ? 'bg-green text-white' : m === 'aggregate' ? 'bg-gold text-ink' : 'bg-white/15 text-white') : m === 'direct' ? 'bg-green-tint text-green-darker' : m === 'aggregate' ? 'bg-gold-soft text-gold-dark' : 'bg-stone-100 text-ink')}>
          {MODE_LABELS[m]}
        </li>
      ))}
    </ul>
  )
}

/** Keeps a hub link only while the area it leads to is visible and, for agency links, while the agency is on. */
async function linkFilter(): Promise<(l: HubLink) => boolean> {
  const [verticals, agency] = await Promise.all([getVerticals(), getAgencyAvailability()])
  return (l) => (!l.needs || verticals.some((v) => v.key === l.needs && v.status === 'live')) && (!l.agency || (l.agency === 'sales' ? agency.sales : agency.lettings))
}

function LinkCards({ links }: { links: HubLink[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <li key={l.href + l.label}>
          <Link href={l.href} className="group flex h-full gap-3 rounded-lg border border-border bg-white p-4 hover:border-green">
            <DynamicIcon name={l.icon} className="mt-0.5 size-5 shrink-0 text-green" />
            <span>
              <span className="flex items-center gap-1 font-semibold text-ink">
                {l.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              {l.text && <span className="mt-1 block text-small text-muted">{l.text}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * The "From abroad?" panel, cross-pillar next steps and licence line shared by every pillar hub (spec 26.4, 26.11),
 * including the existing pages that act as hubs (/supplies, /finance, /insurance, /jobs).
 */
export async function PillarExtras({ pillarKey }: { pillarKey: PillarKey }) {
  const [pillars, keep, business] = await Promise.all([getPillars(), linkFilter(), getBusinessDetails()])
  const c = PILLAR_CONTENT[pillarKey]
  const abroadLinks = c.abroad.links.filter(keep)
  const next = c.next.map((k) => pillars.find((p) => p.key === k)).filter((p): p is Pillar => Boolean(p))
  const licence = PILLAR_LICENCE[pillarKey]
  return (
    <>
      <Section tone="tint" compact labelledBy={`abroad-${pillarKey}`}>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-white text-green">
            <Globe className="size-6" aria-hidden />
          </span>
          <div>
            <h2 id={`abroad-${pillarKey}`} className="hl-h3">
              From abroad? {c.abroad.title}
            </h2>
            <p className="mt-2 max-w-3xl text-muted">{c.abroad.text}</p>
          </div>
          {abroadLinks.length > 0 && (
            <ul className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              {abroadLinks.map((l) => (
                <li key={l.href} className="sm:flex-1">
                  <Link href={l.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 font-semibold text-green-darker ring-1 ring-green/20 hover:bg-green-soft">
                    {l.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
      {next.length > 0 && (
        <Section compact labelledBy={`next-${pillarKey}`}>
          <h2 id={`next-${pillarKey}`} className="hl-h3">
            Your next steps
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {next.map((p) => (
              <li key={p.key}>
                <Link href={pillarHref(p)} className="flex h-full flex-col gap-2 rounded-lg border border-border bg-white p-4 hover:border-green">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <DynamicIcon name={p.icon} className="size-5 text-green" />
                    {p.name}
                  </span>
                  <span className="text-small text-muted">{p.tagline}</span>
                  <ModeBadges pillar={p} className="mt-auto" />
                </Link>
              </li>
            ))}
          </ul>
          {licence && <LicenceNote kind={licence} licence={business.licences[licence]} className="mt-6" />}
        </Section>
      )}
    </>
  )
}

/** A pillar hub at its short URL (spec 26.4): what it does, live modes, actions, deeper pages, abroad panel, next steps. */
export async function PillarHub({ pillar, children }: { pillar: Pillar; children?: ReactNode }) {
  const c = PILLAR_CONTENT[pillar.key]
  const keep = await linkFilter()
  const actions = c.actions.filter(keep)
  const direct = pillar.direct ? c.direct.filter(keep) : []
  const aggregate = pillar.aggregate ? c.aggregate.filter(keep) : []
  const comingSoon = pillar.status === 'coming_soon'
  const interestVertical = PILLAR_INTEREST_VERTICAL[pillar.key]
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs inverse items={[{ label: pillar.name }]} />
          <p className="hl-eyebrow mt-8 text-gold">
            Pillar {pillar.number} · {pillar.name}
          </p>
          <h1 className="hl-h1 mt-2 max-w-3xl text-white">{comingSoon ? c.soon.headline : c.headline}</h1>
          {pillar.description && <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">{pillar.description}</p>}
          <ModeBadges pillar={pillar} inverse className="mt-6" />
          {!comingSoon && actions.length > 0 && (
            <ul className="mt-8 flex flex-col gap-3 sm:flex-row">
              {actions.map((a, i) => (
                <li key={a.href} className="sm:flex-1 lg:flex-none">
                  <Link href={a.href} className={cn('inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-5 font-semibold', i === 0 ? 'bg-green text-white hover:bg-green-dark' : 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/15')}>
                    <DynamicIcon name={a.icon} className="size-5" />
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {direct.length > 0 && (
        <Section labelledBy={`direct-${pillar.key}`}>
          <p className="hl-eyebrow text-green">{MODE_LABELS.direct}</p>
          <h2 id={`direct-${pillar.key}`} className="hl-h2 mt-1">
            What HagerLand does for you
          </h2>
          <div className="mt-6">
            <LinkCards links={direct} />
          </div>
        </Section>
      )}
      {aggregate.length > 0 && (
        <Section tone={direct.length > 0 ? 'stone' : 'white'} labelledBy={`aggregate-${pillar.key}`}>
          <p className="hl-eyebrow text-gold-dark">{MODE_LABELS.aggregate}</p>
          <h2 id={`aggregate-${pillar.key}`} className="hl-h2 mt-1">
            Search and compare
          </h2>
          <div className="mt-6">
            <LinkCards links={aggregate} />
          </div>
        </Section>
      )}
      {children}
      {pillar.interest && (
        <Section tone="stone" id="register" labelledBy={`interest-${pillar.key}`}>
          <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
            <div>
              <p className="hl-eyebrow text-green">{MODE_LABELS.interest}</p>
              <h2 id={`interest-${pillar.key}`} className="hl-h2 mt-1">
                {comingSoon ? `${pillar.name} is coming soon` : 'Tell us what you need next'}
              </h2>
              {(comingSoon ? c.soon.points : []).length > 0 && (
                <ul className="mt-4 space-y-2 text-muted">
                  {c.soon.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-muted">Register your interest and we will email you when there is news. No obligation.</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <InterestForm verticalKey={interestVertical} pillarKey={pillar.key} verticalName={pillar.name} idPrefix={`pint-${pillar.key}`} />
            </div>
          </div>
        </Section>
      )}
      <PillarExtras pillarKey={pillar.key} />
    </>
  )
}
