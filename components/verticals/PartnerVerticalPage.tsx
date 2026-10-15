import { PillarExtras } from '@/components/pillars/PillarHub'
import { ShieldCheck } from 'lucide-react'
import { getRequestGroups } from '@/lib/data/service-requests'
import { COMING_SOON } from '@/lib/content/verticals'
import type { Vertical } from '@/lib/verticals'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'
import { ServiceGroups } from '@/components/service-requests/ServiceGroups'
import { PartnerForm } from './PartnerForm'

/**
 * Live Finance or Insurance (spec 24.8): requests go through the request engine to approved, licensed
 * partners. HagerLand states no rates, quotes, advice or eligibility.
 */
export async function PartnerVerticalPage({ vertical }: { vertical: Vertical }) {
  const content = COMING_SOON[vertical.key]
  const groups = await getRequestGroups([vertical.key])
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs inverse items={[{ label: vertical.name }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl text-white">{vertical.key === 'finance' ? 'Property and construction finance' : 'Property and construction insurance'}</h1>
          {vertical.intro && <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">{vertical.intro}</p>}
          <p className="mt-6 flex max-w-2xl gap-3 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-small text-white/90">
            <ShieldCheck className="size-5 shrink-0 text-gold" aria-hidden />
            {content.notice}
          </p>
        </Container>
      </section>
      <Section>
        <HowRequestsWork />
        <p className="mt-6 max-w-3xl text-small text-muted">
          Partners decide on eligibility, prices and terms themselves and give you their own documents. Read them carefully and ask the partner any questions before you agree to anything.
        </p>
      </Section>
      <Section tone="stone" id="services">
        <SectionHeader title={vertical.key === 'finance' ? 'What do you need finance for?' : 'What would you like to insure?'} />
        <ServiceGroups groups={groups} />
      </Section>
      {vertical.partnerSignupEnabled && content.partner && (
        <Section id="partner">
          <div className="grid gap-10 lg:grid-cols-[1fr_560px]">
            <div>
              <h2 className="hl-h2">Become a partner</h2>
              <p className="mt-3 text-muted">{content.partner.intro}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <PartnerForm verticalKey={vertical.key} types={content.partner.types} />
            </div>
          </div>
        </Section>
      )}
      <PillarExtras pillarKey={vertical.key === 'finance' ? 'finance' : 'insurance'} />
    </>
  )
}
